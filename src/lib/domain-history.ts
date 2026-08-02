/**
 * Longitudinal capture: one row per domain per day it was observed.
 *
 * `domain_snapshots` keeps only the latest state, because that is all a diff
 * needs to wake a subscriber. This file keeps the series, which is the part
 * that compounds and the part nobody can back-fill. A day not written down is
 * a day that no longer exists, so capture runs on every check and every cron
 * pass, unconditionally, for watched and unwatched domains alike.
 *
 * Two rules hold the data honest and neither bends:
 *
 *  1. An observation with an unanswered lookup in it is never written. A
 *     resolver timeout recorded as "DKIM disappeared" would be indistinguishable
 *     from the real thing forever after. A gap in the series is honest; a false
 *     move is not, and one of them makes the whole table worthless.
 *  2. Rows record what was observed, never what we concluded from it. Verdicts
 *     date the moment the corpus moves. Records do not.
 */

import "server-only";

import { sql, hasDatabase } from "@/lib/db";
import {
  captureDomainObservation,
  classifyChanges,
  describeDomainChanges,
  parseStoredSnapshot,
  type ChangeEntry,
  type DomainObservation,
  type DomainSnapshot,
} from "@/lib/domain-snapshot";

export type HistoryWrite =
  | { status: "recorded"; changed: boolean }
  | { status: "already-observed-today" }
  | { status: "skipped-unreliable"; unresolved: string[] }
  | { status: "no-database" }
  | { status: "error"; message: string };

/** UTC, so a row's date does not depend on which region answered the request. */
export function observedOnUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Write today's row, setting `changed` against the last row before today.
 *
 * `on conflict do nothing` is the whole same-day story: the first observation
 * of a date is the one that stands, so two people checking the same domain an
 * hour apart cost one row, not two, and cannot race each other.
 */
export async function recordDomainObservation(
  domain: string,
  observation: DomainObservation,
): Promise<HistoryWrite> {
  if (!hasDatabase()) return { status: "no-database" };

  if (!observation.reliable) {
    console.warn(
      `[domain-history] ${domain}: not recorded, ${observation.unresolved.length} lookup(s) unanswered:`,
      observation.unresolved.join(", "),
    );
    return { status: "skipped-unreliable", unresolved: observation.unresolved };
  }

  const today = observedOnUtc();
  const next = observation.snapshot;

  try {
    const prevRows = (await sql().query(
      `select snapshot from domain_history
       where domain = $1 and observed_on < $2::date
       order by observed_on desc
       limit 1`,
      [domain, today],
    )) as unknown as { snapshot: unknown }[];

    const prev = prevRows.length ? parseStoredSnapshot(prevRows[0].snapshot) : null;
    const lines = prev ? describeDomainChanges(prev, next) : [];
    const changed = lines.length > 0;

    const inserted = (await sql().query(
      `insert into domain_history (domain, observed_on, snapshot, changed, change_note)
       values ($1, $2::date, $3::jsonb, $4, $5)
       on conflict (domain, observed_on) do nothing
       returning observed_on`,
      [domain, today, JSON.stringify(next), changed, changed ? lines.join("\n") : null],
    )) as unknown[];

    if (!inserted.length) return { status: "already-observed-today" };
    return { status: "recorded", changed };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[domain-history] ${domain}:`, err);
    return { status: "error", message };
  }
}

/**
 * Capture and record in one call, for the request paths.
 *
 * Never throws: this runs in `after()` behind a page that has already been
 * sent, and a resolver having a bad minute is not a reason to log a stack
 * trace at a visitor who saw a perfectly good check.
 */
export async function observeDomain(domain: string): Promise<HistoryWrite> {
  if (!hasDatabase()) return { status: "no-database" };
  try {
    return await recordDomainObservation(domain, await captureDomainObservation(domain));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[domain-history] ${domain}:`, err);
    return { status: "error", message };
  }
}

/* Per-run ceiling. The point of the sweep is a continuous series, not a
   backlog cleared in one night, and oldest-first means a capped run still
   converges. Anything over the cap is reported as deferred rather than
   quietly dropped. */
const SWEEP_LIMIT = 150;

/* DNS is the wait here, not us — but a resolver is a shared thing and one
   capture is already nineteen lookups. */
const SWEEP_CONCURRENCY = 5;

export type HistorySweepRun = {
  /** Domains with history, no watcher, and no row for today. */
  eligible: number;
  attempted: number;
  recorded: number;
  changed: number;
  skippedUnreliable: number;
  /** Eligible beyond the per-run cap. Named, so a backlog is visible. */
  deferred: number;
  errors: string[];
};

/**
 * Re-observe domains that have history but nobody watching them.
 *
 * Watched domains are already re-checked by the watch pass, which records its
 * own history from the same capture. This is what turns the rest of the table
 * from a scatter of the days somebody happened to visit into a daily series.
 */
export async function sweepUnwatchedDomains(limit = SWEEP_LIMIT): Promise<HistorySweepRun> {
  const run: HistorySweepRun = {
    eligible: 0,
    attempted: 0,
    recorded: 0,
    changed: 0,
    skippedUnreliable: 0,
    deferred: 0,
    errors: [],
  };

  if (!hasDatabase()) {
    run.errors.push("DATABASE_URL is not set");
    return run;
  }

  const today = observedOnUtc();

  let due: { domain: string; eligible: number }[];
  try {
    due = (await sql().query(
      `with due as (
         select h.domain, max(h.observed_on) as last_observed
         from domain_history h
         where not exists (
           select 1 from subscribers s
           where s.watch_domain = h.domain
             and s.unsubscribed_at is null
             and s.token is not null
         )
         group by h.domain
         having max(h.observed_on) < $1::date
       )
       select domain, (count(*) over ())::int as eligible
       from due
       order by last_observed asc, domain asc
       limit $2`,
      [today, limit],
    )) as unknown as { domain: string; eligible: number }[];
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    run.errors.push(`selecting due domains: ${message}`);
    console.error("[domain-history] sweep selection failed:", err);
    return run;
  }

  run.eligible = due[0]?.eligible ?? 0;
  run.deferred = Math.max(0, run.eligible - due.length);
  if (run.deferred > 0) {
    console.warn(
      `[domain-history] sweep capped at ${limit}: ${run.deferred} domain(s) deferred to the next pass`,
    );
  }

  await inPool(due, SWEEP_CONCURRENCY, async ({ domain }) => {
    run.attempted += 1;
    const result = await observeDomain(domain);
    if (result.status === "recorded") {
      run.recorded += 1;
      if (result.changed) run.changed += 1;
    } else if (result.status === "skipped-unreliable") {
      run.skippedUnreliable += 1;
    } else if (result.status === "error") {
      run.errors.push(`${domain}: ${result.message}`);
    }
  });

  return run;
}

async function inPool<T>(items: T[], size: number, work: (item: T) => Promise<void>) {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (cursor < items.length) {
      const item = items[cursor++];
      await work(item);
    }
  });
  await Promise.all(workers);
}

/* ── Read side, for the timeline ──────────────────────────────────────── */

export type TimelineMove = {
  observedOn: string;
  entries: ChangeEntry[];
};

export type DomainTimeline = {
  daysObserved: number;
  firstObserved: string;
  lastObserved: string;
  /** The earliest snapshot, so the ledger can open with what was already there. */
  opening: DomainSnapshot | null;
  moves: TimelineMove[];
  /** Moves beyond the rendered window, if this domain has a long series. */
  olderMoves: number;
};

/* Enough dated entries to be a record, few enough to stay a page. */
const MOVE_WINDOW = 60;

/** Null when the domain has never been observed, or there is no database. */
export async function getDomainTimeline(domain: string): Promise<DomainTimeline | null> {
  if (!hasDatabase()) return null;

  try {
    const [summary] = (await sql().query(
      `select count(*)::int as days,
              (count(*) filter (where changed))::int as moves,
              min(observed_on)::text as first_observed,
              max(observed_on)::text as last_observed
       from domain_history where domain = $1`,
      [domain],
    )) as unknown as {
      days: number;
      moves: number;
      first_observed: string | null;
      last_observed: string | null;
    }[];

    if (!summary?.days || !summary.first_observed || !summary.last_observed) return null;

    const [opening] = (await sql().query(
      `select snapshot from domain_history
       where domain = $1 order by observed_on asc limit 1`,
      [domain],
    )) as unknown as { snapshot: unknown }[];

    /* lag() hands each changed row the snapshot it changed from, so the
       timeline shows typed moves rather than re-parsing the note we wrote at
       the time. The stored `changed` flag is what makes this cheap: only the
       rows that moved come back. */
    const rows = (await sql().query(
      `select observed_on, snapshot, prev from (
         select observed_on::text as observed_on,
                snapshot,
                changed,
                lag(snapshot) over (order by observed_on) as prev
         from domain_history
         where domain = $1
       ) t
       where changed and prev is not null
       order by observed_on desc
       limit $2`,
      [domain, MOVE_WINDOW],
    )) as unknown as { observed_on: string; snapshot: unknown; prev: unknown }[];

    const moves: TimelineMove[] = [];
    for (const row of rows) {
      const prev = parseStoredSnapshot(row.prev);
      const next = parseStoredSnapshot(row.snapshot);
      if (!prev || !next) continue;
      const entries = classifyChanges(prev, next);
      if (entries.length) moves.push({ observedOn: row.observed_on, entries });
    }

    return {
      daysObserved: summary.days,
      firstObserved: summary.first_observed,
      lastObserved: summary.last_observed,
      opening: opening ? parseStoredSnapshot(opening.snapshot) : null,
      moves,
      olderMoves: Math.max(0, summary.moves - moves.length),
    };
  } catch (err) {
    console.error(`[domain-history] timeline read failed for ${domain}:`, err);
    return null;
  }
}

/** Days already on record, so /check only offers the timeline when there is one. */
export async function observedDayCount(domain: string): Promise<number> {
  if (!hasDatabase()) return 0;
  try {
    const [row] = (await sql().query(
      `select count(*)::int as days from domain_history where domain = $1`,
      [domain],
    )) as unknown as { days: number }[];
    return row?.days ?? 0;
  } catch (err) {
    console.error(`[domain-history] count failed for ${domain}:`, err);
    return 0;
  }
}

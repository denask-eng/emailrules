/**
 * Watches every primary source the rules corpus cites, and records when one moves.
 *
 * This exists because of a number. All 39 rules carry `lastVerified` dates of
 * 2026-08-01 or 2026-08-02 — the two days the site was built — and nothing in
 * the codebase ever moved them. A shelf whose whole claim is "dated, sourced,
 * human-verified" was ageing in silence, and in a year every page would have
 * read "verified 14 months ago". That is the failure that kills a reference.
 *
 * What this file refuses to do is the point, exactly as in `esp-watch.ts`. It
 * never edits the corpus, never re-words a rule, and never decides that a
 * changed page means a changed obligation. A regulator can reformat a page
 * without altering a word of law; a page can keep its wording while the law
 * beneath it moves. Only a person can tell those apart. Detection is
 * mechanical, judgement is human, and the queue is the seam between them.
 */

import "server-only";

import { createHash } from "node:crypto";
import { sql, hasDatabase } from "@/lib/db";
import { contentHash } from "@/lib/esp-extract";
import { getAllRules } from "@/lib/rules";

/**
 * How many sources one run checks.
 *
 * 66 URLs at up to 15s each cannot fit in `maxDuration = 60`, so a run takes
 * the least-recently-checked batch and the cron runs daily; the whole corpus
 * cycles in about four days. A source that fails still has `last_checked_at`
 * stamped, because otherwise one permanently dead URL would sort first forever
 * and monopolise every batch.
 */
const BATCH = 20;

/** Long enough for a slow government site, short enough to fit the batch. */
const FETCH_TIMEOUT_MS = 15_000;

export interface WatchedRuleSource {
  url: string;
  slugs: string[];
}

export interface SourceWatchRun {
  checked: number;
  changed: number;
  queued: number;
  errors: string[];
}

/**
 * Every unique source URL in the corpus, with the rules that lean on it.
 *
 * Deduplicated by URL because one source backs several rules — RFC 5782 is
 * cited by the blocklist rules collectively — and a change to it should reach
 * a reviewer once per affected rule rather than once per citation.
 */
export async function ruleSources(): Promise<WatchedRuleSource[]> {
  const rules = await getAllRules();
  const byUrl = new Map<string, Set<string>>();

  for (const rule of rules) {
    for (const source of rule.sources ?? []) {
      const url = typeof source === "string" ? source : source?.url;
      if (!url || !/^https?:\/\//i.test(url)) continue;
      const slugs = byUrl.get(url) ?? new Set<string>();
      slugs.add(rule.slug);
      byUrl.set(url, slugs);
    }
  }

  return [...byUrl.entries()].map(([url, slugs]) => ({ url, slugs: [...slugs].sort() }));
}

function changeId(url: string, hash: string): string {
  return createHash("sha256").update(`${url}|${hash}`).digest("hex").slice(0, 20);
}

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      /* Named, contactable, and honest about being a bot. A source watcher that
         disguises itself is not something this site gets to publish. */
      "user-agent": "emailrules.today source watcher (+https://emailrules.today/methodology)",
      accept: "text/html,application/xhtml+xml,application/pdf,text/plain",
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

/**
 * Check one batch of sources.
 *
 * A fetch that fails records the error and changes nothing else. It must never
 * overwrite `content_hash`, because that would let a bad afternoon on somebody's
 * CDN be replayed on the next run as "this page changed" — the same inversion
 * `esp-watch` guards, and the reason `last_ok_at` is a separate column from
 * `last_checked_at`.
 */
export async function runSourceWatch(limit = BATCH): Promise<SourceWatchRun> {
  const result: SourceWatchRun = { checked: 0, changed: 0, queued: 0, errors: [] };

  if (!hasDatabase()) {
    result.errors.push("DATABASE_URL is not set");
    return result;
  }

  const sources = await ruleSources();
  if (!sources.length) return result;

  /* Register every source first, so a newly cited URL joins the rotation and
     the slug list stays current when a rule adds or drops a citation. */
  for (const source of sources) {
    await sql().query(
      `insert into rule_source_watch (url, slugs) values ($1, $2)
       on conflict (url) do update set slugs = excluded.slugs`,
      [source.url, source.slugs],
    );
  }

  /* Least-recently-checked first, nulls first, so a fresh corpus sweeps in
     order and no URL is starved. */
  const due = (await sql().query(
    `select url, slugs, content_hash, content_length
       from rule_source_watch
      order by last_checked_at asc nulls first
      limit $1`,
    [limit],
  )) as { url: string; slugs: string[]; content_hash: string | null; content_length: number | null }[];

  for (const row of due) {
    result.checked += 1;

    let body: string;
    try {
      body = await fetchPage(row.url);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      result.errors.push(`${row.url}: ${message}`);
      /* last_checked_at moves so the batch rotates; content_hash does not. */
      await sql().query(
        `update rule_source_watch
            set last_checked_at = now(), last_error = $2
          where url = $1`,
        [row.url, message],
      );
      continue;
    }

    const hash = contentHash(body);
    const length = body.length;

    if (row.content_hash && row.content_hash !== hash) {
      result.changed += 1;
      const id = changeId(row.url, hash);
      const inserted = (await sql().query(
        `insert into rule_source_changes (id, url, slugs, old_hash, new_hash, length_delta)
         values ($1, $2, $3, $4, $5, $6)
         on conflict (id) do nothing
         returning id`,
        [id, row.url, row.slugs, row.content_hash, hash, length - (row.content_length ?? length)],
      )) as { id: string }[];
      if (inserted.length) result.queued += 1;
    }

    await sql().query(
      `update rule_source_watch
          set content_hash = $2, content_length = $3,
              last_checked_at = now(), last_ok_at = now(), last_error = null
        where url = $1`,
      [row.url, hash, length],
    );
  }

  return result;
}

/* ─────────────────────────── reading the state ────────────────────────── */

export interface Freshness {
  /** Distinct source URLs the corpus cites. */
  sources: number;
  /** Fetched successfully at least once. */
  everReached: number;
  /** Successfully re-read in the last 7 days. */
  checkedThisWeek: number;
  /** Answered "this is gone" — a citation that has rotted. */
  gone: number;
  /** Refused or timed out. We cannot check these, which is not the same thing. */
  unreachable: number;
  /** Changes waiting for a person. */
  openChanges: number;
  rules: number;
  /** Rules whose lastVerified is within 90 days. */
  verifiedRecently: number;
  /** The oldest lastVerified on the shelf — the number that ages in public. */
  oldestVerified: string | null;
  newestVerified: string | null;
}

export async function freshness(): Promise<Freshness> {
  const rules = await getAllRules();
  const dates = rules
    .map((r) => r.lastVerified)
    .filter((d): d is string => Boolean(d))
    .sort();

  const cutoff = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10);
  const base: Freshness = {
    sources: 0,
    everReached: 0,
    checkedThisWeek: 0,
    gone: 0,
    unreachable: 0,
    openChanges: 0,
    rules: rules.length,
    verifiedRecently: dates.filter((d) => d >= cutoff).length,
    oldestVerified: dates[0] ?? null,
    newestVerified: dates[dates.length - 1] ?? null,
  };

  if (!hasDatabase()) return base;

  const [watch] = (await sql().query(
    `select count(*)::int as sources,
            count(last_ok_at)::int as ever_reached,
            count(*) filter (where last_ok_at > now() - interval '7 days')::int as this_week,
            count(*) filter (where last_error ~ 'HTTP (404|410)')::int as gone,
            count(*) filter (where last_error is not null
                               and last_error !~ 'HTTP (404|410)')::int as unreachable
       from rule_source_watch`,
  )) as { sources: number; ever_reached: number; this_week: number; gone: number; unreachable: number }[];

  const [queue] = (await sql().query(
    `select count(*)::int as open from rule_source_changes where status = 'new'`,
  )) as { open: number }[];

  return {
    ...base,
    sources: watch?.sources ?? 0,
    everReached: watch?.ever_reached ?? 0,
    checkedThisWeek: watch?.this_week ?? 0,
    gone: watch?.gone ?? 0,
    unreachable: watch?.unreachable ?? 0,
    openChanges: queue?.open ?? 0,
  };
}

/**
 * How stale a date is, in the site's own language.
 *
 * Bands rather than a raw number of days because "verified 4 months ago" is a
 * judgement a reader can act on and "127 days" is arithmetic homework. A rule
 * with no date at all is never treated as fresh — that is the inversion that
 * would let an unverified claim look checked.
 */
/* The two judgements that decide whether this shelf is honest live in
   lib/freshness.ts, free of `server-only` so they can be tested from plain
   Node. Re-exported here so callers have one import site. */
export { stalenessOf, daysSinceVerified, isGone, type Staleness } from "./freshness";

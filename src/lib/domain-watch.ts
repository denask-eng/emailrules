/**
 * Re-check every watched domain; email subscribers only when DNS actually moved.
 * Called by the daily cron — never from a public form path.
 */

import "server-only";

import { sql, hasDatabase } from "@/lib/db";
import { recordDomainObservation } from "@/lib/domain-history";
import {
  captureDomainObservation,
  describeDomainChanges,
  parseStoredSnapshot,
  snapshotChangeKey,
  snapshotsEqual,
  type DomainSnapshot,
} from "@/lib/domain-snapshot";
import { sendDomainAlert } from "@/lib/mail";
import { SITE } from "@/lib/site";

export type DomainWatchRun = {
  domainsChecked: number;
  domainsChanged: number;
  /** Domains a resolver could not answer for. No diff, no email, no history. */
  domainsUnresolved: number;
  historyRows: number;
  emailsSent: number;
  emailsFailed: number;
  errors: string[];
};

export async function runDomainWatchChecks(): Promise<DomainWatchRun> {
  const result: DomainWatchRun = {
    domainsChecked: 0,
    domainsChanged: 0,
    domainsUnresolved: 0,
    historyRows: 0,
    emailsSent: 0,
    emailsFailed: 0,
    errors: [],
  };

  if (!hasDatabase()) {
    result.errors.push("DATABASE_URL is not set");
    return result;
  }

  const domains = (await sql().query(
    `select distinct watch_domain as domain
     from subscribers
     where unsubscribed_at is null
       and token is not null
       and watch_domain is not null
       and watch_domain <> ''`,
  )) as unknown as { domain: string }[];

  for (const { domain } of domains) {
    result.domainsChecked += 1;
    try {
      await processDomain(domain, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`${domain}: ${msg}`);
      console.error(`[domain-watch] ${domain}:`, err);
    }
  }

  return result;
}

/**
 * First watch: store baseline, no email.
 * Later runs: diff, alert watchers once per change_key, update snapshot.
 *
 * Null when the resolver could not answer. A baseline built from a half-read
 * of DNS is worse than no baseline: the next clean read diffs against it and
 * emails somebody about a change that never happened.
 */
export async function ensureDomainBaseline(domain: string): Promise<DomainSnapshot | null> {
  const observation = await captureDomainObservation(domain);
  if (!observation.reliable) return null;

  const next = observation.snapshot;
  await sql().query(
    `insert into domain_snapshots (domain, snapshot, checked_at)
     values ($1, $2::jsonb, now())
     on conflict (domain) do nothing`,
    [domain, JSON.stringify(next)],
  );
  /* Somebody asking us to watch a domain is itself an observation of it. */
  await recordDomainObservation(domain, observation);
  return next;
}

async function processDomain(domain: string, result: DomainWatchRun) {
  const observation = await captureDomainObservation(domain);

  /* A timeout is not a record disappearing. Skipping the whole domain for one
     pass costs a day of series; alerting on it costs the subscriber's trust
     and leaves a false move in the history behind. */
  if (!observation.reliable) {
    result.domainsUnresolved += 1;
    console.warn(
      `[domain-watch] ${domain}: skipped, unanswered lookups:`,
      observation.unresolved.join(", "),
    );
    return;
  }

  const next = observation.snapshot;

  /* Unconditional, and before any alerting: the series is the asset, and it
     should not depend on whether an email went out. */
  const written = await recordDomainObservation(domain, observation);
  if (written.status === "recorded") result.historyRows += 1;

  const rows = (await sql().query(
    `select snapshot from domain_snapshots where domain = $1`,
    [domain],
  )) as unknown as { snapshot: unknown }[];

  if (!rows.length) {
    await sql().query(
      `insert into domain_snapshots (domain, snapshot, checked_at)
       values ($1, $2::jsonb, now())
       on conflict (domain) do update
         set snapshot = excluded.snapshot, checked_at = now()`,
      [domain, JSON.stringify(next)],
    );
    return;
  }

  const prev = parseStoredSnapshot(rows[0].snapshot);
  if (!prev || snapshotsEqual(prev, next)) {
    await sql().query(
      `update domain_snapshots set checked_at = now() where domain = $1`,
      [domain],
    );
    return;
  }

  result.domainsChanged += 1;
  const changes = describeDomainChanges(prev, next);
  if (!changes.length) {
    await sql().query(
      `update domain_snapshots
       set snapshot = $2::jsonb, checked_at = now()
       where domain = $1`,
      [domain, JSON.stringify(next)],
    );
    return;
  }

  const changeKey = snapshotChangeKey(prev, next);
  const already = (await sql().query(
    `select 1 from domain_alerts where domain = $1 and change_key = $2`,
    [domain, changeKey],
  )) as unknown[];
  if (already.length) {
    await sql().query(
      `update domain_snapshots
       set snapshot = $2::jsonb, checked_at = now()
       where domain = $1`,
      [domain, JSON.stringify(next)],
    );
    return;
  }

  const watchers = (await sql().query(
    `select email, token from subscribers
     where unsubscribed_at is null
       and token is not null
       and watch_domain = $1`,
    [domain],
  )) as unknown as { email: string; token: string }[];

  let sent = 0;
  for (const w of watchers) {
    const res = await sendDomainAlert(w.email, {
      domain,
      changes,
      checkUrl: `${SITE.url}/check/${encodeURIComponent(domain)}`,
      unsubscribeUrl: `${SITE.url}/api/unsubscribe?t=${w.token}`,
    });
    if (res.ok) {
      sent += 1;
      result.emailsSent += 1;
    } else {
      result.emailsFailed += 1;
      console.error(`[domain-watch] ${w.email}: ${res.error}`);
    }
  }

  await sql().query(
    `insert into domain_alerts (domain, change_key, recipients) values ($1,$2,$3)
     on conflict (domain, change_key) do nothing`,
    [domain, changeKey, sent],
  );
  await sql().query(
    `update domain_snapshots
     set snapshot = $2::jsonb, checked_at = now()
     where domain = $1`,
    [domain, JSON.stringify(next)],
  );
}

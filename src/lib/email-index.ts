import "server-only";

import { sql, hasDatabase } from "@/lib/db";
import { checkDomain } from "@/lib/dns-check";
import { spfSendersAreReadable, detectSpfManager } from "@/lib/sending-platform";
import { INDEX_ROSTER, type IndexSector } from "@/content/index-roster";

/**
 * The Index — the authentication posture of the public internet's better-known
 * senders, measured every day and kept.
 *
 * Once a year this category publishes a PDF called something like "The State
 * of Email Authentication", assembled by a vendor selling the remedy, from a
 * sample nobody can inspect, and it is screenshotted for twelve months. There
 * is no live version. There is no version whose method you can read. There is
 * certainly no version you can query.
 *
 * This is that, run as an instrument: one dated reading per domain per day,
 * from public DNS, against a roster published in full in the repository.
 *
 * ── Two honesty rules, enforced here rather than in the copy ──────────────
 *
 * 1. A domain whose SPF cannot be read — a macro record, or a hosted manager
 *    holding the list behind an include — is recorded as unreadable and is
 *    excluded from every statistic about who authorises whom. It is not
 *    counted as a failure. This site has already shipped that mistake once,
 *    publicly, against three named brands.
 *
 * 2. Percentages are always reported with their denominator. "84% at reject"
 *    with no n is the thing the annual PDFs do, and it is how a sample of
 *    forty becomes an industry.
 */

export interface IndexReading {
  domain: string;
  hasSpf: boolean;
  spfAll: string | null;
  spfLookups: number;
  spfReadable: boolean;
  hasDmarc: boolean;
  dmarcPolicy: string | null;
  dmarcHasRua: boolean;
  dkimKeys: number;
  hasBimi: boolean;
  mxProvider: string | null;
  /** Null when SPF is unreadable: there, the question has no answer. */
  unauthorised: number | null;
}

export interface IndexAggregate {
  day: string;
  /** Domains with a reading on this day. Every percentage's denominator. */
  n: number;
  dmarc: { none: number; quarantine: number; reject: number; absent: number };
  spf: { present: number; strict: number; softfail: number; unreadable: number; overLimit: number };
  rua: number;
  bimi: number;
  /** Of the domains whose SPF we can actually read. */
  readable: number;
  signerMismatch: number;
}

export interface SectorAggregate extends IndexAggregate {
  sector: IndexSector;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Sync the git-tracked roster into the table that carries `added_at`. */
export async function syncRoster(): Promise<number> {
  if (!hasDatabase()) return 0;
  const db = sql();
  for (const d of INDEX_ROSTER) {
    await db.query(
      `insert into index_domains (domain, sector) values ($1, $2)
       on conflict (domain) do update set sector = excluded.sector, retired_at = null`,
      [d.domain, d.sector],
    );
  }
  return INDEX_ROSTER.length;
}

/**
 * Read one domain into the shape the index stores.
 *
 * Everything here comes from `checkDomain`, which is the same code path the
 * public checker runs. There is deliberately no second, cheaper implementation
 * for the index: a benchmark that measures something subtly different from
 * what the product reports is a benchmark nobody can act on.
 */
export async function readDomain(domain: string): Promise<IndexReading> {
  const r = await checkDomain(domain);
  const readable = spfSendersAreReadable(r.facts.spf) && !detectSpfManager(r.facts.spf);

  return {
    domain: r.domain,
    hasSpf: Boolean(r.facts.spf),
    spfAll: r.facts.spfAll,
    spfLookups: r.facts.spfLookups,
    spfReadable: readable,
    hasDmarc: Boolean(r.facts.dmarc),
    dmarcPolicy: r.facts.dmarcPolicy,
    dmarcHasRua: r.facts.dmarcHasRua,
    dkimKeys: r.facts.dkim.length,
    hasBimi: Boolean(r.facts.bimi),
    mxProvider: r.facts.mxProvider,
    /* Read off the result rather than re-derived. The first version of this
       line called the raw detector and so bypassed the subdomain guard, which
       is how "49% of major brands are misconfigured" nearly shipped as a
       headline about Stripe and Klaviyo. */
    unauthorised: readable ? r.unnamedSigners.length : null,
  };
}

export async function recordReading(reading: IndexReading, day = today()): Promise<void> {
  if (!hasDatabase()) return;
  await sql().query(
    `insert into index_snapshots
       (day, domain, has_spf, spf_all, spf_lookups, spf_readable, has_dmarc,
        dmarc_policy, dmarc_has_rua, dkim_keys, has_bimi, mx_provider, unauthorised)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     on conflict (day, domain) do update set
       has_spf = excluded.has_spf, spf_all = excluded.spf_all,
       spf_lookups = excluded.spf_lookups, spf_readable = excluded.spf_readable,
       has_dmarc = excluded.has_dmarc, dmarc_policy = excluded.dmarc_policy,
       dmarc_has_rua = excluded.dmarc_has_rua, dkim_keys = excluded.dkim_keys,
       has_bimi = excluded.has_bimi, mx_provider = excluded.mx_provider,
       unauthorised = excluded.unauthorised, checked_at = now()`,
    [
      day, reading.domain, reading.hasSpf, reading.spfAll, reading.spfLookups,
      reading.spfReadable, reading.hasDmarc, reading.dmarcPolicy, reading.dmarcHasRua,
      reading.dkimKeys, reading.hasBimi, reading.mxProvider, reading.unauthorised,
    ],
  );
}

/**
 * Measure the roster, skipping anything already read today.
 *
 * Concurrency is modest and the batch is capped because this runs inside a
 * 60-second cron ceiling. Resuming rather than restarting is what lets a
 * hundred-domain roster complete across a couple of invocations without ever
 * producing a partial day that looks like a real one — the aggregate always
 * reports its own `n`.
 */
export async function sweepIndex(limit = 40, concurrency = 6): Promise<{
  day: string;
  measured: number;
  remaining: number;
  errors: string[];
}> {
  const day = today();
  if (!hasDatabase()) return { day, measured: 0, remaining: 0, errors: ["no database"] };

  await syncRoster();
  const db = sql();

  const pending = (await db.query(
    `select d.domain from index_domains d
     where d.retired_at is null
       and not exists (
         select 1 from index_snapshots s where s.domain = d.domain and s.day = $1
       )
     order by d.domain
     limit $2`,
    [day, limit],
  )) as unknown as { domain: string }[];

  const errors: string[] = [];
  let measured = 0;

  for (let i = 0; i < pending.length; i += concurrency) {
    const batch = pending.slice(i, i + concurrency);
    await Promise.all(
      batch.map(async ({ domain }) => {
        try {
          const reading = await readDomain(domain);
          await recordReading(reading, day);
          measured += 1;
        } catch (e) {
          /* A resolver failure is not a finding about the domain. It is
             recorded as an error and simply left unmeasured for the day,
             because writing a row of nulls would depress every average with
             our own network trouble. */
          errors.push(`${domain}: ${e instanceof Error ? e.message : "failed"}`);
        }
      }),
    );
  }

  const left = (await db.query(
    `select count(*)::int as n from index_domains d
     where d.retired_at is null
       and not exists (select 1 from index_snapshots s where s.domain = d.domain and s.day = $1)`,
    [day],
  )) as unknown as { n: number }[];

  return { day, measured, remaining: left[0]?.n ?? 0, errors };
}

const AGG_SELECT = `
  count(*)::int as n,
  count(*) filter (where dmarc_policy = 'none')::int as dmarc_none,
  count(*) filter (where dmarc_policy = 'quarantine')::int as dmarc_quarantine,
  count(*) filter (where dmarc_policy = 'reject')::int as dmarc_reject,
  count(*) filter (where not has_dmarc)::int as dmarc_absent,
  count(*) filter (where has_spf)::int as spf_present,
  count(*) filter (where spf_all = '-all')::int as spf_strict,
  count(*) filter (where spf_all = '~all')::int as spf_softfail,
  count(*) filter (where not spf_readable)::int as spf_unreadable,
  count(*) filter (where spf_lookups > 10)::int as spf_over,
  count(*) filter (where dmarc_has_rua)::int as rua,
  count(*) filter (where has_bimi)::int as bimi,
  count(*) filter (where spf_readable)::int as readable,
  count(*) filter (where spf_readable and unauthorised > 0)::int as mismatch
`;

type AggRow = {
  day?: string;
  sector?: IndexSector;
  n: number;
  dmarc_none: number;
  dmarc_quarantine: number;
  dmarc_reject: number;
  dmarc_absent: number;
  spf_present: number;
  spf_strict: number;
  spf_softfail: number;
  spf_unreadable: number;
  spf_over: number;
  rua: number;
  bimi: number;
  readable: number;
  mismatch: number;
};

function toAggregate(r: AggRow, day: string): IndexAggregate {
  return {
    day,
    n: r.n,
    dmarc: {
      none: r.dmarc_none,
      quarantine: r.dmarc_quarantine,
      reject: r.dmarc_reject,
      absent: r.dmarc_absent,
    },
    spf: {
      present: r.spf_present,
      strict: r.spf_strict,
      softfail: r.spf_softfail,
      unreadable: r.spf_unreadable,
      overLimit: r.spf_over,
    },
    rua: r.rua,
    bimi: r.bimi,
    readable: r.readable,
    signerMismatch: r.mismatch,
  };
}

/** The most recent complete-enough reading of the whole index. */
export async function latestAggregate(): Promise<IndexAggregate | null> {
  if (!hasDatabase()) return null;
  const rows = (await sql().query(
    `select day::text as day, ${AGG_SELECT}
     from index_snapshots
     where day = (select max(day) from index_snapshots)
     group by day`,
  )) as unknown as AggRow[];
  if (!rows.length) return null;
  return toAggregate(rows[0], rows[0].day ?? today());
}

export async function aggregateBySector(): Promise<SectorAggregate[]> {
  if (!hasDatabase()) return [];
  const rows = (await sql().query(
    `select d.sector, ${AGG_SELECT}
     from index_snapshots s
     join index_domains d on d.domain = s.domain
     where s.day = (select max(day) from index_snapshots)
     group by d.sector order by d.sector`,
  )) as unknown as AggRow[];
  return rows.map((r) => ({
    ...toAggregate(r, today()),
    sector: r.sector as IndexSector,
  }));
}

/** The series everybody screenshots. Oldest first, for plotting. */
export async function indexSeries(days = 180): Promise<IndexAggregate[]> {
  if (!hasDatabase()) return [];
  const rows = (await sql().query(
    `select day::text as day, ${AGG_SELECT}
     from index_snapshots group by day order by day desc limit $1`,
    [days],
  )) as unknown as AggRow[];
  return rows.map((r) => toAggregate(r, r.day ?? "")).reverse();
}

/** Every domain's latest reading, for the full published table. */
export async function latestReadings(): Promise<(IndexReading & { sector: IndexSector; day: string })[]> {
  if (!hasDatabase()) return [];
  const rows = (await sql().query(
    `select s.day::text as day, s.domain, d.sector, s.has_spf, s.spf_all, s.spf_lookups,
            s.spf_readable, s.has_dmarc, s.dmarc_policy, s.dmarc_has_rua,
            s.dkim_keys, s.has_bimi, s.mx_provider, s.unauthorised
     from index_snapshots s
     join index_domains d on d.domain = s.domain
     where s.day = (select max(day) from index_snapshots)
     order by d.sector, s.domain`,
  )) as unknown as Record<string, unknown>[];

  return rows.map((r) => ({
    day: r.day as string,
    domain: r.domain as string,
    sector: r.sector as IndexSector,
    hasSpf: r.has_spf as boolean,
    spfAll: r.spf_all as string | null,
    spfLookups: r.spf_lookups as number,
    spfReadable: r.spf_readable as boolean,
    hasDmarc: r.has_dmarc as boolean,
    dmarcPolicy: r.dmarc_policy as string | null,
    dmarcHasRua: r.dmarc_has_rua as boolean,
    dkimKeys: r.dkim_keys as number,
    hasBimi: r.has_bimi as boolean,
    mxProvider: r.mx_provider as string | null,
    unauthorised: r.unauthorised as number | null,
  }));
}

/**
 * What moved in the index since the previous reading.
 *
 * The daily hook. A brand climbing from p=none to p=quarantine is a real event
 * that nobody currently reports, and the first place it will ever appear is
 * here.
 */
export async function indexMoves(): Promise<
  { from: string; to: string; moves: { domain: string; field: string; from: string; to: string }[] } | null
> {
  if (!hasDatabase()) return null;
  const db = sql();
  const days = (await db.query(
    `select distinct day::text as day from index_snapshots order by day desc limit 2`,
  )) as unknown as { day: string }[];
  if (days.length < 2) return null;
  const [to, from] = [days[0].day, days[1].day];

  const rows = (await db.query(
    `select c.domain,
            p.dmarc_policy as p_dmarc, c.dmarc_policy as c_dmarc,
            p.spf_all as p_spf, c.spf_all as c_spf,
            p.dkim_keys as p_dkim, c.dkim_keys as c_dkim
     from index_snapshots c
     join index_snapshots p on p.domain = c.domain and p.day = $1
     where c.day = $2
       and (p.dmarc_policy is distinct from c.dmarc_policy
            or p.spf_all is distinct from c.spf_all
            or p.dkim_keys is distinct from c.dkim_keys)
     order by c.domain`,
    [from, to],
  )) as unknown as Record<string, unknown>[];

  const moves: { domain: string; field: string; from: string; to: string }[] = [];
  for (const r of rows) {
    const domain = r.domain as string;
    if (r.p_dmarc !== r.c_dmarc) {
      moves.push({ domain, field: "DMARC policy", from: String(r.p_dmarc ?? "none published"), to: String(r.c_dmarc ?? "none published") });
    }
    if (r.p_spf !== r.c_spf) {
      moves.push({ domain, field: "SPF all", from: String(r.p_spf ?? "absent"), to: String(r.c_spf ?? "absent") });
    }
    if (r.p_dkim !== r.c_dkim) {
      moves.push({ domain, field: "DKIM keys", from: String(r.p_dkim), to: String(r.c_dkim) });
    }
  }
  return { from, to, moves };
}

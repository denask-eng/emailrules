import "server-only";

import { sql, hasDatabase } from "@/lib/db";
import { census, type CensusRow } from "@/lib/blocklist-check";
import type { ListStatus } from "@/lib/blocklist-check";

/**
 * The census, kept.
 *
 * `census()` asks every blocklist zone the same question at the same moment
 * and checks each answer against its RFC 5782 controls. That reading has
 * always been correct and has always been thrown away at the end of the
 * request, which meant this site could say "SORBS is dead" but could not show
 * when it died.
 *
 * A dated series is a different kind of object from a page. Nobody can
 * backfill four hundred days of it, and it answers questions no single reading
 * can: how long a zone has been silent, whether a "temporary" outage ever
 * ended, which lists the industry still recommends that have not answered
 * since a date we can name.
 *
 * Append-only by day. Nothing here is ever updated in place, because a series
 * you can edit is not evidence.
 */

export interface CensusDay {
  day: string;
  zone: string;
  label: string;
  status: ListStatus;
  queried: boolean;
  kind: string | null;
  note: string | null;
}

/** What moved between two consecutive readings. The daily hook. */
export interface CensusMove {
  zone: string;
  label: string;
  from: ListStatus;
  to: ListStatus;
  /** True when a zone we do not query started answering again. */
  returned: boolean;
}

export interface ZoneStreak {
  zone: string;
  label: string;
  status: ListStatus;
  /** ISO date this zone last answered, or null if never in our record. */
  lastAnswered: string | null;
  /** Consecutive days in the current status, as far back as the record goes. */
  days: number;
  queried: boolean;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Take a reading and keep it.
 *
 * Idempotent per day on purpose: a cron that fires twice, or a manual run
 * after a failure, must not produce two conflicting readings for one date.
 * The later run wins, because a re-read is a better measurement than the one
 * that preceded it on the same day.
 */
export async function recordCensus(rows?: CensusRow[]): Promise<{ day: string; zones: number }> {
  const reading = rows ?? (await census());
  const day = today();

  if (!hasDatabase()) return { day, zones: 0 };
  const db = sql();

  for (const row of reading) {
    await db.query(
      `insert into census_snapshots (day, zone, label, status, queried, kind, note)
       values ($1, $2, $3, $4, $5, $6, $7)
       on conflict (day, zone) do update set
         status = excluded.status,
         queried = excluded.queried,
         label = excluded.label,
         kind = excluded.kind,
         note = excluded.note,
         checked_at = now()`,
      [day, row.zone, row.label, row.status, row.queried, row.kind ?? null, row.note ?? null],
    );
  }

  return { day, zones: reading.length };
}

/** Every reading for one day. Defaults to the most recent day on record. */
export async function censusForDay(day?: string): Promise<CensusDay[]> {
  if (!hasDatabase()) return [];
  const db = sql();
  const rows = day
    ? await db.query(
        `select day::text, zone, label, status, queried, kind, note
         from census_snapshots where day = $1 order by queried desc, label`,
        [day],
      )
    : await db.query(
        `select day::text, zone, label, status, queried, kind, note
         from census_snapshots
         where day = (select max(day) from census_snapshots)
         order by queried desc, label`,
      );
  return rows as unknown as CensusDay[];
}

/** The days we hold a reading for, newest first. */
export async function censusDays(limit = 120): Promise<string[]> {
  if (!hasDatabase()) return [];
  const db = sql();
  const rows = (await db.query(
    `select distinct day::text as day from census_snapshots order by day desc limit $1`,
    [limit],
  )) as unknown as { day: string }[];
  return rows.map((r) => r.day);
}

/**
 * What changed between the two most recent readings.
 *
 * This is the reason to come back tomorrow. A blocklist going silent, or a
 * dead one answering again, is news to everybody who queries it — and today
 * nobody in the category publishes it, because nobody is measuring daily.
 */
export async function censusMoves(): Promise<{ from: string; to: string; moves: CensusMove[] } | null> {
  if (!hasDatabase()) return null;
  const db = sql();
  const days = (await db.query(
    `select distinct day::text as day from census_snapshots order by day desc limit 2`,
  )) as unknown as { day: string }[];
  if (days.length < 2) return null;

  const [to, from] = [days[0].day, days[1].day];
  const rows = (await db.query(
    `select curr.zone, curr.label, prev.status as from_status, curr.status as to_status, curr.queried
     from census_snapshots curr
     join census_snapshots prev on prev.zone = curr.zone and prev.day = $1
     where curr.day = $2 and curr.status is distinct from prev.status
     order by curr.label`,
    [from, to],
  )) as unknown as {
    zone: string;
    label: string;
    from_status: ListStatus;
    to_status: ListStatus;
    queried: boolean;
  }[];

  return {
    from,
    to,
    moves: rows.map((r) => ({
      zone: r.zone,
      label: r.label,
      from: r.from_status,
      to: r.to_status,
      /* A zone we refuse to query that has started answering is the single
         most actionable line this whole instrument can produce: it means our
         own roster is out of date, in public. */
      returned: !r.queried && r.to_status === "answered",
    })),
  };
}

/**
 * How long each zone has been in its current state.
 *
 * "SORBS has not answered since 12 June 2024" is a far stronger sentence than
 * "SORBS is dead", and it is the sentence only a kept series can produce.
 */
export async function zoneStreaks(): Promise<ZoneStreak[]> {
  if (!hasDatabase()) return [];
  const db = sql();

  const rows = (await db.query(
    `with latest as (
       select zone, label, status, queried
       from census_snapshots
       where day = (select max(day) from census_snapshots)
     ),
     last_answer as (
       select zone, max(day) as last_answered
       from census_snapshots where status = 'answered'
       group by zone
     ),
     run as (
       select c.zone, count(*)::int as days
       from census_snapshots c
       join latest l on l.zone = c.zone
       where c.status = l.status
         and c.day > coalesce((
           select max(x.day) from census_snapshots x
           where x.zone = c.zone and x.status is distinct from l.status
         ), '1970-01-01'::date)
       group by c.zone
     )
     select l.zone, l.label, l.status, l.queried,
            la.last_answered::text as last_answered,
            coalesce(r.days, 1) as days
     from latest l
     left join last_answer la on la.zone = l.zone
     left join run r on r.zone = l.zone
     order by l.queried desc, l.label`,
  )) as unknown as {
    zone: string;
    label: string;
    status: ListStatus;
    queried: boolean;
    last_answered: string | null;
    days: number;
  }[];

  return rows.map((r) => ({
    zone: r.zone,
    label: r.label,
    status: r.status,
    queried: r.queried,
    lastAnswered: r.last_answered,
    days: r.days,
  }));
}

/** Answering / total, per day, for the sparkline on the census page. */
export async function censusSeries(days = 90): Promise<{ day: string; answered: number; total: number }[]> {
  if (!hasDatabase()) return [];
  const db = sql();
  const rows = (await db.query(
    `select day::text as day,
            count(*) filter (where status = 'answered')::int as answered,
            count(*)::int as total
     from census_snapshots
     group by day order by day desc limit $1`,
    [days],
  )) as unknown as { day: string; answered: number; total: number }[];
  return rows.reverse();
}

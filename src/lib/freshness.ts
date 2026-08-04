/**
 * Reading a verification date, and reading a fetch failure.
 *
 * Deliberately free of imports — no `server-only`, no database — so the two
 * judgements that decide whether this shelf is telling the truth can be tested
 * from plain Node. `source-watch.ts` re-exports them; nothing here touches the
 * network, so everything here is a pure function of a string.
 */

export type Staleness = "fresh" | "ageing" | "stale" | "unknown";

/**
 * How stale a date is, in the site's own language.
 *
 * Bands rather than a raw day count because "verified 4 months ago" is a
 * judgement a reader can act on and "127 days" is arithmetic homework.
 *
 * A missing date is `unknown`, never `fresh`. That is the inversion that would
 * matter most: if no date read as fresh, an unverified claim would be
 * indistinguishable from one checked this morning, which is precisely the
 * failure this site accuses other tools of. A date in the future is unknown
 * too — a typo must not buy a rule a permanent green tick.
 */
export function stalenessOf(
  lastVerified: string | null | undefined,
  now: Date = new Date(),
): Staleness {
  const days = daysSinceVerified(lastVerified, now);
  if (days === null) return "unknown";
  if (days <= 90) return "fresh";
  if (days <= 180) return "ageing";
  return "stale";
}

export function daysSinceVerified(
  lastVerified: string | null | undefined,
  now: Date = new Date(),
): number | null {
  if (!lastVerified) return null;
  const then = new Date(lastVerified).getTime();
  if (!Number.isFinite(then)) return null;
  const days = Math.floor((now.getTime() - then) / 864e5);
  return Number.isFinite(days) && days >= 0 ? days : null;
}

/**
 * A dead citation and an unverifiable one are different facts.
 *
 * 404 and 410 are the page telling us it is gone: the corpus cites something
 * that no longer exists, and that is rot a person must fix. 403 and a timeout
 * are a site refusing an automated reader — measured on 4 Aug 2026,
 * check.spamhaus.org, law.justia.com and the Maryland AG all return 403 to a
 * browser too, so they say nothing about whether the page still exists.
 *
 * Counting those together would repeat exactly the error the blocklist census
 * exists to call out, where a zone that could not answer is scored the same as
 * one that answered "clean".
 */
export function isGone(error: string | null | undefined): boolean {
  return /HTTP (404|410)(?!\d)/.test(error ?? "");
}

import { cache } from "react";
import { RULES as SEED } from "@/content/rules";
import { sql, hasDatabase } from "@/lib/db";
import type { Rule, RuleStatus, Topic, Jurisdiction, Ownership } from "@/lib/types";

/**
 * The single data-access seam.
 *
 * Reads now come from Postgres. Every page in the app goes through these
 * functions and none of them changed when the storage did, which is the whole
 * reason this file was written as a seam in the first place.
 *
 * `src/content/rules.ts` stays in the repo as the git-tracked origin of the
 * corpus and as the fallback: if DATABASE_URL is absent, on a fresh clone or a
 * preview without env, the site still builds and serves the seeded array
 * rather than erroring. The database is authoritative whenever it is present.
 *
 * `cache()` dedupes within a single request, so a page that calls getStats()
 * and getAllRules() hits Postgres once, not twice.
 */

const loadAll = cache(async (): Promise<Rule[]> => {
  if (!hasDatabase()) return SEED;
  try {
    const rows = (await sql()`select data from rules`) as { data: Rule }[];
    /* An empty table means the migration has not run yet. Falling back beats
       showing a visitor an empty reference. */
    return rows.length ? rows.map((r) => r.data) : SEED;
  } catch (err) {
    console.error("[rules] database read failed, serving the seeded corpus:", err);
    return SEED;
  }
});

export async function getAllRules(): Promise<Rule[]> {
  return loadAll();
}

export async function getRule(slug: string): Promise<Rule | null> {
  const all = await loadAll();
  return all.find((r) => r.slug === slug) ?? null;
}

export async function getRulesByTopic(topic: Topic): Promise<Rule[]> {
  return (await loadAll()).filter((r) => r.topic === topic);
}

export async function getRulesByJurisdiction(j: Jurisdiction): Promise<Rule[]> {
  return (await loadAll()).filter((r) => r.jurisdictions.includes(j));
}

/** Newest change first. This drives the homepage and the changelog. */
export async function getChangelog(limit?: number): Promise<
  Array<{ rule: Rule; date: string; note: string }>
> {
  const all = await loadAll();
  const entries = all
    .flatMap((rule) => rule.changelog.map((c) => ({ rule, date: c.date, note: c.note })))
    .sort((a, b) => b.date.localeCompare(a.date));
  return limit ? entries.slice(0, limit) : entries;
}

/** Rules whose status changed, or that were added, inside the window. */
export async function getRecentlyChanged(days = 90): Promise<Rule[]> {
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  return (await loadAll())
    .filter((r) => r.updated >= cutoff)
    .sort((a, b) => b.updated.localeCompare(a.updated));
}

export async function countsByTopic(): Promise<Record<string, number>> {
  return (await loadAll()).reduce<Record<string, number>>((acc, r) => {
    acc[r.topic] = (acc[r.topic] ?? 0) + 1;
    return acc;
  }, {});
}

export async function countsByOwnership(): Promise<Record<Ownership, number>> {
  return (await loadAll()).reduce(
    (acc, r) => {
      acc[r.ownership] += 1;
      return acc;
    },
    { esp: 0, shared: 0, yours: 0, context: 0 } as Record<Ownership, number>,
  );
}

export async function getRulesByOwnership(o: Ownership): Promise<Rule[]> {
  return (await loadAll()).filter((r) => r.ownership === o);
}

export async function getStats() {
  const all = await loadAll();
  const changed = await getRecentlyChanged(90);
  const own = await countsByOwnership();
  return {
    total: all.length,
    changed90: changed.length,
    inForce: all.filter((r) => r.status === "in_force").length,
    upcoming: all.filter((r) => r.status === "upcoming").length,
    lastReview: all.reduce((max, r) => (r.lastVerified > max ? r.lastVerified : max), ""),
    /**
     * The numbers that make this a reference rather than a compliance scare sheet.
     *
     * `shared` and `fullyHandled` are separate on purpose. Folding them together
     * is how the homepage came to say "only 15 of 39 need a person": `notYours`
     * counts all three of esp, shared and context, and `shared` is defined by
     * this site as "part platform, part you — the judgement is still yours".
     * Eighteen rules whose judgement is yours are not rules nobody has to read,
     * and exactly one rule on the shelf is genuinely finished for you.
     */
    yours: own.yours,
    shared: own.shared,
    fullyHandled: own.esp,
    notYours: own.esp + own.shared + own.context,
    espHandled: own.esp + own.shared,
    nothingToDo: own.context,
  };
}

export function statusOf(rule: Rule): RuleStatus {
  return rule.status;
}

/* Re-exported so server callers keep one import site. Client components must
   import these from @/lib/format directly, never through this file. */
export { fmtDate, daysSince } from "@/lib/format";

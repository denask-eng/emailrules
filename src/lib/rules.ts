import { RULES, RULES_BY_SLUG } from "@/content/rules";
import type { Rule, RuleStatus, Topic, Jurisdiction } from "@/lib/types";

/**
 * The single data-access seam.
 *
 * Today this reads the typed corpus in src/content/rules.ts. When the admin
 * lands, only the bodies of these functions change to hit Postgres; nothing
 * that imports them needs to know. Keep every read in this file.
 */

export async function getAllRules(): Promise<Rule[]> {
  return RULES;
}

export async function getRule(slug: string): Promise<Rule | null> {
  return RULES_BY_SLUG.get(slug) ?? null;
}

export async function getRulesByTopic(topic: Topic): Promise<Rule[]> {
  return RULES.filter((r) => r.topic === topic);
}

export async function getRulesByJurisdiction(j: Jurisdiction): Promise<Rule[]> {
  return RULES.filter((r) => r.jurisdictions.includes(j));
}

/** Newest change first. This drives the homepage and the RSS feed. */
export async function getChangelog(limit?: number): Promise<
  Array<{ rule: Rule; date: string; note: string }>
> {
  const entries = RULES.flatMap((rule) =>
    rule.changelog.map((c) => ({ rule, date: c.date, note: c.note })),
  ).sort((a, b) => b.date.localeCompare(a.date));
  return limit ? entries.slice(0, limit) : entries;
}

/** Rules whose status changed, or that were added, inside the window. */
export async function getRecentlyChanged(days = 90): Promise<Rule[]> {
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  return RULES.filter((r) => r.updated >= cutoff).sort((a, b) =>
    b.updated.localeCompare(a.updated),
  );
}

export async function countsByTopic(): Promise<Record<string, number>> {
  return RULES.reduce<Record<string, number>>((acc, r) => {
    acc[r.topic] = (acc[r.topic] ?? 0) + 1;
    return acc;
  }, {});
}

export async function getStats() {
  const changed = await getRecentlyChanged(90);
  return {
    total: RULES.length,
    changed90: changed.length,
    inForce: RULES.filter((r) => r.status === "in_force").length,
    upcoming: RULES.filter((r) => r.status === "upcoming").length,
    lastReview: RULES.reduce((max, r) => (r.lastVerified > max ? r.lastVerified : max), ""),
  };
}

export function statusOf(rule: Rule): RuleStatus {
  return rule.status;
}

/** en-GB, unambiguous, matches the mono tabular treatment in the UI. */
export function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${d} ${months[m - 1]} ${y}`;
}

export function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

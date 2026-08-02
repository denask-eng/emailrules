import type { Rule, Ownership, Topic } from "@/lib/types";

/**
 * Presentation helpers for the rules list and changelog.
 * Pure functions — safe in client components.
 */

export type Freshness = "new" | "updated" | "stable";
export type ChangeKind = "market" | "added" | "reverify" | "correction" | "other";

/** One-word job of the rule — scan label, not a legal category. */
export type Impact = "inbox" | "legal" | "measure" | "hygiene" | "auth" | "content";

export const IMPACT_LABEL: Record<Impact, string> = {
  inbox: "Inbox",
  legal: "Legal",
  measure: "Metrics",
  hygiene: "Hygiene",
  auth: "Auth",
  content: "Content",
};

const TOPIC_IMPACT: Record<Topic, Impact> = {
  "consent-tracking": "legal",
  authentication: "auth",
  "provider-rules": "inbox",
  "content-claims": "content",
  "ai-disclosure": "legal",
  measurement: "measure",
  "bounces-hygiene": "hygiene",
};

export function impactOf(rule: Rule): Impact {
  return TOPIC_IMPACT[rule.topic] ?? "content";
}

/** One short "so what?" line for list rows. Prefer plain; fall back cleanly. */
export function whyItMatters(rule: Rule): string {
  const raw = (rule.plain || rule.answer || "").trim();
  const first = raw.split(/(?<=[.!?])\s+/)[0] ?? raw;
  if (first.length <= 160) return first;
  return `${first.slice(0, 157).trim()}…`;
}

/**
 * Is this page "new" to the site, newly important, or just sitting there?
 * Uses changelog notes first so bulk "Added" seeds read as New, not market news.
 */
export function freshness(rule: Rule, withinDays = 45): Freshness {
  const latest = [...rule.changelog].sort((a, b) => b.date.localeCompare(a.date))[0];
  const kind = latest ? changeKind(latest.note) : "other";
  const recent = daysAgo(rule.updated) <= withinDays || daysAgo(rule.added) <= withinDays;

  if (kind === "added" && daysAgo(rule.added) <= withinDays) return "new";
  if (kind === "market" || kind === "correction") return recent ? "updated" : "stable";
  if (rule.updated > rule.added && recent && kind !== "reverify") return "updated";
  if (kind === "reverify") return "stable";
  return "stable";
}

export function changeKind(note: string): ChangeKind {
  const n = note.toLowerCase().trim();
  if (/\bre-?verif/.test(n) || /\bstill (true|current|in force)\b/.test(n)) return "reverify";
  if (/\bcorrect/.test(n) || /\bwrong\b/.test(n) || /\bfixed\b/.test(n) || /\bwe were wrong\b/.test(n)) {
    return "correction";
  }
  /* Site documentation events — not the same as a regulator moving. */
  if (
    /^added\b/.test(n) ||
    /\badded from\b/.test(n) ||
    /\badded\./.test(n) ||
    /\badded,?\b/.test(n) ||
    /\badded after\b/.test(n) ||
    /\badded the\b/.test(n) ||
    /\badded standalone\b/.test(n) ||
    /\badded with\b/.test(n) ||
    /\badded\. explicitly\b/.test(n) ||
    /\bpage\b/.test(n) && /\badded\b/.test(n)
  ) {
    return "added";
  }
  if (
    /\bstatus moved\b/.test(n) ||
    /\btransition period ended\b/.test(n) ||
    /\bmoved from upcoming\b/.test(n) ||
    /\bmoved to in force\b/.test(n) ||
    /\bretired\b/.test(n) ||
    /\bnoted the\b/.test(n) ||
    /\bexpanded to\b/.test(n) ||
    /\bclarified\b/.test(n)
  ) {
    return "market";
  }
  return "other";
}

export const FRESHNESS_LABEL: Record<Freshness, string> = {
  new: "New on site",
  updated: "Updated",
  stable: "Stable",
};

export const CHANGE_KIND_LABEL: Record<ChangeKind, string> = {
  market: "Rule moved",
  added: "We documented it",
  reverify: "Re-checked",
  correction: "Correction",
  other: "Note",
};

/** Sort: act first, then shared, then time-sensitive upcoming, then rest. */
export function sortForMarketer(
  rules: Rule[],
  roleBoost?: (topic: string) => number,
): Rule[] {
  const own: Record<Ownership, number> = { yours: 0, shared: 1, esp: 2, context: 3 };
  return [...rules].sort((a, b) => {
    const oa = own[a.ownership] - own[b.ownership];
    if (oa !== 0) return oa;
    if (roleBoost) {
      const rb = roleBoost(a.topic) - roleBoost(b.topic);
      if (rb !== 0) return rb;
    }
    /* Upcoming with nearer dates first within same ownership */
    if (a.status === "upcoming" && b.status === "upcoming") {
      return a.effectiveDate.localeCompare(b.effectiveDate);
    }
    if (a.status === "upcoming") return -1;
    if (b.status === "upcoming") return 1;
    const fa = freshnessRank(freshness(a)) - freshnessRank(freshness(b));
    if (fa !== 0) return fa;
    return b.updated.localeCompare(a.updated) || a.title.localeCompare(b.title);
  });
}

function freshnessRank(f: Freshness): number {
  return f === "updated" ? 0 : f === "new" ? 1 : 2;
}

function daysAgo(iso: string): number {
  return Math.floor((Date.now() - new Date(iso + "T12:00:00Z").getTime()) / 86_400_000);
}

export function briefCounts(rules: Rule[]) {
  return {
    total: rules.length,
    act: rules.filter((r) => r.ownership === "yours").length,
    shared: rules.filter((r) => r.ownership === "shared").length,
    handled: rules.filter((r) => r.ownership === "esp").length,
    fyi: rules.filter((r) => r.ownership === "context").length,
    upcoming: rules.filter((r) => r.status === "upcoming").length,
  };
}

/**
 * The five things worth opening first: your desk + coming deadlines,
 * then shared. Never pad with FYI.
 */
export function topForYou(
  rules: Rule[],
  n = 5,
  roleBoost?: (topic: string) => number,
): Rule[] {
  const sorted = sortForMarketer(rules, roleBoost);
  const priority = sorted.filter(
    (r) => r.ownership === "yours" || r.status === "upcoming" || r.ownership === "shared",
  );
  const pick = priority.length >= n ? priority : sorted;
  return pick.slice(0, n);
}

/** Changelog entries that are real market/correction moves — not "we wrote a page". */
export function isMarketChange(note: string): boolean {
  const k = changeKind(note);
  return k === "market" || k === "correction";
}

/**
 * Sticky risks when the market is quiet: still-true obligations that need a person.
 * Used on the homepage empty ledger so quiet weeks are not blank weeks.
 */
export function stickyRisks(rules: Rule[], n = 3): Rule[] {
  return sortForMarketer(
    rules.filter(
      (r) =>
        r.status === "in_force" &&
        (r.ownership === "yours" || r.ownership === "shared"),
    ),
  ).slice(0, n);
}

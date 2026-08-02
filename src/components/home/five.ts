import {
  EMPTY_AUDIENCE,
  ROLE_PRESETS,
  audienceToSearch,
  matchesAudience,
  roleTopicBoost,
  type Audience,
} from "@/lib/audience";
import {
  FRESHNESS_LABEL,
  IMPACT_LABEL,
  freshness,
  impactOf,
  topForYou,
} from "@/lib/rule-signals";
import { displayTldr } from "@/content/plain-overrides";
import { fmtDate } from "@/lib/format";
import type { Ownership, Rule } from "@/lib/types";

/**
 * The homepage answers in place, so every answer it can give is computed on the
 * server and shipped with the page. Five roles × five rules is a few kilobytes;
 * shipping the corpus to the browser to filter it there would be a hundred.
 *
 * The selection logic itself is not reimplemented here — matchesAudience,
 * roleTopicBoost and topForYou are the same functions /rules and /brief use, so
 * a tap on the homepage cannot disagree with the page it links to.
 */

/** "" is the un-picked default: the whole shelf, most urgent first. */
export type RoleKey = "" | "newbie" | "lifecycle" | "deliverability" | "multi";

export const ROLE_KEYS: readonly RoleKey[] = [
  "newbie",
  "lifecycle",
  "deliverability",
  "multi",
];

export type FiveCard = {
  slug: string;
  title: string;
  ownership: Ownership;
  /** Impact · jurisdictions · provider · freshness — the same scan line /rules prints. */
  meta: string;
  /** Set only when the obligation has not started yet. */
  from?: string;
  /** One plain-English sentence. */
  tldr: string;
  /** The single concrete move. */
  first: string;
};

export type FiveSet = {
  cards: FiveCard[];
  /** Everything this pick matches, so “the rest” is a real number, not a tease. */
  matched: number;
  /** /rules carrying the pick, so the link works before any JS runs. */
  href: string;
};

/** Long `mondayMorning` entries carry a second sentence of reasoning. One is enough here. */
function oneSentence(text: string, max = 150): string {
  const t = text.trim();
  const first = t.split(/(?<=[.!?])\s+/)[0] ?? t;
  return first.length <= max ? first : `${first.slice(0, max - 1).trimEnd()}…`;
}

function cardOf(rule: Rule): FiveCard {
  const f = freshness(rule);
  return {
    slug: rule.slug,
    title: rule.title,
    ownership: rule.ownership,
    meta: [
      IMPACT_LABEL[impactOf(rule)],
      ...rule.jurisdictions.slice(0, 3),
      ...(rule.provider ? [rule.provider] : []),
      ...(f !== "stable" ? [FRESHNESS_LABEL[f]] : []),
    ].join(" · "),
    ...(rule.status === "upcoming" ? { from: fmtDate(rule.effectiveDate) } : {}),
    tldr: displayTldr(rule.slug, rule.plain),
    first: oneSentence(rule.mondayMorning),
  };
}

function setFor(rules: Rule[], audience: Audience): FiveSet {
  const matched = rules.filter((r) => matchesAudience(r, audience));
  const boost = (topic: string) => roleTopicBoost(topic, audience.role);
  return {
    cards: topForYou(matched, 5, boost).map(cardOf),
    matched: matched.length,
    href: `/rules${audienceToSearch(audience)}`,
  };
}

export function buildFiveSets(rules: Rule[]): Record<RoleKey, FiveSet> {
  const sets = { "": setFor(rules, EMPTY_AUDIENCE) } as Record<RoleKey, FiveSet>;
  for (const key of ROLE_KEYS) {
    const preset = ROLE_PRESETS.find((p) => p.id === key);
    sets[key] = setFor(rules, preset?.audience ?? EMPTY_AUDIENCE);
  }
  return sets;
}

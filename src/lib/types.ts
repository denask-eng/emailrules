/**
 * The content model. One Rule = one URL = one answerable question.
 *
 * Every field exists for a reason tied to the strategy:
 *  - `question` is the long-tail search query the page targets verbatim.
 *  - `effectiveDate` + `status` drive the changelog, which is the product.
 *  - `source*` is non-negotiable: a claim without a citation does not ship.
 *  - `lastVerified` is the currency signal. Stale pages must look stale.
 *  - `enforcement` keeps us honest where the obligation is real but untested.
 */

export type RuleStatus =
  | "in_force"    // applies today
  | "upcoming"    // dated, not yet biting
  | "proposed"    // real proposal, not law
  | "superseded"; // replaced; kept for the record

export type Jurisdiction =
  | "EU" | "FR" | "IT" | "DE" | "UK"
  | "US" | "US-WA" | "US-CA" | "US-MD"
  | "CA" | "Global";

export type Topic =
  | "consent-tracking"
  | "authentication"
  | "provider-rules"
  | "content-claims"
  | "ai-disclosure"
  | "measurement"
  | "bounces-hygiene";

export type Actor =
  | "regulator" | "court" | "mailbox-provider" | "esp" | "standards-body";

export interface RuleSource {
  /** Human citation, e.g. "CNIL délibération n° 2026-042" */
  name: string;
  url: string;
  /** ISO date the source was published */
  published: string;
  /** Who issued it — drives the "who says so" badge */
  actor: Actor;
}

export interface ChangelogEntry {
  /** ISO date */
  date: string;
  /** What changed about THIS rule, in one sentence */
  note: string;
}

export interface Rule {
  slug: string;
  /** Page H1. Declarative, not a headline. */
  title: string;
  /** The exact question a person types. Used for FAQ schema + meta description. */
  question: string;

  status: RuleStatus;
  /** ISO date the obligation starts (or started) */
  effectiveDate: string;
  jurisdictions: Jurisdiction[];
  topic: Topic;
  /** Optional: which provider this concerns, e.g. "Gmail", "Klaviyo" */
  provider?: string;

  /** The plain answer, 2-4 sentences. No preamble. */
  answer: string;
  /** Who is on the hook */
  appliesTo: string;
  /** Imperative bullets */
  whatToDo: string[];
  /** The carve-out, stated precisely. Omit if none. */
  exempt?: string;
  /**
   * What actually happens if you ignore it. This field is where we refuse to
   * overstate — if nobody has been fined, the page says nobody has been fined.
   */
  enforcement: string;

  sources: RuleSource[];
  /** slugs of related rules */
  related?: string[];

  added: string;
  updated: string;
  lastVerified: string;
  changelog: ChangelogEntry[];

  /** Surfaces on the homepage changelog when true */
  featured?: boolean;
}

export const TOPICS: Record<Topic, { label: string; blurb: string }> = {
  "consent-tracking": {
    label: "Consent and tracking",
    blurb: "Permission to email, permission to measure, and why they are not the same thing.",
  },
  authentication: {
    label: "Authentication",
    blurb: "SPF, DKIM, DMARC, alignment, and the traps that pass a checker but fail in the wild.",
  },
  "provider-rules": {
    label: "Provider rules",
    blurb: "What Gmail, Yahoo, Microsoft and Apple require, with the numbers they enforce on.",
  },
  "content-claims": {
    label: "Content and claims",
    blurb: "What a subject line may promise, and what happens when the promise is not true.",
  },
  "ai-disclosure": {
    label: "AI disclosure",
    blurb: "When AI-generated copy and imagery must be labelled, and when they must not.",
  },
  measurement: {
    label: "Measurement",
    blurb: "Which numbers still mean something, and which ones your platform is flattering.",
  },
  "bounces-hygiene": {
    label: "Bounces and hygiene",
    blurb: "Suppression, retries, and the classifications every platform gets slightly wrong.",
  },
};

export const STATUS_LABEL: Record<RuleStatus, string> = {
  in_force: "In force",
  upcoming: "Upcoming",
  proposed: "Proposed",
  superseded: "Superseded",
};

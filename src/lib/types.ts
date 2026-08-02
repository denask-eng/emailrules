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
  | "US" | "US-WA" | "US-CA" | "US-MD" | "US-CO"
  | "CA" | "AU" | "Global";

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

/**
 * Named email *tools* (ESPs) for personalization — not mailbox providers.
 * Keep this list short; add only when we have sourced product pages or
 * mainstream applicability language.
 */
export type EspProductId =
  | "klaviyo"
  | "mailchimp"
  | "braze"
  | "hubspot"
  | "sfmc"
  | "omnisend"
  | "activecampaign";

/**
 * Which email tools this page is written for.
 * - undefined | "all" — every programme (default)
 * - "mainstream" — any major ESP; still true for “other” (same physics)
 * - EspProductId[] — product-specific UI/settings (only those tools)
 *
 * Separate from `provider` (Gmail / Apple / Microsoft mailbox stack).
 */
export type EspApplicability = "all" | "mainstream" | EspProductId[];

/**
 * Who actually has to do the work.
 *
 * This is the field that stops the site becoming another compliance scare
 * sheet. Most rule changes are absorbed by the platform: Klaviyo shipped
 * one-click unsubscribe long before anyone read RFC 8058. Telling a working
 * email marketer to "implement" something their ESP has done automatically
 * for two years is how a reference proves it has never opened the tool.
 *
 * So every rule states it plainly, including when the honest answer is
 * "nothing, you are already fine".
 */
export type Ownership =
  | "esp"      // the platform does this for you; there is nothing on your desk
  | "shared"   // the platform does part of it, the rest is genuinely yours
  | "yours"    // nobody does this for you
  | "context"; // nothing to action; it changes a risk or a number you report

export interface Handled {
  /** What the major platforms already do automatically. Name them. */
  already: string;
  /** The part still on your desk. Omit when there honestly isn't one. */
  stillYours?: string;
}

export interface RuleSource {
  /** Human citation, e.g. "CNIL délibération n° 2026-042" */
  name: string;
  url: string;
  /**
   * ISO date the source was published or last updated.
   *
   * Optional on purpose. Some publishers, Google's help centre among them,
   * put no date on the page at all. Inventing a plausible one is how a cited
   * reference quietly becomes fiction, so an undated source says so instead.
   */
  published?: string;
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
  /**
   * Mailbox / infrastructure this page is about (Gmail, Apple, Microsoft, Yahoo).
   * Not your ESP brand — use `esp` for product-specific tools.
   */
  provider?: string;
  /**
   * ESP product applicability. Prefer this over stuffing "Klaviyo" into provider.
   * Durable filter target for multi-ESP personalization.
   */
  esp?: EspApplicability;

  /** The plain answer, 2-4 sentences. No preamble. */
  answer: string;
  /** The same fact said like a colleague. Wit allowed, accuracy never traded for it. */
  plain: string;
  /** Who is on the hook */
  appliesTo: string;
  /** Imperative bullets */
  whatToDo: string[];

  /** Whether this is actually your job. See the Ownership doc comment. */
  ownership: Ownership;
  handled: Handled;
  /** The one concrete first move, naming the real screen where one exists. */
  mondayMorning: string;
  /** Who can stop reading. Kills the anxiety in a line. */
  ignoreIf?: string;
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

/**
 * Deliberately reassuring where reassurance is the honest answer. A reference
 * that makes everything sound urgent is indistinguishable from the vendors
 * selling the fix, and practitioners can smell it instantly.
 */
export const OWNERSHIP: Record<
  Ownership,
  { label: string; short: string; blurb: string }
> = {
  esp: {
    label: "Your ESP already did this",
    short: "Already handled",
    blurb: "Mainstream platforms do this automatically. You can move on.",
  },
  shared: {
    label: "Part platform, part you",
    short: "Shared",
    blurb: "The platform covers the mechanical bit. The judgement is still yours.",
  },
  yours: {
    label: "This one needs you",
    short: "Yours",
    blurb: "No platform does this for you. One concrete move, then you are done.",
  },
  context: {
    label: "Good to know — nothing to fix",
    short: "FYI",
    blurb: "Changes a number you report or a risk you carry, not today's task list.",
  },
};

export const STATUS_LABEL: Record<RuleStatus, string> = {
  in_force: "In force",
  upcoming: "Upcoming",
  proposed: "Proposed",
  superseded: "Superseded",
};

export const JURISDICTIONS: Record<Jurisdiction, { label: string; blurb: string }> = {
  EU: {
    label: "European Union",
    blurb:
      "Directive-level rules. The detail lives in national law and genuinely differs by member state.",
  },
  FR: {
    label: "France",
    blurb:
      "The CNIL moves first and documents everything. What it enforces tends to arrive elsewhere later.",
  },
  IT: {
    label: "Italy",
    blurb: "The Garante follows the CNIL's playbook, with fines that show it is not theoretical.",
  },
  DE: {
    label: "Germany",
    blurb:
      "Courts, not the regulator, set the pace here. Double opt-in is the de facto standard for a reason.",
  },
  UK: {
    label: "United Kingdom",
    blurb: "PECR plus UK GDPR. Familiar from the EU rules, and no longer identical to them.",
  },
  US: {
    label: "United States",
    blurb: "Opt-out at the federal level, with states adding their own teeth.",
  },
  "US-WA": {
    label: "Washington State",
    blurb:
      "CEMA turned subject lines into litigation. The most active email docket in the country.",
  },
  "US-CA": {
    label: "California",
    blurb:
      "Privacy law that reaches email through the back door: data, minors and opt-out signals.",
  },
  "US-MD": {
    label: "Maryland",
    blurb: "Watch this one for age-targeting restrictions.",
  },
  "US-CO": {
    label: "Colorado",
    blurb: "Universal opt-out (GPC) for sale and targeted advertising, with a clear limit on email.",
  },
  CA: {
    label: "Canada",
    blurb: "CASL: the strictest consent regime in North America, with penalties to match.",
  },
  AU: {
    label: "Australia",
    blurb: "Spam Act consent, identity and unsubscribe — ACMA enforces this one in public.",
  },
  Global: {
    label: "Global",
    blurb: "Provider requirements and standards that apply wherever you send from.",
  },
};

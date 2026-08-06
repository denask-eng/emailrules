import { matchesEspSelection } from "./audience";
import type { Finding } from "./dns-check";
import type { EspApplicability, Ownership } from "./types";

export type EvidenceState = "observed" | "inferred" | "could_not_determine";
export type EvidenceConfidence = "high" | "medium" | "low";
export type Applicability = "applies" | "not_applicable" | "not_supplied";
export type SessionStatus =
  | "waiting"
  | "received"
  | "processing"
  | "complete"
  | "failed"
  | "expired";

export type CampaignGeo = "EU" | "UK" | "US" | "CA" | "AU" | "Other";
export type CampaignEsp =
  | "klaviyo"
  | "mailchimp"
  | "braze"
  | "hubspot"
  | "sfmc"
  | "omnisend"
  | "activecampaign"
  | "other";

export interface CampaignContext {
  esp: CampaignEsp;
  geographies: CampaignGeo[];
  gmailBulk: boolean;
}

export interface FindingSource {
  title: string;
  url: string;
  published?: string;
  verified: string;
}

export interface CampaignFinding extends Finding {
  evidenceState: EvidenceState;
  confidence: EvidenceConfidence;
  applicability: Applicability;
  rootCause: string;
  observed: string;
  why: string;
  owner: Ownership | null;
  firstAction: string | null;
  source: FindingSource | null;
  ruleVersion: string | null;
  detectorVersion: "message-v1";
}

/**
 * A session-backed report is private to its separate report token. Rows from
 * before sessions existed have no report token, so their original id remains
 * the only valid report URL.
 */
export function reportAccessTokenMatches(
  token: string,
  record: { id: string; reportToken: string | null },
): boolean {
  return record.reportToken ? token === record.reportToken : token === record.id;
}

const EU_JURISDICTIONS = new Set(["EU", "FR", "IT", "DE"]);
const US_JURISDICTIONS = new Set(["US", "US-WA", "US-CA", "US-MD", "US-CO"]);

export interface CampaignRuleScope {
  slug: string;
  jurisdictions: string[];
  esp?: EspApplicability;
  provider?: string;
}

/** Evaluate every context field advertised by the campaign intake. */
export function campaignApplicability(
  rule: CampaignRuleScope,
  context?: CampaignContext,
): Applicability {
  if (rule.slug === "gmail-bulk-sender-requirements") {
    if (!context) return "not_supplied";
    if (!context.gmailBulk) return "not_applicable";
  }

  if (!context) {
    const espSpecific = Array.isArray(rule.esp) || rule.esp === "mainstream";
    return rule.jurisdictions.includes("Global") && !espSpecific ? "applies" : "not_supplied";
  }

  if (!matchesEspSelection(rule, context.esp)) return "not_applicable";
  if (rule.jurisdictions.includes("Global")) return "applies";

  const selected = new Set(context.geographies);
  if (rule.jurisdictions.some((geo) => EU_JURISDICTIONS.has(geo)) && selected.has("EU")) return "applies";
  if (rule.jurisdictions.some((geo) => US_JURISDICTIONS.has(geo)) && selected.has("US")) return "applies";
  if (rule.jurisdictions.includes("UK") && selected.has("UK")) return "applies";
  if (rule.jurisdictions.includes("CA") && selected.has("CA")) return "applies";
  if (rule.jurisdictions.includes("AU") && selected.has("AU")) return "applies";
  return "not_applicable";
}

export const GMAIL_SUB_BULK_CONTEXT =
  "You marked this campaign as below or unsure on 5,000 messages a day to personal Gmail accounts, so the bulk-only layer does not apply. Below that threshold, Gmail still requires SPF or DKIM, reverse DNS, TLS, valid message formatting and a spam rate below 0.30 percent.";

export function findingDetailForContext(
  ruleSlug: string | undefined,
  detail: string,
  context?: CampaignContext,
): string {
  if (
    ruleSlug !== "gmail-bulk-sender-requirements" ||
    !context ||
    context.gmailBulk ||
    detail.includes(GMAIL_SUB_BULK_CONTEXT)
  ) {
    return detail;
  }
  return `${detail} ${GMAIL_SUB_BULK_CONTEXT}`;
}

/**
 * A fail or warn shows its own curated action or none at all. Falling back to
 * the finding's detail printed the same paragraph twice on the exact cards
 * where a reader needs a next step, and falling back to the rule's standing
 * routine can hand a broken campaign a "Nothing to do" written for the pass
 * case. Passes and info keep the rule routine — that is where it fits.
 */
export function firstActionForFinding(
  finding: Pick<Finding, "severity" | "detail" | "mondayMorning">,
  ruleAction?: string,
): string | null {
  if (finding.mondayMorning) return finding.mondayMorning;
  if (finding.severity === "fail" || finding.severity === "warn") return null;
  return ruleAction ?? null;
}

const CAMPAIGN_OWNER_LABELS: Record<Ownership, string> = {
  esp: "ESP administrator",
  shared: "You and your ESP",
  yours: "You",
  context: "Context only",
};

export function campaignOwnerLabel(owner: Ownership | null): string {
  return owner ? CAMPAIGN_OWNER_LABELS[owner] : "Manual review";
}

const ESP_VALUES = new Set<CampaignEsp>([
  "klaviyo",
  "mailchimp",
  "braze",
  "hubspot",
  "sfmc",
  "omnisend",
  "activecampaign",
  "other",
]);
const GEO_VALUES = new Set<CampaignGeo>(["EU", "UK", "US", "CA", "AU", "Other"]);

export function parseCampaignContext(input: unknown): CampaignContext | null {
  if (!input || typeof input !== "object") return null;
  const value = input as { esp?: unknown; geographies?: unknown; gmailBulk?: unknown };
  if (typeof value.esp !== "string" || !ESP_VALUES.has(value.esp as CampaignEsp)) return null;
  if (!Array.isArray(value.geographies)) return null;
  const geographies = [...new Set(value.geographies)].filter(
    (geo): geo is CampaignGeo => typeof geo === "string" && GEO_VALUES.has(geo as CampaignGeo),
  );
  if (geographies.length === 0 || geographies.length > GEO_VALUES.size) return null;
  if (typeof value.gmailBulk !== "boolean") return null;
  return { esp: value.esp as CampaignEsp, geographies, gmailBulk: value.gmailBulk };
}

export function prioritizedFindings(findings: CampaignFinding[], limit = 5): CampaignFinding[] {
  const seen = new Set<string>();
  const severity = { fail: 0, warn: 1, pass: 2, info: 3 } as const;
  return findings
    .filter(
      (finding) =>
        (finding.severity === "fail" || finding.severity === "warn") &&
        finding.applicability !== "not_applicable" &&
        finding.evidenceState !== "could_not_determine",
    )
    .sort((left, right) => {
      const order = severity[left.severity] - severity[right.severity];
      if (order) return order;
      const evidence = left.evidenceState === "observed" ? -1 : right.evidenceState === "observed" ? 1 : 0;
      return evidence || left.title.localeCompare(right.title);
    })
    .filter((finding) => {
      if (seen.has(finding.rootCause)) return false;
      seen.add(finding.rootCause);
      return true;
    })
    .slice(0, limit);
}

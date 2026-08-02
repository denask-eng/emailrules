/**
 * Subscriber filter prefs: audience JSON from the rules setup, optional
 * watch domain. Shared by the public subscribe action and admin notify.
 */

import {
  type Audience,
  EMPTY_AUDIENCE,
  audienceActive,
  matchesAudience,
} from "@/lib/audience";
import type { EspId } from "@/lib/audience";
import type { EspApplicability } from "@/lib/types";

const ESP_IDS = new Set([
  "",
  "klaviyo",
  "mailchimp",
  "braze",
  "hubspot",
  "sfmc",
  "omnisend",
  "activecampaign",
  "other",
]);

const ROLES = new Set(["", "newbie", "lifecycle", "deliverability", "multi", "check"]);

/**
 * Parse audience from a form field (JSON string from localStorage) or DB JSONB.
 * Invalid / empty → null (meaning: no filter, get every market-move alert).
 */
export function parseSubscriberAudience(raw: unknown): Audience | null {
  if (raw == null || raw === "") return null;

  let obj: unknown = raw;
  if (typeof raw === "string") {
    const s = raw.trim();
    if (!s || s === "{}" || s === "null") return null;
    try {
      obj = JSON.parse(s);
    } catch {
      return null;
    }
  }
  if (!obj || typeof obj !== "object") return null;

  const r = obj as Record<string, unknown>;
  const next: Audience = {
    ...EMPTY_AUDIENCE,
    eu: !!r.eu,
    us: !!r.us,
    ca: !!r.ca,
    uk: !!r.uk,
    au: !!r.au,
    gmailBulk: !!r.gmailBulk,
    onlyMine: !!r.onlyMine,
    esp: (typeof r.esp === "string" && ESP_IDS.has(r.esp) ? r.esp : "") as EspId,
    role: (typeof r.role === "string" && ROLES.has(r.role) ? r.role : "") as Audience["role"],
  };

  /* legacy klaviyo boolean from older clients */
  if (r.klaviyo && !next.esp) next.esp = "klaviyo";

  return audienceActive(next) ? next : null;
}

/**
 * Should this subscriber get an alert for this rule?
 * No prefs stored → yes (full list, pre-filter behaviour).
 * Prefs stored → only if the rule matches their setup.
 */
export function subscriberWantsRule(
  rule: {
    ownership: string;
    jurisdictions: string[];
    provider?: string;
    topic?: string;
    slug?: string;
    esp?: EspApplicability;
  },
  audienceRaw: unknown,
): boolean {
  const a = parseSubscriberAudience(audienceRaw);
  if (!a) return true;
  return matchesAudience(rule, a);
}

/** Serialise for DB storage — null when empty so indexes stay clean. */
export function audienceForStorage(raw: unknown): Audience | null {
  return parseSubscriberAudience(raw);
}

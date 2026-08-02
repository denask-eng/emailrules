/**
 * Audience filters for the rules index.
 * Shared by client UI (localStorage + URL) so tomorrow’s visit feels the same.
 */

export type Audience = {
  eu: boolean;
  us: boolean;
  ca: boolean;
  uk: boolean;
  au: boolean;
  gmailBulk: boolean;
  klaviyo: boolean;
  onlyMine: boolean;
};

export const EMPTY_AUDIENCE: Audience = {
  eu: false,
  us: false,
  ca: false,
  uk: false,
  au: false,
  gmailBulk: false,
  klaviyo: false,
  onlyMine: false,
};

export const STORAGE_KEY = "emailrules.audience.v2";
/** Set after first preset/skip so we never trap returning users. */
export const ONBOARD_KEY = "emailrules.onboarded.v1";

export const AUDIENCE_CHIPS: { key: keyof Audience; label: string }[] = [
  { key: "eu", label: "EU" },
  { key: "us", label: "US" },
  { key: "ca", label: "Canada" },
  { key: "uk", label: "UK" },
  { key: "au", label: "Australia" },
  { key: "gmailBulk", label: "Gmail bulk" },
  { key: "klaviyo", label: "Klaviyo" },
  { key: "onlyMine", label: "Only my desk" },
];

/** One-tap profiles. Sets geos + stack; marketer can still tweak chips. */
export const PRESETS: { id: string; label: string; blurb: string; audience: Audience }[] = [
  {
    id: "klaviyo-us-eu",
    label: "Klaviyo · US + EU",
    blurb: "Most DTC lifecycle teams",
    audience: {
      ...EMPTY_AUDIENCE,
      eu: true,
      us: true,
      gmailBulk: true,
      klaviyo: true,
    },
  },
  {
    id: "us-only",
    label: "US only",
    blurb: "CAN-SPAM, states, Gmail/Yahoo",
    audience: { ...EMPTY_AUDIENCE, us: true, gmailBulk: true },
  },
  {
    id: "eu-uk",
    label: "EU + UK",
    blurb: "Consent and tracking focus",
    audience: { ...EMPTY_AUDIENCE, eu: true, uk: true },
  },
  {
    id: "ca",
    label: "Canada (CASL)",
    blurb: "Strict consent clocks",
    audience: { ...EMPTY_AUDIENCE, ca: true },
  },
];

const EU = new Set(["EU", "FR", "IT", "DE"]);
const US = new Set(["US", "US-WA", "US-CA", "US-MD", "US-CO"]);

export function audienceActive(a: Audience): boolean {
  return a.eu || a.us || a.ca || a.uk || a.au || a.gmailBulk || a.klaviyo || a.onlyMine;
}

export function parseAudienceParam(search: string): Audience | null {
  if (typeof window === "undefined" && !search) return null;
  const q = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  if (![...q.keys()].some((k) => k.startsWith("f_") || k === "mine" || k === "preset")) {
    return null;
  }
  const next = { ...EMPTY_AUDIENCE };
  if (q.get("f_eu") === "1") next.eu = true;
  if (q.get("f_us") === "1") next.us = true;
  if (q.get("f_ca") === "1") next.ca = true;
  if (q.get("f_uk") === "1") next.uk = true;
  if (q.get("f_au") === "1") next.au = true;
  if (q.get("f_gmail") === "1") next.gmailBulk = true;
  if (q.get("f_klaviyo") === "1") next.klaviyo = true;
  if (q.get("mine") === "1") next.onlyMine = true;
  const preset = q.get("preset");
  if (preset) {
    const p = PRESETS.find((x) => x.id === preset);
    if (p) return { ...p.audience, onlyMine: next.onlyMine || p.audience.onlyMine };
  }
  return next;
}

export function audienceToSearch(a: Audience): string {
  const q = new URLSearchParams();
  if (a.eu) q.set("f_eu", "1");
  if (a.us) q.set("f_us", "1");
  if (a.ca) q.set("f_ca", "1");
  if (a.uk) q.set("f_uk", "1");
  if (a.au) q.set("f_au", "1");
  if (a.gmailBulk) q.set("f_gmail", "1");
  if (a.klaviyo) q.set("f_klaviyo", "1");
  if (a.onlyMine) q.set("mine", "1");
  const s = q.toString();
  return s ? `?${s}` : "";
}

export function matchesAudience(
  rule: {
    ownership: string;
    jurisdictions: string[];
    provider?: string;
  },
  a: Audience,
): boolean {
  if (a.onlyMine && rule.ownership !== "yours") return false;

  const geoOrStack = a.eu || a.us || a.ca || a.uk || a.au || a.gmailBulk || a.klaviyo;
  if (!geoOrStack) return true;

  if (rule.jurisdictions.includes("Global")) {
    if (rule.provider === "Klaviyo") return a.klaviyo;
    if (rule.provider === "Gmail") return a.gmailBulk || a.us || a.eu || a.ca || a.uk || a.au;
    /* Yahoo / Microsoft / Apple / hygiene: relevant to bulk senders who picked any geo */
    return true;
  }
  if (rule.jurisdictions.some((j) => EU.has(j))) return a.eu;
  if (rule.jurisdictions.some((j) => US.has(j))) return a.us;
  if (rule.jurisdictions.includes("CA")) return a.ca;
  if (rule.jurisdictions.includes("UK")) return a.uk;
  if (rule.jurisdictions.includes("AU")) return a.au;
  return false;
}

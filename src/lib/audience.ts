/**
 * Audience filters for the rules index.
 * Role-first for newbies; geo/stack fine-tune for everyone.
 * URL + localStorage so tomorrow feels the same.
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
  /** Role biases which rules sort into Top 5 */
  role: "newbie" | "lifecycle" | "deliverability" | "multi" | "check" | "";
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
  role: "",
};

export const STORAGE_KEY = "emailrules.audience.v3";
export const ONBOARD_KEY = "emailrules.onboarded.v2";

export const AUDIENCE_CHIPS: { key: keyof Audience; label: string; explain: string }[] = [
  { key: "eu", label: "EU", explain: "People in the European Union on your list" },
  { key: "us", label: "US", explain: "People in the United States" },
  { key: "ca", label: "Canada", explain: "CASL and Canadian recipients" },
  { key: "uk", label: "UK", explain: "United Kingdom recipients" },
  { key: "au", label: "Australia", explain: "Australian-link commercial email" },
  {
    key: "gmailBulk",
    label: "Big Gmail volume",
    explain: "Roughly 5,000+ messages a day to Gmail — bulk sender rules apply",
  },
  { key: "klaviyo", label: "Klaviyo", explain: "You send mainly through Klaviyo" },
  {
    key: "onlyMine",
    label: "Only my desk",
    explain: "Hide what your email tool usually handles for you",
  },
];

/** Role cards — human jobs, not protocol names. */
export const ROLE_PRESETS: {
  id: string;
  label: string;
  blurb: string;
  audience: Audience;
}[] = [
  {
    id: "newbie",
    label: "I'm newer to email marketing",
    blurb: "Plain English first. Fewer acronyms. Clear next clicks.",
    audience: {
      ...EMPTY_AUDIENCE,
      role: "newbie",
      onlyMine: true,
      us: true,
      gmailBulk: true,
    },
  },
  {
    id: "lifecycle",
    label: "I run campaigns & flows",
    blurb: "Lifecycle / CRM / Klaviyo-style — consent, metrics, subject lines.",
    audience: {
      ...EMPTY_AUDIENCE,
      role: "lifecycle",
      eu: true,
      us: true,
      gmailBulk: true,
      klaviyo: true,
    },
  },
  {
    id: "deliverability",
    label: "I care about inbox & auth",
    blurb: "SPF, DKIM, DMARC, bounces, traps, provider rules — with definitions.",
    audience: {
      ...EMPTY_AUDIENCE,
      role: "deliverability",
      us: true,
      eu: true,
      gmailBulk: true,
    },
  },
  {
    id: "multi",
    label: "I send to many countries",
    blurb: "EU, UK, Canada, US, Australia — consent clocks and tracking rules.",
    audience: {
      ...EMPTY_AUDIENCE,
      role: "multi",
      eu: true,
      us: true,
      uk: true,
      ca: true,
      au: true,
      gmailBulk: true,
    },
  },
];

/** @deprecated use ROLE_PRESETS — kept as alias for older imports */
export const PRESETS = ROLE_PRESETS;

const EU = new Set(["EU", "FR", "IT", "DE"]);
const US = new Set(["US", "US-WA", "US-CA", "US-MD", "US-CO"]);

export function audienceActive(a: Audience): boolean {
  return !!(
    a.eu ||
    a.us ||
    a.ca ||
    a.uk ||
    a.au ||
    a.gmailBulk ||
    a.klaviyo ||
    a.onlyMine ||
    a.role
  );
}

export function parseAudienceParam(search: string): Audience | null {
  const q = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  if (
    ![...q.keys()].some(
      (k) => k.startsWith("f_") || k === "mine" || k === "preset" || k === "role",
    )
  ) {
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
  const role = q.get("role") || q.get("preset") || "";
  if (role) {
    const p = ROLE_PRESETS.find((x) => x.id === role);
    if (p) {
      return {
        ...p.audience,
        onlyMine: next.onlyMine || p.audience.onlyMine,
        // allow URL to add geos on top of role
        eu: next.eu || p.audience.eu,
        us: next.us || p.audience.us,
        ca: next.ca || p.audience.ca,
        uk: next.uk || p.audience.uk,
        au: next.au || p.audience.au,
        gmailBulk: next.gmailBulk || p.audience.gmailBulk,
        klaviyo: next.klaviyo || p.audience.klaviyo,
      };
    }
    if (role === "newbie" || role === "lifecycle" || role === "deliverability" || role === "multi") {
      next.role = role;
    }
  }
  return next;
}

export function audienceToSearch(a: Audience): string {
  const q = new URLSearchParams();
  if (a.role) q.set("role", a.role);
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
    topic?: string;
  },
  a: Audience,
): boolean {
  /* onlyMine: newbies keep "shared" (half ESP); others see pure "yours". */
  if (a.onlyMine) {
    if (a.role === "newbie") {
      if (rule.ownership === "esp" || rule.ownership === "context") return false;
    } else if (rule.ownership !== "yours") {
      return false;
    }
  }

  const geoOrStack = a.eu || a.us || a.ca || a.uk || a.au || a.gmailBulk || a.klaviyo;
  if (!geoOrStack) return true;

  if (rule.jurisdictions.includes("Global")) {
    if (rule.provider === "Klaviyo") {
      return a.klaviyo || a.role === "lifecycle" || a.role === "newbie";
    }
    if (rule.provider === "Gmail") {
      return a.gmailBulk || a.us || a.eu || a.ca || a.uk || a.au;
    }
    return true;
  }
  if (rule.jurisdictions.some((j) => EU.has(j))) return a.eu;
  if (rule.jurisdictions.some((j) => US.has(j))) return a.us;
  if (rule.jurisdictions.includes("CA")) return a.ca;
  if (rule.jurisdictions.includes("UK")) return a.uk;
  if (rule.jurisdictions.includes("AU")) return a.au;
  return false;
}

/** Sort boost by role for Top 5 */
export function roleTopicBoost(topic: string, role: Audience["role"]): number {
  const maps: Record<string, string[]> = {
    newbie: ["measurement", "provider-rules", "consent-tracking", "content-claims"],
    lifecycle: ["measurement", "consent-tracking", "content-claims", "ai-disclosure"],
    deliverability: ["authentication", "provider-rules", "bounces-hygiene"],
    multi: ["consent-tracking", "provider-rules", "content-claims"],
    check: ["authentication", "provider-rules"],
    "": [],
  };
  const list = maps[role] ?? [];
  const idx = list.indexOf(topic);
  return idx === -1 ? 50 : idx;
}

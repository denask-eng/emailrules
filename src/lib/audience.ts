/**
 * Audience filters for the rules index.
 * Role-first; geo + ESP fine-tune. URL + localStorage.
 *
 * ESP matching uses Rule.esp (EspApplicability) — durable, not string-guessing on provider.
 */

import type { EspApplicability, EspProductId } from "@/lib/types";

/** Selected tool in the UI. "" = unspecified. "other" = non-catalog / multi / custom. */
export type EspId = "" | EspProductId | "other";

export type Audience = {
  eu: boolean;
  us: boolean;
  ca: boolean;
  uk: boolean;
  au: boolean;
  gmailBulk: boolean;
  /** Primary ESP — empty means “any / not specified” */
  esp: EspId;
  onlyMine: boolean;
  role: "newbie" | "lifecycle" | "deliverability" | "multi" | "check" | "";
};

export const EMPTY_AUDIENCE: Audience = {
  eu: false,
  us: false,
  ca: false,
  uk: false,
  au: false,
  gmailBulk: false,
  esp: "",
  onlyMine: false,
  role: "",
};

/** Bump when shape changes so stale localStorage does not lie. */
export const STORAGE_KEY = "emailrules.audience.v4";
export const ONBOARD_KEY = "emailrules.onboarded.v2";

/** Tools people actually pick — not a vendor catalog of 40. */
export const ESP_OPTIONS: {
  id: EspId;
  label: string;
  explain: string;
}[] = [
  {
    id: "klaviyo",
    label: "Klaviyo",
    explain: "Ecommerce flows; we have Klaviyo-specific measurement pages",
  },
  {
    id: "mailchimp",
    label: "Mailchimp",
    explain: "Campaigns & audiences; bounce and unsub paths differ by product",
  },
  {
    id: "braze",
    label: "Braze",
    explain: "Lifecycle / CRM at scale; platform-specific bounce rules",
  },
  {
    id: "hubspot",
    label: "HubSpot",
    explain: "Marketing Hub email; shared desk vs tool ownership still applies",
  },
  {
    id: "sfmc",
    label: "Salesforce Marketing Cloud",
    explain: "Enterprise journeys; auth and list hygiene still land on you",
  },
  {
    id: "omnisend",
    label: "Omnisend",
    explain: "Ecommerce automation — same inbox laws as everyone else",
  },
  {
    id: "activecampaign",
    label: "ActiveCampaign",
    explain: "Automations & CRM — filter still personalizes ownership",
  },
  {
    id: "other",
    label: "Other / custom",
    explain: "SendGrid, Postmark, home-grown, or multi-ESP — no fake product pages",
  },
];

export const AUDIENCE_CHIPS: {
  key: keyof Pick<Audience, "eu" | "us" | "ca" | "uk" | "au" | "gmailBulk" | "onlyMine">;
  label: string;
  explain: string;
}[] = [
  {
    key: "eu",
    label: "EU / Europe",
    explain: "EU recipients — ePrivacy, FR/DE/IT tracking and consent pages tagged EU",
  },
  { key: "us", label: "US", explain: "People in the United States" },
  { key: "ca", label: "Canada", explain: "CASL and Canadian recipients" },
  { key: "uk", label: "UK", explain: "United Kingdom PECR — not EU, separate chip" },
  { key: "au", label: "Australia", explain: "Australian-link commercial email" },
  {
    key: "gmailBulk",
    label: "Big Gmail volume",
    explain: "Roughly 5,000+ messages a day to Gmail — bulk sender rules apply",
  },
  {
    key: "onlyMine",
    label: "Only my desk",
    explain: "Hide what your email tool usually handles for you",
  },
];

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
    blurb: "Lifecycle / CRM — consent, metrics, subject lines, any major ESP.",
    audience: {
      ...EMPTY_AUDIENCE,
      role: "lifecycle",
      eu: true,
      us: true,
      gmailBulk: true,
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

/** @deprecated use ROLE_PRESETS */
export const PRESETS = ROLE_PRESETS;

const EU = new Set(["EU", "FR", "IT", "DE"]);
const US = new Set(["US", "US-WA", "US-CA", "US-MD", "US-CO"]);

export function espLabel(esp: EspId): string {
  if (!esp) return "";
  return ESP_OPTIONS.find((o) => o.id === esp)?.label ?? esp;
}

/**
 * Resolve durable ESP applicability from rule fields.
 * Falls back from legacy provider: "Klaviyo" when `esp` is unset (old corpus / Neon rows).
 */
export function resolveEspApplicability(rule: {
  esp?: EspApplicability;
  provider?: string;
}): EspApplicability {
  if (rule.esp !== undefined && rule.esp !== null) return rule.esp;
  if (rule.provider) {
    const p = rule.provider.toLowerCase();
    if (p === "klaviyo") return ["klaviyo"];
    if (p === "mailchimp") return ["mailchimp"];
    if (p === "braze") return ["braze"];
    if (p.includes("hubspot")) return ["hubspot"];
    if (p.includes("salesforce") || p === "sfmc") return ["sfmc"];
    if (p === "omnisend") return ["omnisend"];
    if (p.includes("activecampaign")) return ["activecampaign"];
  }
  return "all";
}

/** True if this rule should appear for the user's selected ESP. */
export function matchesEspSelection(
  rule: { esp?: EspApplicability; provider?: string },
  selected: EspId,
): boolean {
  const scope = resolveEspApplicability(rule);

  if (scope === "all") return true;

  if (scope === "mainstream") {
    /* Product physics of major ESPs — still true for “other” (they use a tool). */
    return true;
  }

  /* Product-specific pages */
  if (!selected) return true; /* browse without tool: show so people see the gap */
  if (selected === "other") return false; /* no fake “your ESP” product UI */
  return scope.includes(selected);
}

export function audienceActive(a: Audience): boolean {
  return !!(
    a.eu ||
    a.us ||
    a.ca ||
    a.uk ||
    a.au ||
    a.gmailBulk ||
    a.esp ||
    a.onlyMine ||
    a.role
  );
}

function normalizeAudience(raw: Partial<Audience> & { klaviyo?: boolean }): Audience {
  const next = { ...EMPTY_AUDIENCE, ...raw };
  /* v3 → v4: old klaviyo boolean */
  if ("klaviyo" in raw && raw.klaviyo && !next.esp) {
    next.esp = "klaviyo";
  }
  if (next.esp && !ESP_OPTIONS.some((o) => o.id === next.esp)) {
    next.esp = "other";
  }
  return {
    eu: !!next.eu,
    us: !!next.us,
    ca: !!next.ca,
    uk: !!next.uk,
    au: !!next.au,
    gmailBulk: !!next.gmailBulk,
    esp: next.esp || "",
    onlyMine: !!next.onlyMine,
    role: next.role || "",
  };
}

export function parseAudienceParam(search: string): Audience | null {
  const q = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  if (
    ![...q.keys()].some(
      (k) =>
        k.startsWith("f_") || k === "mine" || k === "preset" || k === "role" || k === "esp",
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
  /* legacy */
  if (q.get("f_klaviyo") === "1") next.esp = "klaviyo";
  const esp = (q.get("esp") || "") as EspId;
  if (esp && ESP_OPTIONS.some((o) => o.id === esp)) next.esp = esp;
  if (q.get("mine") === "1") next.onlyMine = true;

  const role = q.get("role") || q.get("preset") || "";
  if (role) {
    const p = ROLE_PRESETS.find((x) => x.id === role);
    if (p) {
      return normalizeAudience({
        ...p.audience,
        onlyMine: next.onlyMine || p.audience.onlyMine,
        eu: next.eu || p.audience.eu,
        us: next.us || p.audience.us,
        ca: next.ca || p.audience.ca,
        uk: next.uk || p.audience.uk,
        au: next.au || p.audience.au,
        gmailBulk: next.gmailBulk || p.audience.gmailBulk,
        esp: next.esp || p.audience.esp,
      });
    }
    if (
      role === "newbie" ||
      role === "lifecycle" ||
      role === "deliverability" ||
      role === "multi"
    ) {
      next.role = role;
    }
  }
  return normalizeAudience(next);
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
  if (a.esp) q.set("esp", a.esp);
  if (a.onlyMine) q.set("mine", "1");
  const s = q.toString();
  return s ? `?${s}` : "";
}

/**
 * Does this rule belong in the filtered list?
 * ESP: Rule.esp (or legacy provider fallback). Geo: jurisdictions. Mailbox: provider Gmail/etc.
 */
export function matchesAudience(
  rule: {
    ownership: string;
    jurisdictions: string[];
    provider?: string;
    topic?: string;
    slug?: string;
    esp?: EspApplicability;
  },
  a: Audience,
): boolean {
  if (a.onlyMine) {
    if (a.role === "newbie") {
      if (rule.ownership === "esp" || rule.ownership === "context") return false;
    } else if (rule.ownership !== "yours") {
      return false;
    }
  }

  if (!matchesEspSelection(rule, a.esp)) return false;

  const geoOrStack =
    a.eu || a.us || a.ca || a.uk || a.au || a.gmailBulk || !!a.esp;
  if (!geoOrStack) return true;

  if (rule.jurisdictions.includes("Global")) {
    if (rule.provider === "Gmail") {
      return a.gmailBulk || a.us || a.eu || a.ca || a.uk || a.au || !!a.esp;
    }
    /* Apple, Microsoft, Yahoo, generic global */
    return true;
  }
  if (rule.jurisdictions.some((j) => EU.has(j))) return a.eu;
  if (rule.jurisdictions.some((j) => US.has(j))) return a.us;
  if (rule.jurisdictions.includes("CA")) return a.ca;
  if (rule.jurisdictions.includes("UK")) return a.uk;
  if (rule.jurisdictions.includes("AU")) return a.au;
  return false;
}

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

/** Read stored audience (v4 + migrate v3). */
export function readStoredAudience(): Audience {
  if (typeof window === "undefined") return EMPTY_AUDIENCE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return normalizeAudience(JSON.parse(raw) as Partial<Audience>);
    /* migrate v3 */
    const legacy = window.localStorage.getItem("emailrules.audience.v3");
    if (legacy) {
      const n = normalizeAudience(JSON.parse(legacy) as Partial<Audience> & { klaviyo?: boolean });
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(n));
      } catch {
        /* */
      }
      return n;
    }
  } catch {
    /* */
  }
  return EMPTY_AUDIENCE;
}

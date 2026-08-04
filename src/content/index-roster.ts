/**
 * The Index roster — who this site measures every day.
 *
 * The roster is itself a published claim, so it lives in the repository as a
 * typed, git-tracked array rather than as a query nobody can audit. Every
 * addition and removal is a commit with a date on it.
 *
 * ── The inclusion rule, stated once ───────────────────────────────────────
 *
 * Large, widely-recognised organisations that send marketing or lifecycle
 * email to consumers, spread across seven sectors so no single industry's
 * habits can carry the aggregate.
 *
 * Chosen for recognisability and sector spread. **Not** chosen for how they
 * score — the roster was fixed before the first reading was taken, and the
 * rule for changing it is the rule below and nothing else. A benchmark whose
 * membership moves when the number moves is a marketing asset, not a
 * measurement, and this whole instrument exists because the category is full
 * of the former.
 *
 * ── What is measured ──────────────────────────────────────────────────────
 *
 * Public DNS only: the same TXT and MX records every receiving mail server
 * reads on every message these organisations send. Nothing here probes a
 * system, sends anything, or touches a service. It is the most public
 * information in email.
 *
 * ── Removal ───────────────────────────────────────────────────────────────
 *
 * A domain leaves by being marked retired, never by deletion, so the history
 * it contributed to cannot be silently rewritten. It is removed only if it
 * stops sending consumer email entirely or the organisation ceases to exist.
 * Never because of what it publishes.
 */

export type IndexSector =
  | "ecommerce"
  | "saas"
  | "media"
  | "retail"
  | "travel"
  | "finance"
  | "marketplace";

export const INDEX_SECTORS: Record<IndexSector, { label: string; blurb: string }> = {
  ecommerce: {
    label: "Ecommerce & DTC",
    blurb: "Direct-to-consumer brands, the heaviest lifecycle senders in the index.",
  },
  saas: {
    label: "Software",
    blurb: "Product and transactional senders, usually the most technically staffed.",
  },
  media: {
    label: "Media & publishing",
    blurb: "Newsletter-first businesses, where the list is the product.",
  },
  retail: {
    label: "Retail",
    blurb: "Large multi-channel retailers with long-lived legacy sending estates.",
  },
  travel: {
    label: "Travel & hospitality",
    blurb: "High transactional volume, and the most phished category in the index.",
  },
  finance: {
    label: "Finance",
    blurb: "The category with the strongest regulatory pressure on authentication.",
  },
  marketplace: {
    label: "Marketplaces",
    blurb: "Platforms sending on behalf of third parties, the hardest alignment problem.",
  },
};

export interface IndexDomain {
  domain: string;
  sector: IndexSector;
}

export const INDEX_ROSTER: IndexDomain[] = [
  /* ── Ecommerce & DTC ───────────────────────────────────────────────── */
  { domain: "gymshark.com", sector: "ecommerce" },
  { domain: "allbirds.com", sector: "ecommerce" },
  { domain: "glossier.com", sector: "ecommerce" },
  { domain: "warbyparker.com", sector: "ecommerce" },
  { domain: "bombas.com", sector: "ecommerce" },
  { domain: "ruggable.com", sector: "ecommerce" },
  { domain: "patagonia.com", sector: "ecommerce" },
  { domain: "oatly.com", sector: "ecommerce" },
  { domain: "casper.com", sector: "ecommerce" },
  { domain: "away.com", sector: "ecommerce" },
  { domain: "brooklinen.com", sector: "ecommerce" },
  { domain: "everlane.com", sector: "ecommerce" },
  { domain: "chubbies.com", sector: "ecommerce" },
  { domain: "harrys.com", sector: "ecommerce" },
  { domain: "peloton.com", sector: "ecommerce" },
  { domain: "lush.com", sector: "ecommerce" },
  { domain: "aesop.com", sector: "ecommerce" },
  { domain: "represent.com", sector: "ecommerce" },

  /* ── Software ──────────────────────────────────────────────────────── */
  { domain: "notion.so", sector: "saas" },
  { domain: "figma.com", sector: "saas" },
  { domain: "slack.com", sector: "saas" },
  { domain: "dropbox.com", sector: "saas" },
  { domain: "atlassian.com", sector: "saas" },
  { domain: "hubspot.com", sector: "saas" },
  { domain: "klaviyo.com", sector: "saas" },
  { domain: "mailchimp.com", sector: "saas" },
  { domain: "stripe.com", sector: "saas" },
  { domain: "shopify.com", sector: "saas" },
  { domain: "zoom.us", sector: "saas" },
  { domain: "canva.com", sector: "saas" },
  { domain: "asana.com", sector: "saas" },
  { domain: "1password.com", sector: "saas" },
  { domain: "linear.app", sector: "saas" },
  { domain: "vercel.com", sector: "saas" },
  { domain: "cloudflare.com", sector: "saas" },
  { domain: "github.com", sector: "saas" },

  /* ── Media & publishing ────────────────────────────────────────────── */
  { domain: "nytimes.com", sector: "media" },
  { domain: "theguardian.com", sector: "media" },
  { domain: "economist.com", sector: "media" },
  { domain: "ft.com", sector: "media" },
  { domain: "bbc.co.uk", sector: "media" },
  { domain: "wired.com", sector: "media" },
  { domain: "theatlantic.com", sector: "media" },
  { domain: "bloomberg.com", sector: "media" },
  { domain: "substack.com", sector: "media" },
  { domain: "medium.com", sector: "media" },
  { domain: "vox.com", sector: "media" },
  { domain: "npr.org", sector: "media" },

  /* ── Retail ────────────────────────────────────────────────────────── */
  { domain: "ikea.com", sector: "retail" },
  { domain: "target.com", sector: "retail" },
  { domain: "walmart.com", sector: "retail" },
  { domain: "costco.com", sector: "retail" },
  { domain: "sephora.com", sector: "retail" },
  { domain: "nike.com", sector: "retail" },
  { domain: "adidas.com", sector: "retail" },
  { domain: "zara.com", sector: "retail" },
  { domain: "hm.com", sector: "retail" },
  { domain: "uniqlo.com", sector: "retail" },
  { domain: "marksandspencer.com", sector: "retail" },
  { domain: "johnlewis.com", sector: "retail" },
  { domain: "decathlon.com", sector: "retail" },
  { domain: "lego.com", sector: "retail" },

  /* ── Travel & hospitality ──────────────────────────────────────────── */
  { domain: "airbnb.com", sector: "travel" },
  { domain: "booking.com", sector: "travel" },
  { domain: "expedia.com", sector: "travel" },
  { domain: "marriott.com", sector: "travel" },
  { domain: "hilton.com", sector: "travel" },
  { domain: "britishairways.com", sector: "travel" },
  { domain: "lufthansa.com", sector: "travel" },
  { domain: "delta.com", sector: "travel" },
  { domain: "united.com", sector: "travel" },
  { domain: "ryanair.com", sector: "travel" },
  { domain: "easyjet.com", sector: "travel" },
  { domain: "trainline.com", sector: "travel" },

  /* ── Finance ───────────────────────────────────────────────────────── */
  { domain: "monzo.com", sector: "finance" },
  { domain: "revolut.com", sector: "finance" },
  { domain: "wise.com", sector: "finance" },
  { domain: "paypal.com", sector: "finance" },
  { domain: "americanexpress.com", sector: "finance" },
  { domain: "chase.com", sector: "finance" },
  { domain: "hsbc.co.uk", sector: "finance" },
  { domain: "barclays.co.uk", sector: "finance" },
  { domain: "vanguard.com", sector: "finance" },
  { domain: "coinbase.com", sector: "finance" },
  { domain: "klarna.com", sector: "finance" },
  { domain: "n26.com", sector: "finance" },

  /* ── Marketplaces ──────────────────────────────────────────────────── */
  { domain: "amazon.com", sector: "marketplace" },
  { domain: "ebay.com", sector: "marketplace" },
  { domain: "etsy.com", sector: "marketplace" },
  { domain: "uber.com", sector: "marketplace" },
  { domain: "doordash.com", sector: "marketplace" },
  { domain: "deliveroo.co.uk", sector: "marketplace" },
  { domain: "justeat.co.uk", sector: "marketplace" },
  { domain: "vinted.com", sector: "marketplace" },
  { domain: "depop.com", sector: "marketplace" },
  { domain: "zalando.com", sector: "marketplace" },
  { domain: "asos.com", sector: "marketplace" },
  { domain: "wayfair.com", sector: "marketplace" },
];

/** Sanity: the roster must not carry a duplicate, which would double-weight it. */
export const ROSTER_DOMAINS = INDEX_ROSTER.map((d) => d.domain);

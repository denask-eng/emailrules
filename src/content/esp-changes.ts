import type { EspProductId, Ownership } from "@/lib/types";

/**
 * Dated platform changes, one row per change, per ESP.
 *
 * The house rule from `rules.ts` applies here without softening: if you cannot
 * cite it with a date, it does not go in. It bites harder on this shelf than on
 * the rules shelf, because ESP release notes are the easiest thing on the
 * internet to half-remember. A regulator publishes once and archives forever; a
 * platform ships weekly, renames the feature, and quietly rewrites the help
 * article. An invented "Klaviyo changed X in March" would be indistinguishable
 * from the real rows around it, which is exactly what makes it fatal.
 *
 * So every entry below was read off a publisher page, and the date in `date` is
 * printed on that page. Nothing here was reconstructed from memory.
 *
 * Appending is meant to be trivial: add an object, give it an id, point `esp` at
 * a platform that already exists in ESP_PLATFORMS. Nothing else needs editing.
 */

/**
 * What the date on a row actually means. Platforms are inconsistent about this
 * and collapsing them into one "date" column is how a ledger starts lying.
 */
export type EspChangeDateKind =
  /** The platform's own product-update or release-notes page carries this date. */
  | "announced"
  /** A dated API revision label, which is the release itself. */
  | "revision"
  /**
   * The only date the publisher prints is the document's own last-updated
   * stamp, which says when someone edited the page, not when behaviour moved.
   * Nothing uses this yet; it exists so that case never has to be rounded up
   * into "announced".
   */
  | "documented";

export type EspSourceKind =
  | "product-update"
  | "release-notes"
  | "api-changelog"
  | "help-centre";

export const ESP_SOURCE_KIND: Record<EspSourceKind, string> = {
  "product-update": "Product updates",
  "release-notes": "Release notes",
  "api-changelog": "API changelog",
  "help-centre": "Help centre",
};

export interface EspChangeSource {
  /** Human citation, close enough to the page title to find it again. */
  name: string;
  url: string;
  /**
   * ISO date printed on the source.
   *
   * Optional for the same reason it is optional on a rule: several ESP help
   * centres print no date at all. Klaviyo's articles are the case in point —
   * the article body is authoritative, the page carries no date, and inventing
   * one to fill the column would be the whole failure mode of this shelf.
   */
  published?: string;
  kind: EspSourceKind;
}

export interface EspChange {
  /** Stable and url-safe. Used as the anchor on the platform page. */
  id: string;
  esp: EspProductId;
  /** ISO date, printed on the source. Omitted when the publisher prints none. */
  date?: string;
  dateKind: EspChangeDateKind;
  /** Declarative, not a headline. */
  title: string;
  /** What moved. */
  changed: string;
  /** Why someone who ships email should care. */
  matters: string;
  /** The one concrete next move. */
  next: string;
  /** Borrowed from the rules corpus so both shelves answer "is this mine?". */
  ownership: Ownership;
  sources: EspChangeSource[];
  /** Slugs of rules this change touches. Omitted rather than forced. */
  rules?: string[];
  lastVerified: string;
}

export interface EspPlatform {
  id: EspProductId;
  name: string;
  /** Where we read. Published so anyone can check our homework. */
  watching: { label: string; url: string }[];
  /** What this platform publishes, and how well. Sets expectations honestly. */
  note: string;
}

/** Platforms with at least one verified entry. */
export const ESP_PLATFORMS: EspPlatform[] = [
  {
    id: "klaviyo",
    name: "Klaviyo",
    watching: [
      { label: "What's New", url: "https://www.klaviyo.com/whats-new" },
      { label: "API changelog", url: "https://developers.klaviyo.com/en/docs/changelog" },
    ],
    note: "The easiest of the three to keep honest: every product-update card carries an ISO date and every API release is a dated revision. The help articles those cards link to carry no date at all, so they are cited here without one.",
  },
  {
    id: "mailchimp",
    name: "Mailchimp",
    watching: [
      { label: "Release notes", url: "https://mailchimp.com/developer/release-notes/" },
    ],
    note: "Dated and permalinked, which is rare. The catch is scope: these notes cover the API and Transactional (Mandrill). Changes to the marketing app itself are announced inside the product and in help articles with no date on them, which is why this column is short and old.",
  },
  {
    id: "braze",
    name: "Braze",
    watching: [
      { label: "Release notes", url: "https://www.braze.com/docs/releases/home" },
    ],
    note: "A dated release roughly monthly, all on one page. Individual items are not permalinked, so each row below cites the release it appeared in and links to that release's anchor.",
  },
];

/**
 * Platforms we read and have published nothing from.
 *
 * This list is not an apology, it is the evidence. Every one of these was
 * opened during the last review and produced no entry that met the bar, and
 * saying so is more useful than a page that implies we cover everything.
 */
export const ESP_WATCHED: { name: string; why: string; url?: string }[] = [
  {
    name: "HubSpot",
    why: "The developer changelog is dated and permalinked but carries no marketing-email, consent or deliverability items. The marketer-facing product updates page prints no dates next to entries at all. The knowledge base does date its articles, but a document's last-updated stamp says when someone edited the page, not when the product changed.",
    url: "https://developers.hubspot.com/changelog",
  },
  {
    name: "Salesforce Marketing Cloud",
    why: "The release notes are behind a JavaScript shell that serves no content to a plain reader. We could not read a single dated line, so there is nothing to publish.",
    url: "https://help.salesforce.com/s/articleView?id=xcloud.mc_rn_marketing_cloud_release_notes.htm&type=5",
  },
  {
    name: "Omnisend",
    why: "The changelog prints a day and month but no year, and the monthly “What’s New” articles that would supply the year are all stamped with the same edit date across different months. Real changes, genuinely deliverability-related, that we cannot date to a day without guessing.",
    url: "https://www.omnisend.com/changelog/",
  },
  {
    name: "ActiveCampaign",
    why: "The product updates page describes current features with no date beside any of them.",
    url: "https://www.activecampaign.com/product-updates",
  },
];

export const ESP_CHANGES: EspChange[] = [
  /* ───────────────────────────────────────────────────────────── Klaviyo */
  {
    id: "klaviyo-open-tracking-controls",
    esp: "klaviyo",
    date: "2026-07-08",
    dateKind: "announced",
    title: "Open tracking can be switched off per recipient",
    changed:
      "Klaviyo added controls that stop it recording email opens, either across the whole account or for individual recipients, and its help centre names France’s CNIL and Italy’s Garante as the reason. The pixel is still inserted and the recipient’s mail client still loads it; Klaviyo checks the incoming request against your settings and, when tracking is off, discards it without writing an Opened Email event. Open tracking consent is stored per recipient and per email address, and it is separate from email marketing consent.",
    matters:
      "Two rules on this site said no mainstream platform shipped a per-recipient path for this. One now ships part of it. Read the limits before you relax: Klaviyo is explicit that it does not remove the pixel, and that it has no recipient-facing way to collect an objection — no footer link, no preference page — so identifying who must be untracked, and setting them, is still yours. Turning it off also removes those people from open rate, from open-based segments and from any flow triggered on an open.",
    next:
      "Settings → Email → Tracking is the account-wide switch, and any user with access to email settings can change it. For the per-recipient version, agree who is in scope with whoever owns privacy, then set them by CSV import, SFTP or API before the send, not after.",
    ownership: "shared",
    sources: [
      {
        name: "Klaviyo, What’s New — “Manage Email Open Tracking”",
        url: "https://www.klaviyo.com/whats-new",
        published: "2026-07-08",
        kind: "product-update",
      },
      {
        name: "Klaviyo Help Center, “How to manage open tracking”",
        url: "https://help.klaviyo.com/hc/en-us/articles/52756655778843-How-to-manage-open-tracking",
        kind: "help-centre",
      },
      {
        name: "Klaviyo Help Center, “Email tracking pixel regulations (CNIL, Garante, and beyond): Managing your open tracking settings”",
        url: "https://help.klaviyo.com/hc/en-us/articles/53113350637083-Email-tracking-pixel-regulations-CNIL-Garante-and-beyond-Managing-your-open-tracking-settings",
        kind: "help-centre",
      },
    ],
    rules: [
      "france-email-open-tracking-consent",
      "italy-email-tracking-pixel-consent",
      "apple-mail-privacy-protection-open-rates",
    ],
    lastVerified: "2026-08-02",
  },

  {
    id: "klaviyo-minute-level-gradual-sending",
    esp: "klaviyo",
    date: "2026-07-16",
    dateKind: "announced",
    title: "Campaign batches can be scheduled by the minute",
    changed:
      "Gradual sending moved from hourly intervals to batches as small as one percent of the audience per minute.",
    matters:
      "Klaviyo frames this as protecting your website from traffic spikes. The deliverability use is the more interesting one. Complaint rate is measured against what actually lands, and a single-shot send to a cold or unusually large audience is how a programme crosses the 0.3 percent line at Gmail and Yahoo before anyone has seen a report. Batching by the minute buys you the time to stop a send that is going badly.",
    next:
      "Pick your next campaign to a re-engagement or newly imported audience and schedule it gradually rather than all at once. Watch the complaint rate on the first batches before the rest goes.",
    ownership: "shared",
    sources: [
      {
        name: "Klaviyo, What’s New — “Minute-level gradual sending for campaigns”",
        url: "https://www.klaviyo.com/whats-new",
        published: "2026-07-16",
        kind: "product-update",
      },
      {
        name: "Klaviyo Help Center, “Understanding campaign schedule and send options”",
        url: "https://help.klaviyo.com/hc/en-us/articles/360050216012-Understanding-campaign-schedule-and-send-options",
        kind: "help-centre",
      },
    ],
    rules: ["gmail-bulk-sender-requirements", "yahoo-requires-authentication-and-low-complaints"],
    lastVerified: "2026-08-02",
  },

  {
    id: "klaviyo-api-revision-2026-07-15",
    esp: "klaviyo",
    date: "2026-07-15",
    dateKind: "revision",
    title: "API revision 2026-07-15 added a backfill flag and a sending domains API",
    changed:
      "Two parts of this revision matter outside engineering. Create Event and Bulk Create Events took a top-level backfill flag that records historical events without triggering flows, which Klaviyo points at CRM migrations and bulk replay. Separately, a Sending Domains API arrived in beta on the same revision: it registers a domain, returns the DNS records to publish, re-runs verification while DNS propagates, and promotes a verified domain from pending to active. Klaviyo warns that activation is a cutover which replaces the account’s previous dedicated domain.",
    matters:
      "The backfill flag is the one to remember, because the failure it prevents is one people only notice from the replies. Replaying years of order history into a platform is how a welcome flow fires at customers who joined in 2021. Until this revision there was no supported way to load that history without arming the flows. On the domain side, DKIM setup stops being a screen someone clicked through once and becomes something you can script, verify and re-check.",
    next:
      "If a migration or a bulk replay is anywhere on the roadmap, confirm whoever is writing it is on revision 2026-07-15 and using backfill. Klaviyo supports each revision for two years from release, so an integration pinned to an older one does not have this.",
    ownership: "shared",
    sources: [
      {
        name: "Klaviyo API changelog, revision 2026-07-15 (GA) and 2026-07-15.pre (Beta)",
        url: "https://developers.klaviyo.com/en/docs/changelog",
        published: "2026-07-15",
        kind: "api-changelog",
      },
    ],
    rules: ["dkim-alignment-vs-dkim-passing"],
    lastVerified: "2026-08-02",
  },

  {
    id: "klaviyo-transactional-service-sending-domains",
    esp: "klaviyo",
    date: "2026-05-28",
    dateKind: "announced",
    title: "Transactional and service mail can have their own branded sending domains",
    changed:
      "Klaviyo added separate branded sending domains per send type, so transactional and service email no longer share a sending domain — and therefore a reputation — with marketing volume.",
    matters:
      "Receipts, password resets and shipping notices are the mail people actually need, and they are the mail that suffers when a marketing campaign lands badly on the same domain. Splitting the domains is the standard fix and it is now a setting rather than a project. Worth being precise about what it does not do: moving a message to a service domain does not make it transactional. That is decided by content and by why you are sending it.",
    next:
      "List what your account sends that a customer would call for if it went missing. If those messages leave on the same domain as your campaigns, this is the setting you came for.",
    ownership: "shared",
    sources: [
      {
        name: "Klaviyo, What’s New — “Transactional and Service Branded Sending Domains”",
        url: "https://www.klaviyo.com/whats-new",
        published: "2026-05-28",
        kind: "product-update",
      },
      {
        name: "Klaviyo Help Center, “How to set up a branded sending domain”",
        url: "https://help.klaviyo.com/hc/en-us/articles/115000357752-How-to-set-up-a-branded-sending-domain",
        kind: "help-centre",
      },
    ],
    rules: [
      "transactional-vs-commercial-email-is-not-a-subject-line-trick",
      "dkim-alignment-vs-dkim-passing",
    ],
    lastVerified: "2026-08-02",
  },

  /* ─────────────────────────────────────────────────────────── Mailchimp */
  {
    id: "mailchimp-transactional-domain-authentication",
    esp: "mailchimp",
    date: "2023-12-19",
    dateKind: "announced",
    title: "Transactional sending domains had to publish DKIM and DMARC",
    changed:
      "Mailchimp told Transactional (Mandrill) users that from 15 March 2024 it would enforce new sending domain authentication requirements, citing the Google and Yahoo announcements. Two DKIM CNAMEs — mte1._domainkey and mte2._domainkey, pointing at dkim1.mandrillapp.com and dkim2.mandrillapp.com — plus a DMARC TXT record at _dmarc, for which the note gives the value v=DMARC1; p=none. Domains that did not comply would have their mail sent from a mandrillapp.com subdomain instead, with replies still routed to the original address.",
    matters:
      "This is the clearest example on the site of a platform doing the mechanical half and leaving the judgement. The record Mailchimp asks for is p=none, which is monitoring: it asks receivers to report and instructs them to reject nothing. A domain that followed this instruction to the letter and then stopped is authenticated as far as the platform is concerned and still unprotected against someone spoofing it. The fallback is worth knowing too — your mail keeps going out, but from a domain that is not yours, which is not what anyone reading the From line expects.",
    next:
      "Read your own _dmarc record today. If it still says p=none and nobody is reading the reports, you completed the platform’s task and not the one that protects you.",
    ownership: "shared",
    sources: [
      {
        name: "Mailchimp release notes, “New sending domain authentication requirements”",
        url: "https://mailchimp.com/developer/release-notes/new-sending-domain-authentication-requirements/",
        published: "2023-12-19",
        kind: "release-notes",
      },
    ],
    rules: [
      "dmarc-policy-none-is-not-enforcement",
      "gmail-bulk-sender-requirements",
      "yahoo-requires-authentication-and-low-complaints",
      "dkim-alignment-vs-dkim-passing",
    ],
    lastVerified: "2026-08-02",
  },

  {
    id: "mailchimp-audiences-endpoints-consent-mapping",
    esp: "mailchimp",
    date: "2025-08-07",
    dateKind: "announced",
    title: "New Audiences endpoints put consent mapping back on the caller",
    changed:
      "Mailchimp released Audiences endpoints in beta as an alternative to List Members, so a contact can be created from an SMS number with no email address at all. The release note carries a condition in its own words: consent must be accurately mapped to the supported marketing consent values, and unsupported values, including opt-outs, must be updated manually.",
    matters:
      "That sentence is the whole entry. A migration that maps consent loosely is how unsubscribed people quietly reappear as subscribed, and this note is telling you in advance that the endpoint will not carry an opt-out across for you. Under CASL and under ePrivacy the burden of proving consent sits with the sender, and “the API did not support that value” is not a record of consent.",
    next:
      "If anyone is loading contacts through these endpoints, ask what happens to a consent value the endpoint does not support. If the answer is that it is dropped, the opt-outs need their own pass before the first send, not after the first complaint.",
    ownership: "yours",
    sources: [
      {
        name: "Mailchimp release notes, “New Audiences endpoints (BETA)”",
        url: "https://mailchimp.com/developer/release-notes/new-audiences-endpoints-beta/",
        published: "2025-08-07",
        kind: "release-notes",
      },
    ],
    rules: [
      "eprivacy-email-consent-soft-optin",
      "canada-casl-commercial-email-needs-provable-consent",
    ],
    lastVerified: "2026-08-02",
  },

  {
    id: "mailchimp-attribution-overwrites-campaign-id",
    esp: "mailchimp",
    date: "2024-12-06",
    dateKind: "announced",
    title: "Mailchimp began overwriting campaign_id and outreach_id on orders",
    changed:
      "Mailchimp started writing over the campaign_id and outreach_id values on orders to match its own attribution model and the account’s settings, and told integrations that send those values with Add Order or Update Order to deprecate that logic.",
    matters:
      "If you have ever tried to reconcile platform revenue against the shop’s own numbers and lost an afternoon, this is the shape of change that causes it. The platform, rather than your integration, now decides which message a purchase belongs to. Nothing about the emails changed. The number you report did, and it changed on a date.",
    next:
      "Before comparing this year’s attributed revenue with last year’s, check whether the series crosses 6 December 2024. If it does, you are comparing two different attribution models and the trend line is telling you nothing.",
    ownership: "context",
    sources: [
      {
        name: "Mailchimp release notes, “Overwriting campaign_id and outreach_id”",
        url: "https://mailchimp.com/developer/release-notes/overwriting-campaign_id-and-outreach_id/",
        published: "2024-12-06",
        kind: "release-notes",
      },
    ],
    /* No rule link on purpose. This changes a number you report and touches no
       obligation in the corpus, and inventing a connection to fill the field
       would be the same failure as inventing a date. */
    lastVerified: "2026-08-02",
  },

  /* ─────────────────────────────────────────────────────────────── Braze */
  {
    id: "braze-snds-in-deliverability-center",
    esp: "braze",
    date: "2026-06-25",
    dateKind: "announced",
    title: "Microsoft SNDS data appears in the Deliverability Center for Amazon SES senders",
    changed:
      "For workspaces that send email through Amazon SES, Braze’s Deliverability Center now displays Microsoft SNDS metrics for dedicated sending IPs, and backfills up to 90 days of history when the feature is switched on for the workspace.",
    matters:
      "SNDS is the only place Microsoft tells you what it thinks of your IP — complaint rate, trap hits, filter result — and most senders never look, because it lives behind a separate registration on a Microsoft site nobody has open. Putting it in the tool people already have open is the difference between knowing and guessing. Read the scope before you celebrate: dedicated IPs, and only for workspaces on Amazon SES.",
    next:
      "Switch it on and read the backfilled 90 days before you read anything else. If your complaint rate at Outlook was already high, the history will show you the week it started, which is usually the week something else changed.",
    ownership: "shared",
    sources: [
      {
        name: "Braze release notes, 25 June 2026 release",
        url: "https://www.braze.com/docs/releases/home#june-25-2026",
        published: "2026-06-25",
        kind: "release-notes",
      },
    ],
    rules: [
      "microsoft-snds-and-jmrp-expose-ip-and-junk-data",
      "outlook-high-volume-sender-authentication",
    ],
    lastVerified: "2026-08-02",
  },

  {
    id: "braze-orphaned-subscription-states",
    esp: "braze",
    date: "2026-05-28",
    dateKind: "announced",
    title: "Orphaned subscription records stopped being inherited by new profiles",
    changed:
      "Braze now manages what it calls orphaned subscription state records — subscription data held against a phone number or email address that is not attached to any user profile — to stop a newly created profile inheriting subscription state from a deleted or unrelated user. Braze files the item under SMS; its own description of the record covers a phone number or an email address.",
    matters:
      "Inherited subscription state is a consent bug wearing the costume of a data bug. A profile created on an address that once belonged to someone else could arrive already subscribed, and nothing in your records would explain why. Every regime that requires provable consent requires it for a person, not for a string of characters that has had two owners.",
    next:
      "If you have ever deleted and recreated users on the same addresses — a migration, a de-duplication, a tidy-up of test accounts — spot-check a handful of those profiles for a subscription nobody gave.",
    ownership: "esp",
    sources: [
      {
        name: "Braze release notes, 28 May 2026 release",
        url: "https://www.braze.com/docs/releases/home#may-28-2026",
        published: "2026-05-28",
        kind: "release-notes",
      },
    ],
    rules: [
      "canada-casl-commercial-email-needs-provable-consent",
      "eprivacy-email-consent-soft-optin",
    ],
    lastVerified: "2026-08-02",
  },

  {
    id: "braze-email-open-machine-open-field",
    esp: "braze",
    date: "2026-02-05",
    dateKind: "announced",
    title: "The Email Open event started carrying a machine_open field",
    changed:
      "Braze’s Email Open event now generates a machine_open field value, which reports into a Machine Open metric.",
    matters:
      "Apple’s Mail Privacy Protection fetches images on the recipient’s behalf, so a large share of every open a platform records is a proxy server rather than a person. Until the two are separated, open rate is a number describing Apple’s infrastructure. A flag in the event stream is what lets you take machine opens out of a report, a segment or a re-engagement trigger — but the flag does nothing until somebody changes the report.",
    next:
      "Find the segments and flows that treat an open as engagement, starting with the sunset policy. One that counts a machine open will keep mailing people who have not looked at you in a year, and will report that as success.",
    ownership: "shared",
    sources: [
      {
        name: "Braze release notes, 5 February 2026 release",
        url: "https://www.braze.com/docs/releases/home#february-5-2026",
        published: "2026-02-05",
        kind: "release-notes",
      },
    ],
    rules: [
      "apple-mail-privacy-protection-open-rates",
      "inactive-recipients-need-a-sunset-policy",
    ],
    lastVerified: "2026-08-02",
  },
];

import type { Ownership, RuleSource } from "@/lib/types";

/**
 * What each mailbox provider has actually said — and what it has never said.
 *
 * The most-asked question in this industry is "how does the Gmail algorithm
 * work", and it has no honest answer: Google does not publish one, nobody
 * outside Google knows it, and every page claiming to explain it is either
 * restating the published guidelines or inventing. A page like that would be
 * the most-shared page on this site and the first one that could not be cited.
 *
 * So this corpus answers the question the other way round, which is the same
 * move `/blocklists` already makes by naming the twenty-two zones that publish
 * no test entry: the negative space is the product. For every provider we
 * record what it stated in its own words with a link, and — separately, and
 * with equal weight — what it has never stated, so a reader can tell a
 * requirement from a rumour without trusting us at all.
 *
 * Field contract, and it is not softer than `rules.ts`:
 *   saidPublicly   only claims read off the provider's own page. `verbatim`
 *                  carries the provider's exact words where a paraphrase would
 *                  blunt them. Never a vendor blog, never a conference recap.
 *   neverSaid      the widely repeated claim, and what the provider actually
 *                  published instead. This is where most of the value is.
 *   thresholds     numbers only where the provider printed the number.
 *   bounceCodes    the literal string a receiver returns, because that is what
 *                  a person actually has in front of them at 2am.
 *   delisting      the removal path, and — the half nobody publishes — whose
 *                  job it is to file it.
 *   unreadable     set when the provider's page will not serve content to an
 *                  automated reader. `/esp` already does this for Salesforce;
 *                  saying so beats a silent gap that reads as "nothing here".
 *
 * `published` is omitted wherever the publisher prints no date. Google's help
 * centre prints none and Yahoo's prints none; inventing a plausible one is how
 * a cited reference quietly becomes fiction.
 */

/** Consumer mailbox, business mail stack, or both. They delist differently. */
export type ProviderKind = "consumer" | "business" | "both";

export interface ProviderClaim {
  /** What they said, in our words, short enough to scan. */
  claim: string;
  /** Their words, where the exact phrasing is the point. */
  verbatim?: string;
  source: RuleSource;
}

export interface ProviderMyth {
  /** The thing the industry repeats. Stated plainly, not strawmanned. */
  myth: string;
  /** What the provider actually published, or the fact that it published nothing. */
  correction: string;
  /**
   * The provider's own words, where they exist.
   *
   * A provider stating in writing that it will not publish a number is the
   * strongest citation available for a negative — stronger than our summary of
   * an absence, because a reader can check it in one click.
   */
  verbatim?: string;
  /** Where a reader can check that for themselves. Omit only when nothing exists to link. */
  source?: RuleSource;
  /** A rule page on this site that carries the dated version of the correction. */
  rule?: string;
}

export interface ProviderThreshold {
  name: string;
  /** The number as the provider wrote it. "0.3%" not "three tenths of a percent". */
  value: string;
  /** Who it applies to, where the provider scoped it. */
  appliesTo?: string;
  source: RuleSource;
}

export interface ProviderBounce {
  /** The literal string, as returned. */
  code: string;
  means: string;
  /** What to actually do, naming the path. */
  next?: string;
  source: RuleSource;
}

export interface ProviderDelisting {
  /** One line: what the removal path actually is. */
  path: string;
  url?: string;
  /**
   * Whose job it is to file it — the question no other delisting guide answers.
   * On shared sending infrastructure the answer is genuinely the platform's,
   * and telling a marketer to file it themselves sends them to a form they
   * cannot complete.
   */
  whoFiles: Ownership;
  /** Why it is theirs, or why it is not. One sentence. */
  whoFilesWhy: string;
  /** As the provider states it. Omitted where they publish no timeframe. */
  typicalWait?: string;
  evidenceNeeded?: string[];
  /** The trap: the case where the obvious path is the wrong one. */
  caveat?: string;
  source: RuleSource;
}

export interface Provider {
  id: string;
  name: string;
  kind: ProviderKind;
  /** One line a marketer would recognise. Not marketing copy. */
  what: string;
  postmasterUrl?: string;
  saidPublicly: ProviderClaim[];
  neverSaid: ProviderMyth[];
  thresholds: ProviderThreshold[];
  bounceCodes: ProviderBounce[];
  delisting: ProviderDelisting[];
  /** Set when the provider's own page will not render for an automated reader. */
  unreadable?: string;
  /** Related rule slugs on this site. */
  related?: string[];
  lastVerified: string;
}

/* ── Sources, declared once ──────────────────────────────────────────────
   Named here rather than inline so the same citation cannot drift between
   two entries that are quoting the same page. */

const GOOGLE_SENDER_GUIDELINES: RuleSource = {
  name: "Google Workspace Admin Help, Email sender guidelines",
  url: "https://support.google.com/a/answer/81126",
  /* Google's help centre prints no date on this page. None is claimed. */
  actor: "mailbox-provider",
};

const YAHOO_BEST_PRACTICES: RuleSource = {
  name: "Yahoo Sender Hub, Best practices",
  url: "https://senders.yahooinc.com/best-practices/",
  /* Footer carries a copyright year only, which is not a publication date. */
  actor: "mailbox-provider",
};

const MS_DELIST: RuleSource = {
  name: "Microsoft Learn, Remove yourself from the blocked senders list and address 5.7.511 Access denied errors",
  url: "https://learn.microsoft.com/en-us/defender-office-365/external-senders-use-the-delist-portal-to-unblock-yourself",
  published: "2024-06-10",
  actor: "mailbox-provider",
};

const MS_OUTLOOK_POSTMASTER: RuleSource = {
  name: "Microsoft, Outlook.com postmaster — sender requirements",
  /* The long-standing sendersupport.olc.protection.outlook.com/pm/ URL now
     308-redirects here, which is worth knowing on its own: every deliverability
     bookmark in the industry points at the old one. */
  url: "https://substrate.office.com/ip-domain-management-snds/postmaster",
  actor: "mailbox-provider",
};

const APPLE_POSTMASTER: RuleSource = {
  name: "Apple Support, Postmaster information for iCloud Mail",
  url: "https://support.apple.com/en-us/102322",
  actor: "mailbox-provider",
};

export const PROVIDERS: Provider[] = [
  /* ── Gmail ───────────────────────────────────────────────────────────── */
  {
    id: "gmail",
    name: "Gmail",
    kind: "both",
    what: "Google's consumer mailbox and the Workspace stack behind it. The one everybody means when they say deliverability.",
    postmasterUrl: "https://postmaster.google.com",
    saidPublicly: [
      {
        claim: "Every sender needs SPF or DKIM, forward and reverse DNS, and TLS.",
        source: GOOGLE_SENDER_GUIDELINES,
      },
      {
        claim: "Above 5,000 messages a day to Gmail accounts, SPF and DKIM both become required, along with DMARC and alignment.",
        verbatim:
          "For direct email, the domain in the sender's From: header must be aligned with either the SPF domain or the DKIM domain",
        source: GOOGLE_SENDER_GUIDELINES,
      },
      {
        claim: "A shared IP carries everyone's behaviour, not just yours.",
        verbatim:
          "The activity of any senders using a shared IP address affects the reputation of all senders for that shared IP address.",
        source: GOOGLE_SENDER_GUIDELINES,
      },
      {
        claim: "Personal Gmail accounts require a DKIM key of at least 1024 bits.",
        verbatim: "Sending to personal Gmail accounts requires a DKIM key of 1024 bits or longer",
        source: GOOGLE_SENDER_GUIDELINES,
      },
    ],
    neverSaid: [
      {
        myth: "Gmail weights domain reputation over IP reputation.",
        correction:
          "Google's guidelines describe both and rank neither. There is no published statement that one outweighs the other, and the Postmaster Tools dashboards that once showed the two side by side were retired — so the number people argue about is not merely unranked, it is no longer published at all.",
        source: GOOGLE_SENDER_GUIDELINES,
        rule: "google-postmaster-reputation-retired",
      },
      {
        myth: "There is a Gmail sender score you can raise.",
        correction:
          "Google has never published a numeric sender score, a scoring formula, or any reputation value you could audit. The guidelines state requirements and thresholds and describe no mechanism. Every score in this category is a vendor's own invention, sold back to you.",
        source: GOOGLE_SENDER_GUIDELINES,
      },
      {
        myth: "Gmail tells you why a message went to spam.",
        correction:
          "It does not. Google publishes the failures it returns at the SMTP layer and the thresholds it enforces on; it publishes nothing about content classification for an individual message. Anyone reconstructing a per-message reason is guessing.",
        source: GOOGLE_SENDER_GUIDELINES,
      },
    ],
    thresholds: [
      {
        name: "Spam rate, the level to stay under",
        value: "0.3%",
        appliesTo: "Every sender, measured in Postmaster Tools",
        source: GOOGLE_SENDER_GUIDELINES,
      },
      {
        name: "Spam rate, the level Google actually tells you to aim for",
        value: "0.10%",
        appliesTo: "Stated alongside the 0.3% line, and the more useful of the two",
        source: GOOGLE_SENDER_GUIDELINES,
      },
      {
        name: "Bulk sender threshold",
        value: "5,000 messages per day",
        appliesTo: "Messages to Gmail accounts",
        source: GOOGLE_SENDER_GUIDELINES,
      },
      {
        name: "Minimum DKIM key length",
        value: "1024 bits",
        appliesTo: "Sending to personal Gmail accounts",
        source: GOOGLE_SENDER_GUIDELINES,
      },
    ],
    bounceCodes: [],
    delisting: [
      {
        path: "There is no Gmail delisting form. Gmail has no public blocklist to be removed from, so the only lever is the sending behaviour Postmaster Tools measures.",
        url: "https://postmaster.google.com",
        whoFiles: "yours",
        whoFilesWhy:
          "Nobody can file this for you because there is nothing to file. The spam rate is produced by your list and your content, and it is the only input Google publishes.",
        caveat:
          "Any service selling Gmail delisting is selling something that does not exist. What does exist is the Postmaster Tools spam-rate graph, which is free.",
        source: GOOGLE_SENDER_GUIDELINES,
      },
    ],
    related: ["gmail-bulk-sender-requirements", "google-postmaster-reputation-retired"],
    lastVerified: "2026-08-04",
  },

  /* ── Yahoo ───────────────────────────────────────────────────────────── */
  {
    id: "yahoo",
    name: "Yahoo",
    kind: "consumer",
    what: "Yahoo Mail, AOL and the rest of the Yahoo estate, which share one sender policy and one postmaster team.",
    postmasterUrl: "https://senders.yahooinc.com/",
    saidPublicly: [
      {
        claim: "All senders need SPF or DKIM; bulk senders need both, plus DMARC that passes.",
        verbatim: "Publish a valid DMARC policy with at least p=none - DMARC must pass",
        source: YAHOO_BEST_PRACTICES,
      },
      {
        claim: "Unsubscribes must be honoured within two days.",
        verbatim: "Honor unsubscribes within 2 days",
        source: YAHOO_BEST_PRACTICES,
      },
      {
        claim: "One-click unsubscribe is required, and Yahoo names the POST method specifically.",
        verbatim: "The Post (RFC 8058) method is highly recommended",
        source: YAHOO_BEST_PRACTICES,
      },
      {
        claim: "Reputation attaches to the IP and to the DKIM domain — Yahoo names both.",
        verbatim:
          "Each IP and DKIM domain has a reputation, which can impact the delivery of your email",
        source: YAHOO_BEST_PRACTICES,
      },
      {
        claim: "Marketing and user mail should not leave from the same IPs.",
        verbatim: "Don't send bulk/marketing email from the same IPs you use to send user mail",
        source: YAHOO_BEST_PRACTICES,
      },
    ],
    neverSaid: [
      {
        myth: "There is a safe number of concurrent connections to Yahoo.",
        correction:
          "Yahoo says in as many words that it will not tell you. Every connection-limit number in circulation is somebody's measurement of their own traffic on one day, repeated until it sounded official.",
        verbatim:
          "while we do not publish specific guidelines for the numbers of connections you can concurrently use",
        source: YAHOO_BEST_PRACTICES,
      },
      {
        myth: "Yahoo publishes a messages-per-connection limit.",
        correction:
          "It states that a limit exists and does not give the number. Treat any specific figure as folklore, and read the deferral codes your own MTA is receiving instead.",
        source: YAHOO_BEST_PRACTICES,
      },
    ],
    thresholds: [
      {
        name: "Spam rate, the level to stay under",
        value: "0.3%",
        appliesTo: "Stated for all senders and again for bulk senders",
        source: YAHOO_BEST_PRACTICES,
      },
      {
        name: "Unsubscribe deadline",
        value: "2 days",
        appliesTo: "Every sender using list-unsubscribe",
        source: YAHOO_BEST_PRACTICES,
      },
      {
        name: "Minimum DKIM key length",
        value: "1024 bits",
        source: YAHOO_BEST_PRACTICES,
      },
    ],
    bounceCodes: [],
    delisting: [
      {
        path: "Yahoo's sender support form, through the Sender Hub. There is no self-service portal that removes a block on its own.",
        url: "https://senders.yahooinc.com/",
        whoFiles: "shared",
        whoFilesWhy:
          "On a shared pool the listed address belongs to your sending platform and only they can file for it. On a dedicated IP it is yours. Check which you are on before filling in anything.",
        source: YAHOO_BEST_PRACTICES,
      },
    ],
    related: ["yahoo-requires-authentication-and-low-complaints"],
    lastVerified: "2026-08-04",
  },

  /* ── Microsoft 365 ───────────────────────────────────────────────────── */
  {
    id: "microsoft-365",
    name: "Microsoft 365",
    kind: "business",
    what: "The business mail stack — anything behind *.mail.protection.outlook.com. Not the same service as Outlook.com, and not the same delisting path.",
    postmasterUrl: "https://sendersupport.olc.protection.outlook.com/pm/",
    saidPublicly: [
      {
        claim:
          "A blocked source IP produces a bounce that names the delist portal in the bounce text itself.",
        verbatim:
          "550 5.7.606-649 Access denied, banned sending IP [Source IP address]: To request removal from this list please visit https://sender.office.com/ and follow the directions.",
        source: MS_DELIST,
      },
      {
        claim: "Delisting is not instant, and Microsoft declines to promise a number.",
        verbatim:
          "Results can vary widely before the restrictions are removed. It might take up to 24 hours or longer.",
        source: MS_DELIST,
      },
      {
        claim: "One address and one IP per submission.",
        verbatim:
          "Use the email address that received the NDR, and the IP address that was specified in the error message. You can enter only one email address and one IP address per visit.",
        source: MS_DELIST,
      },
    ],
    neverSaid: [
      {
        myth: "The delist portal handles every Microsoft block.",
        correction:
          "It does not, and this is the single most expensive misunderstanding in the category. A 5.7.511 block cannot be cleared through the portal at all — Microsoft says so on the same page that documents the portal. People spend days resubmitting a form that was never going to work.",
        verbatim:
          "If you receive the error 5.7.511 go to the How to fix error code 5.7.511 section. You can't use the delist portal to fix yourself.",
        source: MS_DELIST,
      },
      {
        myth: "Outlook.com and Microsoft 365 are one system with one delisting form.",
        correction:
          "They are two, with two forms. The delist portal at sender.office.com covers Microsoft 365; the consumer service has a separate support request form entirely. Filing at the wrong one produces no error and no result.",
        source: MS_DELIST,
      },
    ],
    thresholds: [
      {
        name: "Bulk sender threshold",
        value: "5,000 emails per day",
        appliesTo: "Domains sending to Outlook.com, enforced from 5 May 2025",
        source: MS_OUTLOOK_POSTMASTER,
      },
    ],
    bounceCodes: [
      {
        code: "550 5.7.606-649 Access denied, banned sending IP",
        means: "Your source IP is on the blocked senders list.",
        next: "The self-service delist portal at sender.office.com clears this one.",
        source: MS_DELIST,
      },
      {
        code: "550 5.7.511 Access denied, banned sender",
        means:
          "A block that Microsoft wants to investigate before lifting. The portal is closed to you here.",
        next: "Forward the bounce to delist@microsoft.com with the full NDR code and the IP. Microsoft states it will come back within 48 hours.",
        source: MS_DELIST,
      },
    ],
    delisting: [
      {
        path: "Office 365 Anti-Spam IP Delist Portal — self-service, one IP and one address per visit.",
        url: "https://sender.office.com",
        whoFiles: "shared",
        whoFilesWhy:
          "The form wants the IP from the bounce. On a shared pool that address is your sending platform's and the submission is theirs to make; on a dedicated IP it is yours.",
        typicalWait: "Up to 24 hours or longer — Microsoft publishes no firm figure.",
        evidenceNeeded: [
          "The email address that received the bounce",
          "The exact IP address named in the bounce",
        ],
        caveat:
          "Does not work for 5.7.511. Read the code in your bounce before you open the form.",
        source: MS_DELIST,
      },
      {
        path: "5.7.511 only: email delist@microsoft.com with the full bounce.",
        whoFiles: "shared",
        whoFilesWhy:
          "Same split as the portal — whoever owns the listed IP has to send it, and on shared infrastructure that is not you.",
        typicalWait: "Microsoft states it will contact you within 48 hours with next steps.",
        evidenceNeeded: ["The full NDR code", "The IP address from the bounce"],
        source: MS_DELIST,
      },
    ],
    related: ["outlook-high-volume-sender-authentication"],
    lastVerified: "2026-08-04",
  },

  /* ── Outlook.com ─────────────────────────────────────────────────────── */
  {
    id: "outlook-com",
    name: "Outlook.com",
    kind: "consumer",
    what: "The consumer service — outlook.com, hotmail.com, live.com, msn.com. Shares a filtering heritage with Microsoft 365 and does not share its delisting path.",
    postmasterUrl: "https://sendersupport.olc.protection.outlook.com/pm/",
    saidPublicly: [
      {
        claim: "Consumer delisting runs through its own support request form, not the delist portal.",
        source: MS_DELIST,
      },
      {
        claim:
          "Non-compliant bulk mail is junked first and rejected later, rather than rejected immediately.",
        verbatim:
          "Non-compliant messages will be sent to the junk folder. Shortly we will reject the messages until the DNS records are corrected.",
        source: MS_OUTLOOK_POSTMASTER,
      },
    ],
    neverSaid: [
      {
        myth: "SNDS shows you your Outlook.com reputation.",
        correction:
          "SNDS reports on IP addresses you have proved you control — complaint rates, trap hits, filter result. It is data about your addresses, not a reputation score, and it says nothing about a shared pool you do not own.",
        source: MS_DELIST,
      },
    ],
    thresholds: [
      {
        name: "Bulk sender threshold",
        value: "5,000 emails per day",
        appliesTo: "Domains sending to Outlook.com, enforced from 5 May 2025",
        source: MS_OUTLOOK_POSTMASTER,
      },
    ],
    bounceCodes: [],
    delisting: [
      {
        path: "Outlook.com support request form. A different form from the Microsoft 365 delist portal, with a different queue behind it.",
        url: "https://support.microsoft.com/supportrequestform/8ad563e3-288e-2a61-8122-3ba03d6b8d75",
        whoFiles: "shared",
        whoFilesWhy:
          "Whoever owns the listed IP files it. On any mainstream ESP's shared pool that is the platform, and a marketer filing it themselves cannot supply what the form asks for.",
        caveat:
          "Microsoft points senders at the troubleshooting FAQ before submitting; submissions that skip it are the ones that go nowhere.",
        source: MS_DELIST,
      },
    ],
    related: ["outlook-high-volume-sender-authentication"],
    lastVerified: "2026-08-04",
  },

  /* ── Apple iCloud ────────────────────────────────────────────────────── */
  {
    id: "icloud",
    name: "Apple iCloud Mail",
    kind: "consumer",
    what: "icloud.com, me.com and mac.com. Small share, loud effect: Apple's client is where Mail Privacy Protection and AI summaries change what your numbers mean.",
    postmasterUrl: "https://support.apple.com/en-us/102322",
    unreadable:
      "Apple's postmaster page does not serve its body text to an automated reader — two fetches from two locales returned the title and navigation only. The claims below are the ones this site's rule pages already carry from a human reading, and this page deliberately publishes less about Apple than about the others rather than filling the gap from memory.",
    saidPublicly: [
      {
        claim:
          "Apple asks bulk senders for SPF and DKIM, and states the sending domain must publish a DMARC policy.",
        source: APPLE_POSTMASTER,
      },
      {
        claim: "Apple asks that marketing and transactional streams be segmented.",
        source: APPLE_POSTMASTER,
      },
    ],
    neverSaid: [
      {
        myth: "Apple Mail Privacy Protection only affects Apple Mail users' opens.",
        correction:
          "It affects your open rate as a metric, for every recipient reading in Apple Mail regardless of address — which is why an iCloud-share argument misses the point. The dated version of this is on the rule page.",
        rule: "apple-mail-privacy-protection-open-rates",
      },
    ],
    thresholds: [],
    bounceCodes: [],
    delisting: [
      {
        path: "Email Apple's postmaster team directly. There is no form and no portal.",
        whoFiles: "shared",
        whoFilesWhy:
          "Apple wants mail logs for the blocked source. On a shared pool your platform holds them; you cannot produce them.",
        evidenceNeeded: [
          "The SMTP error your logs recorded, in full",
          "The sending IP addresses involved",
        ],
        caveat:
          "Apple asks that you read your own logs first — the errors carry a URL explaining the rejection, and a request that skips that step is the one that gets no reply.",
        source: APPLE_POSTMASTER,
      },
    ],
    related: [
      "icloud-rejects-bulk-mail-that-misses-sender-requirements",
      "apple-mail-privacy-protection-open-rates",
      "apple-intelligence-email-summaries",
    ],
    lastVerified: "2026-08-04",
  },
];

/** Providers opened during a review that produced nothing citable yet. */
export interface WatchedProvider {
  name: string;
  /** Why there is no page. The reason matters more than the absence. */
  reason: string;
}

/**
 * The list we refused to publish is the only evidence that the list we
 * published means anything — the same discipline `/esp` applies to the four
 * platforms whose changelogs cannot be dated.
 */
export const WATCHED_PROVIDERS: WatchedProvider[] = [
  {
    name: "Proton Mail",
    reason:
      "Publishes user-facing help and a security policy, but no sender guidance, no thresholds and no delisting path we could cite. Nothing to put in a threshold column.",
  },
  {
    name: "GMX and Web.de",
    reason:
      "United Internet operates a postmaster contact, and the sender documentation behind it is not published as a stable, dateable page in English or German. Watched.",
  },
  {
    name: "Mail.ru, Yandex, QQ, NetEase, Naver, Daum",
    reason:
      "Each runs a real postmaster function with real delisting. None has been read against this corpus's bar yet, and publishing a delisting path from memory is precisely how a reference gets somebody's mail permanently blocked.",
  },
  {
    name: "Comcast, Cox, Charter and the US cable ISPs",
    reason:
      "Mostly delegate consumer mail to third-party filters now, so the question is usually which filter rather than which ISP. Not yet traced to a citable page per operator.",
  },
];

export function getProvider(id: string): Provider | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

/** Every distinct source across the corpus, for the freshness count. */
export function providerSources(): RuleSource[] {
  const seen = new Map<string, RuleSource>();
  for (const p of PROVIDERS) {
    const all = [
      ...p.saidPublicly.map((c) => c.source),
      ...p.neverSaid.map((m) => m.source),
      ...p.thresholds.map((t) => t.source),
      ...p.bounceCodes.map((b) => b.source),
      ...p.delisting.map((d) => d.source),
    ];
    for (const s of all) if (s && !seen.has(s.url)) seen.set(s.url, s);
  }
  return [...seen.values()];
}

import type { Rule } from "@/lib/types";

/**
 * Corpus expansion from primary-source research dossiers (2026-08-01/02).
 * Hygiene, international consent, and US/provider gaps that blocked the site
 * from being a serious reference. House rule unchanged: cite or do not ship.
 * OPEN QUESTION language is preserved where the dossiers refused to invent.
 */
export const RULES_EXPANSION: Rule[] = [
  // ─────────────────────────────────────────── bounces and hygiene
  {
    slug: "bounce-suppression-is-platform-specific",
    title: "Bounce suppression is platform-specific, not universal",
    question: "How many soft bounces before Klaviyo, Mailchimp, or Braze suppresses an address?",
    status: "in_force",
    effectiveDate: "2026-04-30",
    jurisdictions: ["Global"],
    topic: "bounces-hygiene",
    /** Multi-tool product truth — not one vendor’s folklore */
    esp: ["klaviyo", "mailchimp", "braze"],
    featured: true,
    answer:
      "Hard and soft bounce labels are interpretive classifications, not a shared industry standard. Klaviyo automatically suppresses after one classified hard bounce and documents a multi-bounce soft path whose exact seventh-versus-eighth boundary is inconsistent on its own help page. Mailchimp documents allowing 7 soft bounces before conversion on some paths and up to 15 on others, and says it must guess. Braze treats hard bounces as permanent failures that suppress, while soft-bounced addresses can remain eligible for later campaigns. You cannot port one ESP's number to another.",
    appliesTo: "Anyone sending marketing email through a modern ESP, especially multi-brand teams that switched platforms or run more than one.",
    plain:
      "There is no universal soft-bounce count. Klaviyo, Mailchimp and Braze each invent their own classifier. Copy-pasting \"we suppress after seven\" from a blog will lie about at least one of your tools.",
    ownership: "shared",
    handled: {
      already:
        "The ESP owns retries, hard-bounce suppression and the soft-bounce classifier for mail it sends.",
      stillYours:
        "Reading the bounce reasons, fixing list acquisition that produces permanent failures, and deciding whether your risk tolerance is tighter than the platform default.",
    },
    mondayMorning:
      "Open your ESP's bounce help article for the product you actually use, write the hard and soft rules on one line, and compare that line to the last 30 days of bounce rates. Do not use a competitor's number.",
    ignoreIf: "You send no marketing email.",
    whatToDo: [
      "Document the hard-bounce and soft-bounce policy for each ESP you use. They will differ.",
      "Treat Klaviyo's soft-bounce ordinal as an open question until Support or a controlled test resolves the page conflict between \"more than 7\" and \"7\".",
      "Review \"soft\" bounces that look permanent (user unknown, invalid domain) before the platform's patience runs out.",
      "If you migrate ESPs, re-map suppressions. The new tool does not inherit the old classifier.",
    ],
    enforcement:
      "No bounce-classification fine. Consequences are automated suppression, dropped sends, and ESP account review when bounce rates stay high. Downstream, mailbox providers treat high permanent failure rates as a reputation signal.",
    sources: [
      {
        name: "Klaviyo, Understanding bounced emails in Klaviyo",
        url: "https://help.klaviyo.com/hc/en-us/articles/115005250408",
        published: "2026-02-13",
        actor: "esp",
      },
      {
        name: "Mailchimp, Soft vs. Hard Bounces",
        url: "https://mailchimp.com/help/soft-vs-hard-bounces/",
        actor: "esp",
      },
      {
        name: "Braze, Hard bounce vs. soft bounce",
        url: "https://www.braze.com/resources/articles/hard-bounce-vs-soft-bounce",
        published: "2025-05-12",
        actor: "esp",
      },
    ],
    related: ["spam-trap-hits-mean-data-failure", "inactive-recipients-need-a-sunset-policy"],
    added: "2026-08-02",
    updated: "2026-08-02",
    lastVerified: "2026-08-02",
    changelog: [{ date: "2026-08-02", note: "Added from primary ESP documentation." }],
  },

  {
    slug: "spam-trap-hits-mean-data-failure",
    title: "A spam-trap hit is a collection or hygiene failure",
    question: "What is the difference between pristine and recycled spam traps, and what happens if I hit one?",
    status: "in_force",
    effectiveDate: "2022-02-15",
    jurisdictions: ["Global"],
    topic: "bounces-hygiene",
    featured: true,
    answer:
      "Spamhaus distinguishes pristine traps (addresses never given to a live user) from recycled or dead-address traps (once valid, hard-bounced for a prolonged period—often twelve months or more—then silently reactivated). Hitting either is evidence that acquisition, partners, imports or retention failed. Google states that a deleted Gmail address cannot be used by anyone in the future, which cuts against casual claims that every dormant consumer address becomes a trap. Whether Microsoft reuses closed Outlook addresses as traps is an open question on first-party sources.",
    appliesTo: "Anyone buying lists, taking partner data, importing CSVs, or mailing multi-year inactive databases.",
    plain:
      "Traps are not random lightning. Pristine traps mean someone sold or scraped an address that was never a person. Recycled traps mean you kept mailing the dead. Fix the collection path; delisting is the symptom treatment.",
    ownership: "yours",
    handled: {
      already:
        "An ESP may throttle or review an account after trap-like patterns, and shared-IP neighbours can suffer collateral damage. They cannot prove how you collected the address.",
      stillYours:
        "Consent and source records, partner contracts, import QA, and sunsetting long-dormant addresses before they become dead-address traps.",
    },
    mondayMorning:
      "List every non-organic source that fed your ESP in the last year (partners, events, appends, manual CSVs). For each, write who holds consent evidence. Empty cells are the trap pipeline.",
    ignoreIf: "You only mail freshly confirmed opt-in addresses with no imports, partners or multi-year inactive segments—and you still monitor hard bounces.",
    whatToDo: [
      "Stop purchased or rented lists. Spamhaus treats permission as non-transferable with the list.",
      "Suppress prolonged hard bounces and do not re-import them from CRM \"cleanups\".",
      "Separate pristine-trap response (audit acquisition) from recycled-trap response (sunset and reconfirm).",
      "Do not claim Microsoft recycles Hotmail into traps unless Microsoft publishes that policy.",
    ],
    enforcement:
      "No statutory fine for a trap hit. Operators list IPs or domains; receivers decide whether to reject, tag or filter. The marketer's real cost is reputation repair and lost inbox placement.",
    sources: [
      {
        name: "Spamhaus, Spamtraps – fix the problem, not the symptom",
        url: "https://www.spamhaus.com/resource-center/spamtraps-fix-the-problem-not-the-symptom/",
        published: "2022-02-15",
        actor: "standards-body",
      },
      {
        name: "Spamhaus, Unravelling the myths of spamtraps",
        url: "https://www.spamhaus.com/resource-center/unravelling-the-myths-of-spamtraps-clicking-links/",
        published: "2023-11-01",
        actor: "standards-body",
      },
      {
        name: "Google Account Help, Remove Gmail from your Google Account",
        url: "https://support.google.com/accounts/answer/61177",
        actor: "mailbox-provider",
      },
    ],
    related: [
      "fix-the-cause-before-blocklist-removal",
      "inactive-recipients-need-a-sunset-policy",
      "signup-forms-need-anti-automation-controls",
    ],
    added: "2026-08-02",
    updated: "2026-08-02",
    lastVerified: "2026-08-02",
    changelog: [{ date: "2026-08-02", note: "Added from Spamhaus and Google primary pages." }],
  },

  {
    slug: "fix-the-cause-before-blocklist-removal",
    title: "Fix the cause before requesting blocklist removal",
    question: "What do Spamhaus SBL, CSS and DBL listings mean, and who removes one on a shared ESP IP?",
    status: "in_force",
    effectiveDate: "2026-08-01",
    jurisdictions: ["Global"],
    topic: "bounces-hygiene",
    featured: true,
    answer:
      "Spamhaus SBL, CSS and DBL are reputation datasets, not a court order and not a universal \"email is blocked\" switch. Each mailbox or gateway operator decides how to treat a listed IP or domain. Shared sending IPs are remediated by the network or ESP that owns them; branded domains on DBL are the marketer's. Purchased lists are a documented path to traps, complaints and listings. Removal without fixing the cause is how you reappear.",
    appliesTo: "Anyone whose IP or domain shows on Spamhaus check tools, and anyone buying or renting lists.",
    plain:
      "A listing is data receivers may use, not a fine. Shared IP → open a ticket with the ESP. Your domain on DBL → that is you. Do not pay a delisting service before you stop the behaviour that put you there.",
    ownership: "shared",
    handled: {
      already:
        "On shared IPs the ESP or upstream network owns the SBL removal channel and the IP's neighbour risk.",
      stillYours:
        "List practices, complaint rates, trap hygiene, and any branded domain or tracking domain that got listed.",
    },
    mondayMorning:
      "Run sending IPs, From/DKIM domains and tracking domains through check.spamhaus.org. Build an owner table: shared IP → ESP ticket; domain listing → your DNS and list practices.",
    ignoreIf: "You send no email and expose no domain in email headers.",
    whatToDo: [
      "Identify whether the listing is IP (SBL/CSS) or domain (DBL) before acting.",
      "Fix acquisition, complaint and trap causes first; then request removal through the correct owner.",
      "Do not publish \"Spamhaus means all mail is blocked\". Test the receivers you care about.",
      "Treat purchased lists as a first-party Spamhaus risk signal, not a grey-area growth hack.",
    ],
    enforcement:
      "Spamhaus does not levy marketing fines. Receivers choose reject, defer, tag or ignore. Impact ranges from nothing at one provider to widespread filtering at others.",
    sources: [
      {
        name: "Spamhaus Blocklist (SBL)",
        url: "https://www.spamhaus.org/blocklists/spamhaus-blocklist/",
        actor: "standards-body",
      },
      {
        name: "Spamhaus Domain Block List (DBL)",
        url: "https://www.spamhaus.org/blocklists/domain-blocklist/",
        actor: "standards-body",
      },
      {
        /* Was `https://check.spamhaus.org/`, which is the lookup tool rather
           than a document — the same failure as citing a regulator's front
           door. The FAQ is where Spamhaus actually states listing and removal
           policy, and it is what a reader needs to see. */
        name: "Spamhaus, Spamhaus Blocklist (SBL) FAQ",
        url: "https://www.spamhaus.org/faqs/spamhaus-blocklist/",
        actor: "standards-body",
      },
      {
        name: "Spamhaus, Domain Blocklist (DBL) FAQ",
        url: "https://www.spamhaus.org/faqs/domain-blocklist/",
        actor: "standards-body",
      },
    ],
    related: ["spam-trap-hits-mean-data-failure", "bounce-suppression-is-platform-specific"],
    added: "2026-08-02",
    updated: "2026-08-04",
    lastVerified: "2026-08-04",
    changelog: [
      { date: "2026-08-04", note: "Correction: this page cited a publisher's front door rather than the document it relies on. Repointed to the primary source itself. Four pages on this shelf had the same fault; a test now rejects any citation that is a bare origin." },{ date: "2026-08-02", note: "Added from Spamhaus policy pages." }],
  },

  {
    slug: "inactive-recipients-need-a-sunset-policy",
    title: "Inactive recipients need a documented sunset policy",
    question: "How long can I keep emailing people who never open or click?",
    status: "in_force",
    effectiveDate: "2024-02-01",
    jurisdictions: ["Global"],
    topic: "bounces-hygiene",
    featured: true,
    answer:
      "Gmail and Yahoo tell bulk senders to focus on willing, engaged recipients and to reconfirm or consider removing inactive ones. Neither publishes a universal number of days. A sunset window is therefore a documented sender policy—tied to cadence and lifecycle—not a mailbox-provider statute. Mailing multi-year inactive addresses is also how recycled spam traps and complaint spikes form.",
    appliesTo: "Any bulk or lifecycle programme with multi-year lists.",
    plain:
      "There is no official \"180 days and you're out\" from Gmail. There is a clear instruction to stop harassing the unwilling. Pick a window, write it down, reconfirm or remove. Folklore is not a policy.",
    ownership: "yours",
    handled: {
      already:
        "ESPs expose last-open and last-click and can automate suppressions you configure. They will not invent your brand's correct window.",
      stillYours:
        "Choosing the window, the reconfirm path, and whether machine opens (MPP) count as engagement.",
    },
    mondayMorning:
      "Define one sentence: \"We reconfirm or suppress after N days without a non-machine click or purchase.\" Put N in writing with the date you chose it. Then count how many profiles exceed N today.",
    ignoreIf: "Your entire list is recent confirmed opt-in with no multi-year dormant tail.",
    whatToDo: [
      "Do not attribute a specific day count to Gmail or Yahoo unless they publish one.",
      "Prefer clicks, purchases and replies over opens where Mail Privacy Protection inflates opens.",
      "Run a reconfirm campaign before mass suppression if the revenue risk is real.",
      "Separate legal consent (still valid) from deliverability engagement (no longer useful).",
    ],
    enforcement:
      "Provider filtering and reputation damage, not a fine for inactivity itself. Combined with trap and complaint signals, inactivity is how programmes quietly die.",
    sources: [
      {
        name: "Google, Email sender guidelines",
        url: "https://support.google.com/a/answer/81126",
        published: "2024-02-01",
        actor: "mailbox-provider",
      },
      {
        name: "Yahoo Sender Best Practices",
        url: "https://senders.yahooinc.com/best-practices/",
        published: "2024-02-01",
        actor: "mailbox-provider",
      },
    ],
    related: [
      "spam-trap-hits-mean-data-failure",
      "apple-mail-privacy-protection-open-rates",
      "gmail-bulk-sender-requirements",
    ],
    added: "2026-08-02",
    updated: "2026-08-02",
    lastVerified: "2026-08-02",
    changelog: [{ date: "2026-08-02", note: "Added. Explicitly refuses a folklore day count." }],
  },

  {
    slug: "signup-forms-need-anti-automation-controls",
    title: "Signup forms need anti-automation controls",
    question: "How do signup bombs and bot list injections wreck deliverability?",
    status: "in_force",
    effectiveDate: "2023-01-01",
    jurisdictions: ["Global"],
    topic: "bounces-hygiene",
    answer:
      "M3AAWG documents automated form abuse that injects spam-trap and third-party addresses into legitimate lists, then blames the brand when mail goes out. Recommended controls include CAPTCHA or equivalent anti-automation, confirmed opt-in, rate limits and monitoring abnormal signup spikes. An expired experimental IETF header is not a substitute for protecting the form. Spamhaus has documented source IPs listed after such abuse.",
    appliesTo: "Anyone with a public email signup, quiz, lead magnet or partner embed.",
    plain:
      "Bots will subscribe garbage to your form at 3am and you will be the one who mails the traps. CAPTCHA, double opt-in and rate limits are not UX purism. They are how you keep the list.",
    ownership: "yours",
    handled: {
      already:
        "Some ESP-hosted forms ship CAPTCHA and bot signals. Custom site forms, Shopify apps and partner embeds often do not.",
      stillYours:
        "Inventory every path that can create a profile, and verify controls on each path—not only the main footer form.",
    },
    mondayMorning:
      "List every form, quiz, popup and API that can create an email profile. For each, note CAPTCHA/bot protection, double opt-in, and who owns the spike alert. Empty cells get fixed first.",
    ignoreIf: "You have no public signup path and only manually load confirmed addresses (rare).",
    whatToDo: [
      "Prefer confirmed opt-in on high-risk or high-volume forms.",
      "Rate-limit submissions and alert on spikes that do not match campaigns.",
      "Do not treat an experimental or expired header proposal as protection.",
      "Verify partner and agency embeds; they are common unprotected paths.",
    ],
    enforcement:
      "No single \"bot form\" fine. Outcomes are trap hits, blocklist listings and ESP review. The public record is operational (Spamhaus, M3AAWG), not a regulator tariff.",
    sources: [
      {
        name: "M3AAWG Sender Best Common Practices, version 3.0",
        url: "https://www.m3aawg.org/documents/en/m3aawg-sender-best-common-practices-version-30",
        actor: "standards-body",
      },
      {
        /* Titled as M3AAWG titles it. This page previously cited "M3AAWG
           Spamtrap Best Common Practices", which is not a document M3AAWG
           publishes — see the changelog below. */
        name: "M3AAWG, Help! I Hit a Spam Trap!",
        url: "https://www.m3aawg.org/sites/default/files/legacy/help_i_hit_a_spam_trap.pdf",
        actor: "standards-body",
      },
      {
        name: "M3AAWG Position on Cold Email",
        url: "https://www.m3aawg.org/sites/default/files/doc_files/m3aawg_position_on_cold_email.2025_0.pdf",
        published: "2025-11-13",
        actor: "standards-body",
      },
    ],
    related: ["spam-trap-hits-mean-data-failure", "bounce-suppression-is-platform-specific"],
    added: "2026-08-02",
    updated: "2026-08-04",
    lastVerified: "2026-08-04",
    changelog: [
      {
        date: "2026-08-04",
        note: "Correction: both sources on this page were dead links, and one of them named a document that does not exist. The M3AAWG sender guidance had moved, and there is no M3AAWG \"Spamtrap Best Common Practices\" — the spam-trap document is titled \"Help! I Hit a Spam Trap!\". Repointed both, corrected the title, and added M3AAWG's dated position paper on cold email. This page carried a verification date against URLs that returned 404, which is the failure this site exists to refuse; a test now checks every cited link on the shelf.",
      },
      { date: "2026-08-02", note: "Added from M3AAWG BCPs." },
    ],
  },

  // ─────────────────────────────────────────── provider rules (US/global)
  {
    slug: "yahoo-requires-authentication-and-low-complaints",
    title: "Yahoo requires authentication and a spam rate below 0.3 percent",
    question: "What does Yahoo require from bulk email senders?",
    status: "in_force",
    effectiveDate: "2024-02-01",
    jurisdictions: ["Global"],
    topic: "provider-rules",
    provider: "Yahoo",
    featured: true,
    answer:
      "Every sender to Yahoo-hosted mailboxes (including AOL, excluding Yahoo Japan) must authenticate with at least SPF or DKIM, keep the spam-complaint rate in Yahoo Sender Hub below 0.3 percent, maintain valid forward and reverse DNS, and format messages per RFC 5321/5322. Senders Yahoo treats as bulk must use both SPF and DKIM, publish DMARC at least p=none, align the From domain (relaxed alignment is acceptable), provide a functioning List-Unsubscribe on marketing mail and honour it within two days, and keep a visible body unsubscribe. Yahoo's Complaint Feedback Loop is a monitoring tool, not itself a sending mandate.",
    appliesTo: "Anyone emailing Yahoo, AOL or other Yahoo-hosted consumer domains outside Yahoo Japan.",
    plain:
      "Yahoo is not a footnote on the Gmail page. Same 0.3 percent complaint cliff, authentication, reverse DNS, and for bulk: DMARC plus one-click-style List-Unsubscribe honoured within two days.",
    ownership: "shared",
    handled: {
      already:
        "Mainstream ESPs set SPF/DKIM on branded domains and emit List-Unsubscribe headers. Shared-IP PTR is the ESP's problem.",
      stillYours:
        "Complaint rate, list quality, DMARC on your domain, and confirming Sender Hub or CFL access when you run dedicated IPs.",
    },
    mondayMorning:
      "If you have Yahoo volume, open Sender Hub (or ask your ESP for the shared-IP complaint view) and write down the 30-day spam rate next to Gmail's. Treat them as two cliffs, not one.",
    ignoreIf: "You never send to Yahoo-hosted consumer domains.",
    whatToDo: [
      "Meet the all-sender floor (SPF or DKIM, PTR, complaint rate) even under bulk thresholds.",
      "Publish DMARC and confirm alignment for bulk volume.",
      "Honour List-Unsubscribe within two days and keep an in-body link.",
      "Use the Complaint Feedback Loop where available; do not confuse enrollment with a free pass.",
    ],
    enforcement:
      "Filtering and reputation effects via Yahoo's complaint and authentication signals. Yahoo does not publish a single public fine schedule for marketers; the practical enforcement is inbox placement.",
    sources: [
      {
        name: "Yahoo Sender Best Practices",
        url: "https://senders.yahooinc.com/best-practices/",
        published: "2024-02-01",
        actor: "mailbox-provider",
      },
      {
        /* "Sender Hub / FAQ materials" pointed at the front door and named no
           document. The requirements this page relies on — SPF and DKIM both,
           DMARC that passes, one-click unsubscribe, honour within two days,
           spam rate under 0.3% — are all on Best Practices, which is also what
           `content/providers.ts` quotes. */
        name: "Yahoo Sender Hub, Best practices",
        url: "https://senders.yahooinc.com/best-practices/",
        actor: "mailbox-provider",
      },
    ],
    related: [
      "gmail-bulk-sender-requirements",
      "one-click-unsubscribe-rfc-8058",
      "outlook-high-volume-sender-authentication",
    ],
    added: "2026-08-02",
    updated: "2026-08-04",
    lastVerified: "2026-08-04",
    changelog: [
      { date: "2026-08-04", note: "Correction: this page cited a publisher's front door rather than the document it relies on. Repointed to the primary source itself. Four pages on this shelf had the same fault; a test now rejects any citation that is a bare origin." },
      { date: "2026-08-02", note: "Re-verified against primary sources (bulk/auth/consent core)." },{ date: "2026-08-02", note: "Added standalone Yahoo requirements (was only a Gmail footnote)." }],
  },

  {
    slug: "icloud-rejects-bulk-mail-that-misses-sender-requirements",
    title: "iCloud Mail rejects bulk mail that misses Apple's sender requirements",
    question: "What does Apple require for bulk delivery to iCloud Mail?",
    status: "in_force",
    effectiveDate: "2025-02-25",
    jurisdictions: ["Global"],
    topic: "provider-rules",
    provider: "Apple",
    featured: true,
    answer:
      "Apple's iCloud Mail postmaster page requires bulk senders to authenticate, send only to people who subscribed, honour unsubscribes, and meet its published technical requirements—or the message is rejected. Apple does not offer a feedback loop. The page does not publish a numeric throttle, concurrency limit or timed ramp; claims of a specific iCloud \"warm-up rate\" are not supported by that primary source.",
    appliesTo: "Anyone mailing @icloud.com, @me.com or @mac.com addresses at scale.",
    plain:
      "Apple will reject bulk mail that fails its sender rules, and it will not send you a complaint FBL. There is also no official published throttle number—anyone selling you one is guessing.",
    ownership: "shared",
    handled: {
      already:
        "ESP authentication and unsubscribe headers cover much of the technical list when configured correctly.",
      stillYours:
        "Consent quality (Apple expects explicit subscribers for bulk), monitoring SMTP rejects, and not inventing ramp folklore.",
    },
    mondayMorning:
      "Filter bounce logs for iCloud domains for 14 days. If you see bulk rejects, fix auth and list source before \"warming\" mythology.",
    ignoreIf: "You have no recipients on Apple's iCloud Mail domains.",
    whatToDo: [
      "Read support.apple.com postmaster page 102322 and meet every listed requirement.",
      "Track temporary and permanent SMTP errors to iCloud separately from Gmail.",
      "Do not publish a numeric Apple throttle unless Apple does.",
      "Remember there is no Apple FBL—complaint visibility must come from other signals.",
    ],
    enforcement:
      "Rejection and filtering per Apple's postmaster text. No public marketer fine schedule. No allowlist programme on the reviewed page.",
    sources: [
      {
        name: "Apple, Postmaster information for iCloud Mail",
        url: "https://support.apple.com/en-us/102322",
        published: "2025-02-25",
        actor: "mailbox-provider",
      },
    ],
    related: [
      "gmail-bulk-sender-requirements",
      "yahoo-requires-authentication-and-low-complaints",
      "one-click-unsubscribe-rfc-8058",
    ],
    added: "2026-08-02",
    updated: "2026-08-02",
    lastVerified: "2026-08-02",
    changelog: [
      {
        date: "2026-08-02",
        note: "Added. Explicitly refuses undocumented throttle folklore.",
      },
    ],
  },

  {
    slug: "microsoft-snds-and-jmrp-expose-ip-and-junk-data",
    title: "Microsoft SNDS and JMRP expose per-IP and junk-report data",
    question: "What do Microsoft SNDS and JMRP actually provide for email senders?",
    status: "in_force",
    effectiveDate: "2026-07-06",
    jurisdictions: ["Global"],
    topic: "provider-rules",
    provider: "Microsoft",
    answer:
      "Microsoft's Smart Network Data Services (SNDS) and Junk Email Reporting Program (JMRP) give visibility into Outlook.com reputation and user junk reports for enrolled sending IPs. Enrollment is a monitoring action, not a substitute for authentication requirements. Deliverability is still reputation-based. Whether JMRP is free, and what each ESP auto-does with reports, must be verified in the current portal and ESP docs—do not copy outdated \"always free\" folklore.",
    appliesTo: "Anyone sending material volume to Outlook.com, Hotmail or Live, especially on dedicated IPs.",
    plain:
      "SNDS/JMRP are how you see Outlook reputation and junk reports per IP. They do not magically fix delivery. Shared-IP senders usually need the ESP to enroll; dedicated-IP senders should own the sheet.",
    ownership: "shared",
    handled: {
      already:
        "Some ESPs enroll shared infrastructure and suppress on junk signals. Confirm in writing for your account.",
      stillYours:
        "IP ownership map, requesting access for dedicated IPs, and acting on junk spikes.",
    },
    mondayMorning:
      "Build a one-row-per-sending-IP sheet: owner, shared/dedicated, SNDS access, JMRP destination, suppression owner. Empty access on dedicated IPs is the gap.",
    ignoreIf: "You send no mail to Outlook.com consumer domains.",
    whatToDo: [
      "Do not treat SNDS enrollment as a bulk-sender compliance checkbox like DMARC.",
      "Verify current portal terms rather than quoting old \"free\" support articles.",
      "Wire junk reports into suppression with the same seriousness as unsubscribes.",
      "Combine with Microsoft's high-volume authentication requirements.",
    ],
    enforcement:
      "No fine for skipping SNDS. The cost is flying blind on Outlook reputation while competitors read the dashboard.",
    sources: [
      {
        name: "Microsoft, Outlook.com Smart Network Data Services",
        url: "https://sendersupport.olc.protection.outlook.com/snds/",
        published: "2026-07-06",
        actor: "mailbox-provider",
      },
    ],
    related: ["outlook-high-volume-sender-authentication", "gmail-bulk-sender-requirements"],
    added: "2026-08-02",
    updated: "2026-08-02",
    lastVerified: "2026-08-02",
    changelog: [{ date: "2026-08-02", note: "Added as monitoring guidance, not a sending mandate." }],
  },

  {
    slug: "gmail-promotions-annotations-are-eligible-not-guaranteed",
    title: "Gmail Promotions annotations are eligible, not guaranteed",
    question: "Do Gmail Promotions tab annotations improve inbox placement?",
    status: "in_force",
    effectiveDate: "2026-04-20",
    jurisdictions: ["Global"],
    topic: "provider-rules",
    provider: "Gmail",
    answer:
      "Google lets senders annotate promotional emails with structured data for richer Promotions-tab presentation. Google states annotations might not be visible to all recipients and that annotation has no effect on the Gmail tab classifier. Markup is optional merchandising, not a compliance or deliverability guarantee.",
    appliesTo: "Consumer brands that care about Gmail Promotions-tab presentation.",
    plain:
      "Annotations can make a promo look richer in Gmail. They do not move you out of Promotions, do not fix spam rate, and Google will not promise every user sees them.",
    ownership: "context",
    handled: {
      already:
        "Some ESPs expose annotation fields; many strip or ignore schema. Verify your stack.",
      stillYours:
        "Whether the creative is worth the engineering, and accepting non-guaranteed rendering.",
    },
    mondayMorning:
      "If a vendor sold you annotations as \"inbox placement,\" close the tab. If you still want merchandising, read Google's Promotions overview and FAQ dated pages.",
    ignoreIf: "You do not care about Gmail Promotions-tab UI chrome.",
    whatToDo: [
      "Treat annotations as optional UI, never as a spam-rate fix.",
      "Follow Google's current image and field requirements; invalid markup simply may not render.",
      "Do not claim classification benefits Google explicitly denies.",
    ],
    enforcement:
      "None. Failed or filtered annotations simply do not show. The email still sends under normal rules.",
    sources: [
      {
        name: "Google, Annotate emails in the Promotions tab",
        url: "https://developers.google.com/workspace/gmail/promotab/overview",
        published: "2026-04-20",
        actor: "mailbox-provider",
      },
      {
        name: "Google, Promotions tab FAQ",
        url: "https://developers.google.com/workspace/gmail/promotab/faq",
        published: "2026-04-20",
        actor: "mailbox-provider",
      },
    ],
    related: ["gmail-bulk-sender-requirements", "apple-intelligence-email-summaries"],
    added: "2026-08-02",
    updated: "2026-08-02",
    lastVerified: "2026-08-02",
    changelog: [{ date: "2026-08-02", note: "Added to kill placement folklore around annotations." }],
  },

  {
    slug: "california-gpc-stops-sale-and-sharing-not-email",
    title: "California GPC opts out of sale and sharing, not marketing email",
    question: "Does Global Privacy Control require me to stop emailing Californians?",
    status: "in_force",
    effectiveDate: "2023-01-01",
    jurisdictions: ["US-CA", "US"],
    topic: "consent-tracking",
    featured: true,
    answer:
      "Under California law, a valid opt-out preference signal such as Global Privacy Control (GPC) is a request to stop selling or sharing personal information, including sharing for cross-context behavioural advertising. It is not, by itself, a statutory command to suppress ordinary first-party marketing email. Businesses that sell or share must process the signal; businesses that do not may have less to do. Do not rebrand GPC as an email unsubscribe unless your own policy promises that.",
    appliesTo: "Businesses subject to CCPA/CPRA that sell or share personal information, and any team told \"GPC means stop email.\"",
    plain:
      "GPC is mostly about ad-tech sale and sharing, not a magic CAN-SPAM kill switch. If your privacy policy or CMP promises more, keep that promise—but do not invent an email ban the statute does not write.",
    ownership: "shared",
    handled: {
      already:
        "Consent platforms can detect GPC in the browser. Propagation into the ESP as \"do not email\" is not automatic and must be verified end to end.",
      stillYours:
        "Mapping what you actually sell/share, honouring the signal for those purposes, and not over-claiming email suppression.",
    },
    mondayMorning:
      "Ask privacy eng one question: when GPC fires, what fields change in the ESP within 24 hours? If the answer is \"nothing,\" you have a sale/share gap—or you never sold/shared.",
    ignoreIf: "You have no California consumers and no sale/share of personal information.",
    whatToDo: [
      "Honour GPC for sale and sharing as required; do not ignore the browser signal.",
      "Do not treat GPC as a substitute for List-Unsubscribe or CASL/CAN-SPAM opt-out.",
      "If you voluntarily map GPC to email suppression, document it as policy, not statute.",
      "Test the CMP → identity → ESP path; do not assume magic.",
    ],
    enforcement:
      "California AG and CPPA enforce sale/share opt-outs; public actions have targeted dark patterns and non-honoured opt-outs. Misdescribing GPC as mandatory email stop is a training error more than a statute.",
    sources: [
      {
        /* Fourth citation on the shelf that named "materials" and linked a
           front door. The regulations themselves are the thing this page turns
           on, so they are what it now cites. */
        name: "California Privacy Protection Agency, CCPA regulations",
        url: "https://cppa.ca.gov/regulations/consumer_privacy_act.html",
        actor: "regulator",
      },
      {
        name: "California Attorney General, CCPA",
        url: "https://oag.ca.gov/privacy/ccpa",
        actor: "regulator",
      },
    ],
    related: [
      "colorado-gpc-stops-sale-and-cross-site-targeting",
      "can-spam-penalty-per-email",
      "one-click-unsubscribe-rfc-8058",
    ],
    added: "2026-08-02",
    updated: "2026-08-04",
    lastVerified: "2026-08-04",
    changelog: [
      { date: "2026-08-04", note: "Correction: this page cited a publisher's front door rather than the document it relies on. Repointed to the primary source itself. Four pages on this shelf had the same fault; a test now rejects any citation that is a bare origin." },{ date: "2026-08-02", note: "Added to correct email-marketing overclaims about GPC." }],
  },

  {
    slug: "colorado-gpc-stops-sale-and-cross-site-targeting",
    title: "Colorado GPC stops sale and cross-site targeting, not ordinary email",
    question: "What must Colorado controllers do with Global Privacy Control?",
    status: "in_force",
    effectiveDate: "2024-07-01",
    jurisdictions: ["US-CO", "US"],
    topic: "consent-tracking",
    answer:
      "Colorado recognises GPC as a universal opt-out mechanism that covered controllers must honour for (1) sale of personal data and (2) processing for targeted advertising. Colorado rules state controllers are not obligated to honour the signal for other purposes. The signal applies to the browser or device, with authenticated expansion to the consumer when identity is known. It is not an ordinary first-party email marketing kill switch unless you choose to treat it as one.",
    appliesTo: "Controllers in scope of the Colorado Privacy Act that sell data or run targeted advertising.",
    plain:
      "In Colorado, GPC means stop sale and stop targeted ads—not \"delete them from Klaviyo\" unless you built that bridge on purpose.",
    ownership: "shared",
    handled: {
      already: "CMPs can detect the signal. ESP suppression is a custom integration, not a default.",
      stillYours: "Scope decisions, privacy notice text, and testing the full data path.",
    },
    mondayMorning:
      "Read your privacy notice's universal opt-out section. If it claims email stop on GPC, verify the ESP path today.",
    ignoreIf: "You are outside Colorado Privacy Act thresholds and do no sale or targeted advertising.",
    whatToDo: [
      "Honour GPC for sale and targeted advertising from 1 July 2024 onward.",
      "Do not invent duties for purposes Colorado says are out of scope.",
      "Document whether email is intentionally linked; default is that it is not required.",
    ],
    enforcement:
      "Colorado AG enforces the CPA. As with California, the live risk is non-honoured sale/targeting opt-outs, not a special email-only GPC fine.",
    sources: [
      {
        name: "Colorado Attorney General, Universal Opt-Out",
        url: "https://coag.gov/opt-out/",
        actor: "regulator",
      },
      {
        name: "Colorado Privacy Act overview",
        url: "https://coag.gov/resources/colorado-privacy-act/",
        actor: "regulator",
      },
    ],
    related: ["california-gpc-stops-sale-and-sharing-not-email"],
    added: "2026-08-02",
    updated: "2026-08-02",
    lastVerified: "2026-08-02",
    changelog: [{ date: "2026-08-02", note: "Added with US-CO jurisdiction." }],
  },

  {
    slug: "maryland-restricts-default-profiling-of-minors",
    title: "Maryland restricts default profiling of under-18 users",
    question: "Does Maryland's Kids Code change how I email minors?",
    status: "in_force",
    effectiveDate: "2024-10-01",
    jurisdictions: ["US-MD", "US"],
    topic: "consent-tracking",
    answer:
      "Maryland's age-appropriate design / kids privacy rules restrict default profiling and certain data practices for users the business knows or should know are under 18. For lifecycle email, the practical duties are: do not build minor profiles for advertising by default, know how age is collected, and do not assume ESP \"segments\" are outside scope. Exact application of every campaign type remains fact-specific; this is not a general ban on transactional email to households that include minors.",
    appliesTo: "Brands with Maryland users under 18, youth products, or age-gated experiences that feed email profiles.",
    plain:
      "If you know someone is under 18 in Maryland, default ad-style profiling is the problem. Clean age capture and suppress marketing abuse—not panic-delete every family account.",
    ownership: "yours",
    handled: {
      already: "ESPs store what you send them; they do not decide Maryland age duty of care.",
      stillYours: "Age signals, default profile configuration, and marketing suppression rules for minors.",
    },
    mondayMorning:
      "Find every field that could mark a profile under 18. Confirm marketing journeys cannot target that segment for behavioural advertising use cases.",
    ignoreIf: "You have no under-18 users and no reason to know of any.",
    whatToDo: [
      "Inventory age collection points (checkout, account, quizzes).",
      "Default minors out of advertising profiling and non-essential tracking.",
      "Keep essential service messages in a separate, justified path.",
      "Watch litigation updates; youth privacy statutes move.",
    ],
    enforcement:
      "State AG enforcement risk; details evolve with litigation. Do not invent per-email fine figures without a primary order.",
    sources: [
      {
        /* Was a link to the Attorney General's homepage, under a name that
           hand-waved at "materials as published". A citation has to land on the
           thing it cites. */
        name: "Maryland Age-Appropriate Design Code Act, Md. Code Com. Law § 14-4601 et seq.",
        url: "https://mgaleg.maryland.gov/mgawebsite/Laws/StatuteText?article=gcl&section=14-4601&enactments=True&archived=False",
        published: "2024-10-01",
        actor: "regulator",
      },
      {
        name: "Maryland General Assembly, HB 603 (2024), Chapter 461 as enacted",
        url: "https://mgaleg.maryland.gov/2024RS/Chapters_noln/CH_461_hb0603t.pdf",
        published: "2024-05-09",
        actor: "regulator",
      },
    ],
    related: ["california-gpc-stops-sale-and-sharing-not-email"],
    added: "2026-08-02",
    updated: "2026-08-04",
    lastVerified: "2026-08-04",
    changelog: [
      {
        date: "2026-08-04",
        note: "Correction: this page cited the Attorney General's homepage under a name that described \"materials as published\" rather than naming a document. Replaced with the statute itself, Md. Code Com. Law § 14-4601 et seq., and the enacted chapter text of HB 603, both dated. A citation has to land on the thing it cites.",
      },
      {
        date: "2026-08-02",
        note: "Added with narrow email interpretation; not a blanket household email ban.",
      },
    ],
  },

  // ─────────────────────────────────────────── international consent
  {
    slug: "canada-casl-commercial-email-needs-provable-consent",
    title: "In Canada, commercial email needs provable express or statutory implied consent",
    question: "Can I send marketing email to a Canadian without express opt-in under CASL?",
    status: "in_force",
    effectiveDate: "2014-07-01",
    jurisdictions: ["CA"],
    topic: "consent-tracking",
    featured: true,
    answer:
      "Canada's Anti-Spam Legislation forbids sending a commercial electronic message without consent and prescribed identification content. Consent may be express or implied, but implied only through routes Parliament listed—not a vague \"reasonable expectations\" test. The person asserting consent bears the burden of proof. Corporate administrative monetary penalties can reach CAD $10 million per violation; individual ceilings are CAD $1 million. These are maxima, not automatic tariffs.",
    appliesTo: "Anyone sending CEMs to recipients in Canada, including foreign senders and B2B.",
    plain:
      "CASL is not CAN-SPAM. You need consent you can prove, identification, and an unsubscribe. Implied consent is a short statutory list, not \"they bought something once in 2011 so forever.\"",
    ownership: "shared",
    handled: {
      already: "ESPs store timestamps and honour unsubscribes when configured for CASL fields.",
      stillYours: "Whether consent was valid, which statutory implied route applies, and proof artefacts.",
    },
    mondayMorning:
      "Export 20 Canadian profiles at random. For each, write consent type, source, and date. Any blank is a CASL hole.",
    ignoreIf: "You never send commercial email to Canada.",
    whatToDo: [
      "Prefer express consent with clear purpose language; avoid pre-ticked boxes.",
      "Map implied consent to the statutory relationship or publication routes only.",
      "Keep form copy, timestamp, source and withdrawal history.",
      "Treat CAD $10M as a ceiling in the statute, not a forecast of your fine.",
    ],
    enforcement:
      "CRTC has issued public CASL enforcement actions and AMPs. Recent actions should be read on the CRTC index; not every AMP is a routine marketing-email fact pattern.",
    sources: [
      {
        name: "CASL (S.C. 2010, c. 23) commercial electronic message and consent provisions",
        url: "https://laws-lois.justice.gc.ca/eng/acts/E-1.6/",
        published: "2014-07-01",
        actor: "regulator",
      },
      {
        name: "CRTC, CASL guidance and enforcement",
        url: "https://crtc.gc.ca/eng/com500/guide.htm",
        actor: "regulator",
      },
    ],
    related: [
      "canada-casl-implied-consent-expires-and-unsubscribe-takes-ten-business-days",
      "can-spam-penalty-per-email",
    ],
    added: "2026-08-02",
    updated: "2026-08-02",
    lastVerified: "2026-08-02",
    changelog: [
      { date: "2026-08-02", note: "Re-verified against primary sources (bulk/auth/consent core)." },{ date: "2026-08-02", note: "Added from statute and CRTC materials." }],
  },

  {
    slug: "canada-casl-implied-consent-expires-and-unsubscribe-takes-ten-business-days",
    title: "In Canada, relationship implied consent expires and unsubscribes take ten business days",
    question: "How long does CASL implied consent last, and how fast must I honour Canadian unsubscribes?",
    status: "in_force",
    effectiveDate: "2014-07-01",
    jurisdictions: ["CA"],
    topic: "consent-tracking",
    featured: true,
    answer:
      "Under CASL's existing-business-relationship route, qualifying purchases and similar events generally support implied consent for two years; qualifying inquiries generally support six months. Express consent does not expire merely because those clocks run out—it lasts until withdrawal unless limited. CEMs must identify the sender, keep contact and unsubscribe details valid for at least 60 days after the message, and complete unsubscribe requests without delay and no later than ten business days.",
    appliesTo: "Anyone relying on implied consent or mailing Canadians with standard ESP footers.",
    plain:
      "Implied consent after a purchase is roughly a two-year fuse, inquiries about six months. Express consent stays until they say stop. Unsubscribes: ten business days max, sooner if you can.",
    ownership: "shared",
    handled: {
      already: "ESPs can suppress quickly; configure CASL-aware footers and 10-business-day SLAs.",
      stillYours: "Dating the relationship event that started the clock, and not confusing routes.",
    },
    mondayMorning:
      "In your ESP, segment Canadians whose last qualifying purchase is older than two years and who lack express consent. That segment is the implied-consent time bomb.",
    ignoreIf: "You only mail Canadians with current express consent.",
    whatToDo: [
      "Store the event date that supports implied consent, not only \"signed up.\"",
      "Re-permission before clocks expire if the relationship still has value.",
      "Honour unsubscribes within ten business days; operationally aim for same day.",
      "Keep identification and unsubscribe working for 60 days after each send.",
    ],
    enforcement:
      "CRTC actions have included failures around consent proof and unsubscribe practices. Read current notices rather than recycling old blog summaries.",
    sources: [
      {
        name: "CASL sections on implied consent periods and unsubscribe (official consolidation)",
        url: "https://laws-lois.justice.gc.ca/eng/acts/E-1.6/",
        published: "2014-07-01",
        actor: "regulator",
      },
      {
        name: "CRTC CASL guidance",
        url: "https://crtc.gc.ca/eng/com500/guide.htm",
        actor: "regulator",
      },
    ],
    related: ["canada-casl-commercial-email-needs-provable-consent"],
    added: "2026-08-02",
    updated: "2026-08-02",
    lastVerified: "2026-08-02",
    changelog: [{ date: "2026-08-02", note: "Added clocks and unsubscribe SLA." }],
  },

  {
    slug: "uk-pecr-email-needs-consent-or-a-complete-soft-opt-in",
    title: "In the UK, marketing email to individuals needs consent or a complete soft opt-in",
    question: "When does PECR soft opt-in allow emailing UK consumers without prior consent?",
    status: "in_force",
    effectiveDate: "2003-12-11",
    jurisdictions: ["UK"],
    topic: "consent-tracking",
    featured: true,
    answer:
      "PECR regulation 22 requires prior consent for unsolicited direct-marketing email to individual subscribers unless every soft-opt-in condition holds: you obtained details during a sale or negotiations for a sale of your own products/services; you market your own similar products/services; and a simple free opt-out was offered at collection and in every message. Bought lists cannot inherit soft opt-in. From 5 February 2026 a separate charity soft-opt-in exists under DUAA amendments. Corporate subscribers are treated differently from individuals and sole traders.",
    appliesTo: "Anyone emailing UK individual subscribers (including many sole traders).",
    plain:
      "UK soft opt-in is a four-part lock, not a vibe. Sale or negotiation, your similar products, opt-out at capture and every mail. Bought lists fail on arrival. Charities got a narrow extra route in February 2026.",
    ownership: "shared",
    handled: {
      already: "ESP unsubscribe and preference centres cover the mechanical opt-out.",
      stillYours: "Whether soft-opt-in conditions were ever true, and charity-route eligibility.",
    },
    mondayMorning:
      "Pick your highest-volume UK welcome flow. Write which PECR route it uses (consent vs soft opt-in vs corporate). If you cannot, that is the gap.",
    ignoreIf: "You never email individual subscribers in the UK.",
    whatToDo: [
      "Do not buy UK consumer lists and call it soft opt-in.",
      "Keep collection-time opt-out evidence for soft opt-in.",
      "Treat sole traders carefully—they may be individual subscribers.",
      "If you are a charity, read the 5 February 2026 route before relying on it.",
    ],
    enforcement:
      "ICO has issued monetary penalties for PECR email failings (see public notices such as HelloFresh and others). Consent quality and suppression failures are the usual story.",
    sources: [
      {
        name: "Privacy and Electronic Communications Regulations 2003, regulation 22",
        url: "https://www.legislation.gov.uk/uksi/2003/2426/regulation/22",
        published: "2003-12-11",
        actor: "regulator",
      },
      {
        name: "ICO, Direct marketing guidance",
        url: "https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/electronic-and-telephone-marketing/",
        actor: "regulator",
      },
    ],
    related: [
      "eprivacy-email-consent-soft-optin",
      "germany-marketing-email-needs-express-consent-or-the-four-part-customer-exception",
    ],
    added: "2026-08-02",
    updated: "2026-08-02",
    lastVerified: "2026-08-02",
    changelog: [
      { date: "2026-08-02", note: "Added including charity soft opt-in commencing 5 Feb 2026." },
    ],
  },

  {
    slug: "germany-marketing-email-needs-express-consent-or-the-four-part-customer-exception",
    title: "In Germany, marketing email needs express consent or the four-part customer exception",
    question: "Do German B2B emails need opt-in, and is double opt-in legally required?",
    status: "in_force",
    effectiveDate: "2004-07-08",
    jurisdictions: ["DE", "EU"],
    topic: "consent-tracking",
    featured: true,
    answer:
      "UWG §7 treats advertising by electronic mail without prior express consent as an unreasonable nuisance, and the BGH has applied protection to business email accounts. The §7(3) existing-customer exception requires all four statutory conditions. Double opt-in is not written as a fifth statutory condition; it is an evidence practice the BGH has treated as potentially suitable to prove consent when challenged. Generic all-partner consent wording is vulnerable.",
    appliesTo: "Anyone advertising by email to recipients in Germany, consumer or B2B.",
    plain:
      "Germany is not \"B2B is fine.\" Default is express consent. The customer exception is four checkboxes, all required. Double opt-in is how you prove consent, not a magic statute line.",
    ownership: "yours",
    handled: {
      already: "ESPs can run DOI workflows and store confirmation events.",
      stillYours: "Consent scope language, DOI evidence packs, and B2B cold outreach risk.",
    },
    mondayMorning:
      "If you cold email German business addresses, stop and get counsel or switch to the four-part customer exception you can actually prove. Cold \"legit interest\" decks will not save UWG §7.",
    ignoreIf: "You never send advertising email to Germany.",
    whatToDo: [
      "Use prior express consent or satisfy every §7(3) condition.",
      "Keep DOI logs if you use double opt-in as proof.",
      "Do not claim DOI is literally required by the statute text when it is not.",
      "Expect injunction risk in civil practice; do not invent a verified public fine frequency.",
    ],
    enforcement:
      "Private injunction exposure is real in German practice (BGH authority). A complete official 2024–2026 fine series specifically for §7 email was not verified in research; do not publish \"rarely fined\" as a measured fact.",
    sources: [
      {
        name: "UWG §7 (official consolidation)",
        url: "https://www.gesetze-im-internet.de/uwg_2004/__7.html",
        actor: "regulator",
      },
      {
        /* Was "a line of cases" pointed at the court's homepage, which is not a
           citation of anything. This is the leading decision itself: the BGH
           holding that double opt-in is an adequate method and that the
           advertiser carries the burden of proving consent for each address. */
        name: "BGH, Urteil vom 10.02.2011 — I ZR 164/09 (Double-opt-in-Verfahren)",
        url: "https://juris.bundesgerichtshof.de/cgi-bin/rechtsprechung/document.py?Gericht=bgh&Art=en&nr=57082&pos=0&anz=1",
        published: "2011-02-10",
        actor: "court",
      },
    ],
    related: [
      "eu-b2b-email-has-no-blanket-legitimate-interest-permission",
      "eprivacy-email-consent-soft-optin",
      "uk-pecr-email-needs-consent-or-a-complete-soft-opt-in",
    ],
    added: "2026-08-02",
    updated: "2026-08-04",
    lastVerified: "2026-08-04",
    changelog: [
      { date: "2026-08-04", note: "Correction: this page cited a publisher's front door rather than the document it relies on. Repointed to the primary source itself. Four pages on this shelf had the same fault; a test now rejects any citation that is a bare origin." },{ date: "2026-08-02", note: "Added with honest DOI vs statute distinction." }],
  },

  {
    slug: "australia-commercial-email-needs-consent-identity-and-a-working-unsubscribe",
    title: "In Australia, commercial email needs consent, identity and a working unsubscribe",
    question: "What does Australia's Spam Act require in every marketing email?",
    status: "in_force",
    effectiveDate: "2004-04-10",
    jurisdictions: ["AU"],
    topic: "consent-tracking",
    featured: true,
    answer:
      "Australia's Spam Act requires consent (express or reasonably inferred) for commercial electronic messages with an Australian link, accurate sender identification with contact details valid at least 30 days, and a functional unsubscribe valid at least 30 days that takes effect within five business days. The sender bears the evidential burden. ACMA has repeatedly enforced against brands that mislabelled promo as transactional or ignored opt-outs.",
    appliesTo: "Senders of commercial electronic messages with an Australian link.",
    plain:
      "Consent, say who you are, working unsubscribe in five business days. Calling a promo \"transactional\" to skip the footer is how ACMA writes press releases.",
    ownership: "shared",
    handled: {
      already: "ESP footers and suppression queues handle mechanics when configured.",
      stillYours: "Consent proof, Australian-link analysis, and honest transactional vs commercial labelling.",
    },
    mondayMorning:
      "Sample ten \"transactional\" templates. If any is primarily promotional, fix the template class before ACMA does.",
    ignoreIf: "You have no Australian-link commercial messages.",
    whatToDo: [
      "Prove consent; bought lists do not transfer the burden.",
      "Keep identity and unsubscribe valid ≥30 days.",
      "Honour withdrawals within five business days without login walls or fees.",
      "Do not reclassify promo as service mail to dodge unsubscribe.",
    ],
    enforcement:
      "ACMA publishes repeated enforcement actions and penalties through 2026. Combined spam-and-telemarketing figures in some releases cannot always be split into spam-only amounts.",
    sources: [
      {
        name: "Spam Act 2003 (Cth)",
        url: "https://www.legislation.gov.au/Details/C2021C00414",
        published: "2004-04-10",
        actor: "regulator",
      },
      {
        name: "ACMA, spam compliance guidance and enforcement releases",
        url: "https://www.acma.gov.au/spam-and-telemarketing",
        actor: "regulator",
      },
    ],
    related: [
      "canada-casl-commercial-email-needs-provable-consent",
      "can-spam-penalty-per-email",
    ],
    added: "2026-08-02",
    updated: "2026-08-02",
    lastVerified: "2026-08-02",
    changelog: [{ date: "2026-08-02", note: "Added Australia Spam Act baseline." }],
  },

  {
    slug: "eu-b2b-email-has-no-blanket-legitimate-interest-permission",
    title: "EU B2B email has no blanket legitimate-interest permission",
    question: "Can legitimate interest justify cold B2B marketing email across the EU?",
    status: "in_force",
    effectiveDate: "2003-10-31",
    jurisdictions: ["EU", "FR", "DE"],
    topic: "consent-tracking",
    featured: true,
    answer:
      "ePrivacy Article 13 sets consent rules for natural persons and leaves non-natural-person protection to Member States. That is not one EU-wide B2B cold-email licence. France's CNIL allows professional-relevance prospecting without systematic prior consent if information and opt-out duties are met. Germany's UWG requires prior express consent for advertising email, including to business mailboxes, subject only to the four-part customer exception. GDPR legitimate interests do not override national channel rules.",
    appliesTo: "B2B marketers sending cold or semi-cold email into the EU, especially France and Germany.",
    plain:
      "\"B2B legit interest\" is not a continent-wide free pass. France can be workable for role-relevant professional mail with opt-out. Germany still wants express consent or the customer exception. Check the Member State.",
    ownership: "yours",
    handled: {
      already: "Nothing automatic. ESPs will send whatever you load.",
      stillYours: "National channel law, role-relevance analysis, and suppression of objectors.",
    },
    mondayMorning:
      "Split your EU B2B cold list by country. Apply French professional-relevance rules and German consent rules separately. Delete the single \"EU B2B\" playbook.",
    ignoreIf: "You only email consumers under clear consent, or never email the EU.",
    whatToDo: [
      "Never treat GDPR Article 6(1)(f) alone as email permission.",
      "For France, keep professional relevance and per-message objection.",
      "For Germany, use express consent or full §7(3) exception.",
      "Do not generalise France/Germany conclusions to unresearched Member States.",
    ],
    enforcement:
      "National rules and private claims (especially Germany) matter more than a single EU fine headline. No matched recent CNIL B2B monetary case was verified solely on professional-relevance email in the research pass.",
    sources: [
      {
        name: "ePrivacy Directive 2002/58/EC Article 13",
        url: "https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:02002L0058-20091219",
        published: "2009-12-19",
        actor: "regulator",
      },
      {
        name: "CNIL, prospection commerciale par courrier électronique",
        url: "https://www.cnil.fr/fr/la-prospection-commerciale-par-courrier-electronique",
        published: "2026-06-10",
        actor: "regulator",
      },
      {
        name: "Gesetz gegen den unlauteren Wettbewerb (UWG) § 7, Unzumutbare Belästigungen",
        url: "https://www.gesetze-im-internet.de/uwg_2004/__7.html",
        actor: "regulator",
      },
    ],
    related: [
      "germany-marketing-email-needs-express-consent-or-the-four-part-customer-exception",
      "eprivacy-email-consent-soft-optin",
    ],
    added: "2026-08-02",
    updated: "2026-08-04",
    lastVerified: "2026-08-04",
    changelog: [
      { date: "2026-08-04", note: "Correction: this page cited a publisher's front door rather than the document it relies on. Repointed to the primary source itself. Four pages on this shelf had the same fault; a test now rejects any citation that is a bare origin." },{ date: "2026-08-02", note: "Added France/Germany B2B contrast." }],
  },

  // ─────────────────────────────────────────── P0 technical (WttW / senior deliv gaps)
  {
    slug: "bimi-is-optional-brand-display-not-a-bulk-mandate",
    title: "BIMI shows a logo after DMARC — it is not a bulk-sender mandate",
    question: "Do I need BIMI to reach the inbox at Gmail or Yahoo?",
    status: "in_force",
    effectiveDate: "2020-01-01",
    jurisdictions: ["Global"],
    topic: "authentication",
    featured: true,
    answer:
      "Brand Indicators for Message Identification (BIMI) is a specification that lets supporting clients show a brand-controlled logo next to authenticated mail. BIMI does not replace SPF, DKIM, or DMARC, and it is not listed as a requirement in Gmail or Yahoo bulk-sender mandates. Practical display usually needs a DMARC policy of quarantine or reject (not p=none), a BIMI DNS TXT record pointing at an SVG logo over HTTPS, and — for Gmail and other picky clients — a Verified Mark Certificate (VMC) or Common Mark Certificate (CMC) as evidence. Microsoft Outlook/Exchange Online support for BIMI remains limited or absent depending on product surface; treat logo display as brand UX, not deliverability law.",
    appliesTo:
      "Brands that want a verified logo in supporting inboxes and already authenticate mail. Anyone who was told BIMI is required to pass Gmail bulk checks.",
    plain:
      "BIMI can put your logo next to the message in some inboxes after DMARC is strong. It is not on the Gmail/Yahoo “bulk sender must” list. No BIMI does not mean automatic spam.",
    ownership: "shared",
    handled: {
      already:
        "Nothing required. ESPs may host SVG or help with DNS templates; they cannot buy your trademark certificate for you.",
      stillYours:
        "DMARC enforcement policy, logo/SVG correctness, certificate purchase if you want Gmail-class display, and the BIMI DNS record.",
    },
    mondayMorning:
      "If someone sold you “BIMI or no inbox,” open Gmail’s bulk sender requirements and BIMI Group docs side by side. Fix DMARC alignment and complaint rate first; treat BIMI as optional brand polish after p=quarantine or reject is honest.",
    ignoreIf: "You do not care about logos in the inbox chrome and your auth/complaints are already clean.",
    whatToDo: [
      "Do not prioritise BIMI over SPF/DKIM alignment, DMARC, or spam-complaint rate.",
      "If you want BIMI display: move DMARC toward quarantine/reject only when you can pass aligned auth at volume.",
      "Publish a BIMI TXT record with an HTTPS SVG; add a VMC/CMC when the clients you care about require evidence documents.",
      "Expect uneven client support — including weak or no Microsoft support depending on product.",
    ],
    enforcement:
      "No mailbox provider fines you for lacking BIMI. Without it, mail can still pass bulk requirements. With broken auth, BIMI will not save you.",
    sources: [
      {
        name: "BIMI Group, BIMI implementation guide",
        url: "https://bimigroup.org/implementation-guide/",
        actor: "standards-body",
      },
      {
        name: "Google Workspace Admin Help, Set up BIMI",
        url: "https://knowledge.workspace.google.com/admin/security/set-up-bimi",
        actor: "mailbox-provider",
      },
      {
        name: "Google, Email sender guidelines (bulk sender requirements)",
        url: "https://support.google.com/a/answer/81126",
        actor: "mailbox-provider",
      },
    ],
    related: [
      "gmail-bulk-sender-requirements",
      "dkim-alignment-vs-dkim-passing",
      "dmarc-policy-none-is-not-enforcement",
    ],
    added: "2026-08-02",
    updated: "2026-08-04",
    lastVerified: "2026-08-04",
    changelog: [
      { date: "2026-08-04", note: "Correction: this page cited a publisher's front door rather than the document it relies on. Repointed to the primary source itself. Four pages on this shelf had the same fault; a test now rejects any citation that is a bare origin." },
      {
        date: "2026-08-02",
        note: "Added BIMI as optional brand display after primary BIMI Group and Google docs; not a bulk mandate.",
      },
    ],
  },

  {
    slug: "dmarc-policy-none-is-not-enforcement",
    title: "DMARC p=none is monitoring, not enforcement",
    question: "Is publishing DMARC at p=none enough to be done with DMARC?",
    status: "in_force",
    effectiveDate: "2015-03-01",
    jurisdictions: ["Global"],
    topic: "authentication",
    featured: true,
    answer:
      "A DMARC record with p=none asks receivers to send aggregate reports without instructing them to quarantine or reject failing mail. That satisfies many bulk-sender “publish a DMARC record” checkboxes (including Microsoft’s high-volume requirement at minimum p=none) and is a correct first step. It is not domain enforcement. Moving to p=quarantine or p=reject is how you instruct receivers to treat unauthenticated use of your From domain — and it is a prerequisite for practical BIMI display in major clients. In May 2026 the IETF published RFC 9989 (core DMARC), RFC 9990 (aggregate reporting), and RFC 9991 (failure reporting), obsoleting RFC 7489 as the primary specification reference while remaining compatible with existing v=DMARC1 records.",
    appliesTo:
      "Every brand that publishes DMARC for bulk compliance, board security, or brand protection — especially teams that stopped at p=none years ago.",
    plain:
      "p=none means “watch and report,” not “block impostors.” Bulk rules often only demand that the record exists. Real protection — and BIMI — needs quarantine or reject when your aligned traffic is clean enough.",
    ownership: "yours",
    handled: {
      already:
        "ESPs can sign DKIM and help you collect reports. They cannot choose your p= policy without you.",
      stillYours:
        "Reading aggregate reports (rua), fixing unaligned senders, and deciding when to tighten policy.",
    },
    mondayMorning:
      "Open your DMARC record and your last aggregate report. List every source that fails alignment. Do not jump to p=reject until that list is empty or accepted.",
    ignoreIf: "You already run p=quarantine or p=reject with clean reports and no unknown senders.",
    whatToDo: [
      "Keep p=none only as a deliberate monitoring phase with rua reporting enabled.",
      "Inventory every system that sends as your From domain; fix alignment before tightening p=.",
      "Plan a move to quarantine then reject; treat p=none as unfinished brand protection.",
      "When citing the protocol, prefer RFC 9989/9990/9991 (May 2026) over RFC 7489 alone.",
    ],
    enforcement:
      "Mailbox bulk rules may accept p=none. Brand spoofing continues under p=none. BIMI logo display generally will not. No universal fine for staying at p=none.",
    sources: [
      {
        name: "RFC 9989, Domain-based Message Authentication, Reporting, and Conformance (DMARC)",
        url: "https://www.rfc-editor.org/rfc/rfc9989",
        published: "2026-05-01",
        actor: "standards-body",
      },
      {
        name: "RFC 9990, DMARC Aggregate Reporting",
        url: "https://www.rfc-editor.org/rfc/rfc9990",
        published: "2026-05-01",
        actor: "standards-body",
      },
      {
        name: "Microsoft, High-volume sender requirements for Outlook.com",
        url: "https://techcommunity.microsoft.com/blog/microsoftdefenderforoffice365blog/strengthening-email-ecosystem-outlook%E2%80%99s-new-requirements-for-high%E2%80%90volume-senders/4399730",
        published: "2025-04-01",
        actor: "mailbox-provider",
      },
    ],
    related: [
      "dkim-alignment-vs-dkim-passing",
      "outlook-high-volume-sender-authentication",
      "bimi-is-optional-brand-display-not-a-bulk-mandate",
    ],
    added: "2026-08-02",
    updated: "2026-08-02",
    lastVerified: "2026-08-02",
    changelog: [
      {
        date: "2026-08-02",
        note: "Added DMARC policy ladder and RFC 9989/9990/9991 publication note.",
      },
    ],
  },

  {
    slug: "complaint-feedback-loops-are-provider-specific",
    title: "Complaint feedback loops are provider-specific — Gmail is not Yahoo CFL",
    question: "How do I see spam complaints from Gmail, Yahoo, and Microsoft?",
    status: "in_force",
    effectiveDate: "2010-01-01",
    jurisdictions: ["Global"],
    topic: "provider-rules",
    featured: true,
    answer:
      "Mailbox providers expose user spam complaints differently. Yahoo (and related brands on its stack) operates a Complaint Feedback Loop (CFL) that participating senders can use for complaint telemetry. Microsoft offers Junk Mail Reporting Program (JMRP) data alongside Smart Network Data Services (SNDS) for IP-oriented views of Outlook.com-class traffic. Google does not give bulk senders a classic ARF-style FBL for consumer Gmail comparable to Yahoo’s CFL; operators instead rely on Google Postmaster Tools spam-rate and related signals, plus their ESP’s complaint events when available. Copying “we joined the FBL” from a 2015 checklist without naming the provider is how teams invent coverage they do not have.",
    appliesTo:
      "Anyone measuring complaints, building suppression, or debugging reputation across Gmail, Yahoo/AOL, and Microsoft consumer mail.",
    plain:
      "There is no single “the FBL.” Yahoo has a complaint feedback loop. Microsoft has JMRP/SNDS. Gmail mostly wants you in Postmaster Tools — not a classic FBL for every sender. Ask your ESP what they actually ingest.",
    ownership: "shared",
    handled: {
      already:
        "ESPs often enrol shared IPs and normalise complaint events into suppressions. Dedicated-IP senders may need to enrol SNDS/JMRP or Yahoo CFL themselves.",
      stillYours:
        "Knowing which providers you actually monitor, and not assuming Gmail complaints arrive the same way Yahoo’s do.",
    },
    mondayMorning:
      "Write a three-row table: Gmail | Yahoo | Microsoft — for each, name the tool (Postmaster, CFL, JMRP/SNDS, ESP dashboard) and who owns enrolment. Fix empty cells before the next reputation scare.",
    ignoreIf: "You send negligible volume to consumer webmail and never look at complaint metrics.",
    whatToDo: [
      "Stop saying “FBL” without naming the provider.",
      "For Microsoft dedicated IPs: enrol SNDS and JMRP; for shared IPs, confirm the ESP’s coverage.",
      "For Yahoo: confirm CFL participation path via ESP or Yahoo’s sender programmes.",
      "For Gmail: use Postmaster Tools spam rate and ESP complaint webhooks — do not invent a missing classic FBL.",
    ],
    enforcement:
      "No fine for missing a loop. Blindness shows up as rising spam rates, blocks, and delayed diagnosis when users hit “spam.”",
    sources: [
      {
        name: "Microsoft, Smart Network Data Services (SNDS)",
        url: "https://sendersupport.olc.protection.outlook.com/snds/",
        actor: "mailbox-provider",
      },
      {
        name: "Yahoo Sender Hub / sender best practices (complaint and authentication guidance)",
        url: "https://senders.yahooinc.com/best-practices/",
        actor: "mailbox-provider",
      },
      {
        /* Pointed at the Postmaster Tools sign-in. The thing this page is
           about — the Feedback-ID header and who is eligible for FBL data —
           is documented, so it is what gets cited. */
        name: "Gmail Help, Feedback Loop",
        url: "https://support.google.com/mail/answer/6254652",
        actor: "mailbox-provider",
      },
    ],
    related: [
      "microsoft-snds-and-jmrp-expose-ip-and-junk-data",
      "gmail-bulk-sender-requirements",
      "yahoo-requires-authentication-and-low-complaints",
    ],
    added: "2026-08-02",
    updated: "2026-08-04",
    lastVerified: "2026-08-04",
    changelog: [
      { date: "2026-08-04", note: "Correction: this page cited a publisher's front door rather than the document it relies on. Repointed to the primary source itself. Four pages on this shelf had the same fault; a test now rejects any citation that is a bare origin." },
      {
        date: "2026-08-02",
        note: "Added provider-specific complaint telemetry map; Gmail is not treated as a classic FBL.",
      },
    ],
  },

  {
    slug: "transactional-vs-commercial-email-is-not-a-subject-line-trick",
    title: "Transactional vs commercial email is classification, not a subject-line trick",
    question: "Can I avoid unsubscribe and consent rules by calling a promo “transactional”?",
    status: "in_force",
    effectiveDate: "2004-01-01",
    jurisdictions: ["Global", "US", "EU", "CA", "UK", "AU"],
    topic: "consent-tracking",
    featured: true,
    answer:
      "Laws and mailbox providers treat “transactional” or “relationship” messages differently from commercial marketing, but the label in your ESP is not the legal test. US CAN-SPAM carves out transactional or relationship messages that facilitate an agreed-upon transaction or update an existing relationship; primary-purpose analysis still matters when marketing content dominates. Gmail and Yahoo bulk-sender one-click unsubscribe requirements target marketing/bulk commercial mail, not every password reset. Canada’s CASL, UK PECR, EU ePrivacy implementations, and Australia’s Spam Act each define commercial electronic messages with their own consent and identification rules — rebadging a sale as “account update” is a common enforcement and complaint pattern. Misclassification creates both legal risk and spam-button risk.",
    appliesTo:
      "Anyone mixing receipts, shipping, account notices, and promotions in the same templates or streams — especially multi-country brands.",
    plain:
      "Calling a sale “transactional” in Klaviyo does not make it transactional under the law. If the main point is marketing, treat it as marketing: consent, identity, unsubscribe. Receipts and password resets are different.",
    ownership: "yours",
    handled: {
      already:
        "ESPs let you mark message types and often attach one-click headers to campaigns by default. They do not adjudicate your legal primary purpose.",
      stillYours:
        "Template classification, consent basis per geo, and not stuffing promos into “order update” shells.",
    },
    mondayMorning:
      "Pull ten recent “transactional” templates. If any is mostly offer, discount, or win-back, reclassify them as commercial and check consent + unsubscribe before the next send.",
    ignoreIf: "You only send pure service messages with no promotional content, under clear account relationships.",
    whatToDo: [
      "Define transactional vs commercial in writing for your programme — not only ESP folder names.",
      "Apply geo rules (CASL, PECR, ePrivacy, Spam Act, CAN-SPAM primary purpose) before the ESP toggle.",
      "Keep marketing out of password-reset and shipping templates.",
      "Expect bulk-sender one-click duties on commercial bulk, not on pure transactional streams.",
    ],
    enforcement:
      "Regulators and private plaintiffs care about content and purpose, not your internal label. Mailbox users hit spam when unexpected promo arrives as “account mail.” ACMA and similar agencies have public cases against misleading commercial classification.",
    sources: [
      {
        name: "FTC, CAN-SPAM Act: A Compliance Guide for Business",
        url: "https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business",
        actor: "regulator",
      },
      {
        name: "Google, Email sender guidelines",
        url: "https://support.google.com/a/answer/81126",
        actor: "mailbox-provider",
      },
      {
        name: "ACMA, spam and telemarketing compliance",
        url: "https://www.acma.gov.au/spam-and-telemarketing",
        actor: "regulator",
      },
    ],
    related: [
      "can-spam-penalty-per-email",
      "one-click-unsubscribe-rfc-8058",
      "australia-commercial-email-needs-consent-identity-and-a-working-unsubscribe",
      "canada-casl-commercial-email-needs-provable-consent",
    ],
    added: "2026-08-02",
    updated: "2026-08-02",
    lastVerified: "2026-08-02",
    changelog: [
      {
        date: "2026-08-02",
        note: "Added transactional vs commercial classification rule from primary regulator and bulk-sender docs.",
      },
    ],
  },

  // ─────────────────────────────────────────── authentication, in depth
  /* The shelf was thirteen pages of consent law against four of
     authentication, which is the wrong shape for the people who open a
     deliverability reference. These two exist because the domain check already
     detects both faults and had no page to send anyone to. */
  {
    slug: "spf-ten-lookup-limit-returns-permerror",
    title: "SPF stops evaluating after ten DNS lookups and returns permerror",
    question: "What happens when an SPF record goes over the 10 lookup limit?",
    status: "in_force",
    effectiveDate: "2014-04-01",
    jurisdictions: ["Global"],
    topic: "authentication",
    answer:
      "RFC 7208 requires an evaluator to stop after ten DNS-querying terms and return permerror. The terms that count are include, a, mx, ptr, exists and the redirect modifier; all, ip4, ip6 and exp do not count. A permerror is not a soft failure a receiver forgives: your record has failed to evaluate, so nothing in it authorises anything, and a domain at p=quarantine or p=reject that relied on SPF alignment loses it. Two separate limits sit alongside it: the mx mechanism may not query more than ten address records, and evaluators should cap void lookups at two.",
    appliesTo:
      "Any domain whose SPF record contains more than ten of the counting mechanisms — which in practice means anyone who has added a new tool without removing an old one.",
    plain:
      "Every include: is a DNS lookup, and you get ten. Past that your SPF does not fail politely, it fails to run at all, and everything it would have authorised is now unauthorised. It breaks the day somebody adds the eleventh tool, and nothing announces it.",
    ownership: "shared",
    handled: {
      already:
        "Your platform publishes its own include and keeps it working. Several vendors also publish a flattened or macro-based include that resolves in fewer lookups, and some SPF-hosting services exist precisely to keep you under the ceiling.",
      stillYours:
        "Counting your own record, and deciding which tools come out. Nobody else knows which of the includes on your domain belong to a platform you stopped paying for.",
    },
    mondayMorning:
      "Count the counting terms in your own SPF record — include, a, mx, ptr, exists, redirect — and remember that each include drags in whatever that vendor nested inside it, so ten written terms can be fifteen real lookups. Anything you no longer send from comes out today. If you are still over after that, ask each remaining vendor whether it publishes a flattened include; several do and none volunteer it.",
    ignoreIf:
      "Your SPF record contains three or four includes and has not changed in a year.",
    whatToDo: [
      "Count include, a, mx, ptr, exists and redirect. Do not count all, ip4, ip6 or exp.",
      "Remove includes for platforms you no longer send from, which is almost always the cheapest fix.",
      "Do not flatten a vendor's include into raw ip4 addresses unless you own a process to re-flatten it — their addresses change and yours will silently go stale.",
      "Read your DMARC aggregate reports for spf permerror before assuming the record is fine.",
    ],
    enforcement:
      "No regulator is involved. The consequence is mechanical and immediate: receivers treat permerror as a failed evaluation, so SPF-based DMARC alignment stops working. Mail that also aligns on DKIM survives; mail that relied on SPF alone does not.",
    sources: [
      {
        name: "RFC 7208 § 4.6.4, Processing Limits",
        url: "https://www.rfc-editor.org/rfc/rfc7208#section-4.6.4",
        published: "2014-04-01",
        actor: "standards-body",
      },
      {
        name: "Google Workspace Admin Help, Email sender guidelines",
        url: "https://support.google.com/a/answer/81126",
        actor: "mailbox-provider",
      },
    ],
    related: [
      "gmail-bulk-sender-requirements",
      "dmarc-policy-none-is-not-enforcement",
      "dkim-alignment-vs-dkim-passing",
    ],
    added: "2026-08-04",
    updated: "2026-08-04",
    lastVerified: "2026-08-04",
    changelog: [
      {
        date: "2026-08-04",
        note: "Added. The domain check has flagged records over the limit since it shipped and had no page to link to.",
      },
    ],
  },

  {
    slug: "empty-dkim-p-value-is-a-revoked-key",
    title: "An empty p= in a DKIM record is a revoked key, not a published one",
    question: "What does an empty p= value mean in a DKIM DNS record?",
    status: "in_force",
    effectiveDate: "2011-09-01",
    jurisdictions: ["Global"],
    topic: "authentication",
    answer:
      "RFC 6376 is explicit: an empty value in the p= tag means the public key has been revoked, and verifiers should return an error for any signature referencing it. The record still resolves, so a checker that only asks whether a selector exists reports DKIM as present. It is not present. Anything signed with that selector fails, and a domain relying on DKIM alignment for DMARC loses it silently, because the DNS answer looks healthy from the outside.",
    appliesTo:
      "Any domain where a selector was rotated, retired or revoked and the empty record was left behind — including the wildcard case, where a record under _domainkey answers every selector name and makes probing meaningless.",
    plain:
      "p= with nothing after it does not mean the key is missing. It means somebody revoked it and said so in public. The record answers, so most tools tick the box, and the mail still fails.",
    ownership: "shared",
    handled: {
      already:
        "Your platform generates and publishes the key material and will rotate it. It cannot see what else is sitting under _domainkey on your domain.",
      stillYours:
        "Removing revoked and wildcard records from your own DNS. A leftover empty key is yours, and so is the decision to delete rather than keep it for tidiness.",
    },
    mondayMorning:
      "Run dig TXT <selector>._domainkey.yourdomain.com for every selector you know about, and read what comes back rather than whether something came back. Any record whose p= is empty is a revoked key that should be deleted. Then probe a selector you invented — if that answers too, you have a wildcard under _domainkey and no selector check on this domain means anything until it is gone.",
    ignoreIf:
      "You have never rotated a DKIM key and publish exactly the selectors your platform gave you.",
    whatToDo: [
      "Treat an answering selector as inconclusive until you have read the p= value.",
      "Delete revoked records rather than leaving them; they are indistinguishable from a working key to most tooling.",
      "Probe an impossible selector to rule out a wildcard before trusting any selector result.",
      "Confirm on a real message: dkim=pass with header.d matching your From domain is the only proof that survives.",
    ],
    enforcement:
      "None, in the regulatory sense. The failure is mechanical: verifiers error on the signature, DKIM alignment is lost, and a domain at p=reject that has no aligned SPF path has its own mail rejected.",
    sources: [
      {
        name: "RFC 6376 § 3.6.1, Textual Representation of DKIM Key Records",
        url: "https://www.rfc-editor.org/rfc/rfc6376#section-3.6.1",
        published: "2011-09-01",
        actor: "standards-body",
      },
    ],
    related: ["dkim-alignment-vs-dkim-passing", "dmarc-policy-none-is-not-enforcement"],
    added: "2026-08-04",
    updated: "2026-08-04",
    lastVerified: "2026-08-04",
    changelog: [
      {
        date: "2026-08-04",
        note: "Added. The domain check has probed an impossible selector and required real base64 after p= since it shipped; neither behaviour had a page explaining why.",
      },
    ],
  },
];

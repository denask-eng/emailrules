import type { Rule } from "@/lib/types";

/**
 * The seed corpus. Every entry traces to a primary source that was read, not
 * summarised from memory. Where enforcement is untested, the rule says so.
 *
 * House rule for this file: if you cannot cite it with a date, it does not go in.
 */
export const RULES: Rule[] = [
  // ─────────────────────────────────────────── consent and tracking
  {
    slug: "france-email-open-tracking-consent",
    title: "In France, tracking email opens needs its own consent",
    question: "Do I need consent to use tracking pixels in emails in France?",
    status: "in_force",
    effectiveDate: "2026-07-14",
    jurisdictions: ["FR", "EU"],
    topic: "consent-tracking",
    featured: true,
    answer:
      "Consent to receive your email is not consent to be measured. If you drop an open-tracking pixel for a French recipient in order to optimise campaigns, you need separate, specific permission for that. If they never gave it, you are expected to send the same email without the pixel.",
    appliesTo:
      "Anyone emailing recipients in France, wherever the company sits. The obligation attaches to the recipient's terminal equipment, not to your registered office, so using an American ESP changes nothing.",
    whatToDo: [
      "Ask for tracking consent separately from email consent, ideally in the signup form at the moment you capture the address.",
      "Make refusal one click, and honour it by sending the same email with no pixel, not by unsubscribing them.",
      "Treat silence as refusal. A recipient who never answered has not consented.",
      "Never put a consent-requiring pixel in the email that asks for consent. Mail clients pre-fetch images and will answer on the recipient's behalf.",
    ],
    exempt:
      "One narrow carve-out for list hygiene: you may measure opens strictly to stop emailing inactive recipients. If you rely on it you may store only the date, day with no time, of the last known open, overwritten each time. Security and authentication flows are also exempt. Everything else, including optimising send frequency, needs consent.",
    enforcement:
      "No regulator has yet fined anyone specifically for an email tracking pixel. The obligation is real and the deadline has passed, and CNIL announced audits, but the enforcement record is currently empty. Treat this as a gap to close and evidence, not as an imminent fine. Note separately that the same discipline tracks with deliverability: Validity's 2025 benchmark found markets requiring double opt-in show inbox placement about six percentage points higher than the US.",
    sources: [
      {
        name: "CNIL, délibération n° 2026-042, Recommandation relative aux pixels de suivi dans les courriers électroniques",
        url: "https://www.cnil.fr/fr/recommandation-pixel-suivi-courriels",
        published: "2026-04-14",
        actor: "regulator",
      },
      {
        name: "EDPB Guidelines 2/2023 on the technical scope of Art. 5(3) ePrivacy Directive, v2.0",
        url: "https://www.edpb.europa.eu/our-work-tools/documents/public-consultations/2023/guidelines-22023-technical-scope-art-53-eprivacy_en",
        published: "2024-10-07",
        actor: "regulator",
      },
    ],
    related: ["italy-email-tracking-pixel-consent", "eprivacy-email-consent-soft-optin"],
    added: "2026-04-16",
    updated: "2026-07-15",
    lastVerified: "2026-08-01",
    changelog: [
      { date: "2026-07-15", note: "Transition period ended. Status moved from Upcoming to In force." },
      { date: "2026-04-16", note: "Added after CNIL published the recommendation." },
    ],
  },

  {
    slug: "italy-email-tracking-pixel-consent",
    title: "Italy requires consent for individual open tracking from 29 October 2026",
    question: "Does Italy require consent for email tracking pixels?",
    status: "upcoming",
    effectiveDate: "2026-10-29",
    jurisdictions: ["IT", "EU"],
    topic: "consent-tracking",
    featured: true,
    answer:
      "The Garante published binding guidelines treating tracking pixels under Art. 122 of the Codice Privacy. Measuring opens per recipient requires prior, free, specific and informed consent. Only aggregate statistical counting escapes it, and a recipient who withdraws tracking consent must keep receiving your email without the pixel.",
    appliesTo:
      "Anyone emailing recipients in Italy. Compliance is due six months after publication in the Gazzetta Ufficiale, which lands on 29 October 2026.",
    whatToDo: [
      "Separate the tracking choice from the subscription choice, and let people revoke tracking alone.",
      "Build a pixel-free send path now. This is the part most ESP setups cannot do today.",
      "If you rely on the aggregate exemption, use one undifferentiated pixel across all recipients and do not tie opens back to individuals.",
      "Generate any tracking identifier as unintelligible and non-sequential.",
    ],
    exempt:
      "Purely statistical aggregate counting that measures the global percentage of opens, plus security and authentication flows, and mandatory institutional communications such as fraud notices, contract changes and breach notifications.",
    enforcement:
      "Not yet enforced, because the deadline has not arrived. Worth noting that the Garante fined Poste Italiane and PostePay a combined 12,501,000 euros in April 2026 for unlawful device tracking under the same Art. 122 hook, so the provision is one the authority actively uses.",
    sources: [
      {
        name: "Garante per la protezione dei dati personali, provvedimento n. 284 del 17 aprile 2026, Linee guida in materia di utilizzo di tracking pixel",
        url: "https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/10241943",
        published: "2026-04-29",
        actor: "regulator",
      },
    ],
    related: ["france-email-open-tracking-consent"],
    added: "2026-04-30",
    updated: "2026-04-30",
    lastVerified: "2026-08-01",
    changelog: [{ date: "2026-04-30", note: "Added after publication in the Gazzetta Ufficiale." }],
  },

  {
    slug: "eprivacy-email-consent-soft-optin",
    title: "EU marketing email needs prior consent, with one narrow customer exception",
    question: "Do I need opt-in consent to send marketing emails in the EU?",
    status: "in_force",
    effectiveDate: "2003-10-31",
    jurisdictions: ["EU"],
    topic: "consent-tracking",
    answer:
      "Article 13 of the ePrivacy Directive requires prior consent for marketing email. The one exception, usually called soft opt-in, lets you email existing customers about your own similar products, but only if you obtained the address in the context of a sale and you offer an opt-out both at collection and in every message.",
    appliesTo:
      "Anyone sending marketing email into the EU. Because ePrivacy is a Directive rather than a Regulation, the detail lives in national law and genuinely differs between member states.",
    whatToDo: [
      "Record where and when each address was collected, and whether a purchase actually happened.",
      "Keep soft opt-in to your own similar products. A different brand in the same group does not qualify.",
      "Put an opt-out in every single message, not just the first.",
      "For B2B in France, note that legitimate interest can cover profession-related contact, and generic addresses such as info@ fall outside because they identify a legal entity.",
    ],
    enforcement:
      "Actively enforced, and usually about consent quality rather than the absence of consent. Recent examples include a 400,000 euro Garante fine in November 2025 for continuing to message people who had objected and for bundling marketing consent into quote requests, and a 1.8 million euro Norwegian fine in June 2026 over invalid customer-club consent.",
    sources: [
      {
        name: "Directive 2002/58/EC (ePrivacy), Article 13, consolidated text",
        url: "https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:02002L0058-20091219",
        published: "2009-12-19",
        actor: "regulator",
      },
      {
        name: "CNIL, La prospection commerciale par courrier électronique",
        url: "https://www.cnil.fr/fr/la-prospection-commerciale-par-courrier-electronique",
        published: "2026-06-10",
        actor: "regulator",
      },
    ],
    related: ["france-email-open-tracking-consent"],
    added: "2026-05-02",
    updated: "2026-06-12",
    lastVerified: "2026-08-01",
    changelog: [
      { date: "2026-06-12", note: "Added CNIL's B2B and generic-address guidance." },
      { date: "2026-05-02", note: "Added." },
    ],
  },

  // ─────────────────────────────────────────── content and claims
  {
    slug: "washington-misleading-subject-lines",
    title: "In Washington, any misleading subject line is a per-se violation",
    question: "Can a false urgency subject line get you sued?",
    status: "in_force",
    effectiveDate: "2025-04-17",
    jurisdictions: ["US-WA", "US"],
    topic: "content-claims",
    featured: true,
    answer:
      "Washington's Supreme Court held that the state's Commercial Electronic Mail Act bars any false or misleading information in a commercial email subject line, not only information about the message being commercial. A subject line reading 50 percent off today only, on a promotion that runs three days, is a violation. CEMA violations are per-se Consumer Protection Act violations.",
    appliesTo:
      "Any sender emailing an address they know or have reason to know belongs to a Washington resident. Your company does not need to be in Washington, which means practically every US consumer brand is exposed.",
    whatToDo: [
      "Check every time-bound claim in a subject line against the promotion's real schedule before sending.",
      "Check discount claims against what the coupon code actually does at checkout.",
      "Keep a dated record of what each campaign claimed and what the offer really was. The record is the defence.",
      "Watch recurring evergreen flows hardest. A welcome flow that has said today only for eighteen months is the worst case.",
    ],
    enforcement:
      "Very real. Arnold and Porter counted over 100 CEMA suits in the twelve months after the ruling, against eight in the preceding two decades. Defendants include Wayfair, Dick's Sporting Goods, Williams-Sonoma, Cole Haan, L'Oréal USA and Nintendo of America, and the docket shows repeat plaintiffs, which is the signature of an organised plaintiffs' bar. Note that damages were cut in June 2026, see the related rule.",
    sources: [
      {
        name: "Brown v. Old Navy, LLC, Washington Supreme Court No. 102592-1, 4 Wn.3d 580, 567 P.3d 38",
        url: "https://law.justia.com/cases/washington/supreme-court/2025/102-592-1.html",
        published: "2025-04-17",
        actor: "court",
      },
      {
        name: "RCW 19.190.020, Unpermitted or misleading electronic mail",
        url: "https://app.leg.wa.gov/rcw/default.aspx?cite=19.190.020",
        published: "2026-06-11",
        actor: "regulator",
      },
    ],
    related: ["washington-cema-damages-reduced"],
    added: "2026-05-06",
    updated: "2026-06-14",
    lastVerified: "2026-08-01",
    changelog: [
      { date: "2026-06-14", note: "Cross-referenced the June 2026 damages amendment." },
      { date: "2026-05-06", note: "Added." },
    ],
  },

  {
    slug: "washington-cema-damages-reduced",
    title: "Washington cut CEMA damages from $500 to $100 per message",
    question: "How much are CEMA damages per email in Washington?",
    status: "in_force",
    effectiveDate: "2026-06-11",
    jurisdictions: ["US-WA"],
    topic: "content-claims",
    featured: true,
    answer:
      "Engrossed Substitute House Bill 2274 cut statutory damages to a recipient from 500 dollars to 100 dollars per message, and added a knowledge element to the misleading-subject-line provision. It applies to any case commenced on or after 11 June 2026, regardless of when the emails were sent.",
    appliesTo:
      "Anyone facing or fearing a Washington CEMA claim. ISP damages stay at 1,000 dollars per message.",
    whatToDo: [
      "Do not read this as an all-clear. Exposure was always volume multiplied by class size, and that has not changed.",
      "Note the retroactivity: emails sent before June 2026 are now governed by the new, more defendant-friendly text for any newly filed case.",
      "The added knowledge element means documented pre-send review is now directly useful as evidence.",
    ],
    enforcement:
      "Filings continued after the amendment, with cases against Cole Haan, Wayfair and others filed in July 2026. Whether the wave survives the five-fold damages cut is genuinely unsettled, and is the single biggest open question in this area.",
    sources: [
      {
        name: "Washington ESHB 2274, Chapter 135, Laws of 2026, effective 11 June 2026",
        url: "https://lawfilesext.leg.wa.gov/biennium/2025-26/Pdf/Bills/Session%20Laws/House/2274-S.SL.pdf",
        published: "2026-03-23",
        actor: "regulator",
      },
    ],
    related: ["washington-misleading-subject-lines"],
    added: "2026-06-14",
    updated: "2026-06-14",
    lastVerified: "2026-08-01",
    changelog: [{ date: "2026-06-14", note: "Added." }],
  },

  // ─────────────────────────────────────────── AI disclosure
  {
    slug: "eu-ai-act-article-50-marketing-email",
    title: "AI-written marketing email needs no label, but AI product imagery might",
    question: "Do I have to disclose AI-generated content in marketing emails under the EU AI Act?",
    status: "in_force",
    effectiveDate: "2026-08-02",
    jurisdictions: ["EU"],
    topic: "ai-disclosure",
    featured: true,
    answer:
      "Article 50 of the AI Act applies from 2 August 2026. A human-reviewed, AI-drafted marketing email does not need a label: it fails the public-interest trigger, and it is separately saved by the human-review exception. Photorealistic AI-generated imagery is the real exposure, because the deepfake limb has no human-review exception.",
    appliesTo:
      "Deployers sending into the EU. Note the split: the obligation to machine-mark generated output falls on the model provider, not on you. Your exposure is the deployer limb in Article 50(4).",
    whatToDo: [
      "Name an accountable human reviewer per send and record it. The Commission excludes superficial, solely formal or procedural checks, so spell-checking does not qualify.",
      "Treat photorealistic AI product imagery as disclosable. This is the limb with no review exception.",
      "Look hard at advertorials on health or finance topics styled as editorial. Health is explicitly a public-interest topic, and that combination is the riskiest artefact an email team ships.",
      "Do not run fully unreviewed autonomous sends into the EU. That forfeits the exception exactly when it matters.",
    ],
    exempt:
      "Text that has undergone genuine human review with editorial responsibility, where a named person can approve, alter or reject on substantive grounds. Ordinary marketing also falls outside the public-interest category entirely.",
    enforcement:
      "Penalties for Article 50 breaches sit in the 15,000,000 euro or 3 percent of worldwide turnover tier. The obligation is one day old at the time of writing, so there is no enforcement record at all yet. The high-risk chapter was deferred to December 2027, but Article 50 was not deferred.",
    sources: [
      {
        name: "Regulation (EU) 2024/1689 (AI Act), Article 50",
        url: "https://artificialintelligenceact.eu/article/50/",
        published: "2024-08-01",
        actor: "regulator",
      },
      {
        name: "European Commission, FAQ on transparency obligations under Article 50",
        url: "https://digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act",
        published: "2026-07-20",
        actor: "regulator",
      },
      {
        name: "Regulation (EU) 2026/1744 (Digital Omnibus on AI), deferring the high-risk chapter but not Article 50",
        url: "https://eur-lex.europa.eu/eli/reg/2026/1744/oj",
        published: "2026-07-24",
        actor: "regulator",
      },
    ],
    added: "2026-07-26",
    updated: "2026-08-01",
    lastVerified: "2026-08-01",
    changelog: [
      { date: "2026-08-01", note: "Status moved to In force as of 2 August 2026." },
      { date: "2026-07-26", note: "Added after the Digital Omnibus confirmed Article 50 was not deferred." },
    ],
  },

  // ─────────────────────────────────────────── provider rules
  {
    slug: "gmail-bulk-sender-requirements",
    title: "Gmail enforces a 0.30 percent spam rate on bulk senders",
    question: "What is Gmail's spam rate threshold for bulk senders?",
    status: "in_force",
    effectiveDate: "2024-02-01",
    jurisdictions: ["Global"],
    topic: "provider-rules",
    provider: "Gmail",
    answer:
      "Senders of more than 5,000 messages a day to Gmail must authenticate with SPF and DKIM, publish a DMARC record, keep the reported spam rate below 0.30 percent, and support one-click unsubscribe. Google asks senders to stay under 0.10 percent and treats 0.30 percent as the line you must never reach.",
    appliesTo: "Any domain sending over 5,000 messages a day to Gmail addresses.",
    whatToDo: [
      "Watch the rate in Google Postmaster Tools, and treat 0.10 percent as your ceiling rather than 0.30.",
      "Remember the rate is reported by users, so it moves with list quality and frequency, not with content.",
      "Note that Postmaster Tools v2 retired the domain and IP reputation dashboards, so spam rate is now the number that matters most.",
    ],
    enforcement:
      "Enforced silently and automatically through filtering rather than through notices. Validity's 2025 benchmark measured global inbox placement falling to 83.5 percent, with Gmail showing an unexpected decline of almost five percent, so the effect is visible in aggregate even when no individual sender is told anything.",
    sources: [
      {
        name: "Google, Email sender guidelines",
        url: "https://support.google.com/a/answer/81126",
        published: "2024-02-01",
        actor: "mailbox-provider",
      },
    ],
    related: ["one-click-unsubscribe-rfc-8058", "google-postmaster-reputation-retired"],
    added: "2026-05-02",
    updated: "2026-06-20",
    lastVerified: "2026-08-01",
    changelog: [
      { date: "2026-06-20", note: "Noted the Postmaster v2 reputation dashboard retirement." },
      { date: "2026-05-02", note: "Added." },
    ],
  },

  {
    slug: "one-click-unsubscribe-rfc-8058",
    title: "Bulk senders must support one-click unsubscribe",
    question: "What is one-click unsubscribe and is it required?",
    status: "in_force",
    effectiveDate: "2024-06-01",
    jurisdictions: ["Global"],
    topic: "provider-rules",
    answer:
      "Gmail and Yahoo require bulk senders to implement RFC 8058 one-click unsubscribe: a List-Unsubscribe header plus List-Unsubscribe-Post, so the mail client can unsubscribe the user with a single POST and no landing page. Yahoo requires the request to be honoured within two days.",
    appliesTo: "Bulk senders to Gmail and Yahoo. In practice, everyone.",
    whatToDo: [
      "Verify both headers are present. A List-Unsubscribe header alone is not one-click and does not satisfy the requirement.",
      "Process within two days, and make sure your ESP and any downstream systems both receive the suppression.",
      "Keep the in-body unsubscribe link as well. One-click supplements it, it does not replace it.",
    ],
    enforcement:
      "Enforced through filtering. It is also one of the checks Validity's platform now runs, which tells you how mechanical this has become.",
    sources: [
      {
        name: "RFC 8058, Signalling One-Click Functionality for List Email Headers",
        url: "https://www.rfc-editor.org/rfc/rfc8058",
        published: "2017-01-01",
        actor: "standards-body",
      },
      {
        name: "Yahoo Sender Best Practices",
        url: "https://senders.yahooinc.com/best-practices/",
        published: "2024-02-01",
        actor: "mailbox-provider",
      },
    ],
    related: ["gmail-bulk-sender-requirements"],
    added: "2026-05-02",
    updated: "2026-05-02",
    lastVerified: "2026-08-01",
    changelog: [{ date: "2026-05-02", note: "Added." }],
  },

  {
    slug: "google-postmaster-reputation-retired",
    title: "Google Postmaster Tools retired the reputation dashboards",
    question: "Why did Google Postmaster Tools remove domain and IP reputation?",
    status: "in_force",
    effectiveDate: "2025-01-01",
    jurisdictions: ["Global"],
    topic: "measurement",
    provider: "Gmail",
    answer:
      "Postmaster Tools v2 removed the domain and IP reputation dashboards. Google's stated reason is that reputation data is not easily actionable for most senders. Spam rate, authentication results and delivery errors remain.",
    appliesTo: "Anyone who used the reputation colour bands to diagnose deliverability.",
    whatToDo: [
      "Move your alerting onto user-reported spam rate, which is the number Google actually enforces on.",
      "Stop quoting reputation colour to clients. The band no longer exists.",
      "If you need a trend rather than a snapshot, record spam rate daily yourself. Postmaster's own window is short.",
    ],
    enforcement:
      "Not an obligation, but it changes what you can prove. It is also a quiet admission from the enforcing party that the actionable layer was missing, which is worth remembering when a vendor sells you a reputation score.",
    sources: [
      {
        name: "Google, Postmaster Tools help, changes in version 2",
        url: "https://support.google.com/mail/answer/16594218",
        published: "2025-01-01",
        actor: "mailbox-provider",
      },
    ],
    related: ["gmail-bulk-sender-requirements"],
    added: "2026-06-20",
    updated: "2026-06-20",
    lastVerified: "2026-08-01",
    changelog: [{ date: "2026-06-20", note: "Added." }],
  },

  // ─────────────────────────────────────────── measurement
  {
    slug: "apple-mail-privacy-protection-open-rates",
    title: "Open rate is not a measurement any more",
    question: "Are email open rates accurate in 2026?",
    status: "in_force",
    effectiveDate: "2021-09-20",
    jurisdictions: ["Global"],
    topic: "measurement",
    provider: "Apple",
    featured: true,
    answer:
      "Apple Mail Privacy Protection pre-fetches images through a proxy, firing your tracking pixel whether or not a human looked. Apple accounts for 64.66 percent of all measured opens, and MPP affects roughly 55 to 60 percent of them. In late November 2025 Gmail image loading fell by about a third, and senders saw open rates drop 30 percent quarter on quarter with no matching fall in clicks or revenue.",
    appliesTo:
      "Everyone. It matters most if any segmentation, send-time optimisation or sunset policy in your account is keyed on opens.",
    whatToDo: [
      "Move engagement segmentation onto clicks, site visits and purchases.",
      "Stop reporting open rate to clients as a performance metric. Report it as a deliverability smoke alarm at best.",
      "Audit your sunset and re-engagement flows. Most were written when opens meant something and now suppress the wrong people.",
    ],
    enforcement:
      "Not a rule anyone enforces, but it silently invalidates a large amount of routine practice, which is why it belongs here.",
    sources: [
      {
        name: "Litmus, Email Client Market Share",
        url: "https://www.litmus.com/email-client-market-share",
        published: "2026-05-01",
        actor: "standards-body",
      },
      {
        name: "Validity, What's really behind Gmail's open rate drop",
        url: "https://www.validity.com/blog/whats-really-behind-gmails-open-rate-drop-and-what-to-do-about-it/",
        published: "2026-05-15",
        actor: "standards-body",
      },
    ],
    related: ["klaviyo-mpp-counted-in-attribution", "apple-intelligence-email-summaries"],
    added: "2026-05-10",
    updated: "2026-05-20",
    lastVerified: "2026-08-01",
    changelog: [
      { date: "2026-05-20", note: "Added the November 2025 Gmail image-loading decline." },
      { date: "2026-05-10", note: "Added." },
    ],
  },

  {
    slug: "klaviyo-mpp-counted-in-attribution",
    title: "Klaviyo counts Apple machine opens toward revenue by default",
    question: "Why is Klaviyo revenue higher than Shopify revenue?",
    status: "in_force",
    effectiveDate: "2021-09-20",
    jurisdictions: ["Global"],
    topic: "measurement",
    provider: "Klaviyo",
    featured: true,
    answer:
      "By default Klaviyo attributes a conversion if someone opens or clicks within five days, and its documentation states that an automatic Apple MPP open counts. Klaviyo also states it has no way of distinguishing a true human open from an automated one. Separately, Klaviyo does not subtract cancelled or refunded orders while Shopify does.",
    appliesTo:
      "Every Klaviyo account on default settings, which is most of them. The gap is largest for brands with a high Apple share.",
    whatToDo: [
      "Turn on the setting that excludes MPP opens from attribution, and know that Klaviyo says this does not remove them from reporting.",
      "Shorten the attribution window, and set open-based attribution to zero if your reporting needs to survive a finance conversation.",
      "Recompute email revenue click-only and net of refunds before you put a number in front of an owner or a CFO.",
      "Note there is no API for attribution settings, so if an agency changes them nobody is told.",
    ],
    enforcement:
      "Nobody enforces this. It is a default that flatters the platform, and the practitioner consensus is that the gap runs above 20 percent, with the usual folk remedy being to halve the number by feel.",
    sources: [
      {
        name: "Klaviyo, How Klaviyo attributes conversions",
        url: "https://help.klaviyo.com/hc/en-us/articles/115005248128",
        published: "2026-01-01",
        actor: "esp",
      },
      {
        name: "Klaviyo, Apple Mail Privacy Protection and Klaviyo",
        url: "https://help.klaviyo.com/hc/en-us/articles/4416803987739",
        published: "2026-01-01",
        actor: "esp",
      },
      {
        name: "Klaviyo, Why Klaviyo and Shopify revenue differ",
        url: "https://help.klaviyo.com/hc/en-us/articles/115005080447",
        published: "2026-01-01",
        actor: "esp",
      },
    ],
    related: ["apple-mail-privacy-protection-open-rates", "klaviyo-holdout-group-400k-gate"],
    added: "2026-05-12",
    updated: "2026-06-30",
    lastVerified: "2026-08-01",
    changelog: [
      { date: "2026-06-30", note: "Added the refund and cancellation difference against Shopify." },
      { date: "2026-05-12", note: "Added." },
    ],
  },

  {
    slug: "klaviyo-holdout-group-400k-gate",
    title: "Klaviyo holdout groups need 400,000 profiles",
    question: "How do I measure email incrementality in Klaviyo?",
    status: "in_force",
    effectiveDate: "2023-09-01",
    jurisdictions: ["Global"],
    topic: "measurement",
    provider: "Klaviyo",
    answer:
      "Klaviyo ships native holdout groups free, and they are the methodologically correct way to answer whether your email caused the revenue. They require at least 400,000 total profiles, apply across all channels at once, allow only one active holdout, and the percentage cannot be changed once set.",
    appliesTo:
      "Every brand under 400,000 profiles has no incrementality measurement available at all. Above it, you get one account-wide, all-channel holdout, never per flow.",
    whatToDo: [
      "If you clear 400,000 profiles, turn it on. It is free and it is better than any estimate.",
      "Choose the percentage carefully, because it is immutable.",
      "Below the threshold, be honest that attributed revenue is an estimate, and do not present it as causal.",
      "Note that the specialist incrementality vendors, Haus, Measured and INCRMNTAL, do not cover email as a channel.",
    ],
    enforcement: "Not enforced. It is a product gate, and it is the reason most brands cannot answer the most important question they have.",
    sources: [
      {
        name: "Klaviyo, Global holdout groups",
        url: "https://help.klaviyo.com/hc/en-us/articles/18138290642971",
        published: "2026-01-01",
        actor: "esp",
      },
    ],
    related: ["klaviyo-mpp-counted-in-attribution"],
    added: "2026-06-28",
    updated: "2026-06-28",
    lastVerified: "2026-08-01",
    changelog: [{ date: "2026-06-28", note: "Added." }],
  },

  // ─────────────────────────────────────────── content, AI summaries
  {
    slug: "apple-intelligence-email-summaries",
    title: "Apple Mail replaces your preheader with an AI summary",
    question: "How do I optimise emails for Apple Intelligence summaries?",
    status: "in_force",
    effectiveDate: "2025-01-27",
    jurisdictions: ["Global"],
    topic: "content-claims",
    provider: "Apple",
    featured: true,
    answer:
      "Apple Mail generates a summary and shows it in place of the preheader in the message list, on by default since iOS 18.3. Validity's June 2026 consumer research found 55 percent of people now make decisions from the summary alone without reading the email. Apple publishes no guidance for senders.",
    appliesTo: "Everyone, and disproportionately so given Apple is 64.66 percent of measured opens.",
    whatToDo: [
      "Put real, live text in the first 100 to 200 characters. That is what the summariser reads.",
      "Stop shipping image-only emails. Testing by Twilio and Inbox Monster found the summary is then generated from the subject line alone, and alt text is ignored entirely.",
      "Keep to one clear call to action. Emails with three or more produce summaries described in that testing as close to gibberish.",
      "Use semantic HTML headings and paragraphs rather than styled divs.",
    ],
    enforcement:
      "Not a rule. It is an unlegislated change in how your message reaches a human, which is arguably worse, because nothing tells you when it goes wrong.",
    sources: [
      {
        name: "Twilio and Inbox Monster, Mailbox provider AI and Apple Intelligence",
        url: "https://www.twilio.com/en-us/blog/insights/mailbox-provider-ai-apple-intelligence",
        published: "2025-03-18",
        actor: "standards-body",
      },
      {
        name: "Validity, Consumers let AI curate their inboxes while marketers struggle to keep up",
        url: "https://www.prnewswire.com/news-releases/validity-research-reveals-consumers-let-ai-curate-their-inboxes-while-marketers-struggle-to-keep-up-302785148.html",
        published: "2026-06-01",
        actor: "standards-body",
      },
    ],
    related: ["apple-mail-privacy-protection-open-rates"],
    added: "2026-06-05",
    updated: "2026-06-05",
    lastVerified: "2026-08-01",
    changelog: [{ date: "2026-06-05", note: "Added." }],
  },

  // ─────────────────────────────────────────── authentication
  {
    slug: "dkim-alignment-vs-dkim-passing",
    title: "DKIM passing is not DKIM aligned",
    question: "Why does my DKIM pass but DMARC fail?",
    status: "in_force",
    effectiveDate: "2015-03-01",
    jurisdictions: ["Global"],
    topic: "authentication",
    featured: true,
    answer:
      "Many platforms sign outgoing mail with their own sending domain by default. A header check then shows DKIM passing, while DMARC still fails, because the d= tag does not match the From address domain. The record existing is not the same as alignment working, and dashboards will report 100 percent delivered while the mail lands in spam.",
    appliesTo:
      "Anyone who has not explicitly configured a branded sending domain, and anyone who has added a new sending tool since the last DNS review.",
    whatToDo: [
      "Read a real received header and compare the d= value against your From domain. Do not trust a green tick.",
      "Configure a branded sending domain in every platform that sends as you.",
      "Publish DMARC and then actually read the aggregate reports. Most agencies stop at p=none and never look again, which means new unauthorised senders go unnoticed for months.",
    ],
    enforcement:
      "Enforced by filtering, silently. This is the single most common root cause in the deliverability threads I read, and it is invisible from inside the sending platform.",
    sources: [
      {
        name: "RFC 7489, Domain-based Message Authentication, Reporting and Conformance (DMARC)",
        url: "https://www.rfc-editor.org/rfc/rfc7489",
        published: "2015-03-01",
        actor: "standards-body",
      },
    ],
    related: ["gmail-bulk-sender-requirements"],
    added: "2026-05-18",
    updated: "2026-05-18",
    lastVerified: "2026-08-01",
    changelog: [{ date: "2026-05-18", note: "Added." }],
  },
];

export const RULES_BY_SLUG = new Map(RULES.map((r) => [r.slug, r]));

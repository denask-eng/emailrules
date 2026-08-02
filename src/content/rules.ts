import type { Rule } from "@/lib/types";
import { RULES_EXPANSION } from "./rules-expansion";

/**
 * The seed corpus. Every entry traces to a primary source that was read, not
 * summarised from memory. Where enforcement is untested, the rule says so.
 *
 * House rule for this file: if you cannot cite it with a date, it does not go in.
 * Large dossier-backed batches live in `rules-expansion.ts` and are concatenated
 * below so reviews stay readable.
 */
const RULES_CORE: Rule[] = [
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
    plain:
      "Someone agreeing to hear from you is not the same as agreeing to be watched. In France the open pixel needs its own separate yes. If they never gave it, they still get the email, just without the pixel in it.",
    ownership: "yours",
    handled: {
      already:
        "Part of it, on Klaviyo, since July 2026: you can mark named recipients as unsubscribed from open tracking, and their opens are then discarded rather than logged. Read what it does carefully — the pixel is still in the email and is still requested by the recipient's device. Klaviyo stops recording the open; it does not stop the read.",
      stillYours:
        "The consent itself, and the harder half of the obligation. Article 5(3) attaches to reading the recipient's terminal equipment, so a pixel that still loads is still the regulated act even when nobody writes the result down. Capturing tracking consent separately from list consent is yours, and so is deciding whether discard-on-receipt is enough for your risk appetite or whether you need the image gone.",
    },
    mondayMorning:
      "If you are on Klaviyo, open the open-tracking settings and check whether anyone has ever used the per-recipient control. If you are on anything else, ask your account manager in writing whether you can suppress the open pixel for a segment — their answer tells you whether this is a settings change or a six-month project.",
    ignoreIf: "Nobody on your list is in France.",
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
      {
        /* No date on the page, so none is claimed here. Cited because it is the
           vendor documenting its own control, and because it is candid about
           the two limits that keep this rule on your desk. */
        name: "Klaviyo, Email tracking pixel regulations (CNIL, Garante, and beyond): managing your open tracking settings",
        url: "https://help.klaviyo.com/hc/en-us/articles/53113350637083-Email-tracking-pixel-regulations-CNIL-Garante-and-beyond-Managing-your-open-tracking-settings",
        actor: "esp",
      },
    ],
    related: ["italy-email-tracking-pixel-consent", "eprivacy-email-consent-soft-optin"],
    added: "2026-04-16",
    updated: "2026-08-02",
    lastVerified: "2026-08-02",
    changelog: [
      {
        date: "2026-08-02",
        note: "Correction: this page said no mainstream ESP ships a per-recipient pixel-free send path. Klaviyo shipped per-recipient open-tracking control in July 2026 — you can mark named recipients as unsubscribed from open tracking. Read the help page and corrected the claim, but kept the distinction it turns on: Klaviyo discards the open server-side, the pixel is still requested by the device, and there is still no recipient-facing way to object.",
      },
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
    plain:
      "Italy is doing what France did, from 29 October 2026. Counting opens in aggregate is fine. Tying an open back to a named person is what needs consent.",
    ownership: "yours",
    handled: {
      already:
        "More than when this page was written. Klaviyo shipped per-recipient open-tracking control in July 2026, and it names this deadline in its own help page. It stops the open being recorded; it does not take the pixel out of the email.",
      stillYours:
        "Deciding, before October, whether discarding the open is enough for you or whether you need the image gone — Article 122 bites on reading the device, not on writing the result down. And if you rely on the aggregate exemption instead, making sure nothing downstream ties an open back to a named person.",
    },
    mondayMorning:
      "Put 29 October 2026 in the calendar with a two-month run-up. This is a build, not a checkbox, and the deadline will not move.",
    ignoreIf: "Nobody on your list is in Italy.",
    whatToDo: [
      "Separate the tracking choice from the subscription choice, and let people revoke tracking alone.",
      "Decide now what your pixel-free path is. On Klaviyo you can mark recipients as unsubscribed from open tracking, which discards the open but still requests the image; on most other setups there is no control at all. Neither is the same as not loading a pixel, so establish which you can live with before October rather than in it.",
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
    updated: "2026-08-02",
    lastVerified: "2026-08-02",
    changelog: [
      {
        date: "2026-08-02",
        note: "Correction: this page said the per-recipient pixel switch does not exist in the tools most people are on. Klaviyo shipped one in July 2026 and cites this deadline itself. Corrected, and kept the part that still lands on you: the pixel is still requested by the device, which is what Article 122 regulates.",
      },
      { date: "2026-04-30", note: "Added after publication in the Gazzetta Ufficiale." },
    ],
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
    plain:
      "In the EU you need a yes before you email. The one way round it is your own customers, about your own similar products, where you took the address during a sale and offered an opt-out at the time.",
    ownership: "shared",
    handled: {
      already:
        "Your ESP records when and where each address was collected and honours unsubscribes. That is the mechanical half, and it is genuinely done.",
      stillYours:
        "Whether the consent was ever valid. No platform checks whether your signup form bundled marketing consent into a quote request, and bundling is precisely what regulators fine people for.",
    },
    mondayMorning:
      "Open your highest-volume signup form and check that marketing consent is its own unticked box, not folded into accepting terms.",
    ignoreIf: "You only email outside the EU.",
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
    title: "In Washington, a misleading subject line is an automatic violation",
    question: "Can a false urgency subject line get you sued?",
    status: "in_force",
    effectiveDate: "2025-04-17",
    jurisdictions: ["US-WA", "US"],
    topic: "content-claims",
    featured: true,
    answer:
      "Washington's Supreme Court held that the state's Commercial Electronic Mail Act bars any false or misleading information in a commercial email subject line, not only information about the message being commercial. A subject line reading 50 percent off today only, on a promotion that runs three days, is a violation. A CEMA violation is automatically a Consumer Protection Act violation as well.",
    appliesTo:
      "Any sender emailing an address they know or have reason to know belongs to a Washington resident. Your company does not need to be in Washington, which means practically every US consumer brand is exposed.",
    plain:
      "Washington decided that \"Today only\" on a sale that runs three days is not marketing licence, it is a false statement. And there, that is automatically a consumer protection violation.",
    ownership: "yours",
    handled: {
      already:
        "Nothing. No ESP reads your subject line against your promotion calendar, and none of them will.",
      stillYours:
        "Every time-bound and discount claim you write, and being able to show later what the offer actually was.",
    },
    mondayMorning:
      "Search your evergreen flows for \"today\", \"tonight\", \"24 hours\" and \"ends\". A welcome email that has said \"today only\" every day for eighteen months is the worst version of this, and it is extremely common.",
    ignoreIf:
      "There are no US consumers on your list. If there are any, assume some of them are in Washington.",
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
    plain:
      "Damages per email in Washington dropped from $500 to $100 in June 2026, and it applies to cases filed from that date even for older sends. Take the good news, but the exposure was always volume multiplied by class size, and that part did not change.",
    ownership: "context",
    handled: {
      already:
        "Nothing to do here. This changes the size of a risk you already had, not what you should do about it.",
      stillYours:
        "One thing did change in your favour: the amendment added a knowledge element, so a documented pre-send review is now directly useful as evidence rather than just good practice.",
    },
    mondayMorning:
      "Nothing today. If you already keep a dated record of what each campaign claimed, that record just became more valuable.",
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
      "Article 50 of the AI Act applies from 2 August 2026. A human-reviewed, AI-drafted marketing email does not need a label: ordinary marketing is not a matter of public interest, and human review is a second, separate exception on top of that. Photorealistic AI-generated imagery is the real exposure, because the part of the rule covering deepfakes has no human-review exception.",
    appliesTo:
      "Anyone sending marketing email into the EU. Note the split: the duty to machine-mark generated output sits with the AI tool you used, not with you. The part that applies to you is Article 50(4), which covers whoever puts the content in front of people.",
    plain:
      "An AI-drafted email that a human genuinely read and could have rejected does not need a label. Ordinary marketing is not a matter of public interest. Photorealistic AI product imagery is the part that does need disclosing, and a human reviewing it does not get you out of that one.",
    ownership: "yours",
    handled: {
      already:
        "Nothing. Your ESP has no idea which of your images came out of a model, and no way to find out.",
      stillYours:
        "Naming an accountable reviewer per send and recording it, and flagging photorealistic AI imagery before it ships.",
    },
    mondayMorning:
      "Ask your designer which product images from the last quarter were AI-generated and photorealistic. That short list is your entire exposure.",
    ignoreIf:
      "You do not send into the EU, or you have never put AI-generated photorealistic imagery in an email.",
    whatToDo: [
      "Name an accountable human reviewer per send and record it. The Commission excludes superficial, solely formal or procedural checks, so spell-checking does not qualify.",
      "Treat photorealistic AI product imagery as disclosable. This is the one part with no human-review exception.",
      "Look hard at advertorials on health or finance topics styled as editorial. Health is explicitly a public-interest topic, and that combination is the riskiest thing an email team can send.",
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
    title: "Gmail enforces authentication, PTR, TLS and a 0.30 percent spam rate",
    question: "What is Gmail's spam rate threshold for bulk senders?",
    status: "in_force",
    effectiveDate: "2024-02-01",
    jurisdictions: ["Global"],
    topic: "provider-rules",
    provider: "Gmail",
    featured: true,
    answer:
      "Every sender to personal Gmail accounts needs at least SPF or DKIM, valid forward and reverse DNS (PTR) on sending IPs, TLS in transit, RFC 5322 formatting, and a user-reported spam rate under 0.30 percent in Postmaster Tools. Senders of about 5,000 or more messages a day to personal Gmail must use both SPF and DKIM, publish DMARC at least p=none, align the From domain, and support one-click unsubscribe for marketing mail. Google asks bulk senders to stay under 0.10 percent spam and treats 0.30 percent as the line you must never reach. Google's sender guidelines do not mention ARC at all: ARC is Apple's requirement and Yahoo's recommendation, not Gmail's.",
    appliesTo:
      "Anyone sending to personal Gmail addresses. The bulk layer applies at about 5,000 messages a day to those addresses. Shared-IP customers still need the ESP to meet PTR and TLS; branded authentication and spam rate remain your problem either way.",
    plain:
      "Under 5,000 a day you still need authentication, reverse DNS, TLS and spam under 0.30 percent. Over 5,000 you also need SPF plus DKIM, DMARC, alignment and one-click unsubscribe. Google wants 0.10. Treat 0.30 as the cliff. If a vendor tells you Gmail requires ARC, ask them to point at the line: it is not on Google's page.",
    ownership: "shared",
    handled: {
      already:
        "On a mainstream ESP, branded sending domain setup usually covers SPF, DKIM, TLS and one-click headers. Shared sending IPs are the ESP's PTR problem.",
      stillYours:
        "Spam rate, list quality, DMARC on your domain, and confirming PTR when you run dedicated IPs. No platform can stop humans pressing spam for you.",
    },
    mondayMorning:
      "Open Google Postmaster Tools and look at user-reported spam over 30 days. If it has touched 0.10 percent, that is your quarter. Then confirm _dmarc and that dedicated IPs (if any) have matching PTR.",
    ignoreIf: "You never send to personal Gmail addresses.",
    whatToDo: [
      "Watch spam rate in Postmaster Tools and treat 0.10 percent as the ceiling, not 0.30.",
      "Publish DMARC at least p=none once you clear the bulk threshold, and actually read aggregate reports.",
      "If you use dedicated IPs, verify reverse DNS: PTR hostname must resolve back to the same public IP.",
      "Do not let anyone sell you an ARC mandate for Gmail. The word does not appear on Google's sender guidelines; ARC belongs to Apple and Yahoo.",
    ],
    enforcement:
      "Less silent than its reputation. Google's own guidelines publish the temporary and permanent failures it returns, naming 4.7.0, 4.7.28, 5.7.1 and 5.7.26, so a rejected sender is told in the SMTP response and the reason is in your bounce logs. What stays invisible is the softer half: mail that is accepted and filed in spam, which nobody reports to you. Validity's 2025 benchmark measured global inbox placement falling to 83.5 percent, with Gmail down almost five percent, and that part shows up only in aggregate.",
    sources: [
      {
        name: "Google, Email sender guidelines",
        url: "https://support.google.com/a/answer/81126",
        published: "2024-02-01",
        actor: "mailbox-provider",
      },
      {
        /* Same article as the row above, served under Gmail's help path rather
           than Workspace's. Kept because senders arrive at one or the other,
           and both were read on the date below. */
        name: "Google, Email sender guidelines (Gmail help path)",
        url: "https://support.google.com/mail/answer/81126",
        actor: "mailbox-provider",
      },
    ],
    related: [
      "one-click-unsubscribe-rfc-8058",
      "google-postmaster-reputation-retired",
      "yahoo-requires-authentication-and-low-complaints",
      "dkim-alignment-vs-dkim-passing",
    ],
    added: "2026-05-02",
    updated: "2026-08-02",
    lastVerified: "2026-08-02",
    changelog: [
      { date: "2026-08-02", note: "Re-verified against primary sources (bulk/auth/consent core)." },
      {
        date: "2026-08-02",
        note: "Correction: this page said Gmail enforces silently and that Google scopes ARC to indirect mail. Both were wrong. Google's guidelines name the failures they return (4.7.0, 4.7.28, 5.7.1, 5.7.26), and the word ARC does not appear on the page at all. Re-read both help paths and counted; the ARC claim was traced to a citation that does not exist.",
      },
      {
        date: "2026-08-02",
        note: "Expanded to the all-sender PTR, TLS and RFC 5322 requirements that were missing.",
      },
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
    esp: "mainstream",
    answer:
      "Gmail and Yahoo require bulk senders to implement RFC 8058 one-click unsubscribe: a List-Unsubscribe header plus List-Unsubscribe-Post, so the mail client can unsubscribe the user with a single POST and no landing page. Yahoo requires the request to be honoured within two days.",
    appliesTo: "Bulk senders to Gmail and Yahoo. In practice, everyone.",
    plain:
      "The unsubscribe link the mail client shows at the top, that works without opening your email. Gmail and Yahoo require it from bulk senders, and Yahoo wants it honoured within two days.",
    ownership: "esp",
    handled: {
      already:
        "This one is done. Klaviyo, Braze, Mailchimp, Salesforce Marketing Cloud and every other mainstream platform add both required headers to every campaign automatically. If you send through one of them, this was handled for you and you never saw it happen. Anyone telling you to go and implement it has not looked at your account.",
      stillYours:
        "Only if you send from more than one place: the unsubscribe has to reach anything downstream that also emails, like a CRM or a transactional tool on a separate domain.",
    },
    mondayMorning:
      "Nothing, if you are on a mainstream ESP. If you send on your own infrastructure, check for both List-Unsubscribe and List-Unsubscribe-Post, because one without the other does not count.",
    ignoreIf:
      "You are on a mainstream ESP and it is the only thing that emails your list.",
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
    updated: "2026-08-02",
    lastVerified: "2026-08-02",
    changelog: [
      { date: "2026-08-02", note: "Re-verified against primary sources (bulk/auth/consent core)." },{ date: "2026-05-02", note: "Added." }],
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
    plain:
      "Google deleted the colour-coded domain and IP reputation dashboards. Their stated reason was that reputation was not actionable for most senders. Spam rate, authentication results and delivery errors are all still there.",
    ownership: "context",
    handled: {
      already:
        "Nothing to do. This changes what you can see and what you can report, not what you should be doing.",
      stillYours:
        "Finding a replacement number if you used to quote reputation colour to a client or a boss. It is user-reported spam rate, and it always should have been.",
    },
    mondayMorning:
      "Take \"domain reputation\" out of your reporting template before somebody asks you why the cell is empty.",
    ignoreIf: "You never opened Postmaster Tools in the first place.",
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
        /* Google puts no date on this page. We checked on 1 Aug 2026. */
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
    plain:
      "Apple fetches your tracking pixel before a human has looked at anything, so a large share of your opens are a machine. Open rate stopped being a measurement in 2021. Most accounts are still segmenting on it.",
    ownership: "yours",
    handled: {
      already:
        "Some platforms will filter machine opens out of a report if you ask them to. None of them go back and rewrite the flows, segments and sunset rules you built on top of open rate.",
      stillYours:
        "Every segment, suppression rule and send-time optimisation in your account that is keyed on an open.",
    },
    mondayMorning:
      "List every flow filter and segment definition that uses \"opened email\". That list, not the headline stat, is your actual problem.",
    ignoreIf:
      "Nothing in your account segments, suppresses or optimises on opens. Check before you assume that.",
    whatToDo: [
      "Move engagement segmentation onto clicks, site visits and purchases.",
      "Stop reporting open rate to clients as a performance metric. Report it as a deliverability smoke alarm at best.",
      "Audit your sunset and re-engagement flows. Most were written when opens meant something and now suppress the wrong people.",
    ],
    enforcement:
      "Not a rule anyone enforces, but it silently invalidates a large amount of routine practice, which is why it belongs here.",
    sources: [
      {
        name: "Litmus, Email Client Market Share (May 2026 data, current as of 1 June 2026)",
        url: "https://www.litmus.com/email-client-market-share",
        published: "2026-06-01",
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
    esp: ["klaviyo"],
    featured: true,
    answer:
      "By default Klaviyo attributes a conversion if someone opens or clicks within five days, and its documentation states that an automatic Apple MPP open counts. Klaviyo also states it has no way of distinguishing a true human open from an automated one. Separately, Klaviyo does not subtract cancelled or refunded orders while Shopify does.",
    appliesTo:
      "Every Klaviyo account on default settings, which is most of them. The gap is largest for brands with a high Apple share.",
    plain:
      "Klaviyo will count an Apple machine open as the touch that earned a conversion, and it does not subtract refunds and cancellations. Shopify does. That is most of why your two revenue numbers have never matched.",
    ownership: "yours",
    handled: {
      already:
        "Klaviyo does ship a setting to exclude Apple machine opens from attribution. It is off by default, and Klaviyo states that turning it on does not remove those opens from reporting.",
      stillYours:
        "Turning it on, shortening the window, and recomputing click-only and net of refunds before the number goes anywhere near a CFO.",
    },
    mondayMorning:
      "Open Klaviyo's account-level attribution settings, not the campaign ones, and look at the conversion window and whether opens count toward it. Write down the date you change anything, because there is no API for these settings and nobody is told when an agency edits them.",
    ignoreIf:
      "You are not on Klaviyo, or nobody ever puts your email revenue next to the Shopify number.",
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
        name: "Klaviyo, Understanding message conversion tracking",
        url: "https://help.klaviyo.com/hc/en-us/articles/115005248128",
        published: "2026-03-26",
        actor: "esp",
      },
      {
        name: "Klaviyo, How to configure custom reports to track Apple Mail Privacy Protection (MPP) opens",
        url: "https://help.klaviyo.com/hc/en-us/articles/4416803987739",
        published: "2026-01-27",
        actor: "esp",
      },
      {
        name: "Klaviyo, Shopify data reference",
        url: "https://help.klaviyo.com/hc/en-us/articles/115005080447",
        published: "2025-11-18",
        actor: "esp",
      },
    ],
    related: ["apple-mail-privacy-protection-open-rates", "klaviyo-holdout-group-400k-gate"],
    added: "2026-05-12",
    updated: "2026-06-30",
    lastVerified: "2026-08-01",
    changelog: [
      {
        date: "2026-08-01",
        note: "Correction: all three Klaviyo sources carried placeholder dates and two had the wrong article titles. Re-checked against Klaviyo's help centre and corrected.",
      },
      { date: "2026-06-30", note: "Added the refund and cancellation difference against Shopify." },
      { date: "2026-05-12", note: "Added." },
    ],
  },

  {
    slug: "klaviyo-holdout-group-400k-gate",
    title: "Klaviyo holdout groups need 400,000 profiles",
    question: "How do I measure email incrementality in Klaviyo?",
    status: "in_force",
    /* Dated to Klaviyo's own documentation rather than to a release we cannot
       verify. If we cannot cite the date, we do not get to assert it. */
    effectiveDate: "2025-09-23",
    jurisdictions: ["Global"],
    topic: "measurement",
    provider: "Klaviyo",
    esp: ["klaviyo"],
    answer:
      "Klaviyo ships native holdout groups free, and they are the methodologically correct way to answer whether your email caused the revenue. They require at least 400,000 total profiles, apply across all channels at once, allow only one active holdout, and the percentage cannot be changed once set.",
    appliesTo:
      "Every brand under 400,000 profiles has no incrementality measurement available at all. Above it, you get one account-wide, all-channel holdout, never per flow.",
    plain:
      "Holdout groups are the only honest way to know whether your email caused the revenue, and Klaviyo gives them away free. You need 400,000 profiles to use them. Most brands do not have 400,000 profiles.",
    ownership: "context",
    handled: {
      already:
        "Nothing to configure unless you clear the threshold, and if you are under it there is genuinely no workaround inside the platform.",
      stillYours:
        "Being honest about it. Under the threshold, attributed revenue is an estimate, and calling it incremental in a board deck is the kind of thing that gets found out.",
    },
    mondayMorning:
      "Check your profile count. Over 400,000, switch it on, it costs nothing. Under, stop using the word \"incremental\" about attributed revenue.",
    ignoreIf: "You are not on Klaviyo.",
    whatToDo: [
      "If you clear 400,000 profiles, turn it on. It is free and it is better than any estimate.",
      "Choose the percentage carefully, because it is immutable.",
      "Below the threshold, be honest that attributed revenue is an estimate, and do not present it as causal.",
      "Note that the specialist incrementality vendors, Haus, Measured and INCRMNTAL, do not cover email as a channel.",
    ],
    enforcement: "Not enforced. It is a product gate, and it is the reason most brands cannot answer the most important question they have.",
    sources: [
      {
        name: "Klaviyo, Getting started with global holdout groups",
        url: "https://help.klaviyo.com/hc/en-us/articles/18138290642971",
        published: "2025-09-23",
        actor: "esp",
      },
    ],
    related: ["klaviyo-mpp-counted-in-attribution"],
    added: "2026-06-28",
    updated: "2026-06-28",
    lastVerified: "2026-08-01",
    changelog: [
      {
        date: "2026-08-01",
        note: "Correction: the source was cited with the wrong title and a placeholder date. Klaviyo's page is 'Getting started with global holdout groups', last updated 23 Sep 2025. The effective date was corrected to match.",
      },
      { date: "2026-06-28", note: "Added." },
    ],
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
    plain:
      "Apple Mail writes its own summary of your email and puts it where your preheader used to sit. Over half of people now decide from that summary without opening anything. Apple has published no guidance for senders and shows no sign of doing so.",
    ownership: "yours",
    handled: {
      already:
        "Nothing. No ESP previews what Apple's summariser will make of your email, so you cannot test this before you send.",
      stillYours:
        "The first 200 characters of real text, one clear call to action, and not shipping image-only emails.",
    },
    mondayMorning:
      "Open your last campaign and read the first 200 characters of actual live text. If that is \"View in browser\" and a discount code, that is what Apple is summarising to your list.",
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
    plain:
      "Your DKIM can pass while DMARC fails, because the domain doing the signing is not the domain in your From line. The platform will report 100 percent delivered the entire time you are landing in spam.",
    ownership: "shared",
    handled: {
      already:
        "Configure a branded sending domain in Klaviyo, Braze or Mailchimp and alignment is handled: the platform tells you the records to publish and signs as you afterwards.",
      stillYours:
        "Actually doing it, and then checking every other tool that sends as you. The invoicing system and the helpdesk are what catch people out, because nobody thinks of them as email.",
    },
    mondayMorning:
      "Send yourself a campaign, open the raw headers, and check the d= value matches your From domain. Do not trust a green tick inside the sending platform.",
    ignoreIf:
      "You have a branded sending domain configured in everything that sends as you, and somebody has actually read a DMARC aggregate report this quarter.",
    whatToDo: [
      "Read a real received header and compare the d= value against your From domain. Do not trust a green tick.",
      "Configure a branded sending domain in every platform that sends as you.",
      "Publish DMARC and then actually read the aggregate reports. Most agencies stop at p=none and never look again, which means new unauthorised senders go unnoticed for months.",
    ],
    enforcement:
      "Enforced by filtering, silently. This is the single most common root cause we see in deliverability threads, and it is invisible from inside the sending platform.",
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
    updated: "2026-08-02",
    lastVerified: "2026-08-02",
    changelog: [
      { date: "2026-08-02", note: "Re-verified against primary sources (bulk/auth/consent core)." },{ date: "2026-05-18", note: "Added." }],
  },

  {
    slug: "outlook-high-volume-sender-authentication",
    title: "Outlook rejects unauthenticated mail from high-volume senders",
    question: "What are Outlook's requirements for bulk senders?",
    status: "in_force",
    effectiveDate: "2025-05-05",
    jurisdictions: ["Global"],
    topic: "authentication",
    provider: "Microsoft",
    featured: true,
    answer:
      "Microsoft requires domains sending 5,000 or more messages a day to Outlook.com, Hotmail and Live to pass both SPF and DKIM, publish a DMARC record at minimum p=none, and align at least one of SPF or DKIM with the domain in the From address. Microsoft first announced routing non-compliant mail to Junk from 5 May 2025, then moved to outright rejection with SMTP error 550 5.7.515.",
    plain:
      "Microsoft finally joined Gmail and Yahoo. Over 5,000 a day to Outlook, Hotmail or Live and unauthenticated mail no longer lands in spam, it bounces outright.",
    appliesTo:
      "Any domain sending 5,000 or more messages a day to Microsoft consumer addresses. Outlook.com, Hotmail and Live count together, which catches people who assume their Microsoft volume is small.",
    ownership: "shared",
    handled: {
      already:
        "Your ESP sets up SPF and DKIM when you configure a branded sending domain, and that covers most of it.",
      stillYours:
        "The DMARC record. It lives in your own domain's DNS and no ESP can publish it for you, which is exactly why this is the requirement people fail.",
    },
    whatToDo: [
      "Publish a DMARC record if you have none. Even p=none satisfies the requirement.",
      "Confirm alignment, not just presence: SPF or DKIM has to match your From domain, not your ESP's.",
      "Watch for 550 5.7.515 in your bounce logs. Unlike Gmail, Microsoft tells you when it rejects you.",
      "Count Outlook.com, Hotmail and Live as one volume, because Microsoft does.",
    ],
    mondayMorning:
      "Run `dig +short TXT _dmarc.yourdomain.com` in a terminal. If it returns nothing and you clear 5,000 a day to Microsoft, your mail is bouncing right now.",
    ignoreIf: "You send under 5,000 messages a day to Microsoft consumer addresses.",
    enforcement:
      "Enforced by hard rejection rather than silent filtering, which is unusually helpful: the bounce names the reason. Worth noting that Microsoft's own support page for the error carries no publication date, so the timeline comes from its announcement blog rather than the documentation.",
    sources: [
      {
        name: "Microsoft, Fix NDR error 550 5.7.515 in Outlook.com",
        url: "https://support.microsoft.com/en-us/outlook/fix-ndr-error-550-5-7-515-in-outlook-com",
        actor: "mailbox-provider",
      },
      {
        name: "Microsoft, Strengthening Email Ecosystem: Outlook's New Requirements for High-Volume Senders",
        url: "https://techcommunity.microsoft.com/blog/microsoftdefenderforoffice365blog/strengthening-email-ecosystem-outlook%E2%80%99s-new-requirements-for-high%E2%80%90volume-senders/4399730",
        actor: "mailbox-provider",
      },
    ],
    related: ["gmail-bulk-sender-requirements", "dkim-alignment-vs-dkim-passing"],
    added: "2026-08-01",
    updated: "2026-08-02",
    lastVerified: "2026-08-02",
    changelog: [
      { date: "2026-08-02", note: "Re-verified against primary sources (bulk/auth/consent core)." },
      {
        date: "2026-08-01",
        note: "Added. Microsoft's requirement had been missing while Gmail and Yahoo were covered, which was a real gap.",
      },
    ],
  },

  {
    slug: "eu-accessibility-act-marketing-email",
    title: "The Accessibility Act covers your shop, not obviously your newsletter",
    question: "Does the European Accessibility Act apply to marketing emails?",
    status: "in_force",
    effectiveDate: "2025-06-28",
    jurisdictions: ["EU"],
    topic: "content-claims",
    featured: true,
    answer:
      "Directive (EU) 2019/882 has applied since 28 June 2025 and covers six categories of service, one of which is e-commerce. Article 3(30) defines an e-commerce service as one provided at a distance through websites and mobile applications with a view to concluding a consumer contract. Marketing email is not named anywhere in the Directive, and the widely repeated claim that every newsletter had to meet WCAG 2.1 AA by that date is not supported by the text.",
    plain:
      "Every accessibility vendor spent 2025 telling you your newsletter had to be WCAG compliant by June. Read the Directive: it covers e-commerce services, which it defines as the website and the checkout. It does not mention email once.",
    appliesTo:
      "Businesses selling to EU consumers. The obligation attaches to the covered service, so the strength of the argument depends on how close a given email sits to the actual transaction.",
    ownership: "context",
    handled: {
      already:
        "Nothing to do, because the obligation being sold to you does not clearly exist for marketing email. Your ESP advertising accessibility-ready templates is a nice-to-have, not compliance.",
      stillYours:
        "Judgement at the edges. Where an email is itself the mechanism for concluding or confirming the contract, the scope argument is much stronger. And accessible email is worth doing anyway: about one in six people has a disability and your emails render for them too.",
    },
    whatToDo: [
      "Read Article 3(30) before you accept a vendor's scope claim. The definition is narrow and specific.",
      "Treat order confirmations and transactional mail as the higher-risk case, not the promotional newsletter.",
      "Do the accessibility basics regardless: semantic headings, real text, alt text, contrast. They also fix how Apple summarises you.",
      "Ask any vendor quoting this at you to name the Article. Most cannot.",
    ],
    mondayMorning:
      "Nothing urgent. If you want the actual win, fix your text-to-image ratio and use semantic headings in your master template, because that pays off in Apple Mail summaries whether or not the Directive ever reaches you.",
    ignoreIf: "You do not sell to consumers in the EU.",
    enforcement:
      "Enforced by member states, and Germany's transposition, the Barrierefreiheitsstärkungsgesetz, carries fines up to 100,000 euros. We have found no enforcement action anywhere against a marketing email on accessibility grounds. The urgency around this one has been manufactured largely by people selling audits.",
    sources: [
      {
        name: "Directive (EU) 2019/882 on the accessibility requirements for products and services, Articles 2 and 3(30)",
        url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32019L0882",
        published: "2019-04-17",
        actor: "regulator",
      },
    ],
    related: ["apple-intelligence-email-summaries"],
    added: "2026-08-01",
    updated: "2026-08-01",
    lastVerified: "2026-08-01",
    changelog: [
      {
        date: "2026-08-01",
        note: "Added, specifically to state the scope limit. The prevailing advice in the market overstates what the Directive says about email.",
      },
    ],
  },

  {
    slug: "can-spam-penalty-per-email",
    title: "CAN-SPAM is $53,088 per email, and that did not rise in 2026",
    question: "What is the CAN-SPAM fine per email?",
    status: "in_force",
    effectiveDate: "2025-01-17",
    jurisdictions: ["US"],
    topic: "content-claims",
    featured: true,
    answer:
      "CAN-SPAM is an opt-out regime, not opt-in: you may email without prior consent, but every message needs accurate headers, a non-deceptive subject line, a valid physical postal address, a working opt-out, and the opt-out honoured within 10 business days. Each non-compliant email carries a civil penalty of up to $53,088. That figure took effect on 17 January 2025 and still stands, because the FTC's usual January inflation adjustment was cancelled for 2026.",
    plain:
      "The US does not require opt-in, which surprises people coming from Europe. What it does require is a real postal address, an honest subject line, and an unsubscribe you action within ten business days. The number that gets quoted is $53,088, and it is per email, not per campaign.",
    appliesTo:
      "Anyone sending commercial email to US recipients, wherever you are based. There is no small-sender exemption and no volume threshold.",
    ownership: "shared",
    handled: {
      already:
        "Your ESP puts the postal address and unsubscribe link in the footer template, processes opt-outs automatically, and does it well within ten business days. The mechanical compliance is genuinely handled.",
      stillYours:
        "The subject line, and anything sent outside the ESP. A sales rep mail-merging from a laptop is commercial email too, and it is the usual source of exposure.",
    },
    whatToDo: [
      "Check the postal address in your footer is real and current. An old office address is a live violation on every send.",
      "Keep the subject line honest about what is inside. Deception is the limb regulators actually pursue.",
      "Audit anything that emails prospects outside the ESP, especially sales sequencing tools.",
      "Remember you stay liable for what an agency sends on your behalf. Hiring someone does not move the obligation.",
    ],
    mondayMorning:
      "Open your last campaign and check the footer address against where the company actually is now. Companies move; footers do not.",
    ignoreIf: "You never email anyone in the United States.",
    enforcement:
      "Real but infrequent against ordinary marketers, and historically aimed at deceptive senders rather than sloppy footers. The important 2026 detail: the FTC adjusts these penalties every January, but the Office of Management and Budget cancelled the 2026 adjustment because the government shutdown from 1 October to 12 November 2025 stopped the Bureau of Labor Statistics calculating October 2025 CPI-U. So the 2025 figure carries through 2026 unchanged. Anyone quoting a higher 2026 number is guessing.",
    sources: [
      {
        name: "Federal Register, No Adjustment to Civil Monetary Penalty Amounts (2026 adjustment cancelled)",
        url: "https://www.federalregister.gov/documents/2026/07/07/2026-13629/no-adjustment-to-civil-monetary-penalty-amounts",
        published: "2026-07-07",
        actor: "regulator",
      },
      {
        name: "Federal Register, Adjustments to Civil Penalty Amounts (the $53,088 figure)",
        url: "https://www.federalregister.gov/documents/2025/01/17/2025-01361/adjustments-to-civil-penalty-amounts",
        published: "2025-01-17",
        actor: "regulator",
      },
      {
        name: "FTC, CAN-SPAM Act: A Compliance Guide for Business",
        url: "https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business",
        actor: "regulator",
      },
    ],
    related: ["washington-misleading-subject-lines", "one-click-unsubscribe-rfc-8058"],
    added: "2026-08-01",
    updated: "2026-08-02",
    lastVerified: "2026-08-02",
    changelog: [
      { date: "2026-08-02", note: "Re-verified against primary sources (bulk/auth/consent core)." },
      {
        date: "2026-08-01",
        note: "Added. The baseline US rule was missing entirely, and the 2026 penalty figure is widely misreported because the annual adjustment was cancelled.",
      },
    ],
  },
];

export const RULES: Rule[] = [...RULES_CORE, ...RULES_EXPANSION];

export const RULES_BY_SLUG = new Map(RULES.map((r) => [r.slug, r]));

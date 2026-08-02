/**
 * The vocabulary, placed on the journey of one email.
 *
 * Every glossary in this industry is an A–Z list, which is the one order in
 * which none of it makes sense: a reader meets "alignment" before "From
 * domain" and gives up. This corpus is ordered by *when it happens* to a
 * single message — collected, built, sent, judged, delivered, reacted to,
 * counted — and every term carries the artefact you would actually see at
 * that moment. A definition tells you what a word means. A specimen tells
 * you what it looks like at 4pm on a Tuesday when it is broken.
 *
 * Field contract:
 *   short     ≤ 22 words, no nested unexplained jargon. This is the tooltip.
 *   sayIt     the sentence you say out loud to a boss who does not do email.
 *   long      1–3 sentences for the term page.
 *   specimen  the real thing. Wrap a fragment in [[ ]] to accent it.
 *   goesWrong the failure mode we have actually watched happen.
 *   myth      the widely repeated wrong thing, and the correction.
 *
 * Nothing here states a number we cannot stand behind. Where a figure moves
 * (CAN-SPAM's per-email penalty is inflation-adjusted annually) the term
 * links to the dated rule instead of freezing a number into a definition.
 */

/** Where on the journey this word happens. The spine of the whole page. */
export type StageId =
  | "collect"
  | "build"
  | "send"
  | "judge"
  | "filter"
  | "verdict"
  | "react"
  | "count";

/**
 * How early a marketer needs this. `start` is the set you can hand a
 * week-one hire; filtering to it collapses 37 words to 12 and is the
 * single kindest thing this page does.
 */
export type TermLevel = "start" | "working" | "deep";

/** Same four values the rules corpus uses. Vocabulary gets an owner too. */
export type TermOwner = "yours" | "esp" | "shared" | "context";

export interface SpecimenLine {
  /** Monospace content. [[fragment]] renders accented. */
  text: string;
  /** Annotation shown under the line, in the reader's voice. */
  note?: string;
  /** Renders dimmed: a shell prompt, a column header, a comment. */
  muted?: boolean;
}

export interface Specimen {
  /**
   * Where the values come from. This site's house rule is that a claim
   * without a citation does not ship, and a monospace plate reads as
   * evidence whether or not it is — so every plate declares itself.
   *   spec     the syntax and the values are what a standard, a statute or a
   *            provider publishes.
   *   example  the shape is real, the figures are invented to show arithmetic.
   *            Nobody should ever quote these as benchmarks.
   *   ours     our own framing. No published source claims it, and we are not
   *            going to pretend one does.
   */
  basis: "spec" | "example" | "ours";
  kind:
    | "DNS record"
    | "Email header"
    | "In the message"
    | "In your data"
    | "On screen"
    | "The test"
    | "The arithmetic"
    | "At the command line";
  label: string;
  lines: SpecimenLine[];
  caption?: string;
}

export interface GlossaryTerm {
  id: string;
  /** Canonical display term */
  term: string;
  /** ≤ 22 words. No nested unexplained jargon. Used as the tooltip. */
  short: string;
  /** 1–3 sentences for the term page. */
  long: string;
  /** Match variants in body copy (lowercased). */
  aliases: string[];

  stage: StageId;
  level: TermLevel;
  owner: TermOwner;

  /** The sentence you can repeat in a meeting without understanding email. */
  sayIt: string;

  /** The artefact. This is the part nobody else publishes. */
  specimen?: Specimen;
  /** Named screens, in click order. */
  whereItLives?: string[];
  /** The failure mode, stated concretely. */
  goesWrong?: string;
  /** How to verify in about a minute. */
  checkIt?: { how: string; href?: string };
  /** Disambiguation against the word people confuse it with. */
  notTheSameAs?: { thing: string; delta: string }[];
  /** The widely repeated wrong thing. */
  myth?: { claim: string; truth: string };
  /**
   * Figures that actually get enforced. `src` is required: if a number
   * cannot be traced to a rule page in this corpus or to a named standard,
   * it is folklore and it does not belong in a definition.
   */
  figures?: { v: string; k: string; src: string }[];
  /** Rule slugs. Rendered only if the slug exists in the live corpus. */
  rules?: string[];
  /** Term ids. */
  seeAlso?: string[];
  /**
   * A published line you are measured against, drawn to scale. Only for the
   * two terms where a provider actually publishes a threshold — inventing a
   * scale for a number nobody publishes is exactly the fake precision this
   * site refuses.
   */
  gauge?: {
    label: string;
    max: number;
    fmt: (n: number) => string;
    marks: { at: number; label: string; hard?: boolean }[];
    you: { at: number; label: string };
    note: string;
  };
}

export interface Stage {
  id: StageId;
  /** Ordinal shown to the reader: "Stop 3 of 7". */
  n: number;
  name: string;
  /** What physically happens. Present tense, one sentence. */
  what: string;
  /** How long this stop takes. Concrete beats vague. */
  when: string;
  /** Who can change the outcome here. */
  owner: TermOwner;
  /** The paragraph that opens the section. */
  intro: string;
}

/**
 * Eight stops. A marketer who reads only these eight sentences understands
 * more about email than most people who have sent it for five years —
 * including the one thing the checklists all leave out, which is that
 * authentication and placement are two different questions asked by two
 * different parts of the same second.
 */
export const STAGES: Stage[] = [
  {
    id: "collect",
    n: 1,
    name: "You get the address",
    what: "Someone hands you an email address, and the terms of that handover decide everything after it.",
    when: "Weeks or years earlier",
    owner: "yours",
    intro:
      "Every legal problem in email is created here and discovered later. Nothing further down the journey can repair a badly collected address: not authentication, not design, not a better subject line. The words at this stop are about one question — what exactly did this person agree to, and can you prove it a year from now.",
  },
  {
    id: "build",
    n: 2,
    name: "You build the message",
    what: "You choose a From address, write a subject line, and add the things the law requires to be in the message.",
    when: "The hour before send",
    owner: "shared",
    intro:
      "Your platform does most of this, which is exactly why the parts it does not do get missed. Four things in a marketing email are regulated by name: who it is from, what the subject line promises, whether a postal address is present, and whether someone can get out. Everything else at this stop is design.",
  },
  {
    id: "send",
    n: 3,
    name: "It leaves your building",
    what: "Your platform hands the message to a mail server, which stamps it with proof of who sent it.",
    when: "Milliseconds",
    owner: "shared",
    intro:
      "This is the stop marketers are most afraid of and least responsible for. The proof is assembled automatically from records you published in DNS, usually once, usually years ago. You almost never touch this on a Tuesday. But when it is wrong it is silently, totally wrong, and nothing in your platform will tell you.",
  },
  {
    id: "judge",
    n: 4,
    name: "Identity gets checked",
    what: "The receiver works out whether the message really comes from who it says it does.",
    when: "Under one second",
    owner: "context",
    intro:
      "Three separate questions get asked here, and the third is the one everybody skips. Did an allowed server send this? Is the signature valid? And — the one that fails while the first two pass — does either of those actually belong to the brand name in the From line? Note what none of these ask: whether anyone wants the mail. Passing all three is a gate, not a verdict. It makes you eligible to be judged. The judging happens at the next stop.",
  },
  {
    id: "filter",
    n: 5,
    name: "Reputation decides",
    what: "Having proved who you are, you find out whether they want you — and that is mostly about your history, not this message.",
    when: "The same second",
    owner: "yours",
    intro:
      "This is the stop that authentication checklists pretend does not exist, and it is where placement is actually decided. SPF, DKIM and DMARC answer “is this really you”. Nothing about passing them says a human wants your mail. The second question is settled by what your domain has done before: who opened, clicked, replied, dragged you out of spam, or reported you. A brand-new domain has no answer to that question at all, which is a different problem from having a bad one, and the two are fixed in opposite ways. No provider publishes the weights, and anybody who tells you they know them is selling something.",
  },
  {
    id: "verdict",
    n: 6,
    name: "The verdict lands",
    what: "The message goes to an inbox, a spam folder, a refusal, or an address that was never a person.",
    when: "Instant, and invisible",
    owner: "context",
    intro:
      "Your platform reports \"delivered\", which means the receiving server accepted the message, not that a human will ever see it. The spam folder is a delivery. That gap between accepted and seen is where most of the anxiety in this job lives, and the words at this stop are the failures that are visible rather than inferred.",
  },
  {
    id: "react",
    n: 7,
    name: "A human reacts",
    what: "Somebody opens, clicks, ignores, unsubscribes, or presses the button that costs you the most.",
    when: "Minutes to days",
    owner: "yours",
    intro:
      "One of these reactions is worth more attention than all the others combined. Not the open, which is now largely a machine. Not the click. The complaint: a fraction of one percent of your recipients pressing Report spam is the difference between arriving and not, and it is measured against you at every provider separately.",
  },
  {
    id: "count",
    n: 8,
    name: "It comes back as numbers",
    what: "The reactions become a dashboard, and the dashboard is lying to you a little.",
    when: "The next morning",
    owner: "yours",
    intro:
      "The numbers you were trained on broke in September 2021 and nobody sent a memo. Opens are partly machines. Revenue is partly coincidence. The vocabulary here exists to tell you which figures still carry information and which ones you are quietly making decisions on for no reason.",
  },
];

export const STAGE_BY_ID = new Map(STAGES.map((s) => [s.id, s]));

export const OWNER_LABEL: Record<TermOwner, { short: string; long: string }> = {
  yours: { short: "Yours", long: "Nobody does this for you" },
  esp: { short: "Your platform", long: "Klaviyo, Mailchimp and friends do this automatically" },
  shared: { short: "Shared", long: "The platform does part; the rest is genuinely yours" },
  context: { short: "Nobody's", long: "Nothing to action — it changes a number or a risk you report" },
};

export const LEVEL_LABEL: Record<TermLevel, { short: string; long: string }> = {
  start: { short: "Week one", long: "The words you cannot work without" },
  working: { short: "Working", long: "You will meet these within a quarter" },
  deep: { short: "Deep", long: "Deliverability lead territory" },
};

export const GLOSSARY: GlossaryTerm[] = [
  /* ───────────────────────── 1 · You get the address ───────────────────── */
  {
    id: "consent",
    term: "Consent",
    stage: "collect",
    level: "start",
    owner: "yours",
    short: "A clear, informed yes to marketing (rules vary by country) — silence or pre-ticked boxes are usually weak.",
    sayIt: "We can prove this person asked for our email, what they were shown, and when.",
    long: "Consent is permission, and its quality is what gets tested. A regulator does not ask whether a flag is true in your database; it asks what the person saw, when they saw it, and whether agreeing was a free choice. Bundling marketing into “I agree to the terms” is a classic fine pattern in Europe.",
    aliases: ["consent", "permission"],
    specimen: {
      basis: "ours",
      kind: "In your data",
      label: "What a consent record has to contain",
      lines: [
        { text: "email            dana@example.com", muted: false },
        { text: "source           [[checkout_newsletter_checkbox]]", note: "Where, exactly. Not “website”." },
        { text: "wording          \"Email me Aurora news and offers.", muted: false },
        { text: "                  Unsubscribe any time.\"", note: "The literal text shown. This is the field almost nobody stores, and the only one that settles an argument." },
        { text: "pre_ticked       false", note: "A pre-ticked box is not consent in the EU or UK. Storing that it was unticked is the proof." },
        { text: "timestamp        [[2026-03-04T14:22:07Z]]", note: "To the second, in UTC. “March 2026” is not a record." },
        { text: "ip               203.0.113.44", muted: false },
        { text: "double_opt_in    2026-03-04T14:24:51Z", note: "The confirmation click, if you use one." },
      ],
      caption:
        "Six fields. Most platforms store one boolean, which proves nothing when someone asks.",
    },
    goesWrong:
      "Storing `marketing_opt_in = true` and nothing else. It is not evidence of anything: it cannot show what the person read, whether the box was pre-ticked, or whether marketing was bundled into a terms acceptance. The day you need it is the day you find out.",
    myth: {
      claim: "GDPR requires double opt-in.",
      truth:
        "It does not contain the phrase. It requires consent you can demonstrate, and a confirmation click is simply the cheapest way to demonstrate it. German court practice is why the habit is near-universal in the DACH region.",
    },
    notTheSameAs: [
      { thing: "Opt-out", delta: "Consent is permission before you send. Opt-out is the exit after you have." },
      { thing: "A legitimate interest assessment", delta: "For marketing email to individuals in the EU, legitimate interest does not substitute for consent." },
    ],
    rules: [
      "eprivacy-email-consent-soft-optin",
      "germany-marketing-email-needs-express-consent-or-the-four-part-customer-exception",
      "eu-b2b-email-has-no-blanket-legitimate-interest-permission",
    ],
    seeAlso: ["opt-in", "double-opt-in", "soft-opt-in"],
  },
  {
    id: "opt-in",
    term: "Opt-in",
    stage: "collect",
    level: "start",
    owner: "yours",
    short: "The person actively agreed to receive your marketing email before you send it.",
    sayIt: "They asked us to email them. We did not decide for them.",
    long: "Opt-in means permission first. How strict that has to be depends entirely on the country: the EU and UK generally need a clear affirmative yes, while US federal law is built the other way round and lets you send until someone asks you to stop.",
    aliases: ["opt-in", "opt in", "opted in"],
    specimen: {
      basis: "spec",
      kind: "The test",
      label: "Is this an opt-in?",
      lines: [
        { text: "An unticked box the person ticked                    [[YES]]", muted: false },
        { text: "A box already ticked when the page loaded            [[NO]]", note: "Pre-ticked is the textbook failure in the EU and UK." },
        { text: "\"By ordering you agree to our terms and updates\"     [[NO]]", note: "Consent bundled into something else is not freely given." },
        { text: "They typed their address into a box marked           [[YES]]", muted: false },
        { text: "  \"Get our newsletter\" and pressed the button", muted: false },
        { text: "They bought something and said nothing              [[DEPENDS]]", note: "This is the soft opt-in question, and it has four conditions. See below." },
        { text: "You bought the list                                  [[NO]]", note: "Consent is not transferable. Nobody agreed to hear from you." },
      ],
    },
    goesWrong:
      "Treating a shipping-address field as a marketing sign-up. The person gave you an address to receive a parcel notification, which is a different purpose, and in the EU that distinction is the whole case.",
    notTheSameAs: [
      { thing: "Double opt-in", delta: "Double opt-in is an opt-in plus a confirmation click. Stronger evidence, same underlying permission." },
    ],
    rules: ["eprivacy-email-consent-soft-optin", "uk-pecr-email-needs-consent-or-a-complete-soft-opt-in"],
    seeAlso: ["consent", "double-opt-in", "soft-opt-in", "can-spam"],
  },
  {
    id: "double-opt-in",
    term: "Double opt-in",
    stage: "collect",
    level: "working",
    owner: "yours",
    short: "The person confirms their email via a link before you add them to marketing — stronger proof they meant to join.",
    sayIt: "We email them once to check the address is really theirs before we ever market to them.",
    long: "Double opt-in (also called confirmed opt-in) means that after someone submits an address, nothing marketing-related is sent until they click a confirmation link. It is the strongest ordinary evidence of consent, and it quietly filters out typos, bots and people signing up their colleagues.",
    aliases: ["double opt-in", "double opt in", "doi", "confirmed opt-in"],
    specimen: {
      basis: "example",
      kind: "In your data",
      label: "The two rows that matter",
      lines: [
        { text: "signup     2026-03-04T14:22:07Z  form=footer_newsletter", muted: false },
        { text: "confirmed  [[2026-03-04T14:24:51Z]]  ip=203.0.113.44", note: "Two minutes and forty-four seconds later. That gap is the evidence: a human read an email and acted." },
        { text: "", muted: true },
        { text: "unconfirmed after 14 days  →  delete, do not \"try again\"", note: "An address that never confirmed is either a typo or someone else's. Both are liabilities." },
      ],
      caption:
        "The confirmation timestamp is the single most useful field in a consent argument, because a machine cannot produce it and a person cannot forget it.",
    },
    goesWrong:
      "Sending the confirmation email and, when it is not clicked, adding the person anyway on the grounds that they clearly meant to. That is worse than single opt-in: you now have a documented record of someone declining to confirm.",
    myth: {
      claim: "Double opt-in costs you half your list.",
      truth:
        "It removes the half that was never going to engage, plus the typos and the bots. The measurable effects are lower bounces, lower complaint rate and fewer spam-trap hits — which is to say, the three things that decide whether the rest of the list arrives at all.",
    },
    rules: ["germany-marketing-email-needs-express-consent-or-the-four-part-customer-exception", "signup-forms-need-anti-automation-controls"],
    seeAlso: ["consent", "opt-in", "spam-trap"],
  },
  {
    id: "soft-opt-in",
    term: "Soft opt-in",
    stage: "collect",
    level: "working",
    owner: "yours",
    short: "A narrow legal exception: you may email existing customers about similar products if you offered opt-out at signup and in every message.",
    sayIt: "There is a narrow exception for our own customers, and it has four conditions we have to meet all of.",
    long: "Soft opt-in is not “anyone who bought once, forever”. In the EU and UK it is a limited path that sits next to full consent, and it only holds if every one of its conditions is true. Purchased lists never inherit it, and neither do people who enquired but did not buy.",
    aliases: ["soft opt-in", "soft opt in", "soft-opt-in"],
    specimen: {
      basis: "spec",
      kind: "The test",
      label: "Four conditions. All four, or you need consent.",
      lines: [
        { text: "1   You obtained the address [[in the course of a sale]]", note: "Or negotiations for one. An enquiry that went nowhere is thinner ground, and in the UK the regulator has said so." },
        { text: "2   You are marketing your own [[similar]] products or services", note: "Your own. Not a partner's, not a new business line the customer would not recognise." },
        { text: "3   You offered a [[free opt-out at the moment you collected it]]", note: "At collection. Not later, not in the first email." },
        { text: "4   You offer a free opt-out in [[every message since]]", muted: false },
        { text: "", muted: true },
        { text: "Fail any one   →   you are back to needing consent", note: "There is no partial credit, and condition 3 is the one almost everybody fails, because it happened years ago on a checkout page nobody has looked at since." },
      ],
    },
    goesWrong:
      "Assuming it applies across the whole EU identically. It is a Directive, so each country implemented its own version: Germany's four-part exception in UWG §7 is not word-for-word the UK's PECR regulation 22, and B2B treatment differs sharply between them.",
    myth: {
      claim: "They bought from us, so we can email them.",
      truth:
        "Only if all four conditions hold, and only about similar things you sell. A customer who bought a kettle in 2019 from a checkout with no marketing opt-out is not a soft opt-in, they are an unlawful send.",
    },
    rules: [
      "eprivacy-email-consent-soft-optin",
      "uk-pecr-email-needs-consent-or-a-complete-soft-opt-in",
      "germany-marketing-email-needs-express-consent-or-the-four-part-customer-exception",
    ],
    seeAlso: ["consent", "pecr", "eprivacy"],
  },
  {
    id: "can-spam",
    term: "CAN-SPAM",
    stage: "collect",
    level: "start",
    owner: "yours",
    short: "US federal rules for commercial email — honest subject lines, real postal address, working unsubscribe (opt-out model).",
    sayIt: "The US rule. We do not need permission first, but we do need honesty, an address and a working unsubscribe.",
    long: "CAN-SPAM does not require prior opt-in at the federal level, which is why American and European email programmes are built so differently. What it does require is that headers and subject lines are not deceptive, that a physical postal address appears, and that opt-outs are honoured within ten business days. State law can be tougher, and Washington's is.",
    aliases: ["can-spam", "can spam"],
    specimen: {
      basis: "spec",
      kind: "The test",
      label: "Five obligations, and they are not optional",
      lines: [
        { text: "1   [[No deceptive]] From, Reply-To or routing information", muted: false },
        { text: "2   [[No deceptive subject line]]", note: "This is the one that gets litigated, and Washington state goes further than the federal standard." },
        { text: "3   Identify the message as an [[advertisement]]", note: "Any clear way. A recognisable brand newsletter generally reads as one." },
        { text: "4   A [[valid physical postal address]]", note: "A registered PO box counts. An empty footer does not, and this is the single most common miss." },
        { text: "5   A working opt-out, honoured within [[10 business days]]", note: "And you may not charge for it, or require a login, or ask why." },
      ],
      caption:
        "Penalties are assessed per email, and the figure is inflation-adjusted every year, which is why the number on most blog posts is wrong.",
    },
    figures: [{ v: "10 business days", k: "to honour an opt-out", src: "FTC, CAN-SPAM compliance guide" }],
    goesWrong:
      "Running a US programme on CAN-SPAM logic and then sending to a list with EU, UK or Canadian addresses in it. The permission bar is set by where the recipient is, not by where you are.",
    notTheSameAs: [
      { thing: "GDPR / ePrivacy", delta: "CAN-SPAM is opt-out. The EU is opt-in. They are opposite defaults, not different flavours of the same rule." },
    ],
    rules: ["can-spam-penalty-per-email", "washington-misleading-subject-lines", "transactional-vs-commercial-email-is-not-a-subject-line-trick"],
    seeAlso: ["opt-out", "cema", "transactional"],
  },
  {
    id: "casl",
    term: "CASL",
    stage: "collect",
    level: "working",
    owner: "yours",
    short: "Canada's anti-spam law — commercial email needs consent you can prove, plus identification and unsubscribe rules.",
    sayIt: "Canada is the strict one. Consent has to be provable, and the kind we get from a purchase expires.",
    long: "CASL (Canada's Anti-Spam Legislation) requires consent that is either express or fits a defined implied category, plus sender identification and a working unsubscribe. Crucially, implied consent has a clock on it: the categories expire, and when they do the permission is gone rather than merely old.",
    aliases: ["casl"],
    specimen: {
      basis: "spec",
      kind: "The test",
      label: "Which consent do you actually have?",
      lines: [
        { text: "Express     they asked, in a way you recorded    [[no expiry]]", note: "You must be able to show what they were told at the time." },
        { text: "Implied     existing business relationship       [[2 years]]", note: "Two years from the purchase or contract, then it is gone." },
        { text: "Implied     an enquiry they made                 [[6 months]]", muted: false },
        { text: "Implied     published business address           [[conditional]]", note: "Only where the address is published without a no-marketing statement, and only about their role." },
        { text: "", muted: true },
        { text: "Unsubscribes honoured within        [[10 business days]]", muted: false },
      ],
    },
    figures: [
      { v: "2 years", k: "implied consent from a purchase", src: "CASL, S.C. 2010 c. 23" },
      { v: "6 months", k: "implied consent from an enquiry", src: "CASL, S.C. 2010 c. 23" },
      { v: "CAD 10M", k: "maximum penalty, business", src: "CASL, S.C. 2010 c. 23" },
    ],
    goesWrong:
      "Treating a Canadian segment as “basically the US”. The penalties are an order of magnitude larger than most teams assume, and the two-year clock means a list that was compliant last year silently is not this year.",
    rules: [
      "canada-casl-commercial-email-needs-provable-consent",
      "canada-casl-implied-consent-expires-and-unsubscribe-takes-ten-business-days",
    ],
    seeAlso: ["consent", "opt-in", "sunset"],
  },
  {
    id: "pecr",
    term: "PECR",
    stage: "collect",
    level: "working",
    owner: "yours",
    short: "UK rules for electronic marketing — individuals generally need consent or a complete soft opt-in.",
    sayIt: "The UK rule for marketing messages. It sits on top of GDPR, and the ICO enforces it separately.",
    long: "PECR (the Privacy and Electronic Communications Regulations 2003) governs marketing calls, texts and emails in the UK. For individual subscribers you need consent or a complete soft opt-in; corporate subscribers are treated differently. It is enforced by the ICO under its own penalty regime rather than the UK GDPR one.",
    aliases: ["pecr"],
    goesWrong:
      "Assuming Brexit changed the marketing rules. PECR was retained; the substantive email obligations did not move, and the ICO has continued to issue penalties under it.",
    notTheSameAs: [
      { thing: "UK GDPR", delta: "GDPR governs the personal data. PECR governs the act of sending the marketing message. Both apply at once, with different maximum fines." },
    ],
    rules: ["uk-pecr-email-needs-consent-or-a-complete-soft-opt-in"],
    seeAlso: ["soft-opt-in", "consent", "eprivacy"],
  },
  {
    id: "eprivacy",
    term: "ePrivacy",
    stage: "collect",
    level: "working",
    owner: "yours",
    short: "EU rules (a Directive) on electronic marketing and cookies — member countries implement details in national law.",
    sayIt: "The EU email rule. It is a Directive, so every country wrote its own version and they are not identical.",
    long: "The ePrivacy Directive sets the EU-wide shape — consent for marketing email to individuals, with a narrow customer exception — but because it is a Directive rather than a Regulation, each member state implemented it in national law. The differences are real and they are where the enforcement happens.",
    aliases: ["eprivacy", "e-privacy"],
    goesWrong:
      "Writing one “EU policy”. France's tracking-pixel position, Germany's four-part customer exception and Italy's timeline are separate obligations with separate dates. Treating the EU as one jurisdiction is how a compliant German programme becomes a French problem.",
    rules: [
      "eprivacy-email-consent-soft-optin",
      "france-email-open-tracking-consent",
      "italy-email-tracking-pixel-consent",
      "eu-b2b-email-has-no-blanket-legitimate-interest-permission",
    ],
    seeAlso: ["soft-opt-in", "pecr", "tracking-pixel"],
  },
  {
    id: "gpc",
    term: "GPC",
    stage: "collect",
    level: "deep",
    owner: "yours",
    short: "Global Privacy Control — a browser signal to opt out of sale/sharing of personal data, not automatically “stop all email.”",
    sayIt: "A browser signal about selling and sharing data. It is not an unsubscribe, and treating it as one is its own mistake.",
    long: "GPC is a signal a browser sends on every request. In California and Colorado it must be honoured as an opt-out of sale and sharing, and of certain targeted advertising. It is not an email unsubscribe unless your own policy maps it to one, and inventing a legal ban the statute does not write is as wrong as ignoring the signal.",
    aliases: ["gpc", "global privacy control"],
    specimen: {
      basis: "spec",
      kind: "In the message",
      label: "What the signal actually looks like",
      lines: [
        { text: "GET /collections/coffee HTTP/2", muted: true },
        { text: "Host: aurora.com", muted: true },
        { text: "[[Sec-GPC: 1]]", note: "One header, on every request from that browser. That is the whole mechanism." },
        { text: "", muted: true },
        { text: "https://aurora.com/[[.well-known/gpc.json]]", note: "Where you declare that you honour it. A JSON file, two fields." },
      ],
      caption:
        "It arrives at your website, not at your email platform. Nothing in Klaviyo will ever show you a GPC signal — the wiring between the two is yours to build.",
    },
    goesWrong:
      "Two opposite failures, and teams manage both. Ignoring the signal entirely because it never appears in the email tool; or suppressing the person from all email, which is not what the statute asks for and quietly destroys a legitimate subscriber.",
    rules: ["california-gpc-stops-sale-and-sharing-not-email", "colorado-gpc-stops-sale-and-cross-site-targeting"],
    seeAlso: ["consent", "tracking-pixel"],
  },

  /* ───────────────────────── 2 · You build the message ─────────────────── */
  {
    id: "esp",
    term: "ESP",
    stage: "build",
    level: "start",
    owner: "context",
    short: "Email service provider — the tool that sends your campaigns (e.g. Klaviyo, Mailchimp, Braze).",
    sayIt: "The tool we send from. Klaviyo, in our case. It is not the same thing as our website or our inbox.",
    long: "An ESP (email service provider) is the platform where contacts live, campaigns are built, and sends are executed. It is not your website host, not your DNS provider, and not the mailbox your recipients read in. Confusing those four is the most expensive vocabulary error in this job.",
    aliases: ["esp", "esps", "email service provider", "email service providers"],
    specimen: {
      basis: "ours",
      kind: "The test",
      label: "Four different companies, and the question each one answers",
      lines: [
        { text: "\"Why didn't this send?\"          →  your [[ESP]]", note: "Klaviyo, Mailchimp, Braze, HubSpot, Salesforce Marketing Cloud." },
        { text: "\"Why doesn't it trust us?\"       →  your [[DNS host]]", note: "Cloudflare, GoDaddy, Route 53. Where the proof of identity is published." },
        { text: "\"Why is it in spam?\"             →  the [[mailbox provider]]", note: "Gmail, Outlook, Apple Mail. They decide, and they do not tell you why." },
        { text: "\"Why did nobody buy?\"            →  [[you]]", note: "No platform has ever fixed this one." },
      ],
      caption:
        "An afternoon spent in the wrong one of these four is the most common wasted afternoon in email marketing.",
    },
    goesWrong:
      "Escalating a spam-folder problem to ESP support. They can see that they handed the message over successfully, which is nearly always true and nearly never the answer.",
    seeAlso: ["dns", "from-domain", "headers"],
  },
  {
    id: "from-domain",
    term: "From domain",
    stage: "build",
    level: "start",
    owner: "yours",
    short: "The domain after @ in the From address people see in their inbox.",
    sayIt: "The bit after the @ that customers actually read. Everything we prove has to match it.",
    long: "The From domain is what a recipient sees and, in practice, the only identity they judge. It is also the anchor for DMARC: the entire authentication apparatus exists to answer whether the proof on a message belongs to this specific domain. One message can carry three different domains, and only this one is visible.",
    aliases: ["from domain", "from address", "from line"],
    specimen: {
      basis: "spec",
      kind: "Email header",
      label: "Three domains, one message",
      lines: [
        { text: "From: Aurora Coffee <hello@[[aurora.com]]>", note: "The only address a human will ever see. Trust is decided here." },
        { text: "Return-Path: <bounce-9f3z@[[mail.aurora.com]]>", note: "The envelope. This is the domain SPF checks, and the recipient never sees it." },
        { text: "DKIM-Signature: v=1; a=rsa-sha256; s=kl;", muted: false },
        { text: "  d=[[aurora.com]]; h=from:subject:date; b=hT9k...", note: "The domain that signed the message. On a misconfigured setup this says your platform's domain instead of yours, and that is the whole bug." },
      ],
      caption:
        "Alignment — the check that fails while everything else passes — is simply the question of whether either of the bottom two domains matches the top one.",
    },
    goesWrong:
      "Sending as `hello@aurora.klaviyomail.com` or a bare `noreply@`. The first fails alignment and looks like a third party; the second tells every recipient that replies are unwelcome, which is a deliverability signal as well as a rude one.",
    whereItLives: [
      "Klaviyo → Settings → Domains and hosting → Sending domains",
      "Mailchimp → Website & Domains → Verified domains",
      "Braze → Settings → Email settings → Sending domains",
    ],
    notTheSameAs: [
      { thing: "The display name", delta: "“Aurora Coffee” is a label anyone can type. The domain is the part that is checked." },
      { thing: "Return-Path / envelope sender", delta: "Invisible to the recipient, and the domain SPF actually validates. They are frequently different on purpose." },
    ],
    rules: ["dkim-alignment-vs-dkim-passing"],
    seeAlso: ["alignment", "dmarc", "headers", "spf"],
  },
  {
    id: "transactional",
    term: "Transactional email",
    stage: "build",
    level: "working",
    owner: "yours",
    short: "Mail needed to complete a user action or account (receipts, resets) — not the same as a promo newsletter.",
    sayIt: "Receipts and password resets. Calling a promotion transactional to skip the rules does not work.",
    long: "A transactional message facilitates a transaction or an account relationship the recipient initiated. Marketing is promotional. The classification is decided by the content and purpose of the message, not by which template folder it was sent from, and mislabelling promotions to escape unsubscribe rules is a named enforcement target in several jurisdictions.",
    aliases: ["transactional", "transactional email", "service email"],
    specimen: {
      basis: "ours",
      kind: "The test",
      label: "Which one is this?",
      lines: [
        { text: "\"Your order #4471 has shipped\"                      [[TRANSACTIONAL]]", muted: false },
        { text: "\"Your order has shipped — and 20% off beans\"        [[MIXED]]", note: "Now it has a promotional purpose. The safe answer is to treat it as marketing." },
        { text: "\"Reset your password\"                              [[TRANSACTIONAL]]", muted: false },
        { text: "\"We miss you! Here's your cart\"                     [[MARKETING]]", note: "An abandoned-cart email is marketing everywhere, regardless of how automated it feels." },
        { text: "\"Important update to our privacy policy\"            [[DEPENDS]]", note: "Genuinely a service message. It stops being one the moment a product block appears in it." },
        { text: "", muted: true },
        { text: "Rule of thumb   if a promotion is the [[primary purpose]],", muted: false },
        { text: "                it is marketing, whatever you call it", muted: false },
      ],
    },
    goesWrong:
      "Adding a “you might also like” grid to the shipping confirmation because it converts well, and continuing to send it to people who have unsubscribed. That is the exact pattern regulators cite.",
    rules: ["transactional-vs-commercial-email-is-not-a-subject-line-trick"],
    seeAlso: ["can-spam", "opt-out", "consent"],
  },
  {
    id: "cema",
    term: "CEMA",
    stage: "build",
    level: "deep",
    owner: "yours",
    short: "Washington State law used against misleading commercial email subject lines — active lawsuit territory.",
    sayIt: "A Washington state law about subject lines. False urgency in a subject line is a live legal risk in the US, not just a taste question.",
    long: "Washington's Commercial Electronic Mail Act has been used against false or misleading subject lines, and the Washington Supreme Court has addressed what counts. The exposure is real for US consumer senders, because you do not choose whether you email Washington residents — your list does.",
    aliases: ["cema"],
    specimen: {
      basis: "ours",
      kind: "The test",
      label: "Subject lines that have drawn claims",
      lines: [
        { text: "\"[[FINAL HOURS]]\" — on a sale that ran again next week", note: "The urgency was not true. That is the whole theory of the case." },
        { text: "\"[[Your order]]\" — on a promotional send", note: "Implies a transaction that does not exist." },
        { text: "\"[[Re:]] our conversation\" — with no prior conversation", muted: false },
        { text: "\"[[You've been selected]]\" — for something everyone got", muted: false },
        { text: "", muted: true },
        { text: "The test is not whether it worked. It is whether it was [[true]].", muted: false },
      ],
    },
    goesWrong:
      "Running an evergreen “ends tonight” countdown that resets. It is the single most common conversion tactic in ecommerce email and it is the exact fact pattern.",
    rules: ["washington-misleading-subject-lines", "washington-cema-damages-reduced"],
    seeAlso: ["can-spam"],
  },
  {
    id: "one-click-unsub",
    term: "One-click unsubscribe",
    stage: "build",
    level: "working",
    owner: "esp",
    short: "Inbox apps can unsubscribe someone with one click using special email headers — no landing page required.",
    sayIt: "Gmail's own unsubscribe button. Our platform adds it, and it has to be two headers, not one.",
    long: "Gmail and Yahoo require bulk senders to support RFC 8058 one-click unsubscribe: a `List-Unsubscribe` header and a `List-Unsubscribe-Post` header. The mail app posts once and the person is out, with no landing page and no confirmation step. Mainstream platforms add both automatically on marketing sends.",
    aliases: ["one-click unsubscribe", "one click unsubscribe", "list-unsubscribe", "list unsubscribe", "rfc 8058"],
    specimen: {
      basis: "spec",
      kind: "Email header",
      label: "Both lines, or it does not count",
      lines: [
        { text: "List-Unsubscribe: <https://email.aurora.com/u/9f3z>,", muted: false },
        { text: "  <mailto:unsub@aurora.com>", note: "This header has existed since 1998. On its own it is not one-click and never was." },
        { text: "[[List-Unsubscribe-Post: List-Unsubscribe=One-Click]]", note: "This is the line that makes it RFC 8058. It is the one that is missing when a checker says you fail." },
      ],
      caption:
        "Half of RFC 8058 is not RFC 8058. If you only see the first header, the mail app will not show its own unsubscribe button.",
    },
    figures: [{ v: "2 days", k: "to process an unsubscribe", src: "Google and Yahoo sender guidelines" }],
    goesWrong:
      "A custom sending setup, or a transactional stream repurposed for marketing, that ships the first header and not the second. Your platform adds both to campaigns; it does not necessarily add them to whatever you built yourself.",
    checkIt: { how: "Paste a received message's headers and look for both lines", href: "/check/headers" },
    rules: ["one-click-unsubscribe-rfc-8058", "yahoo-requires-authentication-and-low-complaints", "gmail-bulk-sender-requirements"],
    seeAlso: ["opt-out", "headers", "bulk-sender"],
  },
  {
    id: "tracking-pixel",
    term: "Tracking pixel",
    stage: "build",
    level: "working",
    owner: "shared",
    short: "A tiny image in the email that loads when images load — used to guess opens.",
    sayIt: "The invisible image that tells us an email was opened. In some countries it needs its own consent.",
    long: "An open-tracking pixel is a 1×1 image with a URL unique to the recipient and the send. When the image loads, your platform records an open. Privacy features and image blocking have made the signal unreliable, and separately, some regulators treat placing it as an act that needs its own consent, distinct from consent to receive the email at all.",
    aliases: ["tracking pixel", "open pixel", "open-tracking", "open tracking", "pixel"],
    specimen: {
      basis: "example",
      kind: "In the message",
      label: "What is actually in your HTML",
      lines: [
        { text: "<img src=\"https://trk.aurora.com/o/[[9f3z-dana-2026030401]].gif\"", note: "That string identifies the individual person and the individual send. That is why it is personal data, not analytics." },
        { text: "     width=\"1\" height=\"1\" alt=\"\" style=\"display:none\">", muted: false },
        { text: "", muted: true },
        { text: "Every link is rewritten too:", muted: true },
        { text: "https://trk.aurora.com/c/[[9f3z-dana]]/?u=aurora.com%2Fcoffee", note: "Click tracking is the same mechanism and gets much less attention than it deserves." },
      ],
      caption:
        "France and Italy have both moved on this. The consent you have to send the email is not automatically consent to measure who read it.",
    },
    goesWrong:
      "Turning tracking off for France in the ESP and forgetting that link tracking is the same category of processing. Teams disable the open pixel and leave every URL rewritten.",
    whereItLives: [
      "Klaviyo → Settings → Email → Tracking",
      "Mailchimp → Campaign → Settings → Track opens",
    ],
    rules: ["france-email-open-tracking-consent", "italy-email-tracking-pixel-consent"],
    seeAlso: ["open-rate", "mpp", "gpc", "eprivacy"],
  },

  /* ───────────────────────── 3 · It leaves your building ───────────────── */
  {
    id: "dns",
    term: "DNS",
    stage: "send",
    level: "start",
    owner: "yours",
    short: "The internet's phone book — where you publish SPF, DKIM keys, and DMARC for your domain.",
    sayIt: "The public record of who is allowed to send email as us. We control it, not our email platform.",
    long: "DNS (the Domain Name System) holds the public records for your domain, and all four email authentication records live there. This is the one part of the stack your platform genuinely cannot do for you: they can tell you the value, but only whoever holds the domain can publish it.",
    aliases: ["dns"],
    specimen: {
      basis: "spec",
      kind: "DNS record",
      label: "The four email records on one domain",
      lines: [
        { text: "TYPE   NAME                      VALUE", muted: true },
        { text: "TXT    [[@]]                         v=spf1 include:_spf.google.com ~all", note: "SPF sits at the root. The host field is @ or blank, never \"spf\"." },
        { text: "TXT    [[kl._domainkey]]             v=DKIM1; k=rsa; p=MIIBIjANBgkq...", note: "One per selector, per vendor. \"kl\" is Klaviyo's." },
        { text: "TXT    [[_dmarc]]                    v=DMARC1; p=none; rua=mailto:...", note: "The policy. Underscore, exactly one record." },
        { text: "TXT    [[default._bimi]]             v=BIMI1; l=https://...", note: "Optional, and only worth publishing once DMARC is enforcing." },
      ],
      caption:
        "Every one of these is a TXT record and every one of them is publicly readable, on your domain and on your competitors'.",
    },
    whereItLives: [
      "Cloudflare → your domain → DNS → Records",
      "GoDaddy → Domain Portfolio → your domain → DNS",
      "AWS → Route 53 → Hosted zones → your domain",
    ],
    goesWrong:
      "The host field. Your platform gives you a value and a name, and someone pastes `_dmarc.aurora.com` into a provider that automatically appends the domain, producing `_dmarc.aurora.com.aurora.com`. The record exists, at an address nothing will ever query, and every checker reports nothing at all.",
    myth: {
      claim: "DNS changes take 24 to 48 hours.",
      truth:
        "That is registrar folklore from the 1990s. Propagation is governed by the TTL on the record, typically 300 to 3600 seconds. If it is not visible within an hour, it is wrong, not slow — and waiting a day is how a five-minute typo becomes a lost week.",
    },
    checkIt: { how: "Read every email record on any domain, live", href: "/check" },
    seeAlso: ["spf", "dkim", "dmarc", "bimi"],
  },
  {
    id: "spf",
    term: "SPF",
    stage: "send",
    level: "start",
    owner: "shared",
    short: "A public DNS list of servers allowed to send mail for your domain.",
    sayIt: "A public list of the servers allowed to send as us. Anything else looks like a forgery.",
    long: "SPF (Sender Policy Framework) is a DNS record naming which mail servers may send email for your domain. Receivers check the sending server's address against it. Your platform tells you what to add; publishing it is yours, and there can only ever be one SPF record on a domain.",
    aliases: ["spf"],
    specimen: {
      basis: "spec",
      kind: "DNS record",
      label: "One record, at the root of the domain",
      lines: [
        { text: "Name   [[@]]      (the root — not \"spf\", not \"_spf\")", muted: false },
        { text: "Type   TXT", muted: false },
        { text: "Value  v=spf1 include:_spf.google.com include:sendgrid.net [[~all]]", muted: false },
        { text: "", muted: true },
        { text: "~all   softfail — \"anything else is suspect\"", note: "The normal choice, and what most platforms tell you to publish." },
        { text: "-all   hardfail — \"anything else is forged\"", note: "Correct once you are certain you have listed every sender. Not before." },
        { text: "[[+all]]   \"anybody on earth may send as us\"", note: "Occasionally published by accident. It is strictly worse than having no SPF at all." },
      ],
      caption:
        "Each include: costs DNS lookups, and the limit is ten for the whole record. Vendor eleven is where a working setup silently breaks.",
    },
    figures: [
      { v: "10", k: "maximum DNS lookups", src: "RFC 7208 §4.6.4" },
      { v: "1", k: "SPF record per domain", src: "RFC 7208 §3.2" },
    ],
    goesWrong:
      "Two SPF records on one domain, usually because a second vendor was onboarded by a different team. That is a permanent error under the spec and it fails the check outright — the two records do not combine, they cancel. They must be merged into a single line.",
    myth: {
      claim: "SPF proves the email is from us.",
      truth:
        "It proves a listed server sent it, and it checks the invisible envelope domain, not the From line your customer reads. A message can pass SPF perfectly while the visible sender is somebody else entirely. Closing that gap is what alignment and DMARC are for.",
    },
    checkIt: { how: "Check SPF, the lookup count and +all on any domain", href: "/check" },
    notTheSameAs: [
      { thing: "DKIM", delta: "SPF vouches for the server that sent it. DKIM vouches for the message itself. Forwarding breaks SPF and usually survives DKIM." },
    ],
    rules: ["gmail-bulk-sender-requirements", "outlook-high-volume-sender-authentication", "icloud-rejects-bulk-mail-that-misses-sender-requirements"],
    seeAlso: ["dkim", "dmarc", "alignment", "dns"],
  },
  {
    id: "dkim",
    term: "DKIM",
    stage: "send",
    level: "start",
    owner: "shared",
    short: "A digital signature on each message that proves it was not altered and came from a domain that published a key.",
    sayIt: "A tamper-proof seal on every message. The receiver checks it against a key we publish publicly.",
    long: "DKIM (DomainKeys Identified Mail) attaches a cryptographic signature to outgoing mail, covering the body and a chosen set of headers. Receivers verify it against a public key in your DNS. “DKIM passing” means the signature is mathematically valid — which is not the same, and this trips up everybody, as the signature belonging to your domain.",
    aliases: ["dkim"],
    specimen: {
      basis: "spec",
      kind: "DNS record",
      label: "The key you publish, and the signature it verifies",
      lines: [
        { text: "Name   [[kl._domainkey]].aurora.com", note: "\"kl\" is the selector. Klaviyo uses kl and kl2, Mailchimp k1, Google google, Microsoft selector1. You cannot list selectors from DNS — you have to know them." },
        { text: "Type   TXT", muted: false },
        { text: "Value  v=DKIM1; k=rsa; [[p=MIIBIjANBgkqhkiG9w0BAQEFAAOC...]]", note: "An empty p= means the key is revoked, not present. Naive checkers report it as “DKIM found”." },
        { text: "", muted: true },
        { text: "and on the message itself:", muted: true },
        { text: "DKIM-Signature: v=1; a=rsa-sha256; [[d=aurora.com]]; s=kl;", note: "d= is the domain being vouched for. If this says your platform's domain rather than yours, DKIM passes and DMARC fails." },
      ],
    },
    goesWrong:
      "Removing or rotating a key while mail sent with it is still in flight, or in transit through a forwarder. Signatures verified after the key disappears simply fail, and the failure looks exactly like an attack.",
    myth: {
      claim: "DKIM passing means we are authenticated.",
      truth:
        "It means the signature is valid. It can be perfectly valid and belong to your platform's domain rather than yours, in which case DMARC fails while every dashboard shows green. This is the most common silent deliverability failure in existence.",
    },
    checkIt: { how: "Probe the selectors your platform actually uses", href: "/check" },
    rules: ["dkim-alignment-vs-dkim-passing", "gmail-bulk-sender-requirements"],
    seeAlso: ["alignment", "spf", "dmarc", "from-domain"],
  },
  {
    id: "tls",
    term: "TLS",
    stage: "send",
    level: "deep",
    owner: "esp",
    short: "Encryption in transit — mail is sent over a secure connection between servers.",
    sayIt: "The email is encrypted while it travels between servers. Our platform handles it.",
    long: "TLS (Transport Layer Security) encrypts the hop between mail servers. Gmail's sender guidelines expect it for mail sent to Gmail. Every mainstream platform does this and has for years; it only becomes your problem if somebody built a custom sending setup.",
    aliases: ["tls"],
    specimen: {
      basis: "spec",
      kind: "Email header",
      label: "How to tell, from a message you received",
      lines: [
        { text: "Received: from mail.aurora.com by mx.google.com", muted: false },
        { text: "  with [[ESMTPS]] id x9k2...", note: "ESMTPS — the S is the whole tell. Plain ESMTP means it travelled unencrypted." },
        { text: "  ([[version=TLS1_3]] cipher=TLS_AES_256_GCM_SHA384);", muted: false },
        { text: "  Tue, 4 Aug 2026 09:14:22 -0700 (PDT)", muted: true },
      ],
    },
    goesWrong:
      "Nothing, on a mainstream platform. On a self-hosted or legacy MTA, an expired certificate silently downgrades connections and Gmail starts refusing mail.",
    rules: ["gmail-bulk-sender-requirements"],
    seeAlso: ["headers", "ptr"],
  },
  {
    id: "ptr",
    term: "PTR / reverse DNS",
    stage: "send",
    level: "deep",
    owner: "esp",
    short: "A DNS record that maps an IP address back to a hostname — providers expect sending IPs to have valid reverse DNS.",
    sayIt: "The sending server's address has to resolve back to a real name. On a shared platform this is theirs, not ours.",
    long: "A PTR record lets a receiver look up an IP address and get a hostname back. Gmail and others expect sending IPs to have one, and expect it to agree with the forward lookup. On shared platform IPs the platform owns this entirely; on a dedicated IP it becomes somebody's job, and that somebody may be you.",
    aliases: ["ptr", "reverse dns", "reverse-dns", "rdns"],
    specimen: {
      basis: "spec",
      kind: "At the command line",
      label: "Forward and reverse must agree",
      lines: [
        { text: "$ dig +short -x 198.51.100.25", muted: true },
        { text: "[[mail.aurora.com.]]", note: "The IP resolves back to a name. That is the PTR." },
        { text: "$ dig +short mail.aurora.com", muted: true },
        { text: "[[198.51.100.25]]", note: "And the name resolves forward to the same IP. One direction is not enough — both, or it fails." },
      ],
    },
    goesWrong:
      "Taking a dedicated IP and never setting the PTR, because it is configured at the hosting provider rather than in your normal DNS panel and nobody thinks to look there.",
    rules: ["gmail-bulk-sender-requirements"],
    seeAlso: ["dedicated-ip", "dns", "tls"],
  },
  {
    id: "dedicated-ip",
    term: "Dedicated IP",
    stage: "send",
    level: "deep",
    owner: "shared",
    short: "A sending IP address used only by you — you own its reputation; setup is more work.",
    sayIt: "Our own sending address, with our own reputation. It only helps above a certain volume, and it needs warming up.",
    long: "On a dedicated IP your traffic alone shapes the reputation. Shared IPs pool many senders and the platform manages the neighbours. Dedicated means no bad neighbours and no borrowed goodwill either: you start from zero and have to build history, which is what warming is.",
    aliases: ["dedicated ip", "shared ip"],
    specimen: {
      basis: "example",
      kind: "The arithmetic",
      label: "A warm-up ramp, roughly",
      lines: [
        { text: "DAY     VOLUME    SEND TO", muted: true },
        { text: "1           50    clicked or bought in the [[last 30 days]]", note: "Clicks and orders, never opens. An open-based warm segment is half machines since 2021, which is the opposite of what warming needs." },
        { text: "3          500    clicked or bought in the last 30 days", muted: false },
        { text: "7        5,000    clicked or bought in the last 90 days", muted: false },
        { text: "14      50,000    clicked or bought in the last 180 days", note: "Only if the complaint rate held. If it moved you hold at this step; you do not push through it." },
        { text: "", muted: true },
        { text: "Enough volume to send [[consistently]], or stay shared", note: "There is no published threshold and we are not inventing one. The test is whether you send often enough to keep a pattern alive; a dedicated IP that sends twice a month has no reputation, only a gap." },
      ],
    },
    goesWrong:
      "Moving to a dedicated IP to fix a spam-folder problem. It does the opposite in the short term: you have discarded the shared pool's accumulated goodwill and replaced it with an unknown address, and the underlying cause — usually list quality — is untouched.",
    seeAlso: ["ptr", "complaint-rate", "sunset"],
  },

  /* ───────────────────────── 4 · The interrogation ─────────────────────── */
  {
    id: "bulk-sender",
    term: "Bulk sender",
    stage: "judge",
    level: "start",
    owner: "context",
    short: "Someone sending large volumes (providers often use ~5,000 messages/day to their users as a threshold).",
    sayIt: "Above five thousand a day to one provider, stricter rules apply. Most of us cross that line without noticing.",
    long: "Gmail, Yahoo and Microsoft publish extra requirements for high-volume senders to their consumer inboxes. The threshold is counted per day, to that one provider's users — not against your total list, and not per month. Below it you still need basic authentication; above it the requirements get specific and enforced.",
    aliases: ["bulk sender", "bulk senders", "high-volume", "high volume"],
    specimen: {
      basis: "example",
      kind: "The arithmetic",
      label: "Are you one? Almost certainly.",
      lines: [
        { text: "Your list                      180,000", muted: false },
        { text: "  of which Gmail addresses      94,000    (52%)", note: "Gmail is typically half a consumer list. Count it separately, because the provider does." },
        { text: "One campaign, sent Tuesday     [[94,000 to Gmail in a day]]", muted: false },
        { text: "", muted: true },
        { text: "Gmail's threshold                [[5,000/day]]", note: "You crossed it at nineteen times over, on one ordinary send." },
        { text: "", muted: true },
        { text: "A 12,000-person list still crosses it in one send.", note: "So does a 6,000-person list where most addresses are Gmail." },
      ],
      caption:
        "Per day, per provider. Not your list size, not your monthly total. This is the single most misread number in email.",
    },
    figures: [
      { v: "5,000/day", k: "Gmail personal accounts", src: "Google, Email sender guidelines" },
      { v: "5,000/day", k: "Outlook consumer accounts", src: "Microsoft, Outlook.com sender requirements" },
    ],
    myth: {
      claim: "We only have a few thousand subscribers, so bulk rules do not apply.",
      truth:
        "The count is messages to one provider in one day. A single campaign to six thousand people, half of them on Gmail, is three thousand Gmail messages — under the line that day, over it the moment you send twice. Authentication is required of everyone regardless.",
    },
    gauge: {
      label: "One ordinary campaign against Gmail's threshold",
      max: 100000,
      fmt: (n) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(n)),
      marks: [{ at: 5000, label: "Gmail's bulk threshold", hard: true }],
      you: { at: 94000, label: "94,000 to Gmail, one Tuesday" },
      note: "Drawn to scale, which is the point: the threshold is so far left that most senders cross it without ever deciding to. The threshold is Google's; the volume is an example.",
    },
    rules: [
      "gmail-bulk-sender-requirements",
      "yahoo-requires-authentication-and-low-complaints",
      "outlook-high-volume-sender-authentication",
      "icloud-rejects-bulk-mail-that-misses-sender-requirements",
    ],
    seeAlso: ["complaint-rate", "one-click-unsub", "spf", "dmarc"],
  },
  {
    id: "alignment",
    term: "Alignment",
    stage: "judge",
    level: "working",
    owner: "shared",
    short: "When the domain that passed SPF or DKIM matches the domain in your From line (what the inbox shows).",
    sayIt: "The check that what we proved is actually about us. This is the one that fails while everything else looks fine.",
    long: "Alignment asks whether the domain that authenticated is the same organisation's domain as the one in the From line. Mail can pass DKIM outright while DMARC still fails, because the valid signature belongs to your platform rather than to you. It is the most common cause of a message that sits in spam while every dashboard reports success.",
    aliases: ["alignment", "aligned", "dkim alignment", "spf alignment"],
    specimen: {
      basis: "spec",
      kind: "Email header",
      label: "Two passes and a failure, on one real message",
      lines: [
        { text: "Authentication-Results: mx.google.com;", muted: true },
        { text: "  spf=[[pass]]   smtp.mailfrom=[[mail.esp-vendor.com]]", note: "Passed. But it vouched for the vendor's envelope domain." },
        { text: "  dkim=[[pass]]  header.i=@[[esp-vendor.com]]", note: "Passed. But the signature is the vendor's, not yours." },
        { text: "  dmarc=[[fail]] (p=NONE) header.from=[[aurora.com]]", note: "And there it is. Nothing that passed belongs to aurora.com, so nothing vouched for the name in the inbox." },
      ],
      caption:
        "Both checks passed. DMARC still failed. Relaxed alignment accepts a subdomain (mail.aurora.com for aurora.com); strict requires an exact match.",
    },
    goesWrong:
      "Onboarding a new tool — a review platform, a survey tool, a helpdesk — that sends as your domain and signs with its own. Everything reports pass, DMARC quietly fails, and nobody looks until the numbers move.",
    checkIt: {
      how: "DNS cannot prove alignment. A received message can — paste its headers",
      href: "/check/headers",
    },
    notTheSameAs: [
      { thing: "DKIM passing", delta: "Passing means the signature is valid. Aligned means it is valid and belongs to your From domain. Only the second one satisfies DMARC." },
    ],
    rules: ["dkim-alignment-vs-dkim-passing", "dmarc-policy-none-is-not-enforcement"],
    seeAlso: ["dmarc", "dkim", "spf", "from-domain", "headers"],
  },
  {
    id: "dmarc",
    term: "DMARC",
    stage: "judge",
    level: "working",
    owner: "yours",
    short: "A DNS policy that tells receivers what to do when SPF/DKIM checks fail for your domain.",
    sayIt: "Our written instruction to Gmail about what to do with mail that fails our checks: ignore it, bin it, or refuse it.",
    long: "DMARC ties SPF and DKIM to the visible From domain and states, publicly, what a receiver should do when neither aligns. It can also request aggregate reports so you can see who is sending as you. The policy lives on your domain's DNS, which means no platform can publish it for you and no platform can get it wrong on your behalf.",
    aliases: ["dmarc"],
    specimen: {
      basis: "spec",
      kind: "DNS record",
      label: "The policy, and the three things it can say",
      lines: [
        { text: "Name   [[_dmarc]].aurora.com", muted: false },
        { text: "Value  v=DMARC1; [[p=none]]; rua=mailto:dmarc@aurora.com;", muted: false },
        { text: "       pct=100; adkim=r; aspf=r", muted: false },
        { text: "", muted: true },
        { text: "p=none         monitor only, deliver as normal", note: "Where every domain starts. It changes nothing about delivery, and tells you everything." },
        { text: "p=quarantine   failures go to the spam folder", muted: false },
        { text: "p=reject       failures are refused at the door", note: "The destination. Also the fastest way to break your invoicing tool if you arrive here without reading reports first." },
        { text: "", muted: true },
        { text: "adkim/aspf     r = relaxed (subdomains ok), s = strict", muted: false },
      ],
    },
    figures: [{ v: "1", k: "DMARC record per domain", src: "RFC 7489 §6.6.3" }],
    goesWrong:
      "Publishing p=reject on day one because a checklist said DMARC was required. Every forgotten sender — the invoicing platform, the recruiting tool, the CEO's newsletter plugin, the ticketing system — starts failing immediately, and you find out from the sales team rather than from a dashboard.",
    myth: {
      claim: "p=none does nothing, so skip to reject.",
      truth:
        "p=none plus a reporting address is the only way to discover who is currently sending as your domain, and there is always someone you have forgotten. It is the reconnaissance phase, and skipping it is precisely how the rollout to reject goes wrong.",
    },
    checkIt: { how: "Read the policy and whether anyone is reading the reports", href: "/check" },
    rules: ["dmarc-policy-none-is-not-enforcement", "dkim-alignment-vs-dkim-passing", "gmail-bulk-sender-requirements", "outlook-high-volume-sender-authentication"],
    seeAlso: ["alignment", "rua", "spf", "dkim", "bimi"],
  },
  {
    id: "bimi",
    term: "BIMI",
    stage: "judge",
    level: "deep",
    owner: "yours",
    short: "Optional branding — shows your logo in some inboxes if DMARC is strong enough.",
    sayIt: "Our logo next to the message in some inboxes. It is a reward for strong authentication, not a fix for anything.",
    long: "BIMI (Brand Indicators for Message Identification) can display your logo beside messages in supporting clients. It requires DMARC at quarantine or reject, a logo in a specific restricted SVG profile, and — at Gmail — a paid Verified Mark Certificate. It changes nothing about whether mail is delivered.",
    aliases: ["bimi"],
    specimen: {
      basis: "spec",
      kind: "DNS record",
      label: "Three prerequisites hiding in one record",
      lines: [
        { text: "Name   [[default._bimi]].aurora.com", muted: false },
        { text: "Value  v=BIMI1; l=https://aurora.com/bimi/[[logo.svg]];", note: "SVG Tiny PS only — a restricted profile, not the SVG your designer exports from Figma." },
        { text: "       a=https://aurora.com/bimi/[[vmc.pem]]", note: "The Verified Mark Certificate. Paid, renewed annually, and Gmail requires it." },
        { text: "", muted: true },
        { text: "And, before any of it counts:", muted: true },
        { text: "_dmarc must be at [[p=quarantine]] or [[p=reject]]", note: "p=none publishes a BIMI record that no client will ever act on." },
      ],
    },
    goesWrong:
      "Buying the certificate first. The VMC is the expensive part and the last part; without an enforcing DMARC policy it does nothing at all, and the policy is the part that takes months.",
    myth: {
      claim: "BIMI improves deliverability.",
      truth:
        "It does not. It is a display feature. What improves deliverability is the enforcing DMARC policy you had to build in order to qualify for it, which is a real benefit that gets misattributed.",
    },
    rules: ["bimi-is-optional-brand-display-not-a-bulk-mandate"],
    seeAlso: ["dmarc", "dns", "alignment"],
  },
  {
    id: "headers",
    term: "Email headers",
    stage: "judge",
    level: "working",
    owner: "context",
    short: "Hidden technical lines on a received message — authentication results, path, unsubscribe headers live here.",
    sayIt: "The hidden technical record at the top of a message. It is the only place that shows what actually happened.",
    long: "Headers are the metadata carried at the top of a raw email: Received, Authentication-Results, DKIM-Signature, List-Unsubscribe and dozens more. DNS shows what you published; headers show what you actually sent and what the receiver made of it. That is a different question, and it is usually the one you need answered.",
    aliases: ["headers", "raw headers", "message headers"],
    specimen: {
      basis: "spec",
      kind: "On screen",
      label: "Getting them out of a real inbox",
      lines: [
        { text: "Gmail        open the message → [[⋮]] → Show original → Copy to clipboard", muted: false },
        { text: "Outlook      File → Properties → [[Internet headers]]", muted: false },
        { text: "Apple Mail   View → Message → [[All Headers]]  (⌥⌘U)", muted: false },
        { text: "", muted: true },
        { text: "Do [[not]] forward the email to yourself instead.", note: "Forwarding rewrites the Return-Path and re-stamps the Received chain — it destroys exactly the evidence you were trying to collect." },
      ],
    },
    goesWrong:
      "Forwarding the message rather than copying the original. The forward carries your own authentication results, not the sender's, and every conclusion drawn from it is about the wrong message.",
    checkIt: { how: "Paste them and get a plain reading of what happened", href: "/check/headers" },
    seeAlso: ["alignment", "from-domain", "tls", "one-click-unsub"],
  },


  /* ───────────────────────── 5 · Reputation decides ────────────────────── */
  {
    id: "engagement",
    term: "Engagement",
    stage: "filter",
    level: "start",
    owner: "yours",
    short: "What recipients actually do with your mail — the signal providers weight most heavily when choosing the folder.",
    sayIt: "Whether people actually want our email. It decides the folder more than anything technical does, and it is not the open rate.",
    long: "Mailbox providers watch behaviour you cannot see: what a Gmail user does inside Gmail. Replies, clicks, dragging a message out of spam and reading without deleting all count for you. Reporting spam, deleting unread and long silence count against. Their picture of your audience is better than yours, which is exactly why your dashboard can look healthy while placement falls.",
    aliases: ["engagement", "engaged", "engagement signals", "engagement rate"],
    specimen: {
      basis: "ours",
      kind: "In your data",
      label: "What actually counts, and what you can see",
      lines: [
        { text: "FOR YOU      reply · click · [[drag out of spam]] · add to contacts", note: "Moving a message out of the spam folder is the strongest positive signal a person can send, and no dashboard will ever show it to you." },
        { text: "AGAINST YOU  [[Report spam]] · delete unread · months of silence", muted: false },
        { text: "NEITHER      the open, since September 2021", note: "Partly machines. Building a segment on it keeps the dead and drops the living." },
        { text: "", muted: true },
        { text: "You can see    opens (dirty) · clicks · unsubscribes · complaints", muted: false },
        { text: "They can see   [[all of that, plus everything above]]", note: "This asymmetry is the whole reason a send can look fine to you and land in spam." },
      ],
      caption:
        "No provider publishes how these are weighted. What every one of them publishes is the instruction to send to people who want it.",
    },
    goesWrong:
      "Building the “engaged” segment on opens. Since Apple began prefetching images, an inactive Apple Mail address looks engaged and a genuinely interested reader with images off looks dead, so the segment quietly inverts.",
    myth: {
      claim: "If our authentication is right, we will reach the inbox.",
      truth:
        "Authentication makes you eligible to be considered. It answers who you are, and every provider requires it. It says nothing about whether anyone wants the mail, and a perfectly authenticated message to a list nobody reads goes to spam. Passing SPF, DKIM, DMARC and alignment is the floor, not the outcome.",
    },
    rules: ["gmail-bulk-sender-requirements", "yahoo-requires-authentication-and-low-complaints", "inactive-recipients-need-a-sunset-policy"],
    seeAlso: ["reputation", "complaint-rate", "sunset", "mpp", "open-rate"],
  },
  {
    id: "reputation",
    term: "Sender reputation",
    stage: "filter",
    level: "working",
    owner: "yours",
    short: "The provider's running opinion of your domain and IP, built from how people have reacted to you over time.",
    sayIt: "Gmail's running opinion of us, built over months. One send does not create it, and one bad send can dent it.",
    long: "Every mailbox provider scores senders against their own history, at the domain and at the IP. Google retired the colour-coded reputation dashboards in Postmaster Tools, so what you can still read is spam rate, authentication results and delivery errors. Microsoft exposes per-IP data through SNDS. Nobody publishes the model, and the scores sold by third parties are somebody else's guess at it.",
    aliases: ["sender reputation", "reputation", "domain reputation", "ip reputation"],
    specimen: {
      basis: "spec",
      kind: "On screen",
      label: "What you can actually see, per provider",
      lines: [
        { text: "Google Postmaster   spam rate · auth results · delivery errors", muted: false },
        { text: "                    reputation dashboards: [[removed]]", note: "Google's stated reason was that reputation was not actionable for most senders. Spam rate always was the number." },
        { text: "Microsoft SNDS      per-IP complaint and trap data", muted: false },
        { text: "Microsoft JMRP      junk reports, message by message", muted: false },
        { text: "Yahoo               complaint feedback loop, on request", muted: false },
        { text: "Apple               [[no sender dashboard at all]]", note: "iCloud publishes requirements and no telemetry. You infer Apple placement or you do not know it." },
        { text: "", muted: true },
        { text: "Nobody publishes the score. You get inputs, never the verdict.", muted: false },
      ],
    },
    goesWrong:
      "Quoting a third-party “sender score” to a client as though it were the provider's opinion. It is a vendor's model of a number Google does not publish, and two vendors will disagree about the same domain on the same day.",
    myth: {
      claim: "Reputation is attached to our IP, so switching IPs resets it.",
      truth:
        "Domain reputation follows the domain, and at consumer providers it generally matters more than the IP. Moving to a new IP discards whatever goodwill the old one had and starts you at no history, while the domain carries its record with it. It is a way to make a new problem, not to leave an old one.",
    },
    whereItLives: [
      "Google Postmaster Tools → your domain → Spam Rate",
      "Microsoft SNDS → your IP range → Data",
    ],
    rules: ["google-postmaster-reputation-retired", "microsoft-snds-and-jmrp-expose-ip-and-junk-data", "complaint-feedback-loops-are-provider-specific"],
    seeAlso: ["engagement", "warmup", "complaint-rate", "dedicated-ip"],
  },
  {
    id: "warmup",
    term: "Warm-up",
    stage: "filter",
    level: "working",
    owner: "shared",
    short: "Building history on a new sending domain or IP by starting small with your most engaged people and rising gradually.",
    sayIt: "A new sending domain has no history at all. We start small with our best people and build up, because there is nothing yet to give us the benefit of the doubt.",
    long: "A sender with no record is not a sender with a good record. Providers have nothing to weigh, so they are cautious, and a large first send from an unknown domain looks exactly like the thing they are built to stop. Warming means earning a history: small volumes to the people most likely to react well, increasing only while the complaint rate holds.",
    aliases: ["warm-up", "warmup", "warming", "ramp"],
    specimen: {
      basis: "example",
      kind: "The arithmetic",
      label: "A ramp on a new domain, roughly",
      lines: [
        { text: "DAY     VOLUME    SEND TO", muted: true },
        { text: "1          200    [[clicked or bought]] in the last 30 days", note: "Clicks and orders, never opens. Since Apple began prefetching images an open is partly a machine, so a warm-up segment built on opens is partly machines — which is precisely the audience that cannot build you a reputation." },
        { text: "4        1,000    clicked or bought, last 30 days", muted: false },
        { text: "8        5,000    clicked or bought, last 90 days", muted: false },
        { text: "14      20,000    clicked or bought, last 180 days", muted: false },
        { text: "21+     full active list", note: "Only while the complaint rate holds. If it moves, you hold at the current step — you do not push through it." },
        { text: "", muted: true },
        { text: "There is no published ramp. This is the shape, not a standard.", note: "Every provider treats an unknown sender differently, and none of them tell you the thresholds." },
      ],
    },
    goesWrong:
      "Migrating platforms and sending the first campaign to the whole list from a brand-new subdomain on day one. The message is perfectly authenticated, the volume is normal for you, and to the provider it is a domain that did not exist last week sending fifty thousand messages.",
    myth: {
      claim: "We do not need to warm up, our list is clean and our DNS is perfect.",
      truth:
        "Neither of those is history. Clean data stops you being filtered for the wrong reasons; it does not create the record that makes a provider comfortable. Warm-up is not a hygiene step, it is the only way to acquire the thing being asked for.",
    },
    seeAlso: ["reputation", "engagement", "dedicated-ip", "from-domain"],
  },
  {
    id: "placement",
    term: "Inbox placement",
    stage: "filter",
    level: "working",
    owner: "context",
    short: "Where a message actually lands, decided per recipient — there is no single inbox rate for a campaign.",
    sayIt: "Where it lands is decided person by person, not campaign by campaign. There is no one inbox rate for a send.",
    long: "Placement is the outcome of the reputation question, and it resolves against each recipient's own history with you, at their own provider. The same campaign, in the same second, reaches one person's inbox and another's spam folder. That is why a single number for a send is a fiction, however confidently a tool reports one.",
    aliases: ["inbox placement", "placement", "inbox rate", "deliverability"],
    specimen: {
      basis: "example",
      kind: "The arithmetic",
      label: "One campaign, four verdicts, same second",
      lines: [
        { text: "Gmail    clicked twice this month              [[inbox]]", muted: false },
        { text: "Gmail    silent for fourteen months           [[spam]]", note: "Same message, same authentication, same second. The difference is the person's history, not the send." },
        { text: "Outlook  clicked last week                    [[inbox]]", muted: false },
        { text: "Outlook  new address, no history with you     [[junk]]", muted: false },
        { text: "", muted: true },
        { text: "\"Our inbox rate was 94%\"", note: "That is a sentence about a seed panel of addresses with no history, no purchases and no reason to want your mail. It is not a sentence about your recipients." },
      ],
    },
    goesWrong:
      "Treating “delivered” in your platform as “landed in the inbox”. Delivered means the receiving server accepted the message. The spam folder is a successful delivery, and every platform reports it as one.",
    notTheSameAs: [
      { thing: "Delivery rate", delta: "Delivery is whether the server accepted it. Placement is which folder it went to afterwards, and no platform can see that for you." },
    ],
    seeAlso: ["engagement", "reputation", "seed-test", "complaint-rate"],
  },

  /* ───────────────────────── 6 · The verdict ───────────────────────────── */
  {
    id: "hard-bounce",
    term: "Hard bounce",
    stage: "verdict",
    level: "start",
    owner: "esp",
    short: "A permanent failure — the address does not exist or will never accept mail. Stop sending.",
    sayIt: "That address does not exist. We stop sending to it immediately and permanently.",
    long: "A hard bounce is the receiving server saying the failure is permanent: unknown user, dead domain, blocked outright. Mainstream platforms suppress these automatically. Continuing to mail them is one of the clearest signals of a list nobody is maintaining.",
    aliases: ["hard bounce", "hard bounces", "permanent failure"],
    specimen: {
      basis: "spec",
      kind: "Email header",
      label: "The number tells you which kind it is",
      lines: [
        { text: "[[550]] 5.1.1 The email account that you tried to reach", muted: false },
        { text: "        does not exist.", note: "5xx = permanent. That is the entire rule: read the first digit." },
        { text: "[[550]] 5.7.1 Message rejected due to policy", muted: false },
        { text: "[[553]] 5.1.2 Domain name not found", muted: false },
        { text: "", muted: true },
        { text: "vs a soft bounce:", muted: true },
        { text: "[[452]] 4.2.2 Mailbox is over quota", note: "4xx = temporary. The server is asking you to come back later, not telling you to stop." },
      ],
      caption:
        "First digit 5, stop forever. First digit 4, try again. Everything else in bounce handling is detail.",
    },
    goesWrong:
      "Re-importing an old list that reintroduces addresses your platform already suppressed. Suppression lists exist for a reason and a CSV upload is how they get overruled.",
    rules: ["bounce-suppression-is-platform-specific"],
    seeAlso: ["soft-bounce", "spam-trap", "sunset"],
  },
  {
    id: "soft-bounce",
    term: "Soft bounce",
    stage: "verdict",
    level: "working",
    owner: "esp",
    short: "A temporary failure — full mailbox, downtime, or greylisting. May succeed later; rules differ by ESP.",
    sayIt: "A temporary failure. The platform retries, and after enough of them it gives up on the address.",
    long: "A soft bounce means the problem is temporary: mailbox full, server busy, greylisting. Platforms retry on their own schedules, and after some number of consecutive failures most convert the address to suppressed. There is no universal threshold — each platform documents its own, and they genuinely differ.",
    aliases: ["soft bounce", "soft bounces", "temporary failure"],
    specimen: {
      basis: "ours",
      kind: "In your data",
      label: "The shape that means \"stop\", not \"retry\"",
      lines: [
        { text: "dana@example.com   soft  soft  soft  soft  soft", note: "Five consecutive soft bounces to the same address is not a busy server. It is an abandoned mailbox that will become a recycled spam trap." },
        { text: "", muted: true },
        { text: "Every platform sets its own conversion threshold.", muted: true },
        { text: "There is no industry \"seven soft bounces\" rule.", note: "It is repeated constantly and it is not a standard. Read your own platform's documentation." },
      ],
    },
    goesWrong:
      "Assuming your platform's threshold matches the one from your last job. They differ, and a migration is exactly when a quietly decaying segment gets carried across intact.",
    rules: ["bounce-suppression-is-platform-specific"],
    seeAlso: ["hard-bounce", "spam-trap", "sunset"],
  },
  {
    id: "spam-trap",
    term: "Spam trap",
    stage: "verdict",
    level: "working",
    owner: "yours",
    short: "An address run by anti-spam operators to catch people who mail bad or stolen lists — hitting one hurts reputation.",
    sayIt: "An address that exists only to catch people mailing lists they should not have. Hitting one is a data problem, not a sending problem.",
    long: "Spam traps are not customers. Pristine traps were never real users and were published to be harvested; recycled traps were once real addresses, abandoned, and turned into traps after a long silence. A hit tells you something about where your addresses came from, or about how long you have kept mailing the dead.",
    aliases: ["spam trap", "spam traps", "spamtrap", "spamtraps"],
    specimen: {
      basis: "example",
      kind: "In your data",
      label: "What a trap looks like before it is a problem",
      lines: [
        { text: "added        [[2019-11-04]]   bulk import, 40,000 rows, one day", note: "A single large import with one timestamp is the signature of a list that was bought, scraped or merged from somewhere unaccountable." },
        { text: "last click   [[never]]", muted: false },
        { text: "last order   [[never]]", muted: false },
        { text: "bounces      none", note: "This is the tell. A dead address bounces. An address that accepts everything and reacts to nothing for six years is not a person." },
        { text: "", muted: true },
        { text: "Recycled traps take [[months]] of silence before activation.", note: "Which means a sunset policy is not hygiene theatre — it is the actual defence." },
      ],
    },
    goesWrong:
      "Chasing delisting after a blocklist hit without changing where addresses come from. Delisting removes the symptom; the same import will produce the same hit next quarter.",
    myth: {
      claim: "You can buy a list of spam traps and remove them.",
      truth:
        "The addresses are secret by design — publishing them would defeat the entire mechanism. Anyone selling a trap list is selling you something else. The only defence is where addresses come from and how quickly you stop mailing silence.",
    },
    rules: ["spam-trap-hits-mean-data-failure", "fix-the-cause-before-blocklist-removal"],
    seeAlso: ["sunset", "double-opt-in", "hard-bounce", "complaint-rate"],
  },

  /* ───────────────────────── 7 · A human reacts ────────────────────────── */
  {
    id: "complaint-rate",
    term: "Complaint rate / spam rate",
    stage: "react",
    level: "start",
    owner: "yours",
    short: "Share of people who hit “Report spam” — Gmail and Yahoo watch this closely (often stay under 0.3%).",
    sayIt: "The share of people who press Report spam. Three in a thousand is the line, and crossing it is what puts us in the spam folder.",
    long: "User-reported spam is the core reputation signal at every major provider, and it is measured per provider, not averaged across your programme. Google's bulk guidelines treat 0.30% as a line not to reach and ask senders to stay near 0.10%. It moves with list quality and send frequency, and not at all with how good the design is.",
    aliases: ["complaint rate", "spam rate", "user-reported spam", "spam complaint"],
    specimen: {
      basis: "example",
      kind: "The arithmetic",
      label: "How small the number actually is",
      lines: [
        { text: "Delivered to Gmail            94,000", muted: false },
        { text: "Pressed \"Report spam\"            [[310]]", muted: false },
        { text: "Spam rate                      [[0.33%]]", note: "Over Google's 0.30% line. Filtering starts, and it applies to everything you send afterwards." },
        { text: "", muted: true },
        { text: "Three hundred and ten people out of", muted: false },
        { text: "ninety-four thousand. That is the whole margin.", note: "This is why one badly-targeted send to a re-engagement segment can cost a quarter of recovery." },
        { text: "", muted: true },
        { text: "Target                          [[0.10%]]  (94 people)", muted: false },
      ],
    },
    figures: [
      { v: "0.30%", k: "the line you must not reach", src: "Google, Email sender guidelines" },
      { v: "0.10%", k: "where Google asks you to sit", src: "Google, Email sender guidelines" },
    ],
    whereItLives: [
      "Google Postmaster Tools → Spam Rate",
      "Microsoft SNDS → complaint data per IP",
    ],
    goesWrong:
      "Averaging across providers. Gmail measures your Gmail rate. Sitting at a comfortable 0.12% overall while Gmail alone is at 0.4% is identical, from Gmail's point of view, to sitting at 0.4%.",
    myth: {
      claim: "People who complain would have unsubscribed anyway, so it is the same thing.",
      truth:
        "It is not remotely the same. An unsubscribe removes one person. A complaint is a negative reputation event that affects delivery of every subsequent message to every other recipient at that provider. Making unsubscribe easy is how you convert the second into the first.",
    },
    gauge: {
      label: "Your Gmail spam rate against Google's published lines",
      max: 0.5,
      fmt: (n) => `${n.toFixed(2)}%`,
      marks: [
        { at: 0.1, label: "Google asks you to sit here" },
        { at: 0.3, label: "the line you must not reach", hard: true },
      ],
      you: { at: 0.33, label: "310 of 94,000" },
      note: "The whole playing field is half of one percent wide. Both marks are Google's own; the position of the marker is an example.",
    },
    rules: ["gmail-bulk-sender-requirements", "yahoo-requires-authentication-and-low-complaints", "google-postmaster-reputation-retired", "complaint-feedback-loops-are-provider-specific"],
    seeAlso: ["opt-out", "one-click-unsub", "sunset", "bulk-sender"],
  },
  {
    id: "opt-out",
    term: "Opt-out",
    stage: "react",
    level: "start",
    owner: "shared",
    short: "The person can stop your marketing email easily — and you must honour it.",
    sayIt: "The unsubscribe. It has to be easy, it has to be fast, and it has to apply everywhere we send from.",
    long: "Opt-out is the exit. Laws and mailbox providers set how fast you must stop, and they set different clocks: CAN-SPAM allows ten business days, Gmail and Yahoo expect bulk senders to process one-click requests within two. Honouring an opt-out is a separate obligation from whether you needed opt-in to begin with.",
    aliases: ["opt-out", "opt out", "unsubscribe"],
    specimen: {
      basis: "spec",
      kind: "The test",
      label: "What makes an unsubscribe non-compliant",
      lines: [
        { text: "Requires logging in                          [[NO]]", muted: false },
        { text: "Asks why before it will process              [[NO]]", note: "You may ask after. Not before, and not as a condition." },
        { text: "Charges a fee                                [[NO]]", muted: false },
        { text: "Only removes one campaign type by default    [[RISKY]]", note: "A preference centre is fine as long as \"all marketing\" is one visible click, not four." },
        { text: "One click, done, confirmation shown          [[YES]]", muted: false },
        { text: "", muted: true },
        { text: "CAN-SPAM      [[10 business days]]", muted: false },
        { text: "Gmail/Yahoo   [[2 days]] for one-click requests", muted: false },
        { text: "CASL          [[10 business days]]", muted: false },
      ],
    },
    goesWrong:
      "Honouring the unsubscribe in the marketing platform but not in the transactional tool, the SMS platform, or the sales sequencer. From the recipient's side it is one brand, and the second message after an unsubscribe is what turns a quiet exit into a complaint.",
    rules: ["one-click-unsubscribe-rfc-8058", "can-spam-penalty-per-email", "canada-casl-implied-consent-expires-and-unsubscribe-takes-ten-business-days", "australia-commercial-email-needs-consent-identity-and-a-working-unsubscribe"],
    seeAlso: ["one-click-unsub", "complaint-rate", "consent"],
  },
  {
    id: "mpp",
    term: "Apple MPP",
    stage: "react",
    level: "start",
    owner: "context",
    short: "Mail Privacy Protection — Apple preloads images so classic open tracking no longer means a human opened the email.",
    sayIt: "Since 2021 Apple loads the tracking image automatically. Our open rate counts machines, not people.",
    long: "Apple Mail Privacy Protection proxies and prefetches images for Apple Mail users who opted in, which fires the open pixel without anyone reading anything. Because Apple Mail is a large share of consumer email, a substantial part of every open rate since September 2021 is machinery. Platforms that feed those opens into engagement scoring or revenue attribution will flatter you.",
    aliases: ["mpp", "mail privacy protection", "apple mpp", "apple mail privacy"],
    specimen: {
      basis: "example",
      kind: "In your data",
      label: "How to see it in your own numbers",
      lines: [
        { text: "Open rate                        [[71%]]", note: "A number that should have made somebody suspicious." },
        { text: "Opens within 60s of delivery     [[68%]]", note: "Humans do not open at that rate within a minute. Machines do." },
        { text: "Apple Mail share of opens        [[52%]]", muted: false },
        { text: "Click-to-open ratio               [[1.3%]]", note: "This was around 9% before September 2021. The denominator inflated; the numerator did not." },
        { text: "", muted: true },
        { text: "The clicks are real. The opens are a mixture.", muted: false },
      ],
    },
    goesWrong:
      "Building the engagement segment on opens. A sunset policy driven by opens will keep machine-opened dead addresses and cut genuinely interested people who read in a client that blocks images.",
    myth: {
      claim: "You can filter MPP opens out and get a clean number back.",
      truth:
        "You can identify many of them and platforms do try. You cannot recover the pre-2021 metric, because a real Apple Mail user who genuinely read the email is indistinguishable from the prefetch. The correct response is to change which number you make decisions on, not to repair this one.",
    },
    rules: ["apple-mail-privacy-protection-open-rates", "klaviyo-mpp-counted-in-attribution"],
    seeAlso: ["open-rate", "tracking-pixel", "sunset", "holdout"],
  },

  /* ───────────────────────── 8 · It comes back as numbers ──────────────── */
  {
    id: "open-rate",
    term: "Open rate",
    stage: "count",
    level: "start",
    owner: "context",
    short: "Estimated share of emails “opened” — badly distorted by Apple Mail Privacy Protection and other auto-loads.",
    sayIt: "The number everyone still reports and almost nobody should be deciding anything with.",
    long: "Open rate counts a tracking pixel loading. Since privacy features began loading images automatically, that event no longer maps onto a person reading anything. It retains some value as a relative signal between two sends on the same audience in the same week; it has almost none as an absolute number.",
    aliases: ["open rate", "open rates", "opens"],
    specimen: {
      basis: "example",
      kind: "The arithmetic",
      label: "What the number is made of now",
      lines: [
        { text: "Reported opens                  66,740", muted: false },
        { text: "  Apple prefetch, no human       ~34,700", note: "Fired on delivery. Nobody read anything." },
        { text: "  Images blocked, human read it   [[not counted]]", note: "The error runs in both directions, which is why it cannot be corrected." },
        { text: "  Genuine, counted                 ~32,000", muted: false },
        { text: "", muted: true },
        { text: "Use instead:", muted: true },
        { text: "  clicks · replies · [[revenue against a holdout]]", note: "The last one is the only measure that survives contact with a finance team." },
      ],
    },
    goesWrong:
      "Comparing this quarter's open rate to a benchmark published before September 2021, or to another brand with a different Apple share. Both comparisons are arithmetic on incompatible units.",
    rules: ["apple-mail-privacy-protection-open-rates", "klaviyo-mpp-counted-in-attribution"],
    seeAlso: ["mpp", "tracking-pixel", "holdout"],
  },
  {
    id: "rua",
    term: "rua (DMARC reports)",
    stage: "count",
    level: "deep",
    owner: "yours",
    short: "An email address in your DMARC record where aggregate reports about your domain are sent.",
    sayIt: "A daily report from every major provider telling us who is sending email as us. Without it we are publishing policy blind.",
    long: "rua is the DMARC tag naming where receivers send aggregate XML reports. They arrive daily, from everyone, and they show which sources sent mail claiming your domain and whether the checks passed. Publishing DMARC without rua is publishing a policy you cannot evaluate.",
    aliases: ["rua", "dmarc reports", "aggregate reports"],
    specimen: {
      basis: "spec",
      kind: "In your data",
      label: "What the daily XML actually tells you",
      lines: [
        { text: "<source_ip>[[198.51.100.25]]</source_ip>", muted: false },
        { text: "<count>[[1420]]</count>", note: "1,420 messages sent as your domain, from an IP. Do you recognise it?" },
        { text: "<policy_evaluated>", muted: true },
        { text: "  <disposition>none</disposition>", muted: false },
        { text: "  <dkim>[[fail]]</dkim>  <spf>[[pass]]</spf>", note: "This is the forgotten-vendor pattern: SPF was updated for them, DKIM never was." },
        { text: "</policy_evaluated>", muted: true },
        { text: "", muted: true },
        { text: "Reports arrive [[daily]], from every major receiver.", muted: false },
      ],
      caption:
        "Nobody reads raw DMARC XML twice. Point rua at a parser, not at a human's inbox.",
    },
    goesWrong:
      "Setting rua to your own work address. Within a week it is hundreds of compressed XML attachments, it gets filtered, and the reason you published DMARC in the first place quietly stops happening.",
    notTheSameAs: [
      { thing: "ruf (forensic reports)", delta: "Per-failure copies of individual messages. Most large receivers do not send them, and they can contain recipient data, which is why most senders do not ask for them." },
    ],
    rules: ["dmarc-policy-none-is-not-enforcement"],
    seeAlso: ["dmarc", "alignment", "spf", "dkim"],
  },
  {
    id: "seed-test",
    term: "Seed test / seed list",
    stage: "count",
    level: "deep",
    owner: "context",
    short: "Sending to a panel of test inboxes to guess placement — scores vary wildly between tools.",
    sayIt: "Sending to a panel of test inboxes to guess where mail lands. Two tools will give two different answers.",
    long: "A seed test drops your campaign into a panel of provider inboxes and reports where it landed. The panels are small, they are not your recipients, and they have no engagement history — which is most of what placement is actually decided by. Two vendors routinely disagree about the same send.",
    aliases: ["seed test", "seed list", "seed panel", "inbox placement"],
    specimen: {
      basis: "example",
      kind: "The arithmetic",
      label: "The same campaign, two vendors, same hour",
      lines: [
        { text: "Vendor A   Gmail inbox   [[94%]]", muted: false },
        { text: "Vendor B   Gmail inbox   [[71%]]", note: "Same send, same hour. Different panels, different histories, different answers." },
        { text: "", muted: true },
        { text: "A seed address has [[no purchase history]] with you,", muted: false },
        { text: "no opens, no replies, no folder moves.", note: "Which is most of what Gmail actually uses to decide. The panel cannot model the thing it claims to measure." },
      ],
      caption:
        "Useful as one signal among several, especially before a large send. Never as a number to report as truth.",
    },
    goesWrong:
      "Reporting a seed score to a client as a placement percentage. It is a measurement of a panel, and when the next vendor's panel disagrees you have to explain both numbers.",
    myth: {
      claim: "A seed test tells you your inbox placement.",
      truth:
        "It tells you the placement of that panel's addresses. Real placement varies by recipient, by engagement history and by segment, which is exactly the variation a fixed panel cannot contain.",
    },
    seeAlso: ["complaint-rate", "holdout"],
  },
  {
    id: "holdout",
    term: "Holdout group",
    stage: "count",
    level: "deep",
    owner: "yours",
    short: "People intentionally excluded from email so you can measure whether email caused the revenue.",
    sayIt: "A group we deliberately do not email, so we can prove the revenue came from the email and not from the customer.",
    long: "A holdout is a control group excluded from a campaign or a channel so their behaviour can be compared to those who received it. Without one, “email revenue” is last-click storytelling: it counts people who would have bought anyway and attributes them to whichever message they touched last.",
    aliases: ["holdout", "holdouts", "holdout group", "control group"],
    specimen: {
      basis: "example",
      kind: "The arithmetic",
      label: "The number that survives a finance review",
      lines: [
        { text: "                 SIZE      REVENUE   PER HEAD", muted: true },
        { text: "Received email   90,000    £412,000    [[£4.58]]", muted: false },
        { text: "Holdout          10,000     £38,400    [[£3.84]]", note: "They bought anyway. This is the part last-click attribution silently claims as email's." },
        { text: "", muted: true },
        { text: "Attributed by platform      [[£412,000]]", muted: false },
        { text: "Actually caused by email     [[£66,600]]", note: "(4.58 − 3.84) × 90,000. Six times smaller, and the only figure that is true." },
      ],
    },
    goesWrong:
      "Running the holdout for one campaign and declaring a result. Incremental effects are small relative to weekly noise, so a single send is usually measuring the weather. Hold the group out for a period, not a message.",
    rules: ["klaviyo-holdout-group-400k-gate"],
    seeAlso: ["open-rate", "mpp", "seed-test"],
  },
  {
    id: "sunset",
    term: "Sunset / sunsetting",
    stage: "count",
    level: "working",
    owner: "yours",
    short: "Stopping or reconfirming people who have not engaged for a long time — protects reputation.",
    sayIt: "We stop emailing people who have ignored us for months. It sounds like losing a list; it is how the rest of it arrives.",
    long: "Sunsetting means ending regular marketing to contacts who have not engaged, usually after one re-permission attempt. Gmail and Yahoo both direct bulk senders towards willing recipients. There is no official number of days — you set the policy from your own cadence, and a weekly sender's threshold is not a quarterly sender's.",
    aliases: ["sunset", "sunsetting", "inactive", "inactivity"],
    specimen: {
      basis: "ours",
      kind: "In your data",
      label: "A policy, not a number someone read on a blog",
      lines: [
        { text: "Weekly sender     no [[click]] in 180 days      → sunset", note: "Clicks, not opens. Opens include machines, so an open-based rule keeps dead addresses and cuts live ones." },
        { text: "Monthly sender    no click in [[365]] days       → sunset", muted: false },
        { text: "", muted: true },
        { text: "Before removing:  one re-permission send, then stop", note: "One. A four-part \"we miss you\" series to people who have ignored you for a year is a complaint-rate event." },
        { text: "", muted: true },
        { text: "What it protects", muted: true },
        { text: "  recycled spam traps activate after [[months]] of silence", muted: false },
        { text: "  complaint rate falls because the audience wants it", muted: false },
      ],
    },
    goesWrong:
      "Building the rule on opens. Since 2021 an inactive Apple Mail address looks engaged and an engaged image-blocking reader looks dead, so an open-based sunset policy removes precisely the wrong people.",
    myth: {
      claim: "There is a standard 180-day rule.",
      truth:
        "There is not, and it is not published by any provider as a threshold. 180 days is a reasonable default for a weekly sender and meaningless for one that sends quarterly. Set it from your own cadence and write down why.",
    },
    rules: ["inactive-recipients-need-a-sunset-policy", "spam-trap-hits-mean-data-failure"],
    seeAlso: ["spam-trap", "complaint-rate", "mpp", "soft-bounce"],
  },
];

export const GLOSSARY_BY_ID = new Map(GLOSSARY.map((t) => [t.id, t]));

/** Terms in journey order, then by level within a stage. */
const STAGE_ORDER = new Map(STAGES.map((s, i) => [s.id, i]));
const LEVEL_ORDER: Record<TermLevel, number> = { start: 0, working: 1, deep: 2 };

export const GLOSSARY_IN_ORDER = [...GLOSSARY].sort(
  (a, b) =>
    (STAGE_ORDER.get(a.stage) ?? 0) - (STAGE_ORDER.get(b.stage) ?? 0) ||
    LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level] ||
    a.term.localeCompare(b.term),
);

export const GLOSSARY_AZ = [...GLOSSARY].sort((a, b) => a.term.localeCompare(b.term));

export function termsInStage(stage: StageId): GlossaryTerm[] {
  return GLOSSARY_IN_ORDER.filter((t) => t.stage === stage);
}

/**
 * The reading path. Not alphabetical, not a category — the order in which
 * the words actually explain each other. A week-one hire who reads these
 * ten in sequence can hold a conversation about deliverability.
 */
export const STARTER_PATH: string[] = [
  "esp",
  "from-domain",
  "dns",
  "spf",
  "dkim",
  "alignment",
  "dmarc",
  "consent",
  "bulk-sender",
  "engagement",
  "complaint-rate",
];

/** Longer aliases first so "double opt-in" wins over "opt-in". */
const ALIAS_LIST: { alias: string; term: GlossaryTerm }[] = GLOSSARY.flatMap((t) =>
  t.aliases.map((alias) => ({ alias: alias.toLowerCase(), term: t })),
).sort((a, b) => b.alias.length - a.alias.length);

/**
 * Split text into plain segments and term hits for inline definition UI.
 * Only the first occurrence of each term id is marked (readable, not noisy).
 */
export function segmentWithTerms(
  text: string,
): Array<{ type: "text"; value: string } | { type: "term"; value: string; term: GlossaryTerm }> {
  if (!text) return [{ type: "text", value: "" }];
  const used = new Set<string>();
  const out: Array<{ type: "text"; value: string } | { type: "term"; value: string; term: GlossaryTerm }> =
    [];
  let i = 0;
  const lower = text.toLowerCase();

  while (i < text.length) {
    let hit: { alias: string; term: GlossaryTerm; at: number } | null = null;
    for (const { alias, term } of ALIAS_LIST) {
      if (used.has(term.id)) continue;
      const at = lower.indexOf(alias, i);
      if (at === -1) continue;
      // word boundary-ish
      const before = at === 0 ? " " : lower[at - 1];
      const after = lower[at + alias.length] ?? " ";
      if (/[a-z0-9]/i.test(before) || /[a-z0-9]/i.test(after)) continue;
      if (!hit || at < hit.at || (at === hit.at && alias.length > hit.alias.length)) {
        hit = { alias, term, at };
      }
    }
    if (!hit) {
      out.push({ type: "text", value: text.slice(i) });
      break;
    }
    if (hit.at > i) out.push({ type: "text", value: text.slice(i, hit.at) });
    out.push({
      type: "term",
      value: text.slice(hit.at, hit.at + hit.alias.length),
      term: hit.term,
    });
    used.add(hit.term.id);
    i = hit.at + hit.alias.length;
  }
  return out;
}

/** Split a specimen line on [[accent]] markers. */
export function splitAccents(text: string): { value: string; accent: boolean }[] {
  const out: { value: string; accent: boolean }[] = [];
  const re = /\[\[(.+?)\]\]/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push({ value: text.slice(last, m.index), accent: false });
    out.push({ value: m[1], accent: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ value: text.slice(last), accent: false });
  return out.length ? out : [{ value: text, accent: false }];
}

/**
 * Shared vocabulary so a first-week marketer and a deliverability lead
 * can read the same page. short = tooltip; long = glossary page.
 */

export interface GlossaryTerm {
  id: string;
  /** Canonical display term */
  term: string;
  /** ≤ 22 words. No nested unexplained jargon. */
  short: string;
  /** 1–3 sentences for /glossary */
  long: string;
  /** Match variants in text (lowercased) */
  aliases: string[];
}

export const GLOSSARY: GlossaryTerm[] = [
  {
    id: "esp",
    term: "ESP",
    short: "Email service provider — the tool that sends your campaigns (e.g. Klaviyo, Mailchimp, Braze).",
    long: "An ESP (email service provider) is the platform you use to store contacts, build emails, and send them. It is not your website host and not Gmail. Examples: Klaviyo, Mailchimp, Braze, HubSpot, Salesforce Marketing Cloud.",
    aliases: ["esp", "esps", "email service provider", "email service providers"],
  },
  {
    id: "spf",
    term: "SPF",
    short: "A public DNS list of servers allowed to send mail for your domain.",
    long: "SPF (Sender Policy Framework) is a DNS record that says which mail servers may send email claiming to be from your domain. Receivers check it to spot fakes. You publish it once in DNS; your ESP usually tells you what to add.",
    aliases: ["spf"],
  },
  {
    id: "dkim",
    term: "DKIM",
    short: "A digital signature on each message that proves it was not altered and came from a domain that published a key.",
    long: "DKIM (DomainKeys Identified Mail) attaches a cryptographic signature to outgoing mail. Receivers verify it with a public key in DNS. “DKIM passing” means the signature checks out; that is not always the same as “aligned” with your From address.",
    aliases: ["dkim"],
  },
  {
    id: "dmarc",
    term: "DMARC",
    short: "A DNS policy that tells receivers what to do when SPF/DKIM checks fail for your domain.",
    long: "DMARC ties SPF and DKIM to your visible From domain and can ask receivers to quarantine or reject failing mail. It also can send you reports (rua) about who is sending as you. The policy lives on your domain’s DNS — no ESP can publish it for you.",
    aliases: ["dmarc"],
  },
  {
    id: "alignment",
    term: "Alignment",
    short: "When the domain that passed SPF or DKIM matches the domain in your From line (what the inbox shows).",
    long: "Alignment means the authenticating domain and the From domain are the same organisation’s domain (strict or relaxed rules). Mail can “pass DKIM” while DMARC still fails if the signature is for the ESP’s domain, not yours. That is a common silent spam-folder cause.",
    aliases: ["alignment", "aligned", "dkim alignment", "spf alignment"],
  },
  {
    id: "bulk-sender",
    term: "Bulk sender",
    short: "Someone sending large volumes (providers often use ~5,000 messages/day to their users as a threshold).",
    long: "Gmail, Yahoo and Microsoft publish extra rules for high-volume senders to their consumer inboxes. Thresholds are about messages per day to their users, not your total list size. Under the threshold you still need basic authentication; above it, rules get stricter.",
    aliases: ["bulk sender", "bulk senders", "high-volume", "high volume"],
  },
  {
    id: "soft-opt-in",
    term: "Soft opt-in",
    short: "A narrow legal exception: you may email existing customers about similar products if you offered opt-out at signup and in every message.",
    long: "Soft opt-in is not “anyone who bought once, forever.” In the EU/UK it is a limited path next to full consent: details collected in a sale (or negotiation), your own similar products/services, and a free opt-out at collection and in every email. Bought lists do not inherit it.",
    aliases: ["soft opt-in", "soft opt in", "soft-opt-in"],
  },
  {
    id: "double-opt-in",
    term: "Double opt-in",
    short: "The person confirms their email via a link before you add them to marketing — stronger proof they meant to join.",
    long: "Double opt-in (DOI) means after someone submits their address, they must click a confirmation email. It is best practice for list quality and strong evidence of consent. In some places it is not literally written into the statute but courts treat it as good proof.",
    aliases: ["double opt-in", "double opt in", "doi", "confirmed opt-in"],
  },
  {
    id: "opt-in",
    term: "Opt-in",
    short: "The person actively agreed to receive your marketing email before you send it.",
    long: "Opt-in means permission first. How strict that is depends on country: the EU generally needs a clear yes; the US federal CAN-SPAM is more opt-out oriented but still bans deception and requires working unsubscribes.",
    aliases: ["opt-in", "opt in", "opted in"],
  },
  {
    id: "opt-out",
    term: "Opt-out",
    short: "The person can stop your marketing email easily — and you must honour it.",
    long: "Opt-out is the unsubscribe path. Laws and mailbox providers set how fast you must stop (e.g. CAN-SPAM within 10 business days; Yahoo bulk wants List-Unsubscribe handled quickly). Honouring opt-out is separate from whether you needed opt-in to start.",
    aliases: ["opt-out", "opt out", "unsubscribe"],
  },
  {
    id: "one-click-unsub",
    term: "One-click unsubscribe",
    short: "Inbox apps can unsubscribe someone with one click using special email headers — no landing page required.",
    long: "Gmail and Yahoo require bulk senders to support RFC 8058-style one-click unsubscribe: List-Unsubscribe plus List-Unsubscribe-Post headers. The mail app posts once and the person is out. Your ESP usually adds this automatically if you send through them.",
    aliases: ["one-click unsubscribe", "one click unsubscribe", "list-unsubscribe", "list unsubscribe", "rfc 8058"],
  },
  {
    id: "hard-bounce",
    term: "Hard bounce",
    short: "A permanent failure — the address does not exist or will never accept mail. Stop sending.",
    long: "A hard bounce means the receiving server rejected the address as permanent (unknown user, invalid domain, etc.). ESPs usually suppress these automatically. Keep mailing them and you look like a spammer.",
    aliases: ["hard bounce", "hard bounces", "permanent failure"],
  },
  {
    id: "soft-bounce",
    term: "Soft bounce",
    short: "A temporary failure — full mailbox, downtime, or greylisting. May succeed later; rules differ by ESP.",
    long: "A soft bounce is a temporary problem. Providers retry; after several soft bounces some ESPs convert the address to suppressed. There is no universal “seven soft bounces” law — each ESP documents its own classifier.",
    aliases: ["soft bounce", "soft bounces", "temporary failure"],
  },
  {
    id: "spam-trap",
    term: "Spam trap",
    short: "An address run by anti-spam operators to catch people who mail bad or stolen lists — hitting one hurts reputation.",
    long: "Spam traps are not real customers. Pristine traps were never real users; recycled traps were abandoned addresses turned into traps. Hits usually mean bad collection, purchased lists, or mailing the long-dead. Fix the source of addresses; delisting alone does not fix the cause.",
    aliases: ["spam trap", "spam traps", "spamtrap", "spamtraps"],
  },
  {
    id: "complaint-rate",
    term: "Complaint rate / spam rate",
    short: "Share of people who hit “Report spam” — Gmail and Yahoo watch this closely (often stay under 0.3%).",
    long: "User-reported spam is a core reputation signal. Gmail’s bulk guidelines treat 0.3% as a line you must not reach and ask you to stay near 0.1%. It moves with list quality and send frequency, not with pretty design alone.",
    aliases: ["complaint rate", "spam rate", "user-reported spam", "spam complaint"],
  },
  {
    id: "open-rate",
    term: "Open rate",
    short: "Estimated share of emails “opened” — badly distorted by Apple Mail Privacy Protection and other auto-loads.",
    long: "Open rate counted a tracking pixel load as an open. Apple’s Mail Privacy Protection and similar features load images automatically, so opens are inflated or meaningless for large slices of the audience. Use clicks, purchases, and replies for decisions.",
    aliases: ["open rate", "open rates", "opens"],
  },
  {
    id: "mpp",
    term: "Apple MPP",
    short: "Mail Privacy Protection — Apple preloads images so classic open tracking no longer means a human opened the email.",
    long: "Apple Mail Privacy Protection (MPP) proxies and prefetches images, which fires open pixels without a real read. Platforms that still count those opens into revenue or engagement can flatter your numbers. Know how your ESP attributes MPP opens.",
    aliases: ["mpp", "mail privacy protection", "apple mpp", "apple mail privacy"],
  },
  {
    id: "casl",
    term: "CASL",
    short: "Canada’s anti-spam law — commercial email needs consent you can prove, plus identification and unsubscribe rules.",
    long: "CASL (Canada’s Anti-Spam Legislation) is strict: consent (express or limited implied types), sender identification, and unsubscribe timing. Penalties can be large. “They bought something years ago” is not automatically enough — clocks and proof matter.",
    aliases: ["casl"],
  },
  {
    id: "can-spam",
    term: "CAN-SPAM",
    short: "US federal rules for commercial email — honest subject lines, real postal address, working unsubscribe (opt-out model).",
    long: "CAN-SPAM does not require prior opt-in at the federal level, but it bans deceptive headers/subjects, requires a physical address, and requires honouring opt-out within 10 business days. State laws (e.g. Washington subject lines) can be tougher.",
    aliases: ["can-spam", "can spam"],
  },
  {
    id: "cema",
    term: "CEMA",
    short: "Washington State law used against misleading commercial email subject lines — active lawsuit territory.",
    long: "Washington’s Commercial Electronic Mail Act (CEMA), after court rulings, is used against false or misleading subject lines (e.g. fake urgency). Damages rules have changed; the risk is real for US consumer senders who email Washington residents.",
    aliases: ["cema"],
  },
  {
    id: "gpc",
    term: "GPC",
    short: "Global Privacy Control — a browser signal to opt out of sale/sharing of personal data, not automatically “stop all email.”",
    long: "GPC is a privacy signal browsers send. In California and Colorado it mainly affects sale/sharing and certain targeting uses. It is not the same as an email unsubscribe unless your own policy maps it that way. Do not invent a legal email ban the statute does not write.",
    aliases: ["gpc", "global privacy control"],
  },
  {
    id: "pecr",
    term: "PECR",
    short: "UK rules for electronic marketing — individuals generally need consent or a complete soft opt-in.",
    long: "PECR (Privacy and Electronic Communications Regulations) governs marketing calls, texts and emails in the UK. For individual subscribers, consent or soft opt-in conditions apply. Corporate subscribers are treated differently. The ICO enforces.",
    aliases: ["pecr"],
  },
  {
    id: "eprivacy",
    term: "ePrivacy",
    short: "EU rules (as a Directive) on electronic marketing and cookies — member countries implement details in national law.",
    long: "The ePrivacy Directive sets EU-wide ideas (consent for marketing email to people, soft opt-in exception) but countries implement differently. Always check the country you send into, not only “the EU” as one blob.",
    aliases: ["eprivacy", "e-privacy"],
  },
  {
    id: "ptr",
    term: "PTR / reverse DNS",
    short: "A DNS record that maps an IP address back to a hostname — providers expect sending IPs to have valid reverse DNS.",
    long: "PTR (pointer) records let receivers check that an IP’s reverse name matches forward DNS. Gmail and others expect this for sending IPs. On shared ESP IPs, the ESP owns PTR; on dedicated IPs, you or your host must set it.",
    aliases: ["ptr", "reverse dns", "reverse-dns", "rDNS", "rdns"],
  },
  {
    id: "tls",
    term: "TLS",
    short: "Encryption in transit — mail is sent over a secure connection between servers.",
    long: "TLS (Transport Layer Security) encrypts the hop between mail servers. Gmail’s sender guidelines expect TLS when sending to Gmail. Your ESP almost always handles this; custom MTAs must be configured.",
    aliases: ["tls"],
  },
  {
    id: "bimi",
    term: "BIMI",
    short: "Optional branding — shows your logo in some inboxes if DMARC is strong enough.",
    long: "BIMI (Brand Indicators for Message Identification) can display a logo next to messages in supporting clients. It generally needs DMARC at quarantine or reject and extra DNS/brand verification. It is not a spam filter fix.",
    aliases: ["bimi"],
  },
  {
    id: "dns",
    term: "DNS",
    short: "The internet’s phone book — where you publish SPF, DKIM keys, and DMARC for your domain.",
    long: "DNS (Domain Name System) stores public records for your domain. Email authentication records live there. Changes can take time to propagate. Your domain registrar or DNS host (Cloudflare, Route53, etc.) is where you edit them.",
    aliases: ["dns"],
  },
  {
    id: "from-domain",
    term: "From domain",
    short: "The domain after @ in the From address people see in their inbox.",
    long: "The From domain is what recipients trust visually (you@yourbrand.com). Authentication should align to that domain. Sending as you@esp-domain.com or misaligned signatures causes trust and DMARC problems.",
    aliases: ["from domain", "from address", "from line"],
  },
  {
    id: "seed-test",
    term: "Seed test / seed list",
    short: "Sending to a panel of test inboxes to guess placement — scores vary wildly between tools.",
    long: "Seed tests drop your campaign into many provider inboxes and report where it landed. Two tools often disagree. We do not sell seed scores; use them as one signal, not truth.",
    aliases: ["seed test", "seed list", "seed panel", "inbox placement"],
  },
  {
    id: "tracking-pixel",
    term: "Tracking pixel / open pixel",
    short: "A tiny image in the email that loads when images load — used to guess opens.",
    long: "An open-tracking pixel is usually a 1×1 image URL unique to the send or person. When it loads, the ESP records an “open.” Privacy features and image blocking make this unreliable; some countries require separate consent for this kind of tracking.",
    aliases: ["tracking pixel", "open pixel", "open-tracking", "open tracking", "pixel"],
  },
  {
    id: "sunset",
    term: "Sunset / sunsetting",
    short: "Stopping or reconfirming people who have not engaged for a long time — protects reputation.",
    long: "Sunsetting means you stop regular marketing (or re-permission) for inactive contacts. Gmail and Yahoo tell bulk senders to focus on willing recipients. There is no single official “180 days” number — you set a policy from your cadence and business.",
    aliases: ["sunset", "sunsetting", "inactive", "inactivity"],
  },
  {
    id: "rua",
    term: "rua (DMARC reports)",
    short: "An email address in your DMARC record where aggregate reports about your domain are sent.",
    long: "rua is a DMARC tag pointing to where receivers send aggregate XML reports. Without rua (or a reporting service), you publish policy blind. Reports show who is sending as your domain and whether checks passed.",
    aliases: ["rua", "dmarc reports", "aggregate reports"],
  },
  {
    id: "dedicated-ip",
    term: "Dedicated IP",
    short: "A sending IP address used only by you — you own its reputation; setup is more work.",
    long: "On a dedicated IP, your traffic alone shapes reputation. Shared IPs pool many customers (ESP manages neighbour risk). Dedicated needs careful warming and monitoring; shared is default for most mid-market brands.",
    aliases: ["dedicated ip", "dedicated IP", "shared ip", "shared IP"],
  },
  {
    id: "headers",
    term: "Email headers",
    short: "Hidden technical lines on a received message — authentication results, path, unsubscribe headers live here.",
    long: "Headers are metadata at the top of a raw email (Received, Authentication-Results, DKIM-Signature, List-Unsubscribe, etc.). You view them in Gmail “Show original” or similar. Pasting headers lets us see alignment on a real message, which DNS alone cannot prove.",
    aliases: ["headers", "raw headers", "message headers"],
  },
  {
    id: "holdout",
    term: "Holdout group",
    short: "People intentionally excluded from email so you can measure whether email caused the revenue.",
    long: "A holdout (control) group does not get the campaign or gets suppressed from a channel so you can compare behaviour. Some ESPs gate large holdouts behind list-size requirements. Without holdouts, “email revenue” is often last-click storytelling.",
    aliases: ["holdout", "holdouts", "holdout group", "control group"],
  },
  {
    id: "transactional",
    term: "Transactional email",
    short: "Mail needed to complete a user action or account (receipts, resets) — not the same as a promo newsletter.",
    long: "Transactional messages facilitate a transaction or account the user requested. Marketing is promotional. Mislabeling promos as transactional to skip unsubscribe rules is a common enforcement target (e.g. Australia). When in doubt, include unsubscribe and be honest about content.",
    aliases: ["transactional", "transactional email", "service email"],
  },
  {
    id: "consent",
    term: "Consent",
    short: "A clear, informed yes to marketing (rules vary by country) — silence or pre-ticked boxes are usually weak.",
    long: "Consent is permission. Quality matters: freestanding, informed, and recorded (who, when, what they saw). Bundling marketing into “I agree to terms” is a classic fine pattern in Europe.",
    aliases: ["consent", "permission"],
  },
];

export const GLOSSARY_BY_ID = new Map(GLOSSARY.map((t) => [t.id, t]));

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

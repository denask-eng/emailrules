/**
 * Display-layer rewrites for rules whose seed `plain` is still too dense.
 * Does not change sources or legal `answer` — only what humans read first.
 * Accuracy over cuteness; glossary still defines remaining terms.
 */

export interface PlainOverride {
  /** One sentence a junior can repeat to a founder. */
  tldr: string;
  /** Colleague-level plain; minimize unexplained acronyms. */
  plain: string;
  /** Explicit so-what for the job. */
  whyItMatters: string;
}

export const PLAIN_OVERRIDES: Record<string, PlainOverride> = {
  "gmail-bulk-sender-requirements": {
    tldr: "Gmail only trusts high-volume senders that prove who they are and keep “report spam” rare — under about 0.3%.",
    plain:
      "If you send a lot of mail to Gmail (Google’s bulk bar is about 5,000 messages a day to Gmail users), you must prove the mail is really from you and keep spam complaints low. That means public DNS records (SPF, DKIM, DMARC — see the dotted words), reverse DNS on sending IPs, encrypted delivery (TLS), and one-click unsubscribe on marketing mail. Google wants spam reports near 0.1% and treats 0.3% as the cliff. Under 5,000 a day you still need basic authentication — you do not get a free pass.",
    whyItMatters:
      "If this is wrong, Gmail can reject mail with a clear bounce code or quietly file you in spam. That shows up as “delivered” in your tool and silence from customers.",
  },
  "dkim-alignment-vs-dkim-passing": {
    tldr: "A green “DKIM pass” can still mean spam folder if the signature is not for the brand in the From line.",
    plain:
      "Your sending tool can sign mail with its own domain while the inbox shows you@yourbrand.com. Receivers may say the signature is valid (DKIM pass) but still fail the brand check called alignment — so DMARC fails and mail is untrusted. The fix is a branded sending domain so the signature matches what people see.",
    whyItMatters:
      "This is the classic “ESP says 100% delivered, humans never see it” bug. You only catch it in raw headers or a proper DMARC report.",
  },
  "yahoo-requires-authentication-and-low-complaints": {
    tldr: "Yahoo has the same kind of bulk rules as Gmail: authenticate, keep complaints under 0.3%, honour one-click unsubscribe fast.",
    plain:
      "Yahoo (and AOL on Yahoo’s stack) is not a footnote. High-volume senders need SPF and DKIM, a DMARC record, low spam-complaint rates (under 0.3% in their tools), and working List-Unsubscribe. Reverse DNS on sending IPs still matters. Treat Yahoo volume as its own cliff, not “whatever Gmail does.”",
    whyItMatters:
      "Brands that only watch Gmail get surprised when Yahoo and AOL placement falls. Complaint rate and auth are the levers.",
  },
  "outlook-high-volume-sender-authentication": {
    tldr: "Microsoft will bounce high-volume mail that is not authenticated — often with error 550 5.7.515.",
    plain:
      "If you send about 5,000+ messages a day to Outlook.com, Hotmail or Live combined, Microsoft wants SPF and DKIM, a DMARC record on your domain (even p=none counts for the requirement), and alignment. Unlike Gmail’s quieter spam sorting, Microsoft often rejects bad auth with a bounce you can see in logs.",
    whyItMatters:
      "Bounces are visible. If your DMARC record is missing on the root domain, this is often the first provider that hurts loudly.",
  },
  "one-click-unsubscribe-rfc-8058": {
    tldr: "Gmail and Yahoo want marketing mail to unsubscribe in one click from the inbox chrome — your ESP usually already does this.",
    plain:
      "One-click unsubscribe is the button or inbox control that removes someone without opening a webpage. Bulk senders must support special headers (List-Unsubscribe and List-Unsubscribe-Post). Mainstream ESPs add them automatically. You only DIY this if you send outside those tools.",
    whyItMatters:
      "Missing one-click is a bulk-sender fail. If you only send through Klaviyo/Mailchimp/Braze, this is usually already handled — confirm once, then move on.",
  },
  "canada-casl-commercial-email-needs-provable-consent": {
    tldr: "Canada needs consent you can prove — not US-style “mail until they unsubscribe.”",
    plain:
      "CASL (Canada’s email law) is stricter than US CAN-SPAM. You need express consent or a limited implied type the law lists, plus clear who-you-are text and a working unsubscribe. Keep records of what people saw when they joined. Penalties can be very large; treat Canadian addresses as high-stakes.",
    whyItMatters:
      "US playbooks on Canadian lists create legal and brand risk. If you cannot show consent, you should not send marketing there.",
  },
  "california-gpc-stops-sale-and-sharing-not-email": {
    tldr: "A GPC browser signal is mainly “stop selling/sharing my data for ads,” not “delete me from the newsletter” by default.",
    plain:
      "Global Privacy Control (GPC) is a browser setting that means opt out of sale or sharing of personal information under California rules. It is not automatically the same as unsubscribing from marketing email unless your privacy policy maps it that way. Honour GPC for ads/data sale; do not invent a full email ban the statute does not write.",
    whyItMatters:
      "Teams waste sprints wiring GPC into Klaviyo suppressions that the law may not require — or they ignore GPC on the ad side where it does matter.",
  },
  "apple-mail-privacy-protection-open-rates": {
    tldr: "Open rate is broken as a KPI for a huge slice of Apple users — stop managing the business on opens alone.",
    plain:
      "Apple Mail Privacy Protection loads images (and tracking pixels) before a human reads. Your “open rate” then counts machines, not attention. Use clicks, orders, replies, and proper tests. If your ESP still treats machine opens as real engagement, your automation and revenue stories can lie.",
    whyItMatters:
      "Founders still ask for open rate. You need a calm, citable answer and better metrics — or you optimise ghost opens forever.",
  },
  "klaviyo-mpp-counted-in-attribution": {
    tldr: "Klaviyo can credit revenue to an Apple machine open — so email revenue can look higher than reality vs Shopify.",
    plain:
      "By default, Klaviyo’s attribution can count Apple’s automatic opens as the touch that “earned” an order. Shopify will not tell the same story. Know the setting, know the gap, and do not promise finance a number that is half machine noise.",
    whyItMatters:
      "This is how email teams lose credibility in board decks. Fix the definition before you celebrate lift.",
  },
  "spam-trap-hits-mean-data-failure": {
    tldr: "Hitting a spam trap means your list source or hygiene failed — not bad luck.",
    plain:
      "Spam traps are addresses anti-spam operators watch. Some were never real people; some were abandoned inboxes reborn as traps. You hit them by buying lists, scraping, or mailing the dead for years. Fix how you collect and clean addresses; begging for delisting without that fix fails.",
    whyItMatters:
      "Trap hits burn domain and IP reputation. Campaigns that “used to work” stop landing. The root cause is almost always data, not the template.",
  },
  "inactive-recipients-need-a-sunset-policy": {
    tldr: "Stop regular marketing to people who never engage — or re-ask permission. There is no magic universal day count from Gmail.",
    plain:
      "Gmail and Yahoo tell bulk senders to focus on people who want the mail. Sunsetting means you pause or reconfirm long-inactive contacts. Pick a window that fits your cadence (a weekly brand and a quarterly brand differ). Write the policy down. Do not invent “Gmail requires 90 days.”",
    whyItMatters:
      "Dead weight on the list drives complaints, traps, and weak engagement signals. A written sunset is adult list hygiene.",
  },
  "france-email-open-tracking-consent": {
    tldr: "In France, agreeing to get your email is not the same as agreeing to be tracked with an open pixel.",
    plain:
      "French guidance treats open-tracking pixels as needing their own clear yes when used to optimise marketing. If someone never agreed to tracking, send the same email without the pixel — do not punish them by unsubscribing. Most ESPs cannot do per-person pixel-off easily; that gap is your problem, not a checkbox in settings.",
    whyItMatters:
      "EU brands (and anyone mailing France) risk non-compliance and ugly vendor surprises. Ask your ESP in writing whether pixel-free sends exist.",
  },
  "italy-email-tracking-pixel-consent": {
    tldr: "Italy follows France: from 29 Oct 2026, tying an open to a named person needs consent — aggregate open counts do not.",
    plain:
      "Italy is adopting the same idea as France: you may measure opens in bulk without naming people. Linking “this person opened” for marketing needs a clear yes. Plan for per-person pixel control or no-pixel sends before the date, not after a complaint.",
    whyItMatters:
      "If you sell into Italy and your ESP only has all-or-nothing open tracking, that is a product gap — not a footnote.",
  },
  "eprivacy-email-consent-soft-optin": {
    tldr: "In the EU, marketing email needs a yes — soft opt-in is only for your own similar products after a sale, with opt-out at capture.",
    plain:
      "EU ePrivacy rules mean commercial email needs consent first. Soft opt-in is the narrow exception: your own customers, similar products or services, address collected during a sale, and an easy opt-out offered then and later. Bought lists and “legit interest for everyone” are not the same thing.",
    whyItMatters:
      "US-style “mail until unsubscribe” on EU contacts is how teams get complaints, fines risk, and blocked campaigns.",
  },
  "washington-misleading-subject-lines": {
    tldr: "In Washington, a false subject like “Today only” on a multi-day sale is treated as a consumer-protection violation — not cute marketing.",
    plain:
      "Washington’s commercial email law hits misleading subject lines hard. Urgency that is not true (fake deadlines, fake scarcity) is not “copywriting licence” there. Fix the subject, not just the footer.",
    whyItMatters:
      "Exposure scales with volume and class actions. Clever subjects that lie are a legal risk, not a growth hack.",
  },
  "washington-cema-damages-reduced": {
    tldr: "Washington cut statutory damages per email from $500 to $100 (June 2026) — still dangerous at list scale.",
    plain:
      "Damages per violating email in Washington fell from $500 to $100 for cases from that date, including older sends newly filed. Good news on the per-message number; bad news is the same: volume × class size still multiplies fast.",
    whyItMatters:
      "Do not read “lower damages” as “safe to run grey subjects.” Clean copy is still cheaper than litigation.",
  },
  "eu-ai-act-article-50-marketing-email": {
    tldr: "A human-reviewed AI draft of a normal promo usually needs no AI label — photorealistic AI product images often do.",
    plain:
      "EU AI Act marketing rules are narrower than vendor scare decks. An AI-written email a human could reject is ordinary marketing, not “public interest deepfake.” What often needs disclosure is photorealistic synthetic imagery of products or people. Check your creative pipeline, not only your ESP.",
    whyItMatters:
      "Teams waste budget on blanket “AI generated” footers that the law may not require — or ship fake product shots with no disclosure.",
  },
  "google-postmaster-reputation-retired": {
    tldr: "Google removed the colour reputation badges in Postmaster — spam rate, auth, and delivery errors still matter.",
    plain:
      "Google retired the red/yellow/green domain and IP reputation charts because most senders could not act on them. Spam complaint rate, authentication results, and delivery error data remain. Stop chasing a colour; watch the numbers that still exist.",
    whyItMatters:
      "If your weekly ops deck still says “Postmaster green,” update the process before leadership thinks the world ended.",
  },
  "klaviyo-holdout-group-400k-gate": {
    tldr: "Honest email lift needs holdouts — Klaviyo’s free holdout tool needs about 400,000 profiles; most brands are under that.",
    plain:
      "Holdout groups are how you prove email caused revenue instead of taking credit for people who would have bought anyway. Klaviyo offers holdouts free above a large profile threshold (~400k). Smaller brands need another method (manual holds, geo splits, careful tests) or they should stop overstating causal lift.",
    whyItMatters:
      "Without holdouts, “email revenue” is often correlation. Finance will eventually notice.",
  },
  "apple-intelligence-email-summaries": {
    tldr: "Apple can show its own summary of your email where the preheader used to win attention — many people never open.",
    plain:
      "Apple Intelligence rewrites a short summary of the message in the inbox. That text is not your preheader and not under your full control. Lead with clear subject + first lines that survive summarisation; do not bury the offer three paragraphs down.",
    whyItMatters:
      "Open rate was already broken for many Apple users. Now even the preview slot can be machine-written. Subject and structure matter more.",
  },
  "eu-accessibility-act-marketing-email": {
    tldr: "The EU Accessibility Act as written targets e-commerce services (sites/checkout) — it does not name marketing email as a covered product.",
    plain:
      "Vendors sold panic that every newsletter must be WCAG-perfect by June under the European Accessibility Act. The Directive text focuses on e-commerce services (website and checkout style products), not a line that says “all marketing email.” Accessible email is still good practice and may be required by contracts or other rules — but do not confuse sales decks with the statute.",
    whyItMatters:
      "Budget the right work: fix the storefront path the law covers; improve email accessibility for users without paying for fake urgency.",
  },
  "can-spam-penalty-per-email": {
    tldr: "US CAN-SPAM does not require opt-in — it requires honest subjects, a physical address, and a working unsubscribe within ten business days.",
    plain:
      "Unlike much of Europe, US federal law lets you email commercial messages without prior consent if you meet the rules: no deceptive From/subject, a real postal address, clear commercial nature when required, and honour unsubscribe within ten business days. Civil penalties are quoted per email (the inflation-adjusted figure changes), which is why volume matters.",
    whyItMatters:
      "EU playbooks over-block US lists; US playbooks under-protect EU lists. Know which law you are actually under.",
  },
  "bounce-suppression-is-platform-specific": {
    tldr: "There is no universal “soft bounce seven times” rule — Klaviyo, Mailchimp, and Braze each define bounce differently.",
    plain:
      "Hard bounces (bad addresses) should never be retried. Soft bounces (full mailbox, temporary fails) are classified by your ESP’s own rules. Copying a blog’s “suppress after seven” will misstate at least one of your tools. Read your ESP’s bounce docs and align suppressions to that product.",
    whyItMatters:
      "Wrong suppression either hammers dead addresses (reputation damage) or drops recoverable ones (lost revenue).",
  },
  "fix-the-cause-before-blocklist-removal": {
    tldr: "A blocklist hit is a signal, not a fine — fix the cause first; paid delisting without that is theatre.",
    plain:
      "Spamhaus and similar lists are data receivers may use. Shared IP problems often belong with your ESP ticket queue. Your domain on a domain blocklist is usually your list hygiene, traps, or compromised form. Stop the behaviour, then request delisting. Paying a middleman first rarely sticks.",
    whyItMatters:
      "Teams burn budget on delist services while the signup form still feeds traps every night.",
  },
  "signup-forms-need-anti-automation-controls": {
    tldr: "Bots will stuff your form with junk and spam traps — CAPTCHA, rate limits, and double opt-in protect the list.",
    plain:
      "Automated signups dump fake or trap addresses onto your file. You then mail them and take the reputation hit. Use bot resistance (CAPTCHA or equivalent), rate limits, and preferably double opt-in for cold acquisition. “Fewer form fields” is not a reason to skip this.",
    whyItMatters:
      "Deliverability crises often start on the form, not in the campaign builder.",
  },
  "icloud-rejects-bulk-mail-that-misses-sender-requirements": {
    tldr: "iCloud can reject bulk mail that fails Apple’s sender rules — and you will not get a classic spam-complaint feedback loop.",
    plain:
      "Apple’s bulk path expects solid authentication and hygiene. Failures often look like bounces or silence, not a complaint dashboard. There is no reliable public “send this many per hour” number from Apple — vendors inventing one are guessing. Authenticate, keep lists clean, watch bounce codes.",
    whyItMatters:
      "Brands that only instrument Gmail/Yahoo miss Apple failures until revenue in iCloud-heavy segments drops.",
  },
  "microsoft-snds-and-jmrp-expose-ip-and-junk-data": {
    tldr: "Microsoft SNDS/JMRP show Outlook IP health and junk reports — they diagnose; they do not auto-fix delivery.",
    plain:
      "Smart Network Data Services (SNDS) and Junk Mail Reporting Program (JMRP) let you see how Outlook views your IPs and when users junk you. Dedicated-IP senders should enroll. Shared-IP senders usually need the ESP to own or share that data. Reading the charts without fixing auth, complaints, or list quality changes nothing.",
    whyItMatters:
      "Outlook is huge B2B and consumer. Flying blind without SNDS is optional ignorance for high-volume programs.",
  },
  "gmail-promotions-annotations-are-eligible-not-guaranteed": {
    tldr: "Gmail promo annotations can make a deal look richer — they are not a promise of placement and do not fix spam rate.",
    plain:
      "Product carousels and offer annotations in Gmail’s Promotions tab are eligibility features. Google does not guarantee every recipient sees them. They do not move you out of Promotions or replace authentication and low complaints.",
    whyItMatters:
      "Do not sell leadership “we’ll get annotations so inbox improves.” Annotations ≠ deliverability.",
  },
  "colorado-gpc-stops-sale-and-cross-site-targeting": {
    tldr: "In Colorado, a GPC signal means stop sale and stop targeted advertising — not automatic newsletter deletion unless you designed that.",
    plain:
      "Colorado’s privacy rules treat Global Privacy Control as an opt-out of sale and targeted ads. Marketing email is a separate channel unless your policy or tooling maps GPC into suppressions. Honour GPC where the law points; do not invent an email ban you never promised — or ignore ad-side duties you do have.",
    whyItMatters:
      "Same trap as California: wrong team owns the signal, wrong system gets wired.",
  },
  "maryland-restricts-default-profiling-of-minors": {
    tldr: "In Maryland, default ad-style profiling of known under-18s is restricted — fix age capture and suppress abuse, do not panic-wipe every family account.",
    plain:
      "If you know a Maryland resident is under 18, do not run default targeted profiling the way adult ad systems do. Capture age carefully, suppress high-risk marketing use, and involve privacy/legal for edge cases. Blanket deleting every household with a teen is usually over-reaction; ignoring known minors is under-reaction.",
    whyItMatters:
      "Kids-and-ads rules are political and litigious. Email teams get pulled in when CRM holds age flags.",
  },
  "canada-casl-implied-consent-expires-and-unsubscribe-takes-ten-business-days": {
    tldr: "Canadian implied consent expires (about two years after a purchase, shorter for inquiries) — unsubscribes must complete within ten business days.",
    plain:
      "Under CASL, implied consent is time-limited: roughly two years after certain purchases or six months after inquiries (check the exact statutory basis for your case). Express consent lasts until withdrawn. Honour unsubscribes within ten business days at most. “They bought once in 2019” is not forever.",
    whyItMatters:
      "Expired implied consent is a silent landmine for legacy lists and migration projects.",
  },
  "uk-pecr-email-needs-consent-or-a-complete-soft-opt-in": {
    tldr: "UK marketing email needs consent or a complete soft opt-in (sale, similar products, opt-out at capture and in every mail) — bought lists fail on arrival.",
    plain:
      "UK PECR rules: get consent, or use soft opt-in only when every part fits — contact details obtained in a sale or negotiation of a sale, similar products or services, opt-out offered at collection and in every message. Purchased lists are not soft opt-in. Charities have a narrow extra route; do not copy it for commerce.",
    whyItMatters:
      "UK is not “almost like the US.” Soft opt-in is a four-part lock, not a vibe.",
  },
  "germany-marketing-email-needs-express-consent-or-the-four-part-customer-exception": {
    tldr: "Germany defaults to express consent for marketing email — B2B is not a free pass; the customer exception is four strict conditions.",
    plain:
      "German practice expects express consent for marketing email, often proven with double opt-in. There is a customer exception with several cumulative conditions (existing customer relationship, similar goods, opt-out at collection and later, etc.). “It’s B2B so fine” is a myth that fails audits.",
    whyItMatters:
      "German addresses on a US Klaviyo account are a common compliance blind spot for global brands.",
  },
  "australia-commercial-email-needs-consent-identity-and-a-working-unsubscribe": {
    tldr: "Australia needs consent, clear identity, and a working unsubscribe actioned within five business days — fake “transactional” promos get fined.",
    plain:
      "Australia’s Spam Act expects consent (express or inferred under their rules), accurate sender identity, and a functional unsubscribe you honour quickly (five business days is the classic bar). Labelling a promo as transactional to skip the rules is how regulators write press releases.",
    whyItMatters:
      "APAC lists are often an afterthought on US tools. Australia is not “same as CAN-SPAM.”",
  },
  "eu-b2b-email-has-no-blanket-legitimate-interest-permission": {
    tldr: "There is no EU-wide “B2B legitimate interest” free pass — France may allow careful B2B; Germany still wants consent or the customer exception.",
    plain:
      "Member States differ. Some B2B email can rest on legitimate interest or professional contact rules with easy opt-out in places like France; Germany is far stricter. “We’re B2B so GDPR is fine” is not a strategy. Map the country of the recipient, not only your HQ.",
    whyItMatters:
      "One Klaviyo segment labelled “EU B2B” without country logic is how legal risk hides in a filter name.",
  },
};

export function displayPlain(slug: string, fallback: string): string {
  return PLAIN_OVERRIDES[slug]?.plain ?? fallback;
}

export function displayTldr(slug: string, fallbackPlain: string): string {
  if (PLAIN_OVERRIDES[slug]?.tldr) return PLAIN_OVERRIDES[slug].tldr;
  const first = fallbackPlain.split(/(?<=[.!?])\s+/)[0] ?? fallbackPlain;
  return first.length > 180 ? `${first.slice(0, 177)}…` : first;
}

export function displayWhy(slug: string, fallback: string): string {
  return PLAIN_OVERRIDES[slug]?.whyItMatters ?? fallback;
}

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

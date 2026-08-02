/**
 * Sitewide FAQ — honest, slightly rude, actually human.
 * Headlines stay plain single questions. Density lives in the answers.
 * Order: who → shelf → not-that → trust → product.
 */

export type FaqItem = {
  q: string;
  a: string;
};

export const SITE_FAQ: FaqItem[] = [
  {
    q: "Who is this actually for?",
    a: "People who ship email and are too busy to re-read every PDF: week-one marketers, lifecycle/CRM, deliverability, multi-country ops, DTC brands, agencies — on Klaviyo, Mailchimp, Braze, HubSpot, SFMC, or something else. Pick your tool and geos so product-specific pages only appear when they match. EU and UK are first-class filters. Not for people who sell tools about email and need a fake score to demo.",
  },
  {
    q: "Why only ~35 rules? Isn’t that… thin?",
    a: "On purpose. A wall of 400 undated “best practices” is how you look busy and still get burned. Every page needs a primary source we actually read. Thin and checkable beats fat and folklore. Europe is on the shelf (ePrivacy, France/Italy tracking, Germany consent, EU B2B, AI Act, accessibility reality-check, UK PECR) — not every Member State. Coverage map lists geos and what we still refuse to invent.",
  },
  {
    q: "Is this legal advice?",
    a: "No. If it were, you’d have a billable hour and a longer PDF. This is a dated operator reference written by an email geek. Confirm anything high-stakes with counsel who knows your facts. Same for “will this make me compliant?” — no tool does that. Lawyers and judges do. We say what the sources say and what to do first on Monday.",
  },
  {
    q: "Why no trust score out of 100?",
    a: "Because we refuse to invent a number you can’t audit. Fake scores sell seed tests and panic. You get findings, dates, and links. If that feels less exciting than a red dial, good — you’re not the red-dial customer.",
  },
  {
    q: "Why should I trust you more than my ESP’s blog?",
    a: "ESPs sell seats. AI invents citations when nobody watches. We sell nothing today — no pixels, no seed tests, no affiliate — so we can say “your open rate is broken” without selling the fix. Named human, last-verified dates, public corrections when we’re wrong (we already have been). Check the sources. Fail that test and leave.",
  },
  {
    q: "Do I need an account?",
    a: "No. Filters live in this browser and the URL. Share the link. That’s it. Accounts come later only if they earn it — not so we can nurture you about email.",
  },
  {
    q: "I’m an agency. Where’s multi-client mode?",
    a: "We tried a client-name CRM on the setup card. It made the product feel like work before it felt useful. Role filters + copy link + one-page brief (optional PDF title) is enough for now. Complexity comes back when the free shelf is habit, not before.",
  },
  {
    q: "Is the quiet changelog a bug?",
    a: "No. Quiet means nothing material moved. We don’t invent urgency so the homepage looks “alive.” Sticky risks still show what usually needs a person when the market is still.",
  },
];

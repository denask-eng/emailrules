/**
 * Sitewide FAQ — every answer must earn its slot.
 * Prefer one dense question over two thin ones. Order: who → shelf → not-that → trust → product.
 */

export type FaqItem = {
  q: string;
  a: string;
};

export const SITE_FAQ: FaqItem[] = [
  {
    q: "Who is this actually for?",
    a: "People who ship email and are too busy to re-read every PDF: new marketers, lifecycle/CRM, deliverability, multi-country, DTC, agencies. You want what’s true, whose job it is, and Monday’s move. Not for people who sell tools about email and need a fake score to demo.",
  },
  {
    q: "Why only ~35 rules? Isn’t that thin?",
    a: "On purpose. Four hundred undated “best practices” is how you look busy and still get burned. Every page needs a primary source we actually read. Thin and checkable beats fat folklore. The coverage map lists what we still refuse to invent — SMS, seed scores, warm-up magic included.",
  },
  {
    q: "Is this legal advice? Will it make me “compliant”?",
    a: "No and no. If it were advice you’d have a billable hour. No tool makes you compliant — lawyers and judges do. We say what the sources say, whose desk it usually lands on, and what to do first. Confirm high-stakes stuff with counsel who knows your facts. “Compliant” is a marketing word.",
  },
  {
    q: "Why no score out of 100?",
    a: "We refuse numbers you can’t audit. Fake scores sell seed tests and panic. Domain check gives plain findings with sources. If you wanted a red dial, you’re on the wrong site — and that’s fine.",
  },
  {
    q: "Why should I trust this over an ESP blog or AI page?",
    a: "ESPs sell seats. AI invents citations when nobody watches. We sell nothing today (no pixels, seed tests, or affiliate), name a human, date every page, and publish corrections when we’re wrong — we already have been. Check the sources. Fail that test and leave.",
  },
  {
    q: "Do I need an account? What about multi-client / agency mode?",
    a: "No account. Filters live in the browser and the URL — share the link. We tried a client-name CRM on setup; it felt like work before value. Role filter + one-page brief + optional PDF title is enough for now. More complexity only after this shelf is habit.",
  },
  {
    q: "Quiet changelog — is that a bug?",
    a: "No. Quiet means nothing material moved. We don’t invent urgency so the homepage looks “alive.” When it’s still, sticky risks still show what usually needs a person.",
  },
];

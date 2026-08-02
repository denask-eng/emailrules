/**
 * Sitewide FAQ — honest, slightly rude, actually human.
 * Order is intentional: who → what this is → what it is not → trust → product boundaries.
 */

export type FaqItem = {
  q: string;
  a: string;
};

export const SITE_FAQ: FaqItem[] = [
  /* ── 1. Who (filter first) ─────────────────────────────────────── */
  {
    q: "Who is this actually for?",
    a: "People who ship email and are too busy to re-read every PDF: week-one marketers, lifecycle/CRM, deliverability, multi-country ops, DTC brands, agencies. You want what is true, whose job it is, and what to do Monday. Not for people who sell tools about email and need a fake score to demo.",
  },
  /* ── 2–3. What this is ─────────────────────────────────────────── */
  {
    q: "Why only ~35 rules? Isn’t that… thin?",
    a: "On purpose. A wall of 400 undated “best practices” is how you look busy and still get burned. Every page needs a primary source we actually read. Thin and checkable beats fat and folklore. The coverage map says what we still refuse to invent.",
  },
  {
    q: "Is this legal advice?",
    a: "No. If it were, you’d have a billable hour and a longer PDF. This is a dated operator reference written by an email geek who ships campaigns. Confirm anything high-stakes with counsel who knows your facts.",
  },
  /* ── What it is not ────────────────────────────────────────────── */
  {
    q: "Will this make me “compliant”?",
    a: "No tool makes you compliant. Lawyers and judges do (or don’t). We tell you what the sources say, whose job it usually is, and what to do first on Monday. That’s useful. “Compliant” is a marketing word.",
  },
  {
    q: "Why no trust score out of 100?",
    a: "Because we refuse to invent a number you can’t audit. Fake scores sell seed tests and panic. You get findings, dates, and links. If that feels less exciting than a red dial, good — you’re not the red-dial customer.",
  },
  {
    q: "Why no SMS / push / WhatsApp?",
    a: "Different laws, carriers, and STOP language. Stuffing SMS into “emailrules” would be cosplay. Email only. If we ever cover texts, it will be a different shelf with a different name.",
  },
  /* ── Trust ─────────────────────────────────────────────────────── */
  {
    q: "Why should I trust you more than my ESP’s blog?",
    a: "ESPs sell seats. We sell nothing today — no pixels, no seed tests, no affiliate. We can say “your open rate is broken” without selling the replacement. Check the sources. If we fail that test, leave.",
  },
  {
    q: "Is this AI slop with a face slapped on?",
    a: "No. Named human, methodology, last-verified dates, and a public corrections page when we’re wrong. AI can draft. It does not get to invent a citation. If something feels off, email corrections — we publish the fix with a date.",
  },
  {
    q: "What if you’re wrong?",
    a: "We already have been. Corrections stay visible with a date. Hiding mistakes is how content farms sleep at night. We’d rather look briefly stupid and stay checkable.",
  },
  /* ── How you use it ────────────────────────────────────────────── */
  {
    q: "Do I need an account?",
    a: "No. Filters live in this browser and the URL. Share the link. That’s it. Accounts come later only if they earn it (see /connect) — not so we can email you a nurture sequence about email.",
  },
  {
    q: "I’m an agency. Where’s multi-client mode?",
    a: "We tried a client-name CRM on the setup card. It made the product feel like work before it felt useful. Use role filters + copy link + the one-page brief. Optional title on the PDF if you must. Complexity comes back when the free shelf is habit, not before.",
  },
  {
    q: "Is the quiet changelog a bug?",
    a: "No. Quiet means nothing material moved. We don’t invent urgency so the homepage looks “alive.” Sticky risks still show what usually needs a person when the market is still.",
  },
];

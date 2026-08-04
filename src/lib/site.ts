export const SITE = {
  name: "emailrules.today",
  /** Used in <title> suffix and OG */
  tagline: "What's true about email. Right now.",
  description:
    "What’s true about email right now: bulk inbox rules, consent by country, auth, measurement. Human-verified, primary sources, whose job it is, what to do Monday. No placement scores, no seed tests, no ESP affiliate.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://emailrules.today",
  locale: "en",
  /** Shown in the footer and in llms.txt so citations have a human owner */
  maintainer:
    "Human-verified by someone who ships email — not a content farm, not a seed-score shop.",
  contact: "corrections@emailrules.today",
} as const;

/**
 * A named human with a face is the strongest signal that this is not another
 * auto-generated content farm — and it is the thing that turns organic search
 * traffic into an audience. It appears in the footer and in the Person JSON-LD
 * so the site has an identifiable author rather than an anonymous publisher.
 */
export const AUTHOR = {
  name: "Denas Kulinicius",
  /** Public label only — no employer. Personal project, not a company promo. */
  role: "Email geek",
  blurb:
    "I geek out on email marketing, deliverability and the hidden gems in between — lifecycle, LTV, all of it. I built this because I kept finding out about rule changes months late, from a lawyer.",
  hook: "For people who ship email, not people who sell tools about email.",
  avatar: "/denas.jpg",
  x: "https://x.com/denaskulinicius",
  xHandle: "@denaskulinicius",
  linkedin: "https://www.linkedin.com/in/denaskulinicius",
} as const;

/**
 * Two text links, plus /check as the accented button in the header. Sources and
 * Brief used to sit here and no longer do: a rule page already carries its own
 * citations, and Brief is offered where a brief is the obvious next move — on
 * the rules setup and in the "Done for today?" bar. Permanent navigation is for
 * destinations you want on every page, not for everything that exists.
 */
/**
 * `short` is used on the narrowest phones. Something has to give at 360px, and
 * the choice is between a nav label and the wordmark. The label loses: the
 * domain is the brand, and ".today" is the whole thesis — a shelf that is true
 * right now. A wordmark that changes shape at a breakpoint is one people stop
 * recognising.
 */
/**
 * `at` is the width below which a link gives up its slot. The header holds a
 * wordmark, search and the check button on a 390px phone with about forty
 * pixels spare, so a third and fourth text label have to earn their space by
 * viewport rather than by importance.
 *
 * `flag` puts a quiet accent dot on the link. The explainer is the best page
 * on this site and "Glossary" was the least clickable word in the footer, so
 * it gets one marker until people have found it.
 */
export const NAV = [
  { href: "/rules", label: "Rules" },
  { href: "/how-email-works", label: "How email works", at: "min-[620px]", flag: true },
  { href: "/changed", label: "What changed", short: "Changed", at: "min-[440px]" },
  /* The census is the most linkable thing on this site and it was reachable
     only from the footer. It takes the widest slot rather than displacing
     anything: below 900px the header is already full, and a link nobody can
     read is worse than a link in the footer. */
  { href: "/blocklists", label: "Blocklists", at: "min-[900px]" },
  /* /providers held this slot for a day and lost it. Permanent navigation is
     for the things nobody else has; that corpus currently restates published
     documentation, so it lives in the footer until it measures something. */
] as const;

/**
 * Eight flat links in one row read as a sitemap dump: nothing tells you which
 * are the shelf and which are the paperwork about the shelf. Two named groups
 * do that with no extra ink. /start and /coverage live under "About" because
 * they explain the shelf — they are no longer a second and third way into it.
 */
export const FOOTER_NAV = [
  {
    title: "The shelf",
    links: [
      { href: "/rules", label: "Rules" },
      { href: "/changed", label: "What changed" },
      { href: "/sources", label: "Sources" },
      { href: "/how-email-works", label: "How email works" },
      { href: "/esp", label: "Your platform" },
      { href: "/providers", label: "Mailbox providers" },
      { href: "/blocklists", label: "Blocklist census" },
      { href: "/freshness", label: "How old is this shelf" },
      { href: "/coverage", label: "Coverage map" },
      { href: "/embed", label: "Embed the check" },
    ],
  },
  {
    title: "About this site",
    links: [
      { href: "/methodology", label: "Methodology" },
      /* The machine interface was reachable from nowhere. An agent finds it by
         convention; a person deciding whether to trust one needs to see it. */
      { href: "/mcp", label: "For agents (MCP)" },
      { href: "/corrections", label: "Corrections" },
      { href: "/start", label: "How to use this site" },
      { href: "/connect", label: "Connect roadmap" },
      /* /llms.txt is deliberately NOT linked here. The file stays and still
         does its job — assistants find it by convention at the root, no link
         required — but a footer that advertises a machine-readable manifest
         reads as developer tooling rather than a publication with an author. */
    ],
  },
] as const;

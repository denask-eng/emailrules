export const SITE = {
  name: "emailrules.today",
  /** Used in <title> suffix and OG */
  tagline: "Campaign preflight before you send.",
  description:
    "Send one real campaign and get up to five prioritized technical, compliance and measurement findings, each with an owner, first action and dated primary source. No spam score.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://emailrules.today",
  locale: "en",
  /** Shown in the footer and in llms.txt so citations have a human owner */
  maintainer:
    "Human-verified rules behind a real-message campaign preflight.",
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
  { href: "/changed", label: "Changes", at: "min-[520px]" },
  { href: "/trust", label: "Trust", at: "min-[680px]" },
] as const;

/**
 * Eight flat links in one row read as a sitemap dump: nothing tells you which
 * are the shelf and which are the paperwork about the shelf. Two named groups
 * do that with no extra ink. /start and /coverage live under "About" because
 * they explain the shelf — they are no longer a second and third way into it.
 */
export const FOOTER_NAV = [
  {
    title: "Product",
    links: [
      { href: "/check/message", label: "Check campaign" },
      { href: "/rules", label: "Rules" },
      { href: "/changed", label: "Changes" },
      { href: "/trust", label: "Trust" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/resources", label: "All resources" },
      { href: "/how-email-works", label: "How email works" },
      { href: "/providers", label: "Mailbox providers" },
      { href: "/blocklists", label: "Blocklists" },
      { href: "/agents", label: "For agents (MCP)" },
    ],
  },
] as const;

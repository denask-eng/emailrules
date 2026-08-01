export const SITE = {
  name: "emailrules.today",
  /** Used in <title> suffix and OG */
  tagline: "What's true about email. Right now.",
  description:
    "A dated, cited reference for the rules that govern marketing email: consent, tracking, authentication, provider requirements and AI disclosure. Every claim carries its source and the date it was last verified.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://emailrules.today",
  locale: "en",
  /** Shown in the footer and in llms.txt so citations have a human owner */
  maintainer: "Maintained by operators who run email programmes across 15 locales.",
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
  role: "Head of email, Iteractive",
  blurb:
    "I run email programmes across seven brands and fifteen locales. I built this because I kept finding out about rule changes months late, from a lawyer.",
  avatar: "/denas.jpg",
  x: "https://x.com/denaskulinicius",
  xHandle: "@denaskulinicius",
  linkedin: "https://www.linkedin.com/in/denaskulinicius",
} as const;

export const NAV = [
  { href: "/rules", label: "Rules" },
  { href: "/changed", label: "What changed" },
  { href: "/sources", label: "Sources" },
] as const;

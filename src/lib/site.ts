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

export const NAV = [
  { href: "/rules", label: "Rules" },
  { href: "/changed", label: "What changed" },
  { href: "/sources", label: "Sources" },
] as const;

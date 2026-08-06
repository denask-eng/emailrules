import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

/**
 * We explicitly WELCOME AI crawlers. Most sites are busy blocking them; being
 * the source an assistant quotes when someone asks "do I need consent for
 * tracking pixels in France" is the distribution strategy, not a leak.
 */
export default function robots(): MetadataRoute.Robots {
  const aiAgents = [
    "GPTBot",
    "OAI-SearchBot",
    "ChatGPT-User",
    "ClaudeBot",
    "Claude-User",
    "anthropic-ai",
    "PerplexityBot",
    "Perplexity-User",
    "Google-Extended",
    "Applebot-Extended",
    "Bingbot",
    "CCBot",
    "Meta-ExternalAgent",
  ];

  return {
    rules: [
      /* /domain is belt-and-braces. Those pages already serve noindex and are
         absent from the sitemap; publishing a record of somebody else's domain
         is a decision to take deliberately, not one to arrive at because a
         crawler found a page nobody meant to expose. */
      /* "/dmarc/" with the slash blocks the token pages without blocking
         /dmarc itself. A results URL is a credential: it is never linked from
         anywhere crawlable, carries noindex, and is kept out of here too,
         because one of those three failing should not be enough. */
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin", "/domain", "/dmarc/", "/check/message/", "/email-index", "/esp-truth", "/connect"],
      },
      ...aiAgents.map((ua) => ({ userAgent: ua, allow: "/" })),
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}

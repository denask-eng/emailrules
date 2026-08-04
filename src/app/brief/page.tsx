import type { Metadata } from "next";
import { getAllRules } from "@/lib/rules";
import { SITE } from "@/lib/site";
import { checkDomain, normaliseDomain } from "@/lib/dns-check";
import { platformClaim, primarySender } from "@/lib/sending-platform";
import { BriefClient, type DomainBrief } from "./brief-client";

const TITLE = "Your one-page brief";
const DESCRIPTION =
  "A shareable one-pager: what needs you, what’s already handled, and the five rules to open first — for your role and geos.";

/**
 * The Slack message this page produces carries exactly one link, and it is this
 * one, so the unfurl has to be its own. Without an explicit openGraph block it
 * inherited the root layout's, which advertised the homepage. The card itself
 * is opengraph-image.tsx in this folder; Next merges it in, so no `images` key
 * belongs here.
 */
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/brief" },
  robots: { index: false, follow: true },
  openGraph: {
    type: "website",
    title: TITLE,
    description: DESCRIPTION,
    url: `${SITE.url}/brief`,
    siteName: SITE.name,
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

/**
 * The reader's own programme, in four lines.
 *
 * The brief was a rules digest with nothing in it about the person holding it,
 * which is why there was no version of this page a VP could forward: every
 * line was equally true of every company on earth. A domain makes it theirs.
 *
 * DNS only — no blocklist sweep. A brief that takes eleven seconds to render
 * is a brief nobody waits for, and the listing question is already answered
 * properly on /check with the room to say which of three kinds it is.
 */
async function domainBrief(raw: string | undefined): Promise<DomainBrief | null> {
  const d = raw ? normaliseDomain(raw) : null;
  if (!d) return null;

  try {
    const result = await checkDomain(d);
    const sender = primarySender(result.platforms);
    const named = (o: string) =>
      result.findings.filter((f) => f.ownership === o).map((f) => f.title);

    return {
      domain: result.domain,
      checkedAt: result.checkedAt,
      platform: sender ? platformClaim(sender) : null,
      spfManager: result.spfManager?.name ?? null,
      yours: named("yours"),
      shared: named("shared"),
    };
  } catch {
    /* A resolver that will not answer must not take the rules half of the page
       down with it. The brief is still worth having without the domain. */
    return null;
  }
}

export default async function BriefPage({
  searchParams,
}: {
  searchParams: Promise<{ domain?: string }>;
}) {
  const { domain } = await searchParams;
  const [rules, domainData] = await Promise.all([getAllRules(), domainBrief(domain)]);
  const light = rules.map((r) => ({
    slug: r.slug,
    title: r.title,
    plain: r.plain,
    ownership: r.ownership,
    status: r.status,
    topic: r.topic,
    jurisdictions: r.jurisdictions,
    provider: r.provider,
    esp: r.esp,
    ignoreIf: r.ignoreIf,
    mondayMorning: r.mondayMorning,
    effectiveDate: r.effectiveDate,
    added: r.added,
    updated: r.updated,
    lastVerified: r.lastVerified,
    changelog: r.changelog,
  }));

  return <BriefClient rules={light} domain={domainData} />;
}

import type { Metadata } from "next";
import { getAllRules } from "@/lib/rules";
import { SITE } from "@/lib/site";
import { BriefClient } from "./brief-client";

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

export default async function BriefPage() {
  const rules = await getAllRules();
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

  return <BriefClient rules={light} />;
}

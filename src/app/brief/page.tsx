import type { Metadata } from "next";
import { getAllRules } from "@/lib/rules";
import { BriefClient } from "./brief-client";

export const metadata: Metadata = {
  title: "Your one-page brief",
  description:
    "A shareable one-pager: what needs you, what’s already handled, and the five rules to open first — for your role and geos.",
  alternates: { canonical: "/brief" },
  robots: { index: false, follow: true },
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

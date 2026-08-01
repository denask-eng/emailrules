import type { MetadataRoute } from "next";
import { getAllRules } from "@/lib/rules";
import { TOPICS } from "@/lib/types";
import { SITE } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const rules = await getAllRules();
  const newest = rules.reduce((m, r) => (r.updated > m ? r.updated : m), "2026-01-01");

  return [
    { url: SITE.url, lastModified: newest, changeFrequency: "daily", priority: 1 },
    { url: `${SITE.url}/rules`, lastModified: newest, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE.url}/changed`, lastModified: newest, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE.url}/check`, lastModified: newest, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE.url}/sources`, lastModified: newest, changeFrequency: "weekly", priority: 0.5 },
    { url: `${SITE.url}/methodology`, lastModified: newest, changeFrequency: "monthly", priority: 0.5 },
    ...Object.keys(TOPICS).map((t) => ({
      url: `${SITE.url}/topics/${t}`,
      lastModified: newest,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    // Rule pages carry their own lastModified. This is what makes a crawler
    // come back the day after a regulator moves.
    ...rules.map((r) => ({
      url: `${SITE.url}/rules/${r.slug}`,
      lastModified: r.updated,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}

import type { MetadataRoute } from "next";
import { countsByTopic, getAllRules } from "@/lib/rules";
import { getEspPlatformSummaries } from "@/lib/esp-changes";
import { GLOSSARY } from "@/content/how-email-works";
import { TOPICS, JURISDICTIONS } from "@/lib/types";
import type { Topic, Jurisdiction } from "@/lib/types";
import { SITE } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [rules, counts, esps] = await Promise.all([
    getAllRules(),
    countsByTopic(),
    getEspPlatformSummaries(),
  ]);
  const newest = rules.reduce((m, r) => (r.updated > m ? r.updated : m), "2026-01-01");

  return [
    { url: SITE.url, lastModified: newest, changeFrequency: "daily", priority: 1 },
    { url: `${SITE.url}/rules`, lastModified: newest, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE.url}/changed`, lastModified: newest, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE.url}/start`, lastModified: newest, changeFrequency: "monthly", priority: 0.85 },
    { url: `${SITE.url}/check`, lastModified: newest, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE.url}/check/headers`, lastModified: newest, changeFrequency: "monthly", priority: 0.8 },
    /* The entry point is indexable; the per-message results are noindex, because
       a result page is about somebody's private campaign. */
    { url: `${SITE.url}/check/message`, lastModified: newest, changeFrequency: "monthly", priority: 0.8 },
    /* /embed only. The per-domain snippet pages are noindex on purpose: an
       unbounded set of near-identical pages is exactly the thin-content shelf
       this site tells everyone else not to build. */
    { url: `${SITE.url}/embed`, lastModified: newest, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE.url}/esp`, lastModified: newest, changeFrequency: "weekly", priority: 0.75 },
    /* Only platforms that actually have a dated entry. The ones we watch and
       have nothing publishable for are named on /esp itself and have no page —
       a shelf of empty platform pages is the thin content this site refuses. */
    ...esps
      .filter((e) => e.count > 0)
      .map((e) => ({
        url: `${SITE.url}/esp/${e.platform.id}`,
        lastModified: e.latest ?? newest,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
    /* A live measurement of somebody else's infrastructure, re-probed hourly.
       Indexable because it is a genuine primary source: nobody else publishes
       which of these zones can still answer. */
    { url: `${SITE.url}/blocklists`, lastModified: newest, changeFrequency: "daily", priority: 0.8 },
    /* The setup page only. A results URL is a credential and is noindex. */
    { url: `${SITE.url}/dmarc`, lastModified: newest, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE.url}/coverage`, lastModified: newest, changeFrequency: "weekly", priority: 0.75 },
    { url: `${SITE.url}/how-email-works`, lastModified: newest, changeFrequency: "monthly", priority: 0.75 },
    /* One URL per word. Not thin content: each carries the artefact, the
       failure mode, whose job it is and the dated rule behind it — and "what
       is DKIM alignment" is a query people actually type, which an anchor on
       a 37-item index has never been able to answer. */
    ...GLOSSARY.map((t) => ({
      url: `${SITE.url}/how-email-works/${t.id}`,
      lastModified: newest,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    { url: `${SITE.url}/brief`, lastModified: newest, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE.url}/connect`, lastModified: newest, changeFrequency: "monthly", priority: 0.45 },
    { url: `${SITE.url}/corrections`, lastModified: newest, changeFrequency: "weekly", priority: 0.5 },
    { url: `${SITE.url}/sources`, lastModified: newest, changeFrequency: "weekly", priority: 0.5 },
    { url: `${SITE.url}/methodology`, lastModified: newest, changeFrequency: "monthly", priority: 0.5 },
    ...(Object.keys(JURISDICTIONS) as Jurisdiction[])
      .filter((j) => rules.some((r) => r.jurisdictions.includes(j)))
      .map((j) => ({
        url: `${SITE.url}/jurisdictions/${j.toLowerCase()}`,
        lastModified: newest,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
    ...(Object.keys(TOPICS) as Topic[])
      .filter((topic) => (counts[topic] ?? 0) > 0)
      .map((topic) => ({
        url: `${SITE.url}/topics/${topic}`,
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

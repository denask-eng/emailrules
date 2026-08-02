import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRulesByTopic, countsByTopic } from "@/lib/rules";
import { TOPICS } from "@/lib/types";
import type { Topic } from "@/lib/types";
import { SITE } from "@/lib/site";
import { RuleRow, SectionHead } from "@/components/bits";

/* New rules added in /admin must get a URL without a rebuild, so unknown
   slugs render on demand instead of 404ing. */
export const dynamicParams = true;
export const revalidate = 3600;

/* Only topics that actually hold rules get a URL. An empty topic page is worse
   than a missing one: it looks like the corpus is thinner than it is. */
export async function generateStaticParams() {
  const counts = await countsByTopic();
  return (Object.keys(TOPICS) as Topic[])
    .filter((topic) => (counts[topic] ?? 0) > 0)
    .map((topic) => ({ topic }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ topic: string }>;
}): Promise<Metadata> {
  const { topic } = await params;
  const meta = TOPICS[topic as Topic];
  if (!meta) return {};
  return {
    title: meta.label,
    description: meta.blurb,
    alternates: { canonical: `/topics/${topic}` },
    openGraph: { title: `${meta.label} — ${SITE.name}`, description: meta.blurb },
  };
}

export default async function TopicPage({ params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params;
  const meta = TOPICS[topic as Topic];
  if (!meta) notFound();
  const rules = await getRulesByTopic(topic as Topic);
  /* Empty shelves must 404 even if someone bookmarked a topic before it had
     rules (or after the last rule moved). A blank list reads as thin coverage. */
  if (rules.length === 0) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: meta.label,
    description: meta.blurb,
    url: `${SITE.url}/topics/${topic}`,
    isPartOf: { "@id": `${SITE.url}/#website` },
    hasPart: rules.map((r) => ({
      "@type": "Article",
      headline: r.title,
      url: `${SITE.url}/rules/${r.slug}`,
      dateModified: r.updated,
    })),
  };

  return (
    <div className={"shell shell-tight py-12 sm:py-16"}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SectionHead label="Topic" title={meta.label} lede={meta.blurb} />
      <ul className="list-none border-t p-0">
        {rules.map((r) => (
          <RuleRow key={r.slug} rule={r} />
        ))}
      </ul>
    </div>
  );
}

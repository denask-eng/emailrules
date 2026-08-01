import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRulesByTopic } from "@/lib/rules";
import { TOPICS } from "@/lib/types";
import type { Topic } from "@/lib/types";
import { SITE } from "@/lib/site";
import { RuleRow, Panel, SectionHead } from "@/components/bits";

export const dynamicParams = false;

export async function generateStaticParams() {
  return (Object.keys(TOPICS) as Topic[]).map((topic) => ({ topic }));
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
    <div className="wrap wrap-narrow py-12 md:py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SectionHead eyebrow="Topic" title={meta.label} lede={meta.blurb} />
      <Panel>
        {rules.map((r) => (
          <RuleRow key={r.slug} rule={r} />
        ))}
      </Panel>
    </div>
  );
}

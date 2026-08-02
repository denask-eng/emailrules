import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllRules, getRulesByJurisdiction } from "@/lib/rules";
import { JURISDICTIONS } from "@/lib/types";
import type { Jurisdiction } from "@/lib/types";
import { SITE } from "@/lib/site";
import { RuleRow, SectionHead } from "@/components/bits";

export const dynamicParams = true;
export const revalidate = 3600;

const jurisdictionCodes = Object.keys(JURISDICTIONS) as Jurisdiction[];
const ownershipOrder = { yours: 0, shared: 1, esp: 2, context: 3 } as const;

function jurisdictionFromParam(value: string): Jurisdiction {
  const jurisdiction = jurisdictionCodes.find(
    (code) => code.toLowerCase() === value.toLowerCase(),
  );
  if (!jurisdiction) notFound();
  return jurisdiction;
}

export async function generateStaticParams() {
  const rules = await getAllRules();
  return jurisdictionCodes
    .filter((jurisdiction) =>
      rules.some((rule) => rule.jurisdictions.includes(jurisdiction)),
    )
    .map((jurisdiction) => ({ j: jurisdiction.toLowerCase() }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ j: string }>;
}): Promise<Metadata> {
  const { j } = await params;
  const jurisdiction = jurisdictionFromParam(j);
  const meta = JURISDICTIONS[jurisdiction];
  const slug = jurisdiction.toLowerCase();
  return {
    title: meta.label,
    description: meta.blurb,
    alternates: { canonical: `/jurisdictions/${slug}` },
    openGraph: { title: `${meta.label} — ${SITE.name}`, description: meta.blurb },
  };
}

export default async function JurisdictionPage({
  params,
}: {
  params: Promise<{ j: string }>;
}) {
  const { j } = await params;
  const jurisdiction = jurisdictionFromParam(j);
  const meta = JURISDICTIONS[jurisdiction];
  const slug = jurisdiction.toLowerCase();
  const rules = [...(await getRulesByJurisdiction(jurisdiction))].sort(
    (a, b) =>
      ownershipOrder[a.ownership] - ownershipOrder[b.ownership] ||
      a.title.localeCompare(b.title),
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: meta.label,
    description: meta.blurb,
    url: `${SITE.url}/jurisdictions/${slug}`,
    isPartOf: { "@id": `${SITE.url}/#website` },
    hasPart: rules.map((rule) => ({
      "@type": "Article",
      headline: rule.title,
      url: `${SITE.url}/rules/${rule.slug}`,
      dateModified: rule.updated,
    })),
  };

  return (
    <div className={"shell shell-tight py-12 sm:py-16"}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SectionHead label="Jurisdiction" title={meta.label} lede={meta.blurb} />
      <ul className="list-none border-t p-0">
        {rules.map((rule) => (
          <RuleRow key={rule.slug} rule={rule} />
        ))}
      </ul>
    </div>
  );
}

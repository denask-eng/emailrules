import type { Metadata } from "next";
import Link from "next/link";
import { getAllRules, getStats } from "@/lib/rules";
import { TOPICS, JURISDICTIONS } from "@/lib/types";
import type { Topic, Jurisdiction } from "@/lib/types";
import { SectionHead } from "@/components/bits";
import { RuleFilter } from "@/components/rule-filter";

export const metadata: Metadata = {
  title: "Rules for your setup",
  description:
    "See which email rules matter for your geos and ESP — EU, UK, US, Canada, Australia and global provider rules. Filters save for next visit.",
  alternates: { canonical: "/rules" },
};

/** Order geos the way operators think: Europe block, then North America / APAC / global. */
const GEO_ORDER: Jurisdiction[] = [
  "EU",
  "FR",
  "DE",
  "IT",
  "UK",
  "US",
  "US-CA",
  "US-WA",
  "US-CO",
  "US-MD",
  "CA",
  "AU",
  "Global",
];

export default async function RulesIndex() {
  const [rules, stats] = await Promise.all([getAllRules(), getStats()]);

  const topics = (Object.keys(TOPICS) as Topic[]).filter((t) =>
    rules.some((r) => r.topic === t),
  );

  const geos = GEO_ORDER.filter((j) => rules.some((r) => r.jurisdictions.includes(j))).map(
    (j) => ({
      j,
      n: rules.filter((r) => r.jurisdictions.includes(j)).length,
      label: JURISDICTIONS[j]?.label ?? j,
    }),
  );

  return (
    <div className="shell py-12 sm:py-16">
      <SectionHead
        label="Rules"
        title="What matters for you"
        lede={`One setup. Five first. Filter by role and where you send — EU / Europe, UK, US, Canada, Australia, plus global inbox rules. ${stats.total} curated pages with sources.`}
      />

      <RuleFilter rules={rules} />

      <div className="mt-14 border-t pt-8">
        <h2 className="text-[15px] font-semibold">Prefer a topic?</h2>
        <p className="mt-1 text-[13.5px] text-muted-fg">
          Same rules, grouped by job — consent, auth, hygiene, measurement.
        </p>
        <div className="mt-4 flex flex-wrap gap-2.5">
          {topics.map((t) => (
            <Link
              key={t}
              href={`/topics/${t}`}
              className="rounded-full border bg-card px-3.5 py-1.5 text-[13.5px] transition-colors hover:bg-muted"
            >
              {TOPICS[t].label}{" "}
              <span className="num text-dim">{rules.filter((r) => r.topic === t).length}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-10 border-t pt-8">
        <h2 className="text-[15px] font-semibold">Prefer a place?</h2>
        <p className="mt-1 max-w-[52ch] text-[13.5px] text-muted-fg">
          Jurisdiction pages for the maps we actually cover — including EU and member states with
          pages today. Not every country; we do not invent empty shelves.
        </p>
        <div className="mt-4 flex flex-wrap gap-2.5">
          {geos.map(({ j, n, label }) => (
            <Link
              key={j}
              href={`/jurisdictions/${j.toLowerCase()}`}
              className="rounded-full border bg-card px-3.5 py-1.5 text-[13.5px] transition-colors hover:bg-muted"
            >
              {label} <span className="num text-dim">{n}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

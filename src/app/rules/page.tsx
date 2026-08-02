import type { Metadata } from "next";
import Link from "next/link";
import { getAllRules, getStats } from "@/lib/rules";
import { TOPICS } from "@/lib/types";
import type { Topic } from "@/lib/types";
import { SectionHead } from "@/components/bits";
import { RuleFilter } from "@/components/rule-filter";

export const metadata: Metadata = {
  title: "Rules for your setup",
  description:
    "See which email rules matter for your geos and ESP — what needs you, what is already handled, and why. Filters save for next visit.",
  alternates: { canonical: "/rules" },
};

export default async function RulesIndex() {
  const [rules, stats] = await Promise.all([getAllRules(), getStats()]);

  const topics = (Object.keys(TOPICS) as Topic[]).filter((t) =>
    rules.some((r) => r.topic === t),
  );

  return (
    <div className="shell py-12 sm:py-16">
      <SectionHead
        label="Rules"
        title="What matters for you"
        lede={`One setup. Five first. We remember this browser. ${stats.total} curated rules with sources — most are not your problem today.`}
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
    </div>
  );
}

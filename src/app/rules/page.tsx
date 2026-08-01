import type { Metadata } from "next";
import Link from "next/link";
import { getAllRules, getStats } from "@/lib/rules";
import { TOPICS } from "@/lib/types";
import type { Topic } from "@/lib/types";
import { RuleRow, Panel, SectionHead } from "@/components/bits";

export const metadata: Metadata = {
  title: "Every rule",
  description:
    "The complete index of email marketing rules: consent, tracking, authentication, provider requirements, content claims, AI disclosure and measurement. Each one dated and cited.",
  alternates: { canonical: "/rules" },
};

export default async function RulesIndex() {
  const [rules, stats] = await Promise.all([getAllRules(), getStats()]);
  const byTopic = (Object.keys(TOPICS) as Topic[])
    .map((t) => ({ topic: t, rules: rules.filter((r) => r.topic === t) }))
    .filter((g) => g.rules.length);

  return (
    <div className="wrap py-12 md:py-16">
      <SectionHead
        eyebrow="Index"
        title="Every rule"
        lede={`${stats.total} rules. ${stats.inForce} in force today, ${stats.upcoming} dated and coming. Each one carries its source and the date it was last verified.`}
      />

      <div className="mb-10 flex flex-wrap gap-2.5">
        {byTopic.map((g) => (
          <a
            key={g.topic}
            href={`#${g.topic}`}
            className="inline-flex items-baseline gap-2 rounded-full px-3.5 py-2 text-[13.5px]"
            style={{ border: "1px solid var(--border)", background: "var(--card)" }}
          >
            {TOPICS[g.topic].label}
            <span className="tabular text-[12px]" style={{ color: "var(--muted-fg)" }}>
              {g.rules.length}
            </span>
          </a>
        ))}
      </div>

      <div className="space-y-12">
        {byTopic.map((g) => (
          <section key={g.topic} id={g.topic} className="scroll-mt-20">
            <div className="mb-4">
              <h2 className="text-[20px] font-semibold">
                <Link href={`/topics/${g.topic}`}>{TOPICS[g.topic].label}</Link>
              </h2>
              <p className="mt-1 text-[14px]" style={{ color: "var(--muted-fg)", maxWidth: "62ch" }}>
                {TOPICS[g.topic].blurb}
              </p>
            </div>
            <Panel>
              {g.rules.map((r) => (
                <RuleRow key={r.slug} rule={r} />
              ))}
            </Panel>
          </section>
        ))}
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { getAllRules, getStats } from "@/lib/rules";
import { TOPICS } from "@/lib/types";
import type { Topic } from "@/lib/types";
import { RuleRow, Panel, SectionHead } from "@/components/bits";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Every rule",
  description:
    "The complete index of marketing email rules: consent, tracking, authentication, provider requirements, content claims, AI disclosure and measurement. Each one dated and cited.",
  alternates: { canonical: "/rules" },
};

export default async function RulesIndex() {
  const [rules, stats] = await Promise.all([getAllRules(), getStats()]);
  const groups = (Object.keys(TOPICS) as Topic[])
    .map((t) => ({ topic: t, rules: rules.filter((r) => r.topic === t) }))
    .filter((g) => g.rules.length);

  return (
    <div className={"shell py-12 sm:py-16"}>
      <SectionHead
        label="Index"
        title="Every rule"
        lede={`${stats.total} rules. ${stats.inForce} in force today, ${stats.upcoming} dated and coming. Each carries its primary source and the date it was last verified.`}
      />

      <nav className="mb-12 flex flex-wrap gap-x-5 gap-y-2">
        {groups.map((g) => (
          <a
            key={g.topic}
            href={`#${g.topic}`}
            className="num text-[0.72rem] tracking-[0.08em] text-dim uppercase no-underline hover:text-fg"
          >
            {TOPICS[g.topic].label}{" "}
            <span className="text-dimd-fg">{g.rules.length}</span>
          </a>
        ))}
      </nav>

      <div className="space-y-14">
        {groups.map((g) => (
          <section key={g.topic} id={g.topic} className="scroll-mt-20">
            <h2 className="label border-b pb-2.5">
              <Link href={`/topics/${g.topic}`} className="no-underline hover:underline">
                {TOPICS[g.topic].label}
              </Link>{" "}
              <span className="font-semibold tracking-normal text-dim">{g.rules.length}</span>
            </h2>
            <p className="mt-3 mb-1 max-w-[70ch] text-[0.9rem] leading-relaxed text-dimd-fg">
              {TOPICS[g.topic].blurb}
            </p>
            <ul className="list-none p-0">
              {g.rules.map((r) => (
                <RuleRow key={r.slug} rule={r} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

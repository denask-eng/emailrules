import type { Metadata } from "next";
import Link from "next/link";
import { getAllRules, getStats } from "@/lib/rules";
import { TOPICS } from "@/lib/types";
import type { Topic } from "@/lib/types";
import { RuleRow, SECTION, SectionHead, GroupHead } from "@/components/bits";
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
    <div className={cn(SECTION, "py-14")}>
      <SectionHead
        eyebrow="Index"
        title="Every rule"
        lede={`${stats.total} rules. ${stats.inForce} in force today, ${stats.upcoming} dated and coming. Each carries its primary source and the date it was last verified.`}
      />

      <nav className="mb-12 flex flex-wrap gap-x-5 gap-y-2">
        {groups.map((g) => (
          <a
            key={g.topic}
            href={`#${g.topic}`}
            className="m text-[0.72rem] tracking-[0.08em] text-mute uppercase no-underline hover:text-ink"
          >
            {TOPICS[g.topic].label}{" "}
            <span className="text-ink-soft">{g.rules.length}</span>
          </a>
        ))}
      </nav>

      <div className="space-y-14">
        {groups.map((g) => (
          <section key={g.topic} id={g.topic} className="scroll-mt-20">
            <GroupHead>
              <Link href={`/topics/${g.topic}`} className="no-underline hover:underline">
                {TOPICS[g.topic].label}
              </Link>{" "}
              <span className="font-semibold tracking-normal text-mute">{g.rules.length}</span>
            </GroupHead>
            <p className="mt-3 mb-1 max-w-[70ch] text-[0.9rem] leading-relaxed text-ink-soft">
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

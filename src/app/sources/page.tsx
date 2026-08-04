import type { Metadata } from "next";
import Link from "next/link";
import { getAllRules, fmtDate } from "@/lib/rules";
import { SectionHead } from "@/components/bits";

export const metadata: Metadata = {
  title: "Every source",
  description:
    "Every primary source behind every rule on this site: regulators, courts, mailbox providers, standards bodies and ESP documentation, each with its publication date.",
  alternates: { canonical: "/sources" },
};

const ACTOR_LABEL: Record<string, string> = {
  regulator: "Regulator",
  court: "Court",
  "mailbox-provider": "Mailbox provider",
  esp: "ESP documentation",
  "standards-body": "Standards body or research",
};

export default async function Sources() {
  const rules = await getAllRules();
  const all = rules
    .flatMap((r) => r.sources.map((s) => ({ ...s, rule: r })))
    .sort((a, b) => (b.published ?? "").localeCompare(a.published ?? ""));

  const grouped = Object.entries(
    all.reduce<Record<string, typeof all>>((acc, s) => {
      (acc[s.actor] ||= []).push(s);
      return acc;
    }, {}),
  );

  return (
    <div className={"shell shell-tight py-12 sm:py-16"}>
      <SectionHead
        as="h1"
        label="Receipts"
        title="Every source"
        lede="If a claim on this site is not traceable to something on this page, it should not be here. Tell us and we will fix it."
      />

      <div className="space-y-10">
        {grouped.map(([actor, list]) => (
          <section key={actor}>
            <h2 className="label border-b pb-2.5">
              {ACTOR_LABEL[actor] ?? actor}{" "}
              <span className="font-semibold tracking-normal text-dim">{list.length}</span>
            </h2>
            <ul className="mt-1 list-none p-0">
              {list.map((s) => (
                <li key={`${s.rule.slug}-${s.url}`} className="border-b border-border-soft py-3 last:border-b-0">
                  <div className="text-[0.94rem] leading-snug">{s.name}</div>
                  <div className="num mt-1.5 flex flex-wrap items-center gap-2 text-[0.74rem] text-dim">
                    <span>{s.published ? fmtDate(s.published) : "no date given"}</span>
                    <span aria-hidden>·</span>
                    <a href={s.url} target="_blank" rel="noopener nofollow" className="underline underline-offset-2 hover:text-fg" >
                      Source
                    </a>
                    <span aria-hidden>·</span>
                    <Link href={`/rules/${s.rule.slug}`} className="underline underline-offset-2">
                      {s.rule.title}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

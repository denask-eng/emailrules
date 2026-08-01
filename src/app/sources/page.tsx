import type { Metadata } from "next";
import Link from "next/link";
import { getAllRules, fmtDate } from "@/lib/rules";
import { SectionHead, Panel } from "@/components/bits";

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
    .sort((a, b) => b.published.localeCompare(a.published));

  const grouped = Object.entries(
    all.reduce<Record<string, typeof all>>((acc, s) => {
      (acc[s.actor] ||= []).push(s);
      return acc;
    }, {}),
  );

  return (
    <div className="wrap wrap-narrow py-12 md:py-16">
      <SectionHead
        eyebrow="Receipts"
        title="Every source"
        lede="If a claim on this site is not traceable to something on this page, it should not be here. Tell us and we will fix it."
      />

      <div className="space-y-10">
        {grouped.map(([actor, list]) => (
          <section key={actor}>
            <h2 className="mb-3 text-[17px] font-semibold">
              {ACTOR_LABEL[actor] ?? actor}{" "}
              <span className="tabular text-[13px] font-normal" style={{ color: "var(--muted-fg)" }}>
                {list.length}
              </span>
            </h2>
            <Panel>
              {list.map((s) => (
                <div key={`${s.rule.slug}-${s.url}`} className="px-5 py-4" style={{ borderTop: "1px solid var(--border)" }}>
                  <div className="text-[14.5px] leading-snug">{s.name}</div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[12.5px]" style={{ color: "var(--muted-fg)" }}>
                    <span className="tabular">{fmtDate(s.published)}</span>
                    <span aria-hidden>·</span>
                    <a href={s.url} target="_blank" rel="noopener nofollow" className="underline underline-offset-2" style={{ color: "var(--primary)" }}>
                      Source
                    </a>
                    <span aria-hidden>·</span>
                    <Link href={`/rules/${s.rule.slug}`} className="underline underline-offset-2">
                      {s.rule.title}
                    </Link>
                  </div>
                </div>
              ))}
            </Panel>
          </section>
        ))}
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { getAllRules, countsByTopic, countsByOwnership, getStats } from "@/lib/rules";
import { TOPICS, JURISDICTIONS, OWNERSHIP, STATUS_LABEL } from "@/lib/types";
import type { Topic, Jurisdiction, Ownership, RuleStatus } from "@/lib/types";
import { SectionHead } from "@/components/bits";

export const metadata: Metadata = {
  title: "Coverage",
  description:
    "What emailrules.today covers, what it deliberately does not, and how many rules sit in each topic and jurisdiction. Honesty about the shelf is part of the product.",
  alternates: { canonical: "/coverage" },
};

export default async function Coverage() {
  const [rules, counts, own, stats] = await Promise.all([
    getAllRules(),
    countsByTopic(),
    countsByOwnership(),
    getStats(),
  ]);

  const byJuris = (Object.keys(JURISDICTIONS) as Jurisdiction[])
    .map((j) => ({
      j,
      n: rules.filter((r) => r.jurisdictions.includes(j)).length,
    }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n);

  const byStatus = (["in_force", "upcoming", "proposed", "superseded"] as RuleStatus[]).map(
    (s) => ({ s, n: rules.filter((r) => r.status === s).length }),
  );

  const providers = ["Gmail", "Yahoo", "Microsoft", "Apple", "Klaviyo"] as const;
  const byProvider = providers.map((p) => ({
    p,
    n: rules.filter((r) => r.provider === p).length,
  }));

  return (
    <div className="shell shell-tight py-12 sm:py-16">
      <SectionHead
        label="Coverage"
        title={`${stats.total} rules on purpose — not 400 of folklore.`}
        lede="A curated shelf: primary sources only. Thin and checkable beats fat and embarrassing. Topics, jurisdictions, ownership, and what we still refuse to invent."
      />

      <div className="mt-10 grid gap-3 sm:grid-cols-3">
        {[
          { v: String(stats.total), k: "rules total" },
          { v: String(stats.inForce), k: "in force" },
          { v: String(own.yours), k: "genuinely yours" },
        ].map((x) => (
          <div key={x.k} className="rounded-xl border bg-card px-5 py-4">
            <div className="num text-[1.6rem] font-semibold tracking-tight">{x.v}</div>
            <div className="label mt-1">{x.k}</div>
          </div>
        ))}
      </div>

      <section className="mt-14">
        <h2 className="text-[1.15rem] font-semibold">By what goes wrong</h2>
        <ul className="mt-4 list-none border-t p-0">
          {(Object.keys(TOPICS) as Topic[]).map((t) => {
            const n = counts[t] ?? 0;
            return (
              <li
                key={t}
                className="flex flex-wrap items-baseline justify-between gap-3 border-b py-3.5"
              >
                <div>
                  {n > 0 ? (
                    <Link href={`/topics/${t}`} className="font-medium underline-offset-3 hover:underline">
                      {TOPICS[t].label}
                    </Link>
                  ) : (
                    <span className="font-medium text-dim">{TOPICS[t].label}</span>
                  )}
                  <p className="mt-1 max-w-[52ch] text-[13.5px] text-muted-fg">{TOPICS[t].blurb}</p>
                </div>
                <span className="num text-[13px] text-dim">
                  {n} {n === 1 ? "rule" : "rules"}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-14">
        <h2 className="text-[1.15rem] font-semibold">By jurisdiction</h2>
        <p className="mt-1.5 max-w-[54ch] text-[13.5px] leading-relaxed text-muted-fg">
          Europe is first-class where we have sources: EU-wide ePrivacy / AI / accessibility, plus
          France, Germany, Italy, and UK PECR as its own row. Missing Member States means we have not
          shipped a sourced page yet — not that those markets are irrelevant.
        </p>
        <ul className="mt-4 list-none border-t p-0">
          {byJuris.map(({ j, n }) => (
            <li key={j} className="flex items-baseline justify-between gap-3 border-b py-3">
              <Link
                href={`/jurisdictions/${j.toLowerCase()}`}
                className="font-medium underline-offset-3 hover:underline"
              >
                {JURISDICTIONS[j].label}
              </Link>
              <span className="num text-[13px] text-dim">{n}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-14 grid gap-10 sm:grid-cols-2">
        <div>
          <h2 className="text-[1.15rem] font-semibold">By ownership</h2>
          <ul className="mt-4 list-none border-t p-0">
            {(Object.keys(OWNERSHIP) as Ownership[]).map((o) => (
              <li key={o} className="flex items-baseline justify-between gap-3 border-b py-3">
                <span>
                  <span className="font-medium">{OWNERSHIP[o].label}</span>
                  <span className="mt-1 block text-[13px] text-muted-fg">{OWNERSHIP[o].blurb}</span>
                </span>
                <span className="num text-[13px] text-dim">{own[o]}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-[1.15rem] font-semibold">Named providers</h2>
          <ul className="mt-4 list-none border-t p-0">
            {byProvider.map(({ p, n }) => (
              <li key={p} className="flex items-baseline justify-between gap-3 border-b py-3">
                <span className="font-medium">{p}</span>
                <span className="num text-[13px] text-dim">{n}</span>
              </li>
            ))}
          </ul>
          <h2 className="mt-10 text-[1.15rem] font-semibold">By status</h2>
          <ul className="mt-4 list-none border-t p-0">
            {byStatus.map(({ s, n }) => (
              <li key={s} className="flex items-baseline justify-between gap-3 border-b py-3">
                <span className="font-medium">{STATUS_LABEL[s]}</span>
                <span className="num text-[13px] text-dim">{n}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-14 rounded-xl border bg-bg-2 p-6">
        <h2 className="text-[1.15rem] font-semibold">What we skip on purpose</h2>
        <p className="mt-2 max-w-[64ch] text-[0.95rem] leading-relaxed text-muted-fg">
          Not because you are not smart enough — because the evidence is thin or the category is
          dishonest.
        </p>
        <ul className="mt-3 max-w-[64ch] list-disc space-y-2 pl-5 text-[0.95rem] leading-relaxed text-muted-fg">
          <li>Inbox-placement % and seed-panel scores (we refuse the category).</li>
          <li>Warm-up rate folklore with no primary provider number.</li>
          <li>ESP bounce ordinals where the vendor&rsquo;s own page contradicts itself.</li>
          <li>Member-state law outside the jurisdictions listed above.</li>
          <li>Paid monitoring / Klaviyo OAuth scans (not built; free checks only).</li>
        </ul>
        <p className="mt-4 max-w-[64ch] text-[0.95rem] leading-relaxed text-muted-fg">
          Corrections and missing rules:{" "}
          <a href="mailto:corrections@emailrules.today" className="text-fg underline underline-offset-3">
            corrections@emailrules.today
          </a>
          . Methodology lives on{" "}
          <Link href="/methodology" className="text-fg underline underline-offset-3">
            /methodology
          </Link>
          .
        </p>
      </section>
    </div>
  );
}

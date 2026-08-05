import type { Metadata } from "next";
import Link from "next/link";
import { getAllRules, countsByTopic, countsByOwnership, getStats } from "@/lib/rules";
import { TOPICS, JURISDICTIONS, OWNERSHIP, STATUS_LABEL } from "@/lib/types";
import type { Topic, Jurisdiction, Ownership, RuleStatus } from "@/lib/types";
import { SectionHead } from "@/components/bits";

export const metadata: Metadata = {
  title: "Coverage map",
  description:
    "What emailrules.today covers, what it deliberately does not, and what a rule has to prove before it goes on the shelf. Honesty about the shelf is part of the product.",
  alternates: { canonical: "/coverage" },
};

/**
 * A coverage map, not a second rules index. /rules already offers the same
 * topics and jurisdictions as chips you can tap, so repeating that here was
 * giving people two front doors to the same room. What only this page can do is
 * state the admission rule and publish the tally against it — including the
 * empty shelves, which is the part a content farm never prints.
 */
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
        as="h1"
        label="Coverage map"
        title={`${stats.total} rules on purpose — not 400 of folklore.`}
        lede="What a page has to prove before it goes on the shelf, what we refuse to shelve at all, and the running tally against both. Thin and checkable beats fat and embarrassing."
      />

      <p className="max-w-[62ch] text-[14px] leading-relaxed text-muted-fg">
        This is the audit, not the index. To read the rules themselves — filtered to your role and
        the places you send —{" "}
        <Link href="/rules" className="font-medium text-fg underline underline-offset-3">
          start on /rules
        </Link>
        .
      </p>

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
        <h2 className="text-[1.15rem] font-semibold">What earns a place</h2>
        <ul className="mt-4 list-none border-t p-0 text-[0.95rem] leading-relaxed">
          {[
            {
              t: "A primary source with a date",
              d: "The regulator, the standards body, or the provider’s own page. Law-firm summaries help us find things; they are never the citation. Where a publisher genuinely prints no date — Google’s help centre does not — the page says “publisher states no date” rather than inventing a plausible one.",
            },
            {
              t: "A named owner",
              d: "Every page says whether this is the ESP’s job, shared, yours, or nothing to do today. A reference that makes all of it sound urgent is indistinguishable from the vendors selling the fix.",
            },
            {
              t: "One concrete first move",
              d: "A named screen in a real tool, not an imperative. If we cannot say what you would click, we do not yet understand the rule well enough to publish it.",
            },
            {
              t: "A re-verification date",
              d: "Pages older than ninety days render a staleness warning instead of pretending. Corrections are published and dated, never quietly swallowed.",
            },
          ].map((x) => (
            <li key={x.t} className="border-b py-4">
              <span className="font-medium">{x.t}</span>
              <p className="mt-1 max-w-[62ch] text-[14px] text-muted-fg">{x.d}</p>
            </li>
          ))}
        </ul>
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
          <li>Member-state law outside the jurisdictions listed below.</li>
          <li>Paid monitoring / Klaviyo OAuth scans (not built; free checks only).</li>
        </ul>
      </section>

      <section className="mt-14">
        <h2 className="text-[1.15rem] font-semibold">The tally</h2>
        <p className="mt-1.5 max-w-[58ch] text-[13.5px] leading-relaxed text-muted-fg">
          A count of nothing is still published. An empty row means we have not shipped a sourced
          page yet — not that the subject does not matter.
        </p>

        <h3 className="mt-8 text-[15px] font-semibold">By what goes wrong</h3>
        <ul className="mt-3 list-none border-t p-0">
          {(Object.keys(TOPICS) as Topic[]).map((t) => {
            const n = counts[t] ?? 0;
            return (
              <li key={t} className="flex items-baseline justify-between gap-3 border-b py-3">
                {n > 0 ? (
                  <Link href={`/topics/${t}`} className="underline-offset-3 hover:underline">
                    {TOPICS[t].label}
                  </Link>
                ) : (
                  <span className="text-dim">{TOPICS[t].label}</span>
                )}
                <span className="num text-[13px] text-dim">{n}</span>
              </li>
            );
          })}
        </ul>

        <h3 className="mt-10 text-[15px] font-semibold">By jurisdiction</h3>
        <p className="mt-1.5 max-w-[54ch] text-[13.5px] leading-relaxed text-muted-fg">
          Europe is first-class where we have sources: EU-wide ePrivacy / AI / accessibility, plus
          France, Germany, Italy, and UK PECR as its own row.
        </p>
        <ul className="mt-3 list-none border-t p-0">
          {byJuris.map(({ j, n }) => (
            <li key={j} className="flex items-baseline justify-between gap-3 border-b py-3">
              <Link
                href={`/jurisdictions/${j.toLowerCase()}`}
                className="underline-offset-3 hover:underline"
              >
                {JURISDICTIONS[j].label}
              </Link>
              <span className="num text-[13px] text-dim">{n}</span>
            </li>
          ))}
        </ul>

        <div className="mt-10 grid gap-10 sm:grid-cols-2">
          <div>
            <h3 className="text-[15px] font-semibold">By ownership</h3>
            <ul className="mt-3 list-none border-t p-0">
              {(Object.keys(OWNERSHIP) as Ownership[]).map((o) => (
                <li key={o} className="flex items-baseline justify-between gap-3 border-b py-3">
                  <span>
                    <span className="font-medium">{OWNERSHIP[o].label}</span>
                    <span className="mt-1 block text-[13px] text-muted-fg">
                      {OWNERSHIP[o].blurb}
                    </span>
                  </span>
                  <span className="num text-[13px] text-dim">{own[o]}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-[15px] font-semibold">Named providers</h3>
            <ul className="mt-3 list-none border-t p-0">
              {byProvider.map(({ p, n }) => (
                <li key={p} className="flex items-baseline justify-between gap-3 border-b py-3">
                  <span className="font-medium">{p}</span>
                  <span className="num text-[13px] text-dim">{n}</span>
                </li>
              ))}
            </ul>
            <h3 className="mt-10 text-[15px] font-semibold">By status</h3>
            <ul className="mt-3 list-none border-t p-0">
              {byStatus.map(({ s, n }) => (
                <li key={s} className="flex items-baseline justify-between gap-3 border-b py-3">
                  <span className="font-medium">{STATUS_LABEL[s]}</span>
                  <span className="num text-[13px] text-dim">{n}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <p className="mt-14 max-w-[64ch] text-[0.95rem] leading-relaxed text-muted-fg">
        A rule missing, or one of these wrong? Write to{" "}
        <a href="/corrections#report" className="text-fg underline underline-offset-3">
          corrections@emailrules.today
        </a>
        . How pages are researched and verified is on{" "}
        <Link href="/methodology" className="text-fg underline underline-offset-3">
          /methodology
        </Link>
        ; what has already been fixed is on{" "}
        <Link href="/corrections" className="text-fg underline underline-offset-3">
          /corrections
        </Link>
        .
      </p>
    </div>
  );
}

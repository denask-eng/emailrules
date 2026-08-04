import type { Metadata } from "next";
import Link from "next/link";
import { ProofBar } from "@/components/proof-bar";
import { freshness, stalenessOf } from "@/lib/source-watch";
import { getAllRules } from "@/lib/rules";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * How old this shelf is, published.
 *
 * Every page here carries a "last verified" date, and until the source watcher
 * existed nothing ever moved one: all 39 rules were stamped on the two days the
 * site was built. A corpus whose entire claim is "dated and verified" was
 * ageing in silence, and a year of that would have turned the site's own
 * standard into the evidence against it.
 *
 * So the decay is the page. Nobody in this category publishes their own
 * staleness — it is the same move as the blocklist census, where printing the
 * number that costs us is what makes every other number believable. It is also
 * the forcing function: a public counter is harder to ignore than a private
 * queue.
 */

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "How old is this shelf",
  description:
    "Every rule here carries the date a human last checked it against its primary source. This page publishes how old those dates are, how many sources moved since, and the oldest verification on the site — including when that number is bad.",
  alternates: { canonical: "/freshness" },
};

const BAND = {
  fresh: { label: "verified in the last 90 days", tone: "ok" as const },
  ageing: { label: "3 to 6 months old", tone: "warn" as const },
  stale: { label: "over 6 months old", tone: "bad" as const },
  unknown: { label: "no date at all", tone: "bad" as const },
};

export default async function Freshness() {
  const [state, rules] = await Promise.all([freshness(), getAllRules()]);

  const bands = { fresh: 0, ageing: 0, stale: 0, unknown: 0 };
  for (const rule of rules) bands[stalenessOf(rule.lastVerified)] += 1;

  const oldest = [...rules]
    .filter((r) => r.lastVerified)
    .sort((a, b) => (a.lastVerified! < b.lastVerified! ? -1 : 1))
    .slice(0, 8);

  return (
    <div className="shell py-12 sm:py-16">
      <p className="num label">Freshness · sources re-read daily</p>
      <h1 className="mt-4 max-w-[20ch] text-[clamp(2.1rem,6.5vw,3.6rem)] leading-[0.98] tracking-[-0.045em]">
        How old is this shelf.
      </h1>
      <p className="mt-6 max-w-[64ch] text-[1.04rem] leading-relaxed text-muted-fg">
        Every rule here names a primary source and the date a person last checked the claim against
        it. A reference that does not publish how old those dates are is asking you to assume they
        are recent. This page does not ask you to assume.
      </p>

      <ProofBar
        className="mt-10"
        segments={[
          { key: "fresh", label: BAND.fresh.label, tone: "ok", value: bands.fresh },
          { key: "ageing", label: BAND.ageing.label, tone: "warn", value: bands.ageing },
          { key: "stale", label: BAND.stale.label, tone: "bad", value: bands.stale },
          {
            key: "unknown",
            label: BAND.unknown.label,
            tone: "bad",
            value: bands.unknown,
            note: "A claim with no verification date is never counted as checked.",
          },
        ]}
        caption={`${state.rules} rules on the shelf. The oldest verification is ${
          state.oldestVerified ? fmtDate(state.oldestVerified) : "unknown"
        }, and it stays on this page whether or not it flatters us.`}
      />

      <section className="mt-14">
        <h2 className="text-[1.3rem] tracking-tight">What the watcher does</h2>
        <p className="mt-2.5 max-w-[64ch] text-[14.5px] leading-relaxed text-muted-fg">
          Every primary source this corpus cites is re-read on a rotation and fingerprinted. When a
          page changes, it goes into a queue for a person. It is never published, re-worded or
          re-dated by a machine.
        </p>

        <dl className="mt-7 grid grid-cols-2 gap-px overflow-hidden border-y bg-border lg:grid-cols-5">
          {[
            { n: state.sources, k: "sources watched" },
            { n: state.checkedThisWeek, k: "re-read this week" },
            { n: state.unreachable, k: "block automated checks" },
            { n: state.openChanges, k: "changes waiting for a person" },
            { n: state.gone, k: "citations that are gone (404)" },
          ].map((f) => (
            <div key={f.k} className="bg-bg px-5 py-6">
              <dd className="num text-[clamp(1.8rem,4.5vw,2.4rem)] leading-none font-semibold tracking-[-0.04em]">
                {f.n}
              </dd>
              <dt className="mt-2.5 text-[13px] leading-snug text-muted-fg">{f.k}</dt>
            </div>
          ))}
        </dl>

        <div className="mt-6 max-w-[68ch] rounded-xl border p-5 text-[0.92rem] leading-relaxed text-muted-fg">
          <b className="text-fg">What a change does and does not mean.</b> It means the page moved,
          not that the rule is wrong. A regulator can reformat a page without altering a word of law,
          and a page can keep its wording while the law beneath it moves. Only a person can tell
          those apart, so the watcher records and stops. If nobody clears the queue, the dates above
          go stale in public rather than quietly.
        </div>
      </section>

      {oldest.length ? (
        <section className="mt-14">
          <h2 className="text-[1.3rem] tracking-tight">Oldest first</h2>
          <p className="mt-2.5 max-w-[64ch] text-[14px] leading-relaxed text-muted-fg">
            The rules most overdue a look. This list is ordered against us on purpose.
          </p>
          <ul className="mt-6 list-none border-t p-0">
            {oldest.map((rule) => {
              const band = stalenessOf(rule.lastVerified);
              return (
                <li
                  key={rule.slug}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-5 border-b border-border-soft py-3.5"
                >
                  <Link
                    href={`/rules/${rule.slug}`}
                    className="min-w-0 text-[15px] hover:text-accent"
                  >
                    {rule.title}
                  </Link>
                  <span
                    className={cn(
                      "num text-[12px] whitespace-nowrap",
                      band === "fresh" ? "text-dim" : band === "ageing" ? "text-soon" : "text-live",
                    )}
                  >
                    {rule.lastVerified ? fmtDate(rule.lastVerified) : "no date"}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className="mt-14 border-t pt-10">
        <p className="max-w-[64ch] text-[14px] leading-relaxed text-dim">
          The same discipline applied to the lists we query is on{" "}
          <Link href="/blocklists" className="underline underline-offset-3 hover:text-fg">
            the blocklist census
          </Link>
          , and how a claim gets onto this shelf in the first place is on{" "}
          <Link href="/methodology" className="underline underline-offset-3 hover:text-fg">
            methodology
          </Link>
          .
        </p>
      </section>
    </div>
  );
}

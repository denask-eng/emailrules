import type { Metadata } from "next";
import Link from "next/link";
import { getAllRules, getStats, countsByOwnership, fmtDate } from "@/lib/rules";
import { TOPICS, JURISDICTIONS } from "@/lib/types";
import type { Topic, Jurisdiction } from "@/lib/types";
import { EMPTY_AUDIENCE, parseAudienceParam } from "@/lib/audience";
import { RuleFilter } from "@/components/rule-filter";
import { OwnershipBar, JurisdictionMatrix } from "@/components/graphics";

export const metadata: Metadata = {
  title: "Rules for your setup",
  description:
    "Answer one question and see the five email rules that need you — and which ones your ESP already handles. EU, UK, US, Canada, Australia and global provider rules, each one dated.",
  /* Every filter state is the same shelf in a different order, so all of them
     point at the bare URL rather than competing with it in the index. */
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

/** `searchParams` arrives as a plain object; the audience codec speaks query strings. */
function toQuery(params: Record<string, string | string[] | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    const first = Array.isArray(v) ? v[0] : v;
    if (typeof first === "string") q.set(k, first);
  }
  return q.toString();
}

export default async function RulesIndex({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [rules, params, stats, own] = await Promise.all([
    getAllRules(),
    searchParams,
    getStats(),
    countsByOwnership(),
  ]);
  /* `notYours` folds shared, context and esp together, so "yours outright" is
     the remainder — the same arithmetic the homepage uses. */
  const yours = stats.total - stats.notYours;

  /**
   * A setup link is a real growth surface — the homepage picker sends people
   * here with the answer already in the query string — so the server resolves
   * it and renders the matching shelf. With no params this is the whole corpus,
   * which is exactly what a crawler, or a reader with JavaScript off, should get.
   */
  const initial = parseAudienceParam(toQuery(params)) ?? EMPTY_AUDIENCE;

  const topics = (Object.keys(TOPICS) as Topic[])
    .map((t) => ({ t, n: rules.filter((r) => r.topic === t).length }))
    .filter(({ n }) => n > 0);

  const geos = GEO_ORDER.filter((j) => rules.some((r) => r.jurisdictions.includes(j))).map((j) => ({
    j,
    n: rules.filter((r) => r.jurisdictions.includes(j)).length,
    label: JURISDICTIONS[j]?.label ?? j,
  }));

  return (
    <div className="shell py-12 sm:py-16">
      {/* The ownership split is this site's entire argument and it was a grey
          sentence inside the filter. It is a measurement of the shelf, so it
          gets the surface the other measurements get. */}
      <figure className="m-0 mb-10 overflow-hidden rounded-2xl bg-[#141417] shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]">
        <div className="num flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-b border-white/8 px-5 py-3.5 text-[11px] tracking-[0.11em] text-white/38 uppercase sm:px-7">
          <span>The shelf · {rules.length} rules</span>
          <span>verified {fmtDate(stats.lastReview)}</span>
        </div>

        <div className="px-5 pt-9 pb-8 sm:px-7 sm:pt-10">
          <h1 className="max-w-[16ch] text-[clamp(2rem,5.6vw,3.2rem)] leading-[1.0] font-semibold tracking-[-0.04em] text-white text-balance">
            {yours} of {rules.length} need a person.
          </h1>

          {/* Four values, drawn to scale. The proportion is the claim. */}
          <div className="mt-8 flex h-2 w-full overflow-hidden rounded-full">
            {(
              [
                ["bg-[#ff9d94]", yours],
                ["bg-[#f0c26a]", stats.shared],
                ["bg-white/25", stats.nothingToDo],
                ["bg-[#7ee0a8]", stats.fullyHandled],
              ] as const
            ).map(([tone, n], i) => (
              <span
                key={i}
                className={tone}
                style={{ width: `${(n / rules.length) * 100}%` }}
                aria-hidden
              />
            ))}
          </div>

          <dl className="num mt-5 grid gap-x-6 gap-y-2 text-[11px] tracking-[0.06em] text-white/45 uppercase sm:grid-cols-4">
            {(
              [
                ["#ff9d94", yours, "yours outright"],
                ["#f0c26a", stats.shared, "shared with your tool"],
                ["rgb(255 255 255 / 0.25)", stats.nothingToDo, "nothing to do"],
                ["#7ee0a8", stats.fullyHandled, "your tool handles"],
              ] as const
            ).map(([hex, n, label]) => (
              <div key={label} className="flex items-baseline gap-2">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: hex }}
                  aria-hidden
                />
                <dt className="text-[1.15rem] leading-none font-semibold text-white">{n}</dt>
                <dd className="m-0">{label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </figure>

      {/* The shape of the shelf, before the filter that reshapes it. Branch C
          was right that this is a proportion and the page never drew it. */}
      <OwnershipBar
        counts={own}
        total={stats.total}
        className="mb-9"
        caption={
          <>
            Sorted by whose desk it lands on, not by how alarming it sounds. Exactly{" "}
            <b className="font-medium text-fg">{stats.fullyHandled}</b> of these is finished for you
            by any mainstream tool, and that segment is drawn at its real width.
          </>
        }
      />

      <RuleFilter rules={rules} initial={initial} />

      {/* "Does this hit me?" answered without prose — and as a real table, so
          a screen reader walks it and a crawler reads the relationships. */}
      <section className="mt-14">
        <h2 className="text-[1.15rem] tracking-tight">Does this hit me?</h2>
        <p className="mt-1.5 max-w-[56ch] text-[13.5px] leading-relaxed text-muted-fg">
          Rules down, countries across. Find your column and read down it.
        </p>
        <JurisdictionMatrix
          rules={rules}
          geos={geos.map((g) => g.j)}
          className="mt-4"
        />
      </section>

      {/*
        The topic and jurisdiction shelves are real routes and Google walks this
        page to reach them, so every link stays. They are folded into one line
        because a second and third taxonomy beside the primary path is not a
        choice, it is an obstacle.
      */}
      <details className="faq-item group mt-16 border-t pt-4">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 outline-none marker:content-none focus-visible:bg-muted/60 [&::-webkit-details-marker]:hidden">
          <span className="min-w-0 flex-1 text-[14px] text-muted-fg">
            Prefer to browse by topic or country?
          </span>
          <span
            aria-hidden
            className="num shrink-0 text-[13px] text-dim transition-transform duration-300 ease-out group-open:rotate-45"
          >
            +
          </span>
        </summary>
        <div className="faq-body">
          <div className="pt-3">
            <p className="max-w-[74ch] text-[13.5px] leading-loose">
              <span className="label mr-2.5">By topic</span>
              {topics.map(({ t, n }, i) => (
                <span key={t}>
                  {i > 0 ? <span className="text-dim"> · </span> : null}
                  <Link
                    href={`/topics/${t}`}
                    className="text-muted-fg underline decoration-input underline-offset-[3px] hover:text-fg hover:decoration-accent"
                  >
                    {TOPICS[t].label}
                  </Link>{" "}
                  <span className="num text-[12px] text-dim">{n}</span>
                </span>
              ))}
            </p>
            <p className="mt-3.5 max-w-[74ch] text-[13.5px] leading-loose">
              <span className="label mr-2.5">By country</span>
              {geos.map(({ j, n, label }, i) => (
                <span key={j}>
                  {i > 0 ? <span className="text-dim"> · </span> : null}
                  <Link
                    href={`/jurisdictions/${j.toLowerCase()}`}
                    className="text-muted-fg underline decoration-input underline-offset-[3px] hover:text-fg hover:decoration-accent"
                  >
                    {label}
                  </Link>{" "}
                  <span className="num text-[12px] text-dim">{n}</span>
                </span>
              ))}
            </p>
            <p className="mt-4 max-w-[58ch] pb-1 text-[12.5px] leading-relaxed text-dim">
              Only the places we hold dated pages for. Not every country — we do not invent empty
              shelves.
            </p>
          </div>
        </div>
      </details>
    </div>
  );
}

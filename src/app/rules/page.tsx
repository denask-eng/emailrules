import type { Metadata } from "next";
import Link from "next/link";
import { getAllRules } from "@/lib/rules";
import { TOPICS, JURISDICTIONS } from "@/lib/types";
import type { Topic, Jurisdiction } from "@/lib/types";
import { EMPTY_AUDIENCE, parseAudienceParam } from "@/lib/audience";
import { RuleFilter } from "@/components/rule-filter";

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
  const [rules, params] = await Promise.all([getAllRules(), searchParams]);

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
      {/* SectionHead's grammar, promoted to h1: this is the page, not a band on it. */}
      <div className="mb-9">
        <p className="label">Rules</p>
        <h1 className="mt-3 text-[clamp(24px,3.4vw,34px)]">What matters for you</h1>
        <p className="mt-3 max-w-[56ch] text-[16px] leading-relaxed text-muted-fg">
          One question, then the five that matter. <span className="num">{rules.length}</span>{" "}
          pages, each one dated, sourced, and straight about whose job it is.
        </p>
      </div>

      <RuleFilter rules={rules} initial={initial} />

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

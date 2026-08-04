import Link from "next/link";
import { cn } from "@/lib/utils";
import { fmtDate, daysSince } from "@/lib/format";
import { OWNERSHIP, JURISDICTIONS } from "@/lib/types";
import type { Rule, Ownership, Jurisdiction } from "@/lib/types";
import { Signal } from "@/components/signal";

/**
 * Borrowed from branch C ("The Broadsheet"), which was right that this site
 * had no information graphics at all — on a publication whose entire argument
 * is a *proportion*: most of what sounds like your job is not.
 *
 * Four graphics, a small reusable vocabulary, hand-authored SVG built from
 * `@/lib/rules` at render time. No chart library: these are simple enough to
 * author by hand, and hand-authoring is what lets them be Server Components
 * that stay in the DOM for a crawler.
 *
 * The house rule for all four: **plot what is there.** Nothing is smoothed,
 * bucketed generously, or rounded into a nicer story. The staleness meter in
 * particular plots this site's own weak spots, because that is the same move
 * as the blocklist census — printing the number that costs us is what makes
 * every other number believable.
 *
 * Every chart carries an `aria-label` stating its real figures, and every one
 * is accompanied by the same numbers in markup. None of them is the only route
 * to its data.
 */

/* ------------------------------------------------------------------ *
 * 1. Ownership bar — the thesis, drawn once
 * ------------------------------------------------------------------ */

const OWN_ORDER: { key: Ownership; short: string; fill: string }[] = [
  { key: "esp", short: "Platform's job", fill: "var(--plot-1)" },
  { key: "shared", short: "Shared", fill: "var(--plot-2)" },
  { key: "yours", short: "Yours", fill: "var(--plot-3)" },
  { key: "context", short: "Nothing to do", fill: "var(--plot-4)" },
];

/**
 * One stacked horizontal bar: platform's job / shared / yours / nothing to do.
 *
 * This single graphic says in one glance what the numbered "Why care" item
 * needs two hundred words to say. It does not replace those words — they sit
 * underneath it — it just means nobody has to read them to get the shape.
 *
 * The segment for "a mainstream tool has finished this for you" is one rule
 * wide on the real corpus, and it is drawn one rule wide.
 */
export function OwnershipBar({
  counts,
  total,
  height = 30,
  showLegend = true,
  className,
  caption,
}: {
  counts: Record<Ownership, number>;
  total: number;
  height?: number;
  showLegend?: boolean;
  className?: string;
  caption?: React.ReactNode;
}) {
  const segs = OWN_ORDER.map((o) => ({
    ...o,
    n: counts[o.key] ?? 0,
    pct: total > 0 ? ((counts[o.key] ?? 0) / total) * 100 : 0,
  })).filter((s) => s.n > 0);

  return (
    <figure className={cn("m-0", className)}>
      <div
        className="flex w-full gap-px overflow-hidden rounded-[3px] border border-border bg-border"
        style={{ height }}
        role="img"
        aria-label={`Of ${total} rules: ${segs
          .map((s) => `${s.n} ${OWNERSHIP[s.key].label}`)
          .join("; ")}.`}
      >
        {segs.map((s, i) => (
          <div
            key={s.key}
            className="grow-x flex items-center justify-center"
            style={
              {
                "--w": `${s.pct}%`,
                "--grow-delay": `${i * 80}ms`,
                background: s.fill,
              } as React.CSSProperties
            }
            title={`${s.n} of ${total} — ${OWNERSHIP[s.key].label}`}
          >
            {s.pct > 9 ? (
              <span
                className="num text-[11px] font-semibold"
                style={{ color: s.key === "yours" ? "var(--accent-fg)" : "var(--fg)" }}
              >
                {s.n}
              </span>
            ) : null}
          </div>
        ))}
      </div>

      {showLegend ? (
        <ul className="mt-2.5 flex list-none flex-wrap gap-x-4 gap-y-1.5 p-0">
          {segs.map((s) => (
            <li key={s.key} className="flex items-center gap-1.5 text-[12px] text-muted-fg">
              <span
                aria-hidden
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-[2px] border border-border"
                style={{ background: s.fill }}
              />
              <span className="num font-semibold text-fg">{s.n}</span>
              <span>{s.short}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {caption ? (
        <figcaption className="mt-2.5 max-w-[58ch] text-[13px] leading-relaxed text-muted-fg">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

/* ------------------------------------------------------------------ *
 * 3. Staleness meter — our own weak spots, plotted
 * ------------------------------------------------------------------ */

const AGE_BANDS = [
  { max: 30, label: "0–30d", fill: "var(--plot-3)" },
  { max: 90, label: "31–90", fill: "var(--plot-2)" },
  { max: 180, label: "91–180", fill: "var(--plot-1)" },
  { max: 365, label: "180–365", fill: "var(--live)" },
  { max: Infinity, label: "365+", fill: "var(--live)" },
];

/**
 * How old every page on this shelf actually is, including the stale ones.
 *
 * A reference that only publishes its freshest figure is asking to be trusted
 * on the rest. Anything past 180 days is drawn in the alarm colour — the same
 * one used for an obligation that is biting — deliberately, because a page
 * nobody has re-read is a liability of the same kind.
 */
export function StalenessMeter({
  rules,
  className,
  height = 132,
}: {
  rules: Rule[];
  className?: string;
  height?: number;
}) {
  const aged = rules.map((r) => ({ rule: r, age: daysSince(r.lastVerified) }));
  const bands = AGE_BANDS.map((b, i) => {
    const lo = i === 0 ? -Infinity : AGE_BANDS[i - 1].max;
    return { ...b, n: aged.filter((a) => a.age > lo && a.age <= b.max).length };
  });
  const max = Math.max(...bands.map((b) => b.n), 1);
  const stale = aged.filter((a) => a.age > 180);

  const W = 620;
  const padL = 6;
  const padB = 24;
  const barW = (W - padL * 2) / bands.length;

  return (
    <figure className={cn("m-0", className)}>
      <svg
        viewBox={`0 0 ${W} ${height}`}
        width="100%"
        role="img"
        aria-label={`Verification age across ${rules.length} rules: ${bands
          .map((b) => `${b.n} at ${b.label}`)
          .join("; ")}. ${stale.length} have not been re-verified in over 180 days.`}
        className="block"
      >
        {bands.map((b, i) => {
          const h = (b.n / max) * (height - padB - 16);
          const bx = padL + i * barW;
          return (
            <g key={b.label}>
              <rect x={bx + 5} y={height - padB - h} width={barW - 10} height={h} fill={b.fill} />
              {b.n > 0 ? (
                <text
                  className="chart-value"
                  x={bx + barW / 2}
                  y={height - padB - h - 5}
                  textAnchor="middle"
                >
                  {b.n}
                </text>
              ) : null}
              <text className="chart-label" x={bx + barW / 2} y={height - 8} textAnchor="middle">
                {b.label}
              </text>
            </g>
          );
        })}
        <line
          x1={padL}
          y1={height - padB}
          x2={W - padL}
          y2={height - padB}
          stroke="var(--plot-axis)"
          strokeWidth={1}
        />
      </svg>

      <figcaption className="mt-2.5 max-w-[60ch] text-[13px] leading-relaxed text-muted-fg">
        Days since a person last re-read the primary source, for every one of{" "}
        <span className="num">{rules.length}</span> pages.{" "}
        {stale.length ? (
          <>
            <b className="font-medium text-live">
              <span className="num">{stale.length}</span>{" "}
              {stale.length === 1 ? "page has" : "pages have"}
            </b>{" "}
            not been re-verified in over 180 days, and {stale.length === 1 ? "says" : "say"} so at
            the top of {stale.length === 1 ? "its" : "their"} own page.
          </>
        ) : (
          "Nothing on the shelf is over 180 days old."
        )}
      </figcaption>
    </figure>
  );
}

/* ------------------------------------------------------------------ *
 * 4. Jurisdiction matrix — does this hit me?
 * ------------------------------------------------------------------ */

/**
 * Rules × geography as a dense dot grid: find your column, read down it.
 *
 * Rendered as a real `<table>` with row and column headers, not as SVG. An SVG
 * dot grid would look identical and say nothing — this way a screen reader
 * walks it as the table it is, and a crawler reads the relationships.
 */
export function JurisdictionMatrix({
  rules,
  geos,
  className,
}: {
  rules: Rule[];
  geos: Jurisdiction[];
  className?: string;
}) {
  const rows = [...rules].sort(
    (a, b) => b.jurisdictions.length - a.jurisdictions.length || a.title.localeCompare(b.title),
  );
  const totals = geos.map((j) => rules.filter((r) => r.jurisdictions.includes(j)).length);

  return (
    <figure className={cn("m-0", className)}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[12px]">
          <caption className="sr-only">
            Which jurisdictions each rule applies in. A filled cell means the rule names that
            jurisdiction.
          </caption>
          <thead>
            <tr>
              <th scope="col" className="label sticky left-0 z-10 bg-bg py-2 pr-3 text-left">
                Rule
              </th>
              {geos.map((j) => (
                <th
                  key={j}
                  scope="col"
                  className="label w-7 py-2 align-bottom"
                  title={JURISDICTIONS[j]?.label ?? j}
                >
                  <span className="block [writing-mode:vertical-rl] [text-orientation:mixed]">
                    {j}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.slug} className="hover:bg-muted/50">
                <th
                  scope="row"
                  className="sticky left-0 z-10 max-w-[24rem] truncate bg-bg py-1.5 pr-3 text-left font-normal"
                >
                  <Link href={`/rules/${r.slug}`} className="hover:text-accent" title={r.title}>
                    {r.title}
                  </Link>
                </th>
                {geos.map((j) => {
                  const on = r.jurisdictions.includes(j);
                  return (
                    <td key={j} className="py-1.5 text-center">
                      <span className="sr-only">
                        {on ? `applies in ${JURISDICTIONS[j]?.label ?? j}` : "does not apply"}
                      </span>
                      <span
                        aria-hidden
                        className={cn(
                          "inline-block h-2 w-2 rounded-full",
                          on
                            ? r.status === "upcoming"
                              ? "bg-live"
                              : "bg-fg"
                            : "bg-border",
                        )}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-fg/25">
              <th scope="row" className="label sticky left-0 bg-bg py-2 pr-3 text-left">
                Rules that hit you
              </th>
              {totals.map((n, i) => (
                <td key={geos[i]} className="num py-2 text-center text-[11px] font-semibold">
                  {n}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
      <figcaption className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5 text-[12px] text-muted-fg">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-fg" />
          in force
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-live" />
          starts later
        </span>
        <span>Only jurisdictions we hold dated pages for. We do not invent empty shelves.</span>
      </figcaption>
    </figure>
  );
}

/** A compact ownership readout for a rule row, using the shape system. */
export function OwnershipMark({ ownership }: { ownership: Ownership }) {
  const state =
    ownership === "yours" ? "fail" : ownership === "shared" ? "pend" : ownership === "esp" ? "pass" : "na";
  return (
    <span className="inline-flex items-center gap-1.5">
      <Signal state={state} size={8} label={false} />
      <span className="text-[11px] font-medium">{OWNERSHIP[ownership].short}</span>
    </span>
  );
}

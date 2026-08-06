import type { Metadata } from "next";
import Link from "next/link";
import {
  latestAggregate,
  aggregateBySector,
  indexSeries,
  latestReadings,
  indexMoves,
} from "@/lib/email-index";
import { INDEX_SECTORS, INDEX_ROSTER } from "@/content/index-roster";
import { fmtDate } from "@/lib/format";
import { Signal } from "@/components/signal";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Experimental Email Authentication Index",
  description:
    "The authentication posture of the internet's better-known senders, measured from public DNS every day and kept. DMARC policy, SPF strictness, DKIM and BIMI across ecommerce, software, media, retail, travel, finance and marketplaces — with the roster published in full and every percentage carrying its denominator.",
  alternates: { canonical: "/email-index" },
  robots: { index: false, follow: false },
};

/* A day-old reading is still today's answer until the morning sweep runs. */
export const revalidate = 1800;

/**
 * The Index.
 *
 * Once a year this category publishes a PDF called "The State of Email
 * Authentication", assembled by a vendor selling the remedy, from a sample
 * nobody can inspect, and it gets screenshotted for twelve months.
 *
 * This is the same question asked as an instrument: every day, from public
 * DNS, against a roster published in full in the repository, with every
 * percentage carrying its denominator and every domain's own reading printed
 * underneath so the aggregate can be checked rather than believed.
 */

function pct(n: number, of: number): string {
  if (of <= 0) return "—";
  return `${Math.round((n / of) * 100)}%`;
}

export default async function IndexPage() {
  const [agg, sectors, series, readings, moves] = await Promise.all([
    latestAggregate(),
    aggregateBySector(),
    indexSeries(120),
    latestReadings(),
    indexMoves(),
  ]);

  /* Nothing measured yet. Say that plainly rather than rendering an empty
     chart that reads as "zero per cent". */
  if (!agg || agg.n === 0) {
    return (
      <div className="shell py-12 sm:py-16">
        <p className="label">The Index</p>
        <h1 className="mt-4 max-w-[18ch] text-[clamp(2rem,5.6vw,3.2rem)] leading-[1.02] tracking-[-0.04em]">
          No reading has been taken yet.
        </h1>
        <p className="mt-6 max-w-[62ch] text-[1.04rem] leading-relaxed text-muted-fg">
          The roster is published and the sweep is scheduled, but nothing has been measured yet, so
          there is nothing here. An empty chart would read as a result, and this page will not print
          a number it does not have.{" "}
          <Link href="/methodology" className="text-accent underline underline-offset-2">
            How this is measured
          </Link>
          .
        </p>
        <p className="num mt-6 text-[13px] text-dim">
          {INDEX_ROSTER.length} domains on the roster · first reading pending
        </p>
      </div>
    );
  }

  const strongDmarc = agg.dmarc.quarantine + agg.dmarc.reject;
  const spark = series.filter((s) => s.n > 0);

  return (
    <div className="shell py-12 sm:py-16">
      <p className="label">The Index · measured daily from public DNS</p>
      {/* The headline is the DMARC number, not the signer number.

          The signer figure was briefly the headline — "49% of the senders we
          can audit sign with a platform their SPF never names" — and it is a
          real count of a real thing, but it is not a finding. SPF is evaluated
          against the envelope domain, and every major platform sends with its
          own bounce domain by default, so a root record that does not name the
          signer is the normal configuration rather than a fault. Stripe,
          Shopify and Figma all look like that and none of them is broken.

          DMARC policy is different: it is read directly off the domain's own
          record and means exactly what it says. That is what a benchmark
          should be built on. */}
      <h1 className="mt-4 max-w-[22ch] text-[clamp(2rem,5.6vw,3.2rem)] leading-[1.02] tracking-[-0.04em]">
        {pct(strongDmarc, agg.n)} of the best-known senders enforce DMARC.
      </h1>

      <p className="mt-6 max-w-[64ch] text-[1.04rem] leading-relaxed text-muted-fg">
        Read from public DNS on <span className="num">{fmtDate(agg.day)}</span> across{" "}
        <span className="num">{agg.n}</span> domains in seven sectors. Every percentage on this page
        carries the number it was calculated from, the roster is published in full, and each
        domain&rsquo;s own reading is printed below so the aggregate can be checked rather than
        believed.
      </p>

      {/* ── The headline numbers ─────────────────────────────────────── */}
      <section className="mt-10 grid gap-px overflow-hidden rounded-2xl border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            k: "At quarantine or reject",
            v: pct(strongDmarc, agg.n),
            sub: `${strongDmarc} of ${agg.n}`,
            state: "pass" as const,
          },
          {
            k: "Still at p=none",
            v: pct(agg.dmarc.none, agg.n),
            sub: `${agg.dmarc.none} of ${agg.n} publish a policy that enforces nothing`,
            state: "pend" as const,
          },
          {
            k: "No DMARC at all",
            v: pct(agg.dmarc.absent, agg.n),
            sub: `${agg.dmarc.absent} of ${agg.n}`,
            state: agg.dmarc.absent > 0 ? ("fail" as const) : ("pass" as const),
          },
          {
            k: "Collecting rua reports",
            v: pct(agg.rua, agg.n),
            sub: `${agg.rua} of ${agg.n} would find out if something broke`,
            state: "pass" as const,
          },
        ].map((f) => (
          <div key={f.k} className="bg-bg p-5">
            <p className="label flex items-center gap-1.5">
              <Signal state={f.state} size={8} label={false} />
              {f.k}
            </p>
            <p className="num mt-2 text-[2rem] leading-none font-semibold tracking-tight">{f.v}</p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-muted-fg">{f.sub}</p>
          </div>
        ))}
      </section>

      {/* ── The series ───────────────────────────────────────────────── */}
      {spark.length > 1 ? (
        <section className="mt-12">
          <h2 className="text-[1.15rem] tracking-tight">Enforcement over time</h2>
          <p className="mt-1.5 max-w-[60ch] text-[13.5px] leading-relaxed text-muted-fg">
            Share of the roster at quarantine or reject, one point per day measured. Nobody can
            backfill this — it starts the day it starts.
          </p>
          <Series points={spark} className="mt-5" />
        </section>
      ) : (
        <p className="mt-10 max-w-[62ch] text-[13.5px] leading-relaxed text-dim">
          One reading so far. The series begins once there are two — this page will not draw a trend
          through a single point.
        </p>
      )}

      {/* ── What moved ───────────────────────────────────────────────── */}
      {moves && moves.moves.length ? (
        <section className="mt-12">
          <h2 className="text-[1.15rem] tracking-tight">
            What moved since {fmtDate(moves.from)}
          </h2>
          <ul className="mt-4 list-none border-t p-0">
            {moves.moves.map((m, i) => (
              <li
                key={`${m.domain}-${m.field}-${i}`}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b py-2.5 text-[13.5px]"
              >
                <span className="num w-[12rem] shrink-0 font-medium">{m.domain}</span>
                <span className="text-muted-fg">{m.field}</span>
                <span className="num ml-auto text-[12.5px]">
                  <span className="text-dim">{m.from}</span>
                  <span aria-hidden className="mx-2 text-dim">
                    →
                  </span>
                  <span className="font-medium text-fg">{m.to}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ── Sectors ──────────────────────────────────────────────────── */}
      {sectors.length ? (
        <section className="mt-12">
          <h2 className="text-[1.15rem] tracking-tight">By sector</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b-2 border-fg/20">
                  <th className="label py-2 pr-4 text-left">Sector</th>
                  <th className="label py-2 pr-4 text-right">n</th>
                  <th className="label py-2 pr-4 text-right">Enforcing</th>
                  <th className="label py-2 pr-4 text-right">p=none</th>
                  <th className="label py-2 pr-4 text-right">No DMARC</th>
                  <th className="label py-2 text-right">rua</th>
                </tr>
              </thead>
              <tbody>
                {sectors.map((s) => {
                  const strong = s.dmarc.quarantine + s.dmarc.reject;
                  return (
                    <tr key={s.sector} className="border-b border-border-soft">
                      <td className="py-2 pr-4">
                        <span className="font-medium">{INDEX_SECTORS[s.sector].label}</span>
                        <span className="mt-0.5 block max-w-[44ch] text-[12px] leading-snug text-dim">
                          {INDEX_SECTORS[s.sector].blurb}
                        </span>
                      </td>
                      <td className="num py-2 pr-4 text-right text-dim">{s.n}</td>
                      <td className="num py-2 pr-4 text-right font-semibold">
                        {pct(strong, s.n)}
                      </td>
                      <td className="num py-2 pr-4 text-right text-muted-fg">
                        {pct(s.dmarc.none, s.n)}
                      </td>
                      <td className="num py-2 pr-4 text-right text-muted-fg">
                        {pct(s.dmarc.absent, s.n)}
                      </td>
                      <td className="num py-2 text-right text-muted-fg">{pct(s.rua, s.n)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {/* ── The honesty note that makes the rest usable ──────────────── */}
      <section className="mt-12 rounded-2xl border border-accent/25 bg-accent-soft px-5 py-6 sm:px-7">
        <h2 className="text-[1.05rem] tracking-tight">What this does not claim</h2>
        <p className="mt-3 max-w-[70ch] text-[14.5px] leading-relaxed">
          <b>An unreadable SPF is not a failure.</b>{" "}
          <span className="num">{agg.spf.unreadable}</span> of {agg.n} publish a macro record or
          delegate their sender list to a hosted manager. Those cannot be expanded by reading DNS —
          not by us, not by anyone — so they are excluded from every statistic about who authorises
          whom rather than counted as broken. This site shipped that mistake once, publicly, against
          three named brands.
        </p>
        <p className="mt-3 max-w-[70ch] text-[14.5px] leading-relaxed">
          <b>We do not publish a &ldquo;misconfigured&rdquo; rate, and here is why.</b>{" "}
          <span className="num">{agg.signerMismatch}</span> of the{" "}
          <span className="num">{agg.readable}</span> readable domains publish DKIM keys for a
          platform their SPF does not name. That is a real count, and it is <i>not</i> a fault rate.
          SPF is evaluated against the envelope domain, and every major platform sends with its own
          bounce domain by default — so on those messages the sender&rsquo;s SPF is never consulted
          and DMARC passes on DKIM alignment alone, exactly as intended. Stripe, Shopify and Figma
          all look like this. A benchmark that counted them as broken would be wrong about the
          best-run senders in the index, so this one does not.
        </p>
        <p className="mt-3 max-w-[70ch] text-[14.5px] leading-relaxed">
          <b>DNS is not deliverability.</b> A domain at p=reject with perfect records can still be
          sending mail nobody asked for. This measures what a sender has published, which is the
          floor, not the ceiling.
        </p>
        <p className="mt-3 max-w-[70ch] text-[14.5px] leading-relaxed">
          <b>No sender is ranked.</b> There is no leaderboard and no score. The roster was fixed
          before the first reading and does not change because a number moves.
        </p>
      </section>

      {/* ── Every reading, printed ───────────────────────────────────── */}
      <section className="mt-12">
        <h2 className="text-[1.15rem] tracking-tight">Every domain, as measured</h2>
        <p className="mt-1.5 max-w-[62ch] text-[13.5px] leading-relaxed text-muted-fg">
          The aggregate above is calculated from exactly these rows. Check our arithmetic.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b-2 border-fg/20">
                <th className="label py-2 pr-4 text-left">Domain</th>
                <th className="label py-2 pr-4 text-left">DMARC</th>
                <th className="label py-2 pr-4 text-left">SPF</th>
                <th className="label py-2 pr-4 text-right">DKIM</th>
                <th className="label py-2 text-left">Notes</th>
              </tr>
            </thead>
            <tbody>
              {readings.map((r) => (
                <tr key={r.domain} className="border-b border-border-soft hover:bg-muted/40">
                  <td className="py-1.5 pr-4">
                    <Link href={`/check/${r.domain}`} className="num hover:text-accent">
                      {r.domain}
                    </Link>
                  </td>
                  <td className="num py-1.5 pr-4">
                    <span className="inline-flex items-center gap-1.5">
                      <Signal
                        state={
                          r.dmarcPolicy === "reject" || r.dmarcPolicy === "quarantine"
                            ? "pass"
                            : r.dmarcPolicy === "none"
                              ? "pend"
                              : "fail"
                        }
                        size={7}
                        label={false}
                      />
                      {r.dmarcPolicy ? `p=${r.dmarcPolicy}` : "absent"}
                    </span>
                  </td>
                  <td className="num py-1.5 pr-4 text-muted-fg">
                    {r.spfAll ?? (r.hasSpf ? "no all" : "absent")}
                  </td>
                  <td className="num py-1.5 pr-4 text-right text-muted-fg">{r.dkimKeys}</td>
                  <td className="py-1.5 text-[12px] text-dim">
                    {!r.spfReadable ? "SPF not readable from DNS" : null}
                    {r.spfReadable && (r.unauthorised ?? 0) > 0
                      ? `signs with ${r.unauthorised} platform${r.unauthorised === 1 ? "" : "s"} its SPF does not name — normal if that platform sends with its own return path`
                      : null}
                    {r.spfLookups > 10 ? " · over the 10-lookup limit" : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="mt-10 flex flex-wrap gap-x-5 gap-y-2 border-t pt-5 text-[13px] text-muted-fg">
        <a
          href="/api/index"
          className="num underline underline-offset-3 hover:text-accent"
        >
          The whole index as JSON →
        </a>
        <Link href="/blocklists" className="underline underline-offset-3 hover:text-fg">
          The blocklist census
        </Link>
        <Link href="/methodology" className="underline underline-offset-3 hover:text-fg">
          How we measure
        </Link>
        <a
          href="/corrections#report"
          className="underline underline-offset-3 hover:text-fg"
        >
          Tell us we are wrong
        </a>
      </p>
    </div>
  );
}

/**
 * The enforcement series, hand-authored SVG.
 *
 * One point per day measured, plotted honestly: no smoothing, no interpolation
 * across days we did not measure, and the y-axis runs 0–100 rather than
 * zooming to make a two-point change look like a trend.
 */
function Series({
  points,
  className,
}: {
  points: { day: string; n: number; dmarc: { quarantine: number; reject: number } }[];
  className?: string;
}) {
  const W = 1000;
  const H = 180;
  const padL = 34;
  const padB = 22;
  const padT = 10;

  const vals = points.map((p) => ({
    day: p.day,
    v: p.n > 0 ? ((p.dmarc.quarantine + p.dmarc.reject) / p.n) * 100 : 0,
  }));

  const x = (i: number) =>
    padL + (vals.length === 1 ? (W - padL) / 2 : (i / (vals.length - 1)) * (W - padL - 8));
  const y = (v: number) => padT + (1 - v / 100) * (H - padT - padB);

  const d = vals.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.v).toFixed(1)}`).join(" ");
  const last = vals[vals.length - 1];

  return (
    <figure className={cn("m-0", className)}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label={`Share of the roster at DMARC quarantine or reject, ${vals.length} daily readings, ending at ${Math.round(last.v)} per cent on ${fmtDate(last.day)}.`}
        className="block"
      >
        {[0, 25, 50, 75, 100].map((g) => (
          <g key={g}>
            <line
              x1={padL}
              y1={y(g)}
              x2={W - 8}
              y2={y(g)}
              stroke="var(--plot-grid)"
              strokeWidth={1}
            />
            <text className="chart-label" x={padL - 8} y={y(g) + 3} textAnchor="end">
              {g}%
            </text>
          </g>
        ))}
        <path d={d} fill="none" stroke="var(--accent)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
        {vals.map((p, i) => (
          <circle key={p.day} cx={x(i)} cy={y(p.v)} r={2.4} fill="var(--accent)">
            <title>{`${fmtDate(p.day)} — ${Math.round(p.v)}%`}</title>
          </circle>
        ))}
      </svg>
      <figcaption className="mt-2 flex flex-wrap justify-between gap-2 text-[11.5px] text-dim">
        <span className="num">{fmtDate(vals[0].day)}</span>
        <span>{vals.length} daily readings · no smoothing, no interpolation</span>
        <span className="num">{fmtDate(last.day)}</span>
      </figcaption>
    </figure>
  );
}

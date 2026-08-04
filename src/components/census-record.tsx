import Link from "next/link";
import { censusMoves, zoneStreaks, censusSeries, censusDays } from "@/lib/census-history";
import { fmtDate } from "@/lib/format";
import { Signal } from "@/components/signal";
import { cn } from "@/lib/utils";
import type { ListStatus } from "@/lib/blocklist-check";

/**
 * The census, as a kept record rather than a reading.
 *
 * The live census answers "is this list answering right now". This answers the
 * questions a single reading cannot: how long it has been that way, when it
 * last worked, and what changed since yesterday.
 *
 * That last one is the reason to come back. A blocklist going silent, or a
 * dead one answering again, is news to everyone who queries it — and nobody in
 * this category reports it, because nobody else is measuring daily.
 */

function statusSignal(s: ListStatus) {
  return s === "answered" ? "pass" : s === "refused" ? "na" : "fail";
}

const STATUS_WORD: Record<ListStatus, string> = {
  answered: "answering",
  refused: "declining",
  wildcard: "answering everything",
  silent: "silent",
};

export async function CensusRecord() {
  const [moves, streaks, series, days] = await Promise.all([
    censusMoves(),
    zoneStreaks(),
    censusSeries(90),
    censusDays(400),
  ]);

  /* No series yet. Say so rather than drawing an empty chart, which reads as
     a result. */
  if (!streaks.length) {
    return (
      <section className="mt-14 border-t pt-8">
        <p className="label">The record</p>
        <h2 className="mt-3 text-[1.35rem] tracking-tight">The series starts once it starts.</h2>
        <p className="mt-3 max-w-[62ch] text-[14px] leading-relaxed text-muted-fg">
          Every zone above is probed against its RFC 5782 controls on each visit, and from today
          that reading is kept. Nothing here can be backfilled, so the record begins with the first
          measurement and grows from there.
        </p>
      </section>
    );
  }

  const dark = streaks.filter((s) => s.status !== "answered");
  const longestDark = [...dark].sort((a, b) => b.days - a.days).slice(0, 6);

  return (
    <section className="mt-14 border-t pt-8">
      <p className="label">The record · kept daily</p>
      <h2 className="mt-3 text-[1.35rem] tracking-tight">
        {days.length === 1
          ? "One day on record."
          : `${days.length} days on record, since ${fmtDate(days[days.length - 1])}.`}
      </h2>
      <p className="mt-3 max-w-[64ch] text-[14px] leading-relaxed text-muted-fg">
        The reading above is taken every morning and kept. That turns &ldquo;this list is
        dead&rdquo; — which is an opinion — into a date, which is not.
      </p>

      {/* ── What changed since yesterday: the daily hook ──────────────── */}
      {moves && moves.moves.length ? (
        <div className="mt-7 rounded-2xl border border-live/25 bg-live-bg px-5 py-5">
          <p className="label text-live">Changed since {fmtDate(moves.from)}</p>
          <ul className="mt-3 list-none p-0">
            {moves.moves.map((m) => (
              <li
                key={m.zone}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-live/15 py-2 text-[13.5px] last:border-b-0"
              >
                <span className="font-medium">{m.label}</span>
                <span className="num text-[11.5px] text-dim">{m.zone}</span>
                <span className="num ml-auto text-[12.5px]">
                  <span className="text-dim">{STATUS_WORD[m.from]}</span>
                  <span aria-hidden className="mx-2 text-dim">
                    →
                  </span>
                  <span className="font-medium">{STATUS_WORD[m.to]}</span>
                </span>
                {m.returned ? (
                  <span className="w-full text-[12.5px] leading-relaxed text-live">
                    This is a zone we do not query. It has started answering again, which means our
                    own roster is out of date — in public, where you can hold us to it.
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : moves ? (
        <p className="mt-7 flex items-center gap-2 text-[13.5px] text-muted-fg">
          <Signal state="pass" size={9} />
          Nothing changed since {fmtDate(moves.from)}. A quiet day is a result too.
        </p>
      ) : null}

      {/* ── How long each dark zone has been dark ─────────────────────── */}
      {longestDark.length ? (
        <div className="mt-9">
          <h3 className="text-[1.05rem] tracking-tight">Dark the longest</h3>
          <p className="mt-1.5 max-w-[62ch] text-[13px] leading-relaxed text-muted-fg">
            Zones not answering, and the last date on our record that they did. Several of these are
            still recommended by tools in daily use.
          </p>
          <ul className="mt-4 list-none border-t p-0">
            {longestDark.map((s) => (
              <li
                key={s.zone}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b py-2.5 text-[13.5px]"
              >
                <span className="flex items-center gap-2">
                  <Signal state={statusSignal(s.status)} size={8} label={false} />
                  <span className="font-medium">{s.label}</span>
                </span>
                <span className="num text-[11.5px] text-dim">{s.zone}</span>
                <span className="num ml-auto text-[12px] text-muted-fg">
                  {STATUS_WORD[s.status]} for{" "}
                  <b className="font-semibold text-fg">
                    {s.days} day{s.days === 1 ? "" : "s"}
                  </b>
                  {s.lastAnswered ? (
                    <span className="text-dim"> · last answered {fmtDate(s.lastAnswered)}</span>
                  ) : (
                    <span className="text-dim"> · never, on our record</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* ── The series ────────────────────────────────────────────────── */}
      {series.length > 1 ? (
        <div className="mt-9">
          <h3 className="text-[1.05rem] tracking-tight">Zones answering, by day</h3>
          <CensusSpark points={series} className="mt-4" />
        </div>
      ) : null}

      <p className="mt-8 text-[13px] text-muted-fg">
        <Link href="/methodology" className="underline underline-offset-3 hover:text-fg">
          How a list earns its place
        </Link>
        {" · "}
        <Link href="/email-index" className="underline underline-offset-3 hover:text-fg">
          The authentication index
        </Link>
      </p>
    </section>
  );
}

/** Answering out of total, per day. Hand-authored, no smoothing. */
function CensusSpark({
  points,
  className,
}: {
  points: { day: string; answered: number; total: number }[];
  className?: string;
}) {
  const W = 1000;
  const H = 120;
  const padL = 30;
  const padB = 20;
  const padT = 8;

  const max = Math.max(...points.map((p) => p.total), 1);
  const x = (i: number) =>
    padL + (points.length === 1 ? (W - padL) / 2 : (i / (points.length - 1)) * (W - padL - 8));
  const y = (v: number) => padT + (1 - v / max) * (H - padT - padB);
  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.answered).toFixed(1)}`)
    .join(" ");
  const last = points[points.length - 1];

  return (
    <figure className={cn("m-0", className)}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label={`Zones answering per day across ${points.length} readings, ending at ${last.answered} of ${last.total} on ${fmtDate(last.day)}.`}
        className="block"
      >
        <line x1={padL} y1={y(max)} x2={W - 8} y2={y(max)} stroke="var(--plot-grid)" strokeWidth={1} />
        <line x1={padL} y1={y(0)} x2={W - 8} y2={y(0)} stroke="var(--plot-axis)" strokeWidth={1} />
        <text className="chart-label" x={padL - 6} y={y(max) + 3} textAnchor="end">
          {max}
        </text>
        <path d={d} fill="none" stroke="var(--ok)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
        {points.map((p, i) => (
          <circle key={p.day} cx={x(i)} cy={y(p.answered)} r={2.2} fill="var(--ok)">
            <title>{`${fmtDate(p.day)} — ${p.answered} of ${p.total} answering`}</title>
          </circle>
        ))}
      </svg>
      <figcaption className="mt-2 flex flex-wrap justify-between gap-2 text-[11.5px] text-dim">
        <span className="num">{fmtDate(points[0].day)}</span>
        <span>
          {last.answered} of {last.total} answering · one reading per day, no interpolation
        </span>
        <span className="num">{fmtDate(last.day)}</span>
      </figcaption>
    </figure>
  );
}

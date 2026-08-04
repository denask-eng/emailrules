import { cn } from "@/lib/utils";

/**
 * The answer, as an object rather than a sentence.
 *
 * Everything on this site has been a well-edited document: a headline, a
 * paragraph, and rows of prose. That is right for a reference shelf and wrong
 * for a tool, because a sentence has to be read and a reader who has to read
 * before they know whether they are in trouble is not being served.
 *
 * So one bar carries the whole finding. Width is real volume, colour is the
 * verdict, and the grey band is the deliberate part: it is the mail that is
 * explicitly not your problem, drawn at its true size so you can see how much
 * of what other tools print in red was never worth printing.
 *
 * Every segment is also named in words underneath, because a colour key that
 * lives only in the bar is a puzzle, and the whole point is that nobody should
 * have to decode anything.
 */

export interface Segment {
  key: string;
  label: string;
  value: number;
  /** Semantic tone from the palette, not a raw colour. */
  tone: "ok" | "warn" | "bad" | "quiet";
  /** Said in the legend when this band is the one that matters. */
  note?: string;
}

const FILL: Record<Segment["tone"], string> = {
  ok: "bg-ok",
  warn: "bg-soon",
  bad: "bg-live",
  quiet: "bg-dim/45",
};

const DOT: Record<Segment["tone"], string> = {
  ok: "bg-ok",
  warn: "bg-soon",
  bad: "bg-live",
  quiet: "bg-dim/60",
};

const TEXT: Record<Segment["tone"], string> = {
  ok: "text-ok",
  warn: "text-soon",
  bad: "text-live",
  quiet: "text-dim",
};

/**
 * Percentages, without the lie at the bottom.
 *
 * Rounding 508 of 301,954 to "0%" tells the reader the band is empty when it is
 * the one band that matters. Anything real but sub-percent says so instead.
 */
function share(value: number, total: number): string {
  const pct = (value / total) * 100;
  if (pct > 0 && pct < 1) return "<1%";
  if (pct > 99 && pct < 100) return ">99%";
  return `${Math.round(pct)}%`;
}

export function ProofBar({
  segments,
  caption,
  className,
}: {
  segments: Segment[];
  caption?: string;
  className?: string;
}) {
  const live = segments.filter((s) => s.value > 0);
  const total = live.reduce((sum, s) => sum + s.value, 0);
  if (!total) return null;

  /* A band below this is invisible but still true, so it keeps a floor rather
     than vanishing — a 0.3% unauthenticated sliver is the row that matters
     most, and rounding it out of the picture would be the exact failure this
     component exists to avoid. */
  const MIN = 1.5;
  const widths = live.map((s) => Math.max((s.value / total) * 100, MIN));
  const scale = 100 / widths.reduce((a, b) => a + b, 0);

  return (
    <div className={className}>
      <div
        className="flex h-14 w-full gap-[3px] overflow-hidden rounded-xl sm:h-16"
        role="img"
        aria-label={live
          .map((s) => `${s.label}: ${s.value.toLocaleString("en-GB")}`)
          .join(", ")}
      >
        {live.map((segment, i) => (
          <span
            key={segment.key}
            className={cn("grow-x block h-full first:rounded-l-xl last:rounded-r-xl", FILL[segment.tone])}
            style={
              {
                "--w": `${widths[i] * scale}%`,
                "--grow-delay": `${i * 90}ms`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      {/* A grid, not a wrap. Four bands of different name lengths flowing into
          a flex row leave a ragged hole where the fourth drops, which reads as
          a layout that happened rather than one that was chosen. */}
      <ul className="mt-5 grid list-none grid-cols-2 gap-x-6 gap-y-5 p-0 lg:grid-cols-4">
        {live.map((segment) => (
          <li key={segment.key} className="min-w-0">
            <p className="flex items-center gap-2">
              <span aria-hidden className={cn("h-2.5 w-2.5 shrink-0 rounded-[3px]", DOT[segment.tone])} />
              <span className={cn("num text-[1.5rem] leading-none font-semibold tracking-[-0.035em]", TEXT[segment.tone])}>
                {segment.value.toLocaleString("en-GB")}
              </span>
              <span className="num text-[12px] text-dim">{share(segment.value, total)}</span>
            </p>
            <p className="mt-1.5 pl-[1.15rem] text-[13.5px] leading-snug font-medium">
              {segment.label}
            </p>
            {segment.note ? (
              <p className="mt-1.5 pl-[1.15rem] text-[12px] leading-relaxed text-dim">
                {segment.note}
              </p>
            ) : null}
          </li>
        ))}
      </ul>

      {caption ? (
        <p className="mt-5 max-w-[62ch] text-[13.5px] leading-relaxed text-muted-fg">{caption}</p>
      ) : null}
    </div>
  );
}

/**
 * One sender's share of the whole, drawn beside it.
 *
 * A list of addresses with counts beside them makes you do the arithmetic to
 * find out which one matters. This does it for you.
 */
export function ShareBar({
  value,
  total,
  tone,
  className,
}: {
  value: number;
  total: number;
  tone: Segment["tone"];
  className?: string;
}) {
  if (!total) return null;
  const pct = Math.max((value / total) * 100, 1);
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-border", className)}>
      <span
        className={cn("grow-x block h-full rounded-full", FILL[tone])}
        style={{ "--w": `${pct}%` } as React.CSSProperties}
      />
    </div>
  );
}

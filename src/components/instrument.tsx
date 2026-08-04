import type { DetectedPlatform } from "@/lib/sending-platform";
import { TONE, type Row } from "@/components/domain-record";
import { cn } from "@/lib/utils";

/**
 * The result as a readout, not as an article.
 *
 * The verdict, the record and the mismatch used to be three separate cards
 * stacked down a cream page, and the page read like a document about a domain
 * rather than an instrument pointed at one. They are one measurement taken at
 * one moment, so they get one surface — the dark plate the record already used,
 * which was the only element here anybody described as good-looking.
 *
 * Nothing decorative was added to achieve that. Every glyph on this panel is a
 * value we read from DNS: the numbers are counts of lookups actually made, the
 * trace is drawn from the two records themselves, and the mismatch mark appears
 * only when the records genuinely disagree. The data is the graphic.
 */

export function Instrument({
  domain,
  checkedAt,
  headline,
  sub,
  meta,
  readout,
  readoutLabel = "read from DNS, quoted verbatim",
  platforms = [],
}: {
  domain: string;
  checkedAt: string;
  headline: string;
  sub?: string;
  /** Counts, in the order a reader would ask for them. */
  meta: string[];
  /** The literal values this reading is made of. Quoted, never paraphrased. */
  readout: Row[];
  readoutLabel?: string;
  /** Only the domain check can draw the trace; a message has one sender. */
  platforms?: DetectedPlatform[];
}) {
  const signs = platforms.filter((p) => p.confirmedByDkim && p.kind !== "corporate");
  const authorised = platforms.filter(
    (p) => (p.basis === "spf" || p.basis === "both") && p.kind !== "corporate",
  );
  /* Drawn only when the records genuinely disagree: something signs, something
     else is authorised, and no platform appears on both sides. */
  const mismatch =
    signs.length > 0 &&
    authorised.length > 0 &&
    !signs.some((s) => authorised.some((a) => a.name === s.name));

  return (
    <figure className="m-0 overflow-hidden rounded-2xl bg-[#141417] shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]">
      {/* Head. A live measurement says so. */}
      <div className="num flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-b border-white/8 px-5 py-3.5 text-[11px] tracking-[0.11em] text-white/38 uppercase sm:px-7">
        <span className="flex items-center gap-2.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="listening absolute inset-0 rounded-full" aria-hidden />
            <span className="h-1.5 w-1.5 rounded-full bg-[#7ee0a8]" />
          </span>
          Live · {domain}
        </span>
        <span>{checkedAt}</span>
      </div>

      {/* The answer, at the size of an answer. */}
      <div className="px-5 pt-8 pb-7 sm:px-7 sm:pt-10">
        <h1 className="max-w-[15ch] text-[clamp(2.1rem,6.4vw,3.6rem)] leading-[0.98] font-semibold tracking-[-0.045em] text-white text-balance">
          {headline}
        </h1>
        {sub ? (
          <p className="mt-4 max-w-[46ch] text-[0.98rem] leading-relaxed text-white/55">{sub}</p>
        ) : null}
        <p className="num mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] tracking-[0.08em] text-white/30 uppercase">
          {meta.map((m, i) => (
            <span key={m} className="flex items-center gap-3">
              {i > 0 ? <span aria-hidden>·</span> : null}
              {m}
            </span>
          ))}
        </p>
      </div>

      {/* The reading itself, quoted. */}
      <p className="num border-t border-white/8 px-5 pt-3 text-[11px] tracking-[0.11em] text-white/25 uppercase sm:px-7">
        {readoutLabel}
      </p>
      <dl className="m-0 divide-y divide-white/6">
        {readout.map((row) => (
          <div
            key={row.key}
            className="grid grid-cols-[3.75rem_minmax(0,1fr)] items-baseline gap-x-4 px-5 py-3 sm:grid-cols-[4.5rem_minmax(0,1fr)_7.5rem] sm:gap-x-7 sm:px-7"
          >
            <dt className="num text-[11px] font-medium tracking-[0.09em] text-white/45">
              {row.key}
            </dt>
            <dd
              className={cn(
                "num m-0 overflow-x-auto text-[12.5px] leading-[1.7] whitespace-nowrap",
                "[mask-image:linear-gradient(to_right,#000_calc(100%-2.5rem),transparent)]",
                "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
                TONE[row.tone],
              )}
            >
              {row.value}
            </dd>
            {row.note ? (
              <dd className="num col-start-2 m-0 text-[11px] whitespace-nowrap text-white/30 sm:col-start-3 sm:text-right">
                {row.note}
              </dd>
            ) : null}
          </div>
        ))}
      </dl>

      {/* The trace. Two records, read against each other, drawn.
          This is the only diagram here that no other checker can produce,
          because producing it means holding both records at once. */}
      {signs.length || authorised.length ? (
        <div className="border-t border-white/8 px-5 py-6 sm:px-7">
          <p className="num text-[11px] tracking-[0.11em] text-white/30 uppercase">
            Who sends as you
          </p>

          <div className="mt-4 grid gap-y-3">
            <TraceRow
              label="Signs your mail"
              names={signs.map((p) => p.name)}
              evidence={signs.flatMap((p) =>
                p.evidence.filter((e) => e.from === "dkim").map((e) => e.value),
              )}
              tone={mismatch ? "bad" : "ok"}
            />

            {/* The connector carries the verdict, so the relationship is
                readable before either row is. */}
            <div className="flex items-center gap-3 pl-[0.4rem]">
              <span
                className={cn(
                  "h-6 w-px",
                  mismatch ? "bg-[#ff9d94]/50" : "bg-[#7ee0a8]/40",
                )}
                aria-hidden
              />
              <span
                className={cn(
                  "num text-[11px] tracking-[0.08em] uppercase",
                  mismatch ? "text-[#ff9d94]" : "text-white/30",
                )}
              >
                {mismatch ? "✗ these disagree" : "in agreement"}
              </span>
            </div>

            <TraceRow
              label="SPF authorises"
              names={authorised.map((p) => p.name)}
              evidence={authorised.flatMap((p) =>
                p.evidence.filter((e) => e.from === "spf").map((e) => e.value),
              )}
              tone={mismatch ? "warn" : "ok"}
            />
          </div>

          {mismatch ? (
            <p className="mt-5 max-w-[58ch] text-[0.9rem] leading-relaxed text-white/60">
              {signs.map((s) => s.name).join(" and ")} signs mail as this domain and your SPF has
              never listed{" "}
              {signs.length > 1 ? "them" : signs[0]?.name}. Those campaigns fail SPF and pass DMARC
              on DKIM alignment alone.
            </p>
          ) : null}
        </div>
      ) : null}

      <p className="num border-t border-white/8 px-5 py-2.5 text-[11px] text-white/25 sm:px-7">
        {checkedAt} · no score, no grade, nothing inferred
      </p>
    </figure>
  );
}

function TraceRow({
  label,
  names,
  evidence,
  tone,
}: {
  label: string;
  names: string[];
  evidence: string[];
  tone: "ok" | "warn" | "bad";
}) {
  if (!names.length) {
    return (
      <div className="grid gap-x-6 gap-y-1 sm:grid-cols-[9.5rem_minmax(0,1fr)]">
        <span className="num text-[11px] tracking-[0.08em] text-white/30 uppercase">{label}</span>
        <span className="num text-[0.8rem] text-white/25">nobody</span>
      </div>
    );
  }
  return (
    <div className="grid gap-x-6 gap-y-1 sm:grid-cols-[9.5rem_minmax(0,1fr)]">
      <span className="num pt-[3px] text-[11px] tracking-[0.08em] text-white/30 uppercase">
        {label}
      </span>
      <span className="min-w-0">
        <span className={cn("text-[1.05rem] leading-tight font-semibold", TONE[tone])}>
          {names.join(", ")}
        </span>
        {evidence.length ? (
          <span className="num mt-1 block truncate text-[0.72rem] text-white/30">
            {evidence.join("  ")}
          </span>
        ) : null}
      </span>
    </div>
  );
}

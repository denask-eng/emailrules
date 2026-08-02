import { splitAccents, type Specimen as SpecimenData } from "@/content/how-email-works";
import { cn } from "@/lib/utils";

/**
 * The specimen plate.
 *
 * A definition tells you what a word means. This shows you the thing itself:
 * the literal DNS value, the header line, the SMTP code, the arithmetic. It
 * is the reason this glossary exists — every other glossary in this industry
 * is prose about artefacts nobody has ever shown the reader.
 *
 * Annotations sit under the line they annotate rather than beside it. Callout
 * arrows look better in a screenshot and break the moment the viewport is
 * narrower than the artefact, which for a DKIM key is always.
 */
export function Specimen({
  data,
  className,
  compact = false,
}: {
  data: SpecimenData;
  className?: string;
  /** Term pages give a specimen room. Inline uses tighten it. */
  compact?: boolean;
}) {
  /* A real DKIM record is sixty-eight characters. Wrapping it would be a lie
     about the artefact, so the plate scrolls instead — and on a phone, where
     there is no resting scrollbar to reveal that, it says so. Measured rather
     than assumed: only plates that actually overflow carry the hint. */
  const scrolls = data.lines.some((l) => l.text.replace(/\[\[|\]\]/g, "").length > 46);

  /* A monospace plate reads as evidence whether or not it is one. This site's
     house rule is that an uncited claim does not ship, so each plate says
     which kind it is rather than letting a reader quote invented arithmetic
     back at their boss as a benchmark. */
  const BASIS = {
    spec: { label: "Published values", tone: "border-ok/30 bg-ok-bg text-ok" },
    example: { label: "Example numbers", tone: "border-soon/30 bg-soon-bg text-soon" },
    ours: { label: "Our framing", tone: "border-border bg-bg-2 text-muted-fg" },
  } as const;
  const basis = BASIS[data.basis];

  return (
    <figure
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card",
        className,
      )}
      style={{ boxShadow: "var(--lift)" }}
    >
      <figcaption className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 border-b border-border-soft bg-bg-2 px-4 py-2.5">
        <span className="label text-[0.6rem]">{data.kind}</span>
        <span className="text-[12.5px] leading-snug text-muted-fg">{data.label}</span>
        <span
          className={cn(
            "num shrink-0 rounded-full border px-1.5 py-0.5 text-[9.5px] tracking-wide uppercase",
            basis.tone,
          )}
          title={
            data.basis === "spec"
              ? "The syntax and values here are what a standard, a statute or a provider publishes."
              : data.basis === "example"
                ? "The shape is real; the figures are invented to show the arithmetic. Do not quote them as benchmarks."
                : "Our own framing. No published source claims it."
          }
        >
          {basis.label}
        </span>
        {scrolls ? (
          <span className="num ml-auto shrink-0 text-[10.5px] text-dim sm:hidden">scrolls →</span>
        ) : null}
      </figcaption>

      <div className={cn("overflow-x-auto", compact ? "px-4 py-3" : "px-4 py-4 sm:px-5")}>
        <div className="min-w-fit">
          {data.lines.map((line, i) => {
            if (!line.text) return <div key={i} className="h-2.5" aria-hidden />;
            return (
              <div key={i} className={i > 0 ? "mt-0.5" : undefined}>
                <div
                  className={cn(
                    "num whitespace-pre text-[12px] leading-[1.7] sm:text-[12.5px]",
                    line.muted ? "text-dim" : "text-fg",
                  )}
                >
                  {splitAccents(line.text).map((seg, j) =>
                    seg.accent ? (
                      <span
                        key={j}
                        className="rounded-[3px] bg-accent-soft px-[3px] font-semibold text-accent"
                      >
                        {seg.value}
                      </span>
                    ) : (
                      <span key={j}>{seg.value}</span>
                    ),
                  )}
                </div>
                {line.note ? (
                  <p className="mt-1 mb-2 max-w-[52ch] pl-4 text-[12.5px] leading-relaxed whitespace-normal text-muted-fg">
                    <span className="mr-1.5 text-dim" aria-hidden>
                      ↳
                    </span>
                    {line.note}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {data.caption ? (
        <p className="border-t border-border-soft bg-bg-2 px-4 py-3 text-[13px] leading-relaxed text-muted-fg sm:px-5">
          {data.caption}
        </p>
      ) : null}
    </figure>
  );
}

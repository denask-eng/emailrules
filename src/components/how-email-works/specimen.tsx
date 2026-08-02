import { splitAccents, type Specimen as SpecimenData } from "@/content/how-email-works";
import { cn } from "@/lib/utils";

/**
 * The specimen plate.
 *
 * A definition tells you what a word means. This shows you the thing itself:
 * the literal DNS value, the header line, the SMTP code, the arithmetic. It is
 * the reason this page exists — every other glossary in this industry is prose
 * about artefacts nobody has ever shown the reader.
 *
 * Two rendering modes, because only thirteen of these are actually code. A DNS
 * record and a DKIM key are verbatim strings and get monospace and a
 * horizontal scroll, because wrapping them would misrepresent the artefact.
 * The tests, the arithmetic and the screen paths are structured lists that
 * were being dressed as terminal output — which bought nothing and cost every
 * one of them a sideways scroll on a phone. Those are laid out as rows now,
 * and they wrap.
 */

/** Kinds that are verbatim strings. Everything else is a list wearing a costume. */
const VERBATIM = new Set<SpecimenData["kind"]>([
  "DNS record",
  "Email header",
  "In the message",
  "At the command line",
]);

/**
 * Two or more spaces is a column break. That is how the corpus is written, so
 * the columns can be recovered rather than re-authored across thirty-nine
 * specimens.
 */
function cells(text: string): { indent: number; parts: string[] } | null {
  const m = /^(\s*)(\S[\s\S]*)$/.exec(text);
  if (!m) return null;
  const parts = m[2].split(/\s{2,}/).filter(Boolean);
  return parts.length > 1 ? { indent: m[1].length, parts } : null;
}

function Accented({ text }: { text: string }) {
  return (
    <>
      {splitAccents(text).map((seg, i) =>
        seg.accent ? (
          <span
            key={i}
            className="rounded-[3px] bg-accent-soft px-[3px] font-semibold text-accent"
          >
            {seg.value}
          </span>
        ) : (
          <span key={i}>{seg.value}</span>
        ),
      )}
    </>
  );
}

const BASIS = {
  spec: {
    label: "Published values",
    tone: "border-ok/30 bg-ok-bg text-ok",
    hint: "The syntax and values here are what a standard, a statute or a provider publishes.",
  },
  example: {
    label: "Example numbers",
    tone: "border-soon/30 bg-soon-bg text-soon",
    hint: "The shape is real; the figures are invented to show the arithmetic. Do not quote them as benchmarks.",
  },
  ours: {
    label: "Our framing",
    tone: "border-border bg-bg-2 text-muted-fg",
    hint: "Our own framing. No published source claims it.",
  },
} as const;

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
  const verbatim = VERBATIM.has(data.kind);
  const basis = BASIS[data.basis];

  /* Only a verbatim plate can overflow, and only some of them do. Measured
     rather than assumed, because a phone has no resting scrollbar to reveal
     it. */
  const scrolls =
    verbatim && data.lines.some((l) => l.text.replace(/\[\[|\]\]/g, "").length > 46);

  const Note = ({ note }: { note: string }) => (
    <p className="mt-1.5 mb-2.5 max-w-[54ch] text-[12.5px] leading-relaxed text-muted-fg">
      <span className="mr-1.5 text-dim" aria-hidden>
        ↳
      </span>
      {note}
    </p>
  );

  return (
    <figure
      className={cn("overflow-hidden rounded-xl border border-border bg-card", className)}
      style={{ boxShadow: "var(--lift)" }}
    >
      <figcaption className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 border-b border-border-soft bg-bg-2 px-4 py-2.5 sm:px-5">
        <span className="label text-[0.6rem]">{data.kind}</span>
        <span className="text-[12.5px] leading-snug text-muted-fg">{data.label}</span>
        <span
          className={cn(
            "num shrink-0 rounded-full border px-1.5 py-0.5 text-[9.5px] tracking-wide uppercase",
            basis.tone,
          )}
          title={basis.hint}
        >
          {basis.label}
        </span>
        {scrolls ? (
          <span className="num ml-auto shrink-0 text-[10.5px] text-dim sm:hidden">scrolls →</span>
        ) : null}
      </figcaption>

      {verbatim ? (
        /* ── The artefact, verbatim. Scrolls rather than wraps. ───────────── */
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
                    <Accented text={line.text} />
                  </div>
                  {line.note ? (
                    <div className="whitespace-normal">
                      <Note note={line.note} />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ── A structured list. Rows, and they wrap. ──────────────────────── */
        <div className={cn(compact ? "px-4 py-2" : "px-4 py-3 sm:px-5")}>
          {data.lines.map((line, i) => {
            if (!line.text) return <div key={i} className="h-3" aria-hidden />;
            const c = cells(line.text);
            return (
              <div key={i}>
                {c ? (
                  /* The prose cell is whichever is longest, not whichever is
                     first: "1 · You obtained the address in the course of a
                     sale" leads with the step number, while "Delivered to
                     Gmail · 94,000" leads with the label. Only the prose cell
                     flexes and wraps; the short ones stay monospace so figures
                     still line up down the column. */
                  <div
                    className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5 py-[3px]"
                    style={
                      c.indent ? { paddingLeft: `${Math.min(c.indent, 6) * 0.45}rem` } : undefined
                    }
                  >
                    {(() => {
                      const prose = c.parts.reduce(
                        (best, p, k) => (p.length > c.parts[best].length ? k : best),
                        0,
                      );
                      return c.parts.map((part, k) =>
                        k === prose ? (
                          <span
                            key={k}
                            className={cn(
                              "min-w-0 flex-1 text-[13.5px] leading-snug [overflow-wrap:anywhere]",
                              line.muted ? "label text-[0.58rem]" : "text-fg",
                            )}
                          >
                            <Accented text={part} />
                          </span>
                        ) : (
                          <span
                            key={k}
                            className={cn(
                              "num shrink-0 text-[12.5px] leading-snug",
                              line.muted ? "text-dim" : "font-medium text-fg",
                            )}
                          >
                            <Accented text={part} />
                          </span>
                        ),
                      );
                    })()}
                  </div>
                ) : (
                  <p
                    className={cn(
                      "py-[3px] text-[13.5px] leading-snug [overflow-wrap:anywhere]",
                      line.muted ? "label text-[0.58rem]" : "text-fg",
                    )}
                  >
                    <Accented text={line.text.trim()} />
                  </p>
                )}
                {line.note ? <Note note={line.note} /> : null}
              </div>
            );
          })}
        </div>
      )}

      {data.caption ? (
        <p className="border-t border-border-soft bg-bg-2 px-4 py-3 text-[13px] leading-relaxed text-muted-fg sm:px-5">
          {data.caption}
        </p>
      ) : null}
    </figure>
  );
}

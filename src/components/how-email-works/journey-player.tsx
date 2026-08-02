"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * One email, making the trip.
 *
 * This is the centrepiece of the page and the first version of it was the
 * lightest thing on the screen: eight 13px labels on a hairline, which reads
 * as a caption rather than as a diagram. It is now a single object with a
 * surface of its own, a rail the message physically travels, and one element
 * — the name of the current stop — set large enough to carry the page. The
 * scale jump is the point: at 13px everywhere, nothing is the subject.
 *
 * Restraint still applies. One accent, hairline rules, no gradient, and it
 * runs once when it first scrolls into view. An explainer that loops forever
 * stops being an explainer and becomes a screensaver you read around.
 */

export interface PlayerStage {
  id: string;
  n: number;
  name: string;
  what: string;
  when: string;
  count: number;
}

const STEP_MS = 2600;

/** Which stops are yours, theirs, and the return leg. */
const TERRITORY: { span: number; label: string; theirs?: boolean }[] = [
  { span: 3, label: "Your building" },
  { span: 3, label: "Their building", theirs: true },
  { span: 2, label: "What comes back" },
];

export function JourneyPlayer({ stages }: { stages: PlayerStage[] }) {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [touched, setTouched] = useState(false);
  const rootRef = useRef<HTMLElement | null>(null);
  const started = useRef(false);

  const stage = stages[i];
  const last = stages.length - 1;

  const play = useCallback(() => {
    setI(0);
    setTouched(true);
    setPlaying(true);
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || started.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      started.current = true;
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !started.current) {
          started.current = true;
          setPlaying(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!playing) return;
    if (i >= last) {
      const t = setTimeout(() => {
        setPlaying(false);
        setTouched(true);
      }, STEP_MS);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setI((v) => v + 1), STEP_MS);
    return () => clearTimeout(t);
  }, [playing, i, last]);

  const pick = (n: number) => {
    setPlaying(false);
    setTouched(true);
    setI(n);
  };

  return (
    <section
      ref={rootRef}
      aria-label="What happens to one email"
      className="mt-10 overflow-hidden rounded-2xl border border-border bg-card"
      style={{ boxShadow: "var(--lift-2)" }}
    >
      {/* Header strip: the control and the counter, on their own surface. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border-soft bg-bg-2 px-5 py-3 sm:px-7">
        <button
          type="button"
          onClick={playing ? () => setPlaying(false) : play}
          className={cn(
            "pressable inline-flex h-11 items-center gap-2 rounded-full border px-3.5 text-[12.5px] font-medium transition-colors sm:h-9",
            playing
              ? "border-accent/40 bg-accent-soft text-accent"
              : "border-border bg-card text-fg hover:border-accent/40 hover:text-accent",
          )}
        >
          <span aria-hidden className="text-[10px] leading-none">
            {playing ? "❙❙" : touched ? "↻" : "▶"}
          </span>
          {playing ? "Playing" : touched ? "Again" : "Watch one email make the trip"}
        </button>

        <div className="num ml-auto flex items-baseline gap-1 text-[11.5px] text-dim">
          <span className="text-[15px] font-semibold text-fg">
            {String(stage.n).padStart(2, "0")}
          </span>
          <span>/ {String(stages.length).padStart(2, "0")}</span>
        </div>
      </div>

      {/* ── The rail. Desktop only: eight stops need eight columns. ───────── */}
      <div className="hidden px-7 pt-9 pb-2 sm:block">
        <ol className="relative grid list-none grid-cols-8 p-0">
          {/* The line the message runs along, and the part already travelled. */}
          <span aria-hidden className="absolute top-[5px] right-0 left-0 h-px bg-border" />
          <span
            aria-hidden
            className="absolute top-[5px] left-0 h-px bg-accent transition-[width] duration-700 ease-out"
            style={{ width: `${((i + 0.5) / stages.length) * 100}%` }}
          />

          {stages.map((s, n) => {
            const active = n === i;
            const passed = n < i;
            return (
              <li key={s.id} className="min-w-0">
                <button
                  type="button"
                  onClick={() => pick(n)}
                  aria-current={active ? "step" : undefined}
                  className="group block w-full pr-3 text-left"
                >
                  {/* The node on the line. The active one gets a soft ring. */}
                  <span
                    aria-hidden
                    className={cn(
                      "relative -mt-px block h-[11px] w-[11px] rounded-full border transition-all duration-300",
                      active
                        ? "border-accent bg-accent shadow-[0_0_0_4px_var(--accent-soft)]"
                        : passed
                          ? "border-accent bg-accent"
                          : "border-border bg-card group-hover:border-muted-fg",
                    )}
                  />
                  <span
                    className={cn(
                      "num mt-3 block text-[10.5px] transition-colors",
                      active ? "text-accent" : passed ? "text-muted-fg" : "text-dim",
                    )}
                  >
                    {String(s.n).padStart(2, "0")}
                  </span>
                  <span
                    className={cn(
                      "mt-1 block text-[12.5px] leading-snug tracking-tight transition-colors",
                      active ? "font-semibold text-fg" : "text-muted-fg group-hover:text-fg",
                    )}
                  >
                    {s.name}
                  </span>
                  <span className="num mt-1 block text-[10.5px] leading-snug text-dim">
                    {s.when}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        {/* Territory. Three bands under eight stops: yours, theirs, yours again. */}
        <div className="mt-5 grid grid-cols-8 gap-x-1.5">
          {TERRITORY.map((t) => (
            <div
              key={t.label}
              style={{ gridColumn: `span ${t.span} / span ${t.span}` }}
              className={cn("border-t-2 pt-1.5", t.theirs ? "border-t-fg/25" : "border-t-border")}
            >
              <p className={cn("label text-[0.56rem]", t.theirs && "text-muted-fg")}>{t.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Mobile: a tappable grid, no fake horizontal axis. ─────────────── */}
      <ol className="grid list-none grid-cols-2 gap-2 p-5 sm:hidden">
        {stages.map((s, n) => {
          const active = n === i;
          const passed = n < i;
          return (
            <li key={s.id} className="min-w-0">
              <button
                type="button"
                onClick={() => pick(n)}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "block h-full w-full rounded-lg border px-2.5 py-2 text-left transition-colors",
                  active
                    ? "border-accent/45 bg-accent-soft"
                    : passed
                      ? "border-border bg-bg-2"
                      : "border-border-soft bg-card",
                )}
              >
                <span
                  className={cn(
                    "num block text-[10px]",
                    active ? "text-accent" : passed ? "text-muted-fg" : "text-dim",
                  )}
                >
                  {String(s.n).padStart(2, "0")}
                </span>
                <span
                  className={cn(
                    "mt-0.5 block text-[12.5px] leading-snug tracking-tight",
                    active ? "font-semibold text-accent" : "text-fg",
                  )}
                >
                  {s.name}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {/* ── What is happening right now. The one element with real scale. ── */}
      <div className="border-t border-border-soft px-5 py-6 sm:px-7 sm:py-7">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="label text-accent">Right now</span>
          <span className="num text-[11.5px] text-dim">{stage.when}</span>
        </div>

        <h2
          key={stage.id}
          className="mt-2.5 text-[clamp(1.45rem,3.4vw,2.1rem)] leading-[1.08] font-semibold tracking-tight text-fg"
        >
          {stage.name}
        </h2>

        <p className="mt-3 max-w-[58ch] text-[1.02rem] leading-relaxed text-muted-fg">
          {stage.what}
        </p>

        <Link
          href={`#${stage.id}`}
          className="mt-4 inline-flex h-11 items-center text-[13.5px] font-medium text-accent underline underline-offset-2 sm:h-auto"
        >
          The {stage.count} words that live here →
        </Link>
      </div>
    </section>
  );
}

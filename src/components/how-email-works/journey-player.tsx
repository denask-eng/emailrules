"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * One email, making the trip.
 *
 * The rail was a diagram; a diagram of a journey that does not move is a
 * strange object. Press play and a single message crosses the eight stops
 * while each one says, in one sentence, what is happening to it. That is the
 * entire idea of this page rendered as something you can watch rather than
 * something you have to assemble in your head.
 *
 * Restraint on purpose: one dot, one caption, no easing tricks. It runs once
 * when it first scrolls into view, and never again unless asked. An
 * explainer that loops forever stops being an explainer and becomes a
 * screensaver you have to read around.
 */

export interface PlayerStage {
  id: string;
  n: number;
  name: string;
  what: string;
  when: string;
  count: number;
}

const STEP_MS = 2400;

/** Which stops are yours, theirs, and the return leg. */
const TERRITORY: { span: number; label: string; note: string; theirs?: boolean }[] = [
  {
    span: 3,
    label: "Your building",
    note: "Every decision that matters is made here, months before the send.",
  },
  {
    span: 3,
    label: "Their building",
    note: "Two different questions, one second, none of it reachable from your platform.",
    theirs: true,
  },
  {
    span: 2,
    label: "What comes back",
    note: "A person reacts, and the reaction becomes a number.",
  },
];

export function JourneyPlayer({ stages }: { stages: PlayerStage[] }) {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [done, setDone] = useState(false);
  const rootRef = useRef<HTMLElement | null>(null);
  const started = useRef(false);

  const stage = stages[i];
  const last = stages.length - 1;

  const play = useCallback(() => {
    setI(0);
    setDone(false);
    setPlaying(true);
  }, []);

  /* Runs itself once, the first time it is actually on screen. */
  useEffect(() => {
    const el = rootRef.current;
    if (!el || started.current) return;
    /* Reduced motion means it never runs itself. It does not mean the reader
       cannot press play, so nothing here touches state: the button keeps its
       original label because nothing has happened yet. */
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
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!playing) return;
    if (i >= last) {
      const t = setTimeout(() => {
        setPlaying(false);
        setDone(true);
      }, STEP_MS);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setI((v) => v + 1), STEP_MS);
    return () => clearTimeout(t);
  }, [playing, i, last]);

  const pick = (n: number) => {
    setPlaying(false);
    setDone(true);
    setI(n);
  };

  /* Centre of the active column, as a percentage of the track. */
  const dotLeft = ((i + 0.5) / stages.length) * 100;

  return (
    <section ref={rootRef} aria-label="What happens to one email" className="mt-8">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <button
          type="button"
          onClick={playing ? () => setPlaying(false) : play}
          className={cn(
            "pressable inline-flex h-11 items-center gap-2 rounded-full border px-4 text-[13px] font-medium transition-colors sm:h-9",
            playing
              ? "border-accent/35 bg-accent-soft text-accent"
              : "border-border bg-card text-fg hover:border-accent/40 hover:text-accent",
          )}
          aria-live="off"
        >
          <span aria-hidden className="text-[11px]">
            {playing ? "❙❙" : done ? "↻" : "▶"}
          </span>
          {playing ? "Playing" : done ? "Watch it again" : "Watch one email make the trip"}
        </button>
        <p className="num text-[11.5px] text-dim">
          Stop {stage.n} of {stages.length}
        </p>
      </div>

      {/* The message itself: one dot, riding the line the stops hang from. It
          has to precede the list so it sits on that top border rather than
          under the cards. Hidden below sm, where the track wraps to two
          columns and a single horizontal axis would be a lie. */}
      <div aria-hidden className="relative mt-6 hidden h-0 sm:block">
        <span
          className="absolute -top-px block h-2 w-2 -translate-x-1/2 rounded-full bg-accent transition-[left] duration-700 ease-out"
          style={{ left: `${dotLeft}%` }}
        />
      </div>

      {/* Stops are player controls, not links: the caption below carries the
          real anchor, so every section stays reachable with no JavaScript. */}
      <ol className="mt-6 grid list-none grid-cols-2 gap-x-2 gap-y-2 p-0 sm:mt-0 sm:grid-cols-8 sm:gap-x-0 sm:gap-y-0">
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
                  "group relative block h-full w-full rounded-lg px-2.5 py-2 text-left transition-colors",
                  "border sm:rounded-none sm:border-0 sm:border-t sm:px-2 sm:pt-3.5 sm:pb-1",
                  active
                    ? "border-accent/40 bg-accent-soft sm:border-t-accent sm:bg-transparent"
                    : passed
                      ? "border-border-soft bg-card sm:border-t-accent/30 sm:bg-transparent"
                      : "border-border-soft bg-card hover:bg-muted/60 sm:border-t-border sm:bg-transparent",
                )}
              >
                <span
                  className={cn(
                    "num block text-[10.5px] tracking-wider transition-colors",
                    active ? "text-accent" : passed ? "text-muted-fg" : "text-dim",
                  )}
                >
                  {String(s.n).padStart(2, "0")}
                </span>
                <span
                  className={cn(
                    "mt-0.5 block text-[12.5px] leading-snug font-medium tracking-tight transition-colors sm:text-[13px]",
                    active ? "text-accent" : "text-fg",
                  )}
                >
                  {s.name}
                </span>
                <span className="mt-1 hidden text-[11px] leading-snug text-dim sm:block">
                  {s.when}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {/* Fixed-height caption so the page never jumps mid-play. */}
      <div className="mt-5 min-h-[7.5rem] rounded-xl border border-border bg-card px-5 py-4 sm:min-h-[6.5rem]">
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <span className="label text-accent">Now</span>
          <span className="num text-[11.5px] text-dim">{stage.when}</span>
        </div>
        <p key={stage.id} className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-fg">
          {stage.what}
        </p>
        <Link
          href={`#${stage.id}`}
          className="mt-2 inline-flex h-11 items-center text-[13px] font-medium text-accent underline underline-offset-2 sm:h-auto"
        >
          The {stage.count} words that live here →
        </Link>
      </div>

      <div className="mt-4 hidden grid-cols-8 gap-x-3 sm:grid">
        {TERRITORY.map((t) => (
          <div
            key={t.label}
            style={{ gridColumn: `span ${t.span} / span ${t.span}` }}
            className={cn(
              "rounded-md border px-3 py-2",
              t.theirs ? "border-border bg-bg-2" : "border-border-soft bg-transparent",
            )}
          >
            <p className={cn("label text-[0.58rem]", t.theirs && "text-muted-fg")}>{t.label}</p>
            <p className="mt-1 text-[11.5px] leading-snug text-muted-fg">{t.note}</p>
          </div>
        ))}
      </div>

      <p className="mt-3 text-[13px] leading-relaxed text-muted-fg sm:hidden">
        Three of the eight stops happen in under a second, inside Gmail rather than inside your
        platform. They are the three everyone tries to fix.
      </p>
    </section>
  );
}

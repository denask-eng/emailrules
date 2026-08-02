"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { TermOwner } from "@/content/how-email-works";

/* Scoped styles rather than globals.css, which another branch is editing.
   Everything animates on transform and opacity only — the wall of words is
   body text and must never trigger layout mid-flight. Dead under
   prefers-reduced-motion, where the server-rendered final state is kept. */
const CSS = `
.os-words { display: flex; flex-wrap: wrap; column-gap: 1.5em; row-gap: 0.6em;
  font-size: clamp(15.5px, 1.1vw + 11.5px, 19px); line-height: 1.5;
  font-weight: 500; letter-spacing: -0.01em; }
.os-w { position: relative; transition: opacity 0.5s var(--ease-out), color 0.5s var(--ease-out); }
.os-w::after { content: ""; position: absolute; left: -1px; right: -1px; top: 54%;
  height: 2px; border-radius: 2px; background: var(--accent);
  transform: scaleX(0); transform-origin: left; transition: transform 0.45s var(--ease-out); }
.os-w.struck { color: var(--dim); }
.os-w.struck::after { transform: scaleX(1); }
.os-words.filtering .os-w { opacity: 0.13; }
.os-words.filtering .os-w.match { opacity: 1; }
.os-instant .os-w, .os-instant .os-w::after, .os-instant .os-pill { transition: none !important; }
.os-pill { opacity: 0; transform: translateY(10px);
  transition: opacity 0.6s var(--ease-out), transform 0.6s var(--ease-out),
    border-color 0.2s, box-shadow 0.2s; transition-delay: var(--d, 0ms), var(--d, 0ms), 0ms, 0ms; }
.os-pill.in { opacity: 1; transform: none; }
.os-pill:hover { border-color: var(--dim); box-shadow: 0 6px 18px -10px rgb(20 20 16 / 0.25); }
@media (prefers-reduced-motion: reduce) {
  .os-w, .os-w::after, .os-pill { transition: none; }
}`;

const TONE: Record<TermOwner, { dot: string; text: string }> = {
  yours: { dot: "bg-accent", text: "text-accent" },
  shared: { dot: "bg-soon", text: "text-soon" },
  esp: { dot: "bg-ok", text: "text-ok" },
  context: { dot: "bg-dim", text: "text-muted-fg" },
};

export interface StrikeTerm {
  name: string;
  owner: TermOwner;
}

export interface StrikeLegendRow {
  owner: TermOwner;
  n: number;
  short: string;
  long: string;
}

const FIRST_STRIKE_MS = 650;
const STRIKE_EVERY_MS = 90;

/**
 * The thesis of the entire site, told with its own vocabulary: the words that
 * are not your problem cross themselves out while you watch. The old version
 * stated the split as four bar-chart rows and asked the reader to add two of
 * them together; this one performs it. The count in the headline is not a
 * number beside the story, it is the running total of the story.
 *
 * The server renders the settled end state — every word readable, the twelve
 * already struck — so the section is complete without JavaScript and for
 * anyone who prefers reduced motion. With motion allowed, the client resets
 * before first paint and replays the strikes once when the wall scrolls into
 * view. It runs once: an explainer that loops forever stops being an
 * explainer and becomes a screensaver you read around. The replay button
 * exists for the second viewing, which is the one people show somebody else.
 */
export function OwnershipStrike({
  terms,
  legend,
  total,
  notYours,
}: {
  terms: StrikeTerm[];
  legend: StrikeLegendRow[];
  total: number;
  notYours: number;
}) {
  /* Strike order, as term index → position in the strike sequence. */
  const strikeOrder = useMemo(() => {
    const m = new Map<number, number>();
    let p = 0;
    terms.forEach((t, i) => {
      if (t.owner === "esp" || t.owner === "context") m.set(i, p++);
    });
    return m;
  }, [terms]);

  /* Server-first values are the settled end state; see the comment above. */
  const [struck, setStruck] = useState(strikeOrder.size);
  const [settled, setSettled] = useState(true);
  const [hover, setHover] = useState<TermOwner | null>(null);
  const [locked, setLocked] = useState<TermOwner | null>(null);
  const rootRef = useRef<HTMLElement | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const filter = hover ?? locked;

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const run = useCallback(() => {
    clearTimers();
    /* Reset without animating backwards: transitions go dead for a frame,
       the settled state clears, then the strikes replay from zero. */
    const root = rootRef.current;
    if (root) {
      root.classList.add("os-instant");
      setStruck(0);
      setSettled(false);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => root.classList.remove("os-instant")),
      );
    } else {
      setStruck(0);
      setSettled(false);
    }
    timers.current.push(
      setTimeout(() => {
        for (let k = 1; k <= strikeOrder.size; k++) {
          timers.current.push(
            setTimeout(() => {
              setStruck(k);
              if (k === strikeOrder.size) setSettled(true);
            }, (k - 1) * STRIKE_EVERY_MS),
          );
        }
      }, FIRST_STRIKE_MS),
    );
  }, [strikeOrder.size]);

  useLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          io.disconnect();
          requestAnimationFrame(run);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [run]);

  useEffect(() => clearTimers, []);

  const replay = () => run();

  return (
    <section ref={rootRef} className="mt-14 border-t pt-9 sm:mt-20 sm:pt-12">
      <style>{CSS}</style>
      <p className="label">Before you read any of it</p>

      {/* One element at real scale. The count is the subject here — and now
          it is alive, ticking up as the words below cross themselves out. */}
      <div className="mt-5 grid gap-x-10 gap-y-2 lg:grid-cols-[auto_1fr] lg:items-start">
        <p
          className="num leading-[0.82] font-semibold tracking-[-0.05em] text-accent"
          style={{ fontSize: "clamp(4rem,11vw,7rem)" }}
          aria-hidden="true"
        >
          {struck}
        </p>
        <div className="lg:pt-2">
          <h2 className="max-w-[20ch] text-[clamp(1.5rem,3.4vw,2.15rem)] leading-[1.06] font-semibold tracking-tight">
            of these {total} words are not your problem
          </h2>
          <p className="mt-4 max-w-[48ch] text-[15.5px] leading-relaxed text-muted-fg">
            Already handled by the platform, or impossible to act on at all. Knowing which is
            which is most of the job, and it is the one thing nobody who sells deliverability
            software is able to tell you. Watch {notYours} of them cross themselves out.
          </p>
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {settled
          ? `${notYours} of the ${total} terms need no action from you and are shown crossed out.`
          : ""}
      </p>

      <ul
        className={cn("os-words mt-10 list-none p-0 sm:mt-14", filter && "filtering")}
        aria-label="Every term in this glossary. The ones crossed out need no action from you."
      >
        {terms.map((t, i) => {
          const pos = strikeOrder.get(i);
          const isStruck = pos !== undefined && pos < struck;
          return (
            <li
              key={t.name}
              title={legend.find((l) => l.owner === t.owner)?.short}
              className={cn(
                "os-w",
                isStruck && "struck",
                filter && t.owner === filter && "match",
              )}
            >
              {t.name}
            </li>
          );
        })}
      </ul>

      <div className="mt-10 flex flex-wrap items-center gap-2.5 sm:mt-12">
        {legend.map((l, i) => (
          <button
            key={l.owner}
            type="button"
            aria-pressed={locked === l.owner}
            onMouseEnter={() => setHover(l.owner)}
            onMouseLeave={() => setHover(null)}
            onClick={() => setLocked((cur) => (cur === l.owner ? null : l.owner))}
            className={cn(
              "os-pill inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border bg-card px-4 py-2",
              locked === l.owner ? "border-dim" : "border-border",
              settled && "in",
            )}
            style={{ ["--d" as string]: `${i * 80}ms` }}
          >
            <span aria-hidden className={cn("h-2 w-2 rounded-full", TONE[l.owner].dot)} />
            <span className={cn("num text-[13px] font-semibold", TONE[l.owner].text)}>{l.n}</span>
            <span className="text-[13px] font-medium">{l.short}</span>
            <span className="hidden text-[12px] text-dim sm:inline">{l.long}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={replay}
          className={cn(
            "os-pill num min-h-11 cursor-pointer rounded-full border border-border px-4 py-2 text-[12px] text-dim transition-colors hover:text-fg",
            settled && "in",
          )}
          style={{ ["--d" as string]: `${legend.length * 80}ms` }}
        >
          ↺ replay
        </button>
      </div>
    </section>
  );
}

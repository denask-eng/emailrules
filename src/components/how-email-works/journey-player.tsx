"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * One email, making the trip — told as the receipt the machines kept.
 *
 * Every stop on the journey leaves a paper trail: EHLO, SPF pass, 250 OK.
 * The centrepiece is a transmission log that streams the lines each stop
 * actually produces, beside the eight stops with a marker that slides down
 * as the message moves. The panel header names the machine talking at each
 * stop, because whose log you are reading is half the story.
 *
 * Restraint still applies: one accent, hairline rules, pure CSS motion, and
 * it runs once when it first scrolls into view. An explainer that loops
 * forever stops being an explainer and becomes a screensaver you read around.
 */

export interface PlayerStage {
  id: string;
  n: number;
  name: string;
  what: string;
  when: string;
  count: number;
}

type Line = { t: string; tone?: "ok" | "accent" | "dim" };

/** What the machines actually said, stop by stop. */
const LOG: Record<string, Line[]> = {
  collect: [
    { t: "POST /subscribe — 14 Jul, 09:31 UTC", tone: "dim" },
    { t: "confirmation sent · waiting for the click", tone: "dim" },
    { t: "✓ consent stored: timestamp, IP, form text", tone: "ok" },
  ],
  build: [
    { t: "From: Brand <news@mail.yourbrand.com>", tone: "dim" },
    { t: "List-Unsubscribe: <https://…>, <mailto:…>", tone: "dim" },
    { t: "List-Unsubscribe-Post: List-Unsubscribe=One-Click", tone: "dim" },
    { t: "✓ RFC 8058 one-click · postal address · honest subject", tone: "ok" },
  ],
  send: [
    { t: "→ CONNECT aspmx.l.google.com:25 · TLS 1.3", tone: "dim" },
    { t: "→ EHLO mta-01.your-esp.com", tone: "dim" },
    { t: "→ DKIM-Signature: v=1; a=rsa-sha256; d=yourbrand.com", tone: "dim" },
    { t: "← 250 2.0.0 OK id=9f3a21c — queued", tone: "accent" },
  ],
  judge: [
    { t: "SPF    pass — 185.220.x.x authorised", tone: "ok" },
    { t: "DKIM   pass — rsa-sha256, d=yourbrand.com", tone: "ok" },
    { t: "DMARC  pass — p=reject, relaxed alignment", tone: "ok" },
    { t: "PTR    185.220.x.x → mta-01.your-esp.com ✓ FCrDNS", tone: "ok" },
  ],
  filter: [
    { t: "IP reputation: high · domain reputation: high", tone: "dim" },
    { t: "spam rate 0.02% — bulk ceiling is 0.10%", tone: "ok" },
    { t: "no trap hits · feedback loops quiet", tone: "dim" },
    { t: "→ clears the bar", tone: "accent" },
  ],
  verdict: [
    { t: "← 250 2.0.0 OK — accepted", tone: "accent" },
    { t: "placement: inbox · primary tab", tone: "ok" },
    { t: "(a 5xx here would never have reached you)", tone: "dim" },
  ],
  react: [
    { t: "14:02  open — Apple MPP proxy fetch (a machine?)", tone: "dim" },
    { t: "14:03  click → /collection (a human)", tone: "ok" },
    { t: "0 complaints · 1 unsubscribe", tone: "dim" },
  ],
  count: [
    { t: "open rate 41.2% — MPP-inflated, treat as a ceiling", tone: "dim" },
    { t: "click rate 3.1% — the honest number", tone: "ok" },
    { t: "DMARC rua digest: 100% pass · 0 spoof attempts", tone: "ok" },
    { t: "dashboard updated 06:00", tone: "accent" },
  ],
};

/** Whose log you are reading at each stop. */
const MACHINE: Record<string, string> = {
  collect: "your website",
  build: "your platform",
  send: "your mta → their mx",
  judge: "the receiver",
  filter: "the receiver's filters",
  verdict: "the receiver",
  react: "the subscriber's mail app",
  count: "your dashboard",
};

const ROW_H = 40; // px — matches the h-10 stop rows; the marker rides this grid
const LINE_MS = 420;

/** Dwell on a stop long enough to read its log, then a beat. */
function stepMs(lineCount: number) {
  return Math.max(3200, lineCount * LINE_MS + 1500);
}

export function JourneyPlayer({ stages }: { stages: PlayerStage[] }) {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [touched, setTouched] = useState(false);
  // Log lines revealed so far, keyed by stop — a new stop reads as 0 without a reset
  const [stream, setStream] = useState<{ id: string; n: number }>({ id: "", n: 0 });
  const rootRef = useRef<HTMLElement | null>(null);
  const started = useRef(false);

  const stage = stages[i];
  const last = stages.length - 1;
  const lines = LOG[stage.id] ?? [];
  const shown = stream.id === stage.id ? stream.n : 0;

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

  // Advance the journey, dwelling per stop on how much log there is to read
  useEffect(() => {
    if (!playing) return;
    const dwell = stepMs(lines.length);
    if (i >= last) {
      const t = setTimeout(() => setPlaying(false), dwell);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setI((v) => v + 1), dwell);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, i, last]);

  // Stream the log lines for the current stop
  useEffect(() => {
    if (lines.length === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const t = setTimeout(() => setStream({ id: stage.id, n: lines.length }), 0);
      return () => clearTimeout(t);
    }
    let n = 0;
    const t = setInterval(() => {
      n += 1;
      setStream({ id: stage.id, n });
      if (n >= lines.length) clearInterval(t);
    }, LINE_MS);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage.id]);

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
      <style>{`
        @keyframes jp-line {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: none; }
        }
        .jp-line { animation: jp-line 0.4s var(--ease-out) both; }
        @keyframes jp-fade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .jp-fade { animation: jp-fade 0.5s var(--ease-out) both; }
        @keyframes jp-caret { 0%, 45% { opacity: 1; } 50%, 100% { opacity: 0; } }
        .jp-caret { animation: jp-caret 1.1s steps(1) infinite; }
        @media (prefers-reduced-motion: reduce) {
          .jp-line, .jp-fade, .jp-caret { animation: none; }
        }
      `}</style>

      {/* Header strip: the control and the counter, on their own surface */}
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
          {playing ? "Playing" : touched ? "Run it again" : "Watch the servers talk"}
        </button>

        <div className="num ml-auto flex items-baseline gap-1 text-[11.5px] text-dim">
          <span className="text-[15px] font-semibold text-fg">
            {String(stage.n).padStart(2, "0")}
          </span>
          <span>/ {String(stages.length).padStart(2, "0")}</span>
        </div>
      </div>

      <div className="grid sm:grid-cols-[16.5rem_1fr]">
        {/* ── Desktop: the eight stops, with a marker that slides ────────── */}
        <ol className="relative m-0 hidden list-none p-5 sm:block sm:border-r sm:border-border-soft">
          <span
            aria-hidden
            className="absolute top-5 bottom-5 left-0 w-[2px] rounded-full bg-border-soft"
          />
          <span
            aria-hidden
            className="absolute top-5 left-0 h-10 w-[2px] rounded-full bg-accent transition-transform duration-700 ease-[cubic-bezier(0.33,1,0.68,1)]"
            style={{ transform: `translateY(${i * ROW_H}px)` }}
          />
          {stages.map((s, n) => {
            const active = n === i;
            const passed = n < i;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => pick(n)}
                  aria-current={active ? "step" : undefined}
                  className="group grid h-10 w-full grid-cols-[2rem_1fr] items-center gap-x-2 rounded-r-md pl-4 text-left transition-colors hover:bg-muted/50"
                >
                  <span
                    className={cn(
                      "num text-[10.5px] transition-colors duration-300",
                      active ? "text-accent" : passed ? "text-muted-fg" : "text-dim/70",
                    )}
                  >
                    {String(s.n).padStart(2, "0")}
                  </span>
                  <span
                    className={cn(
                      "truncate text-[13px] tracking-tight transition-colors duration-300",
                      active
                        ? "font-semibold text-fg"
                        : passed
                          ? "text-muted-fg"
                          : "text-dim group-hover:text-fg",
                    )}
                  >
                    {s.name}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        {/* ── Mobile: every stop visible at once, no fake axis ────────────── */}
        <ol className="m-0 grid list-none grid-cols-4 gap-1.5 p-4 sm:hidden">
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
                    "flex h-full min-h-[3.4rem] w-full flex-col rounded-lg border px-2 py-1.5 text-left transition-colors",
                    active
                      ? "border-accent/45 bg-accent-soft"
                      : passed
                        ? "border-border bg-bg-2"
                        : "border-border-soft bg-card",
                  )}
                >
                  <span
                    className={cn(
                      "num text-[9.5px] leading-none",
                      active ? "text-accent" : passed ? "text-muted-fg" : "text-dim",
                    )}
                  >
                    {String(s.n).padStart(2, "0")}
                  </span>
                  <span
                    className={cn(
                      "mt-1 text-[10px] leading-[1.3] tracking-tight",
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

        {/* ── The receipt: what the machines actually said ────────────────── */}
        <div className="px-4 pb-4 sm:p-5">
          <div className="flex h-full min-h-[11.5rem] flex-col rounded-xl bg-[#141417] px-4 py-4 shadow-[inset_0_1px_0_rgb(255_255_255/0.06)] sm:px-5">
            <p
              key={`machine-${stage.id}`}
              className="jp-fade font-mono text-[10px] tracking-[0.14em] text-white/35 uppercase"
            >
              transmission log · {MACHINE[stage.id] ?? "one message"}
            </p>
            <div className="mt-3 flex-1 font-mono text-[11.5px] leading-[1.9] break-words sm:text-[12.5px]">
              {lines.slice(0, shown).map((l, n) => (
                <p
                  key={`${stage.id}-${n}`}
                  className={cn(
                    "jp-line",
                    l.tone === "ok" && "text-[#8fd9a8]",
                    l.tone === "accent" && "text-[#9db4ff]",
                    (!l.tone || l.tone === "dim") && "text-white/55",
                  )}
                >
                  {l.t}
                </p>
              ))}
              <p
                aria-hidden
                className="jp-caret mt-0.5 inline-block h-[1.05em] w-[7px] translate-y-[3px] bg-[#9db4ff]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Right now ─────────────────────────────────────────────────────── */}
      <div className="border-t border-border-soft px-5 py-6 sm:px-7 sm:py-7">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="label text-accent">Right now</span>
          <span key={`when-${stage.id}`} className="jp-fade num text-[11.5px] text-dim">
            {stage.when}
          </span>
        </div>

        <h2
          key={stage.id}
          className="jp-fade mt-2.5 text-[clamp(1.45rem,3.4vw,2.1rem)] leading-[1.08] font-semibold tracking-tight text-fg"
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

      {/* Territory, as a footnote rather than a diagram band */}
      <p className="label border-t border-border-soft px-5 py-3 text-[0.58rem] sm:px-7">
        01–03 your building&nbsp;&nbsp;·&nbsp;&nbsp;04–06 their building&nbsp;&nbsp;·&nbsp;&nbsp;07–08
        what comes back
      </p>
    </section>
  );
}

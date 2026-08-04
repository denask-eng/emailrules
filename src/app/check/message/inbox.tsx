"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * The address, and the waiting, on one page.
 *
 * This used to be two: a page that handed you a string and a second page,
 * behind a button labelled "Open the page that waits for it", that did the
 * watching. So the sequence was copy, click, alt-tab to Klaviyo, send, come
 * back — and the click in the middle did nothing except move you somewhere the
 * first page could have been. People who missed it sent a campaign into an
 * address nothing was listening to.
 *
 * Now the page you land on is already listening. Copy, send, and it becomes
 * the result on its own.
 *
 * Two cadences on purpose. A test send out of Klaviyo lands in a few seconds,
 * so the first minute is checked briskly and the long tail slows down: nobody
 * is watching the screen at minute nine, and a page that hammers an endpoint
 * for twenty minutes is a page somebody left open by accident.
 */

const FAST_MS = 1_500;
const SLOW_MS = 5_000;
/** After this many fast checks (~1 minute) the sender has walked away. */
const FAST_ATTEMPTS = 40;
/** Twenty minutes. Mail that has not arrived by then is lost, not late. */
const GIVE_UP_MS = 20 * 60 * 1_000;
/** Each check lighting up as the reader watches. Fast enough not to be a wait. */
const TICK_MS = 130;
/** Long enough for the six checks to resolve, short enough to feel immediate. */
const HANDOFF_MS = 1_150;

type Phase = "listening" | "arrived" | "gave-up";

function elapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${String(s % 60).padStart(2, "0")}s`;
}

export function Inbox({
  id,
  address,
  checks,
}: {
  id: string;
  address: string;
  /** The six things this reads, in the order they resolve. */
  checks: string[];
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("listening");
  const [since, setSince] = useState(0);
  const [copied, setCopied] = useState(false);
  /* How many checks have lit up. The waiting panel is the only place on this
     site where a reader has nothing to do and full attention, so it shows the
     work instead of a spinner. */
  const [resolved, setResolved] = useState(0);
  /* Zero until mounted. Reading the clock during render is impure: a re-render
     would restart the timer from wherever React happened to call it. */
  const startedAt = useRef(0);

  /* One clock for the display, independent of the polling cadence, so the
     elapsed line does not stutter when the interval changes. */
  useEffect(() => {
    if (phase !== "listening") return;
    if (!startedAt.current) startedAt.current = Date.now();
    const tick = setInterval(() => setSince(Date.now() - startedAt.current), 1_000);
    return () => clearInterval(tick);
  }, [phase]);

  useEffect(() => {
    if (phase !== "listening") return;
    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout>;
    if (!startedAt.current) startedAt.current = Date.now();

    const poll = async () => {
      if (cancelled) return;
      try {
        const response = await fetch(`/api/inbound/status/${id}`, { cache: "no-store" });
        if (response.ok) {
          const { ready } = (await response.json()) as { ready?: boolean };
          if (ready && !cancelled) {
            /* Only flips the state. The handoff lives in its own effect
               below, because setting phase here tears this effect down —
               `cancelled` becomes true on cleanup, and a navigation guarded by
               it inside this closure can never fire. That is exactly how this
               page came to sit on "Reading it." indefinitely. */
            setPhase("arrived");
            return;
          }
        }
      } catch {
        /* A dropped request is not an answer. The next tick asks again. */
      }
      if (cancelled) return;
      attempts += 1;
      if (Date.now() - startedAt.current > GIVE_UP_MS) {
        setPhase("gave-up");
        return;
      }
      timer = setTimeout(poll, attempts < FAST_ATTEMPTS ? FAST_MS : SLOW_MS);
    };

    timer = setTimeout(poll, FAST_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [id, router, phase]);

  /* The handoff, on its own so nothing can cancel it.
     Owned by the arrival state rather than by the poller: the poller's job
     ends the moment the message lands, and tying navigation to a teardown that
     the same state change causes is unshippable. */
  useEffect(() => {
    if (phase !== "arrived") return;
    /* The checks resolve one after another rather than all at once. The work
       is genuinely happening on the server during this second; showing it in
       order is the difference between a loading state and a demonstration. */
    const ticks = checks.map((_, i) =>
      setTimeout(() => setResolved(i + 1), TICK_MS * (i + 1)),
    );
    router.prefetch(`/check/message/${id}`);
    const handoff = setTimeout(() => router.push(`/check/message/${id}`), HANDOFF_MS);
    /* A safety net: if a prefetch stalls or the push is swallowed, a hard
       navigation still gets the reader to their result. Nobody should ever
       watch this screen for two minutes again. */
    const fallback = setTimeout(() => {
      if (typeof window !== "undefined" && !window.location.pathname.endsWith(id)) {
        window.location.href = `/check/message/${id}`;
      }
    }, HANDOFF_MS + 2_500);
    return () => {
      ticks.forEach(clearTimeout);
      clearTimeout(handoff);
      clearTimeout(fallback);
    };
  }, [phase, id, router, checks]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* The address is selectable. Nothing useful to say here. */
    }
  }

  return (
    <div className="mt-8 overflow-hidden rounded-xl border bg-card" style={{ boxShadow: "var(--lift)" }}>
      <div className="px-5 py-6 sm:px-7 sm:py-7">
        <div className="flex items-baseline justify-between gap-4">
          <p className="label">Send one email to</p>
          <button
            type="button"
            onClick={copy}
            className={cn(
              "num min-h-9 rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors",
              copied
                ? "border-ok/35 bg-ok-bg text-ok"
                : "border-border bg-bg-2 text-muted-fg hover:border-input hover:text-fg",
            )}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        {/* The subject of the page, at the size of a subject. */}
        <p className="num mt-3 leading-snug break-words text-[clamp(0.95rem,3.1vw,1.35rem)]">
          {address}
        </p>
      </div>

      {/* The live half, on its own ground so the state change is visible
          without the address moving. */}
      <div
        className={cn(
          "border-t px-5 py-4 sm:px-7",
          phase === "arrived" ? "bg-ok-bg" : "bg-bg-2",
        )}
        aria-live="polite"
      >
        {phase === "listening" || phase === "arrived" ? (
          <>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              {phase === "listening" ? (
                <>
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="listening absolute inset-0 rounded-full" aria-hidden />
                    <span className="h-2 w-2 rounded-full bg-accent" />
                  </span>
                  <span className="text-[0.92rem] font-medium">Listening for it now.</span>
                  <span className="num text-[0.78rem] text-dim">{elapsed(since)}</span>
                  <span className="w-full text-[0.86rem] leading-relaxed text-muted-fg">
                    Send the campaign. This page turns into the result on its own, so there is
                    nothing here to press.
                  </span>
                </>
              ) : (
                <>
                  <span className="h-2 w-2 shrink-0 rounded-full bg-ok" aria-hidden />
                  <span className="text-[0.92rem] font-medium text-ok">Message received.</span>
                  <span className="num text-[0.78rem] text-dim">
                    {resolved}/{checks.length}
                  </span>
                </>
              )}
            </div>

            {/* What it is about to read, listed while there is nothing else to
                do. Waiting for an email is the one moment on this site with
                full attention and no task, and a spinner spends it on nothing.
                On arrival these resolve in order, because they genuinely do. */}
            <ul className="mt-4 list-none space-y-2 p-0">
              {checks.map((check, i) => {
                const done = phase === "arrived" && i < resolved;
                const active = phase === "arrived" && i === resolved;
                return (
                  <li
                    key={check}
                    className={cn(
                      "flex items-start gap-2.5 text-[0.84rem] leading-snug transition-colors duration-300",
                      done ? "text-fg" : active ? "text-muted-fg" : "text-dim",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "mt-[3px] h-3 w-3 shrink-0 rounded-full border transition-all duration-300",
                        done
                          ? "border-ok bg-ok"
                          : active
                            ? "border-accent"
                            : "border-border-soft",
                      )}
                    />
                    <span>{check}</span>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="h-2 w-2 shrink-0 rounded-full bg-dim" aria-hidden />
            <span className="text-[0.92rem] font-medium">Stopped listening.</span>
            <button
              type="button"
              onClick={() => {
                /* An event handler, not render — the clock is fair game here. */
                startedAt.current = Date.now();
                setSince(0);
                setPhase("listening");
              }}
              className="text-[0.86rem] text-accent underline underline-offset-3"
            >
              Listen again
            </button>
            <span className="w-full text-[0.86rem] leading-relaxed text-muted-fg">
              Twenty minutes with nothing. The address is still good, so if you have sent it since,
              pick the listening back up.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

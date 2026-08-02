"use client";

import { useCallback, useSyncExternalStore } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Ownership } from "@/lib/types";
import {
  EMPTY_AUDIENCE,
  ROLE_PRESETS,
  STORAGE_KEY,
  audienceActive,
  parseAudienceParam,
  readStoredAudience,
} from "@/lib/audience";
import type { FiveCard, FiveSet, RoleKey } from "./five";

/**
 * The whole point of the homepage: the answer arrives here, not two page-loads away.
 *
 * The five sets are already in the HTML, so a tap is a re-render of props that
 * shipped with the page — no fetch, no navigation, no spinner. The un-picked
 * default is what the server renders, which is also what a crawler and a
 * JavaScript-disabled reader get.
 */

/* One storage key, written the way rule-filter.tsx writes it, so a pick made
   here is the pick /rules and /brief read. A second format would silently
   fork the two surfaces. */
const listeners = new Set<() => void>();
let current: RoleKey = "";
let loaded = false;

function snapshot(): RoleKey {
  if (typeof window === "undefined") return "";
  if (!loaded) {
    const a = parseAudienceParam(window.location.search) ?? readStoredAudience();
    /* "check" is a /check-only preset with no shelf of its own. */
    current = a.role === "check" ? "" : a.role;
    loaded = true;
  }
  return current;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) {
      loaded = false;
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

const serverSnapshot = (): RoleKey => "";

function store(next: RoleKey) {
  const audience = ROLE_PRESETS.find((p) => p.id === next)?.audience ?? EMPTY_AUDIENCE;
  try {
    if (audienceActive(audience)) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(audience));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    /* Private mode refuses writes. The pick still works for this visit. */
  }
  current = next;
  loaded = true;
  listeners.forEach((l) => l());
}

/** Presets are data, and the data uses a typewriter apostrophe. Fix it at display time. */
function curly(s: string): string {
  return s.replace(/'/g, "’");
}

/* The same scale rules/rule-row.tsx sets: weight, not hue. Solid accent when the
   job is yours, a hairline outline when the tool does half, no box once the tool
   has done it — so the homepage five and the /rules five are one language. */
const OWN: Record<
  Ownership,
  { word: string; mark: string; rail: string; title: string; body: string }
> = {
  yours: {
    word: "Yours",
    mark: "border-accent bg-accent text-accent-fg",
    rail: "border-accent",
    title: "text-[16.5px] font-semibold text-fg",
    body: "text-muted-fg",
  },
  shared: {
    word: "Shared",
    mark: "border-fg/40 text-fg",
    rail: "border-fg/20",
    title: "text-[15.5px] font-semibold text-fg",
    body: "text-muted-fg",
  },
  esp: {
    word: "Handled",
    mark: "border-transparent text-dim",
    rail: "border-transparent",
    title: "text-[14.5px] font-medium text-muted-fg",
    body: "text-dim",
  },
  context: {
    word: "FYI",
    mark: "border-transparent text-dim",
    rail: "border-transparent",
    title: "text-[14.5px] font-medium text-muted-fg",
    body: "text-dim",
  },
};

function FiveRow({ card }: { card: FiveCard }) {
  const o = OWN[card.ownership];
  return (
    <li className="border-b border-border-soft transition-colors last:border-b-0 has-[a:hover]:bg-muted/40">
      <div
        className={cn(
          "grid gap-x-6 gap-y-2 border-l-2 py-5 pr-1 pl-3.5 sm:grid-cols-[7rem_1fr] sm:pl-5",
          o.rail,
        )}
      >
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 sm:block">
          <span
            className={cn("label inline-flex items-center rounded-sm border px-1.5 py-[3px]", o.mark)}
          >
            {o.word}
          </span>
          {card.from ? (
            <span className="num block text-[11px] text-soon sm:mt-1.5">From {card.from}</span>
          ) : null}
        </div>

        <div className="min-w-0">
          <h4 className={cn("leading-snug tracking-tight", o.title)}>
            <Link
              href={`/rules/${card.slug}`}
              className="decoration-1 underline-offset-[5px] hover:underline focus-visible:underline"
            >
              {card.title}
            </Link>
          </h4>
          <p className={cn("mt-1.5 max-w-[64ch] text-[14px] leading-relaxed", o.body)}>
            {card.tldr}
          </p>
          <p className="mt-2 max-w-[64ch] text-[13px] leading-relaxed text-dim">
            <span className="font-medium text-muted-fg">Do first: </span>
            {card.first}
          </p>
          <p className="num mt-2 text-[11px] text-dim">{card.meta}</p>
        </div>
      </div>
    </li>
  );
}

export function AnswerHere({ sets }: { sets: Record<RoleKey, FiveSet> }) {
  const role = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const set = sets[role] ?? sets[""];
  const preset = ROLE_PRESETS.find((p) => p.id === role);
  const rest = set.matched - set.cards.length;

  const onPick = useCallback((next: RoleKey) => store(next), []);

  return (
    <section id="your-five" className="shell border-t border-fg/12 py-10 text-center sm:py-12">
      <p className="label">Start here</p>
      <h2 className="mx-auto mt-2.5 max-w-[22ch] text-[clamp(1.45rem,3.4vw,2rem)]">
        Which desk is yours?
      </h2>
      <p className="mx-auto mt-3 max-w-[46ch] text-[14.5px] leading-relaxed text-muted-fg">
        One tap. The five that matter appear below — no page load, and the pick is waiting for
        you on Rules and in your brief.
      </p>

      <div
        role="group"
        aria-label="Your role"
        className="mt-6 flex flex-wrap justify-center gap-2"
      >
        {ROLE_PRESETS.map((p) => {
          const on = role === p.id;
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={on}
              title={p.blurb}
              onClick={() => onPick(on ? "" : (p.id as RoleKey))}
              /* Selection is ink, never the accent — /rules reserves solid blue for
                 “this one is on your desk”, and the two surfaces must not disagree. */
              className={cn(
                "pressable inline-flex min-h-11 items-center rounded-full border px-4 text-[13.5px]",
                on
                  ? "border-fg bg-fg font-medium text-bg"
                  : "border-border bg-bg text-muted-fg hover:border-input hover:bg-muted hover:text-fg",
              )}
            >
              {curly(p.label)}
            </button>
          );
        })}
      </div>

      <p
        aria-live="polite"
        className="mx-auto mt-4 max-w-[60ch] text-[13px] leading-relaxed text-muted-fg"
      >
        {preset ? (
          <>
            {curly(preset.blurb)}{" "}
            <span className="text-dim">Saved — Rules and your brief now open on this.</span>{" "}
            <button
              type="button"
              onClick={() => onPick("")}
              className="text-dim underline underline-offset-3 hover:text-fg"
            >
              Clear
            </button>
          </>
        ) : (
          <span className="text-dim">
            Nothing picked yet, so this is the whole shelf with the urgent end first. One tap
            re-sorts it to your desk and remembers next time.
          </span>
        )}
      </p>

      {/* The answer sits centred in the column, but the prose inside it is set
          left — a centred measure is unreadable past one line. */}
      <div className="mx-auto mt-9 max-w-3xl text-left">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-t border-fg/15 pt-4">
          <h3 className="text-[1.05rem] tracking-tight">Open these five first</h3>
          <p className="num text-[12px] text-dim">
            {set.matched} {preset ? "match your setup" : "on the shelf"} · {set.cards.length} shown
          </p>
        </div>

        <ol className="list-none p-0">
          {set.cards.map((c) => (
            <FiveRow key={c.slug} card={c} />
          ))}
        </ol>

        <div className="mt-4 flex flex-wrap items-baseline gap-x-5 gap-y-2 text-[13.5px]">
          <Link href={set.href} className="font-medium text-accent underline-offset-3 hover:underline">
            {rest > 0 ? `See the other ${rest} in your filter →` : "Open the full filter →"}
          </Link>
          <Link
            href="/brief"
            className="text-muted-fg underline-offset-3 hover:text-fg hover:underline"
          >
            Send it to the team as a brief
          </Link>
        </div>

        {/* The badge is the differentiator, so it gets a line rather than a section. */}
        <p className="mt-4 text-[12.5px] leading-relaxed text-dim">
          The badge answers the only question worth asking first:{" "}
          <b className="font-medium text-muted-fg">Yours</b> needs a person,{" "}
          <b className="font-medium text-muted-fg">Shared</b> is half your sending tool&rsquo;s
          job, <b className="font-medium text-muted-fg">Handled</b> means it was done for you and
          you can move on.
        </p>
      </div>
    </section>
  );
}

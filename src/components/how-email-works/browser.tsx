"use client";

import { useDeferredValue, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  LEVEL_LABEL,
  OWNER_LABEL,
  type StageId,
  type TermLevel,
  type TermOwner,
} from "@/content/how-email-works";

/**
 * The stage sections, filterable.
 *
 * Two controls, and the second one is the point. Typing narrows; the level
 * switch collapses the whole corpus to the handful a week-one hire actually
 * needs, which is the single kindest thing this page does and something no
 * other glossary in this industry offers.
 *
 * The rows are a two-column reference layout rather than cards. Forty
 * identically-sized cards is a wall; a term column and a sentence column can
 * be read down the left edge in about four seconds.
 */

export interface BrowserStage {
  id: StageId;
  n: number;
  name: string;
  what: string;
  when: string;
  intro: string;
  owner: TermOwner;
}

export interface BrowserTerm {
  id: string;
  term: string;
  sayIt: string;
  short: string;
  level: TermLevel;
  owner: TermOwner;
  stage: StageId;
  /** Lowercased haystack, built on the server so the client does no work. */
  hay: string;
}

const OWNER_TONE: Record<TermOwner, string> = {
  yours: "border-accent/30 bg-accent-soft text-accent",
  esp: "border-ok/30 bg-ok-bg text-ok",
  shared: "border-soon/30 bg-soon-bg text-soon",
  context: "border-border bg-bg-2 text-muted-fg",
};

const LEVELS: (TermLevel | "all")[] = ["all", "start", "working", "deep"];

export function GlossaryBrowser({
  stages,
  terms,
  slots,
}: {
  stages: BrowserStage[];
  terms: BrowserTerm[];
  /** Diagrams rendered on the server and dropped into their stage. */
  slots?: Partial<Record<StageId, ReactNode>>;
}) {
  const [q, setQ] = useState("");
  const [level, setLevel] = useState<TermLevel | "all">("all");
  const inputRef = useRef<HTMLInputElement>(null);
  const deferred = useDeferredValue(q);

  const shown = useMemo(() => {
    const needle = deferred.trim().toLowerCase();
    return terms.filter(
      (t) => (level === "all" || t.level === level) && (!needle || t.hay.includes(needle)),
    );
  }, [terms, deferred, level]);

  const byStage = useMemo(() => {
    const m = new Map<StageId, BrowserTerm[]>();
    for (const t of shown) {
      const list = m.get(t.stage);
      if (list) list.push(t);
      else m.set(t.stage, [t]);
    }
    return m;
  }, [shown]);

  const filtering = level !== "all" || deferred.trim().length > 0;

  return (
    <>
      {/* Opaque, not translucent: the site header can be glassy because it is
          52px of chrome, but a second bar that lets a paragraph ghost through
          it reads as a rendering fault rather than as depth. Sticky from sm. A phone cannot fit the field and four chips on
          one line, and a two-row bar pinned under a 52px header would eat a
          sixth of the viewport for the whole scroll. */}
      <div className="static z-30 -mx-5 mt-14 border-y border-border-soft bg-bg px-5 py-2.5 sm:sticky sm:top-[3.25rem] md:-mx-7 md:px-7">
        <div className="flex flex-col gap-y-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3">
          <div className="relative min-w-0 sm:max-w-xs sm:flex-1">
            <input
              ref={inputRef}
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={`Filter ${terms.length} words…`}
              aria-label="Filter the glossary"
              className="h-11 w-full rounded-lg border border-border bg-card px-3 text-[14px] text-fg placeholder:text-dim focus:border-accent focus:outline-none sm:h-9 sm:text-[13.5px]"
            />
          </div>

          <div
            role="group"
            aria-label="How much detail"
            className="flex items-center gap-1 overflow-x-auto"
          >
            {LEVELS.map((l) => {
              const on = level === l;
              return (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLevel(l)}
                  aria-pressed={on}
                  className={cn(
                    "pressable h-11 shrink-0 rounded-lg border px-3 text-[13px] whitespace-nowrap transition-colors sm:h-9 sm:px-2.5 sm:text-[12.5px]",
                    on
                      ? "border-accent/35 bg-accent-soft font-medium text-accent"
                      : "border-border-soft bg-card text-muted-fg hover:text-fg",
                  )}
                >
                  {l === "all" ? "Everything" : LEVEL_LABEL[l].short}
                </button>
              );
            })}
          </div>

          <p className="num ml-auto hidden text-[11.5px] text-dim sm:block">
            {shown.length}/{terms.length}
          </p>
        </div>

        {level !== "all" ? (
          <p className="mt-2 text-[12.5px] leading-snug text-muted-fg">
            {LEVEL_LABEL[level].long}.{" "}
            <button
              type="button"
              onClick={() => setLevel("all")}
              className="font-medium text-accent underline underline-offset-2"
            >
              Show all {terms.length}
            </button>
          </p>
        ) : null}
      </div>

      {shown.length === 0 ? (
        <div className="mt-16 rounded-xl border border-border-soft bg-bg-2 px-5 py-10 text-center">
          <p className="text-[15px] text-fg">Nothing matches “{q.trim()}”.</p>
          <p className="mx-auto mt-2 max-w-[42ch] text-[13.5px] leading-relaxed text-muted-fg">
            {terms.length} words, chosen because a working marketer meets them. If something is
            missing that you actually hit this week, that is a gap worth telling us about.
          </p>
          <button
            type="button"
            onClick={() => {
              setQ("");
              setLevel("all");
              inputRef.current?.focus();
            }}
            className="mt-4 text-[13px] font-medium text-accent underline underline-offset-2"
          >
            Clear the filter
          </button>
        </div>
      ) : null}

      {stages.map((s) => {
        const list = byStage.get(s.id) ?? [];
        if (filtering && list.length === 0) return null;
        return (
          <section key={s.id} id={s.id} className="scroll-mt-[7.5rem] pt-16">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="num text-[12px] text-accent">
                {String(s.n).padStart(2, "0")}
              </span>
              <h2 className="text-[clamp(1.25rem,2.6vw,1.5rem)] font-semibold tracking-tight">
                {s.name}
              </h2>
              <span className="num text-[11.5px] text-dim">{s.when}</span>
            </div>

            <p className="mt-2.5 max-w-[58ch] text-[1.02rem] leading-relaxed text-fg">{s.what}</p>

            {/* Folded by default. Eight of these open at once was the second
                wall of text on a page whose entire argument is that email is
                simpler than it looks. */}
            <details className="faq-item mt-3 max-w-[58ch]">
              <summary className="inline-flex h-11 cursor-pointer list-none items-center text-[13.5px] font-medium text-muted-fg hover:text-fg sm:h-auto sm:py-1 [&::-webkit-details-marker]:hidden">
                Why this stop decides things
                <span aria-hidden className="ml-1.5 text-dim">
                  +
                </span>
              </summary>
              <div className="faq-body">
                <div>
                  <p className="pt-1 text-[14.5px] leading-relaxed text-muted-fg">{s.intro}</p>
                </div>
              </div>
            </details>

            {slots?.[s.id] ? <div className="mt-7">{slots[s.id]}</div> : null}

            <ul className="mt-7 list-none border-t border-border-soft p-0">
              {list.map((t) => (
                <li key={t.id} className="border-b border-border-soft">
                  <Link
                    href={`/how-email-works/${t.id}`}
                    className="group grid grid-cols-1 gap-x-6 gap-y-1.5 px-1 py-4 transition-colors hover:bg-muted/40 sm:grid-cols-[13rem_1fr] sm:px-2"
                  >
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 sm:block">
                      <span className="text-[15px] font-semibold tracking-tight decoration-1 underline-offset-[5px] group-hover:underline">
                        {t.term}
                      </span>
                      {/* Inline beside the term on a phone, on its own line
                          from sm. Left inline at sm it butts straight into the
                          term with no separator, because JSX eats the space. */}
                      <span
                        className={cn(
                          "inline-flex shrink-0 rounded-full border px-1.5 py-0.5 text-[10.5px] font-medium sm:mt-1.5 sm:flex sm:w-fit",
                          OWNER_TONE[t.owner],
                        )}
                      >
                        {OWNER_LABEL[t.owner].short}
                      </span>
                    </div>
                    <p className="max-w-[58ch] text-[14.5px] leading-relaxed text-muted-fg">
                      {t.sayIt}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}

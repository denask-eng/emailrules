"use client";

import {
  useCallback,
  useDeferredValue,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
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

/**
 * On a phone the eight sections open at once are roughly fifteen thousand
 * pixels of stacked text, and you can never see one whole unit. Each stop
 * becomes a <details> there, so the page is eight tappable stops you can take
 * in at a glance. From sm the body is forced open and the summary chrome is
 * dropped, because a desktop column has the room and folding it would be
 * hiding content for no reason.
 *
 * Pure CSS: the content is always in the DOM for crawlers and for ⌘F, it is
 * only collapsed to a zero-height grid row.
 */
const STAGE_CSS = `
.stage-body { display: grid; grid-template-rows: 0fr; transition: grid-template-rows .35s var(--ease-soft); }
.stage-body > * { overflow: hidden; }
.stage-body[data-open="true"] { grid-template-rows: 1fr; }
@media (min-width: 640px) {
  .stage-body { grid-template-rows: 1fr; }
  .stage-summary { display: none; }
}
@media (prefers-reduced-motion: reduce) { .stage-body { transition: none; } }`;

/* Without JavaScript the toggle cannot run, so every stop opens. The content
   is in the DOM either way; this only decides whether a phone with scripting
   off can read it. */
const STAGE_NOSCRIPT = `.stage-body { grid-template-rows: 1fr; } .stage-summary { display: none; }`;

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

  /* Anything linking to #judge has to arrive at an open #judge. Every "the N
     words that live here" link in the player, and every breadcrumb on a term
     page, targets a stop that is collapsed on a phone — so without this you
     tap the link, the page scrolls, and you are looking at a closed heading.
     Read as an external store rather than set in an effect, so there is no
     synchronous setState on mount and no hydration mismatch. */
  const hash = useSyncExternalStore(
    useCallback((onChange: () => void) => {
      window.addEventListener("hashchange", onChange);
      return () => window.removeEventListener("hashchange", onChange);
    }, []),
    () => window.location.hash.slice(1),
    () => "",
  );

  /* Phone-only. From sm the panel is opened by CSS and the button is hidden,
     so this state is simply never consulted there. Filtering opens every
     matching stop, because a hit you cannot see is not a hit. */
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const isOpen = (id: string) => filtering || openIds.has(id) || hash === id;
  const toggle = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <>
      <style>{STAGE_CSS}</style>
      <noscript>
        <style>{STAGE_NOSCRIPT}</style>
      </noscript>
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
        /* Stops 4 and 5 happen inside Gmail, not inside your platform. Giving
           them their own surface turns eight identically-separated sections
           into a page with a spine: your building, their building, yours
           again — which is also the argument the page is making. */
        const theirs = s.id === "judge" || s.id === "filter";
        return (
          <section
            key={s.id}
            id={s.id}
            className={cn(
              "scroll-mt-[7.5rem]",
              theirs
                ? "mt-3 rounded-xl border border-border bg-bg-2 px-4 py-4 sm:mt-8 sm:rounded-2xl sm:px-8 sm:py-10 sm:first:mt-16"
                : "sm:pt-16",
            )}
          >
            {theirs ? (
              <p className="label mb-2 flex items-center gap-2 text-muted-fg sm:mb-5">
                <span aria-hidden className="h-px w-6 bg-fg/25" />
                Their building — not in your platform
              </p>
            ) : null}

            {/* A button and a panel, not <details>: a closed <details> hides
                its own content at the UA level, so the desktop media query
                that opens the panel could never win. */}
            <div>
              <button
                type="button"
                onClick={() => toggle(s.id)}
                aria-expanded={isOpen(s.id)}
                aria-controls={`${s.id}-body`}
                className="stage-summary flex w-full cursor-pointer items-center gap-x-3 border-b border-border-soft py-3.5 text-left">
                <span className="num text-[13px] font-semibold text-accent">
                  {String(s.n).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[1.2rem] leading-tight font-semibold tracking-tight">
                    {s.name}
                  </span>
                  <span className="num mt-1 block text-[11px] text-dim">
                    {s.when} · {list.length} word{list.length === 1 ? "" : "s"}
                  </span>
                </span>
                <span
                  aria-hidden
                  className={cn(
                    "shrink-0 text-[18px] leading-none text-dim transition-transform",
                    isOpen(s.id) && "rotate-45",
                  )}
                >
                  +
                </span>
              </button>

              <div className="stage-body" id={`${s.id}-body`} data-open={isOpen(s.id)}>
                <div>
                  {/* Repeated from the summary, for sm and up where the
                      summary is hidden. */}
                  <div className="hidden flex-wrap items-baseline gap-x-3 gap-y-1 sm:flex">
                    <span className="num text-[13px] font-semibold text-accent">
                      {String(s.n).padStart(2, "0")}
                    </span>
                    <h2 className="text-[clamp(1.45rem,3vw,1.85rem)] leading-tight font-semibold tracking-tight">
                      {s.name}
                    </h2>
                    <span className="num text-[11.5px] text-dim">{s.when}</span>
                  </div>

                  <p className="mt-3 max-w-[58ch] text-[1.02rem] leading-relaxed text-fg sm:mt-2.5">
                    {s.what}
                  </p>

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

                  {slots?.[s.id] ? <div className="mt-6 sm:mt-7">{slots[s.id]}</div> : null}

                  <ul className="mt-6 list-none border-t border-border-soft p-0 sm:mt-7">
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
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </>
  );
}

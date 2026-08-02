"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type RuleTab = {
  id: string;
  label: string;
  /** A figure the reader can weigh before clicking — how much is behind this. */
  count?: number;
  /**
   * Fragments that belong to this panel. A citation that deep-links to
   * `#sources` has to land on the proof panel, not on a page that looks like
   * the anchor does not exist.
   */
  anchors: string[];
  panel: ReactNode;
};

/**
 * Progressive disclosure that survives a dead script tag.
 *
 * Every panel is in the document on every request — the FAQPage and Article
 * JSON-LD, and the AI crawlers that read raw HTML rather than a rendered DOM,
 * all depend on the full text being there. Only display is touched.
 *
 * `scripting: enabled` is what makes that honest. A browser that cannot run
 * the tab controls never gets a panel hidden from it and is shown plain jump
 * links instead, so the page degrades to exactly what it was before tabs. The
 * media query also fires before hydration, so the long panel never paints and
 * then vanishes.
 */
const CSS = `
[data-rt-tabs]{display:none}
@media (scripting: enabled){
  [data-rt-tabs]{display:flex}
  [data-rt-links]{display:none}
  [data-rt-panel]:not([data-rt-open]){display:none}
}
@media print{
  [data-rt-tabs],[data-rt-links]{display:none}
  [data-rt-panel][data-rt-panel]{display:block}
}
`;

export function RuleTabs({
  tabs,
  label,
  trailing,
}: {
  tabs: RuleTab[];
  /** Names the tablist for screen readers. */
  label: string;
  /** Sits beside the tabs in both the scripted and unscripted rows. */
  trailing?: ReactNode;
}) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");
  const buttons = useRef<Record<string, HTMLButtonElement | null>>({});
  const lastHash = useRef<string | null>(null);

  /* A reader arriving from a citation is the reason this component exists at
     all, so the hash wins over the default panel. The browser already tried
     to reach the anchor while its panel was display:none and got nowhere, so
     the scroll has to be repeated once the panel is on screen. */
  useEffect(() => {
    const open = () => {
      const hash = decodeURIComponent(window.location.hash.slice(1));
      if (!hash || hash === lastHash.current) return;
      const owner = tabs.find((t) => t.id === hash || t.anchors.includes(hash));
      if (!owner) return;
      lastHash.current = hash;
      setActive(owner.id);
      requestAnimationFrame(() => {
        /* Aliases like #prove have no element of their own; falling back to the
           panel keeps an old citation landing on the right prose. */
        const target = document.getElementById(hash) ?? document.getElementById(`rt-panel-${owner.id}`);
        target?.scrollIntoView({ block: "start" });
      });
    };
    open();
    window.addEventListener("hashchange", open);
    return () => window.removeEventListener("hashchange", open);
  }, [tabs]);

  /* replaceState, not a new entry: the tab is a view of one page, and a Back
     button that walks back through tab presses is a Back button nobody trusts.
     The URL still carries the panel, so a copied link opens where you were. */
  const select = (id: string) => {
    setActive(id);
    const anchor = id === tabs[0]?.id ? null : tabs.find((t) => t.id === id)?.anchors[0];
    lastHash.current = anchor ?? null;
    const bare = window.location.pathname + window.location.search;
    window.history.replaceState(null, "", anchor ? `#${anchor}` : bare);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const here = tabs.findIndex((t) => t.id === active);
    const to =
      e.key === "ArrowRight" || e.key === "ArrowDown"
        ? (here + 1) % tabs.length
        : e.key === "ArrowLeft" || e.key === "ArrowUp"
          ? (here - 1 + tabs.length) % tabs.length
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? tabs.length - 1
              : -1;
    if (to < 0) return;
    e.preventDefault();
    select(tabs[to].id);
    buttons.current[tabs[to].id]?.focus();
  };

  return (
    <>
      <style>{CSS}</style>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-x-5 gap-y-1 border-y border-border-soft">
        <div
          role="tablist"
          aria-label={label}
          data-rt-tabs
          onKeyDown={onKeyDown}
          className="flex-wrap items-center gap-x-5"
        >
          {tabs.map((t) => {
            const on = t.id === active;
            return (
              <button
                key={t.id}
                ref={(el) => {
                  buttons.current[t.id] = el;
                }}
                type="button"
                role="tab"
                id={`rt-tab-${t.id}`}
                aria-controls={`rt-panel-${t.id}`}
                aria-selected={on}
                tabIndex={on ? 0 : -1}
                onClick={() => select(t.id)}
                className={cn(
                  "-mb-px cursor-pointer border-b-2 py-2.5 text-[12.5px] whitespace-nowrap",
                  on ? "border-accent font-medium text-fg" : "border-transparent text-muted-fg hover:text-fg",
                )}
              >
                {t.label}
                {t.count ? <span className="num ml-1.5 text-[11px] text-dim">{t.count}</span> : null}
              </button>
            );
          })}
        </div>

        <nav
          data-rt-links
          aria-label={label}
          className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5 text-[12.5px]"
        >
          {tabs.map((t, i) => (
            <a
              key={t.id}
              href={`#${t.anchors[0] ?? t.id}`}
              className={i === 0 ? "font-medium text-fg hover:text-accent" : "text-muted-fg hover:text-fg"}
            >
              {t.label}
            </a>
          ))}
        </nav>

        {trailing ? <div className="py-2.5 text-[12.5px] text-dim">{trailing}</div> : null}
      </div>

      {tabs.map((t) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`rt-panel-${t.id}`}
          aria-labelledby={`rt-tab-${t.id}`}
          data-rt-panel
          data-rt-open={t.id === active ? "" : undefined}
        >
          {t.panel}
        </div>
      ))}
    </>
  );
}

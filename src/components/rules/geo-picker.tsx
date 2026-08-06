"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type GeoInfo = { j: string; label: string; n: number };
type RuleLite = {
  slug: string;
  title: string;
  jurisdictions: string[];
  upcoming: boolean;
  /** Preformatted "From 29 Oct 2026" line for upcoming rules; server formats it. */
  from: string | null;
};

/**
 * "Does this hit me?" answered by a tap. The matrix asked the reader to find
 * their column in a 40-row dot grid; here they name the place and read a list.
 * The full table stays on the page (collapsed) for crawlers and cross-country
 * comparison — this component is the human path, not the only path.
 */
export function GeoPicker({ geos, rules }: { geos: GeoInfo[]; rules: RuleLite[] }) {
  const [sel, setSel] = useState<string | null>(null);
  const active = geos.find((g) => g.j === sel) ?? null;
  const hit = active ? rules.filter((r) => r.jurisdictions.includes(active.j)) : [];
  const inForce = hit.filter((r) => !r.upcoming);
  const later = hit.filter((r) => r.upcoming);

  return (
    <div>
      <div role="group" aria-label="Where you send" className="flex flex-wrap gap-2">
        {geos.map((g) => {
          const on = sel === g.j;
          return (
            <button
              key={g.j}
              type="button"
              aria-pressed={on}
              onClick={() => setSel(on ? null : g.j)}
              className={cn(
                "pressable inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-[13.5px]",
                on
                  ? "border-fg bg-fg font-medium text-bg"
                  : "border-border bg-bg text-muted-fg hover:border-input hover:bg-muted hover:text-fg",
              )}
            >
              {g.label}
              <span className={cn("num text-[11.5px]", on ? "text-bg/70" : "text-dim")}>{g.n}</span>
            </button>
          );
        })}
      </div>

      <div aria-live="polite">
        {active ? (
          <div className="mt-6 rounded-2xl border bg-card">
            <p className="m-0 border-b border-border-soft px-5 py-4 text-[14.5px] sm:px-6">
              <b className="num font-semibold">{hit.length}</b>{" "}
              {hit.length === 1 ? "rule hits" : "rules hit"}{" "}
              <b className="font-semibold">{active.label}</b> senders
              {later.length > 0 ? (
                <span className="text-muted-fg">
                  {" "}
                  · <span className="num">{later.length}</span> not in force yet
                </span>
              ) : null}
            </p>
            <ul className="m-0 list-none columns-1 gap-0 p-0 md:columns-2">
              {[...inForce, ...later].map((r) => (
                <li
                  key={r.slug}
                  className="break-inside-avoid border-b border-border-soft md:[&:nth-last-child(-n+1)]:border-b-0"
                >
                  <Link
                    href={`/rules/${r.slug}`}
                    className="flex min-h-11 items-baseline gap-2.5 px-5 py-3 text-[13.5px] leading-snug hover:bg-muted/50 hover:text-accent sm:px-6"
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "mt-[1px] h-1.5 w-1.5 shrink-0 translate-y-[-1px] rounded-full",
                        r.upcoming ? "bg-live" : "bg-fg/80",
                      )}
                    />
                    <span className="min-w-0">
                      {r.title}
                      {r.upcoming && r.from ? (
                        <span className="num block text-[11.5px] text-live">{r.from}</span>
                      ) : null}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {later.length > 0 ? (
              <p className="m-0 flex flex-wrap gap-x-5 gap-y-1 border-t border-border-soft px-5 py-3 text-[12px] text-muted-fg sm:px-6">
                <span className="flex items-center gap-1.5">
                  <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-fg/80" /> in force
                </span>
                <span className="flex items-center gap-1.5">
                  <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-live" /> starts later
                </span>
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-4 text-[13.5px] text-dim">
            Tap where you send. Every count is a dated page, not an estimate.
          </p>
        )}
      </div>
    </div>
  );
}

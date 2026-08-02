"use client";

import Link from "next/link";
import type { Ownership, Rule } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Explained } from "@/components/explained";
import { displayTldr } from "@/content/plain-overrides";
import { fmtDate } from "@/lib/format";
import { FRESHNESS_LABEL, IMPACT_LABEL, freshness, impactOf } from "@/lib/rule-signals";

/**
 * Ownership is the one thing this site publishes that a vendor structurally
 * cannot, so on a list it carries the weight instead of sitting in the corner
 * as a pale pill.
 *
 * The scale is weight, not hue: solid accent when the job is yours, a hairline
 * outline when the tool does half of it, and no box at all once the tool has
 * done it. That leaves red / amber / green free to keep meaning *status*, which
 * is the only other thing on this page allowed to spend colour.
 */
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

/**
 * The link is on the title, not wrapped around the row: the plain-English line
 * contains glossary buttons, and a button inside an anchor is neither valid nor
 * operable. `:has()` gives the row back its hover surface without the nesting.
 *
 * No scroll-reveal here on purpose. The list is the substance of the page, and
 * an opacity-0 default means a reader with JS off gets a blank shelf.
 */
export function RuleRow({ rule, compact = false }: { rule: Rule; compact?: boolean }) {
  const o = OWN[rule.ownership];
  const f = freshness(rule);

  const meta = [
    IMPACT_LABEL[impactOf(rule)],
    ...rule.jurisdictions.slice(0, 3),
    ...(rule.provider ? [rule.provider] : []),
    ...(f !== "stable" ? [FRESHNESS_LABEL[f]] : []),
  ].join(" · ");

  return (
    <li
      className={cn(
        "border-b border-border-soft transition-colors last:border-b-0",
        "has-[a:hover]:bg-muted/40",
      )}
    >
      <div
        className={cn(
          "grid gap-x-6 gap-y-2 border-l-2 pr-1 pl-3.5 sm:grid-cols-[7rem_1fr] sm:pl-5",
          compact ? "py-3.5" : "py-5",
          o.rail,
        )}
      >
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 sm:block">
          <span
            className={cn(
              "label inline-flex items-center rounded-sm border px-1.5 py-[3px]",
              o.mark,
            )}
          >
            {o.word}
          </span>
          {rule.status === "upcoming" ? (
            <span className="num block text-[11px] text-soon sm:mt-1.5">
              From {fmtDate(rule.effectiveDate)}
            </span>
          ) : null}
        </div>

        <div className="min-w-0">
          <h3 className={cn("leading-snug tracking-tight", o.title)}>
            <Link
              href={`/rules/${rule.slug}`}
              className="decoration-1 underline-offset-[5px] hover:underline focus-visible:underline"
            >
              {rule.title}
            </Link>
          </h3>
          <p className={cn("mt-1.5 max-w-[64ch] text-[14px] leading-relaxed", o.body)}>
            <Explained text={displayTldr(rule.slug, rule.plain)} />
          </p>
          {!compact && rule.ignoreIf ? (
            <p className="mt-1.5 max-w-[64ch] text-[12.5px] leading-relaxed text-dim">
              <span className="font-medium text-muted-fg">Skip if </span>
              <Explained text={rule.ignoreIf} />
            </p>
          ) : null}
          <p className="num mt-2 text-[11px] text-dim">{meta}</p>
        </div>
      </div>
    </li>
  );
}

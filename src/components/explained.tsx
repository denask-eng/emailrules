"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { segmentWithTerms, type GlossaryTerm } from "@/content/how-email-works";
import { cn } from "@/lib/utils";

/**
 * Renders copy with first-use glossary underlines.
 * Hover/focus/tap shows a plain-English definition — newbies never stuck on a word.
 */

function TermChip({
  surface,
  term,
}: {
  surface: string;
  term: GlossaryTerm;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <span className="relative inline">
      <button
        type="button"
        className={cn(
          "cursor-help border-b border-dotted border-accent/70 font-medium text-fg",
          "decoration-accent/50 underline-offset-2 hover:text-accent",
        )}
        aria-describedby={open ? id : undefined}
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
      >
        {surface}
      </button>
      {open ? (
        <span
          id={id}
          role="tooltip"
          className="absolute top-[calc(100%+6px)] left-0 z-50 w-[min(18rem,calc(100vw-2rem))] rounded-lg border bg-card p-3 text-left text-[12.5px] leading-relaxed text-muted-fg shadow-md"
          style={{ boxShadow: "var(--lift-2)" }}
        >
          <span className="block text-[12px] font-semibold text-fg">{term.term}</span>
          <span className="mt-1 block">{term.short}</span>
          {/* Straight to the term's own page, not to an anchor on a long index.
              The page carries the artefact — the real DNS value, the header
              line, the arithmetic — which is the part that settles the
              question the tooltip only names. */}
          <Link
            href={`/how-email-works/${term.id}`}
            className="mt-2 inline-block text-[11.5px] font-medium text-accent underline underline-offset-2"
            onClick={(e) => e.stopPropagation()}
          >
            See what it looks like →
          </Link>
        </span>
      ) : null}
    </span>
  );
}

export function Explained({
  text,
  className,
  as: Tag = "span",
}: {
  text: string;
  className?: string;
  as?: "span" | "p" | "div";
}) {
  const parts = segmentWithTerms(text);
  return (
    <Tag className={className}>
      {parts.map((p, i) =>
        p.type === "text" ? (
          <span key={i}>{p.value}</span>
        ) : (
          <TermChip key={i} surface={p.value} term={p.term} />
        ),
      )}
    </Tag>
  );
}

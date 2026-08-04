"use client";

import { useState } from "react";

/**
 * "Copy as context" — borrowed from branch B, and the one idea from it that
 * costs nothing and changes what this site is for.
 *
 * It is not a share button. What it emits is a small, clean markdown record:
 * the claim, whose job it is, the primary sources with their publication
 * dates, the date a human verified it, and a closing line saying a person
 * wrote this and a model did not. That is the artefact a marketer pastes into
 * their own assistant, and it is built so three of them pasted together stay
 * distinguishable.
 *
 * The client boundary is exactly this button — the clipboard is a browser API
 * and nothing else here needs one. The markdown is assembled on the server by
 * `buildContext` and arrives as a prop.
 */
export function CopyContext({
  markdown,
  label = "Copy as context",
  className,
}: {
  markdown: string;
  label?: string;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(markdown);
      setState("done");
      setTimeout(() => setState("idle"), 1800);
    } catch {
      /* Clipboard denied. Say so rather than showing a false success. */
      setState("failed");
      setTimeout(() => setState("idle"), 2600);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-live="polite"
      className={
        className ??
        "inline-flex min-h-9 items-center gap-1.5 text-[13px] font-medium text-muted-fg underline-offset-3 hover:text-accent hover:underline"
      }
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
        <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" stroke="currentColor" />
        <path d="M8.5 1.5H2A1.5 1.5 0 0 0 .5 3v6" stroke="currentColor" strokeLinecap="round" />
      </svg>
      {state === "done" ? "Copied" : state === "failed" ? "Clipboard blocked" : label}
    </button>
  );
}

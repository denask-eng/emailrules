"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * A snippet you can take without reading it.
 *
 * The <pre> stays selectable rather than living in a disabled input, because
 * clipboard access is refused often enough — old browsers, locked-down work
 * machines, anything not on https — that the button has to be the convenience
 * and never the only way out.
 */
export function CopyField({
  label,
  value,
  note,
  className,
  valueClassName,
}: {
  label: string;
  value: string;
  note?: string;
  className?: string;
  /** Override the value's type scale. The one-time address is the page's
      subject rather than a snippet, so it is set larger there. */
  valueClassName?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* Selection still works. Nothing useful to say here. */
    }
  }

  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-4">
        <p className="label">{label}</p>
        <button
          type="button"
          onClick={copy}
          className={cn(
            "num rounded-md border px-2 py-1 text-[11px] font-medium",
            copied
              ? "border-ok/35 bg-ok-bg text-ok"
              : "border-border bg-card text-muted-fg hover:border-input hover:text-fg",
          )}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      {/* `break-word` rather than `break-all`: an address broken mid-domain
          reads as two strings, and this is the one value on the page somebody
          might retype by eye. The copy button is the real answer, and the wrap
          only has to stay legible when it is refused. */}
      <pre
        className={cn(
          "num mt-2 rounded-lg border border-border-soft bg-bg-2 p-3 leading-relaxed break-words whitespace-pre-wrap",
          valueClassName ?? "text-[12px]",
        )}
      >
        {value}
      </pre>
      {note ? <p className="mt-1.5 max-w-[62ch] text-[12.5px] text-dim">{note}</p> : null}
    </div>
  );
}

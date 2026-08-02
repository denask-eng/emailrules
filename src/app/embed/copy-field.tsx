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
}: {
  label: string;
  value: string;
  note?: string;
  className?: string;
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
      <pre className="num mt-2 rounded-lg border border-border-soft bg-bg-2 p-3 text-[12px] leading-relaxed break-words whitespace-pre-wrap">
        {value}
      </pre>
      {note ? <p className="mt-1.5 max-w-[62ch] text-[12.5px] text-dim">{note}</p> : null}
    </div>
  );
}

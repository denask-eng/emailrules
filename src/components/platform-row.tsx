import Link from "next/link";
import type { EspChange } from "@/content/esp-changes";
import { ESP_PLATFORMS } from "@/content/esp-changes";
import { fmtDate } from "@/lib/rules";
import { cn } from "@/lib/utils";

/**
 * A platform change, rendered in the same grammar as a rule change.
 *
 * Deliberately not a variant of `ChangeRow`: that one is typed to `Rule` and
 * links into the corpus, and bending it to take either shape would make both
 * harder to read. What matters is that the two look identical in a merged list,
 * because the reader's question — "my numbers moved, what changed" — does not
 * care whether the answer came from a regulator or from their ESP.
 */
export function PlatformRow({ change, compact = false }: { change: EspChange; compact?: boolean }) {
  const platform = ESP_PLATFORMS.find((p) => p.id === change.esp);
  const href = `/esp/${change.esp}#${change.id}`;

  return (
    <Link
      href={href}
      className={cn(
        "group block border-b border-border-soft last:border-b-0 hover:bg-muted/50",
        compact ? "px-4 py-4 sm:px-5" : "px-1 py-5 sm:px-2 sm:py-6",
      )}
    >
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        {change.date ? (
          <time dateTime={change.date} className="num text-[12px] text-dim">
            {fmtDate(change.date)}
          </time>
        ) : (
          <span className="num text-[12px] text-dim">no date printed</span>
        )}
        <span className="text-[12px] font-medium text-accent">Your platform</span>
        <span className="num text-[11px] text-dim">{platform?.name ?? change.esp}</span>
      </div>

      <h3
        className={cn(
          "mt-2 font-semibold tracking-tight text-fg decoration-1 underline-offset-[5px] group-hover:underline",
          compact ? "text-[15px] leading-snug" : "text-[1.05rem] leading-snug sm:text-[1.1rem]",
        )}
      >
        {change.title}
      </h3>

      <p
        className={cn(
          "mt-1.5 max-w-[62ch] leading-relaxed text-muted-fg",
          compact ? "text-[13px]" : "text-[14px]",
        )}
      >
        <span className="font-medium text-fg/75">What changed: </span>
        {change.changed}
      </p>

      {!compact ? (
        <>
          <p className="mt-2 max-w-[62ch] text-[13.5px] leading-relaxed text-muted-fg">
            <span className="font-medium text-fg/75">Why it matters: </span>
            {change.matters}
          </p>
          <p className="mt-1.5 max-w-[62ch] text-[13px] leading-relaxed text-dim">
            <span className="font-medium text-muted-fg">Do next: </span>
            {change.next}
            <span className="ml-1.5 text-accent opacity-0 transition-opacity group-hover:opacity-100">
              Full entry →
            </span>
          </p>
        </>
      ) : null}
    </Link>
  );
}

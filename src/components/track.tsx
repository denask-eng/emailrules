import type { JourneyStop } from "@/lib/message-journey";
import { cn } from "@/lib/utils";

/**
 * The eight stops, drawn.
 *
 * The explainer teaches email as a journey and it is the best idea on this
 * site — and until now it was a numbered list of paragraphs, which means the
 * reader had to read eight verdicts before knowing which one broke. This is the
 * same eight stops as one object: the whole path, and where it went wrong,
 * before a word is read.
 *
 * Four states, and the fourth is the argument. Most tools have three — pass,
 * warn, fail — and a stop they cannot see silently becomes a pass. Here it is
 * hollow and dashed, visibly not the same thing as green, because a stop nobody
 * checked must never look like a stop that succeeded. Five of the eight are
 * unseeable from a single message and `CANNOT_SEE` in lib/message-journey.ts
 * already writes the honest sentence for each.
 *
 * CSS rather than SVG: the connectors are borders, and SVG would cost
 * responsive type for nothing. Nodes are anchors to the detail below, so
 * navigation needs no JavaScript at all.
 */

export type StopState = "broke" | "warn" | "clean" | "unseen";

/** Derived, never invented — every input already exists on the stop. */
export function stateOf(stop: JourneyStop): StopState {
  if (stop.unseeable) return "unseen";
  if (stop.fails > 0) return "broke";
  if (stop.warns > 0) return "warn";
  return "clean";
}

const NODE: Record<StopState, string> = {
  broke: "border-live bg-live text-white",
  warn: "border-soon bg-soon text-white",
  clean: "border-ok bg-ok text-white",
  /* Hollow and dashed. It has to be legible as "not answered" at a glance,
     which no amount of a lighter green would be. */
  unseen: "border-dashed border-dim/60 bg-bg text-dim",
};

const LABEL: Record<StopState, string> = {
  broke: "text-live",
  warn: "text-soon",
  clean: "text-muted-fg",
  unseen: "text-dim",
};

const KEY: { state: StopState; label: string }[] = [
  { state: "broke", label: "broke here" },
  { state: "warn", label: "worth a look" },
  { state: "clean", label: "fine" },
  { state: "unseen", label: "a message cannot show this" },
];

export function Track({ stops, className }: { stops: JourneyStop[]; className?: string }) {
  const states = stops.map(stateOf);

  return (
    <div className={className}>
      <ol className="flex list-none items-start gap-0 p-0">
        {stops.map((stop, i) => {
          const state = states[i];
          return (
            <li
              key={stop.stage.id}
              className={cn("flex min-w-0 flex-1 flex-col items-center", i === 0 && "flex-none")}
            >
              <div className="flex w-full items-center">
                {/* The connector arrives before its node, and turns red when the
                    node it leads into is where the journey broke. */}
                {i > 0 ? (
                  <span
                    aria-hidden
                    className={cn(
                      "h-px min-w-2 flex-1",
                      state === "broke" ? "bg-live/45" : "bg-border",
                    )}
                  />
                ) : null}
                <span
                  className={cn(
                    "settle num flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[11.5px] font-medium sm:h-10 sm:w-10 sm:text-[13px]",
                    NODE[state],
                  )}
                  style={{ "--settle-delay": `${i * 85}ms` } as React.CSSProperties}
                >
                  {String(stop.stage.n).padStart(2, "0")}
                </span>
              </div>

              {/* Names need room. Below 768px the numbers carry it and the
                  detail underneath does the naming, rather than eight labels
                  shrinking into unreadability. */}
              <a
                href={`#stop-${stop.stage.id}`}
                className={cn(
                  "mt-2.5 hidden max-w-[13ch] text-center text-[11.5px] leading-tight hover:text-fg md:block",
                  LABEL[state],
                )}
              >
                {stop.stage.name}
              </a>
            </li>
          );
        })}
      </ol>

      <ul className="mt-6 flex list-none flex-wrap justify-center gap-x-5 gap-y-2 p-0 md:mt-7">
        {KEY.filter((k) => states.includes(k.state)).map((k) => (
          <li key={k.state} className="flex items-center gap-1.5 text-[12px] text-muted-fg">
            {/* The hollow key has to survive at 10px, so it keeps a solid ring
                rather than the dashed one the node uses — a dashed 10px circle
                reads as a rendering artefact rather than as a state. */}
            <span
              aria-hidden
              className={cn(
                "h-2.5 w-2.5 shrink-0 rounded-full border",
                k.state === "unseen" ? "border-dim/70 bg-bg" : NODE[k.state],
              )}
            />
            {k.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

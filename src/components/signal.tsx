import { cn } from "@/lib/utils";
import type { RuleStatus, Ownership } from "@/lib/types";

/**
 * Borrowed from branch A ("The Instrument"), which was right about one thing
 * even though the rest of it turned this site into a terminal:
 *
 *   **a state must never be carried by colour alone.**
 *
 * Every status on this site was a coloured dot. That is invisible to about one
 * man in twelve, it dies in a greyscale screenshot, and it dies on paper — and
 * this is a site people screenshot into Slack and print for their boss.
 *
 * So each of the four states gets a glyph that differs in *silhouette*, not in
 * hue: disc, cross, diamond, dash. Colour still agrees with the glyph; it just
 * no longer speaks on its own. The colours themselves are the ones already in
 * `globals.css` — nothing new was introduced.
 */

export type SignalState = "pass" | "fail" | "pend" | "na";

export const SIGNAL_LABEL: Record<SignalState, string> = {
  pass: "Handled",
  fail: "Needs you",
  pend: "Partly yours",
  na: "Nothing to do",
};

const TONE: Record<SignalState, string> = {
  pass: "text-ok",
  fail: "text-live",
  pend: "text-soon",
  na: "text-dim",
};

export function Signal({
  state,
  size = 10,
  className,
  /** Set false where an adjacent text label already states the meaning. */
  label,
}: {
  state: SignalState;
  size?: number;
  className?: string;
  label?: boolean;
}) {
  const c = size / 2;
  const r = size * 0.36;
  return (
    <span
      className={cn("inline-flex shrink-0 items-center", TONE[state], className)}
      role={label === false ? undefined : "img"}
      aria-label={label === false ? undefined : SIGNAL_LABEL[state]}
      aria-hidden={label === false ? true : undefined}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
        {state === "pass" ? <circle cx={c} cy={c} r={r} fill="currentColor" /> : null}
        {state === "fail" ? (
          <g stroke="currentColor" strokeWidth={size * 0.19} strokeLinecap="round">
            <line x1={c - r} y1={c - r} x2={c + r} y2={c + r} />
            <line x1={c + r} y1={c - r} x2={c - r} y2={c + r} />
          </g>
        ) : null}
        {state === "pend" ? (
          <path
            d={`M ${c} ${c - r} L ${c + r} ${c} L ${c} ${c + r} L ${c - r} ${c} Z`}
            fill="currentColor"
          />
        ) : null}
        {state === "na" ? (
          <line
            x1={c - r}
            y1={c}
            x2={c + r}
            y2={c}
            stroke="currentColor"
            strokeWidth={size * 0.17}
            strokeLinecap="round"
          />
        ) : null}
      </svg>
    </span>
  );
}

/** Is this reading on your desk? */
export function ownershipSignal(o: Ownership): SignalState {
  return o === "yours" ? "fail" : o === "shared" ? "pend" : o === "esp" ? "pass" : "na";
}

/**
 * A rule's status as a signal.
 *
 * `in_force` takes the alarm channel deliberately: on this site red means
 * "this is biting right now", not "you did something wrong".
 */
export function statusSignal(s: RuleStatus): SignalState {
  return s === "in_force" ? "fail" : s === "upcoming" ? "pend" : "na";
}

/** Findings from the check pipeline speak in severities. */
export function severitySignal(s: "fail" | "warn" | "pass" | "info"): SignalState {
  return s === "fail" ? "fail" : s === "warn" ? "pend" : s === "pass" ? "pass" : "na";
}

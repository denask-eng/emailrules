import type { Finding } from "@/lib/dns-check";
import { cn } from "@/lib/utils";

/**
 * The answer, at the size of the answer.
 *
 * Result pages here have opened with the subject — a domain in large mono —
 * and put the actual finding in body copy underneath it. The reader already
 * knows which domain they asked about; what they do not know is whether
 * anything is wrong, and that was the smallest text in the top half of the
 * page. This inverts it: the subject becomes the label, the verdict becomes
 * the headline, and the colour carries the outcome before the sentence is read.
 */

export type VerdictTone = "bad" | "warn" | "ok";

const TONE: Record<VerdictTone, string> = {
  bad: "text-live",
  warn: "text-soon",
  ok: "text-ok",
};

/** Worst wins. A page with one failure is not a page that is mostly fine. */
export function toneOf(findings: Finding[]): VerdictTone {
  if (findings.some((f) => f.severity === "fail")) return "bad";
  if (findings.some((f) => f.severity === "warn")) return "warn";
  return "ok";
}

export function Verdict({
  label,
  headline,
  tone,
  className,
}: {
  label: React.ReactNode;
  headline: string;
  tone: VerdictTone;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="num label">{label}</p>
      <h1
        className={cn(
          "mt-4 max-w-[26ch] text-[clamp(1.95rem,5.6vw,3.3rem)] leading-[1.02] tracking-[-0.04em] text-balance",
          TONE[tone],
        )}
      >
        {headline}
      </h1>
    </div>
  );
}

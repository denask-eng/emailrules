import Link from "next/link";
import type { Finding, Severity } from "@/lib/dns-check";
import { cn } from "@/lib/utils";
import { Explained } from "@/components/explained";

/**
 * One row per finding, severity-sorted by the caller.
 *
 * The plain label carries the verdict, the dot only repeats it in colour —
 * so the list still reads correctly in greyscale, in a screenshot, and to
 * anyone who cannot separate the reds from the greens.
 */
const TONE: Record<Severity, { dot: string; plain: string }> = {
  fail: { dot: "bg-live", plain: "Fix this" },
  warn: { dot: "bg-soon", plain: "Worth a look" },
  pass: { dot: "bg-ok", plain: "Looks fine" },
  info: { dot: "bg-dim", plain: "Context" },
};

export function FindingList({
  findings,
  ruleTitles,
}: {
  findings: Finding[];
  ruleTitles: Record<string, string>;
}) {
  return (
    <ul className="mt-8 list-none border-t p-0">
      {findings.map((finding, index) => (
        <li key={index} className="grid grid-cols-[10px_1fr] items-start gap-4 border-b py-5">
          <span
            className={cn("mt-[7px] h-2 w-2 shrink-0 rounded-full", TONE[finding.severity].dot)}
            aria-hidden
          />
          <div className="min-w-0">
            <p className="text-[11px] font-medium tracking-wide text-dim uppercase">
              {TONE[finding.severity].plain}
            </p>
            <h2 className="mt-1 text-[1.02rem] leading-snug font-semibold">
              <Explained text={finding.title} />
            </h2>
            <Explained
              as="p"
              className="mt-2 max-w-[64ch] text-[0.95rem] leading-relaxed text-muted-fg"
              text={finding.detail}
            />
            {finding.evidence ? (
              <pre className="num mt-3 overflow-x-auto rounded-lg border bg-bg-2 px-3 py-2 text-[0.72rem] text-muted-fg">
                {finding.evidence}
              </pre>
            ) : null}
            {finding.rule ? (
              <p className="mt-3 text-[0.84rem] text-dim">
                From{" "}
                <Link
                  href={`/rules/${finding.rule}`}
                  className="text-fg underline decoration-1 underline-offset-3 hover:text-accent"
                >
                  {ruleTitles[finding.rule] ?? "the rule this comes from"}
                </Link>
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * The counts, and nothing that could be mistaken for a grade.
 *
 * Two tools once scored the same campaign at 85 and 40. A tally of dated
 * findings is the version of that summary we can actually stand behind, so
 * the figures are tabular and the words next to them do the judging.
 */
export function FindingTally({ findings }: { findings: Finding[] }) {
  const rows: { n: number; label: string; dot: string }[] = (
    [
      ["fail", "to fix"],
      ["warn", "worth a look"],
      ["pass", "fine"],
      ["info", "context"],
    ] as [Severity, string][]
  )
    .map(([severity, label]) => ({
      n: findings.filter((f) => f.severity === severity).length,
      label,
      dot: TONE[severity].dot,
    }))
    .filter((r) => r.n > 0);

  return (
    <ul className="mt-5 flex list-none flex-wrap items-center gap-x-5 gap-y-1.5 p-0 text-[0.86rem]">
      {rows.map((r) => (
        <li key={r.label} className="flex items-center gap-2">
          <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", r.dot)} aria-hidden />
          <span className="num font-medium text-fg">{r.n}</span>
          <span className="text-muted-fg">{r.label}</span>
        </li>
      ))}
    </ul>
  );
}

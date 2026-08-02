import Link from "next/link";
import type { Finding, Severity } from "@/lib/dns-check";
import { cn } from "@/lib/utils";

const TONE: Record<Severity, { dot: string; label: string }> = {
  fail: { dot: "bg-live", label: "Needs fixing" },
  warn: { dot: "bg-soon", label: "Worth a look" },
  pass: { dot: "bg-ok", label: "Fine" },
  info: { dot: "bg-dim", label: "Context" },
};

export function FindingList({
  findings,
  ruleTitles,
}: {
  findings: Finding[];
  ruleTitles: Record<string, string>;
}) {
  return (
    <ul className="mt-9 list-none border-t p-0">
      {findings.map((finding, index) => (
        <li key={index} className="grid grid-cols-[10px_1fr] items-start gap-4 border-b py-5">
          <span
            className={cn("mt-2 h-2 w-2 shrink-0 rounded-full", TONE[finding.severity].dot)}
            aria-label={TONE[finding.severity].label}
          />
          <div className="min-w-0">
            <h2 className="text-[1.02rem] leading-snug font-semibold">{finding.title}</h2>
            <p className="mt-2 max-w-[64ch] text-[0.95rem] leading-relaxed text-muted-fg">
              {finding.detail}
            </p>
            {finding.evidence ? (
              <pre className="num mt-3 overflow-x-auto rounded-lg border bg-bg-2 px-3 py-2 text-[0.72rem] text-muted-fg">
                {finding.evidence}
              </pre>
            ) : null}
            {finding.rule ? (
              <Link
                href={`/rules/${finding.rule}`}
                className="mt-3 inline-block text-[0.84rem] underline underline-offset-3 hover:text-accent"
              >
                From the rule: {ruleTitles[finding.rule] ?? "Read the rule"}
              </Link>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

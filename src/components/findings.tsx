import Link from "next/link";
import type { Finding, Severity } from "@/lib/dns-check";
import { OWNERSHIP, type Ownership } from "@/lib/types";
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

const OWN_TONE: Record<Ownership, string> = {
  esp: "text-ok",
  shared: "text-soon",
  yours: "text-accent",
  context: "text-muted-fg",
};

/**
 * The half of a finding no other checker prints.
 *
 * Everyone can tell you DKIM is not aligned. Whether that is a screen in your
 * ESP or an afternoon of your own is the question the reader actually has, and
 * it comes from the cited rule rather than from an opinion formed here.
 */
export interface FindingOwnership {
  ownership: Ownership;
  mondayMorning: string;
}

export function FindingList({
  findings,
  ruleTitles,
  ownership,
}: {
  findings: Finding[];
  ruleTitles: Record<string, string>;
  /** Optional: callers that can resolve the whole rule pass it, and each
      finding gains its ownership verdict and its first move. */
  ownership?: Record<string, FindingOwnership>;
}) {
  /* Two sources, and the difference matters.

     A DNS finding carries its own verdict, because one rule produces findings
     with different owners: an absent DKIM key is a support ticket on a domain
     that authorises Klaviyo and an afternoon of your own on a domain that
     authorises nobody. Those always print.

     A message finding inherits its verdict from the cited rule, where one rule
     can produce four findings on a single message. Those print once, against
     the most severe occurrence — which is the first, because the caller sorted
     by severity. */
  const claimed = new Set<string>();
  const verdicts = findings.map((finding): FindingOwnership | null => {
    if (finding.ownership) {
      /* "Looks fine → Good to know, nothing to fix" is two labels for one
         thought, and printed under every passing record it turns the answer
         into wallpaper. A context verdict earns its line only when it has
         something to say. */
      if (finding.ownership === "context" && !finding.mondayMorning) return null;
      return { ownership: finding.ownership, mondayMorning: finding.mondayMorning ?? "" };
    }
    if (!finding.rule || !ownership?.[finding.rule] || claimed.has(finding.rule)) return null;
    claimed.add(finding.rule);
    return ownership[finding.rule];
  });

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
            {/* Two different questions, so two different destinations. The
                rule answers "what am I obliged to do", which is what a boss or
                counsel asks for. The word answers "what does that even look
                like" — the literal record, the header block, the SMTP code —
                and that is the question the person reading a broken finding
                actually has first. */}
            {finding.rule || finding.term ? (
              <p className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[0.84rem] text-dim">
                {finding.rule ? (
                  <span>
                    From{" "}
                    <Link
                      href={`/rules/${finding.rule}`}
                      className="text-fg underline decoration-1 underline-offset-3 hover:text-accent"
                    >
                      {ruleTitles[finding.rule] ?? "the rule this comes from"}
                    </Link>
                  </span>
                ) : null}
                {finding.rule && finding.term ? <span aria-hidden>·</span> : null}
                {finding.term ? (
                  <Link
                    href={`/how-email-works/${finding.term}`}
                    className="font-medium text-accent underline decoration-1 underline-offset-3"
                  >
                    See what this looks like →
                  </Link>
                ) : null}
              </p>
            ) : null}
            {verdicts[index] ? (
              <div className="mt-2.5 border-l pl-3.5">
                <p className={cn("text-[0.78rem] font-medium", OWN_TONE[verdicts[index].ownership])}>
                  {OWNERSHIP[verdicts[index].ownership].label}
                </p>
                {verdicts[index].mondayMorning ? (
                  <Explained
                    as="p"
                    className="mt-1 max-w-[62ch] text-[0.86rem] leading-relaxed text-muted-fg"
                    text={verdicts[index].mondayMorning}
                  />
                ) : null}
              </div>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * How many of these are actually the reader's.
 *
 * The headline of a check used to be a severity total, which answers "how
 * alarmed should I be" — a question nobody arrives with. The question people
 * arrive with is whether any of this is theirs to do, and a domain can be
 * entirely unenforced while every single finding reads green to a severity
 * counter. Counting owners instead is what stopped this page printing
 * "Nothing here needs you" over a domain at p=none.
 */
export function countYours(findings: Finding[]): {
  yours: number;
  shared: number;
  handled: number;
} {
  const n = (o: Ownership) => findings.filter((f) => f.ownership === o).length;
  return { yours: n("yours"), shared: n("shared"), handled: n("esp") };
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

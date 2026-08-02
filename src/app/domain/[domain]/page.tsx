import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { hasDatabase } from "@/lib/db";
import { checkDomain, normaliseDomain } from "@/lib/dns-check";
import { getDomainTimeline, observeDomain, type TimelineMove } from "@/lib/domain-history";
import { describeSnapshot, RULE_FOR_FIELD, type ChangeEntry } from "@/lib/domain-snapshot";
import { getRule, fmtDate } from "@/lib/rules";
import { SITE } from "@/lib/site";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { FindingList, FindingTally } from "@/components/findings";

/**
 * Indexing switch. One line, deliberately off, and not an oversight.
 *
 * Recording history costs nobody anything and cannot be back-filled, so it
 * starts now. Publishing it is a different decision with a different blast
 * radius: an indexed page about somebody else's domain is outward-facing, hard
 * to reverse once crawled, and can put a small business's misconfiguration in
 * front of anyone who searches their name. Flip this to true only together
 * with adding /domain to src/app/sitemap.ts, and only once that call has been
 * taken deliberately rather than as a side effect of shipping capture.
 */
const INDEXABLE = false;

/* Live DNS for the "today" half, same cache window as /check so a fix shows
   up while you are still looking at the page. */
export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ domain: string }>;
}): Promise<Metadata> {
  const { domain } = await params;
  const d = normaliseDomain(decodeURIComponent(domain));
  if (!d) return { title: "Domain history", robots: { index: INDEXABLE, follow: INDEXABLE } };

  const title = `${d} — authentication history`;
  const description = `What SPF, DKIM and DMARC on ${d} have done over time, from public DNS. Dated moves, never a score.`;

  return {
    title,
    description,
    robots: { index: INDEXABLE, follow: INDEXABLE },
    /* A correct unfurl even though the page is not indexed: without this it
       inherits the root card, which advertises the homepage under somebody
       else's domain name. */
    openGraph: {
      type: "website",
      title,
      description,
      url: `${SITE.url}/domain/${d}`,
      siteName: SITE.name,
    },
  };
}

export default async function DomainHistory({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;
  const d = normaliseDomain(decodeURIComponent(domain));
  if (!d) notFound();

  /* Opening this page is an observation too, and it is free. */
  after(() => observeDomain(d));

  const [result, timeline] = await Promise.all([checkDomain(d), getDomainTimeline(d)]);

  /* Every dated entry names the rule it answers to, so a move lands on a cited
     page rather than on our reading of it. Rules the corpus does not carry
     simply go unlinked. */
  const linkedSlugs = new Set<string>([
    ...(result.findings.map((f) => f.rule).filter(Boolean) as string[]),
    ...Object.values(RULE_FOR_FIELD),
  ]);
  const ruleTitles: Record<string, string> = {};
  await Promise.all(
    [...linkedSlugs].map(async (slug) => {
      const rule = await getRule(slug);
      if (rule) ruleTitles[slug] = rule.title;
    }),
  );

  const moves = timeline?.moves ?? [];

  return (
    <div className="shell shell-tight py-12 sm:py-16">
      <p className="label">
        Authentication history ·{" "}
        {timeline ? (
          <>
            <span className="num">{timeline.daysObserved}</span>{" "}
            {timeline.daysObserved === 1 ? "day" : "days"} observed
          </>
        ) : (
          "not yet on record"
        )}
      </p>
      <h1 className="num mt-3 text-[clamp(1.6rem,4.5vw,2.5rem)]">{d}</h1>

      <p className="mt-5 max-w-[62ch] text-[1.04rem] leading-relaxed text-muted-fg">
        {timeline ? (
          <>
            Observed from <span className="num">{fmtDate(timeline.firstObserved)}</span> to{" "}
            <span className="num">{fmtDate(timeline.lastObserved)}</span>.{" "}
            {moves.length === 0
              ? "Nothing published in DNS has moved in that window."
              : `${moves.length} dated ${moves.length === 1 ? "move" : "moves"} on record, newest first.`}
          </>
        ) : hasDatabase() ? (
          "No days on record yet. Today's observation is being written as you read this, and the series starts from it."
        ) : (
          "This deployment has no database, so nothing is being recorded. The live check below still works."
        )}
      </p>

      <section className="mt-11">
        <h2 className="text-[1.15rem] tracking-tight">Where it stands today</h2>
        <p className="mt-1.5 text-[0.9rem] text-dim">
          Live lookup, <span className="num">{fmtDate(result.checkedAt)}</span>. The same check{" "}
          <Link
            href={`/check/${d}`}
            className="text-fg underline decoration-1 underline-offset-3 hover:text-accent"
          >
            /check/{d}
          </Link>{" "}
          runs.
        </p>
        <FindingTally findings={result.findings} />
        <FindingList findings={result.findings} ruleTitles={ruleTitles} />
      </section>

      <section className="mt-12">
        <h2 className="text-[1.15rem] tracking-tight">What has moved</h2>
        <p className="mt-1.5 max-w-[62ch] text-[0.9rem] leading-relaxed text-dim">
          One entry per day a published record actually changed. Days we looked and found nothing
          different are counted, not listed.
        </p>

        {moves.length || timeline?.opening ? (
          <ol className="mt-6 list-none border-t p-0">
            {moves.map((move) => (
              <LedgerRow key={move.observedOn} move={move} ruleTitles={ruleTitles} />
            ))}
            {timeline?.opening ? (
              <LedgerRow
                key="opening"
                move={{ observedOn: timeline.firstObserved, entries: describeSnapshot(timeline.opening) }}
                ruleTitles={{}}
                heading="First observation — what was already published"
              />
            ) : null}
          </ol>
        ) : (
          <p className="mt-6 rounded-xl border bg-bg-2 p-5 text-[0.92rem] leading-relaxed text-muted-fg">
            Nothing to show yet. The ledger fills in from the day a record first changes, so an empty
            one means the domain has held still for as long as we have been looking.
          </p>
        )}

        {timeline && timeline.olderMoves > 0 ? (
          <p className="mt-4 text-[0.84rem] text-dim">
            <span className="num">{timeline.olderMoves}</span> earlier{" "}
            {timeline.olderMoves === 1 ? "move is" : "moves are"} on record but not shown here.
          </p>
        ) : null}
      </section>

      <div className="mt-10 rounded-xl border bg-bg-2 p-5 text-[0.92rem] leading-relaxed text-muted-fg">
        <b className="text-fg">Where this comes from.</b> Public DNS, and nothing else. We read the
        same TXT and MX records any mail server reads before accepting a message, on the days someone
        looked. There is no scan, no login, no mail, and no score here — only what was published and
        the date we saw it. Gaps are days we did not get a clean answer from a resolver, and we would
        rather leave those blank than guess at them.
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href={`/check/${d}`}
          className={cn(buttonVariants({ variant: "outline" }), "h-10 rounded-[10px] px-5")}
        >
          Run the full check
        </Link>
        <Link href="/rules" className={cn(buttonVariants(), "h-10 rounded-[10px] px-5 font-medium")}>
          See which rules are yours
        </Link>
      </div>
    </div>
  );
}

/**
 * A dated row: the date holds its own column so the whole ledger reads as one
 * tabular column of dates, which is the only thing this page is really for.
 */
function LedgerRow({
  move,
  ruleTitles,
  heading,
}: {
  move: TimelineMove;
  ruleTitles: Record<string, string>;
  heading?: string;
}) {
  return (
    <li className="grid grid-cols-1 gap-2 border-b py-5 sm:grid-cols-[7.5rem_1fr] sm:gap-5">
      <time dateTime={move.observedOn} className="num text-[12.5px] leading-6 text-dim">
        {fmtDate(move.observedOn)}
      </time>
      <div className="min-w-0">
        {heading ? (
          <p className="mb-2.5 text-[11px] font-medium tracking-wide text-dim uppercase">
            {heading}
          </p>
        ) : null}
        {move.entries.map((entry, index) => (
          <LedgerEntry
            key={index}
            entry={entry}
            ruleTitles={ruleTitles}
            className={index > 0 ? "mt-4" : ""}
          />
        ))}
      </div>
    </li>
  );
}

function LedgerEntry({
  entry,
  ruleTitles,
  className,
}: {
  entry: ChangeEntry;
  ruleTitles: Record<string, string>;
  className?: string;
}) {
  const slug = RULE_FOR_FIELD[entry.field];
  const ruleTitle = slug ? ruleTitles[slug] : undefined;

  return (
    <div className={className}>
      <p className="text-[0.98rem] leading-snug font-semibold">{entry.statement}</p>
      {entry.evidence ? (
        <pre className="num mt-2.5 overflow-x-auto rounded-lg border bg-bg-2 px-3 py-2 text-[0.72rem] text-muted-fg">
          {entry.evidence}
        </pre>
      ) : null}
      {slug && ruleTitle ? (
        <p className="mt-2.5 text-[0.84rem] text-dim">
          From{" "}
          <Link
            href={`/rules/${slug}`}
            className="text-fg underline decoration-1 underline-offset-3 hover:text-accent"
          >
            {ruleTitle}
          </Link>
        </p>
      ) : null}
    </div>
  );
}

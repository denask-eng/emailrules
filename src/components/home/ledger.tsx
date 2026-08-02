import Link from "next/link";
import { Panel } from "@/components/bits";
import { fmtDate } from "@/lib/format";
import { changeKind, whyItMatters, type ChangeKind } from "@/lib/rule-signals";
import { displayPlain, displayTldr, displayWhy } from "@/content/plain-overrides";
import type { Rule } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The ledger is the most valuable content on the site and it used to be the
 * least scannable: seven entries × three labelled paragraphs, rendered inline.
 * One line each now, with the paragraphs behind a <details>, so the whole of
 * what moved fits on one screen and the reading is opt-in.
 */

type Entry = { rule: Rule; date: string; note: string };

/* The same words /changed shows a human, because a visitor meets both.
   The lib-level CHANGE_KIND_LABEL is taxonomy; this is what people read. */
const KIND: Record<ChangeKind, { label: string; tone: string }> = {
  market: { label: "Something changed", tone: "text-live" },
  correction: { label: "We fixed our page", tone: "text-soon" },
  added: { label: "New page", tone: "text-muted-fg" },
  reverify: { label: "Re-checked", tone: "text-dim" },
  other: { label: "Note", tone: "text-muted-fg" },
};

function firstSentence(text: string, max = 150): string {
  const t = text.trim();
  const first = t.split(/(?<=[.!?])\s+/)[0] ?? t;
  return first.length <= max ? first : `${first.slice(0, max - 1).trimEnd()}…`;
}

function LedgerRow({ rule, date, note }: Entry) {
  const kind = KIND[changeKind(note)];
  const soWhat = firstSentence(
    displayWhy(rule.slug, whyItMatters({ ...rule, plain: displayPlain(rule.slug, rule.plain) })),
  );

  return (
    <details name="home-ledger" className="faq-item group border-b border-border-soft last:border-b-0">
      <summary className="flex cursor-pointer list-none flex-wrap items-baseline gap-x-3 gap-y-0.5 px-4 py-2.5 outline-none marker:content-none hover:bg-muted/50 focus-visible:bg-muted/60 sm:flex-nowrap sm:px-5 [&::-webkit-details-marker]:hidden">
        <time dateTime={date} className="num w-[5.25rem] shrink-0 text-[12px] text-dim">
          {fmtDate(date)}
        </time>
        <span className={cn("w-[8.75rem] shrink-0 text-[11.5px] font-medium", kind.tone)}>
          {kind.label}
        </span>
        <span
          title={rule.title}
          className="order-4 w-full min-w-0 text-[14px] leading-snug font-medium tracking-tight text-fg sm:order-3 sm:w-auto sm:flex-1 sm:truncate"
        >
          {rule.title}
        </span>
        <span
          aria-hidden
          className="num order-3 ml-auto shrink-0 text-[13px] text-dim transition-transform duration-300 ease-out group-open:rotate-45 sm:order-4"
        >
          +
        </span>
      </summary>
      <div className="faq-body">
        {/* The clipped element must carry no padding of its own — padding survives a
            zero-height grid row and would leave every closed line 16px too tall. */}
        <div>
          <div className="px-4 pb-4 sm:px-5 sm:pl-[7.25rem]">
            <p className="max-w-[62ch] text-[13.5px] leading-relaxed text-muted-fg">
              <span className="font-medium text-fg/75">What changed: </span>
              {note}
            </p>
            <p className="mt-2 max-w-[62ch] text-[13.5px] leading-relaxed text-muted-fg">
              <span className="font-medium text-fg/75">Why it matters: </span>
              {soWhat}
            </p>
            <p className="mt-2 max-w-[62ch] text-[13px] leading-relaxed text-dim">
              <span className="font-medium text-muted-fg">Do next: </span>
              {firstSentence(rule.mondayMorning)}
            </p>
            <Link
              href={`/rules/${rule.slug}`}
              className="mt-3 inline-block text-[13px] font-medium text-accent underline-offset-3 hover:underline"
            >
              Full rule, with sources →
            </Link>
          </div>
        </div>
      </div>
    </details>
  );
}

/** Quiet weeks stay honest: no filler entries, just what still needs a person. */
function QuietWeek({ sticky, lastReview }: { sticky: Rule[]; lastReview: string }) {
  return (
    <div className="px-4 py-6 sm:px-5">
      <p className="text-[14.5px] font-semibold tracking-tight">Nothing material moved</p>
      <p className="mt-1.5 max-w-[62ch] text-[13.5px] leading-relaxed text-muted-fg">
        Quiet is good, and we will not invent an entry to fill the week. Shelf last verified{" "}
        <b className="num font-medium text-fg">{fmtDate(lastReview)}</b>. While the market is
        still, these still need a person on most desks:
      </p>
      <ul className="mt-4 list-none border-t border-border-soft p-0">
        {sticky.map((r, i) => (
          <li key={r.slug} className="flex gap-3 border-b border-border-soft py-3 last:border-b-0">
            <span className="num pt-[3px] text-[11px] text-dim">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0">
              <Link
                href={`/rules/${r.slug}`}
                className="text-[14px] font-semibold tracking-tight underline-offset-[5px] hover:underline"
              >
                {r.title}
              </Link>
              <p className="mt-1 max-w-[62ch] text-[13px] leading-relaxed text-muted-fg">
                {displayTldr(r.slug, r.plain)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Ledger({
  entries,
  sticky,
  lastReview,
}: {
  entries: Entry[];
  sticky: Rule[];
  lastReview: string;
}) {
  return (
    <Panel>
      <div className="flex items-center justify-between gap-4 border-b bg-muted/40 px-4 py-2.5 sm:px-5">
        <span className="label">Market moves · not site edits</span>
        <Link href="/changed" className="label hover:text-fg" style={{ letterSpacing: "0.08em" }}>
          Full ledger →
        </Link>
      </div>
      {entries.length === 0 ? (
        <QuietWeek sticky={sticky} lastReview={lastReview} />
      ) : (
        entries.map((c) => (
          <LedgerRow key={`${c.rule.slug}-${c.date}-${c.note}`} {...c} />
        ))
      )}
    </Panel>
  );
}

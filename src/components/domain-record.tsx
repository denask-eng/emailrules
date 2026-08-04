import type { DomainFacts } from "@/lib/dns-check";
import { cn } from "@/lib/utils";

/**
 * What is actually published, shown as what it actually is.
 *
 * The findings list answers "what should I do". It is prose, it is sorted by
 * alarm, and it takes eight paragraphs to tell you the one thing everybody
 * arrives wanting: what does my domain currently say. That question has an
 * exact answer, it is six lines long, and until now the reader had to
 * reconstruct it from grey evidence boxes scattered down the page.
 *
 * So it gets the site's own strongest surface. /how-email-works renders the
 * machines' output as a dark transmission log, because a log is what it is;
 * a DNS record is the same kind of object — a literal string a machine
 * published, which we quote and do not paraphrase. Reading it here should
 * feel like reading the zone file, because that is exactly what it is.
 *
 * No score, no grade, no ring chart. The record is the design.
 */

export const TONE = {
  ok: "text-[#7ee0a8]",
  warn: "text-[#f0c26a]",
  bad: "text-[#ff9d94]",
  dim: "text-white/38",
} as const;

export type Tone = keyof typeof TONE;

export interface Row {
  key: string;
  value: string;
  tone: Tone;
  /** The short human read, in the right-hand column. */
  note?: string;
}

export function rows(facts: DomainFacts, blocklist: { asked: number; entries: number }): Row[] {
  const out: Row[] = [];

  out.push(
    facts.spf
      ? {
          key: "SPF",
          value: facts.spf,
          tone: facts.spfAll === "+all" ? "bad" : "ok",
          note:
            facts.spfAll === "+all"
              ? "authorises everyone"
              : facts.spfLookups > 10
                ? `${facts.spfLookups} lookups, over the limit`
                : (facts.spfAll ?? "no all mechanism"),
        }
      : { key: "SPF", value: "no record published", tone: "bad", note: "missing" },
  );

  out.push(
    facts.dmarc
      ? {
          key: "DMARC",
          value: facts.dmarc,
          tone: facts.dmarcPolicy === "none" ? "warn" : "ok",
          note: facts.dmarcHasRua ? `p=${facts.dmarcPolicy}` : `p=${facts.dmarcPolicy}, no rua`,
        }
      : { key: "DMARC", value: "no record published", tone: "bad", note: "missing" },
  );

  out.push(
    facts.dkimWildcard
      ? {
          key: "DKIM",
          value: "a wildcard answers every selector, so none of them can be trusted",
          tone: "warn",
          note: "unreadable",
        }
      : facts.dkim.length
        ? {
            key: "DKIM",
            value: facts.dkim.join("  "),
            tone: "ok",
            note: `${facts.dkim.length} selector${facts.dkim.length > 1 ? "s" : ""}`,
          }
        : {
            key: "DKIM",
            value: "none on the selectors we know to try",
            tone: "dim",
            note: "inconclusive",
          },
  );

  out.push(
    facts.bimi
      ? { key: "BIMI", value: facts.bimi, tone: "ok", note: "published" }
      : { key: "BIMI", value: "not published", tone: "dim", note: "optional" },
  );

  out.push(
    facts.mx.length
      ? {
          key: "MX",
          value: facts.mx.join("  "),
          tone: "dim",
          note: facts.mxProvider ?? "receiving",
        }
      : { key: "MX", value: "none published", tone: "dim", note: "receives no mail" },
  );

  out.push({
    key: "LISTS",
    value: blocklist.entries
      ? `${blocklist.entries} of ${blocklist.asked} blocklists hold an entry`
      : `none of ${blocklist.asked} blocklists hold an entry`,
    tone: blocklist.entries ? "warn" : "ok",
    note: `${blocklist.asked} asked`,
  });

  return out;
}

export function DomainRecord({
  domain,
  checkedAt,
  facts,
  blocklist,
}: {
  domain: string;
  checkedAt: string;
  facts: DomainFacts;
  blocklist: { asked: number; entries: number };
}) {
  return (
    <figure className="m-0 overflow-hidden rounded-xl bg-[#141417] shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]">
      <figcaption className="num flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-white/8 px-4 py-3 text-[11px] tracking-[0.11em] text-white/38 uppercase sm:px-6">
        <span>Published right now · {domain}</span>
        <span>read from DNS, quoted verbatim</span>
      </figcaption>

      <dl className="m-0 divide-y divide-white/6">
        {rows(facts, blocklist).map((row) => (
          <div
            key={row.key}
            className="grid grid-cols-[3.75rem_minmax(0,1fr)] items-baseline gap-x-4 px-4 py-3 sm:grid-cols-[4.5rem_minmax(0,1fr)_7.5rem] sm:gap-x-7 sm:px-6"
          >
            <dt className="num text-[11px] font-medium tracking-[0.09em] text-white/45">
              {row.key}
            </dt>
            {/* The record itself. It scrolls rather than wraps: a real SPF
                record is longer than any column, and truncating it would leave
                somebody unable to check our work, which is the only reason it
                is here. The fade is the affordance — without it a clipped
                record reads as a complete one, and the note beside it reads as
                the end of the string. */}
            <dd
              className={cn(
                "num m-0 overflow-x-auto text-[12.5px] leading-[1.7] whitespace-nowrap",
                "[mask-image:linear-gradient(to_right,#000_calc(100%-2.5rem),transparent)]",
                "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
                TONE[row.tone],
              )}
            >
              {row.value}
            </dd>
            {row.note ? (
              <dd className="num col-start-2 m-0 text-[11px] whitespace-nowrap text-white/30 sm:col-start-3 sm:text-right">
                {row.note}
              </dd>
            ) : null}
          </div>
        ))}
      </dl>

      <p className="num border-t border-white/8 px-4 py-2.5 text-[11px] text-white/25 sm:px-6">
        {checkedAt} · no score, no grade, nothing inferred
      </p>
    </figure>
  );
}

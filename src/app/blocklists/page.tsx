import type { Metadata } from "next";
import Link from "next/link";
import { census, type CensusRow } from "@/lib/blocklist-check";
import { ProofBar } from "@/components/proof-bar";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * A census, not an opinion.
 *
 * Every checker in this category advertises a number of blocklists and prints
 * a green tick beside each one it did not find you on. The number is the sales
 * pitch and the ticks are the reassurance, and neither survives contact with
 * the question this page asks: did that zone actually answer.
 *
 * RFC 5782 §5 makes the question answerable without anyone's cooperation. An
 * address blocklist must contain 127.0.0.2 and must not contain 127.0.0.1. A
 * zone that fails to publish the entry it is required to publish is not
 * telling you that you are clean; it is not telling you anything, and NXDOMAIN
 * from a dead zone looks exactly like NXDOMAIN from a healthy one.
 *
 * So both halves get probed on every render: the lists we query, and the ones
 * we refuse. Publishing the refusals is the only thing that makes the roster
 * mean anything, and probing them live is the only thing that keeps the
 * refusals honest — a zone that comes back is reported as answering while it
 * still sits in the refused column, which is our signal to go and re-decide.
 *
 * No competitor is named anywhere on this page. The zones are public and the
 * method is a published standard; anyone can run it and get the same answer,
 * which is the entire point of writing it down.
 */

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Which blocklists are actually answering",
  description:
    "A live census of the DNS blocklists the email industry checks. Every zone is asked the entry RFC 5782 requires it to publish, so a dead list is reported as unanswered rather than counted as a pass. Re-probed hourly, no competitor named.",
  alternates: { canonical: "/blocklists" },
};

function Row({ row }: { row: CensusRow }) {
  const answering = row.status === "answered";
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-5 gap-y-1 border-b border-border-soft py-3.5">
      <div className="min-w-0">
        <p className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
          <span className="text-[15px] font-medium">{row.label}</span>
          <span className="num text-[11.5px] text-dim">{row.zone}</span>
        </p>
        <p className="mt-1 max-w-[70ch] text-[13px] leading-relaxed text-muted-fg">{row.note}</p>
      </div>
      <span
        className={cn(
          "num text-[11px] font-medium tracking-[0.06em] whitespace-nowrap uppercase",
          answering ? "text-ok" : row.status === "refused" ? "text-soon" : "text-live",
        )}
      >
        {answering ? "answering" : row.status === "refused" ? "refuses" : "silent"}
      </span>
    </li>
  );
}

export default async function Blocklists() {
  const rows = await census();
  const today = new Date().toISOString().slice(0, 10);

  const queried = rows.filter((r) => r.queried);
  const refused = rows.filter((r) => !r.queried);
  const silent = rows.filter((r) => r.status === "silent");
  const declining = rows.filter((r) => r.status === "refused");

  /* A zone we refuse that is answering perfectly well is a decision to revisit,
     and the page says so rather than leaving it for a reader to notice. */
  const reconsider = refused.filter((r) => r.status === "answered");

  return (
    <div className="shell py-12 sm:py-16">
      {/* A live measurement of somebody else's infrastructure, on the surface
          this site uses for live measurements. This page is the strongest thing
          here and it was set as an article: a headline, four paragraphs, and
          the finding somewhere in the middle. The finding goes first now, at
          the size of a finding. */}
      <figure className="m-0 overflow-hidden rounded-2xl bg-[#141417] shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]">
        <div className="num flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-b border-white/8 px-5 py-3.5 text-[11px] tracking-[0.11em] text-white/38 uppercase sm:px-7">
          <span className="flex items-center gap-2.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="listening absolute inset-0 rounded-full" aria-hidden />
              <span className="h-1.5 w-1.5 rounded-full bg-[#7ee0a8]" />
            </span>
            Live · re-probed hourly
          </span>
          <span>{fmtDate(today)}</span>
        </div>

        <div className="px-5 pt-9 pb-8 sm:px-7 sm:pt-11">
          <p className="num text-[clamp(3.4rem,13vw,6.5rem)] leading-[0.85] font-semibold tracking-[-0.05em] text-[#ff9d94]">
            {Math.round((silent.length / rows.length) * 100)}%
          </p>
          <p className="mt-5 max-w-[24ch] text-[clamp(1.25rem,3.6vw,1.9rem)] leading-[1.1] font-semibold tracking-[-0.03em] text-white text-balance">
            of the blocklists this industry checks publish no test entry.
          </p>
          <p className="mt-5 max-w-[54ch] text-[0.95rem] leading-relaxed text-white/55">
            {silent.length} of {rows.length} zones answer nothing at all. A dead zone returns
            NXDOMAIN, and so does a healthy one saying you are clean, so every checker that asks
            those {silent.length} is printing a green tick for silence.
          </p>
          <p className="num mt-7 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] tracking-[0.08em] text-white/30 uppercase">
            <span>{rows.length} zones probed</span>
            <span aria-hidden>·</span>
            <span>RFC 5782 control entry</span>
            <span aria-hidden>·</span>
            <span>two independent resolvers</span>
            <span aria-hidden>·</span>
            <span>no competitor named</span>
          </p>
        </div>
      </figure>

      <p className="mt-9 max-w-[64ch] text-[1.04rem] leading-relaxed text-muted-fg">
        A checker can advertise sixty lists and quietly ask a dozen zones that answer nothing, and
        every one of those silences arrives as a green tick. This is the same question put to every
        zone at the same moment, using the entry each one is required by{" "}
        <a
          href="https://www.rfc-editor.org/rfc/rfc5782#section-5"
          rel="nofollow noopener"
          className="text-fg underline decoration-1 underline-offset-3 hover:text-accent"
        >
          RFC 5782
        </a>{" "}
        to publish.
      </p>

      {/* Three numbers in a row made the reader do the division. As one bar the
          proportion is the argument: a fifth of what this industry checks
          answers nothing at all, and you can see that it is a fifth. */}
      <ProofBar
        className="mt-10"
        segments={[
          {
            key: "answered",
            label: "answering today",
            tone: "ok",
            value: rows.filter((r) => r.status === "answered").length,
          },
          {
            key: "refused",
            label: "refusing automated queriers",
            tone: "warn",
            value: declining.length,
          },
          {
            key: "silent",
            label: "publish no test entry",
            tone: "bad",
            value: silent.length,
            note: "Nothing to say about anyone. Counted as a pass by every checker that asks them.",
          },
        ]}
      />

      <p className="mt-6 max-w-[64ch] text-[14.5px] leading-relaxed text-muted-fg">
        A zone that publishes no test entry is not reporting you clean. It is not reporting
        anything, and NXDOMAIN from an abandoned zone is indistinguishable from NXDOMAIN from a
        healthy one. That is why{" "}
        <Link href="/check" className="text-fg underline decoration-1 underline-offset-3">
          our own check
        </Link>{" "}
        asks fewer lists than it could and names every one it could not reach.
      </p>

      <section className="mt-14">
        <h2 className="text-[1.35rem] tracking-tight">
          The {queried.length} we query
        </h2>
        <p className="mt-2 max-w-[64ch] text-[14px] leading-relaxed text-muted-fg">
          Each one answered an entry it must publish, and one it must not, before we believed
          anything it said about anybody.
        </p>
        <ul className="mt-6 list-none border-t p-0">
          {queried.map((r) => (
            <Row key={r.zone} row={r} />
          ))}
        </ul>
      </section>

      <section className="mt-14">
        <h2 className="text-[1.35rem] tracking-tight">The {refused.length} we do not</h2>
        <p className="mt-2 max-w-[64ch] text-[14px] leading-relaxed text-muted-fg">
          The list we refuse to query is the only evidence that the list we query means something.
          Every reason here is a fact about the zone or about its own published terms.
        </p>
        <ul className="mt-6 list-none border-t p-0">
          {refused.map((r) => (
            <Row key={r.zone} row={r} />
          ))}
        </ul>
      </section>

      {reconsider.length ? (
        <section className="mt-12 rounded-xl border border-soon/40 bg-soon-bg p-5">
          <p className="text-[14.5px] leading-relaxed">
            <b>{reconsider.length} zone{reconsider.length > 1 ? "s" : ""} we do not query answered
            today.</b>{" "}
            That is a decision to revisit rather than a result to hide:{" "}
            <span className="num">{reconsider.map((r) => r.zone).join(", ")}</span>. Some are
            excluded on their own terms of use rather than on whether they reply.
          </p>
        </section>
      ) : null}

      <section className="mt-14 border-t pt-10">
        <h2 className="text-[1.2rem] tracking-tight">Run it yourself</h2>
        <p className="mt-3 max-w-[64ch] text-[14.5px] leading-relaxed text-muted-fg">
          Nothing here needs our word for it. Ask any zone for the entry the standard requires, from
          two resolvers you do not control:
        </p>
        <pre className="num mt-4 overflow-x-auto rounded-xl bg-[#141417] px-4 py-4 text-[12.5px] leading-relaxed text-white/70 sm:px-6">
          {`dig +short @8.8.8.8 2.0.0.127.bl.spamcop.net    # → 127.0.0.2   answering
dig +short @1.1.1.1 2.0.0.127.bl.spamcop.net    # → 127.0.0.2   agrees

dig +short @8.8.8.8 2.0.0.127.ubl.unsubscore.com   # → nothing
dig +short @1.1.1.1 2.0.0.127.ubl.unsubscore.com   # → nothing`}
        </pre>
        <p className="mt-4 max-w-[64ch] text-[13.5px] leading-relaxed text-dim">
          A reply of 127.0.0.2 is the list confirming it is alive. Nothing back, from both, is a
          zone that cannot tell you anything about anyone.{" "}
          <Link href="/methodology" className="underline underline-offset-3 hover:text-fg">
            How we choose them
          </Link>
          .
        </p>
      </section>
    </div>
  );
}

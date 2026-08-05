import Link from "next/link";
import { latestAggregate } from "@/lib/email-index";
import { fmtDate } from "@/lib/format";
import { Signal } from "@/components/signal";

/**
 * The Index, on the front door.
 *
 * Two new measured surfaces shipped and neither appeared on the homepage, so
 * from the outside nothing had changed — which is the same mistake `/agents`
 * made: a thing built to be found, findable only from the footer.
 *
 * This band is deliberately small. The hero is not moving; it works. What this
 * adds is the one sentence that separates this site from a compliance blog —
 * that it measures the industry daily rather than describing it — carrying a
 * number that was true this morning and will be different next month.
 *
 * Renders nothing at all until there is a reading. An empty band advertising a
 * measurement we have not taken would undo the point of taking it.
 */
export async function IndexBand() {
  const agg = await latestAggregate();
  if (!agg || agg.n === 0) return null;

  const enforcing = agg.dmarc.quarantine + agg.dmarc.reject;
  const pct = Math.round((enforcing / agg.n) * 100);

  return (
    <section className="mx-auto mt-12 max-w-[720px]">
      <Link
        href="/email-index"
        className="group block rounded-2xl border bg-card px-5 py-5 text-left transition-colors hover:border-accent/40 sm:px-6"
        style={{ boxShadow: "var(--lift)" }}
      >
        <p className="label flex items-center gap-1.5">
          <Signal state="pass" size={8} label={false} />
          The index · measured {fmtDate(agg.day)}
        </p>

        <p className="mt-2.5 text-[1.25rem] leading-snug font-semibold tracking-tight sm:text-[1.4rem]">
          <span className="num">{pct}%</span>&nbsp;of <span className="num">{agg.n}</span>{" "}
          well-known senders enforce DMARC.
        </p>

        <p className="mt-2 max-w-[58ch] text-[14px] leading-relaxed text-muted-fg">
          We read the authentication posture of the internet&rsquo;s better-known senders from
          public DNS every day and keep it. The roster is published in full and every percentage
          carries the number it came from, so you can check the arithmetic rather than trust it.
        </p>

        <p className="mt-3 text-[13px] font-medium text-accent group-hover:underline">
          See the whole index →
        </p>
      </Link>
    </section>
  );
}

import type { Metadata } from "next";
import { getStats, fmtDate } from "@/lib/rules";
import { SITE } from "@/lib/site";
import { SECTION, SectionHead } from "@/components/bits";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Methodology",
  description:
    "How rules get onto this site, what counts as a source, how often pages are re-verified, and what we do when we are wrong.",
  alternates: { canonical: "/methodology" },
};

export default async function Methodology() {
  const stats = await getStats();
  return (
    <div className={cn(SECTION, "max-w-[780px] py-14")}>
      <SectionHead
        eyebrow="How this works"
        title="Methodology"
        lede="A reference is only worth citing if you can see how it was made. This page is the contract."
      />

      <div className="prose-rule space-y-9">
        <section>
          <h2 className="m mb-2.5 border-b border-ink pb-2 text-[0.7rem] font-bold tracking-[0.11em] text-ink uppercase">
            What counts as a source
          </h2>
          <p className="m-0 text-[0.96rem] leading-relaxed">
            A rule ships only with a primary source that was read: the regulator&rsquo;s own
            publication, the court&rsquo;s own opinion, the mailbox provider&rsquo;s own
            documentation, the RFC, or the platform&rsquo;s own help centre. Law-firm summaries and
            trade press are useful for finding things and are never the citation. If a claim cannot
            be dated, it does not go in.
          </p>
        </section>

        <section>
          <h2 className="m mb-2.5 border-b border-ink pb-2 text-[0.7rem] font-bold tracking-[0.11em] text-ink uppercase">
            Why every page states enforcement honestly
          </h2>
          <p className="m-0 text-[0.96rem] leading-relaxed">
            An obligation existing and an obligation being enforced are different facts, and
            conflating them is how compliance content becomes fear-selling. Where nobody has been
            fined, the page says nobody has been fined. That costs us urgency and buys the thing
            worth more, which is being trusted the one time it really matters.
          </p>
        </section>

        <section>
          <h2 className="m mb-2.5 border-b border-ink pb-2 text-[0.7rem] font-bold tracking-[0.11em] text-ink uppercase">
            Re-verification
          </h2>
          <p className="m-0 text-[0.96rem] leading-relaxed">
            Every rule carries a last-verified date. Pages older than 90 days show a warning saying
            so rather than quietly pretending to be current. The last full review of the corpus was{" "}
            <span className="m text-ink">
              {fmtDate(stats.lastReview)}
            </span>
            .
          </p>
        </section>

        <section>
          <h2 className="m mb-2.5 border-b border-ink pb-2 text-[0.7rem] font-bold tracking-[0.11em] text-ink uppercase">
            Corrections
          </h2>
          <p className="m-0 text-[0.96rem] leading-relaxed">
            Send them to{" "}
            <a href={`mailto:${SITE.contact}`}>{SITE.contact}</a>. Corrections are published in the
            page history with a date and a credit to whoever caught it. If we got something wrong,
            the record of being wrong stays visible.
          </p>
        </section>

        <section>
          <h2 className="m mb-2.5 border-b border-ink pb-2 text-[0.7rem] font-bold tracking-[0.11em] text-ink uppercase">
            Conflicts of interest
          </h2>
          <p className="m-0 text-[0.96rem] leading-relaxed">
            We sell no tracking pixels, no seed-list testing, no inbox-placement scores and no ESP.
            We do sell continuous monitoring against these rules, which is disclosed on every page
            that mentions it. That is the only commercial relationship this site has, and it is why
            it can tell you when a tracking pixel is a liability.
          </p>
        </section>

        <section>
          <h2 className="m mb-2.5 border-b border-ink pb-2 text-[0.7rem] font-bold tracking-[0.11em] text-ink uppercase">
            Not legal advice
          </h2>
          <p className="m-0 text-[0.96rem] leading-relaxed">
            This is a reference for practitioners, written by practitioners. It is not legal advice
            and no lawyer reviewed it. Confirm anything load-bearing with your own counsel before
            you rely on it.
          </p>
        </section>
      </div>
    </div>
  );
}

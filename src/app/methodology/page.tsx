import type { Metadata } from "next";
import Link from "next/link";
import { getStats, fmtDate } from "@/lib/rules";
import { SITE } from "@/lib/site";
import { SectionHead } from "@/components/bits";

export const metadata: Metadata = {
  title: "Methodology",
  description:
    "How rules get onto this site, what counts as a source, how often pages are re-verified, and what we do when we are wrong.",
  alternates: { canonical: "/methodology" },
};

export default async function Methodology() {
  const stats = await getStats();
  return (
    <div className={"shell shell-tight py-12 sm:py-16"}>
      <SectionHead
        as="h1"
        label="How this works"
        title="Methodology"
        lede="A reference is only worth citing if you can see how it was made. This page is the contract."
      />

      <div className="prose-rule space-y-9">
        <section>
          <h2 className="num mb-2.5 border-b border-fg pb-2 text-[0.7rem] font-bold tracking-[0.11em] text-fg uppercase">
            Who stands behind this
          </h2>
          <p className="m-0 text-[0.96rem] leading-relaxed">
            A named human owns the shelf: claims are checked, dated, and corrected in public. Tools
            may help with typing or research grunt work. They do not invent citations, enforcement
            theatre, or fake scores. If a page cannot be traced to a primary source a person read,
            it does not ship. That is the opposite of LLM content farms — and the opposite of vendor
            blogs that cannot afford to say their product is the problem.
          </p>
        </section>

        <section>
          <h2 className="num mb-2.5 border-b border-fg pb-2 text-[0.7rem] font-bold tracking-[0.11em] text-fg uppercase">
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
          <h2 className="num mb-2.5 border-b border-fg pb-2 text-[0.7rem] font-bold tracking-[0.11em] text-fg uppercase">
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
          <h2 className="num mb-2.5 border-b border-fg pb-2 text-[0.7rem] font-bold tracking-[0.11em] text-fg uppercase">
            Re-verification
          </h2>
          <p className="m-0 text-[0.96rem] leading-relaxed">
            Every rule carries a last-verified date. Pages older than 90 days show a warning saying
            so rather than quietly pretending to be current. The last full review of the corpus was{" "}
            <span className="num text-fg">
              {fmtDate(stats.lastReview)}
            </span>
            .
          </p>
        </section>

        <section>
          <h2 className="num mb-2.5 border-b border-fg pb-2 text-[0.7rem] font-bold tracking-[0.11em] text-fg uppercase">
            Corrections
          </h2>
          <p className="m-0 text-[0.96rem] leading-relaxed">
            Send them to{" "}
            <a href={`mailto:${SITE.contact}`}>{SITE.contact}</a>. Corrections are published in the
            page history with a date and a credit to whoever caught it. If we got something wrong,
            the record of being wrong stays visible. Published corrections are collected at{" "}
            <Link href="/corrections">/corrections</Link>.
          </p>
        </section>

        {/* Same principle as /esp: the list we refuse to publish is the only
            evidence that the list we publish means anything. */}
        <section>
          <h2 className="num mb-2.5 border-b border-fg pb-2 text-[0.7rem] font-bold tracking-[0.11em] text-fg uppercase">
            Which blocklists we ask, and which we do not
          </h2>
          <p className="m-0 text-[0.96rem] leading-relaxed">
            We ask <b>SpamCop</b>, <b>PSBL</b>, <b>Mailspike</b> and <b>Spam Eating Monkey</b> about
            addresses, and <b>URIBL</b> about domains. Every one of them answers an entry it is
            required to publish, and one it is required not to, before we believe anything it says
            about you. RFC 5782 makes that possible: an address blocklist must list 127.0.0.2 and
            must not list 127.0.0.1. A list failing either control is reported as unanswered, never
            as clean, because a blocklist that declines to reply looks exactly like one giving you
            the all-clear.
          </p>
          <p className="mt-3 mb-0 text-[0.96rem] leading-relaxed">
            Two are missing on purpose. <b>Spamhaus</b> is the one that matters most and the one we
            cannot ask: its free zones refuse queries from public resolvers, and this site runs on
            one. Measured on 3 August 2026, its ZEN zone answered an error code through one public
            resolver and a plain &ldquo;not listed&rdquo; through another — for a name that is
            definitely listed. Reading that second answer as clean is how a tool tells you your
            domain is fine when it never managed to ask. It switches on if we hold a Data Query
            Service key, and not before. <b>Barracuda</b> requires registering the addresses that
            will query it, and serverless functions have no fixed address to register, so using it
            here would mean using it outside its terms.
          </p>
          <p className="mt-3 mb-0 text-[0.96rem] leading-relaxed">
            Five lists is fewer than the hundred a checker can advertise. Most of that hundred is
            dead, private, or will refuse an automated querier and be counted as a pass. We would
            rather name five that answered today.
          </p>
        </section>

        <section>
          <h2 className="num mb-2.5 border-b border-fg pb-2 text-[0.7rem] font-bold tracking-[0.11em] text-fg uppercase">
            Conflicts of interest
          </h2>
          <p className="m-0 text-[0.96rem] leading-relaxed">
            We sell no tracking pixels, no seed-list testing, no inbox-placement scores and no ESP.
            We intend to sell continuous monitoring against these rules, and it is disclosed on
            every page that mentions it. It is not built yet, so today this site sells nothing at
            all. That is why it can afford to tell you when a tracking pixel is a liability.
          </p>
        </section>

        <section>
          <h2 className="num mb-2.5 border-b border-fg pb-2 text-[0.7rem] font-bold tracking-[0.11em] text-fg uppercase">
            Not legal advice
          </h2>
          <p className="m-0 text-[0.96rem] leading-relaxed">
            This is a reference for people who ship email, written by an email geek. It is not legal advice
            and no lawyer reviewed it. Confirm anything that matters with your own counsel before
            you rely on it.
          </p>
        </section>
      </div>
    </div>
  );
}

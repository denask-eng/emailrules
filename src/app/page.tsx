import Link from "next/link";
import { SubscribeForm } from "@/components/subscribe-form";
import { getAllRules, getChangelog, getStats, countsByTopic, fmtDate } from "@/lib/rules";
import { TOPICS } from "@/lib/types";
import type { Topic } from "@/lib/types";
import { TrustStrip } from "@/components/trust-strip";
import { Figures, SectionHead, StatusDot } from "@/components/bits";
import { SiteFaqJsonLd } from "@/components/site-faq";
import { isMarketChange, stickyRisks } from "@/lib/rule-signals";
import { AnswerHere } from "@/components/home/answer-here";
import { AskBox, Surfaces } from "@/components/ask-box";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Ledger } from "@/components/home/ledger";
import { buildFiveSets } from "@/components/home/five";

export default async function Home() {
  const [changelogAll, stats, counts, allRules] = await Promise.all([
    getChangelog(40),
    getStats(),
    countsByTopic(),
    getAllRules(),
  ]);

  /* Homepage only shows real market moves — not "we documented a page". */
  const marketLedger = changelogAll.filter((c) => isMarketChange(c.note)).slice(0, 7);
  const sticky = stickyRisks(allRules, 3);

  const yours = stats.total - stats.notYours;

  /* Every answer the role chips can give, resolved on the server, so a tap is a
     re-render of data that already shipped rather than a page load. */
  const fiveSets = buildFiveSets(allRules);

  /* A topic with no rules takes a click and lands on nothing. */
  const topics = (Object.keys(TOPICS) as Topic[])
    .filter((t) => (counts[t] ?? 0) > 0)
    .sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0));

  return (
    <>
      <SiteFaqJsonLd />

      {/* Masthead. Centred on the page axis; the door cards and the button pair
          are gone because the chips below now do that job. */}
      <section className="shell pt-12 pb-12 text-center sm:pt-20 sm:pb-16">
        <Link
          href="/rules"
          className="inline-flex items-center gap-2.5 rounded-full border bg-card py-1.5 pr-4 pl-2.5 text-[13px] hover:bg-muted"
          style={{ boxShadow: "var(--lift)" }}
        >
          <StatusDot status="in_force" />
          <span className="num font-medium">{stats.total}</span>
          <span className="text-muted-fg">curated rules · yours in under a minute</span>
          <span className="text-dim">→</span>
        </Link>

        <h1 className="mx-auto mt-7 max-w-4xl text-[clamp(2.35rem,6.8vw,4.2rem)]">
          What&rsquo;s true about email.
          <br className="hidden sm:block" /> Right{" "}
          <span className="font-serif font-normal text-accent italic">now.</span>
        </h1>

        {/* Opens on the reader, not on the shelf. The old line ended on how many
            rules are not yours; ending on how few actually need a person says the
            same thing and is the surprising half. */}
        {/* This line has one job: say what you get back. It previously opened
            on a joke about folklore PDFs and closed on "pick your desk", which
            is vocabulary we invented — a first-time reader could not tell from
            it whether this was a blog, a newsletter or a tool. Input, output,
            and the one thing nobody else does, in that order. */}
        <p className="mx-auto mt-5 max-w-[36rem] text-[1.06rem] leading-relaxed text-balance text-muted-fg sm:text-[1.15rem]">
          Send one real campaign. You get what is broken,{" "}
          <b className="font-medium text-fg">whose job it is to fix it</b>, and the dated rule that
          says so.
        </p>

        {/* The message, promoted over the domain.
            The box was the front door and it invited "yourbrand.com", which is
            the weakest thing this site can answer: a DNS report is what every
            checker in the category already gives you, and the /check page has
            always admitted as much in its own copy. A real campaign carries
            the address that actually sent it, the consent evidence and the
            content — none of which is in DNS. The strong door goes first. */}
        <div className="mx-auto mt-9 flex max-w-[640px] flex-col items-center">
          <Link
            href="/check/message"
            className={cn(
              buttonVariants({ size: "lg" }),
              "h-12 w-full rounded-xl px-7 text-[1rem] font-semibold sm:w-auto",
            )}
            style={{ boxShadow: "var(--lift)" }}
          >
            Send us your campaign →
          </Link>
          <p className="mt-3.5 max-w-[42ch] text-[0.9rem] leading-relaxed text-balance text-muted-fg">
            DNS shows what you published. A message shows what you actually send, and it is the
            only one of the two that can be wrong in a way that costs you money.
          </p>
        </div>

        {/* Still here, still works, no longer pretending to be the answer. */}
        <details className="group mx-auto mt-8 max-w-[640px]">
          <summary className="min-h-11 cursor-pointer list-none text-[0.9rem] text-muted-fg underline decoration-input underline-offset-4 marker:content-none hover:text-fg [&::-webkit-details-marker]:hidden">
            Or check a domain, an address or an IP
          </summary>
          <AskBox className="mt-4" />
        </details>

        {/* What the tool actually returns, shown rather than described.
            A landing page for an instrument should print a reading off it —
            this is a real finding from a real domain, in the same surface the
            result page uses, so nothing here is a mockup of a thing that does
            not exist. */}
        <figure className="mx-auto mt-14 max-w-[720px] overflow-hidden rounded-2xl bg-[#141417] text-left shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]">
          <div className="num flex items-center justify-between border-b border-white/8 px-5 py-3 text-[10.5px] tracking-[0.11em] text-white/38 uppercase sm:px-6">
            <span className="flex items-center gap-2.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="listening absolute inset-0 rounded-full" aria-hidden />
                <span className="h-1.5 w-1.5 rounded-full bg-[#7ee0a8]" />
              </span>
              What comes back
            </span>
            <span>a real reading</span>
          </div>
          <div className="px-5 py-6 sm:px-6">
            <p className="num text-[11px] tracking-[0.09em] text-white/30 uppercase">
              Signs your mail
            </p>
            <p className="text-[1.15rem] leading-tight font-semibold text-[#ff9d94]">Klaviyo</p>
            <p className="num mt-1 text-[0.72rem] text-white/30">
              kl._domainkey kl2._domainkey
            </p>

            <div className="my-3 flex items-center gap-3">
              <span className="h-6 w-px bg-[#ff9d94]/50" aria-hidden />
              <span className="num text-[10.5px] tracking-[0.08em] text-[#ff9d94] uppercase">
                ✗ these disagree
              </span>
            </div>

            <p className="num text-[11px] tracking-[0.09em] text-white/30 uppercase">
              SPF authorises
            </p>
            <p className="text-[1.15rem] leading-tight font-semibold text-[#f0c26a]">Zendesk</p>
            <p className="num mt-1 text-[0.72rem] text-white/30">include:mail.zendesk.com</p>

            <p className="mt-5 max-w-[52ch] text-[0.9rem] leading-relaxed text-white/60">
              Klaviyo signs mail as this domain and its SPF has never listed Klaviyo. Those
              campaigns fail SPF and pass DMARC on DKIM alignment alone. No other checker reads
              the two records against each other.
            </p>
          </div>
        </figure>

        <TrustStrip className="mt-10" />

        <div className="mt-9">
          <Figures
            items={[
              { v: String(stats.total), k: "rules" },
              { v: String(stats.inForce), k: "in force" },
              { v: String(yours), k: "yours outright" },
              { v: fmtDate(stats.lastReview), k: "last verified" },
            ]}
          />
        </div>
      </section>

      {/* Three destinations that were footer-only until now. */}
      <div className="shell">
        <Surfaces />
      </div>

      {/* The answer, in place. Nothing between the question and the five. */}
      <AnswerHere sets={fiveSets} />

      <section className="shell border-t border-fg/12 py-10 sm:py-12">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-x-8 gap-y-2">
          <div>
            <p className="label">What moved</p>
            <h2 className="mt-2.5 text-[1.35rem] tracking-tight sm:text-[1.5rem]">
              Seven lines, then get back to work
            </h2>
          </div>
          <p className="max-w-[44ch] text-[13.5px] leading-relaxed text-muted-fg">
            Regulators, mailbox providers, and our own corrections. Re-verifies and &ldquo;we wrote
            a page&rdquo; never make this list, so a quiet week looks quiet.
          </p>
        </div>

        <Ledger entries={marketLedger} sticky={sticky} lastReview={stats.lastReview} />
      </section>

      {/*
        Value after proof (the ledger), before the catalog. No Reveal on the rows:
        `.reveal` is opacity:0 until an observer fires, so with JS off the whole
        band would read as empty. The entrance is not worth an invisible page.
      */}
      <section id="why" className="border-t bg-bg-2 py-16 sm:py-20">
        <div className="shell">
          <div className="mx-auto max-w-2xl text-center">
            <p className="label">Why care</p>
            <h2 className="mt-4 text-[clamp(1.75rem,4.2vw,2.65rem)] tracking-tight text-balance">
              Why should you care?
            </h2>
            <p className="mx-auto mt-4 max-w-[36rem] text-[1.05rem] leading-relaxed text-muted-fg sm:text-[1.1rem]">
              You are busy. This is not another compliance library. The whole product is three
              answers you cannot get from your ESP blog or a seed-score shop.
            </p>
          </div>

          <ol className="mx-auto mt-12 max-w-2xl list-none border-t border-fg/12 p-0">
            {[
              {
                t: "Whose job is this, really?",
                d: `Of ${stats.total} rules on the shelf, ${yours} are yours outright, ${stats.shared} are part platform and part you, ${stats.nothingToDo} are context you can only be aware of, and exactly ${stats.fullyHandled} is finished for you by any mainstream tool. That last number is small, and pretending otherwise would be the same overstatement everyone else in this category makes. What it buys you is knowing which half of a shared rule is actually on your desk.`,
              },
              {
                t: "What actually moved?",
                d: "Gmail bulk rules, CASL clocks, ePrivacy, DMARC ladders. You usually hear months late, from legal. The ledger above is market moves only. Re-checks and “we wrote a page” never leave the building. Optional alerts match the setup you pick on Rules.",
              },
              {
                t: "What do I do Monday?",
                d: "Every rule has a primary source, a verification date, and a first step you can run this week. No placement score theatre. No fake encyclopedia. A small shelf you can paste into Slack or defend in a meeting.",
              },
            ].map((row, i) => (
              <li key={row.t} className="border-b border-border-soft">
                <div className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-x-4 py-7 sm:gap-x-6 sm:py-8">
                  <span className="num pt-1 text-[12px] font-medium tracking-[0.12em] text-accent">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-[1.15rem] font-semibold tracking-tight sm:text-[1.25rem]">
                      {row.t}
                    </h3>
                    <p className="mt-2.5 max-w-[52ch] text-[15px] leading-relaxed text-muted-fg sm:text-[15.5px]">
                      {row.d}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ol>

          <div className="mx-auto mt-10 max-w-2xl text-center">
            <p className="text-[14.5px] leading-relaxed text-dim">
              If that is not useful this week, leave. Quiet is allowed here.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[14px]">
              <Link
                href="/rules"
                className="font-medium text-accent underline-offset-3 hover:underline"
              >
                Show me what applies to me →
              </Link>
              <Link
                href="/changed"
                className="text-muted-fg underline-offset-3 hover:text-fg hover:underline"
              >
                See what moved
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* The topic index earns its place as links, not as a second menu. */}
      <section id="browse" className="shell border-t py-9">
        <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
          <h2 className="text-[1.05rem] tracking-tight">Or browse by the job you are doing</h2>
          <Link
            href="/coverage"
            className="text-[13px] text-muted-fg underline-offset-3 hover:text-fg hover:underline"
          >
            What we skip on purpose →
          </Link>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {topics.map((t) => (
            <Link
              key={t}
              href={`/topics/${t}`}
              className="rounded-full border bg-card px-3.5 py-1.5 text-[13.5px] transition-colors hover:bg-muted"
            >
              {TOPICS[t].label} <span className="num text-dim">{counts[t]}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* What it is not — a different job from “why care”: boundaries, not value. */}
      <section className="border-t bg-bg-2 py-16">
        <div className="shell">
          <SectionHead label="What this is" title="Three things it is not." center />
          <div className="mx-auto grid max-w-5xl gap-px overflow-hidden border-y bg-border sm:grid-cols-3">
            {[
              [
                "Not a course.",
                "No modules, no certificate, no drip sequence. One page per rule, readable in forty seconds, then you get back to work.",
              ],
              [
                "Not a forum.",
                "No login, no invite, no unsearchable Slack history. Every rule is a public URL you can paste to your boss or your lawyer.",
              ],
              [
                "Not opinion.",
                "Every claim names its primary source and the date it was last verified. Where the evidence is thin, the page says so.",
              ],
            ].map(([h, p], i) => (
              <div key={h} className="bg-bg-2 px-6 py-9 sm:px-7">
                <span className="num text-[13px] font-semibold text-accent">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-4 text-[19px]">{h}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-muted-fg">{p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="subscribe" className="shell border-t py-10">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
          <div>
            <h2 className="text-[1.05rem] tracking-tight">Get told when a rule moves</h2>
            <p className="mt-1.5 max-w-[52ch] text-[13.5px] leading-relaxed text-muted-fg">
              Market moves that match the desk you picked — not every re-verify. Optional: watch a
              domain&rsquo;s auth DNS.
            </p>
          </div>
          <SubscribeForm />
        </div>

        {/* The boundaries are argued in full above; this is just the paperwork. */}
        <p className="mt-9 max-w-[80ch] border-t border-border-soft pt-5 text-[12.5px] leading-relaxed text-dim">
          A primary source and a verification date on every claim, and where the evidence is thin
          the page says so.{" "}
          <Link href="/#faq" className="underline underline-offset-3 hover:text-fg">
            Awkward FAQ
          </Link>
          {" · "}
          <Link href="/methodology" className="underline underline-offset-3 hover:text-fg">
            How we verify
          </Link>
          {" · "}
          <Link href="/coverage" className="underline underline-offset-3 hover:text-fg">
            What we skip on purpose
          </Link>
          .
        </p>
      </section>
    </>
  );
}

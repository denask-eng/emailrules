import Link from "next/link";
import { SubscribeForm } from "@/components/subscribe-form";
import {
  getAllRules,
  getChangelog,
  getStats,
  countsByTopic,
  countsByOwnership,
  fmtDate,
} from "@/lib/rules";
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
import { LiveFigure } from "@/components/home/live-figure";
import { IndexBand } from "@/components/home/index-band";
import { OwnershipBar } from "@/components/graphics";

export const revalidate = 900;

export default async function Home() {
  const [changelogAll, stats, counts, own, allRules] = await Promise.all([
    getChangelog(120),
    getStats(),
    countsByTopic(),
    countsByOwnership(),
    getAllRules(),
  ]);

  /* One clock reading for the whole page, so the timeline and the figure
     cannot disagree about what "today" is. */
  const now = new Date().toISOString().slice(0, 10);

  /* Homepage only shows real market moves — not "we documented a page". */
  const marketMoves = changelogAll.filter((c) => isMarketChange(c.note));
  const marketLedger = marketMoves.slice(0, 7);

  /* Obligations that have not started yet. The timeline plots these ahead of
     the now-line, which is the half of the story every other timeline in this
     category leaves out. */
  const upcoming = allRules
    .filter((r) => r.status === "upcoming" && r.effectiveDate > now)
    .sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));
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

            Same block, same size, same colours — it was the best thing on this
            page. One thing changed: it used to be a hardcoded transcript of a
            finding, and it is now the finding, read live from public DNS while
            this page rendered. The caption says "a real reading", and this was
            the one place on the site where that was not literally true. */}
        <LiveFigure />

        {/* What this site does that a compliance blog cannot: it measures the
            industry daily and keeps the series. Two new measured surfaces
            shipped and neither was reachable from the front door, which from
            outside looked exactly like nothing had changed. */}
        <IndexBand />

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

        {/* What is coming. The most valuable question a reader has, and it was
            nowhere on this page. */}
        {upcoming.length ? (
          <div className="mt-6 rounded-xl border border-soon/30 bg-soon-bg px-4 py-4 sm:px-5">
            <p className="label text-soon">Starting later</p>
            <ul className="mt-2 list-none p-0">
              {upcoming.slice(0, 4).map((r) => (
                <li key={r.slug} className="border-b border-soon/15 last:border-b-0">
                  <Link
                    href={`/rules/${r.slug}`}
                    className="flex flex-wrap gap-x-3 py-2 hover:underline"
                  >
                    <time
                      dateTime={r.effectiveDate}
                      className="num w-[5.5rem] shrink-0 text-[12px] font-medium text-soon"
                    >
                      {fmtDate(r.effectiveDate)}
                    </time>
                    <span className="min-w-0 flex-1 text-[14px] leading-snug">{r.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
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

          {/* The proportion, drawn, before the paragraph that describes it.
              Branch C was right that this site argues about a ratio and never
              showed one. The three items below keep every word they had — the
              graphic just means nobody has to read 200 of them to get the
              shape. */}
          <div className="mx-auto mt-10 max-w-2xl">
            <OwnershipBar
              counts={own}
              total={stats.total}
              caption={
                <>
                  Every rule on the shelf, by whose desk it lands on. The leftmost segment is what a
                  mainstream tool finishes for you, and it is{" "}
                  <b className="font-medium text-fg">
                    {stats.fullyHandled} rule{stats.fullyHandled === 1 ? "" : "s"}
                  </b>{" "}
                  wide — drawn to scale, because rounding that up is the overstatement everyone else
                  in this category makes.
                </>
              }
            />
          </div>

          <ol className="mx-auto mt-10 max-w-2xl list-none border-t border-fg/12 p-0">
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

import Link from "next/link";
import { runCheck, subscribe } from "@/app/actions";
import { getChangelog, getStats, countsByTopic, fmtDate } from "@/lib/rules";
import { TOPICS } from "@/lib/types";
import type { Topic } from "@/lib/types";
import { ChangeRow, Panel, SectionHead, Figures, StatusDot } from "@/components/bits";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isMarketChange } from "@/lib/rule-signals";

export default async function Home() {
  const [changelogAll, stats, counts] = await Promise.all([
    getChangelog(40),
    getStats(),
    countsByTopic(),
  ]);

  /* Homepage only shows real market moves — not "we documented a page". */
  const marketLedger = changelogAll.filter((c) => isMarketChange(c.note)).slice(0, 7);

  /* A topic with no rules renders a card, takes a click and lands on nothing.
     Hide it until it has something in it, and let the heading count itself. */
  const topics = (Object.keys(TOPICS) as Topic[]).filter((t) => (counts[t] ?? 0) > 0);

  return (
    <>
      {/*
        The idea: an airy, centred promise, then a dense left-aligned wall of
        dated fact directly beneath it. The contrast is the argument. Everything
        above the fold is computed, so the proof arrives with the claim.
      */}
      <section className="shell pt-14 pb-12 text-center sm:pt-24 sm:pb-16">
        <Link
          href="/rules"
          className="inline-flex items-center gap-2.5 rounded-full border bg-card py-1.5 pr-4 pl-2.5 text-[13px] transition-colors hover:bg-muted"
          style={{ boxShadow: "var(--lift)" }}
        >
          <StatusDot status="in_force" />
          <span className="num font-medium">{stats.total}</span>
          <span className="text-muted-fg">rules · filter to yours</span>
          <span className="text-dim">→</span>
        </Link>

        <h1 className="mx-auto mt-7 max-w-4xl text-[clamp(2.4rem,7vw,4.4rem)]">
          What&rsquo;s true about email.
          <br className="hidden sm:block" />{" "}
          Right{" "}
          <span className="font-serif text-accent italic font-normal">now.</span>
        </h1>

        <p className="mx-auto mt-6 max-w-[56ch] text-[1.06rem] leading-relaxed text-muted-fg sm:text-[1.14rem]">
          From week-one marketers to deliverability leads: what is true right now, whose job it is,
          and what to do first. Of {stats.total} rules, your email tool already covers{" "}
          {stats.notYours}. Dotted words explain themselves. No scores. No fear-selling.
        </p>

        <div className="mx-auto mt-9 grid max-w-3xl gap-2.5 text-left sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              href: "/rules",
              t: "What applies to me",
              d: "Pick your role. Get five rules first — not a law library.",
            },
            {
              href: "/brief",
              t: "One-page team brief",
              d: "Shareable link + Slack paste: top five, counts, do-first lines.",
            },
            {
              href: "/check",
              t: "Check my domain",
              d: "Live SPF, DKIM, DMARC — plain findings, never a fake score.",
            },
            {
              href: "/changed",
              t: "What moved",
              d: "Real market changes only. Quiet weeks stay quiet.",
            },
          ].map((x) => (
            <Link
              key={x.href}
              href={x.href}
              className="rounded-xl border bg-card p-4 transition-colors hover:border-accent hover:bg-accent-soft"
              style={{ boxShadow: "var(--lift)" }}
            >
              <span className="block text-[14.5px] font-semibold">{x.t}</span>
              <span className="mt-1.5 block text-[12.5px] leading-snug text-muted-fg">{x.d}</span>
            </Link>
          ))}
        </div>
        <p className="mx-auto mt-5 text-[13px] text-dim">
          <Link href="/glossary" className="underline underline-offset-3 hover:text-fg">
            Glossary
          </Link>
          {" · "}
          <Link href="/check/headers" className="underline underline-offset-3 hover:text-fg">
            Paste headers
          </Link>
          {" · "}
          <Link href="/coverage" className="underline underline-offset-3 hover:text-fg">
            Coverage map
          </Link>
        </p>

        <div className="mt-9">
          <Figures
            items={[
              { v: String(stats.total), k: "rules" },
              { v: String(stats.inForce), k: "in force" },
              { v: fmtDate(stats.lastReview), k: "last verified" },
            ]}
          />
        </div>

        <p className="mx-auto mt-7 max-w-[52ch] text-[13px] leading-relaxed text-dim">
          Free, no account. No tracking pixels sold, no seed tests, no open-rate theatre — so we can
          tell you plainly when those things are the problem.
        </p>
      </section>

      {/* Market-only ledger — quiet when nothing moved is a feature. */}
      <section className="shell pb-16">
        <Panel>
          <div className="flex items-center justify-between gap-4 border-b bg-muted/50 px-5 py-2.5">
            <span className="label">Market moves · not site edits</span>
            <Link
              href="/changed"
              className="label transition-colors hover:text-fg"
              style={{ letterSpacing: "0.08em" }}
            >
              Full ledger →
            </Link>
          </div>
          {marketLedger.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-[15px] font-medium text-fg">Nothing material moved recently</p>
              <p className="mx-auto mt-2 max-w-[42ch] text-[13.5px] leading-relaxed text-muted-fg">
                Quiet is good. We only list real obligation or status changes here — not pages we
                added to the shelf. Check the{" "}
                <Link href="/changed" className="text-fg underline underline-offset-3">
                  full ledger
                </Link>{" "}
                for documentation updates, or{" "}
                <Link href="/rules" className="text-fg underline underline-offset-3">
                  filter rules to your setup
                </Link>
                .
              </p>
            </div>
          ) : (
            marketLedger.map((c) => (
              <ChangeRow
                key={`${c.rule.slug}-${c.date}-${c.note}`}
                rule={c.rule}
                date={c.date}
                note={c.note}
              />
            ))
          )}
        </Panel>
      </section>

      {/* Browse */}
      <section className="shell border-t py-16">
        <SectionHead
          label="Browse"
          title={`${stats.total} rules, ${topics.length} practical buckets`}
          lede="Grouped by the job (consent, auth, hygiene, measurement…), not by which regulator wrote the PDF."
        />
        <div className="grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {topics.map((t) => (
            <Link
              key={t}
              href={`/topics/${t}`}
              className="group flex flex-col justify-between gap-6 bg-card p-5 transition-colors hover:bg-muted/70"
            >
              <div>
                <h3 className="text-[15px] decoration-1 underline-offset-4 group-hover:underline">
                  {TOPICS[t].label}
                </h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted-fg">
                  {TOPICS[t].blurb}
                </p>
              </div>
              <span className="num text-[12px] text-dim">
                {counts[t] ?? 0} {counts[t] === 1 ? "rule" : "rules"}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* What it is not */}
      <section className="border-t bg-bg-2 py-16">
        <div className="shell">
          <SectionHead label="What this is" title="Three things it is not." center />
          {/* Was three columns of 13.5px grey with nothing to anchor the eye.
              Same three points, given a numeral, a rule between them and type
              you can actually read across a room. */}
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

      {/* The check */}
      <section className="shell py-16">
        <div
          className="overflow-hidden rounded-2xl border px-6 py-14 text-center sm:px-12"
          style={{ background: "var(--card)", boxShadow: "var(--lift-2)" }}
        >
          <p className="label">The check</p>
          <h2 className="mx-auto mt-3 max-w-2xl text-[clamp(24px,3.6vw,36px)]">
            A calm look at your sending domain
          </h2>
          <p className="mx-auto mt-4 max-w-[54ch] text-[16px] leading-relaxed text-muted-fg">
            Live SPF, DKIM and DMARC from DNS — findings with sources, never a scary score out of ten.
            If you are clean, we say so. Techy enough for headers; plain enough for a quick Monday check.
          </p>
          <form className="mx-auto mt-8 flex max-w-md gap-2.5" action={runCheck}>
            <input
              name="domain"
              required
              placeholder="yourbrand.com"
              aria-label="Sending domain"
              className="num h-11 flex-1 rounded-[10px] border bg-bg px-3.5 text-[14px] outline-none focus-visible:ring-[3px] focus-visible:ring-accent/25"
            />
            <button
              type="submit"
              className={cn(buttonVariants({ size: "lg" }), "h-11 rounded-[10px] px-5 font-medium")}
            >
              Run check
            </button>
          </form>
          <p className="mt-5 text-[13.5px] text-muted-fg">
            Have a real message?{" "}
            <Link href="/check/headers" className="text-fg underline decoration-1 underline-offset-3">
              Paste its headers
            </Link>{" "}
            for DKIM alignment and one-click unsubscribe — DNS alone cannot prove those.
          </p>
          <p className="label mt-4">Free · no account · findings with sources, never a score</p>
        </div>
      </section>

      {/* Return reason */}
      <section id="subscribe" className="shell border-t py-14">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h3 className="text-[15px]">Get told when a rule moves</h3>
            <p className="mt-1.5 max-w-[52ch] text-[13.5px] leading-relaxed text-muted-fg">
              One email per change, and nothing else, ever.
            </p>
          </div>
          <form className="flex w-full gap-2.5 sm:w-auto" action={subscribe}>
            <input
              type="email"
              name="email"
              required
              placeholder="you@brand.com"
              aria-label="Email address"
              className="num h-10 w-full rounded-[10px] border bg-card px-3.5 text-[13.5px] outline-none focus-visible:ring-[3px] focus-visible:ring-accent/25 sm:w-[17rem]"
            />
            <button
              type="submit"
              className={cn(buttonVariants(), "h-10 rounded-[10px] px-4 font-medium")}
            >
              Subscribe
            </button>
          </form>
        </div>
      </section>
    </>
  );
}

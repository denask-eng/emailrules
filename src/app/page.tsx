import Link from "next/link";
import { runCheck, subscribe } from "@/app/actions";
import { getAllRules, getChangelog, getStats, countsByTopic, fmtDate } from "@/lib/rules";
import { TOPICS } from "@/lib/types";
import type { Topic } from "@/lib/types";
import { ChangeRow, Panel, SectionHead, Figures, StatusDot } from "@/components/bits";
import { TrustStrip } from "@/components/trust-strip";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { displayTldr } from "@/content/plain-overrides";
import { isMarketChange, stickyRisks } from "@/lib/rule-signals";

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

  /* A topic with no rules renders a card, takes a click and lands on nothing.
     Hide it until it has something in it, and let the heading count itself. */
  const topics = (Object.keys(TOPICS) as Topic[]).filter((t) => (counts[t] ?? 0) > 0);

  return (
    <>
      <section className="shell pt-12 pb-12 text-center sm:pt-20 sm:pb-16">
        <Link
          href="/rules"
          className="inline-flex items-center gap-2.5 rounded-full border bg-card py-1.5 pr-4 pl-2.5 text-[13px] hover:bg-muted"
          style={{ boxShadow: "var(--lift)" }}
        >
          <StatusDot status="in_force" />
          <span className="num font-medium">{stats.total}</span>
          <span className="text-muted-fg">rules · yours in under a minute</span>
          <span className="text-dim">→</span>
        </Link>

        <h1 className="mx-auto mt-7 max-w-4xl text-[clamp(2.35rem,6.8vw,4.2rem)]">
          What&rsquo;s true about email.
          <br className="hidden sm:block" />{" "}
          Right{" "}
          <span className="font-serif text-accent italic font-normal">now.</span>
        </h1>

        <p className="mx-auto mt-5 max-w-[34rem] text-[1.05rem] leading-relaxed text-muted-fg sm:text-[1.12rem]">
          You ship campaigns. You do not have a free afternoon to re-read Gmail help pages. Open
          this, pick your role, get <b className="font-medium text-fg">five things that matter</b> —
          whose job, what to do first. Of {stats.total} rules, your email tool already covers{" "}
          {stats.notYours}.
        </p>

        <div className="mx-auto mt-8 flex max-w-md flex-col items-stretch gap-2.5 sm:max-w-none sm:flex-row sm:justify-center">
          <Link
            href="/rules"
            className={cn(
              buttonVariants({ size: "lg" }),
              "h-12 rounded-full px-7 text-[15px] font-medium",
            )}
          >
            Show me what applies to me
          </Link>
          <Link
            href="/check"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "h-12 rounded-full px-6 text-[15px]",
            )}
          >
            Check my domain
          </Link>
        </div>

        <TrustStrip className="mt-10" />

        <div className="mx-auto mt-10 grid max-w-3xl gap-2 text-left sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              href: "/rules",
              t: "Filter to my desk",
              d: "Role + geos. Five first — not the whole library.",
            },
            {
              href: "/brief",
              t: "Team / client brief",
              d: "Slack paste or PDF. Agencies: name the client.",
            },
            {
              href: "/check",
              t: "Domain check",
              d: "Live SPF, DKIM, DMARC. Findings, never a fake score.",
            },
            {
              href: "/changed",
              t: "What moved",
              d: "Market only. Quiet weeks stay honest.",
            },
          ].map((x) => (
            <Link
              key={x.href}
              href={x.href}
              className="rounded-2xl border border-border-soft bg-card/80 px-4 py-3.5 hover:border-border hover:bg-card"
            >
              <span className="block text-[14px] font-semibold tracking-tight">{x.t}</span>
              <span className="mt-1 block text-[12.5px] leading-snug text-muted-fg">{x.d}</span>
            </Link>
          ))}
        </div>

        <div className="mt-9">
          <Figures
            items={[
              { v: String(stats.total), k: "rules" },
              { v: String(stats.inForce), k: "in force" },
              { v: fmtDate(stats.lastReview), k: "last verified" },
            ]}
          />
        </div>

        <p className="mx-auto mt-6 max-w-[48ch] text-[12.5px] leading-relaxed text-dim">
          Free. No account. Email only — SMS is different law. No tracking pixels sold, no seed
          tests, so we can tell you when those things are the problem.
        </p>
      </section>

      {/* Market-only ledger — quiet weeks still earn a visit. */}
      <section className="shell pb-16">
        <Panel>
          <div className="flex items-center justify-between gap-4 border-b bg-muted/40 px-5 py-2.5">
            <span className="label">Market moves · not site edits</span>
            <Link
              href="/changed"
              className="label hover:text-fg"
              style={{ letterSpacing: "0.08em" }}
            >
              Full ledger →
            </Link>
          </div>
          {marketLedger.length === 0 ? (
            <div className="px-5 py-8 sm:px-6">
              <p className="text-[15px] font-semibold tracking-tight text-fg">
                Nothing material moved recently
              </p>
              <p className="mt-1.5 max-w-[48ch] text-[13.5px] leading-relaxed text-muted-fg">
                Quiet is good. Last shelf verify:{" "}
                <b className="font-medium text-fg">{fmtDate(stats.lastReview)}</b>. While the market
                is still, these still need a person on most desks:
              </p>
              <ul className="mt-5 list-none space-y-0 border-t p-0">
                {sticky.map((r, i) => (
                  <li key={r.slug} className="border-b border-border-soft py-3.5 last:border-b-0">
                    <div className="flex gap-3">
                      <span className="num text-[11px] text-dim">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0">
                        <Link
                          href={`/rules/${r.slug}`}
                          className="text-[14.5px] font-semibold tracking-tight underline-offset-3 hover:underline"
                        >
                          {r.title}
                        </Link>
                        <p className="mt-1 max-w-[58ch] text-[13px] leading-relaxed text-muted-fg">
                          {displayTldr(r.slug, r.plain)}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[13px] text-dim">
                <Link href="/rules" className="font-medium text-fg underline underline-offset-3">
                  Filter to your role
                </Link>
                {" · "}
                <Link href="/changed" className="underline underline-offset-3 hover:text-fg">
                  Full ledger
                </Link>
              </p>
            </div>
          ) : (
            marketLedger.map((c) => (
              <ChangeRow
                key={`${c.rule.slug}-${c.date}-${c.note}`}
                rule={c.rule}
                date={c.date}
                note={c.note}
                compact
              />
            ))
          )}
        </Panel>
      </section>

      {/* Browse — editorial index, not a half-empty card grid */}
      <section id="browse" className="shell border-t py-16 sm:py-20">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between sm:gap-10">
          <SectionHead
            label="Browse by job"
            title={`${stats.total} rules. ${topics.length} kinds of work.`}
            lede="Grouped by what you are actually doing (consent, auth, hygiene, measurement), not by which regulator wrote the PDF."
          />
          <div className="mb-7 flex shrink-0 flex-wrap gap-x-4 gap-y-2 text-[13.5px]">
            <Link
              href="/rules"
              className="font-medium text-accent underline-offset-3 hover:underline"
            >
              Filter to your role →
            </Link>
            <Link href="/coverage" className="text-muted-fg underline-offset-3 hover:text-fg hover:underline">
              Full coverage map
            </Link>
          </div>
        </div>

        <ol className="mt-2 list-none border-t border-fg/15 p-0">
          {[...topics]
            .sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0))
            .map((t, i) => {
              const n = counts[t] ?? 0;
              return (
                <li key={t} className="border-b border-border-soft last:border-b-0">
                  <Link
                    href={`/topics/${t}`}
                    className="group grid grid-cols-[2.5rem_minmax(0,1fr)] items-baseline gap-x-3 py-5 sm:grid-cols-[2.75rem_minmax(0,1fr)_auto] sm:gap-x-6 sm:py-[1.35rem]"
                  >
                    <span className="num pt-1 text-[11px] font-medium tracking-[0.1em] text-dim transition-colors group-hover:text-accent">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-[1.08rem] font-semibold tracking-tight text-fg decoration-1 underline-offset-[5px] group-hover:underline sm:text-[1.15rem]">
                        {TOPICS[t].label}
                      </h3>
                      <p className="mt-1.5 max-w-[56ch] text-[13.5px] leading-relaxed text-muted-fg sm:text-[14.5px]">
                        {TOPICS[t].blurb}
                      </p>
                    </div>
                    <div className="col-start-2 mt-3 flex items-baseline gap-2.5 sm:col-start-auto sm:mt-0 sm:self-center sm:pl-6">
                      <div className="flex items-baseline gap-1.5 sm:flex-col sm:items-end sm:gap-0.5">
                        <span className="num text-[1.4rem] font-semibold tracking-tight tabular-nums leading-none text-fg sm:text-[1.65rem]">
                          {n}
                        </span>
                        <span className="text-[11.5px] tracking-wide text-dim">
                          {n === 1 ? "rule" : "rules"}
                        </span>
                      </div>
                      <span
                        aria-hidden
                        className="text-[15px] text-dim transition-transform group-hover:translate-x-0.5 group-hover:text-accent"
                      >
                        →
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
        </ol>
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

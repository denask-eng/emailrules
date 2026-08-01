import Link from "next/link";
import { getChangelog, getStats, countsByTopic, fmtDate } from "@/lib/rules";
import { TOPICS } from "@/lib/types";
import type { Topic } from "@/lib/types";
import { ChangeRow, Panel, SectionHead, Figures, StatusDot } from "@/components/bits";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function Home() {
  const [changelog, stats, counts] = await Promise.all([
    getChangelog(7),
    getStats(),
    countsByTopic(),
  ]);

  return (
    <>
      {/*
        The idea: an airy, centred promise, then a dense left-aligned wall of
        dated fact directly beneath it. The contrast is the argument. Everything
        above the fold is computed, so the proof arrives with the claim.
      */}
      <section className="shell pt-14 pb-12 text-center sm:pt-24 sm:pb-16">
        <Link
          href="/changed"
          className="inline-flex items-center gap-2.5 rounded-full border bg-card py-1.5 pr-4 pl-2.5 text-[13px] transition-colors hover:bg-muted"
          style={{ boxShadow: "var(--lift)" }}
        >
          <StatusDot status="in_force" />
          <span className="num font-medium">{stats.changed90}</span>
          <span className="text-muted-fg">rules changed in the last 90 days</span>
          <span className="text-dim">→</span>
        </Link>

        <h1 className="mx-auto mt-7 max-w-4xl text-[clamp(2.4rem,7vw,4.4rem)]">
          What&rsquo;s true about email.
          <br className="hidden sm:block" />{" "}
          Right{" "}
          <span className="font-serif text-accent italic font-normal">now.</span>
        </h1>

        <p className="mx-auto mt-6 max-w-[56ch] text-[1.06rem] leading-relaxed text-muted-fg sm:text-[1.14rem]">
          A dated, cited reference for the rules that govern marketing email. When a regulator or a
          mailbox provider moves, the page moves, and you get told.
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/rules"
            className={cn(buttonVariants({ size: "lg" }), "h-11 rounded-[10px] px-6 text-[15px] font-medium")}
          >
            Browse the rules
          </Link>
          <Link
            href="/check"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "h-11 rounded-[10px] px-6 text-[15px] font-medium",
            )}
          >
            Check my domain
          </Link>
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

        <p className="mx-auto mt-7 max-w-[52ch] text-[13px] leading-relaxed text-dim">
          Free, no account. We sell no tracking pixels, no seed tests and no open-rate analytics,
          which is why this can tell you when they are a problem.
        </p>
      </section>

      {/* The ledger. Dense, left, and directly under the promise. */}
      <section className="shell pb-16">
        <Panel>
          <div className="flex items-center justify-between gap-4 border-b bg-muted/50 px-5 py-2.5">
            <span className="label">The ledger · newest first</span>
            <Link
              href="/changed"
              className="label transition-colors hover:text-fg"
              style={{ letterSpacing: "0.08em" }}
            >
              All changes →
            </Link>
          </div>
          {changelog.map((c) => (
            <ChangeRow key={`${c.rule.slug}-${c.date}`} rule={c.rule} date={c.date} note={c.note} />
          ))}
        </Panel>
      </section>

      {/* Browse */}
      <section className="shell border-t py-16">
        <SectionHead
          label="Browse"
          title={`${stats.total} rules, seven ways to get bitten`}
          lede="Grouped by the thing that actually goes wrong, not by which regulator wrote it."
        />
        <div className="grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(TOPICS) as Topic[]).map((t) => (
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
          <div className="mx-auto grid max-w-4xl gap-10 sm:grid-cols-3">
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
            ].map(([h, p]) => (
              <div key={h}>
                <h3 className="text-[15px]">{h}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-muted-fg">{p}</p>
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
            Does your own sending follow these rules?
          </h2>
          <p className="mx-auto mt-4 max-w-[54ch] text-[16px] leading-relaxed text-muted-fg">
            Point it at your sending domain. It reads authentication, consent posture and content
            claims against every rule here, then names what is exposed and the date each rule
            started to apply.
          </p>
          <form className="mx-auto mt-8 flex max-w-md gap-2.5" action="/api/check" method="post">
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
          <p className="label mt-5">Free · no account · findings with sources, never a score</p>
        </div>
      </section>

      {/* Return reason */}
      <section id="subscribe" className="shell border-t py-14">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h3 className="text-[15px]">Get told when a rule moves</h3>
            <p className="mt-1.5 max-w-[52ch] text-[13.5px] leading-relaxed text-muted-fg">
              One email per change, and nothing else, ever. Or take the{" "}
              <a href="/feed.xml" className="text-fg underline decoration-1 underline-offset-3">
                RSS feed
              </a>{" "}
              instead.
            </p>
          </div>
          <form className="flex w-full gap-2.5 sm:w-auto" action="/api/subscribe" method="post">
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

import Link from "next/link";
import { getChangelog, getStats, countsByTopic, fmtDate } from "@/lib/rules";
import { TOPICS } from "@/lib/types";
import type { Topic } from "@/lib/types";
import { ChangeRow, SECTION, SectionHead, StatStrip, GroupHead } from "@/components/bits";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function Home() {
  const [changelog, stats, counts] = await Promise.all([
    getChangelog(6),
    getStats(),
    countsByTopic(),
  ]);

  return (
    <>
      {/*
        Above the fold answers three things before anyone scrolls: what this is,
        why it matters, and whether it is real. The figures are computed, not
        claimed, and the ledger starts immediately after so the substance is
        visible rather than promised.
      */}
      <section className={cn(SECTION, "pt-14 pb-10 sm:pt-20")}>
        <p className="eyebrow">Dated · cited · independent</p>

        <h1 className="mt-5 max-w-4xl text-[clamp(2.2rem,6.2vw,3.9rem)]">
          What&rsquo;s true about email. Right now.
        </h1>

        <p className="mt-6 max-w-[62ch] text-[1.06rem] leading-relaxed text-ink-soft">
          A reference for the rules that govern marketing email: consent, tracking,
          authentication, provider thresholds, AI disclosure. Every rule carries the date it
          changed and the primary source it came from.{" "}
          <span className="text-ink">
            When a regulator or a mailbox provider moves, the page moves.
          </span>
        </p>

        <div className="mt-9 max-w-3xl">
          <StatStrip
            items={[
              { value: String(stats.total), label: "rules, each with its source" },
              { value: String(stats.changed90), label: "changed in the last 90 days" },
              { value: fmtDate(stats.lastReview), label: "last full review" },
            ]}
          />
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/rules"
            className={cn(buttonVariants({ size: "lg" }), "h-10 px-5 font-semibold")}
          >
            Browse the rules
          </Link>
          <Link
            href="/check"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "h-10 px-5 font-semibold",
            )}
          >
            Check my sending domain
          </Link>
        </div>

        <p className="mt-4 max-w-[58ch] text-[0.88rem] leading-relaxed text-mute">
          Free, no account. We sell no tracking pixels, no seed tests and no open-rate analytics,
          which is why this can tell you when they are a problem.
        </p>
      </section>

      {/* The ledger. This is the product, so it sits as high as it goes. */}
      <section className="border-y border-rule bg-paper-2 py-16">
        <div className={SECTION}>
          <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <p className="eyebrow">What changed</p>
              <h2 className="mt-3 text-[clamp(1.4rem,3.2vw,2rem)]">The changelog is the product</h2>
            </div>
            <Link
              href="/changed"
              className="m text-[0.74rem] tracking-[0.06em] text-mute uppercase no-underline hover:text-ink"
            >
              Every change →
            </Link>
          </div>

          <ul className="list-none border-t border-ink p-0">
            {changelog.map((c) => (
              <ChangeRow key={`${c.rule.slug}-${c.date}`} rule={c.rule} date={c.date} note={c.note} />
            ))}
          </ul>

          <p className="m mt-4 text-[0.68rem] tracking-[0.1em] text-mute uppercase">
            Newest first · every entry links to the full rule and its source
          </p>
        </div>
      </section>

      {/* Browse */}
      <section className={cn(SECTION, "py-16")}>
        <SectionHead
          eyebrow="Browse"
          title={`${stats.total} rules, seven ways to get bitten`}
          lede="Grouped by the thing that actually goes wrong, not by which regulator wrote it."
        />
        <ul className="grid list-none grid-cols-1 gap-x-8 border-t border-ink p-0 sm:grid-cols-2">
          {(Object.keys(TOPICS) as Topic[]).map((t) => (
            <li key={t} className="border-b border-rule-soft">
              <Link
                href={`/topics/${t}`}
                className="group flex items-baseline gap-x-3 py-3.5 no-underline"
              >
                <span className="text-[0.98rem] font-semibold group-hover:underline group-hover:underline-offset-2">
                  {TOPICS[t].label}
                </span>
                <span className="m ml-auto text-[0.74rem] text-mute">{counts[t] ?? 0}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* What it is not */}
      <section className="border-y border-rule bg-paper-2 py-16">
        <div className={SECTION}>
          <SectionHead eyebrow="What this is" title="Three things it is not." />
          <div className="grid gap-8 md:grid-cols-3">
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
                "Every claim names its primary source and the date it was last verified. Where the evidence is thin, the page says the evidence is thin.",
              ],
            ].map(([h, p]) => (
              <div key={h} className="border-t border-ink pt-4">
                <h3 className="text-[1.05rem] leading-snug font-bold tracking-[-0.02em]">{h}</h3>
                <p className="mt-2.5 text-[0.94rem] leading-relaxed text-ink-soft">{p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The check */}
      <section className="on-ink py-16">
        <div className={SECTION}>
          <p className="eyebrow text-alarm">The check</p>
          <h2 className="mt-3 max-w-3xl text-[clamp(1.5rem,3.6vw,2.2rem)]">
            Does your own sending follow these rules?
          </h2>
          <p className="mt-4 max-w-[62ch] text-[1.02rem] leading-relaxed text-[#b9bfca]">
            Point it at your sending domain. It reads authentication, consent posture and content
            claims against every rule here, then names what is exposed and the date each rule
            started to apply.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/check"
              className={cn(buttonVariants({ size: "lg" }), "h-10 px-5 font-semibold")}
            >
              Check my sending domain
            </Link>
            <Link
              href="/check#sample"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-10 border-[#3a4049] bg-transparent px-5 font-semibold text-paper hover:bg-[#2a2f3a] hover:text-paper",
              )}
            >
              See a sample report
            </Link>
          </div>
          <p className="m mt-5 text-[0.68rem] tracking-[0.1em] text-[#8b919e] uppercase">
            Free · no account · findings with sources, never a score out of ten
          </p>
        </div>
      </section>

      {/* Return reason */}
      <section id="subscribe" className={cn(SECTION, "py-16")}>
        <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <GroupHead>Get told when a rule moves</GroupHead>
            <p className="mt-3 max-w-[58ch] text-[0.94rem] leading-relaxed text-ink-soft">
              One email per change, and nothing else, ever. Or take the{" "}
              <a href="/feed.xml" className="underline underline-offset-2">
                RSS feed
              </a>{" "}
              instead.
            </p>
          </div>
          <form className="flex w-full gap-2 md:w-auto" action="/api/subscribe" method="post">
            <input
              type="email"
              name="email"
              required
              placeholder="you@brand.com"
              aria-label="Email address"
              className="m h-9 w-full rounded-lg border border-rule bg-paper px-2.5 text-[0.85rem] outline-none focus-visible:ring-3 focus-visible:ring-ink/20 md:w-[16rem]"
            />
            <button
              type="submit"
              className={cn(buttonVariants({ size: "lg" }), "h-9 px-4 font-semibold")}
            >
              Subscribe
            </button>
          </form>
        </div>
      </section>
    </>
  );
}

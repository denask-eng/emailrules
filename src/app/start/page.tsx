import type { Metadata } from "next";
import Link from "next/link";
import { getAllRules, getStats, countsByTopic } from "@/lib/rules";
import { TOPICS } from "@/lib/types";
import type { Topic } from "@/lib/types";
import { SectionHead } from "@/components/bits";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Two-minute tour",
  description:
    "How emailrules.today works for every kind of email marketer — lifecycle, CRM, deliverability, agency. Filter to what is yours, check a domain, paste headers if you want depth.",
  alternates: { canonical: "/start" },
};

/**
 * Welcome for every skill level. Short path; depth is one click away, never forced.
 */
export default async function StartHere() {
  const [rules, stats, counts] = await Promise.all([
    getAllRules(),
    getStats(),
    countsByTopic(),
  ]);
  const yours = rules.filter((r) => r.ownership === "yours").length;
  const topics = (Object.keys(TOPICS) as Topic[]).filter((t) => (counts[t] ?? 0) > 0);

  return (
    <div className="shell shell-tight py-12 sm:py-16">
      <SectionHead
        label="Tour"
        title="Two minutes. Then only what you need."
        lede="Whether you live in Klaviyo, write SQL against events, or just need a clean answer for legal — same site. Skim or go deep. Nothing here is designed to scare you into a subscription."
      />

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border bg-card p-5" style={{ boxShadow: "var(--lift)" }}>
          <p className="label">If you want it simple</p>
          <h2 className="mt-2 text-[1.1rem] font-semibold">Filter → read → move on</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-[0.95rem] leading-relaxed text-muted-fg">
            <li>
              Open{" "}
              <Link href="/rules" className="text-fg underline underline-offset-3">
                Rules
              </Link>{" "}
              and tick where you send (EU, US, Canada…).
            </li>
            <li>Optionally hide what your ESP already handles.</li>
            <li>Each page: plain answer, who owns it, one first move, skip-if line.</li>
          </ol>
          <Link
            href="/rules"
            className={cn(buttonVariants({ size: "lg" }), "mt-5 h-10 rounded-[10px] px-5 font-medium")}
          >
            Show me what&rsquo;s mine
          </Link>
        </div>

        <div className="rounded-xl border bg-card p-5" style={{ boxShadow: "var(--lift)" }}>
          <p className="label">If you want the tech</p>
          <h2 className="mt-2 text-[1.1rem] font-semibold">DNS, headers, sources</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-[0.95rem] leading-relaxed text-muted-fg">
            <li>
              <Link href="/check" className="text-fg underline underline-offset-3">
                Domain check
              </Link>{" "}
              — live SPF / DKIM selectors / DMARC / BIMI, shareable URL.
            </li>
            <li>
              <Link href="/check/headers" className="text-fg underline underline-offset-3">
                Header paste
              </Link>{" "}
              — alignment and List-Unsubscribe off a real message.
            </li>
            <li>
              Every claim links a primary source.{" "}
              <Link href="/sources" className="text-fg underline underline-offset-3">
                Full list
              </Link>
              ,{" "}
              <Link href="/feed.xml" className="text-fg underline underline-offset-3">
                RSS
              </Link>
              ,{" "}
              <Link href="/llms.txt" className="text-fg underline underline-offset-3">
                llms.txt
              </Link>
              .
            </li>
          </ol>
          <Link
            href="/check"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "mt-5 h-10 rounded-[10px] px-5 font-medium",
            )}
          >
            Check a domain
          </Link>
        </div>
      </div>

      <section className="mt-12 rounded-xl border bg-bg-2 p-6">
        <h2 className="text-[1.1rem] font-semibold">The one idea that makes this usable</h2>
        <p className="mt-3 max-w-[62ch] text-[0.98rem] leading-relaxed text-muted-fg">
          Of {stats.total} rules, only <b className="text-fg">{yours}</b> are fully on your desk.
          The rest are already handled by mainstream ESPs, shared with the platform, or just context
          (good to know, nothing to fix today). We say that on every page so you are not left anxious
          about work that was never yours.
        </p>
        <p className="mt-3 max-w-[62ch] text-[0.98rem] leading-relaxed text-muted-fg">
          Come back when something moves —{" "}
          <Link href="/changed" className="text-fg underline underline-offset-3">
            the changelog
          </Link>{" "}
          or{" "}
          <Link href="/#subscribe" className="text-fg underline underline-offset-3">
            one email per change
          </Link>
          . That is the habit, not doom-scrolling compliance Twitter.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-[15px] font-semibold">Browse by job, not by regulator</h2>
        <div className="mt-4 flex flex-wrap gap-2.5">
          {topics.map((t) => (
            <Link
              key={t}
              href={`/topics/${t}`}
              className="rounded-full border bg-card px-3.5 py-1.5 text-[13.5px] transition-colors hover:bg-muted"
            >
              {TOPICS[t].label}{" "}
              <span className="num text-dim">{counts[t] ?? 0}</span>
            </Link>
          ))}
        </div>
        <p className="mt-5 text-[13.5px] text-muted-fg">
          Map of the shelf, including what we deliberately skip:{" "}
          <Link href="/coverage" className="text-fg underline underline-offset-3">
            Coverage
          </Link>
          .
        </p>
      </section>
    </div>
  );
}

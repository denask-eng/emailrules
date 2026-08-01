import Link from "next/link";
import { getChangelog, getStats, countsByTopic, fmtDate } from "@/lib/rules";
import { TOPICS } from "@/lib/types";
import type { Topic } from "@/lib/types";
import { ChangeRow, Panel, SectionHead } from "@/components/bits";

export default async function Home() {
  const [changelog, stats, counts] = await Promise.all([
    getChangelog(8),
    getStats(),
    countsByTopic(),
  ]);

  return (
    <>
      {/* ── hero ─────────────────────────────────────────────────────────── */}
      <section className="wrap pt-16 pb-12 md:pt-24 md:pb-16">
        <h1 className="text-[clamp(34px,5.6vw,58px)] font-semibold leading-[1.03]">
          What&rsquo;s true about email.
          <br />
          Right{" "}
          <span
            style={{
              fontFamily: "var(--serif)",
              fontStyle: "italic",
              fontWeight: 400,
              color: "var(--primary)",
            }}
          >
            now.
          </span>
        </h1>

        <p
          className="mt-6 text-[17px] leading-relaxed md:text-[18.5px]"
          style={{ color: "var(--muted-fg)", maxWidth: "60ch" }}
        >
          Every rule here carries the date it changed and the source it came from. When a mailbox
          provider or a regulator moves, the page moves, and you get told.
        </p>

        <div
          className="mt-7 inline-flex items-center gap-2.5 rounded-full px-4 py-2 text-[13.5px]"
          style={{ border: "1px solid var(--border)", background: "var(--card)" }}
        >
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ background: "var(--live)" }}
            aria-hidden
          />
          <span>
            <b className="tabular">{stats.changed90}</b> rules changed in the last 90 days. Your ESP
            told you about none of them.
          </span>
        </div>

        <div className="card mt-9 p-6" style={{ background: "var(--tint)", maxWidth: "60ch" }}>
          <p className="text-[18px] leading-snug" style={{ fontFamily: "var(--serif)", margin: 0 }}>
            We sell no tracking pixels, no seed tests, no open-rate analytics. That is why we can
            tell you when they are a problem.
          </p>
        </div>
      </section>

      {/* ── the changelog: the product ───────────────────────────────────── */}
      <section className="wrap py-14" style={{ borderTop: "1px solid var(--border)" }}>
        <SectionHead
          eyebrow="What changed"
          title="The changelog is the product"
          lede="Not a blog. A dated ledger of every rule that moved, what it now requires, and when it starts to bite."
        />
        <Panel>
          {changelog.map((c) => (
            <ChangeRow key={`${c.rule.slug}-${c.date}`} rule={c.rule} date={c.date} note={c.note} />
          ))}
        </Panel>
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <Link href="/changed" className="btn btn-outline">
            Every change
          </Link>
          <a
            href="/feed.xml"
            className="text-[13.5px] underline underline-offset-2"
            style={{ color: "var(--muted-fg)" }}
          >
            RSS
          </a>
        </div>
      </section>

      {/* ── what this is not ─────────────────────────────────────────────── */}
      <section className="wrap py-14" style={{ borderTop: "1px solid var(--border)" }}>
        <SectionHead eyebrow="What this is" title="Three things it is not" />
        <div style={{ borderTop: "1px solid var(--border)" }}>
          {[
            [
              "01",
              "Not a course.",
              "No modules, no certificate, no drip sequence. One page per rule, readable in forty seconds, then you get back to work.",
            ],
            [
              "02",
              "Not a forum.",
              "No login, no invite, no unsearchable Slack history. Everything is a public URL you can paste to your boss or your lawyer.",
            ],
            [
              "03",
              "Not opinion.",
              "Every claim names its source and the date it was last verified. Where the evidence is thin, the page says the evidence is thin.",
            ],
          ].map(([n, h, p]) => (
            <div
              key={n}
              className="grid grid-cols-[38px_1fr] gap-5 py-6"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <span className="tabular pt-0.5 text-[13px]" style={{ color: "var(--muted-fg)" }}>
                {n}
              </span>
              <div>
                <h3 className="text-[15px] font-semibold">{h}</h3>
                <p
                  className="mt-1.5 text-[14px] leading-relaxed"
                  style={{ color: "var(--muted-fg)", maxWidth: "58ch" }}
                >
                  {p}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── browse ───────────────────────────────────────────────────────── */}
      <section className="wrap py-14" style={{ borderTop: "1px solid var(--border)" }}>
        <SectionHead eyebrow="Browse" title={`${stats.total} rules, seven ways to get bitten`} />
        <div className="flex flex-wrap gap-2.5">
          {(Object.keys(TOPICS) as Topic[]).map((t) => (
            <Link
              key={t}
              href={`/topics/${t}`}
              className="inline-flex items-baseline gap-2.5 rounded-full px-4 py-2.5 text-[14px]"
              style={{ border: "1px solid var(--border)", background: "var(--card)" }}
            >
              {TOPICS[t].label}
              <span className="tabular text-[12px]" style={{ color: "var(--muted-fg)" }}>
                {counts[t] ?? 0}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── the check ────────────────────────────────────────────────────── */}
      <section className="wrap py-14" style={{ borderTop: "1px solid var(--border)" }}>
        <div
          className="rounded-2xl px-8 py-14 md:px-12"
          style={{ background: "#0b0b0d", color: "#e8e8ea", border: "1px solid #26262b" }}
        >
          <p className="eyebrow mb-3" style={{ color: "#8ab0ff" }}>
            The check
          </p>
          <h2 className="text-[clamp(24px,3.4vw,36px)] font-semibold leading-tight">
            Does your own sending follow these rules?
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed" style={{ color: "#9b9ba4", maxWidth: "56ch" }}>
            Point it at your sending domain. It reads the last 90 days against every rule on this
            site and names the sends that are exposed, with the date each rule started to apply.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/check" className="btn btn-lg btn-primary">
              Check my sends, free
            </Link>
            <Link
              href="/check#sample"
              className="btn btn-lg"
              style={{ color: "#e8e8ea", border: "1px solid #35353c" }}
            >
              See a sample report
            </Link>
          </div>
          <p className="mt-4 text-[13.5px]" style={{ color: "#9b9ba4" }}>
            No signup for the domain check. Connecting your ESP is read-only and optional.
          </p>
        </div>
      </section>

      {/* ── return reason ────────────────────────────────────────────────── */}
      <section className="wrap py-14" style={{ borderTop: "1px solid var(--border)" }}>
        <div className="card flex flex-wrap items-center justify-between gap-6 p-6">
          <div>
            <h3 className="text-[15px] font-semibold">Get told when a rule moves</h3>
            <p className="mt-1.5 text-[13.5px]" style={{ color: "var(--muted-fg)" }}>
              One email per change, nothing else, ever. Last full review{" "}
              <span className="tabular">{fmtDate(stats.lastReview)}</span>.
            </p>
          </div>
          <form className="flex min-w-[280px] flex-1 gap-2.5" action="/api/subscribe" method="post">
            <input
              type="email"
              name="email"
              required
              placeholder="you@brand.com"
              aria-label="Email address"
              className="tabular h-[38px] flex-1 rounded-lg px-3.5 text-[14px]"
              style={{
                border: "1px solid var(--input)",
                background: "var(--card)",
                color: "var(--fg)",
              }}
            />
            <button type="submit" className="btn btn-primary">
              Subscribe
            </button>
          </form>
        </div>
      </section>
    </>
  );
}

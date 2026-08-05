import type { Metadata } from "next";
import Link from "next/link";
import { getChangelog } from "@/lib/rules";
import { getAllEspChanges } from "@/lib/esp-changes";
import { ChangeRow, SectionHead } from "@/components/bits";
import { PlatformRow } from "@/components/platform-row";
import { changeKind } from "@/lib/rule-signals";

export const metadata: Metadata = {
  title: "What changed",
  description:
    "What actually moved in email — regulators and your sending platform, in one dated timeline. What changed, why it matters, what to do next.",
  alternates: { canonical: "/changed" },
};

export default async function Changed() {
  const [changelog, espChanges] = await Promise.all([getChangelog(), getAllEspChanges()]);

  const marketRules = changelog.filter((c) => {
    const k = changeKind(c.note);
    return k === "market" || k === "correction";
  });

  /* One timeline, two sources.
     When a marketer notices a number moved, they do not know whether a
     regulator or their ESP caused it — and until now the answer lived on two
     different pages, which made them merge it in their head. A platform
     shipping a change is exactly as likely to explain the drop as a rule
     coming into force, so both belong in the same dated list. */
  const market = [
    ...marketRules.map((c) => ({ kind: "rule" as const, date: c.date, entry: c })),
    ...espChanges
      .filter((c) => c.date)
      .map((c) => ({ kind: "platform" as const, date: c.date!, entry: c })),
  ].sort((a, b) => b.date.localeCompare(a.date));
  const documented = changelog.filter((c) => changeKind(c.note) === "added");
  const other = changelog.filter((c) => {
    const k = changeKind(c.note);
    return k !== "market" && k !== "correction" && k !== "added" && k !== "reverify";
  });
  /* Re-verifies intentionally omitted — trust hygiene, not interrupt. */

  return (
    <div className="shell shell-tight py-12 sm:py-16">
      <SectionHead
        as="h1"
        label="What changed"
        title="Skim in thirty seconds."
        lede="Each line answers three things: what changed, why a working email person should care, and what to do next. Open the full rule only if you need sources."
      />

      <div className="mt-8 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-dim">
        <span>
          <b className="font-medium text-muted-fg">Something changed</b> — obligation or status moved
        </span>
        <span className="hidden sm:inline" aria-hidden>
          ·
        </span>
        <span>
          <b className="font-medium text-muted-fg">We fixed our page</b> — we were wrong; truth updated
        </span>
        <span className="hidden sm:inline" aria-hidden>
          ·
        </span>
        <span>
          <b className="font-medium text-muted-fg">New page</b> — already true; we documented it
        </span>
        <span className="hidden sm:inline" aria-hidden>
          ·
        </span>
        <span>
          <b className="font-medium text-accent">Your platform</b> — Klaviyo, Mailchimp or Braze
          shipped something
        </span>
      </div>

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-fg/15 pb-3">
          <div>
            <h2 className="text-[1.15rem] font-semibold tracking-tight">Worth your time</h2>
            <p className="mt-1 max-w-[52ch] text-[13.5px] leading-relaxed text-muted-fg">
              Regulator moves, our corrections, and changes at Klaviyo, Mailchimp and Braze — one
              timeline, because a number that moved does not tell you which of the three did it.
            </p>
          </div>
          <p className="num text-[12px] text-dim">{market.length} entries</p>
        </div>
        {market.length === 0 ? (
          <p className="mt-6 rounded-2xl border bg-bg-2 px-5 py-6 text-[0.95rem] text-muted-fg">
            Nothing material moved recently. Quiet is good.{" "}
            <Link href="/rules" className="font-medium text-fg underline underline-offset-3">
              Filter rules to your setup
            </Link>{" "}
            for what still needs you when the market is still.
          </p>
        ) : (
          <ul className="mt-1 list-none p-0">
            {market.map((c) =>
              c.kind === "rule" ? (
                <li key={`m-${c.entry.rule.slug}-${c.date}-${c.entry.note}`}>
                  <ChangeRow rule={c.entry.rule} date={c.date} note={c.entry.note} />
                </li>
              ) : (
                <li key={`p-${c.entry.id}`}>
                  <PlatformRow change={c.entry} />
                </li>
              ),
            )}
          </ul>
        )}
      </section>

      {/* Folded. These are pages we wrote about things that were already true,
          and expanded they ran to forty-two rows — four times the length of
          the news above them, which made a ledger of market moves read as a
          list of our own publishing. Present, dated and indexable; just no
          longer the bulk of the page. */}
      {documented.length > 0 ? (
        <details className="faq-item group mt-14 border-t pt-5">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 outline-none marker:content-none focus-visible:bg-muted/60 [&::-webkit-details-marker]:hidden">
            <span className="min-w-0 flex-1 text-[1.05rem] font-semibold tracking-tight">
              We put it on the shelf{" "}
              <span className="num ml-1 text-[13px] font-normal text-dim">
                {documented.length}
              </span>
            </span>
            <span
              aria-hidden
              className="num shrink-0 text-[13px] text-dim transition-transform duration-300 ease-out group-open:rotate-45"
            >
              +
            </span>
          </summary>
          <div className="faq-body">
            <ul className="mt-1 list-none p-0">
              {documented.map((c) => (
                <li key={`a-${c.rule.slug}-${c.date}-${c.note}`}>
                  <ChangeRow rule={c.rule} date={c.date} note={c.note} />
                </li>
              ))}
            </ul>
          </div>
        </details>
      ) : null}

      {other.length > 0 ? (
        <section className="mt-14">
          <h2 className="border-b border-fg/15 pb-3 text-[1.05rem] font-semibold">Other notes</h2>
          <ul className="mt-1 list-none p-0">
            {other.map((c) => (
              <li key={`o-${c.rule.slug}-${c.date}-${c.note}`}>
                <ChangeRow rule={c.rule} date={c.date} note={c.note} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="mt-12 max-w-[52ch] text-[13px] leading-relaxed text-dim">
        Built for people who ship email and do not have time to reverse-engineer our tags. Wrong or
        stale?{" "}
        <a
          href="/corrections#report"
          className="text-fg underline underline-offset-3"
        >
          corrections@emailrules.today
        </a>
        .
      </p>
    </div>
  );
}

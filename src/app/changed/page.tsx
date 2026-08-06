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

  const marketRules = changelog.filter((c) => changeKind(c.note) === "market");

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
  return (
    <div className="shell shell-tight py-12 sm:py-16">
      <SectionHead
        as="h1"
        label="What changed"
        title="Changes that can affect a send."
        lede="Provider, platform, regulation and measured ecosystem changes. Emailrules corrections and publishing notes live in Trust."
      />

      <div className="mt-8 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-dim">
        <span>
          <b className="font-medium text-muted-fg">Something changed</b> — obligation or status moved
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
              Regulator moves and changes at Klaviyo, Mailchimp and Braze — one timeline, because
              a number that moved does not tell you which system caused it.
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

      <p className="mt-12 max-w-[52ch] text-[13px] leading-relaxed text-dim">
        Wrong or stale? <Link href="/trust#corrections" className="text-fg underline underline-offset-3">Read or report a correction</Link>.
      </p>
    </div>
  );
}

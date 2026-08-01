import type { Metadata } from "next";
import { getChangelog } from "@/lib/rules";
import { ChangeRow, Panel, SectionHead } from "@/components/bits";

export const metadata: Metadata = {
  title: "What changed",
  description:
    "A dated ledger of every email marketing rule change: which regulator or mailbox provider moved, what it now requires, and when it starts to bite.",
  alternates: {
    canonical: "/changed",
    types: { "application/rss+xml": [{ url: "/feed.xml", title: "Rule changes" }] },
  },
};

export default async function Changed() {
  const changelog = await getChangelog();

  return (
    <div className="wrap wrap-narrow py-12 md:py-16">
      <SectionHead
        eyebrow="Ledger"
        title="What changed"
        lede="Newest first. Every entry names the rule it belongs to, so you can read the full obligation rather than the headline."
      />
      <Panel>
        {changelog.map((c) => (
          <ChangeRow key={`${c.rule.slug}-${c.date}`} rule={c.rule} date={c.date} note={c.note} />
        ))}
      </Panel>
      <p className="mt-5 text-[13.5px]" style={{ color: "var(--muted-fg)" }}>
        Subscribe via{" "}
        <a href="/feed.xml" className="underline underline-offset-2" style={{ color: "var(--primary)" }}>
          RSS
        </a>{" "}
        and nothing else will ever reach you.
      </p>
    </div>
  );
}

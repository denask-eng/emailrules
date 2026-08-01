import type { Metadata } from "next";
import { getChangelog } from "@/lib/rules";
import { ChangeRow, Panel, SectionHead } from "@/components/bits";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "What changed",
  description:
    "A dated ledger of every marketing email rule change: which regulator or mailbox provider moved, what it now requires, and when it starts to bite.",
  alternates: {
    canonical: "/changed",
    types: { "application/rss+xml": [{ url: "/feed.xml", title: "Rule changes" }] },
  },
};

export default async function Changed() {
  const changelog = await getChangelog();

  return (
    <div className={"shell shell-tight py-12 sm:py-16"}>
      <SectionHead
        label="Ledger"
        title="What changed"
        lede="Newest first. Every entry names the rule it belongs to, so you can read the whole obligation rather than the headline."
      />
      <ul className="list-none border-t p-0">
        {changelog.map((c) => (
          <ChangeRow key={`${c.rule.slug}-${c.date}`} rule={c.rule} date={c.date} note={c.note} />
        ))}
      </ul>
      <p className="num mt-5 text-[0.68rem] tracking-[0.1em] text-dim uppercase">
        Subscribe via{" "}
        <a href="/feed.xml" className="underline underline-offset-2 hover:text-fg">
          RSS
        </a>{" "}
        and nothing else will ever reach you
      </p>
    </div>
  );
}

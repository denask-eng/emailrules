import type { Metadata } from "next";
import Link from "next/link";
import { getChangelog } from "@/lib/rules";
import { ChangeRow, Panel, SectionHead } from "@/components/bits";

export const metadata: Metadata = {
  title: "Corrections",
  alternates: { canonical: "/corrections" },
};

export default async function CorrectionsPage() {
  const corrections = (await getChangelog()).filter((entry) =>
    entry.note.startsWith("Correction:"),
  );

  return (
    <div className="shell shell-tight py-12 sm:py-16">
      <SectionHead
        as="h1"
        label="Record"
        title="Corrections"
        lede="Corrections are published, dated and kept visible. A reference that hides being wrong cannot be checked."
      />
      <p className="max-w-[62ch] text-[15px] leading-relaxed text-muted-fg">
        Send corrections to the address on the <Link href="/methodology">methodology page</Link>.
      </p>

      <Panel className="mt-8">
        <div className="flex items-center justify-between gap-4 border-b bg-muted/50 px-5 py-2.5">
          <span className="label">Published corrections · newest first</span>
        </div>
        {corrections.length ? (
          corrections.map((entry) => (
            <ChangeRow
              key={`${entry.rule.slug}-${entry.date}`}
              rule={entry.rule}
              date={entry.date}
              note={entry.note}
            />
          ))
        ) : (
          <p className="px-5 py-4 text-[14.5px] leading-relaxed text-muted-fg">
            There are currently no published corrections beyond the ones inside rule changelogs.
          </p>
        )}
      </Panel>
    </div>
  );
}

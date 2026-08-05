import type { Metadata } from "next";
import Link from "next/link";
import { getChangelog } from "@/lib/rules";
import { ChangeRow, Panel, SectionHead } from "@/components/bits";
import { CorrectionForm, CorrectionResult } from "@/components/correction-form";

export const metadata: Metadata = {
  title: "Corrections",
  alternates: { canonical: "/corrections" },
};

export default async function CorrectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; slug?: string }>;
}) {
  const { sent, slug } = await searchParams;
  /* Arrives from a rule page's "wrong or stale?" link, so the report lands
     attached to the page it is about rather than describing it in prose. */
  const about = slug && /^[a-z0-9-]{1,120}$/.test(slug) ? slug : undefined;
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

      {/* The way in. Until now this page argued that publishing corrections is
          the whole differentiator, above a mailto on a domain with no MX —
          so the one thing it asked for was the one thing it could not
          receive. */}
      <section className="mt-14 border-t pt-10" id="report">
        <SectionHead
          label="Tell us"
          title="Found something wrong?"
          lede={
            about
              ? `About /rules/${about} — no account, no address required. It goes into the queue this page publishes from.`
              : "No account, no address required, and it does not go to an inbox — it goes into the queue this page publishes from."
          }
        />
        <CorrectionResult sent={sent} />
        <CorrectionForm slug={about} path={about ? `/rules/${about}` : "/corrections"} />
      </section>
    </div>
  );
}

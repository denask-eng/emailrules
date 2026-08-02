import type { Metadata } from "next";
import Link from "next/link";
import { getEspPlatformSummaries, getEspStats, getWatchedEsps } from "@/lib/esp-changes";
import { fmtDate } from "@/lib/format";
import { SectionHead } from "@/components/bits";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "What your email platform changed",
  description:
    "A dated ledger of Klaviyo, Mailchimp and Braze changes that affect deliverability, consent and measurement — each one read off the publisher's own release notes, with the rule it touches.",
  alternates: { canonical: "/esp" },
  openGraph: {
    title: `What your email platform changed — ${SITE.name}`,
    description:
      "Dated ESP changes, primary sources only, linked to the obligation each one touches.",
  },
};

export default async function EspIndex() {
  const [summaries, stats, watched] = await Promise.all([
    getEspPlatformSummaries(),
    getEspStats(),
    getWatchedEsps(),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "What your email platform changed",
    description:
      "A dated ledger of ESP platform changes affecting deliverability, consent and measurement.",
    url: `${SITE.url}/esp`,
    isPartOf: { "@id": `${SITE.url}/#website` },
    hasPart: summaries.map((s) => ({
      "@type": "CollectionPage",
      name: s.platform.name,
      url: `${SITE.url}/esp/${s.platform.id}`,
    })),
  };

  return (
    <div className="shell shell-tight py-12 sm:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <SectionHead
        label="Platform changes"
        title="What your email platform changed."
        lede="The weekly question is rarely what a regulator did. It is whether anything moved in the tool you open every morning. Platforms ship those changes constantly and publish them badly, scattered across release notes nobody reads."
      />

      <p className="max-w-[62ch] text-[15px] leading-relaxed text-muted-fg">
        <span className="num">{stats.total}</span> changes across{" "}
        <span className="num">{stats.platforms}</span> platforms. That number is small on purpose.
        Every row below was read off the publisher’s own page with a date printed on it — no
        summaries, no recollection, no vendor blog. Everything that could not be verified that way
        was left out and{" "}
        <a href="#watched" className="text-fg underline underline-offset-3">
          named at the bottom of this page
        </a>
        , because the list we refused to publish is the only evidence that the list we published
        means anything.
      </p>

      <section className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-fg/15 pb-3">
          <h2 className="text-[1.15rem] font-semibold tracking-tight">Platforms on the shelf</h2>
          <p className="num text-[12px] text-dim">
            {stats.sources} sources · verified {fmtDate(stats.lastVerified)}
          </p>
        </div>

        <ul className="mt-1 list-none p-0">
          {summaries.map((s) => (
            <li key={s.platform.id}>
              <Link
                href={`/esp/${s.platform.id}`}
                className="group block border-b border-border-soft px-1 py-5 transition-colors last:border-b-0 hover:bg-muted/40 sm:px-2"
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h3 className="text-[1.05rem] leading-snug font-semibold tracking-tight decoration-1 underline-offset-[5px] group-hover:underline">
                    {s.platform.name}
                  </h3>
                  <span className="num text-[12px] text-dim">
                    {s.count} {s.count === 1 ? "change" : "changes"}
                    {s.latest ? ` · newest ${fmtDate(s.latest)}` : ""}
                  </span>
                </div>
                <p className="mt-1.5 max-w-[62ch] text-[13.5px] leading-relaxed text-muted-fg">
                  {s.platform.note}
                </p>
                <p className="num mt-2 text-[11.5px] text-dim">
                  Verified {fmtDate(s.lastVerified)}
                  <span className="ml-2 text-accent opacity-0 transition-opacity group-hover:opacity-100">
                    Open the ledger →
                  </span>
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section id="watched" className="mt-14 scroll-mt-24">
        <div className="border-b border-fg/15 pb-3">
          <h2 className="text-[1.1rem] font-semibold tracking-tight">
            Watched, with nothing to publish
          </h2>
          <p className="mt-1 max-w-[58ch] text-[13.5px] leading-relaxed text-muted-fg">
            These were opened during the last review and produced no entry that met the bar. The
            reason matters more than the absence.
          </p>
        </div>
        <ul className="mt-1 list-none p-0">
          {watched.map((w) => (
            <li key={w.name} className="border-b border-border-soft py-4 last:border-b-0">
              <div className="text-[0.95rem] font-medium">{w.name}</div>
              <p className="mt-1 max-w-[62ch] text-[13.5px] leading-relaxed text-muted-fg">
                {w.why}
              </p>
              {w.url ? (
                <a
                  href={w.url}
                  target="_blank"
                  rel="noopener nofollow"
                  className="num mt-1.5 inline-block text-[11.5px] text-dim underline underline-offset-2 hover:text-fg"
                >
                  Where we looked
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-12 max-w-[62ch] text-[13px] leading-relaxed text-dim">
        A platform change is only interesting because of the obligation it touches, so every entry
        that touches one links{" "}
        <Link href="/rules" className="text-fg underline underline-offset-3">
          the dated rule
        </Link>{" "}
        it belongs to. Shipped something we have missed, or got one wrong?{" "}
        <a
          href="mailto:corrections@emailrules.today"
          className="text-fg underline underline-offset-3"
        >
          corrections@emailrules.today
        </a>
        .
      </p>
    </div>
  );
}

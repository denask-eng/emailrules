import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getEspChanges,
  getEspPlatform,
  ESP_SOURCE_KIND,
  type EspChange,
} from "@/lib/esp-changes";
import { ESP_PLATFORMS, type EspChangeDateKind } from "@/content/esp-changes";
import { getAllRules, fmtDate } from "@/lib/rules";
import { OWNERSHIP } from "@/lib/types";
import { OwnershipTag, SectionHead } from "@/components/bits";
import { SITE } from "@/lib/site";

export const revalidate = 3600;

/* Unlike the rules shelf, this corpus is a file rather than a table, so an
   unknown platform can never appear between builds. Anything not in the list
   is a typo or a dead link and should say so. */
export const dynamicParams = false;

export function generateStaticParams() {
  return ESP_PLATFORMS.map((p) => ({ platform: p.id }));
}

/**
 * The date on a row means different things at different publishers, and the
 * column has to say which. Rounding an API revision label and a product-update
 * date into one unlabelled "date" is a small lie that compounds.
 */
const DATE_KIND: Record<EspChangeDateKind, string> = {
  announced: "Announced",
  revision: "API revision",
  documented: "Doc updated",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ platform: string }>;
}): Promise<Metadata> {
  const { platform } = await params;
  const meta = await getEspPlatform(platform);
  if (!meta) return {};
  const changes = await getEspChanges(meta.id);
  const description = `Dated ${meta.name} changes that affect deliverability, consent or measurement — ${changes.length} verified against ${meta.name}'s own release notes, each linked to the rule it touches.`;
  return {
    title: `What ${meta.name} changed`,
    description,
    alternates: { canonical: `/esp/${meta.id}` },
    openGraph: { title: `What ${meta.name} changed — ${SITE.name}`, description },
  };
}

export default async function EspPlatformPage({
  params,
}: {
  params: Promise<{ platform: string }>;
}) {
  const { platform } = await params;
  const meta = await getEspPlatform(platform);
  if (!meta) notFound();

  const changes = await getEspChanges(meta.id);
  /* An empty ledger reads as thin coverage rather than as an honest gap, and
     the index already names the platforms we hold nothing for. */
  if (changes.length === 0) notFound();

  const rules = await getAllRules();
  const ruleBySlug = new Map(rules.map((r) => [r.slug, r]));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `What ${meta.name} changed`,
    url: `${SITE.url}/esp/${meta.id}`,
    isPartOf: { "@id": `${SITE.url}/#website` },
    hasPart: changes.map((c) => ({
      "@type": "Article",
      headline: c.title,
      url: `${SITE.url}/esp/${meta.id}#${c.id}`,
      ...(c.date ? { datePublished: c.date } : {}),
    })),
  };

  const oldestVerified = changes.reduce(
    (min, c) => (min === "" || c.lastVerified < min ? c.lastVerified : min),
    "",
  );

  return (
    <div className="shell shell-tight py-12 sm:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <p className="num mb-6 text-[12px] text-dim">
        <Link href="/esp" className="underline underline-offset-2 hover:text-fg">
          Platform changes
        </Link>
        <span className="mx-1.5" aria-hidden>
          /
        </span>
        {meta.name}
      </p>

      <SectionHead
        label="Platform ledger"
        title={`What ${meta.name} changed.`}
        lede={meta.note}
      />

      <div className="num flex flex-wrap items-baseline gap-x-4 gap-y-1 border-y border-fg/15 py-3 text-[12px] text-dim">
        <span>
          {changes.length} {changes.length === 1 ? "change" : "changes"}
        </span>
        <span aria-hidden>·</span>
        <span>verified {fmtDate(oldestVerified)}</span>
        <span aria-hidden>·</span>
        <span>
          read from{" "}
          {meta.watching.map((w, i) => (
            <span key={w.url}>
              {i > 0 ? ", " : ""}
              <a
                href={w.url}
                target="_blank"
                rel="noopener nofollow"
                className="underline underline-offset-2 hover:text-fg"
              >
                {w.label}
              </a>
            </span>
          ))}
        </span>
      </div>

      {/* Said once, here, rather than repeated under every row. */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-dim">
        {[...new Set(changes.map((c) => c.ownership))].map((o) => (
          <span key={o} className="inline-flex items-center gap-2">
            <OwnershipTag ownership={o} />
            {OWNERSHIP[o].blurb}
          </span>
        ))}
      </div>

      <div className="mt-6">
        {changes.map((change) => (
          <Entry
            key={change.id}
            change={change}
            ruleBySlug={ruleBySlug}
            platformName={meta.name}
          />
        ))}
      </div>

      <p className="mt-12 max-w-[62ch] text-[13px] leading-relaxed text-dim">
        Only changes that touch deliverability, consent, classification or a number you report are
        listed. {meta.name} ships far more than this; a builder getting a new toolbar is not a
        change to what is true about your programme. Missing something dated?{" "}
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

function Entry({
  change,
  ruleBySlug,
  platformName,
}: {
  change: EspChange;
  ruleBySlug: Map<string, { slug: string; title: string }>;
  platformName: string;
}) {
  const linked = (change.rules ?? [])
    .map((slug) => ruleBySlug.get(slug))
    .filter((r): r is { slug: string; title: string } => Boolean(r));

  return (
    <article
      id={change.id}
      className="grid scroll-mt-24 gap-x-8 gap-y-4 border-b border-border-soft py-8 last:border-b-0 sm:grid-cols-[7.5rem_1fr]"
    >
      <div>
        {change.date ? (
          <>
            <time dateTime={change.date} className="num block text-[13px] font-medium text-fg">
              {fmtDate(change.date)}
            </time>
            <span className="num mt-1 block text-[11px] text-dim">
              {DATE_KIND[change.dateKind]}
            </span>
          </>
        ) : (
          /* The corpus convention, kept verbatim: a publisher that prints no
             date gets said out loud rather than rounded to a plausible one. */
          <span className="num block text-[11px] leading-snug text-dim">
            Publisher states no date
          </span>
        )}
      </div>

      <div>
        {/* Tag only. The blurb behind it is identical on every row, so printing
            it each time is chrome; the legend above the ledger says it once. */}
        <OwnershipTag ownership={change.ownership} />

        <h2 className="mt-2.5 text-[1.05rem] leading-snug font-semibold tracking-tight sm:text-[1.1rem]">
          {change.title}
        </h2>

        <p className="mt-2.5 max-w-[62ch] text-[14px] leading-relaxed text-muted-fg">
          <span className="font-medium text-fg/75">What changed: </span>
          {change.changed}
        </p>
        <p className="mt-2.5 max-w-[62ch] text-[13.5px] leading-relaxed text-muted-fg">
          <span className="font-medium text-fg/75">Why it matters: </span>
          {change.matters}
        </p>
        <p className="mt-2.5 max-w-[62ch] text-[13.5px] leading-relaxed text-muted-fg">
          <span className="font-medium text-fg/75">Do next: </span>
          {change.next}
        </p>

        {linked.length > 0 ? (
          <div className="mt-4 border-l-2 border-accent/35 pl-4">
            <p className="label">
              {platformName} changed · these did not
            </p>
            <ul className="mt-2 list-none space-y-1.5 p-0">
              {linked.map((r) => (
                <li key={r.slug} className="text-[13.5px] leading-snug">
                  <Link
                    href={`/rules/${r.slug}`}
                    className="underline decoration-1 underline-offset-[3px] hover:text-accent"
                  >
                    {r.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <ul className="mt-4 list-none space-y-2.5 p-0">
          {change.sources.map((s) => (
            <li key={s.url} className="max-w-[62ch] text-[12.5px] leading-snug">
              <a
                href={s.url}
                target="_blank"
                rel="noopener nofollow"
                className="text-muted-fg underline decoration-1 underline-offset-[3px] hover:text-fg"
              >
                {s.name}
              </a>
              {/* Its own line, so a long citation cannot push the date into an
                  orphan and break the column this whole page is built on. */}
              <span className="num mt-0.5 block text-[11px] text-dim">
                {ESP_SOURCE_KIND[s.kind]}
                {" · "}
                {s.published ? fmtDate(s.published) : "publisher states no date"}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

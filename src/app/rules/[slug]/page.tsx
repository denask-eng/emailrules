import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllRules, getRule, fmtDate, daysSince } from "@/lib/rules";
import { TOPICS, STATUS_LABEL } from "@/lib/types";
import { SITE } from "@/lib/site";
import { StatusBadge } from "@/components/bits";

export const dynamicParams = false;

export async function generateStaticParams() {
  const rules = await getAllRules();
  return rules.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const rule = await getRule(slug);
  if (!rule) return {};

  // The question is the search query; lead the title with it.
  const title = rule.question;
  const description = `${rule.answer.slice(0, 155).trim()}…`;

  return {
    title,
    description,
    alternates: { canonical: `/rules/${rule.slug}` },
    openGraph: {
      type: "article",
      title: rule.title,
      description,
      url: `${SITE.url}/rules/${rule.slug}`,
      publishedTime: rule.added,
      modifiedTime: rule.updated,
      tags: [...rule.jurisdictions, TOPICS[rule.topic].label],
    },
    twitter: { card: "summary_large_image", title: rule.title, description },
    other: {
      "article:modified_time": rule.updated,
    },
  };
}

export default async function RulePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const rule = await getRule(slug);
  if (!rule) notFound();

  const all = await getAllRules();
  const related = (rule.related ?? [])
    .map((s) => all.find((r) => r.slug === s))
    .filter(Boolean) as typeof all;

  const stale = daysSince(rule.lastVerified) > 90;

  /**
   * Structured data. Three graphs on purpose:
   *  · FAQPage  — the single highest-value type here. It is what gets a rule
   *               quoted directly in an AI answer or a rich result.
   *  · Article  — gives the claim a publisher, a date and a modified date.
   *  · Breadcrumb — topic hierarchy, cheap and reliably parsed.
   */
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "FAQPage",
        "@id": `${SITE.url}/rules/${rule.slug}#faq`,
        mainEntity: [
          {
            "@type": "Question",
            name: rule.question,
            acceptedAnswer: { "@type": "Answer", text: rule.answer },
          },
          {
            "@type": "Question",
            name: `Who does "${rule.title}" apply to?`,
            acceptedAnswer: { "@type": "Answer", text: rule.appliesTo },
          },
          {
            "@type": "Question",
            name: `What happens if you do not comply with "${rule.title}"?`,
            acceptedAnswer: { "@type": "Answer", text: rule.enforcement },
          },
        ],
      },
      {
        "@type": "Article",
        "@id": `${SITE.url}/rules/${rule.slug}#article`,
        headline: rule.title,
        description: rule.answer,
        datePublished: rule.added,
        dateModified: rule.updated,
        inLanguage: "en",
        isAccessibleForFree: true,
        publisher: { "@id": `${SITE.url}/#org` },
        mainEntityOfPage: `${SITE.url}/rules/${rule.slug}`,
        citation: rule.sources.map((s) => ({
          "@type": "CreativeWork",
          name: s.name,
          url: s.url,
          datePublished: s.published,
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Rules", item: `${SITE.url}/rules` },
          {
            "@type": "ListItem",
            position: 2,
            name: TOPICS[rule.topic].label,
            item: `${SITE.url}/topics/${rule.topic}`,
          },
          { "@type": "ListItem", position: 3, name: rule.title },
        ],
      },
    ],
  };

  return (
    <article className="wrap wrap-narrow py-12 md:py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* breadcrumb */}
      <nav className="mb-6 text-[13px]" style={{ color: "var(--muted-fg)" }} aria-label="Breadcrumb">
        <Link href="/rules" className="underline underline-offset-2">
          Rules
        </Link>
        {" / "}
        <Link href={`/topics/${rule.topic}`} className="underline underline-offset-2">
          {TOPICS[rule.topic].label}
        </Link>
      </nav>

      <div className="mb-5 flex flex-wrap items-center gap-2.5 text-[13px]" style={{ color: "var(--muted-fg)" }}>
        <StatusBadge status={rule.status} />
        <span className="tabular">
          {rule.status === "upcoming" ? "from" : "since"} {fmtDate(rule.effectiveDate)}
        </span>
        <span aria-hidden>·</span>
        <span className="tabular">{rule.jurisdictions.join(" · ")}</span>
        {rule.provider ? (
          <>
            <span aria-hidden>·</span>
            <span className="tabular">{rule.provider}</span>
          </>
        ) : null}
      </div>

      <h1 className="text-[clamp(28px,4.4vw,42px)] font-semibold leading-[1.1]">{rule.title}</h1>

      <p
        className="mt-6 text-[20px] leading-[1.5]"
        style={{ fontFamily: "var(--serif)", maxWidth: "58ch" }}
      >
        {rule.answer}
      </p>

      {stale ? (
        <p
          className="card mt-6 p-4 text-[13.5px]"
          style={{ background: "var(--soon-bg)", color: "var(--soon)", borderColor: "transparent" }}
        >
          This page has not been re-verified in {daysSince(rule.lastVerified)} days. Treat it as
          probably current, not certainly current.
        </p>
      ) : null}

      <Block title="Who this applies to">
        <p className="prose-rule m-0">{rule.appliesTo}</p>
      </Block>

      <Block title="What to do">
        <ul className="prose-rule m-0 list-disc space-y-2 pl-5">
          {rule.whatToDo.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      </Block>

      {rule.exempt ? (
        <Block title="What is exempt">
          <p className="prose-rule m-0">{rule.exempt}</p>
        </Block>
      ) : null}

      <Block title="What happens if you do not">
        <p className="prose-rule m-0">{rule.enforcement}</p>
      </Block>

      <Block title={rule.sources.length > 1 ? "Sources" : "Source"}>
        <div className="space-y-3">
          {rule.sources.map((s) => (
            <div
              key={s.url}
              className="rounded-lg p-4 text-[13.5px] leading-relaxed"
              style={{ background: "var(--muted)", color: "var(--muted-fg)" }}
            >
              <div style={{ color: "var(--fg)" }}>{s.name}</div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span className="tabular text-[12px]">Published {fmtDate(s.published)}</span>
                <span aria-hidden>·</span>
                <a
                  href={s.url}
                  rel="noopener nofollow"
                  target="_blank"
                  className="underline underline-offset-2"
                  style={{ color: "var(--primary)" }}
                >
                  Read the source
                </a>
              </div>
            </div>
          ))}
        </div>
      </Block>

      {related.length ? (
        <Block title="Related">
          <ul className="prose-rule m-0 list-disc space-y-2 pl-5">
            {related.map((r) => (
              <li key={r.slug}>
                <Link href={`/rules/${r.slug}`}>{r.title}</Link>{" "}
                <span className="text-[13px]">({STATUS_LABEL[r.status]})</span>
              </li>
            ))}
          </ul>
        </Block>
      ) : null}

      <Block title="History of this page">
        <ul className="m-0 list-none space-y-2 p-0">
          {rule.changelog.map((c) => (
            <li key={c.date} className="flex gap-4 text-[13.5px]">
              <time className="tabular shrink-0" style={{ color: "var(--muted-fg)" }} dateTime={c.date}>
                {fmtDate(c.date)}
              </time>
              <span style={{ color: "var(--muted-fg)" }}>{c.note}</span>
            </li>
          ))}
        </ul>
      </Block>

      <footer
        className="tabular mt-8 pt-5 text-[12px] leading-loose"
        style={{ borderTop: "1px solid var(--border)", color: "var(--muted-fg)" }}
      >
        Added {fmtDate(rule.added)} · Updated {fmtDate(rule.updated)} · Last verified{" "}
        {fmtDate(rule.lastVerified)}
        <br />
        Something wrong or out of date?{" "}
        <a
          href={`mailto:${SITE.contact}?subject=Correction: ${rule.slug}`}
          className="underline underline-offset-2"
          style={{ color: "var(--primary)" }}
        >
          Tell us
        </a>
        . Corrections are published with a date and a credit.
      </footer>
    </article>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="py-6" style={{ borderTop: "1px solid var(--border)", marginTop: 24 }}>
      <h2 className="mb-3 text-[15px] font-semibold">{title}</h2>
      {children}
    </section>
  );
}

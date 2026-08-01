import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllRules, getRule, fmtDate, daysSince } from "@/lib/rules";
import { TOPICS, STATUS_LABEL } from "@/lib/types";
import { SITE } from "@/lib/site";
import { StatusTag } from "@/components/bits";

/* One column, no app shell. These pages are read by strangers who arrived from
   a search result: the finding first, the method at the bottom for the people
   who will check it. */
const SHELL =
  "mx-auto max-w-[780px] px-[clamp(1.1rem,4vw,1.6rem)] pt-[clamp(1.1rem,4vw,2.4rem)] pb-16";

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
  const description = `${rule.answer.slice(0, 155).trim()}…`;
  return {
    title: rule.question,
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

  const age = daysSince(rule.lastVerified);

  /* FAQPage is what gets quoted directly in an AI answer; Article gives the
     claim a publisher and a modified date; Breadcrumb is cheap and reliable. */
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "FAQPage",
        "@id": `${SITE.url}/rules/${rule.slug}#faq`,
        mainEntity: [
          { "@type": "Question", name: rule.question, acceptedAnswer: { "@type": "Answer", text: rule.answer } },
          { "@type": "Question", name: `Who does this apply to?`, acceptedAnswer: { "@type": "Answer", text: rule.appliesTo } },
          { "@type": "Question", name: `What happens if you do not comply?`, acceptedAnswer: { "@type": "Answer", text: rule.enforcement } },
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
        author: { "@id": `${SITE.url}/#author` },
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
          { "@type": "ListItem", position: 2, name: TOPICS[rule.topic].label, item: `${SITE.url}/topics/${rule.topic}` },
          { "@type": "ListItem", position: 3, name: rule.title },
        ],
      },
    ],
  };

  return (
    <article className={SHELL}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="m mb-6 text-[0.7rem] tracking-[0.08em] text-mute uppercase" aria-label="Breadcrumb">
        <Link href="/rules" className="no-underline hover:text-ink">Rules</Link>
        <span className="px-1.5">/</span>
        <Link href={`/topics/${rule.topic}`} className="no-underline hover:text-ink">
          {TOPICS[rule.topic].label}
        </Link>
      </nav>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <StatusTag status={rule.status} />
        <span className="m text-[0.74rem] text-mute">
          {rule.status === "upcoming" ? "from" : "since"} {fmtDate(rule.effectiveDate)}
          {" · "}
          {rule.jurisdictions.join(" · ")}
          {rule.provider ? ` · ${rule.provider}` : ""}
        </span>
      </div>

      <h1 className="mt-4 text-[clamp(1.9rem,5.2vw,2.9rem)]">{rule.title}</h1>

      <p className="mt-6 max-w-[64ch] text-[1.12rem] leading-relaxed text-ink">{rule.answer}</p>

      {age > 90 ? (
        <p className="m mt-6 border border-warn/40 bg-warn-bg px-4 py-3 text-[0.78rem] leading-relaxed text-warn">
          Not re-verified in {age} days. Treat as probably current, not certainly current.
        </p>
      ) : null}

      <Block title="Who this applies to">
        <p className="prose-rule m-0 text-[0.96rem] leading-relaxed">{rule.appliesTo}</p>
      </Block>

      <Block title="What to do">
        <ul className="prose-rule m-0 list-none p-0 text-[0.96rem]">
          {rule.whatToDo.map((w) => (
            <li key={w} className="border-b border-rule-soft py-2.5 leading-relaxed last:border-b-0">
              {w}
            </li>
          ))}
        </ul>
      </Block>

      {rule.exempt ? (
        <Block title="What is exempt">
          <p className="prose-rule m-0 text-[0.96rem] leading-relaxed">{rule.exempt}</p>
        </Block>
      ) : null}

      <Block title="What happens if you do not">
        <p className="prose-rule m-0 text-[0.96rem] leading-relaxed">{rule.enforcement}</p>
      </Block>

      <Block title={rule.sources.length > 1 ? "Sources" : "Source"}>
        <ul className="list-none p-0">
          {rule.sources.map((s) => (
            <li key={s.url} className="border-b border-rule-soft py-3 last:border-b-0">
              <div className="text-[0.94rem] leading-snug">{s.name}</div>
              <div className="m mt-1.5 flex flex-wrap items-center gap-2 text-[0.72rem] text-mute">
                <span>Published {fmtDate(s.published)}</span>
                <span aria-hidden>·</span>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener nofollow"
                  className="underline underline-offset-2 hover:text-ink"
                >
                  Read it
                </a>
              </div>
            </li>
          ))}
        </ul>
      </Block>

      {related.length ? (
        <Block title="Related">
          <ul className="list-none p-0">
            {related.map((r) => (
              <li key={r.slug} className="border-b border-rule-soft py-2.5 last:border-b-0">
                <Link href={`/rules/${r.slug}`} className="text-[0.94rem] no-underline hover:underline hover:underline-offset-2">
                  {r.title}
                </Link>
                <span className="m ml-2 text-[0.7rem] text-mute">{STATUS_LABEL[r.status]}</span>
              </li>
            ))}
          </ul>
        </Block>
      ) : null}

      <Block title="History of this page">
        <ul className="list-none p-0">
          {rule.changelog.map((c) => (
            <li key={c.date} className="flex flex-wrap gap-x-3 border-b border-rule-soft py-2.5 last:border-b-0">
              <time dateTime={c.date} className="m w-[5.6rem] shrink-0 text-[0.74rem] text-mute">
                {fmtDate(c.date)}
              </time>
              <span className="flex-1 text-[0.9rem] leading-relaxed text-ink-soft">{c.note}</span>
            </li>
          ))}
        </ul>
      </Block>

      <footer className="m mt-10 border-t border-rule pt-4 text-[0.68rem] leading-loose tracking-[0.04em] text-mute">
        Added {fmtDate(rule.added)} · Updated {fmtDate(rule.updated)} · Last verified{" "}
        {fmtDate(rule.lastVerified)}
        <br />
        Wrong or out of date?{" "}
        <a
          href={`mailto:${SITE.contact}?subject=Correction: ${rule.slug}`}
          className="underline underline-offset-2 hover:text-ink"
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
    <section className="mt-10">
      <h2 className="m border-b border-ink pb-2.5 text-[0.7rem] font-bold tracking-[0.11em] text-ink uppercase">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

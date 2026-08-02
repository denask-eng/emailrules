import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllRules, getRule, fmtDate, daysSince } from "@/lib/rules";
import { TOPICS, STATUS_LABEL, JURISDICTIONS } from "@/lib/types";
import { SITE } from "@/lib/site";
import { StatusPill, OwnershipBlock, MondayMorning } from "@/components/bits";
import { Explained } from "@/components/explained";
import { impactOf, IMPACT_LABEL, whyItMatters } from "@/lib/rule-signals";
import { displayPlain, displayTldr, displayWhy } from "@/content/plain-overrides";

/* One column, no app shell. These pages are read by strangers who arrived from
   a search result: the finding first, the method at the bottom for the people
   who will check it. */
const SHELL =
  "mx-auto max-w-[780px] px-[clamp(1.1rem,4vw,1.6rem)] pt-[clamp(1.1rem,4vw,2.4rem)] pb-16";

/* New rules added in /admin must get a URL without a rebuild, so unknown
   slugs render on demand instead of 404ing. */
export const dynamicParams = true;
export const revalidate = 3600;

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

      <nav className="num mb-6 text-[0.7rem] tracking-[0.08em] text-dim uppercase" aria-label="Breadcrumb">
        <Link href="/rules" className="no-underline hover:text-fg">Rules</Link>
        <span className="px-1.5">/</span>
        <Link href={`/topics/${rule.topic}`} className="no-underline hover:text-fg">
          {TOPICS[rule.topic].label}
        </Link>
      </nav>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <StatusPill status={rule.status} />
        <span className="inline-flex rounded-full border bg-bg-2 px-2 py-0.5 text-[11px] font-medium text-muted-fg">
          {IMPACT_LABEL[impactOf(rule)]}
        </span>
        <span className="num text-[0.74rem] text-dim">
          {rule.status === "upcoming" ? "Starts " : "In force since "}
          {fmtDate(rule.effectiveDate)}
        </span>
      </div>

      <p className="mt-3 max-w-[64ch] text-[13px] leading-relaxed text-muted-fg">
        Applies in{" "}
        {rule.jurisdictions.map((j, i) => (
          <span key={j}>
            {i > 0 ? ", " : ""}
            <Link
              href={`/jurisdictions/${j.toLowerCase()}`}
              className="font-medium text-fg underline underline-offset-2"
            >
              {JURISDICTIONS[j]?.label ?? j}
            </Link>
          </span>
        ))}
        {rule.provider ? (
          <>
            {" "}
            · about <span className="font-medium text-fg">{rule.provider}</span>
          </>
        ) : null}
        .{" "}
        <Link href="/glossary" className="underline underline-offset-2">
          Glossary
        </Link>
      </p>

      <h1 className="mt-4 text-[clamp(1.9rem,5.2vw,2.9rem)]">{rule.title}</h1>

      {/* One sentence — junior-proof */}
      <div className="mt-6 max-w-[64ch] rounded-xl border border-accent/25 bg-accent-soft px-5 py-4">
        <p className="label text-accent">In one sentence</p>
        <Explained
          as="p"
          className="mt-2 text-[1.05rem] leading-relaxed font-medium text-fg"
          text={displayTldr(rule.slug, rule.plain)}
        />
      </div>

      {/* L1 — everyone */}
      <p className="label mt-8">In plain English</p>
      <Explained
        as="p"
        className="mt-2 max-w-[64ch] text-[1.12rem] leading-relaxed text-fg"
        text={displayPlain(rule.slug, rule.plain)}
      />

      <div className="mt-5 max-w-[64ch] rounded-lg border border-border-soft bg-bg-2 px-4 py-3 text-[14px] leading-relaxed text-muted-fg">
        <b className="text-fg">Why it matters: </b>
        <Explained
          as="span"
          text={displayWhy(rule.slug, whyItMatters({ ...rule, plain: displayPlain(rule.slug, rule.plain) }))}
        />
      </div>

      <OwnershipBlock rule={rule} />
      <MondayMorning rule={rule} />

      <p className="mt-6 text-[12.5px] text-dim">
        Dotted words open short definitions. Full dictionary:{" "}
        <Link href="/glossary" className="underline underline-offset-2">
          glossary
        </Link>
        .
      </p>

      {age > 90 ? (
        <p className="num mt-6 border border-soon/40 bg-soon-bg px-4 py-3 text-[0.78rem] leading-relaxed text-soon">
          Not re-verified in {age} days. Treat as probably current, not certainly current.
        </p>
      ) : null}

      {/* L2 — at work */}
      <div className="mt-12 border-t pt-10">
        <p className="label">At work</p>
        <h2 className="mt-2 text-[1.2rem] font-semibold">Details for getting it done</h2>
      </div>

      <Block title="Who this applies to">
        <Explained as="p" className="prose-rule m-0 text-[0.96rem] leading-relaxed" text={rule.appliesTo} />
      </Block>

      <Block title="Checklist">
        <ul className="prose-rule m-0 list-none p-0 text-[0.96rem]">
          {rule.whatToDo.map((w) => (
            <li key={w} className="border-b border-border-soft py-2.5 leading-relaxed last:border-b-0">
              <Explained text={w} />
            </li>
          ))}
        </ul>
      </Block>

      {rule.exempt ? (
        <Block title="Exceptions (when this does not apply)">
          <Explained as="p" className="prose-rule m-0 text-[0.96rem] leading-relaxed" text={rule.exempt} />
        </Block>
      ) : null}

      {/* L3 — proof */}
      <div className="mt-12 border-t pt-10">
        <p className="label">For experts &amp; records</p>
        <h2 className="mt-2 text-[1.2rem] font-semibold">Exact wording, enforcement, sources</h2>
        <p className="mt-2 max-w-[58ch] text-[13.5px] text-muted-fg">
          Same facts as above, written for precision and citation. Skip if you already know what to do.
        </p>
      </div>

      <Block title="The exact position">
        <Explained as="p" className="prose-rule m-0 text-[0.96rem] leading-relaxed" text={rule.answer} />
      </Block>

      <Block title="What happens if you do not">
        <Explained
          as="p"
          className="prose-rule m-0 text-[0.96rem] leading-relaxed"
          text={rule.enforcement}
        />
      </Block>

      <Block title={rule.sources.length > 1 ? "Sources" : "Source"}>
        <ul className="list-none p-0">
          {rule.sources.map((s) => (
            <li key={s.url} className="border-b border-border-soft py-3 last:border-b-0">
              <div className="text-[0.94rem] leading-snug">{s.name}</div>
              <div className="num mt-1.5 flex flex-wrap items-center gap-2 text-[0.72rem] text-dim">
                <span>
                  {s.published ? `Published ${fmtDate(s.published)}` : "Publisher states no date"}
                </span>
                <span aria-hidden>·</span>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener nofollow"
                  className="underline underline-offset-2 hover:text-fg"
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
              <li key={r.slug} className="border-b border-border-soft py-2.5 last:border-b-0">
                <Link href={`/rules/${r.slug}`} className="text-[0.94rem] no-underline hover:underline hover:underline-offset-2">
                  {r.title}
                </Link>
                <span className="num ml-2 text-[0.7rem] text-dim">{STATUS_LABEL[r.status]}</span>
              </li>
            ))}
          </ul>
        </Block>
      ) : null}

      <Block title="History of this page">
        <ul className="list-none p-0">
          {rule.changelog.map((c) => (
            <li key={c.date} className="flex flex-wrap gap-x-3 border-b border-border-soft py-2.5 last:border-b-0">
              <time dateTime={c.date} className="num w-[5.6rem] shrink-0 text-[0.74rem] text-dim">
                {fmtDate(c.date)}
              </time>
              <span className="flex-1 text-[0.9rem] leading-relaxed text-muted-fg">{c.note}</span>
            </li>
          ))}
        </ul>
      </Block>

      <footer className="num mt-10 border-t border-border pt-4 text-[0.68rem] leading-loose tracking-[0.04em] text-dim">
        Added {fmtDate(rule.added)} · Updated {fmtDate(rule.updated)} · Last verified{" "}
        {fmtDate(rule.lastVerified)}
        <br />
        Wrong or out of date?{" "}
        <a
          href={`mailto:${SITE.contact}?subject=Correction: ${rule.slug}`}
          className="underline underline-offset-2 hover:text-fg"
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
      <h2 className="num border-b border-fg pb-2.5 text-[0.7rem] font-bold tracking-[0.11em] text-fg uppercase">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

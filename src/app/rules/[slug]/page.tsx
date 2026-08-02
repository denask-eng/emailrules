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
import { resolveEspApplicability, espLabel, type EspId } from "@/lib/audience";

/* Search traffic lands here cold: one column, plain first, proof last. */
const SHELL =
  "mx-auto max-w-[40rem] px-[clamp(1.1rem,4vw,1.6rem)] pt-[clamp(1.25rem,4vw,2.2rem)] pb-20";

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
  const plain = displayPlain(rule.slug, rule.plain);
  const tldr = displayTldr(rule.slug, plain);
  const description = tldr.length > 155 ? `${tldr.slice(0, 152).trim()}…` : tldr;
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
  const plain = displayPlain(rule.slug, rule.plain);
  const tldr = displayTldr(rule.slug, plain);
  const why = displayWhy(rule.slug, whyItMatters({ ...rule, plain }));
  const espScope = resolveEspApplicability(rule);
  const espNote =
    Array.isArray(espScope)
      ? espScope.map((id) => espLabel(id as EspId)).filter(Boolean).join(" · ")
      : espScope === "mainstream"
        ? "Mainstream ESPs (Klaviyo, Mailchimp, Braze, HubSpot, SFMC, and similar)"
        : null;

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
            name: "In plain English?",
            acceptedAnswer: { "@type": "Answer", text: plain },
          },
          {
            "@type": "Question",
            name: "Who does this apply to?",
            acceptedAnswer: { "@type": "Answer", text: rule.appliesTo },
          },
          {
            "@type": "Question",
            name: "What happens if you do not?",
            acceptedAnswer: { "@type": "Answer", text: rule.enforcement },
          },
        ],
      },
      {
        "@type": "Article",
        "@id": `${SITE.url}/rules/${rule.slug}#article`,
        headline: rule.title,
        description: tldr,
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
    <article className={SHELL}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="mb-5 flex flex-wrap items-center gap-x-2 text-[12.5px] text-dim" aria-label="Breadcrumb">
        <Link href="/rules" className="hover:text-fg">
          Rules
        </Link>
        <span aria-hidden>/</span>
        <Link href={`/topics/${rule.topic}`} className="hover:text-fg">
          {TOPICS[rule.topic].label}
        </Link>
      </nav>

      {/* Meta line — status + where, not a badge pile */}
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
        <StatusPill status={rule.status} />
        <span className="text-[12px] text-muted-fg">{IMPACT_LABEL[impactOf(rule)]}</span>
        <span className="num text-[12px] text-dim">
          {rule.status === "upcoming" ? "Starts " : "In force "}
          {fmtDate(rule.effectiveDate)}
        </span>
      </div>

      <h1 className="mt-4 text-[clamp(1.75rem,4.8vw,2.55rem)] font-semibold tracking-tight">
        {rule.title}
      </h1>
      <p className="mt-2 max-w-[36rem] text-[15px] leading-snug text-muted-fg">{rule.question}</p>

      <p className="mt-3 max-w-[36rem] text-[13px] leading-relaxed text-dim">
        {rule.jurisdictions.map((j, i) => (
          <span key={j}>
            {i > 0 ? " · " : ""}
            <Link
              href={`/jurisdictions/${j.toLowerCase()}`}
              className="font-medium text-muted-fg underline decoration-border underline-offset-2 hover:text-fg"
            >
              {JURISDICTIONS[j]?.label ?? j}
            </Link>
          </span>
        ))}
        {rule.provider && !espNote ? (
          <>
            {" · "}
            <span className="font-medium text-muted-fg">{rule.provider}</span>
          </>
        ) : null}
        {espNote ? (
          <>
            {" · "}
            <span className="font-medium text-muted-fg">Tool: {espNote}</span>
          </>
        ) : null}
      </p>

      {/* Jump — understand → act → prove */}
      <nav
        className="mt-6 flex flex-wrap gap-x-4 gap-y-1 border-y border-border-soft py-2.5 text-[12.5px]"
        aria-label="On this page"
      >
        <a href="#understand" className="font-medium text-fg hover:text-accent">
          Understand
        </a>
        <a href="#act" className="text-muted-fg hover:text-fg">
          What to do
        </a>
        <a href="#prove" className="text-muted-fg hover:text-fg">
          Proof &amp; sources
        </a>
        <Link href="/glossary" className="text-dim hover:text-fg">
          Glossary
        </Link>
      </nav>

      {age > 90 ? (
        <p className="mt-5 rounded-xl border border-soon/35 bg-soon-bg px-4 py-3 text-[13px] leading-relaxed text-soon">
          Not re-verified in {age} days. Treat as probably current, not certainly current.
        </p>
      ) : null}

      {/* UNDERSTAND */}
      <section id="understand" className="mt-8 scroll-mt-20">
        <p className="label text-accent">In one sentence</p>
        <Explained
          as="p"
          className="mt-2 text-[1.12rem] font-medium leading-relaxed tracking-tight text-fg sm:text-[1.18rem]"
          text={tldr}
        />

        <p className="label mt-8">Plain English</p>
        <Explained as="p" className="mt-2 text-[1.05rem] leading-relaxed text-fg" text={plain} />

        <div className="mt-5 border-l-2 border-accent/40 pl-4">
          <p className="text-[14.5px] leading-relaxed text-muted-fg">
            <span className="font-semibold text-fg">Why it matters. </span>
            <Explained as="span" text={why} />
          </p>
        </div>

        <p className="mt-4 text-[12.5px] text-dim">
          Dotted words open definitions.{" "}
          <Link href="/glossary" className="underline underline-offset-2 hover:text-fg">
            Full glossary
          </Link>
          .
        </p>
      </section>

      {/* ACT */}
      <section id="act" className="mt-12 scroll-mt-20 border-t border-fg/10 pt-10">
        <p className="label">What to do</p>
        <h2 className="mt-1.5 text-[1.25rem] font-semibold tracking-tight">Your move — not a lecture</h2>

        <OwnershipBlock rule={rule} />
        <MondayMorning rule={rule} />

        <div className="mt-8">
          <h3 className="text-[13px] font-semibold tracking-wide text-fg uppercase">
            Who this applies to
          </h3>
          <Explained
            as="p"
            className="mt-2 text-[15px] leading-relaxed text-muted-fg"
            text={rule.appliesTo}
          />
        </div>

        <div className="mt-8">
          <h3 className="text-[13px] font-semibold tracking-wide text-fg uppercase">Checklist</h3>
          <ul className="mt-2 list-none p-0">
            {rule.whatToDo.map((w, i) => (
              <li
                key={`${i}-${w.slice(0, 24)}`}
                className="flex gap-3 border-b border-border-soft py-3 text-[15px] leading-relaxed last:border-b-0"
              >
                <span className="num shrink-0 text-[12px] text-dim">{String(i + 1).padStart(2, "0")}</span>
                <Explained text={w} />
              </li>
            ))}
          </ul>
        </div>

        {rule.exempt ? (
          <div className="mt-8 rounded-xl border border-border-soft bg-bg-2 px-4 py-4">
            <h3 className="text-[13px] font-semibold text-fg">Skip if</h3>
            <Explained
              as="p"
              className="mt-1.5 text-[14.5px] leading-relaxed text-muted-fg"
              text={rule.exempt}
            />
          </div>
        ) : null}

        <p className="mt-8 rounded-2xl border border-ok/25 bg-ok-bg px-4 py-3.5 text-[14px] leading-relaxed text-ok">
          <b className="font-semibold">That&rsquo;s enough to act. </b>
          Sources and exact wording are below for counsel, bosses, or AI tools that need a citation.
          Not legal advice.
        </p>
      </section>

      {/* PROVE */}
      <section id="prove" className="mt-12 scroll-mt-20 border-t border-fg/10 pt-10">
        <p className="label">Proof</p>
        <h2 className="mt-1.5 text-[1.25rem] font-semibold tracking-tight">
          Exact position, enforcement, sources
        </h2>
        <p className="mt-2 max-w-[34rem] text-[13.5px] text-muted-fg">
          For records and people who will check you. Skip if Monday&rsquo;s move is already clear.
        </p>

        <div className="mt-8">
          <h3 className="text-[13px] font-semibold tracking-wide uppercase">The exact position</h3>
          <Explained
            as="p"
            className="mt-2 text-[15px] leading-relaxed text-muted-fg"
            text={rule.answer}
          />
        </div>

        <div className="mt-8">
          <h3 className="text-[13px] font-semibold tracking-wide uppercase">
            What happens if you do not
          </h3>
          <Explained
            as="p"
            className="mt-2 text-[15px] leading-relaxed text-muted-fg"
            text={rule.enforcement}
          />
        </div>

        <div className="mt-8">
          <h3 className="text-[13px] font-semibold tracking-wide uppercase">
            {rule.sources.length > 1 ? "Sources" : "Source"}
          </h3>
          <ul className="mt-2 list-none p-0">
            {rule.sources.map((s) => (
              <li key={s.url} className="border-b border-border-soft py-3 last:border-b-0">
                <div className="text-[15px] leading-snug text-fg">{s.name}</div>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[12px] text-dim">
                  <span className="num">
                    {s.published ? `Published ${fmtDate(s.published)}` : "No publisher date"}
                  </span>
                  <span aria-hidden>·</span>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener nofollow"
                    className="font-medium text-accent underline underline-offset-2"
                  >
                    Read primary source
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {related.length ? (
          <div className="mt-8">
            <h3 className="text-[13px] font-semibold tracking-wide uppercase">Related</h3>
            <ul className="mt-2 list-none p-0">
              {related.map((r) => (
                <li key={r.slug} className="border-b border-border-soft py-2.5 last:border-b-0">
                  <Link
                    href={`/rules/${r.slug}`}
                    className="text-[15px] font-medium underline-offset-2 hover:underline"
                  >
                    {r.title}
                  </Link>
                  <span className="num ml-2 text-[11px] text-dim">{STATUS_LABEL[r.status]}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-8">
          <h3 className="text-[13px] font-semibold tracking-wide uppercase">History of this page</h3>
          <ul className="mt-2 list-none p-0">
            {rule.changelog.map((c, i) => (
              <li
                key={`${c.date}-${i}-${c.note.slice(0, 20)}`}
                className="flex flex-wrap gap-x-3 border-b border-border-soft py-2.5 last:border-b-0"
              >
                <time dateTime={c.date} className="num w-[5.5rem] shrink-0 text-[12px] text-dim">
                  {fmtDate(c.date)}
                </time>
                <span className="min-w-0 flex-1 text-[14px] leading-relaxed text-muted-fg">
                  {c.note}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="mt-12 border-t pt-5 text-[12.5px] leading-relaxed text-dim">
        <p>
          Added {fmtDate(rule.added)} · Updated {fmtDate(rule.updated)} · Last verified{" "}
          {fmtDate(rule.lastVerified)}
        </p>
        <p className="mt-2">
          Wrong or stale?{" "}
          <a
            href={`mailto:${SITE.contact}?subject=Correction: ${rule.slug}`}
            className="text-fg underline underline-offset-2"
          >
            Tell us
          </a>
          . Corrections publish with a date. Not legal advice.
        </p>
        <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1">
          <Link href="/rules" className="font-medium text-accent hover:underline">
            ← Back to my rules
          </Link>
          <Link href="/brief" className="hover:text-fg hover:underline">
            Team brief
          </Link>
          <Link href="/changed" className="hover:text-fg hover:underline">
            What changed
          </Link>
        </p>
      </footer>
    </article>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  GLOSSARY,
  STAGES,
  GLOSSARY_BY_ID,
  GLOSSARY_IN_ORDER,
  STAGE_BY_ID,
  LEVEL_LABEL,
  OWNER_LABEL,
  type GlossaryTerm,
} from "@/content/how-email-works";
import { SITE } from "@/lib/site";
import { getAllRules } from "@/lib/rules";
import { Specimen } from "@/components/how-email-works/specimen";
import { Threshold } from "@/components/how-email-works/diagrams";
import { cn } from "@/lib/utils";

/* Same one-column reading measure as a rule page: search traffic lands here
   cold and the first job is a plain answer, not an apparatus. */
const SHELL =
  "mx-auto max-w-[42rem] px-[clamp(1.1rem,4vw,1.6rem)] pt-[clamp(1.25rem,4vw,2.2rem)] pb-20";

export const revalidate = 3600;

export function generateStaticParams() {
  return GLOSSARY.map((t) => ({ term: t.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ term: string }>;
}): Promise<Metadata> {
  const { term } = await params;
  const t = GLOSSARY_BY_ID.get(term);
  if (!t) return {};
  const stage = STAGE_BY_ID.get(t.stage);
  return {
    title: `What is ${t.term}?`,
    description: t.short.length > 155 ? `${t.short.slice(0, 152).trim()}…` : t.short,
    alternates: { canonical: `/how-email-works/${t.id}` },
    openGraph: {
      type: "article",
      title: `${t.term} — in plain English`,
      description: t.sayIt,
      url: `${SITE.url}/how-email-works/${t.id}`,
      tags: stage ? [stage.name, LEVEL_LABEL[t.level].short] : undefined,
    },
  };
}

const OWNER_TONE: Record<GlossaryTerm["owner"], { box: string; text: string }> = {
  yours: { box: "border-accent/30 bg-accent-soft", text: "text-accent" },
  esp: { box: "border-ok/35 bg-ok-bg", text: "text-ok" },
  shared: { box: "border-soon/35 bg-soon-bg", text: "text-soon" },
  context: { box: "border-border bg-bg-2", text: "text-muted-fg" },
};

function Block({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mt-10", className)}>
      <h2 className="text-[13px] font-semibold tracking-wide uppercase">{label}</h2>
      {children}
    </section>
  );
}

export default async function TermPage({ params }: { params: Promise<{ term: string }> }) {
  const { term } = await params;
  const t = GLOSSARY_BY_ID.get(term);
  if (!t) notFound();

  const stage = STAGE_BY_ID.get(t.stage)!;
  const tone = OWNER_TONE[t.owner];

  /* Rule slugs are validated against the live corpus rather than trusted.
     The corpus is edited in /admin and a slug can move; a glossary page must
     never be the thing that ships a 404 into the middle of a definition. */
  const allRules = await getAllRules();
  const bySlug = new Map(allRules.map((r) => [r.slug, r]));
  const rules = (t.rules ?? []).map((s) => bySlug.get(s)).filter(Boolean) as typeof allRules;

  const seeAlso = (t.seeAlso ?? [])
    .map((id) => GLOSSARY_BY_ID.get(id))
    .filter(Boolean) as GlossaryTerm[];

  const idx = GLOSSARY_IN_ORDER.findIndex((x) => x.id === t.id);
  const prev = idx > 0 ? GLOSSARY_IN_ORDER[idx - 1] : null;
  const next = idx < GLOSSARY_IN_ORDER.length - 1 ? GLOSSARY_IN_ORDER[idx + 1] : null;

  const faq = [
    { q: `What is ${t.term}?`, a: t.long },
    t.goesWrong ? { q: `What usually goes wrong with ${t.term}?`, a: t.goesWrong } : null,
    { q: `Is ${t.term} my job or my email platform's?`, a: OWNER_LABEL[t.owner].long + "." },
    t.myth ? { q: t.myth.claim, a: t.myth.truth } : null,
  ].filter(Boolean) as { q: string; a: string }[];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "DefinedTerm",
        "@id": `${SITE.url}/how-email-works/${t.id}#term`,
        name: t.term,
        alternateName: t.aliases.filter((a) => a.toLowerCase() !== t.term.toLowerCase()),
        description: t.long,
        url: `${SITE.url}/how-email-works/${t.id}`,
        inDefinedTermSet: { "@id": `${SITE.url}/how-email-works#set` },
        inLanguage: "en",
      },
      {
        "@type": "FAQPage",
        "@id": `${SITE.url}/how-email-works/${t.id}#faq`,
        mainEntity: faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "How email works", item: `${SITE.url}/how-email-works` },
          { "@type": "ListItem", position: 2, name: stage.name, item: `${SITE.url}/how-email-works#${stage.id}` },
          { "@type": "ListItem", position: 3, name: t.term },
        ],
      },
    ],
  };

  return (
    <article className={SHELL}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* The sitewide FAQ closes every page in the layout. A term page has to
          close on its own related rules and the next word on the journey. */}
      <style>{`#faq{display:none}`}</style>

      <nav className="mb-5 flex flex-wrap items-center gap-x-2 text-[12.5px] text-dim" aria-label="Breadcrumb">
        <Link href="/how-email-works" className="inline-flex h-11 items-center hover:text-fg sm:h-auto">
          How email works
        </Link>
        <span aria-hidden>/</span>
        <Link href={`/how-email-works#${stage.id}`} className="inline-flex h-11 items-center hover:text-fg sm:h-auto">
          {stage.name}
        </Link>
      </nav>

      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
        <span className="num text-[11.5px] text-accent">
          Stop {stage.n} of {STAGES.length}
        </span>
        <span className="text-[12px] text-dim" aria-hidden>
          ·
        </span>
        <span className="text-[12px] text-muted-fg">{LEVEL_LABEL[t.level].short}</span>
        <span className="text-[12px] text-dim" aria-hidden>
          ·
        </span>
        <span className="num text-[12px] text-dim">{stage.when}</span>
      </div>

      <h1 className="mt-3.5 text-[clamp(1.9rem,5vw,2.6rem)] font-semibold tracking-tight">
        {t.term}
      </h1>

      <p className="mt-3 max-w-[36rem] text-[1.12rem] leading-relaxed text-fg sm:text-[1.18rem]">
        {t.short}
      </p>

      {/* The sentence a marketer can repeat in a meeting without understanding
          any of the machinery. On a page like this it is the most useful line
          on the screen and it goes above the technical prose, not below it. */}
      <div className="mt-6 rounded-xl border border-accent/25 bg-accent-soft px-5 py-4">
        <p className="label text-accent">Say it out loud</p>
        <p className="mt-2 max-w-[40ch] text-[1.02rem] leading-relaxed text-fg">
          &ldquo;{t.sayIt}&rdquo;
        </p>
      </div>

      <p className="mt-7 max-w-[38rem] text-[1.02rem] leading-relaxed text-muted-fg">{t.long}</p>

      {/* Every figure carries where it comes from. A number in a definition
          with no source is folklore wearing a uniform. */}
      {t.figures?.length ? (
        <dl className="mt-6 border-y border-border-soft py-1">
          {t.figures.map((f) => (
            <div
              key={f.k}
              className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-b border-border-soft py-2.5 last:border-b-0 sm:grid sm:grid-cols-[6.5rem_1fr_auto]"
            >
              <dd className="num text-[15px] font-semibold text-fg">{f.v}</dd>
              <dt className="text-[13px] text-muted-fg">{f.k}</dt>
              <dd className="num text-[11px] text-dim">{f.src}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {t.gauge ? (
        <div className="mt-9">
          <Threshold gauge={t.gauge} />
        </div>
      ) : null}

      {t.specimen ? (
        <div className="mt-9">
          <Specimen data={t.specimen} />
        </div>
      ) : null}

      {/* Whose job it is. The site's whole differentiator, applied to a word
          rather than to a rule: half of what frightens people about email is
          already done for them and nobody says so. */}
      <section className={cn("mt-9 rounded-xl border px-5 py-4", tone.box)}>
        <p className={cn("text-[14.5px] font-semibold", tone.text)}>
          {OWNER_LABEL[t.owner].short}
        </p>
        <p className="mt-1 text-[13.5px] leading-relaxed text-muted-fg">
          {OWNER_LABEL[t.owner].long}.
        </p>
      </section>

      {t.whereItLives?.length ? (
        <Block label="Where you find it">
          <ul className="mt-2.5 list-none p-0">
            {t.whereItLives.map((w) => (
              <li
                key={w}
                className="num border-b border-border-soft py-2.5 text-[12.5px] leading-relaxed text-fg last:border-b-0"
              >
                {w}
              </li>
            ))}
          </ul>
        </Block>
      ) : null}

      {t.goesWrong ? (
        <Block label="What goes wrong">
          <p className="mt-2.5 max-w-[38rem] text-[15px] leading-relaxed text-muted-fg">
            {t.goesWrong}
          </p>
        </Block>
      ) : null}

      {t.myth ? (
        <Block label="What people get told">
          <div className="mt-2.5 rounded-xl border border-border-soft bg-bg-2 px-5 py-4">
            <p className="text-[15px] leading-relaxed text-muted-fg">
              <span className="font-semibold text-fg">The claim. </span>
              &ldquo;{t.myth.claim}&rdquo;
            </p>
            <p className="mt-3 max-w-[38rem] text-[15px] leading-relaxed text-fg">
              <span className="font-semibold">Actually. </span>
              {t.myth.truth}
            </p>
          </div>
        </Block>
      ) : null}

      {t.notTheSameAs?.length ? (
        <Block label="Not the same as">
          <dl className="mt-2.5">
            {t.notTheSameAs.map((c) => (
              <div key={c.thing} className="border-b border-border-soft py-3 last:border-b-0">
                <dt className="text-[14.5px] font-semibold tracking-tight text-fg">{c.thing}</dt>
                <dd className="mt-1 max-w-[38rem] text-[14px] leading-relaxed text-muted-fg">
                  {c.delta}
                </dd>
              </div>
            ))}
          </dl>
        </Block>
      ) : null}

      {t.checkIt ? (
        <section className="mt-9 rounded-xl border bg-card px-5 py-4" style={{ boxShadow: "var(--lift)" }}>
          <p className="label">Check it yourself</p>
          <p className="mt-2 text-[15px] leading-relaxed text-fg">{t.checkIt.how}</p>
          {t.checkIt.href ? (
            <Link
              href={t.checkIt.href}
              className="mt-2.5 inline-flex h-11 items-center text-[14px] font-medium text-accent underline underline-offset-2 sm:h-auto"
            >
              Run it now →
            </Link>
          ) : null}
        </section>
      ) : null}

      {rules.length ? (
        <Block label={rules.length === 1 ? "The dated rule behind this" : "The dated rules behind this"}>
          <p className="mt-1.5 max-w-[38rem] text-[13.5px] leading-relaxed text-muted-fg">
            A definition is not a citation. These are the pages with the primary source, the date it
            was published, and what to do about it.
          </p>
          <ul className="mt-3 list-none p-0">
            {rules.map((r) => (
              <li key={r.slug} className="border-b border-border-soft py-3 last:border-b-0">
                <Link
                  href={`/rules/${r.slug}`}
                  className="flex min-h-11 items-center text-[15px] leading-snug font-medium underline-offset-2 hover:underline sm:block sm:min-h-0"
                >
                  {r.title}
                </Link>
                <span className="num mt-1 block text-[11px] text-dim">
                  {r.jurisdictions.slice(0, 3).join(" · ")}
                  {r.provider ? ` · ${r.provider}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </Block>
      ) : null}

      {seeAlso.length ? (
        <Block label="See also">
          <ul className="mt-2.5 flex list-none flex-wrap gap-2 p-0">
            {seeAlso.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/how-email-works/${s.id}`}
                  className="pressable inline-flex h-11 items-center rounded-full border border-border-soft bg-card px-3.5 text-[13px] text-muted-fg transition-colors hover:border-border hover:text-fg sm:h-auto sm:px-3 sm:py-1.5"
                >
                  {s.term}
                </Link>
              </li>
            ))}
          </ul>
        </Block>
      ) : null}

      {/* Back onto the journey. A glossary that can be read front to back is a
          different object from one that can only be looked up. */}
      <section className="mt-12 border-t border-fg/10 pt-8">
        <p className="label">Where this sits</p>
        <p className="mt-2 max-w-[38rem] text-[15px] leading-relaxed text-muted-fg">
          <Link href={`/how-email-works#${stage.id}`} className="font-medium text-fg underline underline-offset-2">
            Stop {stage.n}, {stage.name.toLowerCase()}
          </Link>
          . {stage.what}
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {prev ? (
            <Link
              href={`/how-email-works/${prev.id}`}
              className="lift-hover rounded-xl border border-border-soft bg-card px-4 py-3"
            >
              <span className="num text-[11px] text-dim">← Before</span>
              <span className="mt-1 block text-[14.5px] font-medium">{prev.term}</span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link
              href={`/how-email-works/${next.id}`}
              className="lift-hover rounded-xl border border-border-soft bg-card px-4 py-3 sm:text-right"
            >
              <span className="num text-[11px] text-dim">Next →</span>
              <span className="mt-1 block text-[14.5px] font-medium">{next.term}</span>
            </Link>
          ) : null}
        </div>
      </section>

      <footer className="mt-12 border-t pt-5 text-[12.5px] leading-relaxed text-dim">
        <p className="max-w-[38rem]">
          Written to be repeatable in a meeting, not to be exhaustive. Where this word touches a
          dated obligation, the rule page carries the primary source. Not legal advice.
        </p>
        <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1">
          <Link href="/how-email-works" className="inline-flex h-11 items-center font-medium text-accent hover:underline sm:h-auto">
            ← All {GLOSSARY.length} words
          </Link>
          <Link href="/rules" className="inline-flex h-11 items-center hover:text-fg hover:underline sm:h-auto">
            The rules
          </Link>
          <a
            href="/corrections#report"
            className="inline-flex h-11 items-center hover:text-fg hover:underline sm:h-auto"
          >
            Tell us this is wrong
          </a>
        </p>
      </footer>
    </article>
  );
}

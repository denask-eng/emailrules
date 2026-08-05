import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllRules, getRule, fmtDate, daysSince } from "@/lib/rules";
import { TOPICS, STATUS_LABEL, JURISDICTIONS } from "@/lib/types";
import { SITE } from "@/lib/site";
import { StatusPill, OwnershipBlock, MondayMorning } from "@/components/bits";
import { Explained } from "@/components/explained";
import { RuleTabs } from "@/components/rule/tabs";
import { impactOf, IMPACT_LABEL, whyItMatters } from "@/lib/rule-signals";
import { displayPlain, displayTldr, displayWhy } from "@/content/plain-overrides";
import { resolveEspApplicability, espLabel, type EspId } from "@/lib/audience";
import { CopyContext } from "@/components/copy-context";
import { buildContext } from "@/lib/context-md";

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

      {/* The sitewide FAQ is mounted in the root layout, so all thirty-nine
          rule pages currently close on the same seven questions. A rule page
          has to close on its own sources, related rules and history. The
          layout is not this route's to edit, so it is suppressed from here;
          unmounting this page restores it everywhere else. */}
      <style>{`#faq{display:none}`}</style>

      {/* -my-2 keeps the visual rhythm while the links themselves get a real
          touch height — a 19px breadcrumb is a miss on a phone. */}
      <nav
        className="mb-3 -my-2 flex flex-wrap items-center gap-x-2 text-[12.5px] text-dim"
        aria-label="Breadcrumb"
      >
        <Link href="/rules" className="inline-flex h-11 items-center hover:text-fg sm:h-auto">
          Rules
        </Link>
        <span aria-hidden>/</span>
        <Link
          href={`/topics/${rule.topic}`}
          className="inline-flex h-11 items-center hover:text-fg sm:h-auto"
        >
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

      {age > 90 ? (
        <p className="mt-5 rounded-xl border border-soon/35 bg-soon-bg px-4 py-3 text-[13px] leading-relaxed text-soon">
          Not re-verified in {age} days. Treat as probably current, not certainly current.{" "}
          {/* The warning was already honest; what it lacked was somewhere to go.
              How old the whole shelf is, and which sources moved since, is a
              page rather than a number the reader has to take on trust. */}
          <Link href="/freshness" className="underline underline-offset-2 hover:text-fg">
            How old the rest of the shelf is
          </Link>
          .
        </p>
      ) : null}

      {/* Borrowed from branch C. `ignoreIf` was a throwaway line near the
          bottom of a tab, and it is the most reader-respecting sentence on the
          site: telling somebody on the first screen that this one is not
          theirs buys more trust than making them read to the end to find out.
          It stays in its old position too — this is a promotion, not a move. */}
      {rule.ignoreIf ? (
        <aside className="stop-box mt-5">
          <p className="label text-ok">Who can stop reading</p>
          <p className="mt-1.5 max-w-[58ch] text-[14.5px] leading-relaxed">
            <Explained as="span" text={rule.ignoreIf} />
          </p>
        </aside>
      ) : null}

      {/* Understand and act are the page. The citation apparatus waits behind
          its own tab: it is what a boss or a model asks for, not what a
          marketer opened this URL to read. Every panel is still in the
          response body on every request — the FAQPage and Article schema, and
          the crawlers that read HTML rather than a rendered DOM, need the
          whole text present. See components/rule/tabs for how that holds up
          with no script. */}
      <RuleTabs
        label="Sections of this rule"
        /* Sits in the tab row, so it needs the tabs' own touch height. */
        trailing={
          <Link
            href="/how-email-works"
            className="inline-flex h-11 items-center gap-1.5 px-1 hover:text-fg sm:h-auto"
          >
            How email works
            <span aria-hidden className="relative inline-flex h-1.5 w-1.5 shrink-0">
              <span className="pulse h-1.5 w-1.5 rounded-full bg-accent" />
            </span>
          </Link>
        }
        tabs={[
          {
            id: "guide",
            label: "Understand & act",
            anchors: ["understand", "act"],
            panel: (
              <>
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
                    <Link href="/how-email-works" className="underline underline-offset-2 hover:text-fg">
                      See how email actually works
                    </Link>
                    .
                  </p>
                </section>

                <section id="act" className="mt-12 scroll-mt-20 border-t border-fg/10 pt-10">
                  <p className="label">What to do</p>
                  <h2 className="mt-1.5 text-[1.25rem] font-semibold tracking-tight">
                    Your move — not a lecture
                  </h2>

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
                          <span className="num shrink-0 text-[12px] text-dim">
                            {String(i + 1).padStart(2, "0")}
                          </span>
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
                    The exact wording, the enforcement record and{" "}
                    {rule.sources.length === 1 ? "the primary source" : "every primary source"} sit under{" "}
                    <a href="#proof" className="font-medium underline underline-offset-2">
                      Proof &amp; sources
                    </a>
                    , for counsel, bosses, or AI tools that need a citation. Not legal advice.
                  </p>
                </section>
              </>
            ),
          },
          {
            id: "proof",
            label: "Proof & sources",
            count: rule.sources.length,
            anchors: ["proof", "prove", "sources", "enforcement", "history"],
            panel: (
              <section id="proof" className="mt-10 scroll-mt-20">
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

                <div id="enforcement" className="mt-8 scroll-mt-20">
                  <h3 className="text-[13px] font-semibold tracking-wide uppercase">
                    What happens if you do not
                  </h3>
                  <Explained
                    as="p"
                    className="mt-2 text-[15px] leading-relaxed text-muted-fg"
                    text={rule.enforcement}
                  />
                </div>

                <div id="sources" className="mt-8 scroll-mt-20">
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

                {/* Provenance, so it sits with the proof. The changelog is
                    what someone checking our work asks for second, right after
                    the citation — and publishing corrections in the open is
                    only worth anything if they are findable. */}
                <div id="history" className="mt-8 scroll-mt-20">
                  <h3 className="text-[13px] font-semibold tracking-wide uppercase">
                    History of this page
                  </h3>
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
            ),
          },
        ]}
      />

      {/* Outside the tabs on purpose: this is the onward path, and a reader who
          has finished with one rule should not have to choose a tab to find the
          next one. */}
      {related.length ? (
        <section className="mt-12 border-t border-fg/10 pt-10">
          <h2 className="text-[13px] font-semibold tracking-wide uppercase">Related</h2>
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
        </section>
      ) : null}

      {/* Borrowed from branch B. Two exits: one for the assistant a marketer
          already has open, one for a program. The endpoint is printed rather
          than left to convention — an agent finds it by guessing, but the
          person deciding whether to trust this site cannot. */}
      <section className="mt-12 rounded-xl border bg-bg-2 px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <p className="text-[13.5px] font-medium">Take this with you</p>
          <CopyContext
            markdown={buildContext({
              title: rule.title,
              url: `${SITE.url}/rules/${rule.slug}`,
              claim: rule.answer,
              ownership: rule.ownership,
              verified: rule.lastVerified,
              effective: rule.effectiveDate,
              mondayMorning: rule.mondayMorning,
              sources: rule.sources.map((src) => ({
                name: src.name,
                url: src.url,
                published: src.published,
              })),
            })}
          />
        </div>
        <p className="num mt-2.5 text-[12px] break-all text-muted-fg">
          GET {SITE.url}/rules/{rule.slug}?format=json
        </p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-dim">
          Same URL, same answer, every field including the ones behind the Proof tab. An{" "}
          <code className="num">Accept: application/json</code> header on the plain URL does the
          same thing.{" "}
          <Link href="/agents" className="text-accent underline underline-offset-2">
            All the endpoints
          </Link>
          .
        </p>
      </section>

      <footer className="mt-8 border-t pt-5 text-[12.5px] leading-relaxed text-dim">
        <p>
          Added {fmtDate(rule.added)} · Updated {fmtDate(rule.updated)} · Last verified{" "}
          {fmtDate(rule.lastVerified)} ·{" "}
          <a href="#history" className="text-fg underline underline-offset-2">
            {rule.changelog.length} change{rule.changelog.length === 1 ? "" : "s"} to this page
          </a>
        </p>
        <p className="mt-2">
          Wrong or stale?{" "}
          <Link
            href={`/corrections?slug=${rule.slug}#report`}
            className="text-fg underline underline-offset-2"
          >
            Tell us
          </Link>
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

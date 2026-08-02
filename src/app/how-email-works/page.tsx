import type { Metadata } from "next";
import Link from "next/link";
import {
  GLOSSARY,
  GLOSSARY_AZ,
  GLOSSARY_BY_ID,
  STAGES,
  STARTER_PATH,
  termsInStage,
  LEVEL_LABEL,
  OWNER_LABEL,
} from "@/content/how-email-works";
import { SITE } from "@/lib/site";
import { AuthLadder, OwnershipSplit, SenderHistory } from "@/components/how-email-works/diagrams";
import { JourneyPlayer } from "@/components/how-email-works/journey-player";
import { GlossaryBrowser, type BrowserTerm } from "@/components/how-email-works/browser";

export const metadata: Metadata = {
  title: "How email actually works — every jargon word in plain English",
  description:
    "Every jargon word an email marketer meets, placed at the exact moment it happens to a message — with the real DNS record, header line and arithmetic you would actually see. SPF, DKIM, DMARC, alignment, consent, spam rate, MPP.",
  alternates: { canonical: "/how-email-works" },
  openGraph: {
    type: "article",
    title: "Every jargon word, in plain English",
    description:
      "Seven stops, thirty-seven words, and the real artefact behind each one. The glossary that shows you the thing instead of describing it.",
    url: `${SITE.url}/how-email-works`,
  },
};

export default function GlossaryPage() {
  const terms: BrowserTerm[] = GLOSSARY.map((t) => ({
    id: t.id,
    term: t.term,
    sayIt: t.sayIt,
    short: t.short,
    level: t.level,
    owner: t.owner,
    stage: t.stage,
    hay: [t.term, t.sayIt, t.short, ...t.aliases].join(" ").toLowerCase(),
  }));

  const stages = STAGES.map((s) => ({
    id: s.id,
    n: s.n,
    name: s.name,
    what: s.what,
    when: s.when,
    intro: s.intro,
    owner: s.owner,
  }));

  const starters = STARTER_PATH.map((id) => GLOSSARY_BY_ID.get(id)).filter(Boolean) as typeof GLOSSARY;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "DefinedTermSet",
        "@id": `${SITE.url}/how-email-works#set`,
        name: "The email marketer's glossary",
        description:
          "Email marketing and deliverability vocabulary, ordered by when each term happens to a message.",
        url: `${SITE.url}/how-email-works`,
        inLanguage: "en",
        publisher: { "@id": `${SITE.url}/#org` },
        hasDefinedTerm: GLOSSARY.map((t) => ({
          "@type": "DefinedTerm",
          "@id": `${SITE.url}/how-email-works/${t.id}#term`,
          name: t.term,
          description: t.short,
          url: `${SITE.url}/how-email-works/${t.id}`,
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Rules", item: `${SITE.url}/rules` },
          { "@type": "ListItem", position: 2, name: "How email works", item: `${SITE.url}/how-email-works` },
        ],
      },
    ],
  };

  return (
    <div className="shell py-12 sm:py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="max-w-[38rem]">
        <p className="label">How email works</p>
        <h1 className="mt-3 text-[clamp(2rem,5.2vw,3rem)] font-semibold tracking-tight">
          Every jargon word, in plain English
        </h1>
        <p className="mt-3.5 text-[1.06rem] leading-relaxed text-muted-fg">
          Not an A&ndash;Z. {GLOSSARY.length} words, each one placed at the moment it actually
          happens to an email.
        </p>
      </div>

      <JourneyPlayer
        stages={STAGES.map((st) => ({
          id: st.id,
          n: st.n,
          name: st.name,
          what: st.what,
          when: st.when,
          count: termsInStage(st.id).length,
        }))}
      />

      {/* ── Whose job any of it is ─────────────────────────────────────── */}
      <OwnershipSplit />

      {/* ── The reading path ────────────────────────────────────────────── */}
      <section className="mt-16 border-t pt-10">
        <p className="label">If you are new</p>
        <h2 className="mt-2.5 text-[clamp(1.3rem,3vw,1.7rem)] font-semibold tracking-tight">
          The words that explain the rest, in order
        </h2>
        <p className="mt-3 max-w-[54ch] text-[15px] leading-relaxed text-muted-fg">
          Each one makes the next one obvious. Ten minutes, and the rest of this page reads itself.
        </p>

        <ol className="mt-7 grid list-none gap-x-8 gap-y-0 p-0 sm:grid-cols-2">
          {starters.map((t, i) => (
            <li key={t.id} className="border-b border-border-soft last:border-b-0 sm:[&:nth-last-child(2)]:border-b-0">
              <Link
                href={`/how-email-works/${t.id}`}
                className="group grid grid-cols-[1.75rem_1fr] items-baseline gap-x-3 py-3.5 transition-colors hover:bg-muted/40"
              >
                <span className="num text-[11.5px] text-dim">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0">
                  <span className="text-[15px] font-semibold tracking-tight decoration-1 underline-offset-[5px] group-hover:underline">
                    {t.term}
                  </span>
                  <span className="mt-1 block max-w-[46ch] text-[13.5px] leading-relaxed text-muted-fg">
                    {t.short}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      {/* ── The seven stops ─────────────────────────────────────────────── */}
      <GlossaryBrowser
        stages={stages}
        terms={terms}
        slots={{ judge: <AuthLadder />, filter: <SenderHistory /> }}
      />

      {/* ── A–Z, for people who came for one word ───────────────────────── */}
      <section id="a-z" className="mt-20 scroll-mt-[7.5rem] border-t pt-10">
        <p className="label">Alphabetical</p>
        <h2 className="mt-2.5 text-[1.4rem] font-semibold tracking-tight">
          All {GLOSSARY.length}, if you came for one word
        </h2>
        <p className="mt-2.5 max-w-[54ch] text-[14px] leading-relaxed text-muted-fg">
          The number is the stop it happens at.
        </p>

        <ul className="mt-6 grid list-none grid-cols-2 gap-x-6 p-0 sm:grid-cols-3 lg:grid-cols-4">
          {GLOSSARY_AZ.map((t) => (
            <li key={t.id} id={t.id} className="scroll-mt-[7.5rem] border-b border-border-soft">
              <Link
                href={`/how-email-works/${t.id}`}
                className="flex items-baseline gap-2 py-3 text-[14px] transition-colors hover:text-accent"
              >
                <span className="min-w-0 flex-1 truncate font-medium">{t.term}</span>
                <span className="num shrink-0 text-[10.5px] text-dim">
                  {String(STAGES.find((s) => s.id === t.stage)?.n ?? "").padStart(2, "0")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Legend ──────────────────────────────────────────────────────── */}
      <section className="mt-16 border-t pt-8">
        <div className="grid gap-8 sm:grid-cols-2">
          <div>
            <p className="label">Whose job it is</p>
            <dl className="mt-3 text-[13.5px]">
              {(["yours", "shared", "esp", "context"] as const).map((o) => (
                <div key={o} className="flex gap-3 border-b border-border-soft py-2 last:border-b-0">
                  <dt className="w-[6.5rem] shrink-0 font-medium text-fg">
                    {OWNER_LABEL[o].short}
                  </dt>
                  <dd className="text-muted-fg">{OWNER_LABEL[o].long}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div>
            <p className="label">How deep</p>
            <dl className="mt-3 text-[13.5px]">
              {(["start", "working", "deep"] as const).map((l) => (
                <div key={l} className="flex gap-3 border-b border-border-soft py-2 last:border-b-0">
                  <dt className="w-[6.5rem] shrink-0 font-medium text-fg">
                    {LEVEL_LABEL[l].short}
                  </dt>
                  <dd className="text-muted-fg">{LEVEL_LABEL[l].long}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <footer className="mt-14 border-t pt-6 text-[13px] leading-relaxed text-dim">
        <p className="max-w-[62ch]">
          Definitions are written to be repeatable in a meeting, not to be technically exhaustive.
          Where a word touches an obligation with a date, the term page links the dated rule and its
          primary source. Not legal advice.
        </p>
        <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1">
          <Link href="/rules" className="inline-flex h-11 items-center font-medium text-accent hover:underline sm:h-auto">
            ← All rules
          </Link>
          <Link href="/check" className="inline-flex h-11 items-center hover:text-fg hover:underline sm:h-auto">
            Check a domain
          </Link>
          <Link href="/check/headers" className="inline-flex h-11 items-center hover:text-fg hover:underline sm:h-auto">
            Read a real message
          </Link>
          <a href={`mailto:${SITE.contact}?subject=Glossary: a word you are missing`} className="inline-flex h-11 items-center hover:text-fg hover:underline sm:h-auto">
            A word we are missing?
          </a>
        </p>
      </footer>
    </div>
  );
}

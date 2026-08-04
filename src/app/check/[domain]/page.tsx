import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { checkBlocklists } from "@/lib/blocklist-check";
import { checkDomain, normaliseDomain, type Finding, type Severity } from "@/lib/dns-check";
import { observeDomain, observedDayCount } from "@/lib/domain-history";
import { getRule, fmtDate } from "@/lib/rules";
import { SITE } from "@/lib/site";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { BlocklistVerdict } from "@/components/blocklist-verdict";
import { DomainRecord } from "@/components/domain-record";
import { FindingList, FindingTally, countYours } from "@/components/findings";
import { PlatformPanel } from "@/components/platform-panel";
import { primarySender } from "@/lib/sending-platform";
import { SubscribeForm } from "@/components/subscribe-form";

/* A live DNS lookup per request. Cached briefly so a shared link does not
   hammer the resolver, but short enough that a fix shows up while you are
   still looking at the page. */
export const revalidate = 300;

/* Named rather than inlined so the header cannot drift from what dns-check.ts
   actually does: the apex TXT, _dmarc, BIMI, MX, the impossible-selector probe
   and fourteen real selectors. */
const DNS_LOOKUPS = 19;

/* The headline is a sentence, and a sentence does not open on a numeral. Past
   nine it falls back to the digit, which is also the point at which a domain
   has bigger problems than typography. */
const COUNT_WORD: Record<number, string> = {
  2: "Two",
  3: "Three",
  4: "Four",
  5: "Five",
  6: "Six",
  7: "Seven",
  8: "Eight",
  9: "Nine",
};

/**
 * This is the artifact people paste into Slack, so the unfurl has to be its
 * own. Without an explicit openGraph block it inherited the root layout's,
 * which advertised the homepage under someone else's domain name. The card
 * itself is opengraph-image.tsx in this folder; Next merges it in, so no
 * `images` key belongs here.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ domain: string }>;
}): Promise<Metadata> {
  const { domain } = await params;
  const d = normaliseDomain(decodeURIComponent(domain));
  if (!d) return { title: "Check" };

  const title = `${d} — authentication and blocklist check`;
  const description = `Live SPF, DKIM, DMARC and blocklists for ${d}, with every finding named as your job or your sending platform's. The dated rule behind each one — never a score.`;

  return {
    title,
    description,
    alternates: { canonical: `/check/${d}` },
    openGraph: {
      type: "website",
      title,
      description,
      url: `${SITE.url}/check/${d}`,
      siteName: SITE.name,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function CheckResult({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;
  const d = normaliseDomain(decodeURIComponent(domain));
  if (!d) notFound();

  /* Every check is also an observation. It runs after the response so the
     visitor never waits on it, and it is a no-op if this domain was already
     observed today. History is the one thing here that cannot be back-filled,
     so this is unconditional — not a feature anyone opts into. */
  after(() => observeDomain(d));

  /* Authentication and reputation are two different questions about the same
     domain and neither answers the other, so they are asked together and read
     as one list. The blocklist half proves each list is still talking before
     it believes a silence — see lib/blocklist-check.ts. */
  const [result, blocklist, daysObserved] = await Promise.all([
    checkDomain(d),
    checkBlocklists(d),
    observedDayCount(d),
  ]);

  /* Authentication findings only. The blocklist half is rendered by
     BlocklistVerdict rather than folded in here, because the thing worth
     saying about a blocklist entry is which of three kinds it is, and a flat
     severity-sorted list is exactly the shape that loses that. Its findings
     still exist and still feed the share card's counts. */
  const SEVERITY_ORDER: Record<Severity, number> = { fail: 0, warn: 1, pass: 2, info: 3 };
  const findings: Finding[] = [...result.findings].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  );

  /* The headline answers the question the homepage promised — whose job is
     this — rather than totalling severities. A domain can be entirely
     unenforced and still show no fails, which is how this page used to print
     "Nothing here needs you" over p=none. A listing on an address list is
     yours by the same logic; one on a shared pool is the platform's, and
     BlocklistVerdict already draws that line. */
  const own = countYours(findings);
  const yours = own.yours + blocklist.actionable.length;
  const sender = primarySender(result.platforms);

  const listsAsked = blocklist.lists.filter((l) => l.status === "answered").length;
  const blocklistEntries = new Set(
    [...blocklist.actionable, ...blocklist.contextual].map((h) => h.list.id),
  ).size;

  /* Resolve rule titles so each finding can name its source rather than
     asserting on its own authority. */
  const ruleTitles: Record<string, string> = {};
  await Promise.all(
    [...new Set(findings.map((f) => f.rule).filter(Boolean) as string[])].map(async (slug) => {
      const r = await getRule(slug);
      if (r) ruleTitles[slug] = r.title;
    }),
  );

  return (
    <div className="shell shell-tight py-12 sm:py-16">
      {/* The answer, at the size of an answer.
          This used to be a grey sentence under a mono heading, and a reader
          had to assemble the verdict out of eight paragraphs. The domain is
          the small line now and the verdict is the big one, because nobody
          arrives here needing to be told which domain they typed. */}
      <p className="num label">
        {result.domain} · checked {fmtDate(result.checkedAt)}
      </p>
      <h1 className="mt-4 max-w-[18ch] text-[clamp(2.1rem,6.5vw,3.6rem)] leading-[0.98] tracking-[-0.045em]">
        {yours > 0
          ? `${yours === 1 ? "One thing is" : `${COUNT_WORD[yours] ?? yours} of these are`} yours.`
          : own.shared > 0
            ? "Nothing here is yours."
            : "Nothing here needs you."}
      </h1>
      {/* The second line carries what the headline gave up. A reader who is
          told nothing is theirs still needs to know somebody is on the hook,
          or the relief reads as the page not having looked. */}
      {yours === 0 && own.shared > 0 ? (
        <p className="mt-4 max-w-[46ch] text-[1.02rem] leading-relaxed text-muted-fg">
          {own.shared === 1 ? "One finding is" : `${own.shared} findings are`} shared with{" "}
          {sender ? sender.name : "your sending platform"} — the mechanical half is done and the
          judgement is still yours.
        </p>
      ) : null}
      <p className="num mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-dim">
        <span>{DNS_LOOKUPS} DNS lookups</span>
        <span aria-hidden>·</span>
        <span>{listsAsked} blocklists asked</span>
        <span aria-hidden>·</span>
        <span>{blocklistEntries === 0 ? "no entries" : `${blocklistEntries} with an entry`}</span>
        <span aria-hidden>·</span>
        <span>no score, ever</span>
      </p>

      {/* Who this domain authorises, before any finding is owned — because no
          finding underneath can be owned without it. */}
      <PlatformPanel platforms={result.platforms} spfManager={result.spfManager} />

      {/* The limit, said early rather than buried under the answer. A reader
          who has just been told what is theirs is exactly the reader who
          needs to know what DNS could not look at. */}
      <div className="mt-5 rounded-xl border bg-bg-2 p-5 text-[0.92rem] leading-relaxed text-muted-fg">
        <b className="text-fg">What this cannot see.</b> DNS tells us what you have published, not
        what you actually send. It cannot read your consent records, your subject lines, or whether
        DKIM aligns on a real message — the three things that decide where a campaign lands. For
        those,{" "}
        <Link href="/check/message" className="text-fg underline decoration-1 underline-offset-3">
          send us a real campaign
        </Link>{" "}
        and we read them off the message itself.
      </div>

      {/* The record, before any opinion about it. */}
      <div className="mt-9">
        <DomainRecord
          domain={result.domain}
          checkedAt={fmtDate(result.checkedAt)}
          facts={result.facts}
          blocklist={{ asked: listsAsked, entries: blocklistEntries }}
        />
      </div>

      {/* Two questions, two sections. "Is my authentication set up" and "does
          anyone have an entry against me" are not the same question, and the
          second one needs room to say which kind of entry it is. */}
      <p className="label mt-14">Whose job each one is</p>
      <FindingTally findings={findings} />
      <FindingList findings={findings} ruleTitles={ruleTitles} />

      <BlocklistVerdict
        actionable={blocklist.actionable}
        contextual={blocklist.contextual}
        lists={blocklist.lists}
        checkedWhat={result.domain}
      />

      {daysObserved > 0 ? (
        <p className="mt-5 text-[0.92rem] leading-relaxed text-muted-fg">
          We have observed this domain on <span className="num">{daysObserved}</span>{" "}
          {daysObserved === 1 ? "day" : "days"}.{" "}
          <Link
            href={`/domain/${result.domain}`}
            className="text-fg underline decoration-1 underline-offset-3 hover:text-accent"
          >
            See what has moved since
          </Link>
          .
        </p>
      ) : null}

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/check" className={cn(buttonVariants({ variant: "outline" }), "h-10 rounded-[10px] px-5")}>
          Check another domain
        </Link>
        {/* The forwardable artefact, offered at the only moment somebody has
            something worth forwarding. A brief carrying this domain says what
            is true of their programme; the same brief without it says what is
            true of everybody's. */}
        <Link
          href={`/brief?domain=${result.domain}`}
          className={cn(buttonVariants({ variant: "outline" }), "h-10 rounded-[10px] px-5")}
        >
          Put this in a one-page brief
        </Link>
        <Link href="/rules" className={cn(buttonVariants(), "h-10 rounded-[10px] px-5 font-medium")}>
          See which rules are yours
        </Link>
      </div>

      {/* Offered here and nowhere earlier: the moment somebody has a result they
          want in front of a client is the only moment an embed is worth reading
          about. */}
      <p className="mt-4 text-[13px] text-muted-fg">
        Putting this in a client report?{" "}
        <Link
          href={`/embed/${result.domain}`}
          className="text-fg underline decoration-1 underline-offset-3 hover:decoration-accent"
        >
          Embed a live, dated badge
        </Link>{" "}
        that re-checks itself.
      </p>

      <section className="mt-12 rounded-xl border bg-card p-5 sm:p-6" style={{ boxShadow: "var(--lift)" }}>
        <h2 className="text-[15px] font-semibold">Watch this domain</h2>
        <p className="mt-1.5 max-w-[54ch] text-[13.5px] leading-relaxed text-muted-fg">
          One email if authentication DNS for {result.domain} actually changes. Same list as rule
          alerts — one inbox, one promise.
        </p>
        <div className="mt-4">
          <SubscribeForm defaultDomain={result.domain} compact />
        </div>
      </section>
    </div>
  );
}

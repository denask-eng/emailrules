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
import { FindingList, FindingTally } from "@/components/findings";
import { SubscribeForm } from "@/components/subscribe-form";

/* A live DNS lookup per request. Cached briefly so a shared link does not
   hammer the resolver, but short enough that a fix shows up while you are
   still looking at the page. */
export const revalidate = 300;

/* Named rather than inlined so the header cannot drift from what dns-check.ts
   actually does: the apex TXT, _dmarc, BIMI, MX, the impossible-selector probe
   and fourteen real selectors. */
const DNS_LOOKUPS = 19;

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

  const fails = findings.filter((f) => f.severity === "fail").length + blocklist.actionable.length;
  const warns = findings.filter((f) => f.severity === "warn").length;

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
        {fails === 0 && warns === 0
          ? "Nothing here needs you."
          : fails > 0
            ? `${fails} ${fails > 1 ? "things" : "thing"} to fix.`
            : `${warns} worth a look.`}
      </h1>
      <p className="num mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-dim">
        <span>{DNS_LOOKUPS} DNS lookups</span>
        <span aria-hidden>·</span>
        <span>{listsAsked} blocklists asked</span>
        <span aria-hidden>·</span>
        <span>{blocklistEntries === 0 ? "no entries" : `${blocklistEntries} with an entry`}</span>
        <span aria-hidden>·</span>
        <span>no score, ever</span>
      </p>

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
      <p className="label mt-14">What that means</p>
      <FindingTally findings={findings} />
      <FindingList findings={findings} ruleTitles={ruleTitles} />

      <BlocklistVerdict
        actionable={blocklist.actionable}
        contextual={blocklist.contextual}
        lists={blocklist.lists}
        checkedWhat={result.domain}
      />

      <div className="mt-9 rounded-xl border bg-bg-2 p-5 text-[0.92rem] leading-relaxed text-muted-fg">
        <b className="text-fg">What this cannot see.</b> DNS tells us what you have published, not
        what you actually send. It cannot read your consent records, your subject lines, or whether
        DKIM aligns on a real message. For that,{" "}
        <Link href="/check/headers" className="text-fg underline decoration-1 underline-offset-3">
          paste a received header
        </Link>{" "}
        and we read the alignment off the message itself.
      </div>

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

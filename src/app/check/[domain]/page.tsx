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
import { FindingList, FindingTally } from "@/components/findings";
import { SubscribeForm } from "@/components/subscribe-form";

/* A live DNS lookup per request. Cached briefly so a shared link does not
   hammer the resolver, but short enough that a fix shows up while you are
   still looking at the page. */
export const revalidate = 300;

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

  const SEVERITY_ORDER: Record<Severity, number> = { fail: 0, warn: 1, pass: 2, info: 3 };
  const findings: Finding[] = [...result.findings, ...blocklist.findings].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  );

  const fails = findings.filter((f) => f.severity === "fail").length;
  const warns = findings.filter((f) => f.severity === "warn").length;

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
      <p className="label">
        Authentication and blocklists · <span className="num">{fmtDate(result.checkedAt)}</span>
      </p>
      <h1 className="num mt-3 text-[clamp(1.6rem,4.5vw,2.5rem)]">{result.domain}</h1>

      <p className="mt-5 max-w-[62ch] text-[1.04rem] leading-relaxed text-muted-fg">
        {fails === 0 && warns === 0
          ? "Nothing to fix on authentication or reputation. That is a real outcome and you get it plainly."
          : `${fails > 0 ? `${fails} thing${fails > 1 ? "s" : ""} to fix` : "Nothing broken"}${
              warns > 0 ? `, ${warns} worth a look` : ""
            }. Every finding names the rule it comes from.`}
      </p>

      <FindingTally findings={findings} />
      <FindingList findings={findings} ruleTitles={ruleTitles} />

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

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { checkDomain, normaliseDomain } from "@/lib/dns-check";
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

  const title = `${d} — authentication check`;
  const description = `Live SPF, DKIM and DMARC for ${d}. Findings with the dated rule each one comes from — never a score.`;

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

  const result = await checkDomain(d);
  const fails = result.findings.filter((f) => f.severity === "fail").length;
  const warns = result.findings.filter((f) => f.severity === "warn").length;

  /* Resolve rule titles so each finding can name its source rather than
     asserting on its own authority. */
  const ruleTitles: Record<string, string> = {};
  await Promise.all(
    [...new Set(result.findings.map((f) => f.rule).filter(Boolean) as string[])].map(async (slug) => {
      const r = await getRule(slug);
      if (r) ruleTitles[slug] = r.title;
    }),
  );

  return (
    <div className="shell shell-tight py-12 sm:py-16">
      <p className="label">
        Authentication check · <span className="num">{fmtDate(result.checkedAt)}</span>
      </p>
      <h1 className="num mt-3 text-[clamp(1.6rem,4.5vw,2.5rem)]">{result.domain}</h1>

      <p className="mt-5 max-w-[62ch] text-[1.04rem] leading-relaxed text-muted-fg">
        {fails === 0 && warns === 0
          ? "Nothing to fix on authentication. That is a real outcome and you get it plainly."
          : `${fails > 0 ? `${fails} thing${fails > 1 ? "s" : ""} to fix` : "Nothing broken"}${
              warns > 0 ? `, ${warns} worth a look` : ""
            }. Every finding names the rule it comes from.`}
      </p>

      <FindingTally findings={result.findings} />
      <FindingList findings={result.findings} ruleTitles={ruleTitles} />

      <div className="mt-9 rounded-xl border bg-bg-2 p-5 text-[0.92rem] leading-relaxed text-muted-fg">
        <b className="text-fg">What this cannot see.</b> DNS tells us what you have published, not
        what you actually send. It cannot read your consent records, your subject lines, or whether
        DKIM aligns on a real message. For that,{" "}
        <Link href="/check/headers" className="text-fg underline decoration-1 underline-offset-3">
          paste a received header
        </Link>{" "}
        and we read the alignment off the message itself.
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/check" className={cn(buttonVariants({ variant: "outline" }), "h-10 rounded-[10px] px-5")}>
          Check another domain
        </Link>
        <Link href="/rules" className={cn(buttonVariants(), "h-10 rounded-[10px] px-5 font-medium")}>
          See which rules are yours
        </Link>
      </div>

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

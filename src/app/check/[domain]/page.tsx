import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { checkDomain, normaliseDomain } from "@/lib/dns-check";
import type { Severity } from "@/lib/dns-check";
import { getRule, fmtDate } from "@/lib/rules";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

/* A live DNS lookup per request. Cached briefly so a shared link does not
   hammer the resolver, but short enough that a fix shows up while you are
   still looking at the page. */
export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ domain: string }>;
}): Promise<Metadata> {
  const { domain } = await params;
  const d = normaliseDomain(decodeURIComponent(domain));
  return {
    title: d ? `${d} — authentication check` : "Check",
    description: d
      ? `Live SPF, DKIM and DMARC check for ${d}. Every finding names the dated rule it comes from.`
      : undefined,
    alternates: { canonical: `/check/${d ?? ""}` },
  };
}

const TONE: Record<Severity, { dot: string; label: string }> = {
  fail: { dot: "bg-live", label: "Needs fixing" },
  warn: { dot: "bg-soon", label: "Worth a look" },
  pass: { dot: "bg-ok", label: "Fine" },
  info: { dot: "bg-dim", label: "Context" },
};

export default async function CheckResult({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;
  const d = normaliseDomain(decodeURIComponent(domain));
  if (!d) notFound();

  const result = await checkDomain(d);
  const fails = result.findings.filter((f) => f.severity === "fail").length;
  const warns = result.findings.filter((f) => f.severity === "warn").length;

  /* Resolve rule titles so each finding can name its source rather than
     asserting on its own authority. */
  const ruleTitles = new Map<string, string>();
  await Promise.all(
    [...new Set(result.findings.map((f) => f.rule).filter(Boolean) as string[])].map(async (slug) => {
      const r = await getRule(slug);
      if (r) ruleTitles.set(slug, r.title);
    }),
  );

  return (
    <div className="shell shell-tight py-12 sm:py-16">
      <p className="label">Checked {fmtDate(result.checkedAt)}</p>
      <h1 className="num mt-3 text-[clamp(1.6rem,4.5vw,2.5rem)]">{result.domain}</h1>

      <p className="mt-5 max-w-[62ch] text-[1.04rem] leading-relaxed text-muted-fg">
        {fails === 0 && warns === 0
          ? "Nothing to fix on authentication. That is a real outcome and you get it plainly."
          : `${fails > 0 ? `${fails} thing${fails > 1 ? "s" : ""} to fix` : "Nothing broken"}${
              warns > 0 ? `, ${warns} worth a look` : ""
            }. Every finding names the rule it comes from.`}
      </p>

      <ul className="mt-9 list-none border-t p-0">
        {result.findings.map((f, i) => (
          <li key={i} className="grid grid-cols-[10px_1fr] items-start gap-4 border-b py-5">
            <span className={cn("mt-2 h-2 w-2 shrink-0 rounded-full", TONE[f.severity].dot)} aria-hidden />
            <div className="min-w-0">
              <h2 className="text-[1.02rem] leading-snug font-semibold">{f.title}</h2>
              <p className="mt-2 max-w-[64ch] text-[0.95rem] leading-relaxed text-muted-fg">
                {f.detail}
              </p>
              {f.evidence ? (
                <pre className="num mt-3 overflow-x-auto rounded-lg border bg-bg-2 px-3 py-2 text-[0.72rem] text-muted-fg">
                  {f.evidence}
                </pre>
              ) : null}
              {f.rule ? (
                <Link
                  href={`/rules/${f.rule}`}
                  className="mt-3 inline-block text-[0.84rem] underline underline-offset-3 hover:text-accent"
                >
                  {ruleTitles.get(f.rule) ?? "Read the rule"} &rarr;
                </Link>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-10 rounded-xl border bg-bg-2 p-5 text-[0.92rem] leading-relaxed text-muted-fg">
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
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { normaliseDomain } from "@/lib/dns-check";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Check my domain",
  description:
    "A live SPF, DKIM and DMARC check for your sending domain, read against every dated rule on this site. Free, no account, findings with sources rather than a score.",
  alternates: { canonical: "/check" },
};

export default async function Check({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const { e } = await searchParams;

  async function run(formData: FormData) {
    "use server";
    const domain = normaliseDomain(String(formData.get("domain") ?? ""));
    if (!domain) redirect("/check?e=1");
    redirect(`/check/${domain}`);
  }

  return (
    <div className="shell shell-tight py-12 sm:py-16">
      <h1 className="text-[clamp(1.9rem,5.2vw,2.9rem)]">Check a sending domain</h1>
      <p className="mt-5 max-w-[62ch] text-[1.04rem] leading-relaxed text-muted-fg">
        One domain, no signup. Live DNS for SPF, DKIM selectors, DMARC, BIMI and MX — plain findings
        with sources. If nothing is wrong, we say so. For alignment on a real message, paste headers
        below.
      </p>

      <form action={run} className="mt-7 flex max-w-[520px] gap-2.5">
        <input
          name="domain"
          required
          placeholder="yourbrand.com"
          aria-label="Sending domain"
          className="num h-10 flex-1 rounded-lg border border-border bg-bg px-3 text-[0.9rem] outline-none focus-visible:ring-3 focus-visible:ring-accent/25"
        />
        <button type="submit" className={cn(buttonVariants({ size: "lg" }), "h-10 px-5 font-semibold")}>
          Run check
        </button>
      </form>
      {e ? (
        <p role="alert" className="mt-2.5 text-[0.86rem] text-live">
          That does not look like a domain. Try yourbrand.com.
        </p>
      ) : (
        <p className="mt-2.5 text-[0.86rem] text-dim">
          Results get a shareable URL. Nothing is stored and no account is created.
        </p>
      )}

      <div className="mt-7 max-w-[68ch] rounded-lg border border-border bg-bg-2 p-4 text-[0.9rem] leading-relaxed text-muted-fg">
        <b className="text-fg">Why not a score?</b> We have watched two different tools score the
        same campaign at 85 percent and 40 percent inbox placement. Scores are why nobody trusts
        this category. You get findings, each one traceable to a rule with a date.
      </div>

      <div className="mt-7 max-w-[68ch] rounded-lg border p-4 text-[0.9rem] leading-relaxed text-muted-fg">
        <b className="text-fg">What it can and cannot see.</b> DNS shows what you have published:
        SPF, its lookup count, DMARC and its policy, DKIM keys on the selectors the major platforms
        use, BIMI and MX. It cannot see your consent records, your subject lines, or whether DKIM
        aligns on a real message, and it says so rather than guessing. Have a real message?{" "}
        <Link href="/check/headers" className="text-fg underline decoration-1 underline-offset-3">
          Paste its headers
        </Link>{" "}
        and get the alignment verdict DNS cannot give.
      </div>

      <section className="mt-14 border-t pt-10">
        <h2 className="text-[1.3rem]">Two free checks. Nothing priced yet.</h2>
        <ul className="mt-4 max-w-[58ch] list-none space-y-3 p-0 text-[0.95rem] leading-relaxed text-muted-fg">
          <li>
            <b className="text-fg">Domain (DNS)</b> — SPF, DMARC, common DKIM selectors, BIMI, MX.
            Shareable result URL. Above.
          </li>
          <li>
            <b className="text-fg">Headers (a real message)</b> —{" "}
            <Link href="/check/headers" className="text-fg underline decoration-1 underline-offset-3">
              Paste received headers
            </Link>{" "}
            for alignment and List-Unsubscribe. That is the finding DNS cannot give you.
          </li>
        </ul>
        <p className="mt-5 max-w-[58ch] text-[0.95rem] leading-relaxed text-muted-fg">
          Continuous monitoring against these rules, Klaviyo send scans, and a paid plan are not
          built. Today this site sells nothing. The free check is the product; the alert list below
          is how you hear when a rule moves.
        </p>
        <Link
          href="/#subscribe"
          className={cn(buttonVariants({ variant: "outline" }), "mt-5 h-10 rounded-[10px] px-5")}
        >
          Tell me when a rule moves
        </Link>
      </section>
    </div>
  );
}

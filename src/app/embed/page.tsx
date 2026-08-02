import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { normaliseDomain } from "@/lib/dns-check";
import { SITE } from "@/lib/site";
import { BADGE } from "@/app/badge/badge-svg";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Embed the check",
  description:
    "A live, dated SVG stating a sending domain’s SPF, DKIM and DMARC posture, for client reports and decks. It re-checks itself, it links to the full result, and it carries no score.",
  alternates: { canonical: "/embed" },
};

/** Our own domain, checked live, so the example is never a mockup. */
const SELF = "emailrules.today";

export default async function Embed({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const { e } = await searchParams;

  async function build(formData: FormData) {
    "use server";
    const domain = normaliseDomain(String(formData.get("domain") ?? ""));
    if (!domain) redirect("/embed?e=1");
    redirect(`/embed/${domain}`);
  }

  return (
    <div className="shell shell-tight py-12 sm:py-16">
      <p className="label">Embeddable mark</p>
      <h1 className="mt-3 text-[clamp(1.9rem,5.2vw,2.9rem)]">
        Put the check in your own report
      </h1>

      <p className="mt-5 max-w-[58ch] text-[1.04rem] leading-relaxed text-muted-fg">
        Two lines of HTML that render a live SVG: the domain, what its authentication actually
        says, and the date it was verified. Drop it in a client report, a deck, a README or a
        proposal. It re-checks itself, so a mark you pasted in March is not still asserting March.
      </p>

      {/* The example is our own domain, resolved live. A sample image would be
          a claim about the product rather than an instance of it — and if this
          site's own authentication ever slips, the first place it shows up is
          the page selling the badge. */}
      <div className="mt-8 rounded-xl border bg-card p-5 sm:p-6" style={{ boxShadow: "var(--lift)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- the preview has
            to be the same plain <img> the snippet below hands out. */}
        <img
          src={`/badge/${SELF}.svg`}
          alt={`Email authentication check for ${SELF} — ${SITE.name}`}
          width={BADGE.width}
          height={BADGE.height}
          className="block max-w-full"
        />
        <p className="mt-4 max-w-[58ch] text-[12.5px] leading-relaxed text-dim">
          Live, right now, for this site’s own domain. Nothing above is a mockup — if our
          authentication slips, this is the first page that says so.
        </p>
      </div>

      <form action={build} className="mt-8 flex max-w-[520px] gap-2.5">
        <input
          name="domain"
          required
          placeholder="yourbrand.com"
          aria-label="Sending domain"
          autoComplete="off"
          spellCheck={false}
          className="num h-10 flex-1 rounded-lg border border-border bg-bg px-3 text-[0.9rem] outline-none focus-visible:ring-3 focus-visible:ring-accent/25"
        />
        <button type="submit" className={cn(buttonVariants({ size: "lg" }), "h-10 px-5 font-semibold")}>
          Get the code
        </button>
      </form>
      {e ? (
        <p role="alert" className="mt-2.5 text-[0.86rem] text-live">
          That does not look like a domain. Try yourbrand.com.
        </p>
      ) : (
        <p className="mt-2.5 text-[0.86rem] text-dim">
          Free, no account, no attribution requirement. Use it on as many client domains as you
          run.
        </p>
      )}

      <section className="mt-14 border-t pt-10">
        <h2 className="text-[1.3rem]">What it will say, and what it refuses to</h2>

        <ul className="mt-6 list-none space-y-4 p-0">
          <li className="max-w-[66ch] text-[0.95rem] leading-relaxed text-muted-fg">
            <b className="text-fg">It carries the date.</b> That is the whole point of the word
            “today” in our name. An undated authentication claim is worth nothing: DNS changes the
            afternoon someone adds a tool.
          </li>
          <li className="max-w-[66ch] text-[0.95rem] leading-relaxed text-muted-fg">
            <b className="text-fg">It can say something unflattering.</b> If the domain has two
            things to fix, the mark says two things to fix, in red, on your client’s page. A badge
            that only ever renders “verified” is marketing, and the first reader who notices will
            say so in public.
          </li>
          <li className="max-w-[66ch] text-[0.95rem] leading-relaxed text-muted-fg">
            <b className="text-fg">No score, no grade, no percentage.</b> We have watched two tools
            score the same campaign at 85 and at 40. A number on a badge is the most tempting place
            in this whole site to invent one, which is exactly why there is none.{" "}
            <Link href="/check" className="text-fg underline decoration-1 underline-offset-3">
              Findings, with the dated rule behind each
            </Link>
            .
          </li>
          <li className="max-w-[66ch] text-[0.95rem] leading-relaxed text-muted-fg">
            <b className="text-fg">It links to the full result.</b> Every mark is wrapped in a link
            to <span className="num">/check/&lt;domain&gt;</span>, so a reader who doubts it can run
            the same lookups and see every finding with its source. We do not ship an assertion
            without a way to check it.
          </li>
        </ul>
      </section>

      <section className="mt-12 border-t pt-10">
        <h2 className="text-[1.3rem]">How it behaves once it is out there</h2>
        <p className="mt-4 max-w-[66ch] text-[0.95rem] leading-relaxed text-muted-fg">
          The image is plain SVG with no webfont, no script and nothing loaded from anywhere — it
          renders the same on a page that has never heard of us. Results are cached for six hours
          and served stale while they refresh, so a report with a thousand readers is one DNS
          lookup, not a thousand. When a lookup fails the mark says it could not verify rather than
          guessing, and it says that in grey: a resolver that did not answer is our failure, not
          your client’s.
        </p>
        <p className="mt-4 max-w-[66ch] text-[0.95rem] leading-relaxed text-muted-fg">
          Nothing is logged about who embeds it. There is no pixel in here — a site that argues
          tracking pixels may be unlawful in France cannot ship one in a badge.
        </p>
        <Link
          href="/check"
          className={cn(buttonVariants({ variant: "outline" }), "mt-6 h-10 rounded-[10px] px-5")}
        >
          Run the full check first
        </Link>
      </section>
    </div>
  );
}

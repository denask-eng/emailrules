import type { Metadata } from "next";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { AskBox, Surfaces } from "@/components/ask-box";

export const metadata: Metadata = {
  title: "Check my domain",
  description:
    "A live SPF, DKIM, DMARC and blocklist check for your sending domain, read against every dated rule on this site. We name which blocklists answered and which declined, and whose job each finding is. Free, no account, findings with sources rather than a score.",
  alternates: { canonical: "/check" },
};

export default async function Check({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const { e } = await searchParams;

  return (
    <div className="shell shell-tight py-12 sm:py-16">
      <h1 className="text-[clamp(1.9rem,5.2vw,2.9rem)]">Paste anything.</h1>

      {/* One box, because choosing between four doors requires already knowing
          which question you have, and the person whose actual sentence is "our
          emails go to spam" does not. Every door is opened by a string they
          already have in their clipboard, so the box reads the string. */}
      <p className="mt-4 max-w-[56ch] text-[1.04rem] leading-relaxed text-muted-fg">
        A domain, an email address, an IP, or a whole message pasted in. We work out what it is and
        answer the question that string can actually answer.
      </p>

      <AskBox rows={3} align="start" className="mt-6" />

      {e ? (
        <p role="alert" className="mt-3 max-w-[58ch] text-[0.9rem] leading-relaxed text-live">
          {e}
        </p>
      ) : null}

      {/* The same three surfaces the homepage now names. A visitor who lands
          here from search has the box and, immediately under it, the two
          answers no DNS lookup can give. */}
      <Surfaces className="mt-10" />

      <section className="mt-14 border-t pt-10">
        <h2 className="text-[1.3rem]">What you get, and what we refuse to give you</h2>

        <div className="mt-6 max-w-[68ch] rounded-lg border border-border bg-bg-2 p-4 text-[0.9rem] leading-relaxed text-muted-fg">
          <b className="text-fg">Why not a score?</b> We have watched two different tools score the
          same campaign at 85 percent and 40 percent inbox placement. Scores are why nobody trusts
          this category. You get findings, each one traceable to a rule with a date.
        </div>

        <div className="mt-4 max-w-[68ch] rounded-lg border p-4 text-[0.9rem] leading-relaxed text-muted-fg">
          <b className="text-fg">What it can and cannot see.</b> DNS shows what you have published:
          SPF, its lookup count, DMARC and its policy, DKIM keys on the selectors the major platforms
          use, BIMI and MX. It cannot see your consent records, your subject lines, or whether DKIM
          aligns on a real message, and it says so rather than guessing. Have a real message?{" "}
          <Link href="/check/headers" className="text-fg underline decoration-1 underline-offset-3">
            Paste its headers
          </Link>{" "}
          and get the alignment verdict DNS cannot give.
        </div>

        <div className="mt-4 max-w-[68ch] rounded-lg border p-4 text-[0.9rem] leading-relaxed text-muted-fg">
          <b className="text-fg">On blocklists, two refusals.</b> We will not expand your sending
          platform&rsquo;s ranges. A shared pool&rsquo;s reputation and its removal channel belong to
          the platform, so handing you a stranger&rsquo;s listed address hands you a fire you cannot
          put out — we name the platform instead. And we will not read a list&rsquo;s silence as good
          news: every list here answers an entry it is required to publish before we believe anything
          it says about you, so a list that declines is reported as declined rather than as clean.
          Most checkers cannot tell those two apart.
        </div>
      </section>

      <section className="mt-12 border-t pt-10">
        <h2 className="text-[1.3rem]">What the box does with each thing</h2>
        <dl className="num mt-5 grid max-w-[62ch] grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-3 text-[0.9rem] sm:gap-x-8">
          {[
            ["a domain", "authentication, then twenty-three blocklists"],
            ["an address", "the domain it sends from"],
            ["an IP", "every list that answered today, sorted by whether the entry is even about it"],
            ["a message", "all of the above, plus the consent and content rules no other checker reads"],
            ["a record", "we say what it is, and which domain to give us instead"],
          ].map(([k, v]) => (
            <div key={k} className="col-span-2 grid grid-cols-subgrid items-baseline border-b border-border-soft pb-3">
              <dt className="text-dim whitespace-nowrap">{k}</dt>
              <dd className="m-0 text-muted-fg">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-5 max-w-[58ch] text-[0.95rem] leading-relaxed text-muted-fg">
          A message is the only one of those that can answer the question people actually arrive
          with, because it carries the address that really sent your campaign and everything your
          DNS cannot show.{" "}
          <Link href="/check/message" className="text-fg underline decoration-1 underline-offset-3">
            Send us one
          </Link>
          .
        </p>
        <p className="mt-5 max-w-[58ch] text-[0.95rem] leading-relaxed text-muted-fg">
          One domain can also be watched: subscribe with it and we re-read its authentication DNS
          daily, emailing you only when a record actually moves. Klaviyo send scans and a paid plan
          are not built. Today this site sells nothing.
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

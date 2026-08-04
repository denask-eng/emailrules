import type { Metadata } from "next";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

/**
 * The setup page, and the whole pitch is that there is nothing to sign up for.
 *
 * Every tool that reads DMARC reports puts an account in front of them. That is
 * not a technical requirement — a report is mail sent to an address, and an
 * address is all anyone needs. The one-time message check on this site already
 * proved the pattern: a token in a URL is the credential, and the page says so
 * out loud rather than pretending there is security here that there is not.
 */

export const metadata: Metadata = {
  title: "Read my DMARC reports",
  description:
    "Point your DMARC rua at an address you get in one click, with no account, and we read the daily reports every mailbox provider already sends you. We separate forwarded mail from mail nobody authenticated, because most of what other tools show you in red is Gmail forwarding your own message.",
  alternates: { canonical: "/dmarc" },
};

export default async function DmarcSetup({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const { e } = await searchParams;

  return (
    <div className="shell shell-tight py-12 sm:py-16">
      <p className="num label">No account · free · takes one minute</p>

      <h1 className="mt-4 text-[clamp(1.95rem,5.4vw,3rem)] leading-[1.02] tracking-[-0.04em]">
        Who is sending as you.
      </h1>

      <p className="mt-5 max-w-[58ch] text-[1.04rem] leading-relaxed text-muted-fg">
        Gmail, Yahoo and Microsoft already mail you a report every day listing every address that
        sent mail claiming to be your domain. Almost nobody reads them, because they arrive as
        gzipped XML. Give us an address to send them to and we will read them for you.
      </p>

      <form method="post" action="/api/dmarc" className="mt-8">
        <label htmlFor="domain" className="block text-[13.5px] font-medium">
          The domain your mail comes from
        </label>
        <div className="mt-2.5 flex flex-wrap gap-2.5">
          <input
            id="domain"
            name="domain"
            required
            autoComplete="url"
            spellCheck={false}
            placeholder="yourbrand.com"
            className="num min-w-0 flex-1 rounded-xl border bg-card px-3.5 py-3 text-[14px] outline-none focus-visible:ring-[3px] focus-visible:ring-accent/25"
            style={{ boxShadow: "var(--lift)" }}
          />
          <button
            type="submit"
            className={cn(buttonVariants({ size: "lg" }), "h-[3.05rem] rounded-xl px-6 font-medium")}
          >
            Get my address
          </button>
        </div>
      </form>

      {e ? (
        <p role="alert" className="mt-3 max-w-[58ch] text-[0.9rem] leading-relaxed text-live">
          {e}
        </p>
      ) : null}

      <section className="mt-14 border-t pt-10">
        <h2 className="text-[1.3rem] tracking-tight">What you will actually see</h2>
        <p className="mt-3 max-w-[62ch] text-[15px] leading-relaxed text-muted-fg">
          Four outcomes, from two bits, and only one of them is ever your problem.
        </p>

        <ul className="mt-6 list-none border-t p-0">
          {[
            [
              "Authenticated as you",
              "SPF and DKIM both aligned. Mail you sent, arriving as you intended.",
              "ok",
            ],
            [
              "Forwarded, not forged",
              "SPF failed, DKIM passed. SPF breaks by design when a message is forwarded — the forwarder becomes the sending host. DKIM signs the message and survives. This is a mailing list or an auto-forward, and it is the single largest source of red rows in every other tool.",
              "dim",
            ],
            [
              "Sent by you, but nothing signed it",
              "SPF aligned, DKIM did not. Usually a platform where DKIM was never finished.",
              "warn",
            ],
            [
              "Nothing proves this came from you",
              "Neither aligned. A sender you forgot, or someone using your domain — the address and the volume tell you which. This is the only row that has ever needed anybody to do anything.",
              "bad",
            ],
          ].map(([title, body, tone]) => (
            <li key={title} className="border-b border-border-soft py-4">
              <p className="flex items-baseline gap-2.5 text-[15px] font-medium">
                <span
                  aria-hidden
                  className={cn(
                    "inline-block h-1.5 w-1.5 shrink-0 translate-y-[-1px] rounded-full",
                    tone === "ok" && "bg-ok",
                    tone === "dim" && "bg-dim",
                    tone === "warn" && "bg-soon",
                    tone === "bad" && "bg-live",
                  )}
                />
                {title}
              </p>
              <p className="mt-1.5 max-w-[66ch] pl-4 text-[13.5px] leading-relaxed text-muted-fg">
                {body}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12 border-t pt-10">
        <h2 className="text-[1.3rem] tracking-tight">The honest parts</h2>
        <div className="mt-5 space-y-4">
          {[
            [
              "The link is the key.",
              "There is no account, so whoever has your results URL can read your results. That is the same trade the one-time message check makes. A report contains sending addresses and message counts — never message content, subjects or recipients — so the thing at risk is a list of your senders, not your mail. If that is not a trade you want, this is not for you and the trade is stated here rather than buried.",
            ],
            [
              "Reports take a day to start.",
              "Receivers batch them every 24 hours, so the page will be empty until tomorrow. It says so rather than showing you a zero and letting you conclude something is broken.",
            ],
            [
              "We keep 60 days.",
              "Long enough to see a weekly pattern, short enough that we are not sitting on a year of anyone's sending history.",
            ],
            [
              "You can point more than one tool at it.",
              "The rua tag takes a comma-separated list. Nothing here asks you to stop using whatever you already have, and if you are testing us against it, that is the correct way to do it.",
            ],
          ].map(([h, p]) => (
            <div key={h} className="max-w-[68ch] rounded-lg border p-4 text-[0.9rem] leading-relaxed text-muted-fg">
              <b className="text-fg">{h}</b> {p}
            </div>
          ))}
        </div>
      </section>

      <p className="mt-10 max-w-[62ch] text-[13.5px] leading-relaxed text-dim">
        Not sure whether you publish DMARC at all?{" "}
        <Link href="/check" className="underline underline-offset-3 hover:text-fg">
          Check the domain first
        </Link>{" "}
        — it reads the record live and tells you what the policy currently says.
      </p>
    </div>
  );
}

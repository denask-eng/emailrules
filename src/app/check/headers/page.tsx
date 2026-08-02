import type { Metadata } from "next";
import Link from "next/link";
import { Panel, SectionHead } from "@/components/bits";
import { buttonVariants } from "@/components/ui/button";
import { inboundDomain } from "@/lib/message-check";
import { cn } from "@/lib/utils";
import { HeaderForm } from "./header-form";

export const metadata: Metadata = {
  title: "Paste a whole message",
  description:
    "Paste one real marketing email and read what the message reveals: DKIM alignment, RFC 8058 one-click unsubscribe, a CAN-SPAM postal address, tracking pixels, Apple summary text and the subject line against the body. Every finding names a dated rule.",
  alternates: { canonical: "/check/headers" },
};

/* The banner at the top depends on whether the inbound address exists, and it
   would be worse than useless if it were cached from the day it did not. */
export const dynamic = "force-dynamic";

/**
 * The fallback door, kept because the URL is linked from four other pages and
 * because some people genuinely arrive with a message source already open.
 *
 * The paste box used to be the only way to check a real message, which asked
 * a marketer to find and copy raw headers — perhaps one in twenty can. The
 * page now leads with the address instead and runs the same engine either way.
 */
export default function HeaderCheckPage() {
  const configured = Boolean(inboundDomain());

  return (
    <div className="shell shell-tight py-12 sm:py-16">
      <p className="label">A check of the message that arrived</p>
      <h1 className="mt-3 text-[clamp(1.9rem,5.2vw,2.9rem)]">Paste a whole message.</h1>
      <p className="mt-5 max-w-[64ch] text-[1.04rem] leading-relaxed text-muted-fg">
        One real campaign, headers and body. The check names what the receiver recorded, which
        domains signed it, whether they align with From, whether one-click unsubscribe is genuinely
        present, and what the body reveals about consent and content law.
      </p>

      {configured ? (
        <Panel className="mt-8 p-5 sm:p-6">
          <p className="text-[0.95rem] leading-relaxed">
            <b>Easier: send it to us.</b> Finding and copying a raw message source is a power-user
            move. Sending an email is the one thing every marketer can already do, and it produces
            exactly the same findings.
          </p>
          <Link
            href="/check/message"
            className={cn(
              buttonVariants({ size: "lg" }),
              "mt-4 h-10 rounded-[10px] px-5 font-semibold",
            )}
          >
            Send us your actual campaign
          </Link>
        </Panel>
      ) : null}

      <p className="mt-8 max-w-[64ch] text-[0.92rem] leading-relaxed text-dim">
        The paste is parsed in this request. We keep the findings, the From domain and two dates —
        no body, no subject, no recipient, no raw headers.
      </p>

      <Panel className="mt-4">
        <HeaderForm />
      </Panel>

      <section className="mt-14 border-t pt-10">
        <SectionHead
          label="Before you paste"
          title="Get the raw message, not a summary."
          lede="Forwarding the email or copying the visible details removes the evidence this check needs."
        />
        <Panel>
          <ol className="list-none divide-y p-0">
            <li className="px-5 py-4 text-[0.94rem] leading-relaxed sm:px-6">
              <b>Gmail.</b>{" "}
              <span className="text-muted-fg">
                Open the message, choose ⋮ → Show original, then Copy to clipboard.
              </span>
            </li>
            <li className="px-5 py-4 text-[0.94rem] leading-relaxed sm:px-6">
              <b>Outlook.</b>{" "}
              <span className="text-muted-fg">
                Open the message, choose … → View → View message source.
              </span>
            </li>
            <li className="px-5 py-4 text-[0.94rem] leading-relaxed sm:px-6">
              <b>Apple Mail.</b>{" "}
              <span className="text-muted-fg">Choose View → Message → Raw Source.</span>
            </li>
          </ol>
        </Panel>
        <p className="mt-4 max-w-[64ch] text-[0.9rem] leading-relaxed text-dim">
          Headers alone still work. You get the authentication findings and nothing about the body,
          because there is no body to read.
        </p>
      </section>

      <Panel className="mt-8 bg-bg-2 p-5 text-[0.92rem] leading-relaxed text-muted-fg sm:p-6">
        <p>
          <b className="text-fg">What this proves, and what it does not.</b> We read the signature;
          we do not recompute its cryptography. Only a receiver can do that against the message it
          accepted. An Authentication-Results header is that receiver&apos;s verdict, so this check
          prefers it over its own alignment inference. The HTML is read for facts and never
          rendered, and no link in it is followed.
        </p>
      </Panel>
    </div>
  );
}

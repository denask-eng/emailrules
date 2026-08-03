import type { Metadata } from "next";
import Link from "next/link";
import { Panel } from "@/components/bits";
import { CopyField } from "@/components/copy-field";
import { buttonVariants } from "@/components/ui/button";
import { inboundDomain, newCheckId, RETENTION_DAYS } from "@/lib/message-check";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Send us your actual campaign",
  description:
    "Send one real marketing email to a one-time address. We read the message itself for DKIM alignment, RFC 8058 one-click unsubscribe, a CAN-SPAM postal address, tracking pixels and Apple summary text — every finding with the dated rule it comes from and whose job it is. No account, no score.",
  alternates: { canonical: "/check/message" },
};

/* The address is minted per visit, so nothing here may be cached and handed
   to the next person who arrives. */
export const dynamic = "force-dynamic";

const CHECKS: { title: string; body: string }[] = [
  {
    title: "DKIM alignment on the message you actually sent",
    body: "The d= domain against the From domain, plus whatever the receiver recorded. DNS can tell you a key is published; only a real message can tell you it signed the right domain.",
  },
  {
    title: "One-click unsubscribe, both headers",
    body: "List-Unsubscribe and List-Unsubscribe-Post. One without the other does not satisfy RFC 8058, and one without the other is the single most common real failure.",
  },
  {
    title: "A postal address in the body",
    body: "CAN-SPAM requires one on commercial mail. An address that lives only inside an image is not one, because the text is all a filter ever reads.",
  },
  {
    title: "Whether Apple has any text to summarise",
    body: "Apple Mail writes its own preheader from the first live text. Image-only campaigns get summarised from the subject line, and alt text does not save you.",
  },
  {
    title: "Open tracking, stated as a fact",
    body: "Whether the message carries a pixel, then the French rule that is in force and the Italian one that starts on 29 October 2026 — conditional on where you send, never asserted as a verdict.",
  },
  {
    title: "The subject line against the body it describes",
    body: "Only what a single message can defend: an offer named in the subject that is nowhere in the text, or a manufactured Re: on a message that is not a reply.",
  },
];

export default async function MessageCheckPage() {
  const domain = inboundDomain();

  /* Minted during this render rather than by a server action on click.
     The action version posted nothing at all in testing: one hydration error
     from an unrelated browser extension is enough to leave a form handler
     attached and dead, and the only thing standing between a visitor and the
     entire product was that one button. A link is a GET. It cannot fail to
     fire, it works with JavaScript off, and the page is already
     force-dynamic, so every arrival gets a fresh address. */
  const id = newCheckId();

  return (
    <div className="shell shell-tight py-12 sm:py-16">
      <p className="label">A check of the message, not the DNS</p>
      <h1 className="mt-3 text-[clamp(1.9rem,5.2vw,2.9rem)]">Send us your actual campaign.</h1>
      <p className="mt-5 max-w-[64ch] text-[1.04rem] leading-relaxed text-muted-fg">
        We will tell you what is technically wrong — like everyone else — what is legally exposed,
        like nobody else, and whose job each one is. DNS shows what you published. A message shows
        what you actually send.
      </p>

      {/* The address itself, on arrival, not behind a click. Nobody needs to
          press a button to be given a string. */}
      {domain ? (
        <Panel className="mt-8 p-5 sm:p-6">
          <CopyField
            label="Send one email to"
            value={`${id}@${domain}`}
            valueClassName="text-[clamp(0.95rem,3.1vw,1.35rem)]"
          />
          <Link
            href={`/check/message/${id}`}
            className={cn(
              buttonVariants({ size: "lg" }),
              "mt-5 h-10 rounded-[10px] px-5 font-semibold",
            )}
          >
            Open the page that waits for it
          </Link>
          <p className="mt-3 max-w-[58ch] text-[0.88rem] leading-relaxed text-dim">
            Single use. Leave that page open and it becomes the result the moment the message
            lands. Free, no account, no score.
          </p>
        </Panel>
      ) : (
        <Panel className="mt-8 p-5 sm:p-6">
          <p className="text-[0.95rem] leading-relaxed">
            <b>The inbound address is not switched on yet.</b> Rather than show you a box that
            silently does nothing, here is the door that works today: paste one whole message and
            the same engine reads it — the same findings, the same rules, the same result page.
          </p>
          <Link
            href="/check/headers"
            className={cn(
              buttonVariants({ size: "lg" }),
              "mt-4 h-10 rounded-[10px] px-5 font-semibold",
            )}
          >
            Paste a whole message
          </Link>
        </Panel>
      )}

      <section className="mt-14 border-t pt-10">
        <p className="label">What it reads</p>
        <h2 className="mt-3 text-[1.35rem]">
          Everyone checks a message against authentication. Nobody checks one against consent.
        </h2>
        <ul className="mt-7 list-none border-t p-0">
          {CHECKS.map((check) => (
            <li key={check.title} className="border-b py-4">
              <h3 className="text-[0.98rem] leading-snug">{check.title}</h3>
              <p className="mt-1.5 max-w-[64ch] text-[0.92rem] leading-relaxed text-muted-fg">
                {check.body}
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-6 max-w-[64ch] text-[0.95rem] leading-relaxed text-muted-fg">
          Every finding names the dated rule it comes from and says whether it is your ESP&apos;s
          job, shared, or yours — with the one concrete first move. There is no score, no grade and
          no percentage, here or on the share card.
        </p>
      </section>

      <section className="mt-12 border-t pt-10">
        <p className="label">What we keep</p>
        <h2 className="mt-3 text-[1.35rem]">The findings. Not the message.</h2>
        <p className="mt-4 max-w-[64ch] text-[0.98rem] leading-relaxed text-muted-fg">
          We store the findings, the From domain, the verdict sentence and the two dates. We do not
          store the body, the subject, the recipient, the address you sent from, or the raw headers.
          The message is parsed in memory and dropped. The share link expires after{" "}
          <span className="num">{RETENTION_DAYS}</span> days, and the page tells you the date it
          goes.
        </p>
        <p className="mt-4 max-w-[64ch] text-[0.92rem] leading-relaxed text-dim">
          Send a real campaign, not a test with customer data in it. We read the HTML for facts and
          never render it, follow no link in it and run nothing from it — but the honest advice is
          still to send the same message you send your list, not one addressed to a person.
        </p>
      </section>

      <section className="mt-12 border-t pt-10">
        <h2 className="text-[1.2rem]">Already have the headers?</h2>
        <p className="mt-3 max-w-[64ch] text-[0.95rem] leading-relaxed text-muted-fg">
          <Link href="/check/headers" className="text-fg underline decoration-1 underline-offset-3">
            Paste a whole message
          </Link>{" "}
          instead. It runs the same engine — paste the full source and you get the content and
          consent findings too, not only the authentication ones.
        </p>
        <p className="mt-3 max-w-[64ch] text-[0.95rem] leading-relaxed text-muted-fg">
          For what you have published rather than what you send,{" "}
          <Link href="/check" className="text-fg underline decoration-1 underline-offset-3">
            check a sending domain
          </Link>
          .
        </p>
      </section>
    </div>
  );
}

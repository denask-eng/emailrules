import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Panel } from "@/components/bits";
import { FindingList, FindingTally, type FindingOwnership } from "@/components/findings";
import { SubscribeForm } from "@/components/subscribe-form";
import { buttonVariants } from "@/components/ui/button";
import { fmtDate } from "@/lib/format";
import {
  inboundDomain,
  inboxAddress,
  isCheckId,
  loadMessageCheck,
  ruleMetaFor,
  RETENTION_DAYS,
  type MessageCheck,
} from "@/lib/message-check";
import { SITE } from "@/lib/site";
import { cn } from "@/lib/utils";
import { Arrival } from "./arrival";

/* One URL, two states. Waiting and resolved are the same page because the
   address, the wait and the share link are the same thing — a refresh cannot
   lose the result and a shared link cannot point at a different one. */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  if (!isCheckId(id)) return { title: "Message check" };

  const check = await loadMessageCheck(id);
  const title = check
    ? `${check.fromDomain ?? "A message"} — what this campaign reveals`
    : "Waiting for your message";
  const description = check
    ? `${check.verdict} Every finding names the dated rule it comes from and whose job it is. Findings, never a score.`
    : "Send one real campaign to a one-time address and read what the message itself reveals.";

  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      type: "website",
      title,
      description,
      url: `${SITE.url}/check/message/${id}`,
      siteName: SITE.name,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

function Waiting({ id }: { id: string }) {
  const address = inboxAddress(id);
  const configured = Boolean(inboundDomain());

  return (
    <div className="shell shell-tight py-12 sm:py-16">
      <p className="label">Waiting for one message</p>
      <h1 className="mt-3 text-[clamp(1.7rem,4.6vw,2.5rem)]">Leave this page open.</h1>

      {configured && address ? (
        <>
          <p className="mt-5 max-w-[64ch] text-[1.02rem] leading-relaxed text-muted-fg">
            Send one real campaign to the address below, from the platform you actually send with.
            A forward will not do it: forwarding rewrites the headers and strips the evidence.
          </p>

          <Panel className="mt-7 p-5 sm:p-6">
            <p className="label">Send one email to</p>
            <p className="num mt-2.5 text-[clamp(0.95rem,3.4vw,1.3rem)] break-all">{address}</p>
            <p className="mt-4 max-w-[58ch] text-[0.88rem] leading-relaxed text-dim">
              Single use. The first message to arrive becomes the result and later ones are ignored,
              so this link cannot be overwritten by anyone you share it with.
            </p>
            <Arrival id={id} />
          </Panel>

          <p className="mt-5 text-[0.9rem] text-muted-fg">
            <Link
              href={`/check/message/${id}`}
              className="text-fg underline decoration-1 underline-offset-3"
            >
              Check for it now
            </Link>{" "}
            if you have JavaScript off — this page reloads itself when the message lands.
          </p>
        </>
      ) : (
        <>
          <p className="mt-5 max-w-[64ch] text-[1.02rem] leading-relaxed text-muted-fg">
            The inbound address is not switched on yet, so there is nothing here to send to. We are
            not going to print an address that quietly discards your campaign.
          </p>
          <Link
            href="/check/headers"
            className={cn(
              buttonVariants({ size: "lg" }),
              "mt-6 h-10 rounded-[10px] px-5 font-semibold",
            )}
          >
            Paste a whole message instead
          </Link>
          <p className="mt-3 max-w-[62ch] text-[0.9rem] leading-relaxed text-dim">
            Same engine, same findings, same result page. It just asks you for the message source
            rather than accepting the message.
          </p>
        </>
      )}

      <section className="mt-14 border-t pt-10">
        <h2 className="text-[1.15rem]">While you are here — what we keep</h2>
        <p className="mt-3 max-w-[64ch] text-[0.95rem] leading-relaxed text-muted-fg">
          The findings, the From domain and two dates. Not the body, not the subject, not the
          address you send from, not the raw headers. The message is read in memory and dropped, and
          the resulting link expires after <span className="num">{RETENTION_DAYS}</span> days.
        </p>
      </section>
    </div>
  );
}

async function Result({ check }: { check: MessageCheck }) {
  const meta = await ruleMetaFor(check.findings);
  const ruleTitles = Object.fromEntries(
    Object.entries(meta).map(([slug, rule]) => [slug, rule.title]),
  );
  const ownership: Record<string, FindingOwnership> = Object.fromEntries(
    Object.entries(meta).map(([slug, rule]) => [
      slug,
      { ownership: rule.ownership, mondayMorning: rule.mondayMorning },
    ]),
  );
  const checkedOn = check.createdAt.slice(0, 10);
  const expiresOn = check.expiresAt.slice(0, 10);

  return (
    <div className="shell shell-tight py-12 sm:py-16">
      <p className="label">
        Message check · <span className="num">{fmtDate(checkedOn)}</span>
      </p>
      <h1 className="num mt-3 text-[clamp(1.6rem,4.5vw,2.5rem)] break-all">
        {check.fromDomain ?? "The message you sent"}
      </h1>

      <p className="mt-5 max-w-[62ch] text-[1.04rem] leading-relaxed text-muted-fg">
        {check.verdict} This is read off the message itself, not off your DNS. Every finding names
        the dated rule it came from and whose job it is.
      </p>

      <FindingTally findings={check.findings} />
      <FindingList findings={check.findings} ruleTitles={ruleTitles} ownership={ownership} />

      <div className="mt-9 rounded-xl border bg-bg-2 p-5 text-[0.92rem] leading-relaxed text-muted-fg">
        <b className="text-fg">What this proves, and what it does not.</b> We read the signature; we
        do not recompute its cryptography — only a receiver can do that against the message it
        accepted. Consent findings are read from the message, so they can only ever be about what
        the message shows. Where your recipients are is the fact that decides whether the French and
        Italian rules apply to you, and no message carries it.
      </div>

      <div className="mt-4 rounded-xl border p-5 text-[0.92rem] leading-relaxed text-muted-fg">
        <b className="text-fg">What we kept.</b> The findings above, the From domain and these two
        dates. No body, no subject, no recipient, no raw headers — nothing that would make this
        table worth stealing. This link stops working on{" "}
        <span className="num">{fmtDate(expiresOn)}</span>, which is why it is honest to call it
        temporary.
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/check/message"
          className={cn(buttonVariants({ variant: "outline" }), "h-10 rounded-[10px] px-5")}
        >
          Check another message
        </Link>
        {check.fromDomain ? (
          <Link
            href={`/check/${check.fromDomain}`}
            className={cn(buttonVariants(), "h-10 rounded-[10px] px-5 font-medium")}
          >
            Now check what {check.fromDomain} publishes
          </Link>
        ) : (
          <Link href="/rules" className={cn(buttonVariants(), "h-10 rounded-[10px] px-5 font-medium")}>
            See which rules are yours
          </Link>
        )}
      </div>

      {check.fromDomain ? (
        <section
          className="mt-12 rounded-xl border bg-card p-5 sm:p-6"
          style={{ boxShadow: "var(--lift)" }}
        >
          <h2 className="text-[15px] font-semibold">Watch this domain</h2>
          <p className="mt-1.5 max-w-[54ch] text-[13.5px] leading-relaxed text-muted-fg">
            One email if authentication DNS for {check.fromDomain} actually changes. Same list as
            rule alerts — one inbox, one promise.
          </p>
          <div className="mt-4">
            <SubscribeForm defaultDomain={check.fromDomain} compact />
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default async function MessageResult({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isCheckId(id)) notFound();

  const check = await loadMessageCheck(id);
  return check ? <Result check={check} /> : <Waiting id={id} />;
}

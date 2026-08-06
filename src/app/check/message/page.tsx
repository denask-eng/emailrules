import type { Metadata } from "next";
import Link from "next/link";
import { CampaignStart } from "./campaign-start";
import { inboundDomain, RECEIVE_MINUTES } from "@/lib/message-check";

export const metadata: Metadata = {
  title: "Check a campaign",
  description:
    "Send the campaign you actually plan to send. Get up to five prioritized findings with evidence, an owner, a first action and a dated source.",
  alternates: { canonical: "/check/message" },
};

export const dynamic = "force-dynamic";

export default function MessageCheckPage() {
  const enabled = Boolean(inboundDomain());
  return (
    <div className="shell shell-tight py-12 sm:py-16">
      <p className="inline-flex items-center gap-2 rounded-full border bg-card px-3.5 py-1.5 text-[12.5px] font-medium text-muted-fg">
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" />
        Check a campaign
      </p>
      <h1 className="mt-4 max-w-[16ch] text-[clamp(2.2rem,6vw,3.6rem)]">
        Send the campaign you actually plan to send.
      </h1>

      {enabled ? (
        <CampaignStart />
      ) : (
        <div className="mt-8 rounded-2xl border bg-card p-5 sm:p-7">
          <h2 className="text-[1.15rem] font-semibold">Campaign receiving is unavailable.</h2>
          <p className="mt-3 text-[14px] leading-relaxed text-muted-fg">
            No test address is shown when the receiving domain cannot accept it.
          </p>
          <Link href="/check/headers" className="mt-5 inline-flex min-h-12 items-center rounded-xl bg-accent px-5 text-[14px] font-semibold text-accent-fg">
            Paste a whole message instead
          </Link>
        </div>
      )}

      <section className="mt-12 grid gap-6 border-t pt-9 sm:grid-cols-3">
        <div>
          <p className="label">Private address</p>
          <p className="mt-2 text-[14px] leading-relaxed text-muted-fg">Single use and valid for {RECEIVE_MINUTES} minutes.</p>
        </div>
        <div>
          <p className="label">Actual evidence</p>
          <p className="mt-2 text-[14px] leading-relaxed text-muted-fg">Headers, MIME, body signals and bounded DNS observations.</p>
        </div>
        <div>
          <p className="label">Actionable result</p>
          <p className="mt-2 text-[14px] leading-relaxed text-muted-fg">Up to five findings. No score or placement prediction.</p>
        </div>
      </section>

      <section className="mt-10 rounded-2xl border bg-bg-2 p-5 text-[13.5px] leading-relaxed text-muted-fg">
        <h2 className="text-[14px] font-semibold text-fg">Message handling</h2>
        <p className="mt-2">
          Emailrules verifies the inbound webhook before processing. It does not render campaign HTML,
          load remote images, open links or interpret attachments. The report stores normalized
          findings, not the body, subject, recipient or raw headers.
        </p>
      </section>
    </div>
  );
}

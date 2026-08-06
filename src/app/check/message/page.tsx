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
      <p className="label text-accent">Check a campaign</p>
      <h1 className="mt-3 font-serif text-[clamp(2.5rem,7vw,4.5rem)] leading-[0.98] tracking-[-0.04em]">
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

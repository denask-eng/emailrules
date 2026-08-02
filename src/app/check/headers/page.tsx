import type { Metadata } from "next";
import { Panel, SectionHead } from "@/components/bits";
import { HeaderForm } from "./header-form";

export const metadata: Metadata = {
  title: "Check a received header",
  description:
    "Paste raw received email headers and read the receiver's authentication result, DKIM and SPF alignment, and one-click unsubscribe headers.",
  alternates: { canonical: "/check/headers" },
};

export default function HeaderCheckPage() {
  return (
    <div className="shell shell-tight py-12 sm:py-16">
      <p className="label">A check of the message that arrived</p>
      <h1 className="mt-3 text-[clamp(1.9rem,5.2vw,2.9rem)]">Check a received header.</h1>
      <p className="mt-5 max-w-[64ch] text-[1.04rem] leading-relaxed text-muted-fg">
        Paste the raw headers from one received email. The check names what the receiver recorded,
        which domains signed it, whether they align with From, and whether one-click unsubscribe is
        actually present.
      </p>
      <p className="mt-3 max-w-[64ch] text-[0.92rem] leading-relaxed text-dim">
        The paste is parsed in this request and never stored.
      </p>

      <Panel className="mt-8">
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
              <span className="text-muted-fg">Choose View → Message → All Headers.</span>
            </li>
          </ol>
        </Panel>
      </section>

      <Panel className="mt-8 bg-bg-2 p-5 text-[0.92rem] leading-relaxed text-muted-fg sm:p-6">
        <p>
          <b className="text-fg">What this proves, and what it does not.</b> We read the signature;
          we do not recompute its cryptography. Only a receiver can do that against the message it
          accepted. An Authentication-Results header is that receiver&apos;s verdict, so this check
          prefers it over its own alignment inference.
        </p>
      </Panel>
    </div>
  );
}

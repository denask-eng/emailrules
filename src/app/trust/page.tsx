import type { Metadata } from "next";
import Link from "next/link";
import { getAllRules } from "@/lib/rules";
import { fmtDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Trust",
  description: "Sources, method, coverage, freshness, corrections and message-handling boundaries behind Emailrules findings.",
  alternates: { canonical: "/trust" },
};

const STEPS = [
  ["Find", "Use a regulator, standards body, mailbox provider or sending-platform primary source."],
  ["Extract", "Record the exact published fact without turning it into Emailrules advice yet."],
  ["Interpret", "State who it applies to, when it starts and what remains uncertain."],
  ["Detect", "Define the bounded message, DNS or context evidence that can support a finding."],
  ["Review", "A person approves provider and regulator changes before publication."],
  ["Recheck", "Watch the source, retain its verification date and publish corrections when the reading changes."],
] as const;

export default async function TrustPage() {
  const rules = await getAllRules();
  const newest = rules.reduce((date, rule) => (rule.lastVerified > date ? rule.lastVerified : date), "");

  return (
    <div className="shell shell-tight py-12 sm:py-16">
      <p className="label">Trust</p>
      <h1 className="mt-3 text-[clamp(2.5rem,7vw,4.8rem)] leading-[1.04]">
        How a finding earns its place.
      </h1>

      <nav aria-label="Trust sections" className="mt-8 flex flex-wrap gap-x-5 gap-y-2 border-y py-4 text-[13px]">
        {[
          ["sources", "Sources"],
          ["method", "Method"],
          ["coverage", "Coverage"],
          ["freshness", "Freshness"],
          ["corrections", "Corrections"],
          ["privacy", "Privacy"],
        ].map(([id, label]) => (
          <a key={id} href={`#${id}`} className="min-h-8 underline decoration-border underline-offset-3 hover:text-accent">
            {label}
          </a>
        ))}
      </nav>

      <section id="sources" className="scroll-mt-20 border-b py-10">
        <p className="label">Sources</p>
        <h2 className="mt-3 text-[1.55rem]">Primary material, attached to the action.</h2>
        <p className="mt-4 text-[15px] leading-relaxed text-muted-fg">
          Each rule names its publisher, source URL, publication date when the publisher provides one,
          and the date Emailrules last verified it. A report snapshots the rule and source used for that check.
        </p>
        <Link href="/sources" className="mt-4 inline-flex text-[14px] text-accent underline underline-offset-3">
          Browse the source register
        </Link>
      </section>

      <section id="method" className="scroll-mt-20 border-b py-10">
        <p className="label">Method</p>
        <h2 className="mt-3 text-[1.55rem]">How a claim becomes a rule</h2>
        <ol className="mt-7 list-none border-t p-0">
          {STEPS.map(([title, body], index) => (
            <li key={title} className="grid gap-2 border-b py-4 sm:grid-cols-[42px_110px_1fr]">
              <span className="num text-[12px] text-accent">{String(index + 1).padStart(2, "0")}</span>
              <h3 className="text-[14px] font-semibold">{title}</h3>
              <p className="text-[14px] leading-relaxed text-muted-fg">{body}</p>
            </li>
          ))}
        </ol>
        <Link href="/methodology" className="mt-4 inline-flex text-[14px] text-accent underline underline-offset-3">
          Read the full methodology
        </Link>
      </section>

      <section id="coverage" className="scroll-mt-20 border-b py-10">
        <p className="label">Coverage</p>
        <h2 className="mt-3 text-[1.55rem]">A bounded check, not a universal verdict.</h2>
        <p className="mt-4 text-[15px] leading-relaxed text-muted-fg">
          Campaign preflight covers message structure, authentication evidence, unsubscribe evidence,
          sender identity, selected measurement risks and rules applicable to the context supplied.
          It does not predict inbox placement, certify legal compliance or infer recipient geography.
        </p>
        <Link href="/coverage" className="mt-4 inline-flex text-[14px] text-accent underline underline-offset-3">
          See the coverage map
        </Link>
      </section>

      <section id="freshness" className="scroll-mt-20 border-b py-10">
        <p className="label">Freshness</p>
        <h2 className="mt-3 text-[1.55rem]">Verification dates stay visible.</h2>
        <p className="mt-4 text-[15px] leading-relaxed text-muted-fg">
          The corpus contains <span className="num">{rules.length}</span> public rules. The newest
          recorded verification is <span className="num">{newest ? fmtDate(newest) : "not available"}</span>.
          Source pages are checked for changes, but a machine never publishes a changed interpretation.
        </p>
        <Link href="/freshness" className="mt-4 inline-flex text-[14px] text-accent underline underline-offset-3">
          Inspect freshness
        </Link>
      </section>

      <section id="corrections" className="scroll-mt-20 border-b py-10">
        <p className="label">Corrections</p>
        <h2 className="mt-3 text-[1.55rem]">Site corrections are not market changes.</h2>
        <p className="mt-4 text-[15px] leading-relaxed text-muted-fg">
          Provider, platform and regulator changes belong in Changes. Corrections to Emailrules claims
          are recorded separately so an internal fix cannot be mistaken for an external event.
        </p>
        <Link href="/corrections#report" className="mt-4 inline-flex text-[14px] text-accent underline underline-offset-3">
          Read or report a correction
        </Link>
      </section>

      <section id="privacy" className="scroll-mt-20 py-10">
        <p className="label">Campaign handling</p>
        <h2 className="mt-3 text-[1.55rem]">Untrusted input with no active capabilities.</h2>
        <ul className="mt-5 list-none border-t p-0 text-[14px] leading-relaxed text-muted-fg">
          {[
            "Webhook signatures are verified against the untouched webhook body.",
            "Campaign HTML is never rendered; remote images are not fetched and links are not opened.",
            "Attachments are not interpreted as campaign content.",
            "The report stores normalized findings, not the body, subject, recipient or raw headers.",
            "Could not determine is kept separate from pass and fail.",
          ].map((line) => <li key={line} className="border-b py-3">{line}</li>)}
        </ul>
      </section>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Eye, FileCheck2, ShieldCheck } from "lucide-react";
import { getAllRules } from "@/lib/rules";
import { fmtDate } from "@/lib/format";
import { buttonVariants } from "@/components/ui/button";
import { TrackedLink } from "@/components/tracked-link";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Campaign preflight before you send",
  description:
    "Send one real campaign and get up to five prioritized findings with evidence, an owner, a first action and a dated primary source. No spam score.",
  alternates: { canonical: "/" },
};

export const revalidate = 900;

const CHECKS = [
  "Authentication and alignment on the delivered message",
  "One-click and in-message unsubscribe evidence",
  "Sender identity and postal-address indicators",
  "Tracking and measurement risk",
  "Applicability to your ESP, geographies and Gmail volume",
];

export default async function Home() {
  const rules = await getAllRules();
  const exampleRule = rules.find((rule) => rule.slug === "one-click-unsubscribe-rfc-8058");
  const exampleSource = exampleRule?.sources[0];
  const featured = [
    "one-click-unsubscribe-rfc-8058",
    "gmail-bulk-sender-requirements",
    "france-email-open-tracking-consent",
  ]
    .map((slug) => rules.find((rule) => rule.slug === slug))
    .filter((rule): rule is NonNullable<typeof rule> => Boolean(rule));

  return (
    <div className="pb-20">
      <section className="shell grid gap-10 py-14 sm:py-20 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,.9fr)] lg:items-center lg:py-24">
        <div>
          <p className="label text-accent">Verified campaign preflight</p>
          <h1 className="mt-4 max-w-[12ch] font-serif text-[clamp(2.6rem,7vw,5.4rem)] leading-[0.96] font-medium tracking-[-0.045em]">
            Send one campaign. See what needs fixing before you send.
          </h1>
          <p className="mt-6 max-w-[62ch] text-[clamp(1rem,2vw,1.16rem)] leading-relaxed text-muted-fg">
            Send the real test from Klaviyo, Mailchimp or Braze. Get up to five technical,
            compliance and measurement findings, each with an owner and a dated primary source.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <TrackedLink
              href="/check/message"
              event="homepage-campaign-check-clicked"
              className={cn(buttonVariants({ size: "lg" }), "min-h-13 rounded-2xl px-6 text-[15px] font-semibold")}
            >
              Check a campaign <ArrowRight className="size-4" aria-hidden />
            </TrackedLink>
            <Link
              href="/rules"
              className="inline-flex min-h-12 items-center px-2 text-[14px] font-medium underline decoration-border underline-offset-4 hover:text-accent"
            >
              Browse verified rules
            </Link>
          </div>
          <p className="mt-4 max-w-[58ch] text-[13px] leading-relaxed text-dim">
            The raw message is processed without rendering it, opening links or loading images.
            Emailrules stores normalized findings, not the campaign body.
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-[var(--lift-2)] sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-soon-bg px-2.5 py-1 text-[11px] font-semibold tracking-wide text-soon uppercase">
                Needs review
              </span>
              <span className="rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide text-muted-fg uppercase">
                Observed
              </span>
            </div>
            <span className="num text-[11px] text-dim">High confidence</span>
          </div>
          <h2 className="mt-5 text-[1.35rem] leading-snug font-semibold">
            One-click unsubscribe is incomplete.
          </h2>
          <dl className="mt-5 grid gap-4 text-[14px] leading-relaxed">
            <div>
              <dt className="label">Example campaign</dt>
              <dd className="mt-1.5 text-muted-fg">
                List-Unsubscribe is present. List-Unsubscribe-Post is missing.
              </dd>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="label">Owner</dt>
                <dd className="mt-1.5">ESP admin</dd>
              </div>
              <div>
                <dt className="label">First action</dt>
                <dd className="mt-1.5">Check branded sending-domain and unsubscribe settings.</dd>
              </div>
            </div>
          </dl>
          {exampleRule && exampleSource ? (
            <p className="mt-5 border-t pt-4 text-[12.5px] text-dim">
              <a
                href={exampleSource.url}
                target="_blank"
                rel="noopener nofollow"
                className="text-fg underline underline-offset-3"
              >
                {exampleSource.name}
              </a>{" "}
              · verified {fmtDate(exampleRule.lastVerified)}
            </p>
          ) : null}
        </div>
      </section>

      <section className="border-y bg-fg text-bg">
        <div className="shell grid gap-px sm:grid-cols-2 lg:grid-cols-4">
          {[
            [FileCheck2, "Actual message", "Evidence from the campaign that arrived."],
            [Eye, "No score", "Prioritized findings instead of a grade."],
            [ShieldCheck, "Primary sources", "A publisher and verification date on every action."],
            [Check, "Clear evidence", "Observed, inferred, or could not determine."],
          ].map(([Icon, title, body]) => {
            const Mark = Icon as typeof Check;
            return (
              <div key={String(title)} className="border-white/12 px-5 py-7 lg:border-r last:border-r-0">
                <Mark className="size-4 text-blue-300" aria-hidden />
                <h2 className="mt-4 text-[15px] font-semibold">{String(title)}</h2>
                <p className="mt-1.5 text-[13px] leading-relaxed text-white/65">{String(body)}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="shell py-16 sm:py-20">
        <p className="label">How it works</p>
        <ol className="mt-7 grid list-none gap-8 p-0 md:grid-cols-3">
          {[
            ["01", "Choose context", "Name your ESP, sending geographies and Gmail volume."],
            ["02", "Send the real test", "Use the campaign you actually plan to send, not a forward."],
            ["03", "Fix what matters", "Start with the owner and first action on up to five findings."],
          ].map(([number, title, body]) => (
            <li key={number} className="border-t border-fg/20 pt-5">
              <span className="num text-[12px] text-accent">{number}</span>
              <h2 className="mt-5 text-[1.25rem] font-semibold">{title}</h2>
              <p className="mt-2 max-w-[36ch] text-[14px] leading-relaxed text-muted-fg">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-bg-2 py-16 sm:py-20">
        <div className="shell grid gap-10 lg:grid-cols-2 lg:gap-20">
          <div>
            <p className="label">Why a real message</p>
            <h2 className="mt-3 max-w-[15ch] font-serif text-[clamp(2rem,5vw,3.6rem)] leading-[1.02] tracking-[-0.035em]">
              Published DNS is not the campaign you send.
            </h2>
            <p className="mt-5 max-w-[58ch] text-[15px] leading-relaxed text-muted-fg">
              A domain checker cannot prove which DKIM signature arrived, whether unsubscribe
              headers were attached, what sender identity appears in the message, or which tracking
              the campaign carries.
            </p>
          </div>
          <ul className="list-none border-t p-0">
            {CHECKS.map((check) => (
              <li key={check} className="flex gap-3 border-b py-4 text-[15px] leading-relaxed">
                <Check className="mt-1 size-4 shrink-0 text-accent" aria-hidden />
                {check}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="shell py-16 sm:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="label">The evidence engine</p>
            <h2 className="mt-3 text-[clamp(1.8rem,4vw,2.8rem)]">Representative verified rules</h2>
          </div>
          <Link href="/rules" className="text-[14px] underline underline-offset-4 hover:text-accent">
            Browse all rules
          </Link>
        </div>
        <ul className="mt-8 grid list-none gap-4 p-0 lg:grid-cols-3">
          {featured.map((rule) => (
            <li key={rule.slug}>
              <Link
                href={`/rules/${rule.slug}`}
                className="block h-full rounded-2xl border bg-card p-5 transition-colors hover:border-accent/45"
              >
                <p className="label text-accent">{rule.jurisdictions.join(" · ")}</p>
                <h3 className="mt-3 text-[1.08rem] leading-snug font-semibold">{rule.title}</h3>
                <p className="mt-4 text-[12.5px] text-dim">
                  Verified {fmtDate(rule.lastVerified)} · {rule.sources.length} primary {rule.sources.length === 1 ? "source" : "sources"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="shell pb-16 sm:pb-20">
        <div className="rounded-2xl border bg-card p-6 sm:p-8">
          <p className="label">Privacy and trust</p>
          <div className="mt-5 grid gap-6 md:grid-cols-3">
            <div>
              <h2 className="text-[15px] font-semibold">No campaign rendering</h2>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted-fg">No remote image fetch and no link activation.</p>
            </div>
            <div>
              <h2 className="text-[15px] font-semibold">Normalized findings only</h2>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted-fg">The body, subject, recipient and raw headers are not stored in the report.</p>
            </div>
            <div>
              <h2 className="text-[15px] font-semibold">Redacted sharing</h2>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted-fg">Recipient details, tokens and personalized URLs stay out of shared evidence.</p>
            </div>
          </div>
          <Link href="/trust" className="mt-6 inline-flex min-h-11 items-center text-[14px] font-medium text-accent underline underline-offset-4">
            Read the method and coverage
          </Link>
        </div>
      </section>

      <section className="border-y bg-accent py-14 text-accent-fg">
        <div className="shell flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-[13px] font-semibold tracking-wide text-white/70 uppercase">One real send</p>
            <h2 className="mt-2 font-serif text-[clamp(2rem,5vw,3.5rem)] leading-none">Up to five actions. No spam score.</h2>
          </div>
          <TrackedLink href="/check/message" event="homepage-campaign-check-clicked" className="inline-flex min-h-13 items-center rounded-2xl bg-white px-6 text-[15px] font-semibold text-accent hover:bg-white/90">
            Check a campaign <ArrowRight className="ml-2 size-4" aria-hidden />
          </TrackedLink>
        </div>
      </section>
    </div>
  );
}

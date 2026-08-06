import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
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

/** The primary action, one shape everywhere it repeats down the page. */
function CheckCta({ size = "lg" }: { size?: "lg" | "xl" }) {
  return (
    <TrackedLink
      href="/check/message"
      event="homepage-campaign-check-clicked"
      className={cn(
        buttonVariants({ size: "lg" }),
        "rounded-full font-semibold shadow-[0_2px_8px_-2px_rgb(29_63_208/0.45)]",
        size === "xl" ? "min-h-14 px-8 text-[16px]" : "min-h-13 px-7 text-[15px]",
      )}
    >
      Check a campaign <ArrowRight className="size-4" aria-hidden />
    </TrackedLink>
  );
}

export default async function Home() {
  const rules = await getAllRules();
  const unsub = rules.find((rule) => rule.slug === "one-click-unsubscribe-rfc-8058");
  const gmail = rules.find((rule) => rule.slug === "gmail-bulk-sender-requirements");
  const france = rules.find((rule) => rule.slug === "france-email-open-tracking-consent");
  const geoCount = new Set(rules.flatMap((rule) => rule.jurisdictions)).size;
  const featured = [unsub, gmail, france].filter(
    (rule): rule is NonNullable<typeof rule> => Boolean(rule),
  );

  /* Every line below is either copied from the shipped example finding or cited
     from a real rule in the corpus. The frame is labelled an example; the
     sources and verification dates are not invented. */
  const demo = [
    {
      chip: "Fix",
      chipClass: "bg-live-bg text-live",
      state: "Observed",
      title: "One-click unsubscribe is incomplete.",
      evidence: "List-Unsubscribe is present. List-Unsubscribe-Post is missing.",
      owner: "ESP admin",
      action: "Check branded sending-domain and unsubscribe settings.",
      rule: unsub,
    },
    {
      chip: "Review",
      chipClass: "bg-soon-bg text-soon",
      state: "Inferred",
      title: "This send is inside Gmail's bulk-sender bar.",
      evidence: "5,000+ a day to Gmail puts authentication, PTR, TLS and the 0.30 percent spam rate in scope.",
      owner: "You and your ESP",
      action: "Confirm SPF, DKIM and DMARC alignment on the delivered message.",
      rule: gmail,
    },
    {
      chip: "No issue observed",
      chipClass: "bg-ok-bg text-ok",
      state: "Observed",
      title: "No open-tracking pixel in the delivered message.",
      evidence: "France requires consent for open tracking. This campaign does not track opens.",
      owner: "Nothing to do",
      action: "None. Keep it that way.",
      rule: france,
    },
  ];

  return (
    <div>
      {/* ── Hero: the claim, the action, then the product proving both ────── */}
      <section className="hero-band">
        <div className="shell flex flex-col items-center pt-16 pb-14 text-center sm:pt-24 sm:pb-20">
          <p className="inline-flex items-center gap-2 rounded-full border bg-card px-3.5 py-1.5 text-[12.5px] font-medium text-muted-fg">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" />
            Verified campaign preflight
          </p>
          <h1 className="mt-6 max-w-[19ch] text-[clamp(2.5rem,6.5vw,4.6rem)]">
            Send one campaign. See what needs fixing before you send.
          </h1>
          <p className="mt-6 max-w-[52ch] text-[clamp(1rem,2vw,1.2rem)] leading-relaxed text-muted-fg">
            Send the real test from Klaviyo, Mailchimp or Braze. Get up to five technical,
            compliance and measurement findings, each with an owner and a dated primary source.
          </p>
          <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
            <CheckCta size="xl" />
            <Link
              href="/rules"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "min-h-14 rounded-full bg-card px-7 text-[15px] font-medium",
              )}
            >
              Browse verified rules
            </Link>
          </div>
          <p className="mt-5 text-[13px] leading-relaxed text-dim">
            The raw message is processed without rendering it, opening links or loading images.
          </p>

          {/* The product is the pitch: a real report, framed. */}
          <figure className="m-0 mt-12 w-full max-w-[880px] text-left sm:mt-16">
            <div className="app-frame">
              <div className="app-frame-bar">
                <span aria-hidden className="flex gap-1.5">
                  <i className="app-frame-dot" />
                  <i className="app-frame-dot" />
                  <i className="app-frame-dot" />
                </span>
                <span className="num min-w-0 flex-1 truncate text-center text-[11.5px] text-dim">
                  emailrules.today/check
                </span>
                <span className="label shrink-0 rounded-full border px-2 py-1">Example report</span>
              </div>

              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-border-soft px-5 pt-5 pb-4 sm:px-7">
                <h2 className="text-[1.05rem] font-semibold tracking-tight">
                  Campaign preflight · 5 findings
                </h2>
                <p className="num text-[11.5px] text-dim">Klaviyo · EU + US · 5,000+ a day to Gmail</p>
              </div>

              <ol className="m-0 list-none divide-y divide-border-soft p-0">
                {demo.map((f, i) => (
                  <li
                    key={f.title}
                    className="settle grid gap-x-8 gap-y-3 px-5 py-5 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] sm:px-7"
                    style={{ "--settle-delay": `${140 + i * 120}ms` } as React.CSSProperties}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase",
                            f.chipClass,
                          )}
                        >
                          {f.chip}
                        </span>
                        <span className="rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide text-muted-fg uppercase">
                          {f.state}
                        </span>
                      </div>
                      <h3 className="mt-3 text-[15.5px] leading-snug font-semibold">{f.title}</h3>
                      <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-fg">{f.evidence}</p>
                    </div>
                    <dl className="m-0 grid grid-cols-2 content-start gap-x-6 gap-y-3 text-[13px] sm:grid-cols-1">
                      <div>
                        <dt className="label">Owner</dt>
                        <dd className="m-0 mt-1">{f.owner}</dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="label">First action</dt>
                        <dd className="m-0 mt-1 leading-relaxed">{f.action}</dd>
                      </div>
                      {f.rule?.sources[0] ? (
                        <div className="col-span-2 min-w-0 sm:col-span-1">
                          <dt className="sr-only">Source</dt>
                          <dd className="m-0 line-clamp-2 text-[12px] leading-relaxed break-words text-dim">
                            <a
                              href={f.rule.sources[0].url}
                              target="_blank"
                              rel="noopener nofollow"
                              className="underline decoration-input underline-offset-3 hover:text-fg"
                            >
                              {f.rule.sources[0].name}
                            </a>{" "}
                            · verified {fmtDate(f.rule.lastVerified)}
                          </dd>
                        </div>
                      ) : null}
                    </dl>
                  </li>
                ))}
              </ol>
              <p className="m-0 border-t border-border-soft bg-bg-2 px-5 py-3 text-center text-[12.5px] text-dim sm:px-7">
                Two more findings in the full report, each with the same evidence line and source.
              </p>
            </div>
            <figcaption className="sr-only">
              An example campaign preflight report with three findings, each carrying an owner, a
              first action and a dated primary source.
            </figcaption>
          </figure>

          <p className="num mt-10 flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1 text-[12.5px] tracking-[0.02em] text-muted-fg">
            <span>
              <b className="text-[1rem] font-semibold text-fg">{rules.length}</b> human-verified rules
            </span>
            <span aria-hidden className="text-dim">·</span>
            <span>
              <b className="text-[1rem] font-semibold text-fg">{geoCount}</b> jurisdictions
            </span>
            <span aria-hidden className="text-dim">·</span>
            <span>a dated primary source on every finding</span>
          </p>
        </div>
      </section>

      {/* ── How it works, then the same door again ────────────────────────── */}
      <section className="shell py-16 text-center sm:py-24">
        <p className="label text-accent">How it works</p>
        <h2 className="mx-auto mt-3 max-w-[22ch] text-[clamp(1.8rem,4.2vw,2.7rem)]">
          One real send. Up to five prioritized fixes.
        </h2>
        <ol className="mx-auto mt-10 grid max-w-[960px] list-none gap-4 p-0 text-left sm:mt-12 md:grid-cols-3">
          {[
            ["1", "Choose context", "Name your ESP, sending geographies and Gmail volume."],
            ["2", "Send the real test", "Use the campaign you actually plan to send, not a forward."],
            ["3", "Fix what matters", "Start with the owner and first action on up to five findings."],
          ].map(([number, title, body]) => (
            <li key={number} className="rounded-2xl border bg-card p-6">
              <span className="num inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-[13.5px] font-semibold text-accent">
                {number}
              </span>
              <h3 className="mt-4 text-[1.1rem]">{title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-muted-fg">{body}</p>
            </li>
          ))}
        </ol>
        <div className="mt-10 flex justify-center">
          <CheckCta />
        </div>
      </section>

      {/* ── Why the real message, not published DNS ───────────────────────── */}
      <section className="border-y bg-bg-2 py-16 sm:py-24">
        <div className="shell grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-20">
          <div>
            <p className="label text-accent">Why a real message</p>
            <h2 className="mt-3 max-w-[16ch] text-[clamp(1.9rem,4.4vw,3rem)]">
              Published DNS is not the campaign you send.
            </h2>
            <p className="mt-5 max-w-[58ch] text-[15px] leading-relaxed text-muted-fg">
              A domain checker cannot prove which DKIM signature arrived, whether unsubscribe
              headers were attached, what sender identity appears in the message, or which tracking
              the campaign carries.
            </p>
          </div>
          <ul className="list-none rounded-2xl border bg-card p-2 sm:p-3">
            {CHECKS.map((check) => (
              <li
                key={check}
                className="flex gap-3 border-b border-border-soft px-3 py-4 text-[14.5px] leading-relaxed last:border-b-0 sm:px-4"
              >
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ok-bg">
                  <Check className="size-3 text-ok" aria-hidden />
                </span>
                {check}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── The shelf behind the check ────────────────────────────────────── */}
      <section className="shell py-16 sm:py-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="label text-accent">The evidence engine</p>
            <h2 className="mt-3 text-[clamp(1.8rem,4vw,2.7rem)]">Every finding cites a verified rule.</h2>
          </div>
          <Link
            href="/rules"
            className="inline-flex min-h-11 items-center gap-1.5 text-[14px] font-medium text-accent hover:underline"
          >
            Browse all rules <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </div>
        <ul className="mt-8 grid list-none gap-4 p-0 lg:grid-cols-3">
          {featured.map((rule) => (
            <li key={rule.slug}>
              <Link
                href={`/rules/${rule.slug}`}
                className="lift-hover block h-full rounded-2xl border bg-card p-6 hover:border-accent/45"
              >
                <p className="label text-accent">{rule.jurisdictions.join(" · ")}</p>
                <h3 className="mt-3 text-[1.08rem] leading-snug">{rule.title}</h3>
                <p className="num mt-4 text-[12px] text-dim">
                  Verified {fmtDate(rule.lastVerified)} · {rule.sources.length} primary{" "}
                  {rule.sources.length === 1 ? "source" : "sources"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ── What this is, in four sentences, on ink ───────────────────────── */}
      <section className="border-y bg-fg py-14 text-bg sm:py-20">
        <div className="shell text-center">
          <h2 className="mx-auto max-w-[24ch] text-[clamp(1.7rem,3.8vw,2.5rem)] text-white">
            No placement score. No legal certification. No ESP affiliate.
          </h2>
          <dl className="mx-auto mt-10 grid max-w-[960px] gap-x-8 gap-y-8 text-left sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Actual message", "Evidence from the campaign that arrived."],
              ["No score", "Prioritized findings instead of a grade."],
              ["Primary sources", "A publisher and verification date on every action."],
              ["Clear evidence", "Observed, inferred, or could not determine."],
            ].map(([title, body]) => (
              <div key={title} className="border-t border-white/15 pt-4">
                <dt className="text-[14.5px] font-semibold text-white">{title}</dt>
                <dd className="m-0 mt-1.5 text-[13px] leading-relaxed text-white/65">{body}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── Privacy, then the last door ───────────────────────────────────── */}
      <section className="shell py-16 sm:py-20">
        <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div>
            <h2 className="text-[1.25rem]">Built to be safe to test with</h2>
            <ul className="mt-4 grid list-none gap-x-8 gap-y-3 p-0 text-[14px] leading-relaxed text-muted-fg sm:grid-cols-3">
              <li>No campaign rendering, remote image fetch or link activation.</li>
              <li>Normalized findings only. The body, subject and recipient are not stored.</li>
              <li>Recipient details, tokens and personalized URLs stay out of shared evidence.</li>
            </ul>
          </div>
          <Link
            href="/trust"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "min-h-12 justify-self-start rounded-full px-6 text-[14px] font-medium md:justify-self-end",
            )}
          >
            Read the method
          </Link>
        </div>
      </section>

      <section className="border-t bg-accent py-16 text-accent-fg sm:py-24">
        <div className="shell flex flex-col items-center text-center">
          <h2 className="max-w-[18ch] text-[clamp(2rem,5vw,3.4rem)] text-white">
            Up to five actions. No spam score.
          </h2>
          <p className="mt-4 max-w-[44ch] text-[15px] leading-relaxed text-white/75">
            Send the campaign you actually plan to send and read the findings in minutes.
          </p>
          <TrackedLink
            href="/check/message"
            event="homepage-campaign-check-clicked"
            className="mt-8 inline-flex min-h-14 items-center gap-2 rounded-full bg-white px-8 text-[16px] font-semibold text-accent shadow-[0_2px_10px_rgb(0_0_0/0.18)] hover:bg-white/92"
          >
            Check a campaign <ArrowRight className="size-4" aria-hidden />
          </TrackedLink>
        </div>
      </section>
    </div>
  );
}

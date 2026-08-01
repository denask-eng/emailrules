import type { Metadata } from "next";
import { getStats } from "@/lib/rules";
import { SectionHead } from "@/components/bits";

export const metadata: Metadata = {
  title: "Check your sends",
  description:
    "Point it at your sending domain. It reads the last 90 days against every rule on this site and names the sends that are exposed, with the date each rule started to apply.",
  alternates: { canonical: "/check" },
};

const FINDINGS = [
  {
    sev: "hi",
    text: "sends reached French recipients carrying an open-tracking pixel, with no separate tracking consent on record.",
    n: 12,
    src: "FR · open-tracking consent · in force 14 Jul 2026 · CNIL 2026-042",
  },
  {
    sev: "hi",
    text: 'subject lines claimed "Today only" on promotions that ran three days or longer.',
    n: 3,
    src: "US-WA · misleading subject line · per-se violation · Brown v. Old Navy",
  },
  {
    sev: "mid",
    text: "campaign used photorealistic AI-generated product imagery with no disclosure. The deepfake limb has no human-review exception.",
    n: 1,
    src: "EU · AI content disclosure · in force 2 Aug 2026 · AI Act Art. 50(4)",
  },
  {
    sev: "mid",
    text: "image-only emails will be summarised by Apple Mail from the subject line alone. Alt text is ignored.",
    n: 7,
    src: "Apple · summary readability · 64.66% of all opens · measured Mar 2025",
  },
] as const;

export default async function Check() {
  const stats = await getStats();

  return (
    <div className="wrap wrap-narrow py-12 md:py-16">
      <h1 className="text-[clamp(28px,4.4vw,42px)] font-semibold leading-[1.1]">
        Check your sends against{" "}
        <span
          style={{
            fontFamily: "var(--serif)",
            fontStyle: "italic",
            fontWeight: 400,
            color: "var(--primary)",
          }}
        >
          every rule.
        </span>
      </h1>
      <p className="mt-5 text-[17px] leading-relaxed" style={{ color: "var(--muted-fg)", maxWidth: "58ch" }}>
        One domain, no signup. You get findings with dates and sources, not a score out of ten.
      </p>

      <form className="mt-7 flex max-w-[520px] gap-2.5" action="/api/check" method="post">
        <input
          name="domain"
          required
          placeholder="yourbrand.com"
          aria-label="Sending domain"
          className="tabular h-[42px] flex-1 rounded-lg px-3.5 text-[14.5px]"
          style={{ border: "1px solid var(--input)", background: "var(--card)", color: "var(--fg)" }}
        />
        <button type="submit" className="btn btn-lg btn-primary">
          Run check
        </button>
      </form>
      <p className="mt-2.5 text-[13.5px]" style={{ color: "var(--muted-fg)" }}>
        Optional: connect Klaviyo read-only to scan the last 90 days of real sends.
      </p>

      <div className="card mt-7 p-5 text-[14px]" style={{ background: "var(--muted)", maxWidth: "64ch", color: "var(--muted-fg)" }}>
        <b style={{ color: "var(--fg)" }}>Why not a score?</b> Two well-known tools scored the same
        campaign at 85 percent and 40 percent inbox placement. Scores are why nobody trusts this
        category. You get findings, each one traceable to a rule with a date.
      </div>

      {/* sample report */}
      <section id="sample" className="mt-14 scroll-mt-20" style={{ borderTop: "1px solid var(--border)", paddingTop: 40 }}>
        <SectionHead
          eyebrow={`Sample report · 90 days · 214 sends · ${stats.total} rules`}
          title="Four things need attention"
        />

        <div className="card overflow-hidden">
          {FINDINGS.map((f) => (
            <div
              key={f.src}
              className="grid grid-cols-[10px_1fr] items-start gap-4 px-5 py-4"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <span
                className="mt-2 h-2 w-2 rounded-full"
                style={{ background: f.sev === "hi" ? "var(--live)" : "var(--soon)" }}
                aria-hidden
              />
              <div>
                <div className="text-[14.5px] leading-relaxed">
                  <b className="tabular">{f.n}</b> {f.text}
                </div>
                <div className="tabular mt-1.5 text-[11.5px]" style={{ color: "var(--muted-fg)" }}>
                  {f.src}
                </div>
              </div>
            </div>
          ))}
          <div className="grid grid-cols-[10px_1fr] items-start gap-4 px-5 py-4" style={{ borderTop: "1px solid var(--border)" }}>
            <span className="mt-2 h-2 w-2 rounded-full" style={{ background: "var(--ok)" }} aria-hidden />
            <div>
              <div className="text-[14.5px] leading-relaxed">
                SPF, DKIM and DMARC alignment pass on every send. One-click unsubscribe present and
                parseable.
              </div>
              <div className="tabular mt-1.5 text-[11.5px]" style={{ color: "var(--muted-fg)" }}>
                authentication · 214 of 214 sends
              </div>
            </div>
          </div>
        </div>

        <div className="card mt-6 p-5 text-[14px]" style={{ background: "var(--ok-bg)", borderColor: "transparent", maxWidth: "64ch" }}>
          <b>If you are clean, we say so.</b> Plenty of brands come back with nothing to fix. We will
          not invent urgency to sell a subscription. The empty report is a real outcome and you get
          it plainly.
        </div>

        <div className="card mt-8 flex flex-wrap items-center gap-6 p-6">
          <div className="min-w-[240px] flex-1">
            <h3 className="text-[15px] font-semibold">This check is free, every time.</h3>
            <p className="mt-1.5 text-[13.5px]" style={{ color: "var(--muted-fg)", maxWidth: "52ch" }}>
              What is paid is keeping it: a dated receipt for every send, monitoring as you send, and
              an alert the day a rule changes, so you can prove what you claimed and when you fixed
              it.
            </p>
          </div>
          <div className="text-right">
            <div className="tabular text-[26px] font-semibold tracking-tight">
              $149
              <span className="text-[14px] font-normal" style={{ color: "var(--muted-fg)" }}>
                /mo
              </span>
            </div>
            <div className="text-[13.5px]" style={{ color: "var(--muted-fg)" }}>
              per brand
            </div>
          </div>
          <a href="/#subscribe" className="btn btn-lg btn-primary">
            Start monitoring
          </a>
        </div>
      </section>
    </div>
  );
}

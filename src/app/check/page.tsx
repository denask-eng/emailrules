import type { Metadata } from "next";
import { getStats } from "@/lib/rules";
import { SECTION, SectionHead, StatStrip } from "@/components/bits";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

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
    <div className={cn(SECTION, "max-w-[820px] py-14")}>
      <h1 className="text-[clamp(1.9rem,5.2vw,2.9rem)]">Check your sends against every rule.</h1>
      <p className="mt-5 max-w-[62ch] text-[1.04rem] leading-relaxed text-ink-soft">
        One domain, no signup. You get findings with dates and sources, not a score out of ten.
      </p>

      <form className="mt-7 flex max-w-[520px] gap-2.5" action="/api/check" method="post">
        <input
          name="domain"
          required
          placeholder="yourbrand.com"
          aria-label="Sending domain"
          className="m h-10 flex-1 rounded-lg border border-rule bg-paper px-3 text-[0.9rem] outline-none focus-visible:ring-3 focus-visible:ring-ink/20"
        />
        <button type="submit" className={cn(buttonVariants({ size: "lg" }), "h-10 px-5 font-semibold")}>
          Run check
        </button>
      </form>
      <p className="mt-2.5 text-[0.86rem] text-mute">
        Optional: connect Klaviyo read-only to scan the last 90 days of real sends.
      </p>

      <div className="mt-7 max-w-[68ch] border border-rule bg-paper-2 p-4 text-[0.9rem] leading-relaxed text-ink-soft">
        <b className="text-ink">Why not a score?</b> Two well-known tools scored the same
        campaign at 85 percent and 40 percent inbox placement. Scores are why nobody trusts this
        category. You get findings, each one traceable to a rule with a date.
      </div>

      {/* sample report */}
      <section id="sample" className="mt-14 scroll-mt-20 border-t border-rule pt-10">
        <SectionHead
          eyebrow={`Sample report · 90 days · 214 sends · ${stats.total} rules`}
          title="Four things need attention"
        />

        <ul className="list-none border-t border-ink p-0">
          {FINDINGS.map((f) => (
            <li
              key={f.src}
              className="grid grid-cols-[10px_1fr] items-start gap-4 border-b border-rule-soft py-3"
            >
              <span
                className={cn("mt-2 h-2 w-2 rounded-full", f.sev === "hi" ? "bg-alarm" : "bg-warn")}
                aria-hidden
              />
              <div>
                <div className="text-[0.94rem] leading-relaxed">
                  <b className="m">{f.n}</b> {f.text}
                </div>
                <div className="m mt-1.5 text-[0.72rem] text-mute">
                  {f.src}
                </div>
              </div>
            </li>
          ))}
          <li className="grid grid-cols-[10px_1fr] items-start gap-4 border-b border-rule-soft py-3 last:border-b-0">
            <span className="mt-2 h-2 w-2 rounded-full bg-good" aria-hidden />
            <div>
              <div className="text-[0.94rem] leading-relaxed">
                SPF, DKIM and DMARC alignment pass on every send. One-click unsubscribe present and
                parseable.
              </div>
              <div className="m mt-1.5 text-[0.72rem] text-mute">
                authentication · 214 of 214 sends
              </div>
            </div>
          </li>
        </ul>

        <div className="mt-6 max-w-[68ch] border border-good/30 bg-good/5 p-4 text-[0.9rem] leading-relaxed text-ink-soft">
          <b>If you are clean, we say so.</b> Plenty of brands come back with nothing to fix. We will
          not invent urgency to sell a subscription. The empty report is a real outcome and you get
          it plainly.
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-6 border-t border-ink pt-6">
          <div className="min-w-[240px] flex-1">
            <h3 className="text-[1.02rem] font-bold tracking-[-0.02em]">This check is free, every time.</h3>
            <p className="mt-2 max-w-[54ch] text-[0.9rem] leading-relaxed text-ink-soft">
              What is paid is keeping it: a dated receipt for every send, monitoring as you send, and
              an alert the day a rule changes, so you can prove what you claimed and when you fixed
              it.
            </p>
          </div>
          <div className="text-right">
            <div className="m text-[1.6rem] font-bold tracking-[-0.04em]">
              $149
              <span className="text-[0.9rem] font-semibold text-mute">
                /mo
              </span>
            </div>
            <div className="text-[0.84rem] text-mute">
              per brand
            </div>
          </div>
          <a href="/#subscribe" className={cn(buttonVariants({ size: "lg" }), "h-10 px-5 font-semibold")}>
            Start monitoring
          </a>
        </div>
      </section>
    </div>
  );
}

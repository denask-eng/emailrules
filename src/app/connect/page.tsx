import type { Metadata } from "next";
import Link from "next/link";
import { SectionHead } from "@/components/bits";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Connect your ESP — roadmap",
  description:
    "What is live and what is not: role filtering, the team brief, the domain and message checks and daily domain watch all ship today. Read-only Klaviyo does not, and this page says which is which.",
  alternates: { canonical: "/connect" },
  robots: { index: true, follow: true },
};

const GATES = [
  {
    n: "01",
    t: "People already filter and share",
    d: "Role setup, Top 5, and the one-page brief are used without an account. Connecting an ESP is useless if nobody returns for the free shelf.",
    status: "Live now",
    live: true,
  },
  {
    n: "02",
    t: "Quiet weeks still useful",
    d: "When nothing material moved in the market, you still get last-verified truth and sticky risks for your desk — not a blank homepage.",
    status: "Live now",
    live: true,
  },
  {
    n: "03",
    t: "Share without an account",
    d: "Setup in the URL, one-page brief for Slack/PDF, optional title only — no multi-client CRM cosplay on the setup card.",
    status: "Live now",
    live: true,
  },
  {
    n: "04",
    t: "Domain watch",
    d: "Give us a sending domain when you subscribe and we re-read its authentication DNS every day. One email when SPF, DKIM, DMARC, BIMI or MX actually moves — never when we merely looked. A day the resolver did not answer is skipped rather than reported as a record disappearing.",
    status: "Live now",
    live: true,
  },
  /* The only gate still shut, and it is last on purpose: the lede promises
     live steps first and OAuth only once the free shelf is a habit. A roadmap
     that leaves a shipped item marked "planned" is the one kind of stale this
     site cannot afford, so this list is checked whenever a gate opens. */
  {
    n: "05",
    t: "Read-only Klaviyo (planned)",
    d: "Compare your account settings to rules that still need a person. No write access. No “AI score.” Ships only after free habit exists.",
    status: "Not shipped",
    live: false,
  },
] as const;

export default function ConnectPage() {
  return (
    <div className="shell shell-tight py-12 sm:py-16">
      <SectionHead
        label="Connect"
        title="Your ESP, when it earns the right."
        lede="We will not fake a “Connect Klaviyo” button that does nothing useful. Below is the brutal path: live steps first, OAuth only after the free product is habit-forming."
      />

      <ol className="mt-10 list-none space-y-0 border-t border-fg/15 p-0">
        {GATES.map((g) => (
          <li key={g.n} className="border-b border-border-soft py-6">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="num text-[11px] tracking-[0.1em] text-dim">{g.n}</span>
              <span
                className={
                  g.live
                    ? "rounded-full border border-ok/30 bg-ok-bg px-2 py-0.5 text-[11px] font-medium text-ok"
                    : "rounded-full border bg-bg-2 px-2 py-0.5 text-[11px] font-medium text-dim"
                }
              >
                {g.status}
              </span>
            </div>
            <h2 className="mt-2 text-[1.1rem] font-semibold tracking-tight">{g.t}</h2>
            <p className="mt-1.5 max-w-[58ch] text-[14.5px] leading-relaxed text-muted-fg">{g.d}</p>
          </li>
        ))}
      </ol>

      <div className="mt-10 rounded-2xl border bg-card px-5 py-6 sm:px-7" style={{ boxShadow: "var(--lift)" }}>
        <p className="label">What you can do today</p>
        <p className="mt-2 max-w-[54ch] text-[15px] leading-relaxed text-muted-fg">
          Filter to your role, copy a team brief, check DNS and headers — no login, no score out of
          100. When OAuth ships, it will sit on top of that, not replace it.
        </p>
        <div className="mt-5 flex flex-wrap gap-2.5">
          <Link href="/rules" className={cn(buttonVariants(), "h-10 rounded-full px-5 font-medium")}>
            Filter rules to me
          </Link>
          <Link
            href="/check"
            className={cn(buttonVariants({ variant: "outline" }), "h-10 rounded-full px-5")}
          >
            Check my domain
          </Link>
          <Link
            href="/brief"
            className={cn(buttonVariants({ variant: "outline" }), "h-10 rounded-full px-5")}
          >
            Team brief
          </Link>
        </div>
      </div>

      <p className="mt-8 text-[13px] text-dim">
        Email only. SMS and push are different laws — we will not pretend this shelf covers them.{" "}
        <Link href="/methodology" className="underline underline-offset-3 hover:text-fg">
          Methodology
        </Link>
        .
      </p>
    </div>
  );
}

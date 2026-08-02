import type { Metadata } from "next";
import Link from "next/link";
import { getStats } from "@/lib/rules";
import { SectionHead } from "@/components/bits";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Start here — 15 minutes",
  description:
    "How to use emailrules.today if you are new to email marketing or just want the shortest path to value.",
  alternates: { canonical: "/start" },
};

export default async function StartHere() {
  const stats = await getStats();

  return (
    <div className="shell shell-tight py-12 sm:py-16">
      <SectionHead
        label="Start here"
        title="Fifteen minutes to useful."
        lede="Whether you started email last month or run deliverability for a portfolio — same site, different depth. Follow the path once."
      />

      <ol className="mt-10 list-none space-y-0 border-t p-0">
        {[
          {
            n: "01",
            t: "Say what kind of work you do",
            d: "On Rules, pick a role (newer marketer, campaigns & flows, inbox & auth, or multi-country). We save it and show five rules first — not all " +
              stats.total +
              " at once.",
            href: "/rules",
            cta: "Open rules",
          },
          {
            n: "02",
            t: "Read plain English, then act",
            d: "Every rule leads with plain English. Dotted words open definitions. Then: whose job, what to do first, and when you can skip it.",
            href: "/glossary",
            cta: "Skim the glossary",
          },
          {
            n: "03",
            t: "Check your sending domain",
            d: "Free live check of SPF, DKIM keys, and DMARC — the public records inboxes use to trust you. No score out of 100. Paste headers if you want alignment on a real message.",
            href: "/check",
            cta: "Check a domain",
          },
          {
            n: "04",
            t: "Come back when the market moves",
            d: "The homepage ledger is market moves only. Quiet means nothing material changed — that is good. Optional: subscribe for one email per real change.",
            href: "/changed",
            cta: "What changed",
          },
        ].map((s) => (
          <li key={s.n} className="border-b py-8">
            <p className="label">{s.n}</p>
            <h2 className="mt-2 text-[1.2rem] font-semibold">{s.t}</h2>
            <p className="mt-2 max-w-[58ch] text-[0.98rem] leading-relaxed text-muted-fg">{s.d}</p>
            <Link
              href={s.href}
              className={cn(buttonVariants({ size: "lg" }), "mt-4 h-10 rounded-[10px] px-5 font-medium")}
            >
              {s.cta}
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}

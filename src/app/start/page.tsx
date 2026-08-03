import type { Metadata } from "next";
import Link from "next/link";
import { getStats } from "@/lib/rules";
import { SectionHead } from "@/components/bits";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "How to use this site",
  description:
    "How emailrules.today works in four lines: pick your role, get five rules, act or skip, come back when the market moves.",
  alternates: { canonical: "/start" },
};

/**
 * This used to be a five-step wizard that walked you to the same place the
 * homepage and /rules already take you in one tap. Three onboarding paths for
 * one product is two too many, and the duplicate had to be kept in sync by hand.
 *
 * The URL stays — it is in the sitemap and linked from the byline strip, and a
 * 404 is worse than a short page. What it no longer does is compete: it explains
 * the shape of the thing in a screen, then hands off.
 */
export default async function HowToUse() {
  const stats = await getStats();

  return (
    <div className="shell shell-tight py-12 sm:py-16">
      <SectionHead
        label="How to use this site"
        title="Pick your role. Get five rules. That is the whole method."
        lede="There is no course and no onboarding to complete. The shelf is small on purpose, and it filters itself to your desk."
      />

      <div className="mt-2 flex flex-wrap gap-2.5">
        <Link
          href="/rules"
          className={cn(buttonVariants({ size: "lg" }), "h-11 rounded-full px-6 font-medium")}
        >
          Show me what applies to me
        </Link>
        <Link
          href="/check"
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "h-11 rounded-full px-5",
          )}
        >
          Check a domain
        </Link>
      </div>

      <ul className="mt-12 list-none border-t p-0">
        {[
          {
            t: "The filter is the product",
            d:
              "Say what kind of work you do and where you send. You get five rules to open first, not all " +
              stats.total +
              ". Every one of them is labelled: " +
              stats.yours +
              " are yours outright, " +
              stats.shared +
              " are part platform and part you, and the label sits on the page rather than leaving you to guess which half is on your desk.",
          },
          {
            t: "Every rule answers the same four questions",
            d: "Plain English first. Then whose job it is, the one thing to do first on a named screen, and who can stop reading. Dotted words open a definition in place.",
          },
          {
            t: "Dates are the substance",
            d: "Every rule carries an effective date, a last-verified date and its own changelog. Nothing goes on the shelf without a primary source you can open. Pages older than ninety days say so instead of pretending.",
          },
          {
            t: "Come back only when something moves",
            d: "What changed is market moves, not housekeeping. A quiet month means nothing material happened, which is the honest result and the one no newsletter will give you.",
          },
        ].map((s) => (
          <li key={s.t} className="border-b py-6">
            <h2 className="text-[1.05rem] font-semibold tracking-tight">{s.t}</h2>
            <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-muted-fg">{s.d}</p>
          </li>
        ))}
      </ul>

      <p className="mt-10 max-w-[62ch] text-[14px] leading-relaxed text-muted-fg">
        Sharing with a team? The{" "}
        <Link href="/brief" className="text-fg underline underline-offset-3">
          one-page brief
        </Link>{" "}
        turns your filter into something you can paste into Slack or print. What is on the shelf and
        what we refuse to put on it is on the{" "}
        <Link href="/coverage" className="text-fg underline underline-offset-3">
          coverage map
        </Link>
        .
      </p>
    </div>
  );
}

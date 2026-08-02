import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { sql, hasDatabase } from "@/lib/db";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false, follow: false },
};

/**
 * The human-facing unsubscribe.
 *
 * A button rather than an on-load action: this URL sits in an email body, and
 * link scanners and prefetchers follow those. Removing someone because their
 * corporate mail filter opened a link would be exactly the kind of thing this
 * site tells people not to build.
 */
export default async function Unsubscribe({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ done?: string }>;
}) {
  const { token } = await params;
  const { done } = await searchParams;

  async function confirm() {
    "use server";
    if (hasDatabase()) {
      try {
        await sql().query(
          `update subscribers set unsubscribed_at = now()
           where token = $1 and unsubscribed_at is null`,
          [token],
        );
      } catch (err) {
        console.error("[unsubscribe] failed:", err);
      }
    }
    redirect(`/unsubscribe/${token}?done=1`);
  }

  if (done) {
    return (
      <div className="shell shell-tight py-24">
        <h1 className="text-[clamp(1.6rem,4vw,2.2rem)]">Done. Nothing else will arrive.</h1>
        <p className="mt-4 max-w-[52ch] text-[1.02rem] leading-relaxed text-muted-fg">
          You are off the list as of now, not in ten business days. Every rule stays free to read
          without an address.
        </p>
        <Link
          href="/rules"
          className={cn(buttonVariants({ variant: "outline", size: "lg" }), "mt-8 h-11 rounded-[10px] px-6")}
        >
          Browse the rules
        </Link>
      </div>
    );
  }

  return (
    <div className="shell shell-tight py-24">
      <h1 className="text-[clamp(1.6rem,4vw,2.2rem)]">Stop the rule alerts?</h1>
      <p className="mt-4 max-w-[52ch] text-[1.02rem] leading-relaxed text-muted-fg">
        One click and you are off the list immediately. Every rule on this site stays free to read
        without giving anyone an address.
      </p>
      <form action={confirm} className="mt-8">
        <button
          type="submit"
          className={cn(buttonVariants({ size: "lg" }), "h-11 rounded-[10px] px-6 font-semibold")}
        >
          Unsubscribe me
        </button>
      </form>
    </div>
  );
}

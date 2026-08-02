import type { Metadata } from "next";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Subscribed",
  robots: { index: false, follow: true },
};

/** Its own page so the homepage stays statically rendered. */
export default async function Subscribed({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; watch?: string }>;
}) {
  const { e, watch } = await searchParams;

  return (
    <div className="shell shell-tight py-24">
      {e ? (
        <>
          <h1 className="text-[clamp(1.6rem,4vw,2.2rem)]">That did not go through.</h1>
          <p className="mt-4 max-w-[52ch] text-[1.02rem] leading-relaxed text-muted-fg">
            Either the address had a typo or something on our end failed. Nothing was saved, so try
            again and it will not create a duplicate.
          </p>
        </>
      ) : (
        <>
          <h1 className="text-[clamp(1.6rem,4vw,2.2rem)]">Done.</h1>
          <p className="mt-4 max-w-[52ch] text-[1.02rem] leading-relaxed text-muted-fg">
            One email when a rule that matches your setup moves — not re-checks, not documentation
            notes. No welcome sequence, no drip. If that promise is broken, reply and tell us.
          </p>
          {watch ? (
            <p className="mt-4 max-w-[52ch] text-[1.02rem] leading-relaxed text-muted-fg">
              Watching <span className="num text-fg">{watch}</span> for SPF, DKIM, DMARC, BIMI and MX
              changes. Baseline stored now; you only hear if DNS actually moves.
            </p>
          ) : null}
        </>
      )}
      <Link
        href="/rules"
        className={cn(buttonVariants({ size: "lg" }), "mt-8 h-11 rounded-[10px] px-6 font-medium")}
      >
        See which rules are yours
      </Link>
    </div>
  );
}

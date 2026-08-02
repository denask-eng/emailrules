"use client";

import { useEffect, useState } from "react";
import { subscribe } from "@/app/actions";
import { audienceActive, readStoredAudience } from "@/lib/audience";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

type Props = {
  /** Pre-fill watch domain (e.g. from /check/[domain]). */
  defaultDomain?: string;
  /** Compact layout for check-result pages. */
  compact?: boolean;
  className?: string;
};

/**
 * Email + optional domain watch. Injects the rules-page audience from
 * localStorage so alerts match what they already filtered on Browse.
 */
export function SubscribeForm({ defaultDomain = "", compact = false, className }: Props) {
  const [audienceJson, setAudienceJson] = useState("");
  const [hasSetup, setHasSetup] = useState(false);

  useEffect(() => {
    try {
      const a = readStoredAudience();
      if (audienceActive(a)) {
        setAudienceJson(JSON.stringify(a));
        setHasSetup(true);
      }
    } catch {
      /* */
    }
  }, []);

  return (
    <form action={subscribe} className={cn(compact ? "space-y-3" : "w-full", className)}>
      <input type="hidden" name="audience" value={audienceJson} />
      <div className={cn("flex w-full gap-2.5", compact ? "flex-col sm:flex-row" : "sm:w-auto")}>
        <input
          type="email"
          name="email"
          required
          placeholder="you@brand.com"
          aria-label="Email address"
          className="num h-10 w-full rounded-[10px] border bg-card px-3.5 text-[13.5px] outline-none focus-visible:ring-[3px] focus-visible:ring-accent/25 sm:w-[17rem]"
        />
        <button
          type="submit"
          className={cn(buttonVariants(), "h-10 shrink-0 rounded-[10px] px-4 font-medium")}
        >
          Subscribe
        </button>
      </div>
      <div className={cn(compact ? "" : "mt-3")}>
        <label className="sr-only" htmlFor="subscribe-domain">
          Sending domain to watch
        </label>
        <input
          id="subscribe-domain"
          type="text"
          name="domain"
          defaultValue={defaultDomain}
          placeholder="Also watch domain (optional) — e.g. brand.com"
          autoComplete="off"
          spellCheck={false}
          className="num h-10 w-full rounded-[10px] border bg-card px-3.5 text-[13.5px] outline-none focus-visible:ring-[3px] focus-visible:ring-accent/25 sm:max-w-[22rem]"
        />
      </div>
      <p className="mt-2 max-w-[48ch] text-[12.5px] leading-relaxed text-dim">
        One email when a rule that matches your setup moves
        {hasSetup ? " (using the filters you set on Rules)" : ""}
        . Optional domain: one email if SPF, DKIM or DMARC actually changes in DNS. Nothing else.
      </p>
    </form>
  );
}

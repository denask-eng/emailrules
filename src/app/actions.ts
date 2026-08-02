"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { sql, hasDatabase } from "@/lib/db";
import { normaliseDomain } from "@/lib/dns-check";
import { ensureDomainBaseline } from "@/lib/domain-watch";
import { audienceForStorage } from "@/lib/subscriber-prefs";

/** Public actions. Nothing here touches admin data or requires a session. */

/** Deliberately permissive: rejecting valid addresses is worse than storing a typo. */
const LOOKS_LIKE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Subscribe for market-move rule alerts.
 *
 * Optional fields:
 *  - audience: JSON of the rules-page setup (geo/ESP/role). Filters which
 *    rule alerts fire. Empty → every market move.
 *  - domain: sending domain to watch for SPF/DKIM/DMARC DNS changes.
 */
export async function subscribe(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!LOOKS_LIKE_EMAIL.test(email)) redirect("/subscribed?e=1");
  if (!hasDatabase()) redirect("/subscribed?e=1");

  const audience = audienceForStorage(formData.get("audience"));
  const domainRaw = String(formData.get("domain") ?? "").trim();
  const watchDomain = domainRaw ? normaliseDomain(domainRaw) : null;
  if (domainRaw && !watchDomain) redirect("/subscribed?e=1");

  try {
    /* Re-subscribing clears a previous opt-out rather than erroring, and the
       same address twice is not an error worth showing anyone. */
    /* The token is minted once and kept across re-subscribes, so an old
       unsubscribe link in a years-old email still works. */
    /* Audience / watch_domain: re-subscribe updates prefs so a second pass
       with a domain after email-only is the upgrade path, not a no-op. */
    await sql().query(
      `insert into subscribers (email, token, audience, watch_domain)
       values ($1, $2, $3::jsonb, $4)
       on conflict (email) do update
         set unsubscribed_at = null,
             token = coalesce(subscribers.token, excluded.token),
             audience = coalesce(excluded.audience, subscribers.audience),
             watch_domain = coalesce(excluded.watch_domain, subscribers.watch_domain)`,
      [
        email,
        randomBytes(24).toString("base64url"),
        audience ? JSON.stringify(audience) : null,
        watchDomain,
      ],
    );

    if (watchDomain) {
      try {
        await ensureDomainBaseline(watchDomain);
      } catch (err) {
        /* Subscribe still succeeds; baseline retries on cron. */
        console.error("[subscribe] domain baseline failed:", err);
      }
    }
  } catch (err) {
    console.error("[subscribe] failed:", err);
    redirect("/subscribed?e=1");
  }

  const qs = watchDomain ? `?watch=${encodeURIComponent(watchDomain)}` : "";
  redirect(`/subscribed${qs}`);
}

/** Shared by the hero form and /check: both land on the same result URL. */
export async function runCheck(formData: FormData) {
  const domain = normaliseDomain(String(formData.get("domain") ?? ""));
  if (!domain) redirect("/check?e=1");
  redirect(`/check/${domain}`);
}

"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { sql, hasDatabase } from "@/lib/db";
import { normaliseDomain } from "@/lib/dns-check";

/** Public actions. Nothing here touches admin data or requires a session. */

/** Deliberately permissive: rejecting valid addresses is worse than storing a typo. */
const LOOKS_LIKE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function subscribe(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!LOOKS_LIKE_EMAIL.test(email)) redirect("/subscribed?e=1");
  if (!hasDatabase()) redirect("/subscribed?e=1");

  try {
    /* Re-subscribing clears a previous opt-out rather than erroring, and the
       same address twice is not an error worth showing anyone. */
    /* The token is minted once and kept across re-subscribes, so an old
       unsubscribe link in a years-old email still works. */
    await sql().query(
      `insert into subscribers (email, token) values ($1, $2)
       on conflict (email) do update
         set unsubscribed_at = null,
             token = coalesce(subscribers.token, excluded.token)`,
      [email, randomBytes(24).toString("base64url")],
    );
  } catch (err) {
    console.error("[subscribe] failed:", err);
    redirect("/subscribed?e=1");
  }
  redirect("/subscribed");
}

/** Shared by the hero form and /check: both land on the same result URL. */
export async function runCheck(formData: FormData) {
  const domain = normaliseDomain(String(formData.get("domain") ?? ""));
  if (!domain) redirect("/check?e=1");
  redirect(`/check/${domain}`);
}

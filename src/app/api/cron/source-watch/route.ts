import { NextResponse } from "next/server";
import { runSourceWatch } from "@/lib/source-watch";

/**
 * Daily sweep of the primary sources the rules corpus cites.
 *
 * It queues changes for review and publishes nothing. Daily rather than weekly
 * because it works in batches — 66 URLs do not fit in one 60-second run — so a
 * daily cron is what makes the whole corpus cycle in about four days.
 *
 * Manual: curl -H "Authorization: Bearer $CRON_SECRET" https://emailrules.today/api/cron/source-watch
 */

/* Twenty sequential third-party fetches at 15s worst case. 60 is the ceiling
   every Vercel plan accepts, so a plan change cannot make this fail to deploy. */
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }
  if ((request.headers.get("authorization") ?? "") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const run = await runSourceWatch();

  /* Errors are reported but are not a failed run. A regulator's site being down
     is normal; the thing that would be a real failure is a run that recorded a
     hash it never actually fetched, which cannot happen here. */
  return NextResponse.json({ ok: true, ...run });
}

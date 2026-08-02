import { NextResponse } from "next/server";
import { runEspWatch } from "@/lib/esp-watch";

/**
 * Weekly sweep of the ESP changelog pages.
 *
 * It queues candidates for review and publishes nothing. Weekly rather than
 * daily because that is how often these pages actually move, and because the
 * queue is only useful if a person clears it — a daily one nobody reads is
 * worse than no queue at all.
 *
 * Manual: curl -H "Authorization: Bearer $CRON_SECRET" https://emailrules.today/api/cron/esp-watch
 */

/* Several third-party fetches, sequential, at 20s each. 60 is the ceiling every
   Vercel plan accepts, so a plan change cannot make this fail to deploy. */
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }
  if ((request.headers.get("authorization") ?? "") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const run = await runEspWatch();

  /* Warnings are not errors, but they are the interesting failure: a page that
     fetched fine and yielded nothing usually means the extractor broke, and
     that reads as "the platform was quiet" if nobody surfaces it. */
  return NextResponse.json({
    ok: run.errors.length === 0,
    ...run,
  });
}

import { NextResponse } from "next/server";
import { recordCensus } from "@/lib/census-history";

/**
 * The daily census reading.
 *
 * Every blocklist zone, asked the same question at the same moment, checked
 * against its RFC 5782 controls, and kept. This ran on every page view and was
 * thrown away each time; keeping it is what turns "SORBS is dead" into "SORBS
 * has not answered since a date we can name".
 *
 * Idempotent per day, so a retry after a failure is safe and a double fire
 * cannot produce two conflicting readings for one date.
 *
 * Manual:
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://emailrules.today/api/cron/census
 */

/* Twenty-eight zones, each with a positive and a negative control, run
   concurrently inside census(). Comfortably inside the ceiling every Vercel
   plan accepts. */
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }
  const auth = request.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await recordCensus();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    /* A failed reading is a gap in the series, and a gap is honest. What is
       not honest is writing a row that says every zone went silent because
       our own resolver had a bad minute. */
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "census failed" },
      { status: 500 },
    );
  }
}

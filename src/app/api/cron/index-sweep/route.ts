import { NextResponse } from "next/server";
import { sweepIndex } from "@/lib/email-index";

/**
 * The daily Index sweep.
 *
 * Reads the published roster's authentication posture from public DNS and
 * keeps one dated row per domain. Resumable: anything already read today is
 * skipped, so a roster larger than one 60-second invocation completes across
 * a few fires without ever producing a half day that looks whole.
 *
 * Scheduled several times in the morning rather than once, for that reason.
 * Each run is cheap when there is nothing left to do.
 *
 * Manual:
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://emailrules.today/api/cron/index-sweep
 *   ...?limit=80  to push harder on a backlog
 */
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

  const raw = Number(new URL(request.url).searchParams.get("limit"));
  const limit = Number.isFinite(raw) && raw > 0 ? Math.min(Math.trunc(raw), 200) : 40;

  const result = await sweepIndex(limit);
  return NextResponse.json({ ok: result.errors.length === 0, ...result });
}

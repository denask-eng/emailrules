import { NextResponse } from "next/server";
import { runDomainWatchChecks } from "@/lib/domain-watch";

/**
 * Daily domain-watch. Vercel Cron hits this with Authorization: Bearer CRON_SECRET
 * when CRON_SECRET is set in the project env.
 *
 * Manual: curl -H "Authorization: Bearer $CRON_SECRET" https://emailrules.today/api/cron/domain-watch
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }

  const auth = request.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await runDomainWatchChecks();
  return NextResponse.json({
    ok: result.errors.length === 0,
    ...result,
  });
}

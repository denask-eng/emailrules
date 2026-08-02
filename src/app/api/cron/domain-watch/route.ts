import { NextResponse } from "next/server";
import { sweepUnwatchedDomains } from "@/lib/domain-history";
import { runDomainWatchChecks } from "@/lib/domain-watch";

/**
 * Daily domain-watch, then the history sweep. Vercel Cron hits this with
 * Authorization: Bearer CRON_SECRET when CRON_SECRET is set in the project env.
 *
 * Manual: curl -H "Authorization: Bearer $CRON_SECRET" https://emailrules.today/api/cron/domain-watch
 * A one-off backlog pass can raise the per-run cap: ...?limit=400
 */

/* The watch pass is sequential and the sweep is capped to fit well inside
   this. 60 is the ceiling every Vercel plan accepts, so the cron cannot fail
   to deploy on a plan change. */
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
  const limit = Number.isFinite(raw) && raw > 0 ? Math.min(Math.trunc(raw), 1000) : undefined;

  /* Watched domains first: those runs owe somebody an email, and they record
     their own history from the same capture. The sweep then covers everything
     else with history, which is what makes the series continuous rather than
     a scatter of the days somebody happened to visit. */
  const watch = await runDomainWatchChecks();
  const history = await sweepUnwatchedDomains(limit);

  return NextResponse.json({
    ok: watch.errors.length === 0 && history.errors.length === 0,
    ...watch,
    history,
  });
}

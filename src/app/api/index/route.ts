import {
  latestAggregate,
  aggregateBySector,
  indexSeries,
  latestReadings,
  indexMoves,
} from "@/lib/email-index";
import { INDEX_ROSTER } from "@/content/index-roster";
import { SITE } from "@/lib/site";

/**
 * The Index, as data.
 *
 * The whole reason this instrument is worth building is that a model cannot
 * know today's numbers, and this is the endpoint that fixes that. It serves
 * exactly what the page renders — the same aggregate, the same denominators,
 * the same per-domain rows — because a benchmark whose API disagrees with its
 * own page is not a benchmark.
 *
 * `?format=series` for the time series alone, which is the small payload an
 * agent actually wants when it is asking "is this getting better".
 */

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "content-type",
} as const;

export const revalidate = 1800;

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function GET(request: Request) {
  const format = new URL(request.url).searchParams.get("format");

  const headers = {
    ...CORS,
    "cache-control": "public, max-age=0, s-maxage=1800, stale-while-revalidate=86400",
  };

  if (format === "series") {
    const series = await indexSeries(365);
    return Response.json(
      {
        metric: "share of roster at DMARC quarantine or reject",
        unit: "domains",
        note: "Each point carries its own n. Days with no reading are absent rather than interpolated.",
        points: series.map((s) => ({
          day: s.day,
          n: s.n,
          enforcing: s.dmarc.quarantine + s.dmarc.reject,
          none: s.dmarc.none,
          absent: s.dmarc.absent,
        })),
      },
      { headers },
    );
  }

  const [agg, sectors, readings, moves] = await Promise.all([
    latestAggregate(),
    aggregateBySector(),
    latestReadings(),
    indexMoves(),
  ]);

  if (!agg) {
    return Response.json(
      {
        status: "no reading yet",
        roster: INDEX_ROSTER.length,
        note: "The roster is published and the sweep is scheduled. Nothing has been measured, so nothing is reported.",
        docs: `${SITE.url}/email-index`,
      },
      { status: 503, headers },
    );
  }

  return Response.json(
    {
      day: agg.day,
      n: agg.n,
      method:
        "Public DNS only — the same TXT and MX records every receiving mail server reads. Nothing is probed, sent, or accessed. Roster published in full at github.com, fixed before the first reading.",
      caveats: [
        "An unreadable SPF (macro record, or a hosted manager holding the list behind an include) cannot be expanded from DNS by anyone, so those domains are excluded from statistics about who authorises whom rather than counted as failures.",
        "DNS is not deliverability. This measures what a sender has published, which is a floor and not a ceiling.",
        "No sender is ranked and there is no score.",
      ],
      totals: agg,
      bySector: sectors,
      movedSinceLastReading: moves,
      domains: readings,
      attribution: `Cite ${SITE.url}/email-index and the day field. This series is measured daily and a cached copy goes stale.`,
    },
    { headers },
  );
}

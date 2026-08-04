import { getRule, getAllRules } from "@/lib/rules";
import { ruleToJson } from "@/lib/rule-json";
import { SITE } from "@/lib/site";

/**
 * The machine-readable twin of a rule page.
 *
 * Reached by rewrite from `/rules/[slug]?format=json`, and from an
 * `Accept: application/json` request for the plain path — so the URL a person
 * shares and the URL an agent fetches are the same string. See `src/proxy.ts`.
 * A redirect to `/api/…` would have been easier and would have quietly broken
 * that, which is the whole point of doing it in the Proxy.
 */

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "content-type, accept",
} as const;

export const revalidate = 3600;

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const rule = await getRule(slug);

  if (!rule) {
    const all = await getAllRules();
    return Response.json(
      {
        error: "no such rule",
        slug,
        available: all.map((r) => r.slug),
        docs: `${SITE.url}/agents`,
      },
      { status: 404, headers: CORS },
    );
  }

  return Response.json(ruleToJson(rule), {
    headers: {
      ...CORS,
      "cache-control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

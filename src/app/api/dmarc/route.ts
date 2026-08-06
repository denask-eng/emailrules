import { createEndpoint } from "@/lib/dmarc-store";

/**
 * Mint a reporting endpoint.
 *
 * A native form POST to a route handler, deliberately not a server action. The
 * server action on /check/message posted nothing at all from a real browser
 * once an extension broke hydration, and the way into a product does not get to
 * depend on React being alive.
 */

/** Enough to reject a paste of prose; the real validation is the shape below. */
const DOMAIN = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/;

function back(error: string): Response {
  return Response.redirect(
    new URL(`/dmarc?e=${encodeURIComponent(error)}`, process.env.NEXT_PUBLIC_SITE_URL ?? "https://emailrules.today"),
    303,
  );
}

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  if (!form) return back("Enter the domain your mail comes from.");
  const raw = String(form.get("domain") ?? "").trim().toLowerCase();

  /* People paste what they have: a URL, an address, a trailing dot. Take the
     domain out of it rather than telling them their input was wrong. */
  const cleaned = raw
    .replace(/^[a-z]+:\/\//, "")
    .replace(/^.*@/, "")
    .replace(/[/?#].*$/, "")
    .replace(/\.$/, "");

  if (!cleaned) return back("Enter the domain your mail comes from.");
  if (cleaned.length > 253 || !DOMAIN.test(cleaned)) {
    return back(`“${raw.slice(0, 60)}” is not a domain. Try yourbrand.com.`);
  }

  const endpoint = await createEndpoint(cleaned);
  if (!endpoint) return back("Reporting is not switched on yet. Try the check instead.");

  return Response.redirect(
    new URL(`/dmarc/${endpoint.token}`, process.env.NEXT_PUBLIC_SITE_URL ?? "https://emailrules.today"),
    303,
  );
}

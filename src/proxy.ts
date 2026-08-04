import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next 16 renamed Middleware to Proxy. Same file-convention position, same
 * one-file-per-project rule — so both jobs this project needs live here.
 *
 * ── 1. Content negotiation on rule pages ─────────────────────────────────
 *
 * `/rules/[slug]?format=json`, and an `Accept: application/json` request for
 * the same path, both serve the machine-readable twin of that page **at that
 * URL**. Not a redirect to a different one: a person and an agent should be
 * able to exchange the same address, and a 307 to `/api/…` quietly breaks
 * that. Proxy is the documented layer for a rewrite, and it runs before the
 * render, so the page component never has to know this happened.
 *
 * ── 2. The optimistic admin bounce ────────────────────────────────────────
 *
 * Unchanged, and still optimistic only. Next's own guidance is explicit that
 * Proxy must not be an authorisation solution, so this saves a round trip and
 * nothing more. The signature is never verified here; `requireAdmin()` in
 * `src/lib/auth.ts` does the real work, in the admin layout and in every
 * Server Action.
 */
export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  /* ── Rules: one URL, two representations ────────────────────────────── */
  if (pathname.startsWith("/rules/")) {
    const slug = pathname.slice("/rules/".length);
    if (slug && !slug.includes("/")) {
      const wantsJson =
        searchParams.get("format") === "json" ||
        (request.headers.get("accept") ?? "").includes("application/json");
      if (wantsJson) {
        return NextResponse.rewrite(new URL(`/api/rules/${slug}`, request.url));
      }
    }
    return NextResponse.next();
  }

  /* ── Admin ──────────────────────────────────────────────────────────── */
  if (pathname.startsWith("/admin")) {
    const hasSession = request.cookies.has("er_admin");

    if (pathname === "/admin/login") {
      if (hasSession) return NextResponse.redirect(new URL("/admin", request.url));
      return NextResponse.next();
    }
    if (!hasSession) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/rules/:slug"],
};

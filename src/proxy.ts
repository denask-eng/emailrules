import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next 16 renamed Middleware to Proxy. Same file-convention position, same
 * single-file-per-project rule.
 *
 * This is an OPTIMISTIC check only. Next's own authentication guidance is
 * explicit that proxy must not be a full authorisation solution, so all this
 * does is bounce visitors with no cookie at all, to save them a round trip.
 * The signature is never verified here. `requireAdmin()` in src/lib/auth.ts
 * does the real work, in the admin layout and in every Server Action.
 */
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has("er_admin");
  const { pathname } = request.nextUrl;

  if (pathname === "/admin/login") {
    if (hasSession) return NextResponse.redirect(new URL("/admin", request.url));
    return NextResponse.next();
  }

  if (!hasSession) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/admin/:path*",
};

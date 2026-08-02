import { NextResponse } from "next/server";
import { sql, hasDatabase } from "@/lib/db";

/**
 * The RFC 8058 one-click endpoint.
 *
 * This is the URL in the List-Unsubscribe header. Mail clients POST to it with
 * `List-Unsubscribe=One-Click` and expect the address to be suppressed with no
 * landing page and no confirmation, because the client already asked the user.
 *
 * POST only, deliberately. A GET here would be followed by link prefetchers
 * and scanners, which would unsubscribe people who never asked. Humans get
 * /unsubscribe/<token>, which is a page with a button.
 *
 * Yahoo requires the request to be honoured within two days. This does it
 * immediately, which is the site's own advice.
 */
export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get("t");
  if (!token || !hasDatabase()) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    await sql().query(
      `update subscribers set unsubscribed_at = now()
       where token = $1 and unsubscribed_at is null`,
      [token],
    );
  } catch (err) {
    console.error("[unsubscribe] failed:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  /* An unknown or already-used token still returns 200. Telling a caller
     which tokens are real would turn this into an enumeration oracle, and
     the mail client has nothing useful to do with the distinction. */
  return NextResponse.json({ ok: true });
}

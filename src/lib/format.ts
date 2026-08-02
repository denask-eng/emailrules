/**
 * Pure formatting, safe on both sides of the client boundary.
 *
 * These used to live in src/lib/rules.ts. Once that file started importing the
 * Postgres client it became server-only, and any client component reaching for
 * a date formatter would have dragged the database driver into the browser
 * bundle. Formatting is not data access; it belongs on its own.
 */

/** en-GB, unambiguous, matches the mono tabular treatment in the UI. */
export function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${d} ${months[m - 1]} ${y}`;
}

export function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

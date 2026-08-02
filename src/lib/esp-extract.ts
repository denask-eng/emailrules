/**
 * Pure extraction for the ESP changelog watcher.
 *
 * Separate from `esp-watch.ts` because that file is `server-only` (it touches
 * the database and the network) and this half is the part worth testing: what
 * counts as a date, and what counts as an item. No imports, no I/O, so the
 * tests are just strings in and structures out.
 */

import { createHash } from "node:crypto";

export type ExtractedItem = {
  title: string;
  url: string | null;
  /** ISO yyyy-mm-dd, only when the page printed one we could read. */
  date: string | null;
};

const MONTHS: Record<string, string> = {
  january: "01", february: "02", march: "03", april: "04", may: "05", june: "06",
  july: "07", august: "08", september: "09", october: "10", november: "11", december: "12",
};

/**
 * Dates as publishers actually print them. Deliberately conservative: a string
 * that does not clearly carry a year is not turned into one, because a guessed
 * year is the exact failure this shelf exists to avoid. Omnisend is the live
 * example — it prints day and month with no year anywhere, so nothing there
 * will ever produce a dated candidate, and that is correct.
 */
export function parsePrintedDate(text: string): string | null {
  const iso = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const long = text.match(
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2}),?\s+(20\d{2})\b/i,
  );
  if (long) {
    const m = MONTHS[long[1].toLowerCase()];
    return `${long[3]}-${m}-${long[2].padStart(2, "0")}`;
  }

  const dayFirst = text.match(
    /\b(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(20\d{2})\b/i,
  );
  if (dayFirst) {
    const m = MONTHS[dayFirst[2].toLowerCase()];
    return `${dayFirst[3]}-${m}-${dayFirst[1].padStart(2, "0")}`;
  }

  return null;
}

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/** Content fingerprint, tags and whitespace removed so a rebuild is not a change. */
export function contentHash(html: string): string {
  return createHash("sha256").update(stripTags(html)).digest("hex").slice(0, 32);
}

/**
 * Pull (title, url, date) triples out of a changelog page.
 *
 * The strategy is deliberately generic rather than a hand-written scraper per
 * platform: a bespoke selector breaks silently the day a vendor reskins, and a
 * silent break here reads as "the platform was quiet". A link with a date near
 * it is the one shape every changelog shares. False positives cost a human one
 * glance in the queue; a false negative costs a missed change, so this errs
 * toward noise.
 */
/**
 * Link text that carries no information about what changed.
 *
 * "Learn more" next to a date is a real dated item, but the title tells a
 * reviewer nothing, and a queue of forty "Learn more" rows is one nobody
 * clears. A title that is only a date is kept, because several changelogs
 * (Braze) group by release date and the date is the entry.
 */
function isChrome(title: string): boolean {
  return /^(learn|read|see|find out|discover|explore)\s+(more|here|the docs?|about it)\.?$/i.test(title)
    || /^(home|back|next|previous|docs?|log ?in|sign ?up|contact|get started|view all|show all|read the docs?)\.?$/i.test(title)
    || /^(read|view|see)\s+(article|post|release notes?|changelog)\.?$/i.test(title);
}

export function extractDatedItems(html: string, baseUrl: string): ExtractedItem[] {
  const items: ExtractedItem[] = [];
  const seen = new Set<string>();

  const anchor = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;

  while ((m = anchor.exec(html))) {
    const href = m[1];
    const title = stripTags(m[2]);
    if (!title || title.length < 8 || title.length > 200) continue;
    if (isChrome(title)) continue;

    /* Look at the anchor's own text first, then a window of the surrounding
       markup — most changelogs print the date as a sibling, not inside the link. */
    const start = Math.max(0, m.index - 600);
    const context = stripTags(html.slice(start, m.index + m[0].length + 300));
    const date = parsePrintedDate(title) ?? parsePrintedDate(context);
    if (!date) continue;

    let url: string | null = null;
    try {
      url = new URL(href, baseUrl).toString();
    } catch {
      url = null;
    }

    const key = `${date}|${title.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({ title, url, date });
  }

  return items;
}


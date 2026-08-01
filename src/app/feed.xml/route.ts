import { getChangelog, fmtDate } from "@/lib/rules";
import { SITE } from "@/lib/site";

export const dynamic = "force-static";

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * The changelog feed. This is a genuine backlink engine: newsletters and
 * aggregators syndicate feeds, and every item points at a canonical rule URL.
 */
export async function GET() {
  const entries = await getChangelog(50);
  const updated = entries[0]?.date ?? new Date().toISOString().slice(0, 10);

  const items = entries
    .map((e) => {
      const url = `${SITE.url}/rules/${e.rule.slug}`;
      return `    <item>
      <title>${esc(`${e.rule.title} — ${fmtDate(e.date)}`)}</title>
      <link>${url}</link>
      <guid isPermaLink="false">${esc(`${e.rule.slug}#${e.date}`)}</guid>
      <pubDate>${new Date(`${e.date}T09:00:00Z`).toUTCString()}</pubDate>
      <category>${esc(e.rule.jurisdictions.join(", "))}</category>
      <description>${esc(`${e.note} ${e.rule.answer}`)}</description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(SITE.name)} — rule changes</title>
    <link>${SITE.url}</link>
    <description>${esc(SITE.description)}</description>
    <language>en</language>
    <lastBuildDate>${new Date(`${updated}T09:00:00Z`).toUTCString()}</lastBuildDate>
    <atom:link href="${SITE.url}/feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=3600",
    },
  });
}

/**
 * Watches the ESP changelog pages and queues anything dated that we do not
 * already cite.
 *
 * The point of this file is what it refuses to do. It never writes to the
 * published corpus, never summarises a change, and never decides what one
 * means. It records the item's own title, date and URL exactly as printed and
 * stops. A person reads the page and writes the entry.
 *
 * That division is not fussiness. `esp-changes.ts` says an invented "Klaviyo
 * changed X in March" would be indistinguishable from the real rows around it,
 * which is what makes it fatal. Anything that generates prose from a page it
 * half-parsed is exactly that failure with a cron attached. So: detection is
 * mechanical, interpretation is human, and the queue is the seam between them.
 */

import "server-only";

import { createHash } from "node:crypto";
import { sql, hasDatabase } from "@/lib/db";
import { ESP_PLATFORMS, ESP_WATCHED } from "@/content/esp-changes";
import { getAllEspChanges } from "@/lib/esp-changes";
import { contentHash, extractDatedItems } from "@/lib/esp-extract";

export type WatchedSource = { esp: string; label: string; url: string };

export type EspWatchRun = {
  sourcesChecked: number;
  sourcesChanged: number;
  candidatesAdded: number;
  /** Fetched fine, but the extractor found nothing where it used to find rows. */
  extractorWarnings: string[];
  errors: string[];
};

export type EspCandidate = {
  id: string;
  esp: string;
  sourceUrl: string;
  itemUrl: string | null;
  title: string;
  publishedOn: string | null;
  firstSeenAt: string;
  status: "new" | "dismissed" | "published";
};

/** Every page named on /esp, including the platforms we watch and cannot date. */
export function watchedSources(): WatchedSource[] {
  const out: WatchedSource[] = [];
  for (const p of ESP_PLATFORMS) {
    for (const w of p.watching) out.push({ esp: p.id, label: w.label, url: w.url });
  }
  /* The platforms we watch and have never been able to date are watched anyway.
     They are the ones most likely to start printing dates, and the day one does
     is the day it earns a page. */
  for (const w of ESP_WATCHED) {
    if (w.url) out.push({ esp: w.name.toLowerCase().replace(/\s+/g, "-"), label: "Changelog", url: w.url });
  }
  return out;
}

/* ─────────────────────────────── the run ──────────────────────────────── */

function candidateId(esp: string, date: string | null, title: string): string {
  return createHash("sha256")
    .update(`${esp}|${date ?? ""}|${title.toLowerCase().trim()}`)
    .digest("hex")
    .slice(0, 20);
}

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      /* Named, contactable, and honest about being a bot. A changelog watcher
         that disguises itself is not something this site gets to publish. */
      "user-agent":
        "emailrules.today changelog watcher (+https://emailrules.today/methodology)",
      accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

/**
 * Check every watched page once.
 *
 * A fetch that fails is recorded as an error and changes nothing — it must
 * never overwrite `content_hash`, because that would let a bad afternoon on
 * somebody's CDN be replayed later as "the page changed".
 */
export async function runEspWatch(): Promise<EspWatchRun> {
  const result: EspWatchRun = {
    sourcesChecked: 0,
    sourcesChanged: 0,
    candidatesAdded: 0,
    extractorWarnings: [],
    errors: [],
  };

  if (!hasDatabase()) {
    result.errors.push("DATABASE_URL is not set");
    return result;
  }

  /* A published entry's own sources are what "we already cover this" means. */
  const published = await getAllEspChanges();
  const citedUrls = new Set(published.flatMap((c) => c.sources.map((s) => s.url)));
  const citedTitles = new Set(published.map((c) => c.title.toLowerCase()));

  /* Only what is newer than the shelf.
     A changelog page is its own archive: Klaviyo's lists four years of items and
     Braze's every release since 2022. Queueing all of it produced 420 rows on
     the first run, which is not a review queue, it is a reason to stop opening
     one. The watcher's question is "what moved since we last looked", so the
     floor per platform is the newest entry we already publish, and for a
     platform with nothing published yet, the last 120 days. */
  const floorFor = new Map<string, string>();
  for (const c of published) {
    if (!c.date) continue;
    const cur = floorFor.get(c.esp);
    if (!cur || c.date > cur) floorFor.set(c.esp, c.date);
  }
  const fallbackFloor = new Date(Date.now() - 120 * 864e5).toISOString().slice(0, 10);

  for (const source of watchedSources()) {
    result.sourcesChecked += 1;

    let html: string;
    try {
      html = await fetchPage(source.url);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      result.errors.push(`${source.url}: ${message}`);
      await sql().query(
        `insert into esp_watch_sources (url, esp, label, last_checked_at, last_error)
         values ($1, $2, $3, now(), $4)
         on conflict (url) do update
           set last_checked_at = now(), last_error = excluded.last_error,
               esp = excluded.esp, label = excluded.label`,
        [source.url, source.esp, source.label, message],
      );
      continue;
    }

    const hash = contentHash(html);
    const items = extractDatedItems(html, source.url);

    const prior = (await sql().query(
      `select content_hash, item_count from esp_watch_sources where url = $1`,
      [source.url],
    )) as { content_hash: string | null; item_count: number | null }[];
    const before = prior[0];

    if (before?.content_hash && before.content_hash !== hash) result.sourcesChanged += 1;

    /* Found rows before and none now: the page almost certainly moved under the
       extractor. Say so rather than reporting a quiet week. */
    if ((before?.item_count ?? 0) > 0 && items.length === 0) {
      result.extractorWarnings.push(
        `${source.url}: found ${before?.item_count} dated items last time, 0 now — the page may have changed shape`,
      );
    }

    const floor = floorFor.get(source.esp) ?? fallbackFloor;

    for (const item of items) {
      /* Undated items cannot be told apart from old ones, and this shelf does
         not publish anything undated anyway. */
      if (!item.date || item.date <= floor) continue;
      if (item.url && citedUrls.has(item.url)) continue;
      if (citedTitles.has(item.title.toLowerCase())) continue;

      const id = candidateId(source.esp, item.date, item.title);
      const inserted = (await sql().query(
        `insert into esp_candidates (id, esp, source_url, item_url, title, published_on)
         values ($1, $2, $3, $4, $5, $6)
         on conflict (id) do nothing
         returning id`,
        [id, source.esp, source.url, item.url, item.title, item.date],
      )) as { id: string }[];
      if (inserted.length) result.candidatesAdded += 1;
    }

    await sql().query(
      `insert into esp_watch_sources
         (url, esp, label, content_hash, item_count, last_checked_at, last_ok_at, last_error)
       values ($1, $2, $3, $4, $5, now(), now(), null)
       on conflict (url) do update
         set content_hash = excluded.content_hash, item_count = excluded.item_count,
             last_checked_at = now(), last_ok_at = now(), last_error = null,
             esp = excluded.esp, label = excluded.label`,
      [source.url, source.esp, source.label, hash, items.length],
    );
  }

  return result;
}

/* ──────────────────────────── reading the queue ───────────────────────── */

export async function getEspCandidates(
  status: "new" | "dismissed" | "published" = "new",
): Promise<EspCandidate[]> {
  if (!hasDatabase()) return [];
  const rows = (await sql().query(
    `select id, esp, source_url, item_url, title,
            to_char(published_on, 'YYYY-MM-DD') as published_on,
            to_char(first_seen_at, 'YYYY-MM-DD') as first_seen_at, status
     from esp_candidates
     where status = $1
     order by published_on desc nulls last, first_seen_at desc
     limit 200`,
    [status],
  )) as Record<string, string | null>[];

  return rows.map((r) => ({
    id: r.id!,
    esp: r.esp!,
    sourceUrl: r.source_url!,
    itemUrl: r.item_url,
    title: r.title!,
    publishedOn: r.published_on,
    firstSeenAt: r.first_seen_at!,
    status: r.status as EspCandidate["status"],
  }));
}

export async function getEspWatchSources() {
  if (!hasDatabase()) return [];
  return (await sql().query(
    `select url, esp, label, item_count,
            to_char(last_checked_at, 'YYYY-MM-DD HH24:MI') as last_checked_at,
            to_char(last_ok_at, 'YYYY-MM-DD') as last_ok_at,
            last_error
     from esp_watch_sources order by esp, label`,
  )) as Record<string, string | number | null>[];
}

export async function setCandidateStatus(
  id: string,
  status: "new" | "dismissed" | "published",
): Promise<void> {
  if (!hasDatabase()) return;
  await sql().query(`update esp_candidates set status = $2 where id = $1`, [id, status]);
}

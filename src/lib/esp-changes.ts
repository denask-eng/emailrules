import { cache } from "react";
import {
  ESP_CHANGES,
  ESP_PLATFORMS,
  ESP_WATCHED,
  type EspChange,
  type EspPlatform,
} from "@/content/esp-changes";
import type { EspProductId } from "@/lib/types";

/**
 * The single data-access seam for the ESP shelf, written the way `lib/rules.ts`
 * was written before the rules corpus moved into Postgres.
 *
 * These reads are async against a plain array, which looks like ceremony today
 * and is the entire point: when this corpus follows the rules corpus into the
 * database, no page changes. That migration is the reason `lib/rules.ts` exists
 * in the shape it does, and repeating the shape costs nothing now and saves the
 * rewrite later.
 *
 * `cache()` dedupes within a request, so an index page that asks for the
 * platform list and the newest change reads once.
 */

const loadAll = cache(async (): Promise<EspChange[]> => {
  /* Newest first, everywhere. A ledger read in any other order is a list. */
  return [...ESP_CHANGES].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
});

export async function getAllEspChanges(): Promise<EspChange[]> {
  return loadAll();
}

export async function getEspChanges(esp: EspProductId): Promise<EspChange[]> {
  return (await loadAll()).filter((c) => c.esp === esp);
}

export async function getEspPlatform(id: string): Promise<EspPlatform | null> {
  return ESP_PLATFORMS.find((p) => p.id === id) ?? null;
}

/** Platforms we watch and have published nothing from, with the reason. */
export async function getWatchedEsps() {
  return ESP_WATCHED;
}

export interface EspPlatformSummary {
  platform: EspPlatform;
  count: number;
  /** Date of the newest change we hold. Undefined only if nothing is dated. */
  latest?: string;
  /** Oldest verification across the platform's entries — the honest one to show. */
  lastVerified: string;
}

/**
 * The index rows. `lastVerified` is deliberately the oldest date across a
 * platform's entries rather than the newest: a shelf is only as current as its
 * stalest row, and showing the newest would flatter it.
 */
export async function getEspPlatformSummaries(): Promise<EspPlatformSummary[]> {
  const all = await loadAll();
  return ESP_PLATFORMS.map((platform) => {
    const mine = all.filter((c) => c.esp === platform.id);
    return {
      platform,
      count: mine.length,
      latest: mine.find((c) => c.date)?.date,
      lastVerified: mine.reduce(
        (min, c) => (min === "" || c.lastVerified < min ? c.lastVerified : min),
        "",
      ),
    };
  }).sort((a, b) => (b.latest ?? "").localeCompare(a.latest ?? ""));
}

export async function getEspStats() {
  const all = await loadAll();
  const watched = await getWatchedEsps();
  return {
    total: all.length,
    platforms: ESP_PLATFORMS.length,
    watchedWithNothing: watched.length,
    /** Every entry carries a source; this counts the distinct pages behind them. */
    sources: new Set(all.flatMap((c) => c.sources.map((s) => s.url))).size,
    lastVerified: all.reduce(
      (min, c) => (min === "" || c.lastVerified < min ? c.lastVerified : min),
      "",
    ),
  };
}

export type { EspChange, EspPlatform } from "@/content/esp-changes";
export { ESP_SOURCE_KIND } from "@/content/esp-changes";

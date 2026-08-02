import { checkDomain, normaliseDomain } from "@/lib/dns-check";
import { SITE } from "@/lib/site";
import { renderBadge, verdictFor, type BadgeTone } from "@/app/badge/badge-svg";

/**
 * GET /badge/<domain>.svg — the dated authentication mark.
 *
 * The point of this route is that it gets embedded on pages we do not control
 * and never look at again, which makes it the one endpoint on the site where
 * traffic is unbounded and the request rate has nothing to do with how many
 * people visit us. A single check is roughly eighteen DNS queries, so a badge
 * that resolved per request would be an amplifier aimed at our own resolver,
 * and a page full of <img src="/badge/<random>.svg"> would be free to aim it.
 * Three layers stop that: long CDN lifetimes with a week of
 * stale-while-revalidate, an in-process memo so the cold instances behind the
 * CDN do not each repeat the work, and a token bucket that caps how many
 * *fresh* domains this process will resolve per minute. When the bucket is
 * empty the badge still renders — it says it could not verify, which is true.
 */

type BadgeState = { tone: BadgeTone; verdict: string; date: string };

/* Authentication DNS changes on the scale of quarters, so a badge may be six
   hours old at the edge and a week old while it refreshes in the background.
   The mark carries its own date, so a reader always knows the vintage. */
const CACHE_VERIFIED = "public, max-age=3600, s-maxage=21600, stale-while-revalidate=604800";
/* A badge that could not verify should heal quickly, but not by retrying on
   every impression. */
const CACHE_UNVERIFIED = "public, max-age=60, s-maxage=300, stale-while-revalidate=3600";

const TTL_VERIFIED_MS = 6 * 60 * 60 * 1000;
const TTL_UNVERIFIED_MS = 60 * 1000;
/* An <img> that hangs blocks nothing, but it does leave a hole in someone's
   report for as long as node's resolver keeps retrying. Four seconds, then we
   say so. */
const DNS_DEADLINE_MS = 4000;

const MEMO_MAX = 500;
const memo = new Map<string, { until: number; state: BadgeState }>();
const inFlight = new Map<string, Promise<BadgeState>>();

const BUCKET_SIZE = 40;
const BUCKET_WINDOW_MS = 60_000;
let tokens = BUCKET_SIZE;
let lastRefill = Date.now();

function takeToken(): boolean {
  const now = Date.now();
  tokens = Math.min(BUCKET_SIZE, tokens + ((now - lastRefill) / BUCKET_WINDOW_MS) * BUCKET_SIZE);
  lastRefill = now;
  if (tokens < 1) return false;
  tokens -= 1;
  return true;
}

function remember(domain: string, state: BadgeState, ttl: number): void {
  /* A stream of unique domains would grow this without bound — the same attack
     the bucket blocks, one layer down. Insertion order makes this FIFO, which
     is the right eviction for a cache whose entries all expire on a timer. */
  if (memo.size >= MEMO_MAX) {
    const oldest = memo.keys().next().value;
    if (oldest !== undefined) memo.delete(oldest);
  }
  memo.set(domain, { until: Date.now() + ttl, state });
}

function withDeadline<T>(work: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("dns deadline")), ms);
    work.then(resolve, reject).finally(() => clearTimeout(timer));
  });
}

const today = () => new Date().toISOString().slice(0, 10);

async function badgeState(domain: string): Promise<BadgeState> {
  const hit = memo.get(domain);
  if (hit && hit.until > Date.now()) return hit.state;

  /* Thousands of impressions landing on a cold domain at once are one check,
     not thousands. */
  const running = inFlight.get(domain);
  if (running) return running;

  if (!takeToken()) {
    return { tone: "unknown", verdict: "Could not verify — check again shortly", date: today() };
  }

  const run = (async (): Promise<BadgeState> => {
    try {
      const result = await withDeadline(checkDomain(domain), DNS_DEADLINE_MS);
      const fails = result.findings.filter((f) => f.severity === "fail").length;
      const warns = result.findings.filter((f) => f.severity === "warn").length;
      const state: BadgeState = { ...verdictFor(fails, warns), date: result.checkedAt };
      remember(domain, state, TTL_VERIFIED_MS);
      return state;
    } catch {
      const state: BadgeState = {
        tone: "unknown",
        verdict: "Could not verify — DNS did not answer",
        date: today(),
      };
      remember(domain, state, TTL_UNVERIFIED_MS);
      return state;
    }
  })();

  inFlight.set(domain, run);
  try {
    return await run;
  } finally {
    inFlight.delete(domain);
  }
}

/** A hand-typed URL with a stray percent sign should 404, not throw a 500. */
function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/**
 * Malformed input gets a 404 and a sentence, not a badge.
 *
 * This is the one failure we deliberately refuse to draw. A rendered mark
 * reading "we could not read that" would sit in a client deck looking like a
 * finding about the client, and the alternative — printing the string back —
 * would put whatever the URL contained onto our own certification mark. A
 * broken image plus a readable explanation at the URL is the honest signal,
 * and /embed builds the URL so nobody has to type one.
 */
function rejected(message: string): Response {
  return new Response(`${message}\n`, {
    status: 404,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=86400",
    },
  });
}

export async function GET(_req: Request, ctx: { params: Promise<{ domain: string }> }) {
  const { domain: file } = await ctx.params;
  const raw = safeDecode(file);

  if (!raw.toLowerCase().endsWith(".svg")) {
    return rejected(`Badge URLs end in .svg — for example ${SITE.url}/badge/yourbrand.com.svg`);
  }

  const domain = normaliseDomain(raw.slice(0, -4));
  if (!domain) {
    return rejected(`That is not a domain we can check. Badge URLs look like ${SITE.url}/badge/yourbrand.com.svg`);
  }

  const state = await badgeState(domain);
  const svg = renderBadge({ domain, ...state });

  return new Response(svg, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": state.tone === "unknown" ? CACHE_UNVERIFIED : CACHE_VERIFIED,
      /* Nothing in this file fetches anything. Declaring that means a bug in
         the renderer cannot turn an SVG served from our own origin into a
         script running on it. Local fonts are not a fetch, so the generic
         stack is unaffected. */
      "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'",
      "x-content-type-options": "nosniff",
    },
  });
}

/**
 * Structured DNS auth state for domain-watch.
 *
 * Findings on /check are human prose. Snapshots are machine-diffable:
 * only real record changes should wake a subscriber — not rephrasing.
 */

import { promises as dns } from "node:dns";

export type DomainSnapshot = {
  spf: string | null;
  dmarc: string | null;
  /** Sorted "selector (vendor)" labels for known real keys. */
  dkim: string[];
  bimi: string | null;
  /** Sorted MX hosts (lowercased). */
  mx: string[];
};

const SELECTORS: [string, string][] = [
  ["kl._domainkey", "Klaviyo"],
  ["kl2._domainkey", "Klaviyo"],
  ["google._domainkey", "Google Workspace"],
  ["selector1._domainkey", "Microsoft 365"],
  ["selector2._domainkey", "Microsoft 365"],
  ["k1._domainkey", "Mailchimp"],
  ["k2._domainkey", "Mailchimp"],
  ["s1._domainkey", "SendGrid"],
  ["s2._domainkey", "SendGrid"],
  ["pm._domainkey", "Postmark"],
  ["mandrill._domainkey", "Mandrill"],
  ["dkim._domainkey", "generic"],
  ["default._domainkey", "generic"],
  ["mail._domainkey", "generic"],
];

async function txt(name: string): Promise<string[]> {
  try {
    const records = await dns.resolveTxt(name);
    return records.map((chunks) => chunks.join(""));
  } catch {
    return [];
  }
}

const hasRealKey = (records: string[]) =>
  records.some((r) => /p=\s*[A-Za-z0-9+/]{40,}/.test(r));

/** Live capture — same selectors and real-key bar as the public check. */
export async function captureDomainSnapshot(domain: string): Promise<DomainSnapshot> {
  const [spfRecords, dmarcRecords, bimiRecords, mxRaw, wildcardProbe] = await Promise.all([
    txt(domain),
    txt(`_dmarc.${domain}`),
    txt(`default._bimi.${domain}`),
    dns.resolveMx(domain).catch(() => [] as { exchange: string; priority: number }[]),
    txt(`zz-no-such-selector-probe._domainkey.${domain}`),
  ]);

  const spf = spfRecords.find((r) => r.toLowerCase().startsWith("v=spf1")) ?? null;
  const dmarc = dmarcRecords.find((r) => r.toLowerCase().startsWith("v=dmarc1")) ?? null;
  const bimi = bimiRecords.find((r) => r.toLowerCase().startsWith("v=bimi1")) ?? null;
  const mx = mxRaw.map((m) => m.exchange.toLowerCase()).sort();

  const hasWildcard = wildcardProbe.some((r) => r.toLowerCase().includes("v=dkim1"));
  const dkim: string[] = [];
  if (!hasWildcard) {
    await Promise.all(
      SELECTORS.map(async ([sel, vendor]) => {
        if (hasRealKey(await txt(`${sel}.${domain}`))) dkim.push(`${sel} (${vendor})`);
      }),
    );
    dkim.sort();
  } else {
    dkim.push("(wildcard _domainkey — selectors not enumerable)");
  }

  return { spf, dmarc, dkim, bimi, mx };
}

/** Stable key for dedupe of the same transition. */
export function snapshotChangeKey(prev: DomainSnapshot, next: DomainSnapshot): string {
  return `${stableStringify(prev)}→${stableStringify(next)}`.slice(0, 500);
}

export function snapshotsEqual(a: DomainSnapshot, b: DomainSnapshot): boolean {
  return stableStringify(a) === stableStringify(b);
}

function stableStringify(s: DomainSnapshot): string {
  return JSON.stringify({
    spf: s.spf,
    dmarc: s.dmarc,
    dkim: [...s.dkim].sort(),
    bimi: s.bimi,
    mx: [...s.mx].sort(),
  });
}

/** Human lines for the alert body — what actually moved. */
export function describeDomainChanges(prev: DomainSnapshot, next: DomainSnapshot): string[] {
  const lines: string[] = [];

  if (prev.spf !== next.spf) {
    if (!prev.spf && next.spf) lines.push(`SPF appeared: ${truncate(next.spf)}`);
    else if (prev.spf && !next.spf) lines.push("SPF record removed.");
    else lines.push(`SPF changed.\n  was: ${truncate(prev.spf)}\n  now: ${truncate(next.spf)}`);
  }

  if (prev.dmarc !== next.dmarc) {
    if (!prev.dmarc && next.dmarc) lines.push(`DMARC appeared: ${truncate(next.dmarc)}`);
    else if (prev.dmarc && !next.dmarc) lines.push("DMARC record removed.");
    else
      lines.push(`DMARC changed.\n  was: ${truncate(prev.dmarc)}\n  now: ${truncate(next.dmarc)}`);
  }

  const prevDkim = prev.dkim.join(", ") || "(none found)";
  const nextDkim = next.dkim.join(", ") || "(none found)";
  if (prevDkim !== nextDkim) {
    lines.push(`DKIM selectors changed.\n  was: ${prevDkim}\n  now: ${nextDkim}`);
  }

  if (prev.bimi !== next.bimi) {
    if (!prev.bimi && next.bimi) lines.push(`BIMI appeared: ${truncate(next.bimi)}`);
    else if (prev.bimi && !next.bimi) lines.push("BIMI record removed.");
    else lines.push("BIMI record changed.");
  }

  const prevMx = prev.mx.join(", ") || "(none)";
  const nextMx = next.mx.join(", ") || "(none)";
  if (prevMx !== nextMx) {
    lines.push(`MX hosts changed.\n  was: ${prevMx}\n  now: ${nextMx}`);
  }

  return lines;
}

function truncate(s: string | null, n = 180): string {
  if (!s) return "(empty)";
  return s.length <= n ? s : `${s.slice(0, n)}…`;
}

/** Coerce JSONB from Neon into a snapshot, or null if unusable. */
export function parseStoredSnapshot(raw: unknown): DomainSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  return {
    spf: typeof o.spf === "string" ? o.spf : o.spf === null ? null : null,
    dmarc: typeof o.dmarc === "string" ? o.dmarc : null,
    dkim: Array.isArray(o.dkim) ? o.dkim.map(String) : [],
    bimi: typeof o.bimi === "string" ? o.bimi : null,
    mx: Array.isArray(o.mx) ? o.mx.map(String) : [],
  };
}

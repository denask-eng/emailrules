/**
 * Structured DNS auth state for domain-watch and domain history.
 *
 * Findings on /check are human prose. Snapshots are machine-diffable:
 * only real record changes should wake a subscriber — not rephrasing.
 *
 * The hard part is not reading DNS, it is knowing when we did not. A resolver
 * that times out returns the same empty list as a domain that genuinely
 * publishes nothing, and writing that difference down as "DKIM disappeared"
 * would poison a history nobody can re-derive. So every lookup here reports
 * whether it was answered, and an observation with an unanswered lookup in it
 * is thrown away rather than recorded.
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

export type DomainObservation = {
  snapshot: DomainSnapshot;
  /** Every lookup either answered or authoritatively said "no such record". */
  reliable: boolean;
  /** The names the resolver could not answer for. Empty when reliable. */
  unresolved: string[];
  /**
   * The apex name exists in the DNS hierarchy at all.
   *
   * A domain nobody registered answers NXDOMAIN to everything and produces a
   * perfectly "reliable" observation of nothing — which the history table
   * would happily write down. That is harmless while /domain is private and
   * is an open write path into our own sitemap the moment it is indexed:
   * anyone could mint ten thousand pages by curling ten thousand names.
   *
   * NXDOMAIN and NODATA are the distinction that stops it, and both are
   * already in hand — no extra lookup. A registered domain with no TXT and no
   * MX answers NODATA to both; an unregistered one answers NXDOMAIN to both.
   */
  exists: boolean;
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

/* Stored verbatim in snapshots, so it must never be reworded: a new string
   would diff against every row already written and read as a change. */
const WILDCARD_LABEL = "(wildcard _domainkey — selectors not enumerable)";

const PROBE = "zz-no-such-selector-probe._domainkey";

/** A lookup that came back with something we can write down. */
type Lookup<T> = {
  value: T;
  resolved: boolean;
  /** The answer was specifically "no such name", not "no such record". */
  nxdomain?: boolean;
};

/* NXDOMAIN and NODATA are answers, not failures: the name exists in the
   hierarchy or it does not, and either way the record is absent. Every other
   code — SERVFAIL, timeout, refused — means our resolver fell over, and the
   only honest response is to admit we did not look.

   They are both answers and they do not mean the same thing, which is why
   they are no longer collapsed: NODATA says the name is real and carries no
   record of this type, NXDOMAIN says nobody registered it. */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function attempt<T>(run: () => Promise<T>, empty: T): Promise<Lookup<T> | null> {
  try {
    return { value: await run(), resolved: true };
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code ?? "";
    if (code === "ENOTFOUND") return { value: empty, resolved: true, nxdomain: true };
    if (code === "ENODATA") return { value: empty, resolved: true };
    return null;
  }
}

/* One retry before giving up. A single flaky answer should cost a domain one
   day of series, not turn into a permanent gap on a busy resolver. */
async function lookup<T>(run: () => Promise<T>, empty: T): Promise<Lookup<T>> {
  const first = await attempt(run, empty);
  if (first) return first;
  await sleep(250);
  return (await attempt(run, empty)) ?? { value: empty, resolved: false };
}

function txt(name: string): Promise<Lookup<string[]>> {
  return lookup(
    async () => (await dns.resolveTxt(name)).map((chunks) => chunks.join("")),
    [] as string[],
  );
}

/* An empty p= is a revoked key under RFC 6376, not a working one. Requiring
   real base64 after p= is the difference between reading the record and
   merely finding it. */
const hasRealKey = (records: string[]) =>
  records.some((r) => /p=\s*[A-Za-z0-9+/]{40,}/.test(r));

/** Live capture — same selectors and real-key bar as the public check. */
export async function captureDomainObservation(domain: string): Promise<DomainObservation> {
  const unresolved: string[] = [];
  const note = (name: string, l: Lookup<unknown>) => {
    if (!l.resolved) unresolved.push(name);
    return l;
  };

  /* Probe a selector that cannot exist first. Some domains publish a wildcard
     under _domainkey, which makes every selector "resolve" and would turn the
     DKIM list into a fiction. example.com does exactly this. */
  const [spfL, dmarcL, bimiL, mxL, probeL] = await Promise.all([
    txt(domain),
    txt(`_dmarc.${domain}`),
    txt(`default._bimi.${domain}`),
    lookup(() => dns.resolveMx(domain), [] as { exchange: string; priority: number }[]),
    txt(`${PROBE}.${domain}`),
  ]);

  note(domain, spfL);
  note(`_dmarc.${domain}`, dmarcL);
  note(`default._bimi.${domain}`, bimiL);
  note(`MX ${domain}`, mxL);
  note(`${PROBE}.${domain}`, probeL);

  const spf = spfL.value.find((r) => r.toLowerCase().startsWith("v=spf1")) ?? null;
  const dmarc = dmarcL.value.find((r) => r.toLowerCase().startsWith("v=dmarc1")) ?? null;
  const bimi = bimiL.value.find((r) => r.toLowerCase().startsWith("v=bimi1")) ?? null;
  const mx = mxL.value.map((m) => m.exchange.toLowerCase()).sort();

  const hasWildcard = probeL.value.some((r) => r.toLowerCase().includes("v=dkim1"));
  const dkim: string[] = [];
  if (hasWildcard) {
    dkim.push(WILDCARD_LABEL);
  } else if (probeL.resolved) {
    /* Only worth 14 more lookups once we know the probe itself was answered.
       If it was not, this observation is already unusable. */
    const probes = await Promise.all(
      SELECTORS.map(async ([sel, vendor]) => ({
        name: `${sel}.${domain}`,
        vendor,
        sel,
        result: await txt(`${sel}.${domain}`),
      })),
    );
    for (const p of probes) {
      note(p.name, p.result);
      if (p.result.resolved && hasRealKey(p.result.value)) dkim.push(`${p.sel} (${p.vendor})`);
    }
    dkim.sort();
  }

  /* Only the apex counts. `_dmarc.<domain>` answering NXDOMAIN is the normal
     state of a domain with no DMARC and says nothing about the domain itself,
     so asking it here would call half the internet imaginary. */
  const exists = !(spfL.nxdomain === true && mxL.nxdomain === true);

  return {
    snapshot: { spf, dmarc, dkim, bimi, mx },
    reliable: unresolved.length === 0,
    unresolved,
    exists,
  };
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

export type SnapshotField = "spf" | "dmarc" | "dkim" | "bimi" | "mx";

export type ChangeEntry = {
  field: SnapshotField;
  /** What moved, in one line. */
  statement: string;
  /** The records behind it, verbatim, so the reader can check our work. */
  evidence?: string;
};

/**
 * The dated rule each record answers to.
 *
 * A timeline entry that says "DMARC appeared" and stops is our opinion about
 * why that matters. Pointing at a cited page instead is the whole premise of
 * the site, so the mapping lives next to the fields rather than in a view.
 * MX is deliberately absent: where you receive mail is context, not an
 * obligation anyone has published.
 */
export const RULE_FOR_FIELD: Partial<Record<SnapshotField, string>> = {
  spf: "gmail-bulk-sender-requirements",
  dmarc: "dmarc-policy-none-is-not-enforcement",
  dkim: "dkim-alignment-vs-dkim-passing",
  bimi: "bimi-is-optional-brand-display-not-a-bulk-mandate",
};

/** Typed moves, so both the alert body and the timeline read one diff. */
export function classifyChanges(prev: DomainSnapshot, next: DomainSnapshot): ChangeEntry[] {
  const entries: ChangeEntry[] = [];

  entries.push(...record("spf", "SPF record", prev.spf, next.spf));
  entries.push(...record("dmarc", "DMARC record", prev.dmarc, next.dmarc));

  const prevDkim = prev.dkim.join(", ") || "(none found)";
  const nextDkim = next.dkim.join(", ") || "(none found)";
  if (prevDkim !== nextDkim) {
    entries.push({
      field: "dkim",
      statement: "DKIM selectors changed.",
      evidence: `was: ${prevDkim}\nnow: ${nextDkim}`,
    });
  }

  entries.push(...record("bimi", "BIMI record", prev.bimi, next.bimi));

  const prevMx = prev.mx.join(", ") || "(none)";
  const nextMx = next.mx.join(", ") || "(none)";
  if (prevMx !== nextMx) {
    entries.push({
      field: "mx",
      statement: "MX hosts changed.",
      evidence: `was: ${prevMx}\nnow: ${nextMx}`,
    });
  }

  return entries;
}

/** The three shapes a single-record move takes, said the same way each time. */
function record(
  field: SnapshotField,
  label: string,
  prev: string | null,
  next: string | null,
): ChangeEntry[] {
  if (prev === next) return [];
  if (!prev) return [{ field, statement: `${label} appeared.`, evidence: truncate(next) }];
  if (!next) return [{ field, statement: `${label} removed.`, evidence: `was: ${truncate(prev)}` }];
  return [
    {
      field,
      statement: `${label} changed.`,
      evidence: `was: ${truncate(prev)}\nnow: ${truncate(next)}`,
    },
  ];
}

/** Human lines for the alert body — what actually moved. */
export function describeDomainChanges(prev: DomainSnapshot, next: DomainSnapshot): string[] {
  return classifyChanges(prev, next).map((c) =>
    c.evidence ? `${c.statement}\n  ${c.evidence.split("\n").join("\n  ")}` : c.statement,
  );
}

/**
 * What a single snapshot held, for the row that opens a timeline.
 *
 * Quotes the record rather than grading it. A verdict here would date the
 * moment the corpus moves; the record itself never does.
 */
export function describeSnapshot(s: DomainSnapshot): ChangeEntry[] {
  return [
    {
      field: "spf" as const,
      statement: s.spf ? "SPF published." : "No SPF record.",
      evidence: s.spf ? truncate(s.spf) : undefined,
    },
    {
      field: "dmarc" as const,
      statement: s.dmarc ? "DMARC published." : "No DMARC record.",
      evidence: s.dmarc ? truncate(s.dmarc) : undefined,
    },
    {
      field: "dkim" as const,
      statement: s.dkim.length
        ? "DKIM keys on selectors we probe."
        : "No DKIM key on the selectors we probe.",
      evidence: s.dkim.length ? s.dkim.join(", ") : undefined,
    },
    ...(s.bimi
      ? [{ field: "bimi" as const, statement: "BIMI published.", evidence: truncate(s.bimi) }]
      : []),
    ...(s.mx.length
      ? [{ field: "mx" as const, statement: "MX records present.", evidence: s.mx.join(", ") }]
      : []),
  ];
}

/* Records are the substance here. Truncating one at the width of a sentence
   would leave a reader unable to check our work, which is the only reason the
   evidence is shown at all. */
function truncate(s: string | null, n = 400): string {
  if (!s) return "(empty)";
  return s.length <= n ? s : `${s.slice(0, n)}…`;
}

/** Coerce JSONB from Neon into a snapshot, or null if unusable. */
export function parseStoredSnapshot(raw: unknown): DomainSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  return {
    spf: typeof o.spf === "string" ? o.spf : null,
    dmarc: typeof o.dmarc === "string" ? o.dmarc : null,
    dkim: Array.isArray(o.dkim) ? o.dkim.map(String) : [],
    bimi: typeof o.bimi === "string" ? o.bimi : null,
    mx: Array.isArray(o.mx) ? o.mx.map(String) : [],
  };
}

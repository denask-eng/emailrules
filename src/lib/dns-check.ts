import "server-only";

import { promises as dns } from "node:dns";

/**
 * A real check, not a score.
 *
 * Everything here is a live DNS lookup against the domain the visitor typed.
 * Each finding names the rule it comes from, so the result is traceable to a
 * dated, cited page rather than to our opinion. Where we cannot know
 * something from DNS alone, the finding says so instead of guessing.
 */

export type Severity = "fail" | "warn" | "pass" | "info";

export interface Finding {
  severity: Severity;
  title: string;
  detail: string;
  /** Slug of the rule this comes from, so every finding is traceable. */
  rule?: string;
  /**
   * Glossary term id. The rule says what you are obliged to do; the term
   * shows the artefact — the literal record, the header block, the SMTP
   * code. Someone reading "DKIM passes but does not align" needs to see the
   * thing before the obligation means anything, and this is the only moment
   * on the site where they have already been told something is wrong.
   */
  term?: string;
  /** Raw record, shown verbatim so the reader can check our work. */
  evidence?: string;
}

/**
 * Selectors used by the platforms an email marketer is actually on. DKIM
 * cannot be enumerated from DNS: you must know the selector, so real tools
 * probe the common ones. A miss here is genuinely inconclusive and the
 * finding says exactly that rather than claiming DKIM is absent.
 */
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

export function normaliseDomain(raw: string): string | null {
  const d = raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .split("@")
    .pop();
  if (!d) return null;
  // Deliberately permissive: punycode and long TLDs are both legitimate.
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(d) ? d : null;
}

async function txt(name: string): Promise<string[]> {
  try {
    const records = await dns.resolveTxt(name);
    return records.map((chunks) => chunks.join(""));
  } catch {
    return [];
  }
}

/**
 * The record, as opposed to our reading of it.
 *
 * Findings are prose and they are sorted by how much they should worry you.
 * That is the right shape for "what should I do" and the wrong shape for
 * "what is actually published", which is the question somebody arrives with
 * and currently has to reconstruct by reading eight paragraphs. These are the
 * same lookups, kept rather than thrown away after the sentence was written.
 */
export interface DomainFacts {
  spf: string | null;
  /** The all-mechanism as published: -all, ~all, +all, ?all. */
  spfAll: string | null;
  spfLookups: number;
  dmarc: string | null;
  dmarcPolicy: string | null;
  dmarcHasRua: boolean;
  /** "selector (vendor)" for every selector carrying a real key. */
  dkim: string[];
  dkimWildcard: boolean;
  bimi: string | null;
  mx: string[];
  mxProvider: string | null;
}

export interface CheckResult {
  domain: string;
  checkedAt: string;
  findings: Finding[];
  facts: DomainFacts;
}

export async function checkDomain(domain: string): Promise<CheckResult> {
  const [spfRecords, dmarcRecords, bimiRecords, mx] = await Promise.all([
    txt(domain),
    txt(`_dmarc.${domain}`),
    txt(`default._bimi.${domain}`),
    dns.resolveMx(domain).catch(() => []),
  ]);

  const findings: Finding[] = [];
  const facts: DomainFacts = {
    spf: null,
    spfAll: null,
    spfLookups: 0,
    dmarc: null,
    dmarcPolicy: null,
    dmarcHasRua: false,
    dkim: [],
    dkimWildcard: false,
    bimi: null,
    mx: [],
    mxProvider: null,
  };

  /* ── SPF ───────────────────────────────────────────────────────────── */
  const spf = spfRecords.find((r) => r.toLowerCase().startsWith("v=spf1"));
  facts.spf = spf ?? null;
  if (spf) {
    facts.spfAll = /[~\-+?]all/.exec(spf)?.[0] ?? null;
    facts.spfLookups = (spf.match(/\b(include|a|mx|ptr|exists|redirect)[:=]/g) ?? []).length;
  }
  if (!spf) {
    findings.push({
      severity: "fail",
      title: "No SPF record",
      detail:
        "Gmail requires SPF from bulk senders, and Outlook rejects unauthenticated mail outright with 550 5.7.515. Without SPF you are failing both.",
      rule: "gmail-bulk-sender-requirements",
      term: "spf",
    });
  } else {
    const all = /[~\-+?]all/.exec(spf)?.[0];
    if (all === "+all") {
      findings.push({
        severity: "fail",
        title: "SPF ends in +all, which authorises the entire internet",
        detail: "This passes SPF for any sender alive. It is worse than having no record.",
        rule: "gmail-bulk-sender-requirements",
        term: "spf",
        evidence: spf,
      });
    } else {
      findings.push({
        severity: "pass",
        title: `SPF present, ending ${all ?? "with no all mechanism"}`,
        detail:
          all === "-all"
            ? "Hard fail. The strictest setting and the right one once you are confident every sender is listed."
            : "Soft fail. Accepted everywhere, though -all is stronger once your sender list is complete.",
        term: "spf",
        evidence: spf,
      });
    }
    const lookups = (spf.match(/\b(include|a|mx|ptr|exists|redirect)[:=]/g) ?? []).length;
    if (lookups > 10) {
      findings.push({
        severity: "warn",
        title: `SPF may exceed the 10 DNS lookup limit (${lookups} mechanisms)`,
        detail:
          "Past ten lookups SPF returns permerror and receivers treat it as a failure. This is a slow, silent breakage that usually appears after someone adds one more tool.",
        rule: "gmail-bulk-sender-requirements",
        term: "spf",
      });
    }
  }

  /* ── DMARC ─────────────────────────────────────────────────────────── */
  const dmarc = dmarcRecords.find((r) => r.toLowerCase().startsWith("v=dmarc1"));
  facts.dmarc = dmarc ?? null;
  if (dmarc) {
    facts.dmarcPolicy = /p=(none|quarantine|reject)/i.exec(dmarc)?.[1]?.toLowerCase() ?? null;
    facts.dmarcHasRua = /rua=/i.test(dmarc);
  }
  if (!dmarc) {
    findings.push({
      severity: "fail",
      title: "No DMARC record",
      detail:
        "This is the requirement no ESP can meet for you, because it lives on your own DNS. Microsoft rejects high-volume mail without it, and Gmail requires it above 5,000 a day.",
      rule: "outlook-high-volume-sender-authentication",
      term: "dmarc",
    });
  } else {
    const policy = /p=(none|quarantine|reject)/i.exec(dmarc)?.[1]?.toLowerCase();
    const hasRua = /rua=/i.test(dmarc);
    findings.push({
      severity: "pass",
      title: `DMARC present with p=${policy ?? "unset"}`,
      detail:
        policy === "none"
          ? "This satisfies Gmail and Outlook, and protects nothing. p=none only asks for reports; it never tells a receiver to act."
          : "A policy that actually instructs receivers, which is more than most senders publish.",
      rule: "dkim-alignment-vs-dkim-passing",
      term: "dmarc",
      evidence: dmarc,
    });
    if (!hasRua) {
      findings.push({
        severity: "warn",
        title: "DMARC has no rua address, so nobody is reading the reports",
        detail:
          "Aggregate reports are the only way to discover a tool that sends as you without permission. Most agencies stop at p=none and never look again.",
        rule: "dkim-alignment-vs-dkim-passing",
        term: "rua",
      });
    }
  }

  /* ── DKIM ──────────────────────────────────────────────────────────── */

  /* Probe a selector that cannot exist first. Some domains publish a wildcard
     under _domainkey, which makes every selector "resolve" and would turn this
     whole section into a false positive. example.com does exactly this. */
  const wildcardProbe = await txt(`zz-no-such-selector-probe._domainkey.${domain}`);
  const hasWildcard = wildcardProbe.some((r) => r.toLowerCase().includes("v=dkim1"));

  /* An empty p= is a revoked key under RFC 6376, not a working one. Requiring
     real base64 after p= is the difference between reading the record and
     merely finding it. */
  const hasRealKey = (records: string[]) =>
    records.some((r) => /p=\s*[A-Za-z0-9+/]{40,}/.test(r));

  const found: string[] = [];
  if (!hasWildcard) {
    await Promise.all(
      SELECTORS.map(async ([sel, vendor]) => {
        if (hasRealKey(await txt(`${sel}.${domain}`))) found.push(`${sel} (${vendor})`);
      }),
    );
  }

  facts.dkim = [...found].sort();
  facts.dkimWildcard = hasWildcard;

  if (hasWildcard) {
    findings.push({
      severity: "warn",
      title: "A wildcard record answers every DKIM selector",
      detail:
        wildcardProbe.some((r) => /p=\s*(;|$)/.test(r))
          ? "Every selector we tried returns a record with an empty p= value, which under RFC 6376 means the key is revoked. Selector probing tells you nothing on this domain, and any tool reporting DKIM as present here is reading the wildcard, not a key."
          : "Every selector we tried resolves, including ones we invented, so we cannot tell which keys are real. Selector probing is meaningless on this domain.",
      rule: "dkim-alignment-vs-dkim-passing",
      term: "dkim",
      evidence: wildcardProbe[0],
    });
  } else if (found.length) {
    findings.push({
      severity: "pass",
      title: `DKIM keys published on ${found.length} selector${found.length > 1 ? "s" : ""}`,
      detail:
        "A key existing is not the same as alignment working. Read a real received header and check the d= value matches your From domain before you call this done.",
      rule: "dkim-alignment-vs-dkim-passing",
      term: "alignment",
      evidence: found.join(", "),
    });
  } else {
    findings.push({
      severity: "info",
      title: "No DKIM key found on the selectors we know",
      detail:
        "This is inconclusive, not a failure. DKIM selectors cannot be listed from DNS, so we probed the common ones for Klaviyo, Google, Microsoft, Mailchimp, SendGrid and Postmark. A custom selector will not show up here.",
      rule: "dkim-alignment-vs-dkim-passing",
      term: "dkim",
    });
  }

  /* ── Context, not obligations ──────────────────────────────────────── */
  facts.bimi = bimiRecords.find((r) => r.toLowerCase().startsWith("v=bimi1")) ?? null;
  if (bimiRecords.some((r) => r.toLowerCase().startsWith("v=bimi1"))) {
    findings.push({
      severity: "info",
      title: "BIMI record published",
      detail: "Your logo can appear in supporting clients, which needs DMARC at quarantine or reject.",
      term: "bimi",
    });
  }
  if (mx.length) {
    const hosts = mx.map((m) => m.exchange.toLowerCase());
    const provider = hosts.some((h) => h.includes("google"))
      ? "Google Workspace"
      : hosts.some((h) => h.includes("outlook") || h.includes("microsoft"))
        ? "Microsoft 365"
        : null;
    facts.mx = hosts;
    facts.mxProvider = provider;
    findings.push({
      severity: "info",
      title: provider ? `Receiving mail via ${provider}` : "MX records present",
      detail:
        "Where you receive mail says nothing about where you send it. Marketing sends usually leave through a different platform entirely.",
      term: "dns",
      evidence: hosts.slice(0, 3).join(", "),
    });
  }

  const order: Record<Severity, number> = { fail: 0, warn: 1, pass: 2, info: 3 };
  findings.sort((a, b) => order[a.severity] - order[b.severity]);

  return { domain, checkedAt: new Date().toISOString().slice(0, 10), findings, facts };
}

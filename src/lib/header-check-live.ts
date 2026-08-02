import "server-only";

import { promises as dns } from "node:dns";
import type { Finding, Severity } from "./dns-check";
import {
  alignment,
  analyzeHeaders,
  orgDomainGuess,
  type Alignment,
  type HeaderCheckError,
} from "./header-check";
import { getRule } from "@/lib/rules";

export type HeaderCheckResult =
  | {
      ok: true;
      checkedAt: string;
      fromDomain: string | null;
      findings: Finding[];
      ruleTitles: Record<string, string>;
    }
  | { ok: false; error: HeaderCheckError };

interface TxtResult {
  records: string[];
  errorCode: string | null;
}

const ORDER: Record<Severity, number> = { fail: 0, warn: 1, pass: 2, info: 3 };
const TIMEOUT_MS = 3_000;
const DKIM_RULE = "dkim-alignment-vs-dkim-passing";

/** Kept local so the pure header parser never acquires a Node dependency. */
async function txt(name: string): Promise<TxtResult> {
  try {
    const records = await dns.resolveTxt(name);
    return { records: records.map((chunks) => chunks.join("")), errorCode: null };
  } catch (error) {
    const errorCode =
      typeof error === "object" && error && "code" in error && typeof error.code === "string"
        ? error.code
        : "UNKNOWN";
    return { records: [], errorCode };
  }
}

async function timedTxt(name: string): Promise<TxtResult> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      txt(name),
      new Promise<TxtResult>((resolve) => {
        timer = setTimeout(
          () => resolve({ records: [], errorCode: "TIMEOUT" }),
          TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function dnsFailure(name: string, code: string | null, rule: string): Finding | null {
  if (!code) return null;
  if (code === "TIMEOUT") {
    return {
      severity: "info",
      title: `DNS lookup timed out for ${name}`,
      detail: "DNS lookup timed out, inconclusive. Try the check again before changing anything.",
      rule,
    };
  }
  if (code === "ENOTFOUND" || code === "ENODATA") return null;
  return {
    severity: "info",
    title: `DNS lookup failed for ${name}`,
    detail: `The resolver returned ${code}, so this lookup is inconclusive.`,
    rule,
  };
}

async function checkSelector(selector: string, domain: string): Promise<Finding[]> {
  const name = `${selector}._domainkey.${domain}`;
  const result = await timedTxt(name);

  if (result.errorCode === "TIMEOUT") {
    return [dnsFailure(name, result.errorCode, DKIM_RULE)!];
  }

  if (result.errorCode === "ENOTFOUND" || result.errorCode === "ENODATA") {
    return [
      {
        severity: "warn",
        title: `DKIM key ${name} is no longer published`,
        detail: "The selector's key is gone; sends signed with it today would fail.",
        rule: DKIM_RULE,
      },
    ];
  }

  const failed = dnsFailure(name, result.errorCode, DKIM_RULE);
  if (failed) return [failed];

  const evidence = result.records.join("\n");
  if (result.records.some((record) => /p=\s*[A-Za-z0-9+/]{40,}/.test(record))) {
    return [
      {
        severity: "pass",
        title: `DKIM key ${name} is published`,
        detail: "The key this message was signed with is published right now.",
        rule: DKIM_RULE,
        evidence,
      },
    ];
  }

  if (result.records.some((record) => /(?:^|;)\s*p\s*=\s*(?:;|$)/i.test(record))) {
    return [
      {
        severity: "warn",
        title: `DKIM key ${name} is revoked`,
        detail: "The selector exists with an empty p= value, which marks the key as revoked.",
        rule: DKIM_RULE,
        evidence,
      },
    ];
  }

  if (!result.records.length) {
    return [
      {
        severity: "warn",
        title: `DKIM key ${name} is no longer published`,
        detail: "The selector's key is gone; sends signed with it today would fail.",
        rule: DKIM_RULE,
      },
    ];
  }

  return [
    {
      severity: "warn",
      title: `DKIM record ${name} has no usable public key`,
      detail: "The selector resolves, but no real base64 p= key could be read from it.",
      rule: DKIM_RULE,
      evidence,
    },
  ];
}

function best(values: Alignment[]): Alignment {
  if (values.includes("strict")) return "strict";
  if (values.includes("relaxed")) return "relaxed";
  return "none";
}

async function checkStrictDmarc(
  fromDomain: string,
  signingDomains: string[],
  returnPathDomain: string | null,
): Promise<Finding[]> {
  const name = `_dmarc.${orgDomainGuess(fromDomain)}`;
  const result = await timedTxt(name);
  const failed = dnsFailure(name, result.errorCode, DKIM_RULE);
  if (failed) return [failed];
  if (!result.records.length) return [];

  const record = result.records.find((candidate) => /^\s*v=dmarc1\b/i.test(candidate));
  if (!record) return [];

  const adkimStrict = /(?:^|;)\s*adkim\s*=\s*s\s*(?:;|$)/i.test(record);
  const aspfStrict = /(?:^|;)\s*aspf\s*=\s*s\s*(?:;|$)/i.test(record);
  const dkimAlignment = best(signingDomains.map((domain) => alignment(fromDomain, domain)));
  const spfAlignment = alignment(fromDomain, returnPathDomain);
  const conflicts: string[] = [];

  if (adkimStrict && dkimAlignment === "relaxed") conflicts.push("DKIM");
  if (aspfStrict && spfAlignment === "relaxed") conflicts.push("SPF");
  if (!conflicts.length) return [];

  return [
    {
      severity: "warn",
      title: "Your DMARC record demands strict alignment",
      detail: `${conflicts.join(" and ")} only aligns in relaxed mode in this message. A receiver's Authentication-Results is the ground truth.`,
      rule: DKIM_RULE,
      evidence: record,
    },
  ];
}

async function ruleTitles(findings: Finding[]): Promise<Record<string, string>> {
  const slugs = [...new Set(findings.map((finding) => finding.rule).filter(Boolean) as string[])];
  const entries = await Promise.all(
    slugs.map(async (slug) => {
      const rule = await getRule(slug);
      return rule ? ([slug, rule.title] as const) : null;
    }),
  );
  return Object.fromEntries(entries.filter((entry): entry is readonly [string, string] => Boolean(entry)));
}

export async function checkHeaders(raw: string): Promise<HeaderCheckResult> {
  const analysed = analyzeHeaders(raw);
  if (!analysed.ok) return analysed;

  const completeSignatures = analysed.facts.dkim.filter(
    (signature): signature is typeof signature & { d: string; s: string } =>
      Boolean(signature.d && signature.s),
  );
  const uniqueSignatures = [
    ...new Map(
      completeSignatures.map((signature) => [`${signature.s}\u0000${signature.d}`, signature]),
    ).values(),
  ];
  const signingDomains = completeSignatures.map((signature) => signature.d);

  const liveGroups = await Promise.all([
    ...uniqueSignatures.map((signature) => checkSelector(signature.s, signature.d)),
    ...(analysed.facts.fromDomain
      ? [
          checkStrictDmarc(
            analysed.facts.fromDomain,
            signingDomains,
            analysed.facts.returnPathDomain,
          ),
        ]
      : []),
  ]);
  const findings = [...analysed.findings, ...liveGroups.flat()];
  findings.sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);

  return {
    ok: true,
    checkedAt: new Date().toISOString().slice(0, 10),
    fromDomain: analysed.facts.fromDomain,
    findings,
    ruleTitles: await ruleTitles(findings),
  };
}

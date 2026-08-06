import "server-only";

import { promises as dns } from "node:dns";
import type { Finding, Severity } from "./dns-check";
import {
  alignment,
  analyzeHeaders,
  orgDomainGuess,
  type Alignment,
  type AnalyzeOptions,
  type HeaderCheckError,
  type HeaderFacts,
} from "./header-check";
import { getRule } from "@/lib/rules";

export type HeaderCheckResult =
  | {
      ok: true;
      checkedAt: string;
      fromDomain: string | null;
      findings: Finding[];
      ruleTitles: Record<string, string>;
      /** Handed back so a caller can add message-level findings without
          re-parsing the same headers a second time. */
      facts: HeaderFacts;
    }
  | { ok: false; error: HeaderCheckError };

interface TxtResult {
  records: string[];
  errorCode: string | null;
}

const ORDER: Record<Severity, number> = { fail: 0, warn: 1, pass: 2, info: 3 };
const TIMEOUT_MS = 3_000;
const DKIM_RULE = "dkim-alignment-vs-dkim-passing";

/**
 * A ceiling on how much DNS one message can make us do.
 *
 * Selectors come out of headers, and since the inbound address exists those
 * headers are written by whoever wants to write them. Real mail double-signs
 * at most; a message carrying two hundred DKIM-Signature lines is someone
 * using this checker as a resolver.
 */
const MAX_SELECTOR_PROBES = 6;

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
      title: "A DNS lookup timed out on our side",
      detail: `We ran out of time waiting for ${name}. That is our lookup failing, not proof of anything about your records — run the check again before changing anything.`,
      rule,
      evidence: `${name}: lookup timed out`,
    };
  }
  if (code === "ENOTFOUND" || code === "ENODATA") return null;
  return {
    severity: "info",
    title: "A DNS lookup did not complete",
    detail: `Our lookup for ${name} came back with ${code}, so this check is inconclusive — that is between us and the resolver, not a verdict on your records.`,
    rule,
    evidence: `${name}: ${code}`,
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
        title: `DKIM key ${name} is not published`,
        detail:
          "This message is signed with a key that has no DNS record right now. If the key really is gone, sends signed with it are failing DKIM today — check the domain settings in your sending platform, then run this check again.",
        mondayMorning:
          "Open your sending platform's domain settings and compare the DKIM records it asks for against what your DNS actually serves; re-add the missing one, then re-run this check.",
        rule: DKIM_RULE,
        evidence: `${name} TXT: no record found (NXDOMAIN)`,
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
        title: `DKIM key ${name} is not published`,
        detail:
          "This message is signed with a key that has no DNS record right now. If the key really is gone, sends signed with it are failing DKIM today — check the domain settings in your sending platform, then run this check again.",
        mondayMorning:
          "Open your sending platform's domain settings and compare the DKIM records it asks for against what your DNS actually serves; re-add the missing one, then re-run this check.",
        rule: DKIM_RULE,
        evidence: `${name} TXT: empty answer`,
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

export async function checkHeaders(
  raw: string,
  options: AnalyzeOptions = {},
): Promise<HeaderCheckResult> {
  const analysed = analyzeHeaders(raw, options);
  if (!analysed.ok) return analysed;

  const completeSignatures = analysed.facts.dkim.filter(
    (signature): signature is typeof signature & { d: string; s: string } =>
      Boolean(signature.d && signature.s),
  );
  const uniqueSignatures = [
    ...new Map(
      completeSignatures.map((signature) => [`${signature.s}\u0000${signature.d}`, signature]),
    ).values(),
  ].slice(0, MAX_SELECTOR_PROBES);
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
    facts: analysed.facts,
  };
}

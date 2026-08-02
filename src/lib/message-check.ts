import "server-only";

import { randomBytes } from "node:crypto";
import type { Finding, Severity } from "./dns-check";
import { sql, hasDatabase } from "./db";
import { unfoldHeaders, type HeaderCheckError } from "./header-check";
import { checkHeaders } from "./header-check-live";
import { extractContent, messageFindings, verdictSentence } from "./message-rules";
import { getRule } from "./rules";
import type { Ownership } from "./types";

/**
 * One engine, two doors.
 *
 * A message that arrives at the inbound address and a message pasted into the
 * box on /check/headers go through exactly this function. That is deliberate:
 * the inbound address needs DNS and a webhook secret to exist at all, and a
 * findings engine that could only be exercised through infrastructure nobody
 * has switched on yet is an engine nobody can trust.
 *
 * What is persisted is the findings and four derived facts. Not the body, not
 * the subject, not the recipient, not the raw headers. The share URL renders
 * findings, so keeping the message itself would buy the product nothing and
 * would make this table worth breaking into.
 */

/** Long enough that a share URL is not guessable, short enough to read out. */
const ID_BYTES = 10;
const ID_PATTERN = /^[0-9a-f]{20}$/;

/** The share link says "temporary" on it, so it has to actually be. */
export const RETENTION_DAYS = 30;

const SEVERITY_ORDER: Record<Severity, number> = { fail: 0, warn: 1, pass: 2, info: 3 };

/** The three fields a finding needs to be more than an assertion. */
export interface RuleMeta {
  title: string;
  ownership: Ownership;
  mondayMorning: string;
  effectiveDate: string;
}

export interface MessageCheck {
  id: string;
  createdAt: string;
  expiresAt: string;
  fromDomain: string | null;
  verdict: string;
  findings: Finding[];
}

export type MessageCheckOutcome =
  | { ok: true; fromDomain: string | null; verdict: string; findings: Finding[] }
  | { ok: false; error: HeaderCheckError };

export function newCheckId(): string {
  return randomBytes(ID_BYTES).toString("hex");
}

export function isCheckId(value: string): boolean {
  return ID_PATTERN.test(value);
}

/**
 * The domain that receives the one-time addresses.
 *
 * Deliberately its own subdomain and its own env var. Pointing MX at the root
 * would route every address on it, corrections@ included, into Resend — and
 * `alerts.emailrules.today` is the sending domain, so it should not be
 * borrowed for this either.
 *
 * Returning null is a real state and the pages handle it: with no domain
 * configured they say the address is not switched on and send people to the
 * paste box, which runs the identical engine. To switch it on, three things
 * have to be true at once:
 *
 *   1. A receiving domain exists in Resend with receiving enabled, and its MX
 *      record is published at the lowest priority number.
 *   2. INBOUND_EMAIL_DOMAIN names that same domain.
 *   3. RESEND_WEBHOOK_SECRET holds the signing secret of a webhook pointed at
 *      /api/inbound and subscribed to email.received. Without it the route
 *      refuses every delivery rather than trusting an unverified one.
 */
export function inboundDomain(): string | null {
  const domain = process.env.INBOUND_EMAIL_DOMAIN?.trim().toLowerCase();
  return domain && /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(domain) ? domain : null;
}

export function inboxAddress(id: string): string | null {
  const domain = inboundDomain();
  return domain && isCheckId(id) ? `${id}@${domain}` : null;
}

/** The local part of an address is the check id, so routing is one regex. */
export function checkIdFromAddress(address: string): string | null {
  const domain = inboundDomain();
  if (!domain) return null;
  const cleaned = address.trim().toLowerCase();
  const inner = /<([^<>]+)>/.exec(cleaned)?.[1] ?? cleaned;
  const at = inner.lastIndexOf("@");
  if (at < 1) return null;
  if (inner.slice(at + 1) !== domain) return null;
  const local = inner.slice(0, at);
  return isCheckId(local) ? local : null;
}

/** Parse, derive, order. No storage, no network beyond the DKIM lookups. */
export async function runMessageCheck(raw: string): Promise<MessageCheckOutcome> {
  const live = await checkHeaders(raw);
  if (!live.ok) return live;

  const content = extractContent(raw);
  const findings = [
    ...live.findings,
    ...messageFindings({ headers: unfoldHeaders(raw), facts: live.facts, content }),
  ].sort((left, right) => SEVERITY_ORDER[left.severity] - SEVERITY_ORDER[right.severity]);

  return {
    ok: true,
    fromDomain: live.fromDomain,
    verdict: verdictSentence(findings),
    findings,
  };
}

/**
 * Resolve the rule behind every finding.
 *
 * A finding without a citation is exactly what this site exists not to be, so
 * the page renders the rule's own title, ownership verdict and Monday move
 * rather than a sentence written here about it.
 */
export async function ruleMetaFor(findings: Finding[]): Promise<Record<string, RuleMeta>> {
  const slugs = [...new Set(findings.map((finding) => finding.rule).filter(Boolean) as string[])];
  const entries = await Promise.all(
    slugs.map(async (slug) => {
      const rule = await getRule(slug);
      return rule
        ? ([
            slug,
            {
              title: rule.title,
              ownership: rule.ownership,
              mondayMorning: rule.mondayMorning,
              effectiveDate: rule.effectiveDate,
            },
          ] as const)
        : null;
    }),
  );
  return Object.fromEntries(entries.filter((entry): entry is readonly [string, RuleMeta] => Boolean(entry)));
}

interface Row {
  id: string;
  created_at: string;
  expires_at: string;
  from_domain: string | null;
  findings: Finding[];
  verdict: string;
}

/**
 * First message wins.
 *
 * The one-time address and the share URL are the same id, so a leaked link is
 * an address a stranger could mail. `on conflict do nothing` means the worst
 * they achieve is being ignored, rather than replacing someone's result.
 */
export async function saveMessageCheck(
  id: string,
  result: { fromDomain: string | null; verdict: string; findings: Finding[] },
): Promise<boolean> {
  if (!hasDatabase() || !isCheckId(id)) return false;

  const expires = new Date(Date.now() + RETENTION_DAYS * 86_400_000).toISOString();
  const rows = (await sql()`
    insert into message_checks (id, expires_at, from_domain, findings, verdict)
    values (${id}, ${expires}, ${result.fromDomain}, ${JSON.stringify(result.findings)}::jsonb, ${result.verdict})
    on conflict (id) do nothing
    returning id
  `) as { id: string }[];

  /* The page promises the link is temporary. Sweeping on write keeps that
     true without a cron job that could quietly stop running. */
  await sql()`delete from message_checks where expires_at < now()`;

  return rows.length > 0;
}

export async function loadMessageCheck(id: string): Promise<MessageCheck | null> {
  if (!hasDatabase() || !isCheckId(id)) return null;

  const rows = (await sql()`
    select id, created_at, expires_at, from_domain, findings, verdict
    from message_checks
    where id = ${id} and expires_at > now()
  `) as Row[];
  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id,
    createdAt: new Date(row.created_at).toISOString(),
    expiresAt: new Date(row.expires_at).toISOString(),
    fromDomain: row.from_domain,
    verdict: row.verdict,
    findings: Array.isArray(row.findings) ? row.findings : [],
  };
}

/* Re-exported so the webhook has one import site for the whole pipeline. The
   functions themselves are pure and live with the parser they belong to. */
export { composeMessage, rebuildHeaderBlock } from "./message-rules";

export async function messageCheckExists(id: string): Promise<boolean> {
  if (!hasDatabase() || !isCheckId(id)) return false;
  const rows = (await sql()`
    select 1 as hit from message_checks where id = ${id} and expires_at > now()
  `) as { hit: number }[];
  return rows.length > 0;
}

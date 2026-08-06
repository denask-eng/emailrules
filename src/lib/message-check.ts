import "server-only";

import { randomBytes } from "node:crypto";
import type { Finding, Severity } from "./dns-check";
import { sql, hasDatabase } from "./db";
import { unfoldHeaders, type HeaderCheckError } from "./header-check";
import { checkHeaders } from "./header-check-live";
import { extractContent, messageFindings, verdictSentence } from "./message-rules";
import { getRule } from "./rules";
import type { EspApplicability, Ownership } from "./types";
import {
  campaignApplicability,
  findingDetailForContext,
  firstActionForFinding,
  parseCampaignContext,
  reportAccessTokenMatches,
  type Applicability,
  type CampaignContext,
  type CampaignFinding,
  type EvidenceConfidence,
  type EvidenceState,
  type FindingSource,
  type SessionStatus,
} from "./campaign-contract";

export { parseCampaignContext, prioritizedFindings } from "./campaign-contract";
export type {
  Applicability,
  CampaignContext,
  CampaignEsp,
  CampaignFinding,
  CampaignGeo,
  EvidenceConfidence,
  EvidenceState,
  FindingSource,
  SessionStatus,
} from "./campaign-contract";

const TOKEN_BYTES = 16;
const SHARE_TOKEN_BYTES = 32;
const TOKEN_PATTERN = /^(?:[0-9a-f]{20}|[0-9a-f]{32})$/;
const SHARE_TOKEN_PATTERN = /^[0-9a-f]{64}$/;

export const RECEIVE_MINUTES = 30;
export const RETENTION_DAYS = 30;
export const SESSION_RATE_LIMIT = 10;

const SEVERITY_ORDER: Record<Severity, number> = { fail: 0, warn: 1, pass: 2, info: 3 };

export interface RuleMeta {
  slug: string;
  title: string;
  ownership: Ownership;
  mondayMorning: string;
  effectiveDate: string;
  jurisdictions: string[];
  esp?: EspApplicability;
  provider?: string;
  source: FindingSource | null;
}

export interface CampaignSession {
  id: string;
  reportToken: string;
  parentId: string | null;
  createdAt: string;
  receiveExpiresAt: string;
  completedAt: string | null;
  status: SessionStatus;
  context: CampaignContext;
  failureCode: string | null;
}

export interface MessageCheck {
  id: string;
  reportToken: string;
  createdAt: string;
  expiresAt: string;
  fromDomain: string | null;
  verdict: string;
  findings: CampaignFinding[];
  context: CampaignContext | null;
}

export type MessageCheckOutcome =
  | { ok: true; fromDomain: string | null; verdict: string; findings: CampaignFinding[] }
  | { ok: false; error: HeaderCheckError };

export function newCheckId(): string {
  return randomBytes(TOKEN_BYTES).toString("hex");
}

function newShareToken(): string {
  return randomBytes(SHARE_TOKEN_BYTES).toString("hex");
}

export function isCheckId(value: string): boolean {
  return TOKEN_PATTERN.test(value);
}

export function isShareToken(value: string): boolean {
  return SHARE_TOKEN_PATTERN.test(value);
}

export function inboundDomain(): string | null {
  const domain = process.env.INBOUND_EMAIL_DOMAIN?.trim().toLowerCase();
  return domain && /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(domain) ? domain : null;
}

export function inboxAddress(id: string): string | null {
  const domain = inboundDomain();
  return domain && isCheckId(id) ? `${id}@${domain}` : null;
}

export function checkIdFromAddress(address: string): string | null {
  const domain = inboundDomain();
  if (!domain) return null;
  const cleaned = address.trim().toLowerCase();
  const inner = /<([^<>]+)>/.exec(cleaned)?.[1] ?? cleaned;
  const at = inner.lastIndexOf("@");
  if (at < 1 || inner.slice(at + 1) !== domain) return null;
  const local = inner.slice(0, at);
  return isCheckId(local) ? local : null;
}

function isUnknownFinding(finding: Finding): boolean {
  const text = `${finding.title} ${finding.detail}`.toLowerCase();
  return /could not|cannot determine|cannot show|does not show|unknown|inconclusive|unavailable|not enough evidence/.test(text);
}

export async function ruleMetaFor(findings: Finding[]): Promise<Record<string, RuleMeta>> {
  const slugs = [...new Set(findings.map((finding) => finding.rule).filter(Boolean) as string[])];
  const entries = await Promise.all(
    slugs.map(async (slug) => {
      const rule = await getRule(slug);
      if (!rule) return null;
      const first = rule.sources[0];
      return [
        slug,
        {
          slug: rule.slug,
          title: rule.title,
          ownership: rule.ownership,
          mondayMorning: rule.mondayMorning,
          effectiveDate: rule.effectiveDate,
          jurisdictions: rule.jurisdictions,
          esp: rule.esp,
          provider: rule.provider,
          source: first
            ? { title: first.name, url: first.url, published: first.published, verified: rule.lastVerified }
            : null,
        },
      ] as const;
    }),
  );
  return Object.fromEntries(entries.filter((entry) => entry !== null)) as Record<string, RuleMeta>;
}

async function enrichFindings(
  findings: Finding[],
  context?: CampaignContext,
): Promise<CampaignFinding[]> {
  const meta = await ruleMetaFor(findings);
  return findings.map((finding) => {
    const rule = finding.rule ? meta[finding.rule] : undefined;
    const unknown = isUnknownFinding(finding);
    const evidenceState: EvidenceState = finding.evidence
      ? "observed"
      : unknown
        ? "could_not_determine"
        : finding.severity === "fail" || finding.severity === "warn"
          ? "inferred"
          : "observed";
    const confidence: EvidenceConfidence =
      evidenceState === "observed" ? "high" : evidenceState === "inferred" ? "medium" : "low";
    const applicability = rule ? campaignApplicability(rule, context) : "applies";
    const contextualDetail = findingDetailForContext(finding.rule, finding.detail, context);
    return {
      ...finding,
      detail: contextualDetail,
      evidenceState,
      confidence,
      applicability,
      rootCause: finding.rule ?? `${finding.stage ?? "message"}:${finding.title.toLowerCase()}`,
      observed: finding.evidence?.replace(/\s+/g, " ").trim() || finding.title,
      why: contextualDetail,
      owner: finding.ownership ?? rule?.ownership ?? null,
      firstAction: firstActionForFinding(finding, rule?.mondayMorning),
      source: rule?.source ?? null,
      ruleVersion: finding.rule && rule ? `${finding.rule}@${rule.source?.verified ?? rule.effectiveDate}` : null,
      detectorVersion: "message-v1",
    };
  });
}

export async function runMessageCheck(
  raw: string,
  context?: CampaignContext,
): Promise<MessageCheckOutcome> {
  const live = await checkHeaders(raw);
  if (!live.ok) return live;
  const content = extractContent(raw);
  const rawFindings = [
    ...live.findings,
    ...messageFindings({ headers: unfoldHeaders(raw), facts: live.facts, content }),
  ].sort((left, right) => SEVERITY_ORDER[left.severity] - SEVERITY_ORDER[right.severity]);
  const findings = await enrichFindings(rawFindings, context);
  return {
    ok: true,
    fromDomain: live.fromDomain,
    verdict: verdictSentence(findings),
    findings,
  };
}

interface SessionRow {
  id: string;
  report_token: string;
  parent_id: string | null;
  created_at: string;
  receive_expires_at: string;
  completed_at: string | null;
  status: SessionStatus;
  context: CampaignContext;
  failure_code: string | null;
}

function sessionFromRow(row: SessionRow): CampaignSession {
  const expiresAt = new Date(row.receive_expires_at);
  const status = row.status === "waiting" && expiresAt.getTime() <= Date.now() ? "expired" : row.status;
  return {
    id: row.id,
    reportToken: row.report_token,
    parentId: row.parent_id,
    createdAt: new Date(row.created_at).toISOString(),
    receiveExpiresAt: expiresAt.toISOString(),
    completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null,
    status,
    context: parseCampaignContext(row.context) ?? { esp: "other", geographies: ["Other"], gmailBulk: false },
    failureCode: row.failure_code,
  };
}

export async function createCheckSession(
  context: CampaignContext,
  networkHash: string | null,
  parentId: string | null = null,
): Promise<{ session: CampaignSession | null; rateLimited: boolean }> {
  if (!hasDatabase()) return { session: null, rateLimited: false };
  if (networkHash) {
    const recent = (await sql()`
      select count(*)::int as count
      from check_sessions
      where network_hash = ${networkHash} and created_at > now() - interval '1 hour'
    `) as { count: number }[];
    if ((recent[0]?.count ?? 0) >= SESSION_RATE_LIMIT) return { session: null, rateLimited: true };
  }
  const id = newCheckId();
  const reportToken = newCheckId();
  const receiveExpiresAt = new Date(Date.now() + RECEIVE_MINUTES * 60_000).toISOString();
  const rows = (await sql()`
    insert into check_sessions (id, report_token, parent_id, receive_expires_at, context, network_hash)
    values (${id}, ${reportToken}, ${parentId}, ${receiveExpiresAt}, ${JSON.stringify(context)}::jsonb, ${networkHash})
    returning id, report_token, parent_id, created_at, receive_expires_at, completed_at, status, context, failure_code
  `) as SessionRow[];
  return { session: rows[0] ? sessionFromRow(rows[0]) : null, rateLimited: false };
}

export async function loadCheckSession(token: string): Promise<CampaignSession | null> {
  if (!hasDatabase() || !isCheckId(token)) return null;
  const rows = (await sql()`
    select id, report_token, parent_id, created_at, receive_expires_at, completed_at, status, context, failure_code
    from check_sessions
    where id = ${token} or report_token = ${token}
    limit 1
  `) as SessionRow[];
  return rows[0] ? sessionFromRow(rows[0]) : null;
}

export async function claimCheckSession(id: string): Promise<CampaignSession | null> {
  if (!hasDatabase() || !isCheckId(id)) return null;
  const rows = (await sql()`
    update check_sessions
    set status = 'received'
    where id = ${id} and status = 'waiting' and receive_expires_at > now()
    returning id, report_token, parent_id, created_at, receive_expires_at, completed_at, status, context, failure_code
  `) as SessionRow[];
  return rows[0] ? sessionFromRow(rows[0]) : null;
}

export async function markSessionStatus(
  id: string,
  status: "processing" | "failed",
  failureCode: string | null = null,
): Promise<void> {
  if (!hasDatabase() || !isCheckId(id)) return;
  await sql()`
    update check_sessions set status = ${status}, failure_code = ${failureCode}
    where id = ${id} and status in ('received', 'processing')
  `;
}

interface CheckRow {
  id: string;
  report_token: string | null;
  context: CampaignContext | null;
  created_at: string;
  expires_at: string;
  from_domain: string | null;
  findings: Finding[];
  verdict: string;
}

export async function saveMessageCheck(
  id: string,
  result: { fromDomain: string | null; verdict: string; findings: CampaignFinding[] },
): Promise<boolean> {
  if (!hasDatabase() || !isCheckId(id)) return false;
  const expires = new Date(Date.now() + RETENTION_DAYS * 86_400_000).toISOString();
  const rows = (await sql()`
    insert into message_checks (id, expires_at, from_domain, findings, verdict)
    values (${id}, ${expires}, ${result.fromDomain}, ${JSON.stringify(result.findings)}::jsonb, ${result.verdict})
    on conflict (id) do nothing
    returning id
  `) as { id: string }[];
  if (rows.length > 0) {
    await sql()`
      update check_sessions
      set status = 'complete', completed_at = now(), failure_code = null
      where id = ${id}
    `;
  }
  await sql()`delete from share_reports where expires_at < now() or revoked_at is not null and revoked_at < now() - interval '7 days'`;
  await sql()`delete from message_checks where expires_at < now()`;
  return rows.length > 0;
}

export async function loadMessageCheck(token: string): Promise<MessageCheck | null> {
  if (!hasDatabase() || !isCheckId(token)) return null;
  const rows = (await sql()`
    select mc.id, cs.report_token, cs.context, mc.created_at, mc.expires_at,
           mc.from_domain, mc.findings, mc.verdict
    from message_checks mc
    left join check_sessions cs on cs.id = mc.id
    where (cs.report_token = ${token} or (cs.id is null and mc.id = ${token}))
      and mc.expires_at > now()
    limit 1
  `) as CheckRow[];
  const row = rows[0];
  if (!row || !reportAccessTokenMatches(token, { id: row.id, reportToken: row.report_token })) return null;
  const context = parseCampaignContext(row.context);
  const findings = await enrichFindings(Array.isArray(row.findings) ? row.findings : [], context ?? undefined);
  return {
    id: row.id,
    reportToken: row.report_token ?? row.id,
    createdAt: new Date(row.created_at).toISOString(),
    expiresAt: new Date(row.expires_at).toISOString(),
    fromDomain: row.from_domain,
    verdict: row.verdict,
    findings,
    context,
  };
}

export async function messageCheckExists(token: string): Promise<boolean> {
  return Boolean(await loadMessageCheck(token));
}

export async function createRecheckSession(
  reportToken: string,
  networkHash: string | null,
): Promise<{ session: CampaignSession | null; rateLimited: boolean }> {
  const parent = await loadCheckSession(reportToken);
  if (!parent || parent.reportToken !== reportToken) return { session: null, rateLimited: false };
  return createCheckSession(parent.context, networkHash, parent.id);
}

export async function createShareReport(reportToken: string): Promise<string | null> {
  const session = await loadCheckSession(reportToken);
  if (!session || session.reportToken !== reportToken || !(await messageCheckExists(reportToken))) return null;
  const existing = (await sql()`
    select token from share_reports
    where session_id = ${session.id} and revoked_at is null and expires_at > now()
    order by created_at desc limit 1
  `) as { token: string }[];
  if (existing[0]?.token) return existing[0].token;
  const token = newShareToken();
  const expires = new Date(Date.now() + RETENTION_DAYS * 86_400_000).toISOString();
  await sql()`insert into share_reports (token, session_id, expires_at) values (${token}, ${session.id}, ${expires})`;
  return token;
}

export async function loadSharedMessageCheck(token: string): Promise<MessageCheck | null> {
  if (!hasDatabase() || !isShareToken(token)) return null;
  const rows = (await sql()`
    select cs.report_token
    from share_reports sr
    join check_sessions cs on cs.id = sr.session_id
    where sr.token = ${token} and sr.revoked_at is null and sr.expires_at > now()
    limit 1
  `) as { report_token: string }[];
  return rows[0]?.report_token ? loadMessageCheck(rows[0].report_token) : null;
}

export async function revokeShareReport(token: string, reportToken: string): Promise<boolean> {
  if (!hasDatabase() || !isShareToken(token) || !isCheckId(reportToken)) return false;
  const rows = (await sql()`
    update share_reports sr set revoked_at = now()
    from check_sessions cs
    where sr.token = ${token} and sr.session_id = cs.id and cs.report_token = ${reportToken}
      and sr.revoked_at is null
    returning sr.token
  `) as { token: string }[];
  return rows.length > 0;
}

export { composeMessage, rebuildHeaderBlock } from "./message-rules";

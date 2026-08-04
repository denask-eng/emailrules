import "server-only";

import { randomBytes } from "node:crypto";
import { sql, hasDatabase } from "./db";
import type { AggregateReport, ReportRow } from "./dmarc-report";

/**
 * Storage for the reporting endpoints, and nothing clever.
 *
 * The token in the address is the token in the URL is the only credential.
 * That is the same trade the one-time message check already makes, and the
 * reasoning is the same: a DMARC report contains sending addresses and volumes,
 * not message content, and the alternative — an account system — is a login to
 * build, a password to reset, and a breach to have.
 *
 * What it does mean is that the token has to be unguessable and the page has to
 * say plainly that the link is the key. Sixteen bytes is 128 bits.
 */

const TOKEN_BYTES = 16;
const ID_PATTERN = /^[0-9a-f]{32}$/;

/** Long enough to see a weekly pattern without storing a year of anyone's mail. */
export const RETENTION_DAYS = 60;

export interface Endpoint {
  token: string;
  domain: string;
  createdAt: string;
  lastSeenAt: string | null;
  reportCount: number;
}

export function newToken(): string {
  return randomBytes(TOKEN_BYTES).toString("hex");
}

export function isToken(value: string): boolean {
  return ID_PATTERN.test(value);
}

/**
 * The address a receiver will mail reports to.
 *
 * Deliberately shares INBOUND_EMAIL_DOMAIN with the message check rather than
 * claiming a second subdomain: one verified receiving domain is what the free
 * tier allows, and the local part already tells the router which of the two
 * kinds of mail this is.
 */
export function reportAddress(token: string): string | null {
  const domain = process.env.INBOUND_EMAIL_DOMAIN?.trim().toLowerCase();
  if (!domain || !isToken(token)) return null;
  return `dmarc-${token}@${domain}`;
}

/** The inverse, used by the webhook. Null for anything that is not ours. */
export function tokenFromAddress(address: string): string | null {
  const domain = process.env.INBOUND_EMAIL_DOMAIN?.trim().toLowerCase();
  if (!domain) return null;
  const inner = /<([^<>]+)>/.exec(address)?.[1] ?? address;
  const cleaned = inner.trim().toLowerCase();
  const at = cleaned.lastIndexOf("@");
  if (at < 1 || cleaned.slice(at + 1) !== domain) return null;
  const local = cleaned.slice(0, at);
  if (!local.startsWith("dmarc-")) return null;
  const token = local.slice(6);
  return isToken(token) ? token : null;
}

export async function createEndpoint(domain: string): Promise<Endpoint | null> {
  if (!hasDatabase()) return null;
  const token = newToken();
  const clean = domain.trim().toLowerCase().slice(0, 253);
  await sql()`
    insert into dmarc_endpoints (token, domain) values (${token}, ${clean})
  `;
  return { token, domain: clean, createdAt: new Date().toISOString(), lastSeenAt: null, reportCount: 0 };
}

export async function getEndpoint(token: string): Promise<Endpoint | null> {
  if (!hasDatabase() || !isToken(token)) return null;
  const rows = (await sql()`
    select token, domain, created_at, last_seen_at, report_count
      from dmarc_endpoints where token = ${token}
  `) as Array<{
    token: string;
    domain: string;
    created_at: string | Date;
    last_seen_at: string | Date | null;
    report_count: number;
  }>;
  const row = rows[0];
  return row
    ? {
        token: row.token,
        domain: row.domain,
        createdAt: iso(row.created_at) ?? new Date(0).toISOString(),
        lastSeenAt: iso(row.last_seen_at),
        reportCount: row.report_count,
      }
    : null;
}

/**
 * Neon hands back a Date for every timestamptz, not the string the row type
 * suggests. Normalising here rather than at each call site is the difference
 * between one conversion and a `.slice is not a function` on whichever page
 * forgets — which is exactly how this was found.
 */
function iso(value: string | Date | null): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

/**
 * Store one report.
 *
 * `on conflict do nothing` on (org_name, report_id) is what keeps a redelivered
 * webhook from doubling every number on the page. Resend retries on any non-200
 * and the route answers 200 to almost everything, so a duplicate is the normal
 * case rather than the exceptional one.
 *
 * Returns whether this was new, so the log can say so.
 */
export async function saveReport(token: string, report: AggregateReport): Promise<boolean> {
  if (!hasDatabase()) return false;
  const id = `${report.orgName}|${report.reportId}`.slice(0, 300);

  const inserted = (await sql()`
    insert into dmarc_reports (id, token, domain, org_name, begins_at, ends_at, policy, records)
    values (
      ${id}, ${token}, ${report.domain}, ${report.orgName},
      ${report.begin}, ${report.end},
      ${JSON.stringify(report.policy)}, ${JSON.stringify(report.rows)}
    )
    on conflict (id) do nothing
    returning id
  `) as Array<{ id: string }>;

  if (!inserted.length) return false;

  await sql()`
    update dmarc_endpoints
       set last_seen_at = now(), report_count = report_count + 1
     where token = ${token}
  `;
  return true;
}

export interface StoredReport extends AggregateReport {
  receivedAt: string;
}

export async function reportsFor(token: string): Promise<StoredReport[]> {
  if (!hasDatabase() || !isToken(token)) return [];
  const rows = (await sql()`
    select domain, org_name, begins_at, ends_at, policy, records, received_at
      from dmarc_reports
     where token = ${token}
       and ends_at > now() - make_interval(days => ${RETENTION_DAYS})
     order by ends_at desc
     limit 500
  `) as Array<{
    domain: string;
    org_name: string;
    begins_at: string;
    ends_at: string;
    policy: AggregateReport["policy"];
    records: ReportRow[];
    received_at: string;
  }>;

  return rows.map((r) => ({
    orgName: r.org_name,
    reportId: "",
    begin: new Date(r.begins_at).toISOString(),
    end: new Date(r.ends_at).toISOString(),
    domain: r.domain,
    policy: r.policy,
    rows: r.records,
    receivedAt: new Date(r.received_at).toISOString(),
  }));
}

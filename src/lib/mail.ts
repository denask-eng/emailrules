import "server-only";

import { SITE } from "@/lib/site";
import { fmtDate } from "@/lib/format";
import type { Rule } from "@/lib/types";

/**
 * The alert email.
 *
 * This site publishes the rules that govern marketing email, so its own mail
 * has to satisfy every one of them or the whole thing is a joke. Concretely:
 *
 *  - RFC 8058 one-click unsubscribe: List-Unsubscribe AND List-Unsubscribe-Post.
 *    One without the other does not count, which is the site's own rule.
 *  - A real postal address, because CAN-SPAM requires one on every message.
 *  - A subject line that describes what is inside, with no invented urgency.
 *    Washington treats a misleading subject as an automatic violation.
 *  - Real text in the first 200 characters and never image-only, because
 *    Apple Mail summarises from live text and ignores alt text.
 *  - Plain text alongside HTML, so the summariser and the screen reader both
 *    get something worth reading.
 */

/** Swap for a real registered address before the first send. */
export const POSTAL_ADDRESS = process.env.ALERT_POSTAL_ADDRESS ?? "";

export interface AlertInput {
  rule: Rule;
  changeDate: string;
  note: string;
  unsubscribeUrl: string;
}

/** Descriptive, dated, no urgency. It is what happened, not a pitch. */
export function alertSubject(rule: Rule, changeDate: string): string {
  return `${rule.title} — updated ${fmtDate(changeDate)}`;
}

export function alertText({ rule, changeDate, note, unsubscribeUrl }: AlertInput): string {
  const url = `${SITE.url}/rules/${rule.slug}`;
  return [
    `${note}`,
    ``,
    `${rule.title}`,
    `Changed ${fmtDate(changeDate)}. Last verified ${fmtDate(rule.lastVerified)}.`,
    ``,
    `Is this even your job? ${ownershipLine(rule)}`,
    ``,
    `Do this first: ${rule.mondayMorning}`,
    rule.ignoreIf ? `\nSkip all of this if: ${rule.ignoreIf}` : ``,
    ``,
    `Read the full rule, with its sources:`,
    url,
    ``,
    `--`,
    `You get one email per rule change and nothing else, ever.`,
    `Unsubscribe in one click: ${unsubscribeUrl}`,
    POSTAL_ADDRESS ? `\n${POSTAL_ADDRESS}` : ``,
    `Not legal advice.`,
  ]
    .filter((l) => l !== undefined)
    .join("\n");
}

function ownershipLine(rule: Rule): string {
  switch (rule.ownership) {
    case "esp":
      return `Probably not. ${rule.handled.already}`;
    case "shared":
      return `Partly. ${rule.handled.stillYours ?? rule.handled.already}`;
    case "context":
      return `Nothing to do. ${rule.handled.already}`;
    default:
      return `Yes. ${rule.handled.stillYours ?? rule.handled.already}`;
  }
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Deliberately plain HTML: a single column, system fonts, no images at all.
 * An image-only email is summarised by Apple from the subject line alone, and
 * this one is meant to be readable in the summary without being opened.
 */
export function alertHtml({ rule, changeDate, note, unsubscribeUrl }: AlertInput): string {
  const url = `${SITE.url}/rules/${rule.slug}`;
  return `<!doctype html>
<html lang="en"><body style="margin:0;padding:24px;background:#fdfdfb;color:#17171a;font:16px/1.55 -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
<div style="max-width:560px;margin:0 auto">
<p style="margin:0 0 20px;font-size:16px">${esc(note)}</p>
<h1 style="margin:0 0 8px;font-size:22px;line-height:1.25;letter-spacing:-0.02em">${esc(rule.title)}</h1>
<p style="margin:0 0 24px;font-size:13px;color:#6c6c68">Changed ${fmtDate(changeDate)} · last verified ${fmtDate(rule.lastVerified)} · ${esc(rule.jurisdictions.join(" · "))}</p>
<p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#6c6c68">Is this even your job?</p>
<p style="margin:0 0 24px">${esc(ownershipLine(rule))}</p>
<p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#6c6c68">Do this first</p>
<p style="margin:0 0 24px">${esc(rule.mondayMorning)}</p>
${rule.ignoreIf ? `<p style="margin:0 0 24px;color:#6c6c68"><strong style="color:#17171a">Skip all of this if:</strong> ${esc(rule.ignoreIf)}</p>` : ""}
<p style="margin:0 0 32px"><a href="${url}" style="color:#2347d9">Read the full rule, with its sources</a></p>
<hr style="border:0;border-top:1px solid #e7e7e1;margin:0 0 16px">
<p style="margin:0 0 8px;font-size:13px;color:#6c6c68">One email per rule change and nothing else, ever. <a href="${unsubscribeUrl}" style="color:#6c6c68">Unsubscribe</a>.</p>
${POSTAL_ADDRESS ? `<p style="margin:0 0 8px;font-size:12px;color:#8f8f89">${esc(POSTAL_ADDRESS)}</p>` : ""}
<p style="margin:0;font-size:12px;color:#8f8f89">Not legal advice.</p>
</div></body></html>`;
}

export interface SendResult {
  sent: number;
  failed: number;
  error?: string;
}

export interface DomainAlertInput {
  domain: string;
  changes: string[];
  checkUrl: string;
  unsubscribeUrl: string;
}

export function domainAlertSubject(domain: string): string {
  return `DNS auth changed on ${domain}`;
}

export function domainAlertText({
  domain,
  changes,
  checkUrl,
  unsubscribeUrl,
}: DomainAlertInput): string {
  return [
    `Authentication DNS for ${domain} moved since we last checked.`,
    ``,
    ...changes,
    ``,
    `Live check:`,
    checkUrl,
    ``,
    `--`,
    `You asked to watch this domain. One email when SPF, DKIM, DMARC, BIMI or MX actually changes — nothing else.`,
    `Unsubscribe in one click: ${unsubscribeUrl}`,
    POSTAL_ADDRESS ? `\n${POSTAL_ADDRESS}` : ``,
    `Not legal advice.`,
  ].join("\n");
}

export function domainAlertHtml({
  domain,
  changes,
  checkUrl,
  unsubscribeUrl,
}: DomainAlertInput): string {
  const body = changes
    .map((c) => `<p style="margin:0 0 12px;white-space:pre-wrap">${esc(c)}</p>`)
    .join("");
  return `<!doctype html>
<html lang="en"><body style="margin:0;padding:24px;background:#fdfdfb;color:#17171a;font:16px/1.55 -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
<div style="max-width:560px;margin:0 auto">
<p style="margin:0 0 8px;font-size:13px;color:#6c6c68">Domain watch</p>
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.25;letter-spacing:-0.02em">${esc(domain)}</h1>
<p style="margin:0 0 20px">Authentication DNS moved since we last checked.</p>
${body}
<p style="margin:0 0 32px"><a href="${checkUrl}" style="color:#2347d9">Open the live check</a></p>
<hr style="border:0;border-top:1px solid #e7e7e1;margin:0 0 16px">
<p style="margin:0 0 8px;font-size:13px;color:#6c6c68">You asked to watch this domain. <a href="${unsubscribeUrl}" style="color:#6c6c68">Unsubscribe</a>.</p>
${POSTAL_ADDRESS ? `<p style="margin:0 0 8px;font-size:12px;color:#8f8f89">${esc(POSTAL_ADDRESS)}</p>` : ""}
<p style="margin:0;font-size:12px;color:#8f8f89">Not legal advice.</p>
</div></body></html>`;
}

async function sendResend(opts: {
  to: string;
  subject: string;
  text: string;
  html: string;
  unsubscribeUrl: string;
}): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.ALERT_FROM ?? "emailrules.today <alerts@alerts.emailrules.today>";
  if (!key) return { ok: false, error: "RESEND_API_KEY is not set" };

  /* CAN-SPAM requires a physical postal address on every commercial message,
     and this site publishes that rule at $53,088 a message. Refusing to send
     is the only defensible behaviour when the address is missing. */
  if (!POSTAL_ADDRESS.trim()) {
    return { ok: false, error: "ALERT_POSTAL_ADDRESS is empty; CAN-SPAM requires one on every send" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      from,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
      headers: {
        /* Both are required. A List-Unsubscribe header on its own is not
           one-click and does not satisfy Gmail or Yahoo. */
        "List-Unsubscribe": `<${opts.unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    }),
  });

  if (!res.ok) return { ok: false, error: `${res.status} ${await res.text()}` };
  return { ok: true };
}

/**
 * Sends via Resend's REST API directly rather than its SDK: one fetch, no
 * dependency, and the headers below are the whole reason this exists.
 */
export async function sendAlert(
  to: string,
  input: AlertInput,
): Promise<{ ok: boolean; error?: string }> {
  return sendResend({
    to,
    subject: alertSubject(input.rule, input.changeDate),
    text: alertText(input),
    html: alertHtml(input),
    unsubscribeUrl: input.unsubscribeUrl,
  });
}

export async function sendDomainAlert(
  to: string,
  input: DomainAlertInput,
): Promise<{ ok: boolean; error?: string }> {
  return sendResend({
    to,
    subject: domainAlertSubject(input.domain),
    text: domainAlertText(input),
    html: domainAlertHtml(input),
    unsubscribeUrl: input.unsubscribeUrl,
  });
}

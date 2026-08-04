import "server-only";

import { decompress, parseAggregateReport } from "./dmarc-report";
import { saveReport } from "./dmarc-store";

/**
 * Fetching a report out of Resend, which takes three hops.
 *
 * Measured against the live API on 4 Aug 2026 rather than assumed, because the
 * obvious shape is wrong: the webhook body carries no content, the message
 * object carries attachment *metadata* only, and the bytes live behind a signed
 * CDN URL that has to be asked for separately and expires in an hour.
 *
 *   GET /emails/receiving/{id}                      → attachments[] with ids
 *   GET /emails/receiving/{id}/attachments/{aid}    → { download_url }
 *   GET {download_url}                              → the .gz or .zip
 *
 * Everything here is capped and every failure is swallowed into a count, since
 * the caller answers 200 regardless — a non-200 makes Resend redeliver a report
 * that will fail in exactly the same way seven more times.
 */

const RECEIVING = "https://api.resend.com/emails/receiving";

/** Receivers batch at most a handful of reports per message; this is generous. */
const MAX_ATTACHMENTS = 10;
const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;

interface AttachmentMeta {
  id?: unknown;
  filename?: unknown;
  size?: unknown;
}

export interface IngestOutcome {
  stored: number;
  duplicate: number;
  rejected: string[];
}

async function json(url: string): Promise<unknown | null> {
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${process.env.RESEND_API_KEY ?? ""}` },
  });
  return response.ok ? await response.json() : null;
}

export async function ingestReports(emailId: string, token: string): Promise<IngestOutcome> {
  const outcome: IngestOutcome = { stored: 0, duplicate: 0, rejected: [] };

  const message = (await json(`${RECEIVING}/${emailId}`)) as { attachments?: unknown } | null;
  if (!message) {
    outcome.rejected.push("could not read the message");
    return outcome;
  }

  const attachments = Array.isArray(message.attachments)
    ? (message.attachments as AttachmentMeta[]).slice(0, MAX_ATTACHMENTS)
    : [];

  if (!attachments.length) {
    /* Receivers occasionally send a courtesy "no data" notice with no report
       attached. That is not a failure and must not be logged as one. */
    outcome.rejected.push("no attachment");
    return outcome;
  }

  for (const attachment of attachments) {
    const id = typeof attachment.id === "string" ? attachment.id : null;
    const name = typeof attachment.filename === "string" ? attachment.filename : "unnamed";
    if (!id) continue;

    if (typeof attachment.size === "number" && attachment.size > MAX_ATTACHMENT_BYTES) {
      outcome.rejected.push(`${name}: larger than a report can legitimately be`);
      continue;
    }

    try {
      const meta = (await json(`${RECEIVING}/${emailId}/attachments/${id}`)) as {
        download_url?: unknown;
      } | null;
      const url = typeof meta?.download_url === "string" ? meta.download_url : null;
      if (!url) {
        outcome.rejected.push(`${name}: no download url`);
        continue;
      }

      const response = await fetch(url);
      if (!response.ok) {
        outcome.rejected.push(`${name}: download returned ${response.status}`);
        continue;
      }

      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.byteLength > MAX_ATTACHMENT_BYTES) {
        outcome.rejected.push(`${name}: oversized`);
        continue;
      }

      const report = parseAggregateReport(decompress(bytes));
      const isNew = await saveReport(token, report);
      if (isNew) outcome.stored += 1;
      else outcome.duplicate += 1;
    } catch (error) {
      /* The message is a stranger's XML. A parse refusal is a normal outcome,
         recorded against the filename and never allowed to abort the others. */
      outcome.rejected.push(`${name}: ${error instanceof Error ? error.message : "unreadable"}`);
    }
  }

  return outcome;
}

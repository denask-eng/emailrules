import {
  checkIdFromAddress,
  claimCheckSession,
  composeMessage,
  markSessionStatus,
  runMessageCheck,
  saveMessageCheck,
} from "@/lib/message-check";
import { ingestReports } from "@/lib/dmarc-ingest";
import { tokenFromAddress } from "@/lib/dmarc-store";
import { verifyWebhookSignature } from "./signature";

/**
 * Inbound mail, treated as what it is: untrusted input from anyone on the
 * internet who can guess or is handed an address.
 *
 * The standard advice for an inbound handler is a sender allowlist, and it
 * does not apply here — the entire point of the feature is that a stranger can
 * send us their campaign. So the safety comes from what this route refuses to
 * do rather than from who it refuses to hear:
 *
 *  - The signature is verified against the raw bytes before anything is
 *    parsed. With no secret configured the route processes nothing at all.
 *  - Nothing from the message is executed, rendered as HTML, or fetched. The
 *    HTML body is read for facts by a text extractor and thrown away.
 *  - Nothing from the message is persisted. Findings and four derived facts go
 *    into the table; body, subject, recipient and raw headers do not.
 *  - Every value is capped before it is looked at, and every failure after the
 *    signature check returns 200, because a non-200 makes Resend redeliver a
 *    message that will fail in exactly the same way seven more times.
 */

/** The webhook carries metadata only; a megabyte of it is already absurd. */
const MAX_WEBHOOK_BYTES = 1024 * 1024;

/** A campaign the parser cares about fits well inside this. */
const MAX_PART_CHARS = 512 * 1024;

const RECEIVING_ENDPOINT = "https://api.resend.com/emails/receiving";

interface ReceivedEvent {
  type?: unknown;
  data?: { email_id?: unknown; to?: unknown };
}

function acknowledge(note: string): Response {
  /* Resend only needs to know the delivery landed. Anything more specific is
     a description of our internals handed to whoever sent the mail. */
  console.info(`[inbound] ${note}`);
  return new Response("OK", { status: 200 });
}

function cap(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  return value.length > MAX_PART_CHARS ? value.slice(0, MAX_PART_CHARS) : value;
}

function recipients(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string").slice(0, 20);
}

export async function POST(request: Request) {
  const payload = await request.text();
  if (payload.length > MAX_WEBHOOK_BYTES) {
    return new Response("Payload too large", { status: 413 });
  }

  const failure = verifyWebhookSignature({
    payload,
    id: request.headers.get("svix-id"),
    timestamp: request.headers.get("svix-timestamp"),
    signature: request.headers.get("svix-signature"),
    secret: process.env.RESEND_WEBHOOK_SECRET,
  });

  if (failure === "no-secret") {
    console.error("[inbound] RESEND_WEBHOOK_SECRET is not set; refusing to process inbound mail");
    return new Response("Not configured", { status: 503 });
  }
  if (failure) {
    console.warn(`[inbound] rejected an unverified delivery: ${failure}`);
    return new Response("Invalid signature", { status: 400 });
  }

  let event: ReceivedEvent;
  try {
    event = JSON.parse(payload) as ReceivedEvent;
  } catch {
    return acknowledge("payload was not JSON");
  }

  if (event.type !== "email.received") return acknowledge(`ignored event ${String(event.type)}`);

  const to = recipients(event.data?.to);

  const emailId = event.data?.email_id;
  if (typeof emailId !== "string" || !/^[a-z0-9-]{10,80}$/i.test(emailId)) {
    return acknowledge("event carried no usable email id");
  }

  /* Two kinds of mail arrive on one receiving domain, told apart by the local
     part alone: dmarc-<token>@ is a receiver's daily aggregate report, and a
     bare hex id is somebody's campaign. The DMARC branch is tried first because
     its local part is the more specific pattern. */
  const reportToken = to
    .map((address) => tokenFromAddress(address))
    .find((candidate): candidate is string => Boolean(candidate));

  if (reportToken) {
    try {
      const outcome = await ingestReports(emailId, reportToken);
      return acknowledge(
        `dmarc ${reportToken.slice(0, 8)}…: ${outcome.stored} stored, ${outcome.duplicate} already had, ` +
          `${outcome.rejected.length} rejected${outcome.rejected.length ? ` (${outcome.rejected.join("; ")})` : ""}`,
      );
    } catch (error) {
      console.error("[inbound] failed while ingesting a DMARC report:", error);
      return acknowledge("dmarc ingest failed");
    }
  }

  const id = to
    .map((address) => checkIdFromAddress(address))
    .find((candidate): candidate is string => Boolean(candidate));
  if (!id) return acknowledge("no recipient matched a one-time check or reporting address");

  /* A syntactically valid local part is not authority to process a message.
     The session must exist, still be inside its 30-minute receive window and
     still be waiting. The atomic claim also enforces first-message-wins. */
  const session = await claimCheckSession(id);
  if (!session) return acknowledge("check address was unknown, expired, or already used");

  try {
    /* The webhook is metadata only. Content comes from the API, over a
       connection we authenticate, rather than from the request body. */
    const response = await fetch(`${RECEIVING_ENDPOINT}/${emailId}`, {
      headers: { authorization: `Bearer ${process.env.RESEND_API_KEY ?? ""}` },
    });
    if (!response.ok) {
      await markSessionStatus(id, "failed", "message_fetch_failed");
      return acknowledge(`could not read message ${emailId}: ${response.status}`);
    }

    const message = (await response.json()) as {
      headers?: unknown;
      text?: unknown;
      html?: unknown;
    };
    const raw = composeMessage({
      headers: message.headers,
      text: cap(message.text),
      html: cap(message.html),
    });

    await markSessionStatus(id, "processing");
    const result = await runMessageCheck(raw, session.context);
    if (!result.ok) {
      await markSessionStatus(id, "failed", "message_parse_failed");
      return acknowledge(`message ${emailId} produced no findings: ${result.error}`);
    }

    const stored = await saveMessageCheck(id, result);
    return acknowledge(stored ? `check ${id} stored` : `check ${id} already had a result`);
  } catch (error) {
    await markSessionStatus(id, "failed", "processing_failed");
    console.error("[inbound] failed while checking a received message:", error);
    return acknowledge("check failed");
  }
}

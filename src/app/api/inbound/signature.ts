import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Svix signature verification, which is what Resend's webhooks use.
 *
 * Written out rather than pulled in, for the same reason `lib/mail.ts` posts
 * to the REST API instead of importing an SDK: this is one HMAC and a
 * constant-time compare, and the alternative is a dependency in the one code
 * path where being able to read every line matters most.
 *
 * The signed payload is `id.timestamp.body` and the body must be the exact
 * bytes that arrived. A route that parses JSON first and re-serialises it will
 * fail verification for reasons that look like a key problem and are not.
 */

/** Replay window. Svix's own default, and there is no reason to be looser. */
const TOLERANCE_SECONDS = 5 * 60;

export type SignatureFailure =
  | "no-secret"
  | "missing-headers"
  | "stale-timestamp"
  | "bad-signature";

export interface SignatureInput {
  payload: string;
  id: string | null;
  timestamp: string | null;
  signature: string | null;
  secret: string | undefined;
  now?: number;
}

export function verifyWebhookSignature(input: SignatureInput): SignatureFailure | null {
  const secret = input.secret?.trim();
  if (!secret) return "no-secret";
  if (!input.id || !input.timestamp || !input.signature) return "missing-headers";

  const sent = Number(input.timestamp);
  if (!Number.isFinite(sent)) return "missing-headers";
  const now = Math.floor((input.now ?? Date.now()) / 1000);
  if (Math.abs(now - sent) > TOLERANCE_SECONDS) return "stale-timestamp";

  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key)
    .update(`${input.id}.${input.timestamp}.${input.payload}`)
    .digest();

  /* The header carries a space-separated list so a secret can be rotated
     without dropping a delivery. Any one of them matching is a pass. */
  for (const candidate of input.signature.split(" ")) {
    const [version, value] = candidate.split(",");
    if (version !== "v1" || !value) continue;
    const given = Buffer.from(value, "base64");
    if (given.length === expected.length && timingSafeEqual(given, expected)) return null;
  }

  return "bad-signature";
}

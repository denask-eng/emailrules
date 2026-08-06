import "server-only";

import { createHash } from "node:crypto";

function networkPart(address: string): string | null {
  const value = address.trim().replace(/^::ffff:/, "");
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(value)) {
    const parts = value.split(".");
    return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
  }
  if (/^[0-9a-f:]+$/i.test(value) && value.includes(":")) {
    return `${value.split(":").slice(0, 4).join(":")}::/64`;
  }
  return null;
}

export function requestNetworkHash(request: Request): string | null {
  const first = request.headers.get("x-forwarded-for")?.split(",")[0] ?? request.headers.get("x-real-ip") ?? "";
  const network = networkPart(first);
  const secret = process.env.CHECK_RATE_LIMIT_SECRET ?? process.env.RESEND_WEBHOOK_SECRET;
  if (!network || !secret) return null;
  return createHash("sha256").update(`${secret}:${network}`).digest("hex");
}

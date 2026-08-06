import {
  createCheckSession,
  inboxAddress,
  inboundDomain,
  parseCampaignContext,
} from "@/lib/message-check";
import { hasDatabase } from "@/lib/db";
import { requestNetworkHash } from "@/lib/request-network";

export async function POST(request: Request) {
  if (!hasDatabase() || !inboundDomain()) {
    return Response.json({ error: "Campaign receiving is not available." }, { status: 503 });
  }
  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > 16_384) return Response.json({ error: "Request too large." }, { status: 413 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const context = parseCampaignContext(body);
  if (!context) {
    return Response.json({ error: "Choose an ESP, at least one geography, and Gmail volume." }, { status: 400 });
  }
  const outcome = await createCheckSession(context, requestNetworkHash(request));
  if (outcome.rateLimited) {
    return Response.json({ error: "Too many new checks. Try again later." }, { status: 429 });
  }
  if (!outcome.session) return Response.json({ error: "Could not create a check." }, { status: 503 });
  return Response.json(
    {
      token: outcome.session.reportToken,
      address: inboxAddress(outcome.session.id),
      status: outcome.session.status,
      receiveExpiresAt: outcome.session.receiveExpiresAt,
    },
    { status: 201, headers: { "cache-control": "no-store" } },
  );
}

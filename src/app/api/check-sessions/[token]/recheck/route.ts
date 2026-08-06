import { createRecheckSession, inboxAddress } from "@/lib/message-check";
import { requestNetworkHash } from "@/lib/request-network";

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const outcome = await createRecheckSession(token, requestNetworkHash(request));
  if (outcome.rateLimited) return Response.json({ error: "Too many new checks. Try again later." }, { status: 429 });
  if (!outcome.session) return Response.json({ error: "Could not create a recheck." }, { status: 404 });
  return Response.json(
    {
      token: outcome.session.reportToken,
      address: inboxAddress(outcome.session.id),
      receiveExpiresAt: outcome.session.receiveExpiresAt,
    },
    { status: 201, headers: { "cache-control": "no-store" } },
  );
}

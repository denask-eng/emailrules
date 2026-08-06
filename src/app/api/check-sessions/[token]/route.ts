import { isCheckId, loadCheckSession, messageCheckExists } from "@/lib/message-check";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isCheckId(token)) return Response.json({ error: "Invalid check." }, { status: 400 });
  const session = await loadCheckSession(token);
  if (!session || session.reportToken !== token) return Response.json({ error: "Check not found." }, { status: 404 });
  const complete = session.status === "complete" || (await messageCheckExists(token));
  return Response.json(
    {
      status: complete ? "complete" : session.status,
      ready: complete,
      receiveExpiresAt: session.receiveExpiresAt,
      failureCode: session.failureCode,
    },
    { headers: { "cache-control": "no-store" } },
  );
}

import { revokeShareReport } from "@/lib/message-check";

export async function DELETE(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let reportToken = "";
  try {
    const body = (await request.json()) as { reportToken?: unknown };
    if (typeof body.reportToken === "string") reportToken = body.reportToken;
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const revoked = await revokeShareReport(token, reportToken);
  return revoked
    ? new Response(null, { status: 204 })
    : Response.json({ error: "Share report not found." }, { status: 404 });
}

import { createShareReport } from "@/lib/message-check";

export async function POST(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const shareToken = await createShareReport(token);
  if (!shareToken) return Response.json({ error: "Report not found." }, { status: 404 });
  return Response.json(
    { token: shareToken, path: `/check/message/share/${shareToken}` },
    { status: 201, headers: { "cache-control": "no-store" } },
  );
}

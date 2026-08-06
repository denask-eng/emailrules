import { loadMessageCheck, prioritizedFindings } from "@/lib/message-check";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const report = await loadMessageCheck(token);
  if (!report || report.reportToken !== token) return Response.json({ error: "Report not found." }, { status: 404 });
  return Response.json(
    {
      createdAt: report.createdAt,
      expiresAt: report.expiresAt,
      fromDomain: report.fromDomain,
      context: report.context,
      findings: prioritizedFindings(report.findings),
      evidence: report.findings,
    },
    { headers: { "cache-control": "private, no-store" } },
  );
}

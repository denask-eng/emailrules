import { isCheckId, loadCheckSession, messageCheckExists } from "@/lib/message-check";

/**
 * Has the message landed yet?
 *
 * One boolean, deliberately. The waiting page polls this and then reloads the
 * real page on the server, so nothing about the result has to travel through
 * an endpoint whose caching and headers are a second thing to get right.
 */
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isCheckId(id)) return Response.json({ ready: false }, { status: 400 });

  try {
    const session = await loadCheckSession(id);
    const ready = await messageCheckExists(id);
    return Response.json(
      { ready, status: ready ? "complete" : session?.status ?? "waiting" },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    /* A resolver or database wobble is not "your message never arrived". The
       page keeps waiting rather than telling someone the wrong thing. */
    return Response.json({ ready: false }, { headers: { "cache-control": "no-store" } });
  }
}

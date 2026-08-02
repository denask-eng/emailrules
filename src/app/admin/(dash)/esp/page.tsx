import { getEspCandidates, getEspWatchSources } from "@/lib/esp-watch";
import { dismissEspCandidate, restoreEspCandidate } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Platform watch" };
export const dynamic = "force-dynamic";

/**
 * The review queue.
 *
 * Everything here is a link and a date the watcher read off a page. There is
 * deliberately no "publish" button: publishing means writing an entry, and
 * writing one means reading the source yourself. The queue's whole job is to
 * make sure you know a page moved — not to draft the row for you.
 */
export default async function AdminEspWatch() {
  await requireAdmin();
  const [candidates, sources] = await Promise.all([getEspCandidates("new"), getEspWatchSources()]);

  const broken = sources.filter((s) => s.last_error);
  const stale = sources.filter((s) => !s.last_error && (s.item_count ?? 0) === 0);

  return (
    <div className="shell py-10">
      <h1 className="text-[clamp(1.5rem,3.5vw,2rem)]">Platform watch</h1>
      <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-muted-fg">
        Dated items on the changelog pages we watch that no published entry cites.{" "}
        {candidates.length === 0
          ? "Nothing queued. Check the sources below before reading that as a quiet week."
          : `${candidates.length} waiting. Open the source, read it, then write the entry in src/content/esp-changes.ts — the watcher never drafts prose.`}
      </p>

      {(broken.length > 0 || stale.length > 0) && (
        <div className="mt-6 rounded-lg border border-bad/30 bg-bad/5 p-4">
          <p className="label text-bad">Do not read an empty queue as quiet</p>
          <ul className="mt-2 list-none space-y-1.5 p-0 text-[13.5px] text-muted-fg">
            {broken.map((s) => (
              <li key={String(s.url)}>
                <span className="text-fg">{String(s.label)}</span> ({String(s.esp)}) last failed:{" "}
                <code className="text-[12.5px]">{String(s.last_error)}</code>
              </li>
            ))}
            {stale.map((s) => (
              <li key={String(s.url)}>
                <span className="text-fg">{String(s.label)}</span> ({String(s.esp)}) fetched fine but
                yielded no dated items — the page may have changed shape, or it may genuinely print
                no dates.
              </li>
            ))}
          </ul>
        </div>
      )}

      <ul className="mt-8 list-none space-y-0 p-0">
        {candidates.map((c) => (
          <li key={c.id} className="border-b py-4 first:border-t">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="num text-[12.5px] text-dim">{c.publishedOn ?? "no date printed"}</span>
              <span className="label">{c.esp}</span>
            </div>
            <p className="mt-1.5 text-[15px] font-medium">{c.title}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
              {c.itemUrl && (
                <a
                  href={c.itemUrl}
                  target="_blank"
                  rel="noopener"
                  className="text-accent underline-offset-3 hover:underline"
                >
                  Read the item →
                </a>
              )}
              <a
                href={c.sourceUrl}
                target="_blank"
                rel="noopener"
                className="text-muted-fg underline-offset-3 hover:text-fg hover:underline"
              >
                Source page
              </a>
              <form action={dismissEspCandidate.bind(null, c.id)}>
                <button type="submit" className="text-dim underline-offset-3 hover:text-fg hover:underline">
                  Not worth an entry
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>

      <h2 className="mt-12 text-[1.05rem]">What we watch</h2>
      <table className="mt-3 w-full text-[13.5px]">
        <thead>
          <tr className="border-b text-left">
            <th className="label pb-2 font-normal">Platform</th>
            <th className="label pb-2 font-normal">Page</th>
            <th className="label pb-2 font-normal">Dated items</th>
            <th className="label pb-2 font-normal">Last read</th>
          </tr>
        </thead>
        <tbody>
          {sources.map((s) => (
            <tr key={String(s.url)} className="border-b border-border-soft">
              <td className="py-2">{String(s.esp)}</td>
              <td className="py-2 text-muted-fg">{String(s.label)}</td>
              <td className="num py-2">{s.item_count ?? "—"}</td>
              <td className="num py-2 text-muted-fg">{String(s.last_ok_at ?? "never")}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {sources.length === 0 && (
        <p className="mt-3 text-[13.5px] text-muted-fg">
          The watcher has not run yet. It runs weekly, or on demand with{" "}
          <code className="text-[12.5px]">/api/cron/esp-watch</code>.
        </p>
      )}

      <RestoreDismissed />
    </div>
  );
}

/** Dismissals are reversible; a queue you cannot undo makes people hoard. */
async function RestoreDismissed() {
  const dismissed = await getEspCandidates("dismissed");
  if (dismissed.length === 0) return null;
  return (
    <details className="mt-10">
      <summary className="cursor-pointer text-[13.5px] text-muted-fg">
        {dismissed.length} dismissed
      </summary>
      <ul className="mt-3 list-none space-y-2 p-0 text-[13.5px]">
        {dismissed.map((c) => (
          <li key={c.id} className="flex flex-wrap items-baseline gap-3">
            <span className="num text-[12.5px] text-dim">{c.publishedOn ?? "—"}</span>
            <span className="text-muted-fg">{c.title}</span>
            <form action={restoreEspCandidate.bind(null, c.id)}>
              <button type="submit" className="text-dim underline-offset-3 hover:text-fg hover:underline">
                Restore
              </button>
            </form>
          </li>
        ))}
      </ul>
    </details>
  );
}

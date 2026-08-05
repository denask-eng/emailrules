import Link from "next/link";
import { sql, hasDatabase } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Signal } from "@/components/signal";

export const metadata = { title: "Corrections" };
export const dynamic = "force-dynamic";

/**
 * The inbox that replaced the mailbox.
 *
 * Corrections used to arrive — or rather, not arrive — at an address on a
 * domain with no MX. They land in a table now, and this is where they are
 * read. A correction queue nobody opens is the same dead end wearing different
 * clothes, so this page is deliberately the loudest thing in the admin: the
 * count is in the heading and the oldest unread is first.
 */

interface Row {
  id: string;
  slug: string | null;
  path: string | null;
  body: string;
  reply_to: string | null;
  status: string;
  resolution: string | null;
  created_at: string;
}

const STATE: Record<string, { label: string; signal: "fail" | "pend" | "pass" | "na" }> = {
  new: { label: "Unread", signal: "fail" },
  reading: { label: "Looking at it", signal: "pend" },
  published: { label: "Published", signal: "pass" },
  declined: { label: "Declined", signal: "na" },
};

export default async function AdminCorrections() {
  if (!hasDatabase()) {
    return (
      <div className="shell py-10">
        <h1 className="text-[1.6rem]">Corrections</h1>
        <p className="mt-3 text-[15px] text-muted-fg">No database configured.</p>
      </div>
    );
  }

  const rows = (await sql().query(
    `select id, slug, path, body, reply_to, status, resolution,
            created_at::text as created_at
     from corrections
     order by (status = 'new') desc, created_at asc
     limit 200`,
  )) as unknown as Row[];

  const unread = rows.filter((r) => r.status === "new").length;

  return (
    <div className="shell py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[clamp(1.5rem,3.5vw,2rem)]">
            {unread} unread correction{unread === 1 ? "" : "s"}
          </h1>
          <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-muted-fg">
            {rows.length} total. Oldest unread first, because the whole claim of this site is that
            it publishes its own errors — and a queue nobody opens is the same dead end the
            bouncing mailbox was.
          </p>
        </div>
        <Link href="/corrections" className="text-[14px] underline underline-offset-3">
          The public page →
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="mt-10 max-w-[62ch] text-[15px] leading-relaxed text-muted-fg">
          Nothing yet. That is either good news or a sign the form is not reachable — worth
          checking the footer link and one rule page before assuming the former.
        </p>
      ) : (
        <ul className="mt-8 list-none border-t p-0">
          {rows.map((r) => {
            const st = STATE[r.status] ?? STATE.new;
            return (
              <li key={r.id} className="border-b py-5">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 text-[12px] font-medium",
                      r.status === "new" ? "text-live" : "text-muted-fg",
                    )}
                  >
                    <Signal state={st.signal} size={8} label={false} />
                    {st.label}
                  </span>
                  <time className="num text-[12px] text-dim">
                    {fmtDate(r.created_at.slice(0, 10))}
                  </time>
                  {r.slug ? (
                    <Link
                      href={`/rules/${r.slug}`}
                      className="num text-[12px] text-accent hover:underline"
                    >
                      /rules/{r.slug}
                    </Link>
                  ) : r.path ? (
                    <span className="num text-[12px] text-dim">{r.path}</span>
                  ) : null}
                  {r.reply_to ? (
                    <a
                      href={`mailto:${r.reply_to}`}
                      className="num ml-auto text-[12px] text-muted-fg hover:text-fg"
                    >
                      {r.reply_to}
                    </a>
                  ) : (
                    <span className="num ml-auto text-[12px] text-dim">no reply address</span>
                  )}
                </div>
                <p className="mt-2.5 max-w-[76ch] text-[15px] leading-relaxed whitespace-pre-wrap">
                  {r.body}
                </p>
                {r.resolution ? (
                  <p className="mt-2 max-w-[76ch] border-l-2 border-ok/40 pl-3 text-[14px] leading-relaxed text-muted-fg">
                    {r.resolution}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

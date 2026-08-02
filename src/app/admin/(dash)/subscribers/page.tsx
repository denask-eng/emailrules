import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { sql, hasDatabase } from "@/lib/db";
import { fmtDate } from "@/lib/format";

export const metadata = { title: "Subscribers" };
export const dynamic = "force-dynamic";

interface Row {
  email: string;
  created_at: string;
  unsubscribed_at: string | null;
}

export default async function Subscribers() {
  await requireAdmin();

  let rows: Row[] = [];
  let failed = false;
  if (hasDatabase()) {
    try {
      rows = (await sql()`
        select email, created_at, unsubscribed_at
        from subscribers order by created_at desc limit 500
      `) as unknown as Row[];
    } catch {
      failed = true;
    }
  }

  const active = rows.filter((r) => !r.unsubscribed_at);

  return (
    <div className="shell shell-tight py-10">
      <Link href="/admin" className="text-[13px] text-muted-fg hover:text-fg">
        &larr; All rules
      </Link>

      <h1 className="mt-4 text-[clamp(1.4rem,3vw,1.9rem)]">
        {active.length} subscriber{active.length === 1 ? "" : "s"}
      </h1>
      <p className="mt-2 text-[15px] text-muted-fg">
        People who asked to be told when a rule moves. One email per change, and nothing else, ever.
      </p>

      {failed ? (
        <p className="mt-6 rounded-lg border border-live/35 bg-live-bg px-4 py-2.5 text-[14px] text-live">
          The subscribers table could not be read. Run <span className="num">npm run db:migrate</span>.
        </p>
      ) : null}

      {rows.length === 0 && !failed ? (
        <p className="mt-8 rounded-xl border bg-bg-2 px-5 py-8 text-center text-[15px] text-muted-fg">
          Nobody yet. The signup form is at the bottom of the homepage.
        </p>
      ) : (
        <div className="mt-8 overflow-hidden rounded-xl border">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b bg-bg-2">
                <th className="label px-4 py-2.5 font-medium">Email</th>
                <th className="label px-4 py-2.5 text-right font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.email} className="border-b last:border-b-0">
                  <td className="num px-4 py-2.5 text-[13.5px]">
                    {r.email}
                    {r.unsubscribed_at ? (
                      <span className="ml-2 text-[12px] text-dim">unsubscribed</span>
                    ) : null}
                  </td>
                  <td className="num px-4 py-2.5 text-right text-[12.5px] text-dim">
                    {fmtDate(String(r.created_at).slice(0, 10))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {active.length > 0 ? (
        <p className="mt-5 text-[13px] text-dim">
          Export with{" "}
          <span className="num">
            select email from subscribers where unsubscribed_at is null;
          </span>
        </p>
      ) : null}
    </div>
  );
}

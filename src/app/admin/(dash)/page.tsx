import Link from "next/link";
import { getAllRules, getStats, fmtDate, daysSince } from "@/lib/rules";
import { OWNERSHIP } from "@/lib/types";
import { StatusPill, OwnershipTag } from "@/components/bits";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export const metadata = { title: "Rules" };

/**
 * The operator's view: staleness first.
 *
 * The single most common job here is not writing a new rule, it is confirming
 * an old one is still true. So the list sorts by how long it has been since
 * anyone checked, and the re-verify button is the primary action.
 */
export default async function AdminHome() {
  const [rules, stats] = await Promise.all([getAllRules(), getStats()]);
  const byStaleness = [...rules].sort((a, b) => a.lastVerified.localeCompare(b.lastVerified));
  const stale = byStaleness.filter((r) => daysSince(r.lastVerified) > 90);

  return (
    <div className="shell py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[clamp(1.5rem,3.5vw,2rem)]">{stats.total} rules</h1>
          <p className="mt-2 text-[15px] text-muted-fg">
            {stats.yours} need a person, {stats.espHandled} the ESP covers, {stats.nothingToDo} need
            nothing.{" "}
            {stale.length > 0 ? (
              <span className="text-soon">
                {stale.length} not re-verified in over 90 days.
              </span>
            ) : (
              <span className="text-ok">Everything verified within 90 days.</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/subscribers"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-9 rounded-lg px-3.5")}
          >
            Subscribers
          </Link>
          <Link
            href="/admin/rules/new"
            className={cn(buttonVariants({ size: "sm" }), "h-9 rounded-lg px-3.5 font-semibold")}
          >
            New rule
          </Link>
        </div>
      </div>

      <div className="mt-8 overflow-hidden rounded-xl border">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b bg-bg-2">
              <th className="label px-4 py-2.5 font-medium">Rule</th>
              <th className="label px-4 py-2.5 font-medium">Status</th>
              <th className="label px-4 py-2.5 font-medium">Whose job</th>
              <th className="label px-4 py-2.5 text-right font-medium">Last verified</th>
            </tr>
          </thead>
          <tbody>
            {byStaleness.map((r) => {
              const age = daysSince(r.lastVerified);
              return (
                <tr key={r.slug} className="border-b last:border-b-0 hover:bg-muted/50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/rules/${r.slug}`}
                      className="text-[14.5px] font-medium decoration-1 underline-offset-4 hover:underline"
                    >
                      {r.title}
                    </Link>
                    <div className="num mt-1 text-[11px] text-dim">{r.slug}</div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={r.status} />
                  </td>
                  <td className="px-4 py-3">
                    <OwnershipTag ownership={r.ownership} />
                    <span className="sr-only">{OWNERSHIP[r.ownership].label}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={cn("num text-[12.5px]", age > 90 ? "text-soon" : "text-dim")}
                    >
                      {fmtDate(r.lastVerified)}
                    </span>
                    <div className="num text-[11px] text-dim">{age}d ago</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-6 text-[13.5px] text-dim">
        Editing writes to Postgres and republishes the live pages immediately. It never triggers a
        Vercel build.
      </p>
    </div>
  );
}

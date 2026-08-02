import Link from "next/link";
import { notFound } from "next/navigation";
import { getRule, fmtDate, daysSince } from "@/lib/rules";
import { TOPICS, OWNERSHIP, STATUS_LABEL } from "@/lib/types";
import type { Ownership, RuleStatus, Topic } from "@/lib/types";
import { saveRule, reVerify, notifySubscribers } from "@/app/admin/actions";
import { sql, hasDatabase } from "@/lib/db";
import type { ChangelogEntry } from "@/lib/types";
import { alertSubject } from "@/lib/mail";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

async function countActiveSubscribers(): Promise<number> {
  if (!hasDatabase()) return 0;
  try {
    const r = (await sql()`
      select count(*)::int as c from subscribers
      where unsubscribed_at is null and token is not null
    `) as unknown as { c: number }[];
    return r[0]?.c ?? 0;
  } catch {
    return 0;
  }
}

/** Has this exact changelog entry already gone out? */
async function wasAlerted(slug: string, entry?: ChangelogEntry): Promise<boolean> {
  if (!hasDatabase() || !entry) return false;
  try {
    const r = (await sql().query(
      `select 1 from rule_alerts where slug = $1 and change_date = $2 and note = $3`,
      [slug, entry.date, entry.note],
    )) as unknown[];
    return r.length > 0;
  } catch {
    return false;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: slug };
}

const field = "w-full rounded-lg border bg-card px-3 py-2 text-[14px] outline-none focus-visible:ring-3 focus-visible:ring-accent/25";

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[13px] font-semibold">{label}</span>
      {hint ? <span className="ml-2 text-[12px] text-dim">{hint}</span> : null}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

export default async function EditRule({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ saved?: string; alert?: string; n?: string; f?: string }>;
}) {
  const { slug } = await params;
  const { saved, alert, n, f } = await searchParams;
  const rule = await getRule(slug);
  if (!rule) notFound();

  const age = daysSince(rule.lastVerified);
  const save = saveRule.bind(null, slug);
  async function verify() {
    "use server";
    await reVerify(slug);
  }

  /* Announce the newest changelog entry, which is what a save just wrote. */
  const latest = rule.changelog[0];
  const notify = notifySubscribers.bind(null, slug, latest?.date ?? "", latest?.note ?? "");
  const [pending, alerted] = await Promise.all([countActiveSubscribers(), wasAlerted(slug, latest)]);

  return (
    <div className="shell shell-tight py-10">
      <Link href="/admin" className="text-[13px] text-muted-fg hover:text-fg">
        &larr; All rules
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="max-w-[24ch] text-[clamp(1.4rem,3vw,1.9rem)]">{rule.title}</h1>
          <p className="num mt-2 text-[12px] text-dim">
            {rule.slug} &middot; verified {fmtDate(rule.lastVerified)} ({age}d ago)
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            href={`/rules/${rule.slug}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-9 rounded-lg px-3.5")}
          >
            View live
          </Link>
          <form action={verify}>
            <button
              type="submit"
              className={cn(buttonVariants({ size: "sm" }), "h-9 rounded-lg px-3.5 font-semibold")}
            >
              Re-verified today
            </button>
          </form>
        </div>
      </div>

      {saved ? (
        <p role="status" className="mt-5 rounded-lg border border-ok/35 bg-ok-bg px-4 py-2.5 text-[14px] text-ok">
          Saved and published. The live page is already updated.
        </p>
      ) : null}
      {age > 90 ? (
        <p className="mt-5 rounded-lg border border-soon/40 bg-soon-bg px-4 py-2.5 text-[14px] text-soon">
          Not re-verified in {age} days, so the public page is showing a staleness warning.
        </p>
      ) : null}

      {alert === "sent" ? (
        <p role="status" className="mt-5 rounded-lg border border-ok/35 bg-ok-bg px-4 py-2.5 text-[14px] text-ok">
          Alert sent to {n} subscriber{n === "1" ? "" : "s"}
          {f ? `, ${f} failed (see the server log)` : ""}.
        </p>
      ) : null}
      {alert === "already" ? (
        <p className="mt-5 rounded-lg border bg-bg-2 px-4 py-2.5 text-[14px] text-muted-fg">
          This change was already announced. Nothing was sent again.
        </p>
      ) : null}
      {alert === "nobody" ? (
        <p className="mt-5 rounded-lg border bg-bg-2 px-4 py-2.5 text-[14px] text-muted-fg">
          Nobody is subscribed yet, so there was nobody to tell.
        </p>
      ) : null}

      {/* Announcing is a separate press from saving, so a typo fix never
          blasts the list. This shows exactly what goes out and to how many. */}
      {latest ? (
        <section className="mt-8 rounded-xl border bg-card p-5" style={{ boxShadow: "var(--lift)" }}>
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-[15px] font-semibold">Tell subscribers</h2>
            <span className="text-[13px] text-dim">
              {pending} on the list
            </span>
          </div>
          <p className="mt-3 text-[14px] leading-relaxed text-muted-fg">
            Subject: <span className="text-fg">{alertSubject(rule, latest.date)}</span>
          </p>
          <p className="mt-1.5 text-[14px] leading-relaxed text-muted-fg">
            Opens with: <span className="text-fg">{latest.note}</span>
          </p>
          {alerted ? (
            <p className="mt-4 text-[13.5px] text-dim">
              Already announced. Pressing again does nothing.
            </p>
          ) : (
            <form action={notify} className="mt-4">
              <button
                type="submit"
                disabled={pending === 0}
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "h-9 rounded-lg px-3.5 font-semibold disabled:opacity-50",
                )}
              >
                Send this alert
              </button>
            </form>
          )}
        </section>
      ) : null}

      <form action={save} className="mt-8 space-y-6">
        <Row label="Title" hint="the page H1, declarative not a headline">
          <input name="title" defaultValue={rule.title} className={field} />
        </Row>

        <Row label="Question" hint="the exact thing someone types into a search box">
          <input name="question" defaultValue={rule.question} className={field} />
        </Row>

        <div className="grid gap-6 sm:grid-cols-2">
          <Row label="Status">
            <select name="status" defaultValue={rule.status} className={field}>
              {(Object.keys(STATUS_LABEL) as RuleStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </Row>
          <Row label="Effective date" hint="ISO">
            <input name="effectiveDate" defaultValue={rule.effectiveDate} className={cn(field, "num")} />
          </Row>
          <Row label="Topic">
            <select name="topic" defaultValue={rule.topic} className={field}>
              {(Object.keys(TOPICS) as Topic[]).map((t) => (
                <option key={t} value={t}>
                  {TOPICS[t].label}
                </option>
              ))}
            </select>
          </Row>
          <Row label="Provider" hint="optional, e.g. Klaviyo">
            <input name="provider" defaultValue={rule.provider ?? ""} className={field} />
          </Row>
        </div>

        <Row label="Jurisdictions" hint="one per line">
          <textarea
            name="jurisdictions"
            rows={3}
            defaultValue={rule.jurisdictions.join("\n")}
            className={cn(field, "num")}
          />
        </Row>

        <Row label="Whose job is it?">
          <select name="ownership" defaultValue={rule.ownership} className={field}>
            {(Object.keys(OWNERSHIP) as Ownership[]).map((o) => (
              <option key={o} value={o}>
                {OWNERSHIP[o].label}
              </option>
            ))}
          </select>
        </Row>

        <Row label="What the platform already does" hint="name the ESPs">
          <textarea name="handledAlready" rows={3} defaultValue={rule.handled.already} className={field} />
        </Row>
        <Row label="What is still on their desk" hint="blank if genuinely nothing">
          <textarea
            name="handledStillYours"
            rows={3}
            defaultValue={rule.handled.stillYours ?? ""}
            className={field}
          />
        </Row>

        <Row label="Plain version" hint="the lead paragraph, said like a colleague">
          <textarea name="plain" rows={4} defaultValue={rule.plain} className={field} />
        </Row>
        <Row label="Exact position" hint="the cited wording, what the FAQ schema quotes">
          <textarea name="answer" rows={5} defaultValue={rule.answer} className={field} />
        </Row>

        <Row label="Do this first" hint="name the real screen">
          <textarea name="mondayMorning" rows={3} defaultValue={rule.mondayMorning} className={field} />
        </Row>
        <Row label="Skip all of this if" hint="optional">
          <input name="ignoreIf" defaultValue={rule.ignoreIf ?? ""} className={field} />
        </Row>

        <Row label="Who this applies to">
          <textarea name="appliesTo" rows={3} defaultValue={rule.appliesTo} className={field} />
        </Row>
        <Row label="What to do" hint="one bullet per line">
          <textarea name="whatToDo" rows={5} defaultValue={rule.whatToDo.join("\n")} className={field} />
        </Row>
        <Row label="What is exempt" hint="optional">
          <textarea name="exempt" rows={3} defaultValue={rule.exempt ?? ""} className={field} />
        </Row>
        <Row label="What happens if you do not" hint="say so plainly when nobody has been fined">
          <textarea name="enforcement" rows={4} defaultValue={rule.enforcement} className={field} />
        </Row>

        <Row label="Sources" hint="JSON array. A bad parse keeps the old value rather than wiping it">
          <textarea
            name="sources"
            rows={10}
            defaultValue={JSON.stringify(rule.sources, null, 2)}
            className={cn(field, "num text-[12.5px]")}
          />
        </Row>
        <Row label="Related" hint="one slug per line">
          <textarea
            name="related"
            rows={3}
            defaultValue={(rule.related ?? []).join("\n")}
            className={cn(field, "num")}
          />
        </Row>

        <label className="flex items-center gap-2.5">
          <input type="checkbox" name="featured" defaultChecked={rule.featured} className="size-4" />
          <span className="text-[13px] font-semibold">Featured on the homepage ledger</span>
        </label>

        <div className="border-t pt-6">
          <Row label="What changed?" hint="published in the page history with today's date">
            <input
              name="changeNote"
              placeholder="e.g. CNIL updated the guidance, corrected the effective date"
              className={field}
            />
          </Row>
          <button
            type="submit"
            className={cn(buttonVariants({ size: "lg" }), "mt-5 h-11 rounded-[10px] px-6 font-semibold")}
          >
            Save and publish
          </button>
          <p className="mt-3 text-[13px] text-dim">
            Publishing updates the live pages immediately. It does not trigger a Vercel build.
          </p>
        </div>
      </form>
    </div>
  );
}

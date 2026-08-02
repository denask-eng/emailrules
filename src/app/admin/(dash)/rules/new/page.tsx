import Link from "next/link";
import { createRule } from "@/app/admin/actions";
import { TOPICS, OWNERSHIP } from "@/lib/types";
import type { Ownership, Topic } from "@/lib/types";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export const metadata = { title: "New rule" };

const field =
  "w-full rounded-lg border bg-card px-3 py-2 text-[14px] outline-none focus-visible:ring-3 focus-visible:ring-accent/25";

export default async function NewRule({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; slug?: string }>;
}) {
  const { e, slug } = await searchParams;

  return (
    <div className="shell shell-tight py-10">
      <Link href="/admin" className="text-[13px] text-muted-fg hover:text-fg">
        &larr; All rules
      </Link>

      <h1 className="mt-4 text-[clamp(1.4rem,3vw,1.9rem)]">New rule</h1>
      <p className="mt-3 max-w-[56ch] text-[15px] leading-relaxed text-muted-fg">
        This creates a draft with status <b className="text-fg">Proposed</b> and empty prose. It
        will not read as verified fact on the public site until you fill it in and change the
        status yourself.
      </p>

      {e === "missing" ? (
        <p role="alert" className="mt-5 rounded-lg border border-live/35 bg-live-bg px-4 py-2.5 text-[14px] text-live">
          A title and a question are both required.
        </p>
      ) : null}
      {e === "exists" ? (
        <p role="alert" className="mt-5 rounded-lg border border-live/35 bg-live-bg px-4 py-2.5 text-[14px] text-live">
          A rule already lives at <span className="num">{slug}</span>.{" "}
          <Link href={`/admin/rules/${slug}`} className="underline underline-offset-2">
            Edit that one instead
          </Link>
          .
        </p>
      ) : null}

      <form action={createRule} className="mt-8 space-y-6">
        <label className="block">
          <span className="text-[13px] font-semibold">Title</span>
          <span className="ml-2 text-[12px] text-dim">the page H1, declarative not a headline</span>
          <input name="title" required className={cn(field, "mt-1.5")} />
        </label>

        <label className="block">
          <span className="text-[13px] font-semibold">Question</span>
          <span className="ml-2 text-[12px] text-dim">the exact thing someone types into a search box</span>
          <input name="question" required className={cn(field, "mt-1.5")} />
        </label>

        <label className="block">
          <span className="text-[13px] font-semibold">Slug</span>
          <span className="ml-2 text-[12px] text-dim">
            optional. Derived from the title if blank, and permanent once set
          </span>
          <input name="slug" placeholder="auto" className={cn(field, "num mt-1.5")} />
        </label>

        <div className="grid gap-6 sm:grid-cols-2">
          <label className="block">
            <span className="text-[13px] font-semibold">Topic</span>
            <select name="topic" className={cn(field, "mt-1.5")} defaultValue="provider-rules">
              {(Object.keys(TOPICS) as Topic[]).map((t) => (
                <option key={t} value={t}>
                  {TOPICS[t].label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[13px] font-semibold">Whose job is it?</span>
            <select name="ownership" className={cn(field, "mt-1.5")} defaultValue="yours">
              {(Object.keys(OWNERSHIP) as Ownership[]).map((o) => (
                <option key={o} value={o}>
                  {OWNERSHIP[o].label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button
          type="submit"
          className={cn(buttonVariants({ size: "lg" }), "h-11 rounded-[10px] px-6 font-semibold")}
        >
          Create draft
        </button>
      </form>
    </div>
  );
}

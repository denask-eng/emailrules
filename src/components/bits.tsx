import Link from "next/link";
import type { Rule, RuleStatus } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/types";
import { fmtDate } from "@/lib/rules";
import { cn } from "@/lib/utils";

export const SHELL = "shell";

const TONE: Record<RuleStatus, { dot: string; text: string; bg: string }> = {
  in_force: { dot: "bg-live", text: "text-live", bg: "bg-live-bg" },
  upcoming: { dot: "bg-soon", text: "text-soon", bg: "bg-soon-bg" },
  proposed: { dot: "bg-dim", text: "text-muted-fg", bg: "bg-muted" },
  superseded: { dot: "bg-dim", text: "text-dim", bg: "bg-muted" },
};

/** A live obligation gets a ring. Everything else is a quiet dot. */
export function StatusDot({ status, className }: { status: RuleStatus; className?: string }) {
  const t = TONE[status];
  return (
    <span className={cn("relative inline-flex h-1.5 w-1.5 shrink-0", className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", t.dot, status === "in_force" && "pulse")} />
    </span>
  );
}

export function StatusPill({ status, className }: { status: RuleStatus; className?: string }) {
  const t = TONE[status];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium",
        t.bg,
        t.text,
        className,
      )}
    >
      <span className={cn("h-1 w-1 rounded-full", t.dot)} />
      {STATUS_LABEL[status]}
    </span>
  );
}

/**
 * The ledger row. Dense and left-aligned on purpose: after an airy centred
 * hero, a wall of dated fact is the point being made.
 */
export function ChangeRow({ rule, date, note }: { rule: Rule; date: string; note: string }) {
  return (
    <Link
      href={`/rules/${rule.slug}`}
      className="group grid grid-cols-[auto_1fr] gap-x-3.5 gap-y-1 border-b border-border-soft px-4 py-3.5 transition-colors last:border-b-0 hover:bg-muted/70 sm:grid-cols-[86px_auto_1fr_auto] sm:items-baseline sm:px-5"
    >
      <time dateTime={date} className="num text-[12px] whitespace-nowrap text-dim sm:order-1">
        {fmtDate(date)}
      </time>
      <span className="sm:order-2 sm:translate-y-[-1px]">
        <StatusDot status={rule.status} />
      </span>
      <span className="col-span-2 text-[14.5px] leading-relaxed sm:order-3 sm:col-span-1">
        <span className="font-medium decoration-1 underline-offset-4 group-hover:underline">
          {rule.title}.
        </span>{" "}
        <span className="text-muted-fg">{note}</span>
      </span>
      <span className="label hidden text-[10px] sm:order-4 sm:block sm:text-right">
        {rule.jurisdictions[0]}
      </span>
    </Link>
  );
}

export function RuleRow({ rule }: { rule: Rule }) {
  return (
    <Link
      href={`/rules/${rule.slug}`}
      className="group block border-b border-border-soft px-4 py-4 transition-colors last:border-b-0 hover:bg-muted/70 sm:px-5"
    >
      <div className="flex flex-wrap items-center gap-2.5">
        <StatusPill status={rule.status} />
        <span className="num text-[11px] text-dim">
          {rule.jurisdictions.join(" · ")}
          {rule.provider ? ` · ${rule.provider}` : ""}
        </span>
      </div>
      <div className="mt-2 text-[15.5px] leading-snug font-medium decoration-1 underline-offset-4 group-hover:underline">
        {rule.title}
      </div>
      <div className="mt-1 max-w-[68ch] text-[13.5px] leading-relaxed text-muted-fg">
        {rule.question}
      </div>
    </Link>
  );
}

export function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn("overflow-hidden rounded-xl border bg-card", className)}
      style={{ boxShadow: "var(--lift)" }}
    >
      {children}
    </div>
  );
}

/** Centred section header. Used above the fold and for marketing bands only. */
export function SectionHead({
  label,
  title,
  lede,
  center = false,
}: {
  label: string;
  title: string;
  lede?: string;
  center?: boolean;
}) {
  return (
    <div className={cn("mb-7", center && "mx-auto max-w-2xl text-center")}>
      <p className="label">{label}</p>
      <h2 className="mt-3 text-[clamp(24px,3.4vw,34px)]">{title}</h2>
      {lede ? (
        <p
          className={cn(
            "mt-3 text-[16px] leading-relaxed text-muted-fg",
            center ? "mx-auto max-w-[54ch]" : "max-w-[62ch]",
          )}
        >
          {lede}
        </p>
      ) : null}
    </div>
  );
}

export function Figures({ items }: { items: { v: string; k: string }[] }) {
  return (
    <dl className="flex flex-wrap items-baseline justify-center gap-x-7 gap-y-3 sm:gap-x-10">
      {items.map((s, i) => (
        <div key={s.k} className="flex items-baseline gap-2.5">
          {i > 0 ? <span className="hidden text-border sm:inline">·</span> : null}
          <dd className="num text-[15px] font-semibold">{s.v}</dd>
          <dt className="text-[13px] text-muted-fg">{s.k}</dt>
        </div>
      ))}
    </dl>
  );
}

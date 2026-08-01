import Link from "next/link";
import type { Rule, RuleStatus } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/types";
import { fmtDate } from "@/lib/rules";

export function StatusBadge({ status }: { status: RuleStatus }) {
  const cls =
    status === "in_force"
      ? "badge badge-live"
      : status === "upcoming"
        ? "badge badge-soon"
        : status === "superseded"
          ? "badge badge-out"
          : "badge badge-out";
  return <span className={cls}>{STATUS_LABEL[status]}</span>;
}

export function Jurisdictions({ list }: { list: readonly string[] }) {
  return (
    <span className="tabular text-[11.5px]" style={{ color: "var(--muted-fg)" }}>
      {list.join(" · ")}
    </span>
  );
}

/** One row in the changelog ledger. Date first: the date is the product. */
export function ChangeRow({
  rule,
  date,
  note,
}: {
  rule: Rule;
  date: string;
  note: string;
}) {
  return (
    <Link
      href={`/rules/${rule.slug}`}
      className="grid gap-3 px-5 py-4 transition-colors hover:bg-[var(--muted)] md:grid-cols-[110px_1fr_auto] md:items-baseline md:gap-5"
      style={{ borderTop: "1px solid var(--border)" }}
    >
      <time
        dateTime={date}
        className="tabular text-[12.5px] whitespace-nowrap"
        style={{ color: "var(--muted-fg)" }}
      >
        {fmtDate(date)}
      </time>
      <span className="text-[14.5px] leading-relaxed">
        <span className="font-medium">{rule.title}.</span>{" "}
        <span style={{ color: "var(--muted-fg)" }}>{note}</span>
      </span>
      <span className="md:text-right">
        <StatusBadge status={rule.status} />
      </span>
    </Link>
  );
}

/** Compact rule listing used on /rules and topic pages. */
export function RuleRow({ rule }: { rule: Rule }) {
  return (
    <Link
      href={`/rules/${rule.slug}`}
      className="block px-5 py-4 transition-colors hover:bg-[var(--muted)]"
      style={{ borderTop: "1px solid var(--border)" }}
    >
      <div className="flex flex-wrap items-center gap-2.5">
        <StatusBadge status={rule.status} />
        <Jurisdictions list={rule.jurisdictions} />
        {rule.provider ? (
          <span className="tabular text-[11.5px]" style={{ color: "var(--muted-fg)" }}>
            · {rule.provider}
          </span>
        ) : null}
      </div>
      <div className="mt-1.5 text-[15.5px] font-medium leading-snug">{rule.title}</div>
      <div className="mt-1 text-[13.5px] leading-relaxed" style={{ color: "var(--muted-fg)" }}>
        {rule.question}
      </div>
    </Link>
  );
}

export function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`card overflow-hidden ${className}`}>{children}</div>;
}

export function SectionHead({
  eyebrow,
  title,
  lede,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
}) {
  return (
    <div className="mb-6">
      <p className="eyebrow mb-3">{eyebrow}</p>
      <h2 className="text-[clamp(24px,3.2vw,34px)] font-semibold leading-tight">{title}</h2>
      {lede ? (
        <p className="mt-3 text-[16.5px] leading-relaxed" style={{ color: "var(--muted-fg)", maxWidth: "62ch" }}>
          {lede}
        </p>
      ) : null}
    </div>
  );
}

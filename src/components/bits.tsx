import Link from "next/link";
import type { Rule, RuleStatus } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/types";
import { fmtDate } from "@/lib/rules";
import { cn } from "@/lib/utils";

/** The page gutter. One value, used everywhere. */
export const SECTION = "mx-auto max-w-6xl px-5";

/** 4px square tag, mono, uppercase. Never a pill. */
const TAG =
  "inline-flex h-auto shrink-0 items-center rounded px-1.5 py-0.5 font-mono text-[0.6rem] font-semibold tracking-[0.08em] uppercase";

const TONE: Record<RuleStatus, string> = {
  in_force: "bg-alarm text-white",
  upcoming: "bg-warn-bg text-warn",
  proposed: "border border-rule bg-transparent text-mute",
  superseded: "bg-paper-3 text-ink-soft",
};

export function StatusTag({ status, className }: { status: RuleStatus; className?: string }) {
  return <span className={cn(TAG, TONE[status], className)}>{STATUS_LABEL[status]}</span>;
}

/**
 * The house data row. Baseline-aligned, hairline-divided, label in sans and
 * every measured value in mono pushed right by ml-auto.
 */
export function ChangeRow({ rule, date, note }: { rule: Rule; date: string; note: string }) {
  return (
    <li className="border-b border-rule-soft last:border-b-0">
      <Link
        href={`/rules/${rule.slug}`}
        className="group flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2.5 no-underline"
      >
        <time dateTime={date} className="m w-[5.6rem] shrink-0 text-[0.74rem] text-mute">
          {fmtDate(date)}
        </time>
        <span className="min-w-[16rem] flex-1 text-[0.94rem] leading-snug">
          <span className="font-semibold group-hover:underline group-hover:underline-offset-2">
            {rule.title}.
          </span>{" "}
          <span className="text-ink-soft">{note}</span>
        </span>
        <StatusTag status={rule.status} className="ml-auto" />
      </Link>
    </li>
  );
}

export function RuleRow({ rule }: { rule: Rule }) {
  return (
    <li className="border-b border-rule-soft last:border-b-0">
      <Link href={`/rules/${rule.slug}`} className="group block py-3 no-underline">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-[0.98rem] font-semibold group-hover:underline group-hover:underline-offset-2">
            {rule.title}
          </span>
          <StatusTag status={rule.status} />
          <span className="m ml-auto text-[0.72rem] text-mute">
            {rule.jurisdictions.join(" · ")}
            {rule.provider ? ` · ${rule.provider}` : ""}
          </span>
        </div>
        <p className="mt-1 max-w-[70ch] text-[0.86rem] leading-relaxed text-ink-soft">
          {rule.question}
        </p>
      </Link>
    </li>
  );
}

export function RuleList({ children }: { children: React.ReactNode }) {
  return <ul className="list-none border-t border-ink p-0">{children}</ul>;
}

/**
 * Heavy black rule opening the block, hairlines closing each figure. Same
 * grammar as a table header — and the honest substitute for a row of avatars.
 */
export function StatStrip({
  items,
}: {
  items: { value: string; label: string; of?: string }[];
}) {
  return (
    <dl
      className={cn(
        "grid grid-cols-2 gap-x-8 border-t border-ink",
        items.length >= 4 ? "md:grid-cols-4" : "md:grid-cols-3",
      )}
    >
      {items.map((s) => (
        <div key={s.label} className="border-b border-rule py-4">
          <dd className="m text-[clamp(1.4rem,4.2vw,1.8rem)] leading-none font-bold tracking-[-0.05em]">
            {s.value}
            {s.of ? (
              <span className="text-[1rem] font-semibold tracking-[-0.02em] text-mute"> {s.of}</span>
            ) : null}
          </dd>
          <dt className="mt-1.5 text-[0.84rem] leading-snug text-ink-soft">{s.label}</dt>
        </div>
      ))}
    </dl>
  );
}

/**
 * Small and mono on purpose: on a page whose job is one finding, section
 * labels are signposts, not competition.
 */
export function GroupHead({ children, tone }: { children: React.ReactNode; tone?: "alarm" }) {
  return (
    <h2
      className={cn(
        "m border-b pb-2.5 text-[0.7rem] font-bold tracking-[0.11em] uppercase",
        tone === "alarm" ? "border-alarm text-alarm" : "border-ink text-ink",
      )}
    >
      {children}
    </h2>
  );
}

/** Marketing section header. Left-aligned; centring is for the hero only. */
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
    <div className="mb-8">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-3 text-[clamp(1.5rem,3.6vw,2.2rem)]">{title}</h2>
      {lede ? (
        <p className="mt-3 max-w-[66ch] text-[1.02rem] leading-relaxed text-ink-soft">{lede}</p>
      ) : null}
    </div>
  );
}

import Link from "next/link";
import type { Rule, RuleStatus, Ownership } from "@/lib/types";
import { STATUS_LABEL, OWNERSHIP } from "@/lib/types";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  whyItMatters,
  freshness,
  FRESHNESS_LABEL,
  changeKind,
  CHANGE_KIND_LABEL,
  impactOf,
  IMPACT_LABEL,
  type Freshness,
  type ChangeKind,
  type Impact,
} from "@/lib/rule-signals";

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

const KIND_TONE: Record<ChangeKind, string> = {
  market: "text-live bg-live-bg border-live/25",
  added: "text-muted-fg bg-muted border-border",
  reverify: "text-dim bg-bg-2 border-border-soft",
  correction: "text-soon bg-soon-bg border-soon/30",
  other: "text-muted-fg bg-muted border-border",
};

/**
 * Changelog row. Kind badge separates "the market moved" from "we wrote a page".
 */
export function ChangeRow({ rule, date, note }: { rule: Rule; date: string; note: string }) {
  const kind = changeKind(note);
  return (
    <Link
      href={`/rules/${rule.slug}`}
      className="group grid grid-cols-[auto_1fr] gap-x-3.5 gap-y-1.5 border-b border-border-soft px-4 py-3.5 transition-colors last:border-b-0 hover:bg-muted/70 sm:grid-cols-[86px_auto_1fr_auto] sm:items-baseline sm:px-5"
    >
      <time dateTime={date} className="num text-[12px] whitespace-nowrap text-dim sm:order-1">
        {fmtDate(date)}
      </time>
      <span className="sm:order-2 sm:translate-y-[-1px]">
        <StatusDot status={rule.status} />
      </span>
      <span className="col-span-2 sm:order-3 sm:col-span-1">
        <span
          className={cn(
            "mb-1.5 inline-flex rounded-full border px-2 py-0.5 text-[10.5px] font-medium",
            KIND_TONE[kind],
          )}
        >
          {CHANGE_KIND_LABEL[kind]}
        </span>
        <span className="block text-[14.5px] leading-relaxed">
          <span className="font-medium decoration-1 underline-offset-4 group-hover:underline">
            {rule.title}.
          </span>{" "}
          <span className="text-muted-fg">{note}</span>
        </span>
      </span>
      <span className="label hidden text-[10px] sm:order-4 sm:block sm:text-right">
        {rule.jurisdictions[0]}
      </span>
    </Link>
  );
}

const FRESH_TONE: Record<Freshness, string> = {
  new: "text-accent bg-accent-soft border-accent/25",
  updated: "text-soon bg-soon-bg border-soon/30",
  stable: "text-dim bg-bg-2 border-border-soft",
};

const IMPACT_TONE: Record<Impact, string> = {
  inbox: "text-live bg-live-bg border-live/20",
  legal: "text-soon bg-soon-bg border-soon/25",
  measure: "text-muted-fg bg-muted border-border",
  hygiene: "text-ok bg-ok-bg border-ok/25",
  auth: "text-fg bg-bg-2 border-border",
  content: "text-muted-fg bg-muted border-border",
};

/** The at-a-glance answer to "is this mine?", for index and topic listings. */
export function OwnershipTag({ ownership }: { ownership: Ownership }) {
  const tone = OWN_TONE[ownership];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        tone.box,
        tone.text,
      )}
    >
      {OWNERSHIP[ownership].short}
    </span>
  );
}

/** Index card: impact + ownership + why it matters. Built for scan. */
export function RuleRow({ rule }: { rule: Rule }) {
  const f = freshness(rule);
  const impact = impactOf(rule);
  return (
    <Link
      href={`/rules/${rule.slug}`}
      className="group block border-b border-border-soft px-4 py-4 transition-colors last:border-b-0 hover:bg-muted/70 sm:px-5"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium",
            IMPACT_TONE[impact],
          )}
        >
          {IMPACT_LABEL[impact]}
        </span>
        <OwnershipTag ownership={rule.ownership} />
        <StatusPill status={rule.status} />
        {f !== "stable" ? (
          <span
            className={cn(
              "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium",
              FRESH_TONE[f],
            )}
          >
            {FRESHNESS_LABEL[f]}
          </span>
        ) : null}
        <span className="num text-[11px] text-dim">
          {rule.jurisdictions.join(" · ")}
          {rule.provider ? ` · ${rule.provider}` : ""}
        </span>
      </div>
      <div className="mt-2 text-[15.5px] leading-snug font-medium decoration-1 underline-offset-4 group-hover:underline">
        {rule.title}
      </div>
      <div className="mt-1.5 max-w-[68ch] text-[13.5px] leading-relaxed text-muted-fg">
        <span className="font-medium text-fg/80">Why it matters: </span>
        {whyItMatters(rule)}
      </div>
      {rule.ignoreIf ? (
        <div className="mt-1.5 max-w-[68ch] text-[12.5px] leading-relaxed text-dim">
          Skip if {rule.ignoreIf.charAt(0).toLowerCase()}
          {rule.ignoreIf.slice(1)}
        </div>
      ) : null}
    </Link>
  );
}

const OWN_TONE: Record<Ownership, { box: string; text: string }> = {
  esp: { box: "border-ok/35 bg-ok-bg", text: "text-ok" },
  shared: { box: "border-soon/35 bg-soon-bg", text: "text-soon" },
  yours: { box: "border-accent/30 bg-accent-soft", text: "text-accent" },
  context: { box: "border-border bg-bg-2", text: "text-muted-fg" },
};

/**
 * Sits directly under the answer, because it is the only question a working
 * email marketer actually has: is this my job, or did Klaviyo already do it?
 *
 * "Already handled" gets the same weight as "yours" on purpose. A reference
 * that makes every item sound urgent is indistinguishable from the vendors
 * selling the fix, and practitioners spot that instantly.
 */
export function OwnershipBlock({ rule }: { rule: Rule }) {
  const tone = OWN_TONE[rule.ownership];
  return (
    <section className={cn("mt-7 rounded-xl border px-5 py-5", tone.box)}>
      <p className={cn("text-[15px] font-semibold", tone.text)}>
        {OWNERSHIP[rule.ownership].label}
      </p>
      <p className="mt-2.5 max-w-[64ch] text-[15px] leading-relaxed">{rule.handled.already}</p>
      {rule.handled.stillYours ? (
        <p className="mt-3 max-w-[64ch] text-[15px] leading-relaxed">
          <b>Your part: </b>
          <span className="text-muted-fg">{rule.handled.stillYours}</span>
        </p>
      ) : null}
    </section>
  );
}

/** The single concrete next move. A named screen beats an imperative. */
export function MondayMorning({ rule }: { rule: Rule }) {
  return (
    <section className="mt-7 rounded-xl border bg-card px-5 py-5" style={{ boxShadow: "var(--lift)" }}>
      <p className="label">What to do first</p>
      <p className="mt-2.5 max-w-[64ch] text-[15px] leading-relaxed">{rule.mondayMorning}</p>
      {rule.ignoreIf ? (
        <p className="mt-3 max-w-[64ch] text-[14px] leading-relaxed text-muted-fg">
          <b className="text-fg">You can skip this if: </b>
          {rule.ignoreIf}
        </p>
      ) : null}
    </section>
  );
}

/** One-line “why open this” under the plain answer on the detail page. */
export function WhyOnRadar({ rule }: { rule: Rule }) {
  return (
    <p className="mt-5 max-w-[64ch] rounded-lg border border-border-soft bg-bg-2 px-4 py-3 text-[14px] leading-relaxed text-muted-fg">
      <b className="text-fg">Why this is here: </b>
      {whyItMatters(rule)}
      {rule.ownership === "esp" ? (
        <span className="text-dim"> — usually already handled if you are on a mainstream ESP.</span>
      ) : null}
      {rule.ownership === "context" ? (
        <span className="text-dim"> — nothing to fix today; worth knowing when someone asks.</span>
      ) : null}
    </p>
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

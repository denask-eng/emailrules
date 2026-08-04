import Link from "next/link";
import type { Rule, RuleStatus, Ownership } from "@/lib/types";
import { STATUS_LABEL, OWNERSHIP } from "@/lib/types";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Explained } from "@/components/explained";
import {
  whyItMatters,
  freshness,
  FRESHNESS_LABEL,
  changeKind,
  impactOf,
  IMPACT_LABEL,
  type Freshness,
  type ChangeKind,
  type Impact,
} from "@/lib/rule-signals";
import { displayTldr, displayWhy, displayPlain } from "@/content/plain-overrides";
import { Reveal } from "@/components/reveal";
import { Signal, statusSignal, ownershipSignal } from "@/components/signal";

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
      {/* Branch A was right that a coloured dot is not a state: it is
          invisible to about one man in twelve, and it dies in the greyscale
          screenshots and printouts this site's readers actually make. The
          glyph carries the state; the colour now only agrees with it. */}
      <Signal state={statusSignal(status)} size={8} label={false} />
      {STATUS_LABEL[status]}
    </span>
  );
}

/**
 * Human skim labels — not internal taxonomy.
 * Busy marketers need “what / so what / next”, not “Correction” chrome.
 */
const KIND_SKIM: Record<ChangeKind, { label: string; tone: string }> = {
  market: { label: "Something changed", tone: "text-live" },
  correction: { label: "We fixed our page", tone: "text-soon" },
  added: { label: "New page on the shelf", tone: "text-muted-fg" },
  reverify: { label: "Re-checked", tone: "text-dim" },
  other: { label: "Note", tone: "text-muted-fg" },
};

function firstSentence(s: string, max = 140): string {
  const t = s.trim();
  const cut = t.split(/(?<=[.!?])\s+/)[0] ?? t;
  if (cut.length <= max) return cut;
  return `${cut.slice(0, max - 1).trim()}…`;
}

/**
 * Changelog row for people who open /changed on a busy Monday.
 * Structure: what → why it matters → do next. Badge is secondary.
 */
export function ChangeRow({
  rule,
  date,
  note,
  compact = false,
}: {
  rule: Rule;
  date: string;
  note: string;
  /** Homepage ledger: slightly tighter */
  compact?: boolean;
}) {
  const kind = changeKind(note);
  const skim = KIND_SKIM[kind];
  const soWhat = firstSentence(
    displayWhy(rule.slug, whyItMatters({ ...rule, plain: displayPlain(rule.slug, rule.plain) })),
    compact ? 120 : 160,
  );
  const next = firstSentence(rule.mondayMorning, compact ? 100 : 140);

  return (
    <Link
      href={`/rules/${rule.slug}`}
      className={cn(
        "group block border-b border-border-soft last:border-b-0 hover:bg-muted/50",
        compact ? "px-4 py-4 sm:px-5" : "px-1 py-5 sm:px-2 sm:py-6",
      )}
    >
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <time dateTime={date} className="num text-[12px] text-dim">
          {fmtDate(date)}
        </time>
        <span className={cn("text-[12px] font-medium", skim.tone)}>{skim.label}</span>
        <span className="num text-[11px] text-dim">
          {rule.jurisdictions.slice(0, 2).join(" · ")}
          {rule.provider ? ` · ${rule.provider}` : ""}
        </span>
      </div>

      <h3
        className={cn(
          "mt-2 font-semibold tracking-tight text-fg decoration-1 underline-offset-[5px] group-hover:underline",
          compact ? "text-[15px] leading-snug" : "text-[1.05rem] leading-snug sm:text-[1.1rem]",
        )}
      >
        {rule.title}
      </h3>

      <p
        className={cn(
          "mt-1.5 max-w-[62ch] leading-relaxed text-muted-fg",
          compact ? "text-[13px]" : "text-[14px]",
        )}
      >
        <span className="font-medium text-fg/75">What changed: </span>
        {note}
      </p>

      {!compact ? (
        <>
          <p className="mt-2 max-w-[62ch] text-[13.5px] leading-relaxed text-muted-fg">
            <span className="font-medium text-fg/75">Why it matters: </span>
            {soWhat}
          </p>
          <p className="mt-1.5 max-w-[62ch] text-[13px] leading-relaxed text-dim">
            <span className="font-medium text-muted-fg">Do next: </span>
            {next}
            <span className="ml-1.5 text-accent opacity-0 transition-opacity group-hover:opacity-100">
              Full rule →
            </span>
          </p>
        </>
      ) : (
        <p className="mt-1.5 max-w-[58ch] text-[12.5px] leading-relaxed text-dim">
          <span className="font-medium text-muted-fg">So what: </span>
          {soWhat}
        </p>
      )}
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
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        tone.box,
        tone.text,
      )}
    >
      <Signal state={ownershipSignal(ownership)} size={8} label={false} />
      {OWNERSHIP[ownership].short}
    </span>
  );
}

/** Index row: ownership first, one sentence, minimal chrome. */
export function RuleRow({ rule, index = 0 }: { rule: Rule; index?: number }) {
  const f = freshness(rule);
  const impact = impactOf(rule);
  return (
    <Reveal as="div" delay={Math.min(index, 6)} className="border-b border-border-soft last:border-b-0">
    <Link
      href={`/rules/${rule.slug}`}
      className="group block px-1 py-5 transition-colors hover:bg-muted/40 sm:px-2"
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <OwnershipTag ownership={rule.ownership} />
        {rule.status === "upcoming" ? <StatusPill status={rule.status} /> : null}
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
          {IMPACT_LABEL[impact]}
          {" · "}
          {rule.jurisdictions.slice(0, 3).join(" · ")}
          {rule.provider ? ` · ${rule.provider}` : ""}
        </span>
      </div>
      <div className="mt-2 text-[15.5px] leading-snug font-semibold tracking-tight decoration-1 underline-offset-[5px] group-hover:underline">
        {rule.title}
      </div>
      <div className="mt-1.5 max-w-[64ch] text-[14px] leading-relaxed text-muted-fg">
        <Explained text={displayTldr(rule.slug, rule.plain)} />
      </div>
      {rule.ignoreIf ? (
        <div className="mt-1.5 max-w-[64ch] text-[12.5px] leading-relaxed text-dim">
          <span className="font-medium text-muted-fg">Skip if </span>
          <Explained text={rule.ignoreIf} />
        </div>
      ) : null}
    </Link>
    </Reveal>
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
      <p className="mt-1 text-[12.5px] text-muted-fg">{OWNERSHIP[rule.ownership].blurb}</p>
      <Explained
        as="p"
        className="mt-2.5 max-w-[64ch] text-[15px] leading-relaxed"
        text={rule.handled.already}
      />
      {rule.handled.stillYours ? (
        <p className="mt-3 max-w-[64ch] text-[15px] leading-relaxed">
          <b>Your part: </b>
          <Explained as="span" className="text-muted-fg" text={rule.handled.stillYours} />
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
      <Explained
        as="p"
        className="mt-2.5 max-w-[64ch] text-[15px] leading-relaxed"
        text={rule.mondayMorning}
      />
      {rule.ignoreIf ? (
        <p className="mt-3 max-w-[64ch] text-[14px] leading-relaxed text-muted-fg">
          <b className="text-fg">You can skip this if: </b>
          <Explained as="span" text={rule.ignoreIf} />
        </p>
      ) : null}
    </section>
  );
}

/** Why open this page — plain + optional ownership hint. */
export function WhyOnRadar({ rule }: { rule: Rule }) {
  const hint =
    rule.ownership === "esp"
      ? " If you use a mainstream email tool (an ESP), this is often already handled."
      : rule.ownership === "context"
        ? " Nothing to fix today — worth knowing when someone asks."
        : "";
  return (
    <div className="mt-5 max-w-[64ch] rounded-lg border border-border-soft bg-bg-2 px-4 py-3 text-[14px] leading-relaxed text-muted-fg">
      <b className="text-fg">Why it matters: </b>
      <Explained as="span" text={whyItMatters(rule) + hint} />
    </div>
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

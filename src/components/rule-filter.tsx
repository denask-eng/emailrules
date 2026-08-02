"use client";

import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import type { Rule } from "@/lib/types";
import { RuleRow } from "@/components/bits";
import { cn } from "@/lib/utils";
import {
  type Audience,
  EMPTY_AUDIENCE,
  STORAGE_KEY,
  ONBOARD_KEY,
  AUDIENCE_CHIPS,
  ROLE_PRESETS,
  audienceActive,
  audienceToSearch,
  matchesAudience,
  parseAudienceParam,
  roleTopicBoost,
} from "@/lib/audience";
import { briefCounts, sortForMarketer, topForYou } from "@/lib/rule-signals";
import Link from "next/link";

const listeners = new Set<() => void>();
let memory: Audience = EMPTY_AUDIENCE;
let hydrated = false;

function readStored(): Audience {
  if (typeof window === "undefined") return EMPTY_AUDIENCE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_AUDIENCE;
    return { ...EMPTY_AUDIENCE, ...(JSON.parse(raw) as Partial<Audience>) };
  } catch {
    return EMPTY_AUDIENCE;
  }
}

function isOnboarded(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(ONBOARD_KEY) === "1" || audienceActive(readStored());
  } catch {
    return false;
  }
}

function markOnboarded() {
  try {
    window.localStorage.setItem(ONBOARD_KEY, "1");
  } catch {
    /* */
  }
}

function readAudience(): Audience {
  if (typeof window === "undefined") return EMPTY_AUDIENCE;
  if (!hydrated) {
    memory = parseAudienceParam(window.location.search) ?? readStored();
    hydrated = true;
  }
  return memory;
}

function persist(next: Audience, pushUrl: boolean) {
  memory = next;
  try {
    if (audienceActive(next)) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      markOnboarded();
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    /* */
  }
  if (pushUrl) {
    window.history.replaceState(null, "", `${window.location.pathname}${audienceToSearch(next)}`);
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === ONBOARD_KEY || e.key === null) {
      hydrated = false;
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

const serverSnapshot = () => EMPTY_AUDIENCE;

function RoleGate({
  rulesCount,
  onPick,
  onSkip,
}: {
  rulesCount: number;
  onPick: (a: Audience) => void;
  onSkip: () => void;
}) {
  return (
    <div
      className="rounded-2xl border bg-card px-5 py-10 sm:px-10 sm:py-12"
      style={{ boxShadow: "var(--lift-2)" }}
    >
      <p className="label text-center">Start here · 10 seconds</p>
      <h2 className="mx-auto mt-3 max-w-[20ch] text-center text-[clamp(1.5rem,4vw,2rem)] font-semibold tracking-tight">
        What kind of email work do you do?
      </h2>
      <p className="mx-auto mt-3 max-w-[40ch] text-center text-[15px] leading-relaxed text-muted-fg">
        One tap. You get five rules that matter — not all {rulesCount}. Dotted words explain
        themselves.
      </p>
      <div className="mx-auto mt-8 grid max-w-2xl gap-2.5 sm:grid-cols-2">
        {ROLE_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onPick(p.audience)}
            className="rounded-2xl border bg-bg px-4 py-4 text-left hover:border-accent hover:bg-accent-soft"
          >
            <span className="block text-[15px] font-semibold tracking-tight">{p.label}</span>
            <span className="mt-1.5 block text-[12.5px] leading-snug text-muted-fg">{p.blurb}</span>
          </button>
        ))}
      </div>
      <div className="mx-auto mt-8 flex max-w-md flex-col items-center gap-3 text-center">
        <Link href="/check" className="text-[14px] font-medium text-fg underline underline-offset-3">
          I only want to check my domain →
        </Link>
        <button
          type="button"
          onClick={onSkip}
          className="text-[13px] text-muted-fg underline underline-offset-3 hover:text-fg"
        >
          Browse everything (I&rsquo;ll filter later)
        </button>
      </div>
    </div>
  );
}

export function RuleFilter({ rules }: { rules: Rule[] }) {
  const a = useSyncExternalStore(subscribe, readAudience, serverSnapshot);
  const [copied, setCopied] = useState(false);
  /** null = not hydrated; true = show gate; false = show list */
  const [gate, setGate] = useState<boolean | null>(null);

  useLayoutEffect(() => {
    hydrated = false;
    readAudience();
    listeners.forEach((l) => l());
    const has =
      audienceActive(readAudience()) ||
      !!parseAudienceParam(window.location.search) ||
      isOnboarded();
    setGate(!has);
  }, []);

  const apply = useCallback((next: Audience) => {
    persist(next, true);
    markOnboarded();
    setGate(false);
  }, []);

  const set = useCallback(
    (patch: Partial<Audience>) => {
      apply({ ...readAudience(), ...patch });
    },
    [apply],
  );

  const boost = useCallback((topic: string) => roleTopicBoost(topic, a.role), [a.role]);

  const shown = useMemo(() => {
    const filtered = rules.filter((r) => matchesAudience(r, a));
    return sortForMarketer(filtered, boost);
  }, [rules, a, boost]);

  const top = useMemo(() => topForYou(shown, 5, boost), [shown, boost]);
  const topSlugs = useMemo(() => new Set(top.map((r) => r.slug)), [top]);
  const rest = useMemo(() => shown.filter((r) => !topSlugs.has(r.slug)), [shown, topSlugs]);
  const brief = briefCounts(shown);
  const filtered = audienceActive(a);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/rules${audienceToSearch(a)}`,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* */
    }
  };

  if (gate === null || gate === true) {
    return (
      <RoleGate
        rulesCount={rules.length}
        onPick={apply}
        onSkip={() => {
          markOnboarded();
          persist(EMPTY_AUDIENCE, true);
          setGate(false);
        }}
      />
    );
  }

  return (
    <>
      <div className="rounded-2xl border bg-card p-5 sm:p-6" style={{ boxShadow: "var(--lift)" }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-[1.05rem] font-semibold tracking-tight">Your setup</h2>
            <p className="mt-1 max-w-[36rem] text-[13.5px] leading-relaxed text-muted-fg">
              Role + where you send. Saved here and in the URL. That&rsquo;s the whole system.
            </p>
          </div>
          {filtered ? (
            <p className="rounded-full border border-ok/30 bg-ok-bg px-2.5 py-1 text-[11px] font-medium text-ok">
              Saved
            </p>
          ) : null}
        </div>

        <div className="mt-5">
          <p className="label mb-2">Your role</p>
          <div className="flex flex-wrap gap-2">
            {ROLE_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() =>
                  apply({ ...p.audience, onlyMine: a.onlyMine && p.audience.onlyMine })
                }
                className={cn(
                  "rounded-full border px-3.5 py-2 text-[13px] font-medium",
                  a.role === p.audience.role
                    ? "border-accent bg-accent-soft text-fg"
                    : "bg-bg text-muted-fg hover:bg-muted hover:text-fg",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <p className="label mb-2">Where you send</p>
          <div className="flex flex-wrap gap-2">
            {AUDIENCE_CHIPS.map((q) => (
              <button
                key={q.key}
                type="button"
                title={q.explain}
                aria-pressed={!!a[q.key]}
                onClick={() => set({ [q.key]: !a[q.key] })}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-[13.5px]",
                  a[q.key]
                    ? q.key === "onlyMine"
                      ? "border-fg bg-fg text-bg"
                      : "border-accent bg-accent text-accent-fg"
                    : "bg-bg text-muted-fg hover:bg-muted hover:text-fg",
                )}
              >
                {q.label}
              </button>
            ))}
          </div>
          <p className="mt-2 max-w-[48ch] text-[12.5px] leading-relaxed text-dim">
            EU / Europe pulls ePrivacy plus FR, DE, IT pages tagged EU. UK is its own law — separate
            chip. Not every Member State yet; see{" "}
            <Link href="/coverage" className="underline underline-offset-2 hover:text-fg">
              coverage
            </Link>
            .
          </p>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-4 text-[13px]">
          <button
            type="button"
            onClick={() => apply(EMPTY_AUDIENCE)}
            className="text-muted-fg underline underline-offset-3 hover:text-fg"
          >
            Clear
          </button>
          {filtered ? (
            <button
              type="button"
              onClick={copyLink}
              className="text-muted-fg underline underline-offset-3 hover:text-fg"
            >
              {copied ? "Link copied" : "Copy setup link"}
            </button>
          ) : null}
          <Link
            href="/brief"
            className="font-medium text-accent underline underline-offset-3 hover:text-fg"
          >
            One-page brief
          </Link>
          <Link href="/glossary" className="text-muted-fg underline underline-offset-3 hover:text-fg">
            Glossary
          </Link>
          <button
            type="button"
            onClick={() => {
              try {
                window.localStorage.removeItem(ONBOARD_KEY);
                window.localStorage.removeItem(STORAGE_KEY);
              } catch {
                /* */
              }
              hydrated = false;
              persist(EMPTY_AUDIENCE, true);
              setGate(true);
            }}
            className="text-dim underline underline-offset-3 hover:text-fg"
          >
            Start over
          </button>
        </div>
      </div>

      {/* One glance — not a dashboard of metrics */}
      <p className="mt-6 text-[14px] leading-relaxed text-muted-fg">
        In this filter:{" "}
        <b className="font-medium text-fg">{brief.act}</b> need you
        <span className="text-dim"> · </span>
        <b className="font-medium text-fg">{brief.shared}</b> shared with your ESP
        <span className="text-dim"> · </span>
        <b className="font-medium text-fg">{brief.handled + brief.fyi}</b> handled or FYI
        {brief.upcoming > 0 ? (
          <>
            <span className="text-dim"> · </span>
            <b className="font-medium text-fg">{brief.upcoming}</b> upcoming
          </>
        ) : null}
      </p>

      {shown.length === 0 ? (
        <p className="mt-8 rounded-2xl border bg-bg-2 px-5 py-6 text-[0.95rem] text-muted-fg">
          Nothing matches.{" "}
          <button type="button" className="text-fg underline" onClick={() => apply(EMPTY_AUDIENCE)}>
            Clear filters
          </button>
          .
        </p>
      ) : (
        <>
          <section className="mt-8">
            <h2 className="text-[1.2rem] font-semibold tracking-tight">
              Open these {top.length} first
            </h2>
            <p className="mt-1 max-w-[52ch] text-[14px] text-muted-fg">
              Highest signal for your role. Read, act or skip — then you&rsquo;re done for today.
            </p>
            <ul className="mt-4 list-none border-t border-fg/12 p-0">
              {top.map((r) => (
                <RuleRow key={r.slug} rule={r} />
              ))}
            </ul>
            <div className="mt-6 rounded-2xl border border-border-soft bg-bg-2 px-5 py-4 text-[14px] leading-relaxed text-muted-fg">
              <b className="font-semibold text-fg">Done for today?</b> If the five above are handled
              or honestly skipped, you&rsquo;re ahead of most programmes.{" "}
              <Link href="/brief" className="font-medium text-accent underline underline-offset-2">
                Share a one-page brief
              </Link>
              {" · "}
              <Link href="/changed" className="underline underline-offset-2 hover:text-fg">
                What moved
              </Link>
            </div>
          </section>
          {rest.length > 0 ? (
            <section className="mt-12">
              <h2 className="text-[1.05rem] font-semibold tracking-tight">The rest in your filter</h2>
              <p className="mt-1 text-[13.5px] text-muted-fg">
                {rest.length} more · lower urgency. Skim when you have time.
              </p>
              <ul className="mt-4 list-none border-t p-0">
                {rest.map((r) => (
                  <RuleRow key={r.slug} rule={r} />
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </>
  );
}

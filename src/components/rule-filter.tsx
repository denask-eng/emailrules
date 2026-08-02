"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { Rule } from "@/lib/types";
import { RuleRow } from "@/components/bits";
import { cn } from "@/lib/utils";
import {
  type Audience,
  EMPTY_AUDIENCE,
  STORAGE_KEY,
  ONBOARD_KEY,
  AUDIENCE_CHIPS,
  PRESETS,
  audienceActive,
  audienceToSearch,
  matchesAudience,
  parseAudienceParam,
} from "@/lib/audience";
import { briefCounts, sortForMarketer, topForYou } from "@/lib/rule-signals";

/**
 * Audience filters for /rules.
 *
 * Persistence: URL (shareable) + localStorage (tomorrow).
 * First visit without a profile: full-screen gate — one tap, then Top 5.
 */

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
  if (typeof window === "undefined") return true;
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
    /* private mode */
  }
}

function readAudience(): Audience {
  if (typeof window === "undefined") return EMPTY_AUDIENCE;
  if (!hydrated) {
    const fromUrl = parseAudienceParam(window.location.search);
    memory = fromUrl ?? readStored();
    hydrated = true;
  }
  return memory;
}

function persist(next: Audience, pushUrl: boolean) {
  memory = next;
  const raw = JSON.stringify(next);
  try {
    if (audienceActive(next)) {
      window.localStorage.setItem(STORAGE_KEY, raw);
      markOnboarded();
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    /* private mode */
  }
  if (pushUrl && typeof window !== "undefined") {
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

function presetActive(a: Audience, p: (typeof PRESETS)[0]) {
  return (
    a.eu === p.audience.eu &&
    a.us === p.audience.us &&
    a.ca === p.audience.ca &&
    a.uk === p.audience.uk &&
    a.au === p.audience.au &&
    a.gmailBulk === p.audience.gmailBulk &&
    a.klaviyo === p.audience.klaviyo
  );
}

export function RuleFilter({ rules }: { rules: Rule[] }) {
  const a = useSyncExternalStore(subscribe, readAudience, serverSnapshot);
  const [copied, setCopied] = useState(false);
  const [ready, setReady] = useState(false);
  const [needsGate, setNeedsGate] = useState(false);

  useEffect(() => {
    hydrated = false;
    readAudience();
    listeners.forEach((l) => l());
    const hasProfile = audienceActive(readAudience()) || !!parseAudienceParam(window.location.search);
    setNeedsGate(!hasProfile && !isOnboarded());
    setReady(true);
  }, []);

  const set = useCallback((patch: Partial<Audience>) => {
    const next = { ...readAudience(), ...patch };
    persist(next, true);
    setNeedsGate(false);
  }, []);

  const apply = useCallback((next: Audience) => {
    persist(next, true);
    markOnboarded();
    setNeedsGate(false);
  }, []);

  const skipAll = useCallback(() => {
    markOnboarded();
    persist(EMPTY_AUDIENCE, true);
    setNeedsGate(false);
  }, []);

  const shown = useMemo(() => {
    const filtered = rules.filter((r) => matchesAudience(r, a));
    return sortForMarketer(filtered);
  }, [rules, a]);

  const top = useMemo(() => topForYou(shown, 5), [shown]);
  const topSlugs = useMemo(() => new Set(top.map((r) => r.slug)), [top]);
  const rest = useMemo(() => shown.filter((r) => !topSlugs.has(r.slug)), [shown, topSlugs]);

  const brief = briefCounts(shown);
  const filtered = audienceActive(a);

  const copyLink = async () => {
    const url = `${window.location.origin}/rules${audienceToSearch(a)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  /* SSR + first paint: avoid flashing the full library before we know. */
  if (!ready) {
    return (
      <div className="rounded-xl border bg-card px-5 py-10 text-center text-[14px] text-muted-fg">
        Loading your setup…
      </div>
    );
  }

  /* First visit: one decision, then value. */
  if (needsGate) {
    return (
      <div
        className="rounded-2xl border bg-card px-5 py-10 sm:px-10 sm:py-12"
        style={{ boxShadow: "var(--lift-2)" }}
      >
        <p className="label text-center">10 seconds</p>
        <h2 className="mx-auto mt-3 max-w-[22ch] text-center text-[clamp(1.4rem,4vw,1.85rem)] font-semibold tracking-tight">
          Who do you email?
        </h2>
        <p className="mx-auto mt-3 max-w-[42ch] text-center text-[15px] leading-relaxed text-muted-fg">
          One tap. We save it on this browser and show the five things that matter first — not all{" "}
          {rules.length} rules at once.
        </p>
        <div className="mx-auto mt-8 grid max-w-xl gap-2.5 sm:grid-cols-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => apply(p.audience)}
              className="rounded-xl border bg-bg px-4 py-4 text-left transition-colors hover:border-accent hover:bg-accent-soft"
            >
              <span className="block text-[15px] font-semibold">{p.label}</span>
              <span className="mt-1 block text-[12.5px] leading-snug text-muted-fg">{p.blurb}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={skipAll}
          className="mx-auto mt-8 block text-[13.5px] text-muted-fg underline underline-offset-3 hover:text-fg"
        >
          Browse everything (I&rsquo;ll filter later)
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border bg-card p-5 sm:p-6" style={{ boxShadow: "var(--lift)" }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 max-w-[40rem]">
            <h2 className="text-[1.05rem] font-semibold tracking-tight">Your setup</h2>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-fg">
              Saved on this browser and in the link. Change anytime — tomorrow opens the same list.
            </p>
          </div>
          {filtered ? (
            <p className="num shrink-0 rounded-full border border-ok/30 bg-ok-bg px-2.5 py-1 text-[11px] font-medium text-ok">
              Saved for next visit
            </p>
          ) : null}
        </div>

        <div className="mt-5">
          <p className="label mb-2">Profile</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => apply({ ...p.audience, onlyMine: a.onlyMine })}
                title={p.blurb}
                className={cn(
                  "rounded-lg border px-3 py-2 text-left text-[13px] transition-colors",
                  presetActive(a, p) ? "border-accent bg-accent-soft text-fg" : "bg-bg hover:bg-muted",
                )}
              >
                <span className="font-medium">{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <p className="label mb-2">Fine-tune</p>
          <div className="flex flex-wrap gap-2">
            {AUDIENCE_CHIPS.map((q) => (
              <button
                key={q.key}
                type="button"
                aria-pressed={a[q.key]}
                onClick={() => set({ [q.key]: !a[q.key] })}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-[13.5px] transition-colors",
                  a[q.key]
                    ? q.key === "onlyMine"
                      ? "border-fg bg-fg text-bg"
                      : "border-accent bg-accent text-accent-fg"
                    : "bg-bg hover:bg-muted",
                )}
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-4 text-[13px]">
          {filtered ? (
            <>
              <button
                type="button"
                onClick={() => apply(EMPTY_AUDIENCE)}
                className="text-muted-fg underline underline-offset-3 hover:text-fg"
              >
                Clear — show all {rules.length}
              </button>
              <button
                type="button"
                onClick={copyLink}
                className="text-muted-fg underline underline-offset-3 hover:text-fg"
              >
                {copied ? "Link copied" : "Copy link with filters"}
              </button>
            </>
          ) : (
            <span className="text-muted-fg">Showing everything. Pick a profile to cut noise.</span>
          )}
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
              setNeedsGate(true);
            }}
            className="text-dim underline underline-offset-3 hover:text-fg"
          >
            Reset setup
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-2 sm:grid-cols-4">
        {[
          { v: brief.act, k: "Need you", hint: "Nobody else will do these" },
          { v: brief.shared, k: "You + ESP", hint: "Platform half, judgment yours" },
          { v: brief.handled + brief.fyi, k: "Handled or FYI", hint: "Skim or skip" },
          { v: brief.upcoming, k: "Coming up", hint: "Dated, not biting yet" },
        ].map((x) => (
          <div key={x.k} className="rounded-xl border bg-card px-4 py-3">
            <div className="num text-[1.35rem] font-semibold tracking-tight">{x.v}</div>
            <div className="mt-0.5 text-[13px] font-medium">{x.k}</div>
            <div className="mt-0.5 text-[11.5px] text-dim">{x.hint}</div>
          </div>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="mt-8 max-w-[52ch] rounded-xl border bg-bg-2 px-5 py-6 text-[0.95rem] leading-relaxed text-muted-fg">
          Nothing matches. That can be good news.{" "}
          <button
            type="button"
            onClick={() => apply(EMPTY_AUDIENCE)}
            className="text-fg underline underline-offset-3"
          >
            Clear filters
          </button>
          .
        </p>
      ) : (
        <>
          <section className="mt-10">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[1.1rem] font-semibold tracking-tight">
                Start here{filtered ? " for you" : ""}
              </h2>
              <p className="text-[13px] text-dim">
                {top.length} of {brief.total}
                {filtered ? " matching" : ""} · your desk first
              </p>
            </div>
            <p className="mt-1 max-w-[58ch] text-[13.5px] text-muted-fg">
              Open these first. Everything else is optional reading.
            </p>
            <ul className="mt-4 list-none border-t p-0">
              {top.map((r) => (
                <RuleRow key={r.slug} rule={r} />
              ))}
            </ul>
          </section>

          {rest.length > 0 ? (
            <section className="mt-12">
              <h2 className="text-[1.05rem] font-semibold tracking-tight">Everything else</h2>
              <p className="mt-1 text-[13.5px] text-muted-fg">
                Same filters · lower urgency · still yours if you dig
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

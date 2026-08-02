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
import {
  type Profile,
  briefPathForProfile,
  deleteProfile,
  emptyProfile,
  ensureProfilesFromLegacy,
  getActiveProfile,
  readActiveProfileId,
  readProfiles,
  setActiveProfileId,
  upsertProfile,
  PROFILES_KEY,
  ACTIVE_PROFILE_KEY,
} from "@/lib/profiles";
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
      <h2 className="mx-auto mt-3 max-w-[22ch] text-center text-[clamp(1.45rem,4vw,1.95rem)] font-semibold tracking-tight">
        What kind of email work do you do?
      </h2>
      <p className="mx-auto mt-3 max-w-[42ch] text-center text-[15px] leading-relaxed text-muted-fg">
        One tap. Five rules that matter first — not all {rulesCount}. Built for people who ship
        email and are too busy to re-read every PDF. Jargon opens on the dotted words.
      </p>
      <div className="mx-auto mt-8 grid max-w-2xl gap-2.5 sm:grid-cols-2">
        {ROLE_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onPick(p.audience)}
            className="rounded-xl border bg-bg px-4 py-4 text-left transition-colors hover:border-accent hover:bg-accent-soft"
          >
            <span className="block text-[15px] font-semibold">{p.label}</span>
            <span className="mt-1.5 block text-[12.5px] leading-snug text-muted-fg">{p.blurb}</span>
          </button>
        ))}
      </div>
      <div className="mx-auto mt-8 flex max-w-md flex-col items-center gap-3 text-center">
        <Link
          href="/check"
          className="text-[14px] font-medium text-fg underline underline-offset-3"
        >
          I only want to check my domain setup →
        </Link>
        <button
          type="button"
          onClick={onSkip}
          className="text-[13px] text-muted-fg underline underline-offset-3 hover:text-fg"
        >
          Browse everything (I&rsquo;ll filter later)
        </button>
        <p className="text-[12px] text-dim">
          Stuck on a word? Open the{" "}
          <Link href="/glossary" className="underline underline-offset-2">
            glossary
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

export function RuleFilter({ rules }: { rules: Rule[] }) {
  const a = useSyncExternalStore(subscribe, readAudience, serverSnapshot);
  const [copied, setCopied] = useState(false);
  /** null = not hydrated; true = show gate; false = show list */
  const [gate, setGate] = useState<boolean | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [profileName, setProfileName] = useState("My programme");

  /* useLayoutEffect: decide gate before paint so returning users don't flash the welcome. */
  useLayoutEffect(() => {
    hydrated = false;
    readAudience();
    listeners.forEach((l) => l());
    const list = ensureProfilesFromLegacy();
    setProfiles(list);
    const active = getActiveProfile();
    if (active) {
      setActiveId(active.id);
      setProfileName(active.name);
      if (audienceActive(active.audience) && !audienceActive(readAudience())) {
        persist(active.audience, true);
      }
    }
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
    /* Keep active profile in sync so agencies can switch clients. */
    try {
      const id = readActiveProfileId();
      const list = readProfiles();
      const cur = list.find((p) => p.id === id) ?? emptyProfile(profileName || "My programme");
      const saved = upsertProfile({
        ...cur,
        name: (profileName || cur.name || "My programme").slice(0, 80),
        audience: next,
      });
      setProfiles(saved);
      setActiveId(saved.find((p) => p.id === cur.id)?.id ?? saved[0]?.id ?? null);
    } catch {
      /* */
    }
  }, [profileName]);

  const set = useCallback((patch: Partial<Audience>) => {
    apply({ ...readAudience(), ...patch });
  }, [apply]);

  const switchProfile = useCallback((p: Profile) => {
    setActiveProfileId(p.id);
    setActiveId(p.id);
    setProfileName(p.name);
    persist(p.audience, true);
    markOnboarded();
    setGate(false);
  }, []);

  const addClient = useCallback(() => {
    const p = emptyProfile("New client");
    const saved = upsertProfile(p);
    setProfiles(saved);
    switchProfile(p);
  }, [switchProfile]);

  const boost = useCallback(
    (topic: string) => roleTopicBoost(topic, a.role),
    [a.role],
  );

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

  /* SSR + first paint: role gate immediately — never "Loading…" */
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

  const activeProfile = profiles.find((p) => p.id === activeId) ?? null;

  return (
    <>
      <div className="rounded-2xl border bg-card p-5 sm:p-6" style={{ boxShadow: "var(--lift)" }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-[1.05rem] font-semibold tracking-tight">Your setup</h2>
            <p className="mt-1.5 max-w-[40rem] text-[13.5px] leading-relaxed text-muted-fg">
              Saved on this browser and in the URL. Agencies: name each client and switch without an
              account.
            </p>
          </div>
          {filtered ? (
            <p className="rounded-full border border-ok/30 bg-ok-bg px-2.5 py-1 text-[11px] font-medium text-ok">
              Saved for next visit
            </p>
          ) : null}
        </div>

        <div className="mt-5">
          <p className="label mb-2">Programme / client name</p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value.slice(0, 80))}
              onBlur={() => {
                if (!activeProfile && !audienceActive(a)) return;
                apply(a);
              }}
              placeholder="e.g. Acme EU or My brand"
              className="h-10 min-w-[12rem] flex-1 rounded-xl border bg-bg px-3 text-[14px] outline-none focus-visible:border-accent"
            />
            <button
              type="button"
              onClick={addClient}
              className="h-10 rounded-xl border bg-bg px-3.5 text-[13px] font-medium hover:bg-muted"
            >
              + Another client
            </button>
          </div>
          {profiles.length > 1 ? (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {profiles.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => switchProfile(p)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-[12.5px] font-medium",
                    p.id === activeId
                      ? "border-accent bg-accent-soft text-accent"
                      : "bg-bg text-muted-fg hover:bg-muted hover:text-fg",
                  )}
                >
                  {p.name}
                </button>
              ))}
              {activeId && profiles.length > 1 ? (
                <button
                  type="button"
                  onClick={() => {
                    const next = deleteProfile(activeId);
                    setProfiles(next);
                    if (next[0]) switchProfile(next[0]);
                    else {
                      setActiveId(null);
                      setProfileName("My programme");
                      apply(EMPTY_AUDIENCE);
                    }
                  }}
                  className="rounded-full px-2 py-1 text-[12px] text-dim underline-offset-2 hover:text-fg hover:underline"
                >
                  Remove this client
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-5">
          <p className="label mb-2">Your role</p>
          <div className="flex flex-wrap gap-2">
            {ROLE_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => apply({ ...p.audience, onlyMine: a.onlyMine && p.audience.onlyMine })}
                className={cn(
                  "rounded-lg border px-3 py-2 text-[13px] font-medium transition-colors",
                  a.role === p.audience.role
                    ? "border-accent bg-accent-soft"
                    : "bg-bg hover:bg-muted",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <p className="label mb-2">Where you send (optional)</p>
          <div className="flex flex-wrap gap-2">
            {AUDIENCE_CHIPS.map((q) => (
              <button
                key={q.key}
                type="button"
                title={q.explain}
                aria-pressed={!!a[q.key]}
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
          <button
            type="button"
            onClick={() => apply(EMPTY_AUDIENCE)}
            className="text-muted-fg underline underline-offset-3 hover:text-fg"
          >
            Clear filters
          </button>
          {filtered ? (
            <button
              type="button"
              onClick={copyLink}
              className="text-muted-fg underline underline-offset-3 hover:text-fg"
            >
              {copied ? "Link copied" : "Copy link with this setup"}
            </button>
          ) : null}
          <Link
            href={
              activeProfile
                ? briefPathForProfile({
                    ...activeProfile,
                    name: profileName || activeProfile.name,
                    audience: a,
                  })
                : "/brief"
            }
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
                window.localStorage.removeItem(PROFILES_KEY);
                window.localStorage.removeItem(ACTIVE_PROFILE_KEY);
              } catch {
                /* */
              }
              hydrated = false;
              setProfiles([]);
              setActiveId(null);
              setProfileName("My programme");
              persist(EMPTY_AUDIENCE, true);
              setGate(true);
            }}
            className="text-dim underline underline-offset-3 hover:text-fg"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-2 sm:grid-cols-4">
        {[
          { v: brief.act, k: "Need you", hint: "A person must decide or build" },
          { v: brief.shared, k: "You + your ESP", hint: "Tool does half; judgment is yours" },
          { v: brief.handled + brief.fyi, k: "Handled or FYI", hint: "Often safe to skim" },
          { v: brief.upcoming, k: "Coming up", hint: "Dated — not biting yet" },
        ].map((x) => (
          <div key={x.k} className="rounded-xl border bg-card px-4 py-3">
            <div className="num text-[1.35rem] font-semibold tracking-tight">{x.v}</div>
            <div className="mt-0.5 text-[13px] font-medium">{x.k}</div>
            <div className="mt-0.5 text-[11.5px] text-dim">{x.hint}</div>
          </div>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="mt-8 rounded-xl border bg-bg-2 px-5 py-6 text-[0.95rem] text-muted-fg">
          Nothing matches.{" "}
          <button type="button" className="text-fg underline" onClick={() => apply(EMPTY_AUDIENCE)}>
            Clear filters
          </button>
          .
        </p>
      ) : (
        <>
          <section className="mt-10">
            <h2 className="text-[1.15rem] font-semibold tracking-tight">
              Start with these {top.length}
            </h2>
            <p className="mt-1 max-w-[58ch] text-[13.5px] text-muted-fg">
              Highest-signal for your role. Open them, act, you&rsquo;re done for today. Hover any
              dotted word for a definition.
            </p>
            <ul className="mt-4 list-none border-t p-0">
              {top.map((r) => (
                <RuleRow key={r.slug} rule={r} />
              ))}
            </ul>
            <p className="mt-5 rounded-xl border border-ok/25 bg-ok-bg px-4 py-3 text-[13.5px] leading-relaxed text-ok">
              <b className="font-semibold">Done for today?</b> If you handled the five above (or
              marked them skip), you&rsquo;re ahead of most programmes. Share a{" "}
              <Link
                href={
                  activeProfile
                    ? briefPathForProfile({
                        ...activeProfile,
                        name: profileName || activeProfile.name,
                        audience: a,
                      })
                    : "/brief"
                }
                className="font-medium underline underline-offset-2"
              >
                one-page brief
              </Link>{" "}
              with your team, or come back when{" "}
              <Link href="/changed" className="font-medium underline underline-offset-2">
                something moves
              </Link>
              .
            </p>
          </section>
          {rest.length > 0 ? (
            <section className="mt-12">
              <h2 className="text-[1.05rem] font-semibold">Everything else in your filter</h2>
              <p className="mt-1 text-[13.5px] text-muted-fg">{rest.length} more · lower urgency</p>
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

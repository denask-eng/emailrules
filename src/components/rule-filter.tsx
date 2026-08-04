"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import type { Rule } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  type Audience,
  type EspId,
  EMPTY_AUDIENCE,
  STORAGE_KEY,
  AUDIENCE_CHIPS,
  ESP_OPTIONS,
  ROLE_PRESETS,
  audienceActive,
  audienceToSearch,
  matchesAudience,
  parseAudienceParam,
  readStoredAudience,
  roleTopicBoost,
  espLabel,
} from "@/lib/audience";
import { briefCounts, sortForMarketer, topForYou } from "@/lib/rule-signals";
import { RuleRow } from "@/components/rules/rule-row";

const listeners = new Set<() => void>();
let memory: Audience = EMPTY_AUDIENCE;
let hydrated = false;

function readAudience(): Audience {
  if (typeof window === "undefined") return EMPTY_AUDIENCE;
  if (!hydrated) {
    memory = parseAudienceParam(window.location.search) ?? readStoredAudience();
    hydrated = true;
  }
  return memory;
}

function persist(next: Audience, pushUrl: boolean) {
  memory = next;
  try {
    if (audienceActive(next)) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
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
    if (e.key === STORAGE_KEY || e.key === null) {
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

type GeoKey = "eu" | "us" | "ca" | "uk" | "au";

/** The five geographies. Gmail volume and “only my desk” are not places. */
const GEO_CHIPS = AUDIENCE_CHIPS.filter(
  (c) => c.key !== "gmailBulk" && c.key !== "onlyMine",
) as { key: GeoKey; label: string; explain: string }[];

/**
 * Selection is ink; ownership is the accent. Keeping those apart is what lets a
 * reader take “solid blue” to mean one thing only: this one is on your desk.
 */
function Chip({
  on,
  onClick,
  title,
  className,
  children,
}: {
  on: boolean;
  onClick: () => void;
  title?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "pressable inline-flex min-h-11 items-center rounded-full border px-4 text-[13.5px]",
        on
          ? "border-fg bg-fg font-medium text-bg"
          : "border-border bg-bg text-muted-fg hover:border-input hover:bg-muted hover:text-fg",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function RuleFilter({ rules, initial }: { rules: Rule[]; initial: Audience }) {
  /* The server already answered with `initial`, so hydration has nothing to
     re-decide and the first paint is the real list, not a spinner-shaped gate. */
  const serverSnapshot = useCallback(() => initial, [initial]);
  const a = useSyncExternalStore(subscribe, readAudience, serverSnapshot);
  const [copied, setCopied] = useState(false);
  const results = useRef<HTMLDivElement>(null);

  /* Module state outlives a client-side navigation, so coming back to /rules
     must re-read the URL rather than trust what the last visit left behind. */
  useEffect(() => {
    hydrated = false;
    readAudience();
    listeners.forEach((l) => l());
  }, []);

  const apply = useCallback((next: Audience) => persist(next, true), []);

  const set = useCallback(
    (patch: Partial<Audience>) => {
      apply({ ...readAudience(), ...patch });
    },
    [apply],
  );

  const pickRole = (preset: (typeof ROLE_PRESETS)[number]) => {
    const already = a.role === preset.audience.role;
    apply(already ? EMPTY_AUDIENCE : preset.audience);
    /* The answer is below the question, so take the reader to it. */
    if (already) return;
    const el = results.current;
    if (!el) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" });
  };

  const boost = useCallback((topic: string) => roleTopicBoost(topic, a.role), [a.role]);

  const shown = useMemo(
    () => sortForMarketer(rules.filter((r) => matchesAudience(r, a)), boost),
    [rules, a, boost],
  );
  const top = useMemo(() => topForYou(shown, 5, boost), [shown, boost]);
  const topSlugs = useMemo(() => new Set(top.map((r) => r.slug)), [top]);
  const rest = useMemo(() => shown.filter((r) => !topSlugs.has(r.slug)), [shown, topSlugs]);

  /* Work still on a person, then the reassurance. Both stay on the page. */
  const needsAPerson = (r: Rule) =>
    r.ownership === "yours" || r.ownership === "shared" || r.status === "upcoming";
  const restOpen = rest.filter(needsAPerson);
  const restDone = rest.filter((r) => !needsAPerson(r));

  const count = briefCounts(shown);
  const filtered = audienceActive(a);
  const geoOn = GEO_CHIPS.filter((c) => a[c.key]);

  /* Closed, the disclosure has to say what it is hiding. */
  const summary = [
    a.esp ? espLabel(a.esp) : "Any tool",
    geoOn.length ? geoOn.map((c) => c.label).join(", ") : "Everywhere",
    ...(a.gmailBulk ? ["big Gmail volume"] : []),
    ...(a.onlyMine ? ["only my desk"] : []),
  ].join(" · ");

  const espNote =
    a.esp === "klaviyo"
      ? "Klaviyo product pages — attribution, holdouts — stay in your list."
      : a.esp === "other"
        ? "Other or custom: no invented product screens. Global auth, consent and hygiene still apply."
        : a.esp
          ? `${espLabel(a.esp)}: the same inbox laws as everyone. Product pages written for other tools drop out.`
          : "Any tool hides nothing — every product page is in. Naming yours drops the ones written for somebody else.";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/rules${audienceToSearch(a)}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* */
    }
  };

  return (
    <>
      {/* One question on arrival. Everything else is opt-in, below, and closed. */}
      <section aria-labelledby="role-question" className="border-t border-fg/12 pt-9 sm:pt-11">
        <h2
          id="role-question"
          className="text-[clamp(1.4rem,3.4vw,1.9rem)] font-semibold tracking-tight"
        >
          What kind of email work do you do?
        </h2>
        <p className="mt-2.5 max-w-[52ch] text-[15px] leading-relaxed text-muted-fg">
          One tap opens the five that matter — not all <span className="num">{rules.length}</span>.
          Tap the same chip again to go back to everything.
        </p>
        <div className="mt-6 flex flex-wrap gap-2.5">
          {ROLE_PRESETS.map((p) => (
            <Chip
              key={p.id}
              on={a.role === p.audience.role}
              onClick={() => pickRole(p)}
              title={p.blurb}
              className="text-[14.5px]"
            >
              {p.label}
            </Chip>
          ))}
        </div>
      </section>

      {/* Closed by default, and honest about its own state while closed. */}
      <details className="faq-item group mt-7 rounded-xl border bg-card">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 px-4 py-3 outline-none marker:content-none focus-visible:bg-muted/60 [&::-webkit-details-marker]:hidden">
          <span className="shrink-0 text-[13.5px] font-medium">Refine</span>
          {/* Narrow screens get the state, not the descriptor — the state is the point. */}
          <span className="min-w-0 flex-1 truncate text-[13px] text-muted-fg">
            <span className="hidden sm:inline">email tool, where you send — </span>
            <span className="text-fg">{summary}</span>
          </span>
          <span
            aria-hidden
            className="num shrink-0 text-[13px] text-dim transition-transform duration-300 ease-out group-open:rotate-45"
          >
            +
          </span>
        </summary>
        <div className="faq-body">
          <div className="border-t px-4 pt-4 pb-5">
            <div role="group" aria-label="Email tool">
              <p className="label mb-2.5">Email tool</p>
              <div className="flex flex-wrap gap-2">
                <Chip on={!a.esp} onClick={() => set({ esp: "" })} title="No tool filter">
                  Any tool
                </Chip>
                {ESP_OPTIONS.map((o) => (
                  <Chip
                    key={o.id}
                    on={a.esp === o.id}
                    title={o.explain}
                    onClick={() => set({ esp: (a.esp === o.id ? "" : o.id) as EspId })}
                  >
                    {o.label}
                  </Chip>
                ))}
              </div>
              <p className="mt-2.5 max-w-[54ch] text-[12.5px] leading-relaxed text-dim">{espNote}</p>
            </div>

            <div className="mt-6" role="group" aria-label="Where you send">
              <p className="label mb-2.5">Where you send</p>
              <div className="flex flex-wrap gap-2">
                <Chip
                  on={geoOn.length === 0}
                  onClick={() => set({ eu: false, us: false, ca: false, uk: false, au: false })}
                  title="No geography filter — every place we cover"
                >
                  Everywhere
                </Chip>
                {GEO_CHIPS.map((c) => (
                  <Chip
                    key={c.key}
                    on={a[c.key]}
                    title={c.explain}
                    onClick={() => set({ [c.key]: !a[c.key] })}
                  >
                    {c.label}
                  </Chip>
                ))}
              </div>
              <p className="mt-2.5 max-w-[54ch] text-[12.5px] leading-relaxed text-dim">
                Everywhere is the default and it hides nothing. Naming a place narrows the list to
                it plus the provider rules that apply wherever you send. EU pulls ePrivacy and the
                French, German and Italian pages; the UK is its own.{" "}
                <Link href="/coverage" className="underline underline-offset-2 hover:text-fg">
                  Coverage map
                </Link>
                .
              </p>
            </div>

            <div className="mt-6" role="group" aria-label="Also true of your programme">
              <p className="label mb-2.5">Also true of you</p>
              <div className="flex flex-wrap gap-2">
                <Chip
                  on={a.gmailBulk}
                  onClick={() => set({ gmailBulk: !a.gmailBulk })}
                  title="Roughly 5,000 or more messages a day to Gmail addresses"
                >
                  {/* One flex child: a flex container drops whitespace between items. */}
                  <span>
                    <span className="num">5,000+</span>
                    {" a day to Gmail"}
                  </span>
                </Chip>
                <Chip
                  on={a.onlyMine}
                  onClick={() => set({ onlyMine: !a.onlyMine })}
                  title="Drop the rules your email tool already handles"
                >
                  Only my desk
                </Chip>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-1 border-t pt-3 text-[13px]">
              <button
                type="button"
                onClick={() => apply(EMPTY_AUDIENCE)}
                className="min-h-11 text-muted-fg underline underline-offset-3 hover:text-fg"
              >
                Clear everything
              </button>
              {filtered ? (
                <>
                  <button
                    type="button"
                    onClick={copyLink}
                    className="min-h-11 text-muted-fg underline underline-offset-3 hover:text-fg"
                  >
                    {copied ? "Link copied" : "Copy setup link"}
                  </button>
                  <span className="label">Saved here and in the URL</span>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </details>

      <p className="mt-7 text-[14px] leading-relaxed text-muted-fg" aria-live="polite">
        {filtered ? (
          <>
            <b className="num font-medium text-fg">{shown.length}</b> of{" "}
            <span className="num">{rules.length}</span> rules match your setup
          </>
        ) : (
          <>
            All <b className="num font-medium text-fg">{rules.length}</b> rules, nothing filtered
            out yet
          </>
        )}
        <span className="text-dim"> · </span>
        <b className="num font-medium text-fg">{count.act}</b> need you
        <span className="text-dim"> · </span>
        <b className="num font-medium text-fg">{count.shared}</b> shared with your tool
        <span className="text-dim"> · </span>
        {/* These two were added together and printed as "your tool already
            handles", which on the whole shelf says 6 while the homepage says
            exactly 1 — the same corpus, contradicting itself, on the one
            number the entire position rests on. Context is not handled: it is
            a risk you carry or a figure you report, and nobody did it for
            you. Kept apart, even though apart is the less flattering pair. */}
        <b className="num font-medium text-fg">{count.handled}</b> your tool already handles
        <span className="text-dim"> · </span>
        <b className="num font-medium text-fg">{count.fyi}</b> nothing to do today
        {count.upcoming > 0 ? (
          <>
            <span className="text-dim"> · </span>
            <b className="num font-medium text-fg">{count.upcoming}</b> not in force yet
          </>
        ) : null}
      </p>

      <div ref={results} className="scroll-mt-20">
        {shown.length === 0 ? (
          <p className="mt-8 rounded-xl border bg-bg-2 px-5 py-6 text-[15px] text-muted-fg">
            Nothing matches this setup.{" "}
            <button
              type="button"
              className="font-medium text-fg underline underline-offset-3"
              onClick={() => apply(EMPTY_AUDIENCE)}
            >
              Clear everything
            </button>{" "}
            and start again.
          </p>
        ) : (
          <>
            <section className="mt-8">
              <h2 className="text-[1.2rem] font-semibold tracking-tight">
                Open these <span className="num">{top.length}</span> first
              </h2>
              <p className="mt-1 max-w-[52ch] text-[14px] text-muted-fg">
                Highest signal for {a.role ? "your role" : "anyone sending email"}. Read, act or
                skip — then you&rsquo;re done for today.
              </p>
              <ul className="mt-4 list-none border-t border-fg/12 p-0">
                {top.map((r) => (
                  <RuleRow key={r.slug} rule={r} />
                ))}
              </ul>
              <div className="mt-6 rounded-xl border border-border-soft bg-bg-2 px-5 py-4 text-[14px] leading-relaxed text-muted-fg">
                <b className="font-semibold text-fg">Done for today?</b>{" "}
                If the five above are handled or honestly skipped, you&rsquo;re ahead of most
                programmes.{" "}
                <Link href="/brief" className="font-medium text-accent underline underline-offset-2">
                  Share a one-page brief
                </Link>
                {" · "}
                <Link href="/changed" className="underline underline-offset-2 hover:text-fg">
                  What moved
                </Link>
              </div>
            </section>

            {restOpen.length > 0 ? (
              <section className="mt-12">
                <h2 className="text-[1.05rem] font-semibold tracking-tight">
                  The rest that still needs a person
                </h2>
                <p className="mt-1 text-[13.5px] text-muted-fg">
                  <span className="num">{restOpen.length}</span> more, lower urgency. Skim when you
                  have time.
                </p>
                <ul className="mt-4 list-none border-t p-0">
                  {restOpen.map((r) => (
                    <RuleRow key={r.slug} rule={r} />
                  ))}
                </ul>
              </section>
            ) : null}

            {/* Reassurance, not homework — present, indexable, and folded away. */}
            {restDone.length > 0 ? (
              <details className="faq-item group mt-10 border-t pt-4">
                <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 outline-none marker:content-none focus-visible:bg-muted/60 [&::-webkit-details-marker]:hidden">
                  <span className="min-w-0 flex-1 text-[14px] text-muted-fg">
                    <span className="num font-medium text-fg">{restDone.length}</span> more your
                    email tool already handles, or that change nothing today
                  </span>
                  <span
                    aria-hidden
                    className="num shrink-0 text-[13px] text-dim transition-transform duration-300 ease-out group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <div className="faq-body">
                  <div>
                    <p className="max-w-[58ch] pt-2 pb-3 text-[13px] leading-relaxed text-dim">
                      Kept on the shelf because &ldquo;already covered&rdquo; is a real answer, and
                      the day someone asks, you want the dated page. Nothing here is on your desk.
                    </p>
                    <ul className="list-none border-t border-border-soft p-0">
                      {restDone.map((r) => (
                        <RuleRow key={r.slug} rule={r} compact />
                      ))}
                    </ul>
                  </div>
                </div>
              </details>
            ) : null}
          </>
        )}
      </div>
    </>
  );
}

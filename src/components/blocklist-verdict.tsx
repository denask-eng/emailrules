import Link from "next/link";
import type { Hit, ListReport } from "@/lib/blocklist-check";
import { describeStatus } from "@/lib/blocklist-check";
import { cn } from "@/lib/utils";
import { Signal } from "@/components/signal";

/**
 * The one screen this whole checker exists for.
 *
 * Every free blocklist tool renders its hits as a single flat list of red
 * rows. That is the failure. An entry on UCEPROTECT Level 3 — which lists a
 * provider's entire autonomous system — arrives looking exactly like an entry
 * on Spamhaus SBL, and a marketer who has never had to tell them apart reads
 * both as "I am blacklisted". They then spend a week, and sometimes money,
 * trying to remove an entry that was never about them and that they have no
 * standing to remove.
 *
 * So this component has three groups and the middle one is the product:
 * **Ignore this.** Nobody publishes an ignore list, because a tool whose job
 * is to alarm you cannot afford one. It is also the only group here that
 * needs an argument attached, which is why the reasoning sits inside it
 * rather than in a footnote.
 *
 * The counts are tabular and there is no score, here or anywhere: two tools
 * once graded the same campaign 85 and 40, and a number out of a hundred is
 * why nobody trusts this category.
 */

const GROUP = {
  act: {
    label: "Needs you",
    dot: "bg-live",
    rail: "border-live/45",
  },
  ignore: {
    label: "Ignore this",
    dot: "bg-dim",
    rail: "border-border",
  },
} as const;

function HitRow({
  hit,
  group,
}: {
  hit: Hit;
  group: keyof typeof GROUP;
}) {
  const tone = GROUP[group];
  return (
    <li className={cn("border-l-2 py-4 pl-4", tone.rail)}>
      <p className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <span className="text-[0.98rem] font-semibold">{hit.list.label}</span>
        <span className="num text-[12.5px] text-dim">has {hit.subject}</span>
      </p>
      <p className="mt-1.5 max-w-[62ch] text-[0.92rem] leading-relaxed text-muted-fg">
        {hit.list.describes}
      </p>
      <p className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[12.5px]">
        <a
          href={hit.list.delistUrl ?? hit.list.home}
          rel="nofollow noopener"
          className="text-fg underline decoration-1 underline-offset-3 hover:text-accent"
        >
          {hit.list.delisting === "network-owner"
            ? "Who can remove it →"
            : hit.list.delisting === "automatic"
              ? "How it expires →"
              : "How to request removal →"}
        </a>
        <span className="num text-dim">{hit.codes.join(", ")}</span>
      </p>
    </li>
  );
}

export function BlocklistVerdict({
  actionable,
  contextual,
  lists,
  checkedWhat,
  showHeadline = true,
}: {
  actionable: Hit[];
  contextual: Hit[];
  lists: ListReport[];
  /** "klaviyo.com", or the address a real message came from. */
  checkedWhat: string;
  /** Off where the page's own h1 is already the verdict, so it is not said
      twice in two different sizes a few lines apart. */
  showHeadline?: boolean;
}) {
  const answered = lists.filter((l) => l.status === "answered");
  const unanswered = lists.filter((l) => l.status !== "answered");
  const withEntry = new Set([...actionable, ...contextual].map((h) => h.list.id)).size;

  /* The sentence someone reads before anything else, and the only one that
     has to survive being read badly. */
  const headline =
    actionable.length === 0 && contextual.length === 0
      ? "Nothing has an entry for you."
      : actionable.length === 0
        ? `Nothing here needs you. ${contextual.length === 1 ? "One entry looks alarming and is not about you." : `${contextual.length} entries look alarming and are not about you.`}`
        : `${actionable.length} ${actionable.length === 1 ? "entry needs" : "entries need"} you${contextual.length ? `, and ${contextual.length} ${contextual.length === 1 ? "does" : "do"} not` : ""}.`;

  return (
    <section className="mt-12 border-t pt-9">
      <p className="label">Blocklists</p>
      {showHeadline ? (
        <h2 className="mt-3 max-w-[26ch] text-[clamp(1.35rem,3vw,1.75rem)] leading-tight tracking-tight">
          {headline}
        </h2>
      ) : null}

      {/* The arithmetic, said once, in the order a person would ask it.

          "0 with an entry" is the answer somebody came here for, and it was
          set in the same grey as everything around it. The count that carries
          the verdict now carries the verdict's colour and its glyph — green
          and a disc when nothing is listed, red and a cross when something
          is. The other two numbers stay quiet on purpose: they are the
          method, not the result. */}
      <p className="num mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[13px] text-muted-fg">
        <span>
          <b className="font-semibold text-fg">{answered.length}</b> lists asked
        </span>
        <span aria-hidden className="text-dim">
          ·
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5",
            withEntry === 0
              ? "border-ok/30 bg-ok-bg text-ok"
              : "border-live/30 bg-live-bg text-live",
          )}
        >
          <Signal state={withEntry === 0 ? "pass" : "fail"} size={8} label={false} />
          <b className="font-semibold">{withEntry}</b> with an entry
        </span>
        {unanswered.length ? (
          <>
            <span aria-hidden className="text-dim">
              ·
            </span>
            <span className="inline-flex items-center gap-1.5 text-dim">
              <Signal state="na" size={8} label={false} />
              {unanswered.length} could not be asked
            </span>
          </>
        ) : null}
      </p>

      {actionable.length ? (
        <div className="mt-8">
          <p className="flex items-center gap-2 text-[11px] font-medium tracking-[0.11em] text-live uppercase">
            <span className={cn("h-1.5 w-1.5 rounded-full", GROUP.act.dot)} aria-hidden />
            {GROUP.act.label}
          </p>
          <ul className="mt-3 list-none p-0">
            {actionable.map((hit) => (
              <HitRow key={`${hit.list.id}-${hit.subject}`} hit={hit} group="act" />
            ))}
          </ul>
        </div>
      ) : null}

      {contextual.length ? (
        <div className="mt-8">
          <p className="flex items-center gap-2 text-[11px] font-medium tracking-[0.11em] text-muted-fg uppercase">
            <span className={cn("h-1.5 w-1.5 rounded-full", GROUP.ignore.dot)} aria-hidden />
            {GROUP.ignore.label}
          </p>
          <ul className="mt-3 list-none p-0">
            {contextual.map((hit) => (
              <HitRow key={`${hit.list.id}-${hit.subject}`} hit={hit} group="ignore" />
            ))}
          </ul>
          {/* The argument, once, where it is earned. */}
          <p className="mt-4 max-w-[64ch] border-t border-border-soft pt-4 text-[13px] leading-relaxed text-dim">
            Every other checker we know of shows the entries above in the same red as the ones that
            matter. That is how a marketer ends up paying somebody to remove a listing that was
            never about them.
          </p>
        </div>
      ) : null}

      {!actionable.length && !contextual.length ? (
        <p className="mt-6 max-w-[62ch] text-[0.95rem] leading-relaxed text-muted-fg">
          {checkedWhat} is not on any of the {answered.length} lists that answered us today. That is
          the whole result — there is no score, and a clean answer is allowed to be short.
        </p>
      ) : null}

      {/* Open by default. This roster is the proof, not the appendix: the
          claim above is "nothing has an entry for you", and the only thing
          that makes it worth believing is seeing which lists were actually
          asked. Hiding it behind a click buried the credibility. */}
      <details className="group mt-8 border-t pt-4" open>
        <summary className="min-h-9 cursor-pointer list-none text-[13px] text-muted-fg hover:text-fg">
          <span className="underline decoration-dotted underline-offset-4">
            Which lists, and which would not answer
          </span>
        </summary>

        {/* The roster used to be twenty-three identical grey rows, which is
            unskimmable and — worse — made a clean sweep look like a list of
            nothing. The state carries a shape and the pass colour now, so the
            green column *is* the result: you read it without reading it. */}
        <ul className="mt-4 grid list-none gap-x-8 gap-y-0 p-0 text-[12.5px] sm:grid-cols-2">
          {lists.map((l) => {
            const ok = l.status === "answered";
            return (
              <li
                key={l.id}
                className="flex items-center justify-between gap-3 border-b border-border-soft py-1.5 last:border-b-0"
              >
                <span className="flex min-w-0 items-center gap-2">
                  {/* Never colour alone: a disc for answered, a dash for a
                      list that would not talk to us. */}
                  <Signal state={ok ? "pass" : "na"} size={8} label={false} />
                  <span className={cn("truncate", ok ? "text-fg" : "text-dim")}>{l.label}</span>
                </span>
                <span
                  className={cn(
                    "num shrink-0 text-[11px] tracking-[0.02em]",
                    /* "declined" was mustard, which read as a warning about
                       the reader. It is not — it is a list we could not ask,
                       and it should recede, not shout. */
                    ok ? "text-ok" : "text-dim",
                  )}
                >
                  {ok ? "answered" : describeStatus(l.status).split(" — ")[0]}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 max-w-[64ch] text-[12.5px] leading-relaxed text-dim">
          Each of these answered an entry it is required to publish, and one it is required not to,
          before we believed anything it said about you. A list that fails either is reported as
          unanswered rather than as clean — because a blocklist that declines to reply looks exactly
          like one giving you the all-clear.{" "}
          <Link href="/methodology" className="underline underline-offset-3 hover:text-fg">
            How we choose them
          </Link>
          .
        </p>
      </details>
    </section>
  );
}

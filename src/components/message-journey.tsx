import Link from "next/link";
import { Explained } from "@/components/explained";
import type { FindingOwnership } from "@/components/findings";
import type { Journey, JourneyStop } from "@/lib/message-journey";
import { stopVerdict } from "@/lib/message-journey";
import { OWNERSHIP, type Ownership } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Your campaign, walked through the eight stops.
 *
 * The explainer teaches email as a journey and it is the best page here. This
 * is that map drawn on the reader's own message: same eight stops, same
 * order, same numbers, except every stop now carries what actually happened
 * to the mail they just sent.
 *
 * The design decision that matters is the empty stops. Four of the eight
 * cannot be seen from one message, and the obvious move is to hide them. That
 * would be the lie: a journey missing its first stop reads as a journey where
 * the first stop went fine, and the first stop is consent, which is where
 * every serious problem in email is created. So they stay, numbered, greyed,
 * saying exactly why a message cannot show them. The gaps are the argument.
 */

const OWN_TONE: Record<Ownership, string> = {
  esp: "text-ok",
  shared: "text-soon",
  yours: "text-accent",
  context: "text-muted-fg",
};

const DOT: Record<string, string> = {
  fail: "bg-live",
  warn: "bg-soon",
  pass: "bg-ok",
  info: "bg-dim",
};

function Stop({
  stop,
  ruleTitles,
  ownership,
  claimed,
}: {
  stop: JourneyStop;
  ruleTitles: Record<string, string>;
  ownership?: Record<string, FindingOwnership>;
  claimed: Set<string>;
}) {
  const quiet = stop.unseeable;

  return (
    <li className="relative grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-4 pb-9 sm:grid-cols-[3rem_minmax(0,1fr)] sm:gap-x-6">
      {/* The spine. It is the only continuous line on the page and it is what
          makes eight separate verdicts read as one trip. */}
      <span
        aria-hidden
        className="absolute top-7 bottom-0 left-[0.72rem] w-px bg-border sm:left-[1.1rem]"
      />

      <span
        className={cn(
          "num relative z-10 flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-medium sm:h-[2.2rem] sm:w-[2.2rem] sm:text-[12px]",
          stop.fails
            ? "border-live bg-live text-white"
            : quiet
              ? "border-border bg-bg text-dim"
              : "border-fg bg-fg text-bg",
        )}
      >
        {String(stop.stage.n).padStart(2, "0")}
      </span>

      <div className="min-w-0 pt-0.5">
        <h3
          className={cn(
            "text-[1.05rem] leading-snug tracking-tight sm:text-[1.15rem]",
            quiet ? "font-medium text-muted-fg" : "font-semibold text-fg",
          )}
        >
          {stop.stage.name}
        </h3>
        <p
          className={cn(
            "mt-1.5 max-w-[62ch] text-[14px] leading-relaxed",
            quiet ? "text-dim" : stop.fails ? "text-live" : "text-muted-fg",
          )}
        >
          {stopVerdict(stop)}
        </p>

        {stop.findings.length ? (
          <ul className="mt-4 list-none space-y-4 p-0">
            {stop.findings.map((finding, i) => {
              const showsOwner =
                finding.rule && ownership?.[finding.rule] && !claimed.has(finding.rule);
              if (showsOwner && finding.rule) claimed.add(finding.rule);
              return (
                <li key={i} className="grid grid-cols-[9px_minmax(0,1fr)] items-start gap-3">
                  <span
                    aria-hidden
                    className={cn("mt-[7px] h-1.5 w-1.5 rounded-full", DOT[finding.severity])}
                  />
                  <div className="min-w-0">
                    <h4 className="text-[14.5px] leading-snug font-medium">
                      <Explained text={finding.title} />
                    </h4>
                    <Explained
                      as="p"
                      className="mt-1 max-w-[62ch] text-[13.5px] leading-relaxed text-muted-fg"
                      text={finding.detail}
                    />
                    {finding.evidence ? (
                      <pre className="num mt-2 overflow-x-auto rounded-lg border bg-bg-2 px-2.5 py-1.5 text-[11px] text-muted-fg">
                        {finding.evidence}
                      </pre>
                    ) : null}
                    {finding.rule ? (
                      <p className="mt-1.5 text-[12.5px] text-dim">
                        From{" "}
                        <Link
                          href={`/rules/${finding.rule}`}
                          className="text-fg underline decoration-1 underline-offset-3 hover:text-accent"
                        >
                          {ruleTitles[finding.rule] ?? "the rule this comes from"}
                        </Link>
                      </p>
                    ) : null}
                    {showsOwner && finding.rule && ownership?.[finding.rule] ? (
                      <div className="mt-2 border-l pl-3">
                        <p
                          className={cn(
                            "text-[12px] font-medium",
                            OWN_TONE[ownership[finding.rule].ownership],
                          )}
                        >
                          {OWNERSHIP[ownership[finding.rule].ownership].label}
                        </p>
                        <Explained
                          as="p"
                          className="mt-0.5 max-w-[58ch] text-[13px] leading-relaxed text-muted-fg"
                          text={ownership[finding.rule].mondayMorning}
                        />
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </li>
  );
}

export function MessageJourney({
  journey,
  ruleTitles,
  ownership,
}: {
  journey: Journey;
  ruleTitles: Record<string, string>;
  ownership?: Record<string, FindingOwnership>;
}) {
  /* One rule can speak at several stops. Its ownership verdict and Monday
     move belong to the rule, so they print once, at the first stop that
     raised it — which is the earliest point the reader could act. */
  const claimed = new Set<string>();

  return (
    <section className="mt-12">
      <p className="label">What happened to it</p>
      <h2 className="mt-3 max-w-[24ch] text-[clamp(1.5rem,3.4vw,2.15rem)] leading-tight tracking-tight">
        Your message, stop by stop.
      </h2>
      <p className="mt-3 max-w-[60ch] text-[14.5px] leading-relaxed text-muted-fg">
        The same eight stops{" "}
        <Link
          href="/how-email-works"
          className="text-fg underline decoration-1 underline-offset-3 hover:text-accent"
        >
          the explainer walks
        </Link>
        , drawn on the message you just sent. The stops a single message cannot show are still
        here, greyed, saying why.
      </p>

      <ol className="mt-10 list-none p-0">
        {journey.stops.map((stop) => (
          <Stop
            key={stop.stage.id}
            stop={stop}
            ruleTitles={ruleTitles}
            ownership={ownership}
            claimed={claimed}
          />
        ))}
      </ol>

      {journey.unplaced.length ? (
        <div className="mt-2 border-t pt-6">
          <p className="label">Also found</p>
          <ul className="mt-3 list-none space-y-3 p-0">
            {journey.unplaced.map((finding, i) => (
              <li key={i} className="grid grid-cols-[9px_minmax(0,1fr)] items-start gap-3">
                <span
                  aria-hidden
                  className={cn("mt-[7px] h-1.5 w-1.5 rounded-full", DOT[finding.severity])}
                />
                <div className="min-w-0">
                  <h4 className="text-[14.5px] leading-snug font-medium">
                    <Explained text={finding.title} />
                  </h4>
                  <Explained
                    as="p"
                    className="mt-1 max-w-[62ch] text-[13.5px] leading-relaxed text-muted-fg"
                    text={finding.detail}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

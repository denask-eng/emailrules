import Link from "next/link";
import { GLOSSARY, OWNER_LABEL, type TermOwner } from "@/content/how-email-works";
import { cn } from "@/lib/utils";

/* Scoped keyframes rather than globals.css, which another branch is editing.
   A proportion should arrive as a proportion, so the segments grow from zero
   once. Dead under prefers-reduced-motion. */
const MOTION = `
@keyframes glo-grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
.glo-seg { transform-origin: left; animation: glo-grow 0.9s cubic-bezier(0.22,1,0.36,1) both; }
@media (prefers-reduced-motion: reduce) { .glo-seg { animation: none; transform: none; } }`;

const SPLIT_ORDER: TermOwner[] = ["yours", "shared", "esp", "context"];
const SPLIT_TONE: Record<TermOwner, { fill: string; text: string }> = {
  yours: { fill: "bg-accent", text: "text-accent" },
  shared: { fill: "bg-soon", text: "text-soon" },
  esp: { fill: "bg-ok", text: "text-ok" },
  context: { fill: "bg-dim", text: "text-muted-fg" },
};

/**
 * The thesis of the entire site, applied to its own vocabulary: a good share
 * of what frightens people is already done for them, and nobody who sells
 * deliverability software is able to say so. Counted from the corpus rather
 * than typed, so it can never drift from the pages it describes.
 *
 * One bar per row, all on the same scale, rather than one stacked bar with a
 * legend underneath. A stacked bar forces the labels into a grid that cannot
 * line up with proportional segments — the label for a 12% slice either sits
 * under the wrong slice or gets truncated — and the misalignment is the first
 * thing anyone sees. Rows cannot misalign, and they still carry the
 * comparison, which was the only job the stack was doing.
 */
export function OwnershipSplit() {
  const total = GLOSSARY.length;
  const counts = SPLIT_ORDER.map((o) => ({
    owner: o,
    n: GLOSSARY.filter((t) => t.owner === o).length,
  }));
  const notYours = counts
    .filter((c) => c.owner === "esp" || c.owner === "context")
    .reduce((a, c) => a + c.n, 0);
  const max = Math.max(...counts.map((c) => c.n));

  return (
    <section className="mt-14 border-t pt-9 sm:mt-20 sm:pt-12">
      <style>{MOTION}</style>
      <p className="label">Before you read any of it</p>

      {/* One element at real scale. A page where the largest thing after the
          h1 is 15px has no subject; the count is the subject here, and it is
          the most shareable true sentence this site owns. */}
      <div className="mt-5 grid gap-x-10 gap-y-2 lg:grid-cols-[auto_1fr] lg:items-start">
        <p
          className="num leading-[0.82] font-semibold tracking-[-0.05em] text-accent"
          style={{ fontSize: "clamp(4rem,11vw,7rem)" }}
        >
          {notYours}
        </p>
        <div className="lg:pt-2">
          <h2 className="max-w-[20ch] text-[clamp(1.5rem,3.4vw,2.15rem)] leading-[1.06] font-semibold tracking-tight">
            of these {total} words are not your problem
          </h2>
          <p className="mt-4 max-w-[48ch] text-[15.5px] leading-relaxed text-muted-fg">
            Already handled by the platform, or impossible to act on at all. Knowing which is
            which is most of the job, and it is the one thing nobody who sells deliverability
            software is able to tell you.
          </p>
        </div>
      </div>

      <dl className="mt-8 sm:mt-12">
        {counts.map((c, i) => (
          <div
            key={c.owner}
            className={cn(
              "grid items-baseline gap-x-6 gap-y-2 border-b border-border-soft py-4 last:border-b-0",
              "sm:grid-cols-[3.5rem_8rem_10rem_1fr]",
            )}
          >
            <dd
              className={cn(
                "num text-[26px] leading-none font-semibold tabular-nums",
                SPLIT_TONE[c.owner].text,
              )}
            >
              {c.n}
            </dd>
            <dt className={cn("text-[14.5px] font-semibold", SPLIT_TONE[c.owner].text)}>
              {OWNER_LABEL[c.owner].short}
            </dt>

            {/* Same scale on every row, so the lengths mean something. */}
            <dd className="hidden items-center sm:flex">
              <span className="relative h-2 w-full overflow-hidden rounded-full bg-bg-2">
                <span
                  className={cn(
                    "glo-seg absolute inset-y-0 left-0 rounded-full",
                    SPLIT_TONE[c.owner].fill,
                  )}
                  style={{ width: `${(c.n / max) * 100}%`, animationDelay: `${i * 90}ms` }}
                />
              </span>
            </dd>

            <dd className="text-[13.5px] leading-relaxed text-muted-fg">
              {OWNER_LABEL[c.owner].long}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */

const HISTORY: { k: string; young: string; old: string }[] = [
  {
    k: "What the provider knows about you",
    young: "Nothing. You did not exist last month.",
    old: "Months of how real people reacted.",
  },
  {
    k: "Volume it will accept",
    young: "Small, and rising only while complaints stay flat.",
    old: "Absorbs a spike without comment.",
  },
  {
    k: "One bad send",
    young: "Can define you. There is nothing else to average against.",
    old: "Diluted by history, but it still costs you.",
  },
  {
    k: "Perfect SPF, DKIM, DMARC",
    young: "Required. Not enough.",
    old: "Required. Not enough.",
  },
  {
    k: "Getting it back",
    young: "Days, if you catch it in the first week.",
    old: "Weeks. There is more record to unwind.",
  },
];

/**
 * The correction to the reading everyone takes from an authentication
 * diagram. Two senders, identical DNS, identical message, different outcome —
 * because the question at stop five is not who you are, it is what you have
 * done before. A senior deliverability person will forgive a glossary for
 * being simple. They will not forgive it for implying that a green DMARC row
 * buys inbox placement at any volume, which is what every checklist on the
 * internet quietly implies.
 */
export function SenderHistory() {
  return (
    <figure
      className="overflow-hidden rounded-xl border border-border bg-card"
      style={{ boxShadow: "var(--lift)" }}
    >
      <figcaption className="border-b border-border-soft bg-bg-2 px-4 py-2.5 sm:px-5">
        <span className="label text-[0.6rem]">Why the same setup gives two answers</span>
        <p className="mt-1 text-[13px] leading-snug text-muted-fg">
          Identical authentication, identical message, different sender history
        </p>
      </figcaption>

      <div className="px-4 py-4 sm:px-5">
        <div className="hidden grid-cols-[13rem_1fr_1fr] gap-x-5 border-b border-border pb-2 sm:grid">
          <span />
          <span className="label text-[0.58rem]">New domain, 3 weeks old</span>
          <span className="label text-[0.58rem] text-accent">Two years, engaged list</span>
        </div>

        {HISTORY.map((r) => (
          <div
            key={r.k}
            className="border-b border-border-soft py-3 last:border-b-0 sm:grid sm:grid-cols-[13rem_1fr_1fr] sm:gap-x-5"
          >
            <p className="text-[13px] font-semibold text-fg sm:text-[13.5px]">{r.k}</p>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-fg sm:mt-0">
              <span className="num mr-1.5 text-[10.5px] text-dim sm:hidden">NEW</span>
              {r.young}
            </p>
            <p className="mt-1 text-[13.5px] leading-relaxed text-muted-fg sm:mt-0">
              <span className="num mr-1.5 text-[10.5px] text-accent sm:hidden">2YR</span>
              {r.old}
            </p>
          </div>
        ))}
      </div>

      <p className="border-t border-border-soft bg-bg-2 px-4 py-3 text-[13px] leading-relaxed text-muted-fg sm:px-5">
        Both pass every check at stop 4. Only one of them gets the benefit of the doubt at stop 5,
        and no DNS record you can publish will close that gap.{" "}
        <Link href="/how-email-works/warmup" className="font-medium text-accent underline underline-offset-2">
          Warm-up
        </Link>{" "}
        is how the left column becomes the right one.
      </p>
    </figure>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */

const CHECKS = [
  {
    n: "1",
    name: "SPF",
    asks: "Was this server allowed to send?",
    reads: "mail.esp-vendor.com",
    reading: "the invisible envelope, not the From line",
    verdict: "pass",
    ok: true,
  },
  {
    n: "2",
    name: "DKIM",
    asks: "Is the signature valid and untampered?",
    reads: "esp-vendor.com",
    reading: "the domain that signed, which need not be yours",
    verdict: "pass",
    ok: true,
  },
  {
    n: "3",
    name: "Alignment",
    asks: "Does either of those belong to aurora.com?",
    reads: "neither",
    reading: "the step almost every explainer leaves out",
    verdict: "no",
    ok: false,
  },
];

/**
 * Two green ticks and a failure, drawn once so it never has to be explained
 * again. The example is a correctly-signed message from a platform that
 * signs with its own domain, which is the single most common silent
 * deliverability failure in existence.
 */
export function AuthLadder() {
  return (
    <figure
      className="overflow-hidden rounded-xl border border-border bg-card"
      style={{ boxShadow: "var(--lift)" }}
    >
      <figcaption className="border-b border-border-soft bg-bg-2 px-4 py-2.5 sm:px-5">
        <span className="label text-[0.6rem]">The check that fails silently</span>
        <p className="mt-1 text-[13px] leading-snug text-muted-fg">
          Why a message sits in spam while every dashboard is green
        </p>
      </figcaption>

      <div className="px-4 py-5 sm:px-5">
        <p className="label text-[0.58rem]">What the human sees</p>
        <p className="num mt-2 overflow-x-auto text-[12.5px] whitespace-pre text-fg sm:text-[13.5px]">
          From: Aurora Coffee &lt;hello@
          <span className="rounded-[3px] bg-accent-soft px-[3px] font-semibold text-accent">
            aurora.com
          </span>
          &gt;
        </p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-fg">
          The only address a recipient will ever read. Everything below exists to decide whether to
          believe it.
        </p>

        <p className="label mt-7 text-[0.58rem]">What the receiver asks, in order</p>
        <ol className="mt-2.5 list-none p-0">
          {CHECKS.map((c) => (
            <li
              key={c.n}
              className="grid grid-cols-[1.4rem_1fr_auto] items-baseline gap-x-3 gap-y-1 border-b border-border-soft py-3 last:border-b-0"
            >
              <span className="num text-[11px] text-dim">{c.n}</span>
              <div className="min-w-0">
                <span className="num text-[12.5px] font-semibold tracking-tight text-fg">
                  {c.name}
                </span>
                <span className="ml-2 text-[13.5px] text-fg">{c.asks}</span>
                <p className="mt-1 text-[12.5px] leading-relaxed text-muted-fg">
                  Reads{" "}
                  <span className="num text-[12px] text-fg">{c.reads}</span> &mdash; {c.reading}.
                </p>
              </div>
              <span
                className={cn(
                  "num rounded-full border px-2 py-0.5 text-[10.5px] font-medium",
                  c.ok
                    ? "border-ok/30 bg-ok-bg text-ok"
                    : "border-live/25 bg-live-bg text-live",
                )}
              >
                {c.verdict}
              </span>
            </li>
          ))}
        </ol>

        <div className="mt-5 rounded-lg border border-border bg-bg-2 px-4 py-3.5">
          <p className="label text-[0.58rem]">4 &middot; DMARC decides what happens next</p>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-fg">
            Nothing that passed belongs to <span className="num text-[12.5px]">aurora.com</span>, so
            DMARC fails. What that costs you is whatever your own DNS record says it costs.
          </p>
          <dl className="mt-3 grid gap-y-1.5 text-[12.5px] sm:grid-cols-3 sm:gap-x-4">
            {[
              ["p=none", "delivered anyway, and you are told nothing"],
              ["p=quarantine", "spam folder"],
              ["p=reject", "refused at the door"],
            ].map(([k, v]) => (
              <div key={k} className="flex gap-2 sm:block">
                <dt className="num shrink-0 font-semibold text-fg sm:text-[12px]">{k}</dt>
                <dd className="text-muted-fg sm:mt-0.5">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <p className="border-t border-border-soft bg-bg-2 px-4 py-3 text-[13px] leading-relaxed text-muted-fg sm:px-5">
        Both checks passed. The message still fails, because passing and belonging are different
        questions and only the second one is about you.{" "}
        <Link href="/how-email-works/alignment" className="font-medium text-accent underline underline-offset-2">
          Alignment, in full
        </Link>
        . And when all four rows are green, nothing here has yet decided the folder &mdash; that is
        the next stop.
      </p>
    </figure>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * A published line, drawn to scale, with your position on it.
 *
 * Used by exactly two terms, because exactly two of them are measured against
 * a number a provider actually publishes. Drawing a scale for a threshold
 * nobody publishes would be the fake precision this site exists to argue
 * against, so the other arithmetic stays as a plate.
 *
 * The scale does the teaching. Gmail's bulk threshold sits at five percent of
 * the width of one ordinary campaign, and a spam rate you are allowed to have
 * is three tenths of one percent — neither of those lands until you see how
 * little room there is.
 */
export function Threshold({
  gauge,
}: {
  gauge: NonNullable<import("@/content/how-email-works").GlossaryTerm["gauge"]>;
}) {
  const pct = (n: number) => Math.min(100, Math.max(0, (n / gauge.max) * 100));

  return (
    <figure
      className="overflow-hidden rounded-xl border border-border bg-card"
      style={{ boxShadow: "var(--lift)" }}
    >
      <style>{MOTION}</style>
      <figcaption className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 border-b border-border-soft bg-bg-2 px-4 py-2.5 sm:px-5">
        <span className="label text-[0.6rem]">To scale</span>
        <span className="text-[12.5px] leading-snug text-muted-fg">{gauge.label}</span>
      </figcaption>

      <div className="px-5 pt-9 pb-5 sm:px-7">
        <div className="relative">
          {/* You, above the line. */}
          <div
            className="absolute -top-7 flex -translate-x-1/2 flex-col items-center whitespace-nowrap"
            style={{ left: `${pct(gauge.you.at)}%` }}
          >
            <span className="num text-[12px] font-semibold text-live">{gauge.fmt(gauge.you.at)}</span>
            <span aria-hidden className="mt-0.5 h-2.5 w-px bg-live" />
          </div>

          <div className="relative h-2 overflow-hidden rounded-full bg-bg-2">
            <span
              className="glo-seg absolute inset-y-0 left-0 rounded-full bg-live/80"
              style={{ width: `${pct(gauge.you.at)}%` }}
            />
          </div>

          {/* The published marks, below the line. */}
          {gauge.marks.map((m) => (
            <div
              key={m.label}
              className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
              style={{ left: `${pct(m.at)}%` }}
            >
              <span
                aria-hidden
                className={cn("h-4 w-px", m.hard ? "bg-fg" : "bg-dim")}
                style={{ marginTop: "-0.25rem" }}
              />
              <span
                className={cn(
                  "num mt-1 text-[11.5px] font-semibold whitespace-nowrap",
                  m.hard ? "text-fg" : "text-dim",
                )}
              >
                {gauge.fmt(m.at)}
              </span>
            </div>
          ))}
        </div>

        <ul className="mt-14 list-none space-y-1.5 p-0">
          <li className="flex items-baseline gap-2.5 text-[13px]">
            <span aria-hidden className="mt-1 h-2 w-2 shrink-0 rounded-full bg-live" />
            <span className="text-muted-fg">{gauge.you.label}</span>
          </li>
          {gauge.marks.map((m) => (
            <li key={m.label} className="flex items-baseline gap-2.5 text-[13px]">
              <span
                aria-hidden
                className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", m.hard ? "bg-fg" : "bg-dim")}
              />
              <span className="text-muted-fg">
                <span className="num font-semibold text-fg">{gauge.fmt(m.at)}</span> &mdash;{" "}
                {m.label}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="border-t border-border-soft bg-bg-2 px-4 py-3 text-[13px] leading-relaxed text-muted-fg sm:px-5">
        {gauge.note}
      </p>
    </figure>
  );
}

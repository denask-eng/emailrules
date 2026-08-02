"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  type Audience,
  EMPTY_AUDIENCE,
  ROLE_PRESETS,
  audienceActive,
  audienceToSearch,
  espLabel,
  matchesAudience,
  parseAudienceParam,
  readStoredAudience,
  roleTopicBoost,
} from "@/lib/audience";
import { briefCounts, impactOf, IMPACT_LABEL, sortForMarketer } from "@/lib/rule-signals";
import { displayTldr } from "@/content/plain-overrides";
import { OWNERSHIP } from "@/lib/types";
import type { Ownership, Topic, Jurisdiction, Rule } from "@/lib/types";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type LightRule = {
  slug: string;
  title: string;
  plain: string;
  ownership: Ownership;
  status: Rule["status"];
  topic: Topic;
  jurisdictions: Jurisdiction[];
  provider?: string;
  esp?: import("@/lib/types").EspApplicability;
  ignoreIf?: string;
  mondayMorning: string;
  effectiveDate: string;
  added: string;
  updated: string;
  lastVerified: string;
  changelog: Rule["changelog"];
};

function readAudience(): Audience {
  if (typeof window === "undefined") return EMPTY_AUDIENCE;
  try {
    const fromUrl = parseAudienceParam(window.location.search);
    if (fromUrl && audienceActive(fromUrl)) return fromUrl;
    return readStoredAudience();
  } catch {
    /* */
  }
  return EMPTY_AUDIENCE;
}

function roleLabel(a: Audience): string {
  const p = ROLE_PRESETS.find((x) => x.audience.role === a.role);
  if (p) return p.label;
  if (!audienceActive(a)) return "All marketers (no filter saved yet)";
  const bits: string[] = [];
  if (a.esp) bits.push(espLabel(a.esp));
  if (a.eu) bits.push("EU");
  if (a.us) bits.push("US");
  if (a.uk) bits.push("UK");
  if (a.ca) bits.push("Canada");
  if (a.au) bits.push("Australia");
  if (a.gmailBulk) bits.push("Gmail bulk");
  if (a.onlyMine) bits.push("desk-only");
  return bits.join(" · ") || "Custom setup";
}

/**
 * The move, cut to its first sentence and capped.
 *
 * `mondayMorning` runs to three hundred characters on some rules — right for a
 * rule page, wrong for a stand-up. A line that wraps four times in Slack is a
 * paragraph, and nobody skims a paragraph. The full text is one click away.
 */
function firstMove(s: string): string {
  const one = (s.trim().split(/(?<=[.!?])\s+/)[0] ?? s.trim()).trim();
  if (one.length <= 120) return one;
  const cut = one.slice(0, 120);
  /* Prefer the last clause boundary. A cut left hanging on "and" reads as a bug
     rather than a summary. */
  const clause = Math.max(cut.lastIndexOf(", "), cut.lastIndexOf("; "));
  const at = clause > 70 ? clause : cut.replace(/[\s,;:—–-]+\S*$/, "").length;
  return `${one.slice(0, at).trimEnd()}…`;
}

/** Titles carry ampersands and quotes; a share message is not a place to trust them. */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toSortable(r: LightRule): Rule {
  return {
    ...r,
    question: r.title,
    answer: r.plain,
    appliesTo: "",
    whatToDo: [],
    handled: { already: "" },
    enforcement: "",
    sources: [],
  };
}

export function BriefClient({ rules }: { rules: LightRule[] }) {
  const [a, setA] = useState<Audience>(EMPTY_AUDIENCE);
  const [label, setLabel] = useState("");
  const [copied, setCopied] = useState<"link" | "slack" | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setA(readAudience());
    try {
      const q = new URLSearchParams(window.location.search);
      const c = q.get("label") || q.get("client");
      if (c) setLabel(decodeURIComponent(c).slice(0, 80));
    } catch {
      /* */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    const params = new URLSearchParams(
      audienceToSearch(a).startsWith("?") ? audienceToSearch(a).slice(1) : audienceToSearch(a),
    );
    if (label.trim()) params.set("label", label.trim());
    else {
      params.delete("label");
      params.delete("client");
    }
    const s = params.toString();
    const next = `${window.location.pathname}${s ? `?${s}` : ""}`;
    const cur = `${window.location.pathname}${window.location.search}`;
    if (next !== cur) window.history.replaceState(null, "", next);
  }, [a, label, hydrated]);

  const filtered = useMemo(() => {
    return rules.filter((r) => matchesAudience(r, a)).map(toSortable);
  }, [rules, a]);

  const boost = (topic: string) => roleTopicBoost(topic, a.role);
  const sorted = useMemo(() => sortForMarketer(filtered, boost), [filtered, a.role]);
  const top = useMemo(() => {
    const priority = sorted.filter(
      (r) => r.ownership === "yours" || r.status === "upcoming" || r.ownership === "shared",
    );
    const pick = priority.length >= 5 ? priority : sorted;
    return pick.slice(0, 5);
  }, [sorted]);
  const counts = briefCounts(filtered);
  const today = new Date().toISOString().slice(0, 10);

  const shareUrl = () => {
    if (typeof window === "undefined") return "https://emailrules.today/brief";
    const params = new URLSearchParams(
      audienceToSearch(a).startsWith("?") ? audienceToSearch(a).slice(1) : audienceToSearch(a),
    );
    if (label.trim()) params.set("label", label.trim());
    const s = params.toString();
    return `${window.location.origin}/brief${s ? `?${s}` : ""}`;
  };

  const titleLine = label.trim() || "Email rules brief";

  /**
   * One message, two renderings.
   *
   * Both come off this model so the rich version and the plain one can never
   * say different things. Five items, one line each, and exactly one bare URL
   * in the whole message: Slack unfurls bare links, not linked text, so five
   * rule URLs bought five previews and a "Only the first 5 link previews are
   * shown" apology. The brief is the link worth previewing.
   */
  const briefMessage = () => ({
    title: titleLine,
    filter: roleLabel(a),
    date: today,
    tally: `Of ${counts.total} rules in this filter: ${counts.act} need a person, ${counts.shared} shared with your email tool, ${counts.handled + counts.fyi} handled or FYI, ${counts.upcoming} upcoming.`,
    items: top.map((r, i) => ({
      n: i + 1,
      title: r.title,
      href: `https://emailrules.today/rules/${r.slug}`,
      move: firstMove(r.mondayMorning),
    })),
    tail: "Full brief, sources and dates — not legal advice:",
    url: shareUrl(),
  });

  /**
   * Slack's composer only parses mrkdwn for messages posted through the API.
   * This one is pasted, so `<url|Title>` reached the channel as a literal angle
   * bracket, a bare link and an orphaned title. Pasted HTML it does convert —
   * into its own rich text, with real hyperlinks and real bold.
   */
  const shareHtml = () => {
    const m = briefMessage();
    const line = (html: string) => `<div>${html}</div>`;
    const gap = "<div><br></div>";
    return [
      "<div>",
      line(`<b>${esc(m.title)}</b> · ${esc(m.filter)} · as of ${esc(m.date)}`),
      line(esc(m.tally)),
      gap,
      line("<b>Open these five first</b>"),
      ...m.items.map((it) =>
        line(
          `${it.n}. <a href="${esc(it.href)}">${esc(it.title)}</a> — <b>Do first:</b> ${esc(it.move)}`,
        ),
      ),
      gap,
      line(`${esc(m.tail)} ${esc(m.url)}`),
      "</div>",
    ].join("");
  };

  /** The same message for anywhere that is not Slack. No markup syntax in it. */
  const sharePlain = () => {
    const m = briefMessage();
    return [
      `${m.title} · ${m.filter} · as of ${m.date}`,
      m.tally,
      "",
      "Open these five first",
      ...m.items.map((it) => `${it.n}. ${it.title} — Do first: ${it.move}`),
      "",
      `${m.tail} ${m.url}`,
    ].join("\n");
  };

  const copy = (kind: "link" | "slack") => {
    const done = () => {
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    };
    const plain = kind === "link" ? shareUrl() : sharePlain();
    const fallback = () => {
      /* A copy button that throws is worse than one that pastes plain text. */
      navigator.clipboard?.writeText?.(plain).then(done, () => {});
    };

    /* Nothing may be awaited before the write or Safari drops the user gesture
       with it, and neither ClipboardItem nor clipboard.write is universal. */
    if (kind === "slack" && typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
      try {
        const item = new ClipboardItem({
          "text/html": new Blob([shareHtml()], { type: "text/html" }),
          "text/plain": new Blob([plain], { type: "text/plain" }),
        });
        navigator.clipboard.write([item]).then(done, fallback);
        return;
      } catch {
        /* The constructor exists but refused the types — plain text still works. */
      }
    }
    fallback();
  };

  return (
    <div className="brief-sheet shell shell-tight py-10 sm:py-14">
      <div className="no-print mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="label">One-page brief</p>
          <h1 className="mt-1 text-[clamp(1.6rem,4vw,2.2rem)] font-semibold tracking-tight">
            Send this to your team
          </h1>
          <p className="mt-2 max-w-[48ch] text-[14px] text-muted-fg">
            From your saved setup. Slack paste or print PDF. Optional title for the stand-up — not a
            multi-client CRM.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => copy("link")}
            className={cn(buttonVariants({ variant: "outline" }), "h-10 rounded-full px-4")}
          >
            {copied === "link" ? "Link copied" : "Copy link"}
          </button>
          <button
            type="button"
            onClick={() => copy("slack")}
            className={cn(buttonVariants({ variant: "outline" }), "h-10 rounded-full px-4")}
          >
            {copied === "slack" ? "Copied" : "Copy for Slack"}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className={cn(buttonVariants(), "h-10 rounded-full px-4 font-medium")}
          >
            Print / PDF
          </button>
          <Link
            href="/rules"
            className={cn(buttonVariants({ variant: "outline" }), "h-10 rounded-full px-4")}
          >
            Change setup
          </Link>
        </div>
      </div>

      <div className="no-print mb-6">
        <label className="label" htmlFor="brief-label">
          Optional title (for PDF / Slack)
        </label>
        <input
          id="brief-label"
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value.slice(0, 80))}
          placeholder="e.g. Q3 stand-up or Brand X — leave blank if solo"
          className="mt-2 h-11 w-full max-w-md rounded-xl border bg-card px-3.5 text-[14px] outline-none focus-visible:border-accent"
        />
      </div>

      {hydrated && !audienceActive(a) ? (
        <div className="no-print mb-8 rounded-xl border border-soon/40 bg-soon-bg px-5 py-4 text-[14px] text-muted-fg">
          No setup saved — showing <b className="text-fg">everything</b>.{" "}
          <Link href="/rules" className="font-medium text-fg underline underline-offset-2">
            Pick your role
          </Link>{" "}
          for a sharp brief.
        </div>
      ) : null}

      <header className="border-b pb-6">
        <p className="num text-[12px] text-dim">emailrules.today · as of {today}</p>
        {label.trim() ? (
          <p className="brief-label mt-2 text-[1.5rem] font-semibold tracking-tight">
            {label.trim()}
          </p>
        ) : null}
        <h2
          className={cn(
            "font-semibold tracking-tight",
            label.trim() ? "mt-1 text-[1.05rem] text-muted-fg" : "mt-2 text-[1.35rem]",
          )}
        >
          {roleLabel(a)}
        </h2>
        <p className="mt-2 max-w-[60ch] text-[14px] leading-relaxed text-muted-fg">
          Of <b className="text-fg">{counts.total}</b> rules in this filter,{" "}
          <b className="text-fg">{counts.act}</b> need a person,{" "}
          <b className="text-fg">{counts.shared}</b> shared with your email tool,{" "}
          <b className="text-fg">{counts.handled + counts.fyi}</b> handled or FYI,{" "}
          <b className="text-fg">{counts.upcoming}</b> upcoming.
        </p>
      </header>

      <section className="mt-8">
        <h3 className="text-[1.05rem] font-semibold">Open these five first</h3>
        <p className="mt-1 text-[13px] text-muted-fg">Highest signal — not the full shelf.</p>
        <ol className="mt-5 list-none space-y-0 border-t p-0">
          {top.map((r, i) => (
            <li key={r.slug} className="brief-row border-b py-4">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="num text-[12px] text-dim">{String(i + 1).padStart(2, "0")}</span>
                <span className="rounded-full border bg-bg-2 px-2 py-0.5 text-[10.5px] font-medium">
                  {IMPACT_LABEL[impactOf(r)]}
                </span>
                <span className="text-[11px] font-medium text-muted-fg">
                  {OWNERSHIP[r.ownership].short}
                </span>
              </div>
              <Link
                href={`/rules/${r.slug}`}
                className="mt-1.5 block text-[15.5px] font-semibold leading-snug underline-offset-2 hover:underline"
              >
                {r.title}
              </Link>
              <p className="mt-1.5 max-w-[62ch] text-[13.5px] leading-relaxed text-muted-fg">
                {displayTldr(r.slug, r.plain)}
              </p>
              <p className="mt-1 max-w-[62ch] text-[12.5px] text-dim">
                <b className="text-muted-fg">Do first: </b>
                {r.mondayMorning}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* Instructions for using the website are dead weight on paper, and the
          sheet only earns the name "one-page brief" if the five rules and the
          counts fit on the page. The line below carries what a printed handout
          actually needs from this box. */}
      <section className="no-print mt-10 rounded-xl border bg-bg-2 px-5 py-5 text-[13.5px] leading-relaxed text-muted-fg">
        <p>
          <b className="text-fg">How to use: </b>
          Slack, print, or walk the five links. Full rules have plain English, whose job, and
          sources.
        </p>
        <p className="mt-2">Not legal advice. Independent — no scores, no seed tests for sale.</p>
      </section>

      {/* Our own footer, so the sheet says where it came from without printing
          the site's nav, byline and contact block as a second page. Hidden on
          screen; the print block turns it back on. */}
      <p className="brief-print-footer hidden">
        <span className="num">{today}</span> · {roleLabel(a)} ·{" "}
        <span className="num">
          {hydrated ? shareUrl().replace(/^https?:\/\//, "") : "emailrules.today/brief"}
        </span>{" "}
        · <span className="whitespace-nowrap">Not legal advice</span>
      </p>
    </div>
  );
}

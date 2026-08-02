"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  type Audience,
  EMPTY_AUDIENCE,
  STORAGE_KEY,
  ROLE_PRESETS,
  audienceActive,
  audienceToSearch,
  matchesAudience,
  parseAudienceParam,
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
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...EMPTY_AUDIENCE, ...(JSON.parse(raw) as Partial<Audience>) };
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
  if (a.eu) bits.push("EU");
  if (a.us) bits.push("US");
  if (a.uk) bits.push("UK");
  if (a.ca) bits.push("Canada");
  if (a.au) bits.push("Australia");
  if (a.klaviyo) bits.push("Klaviyo");
  if (a.gmailBulk) bits.push("Gmail bulk");
  if (a.onlyMine) bits.push("desk-only");
  return bits.join(" · ") || "Custom setup";
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
  const [copied, setCopied] = useState<"link" | "slack" | null>(null);
  /* true after client reads localStorage / URL so we do not flash wrong filters */
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setA(readAudience());
    setHydrated(true);
  }, []);

  /* Keep the address bar shareable so “copy link” always includes setup. */
  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    const qs = audienceToSearch(a);
    const next = `${window.location.pathname}${qs}`;
    const cur = `${window.location.pathname}${window.location.search}`;
    if (next !== cur) {
      window.history.replaceState(null, "", next);
    }
  }, [a, hydrated]);

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
    return `${window.location.origin}/brief${audienceToSearch(a)}`;
  };

  const slackText = () => {
    const lines = [
      `*Email rules brief* · ${roleLabel(a)} · as of ${today}`,
      `${counts.act} need a person · ${counts.shared} shared with ESP · ${counts.handled + counts.fyi} handled/FYI · ${counts.upcoming} upcoming`,
      ``,
      `*Open these five first:*`,
      ...top.map((r, i) => {
        const tldr = displayTldr(r.slug, r.plain);
        return `${i + 1}. <https://emailrules.today/rules/${r.slug}|${r.title}>\n   ${tldr}\n   _Do first:_ ${r.mondayMorning}`;
      }),
      ``,
      `Full one-pager: ${shareUrl()}`,
      `_Not legal advice · emailrules.today_`,
    ];
    return lines.join("\n");
  };

  const copy = async (kind: "link" | "slack") => {
    try {
      await navigator.clipboard.writeText(kind === "link" ? shareUrl() : slackText());
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* */
    }
  };

  return (
    <div className="shell shell-tight py-10 sm:py-14">
      <div className="no-print mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="label">One-page brief</p>
          <h1 className="mt-1 text-[clamp(1.6rem,4vw,2.2rem)] font-semibold tracking-tight">
            Send this to your team
          </h1>
          <p className="mt-2 max-w-[52ch] text-[14px] text-muted-fg">
            Generated from your saved setup. Paste in Slack or print to PDF. Not legal advice — a
            working brief with full rules one click away.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => copy("link")}
            className={cn(buttonVariants({ variant: "outline" }), "h-10 rounded-[10px] px-4")}
          >
            {copied === "link" ? "Link copied" : "Copy share link"}
          </button>
          <button
            type="button"
            onClick={() => copy("slack")}
            className={cn(buttonVariants({ variant: "outline" }), "h-10 rounded-[10px] px-4")}
          >
            {copied === "slack" ? "Slack text copied" : "Copy for Slack"}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className={cn(buttonVariants(), "h-10 rounded-[10px] px-4 font-medium")}
          >
            Print / PDF
          </button>
          <Link
            href="/rules"
            className={cn(buttonVariants({ variant: "outline" }), "h-10 rounded-[10px] px-4")}
          >
            Change setup
          </Link>
        </div>
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
        <h2 className="mt-2 text-[1.35rem] font-semibold tracking-tight">{roleLabel(a)}</h2>
        <p className="mt-2 max-w-[60ch] text-[14px] leading-relaxed text-muted-fg">
          Of <b className="text-fg">{counts.total}</b> rules in this filter,{" "}
          <b className="text-fg">{counts.act}</b> need a person,{" "}
          <b className="text-fg">{counts.shared}</b> are shared with your email tool,{" "}
          <b className="text-fg">{counts.handled + counts.fyi}</b> are handled or FYI,{" "}
          <b className="text-fg">{counts.upcoming}</b> upcoming.
        </p>
      </header>

      <section className="mt-8">
        <h3 className="text-[1.05rem] font-semibold">Open these five first</h3>
        <p className="mt-1 text-[13px] text-muted-fg">Highest signal — not the full library.</p>
        <ol className="mt-5 list-none space-y-0 border-t p-0">
          {top.map((r, i) => (
            <li key={r.slug} className="border-b py-4">
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

      <section className="mt-10 rounded-xl border bg-bg-2 px-5 py-5 text-[13.5px] leading-relaxed text-muted-fg">
        <p>
          <b className="text-fg">How to use: </b>
          Copy for Slack (formatted), share the link (keeps your role filters), or Print / PDF for a
          stand-up. Each full rule has plain English, whose job, and primary sources.
        </p>
        <p className="mt-2">
          Not legal advice. Independent — no tracking pixels, seed tests, or ESP for sale.
        </p>
      </section>
    </div>
  );
}

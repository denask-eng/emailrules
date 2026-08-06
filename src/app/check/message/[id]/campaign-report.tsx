"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { track } from "@vercel/analytics";
import { espLabel } from "@/lib/audience";
import { campaignOwnerLabel, type CampaignFinding } from "@/lib/campaign-contract";
import type { MessageCheck } from "@/lib/message-check";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type Filter = "open" | "all" | "unknown";

function prioritize(findings: CampaignFinding[]): CampaignFinding[] {
  const seen = new Set<string>();
  return findings
    .filter((finding) =>
      (finding.severity === "fail" || finding.severity === "warn") &&
      finding.applicability !== "not_applicable" &&
      finding.evidenceState !== "could_not_determine")
    .filter((finding) => {
      if (seen.has(finding.rootCause)) return false;
      seen.add(finding.rootCause);
      return true;
    })
    .slice(0, 5);
}

function evidenceLabel(state: CampaignFinding["evidenceState"]): string {
  return state === "observed" ? "Observed" : state === "inferred" ? "Inferred" : "Could not determine";
}

function FindingCard({ finding, index }: { finding: CampaignFinding; index: number }) {
  const notApplicable = finding.applicability === "not_applicable";
  const confirmedHigh = !notApplicable && finding.severity === "fail" && finding.evidenceState === "observed" && finding.confidence === "high";
  return (
    <article className="rounded-2xl border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn(
          "rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase",
          notApplicable ? "bg-muted text-muted-fg" : confirmedHigh ? "bg-live-bg text-live" : finding.severity === "pass" ? "bg-ok-bg text-ok" : "bg-soon-bg text-soon",
        )}>
          {notApplicable ? "Not applicable" : finding.severity === "fail" ? "Fix" : finding.severity === "warn" ? "Review" : finding.severity === "pass" ? "No issue observed" : "Evidence"}
        </span>
        <span className="rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide text-muted-fg uppercase">
          {evidenceLabel(finding.evidenceState)}
        </span>
        <span className="num ml-auto text-[11px] text-dim">{finding.confidence} confidence</span>
      </div>
      <h2 className="mt-5 text-[1.2rem] leading-snug font-semibold">{finding.title}</h2>
      <dl className="mt-5 grid gap-5 text-[14px] leading-relaxed">
        <div>
          <dt className="label">What was observed</dt>
          <dd className="mt-1.5 break-words text-muted-fg">{finding.observed}</dd>
        </div>
        <div>
          <dt className="label">Why it matters</dt>
          <dd className="mt-1.5 text-muted-fg">{finding.why}</dd>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <dt className="label">Owner</dt>
            <dd className="mt-1.5">{campaignOwnerLabel(finding.owner)}</dd>
          </div>
          <div>
            <dt className="label">First action</dt>
            <dd className="mt-1.5">{finding.firstAction ?? "Review the evidence before changing the campaign."}</dd>
          </div>
        </div>
      </dl>
      {finding.source ? (
        <p className="mt-5 border-t pt-4 text-[12.5px] leading-relaxed text-dim">
          <a href={finding.source.url} target="_blank" rel="noopener nofollow" className="text-fg underline underline-offset-3">
            {finding.source.title}
          </a>{" "}
          · verified {fmtDate(finding.source.verified)}
        </p>
      ) : null}
      {finding.evidence ? (
        <details
          className="mt-4 border-t pt-3"
          onToggle={(event) => {
            if (event.currentTarget.open) track("campaign-finding-expanded", { position: index + 1, evidenceState: finding.evidenceState });
          }}
        >
          <summary className="min-h-10 cursor-pointer text-[13px] font-medium text-accent">Redacted evidence</summary>
          <pre className="num mt-2 overflow-x-auto rounded-xl border bg-bg-2 p-3 text-[11px] leading-relaxed text-muted-fg">{finding.evidence}</pre>
        </details>
      ) : null}
      <div className="mt-4 flex items-center gap-3 text-[12px] text-dim">
        <span>Useful?</span>
        {(["yes", "no"] as const).map((answer) => (
          <button key={answer} type="button" className="min-h-9 underline underline-offset-3 hover:text-fg" onClick={() => track("campaign-finding-feedback", { useful: answer === "yes", position: index + 1 })}>
            {answer === "yes" ? "Yes" : "No"}
          </button>
        ))}
      </div>
    </article>
  );
}

export function CampaignReport({ check, shared = false }: { check: MessageCheck; shared?: boolean }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("open");
  const [share, setShare] = useState<{ token: string; path: string } | null>(null);
  const [busy, setBusy] = useState<"share" | "recheck" | "revoke" | null>(null);
  const open = useMemo(() => prioritize(check.findings), [check.findings]);
  const unknown = useMemo(() => check.findings.filter((finding) => finding.evidenceState === "could_not_determine"), [check.findings]);
  const shown = filter === "open" ? open : filter === "unknown" ? unknown : check.findings;

  useEffect(() => {
    track("campaign-report-complete", { openFindings: open.length, unknownEvidence: unknown.length, shared });
    try {
      const now = Date.now();
      const previous = Number(window.localStorage.getItem("emailrules.lastCampaignReport") ?? "0");
      if (previous > 0 && now - previous <= 14 * 86_400_000) track("campaign-returned-within-14-days");
      window.localStorage.setItem("emailrules.lastCampaignReport", String(now));
    } catch {
      /* Analytics never gates a report. */
    }
  }, [open.length, shared, unknown.length]);

  async function shareReport() {
    setBusy("share");
    try {
      const response = await fetch(`/api/reports/${check.reportToken}/share`, { method: "POST" });
      const body = (await response.json()) as { token?: string; path?: string };
      if (response.ok && body.token && body.path) {
        setShare({ token: body.token, path: body.path });
        await navigator.clipboard.writeText(`${window.location.origin}${body.path}`);
        track("campaign-report-shared");
      }
    } finally {
      setBusy(null);
    }
  }

  async function revoke() {
    if (!share) return;
    setBusy("revoke");
    try {
      const response = await fetch(`/api/share-reports/${share.token}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reportToken: check.reportToken }),
      });
      if (response.ok) setShare(null);
    } finally {
      setBusy(null);
    }
  }

  async function recheck() {
    setBusy("recheck");
    try {
      const response = await fetch(`/api/check-sessions/${check.reportToken}/recheck`, { method: "POST" });
      const body = (await response.json()) as { token?: string };
      if (response.ok && body.token) {
        track("campaign-recheck-started");
        router.push(`/check/message/${body.token}`);
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="shell shell-tight py-12 sm:py-16">
      <p className="label text-accent">{shared ? "Redacted campaign report" : check.fromDomain ?? "Campaign report"}</p>
      <h1 className="mt-3 text-[clamp(2.4rem,7vw,4.4rem)] leading-[1.04]">
        {open.length > 0 ? `${open.length} ${open.length === 1 ? "thing needs" : "things need"} attention.` : "No high-confidence issue was found."}
      </h1>
      <p className="mt-5 text-[14px] leading-relaxed text-muted-fg">
        Checked {fmtDate(check.createdAt.slice(0, 10))} · {check.context ? espLabel(check.context.esp) : "context not supplied"} · {check.context?.geographies.join(", ") ?? "geography not supplied"} · {check.context?.gmailBulk ? "Gmail bulk volume" : "below or unsure on Gmail bulk volume"}
      </p>

      <div className="mt-8 flex flex-wrap gap-2" role="group" aria-label="Report evidence">
        {([
          ["open", `Open findings ${open.length}`],
          ["all", `All evidence ${check.findings.length}`],
          ["unknown", `Could not determine ${unknown.length}`],
        ] as [Filter, string][]).map(([value, label]) => (
          <button key={value} type="button" onClick={() => setFilter(value)} className={cn("min-h-11 rounded-full border px-4 text-[13px]", filter === value ? "border-fg bg-fg text-bg" : "bg-card text-muted-fg")}>
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-4">
        {shown.length > 0 ? shown.map((finding, index) => <FindingCard key={`${finding.rootCause}-${index}`} finding={finding} index={index} />) : (
          <div className="rounded-2xl border bg-ok-bg p-5 text-[14px] leading-relaxed text-muted-fg">
            No high-confidence issue was found in the checks we could run.
          </div>
        )}
      </div>

      <div className="mt-6 rounded-2xl border bg-bg-2 p-5 text-[13.5px] leading-relaxed text-muted-fg">
        This report is not an inbox-placement prediction or legal certification. Missing or bounded evidence stays under Could not determine and is never converted into a pass.
      </div>

      {!shared ? (
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button type="button" disabled={Boolean(busy)} onClick={shareReport} className="min-h-12 rounded-xl bg-accent px-5 text-[14px] font-semibold text-accent-fg disabled:opacity-60">
            {share ? "Share link copied" : busy === "share" ? "Creating share link…" : "Share report"}
          </button>
          <button type="button" disabled={Boolean(busy)} onClick={recheck} className="min-h-12 rounded-xl border bg-card px-5 text-[14px] font-semibold disabled:opacity-60">
            {busy === "recheck" ? "Creating recheck…" : "Send updated campaign"}
          </button>
          {share ? <button type="button" disabled={Boolean(busy)} onClick={revoke} className="min-h-11 px-2 text-[13px] text-muted-fg underline underline-offset-3">Revoke share link</button> : null}
        </div>
      ) : null}

      <p className="mt-8 text-[12.5px] text-dim">
        Normalized findings expire {fmtDate(check.expiresAt.slice(0, 10))}. Raw body, subject, recipient and headers are not stored in this report.
      </p>
      <Link href="/check/message" className="mt-4 inline-flex min-h-11 items-center text-[14px] text-accent underline underline-offset-3">Check another campaign</Link>
    </div>
  );
}

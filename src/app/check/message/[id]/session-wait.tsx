"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { track } from "@vercel/analytics";
import type { SessionStatus } from "@/lib/campaign-contract";

const LABELS: Record<SessionStatus, string> = {
  waiting: "Waiting for the campaign",
  received: "Message received",
  processing: "Reading the evidence",
  complete: "Report complete",
  failed: "The message could not be processed",
  expired: "This address has expired",
};

export function SessionWait({
  token,
  address,
  expiresAt,
  initialStatus,
}: {
  token: string;
  address: string;
  expiresAt: string;
  initialStatus: SessionStatus;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const expires = useMemo(() => new Date(expiresAt).getTime(), [expiresAt]);
  const seconds = Math.max(0, Math.ceil((expires - now) / 1000));
  const visibleStatus: SessionStatus = status === "waiting" && seconds === 0 ? "expired" : status;

  useEffect(() => {
    if (status !== "waiting") return;
    const clock = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(clock);
  }, [status]);

  useEffect(() => {
    if (["complete", "failed", "expired"].includes(status)) return;
    let cancelled = false;
    let timer = 0;
    let attempts = 0;
    const poll = async () => {
      try {
        const response = await fetch(`/api/check-sessions/${token}`, { cache: "no-store" });
        if (response.ok) {
          const body = (await response.json()) as { status?: SessionStatus; ready?: boolean };
          if (!cancelled && body.status) {
            if (status === "waiting" && body.status !== "waiting") track("campaign-message-received");
            setStatus(body.status);
            if (body.ready || body.status === "complete") {
              router.refresh();
              return;
            }
          }
        }
      } catch {
        /* A dropped status request is not a campaign result. */
      }
      if (cancelled) return;
      attempts += 1;
      timer = window.setTimeout(poll, attempts < 40 ? 1_500 : 5_000);
    };
    timer = window.setTimeout(poll, 1_000);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [router, status, token]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      track("campaign-address-copied");
      window.setTimeout(() => setCopied(false), 1_800);
    } catch {
      /* The address remains selectable. */
    }
  }

  const minutes = Math.floor(seconds / 60);
  const remainder = String(seconds % 60).padStart(2, "0");

  return (
    <div className="mt-8 overflow-hidden rounded-2xl border bg-card shadow-[var(--lift)]">
      <div className="p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="label">Send one email to</p>
          <button type="button" onClick={copy} className="min-h-10 rounded-xl border px-3 text-[12px] font-medium hover:border-accent">
            {copied ? "Copied" : "Copy address"}
          </button>
        </div>
        <p className="num mt-4 break-all text-[clamp(1rem,3.5vw,1.35rem)] leading-snug">{address}</p>
        <p className="mt-3 text-[13px] text-dim">
          {visibleStatus === "waiting" ? `Expires in ${minutes}:${remainder}` : "Single use"}
        </p>
      </div>
      <div className="border-t bg-bg-2 px-5 py-5 sm:px-7" aria-live="polite">
        <div className="flex items-center gap-3">
          <span className={visibleStatus === "failed" ? "h-2 w-2 rounded-full bg-live" : visibleStatus === "complete" ? "h-2 w-2 rounded-full bg-ok" : "h-2 w-2 rounded-full bg-accent"} aria-hidden />
          <p className="text-[14px] font-semibold">{LABELS[visibleStatus]}</p>
        </div>
        <p className="mt-2 text-[13.5px] leading-relaxed text-muted-fg">
          {visibleStatus === "waiting" && "Send from the platform you actually use. Do not forward: forwarding rewrites the evidence."}
          {visibleStatus === "received" && "The message is safely queued for deterministic parsing."}
          {visibleStatus === "processing" && "Checking message structure, authentication evidence, unsubscribe, identity and measurement signals."}
          {visibleStatus === "failed" && "No verdict was invented. Create a new check or paste the complete message source."}
          {visibleStatus === "expired" && "Mail sent now will not be processed. Create a new private address."}
        </p>
      </div>
    </div>
  );
}

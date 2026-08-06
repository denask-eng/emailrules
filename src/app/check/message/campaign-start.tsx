"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { track } from "@vercel/analytics";
import { cn } from "@/lib/utils";
import type { CampaignEsp, CampaignGeo } from "@/lib/campaign-contract";

const ESPS: { value: CampaignEsp; label: string }[] = [
  { value: "klaviyo", label: "Klaviyo" },
  { value: "mailchimp", label: "Mailchimp" },
  { value: "braze", label: "Braze" },
  { value: "hubspot", label: "HubSpot" },
  { value: "sfmc", label: "Salesforce Marketing Cloud" },
  { value: "omnisend", label: "Omnisend" },
  { value: "activecampaign", label: "ActiveCampaign" },
  { value: "other", label: "Other or custom" },
];

const GEOS: { value: CampaignGeo; label: string }[] = [
  { value: "EU", label: "European Union" },
  { value: "UK", label: "United Kingdom" },
  { value: "US", label: "United States" },
  { value: "CA", label: "Canada" },
  { value: "AU", label: "Australia" },
  { value: "Other", label: "Other places" },
];

export function CampaignStart() {
  const router = useRouter();
  const [esp, setEsp] = useState<CampaignEsp | "">("");
  const [geographies, setGeographies] = useState<CampaignGeo[]>([]);
  const [gmailBulk, setGmailBulk] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const toggleGeo = (geo: CampaignGeo) => {
    setGeographies((current) => current.includes(geo) ? current.filter((item) => item !== geo) : [...current, geo]);
  };

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!esp || geographies.length === 0 || gmailBulk === null) {
      setError("Choose an ESP, at least one geography, and Gmail volume.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/check-sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ esp, geographies, gmailBulk }),
      });
      const body = (await response.json()) as { token?: string; error?: string };
      if (!response.ok || !body.token) {
        setError(body.error ?? "Could not create a check.");
        return;
      }
      track("campaign-context-completed", {
        esp,
        geographyCount: geographies.length,
        gmailBulk,
      });
      router.push(`/check/message/${body.token}`);
    } catch {
      setError("Could not create a check. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 rounded-2xl border bg-card p-5 shadow-[var(--lift)] sm:p-7">
      <fieldset>
        <legend className="text-[15px] font-semibold">1. Sending platform</legend>
        <label className="mt-4 block">
          <span className="sr-only">Sending platform</span>
          <select
            required
            value={esp}
            onChange={(event) => setEsp(event.target.value as CampaignEsp)}
            className="min-h-13 w-full rounded-xl border border-input bg-bg px-4 text-[15px] outline-none focus:border-accent focus:ring-3 focus:ring-accent/15"
          >
            <option value="">Choose your ESP</option>
            {ESPS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      </fieldset>

      <fieldset className="mt-7 border-t pt-6">
        <legend className="text-[15px] font-semibold">2. Recipient geographies</legend>
        <div className="mt-4 flex flex-wrap gap-2">
          {GEOS.map((geo) => {
            const selected = geographies.includes(geo.value);
            return (
              <label
                key={geo.value}
                className={cn(
                  "inline-flex min-h-11 cursor-pointer items-center rounded-full border px-4 text-[13.5px]",
                  selected ? "border-fg bg-fg text-bg" : "border-border bg-bg text-muted-fg hover:border-input",
                )}
              >
                <input type="checkbox" className="sr-only" checked={selected} onChange={() => toggleGeo(geo.value)} />
                {geo.label}
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="mt-7 border-t pt-6">
        <legend className="text-[15px] font-semibold">3. Gmail bulk-sender volume</legend>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {[
            [true, "About 5,000+ a day to Gmail"],
            [false, "Below that or not sure"],
          ].map(([value, label]) => (
            <label
              key={String(value)}
              className={cn(
                "flex min-h-12 cursor-pointer items-center rounded-xl border px-4 text-[13.5px]",
                gmailBulk === value ? "border-accent bg-accent-soft text-fg" : "border-border bg-bg text-muted-fg",
              )}
            >
              <input
                type="radio"
                name="gmail-volume"
                className="mr-3 accent-[var(--accent)]"
                checked={gmailBulk === value}
                onChange={() => setGmailBulk(value as boolean)}
              />
              {String(label)}
            </label>
          ))}
        </div>
      </fieldset>

      {error ? <p className="mt-5 rounded-xl border border-live/25 bg-live-bg px-4 py-3 text-[13px] text-live" role="alert">{error}</p> : null}

      <button
        type="submit"
        disabled={busy}
        className="mt-7 inline-flex min-h-13 w-full items-center justify-center rounded-2xl bg-accent px-6 text-[15px] font-semibold text-accent-fg disabled:cursor-wait disabled:opacity-60 sm:w-auto"
      >
        {busy ? "Creating private address…" : "Create private test address"}
      </button>
    </form>
  );
}

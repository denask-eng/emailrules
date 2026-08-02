"use server";

import { redirect } from "next/navigation";
import type { FindingOwnership } from "@/components/findings";
import { hasDatabase } from "@/lib/db";
import type { Finding } from "@/lib/dns-check";
import type { HeaderCheckError } from "@/lib/header-check";
import {
  newCheckId,
  runMessageCheck,
  ruleMetaFor,
  saveMessageCheck,
} from "@/lib/message-check";

/**
 * The paste door into the same engine.
 *
 * This calls `runMessageCheck` — the identical function the inbound webhook
 * calls — so the findings, the ownership verdicts and the result page are the
 * same whether a message was sent to us or pasted in. When there is a database
 * the paste gets a share URL too; without one it renders in place rather than
 * pretending a link exists.
 */

export type HeaderCheckActionState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | {
      status: "success";
      checkedAt: string;
      fromDomain: string | null;
      verdict: string;
      findings: Finding[];
      ruleTitles: Record<string, string>;
      ownership: Record<string, FindingOwnership>;
    };

const ERROR_COPY: Record<HeaderCheckError, string> = {
  "gmail-summary":
    "That is Gmail's summary table, not the raw message. In Gmail, open the message, choose ⋮ → Show original → “Copy to clipboard”, then paste that.",
  "no-headers": "No raw headers were found. Paste the complete message source, starting at the first header line.",
  "too-large": "That paste is over 2 MB. Paste one message, not a mailbox export.",
};

export async function checkHeadersAction(
  _previous: HeaderCheckActionState,
  formData: FormData,
): Promise<HeaderCheckActionState> {
  const value = formData.get("headers");
  const raw = typeof value === "string" ? value : "";
  let outcome: HeaderCheckActionState | { status: "share"; href: string };

  try {
    const result = await runMessageCheck(raw);
    if (!result.ok) return { status: "error", message: ERROR_COPY[result.error] };

    const id = hasDatabase() ? newCheckId() : null;
    const stored = id ? await saveMessageCheck(id, result) : false;

    if (stored && id) {
      outcome = { status: "share", href: `/check/message/${id}` };
    } else {
      const meta = await ruleMetaFor(result.findings);
      outcome = {
        status: "success",
        checkedAt: new Date().toISOString().slice(0, 10),
        fromDomain: result.fromDomain,
        verdict: result.verdict,
        findings: result.findings,
        ruleTitles: Object.fromEntries(
          Object.entries(meta).map(([slug, rule]) => [slug, rule.title]),
        ),
        ownership: Object.fromEntries(
          Object.entries(meta).map(([slug, rule]) => [
            slug,
            { ownership: rule.ownership, mondayMorning: rule.mondayMorning },
          ]),
        ),
      };
    }
  } catch {
    return {
      status: "error",
      message: "The check could not finish. Nothing was stored; try the same paste again.",
    };
  }

  /* Redirecting outside the try on purpose: redirect() works by throwing, and
     catching it above would turn a finished check into a generic failure. */
  if (outcome.status === "share") redirect(outcome.href);
  return outcome;
}

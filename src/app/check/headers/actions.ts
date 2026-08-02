"use server";

import type { Finding } from "@/lib/dns-check";
import type { HeaderCheckError } from "@/lib/header-check";
import { checkHeaders } from "@/lib/header-check-live";

export type HeaderCheckActionState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | {
      status: "success";
      checkedAt: string;
      fromDomain: string | null;
      findings: Finding[];
      ruleTitles: Record<string, string>;
    };

const ERROR_COPY: Record<HeaderCheckError, string> = {
  "gmail-summary":
    "That is Gmail's summary table, not the raw message. In Gmail, open the message, choose ⋮ → Show original → “Copy to clipboard”, then paste that.",
  "no-headers": "No raw headers were found. Paste the complete message source or raw header block.",
  "too-large": "That paste is over 400 KB. Paste only the raw headers, without the message body.",
};

export async function checkHeadersAction(
  _previous: HeaderCheckActionState,
  formData: FormData,
): Promise<HeaderCheckActionState> {
  const value = formData.get("headers");
  const raw = typeof value === "string" ? value : "";

  try {
    const result = await checkHeaders(raw);
    if (!result.ok) return { status: "error", message: ERROR_COPY[result.error] };

    return {
      status: "success",
      checkedAt: result.checkedAt,
      fromDomain: result.fromDomain,
      findings: result.findings,
      ruleTitles: result.ruleTitles,
    };
  } catch {
    return {
      status: "error",
      message: "The check could not finish. Nothing was stored; try the same paste again.",
    };
  }
}

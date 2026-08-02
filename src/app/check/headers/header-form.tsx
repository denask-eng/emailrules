"use client";

import { useActionState } from "react";
import { FindingList, FindingTally } from "@/components/findings";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { checkHeadersAction, type HeaderCheckActionState } from "./actions";

const INITIAL_STATE: HeaderCheckActionState = { status: "idle" };

/* Kept in step with MAX_MESSAGE_BYTES in lib/header-check.ts. The textarea
   stops a paste the server would only reject a second later. */
const MAX_PASTE = 2 * 1024 * 1024;

export function HeaderForm() {
  const [state, formAction, pending] = useActionState(checkHeadersAction, INITIAL_STATE);

  return (
    <div>
      <form action={formAction} className="p-5 sm:p-6" aria-busy={pending}>
        <label htmlFor="headers" className="text-[0.95rem] font-semibold">
          One whole message
        </label>
        <p id="headers-help" className="mt-1.5 max-w-[62ch] text-[0.86rem] leading-relaxed text-dim">
          Paste the copied original, headers first. Include the body and you also get the postal
          address, tracking, summary-text and subject-line findings — not only the authentication
          ones.
        </p>
        <textarea
          id="headers"
          name="headers"
          required
          maxLength={MAX_PASTE}
          rows={18}
          spellCheck={false}
          aria-describedby="headers-help"
          placeholder={
            "Authentication-Results: mx.example; dkim=pass …\nFrom: Sender <hello@example.com>\nDKIM-Signature: v=1; d=example.com; s=selector; …\nList-Unsubscribe: <https://example.com/u/1>\n\n<html>…"
          }
          className="num mt-4 min-h-[22rem] w-full resize-y rounded-lg border border-border bg-bg px-3.5 py-3 text-[0.78rem] leading-relaxed outline-none focus-visible:ring-3 focus-visible:ring-accent/25"
        />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className={cn(buttonVariants({ size: "lg" }), "h-10 rounded-[10px] px-5 font-semibold")}
          >
            {pending ? "Reading…" : "Read this message"}
          </button>
          <span className="text-[0.82rem] text-dim">
            The message is parsed and dropped. Only the findings are kept.
          </span>
        </div>
      </form>

      {state.status === "error" ? (
        <p role="alert" className="border-t px-5 py-4 text-[0.9rem] leading-relaxed text-live sm:px-6">
          {state.message}
        </p>
      ) : null}

      {state.status === "success" ? (
        <section className="border-t px-5 pb-5 sm:px-6 sm:pb-6" aria-live="polite">
          <p className="label mt-6">Read {state.checkedAt}</p>
          <h2 className="num mt-2 text-[1.2rem] break-all">
            {state.fromDomain ?? "From domain not found"}
          </h2>
          <p className="mt-3 max-w-[62ch] text-[0.98rem] leading-relaxed text-muted-fg">
            {state.verdict}
          </p>
          <FindingTally findings={state.findings} />
          <FindingList
            findings={state.findings}
            ruleTitles={state.ruleTitles}
            ownership={state.ownership}
          />
        </section>
      ) : null}
    </div>
  );
}

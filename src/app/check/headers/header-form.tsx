"use client";

import { useActionState } from "react";
import { FindingList } from "@/components/findings";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  checkHeadersAction,
  type HeaderCheckActionState,
} from "./actions";

const INITIAL_STATE: HeaderCheckActionState = { status: "idle" };

export function HeaderForm() {
  const [state, formAction, pending] = useActionState(checkHeadersAction, INITIAL_STATE);

  return (
    <div>
      <form action={formAction} className="p-5 sm:p-6" aria-busy={pending}>
        <label htmlFor="headers" className="text-[0.95rem] font-semibold">
          Raw message headers
        </label>
        <p id="headers-help" className="mt-1.5 max-w-[62ch] text-[0.86rem] leading-relaxed text-dim">
          Paste the copied original message or message source. A body after the first blank line is
          ignored.
        </p>
        <textarea
          id="headers"
          name="headers"
          required
          maxLength={400 * 1024}
          rows={18}
          spellCheck={false}
          aria-describedby="headers-help"
          placeholder={"Authentication-Results: mx.example; dkim=pass …\nFrom: Sender <hello@example.com>\nDKIM-Signature: v=1; d=example.com; s=selector; …"}
          className="num mt-4 min-h-[22rem] w-full resize-y rounded-lg border border-border bg-bg px-3.5 py-3 text-[0.78rem] leading-relaxed outline-none focus-visible:ring-3 focus-visible:ring-accent/25"
        />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className={cn(buttonVariants({ size: "lg" }), "h-10 rounded-[10px] px-5 font-semibold")}
          >
            {pending ? "Reading…" : "Read the headers"}
          </button>
          <span className="text-[0.82rem] text-dim">Nothing is uploaded for later use.</span>
        </div>
      </form>

      {state.status === "error" ? (
        <p role="alert" className="border-t px-5 py-4 text-[0.9rem] leading-relaxed text-live sm:px-6">
          {state.message}
        </p>
      ) : null}

      {state.status === "success" ? (
        <section className="border-t px-5 pb-5 sm:px-6 sm:pb-6" aria-live="polite">
          <p className="label mt-6">Checked {state.checkedAt}</p>
          <h2 className="num mt-2 text-[1.2rem]">
            {state.fromDomain ?? "From domain not found"}
          </h2>
          <FindingList findings={state.findings} ruleTitles={state.ruleTitles} />
        </section>
      ) : null}
    </div>
  );
}

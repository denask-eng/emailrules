import { submitCorrection } from "@/app/actions";

/**
 * The way to tell this site it is wrong.
 *
 * It used to be a `mailto:` on forty-one rule pages, pointed at an address on
 * a domain that publishes no MX. Every one of those bounced. A reference whose
 * entire differentiator is that it publishes its own corrections had no
 * working path for receiving one, which is a worse failure than any individual
 * error it might have been told about.
 *
 * A plain `<form action={serverAction}>` — no client component, no JavaScript
 * required, no account and no captcha. The email field is optional on purpose:
 * a correction is worth having from somebody who does not want to be written
 * back to, and demanding an address in exchange for one is how you stop
 * receiving them.
 */
export function CorrectionForm({
  slug,
  path,
  compact = false,
}: {
  /** The rule this is about, when the reader arrived from one. */
  slug?: string;
  /** Where they were standing. Beats asking them to describe it. */
  path?: string;
  compact?: boolean;
}) {
  return (
    <form
      action={submitCorrection}
      className={compact ? "mt-4" : "mt-6"}
      id="report"
    >
      {slug ? <input type="hidden" name="slug" value={slug} /> : null}
      {path ? <input type="hidden" name="path" value={path} /> : null}

      <label htmlFor="correction-body" className="label block">
        What have we got wrong?
      </label>
      <textarea
        id="correction-body"
        name="body"
        rows={compact ? 3 : 5}
        required
        minLength={12}
        maxLength={4000}
        placeholder={
          slug
            ? "What this page says, what is actually true, and where you saw it. A link to the primary source is the fastest possible correction."
            : "The page, what it says, what is actually true, and where you saw it."
        }
        className="mt-2 w-full rounded-xl border bg-card px-3.5 py-3 text-[14.5px] leading-relaxed outline-none focus-visible:border-accent"
      />

      <div className="mt-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-[16rem] flex-1">
          <label htmlFor="correction-reply" className="label block">
            Email, only if you want a reply
          </label>
          <input
            id="correction-reply"
            name="reply_to"
            type="email"
            autoComplete="email"
            placeholder="optional"
            className="mt-2 w-full rounded-xl border bg-card px-3.5 py-2.5 text-[14.5px] outline-none focus-visible:border-accent"
          />
        </div>
        <button
          type="submit"
          className="h-11 shrink-0 rounded-xl bg-accent px-5 text-[14.5px] font-semibold text-accent-fg hover:opacity-90"
        >
          Send the correction
        </button>
      </div>

      <p className="mt-3 max-w-[62ch] text-[12.5px] leading-relaxed text-dim">
        No account and no address required. Corrections that change a page are
        published on this one with a date, including the ones that make us look
        bad — that is the entire point of having this page.
      </p>
    </form>
  );
}

/** The outcome banner, rendered from the redirect's query string. */
export function CorrectionResult({ sent }: { sent?: string }) {
  if (!sent) return null;

  const messages: Record<string, { ok: boolean; text: string }> = {
    "1": {
      ok: true,
      text: "Received. If it changes a page, the change and its date will appear on this page — and if it does not change anything, that is worth us knowing too.",
    },
    short: { ok: false, text: "That was too short to act on. What does the page say, and what is actually true?" },
    long: { ok: false, text: "That was over four thousand characters. Send the part that is wrong." },
    err: {
      ok: false,
      text: "We could not store that, which is our fault and not yours. Try again shortly.",
    },
  };
  const m = messages[sent];
  if (!m) return null;

  return (
    <p
      className={`mt-6 max-w-[64ch] rounded-xl border px-4 py-3.5 text-[14px] leading-relaxed ${
        m.ok ? "border-ok/30 bg-ok-bg text-ok" : "border-soon/30 bg-soon-bg text-soon"
      }`}
      role="status"
    >
      {m.text}
    </p>
  );
}

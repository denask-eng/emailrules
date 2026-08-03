import { redirect } from "next/navigation";
import { detectInput } from "@/lib/detect-input";
import { newCheckId, runMessageCheck, saveMessageCheck } from "@/lib/message-check";

/**
 * One box, one POST, no JavaScript.
 *
 * A plain HTML form posts here and this decides where the visitor goes. It is
 * a route handler rather than a server action on purpose: the "get an address"
 * button on /check/message was a server action, and it posted nothing at all
 * from a real browser because one hydration error from an unrelated extension
 * left React's submit handler attached and dead. A native form POST to a URL
 * has no such failure mode. The entry point to the whole product does not get
 * to depend on hydration succeeding.
 */

/* A campaign with inline images runs to a megabyte or two; past that we are
   being fed something rather than checked. */
const MAX_BYTES = 2 * 1024 * 1024;

function back(reason: string): never {
  redirect(`/check?e=${encodeURIComponent(reason)}`);
}

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const raw = String(form?.get("q") ?? "");

  if (raw.length > MAX_BYTES) {
    back("That is larger than any campaign we can read. Paste the message source, not an attachment.");
  }

  const detected = detectInput(raw);

  /* Domains, addresses and IPs are already a URL. */
  if (detected.href) redirect(detected.href);

  if (detected.kind === "message") {
    const result = await runMessageCheck(detected.value);
    if (!result.ok) {
      back(
        result.error === "gmail-summary"
          ? "That is Gmail's summary table rather than the message. Open the message, choose Show original, then copy that."
          : result.error === "too-large"
            ? "That message is too large to read."
            : "We could not find message headers in that. Paste the full source, starting at the Received: or From: lines.",
      );
    }

    /* A share URL when there is somewhere to keep it. Without a database the
       paste door on /check/headers still renders findings in place, so we
       send them there rather than inventing a link that would 404. */
    const id = newCheckId();
    const stored = await saveMessageCheck(id, result).catch(() => false);
    if (stored) redirect(`/check/message/${id}`);
    redirect("/check/headers");
  }

  back(detected.says);
}

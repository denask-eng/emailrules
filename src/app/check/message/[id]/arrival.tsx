"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * The only part of the waiting page that needs the browser.
 *
 * Everything a visitor has to read — the address, the instruction, what is
 * kept — is in the server-rendered HTML. This adds one line of live status and
 * reloads the route when the message lands. With JavaScript off, the page
 * still works: the "Check for it now" link below is a plain reload of the
 * same URL, which is exactly what this does automatically.
 */

const INTERVAL_MS = 4_000;
/* Twenty minutes. Mail that has not arrived by then is not late, it is lost,
   and a page that polls all afternoon is a page nobody closed on purpose. */
const MAX_ATTEMPTS = 300;

export function Arrival({ id }: { id: string }) {
  const router = useRouter();
  const [attempts, setAttempts] = useState(0);
  const [givenUp, setGivenUp] = useState(false);

  useEffect(() => {
    if (givenUp) return;

    let cancelled = false;
    const timer = setInterval(async () => {
      try {
        const response = await fetch(`/api/inbound/status/${id}`, { cache: "no-store" });
        if (!response.ok || cancelled) return;
        const { ready } = (await response.json()) as { ready?: boolean };
        if (ready && !cancelled) router.refresh();
      } catch {
        /* A dropped request is not an answer. The next tick asks again. */
      } finally {
        if (!cancelled) {
          setAttempts((previous) => {
            const next = previous + 1;
            if (next >= MAX_ATTEMPTS) setGivenUp(true);
            return next;
          });
        }
      }
    }, INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [id, router, givenUp]);

  return (
    <p className="mt-4 text-[0.86rem] text-dim" aria-live="polite">
      {givenUp ? (
        <>Not watching any more. Reload this page if you have sent the message since.</>
      ) : (
        <>
          Watching this address. Checked{" "}
          <span className="num">{attempts}</span>
          {attempts === 1 ? " time" : " times"} so far.
        </>
      )}
    </p>
  );
}

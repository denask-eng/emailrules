import Link from "next/link";
import { checkDomain } from "@/lib/dns-check";
import { spfAuthorised, signingButUnauthorised } from "@/lib/sending-platform";
import { fmtDate } from "@/lib/format";

/**
 * The homepage figure — the same block, telling the truth.
 *
 * The dark panel under the hero was the best thing on the front page and it
 * stays exactly where it is, at the same size, in the same colours. One thing
 * about it changes: it was a *hardcoded transcript* of a finding, and now it
 * is the finding, read live from public DNS during this render by the same
 * `checkDomain()` the product runs.
 *
 * That matters more than it looks. The panel's own caption says "a real
 * reading", and the site's whole position is that it does not invent data. A
 * static example under that caption was the one place this site was doing the
 * thing it tells everyone else not to do.
 *
 * Borrowed from branch A, which made the entire site a live instrument. This
 * takes the honesty and leaves the terminal.
 *
 * Rotation. The target advances with the clock so a returning reader sees the
 * panel pointed somewhere else. Derived from the hour rather than
 * `Math.random()`, so a given regeneration is reproducible.
 *
 * Failure. A resolver that will not answer gets said out loud. There is no
 * fallback to a stored reading, because a stored reading printed under "a real
 * reading" is exactly the invented data this site cannot afford.
 */

/** Public domains whose authentication DNS is worth pointing at. Ordinary
    TXT lookups — the same records every receiver reads on every message. */
const TARGETS = ["klaviyo.com", "kureapp.health", "monzo.com", "notion.so"] as const;

/** Never let a slow resolver hold the homepage's largest paint hostage. */
const BUDGET_MS = 4000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    p.catch(() => null),
    new Promise<null>((res) => setTimeout(() => res(null), ms)),
  ]);
}

export async function LiveFigure() {
  /* All targets at once, then pick. Four parallel TXT lookups behind a
     fifteen-minute revalidate is cheaper than the serial version and lets the
     panel choose on evidence rather than on luck. */
  const readings = await Promise.all(
    TARGETS.map((d) => withTimeout(checkDomain(d), BUDGET_MS)),
  );

  const conflicts = readings
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .filter(
      (r) => signingButUnauthorised(r.platforms).length > 0 && spfAuthorised(r.platforms).length > 0,
    );

  /* Prefer a domain currently showing the disagreement: it is the finding a
     tool that grades each record separately cannot produce, and therefore the
     reason this panel is worth the space.

     This is a choice of *which true reading to print* — the same editorial
     choice the hardcoded version made, except the reading now has to actually
     exist at render time to be eligible. It rotates among whichever domains
     qualify, so the panel is not permanently pointed at one.

     When nobody in the rotation is misconfigured, it falls through to the
     plain reading rather than manufacturing a conflict to keep the graphic
     interesting — which is the entire reason this stopped being a transcript. */
  const slot = Math.floor(Date.now() / 3_600_000);
  const result =
    conflicts.length > 0
      ? conflicts[slot % conflicts.length]
      : readings.filter((r) => r !== null)[slot % Math.max(readings.filter((r) => r !== null).length, 1)] ?? null;

  const orphans = result ? signingButUnauthorised(result.platforms) : [];
  const authorised = result ? spfAuthorised(result.platforms) : [];

  const conflict = Boolean(result && orphans.length > 0 && authorised.length > 0);

  return (
    <figure className="mx-auto mt-14 max-w-[720px] overflow-hidden rounded-2xl bg-[#141417] text-left shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]">
      <div className="num flex items-center justify-between border-b border-white/8 px-5 py-3 text-[10.5px] tracking-[0.11em] text-white/38 uppercase sm:px-6">
        <span className="flex items-center gap-2.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="listening absolute inset-0 rounded-full" aria-hidden />
            <span className="h-1.5 w-1.5 rounded-full bg-[#7ee0a8]" />
          </span>
          What comes back
        </span>
        <span>{result ? `${result.domain} · ${fmtDate(result.checkedAt.slice(0, 10))}` : "a real reading"}</span>
      </div>

      <div className="px-5 py-6 sm:px-6">
        {!result ? (
          <p className="max-w-[52ch] text-[0.95rem] leading-relaxed text-white/60">
            The resolver did not answer inside four seconds, so there is nothing to print here. We
            are not going to show you the last reading we took and call it live —{" "}
            <Link href="/check" className="text-white underline underline-offset-2">
              run the check yourself
            </Link>{" "}
            against any domain instead.
          </p>
        ) : conflict ? (
          <>
            <p className="num text-[11px] tracking-[0.09em] text-white/30 uppercase">
              Signs its mail
            </p>
            <p className="text-[1.15rem] leading-tight font-semibold text-[#ff9d94]">
              {orphans[0].name}
            </p>
            <p className="num mt-1 text-[0.72rem] text-white/30">
              {orphans[0].evidence
                .filter((e) => e.from === "dkim")
                .map((e) => e.value)
                .join(" ") || "live DKIM key"}
            </p>

            <div className="my-3 flex items-center gap-3">
              <span className="h-6 w-px bg-[#ff9d94]/50" aria-hidden />
              <span className="num text-[10.5px] tracking-[0.08em] text-[#ff9d94] uppercase">
                ✗ these disagree
              </span>
            </div>

            <p className="num text-[11px] tracking-[0.09em] text-white/30 uppercase">
              SPF authorises
            </p>
            <p className="text-[1.15rem] leading-tight font-semibold text-[#f0c26a]">
              {authorised[0].name}
            </p>
            <p className="num mt-1 truncate text-[0.72rem] text-white/30">
              {authorised[0].evidence
                .filter((e) => e.from === "spf")
                .map((e) => `include:${e.value}`)
                .join(" ")}
            </p>

            {/* The mechanism, not a claim about the competition. "No other
                checker does this" is not something we can verify about every
                tool that exists — what we *can* state is what the records say
                and why grading them separately misses it. The site already
                hedges this way in blocklist-verdict.tsx. */}
            <p className="mt-5 max-w-[52ch] text-[0.9rem] leading-relaxed text-white/60">
              {orphans[0].name} signs mail as {result.domain}, and this domain&rsquo;s SPF does not
              list {orphans[0].name}. Those campaigns fail SPF and survive on DKIM alignment alone —
              so a tool that grades SPF and DKIM separately marks both as present and reports
              nothing wrong.
            </p>
          </>
        ) : (
          <>
            {/* Nobody in the rotation is misconfigured today. The panel prints
                the plain reading rather than manufacturing a conflict to keep
                the graphic interesting — which is the whole reason this block
                stopped being a hardcoded transcript. */}
            <p className="num text-[11px] tracking-[0.09em] text-white/30 uppercase">
              Read off {result.domain}
            </p>
            <p className="mt-1 text-[1.15rem] leading-tight font-semibold text-[#7ee0a8]">
              {result.facts.dmarcPolicy
                ? `DMARC p=${result.facts.dmarcPolicy}`
                : "No DMARC published"}
              <span className="text-white/40"> · </span>
              {result.facts.spfAll ?? "no SPF"}
            </p>
            <p className="num mt-1 truncate text-[0.72rem] text-white/30">
              {result.facts.dkim.slice(0, 3).join("  ") || "no DKIM selectors found"}
            </p>

            <dl className="mt-5 grid grid-cols-3 gap-4 border-t border-white/8 pt-4">
              {[
                { k: "checks run", v: String(result.findings.length) },
                {
                  k: "need you",
                  v: String(
                    result.findings.filter((f) => f.severity === "fail" || f.severity === "warn")
                      .length,
                  ),
                },
                { k: "spf lookups", v: `${result.facts.spfLookups}/10` },
              ].map((f) => (
                <div key={f.k}>
                  <dd className="num text-[1.05rem] font-semibold text-white/85">{f.v}</dd>
                  <dt className="num mt-0.5 text-[10px] tracking-[0.08em] text-white/30 uppercase">
                    {f.k}
                  </dt>
                </div>
              ))}
            </dl>

            <p className="mt-5 max-w-[52ch] text-[0.9rem] leading-relaxed text-white/60">
              Read live from public DNS while this page rendered. Every finding names the dated rule
              it comes from and whose job it is — and there is no score, here or anywhere else on
              this site.
            </p>
          </>
        )}

        {result ? (
          <p className="mt-4">
            <Link
              href={`/check/${result.domain}`}
              className="num text-[11px] tracking-[0.08em] text-white/55 uppercase underline underline-offset-4 hover:text-white"
            >
              The full readout →
            </Link>
          </p>
        ) : null}
      </div>
    </figure>
  );
}

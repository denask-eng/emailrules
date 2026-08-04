import { OWNERSHIP } from "@/lib/types";
import { cn } from "@/lib/utils";
import { platformClaim, type DetectedPlatform, type SpfManager } from "@/lib/sending-platform";

/**
 * Who this domain's DNS authorises, with the mechanism printed underneath.
 *
 * This is the closest the site comes to an inference, so it carries its own
 * evidence the way every rule page carries its source. The claim above is
 * worthless without the two lines below it, and the caveat is not fine print:
 * an SPF include is a standing permission, and permissions outlive the
 * contracts that created them.
 *
 * The reason it earns the space is that no finding underneath can be owned
 * without it. "No DKIM key" is inconclusive on a bare domain and an unfinished
 * setup on one whose own SPF names the platform that would publish the key.
 */
export function PlatformPanel({
  platforms,
  spfManager,
}: {
  platforms: DetectedPlatform[];
  spfManager?: SpfManager | null;
}) {
  if (!platforms.length && !spfManager) return null;

  /* Three tiers, kept apart, because the claim each one supports is different.
     Folding the last group up into the first is how `k1._domainkey` on
     klaviyo.com becomes "you send through Mailchimp". */
  const named = platforms.filter((p) => p.kind !== "corporate" && p.basis !== "dkim");
  const keysOnly = platforms.filter((p) => p.kind !== "corporate" && p.basis === "dkim");
  const orphans = named.filter((p) => p.basis === "dkim-confirmed");
  const corporate = platforms.filter((p) => p.kind === "corporate");

  return (
    <section className="mt-9 rounded-xl border bg-bg-2 px-5 py-5 sm:px-6">
      <p className="label">Who this domain authorises</p>

      {/* Said first, because when a service holds the list every answer below
          it is partial, and a reader deserves to know that before reading
          them rather than after. */}
      {spfManager ? (
        <div className={named.length || keysOnly.length ? "mt-4 mb-4" : "mt-4"}>
          <p className="text-[1.02rem] leading-snug font-semibold">
            Your sender list is held by {spfManager.name}
          </p>
          <p className="num mt-2 text-[0.76rem] text-fg">include:{spfManager.evidence}</p>
          <p className="mt-2 max-w-[62ch] text-[0.86rem] leading-relaxed text-muted-fg">
            {spfManager.macro
              ? "The record is built from SPF macros, so the senders are resolved per message at delivery time and are genuinely not readable from DNS — not by us, and not by any other checker that tells you it expanded your SPF."
              : "The senders sit behind that one include and are managed there rather than published here."}{" "}
            Whoever administers {spfManager.name} holds the answer to which platforms may send as
            you; this page can only report what your own record says.
          </p>
        </div>
      ) : null}

      {named.length ? (
        <ul className="mt-4 list-none space-y-4 p-0">
          {named.map((p) => (
            <li key={p.name}>
              <p
                className={cn(
                  "text-[1.02rem] leading-snug font-semibold",
                  /* A platform signing mail it was never authorised to send is
                     not neutral information, and setting it in the same grey as
                     "you send through Klaviyo" is how it got missed. */
                  p.basis === "dkim-confirmed" && "text-live",
                )}
              >
                {platformClaim(p)}
              </p>
              <ul className="num mt-2 list-none space-y-1 p-0 text-[0.76rem] text-muted-fg">
                {p.evidence.map((e) => (
                  <li key={e.value} className="flex flex-wrap items-baseline gap-x-2.5">
                    <span className="text-fg">{e.value}</span>
                    <span className="text-dim">
                      {e.from === "spf" ? "read from your SPF, verbatim" : "DKIM key present"}
                    </span>
                  </li>
                ))}
              </ul>
              {p.basis === "dkim-confirmed" ? (
                <p className="mt-2 max-w-[62ch] text-[0.86rem] leading-relaxed text-muted-fg">
                  {p.dkimSelectors} of {p.name}&rsquo;s own selectors carry live keys, which is a
                  setup somebody completed — not a selector collision. Your SPF names somebody
                  else, so this mail passes DMARC on DKIM alignment alone.
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {keysOnly.length ? (
        <div className={named.length ? "mt-4 border-t border-border-soft pt-3.5" : "mt-4"}>
          <p className="text-[0.86rem] leading-relaxed text-muted-fg">
            Keys are also published on selectors belonging to{" "}
            <span className="text-fg">{keysOnly.map((p) => p.name).join(", ")}</span>, and your SPF
            does not authorise {keysOnly.length > 1 ? "them" : "it"}. Selectors like{" "}
            <span className="num text-fg">{keysOnly[0].evidence[0]?.value}</span> are short enough
            to collide, so this is worth checking and is not worth believing on its own.
          </p>
        </div>
      ) : null}

      {corporate.length ? (
        <p className="mt-4 border-t border-border-soft pt-3.5 text-[0.86rem] leading-relaxed text-muted-fg">
          <span className="num text-fg">
            {corporate.map((p) => p.evidence[0]?.value).join(" · ")}
          </span>{" "}
          is {corporate.map((p) => p.name).join(" and ")}, which is where staff read mail. It says
          nothing about where campaigns leave from, and a checker that counts it as your sending
          platform has told you about your inbox, not your list.
        </p>
      ) : null}

      {/* The honest limit, at the same weight as the claim. */}
      <p className="mt-4 max-w-[62ch] border-t border-border-soft pt-3.5 text-[0.84rem] leading-relaxed text-dim">
        This is what your DNS authorises, not proof of what you send. A domain can authorise a
        platform it stopped paying for two years ago
        {named.some((p) => p.basis === "spf")
          ? ", which is why an include on its own is reported as permission rather than as use"
          : ""}
        {orphans.length
          ? ", and it can carry live keys for a platform it never authorised, which is the reverse and the more expensive of the two"
          : ""}
        . Only a real message names the address that actually sent your campaign.
      </p>
    </section>
  );
}

/**
 * The one-line version, for pages that carry a check result without the room
 * to explain it — the brief, chiefly, where a VP needs the platform named and
 * does not need the epistemology.
 */
export function PlatformLine({ platforms }: { platforms: DetectedPlatform[] }) {
  const esp = platforms.find((p) => p.kind === "esp");
  if (!esp) return null;
  return (
    <span>
      {esp.confirmedByDkim ? "sends through" : "authorises"} {esp.name}
    </span>
  );
}

/** Label for an ownership value, so callers do not re-derive the vocabulary. */
export function ownershipLabel(o: keyof typeof OWNERSHIP): string {
  return OWNERSHIP[o].short;
}

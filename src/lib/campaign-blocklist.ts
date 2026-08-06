/* No `server-only` here, matching blocklist-check.ts: the guard behaviour is
   the part worth testing and the suite runs under plain Node, where that
   import throws. This wraps checkBlocklists, which opens raw DNS sockets, so it
   never runs anywhere but the server regardless. */

import type { Finding } from "./dns-check";
import { checkBlocklists } from "./blocklist-check";

/**
 * Reputation findings for the domain a campaign actually sent from.
 *
 * A blocklist listing spam-folders a technically perfect message, so a report
 * that checks authentication, unsubscribe and content but not reputation is
 * answering a narrower question than the reader is asking. It is also the half
 * of deliverability that follows the brand rather than the sending platform:
 * changing ESP does not move a domain listing.
 *
 * This reuses the census engine, which already tells a listing apart from a
 * DNSBL refusal, treats a Spamhaus PBL code as "not a listing" rather than a
 * blacklisting, and reports a list that declined to answer instead of counting
 * its silence as a pass. Nothing here invents a verdict the lookup did not give.
 *
 * Never throws. A reputation lookup that falls over must not sink the rest of
 * the report — the authentication and content findings are still worth
 * returning without it. checkBlocklists already degrades gracefully per list,
 * so a total failure is rare; when it happens, the report simply omits
 * reputation rather than showing a fabricated pass.
 *
 * The `check` seam exists so the guard behaviour can be tested without DNS.
 */
export async function campaignReputationFindings(
  fromDomain: string | null,
  check: typeof checkBlocklists = checkBlocklists,
): Promise<Finding[]> {
  if (!fromDomain) return [];
  try {
    const { findings } = await check(fromDomain);
    return findings;
  } catch {
    return [];
  }
}

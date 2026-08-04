/**
 * Which platform this domain's DNS authorises, read off the records we already
 * fetched. No new lookups, and — the part that matters — no inference beyond
 * what the record literally says.
 *
 * Every other checker prints SPF and DMARC and leaves the reader to work out
 * whose job the gap is. That question cannot be answered without knowing who
 * sends: "no DKIM key" is an afternoon of your own on a domain with no
 * platform, and one CNAME in Klaviyo's own settings screen on a domain that
 * has `include:_spf.klaviyo.com` sitting in its SPF.
 *
 * The house rule from `rules.ts` applies unchanged here. We do not claim you
 * send through a platform — we quote the mechanism that authorises it and say
 * what that does and does not prove. An SPF include is a standing permission
 * slip, and permission slips outlive the relationships that created them: a
 * domain can authorise a platform it stopped paying for two years ago. A live
 * DKIM key is the stronger evidence, because keys get rotated and revoked, so
 * a match on both is reported differently from a match on the include alone.
 *
 * Every entry below is the vendor's own documented include target or selector.
 * A platform we cannot match produces no claim at all rather than a wrong one.
 */

/**
 * What kind of mail this platform carries. Collapsing these is how a checker
 * tells a brand that Google Workspace handles its campaigns. It does not:
 * `_spf.google.com` in your SPF almost always means your staff read mail in
 * Gmail, which says nothing about where the newsletter leaves from.
 */
export type PlatformKind =
  /** Marketing / lifecycle sending. The one the reader means by "my ESP". */
  | "esp"
  /** Staff mailboxes. Present on nearly every domain and not the campaign path. */
  | "corporate"
  /** Raw sending infrastructure, usually under something else. */
  | "infrastructure";

interface PlatformDef {
  name: string;
  kind: PlatformKind;
  /** Documented SPF include targets. Matched as a suffix of the include value. */
  includes: string[];
  /** DKIM selector prefixes, without the `._domainkey` tail. */
  selectors: string[];
  /**
   * Where the DKIM key comes from when this platform is in play, named as a
   * screen. Only used when no key was found, which is the moment the reader
   * needs to know whether this is their job or a support ticket.
   */
  dkimPath?: string;
}

const PLATFORMS: PlatformDef[] = [
  {
    name: "Klaviyo",
    kind: "esp",
    includes: ["_spf.klaviyo.com"],
    selectors: ["kl", "kl2"],
    dkimPath: "Klaviyo → Settings → Domains → Sending domains, which prints the CNAMEs to paste",
  },
  {
    name: "Mailchimp",
    kind: "esp",
    includes: ["servers.mcsv.net"],
    selectors: ["k1", "k2"],
    dkimPath: "Mailchimp → Website → Domains → Verify, which prints the CNAMEs to paste",
  },
  {
    name: "Mandrill",
    kind: "infrastructure",
    includes: ["spf.mandrillapp.com"],
    selectors: ["mandrill", "mte1", "mte2"],
  },
  {
    name: "SendGrid",
    kind: "esp",
    includes: ["sendgrid.net"],
    selectors: ["s1", "s2"],
    dkimPath: "SendGrid → Settings → Sender Authentication → Authenticate Your Domain",
  },
  {
    name: "Braze",
    kind: "esp",
    includes: ["_spf.braze.com", "spf.braze.eu"],
    selectors: ["braze", "braze1", "braze2"],
  },
  {
    name: "HubSpot",
    kind: "esp",
    includes: ["_spf.hubspot.net", "hubspotemail.net"],
    selectors: ["hs1", "hs2"],
    dkimPath: "HubSpot → Settings → Marketing → Email → Connected domains",
  },
  {
    /* Marketing Cloud publishes its own include. `_spf.salesforce.com` is
       Salesforce core — case replies and workflow mail out of Sales or Service
       Cloud — and folding the two together tells a brand its newsletter goes
       through a platform it may not even license. */
    name: "Salesforce Marketing Cloud",
    kind: "esp",
    includes: ["cust-spf.exacttarget.com", "_spf.exacttarget.com"],
    selectors: ["sfmc", "exacttarget"],
  },
  {
    name: "Salesforce",
    kind: "corporate",
    includes: ["_spf.salesforce.com"],
    selectors: [],
  },
  {
    name: "Omnisend",
    kind: "esp",
    includes: ["spf.omnisend.com"],
    selectors: ["omnisend", "omnisend1"],
  },
  {
    name: "ActiveCampaign",
    kind: "esp",
    includes: ["emsd1.com", "_spf.activecampaign.com"],
    selectors: ["ac", "activecampaign"],
  },
  {
    name: "Brevo",
    kind: "esp",
    includes: ["spf.sendinblue.com", "spf.brevo.com"],
    selectors: ["brevo"],
  },
  {
    name: "Constant Contact",
    kind: "esp",
    includes: ["spf.constantcontact.com"],
    selectors: ["ctct1", "ctct2"],
  },
  {
    name: "Marketo",
    kind: "esp",
    includes: ["mktomail.com"],
    selectors: ["m1", "mktomail"],
  },
  {
    name: "Customer.io",
    kind: "esp",
    includes: ["_spf.customeriomail.com"],
    selectors: ["cio", "cioe1"],
  },
  {
    name: "Iterable",
    kind: "esp",
    includes: ["mail.iterable.com"],
    selectors: ["iterable", "iter1"],
  },
  {
    name: "Postmark",
    kind: "infrastructure",
    includes: ["spf.mtasv.net"],
    selectors: ["pm"],
  },
  {
    /* `smtp` is not listed as a selector on purpose: it is Mailgun's default
       and also the most generic four letters in email, so a match would say
       nothing. Selectors here have to be able to be wrong. */
    name: "Mailgun",
    kind: "infrastructure",
    includes: ["mailgun.org"],
    selectors: ["mg"],
  },
  {
    name: "SparkPost",
    kind: "infrastructure",
    includes: ["sparkpostmail.com"],
    selectors: ["scph0", "sparkpost"],
  },
  {
    name: "Amazon SES",
    kind: "infrastructure",
    includes: ["amazonses.com"],
    selectors: ["amazonses"],
  },
  {
    name: "Resend",
    kind: "infrastructure",
    includes: ["_spf.resend.com"],
    selectors: ["resend"],
  },
  {
    name: "Zendesk",
    kind: "infrastructure",
    includes: ["mail.zendesk.com"],
    selectors: ["zendesk1", "zendesk2"],
  },
  {
    name: "Shopify",
    kind: "infrastructure",
    includes: ["shops.shopify.com"],
    selectors: ["shopify"],
  },
  {
    name: "Google Workspace",
    kind: "corporate",
    includes: ["_spf.google.com"],
    selectors: ["google"],
  },
  {
    name: "Microsoft 365",
    kind: "corporate",
    includes: ["spf.protection.outlook.com"],
    selectors: ["selector1", "selector2"],
  },
];

/**
 * Services that hold the sender list on the domain's behalf.
 *
 * A growing share of real brands publish one include and nothing else, because
 * a hosted SPF service resolves the actual senders at delivery time — often
 * through macros, so the record literally cannot be expanded by reading it.
 * `glossier.com` publishes `include:%{i}._ip.%{h}._ehlo.%{d}._spf.vali.email`
 * and not one sender name.
 *
 * Every checker in this category goes quiet on these domains, which reads as
 * "we found nothing" when the truth is "the answer is deliberately not in
 * DNS". Saying which service holds it is more useful than saying nothing, and
 * it is the only honest thing available.
 */
const SPF_MANAGERS: { name: string; match: string[] }[] = [
  { name: "Valimail", match: ["_spf.vali.email", "vali.email"] },
  { name: "EasyDMARC", match: ["_es.easydmarc.com", "easydmarc.com"] },
  { name: "Red Sift OnDMARC", match: ["ondmarc.redsift.cloud", "redsift.cloud"] },
  { name: "dmarcian", match: ["_spf.dmarcian.com", "dmarcian.com"] },
  { name: "Sendmarc", match: ["_spf.sendmarc.com", "sendmarc.com"] },
  { name: "PowerDMARC", match: ["_spf.powerdmarc.com", "powerdmarc.com"] },
  { name: "Fraudmarc", match: ["spf.fraudmarc.com", "fraudmarc.com"] },
  { name: "Skysnag", match: ["_spf.skysnag.com", "skysnag.com"] },
];

export interface SpfManager {
  name: string;
  evidence: string;
  /** The record uses SPF macros, so it cannot be expanded by reading it at all. */
  macro: boolean;
}

/** Whoever is holding this domain's sender list, if it is not the domain itself. */
export function detectSpfManager(spf: string | null): SpfManager | null {
  if (!spf) return null;
  const lower = spf.toLowerCase();
  for (const m of SPF_MANAGERS) {
    const hit = m.match.find((t) => lower.includes(t));
    if (hit) {
      return {
        name: m.name,
        evidence:
          spfIncludes(spf).find((i) => m.match.some((t) => i.includes(t))) ?? hit,
        macro: lower.includes("%{"),
      };
    }
  }
  return null;
}

export interface PlatformEvidence {
  /** The literal token from the record. Printed verbatim, never paraphrased. */
  value: string;
  from: "spf" | "dkim";
}

/**
 * How much the record actually supports. The distinction is not pedantry —
 * `klaviyo.com` publishes a key on `k1`, which is Mailchimp's documented
 * selector and also four characters long. Reading that alone as "you send
 * through Mailchimp" is exactly the confident wrong answer this site exists
 * to not give.
 */
export type PlatformBasis =
  /** SPF authorises it and a key is published. Somebody set this up and it works. */
  | "both"
  /** SPF authorises it. A standing permission, which may long outlive its use. */
  | "spf"
  /** Only a selector matched. Suggestive, and on short selectors, collidable. */
  | "dkim";

export interface DetectedPlatform {
  name: string;
  kind: PlatformKind;
  evidence: PlatformEvidence[];
  basis: PlatformBasis;
  /**
   * A live key was found on one of this platform's selectors. An include on
   * its own only proves permission; a key proves somebody set it up and it
   * has not been revoked since.
   */
  confirmedByDkim: boolean;
  dkimPath?: string;
}

/** Every `include:` value in an SPF record, lowercased, in published order. */
export function spfIncludes(spf: string | null): string[] {
  if (!spf) return [];
  return [...spf.toLowerCase().matchAll(/\binclude:([^\s]+)/g)].map((m) => m[1]);
}

/**
 * Selector prefixes carrying a real key. `checkDomain` stores DKIM as
 * "sel._domainkey (Vendor)" for display; this wants the bare prefix.
 */
export function dkimSelectorPrefixes(dkim: string[]): string[] {
  return dkim.map((entry) => entry.split("._domainkey")[0].trim().toLowerCase());
}

/**
 * What this domain's DNS authorises. Sending platforms first, because the
 * reader's question is about campaigns; staff mail is context underneath it.
 */
export function detectPlatforms(spf: string | null, dkim: string[]): DetectedPlatform[] {
  const includes = spfIncludes(spf);
  const selectors = dkimSelectorPrefixes(dkim);

  const detected: DetectedPlatform[] = [];

  for (const def of PLATFORMS) {
    const evidence: PlatformEvidence[] = [];

    for (const inc of includes) {
      /* Suffix match, because vendors shard by region and account:
         `u123.wl.sendgrid.net` is still SendGrid. Anchored on a dot so
         `notsendgrid.net` cannot match `sendgrid.net`. */
      if (def.includes.some((target) => inc === target || inc.endsWith(`.${target}`))) {
        evidence.push({ value: `include:${inc}`, from: "spf" });
      }
    }

    for (const sel of selectors) {
      if (def.selectors.includes(sel)) {
        evidence.push({ value: `${sel}._domainkey`, from: "dkim" });
      }
    }

    if (evidence.length) {
      const hasSpf = evidence.some((e) => e.from === "spf");
      const hasDkim = evidence.some((e) => e.from === "dkim");
      detected.push({
        name: def.name,
        kind: def.kind,
        evidence,
        basis: hasSpf && hasDkim ? "both" : hasSpf ? "spf" : "dkim",
        confirmedByDkim: hasDkim,
        dkimPath: def.dkimPath,
      });
    }
  }

  const kindOrder: Record<PlatformKind, number> = { esp: 0, infrastructure: 1, corporate: 2 };
  const basisOrder: Record<PlatformBasis, number> = { both: 0, spf: 1, dkim: 2 };
  return detected.sort((a, b) => {
    if (basisOrder[a.basis] !== basisOrder[b.basis]) {
      return basisOrder[a.basis] - basisOrder[b.basis];
    }
    return kindOrder[a.kind] - kindOrder[b.kind];
  });
}

/**
 * The one a reader means by "my ESP", if the record names one at all.
 *
 * Requires SPF evidence, deliberately. SPF is the domain owner's own statement
 * of who may send as them; a lone selector match is somebody else's naming
 * convention that happens to be short. Everything downstream — whose job the
 * missing DKIM key is, which platform the ownership line names — hangs off
 * this, so it holds out for the record that actually says something.
 */
export function primarySender(detected: DetectedPlatform[]): DetectedPlatform | null {
  return detected.find((p) => p.kind === "esp" && p.basis !== "dkim") ?? null;
}

/**
 * The sentence above the evidence.
 *
 * Three claims, not one, and the gap between them is the whole reason the
 * evidence is printed underneath: a key plus a permission means somebody set
 * this up and it still works; a permission alone means only that it is
 * allowed to; a key alone means a selector matched, which on names as short
 * as `k1` is a coincidence away from being wrong.
 */
export function platformClaim(p: DetectedPlatform): string {
  if (p.basis === "both") return `You send through ${p.name}`;
  if (p.basis === "spf") return `Your SPF authorises ${p.name}`;
  return `A DKIM key is published on ${p.name}'s selector`;
}

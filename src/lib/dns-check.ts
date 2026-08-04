import "server-only";

import { promises as dns } from "node:dns";
import type { StageId } from "@/content/how-email-works";
import type { Ownership } from "@/lib/types";
import {
  detectPlatforms,
  detectSpfManager,
  primarySender,
  signingButUnauthorised,
  spfAuthorised,
  type DetectedPlatform,
  type SpfManager,
} from "@/lib/sending-platform";

/**
 * A real check, not a score.
 *
 * Everything here is a live DNS lookup against the domain the visitor typed.
 * Each finding names the rule it comes from, so the result is traceable to a
 * dated, cited page rather than to our opinion. Where we cannot know
 * something from DNS alone, the finding says so instead of guessing.
 */

export type Severity = "fail" | "warn" | "pass" | "info";

export interface Finding {
  severity: Severity;
  title: string;
  detail: string;
  /**
   * Whose job this one is.
   *
   * Severity says how much it should worry you; this says who has to move,
   * and they are genuinely different questions. Every other checker answers
   * only the first, which is why a reader finishes a clean-looking report
   * still not knowing whether to open a DNS console or a support ticket.
   *
   * Set per finding rather than inherited from the cited rule, because one
   * rule produces findings with different owners: "no DKIM key" is a support
   * ticket on a domain that authorises Klaviyo and an afternoon of your own
   * on a domain that authorises nobody.
   */
  ownership?: Ownership;
  /**
   * The one concrete first move, naming the real screen — phrased against
   * whichever platform the record actually authorises, where we found one.
   */
  mondayMorning?: string;
  /** Slug of the rule this comes from, so every finding is traceable. */
  rule?: string;
  /**
   * Glossary term id. The rule says what you are obliged to do; the term
   * shows the artefact — the literal record, the header block, the SMTP
   * code. Someone reading "DKIM passes but does not align" needs to see the
   * thing before the obligation means anything, and this is the only moment
   * on the site where they have already been told something is wrong.
   */
  term?: string;
  /**
   * Which stop on the journey this happens at.
   *
   * /how-email-works already teaches email as eight stops, and a finding is
   * always something that went right or wrong at exactly one of them. Naming
   * it lets a real message be read along the same eight stops the explainer
   * uses for a hypothetical one. Omitted where the finding's glossary term
   * already implies the stop, which is most of them.
   */
  stage?: StageId;
  /** Raw record, shown verbatim so the reader can check our work. */
  evidence?: string;
}

/**
 * Selectors used by the platforms an email marketer is actually on. DKIM
 * cannot be enumerated from DNS: you must know the selector, so real tools
 * probe the common ones. A miss here is genuinely inconclusive and the
 * finding says exactly that rather than claiming DKIM is absent.
 */
const SELECTORS: [string, string][] = [
  ["kl._domainkey", "Klaviyo"],
  ["kl2._domainkey", "Klaviyo"],
  ["google._domainkey", "Google Workspace"],
  ["selector1._domainkey", "Microsoft 365"],
  ["selector2._domainkey", "Microsoft 365"],
  ["k1._domainkey", "Mailchimp"],
  ["k2._domainkey", "Mailchimp"],
  ["s1._domainkey", "SendGrid"],
  ["s2._domainkey", "SendGrid"],
  ["pm._domainkey", "Postmark"],
  ["mandrill._domainkey", "Mandrill"],
  ["dkim._domainkey", "generic"],
  ["default._domainkey", "generic"],
  ["mail._domainkey", "generic"],
];

export function normaliseDomain(raw: string): string | null {
  const d = raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .split("@")
    .pop();
  if (!d) return null;
  // Deliberately permissive: punycode and long TLDs are both legitimate.
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(d) ? d : null;
}

async function txt(name: string): Promise<string[]> {
  try {
    const records = await dns.resolveTxt(name);
    return records.map((chunks) => chunks.join(""));
  } catch {
    return [];
  }
}

/**
 * The record, as opposed to our reading of it.
 *
 * Findings are prose and they are sorted by how much they should worry you.
 * That is the right shape for "what should I do" and the wrong shape for
 * "what is actually published", which is the question somebody arrives with
 * and currently has to reconstruct by reading eight paragraphs. These are the
 * same lookups, kept rather than thrown away after the sentence was written.
 */
export interface DomainFacts {
  spf: string | null;
  /** The all-mechanism as published: -all, ~all, +all, ?all. */
  spfAll: string | null;
  spfLookups: number;
  dmarc: string | null;
  dmarcPolicy: string | null;
  dmarcHasRua: boolean;
  /** "selector (vendor)" for every selector carrying a real key. */
  dkim: string[];
  dkimWildcard: boolean;
  bimi: string | null;
  mx: string[];
  mxProvider: string | null;
}

export interface CheckResult {
  domain: string;
  checkedAt: string;
  findings: Finding[];
  facts: DomainFacts;
  /**
   * Who this domain's DNS authorises to send as it. Drives the ownership
   * split: without it, "no DKIM key" cannot be told from "no DKIM key and
   * the platform that would publish one is right there in your SPF".
   */
  platforms: DetectedPlatform[];
  /** Set when a hosted SPF service holds the sender list instead of this record. */
  spfManager: SpfManager | null;
}

export async function checkDomain(domain: string): Promise<CheckResult> {
  const [spfRecords, dmarcRecords, bimiRecords, mx] = await Promise.all([
    txt(domain),
    txt(`_dmarc.${domain}`),
    txt(`default._bimi.${domain}`),
    dns.resolveMx(domain).catch(() => []),
  ]);

  const facts: DomainFacts = {
    spf: null,
    spfAll: null,
    spfLookups: 0,
    dmarc: null,
    dmarcPolicy: null,
    dmarcHasRua: false,
    dkim: [],
    dkimWildcard: false,
    bimi: null,
    mx: [],
    mxProvider: null,
  };

  /* ── Every record first, opinions second ───────────────────────────────
     Findings used to be written as each lookup returned, which meant the SPF
     verdict was already on the page before we knew whether the domain even
     names a sending platform. Whose job a gap is depends entirely on that, so
     the facts are all gathered here and judged below. */

  const spf = spfRecords.find((r) => r.toLowerCase().startsWith("v=spf1"));
  facts.spf = spf ?? null;
  if (spf) {
    facts.spfAll = /[~\-+?]all/.exec(spf)?.[0] ?? null;
    facts.spfLookups = (spf.match(/\b(include|a|mx|ptr|exists|redirect)[:=]/g) ?? []).length;
  }

  const dmarc = dmarcRecords.find((r) => r.toLowerCase().startsWith("v=dmarc1"));
  facts.dmarc = dmarc ?? null;
  if (dmarc) {
    facts.dmarcPolicy = /p=(none|quarantine|reject)/i.exec(dmarc)?.[1]?.toLowerCase() ?? null;
    facts.dmarcHasRua = /rua=/i.test(dmarc);
  }

  /* Probe a selector that cannot exist first. Some domains publish a wildcard
     under _domainkey, which makes every selector "resolve" and would turn this
     whole section into a false positive. example.com does exactly this. */
  const wildcardProbe = await txt(`zz-no-such-selector-probe._domainkey.${domain}`);
  const hasWildcard = wildcardProbe.some((r) => r.toLowerCase().includes("v=dkim1"));

  /* An empty p= is a revoked key under RFC 6376, not a working one. Requiring
     real base64 after p= is the difference between reading the record and
     merely finding it. */
  const hasRealKey = (records: string[]) =>
    records.some((r) => /p=\s*[A-Za-z0-9+/]{40,}/.test(r));

  const found: string[] = [];
  if (!hasWildcard) {
    await Promise.all(
      SELECTORS.map(async ([sel, vendor]) => {
        if (hasRealKey(await txt(`${sel}.${domain}`))) found.push(`${sel} (${vendor})`);
      }),
    );
  }

  facts.dkim = [...found].sort();
  facts.dkimWildcard = hasWildcard;
  facts.bimi = bimiRecords.find((r) => r.toLowerCase().startsWith("v=bimi1")) ?? null;

  const mxHosts = mx.map((m) => m.exchange.toLowerCase());
  const mxProvider = mxHosts.some((h) => h.includes("google"))
    ? "Google Workspace"
    : mxHosts.some((h) => h.includes("outlook") || h.includes("microsoft"))
      ? "Microsoft 365"
      : null;
  facts.mx = mxHosts;
  facts.mxProvider = mxProvider;

  /* ── Who this domain authorises ────────────────────────────────────── */
  const platforms = detectPlatforms(facts.spf, facts.dkim);
  const sender = primarySender(platforms);
  const authorised = spfAuthorised(platforms);
  const spfManager = detectSpfManager(facts.spf);

  const findings: Finding[] = [];

  /* ── SPF ───────────────────────────────────────────────────────────── */
  if (!spf) {
    findings.push({
      severity: "fail",
      title: "No SPF record",
      detail:
        "Gmail requires SPF from bulk senders, and Outlook rejects unauthenticated mail outright with 550 5.7.515. Without SPF you are failing both.",
      ownership: "yours",
      mondayMorning: sender
        ? `${sender.name} publishes the exact include: line to use — it cannot publish it into your DNS for you. Add the record with ~all today, then tighten to -all once a week of DMARC reports names nothing you cannot account for.`
        : "Publish one TXT record at the root of the domain. Start with ~all while you are still finding out what sends as you, and tighten to -all only once the reports are quiet.",
      rule: "gmail-bulk-sender-requirements",
      term: "spf",
    });
  } else {
    const all = /[~\-+?]all/.exec(spf)?.[0];
    /* Everything before the all-mechanism that could authorise a sender. A
       record with none of them authorises nobody, whatever its all value. */
    const authorises = (spf.match(/\b(include:|a[:\s]|mx[:\s]|ip4:|ip6:|exists:|ptr)/gi) ?? [])
      .length;

    if (all === "+all") {
      findings.push({
        severity: "fail",
        title: "SPF ends in +all, which authorises the entire internet",
        detail: "This passes SPF for any sender alive. It is worse than having no record.",
        ownership: "yours",
        mondayMorning:
          "Change the +all to ~all in your DNS today. It is a one-character edit, nothing legitimate needs +all, and no platform can make it for you.",
        rule: "gmail-bulk-sender-requirements",
        term: "spf",
        evidence: spf,
      });
    } else if (authorises === 0) {
      /* The finding no other checker prints, because it looks like the
         strictest possible setting and reads as a pass everywhere. A record
         that authorises nobody is exactly right for a domain that sends
         nothing, and total breakage for one that sends. Only the reader knows
         which, so this asks rather than grading. */
      findings.push({
        severity: "warn",
        title: "This SPF record authorises nobody at all",
        detail:
          "There is no include:, ip4: or mx before the all mechanism, so the record says that no host on the internet may send as this domain. That is the correct setting for a domain nobody sends from, and it means every message fails SPF on a domain somebody does.",
        ownership: "yours",
        mondayMorning:
          "Answer one question: does any campaign leave from this exact domain? If nothing does, this record is right and you are finished. If something does, send yourself one message and read the Authentication-Results header — it will say spf=fail, and it has been saying so since the record went up.",
        rule: "gmail-bulk-sender-requirements",
        term: "spf",
        evidence: spf,
      });
    } else {
      findings.push({
        severity: "pass",
        title: `SPF present, ending ${all ?? "with no all mechanism"}`,
        detail:
          all === "-all"
            ? "Hard fail. The strictest setting and the right one once you are confident every sender is listed."
            : "Soft fail. Accepted everywhere, though -all is stronger once your sender list is complete.",
        ownership: "context",
        term: "spf",
        evidence: spf,
      });
    }

    const lookups = (spf.match(/\b(include|a|mx|ptr|exists|redirect)[:=]/g) ?? []).length;
    if (lookups > 10) {
      findings.push({
        severity: "warn",
        title: `SPF may exceed the 10 DNS lookup limit (${lookups} mechanisms)`,
        detail:
          "Past ten lookups SPF returns permerror and receivers treat it as a failure. This is a slow, silent breakage that usually appears after someone adds one more tool.",
        ownership: "shared",
        mondayMorning:
          "Read your own record and name the tool behind every include. The ones you no longer pay for come out today, and that part is yours. If you are still over ten after that, ask each remaining platform whether it publishes a flattened include — several do, and none will volunteer it.",
        rule: "spf-ten-lookup-limit-returns-permerror",
        term: "spf",
      });
    }
  }

  /* ── DMARC ─────────────────────────────────────────────────────────── */
  if (!dmarc) {
    findings.push({
      severity: "fail",
      title: "No DMARC record",
      detail:
        "This is the requirement no ESP can meet for you, because it lives on your own DNS. Microsoft rejects high-volume mail without it, and Gmail requires it above 5,000 a day.",
      ownership: "yours",
      mondayMorning:
        "Publish v=DMARC1; p=none; rua=mailto: with an address somebody actually opens. At p=none it changes nothing about delivery, and it starts the reports you need before you could safely enforce anything.",
      rule: "dmarc-policy-none-is-not-enforcement",
      term: "dmarc",
    });
  } else {
    const policy = /p=(none|quarantine|reject)/i.exec(dmarc)?.[1]?.toLowerCase();
    const hasRua = /rua=/i.test(dmarc);
    const enforcing = policy === "quarantine" || policy === "reject";

    findings.push({
      /* This used to be graded a pass whose own detail sentence read
         "protects nothing", and the page then totalled the passes and printed
         "Nothing here needs you" over an unenforced domain. The shelf has
         always called p=none the reader's job; the check now agrees with it. */
      severity: enforcing ? "pass" : "warn",
      title: `DMARC present with p=${policy ?? "unset"}`,
      detail: enforcing
        ? "A policy that actually instructs receivers, which is more than most senders publish."
        : "This satisfies Gmail and Outlook, and protects nothing. p=none only asks for reports; it never tells a receiver to act, so anyone can still send as this domain and nothing happens.",
      ownership: enforcing ? "context" : "yours",
      mondayMorning: enforcing
        ? undefined
        : `Move to p=quarantine with pct=5 once a week of aggregate reports shows no unaligned sender you cannot name. ${sender ? `${sender.name} signs your mail; it cannot choose your policy.` : "No platform can choose your policy."} This one has never been anybody else's.`,
      rule: "dmarc-policy-none-is-not-enforcement",
      term: "dmarc",
      evidence: dmarc,
    });

    if (!hasRua) {
      findings.push({
        severity: "warn",
        title: "DMARC has no rua address, so nobody is reading the reports",
        detail:
          "Aggregate reports are the only way to discover a tool that sends as you without permission. Most agencies stop at p=none and never look again.",
        ownership: "yours",
        mondayMorning:
          "Add rua=mailto: to the record, pointed at an inbox a person opens. Reports arrive as daily XML from every major receiver, and this site reads them for free if you would rather not.",
        rule: "dmarc-policy-none-is-not-enforcement",
        term: "rua",
      });
    }
  }

  /* ── DKIM ──────────────────────────────────────────────────────────── */
  if (hasWildcard) {
    findings.push({
      severity: "warn",
      title: "A wildcard record answers every DKIM selector",
      detail: wildcardProbe.some((r) => /p=\s*(;|$)/.test(r))
        ? "Every selector we tried returns a record with an empty p= value, which under RFC 6376 means the key is revoked. Selector probing tells you nothing on this domain, and any tool reporting DKIM as present here is reading the wildcard, not a key."
        : "Every selector we tried resolves, including ones we invented, so we cannot tell which keys are real. Selector probing is meaningless on this domain.",
      ownership: "yours",
      mondayMorning:
        "Find the wildcard entry under _domainkey in your DNS and remove it. Until it is gone, neither you nor any tool you hire can tell a working key from an absent one on this domain.",
      rule: "empty-dkim-p-value-is-a-revoked-key",
      term: "dkim",
      evidence: wildcardProbe[0],
    });
  } else if (found.length) {
    findings.push({
      severity: "pass",
      title: `DKIM keys published on ${found.length} selector${found.length > 1 ? "s" : ""}`,
      detail:
        "A key existing is not the same as alignment working. Read a real received header and check the d= value matches your From domain before you call this done.",
      ownership: "shared",
      mondayMorning: `The key is ${sender ? `${sender.name}'s` : "your platform's"} to publish and it has. Whether it signs the domain in your From line is yours to confirm, and DNS cannot show it — send one campaign to yourself and look for dkim=pass header.d=${domain} in the Authentication-Results header.`,
      rule: "dkim-alignment-vs-dkim-passing",
      term: "alignment",
      evidence: found.join(", "),
    });
  } else if (sender) {
    /* Graded info and shrugged at until now. On a domain whose own SPF names
       the platform that would publish the key, an absent key is not
       inconclusive — it is a setup step nobody finished. */
    findings.push({
      severity: "warn",
      title: `No DKIM key, on a domain that authorises ${sender.name}`,
      detail: `Your SPF authorises ${sender.name} to send as this domain, and no key is published on any selector ${sender.name} uses. Mail may still pass SPF, but it cannot pass DKIM, and DKIM is the half that survives forwarding.`,
      ownership: "shared",
      mondayMorning: sender.dkimPath
        ? `${sender.dkimPath}. ${sender.name} generates the key; pasting the records into DNS is the half nobody can do for you.`
        : `Open ${sender.name}'s sending-domain settings and start domain authentication. ${sender.name} generates the key and prints the records; pasting them into DNS is the half nobody can do for you.`,
      rule: "dkim-alignment-vs-dkim-passing",
      term: "dkim",
    });
  } else {
    findings.push({
      severity: "info",
      title: "No DKIM key found on the selectors we know",
      detail:
        "This is inconclusive, not a failure. DKIM selectors cannot be listed from DNS, so we probed the common ones for Klaviyo, Google, Microsoft, Mailchimp, SendGrid and Postmark. A custom selector will not show up here.",
      ownership: "context",
      rule: "dkim-alignment-vs-dkim-passing",
      term: "dkim",
    });
  }

  /* ── The two records, read against each other ──────────────────────────
     Everything above grades one record at a time, which is what every checker
     in this category does and why they all miss this. A domain whose SPF is
     "present" and whose DKIM is "present" reads as healthy right up until you
     notice they name different companies. */
  for (const orphan of signingButUnauthorised(platforms)) {
    findings.push({
      severity: "fail",
      title: `${orphan.name} signs your mail, and your SPF does not authorise it`,
      detail: `${orphan.dkimSelectors} of ${orphan.name}'s selectors carry live keys on this domain, so ${orphan.name} is demonstrably signing mail as you. Your SPF record does not list ${orphan.name} anywhere${
        authorised.length
          ? ` — it authorises ${authorised.map((a) => a.name).join(" and ")} instead`
          : ""
      }. Every campaign ${orphan.name} sends is failing SPF right now and surviving on DKIM alignment alone, which holds until one key is rotated, revoked or misconfigured.`,
      ownership: "yours",
      mondayMorning: `Add ${orphan.name}'s include: to your SPF today — ${orphan.name} publishes the exact line and cannot put it in your DNS for you. Then send one campaign to yourself and confirm the Authentication-Results header reads spf=pass, not spf=softfail.`,
      rule: "gmail-bulk-sender-requirements",
      term: "spf",
      evidence: `${facts.spf ?? "no SPF record"}\n${orphan.evidence
        .filter((e) => e.from === "dkim")
        .map((e) => e.value)
        .join(", ")}`,
    });
  }

  /* ── Context, not obligations ──────────────────────────────────────── */
  if (facts.bimi) {
    findings.push({
      severity: "info",
      title: "BIMI record published",
      detail:
        "Your logo can appear in supporting clients, which needs DMARC at quarantine or reject.",
      ownership: "context",
      term: "bimi",
    });
  }
  if (mxHosts.length) {
    findings.push({
      severity: "info",
      title: mxProvider ? `Receiving mail via ${mxProvider}` : "MX records present",
      detail:
        "Where you receive mail says nothing about where you send it. Marketing sends usually leave through a different platform entirely.",
      ownership: "context",
      term: "dns",
      evidence: mxHosts.slice(0, 3).join(", "),
    });
  }

  const order: Record<Severity, number> = { fail: 0, warn: 1, pass: 2, info: 3 };
  findings.sort((a, b) => order[a.severity] - order[b.severity]);

  return {
    domain,
    checkedAt: new Date().toISOString().slice(0, 10),
    findings,
    facts,
    platforms,
    spfManager,
  };
}

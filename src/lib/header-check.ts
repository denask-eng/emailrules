import type { Finding, Severity } from "./dns-check";

export interface HeaderField {
  name: string;
  lower: string;
  value: string;
}

export interface DkimSignatureFact {
  d: string | null;
  s: string | null;
  raw: string;
}

export interface AuthenticationMethodFact {
  result: string;
  headerD: string | null;
  headerFrom: string | null;
  smtpMailfrom: string | null;
  raw: string;
}

export interface AuthenticationFacts {
  authservId: string;
  spf: AuthenticationMethodFact | null;
  dkim: AuthenticationMethodFact[];
  dmarc: AuthenticationMethodFact | null;
  raw: string;
}

export interface HeaderFacts {
  fromDomain: string | null;
  dkim: DkimSignatureFact[];
  auth: AuthenticationFacts | null;
  returnPathDomain: string | null;
  receivedSpf: string | null;
  listUnsubscribe: {
    uris: string[];
    hasHttps: boolean;
  };
  listUnsubscribePost: string | null;
  /**
   * Whether this message reached us via a forward or a resend.
   *
   * This matters more than it sounds. Forwarding strips `List-Unsubscribe`
   * and `List-Unsubscribe-Post` — Gmail removes both — so a perfectly
   * compliant bulk campaign arrives here looking like one that never set them.
   * Reporting that as a finding tells a sender to fix something that is not
   * broken, which is the worst failure this site can have.
   *
   * We cannot re-create the headers a forward destroyed. What we can do is
   * notice the forward and say the evidence is gone instead of pretending its
   * absence is a result.
   */
  forwarded: {
    likely: boolean;
    /** The header or pattern that gave it away, for the reader to check. */
    signals: string[];
  };
}

export type HeaderCheckError = "gmail-summary" | "no-headers" | "too-large";

export type HeaderAnalysis =
  | { ok: true; facts: HeaderFacts; findings: Finding[] }
  | { ok: false; error: HeaderCheckError };

export type Alignment = "strict" | "relaxed" | "none";

/* The whole message now, not only its headers: the body is where the postal
   address, the pixel and the text Apple summarises all live. A real campaign
   with base64 images inline runs to a megabyte or two, and everything past
   this ceiling is untrusted input we have no reason to hold. */
export const MAX_MESSAGE_BYTES = 2 * 1024 * 1024;
const RECEIVER_GROUND_TRUTH = "Where a receiver recorded its own verdict, that verdict wins.";

const RULE = {
  gmail: "gmail-bulk-sender-requirements",
  dkimAlignment: "dkim-alignment-vs-dkim-passing",
  outlook: "outlook-high-volume-sender-authentication",
  oneClick: "one-click-unsubscribe-rfc-8058",
} as const;

/**
 * The glossary term behind each rule, used as a default.
 *
 * A finding tells someone what is wrong and the rule tells them what they are
 * obliged to do. Neither shows them the thing — the header block where
 * dkim=pass sits next to dmarc=fail, or the two headers that make an
 * unsubscribe RFC 8058. This is the one moment on the site where a reader has
 * already been told something is broken, so it is the moment the artefact is
 * worth most. Individual findings override it where a more precise word
 * exists.
 */
const TERM_BY_RULE: Record<string, string> = {
  [RULE.gmail]: "spf",
  [RULE.dkimAlignment]: "alignment",
  [RULE.outlook]: "dmarc",
  [RULE.oneClick]: "one-click-unsub",
};

const MULTI_LABEL_SUFFIXES = new Set([
  "co.uk",
  "org.uk",
  "ac.uk",
  "com.au",
  "net.au",
  "co.jp",
  "co.nz",
  "com.br",
  "co.in",
  "com.mx",
  "co.za",
  "com.sg",
  "com.tr",
  "co.kr",
  "com.cn",
]);

const SEVERITY_ORDER: Record<Severity, number> = {
  fail: 0,
  warn: 1,
  pass: 2,
  info: 3,
};

/** Parse an RFC 5322 header block without touching the message body. */
export function unfoldHeaders(raw: string): HeaderField[] {
  const lines = raw.replace(/\r\n?/g, "\n").split("\n");
  const headers: HeaderField[] = [];
  let current: HeaderField | null = null;

  for (const line of lines) {
    if (line === "") break;

    if (/^[ \t]/.test(line)) {
      if (current) current.value += ` ${line.trim()}`;
      continue;
    }

    const colon = line.indexOf(":");
    if (colon < 1) {
      current = null;
      continue;
    }

    const name = line.slice(0, colon).trim();
    if (!name) {
      current = null;
      continue;
    }

    current = {
      name,
      lower: name.toLowerCase(),
      value: line.slice(colon + 1).trim(),
    };
    headers.push(current);
  }

  return headers;
}

/**
 * Gmail's copied summary looks header-like, but omits the signed message. It
 * must not be analysed as though its PASS labels were raw headers.
 */
export function detectGmailSummaryTable(raw: string): boolean {
  const normalised = raw.replace(/\r\n?/g, "\n");
  const hasRawTransitOrSignature = /^(?:received|dkim-signature)\s*:/im.test(normalised);
  if (hasRawTransitOrSignature) return false;

  const hasMessageId = /^message id(?:\s*:|\s+|$)/im.test(normalised);
  const hasCreatedAt = /^created at\s*:/im.test(normalised);
  const hasVerdict = /^(?:spf|dkim|dmarc)\s*:\s*["']?(?:pass|fail|neutral|softfail|none)/im.test(
    normalised,
  );

  return hasMessageId && hasCreatedAt && hasVerdict;
}

function normaliseDomain(domain: string): string | null {
  const value = domain.trim().toLowerCase().replace(/^\.+|\.+$/g, "");
  if (!value || /\s/.test(value)) return null;
  return /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(value) ? value : null;
}

/** Prefer the final angle-bracket mailbox, then the first visible addr-spec. */
function addressDomain(value: string): string | null {
  const bracketed = [...value.matchAll(/<([^<>]*)>/g)];
  let address: string | null = null;

  if (bracketed.length) {
    address = bracketed[bracketed.length - 1][1].trim();
  } else {
    const match = value.match(/[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?/i);
    address = match?.[0] ?? null;
  }

  if (!address) return null;
  const at = address.lastIndexOf("@");
  if (at < 0 || at === address.length - 1) return null;
  return normaliseDomain(address.slice(at + 1));
}

function dkimTag(value: string, tag: "d" | "s"): string | null {
  const match = new RegExp(`(?:^|;)\\s*${tag}\\s*=\\s*([^;\\s]+)`, "i").exec(value);
  return match ? match[1].trim().toLowerCase() : null;
}

function authProperty(value: string, property: "header.d" | "header.from" | "smtp.mailfrom") {
  const escaped = property.replace(".", "\\.");
  const match = new RegExp(
    `(?:^|[\\s;(])${escaped}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s;()]+))`,
    "i",
  ).exec(value);
  const result = match?.[1] ?? match?.[2] ?? match?.[3];
  return result ? result.trim().toLowerCase() : null;
}

function parseAuthenticationResults(value: string): AuthenticationFacts {
  const segments = value.split(";");
  const authservId = segments.shift()?.trim().match(/^[^\s;(]+/)?.[0] ?? "unknown receiver";
  const methods: Array<AuthenticationMethodFact & { method: "spf" | "dkim" | "dmarc" }> = [];

  for (const segment of segments) {
    const match = /^\s*(spf|dkim|dmarc)\s*=\s*([^\s;(]+)/i.exec(segment);
    if (!match) continue;

    methods.push({
      method: match[1].toLowerCase() as "spf" | "dkim" | "dmarc",
      result: match[2].toLowerCase(),
      headerD: authProperty(segment, "header.d"),
      headerFrom: authProperty(segment, "header.from"),
      smtpMailfrom: authProperty(segment, "smtp.mailfrom"),
      raw: segment.trim(),
    });
  }

  const withoutMethod = (
    method: AuthenticationMethodFact & { method: "spf" | "dkim" | "dmarc" },
  ): AuthenticationMethodFact => ({
    result: method.result,
    headerD: method.headerD,
    headerFrom: method.headerFrom,
    smtpMailfrom: method.smtpMailfrom,
    raw: method.raw,
  });

  return {
    authservId,
    spf: methods.find((method) => method.method === "spf")
      ? withoutMethod(methods.find((method) => method.method === "spf")!)
      : null,
    dkim: methods.filter((method) => method.method === "dkim").map(withoutMethod),
    dmarc: methods.find((method) => method.method === "dmarc")
      ? withoutMethod(methods.find((method) => method.method === "dmarc")!)
      : null,
    raw: value,
  };
}

/**
 * RFC 2047 encoded-words, decoded in place.
 *
 * Klaviyo-via-SendGrid ships List-Unsubscribe as a chain of `=?us-ascii?Q?…?=`
 * words, so the angle brackets around the URI arrive as `=3C` and `=3E` and a
 * literal-text scan sees no URI at all — a checker-side miss this codebase has
 * paid for once already. Whitespace between two encoded words is transparent
 * per the RFC and is dropped. Kept local: message-rules imports this module,
 * so the decoder there cannot be imported back without a cycle.
 */
function decodeRfc2047(value: string): string {
  return value.replace(
    /=\?[^?\s]+\?([bBqQ])\?([^?\s]*)\?=(\s+(?==\?[^?\s]+\?[bBqQ]\?))?/g,
    (whole, encoding: string, payload: string) => {
      try {
        if (encoding.toLowerCase() === "b") return Buffer.from(payload, "base64").toString("utf8");
        return payload
          .replace(/_/g, " ")
          .replace(/=([0-9A-Fa-f]{2})/g, (_hex, pair: string) =>
            String.fromCharCode(parseInt(pair, 16)),
          );
      } catch {
        return whole;
      }
    },
  );
}

function unsubscribeUris(headers: HeaderField[]): string[] {
  const uris: string[] = [];

  for (const header of headers.filter((candidate) => candidate.lower === "list-unsubscribe")) {
    const value = decodeRfc2047(header.value);
    const bracketed = [...value.matchAll(/<([^<>]+)>/g)].map((match) => match[1].trim());
    const candidates = bracketed.length ? bracketed : value.split(",").map((part) => part.trim());
    uris.push(...candidates.filter(Boolean));
  }

  return uris;
}

/**
 * Signals that a message was forwarded or resent rather than delivered to us.
 *
 * Deliberately conservative: every one of these is a header a mail client
 * writes when a human forwards something, or the RFC 5322 resend block. A
 * long Received chain is NOT used — legitimate bulk mail routes through
 * several hops and that would flag half the campaigns we see.
 */
function forwardSignals(headers: HeaderField[]): string[] {
  const signals: string[] = [];

  for (const name of ["x-forwarded-for", "x-forwarded-to", "x-forwarded-message-id"]) {
    if (headers.some((h) => h.lower === name)) signals.push(name);
  }
  for (const name of ["resent-from", "resent-to", "resent-date", "resent-message-id"]) {
    if (headers.some((h) => h.lower === name)) signals.push(name);
  }

  /* Localised forward prefixes. Anchored, so a subject that merely discusses
     forwarding does not qualify. */
  const subject = headers.find((h) => h.lower === "subject")?.value ?? "";
  if (/^\s*(?:fwd?|fw|wg|tr|rv|vs|vb|enc|i|továbbítás)\s*:/i.test(subject)) {
    signals.push("subject prefix");
  }

  return signals;
}

export function extractFacts(headers: HeaderField[]): HeaderFacts {
  const from = headers.find((header) => header.lower === "from");
  const returnPath = headers.find((header) => header.lower === "return-path");
  const authentication = headers.find((header) => header.lower === "authentication-results");
  const uris = unsubscribeUris(headers);

  return {
    fromDomain: from ? addressDomain(from.value) : null,
    dkim: headers
      .filter((header) => header.lower === "dkim-signature")
      .map((header) => ({
        d: dkimTag(header.value, "d"),
        s: dkimTag(header.value, "s"),
        raw: header.value,
      })),
    auth: authentication ? parseAuthenticationResults(authentication.value) : null,
    returnPathDomain: returnPath ? addressDomain(returnPath.value) : null,
    receivedSpf:
      headers.find((header) => header.lower === "received-spf")?.value ?? null,
    listUnsubscribe: {
      uris,
      hasHttps: uris.some((uri) => /^https:\/\//i.test(uri)),
    },
    listUnsubscribePost:
      headers.find((header) => header.lower === "list-unsubscribe-post")?.value ?? null,
    forwarded: (() => {
      const signals = forwardSignals(headers);
      return { likely: signals.length > 0, signals };
    })(),
  };
}

export function orgDomainGuess(domain: string): string {
  const labels = domain
    .trim()
    .toLowerCase()
    .replace(/^\.+|\.+$/g, "")
    .split(".")
    .filter(Boolean);
  if (labels.length <= 2) return labels.join(".");

  const lastTwo = labels.slice(-2).join(".");
  return MULTI_LABEL_SUFFIXES.has(lastTwo)
    ? labels.slice(-3).join(".")
    : lastTwo;
}

export function alignment(
  a: string | null | undefined,
  b: string | null | undefined,
): Alignment {
  if (!a || !b) return "none";
  const left = a.trim().toLowerCase().replace(/\.$/, "");
  const right = b.trim().toLowerCase().replace(/\.$/, "");
  if (!left || !right) return "none";
  if (left === right) return "strict";
  return orgDomainGuess(left) === orgDomainGuess(right) ? "relaxed" : "none";
}

function inferred(detail: string): string {
  return `${detail} ${RECEIVER_GROUND_TRUTH}`;
}

function authSeverity(result: string): Severity {
  if (result === "pass") return "pass";
  if (result === "fail") return "fail";
  return "warn";
}

function bestAlignment(values: Alignment[]): Alignment {
  if (values.includes("strict")) return "strict";
  if (values.includes("relaxed")) return "relaxed";
  return "none";
}

export interface AnalyzeOptions {
  /**
   * True when this message was sent to one of our one-time check addresses.
   *
   * The check inbox takes delivery on Amazon SES, so every message checked
   * that way carries `Authentication-Results: amazonses.com; …`. A sender who
   * just pressed send in Klaviyo reads "SPF=pass at amazonses.com" and asks
   * what Amazon is doing in their pipeline — the honest answer is that it is
   * our side of the wire, and the report has to say so itself.
   */
  checkInbox?: boolean;
}

export function analyzeHeaders(raw: string, options: AnalyzeOptions = {}): HeaderAnalysis {
  if (new TextEncoder().encode(raw).byteLength > MAX_MESSAGE_BYTES) {
    return { ok: false, error: "too-large" };
  }
  if (detectGmailSummaryTable(raw)) return { ok: false, error: "gmail-summary" };

  const headers = unfoldHeaders(raw);
  if (!headers.length) return { ok: false, error: "no-headers" };

  const facts = extractFacts(headers);
  const findings: Finding[] = [];
  const fromHeaders = headers.filter((header) => header.lower === "from");
  const returnPathHeader = headers.find((header) => header.lower === "return-path");
  const dkimEvidence = facts.dkim.map((signature) => `DKIM-Signature: ${signature.raw}`).join("\n");

  if (facts.auth) {
    const receiver = facts.auth.authservId;
    findings.push({
      severity: "info",
      title: `${receiver} received this message; it did not send it`,
      detail: options.checkInbox
        ? `Your platform sent this message and ${receiver} is where it landed: our check inbox takes delivery on Amazon SES, so that name belongs to the receiving side, not to your sending setup. What it recorded on arrival outranks anything we work out ourselves.`
        : `Authentication-Results is written by the mail server that received this message — the inbox side, not the sender. What it recorded on arrival outranks anything we work out ourselves.`,
      rule: RULE.outlook,
      term: "headers",
      evidence: `Authentication-Results: ${facts.auth.raw}`,
    });

    const addAuthenticationFinding = (
      label: "SPF" | "DKIM" | "DMARC",
      method: AuthenticationMethodFact,
      rule: string,
    ) => {
      findings.push({
        severity: authSeverity(method.result),
        title: `${label}=${method.result} on arrival`,
        detail: options.checkInbox
          ? `Recorded by ${receiver}, the server our check inbox receives on — the receiving side of this message, not your sending platform, and not our inference.`
          : `Recorded by ${receiver}, the server that received this message. This is its own ${label} result, not our inference.`,
        rule,
        term: label.toLowerCase(),
        evidence: method.raw,
      });
    };

    if (facts.auth.spf) addAuthenticationFinding("SPF", facts.auth.spf, RULE.gmail);
    for (const result of facts.auth.dkim) {
      addAuthenticationFinding("DKIM", result, RULE.dkimAlignment);
    }
    if (facts.auth.dmarc) {
      addAuthenticationFinding("DMARC", facts.auth.dmarc, RULE.outlook);
    }
  } else {
    findings.push({
      severity: "info",
      title: "This message carries no receiver verdict",
      detail: inferred(
        "There is no Authentication-Results header, so every finding here is our own reading of the message, not a receiver's verdict.",
      ),
      rule: RULE.dkimAlignment,
    });
  }

  if (facts.receivedSpf && !facts.auth) {
    findings.push({
      severity: "info",
      title: "Received-SPF is present, but it is not a DMARC verdict",
      detail: inferred("This header records an SPF result only; it cannot prove DMARC alignment."),
      rule: RULE.gmail,
      evidence: `Received-SPF: ${facts.receivedSpf}`,
    });
  }

  if (fromHeaders.length > 1) {
    findings.push({
      severity: "warn",
      title: `This message has ${fromHeaders.length} From headers`,
      detail: inferred("The first From header is used. Multiple From headers make alignment ambiguous."),
      rule: RULE.dkimAlignment,
      evidence: fromHeaders.map((header) => `From: ${header.value}`).join("\n"),
    });
  }

  if (!facts.fromDomain) {
    findings.push({
      severity: "info",
      title: "From-domain alignment is inconclusive",
      detail: inferred("No usable domain could be extracted from the first From header."),
      rule: RULE.dkimAlignment,
      evidence: fromHeaders[0] ? `From: ${fromHeaders[0].value}` : undefined,
    });
  }

  let dkimAlignment: Alignment | null = null;
  if (!facts.dkim.length) {
    dkimAlignment = "none";
    findings.push({
      severity: "fail",
      title: "This message is not DKIM-signed",
      detail: inferred(
        "There is no DKIM-Signature header, so nothing in this message carries your domain's signature and DKIM contributes nothing to DMARC.",
      ),
      mondayMorning:
        "Open your platform's domain or authentication settings and finish DKIM setup for your From domain, then send a fresh test to a new check address.",
      rule: RULE.gmail,
    });
  } else {
    const completeSignatures = facts.dkim.filter(
      (signature): signature is DkimSignatureFact & { d: string; s: string } =>
        Boolean(signature.d && signature.s),
    );

    if (facts.dkim.length >= 2) {
      findings.push({
        severity: "info",
        title: `${facts.dkim.length} DKIM signatures are present`,
        detail: `Normal for ESP sends: platforms sign with their own domain alongside yours, and DMARC counts whichever signature aligns with From. Here: ${facts.dkim
          .map((signature) => `d=${signature.d ?? "(missing)"} / s=${signature.s ?? "(missing)"}`)
          .join("; ")}.`,
        rule: RULE.dkimAlignment,
        evidence: dkimEvidence,
      });
    }

    if (completeSignatures.length !== facts.dkim.length) {
      findings.push({
        severity: "info",
        title: "A DKIM signature is missing d= or s=",
        detail: inferred("That signature cannot be checked for alignment or looked up in DNS."),
        rule: RULE.dkimAlignment,
        evidence: dkimEvidence,
      });
    }

    const signingDomains = facts.dkim
      .map((signature) => signature.d)
      .filter((domain): domain is string => Boolean(domain));

    if (!facts.fromDomain) {
      dkimAlignment = null;
    } else if (!signingDomains.length) {
      dkimAlignment = null;
      findings.push({
        severity: "info",
        title: "DKIM alignment is inconclusive",
        detail: inferred("No usable d= domain could be extracted from the DKIM signature."),
        rule: RULE.dkimAlignment,
        evidence: dkimEvidence,
      });
    } else {
      dkimAlignment = bestAlignment(
        signingDomains.map((domain) => alignment(facts.fromDomain, domain)),
      );

      if (dkimAlignment === "strict") {
        findings.push({
          severity: "pass",
          title: "DKIM is strictly aligned",
          detail: inferred("At least one DKIM d= domain exactly matches the From domain."),
          rule: RULE.dkimAlignment,
          evidence: dkimEvidence,
        });
      } else if (dkimAlignment === "relaxed") {
        findings.push({
          severity: "pass",
          title: "DKIM is aligned in relaxed mode",
          detail: inferred(
            "Relaxed is the DMARC default; it fails if your record sets adkim=s. Our org-domain match is a heuristic without the full public-suffix list.",
          ),
          rule: RULE.dkimAlignment,
          evidence: dkimEvidence,
        });
      } else {
        const signedBy = [...new Set(signingDomains)].join(", ");
        findings.push({
          severity: "fail",
          title: "DKIM is not aligned",
          detail: inferred(
            `DKIM is present but signed by ${signedBy}, not ${facts.fromDomain}; DMARC gets nothing from it.`,
          ),
          mondayMorning: `Add and verify ${facts.fromDomain} as a sending domain in your platform so DKIM signs with d=${facts.fromDomain}, then re-send a test.`,
          rule: RULE.dkimAlignment,
          evidence: dkimEvidence,
        });
      }
    }
  }

  let returnPathAlignment: Alignment | null = null;
  const nullReturnPath = returnPathHeader ? /^\s*<>\s*$/.test(returnPathHeader.value) : false;

  if (!facts.fromDomain) {
    returnPathAlignment = null;
    findings.push({
      severity: "info",
      title: "Return-Path alignment is inconclusive",
      detail: inferred(
        facts.returnPathDomain
          ? "Return-Path has a domain, but there is no usable From domain to compare it with."
          : "No usable From and Return-Path domain pair could be extracted.",
      ),
      rule: RULE.outlook,
      evidence: returnPathHeader ? `Return-Path: ${returnPathHeader.value}` : undefined,
    });
  } else if (facts.returnPathDomain) {
    returnPathAlignment = alignment(facts.fromDomain, facts.returnPathDomain);
    if (returnPathAlignment === "strict" || returnPathAlignment === "relaxed") {
      findings.push({
        severity: "pass",
        title:
          returnPathAlignment === "strict"
            ? "Return-Path is strictly aligned"
            : "Return-Path is aligned in relaxed mode",
        detail: inferred(
          "The envelope sender represented by Return-Path aligns with the visible From domain for SPF-based DMARC.",
        ),
        rule: RULE.outlook,
        evidence: `Return-Path: ${returnPathHeader!.value}`,
      });
    }
  } else {
    returnPathAlignment = nullReturnPath ? "none" : null;
    findings.push({
      severity: "info",
      title: "Return-Path alignment is inconclusive",
      detail: inferred(
        nullReturnPath
          ? "Return-Path uses the null sender, so it supplies no SPF-aligned domain for this message."
          : "No usable domain could be extracted from Return-Path.",
      ),
      rule: RULE.outlook,
      evidence: returnPathHeader ? `Return-Path: ${returnPathHeader.value}` : undefined,
    });
  }

  const dmarcPassedAtReceiver = facts.auth?.dmarc?.result === "pass";
  const dkimContributes = dkimAlignment === "strict" || dkimAlignment === "relaxed";

  if (returnPathAlignment === "none" && dkimContributes) {
    findings.push({
      severity: "info",
      title: "DMARC is relying on DKIM alone",
      detail: inferred(
        "SPF cannot align; DMARC rides on DKIM alone. That is normal for ESP sends, and it is a single point of failure.",
      ),
      rule: RULE.outlook,
      evidence: returnPathHeader ? `Return-Path: ${returnPathHeader.value}` : undefined,
    });
  } else if (
    returnPathAlignment === "none" &&
    dkimAlignment === "none" &&
    !dmarcPassedAtReceiver
  ) {
    findings.push({
      severity: "fail",
      title: "Neither SPF nor DKIM aligns with From",
      detail: inferred("The message has no aligned identifier for DMARC to use."),
      mondayMorning:
        "Verify your From domain in your sending platform so DKIM signs as that domain — that one change gives DMARC an aligned identifier to pass on.",
      rule: RULE.outlook,
    });
  } else if (
    returnPathAlignment === "none" &&
    dkimAlignment === "none" &&
    dmarcPassedAtReceiver
  ) {
    findings.push({
      severity: "info",
      title: "The receiver's DMARC pass overrides this local inference",
      detail:
        "The visible signature and Return-Path do not align by this parser's heuristic, but the receiver recorded DMARC=pass and that is the ground truth.",
      rule: RULE.outlook,
    });
  }

  const unsubscribeEvidence = headers
    .filter(
      (header) =>
        header.lower === "list-unsubscribe" || header.lower === "list-unsubscribe-post",
    )
    .map((header) => `${header.name}: ${header.value}`)
    .join("\n");
  const hasUnsubscribe = facts.listUnsubscribe.uris.length > 0;
  const hasPost = Boolean(facts.listUnsubscribePost);

  if (facts.listUnsubscribe.hasHttps && hasPost) {
    findings.push({
      severity: "pass",
      title: "One-click unsubscribe headers are present",
      detail:
        "List-Unsubscribe includes HTTPS and List-Unsubscribe-Post asks for one-click processing.",
      rule: RULE.oneClick,
      evidence: unsubscribeEvidence,
    });
  } else if (hasUnsubscribe && !hasPost) {
    findings.push({
      severity: "fail",
      title: "List-Unsubscribe is not one-click",
      detail:
        "List-Unsubscribe is present without List-Unsubscribe-Post, so this is not RFC 8058 one-click unsubscribe.",
      mondayMorning:
        "Ask your ESP administrator why this delivered campaign omitted List-Unsubscribe-Post: List-Unsubscribe=One-Click, and do not send it until both headers arrive together.",
      rule: RULE.oneClick,
      evidence: unsubscribeEvidence,
    });
  } else if (hasPost && !hasUnsubscribe) {
    /* The mirror of the case above, and the one every checker forgets. A
       List-Unsubscribe-Post header on its own points at nothing: there is no
       URI for the receiver to POST to, so the pair is no more satisfied than
       it is by List-Unsubscribe alone. */
    findings.push({
      severity: "fail",
      title: "List-Unsubscribe-Post has no List-Unsubscribe to act on",
      detail:
        "List-Unsubscribe-Post is present without a List-Unsubscribe header, so there is no URI for a receiver to POST to. RFC 8058 needs both headers; either one alone does nothing.",
      mondayMorning:
        "Ask your ESP administrator why this delivered campaign omitted List-Unsubscribe, and do not send it until an HTTPS unsubscribe URI arrives alongside List-Unsubscribe-Post.",
      rule: RULE.oneClick,
      evidence: unsubscribeEvidence,
    });
  } else if (hasPost && !facts.listUnsubscribe.hasHttps) {
    findings.push({
      severity: "warn",
      title: "One-click unsubscribe has no HTTPS URI",
      detail: "RFC 8058 requires an HTTPS URI; mailto alone is not one-click unsubscribe.",
      mondayMorning:
        "Configure the delivered List-Unsubscribe header to include an HTTPS URI; mailto alone cannot satisfy RFC 8058.",
      rule: RULE.oneClick,
      evidence: unsubscribeEvidence,
    });
  } else if (facts.forwarded.likely) {
    /* The headers are absent, and we know why: this message was forwarded,
       and a forward strips List-Unsubscribe. Saying "these are missing" here
       would be reporting the courier's damage as the sender's mistake.
       `info` rather than `warn`, because there is nothing for anyone to do
       about it except send us the original. */
    findings.push({
      severity: "info",
      title: "One-click unsubscribe cannot be read from a forwarded message",
      detail:
        "No List-Unsubscribe headers are present, but this message reached us as a forward, and forwarding removes them — Gmail strips both. That means their absence here proves nothing about the campaign as it was sent. To have this checked, send the campaign straight from your platform to the address on the check page rather than forwarding a copy you received.",
      mondayMorning:
        "Send the original campaign directly from your platform to a fresh check address; a forwarded copy cannot prove whether one-click headers were attached.",
      rule: RULE.oneClick,
      evidence: `forwarded: ${facts.forwarded.signals.join(", ")}`,
    });
  } else {
    findings.push({
      severity: "warn",
      title: "No one-click unsubscribe headers are present",
      detail:
        "They are required for bulk mail. Transactional mail is exempt, and headers alone cannot tell us which this is.",
      mondayMorning:
        "Confirm whether this is bulk marketing mail. If it is, ask your ESP administrator why the delivered campaign omitted both one-click unsubscribe headers before sending.",
      rule: RULE.oneClick,
    });
  }

  /* Anything that did not name its own word inherits its rule's. */
  for (const finding of findings) {
    if (!finding.term && finding.rule) finding.term = TERM_BY_RULE[finding.rule];
  }

  findings.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  return { ok: true, facts, findings };
}

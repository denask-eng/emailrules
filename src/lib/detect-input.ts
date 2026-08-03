/**
 * One box that takes anything.
 *
 * The check surfaces were four doors — check a domain, paste headers, send a
 * message, look up a rule — and choosing between them requires already knowing
 * which question you have. That is the wrong thing to ask of somebody whose
 * actual sentence is "our emails are going to spam". Every one of those doors
 * is opened by a string the person already has in their clipboard, so the box
 * reads the string and decides.
 *
 * Deliberately conservative. Guessing wrong sends somebody to a page that
 * answers a question they did not ask, so anything ambiguous comes back as
 * `unknown` with the reason, and the reason is shown rather than a shrug.
 */

export type DetectedKind =
  | "domain"
  | "email"
  | "ip"
  | "message"
  | "spf-record"
  | "dmarc-record"
  | "dkim-record"
  | "unknown";

export interface Detected {
  kind: DetectedKind;
  /** The normalised thing we found: a domain, an address, the raw message. */
  value: string;
  /** Shown to the reader before we move them. One line, no jargon. */
  says: string;
  /** Where this leads, when it leads somewhere by URL. */
  href?: string;
}

const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const DOMAIN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

/* A header block is the one input that is unambiguous: RFC 5322 field names
   at the start of lines. Two or more is not an accident. */
const HEADER_LINE = /^(received|from|to|subject|date|message-id|dkim-signature|authentication-results|return-path|list-unsubscribe|mime-version|content-type)\s*:/im;

function normaliseDomain(raw: string): string | null {
  const d = raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split(/[/?#]/)[0];
  if (!d) return null;
  if (!DOMAIN.test(d)) return null;
  /* A top-level label is never all digits, so "999.1.1.1" is neither an
     address nor a name — and without this it passes as a domain and we send
     somebody off to resolve a string that cannot exist. */
  const tld = d.slice(d.lastIndexOf(".") + 1);
  return /^\d+$/.test(tld) ? null : d;
}

function looksLikeIpv4(value: string): boolean {
  const m = IPV4.exec(value);
  return Boolean(m) && m!.slice(1).every((o) => Number(o) <= 255);
}

export function detectInput(raw: string): Detected {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { kind: "unknown", value: "", says: "Paste something and we will work out what it is." };
  }

  const lower = trimmed.toLowerCase();
  const multiline = /\r?\n/.test(trimmed);

  /* ── A whole message ────────────────────────────────────────────────── */
  /* Checked first: a real message contains domains, addresses and records,
     so any other test would match a fragment of it and answer the wrong
     question about the wrong thing. */
  if (multiline && HEADER_LINE.test(trimmed)) {
    return {
      kind: "message",
      value: trimmed,
      says: "That is a whole message. Reading it against the shelf.",
    };
  }

  /* ── A record somebody already has in front of them ─────────────────── */
  if (lower.startsWith("v=spf1")) {
    return {
      kind: "spf-record",
      value: trimmed,
      says: "That is an SPF record. We can read it, but the domain that publishes it is the useful thing to check.",
    };
  }
  if (lower.startsWith("v=dmarc1")) {
    return {
      kind: "dmarc-record",
      value: trimmed,
      says: "That is a DMARC record. We can read it, but the domain that publishes it is the useful thing to check.",
    };
  }
  if (lower.startsWith("v=dkim1")) {
    return {
      kind: "dkim-record",
      value: trimmed,
      says: "That is a DKIM key. A key existing is not the same as it signing your mail, which only a real message can show.",
    };
  }

  /* ── An address ─────────────────────────────────────────────────────── */
  if (!multiline && trimmed.includes("@") && !/\s/.test(trimmed)) {
    const at = trimmed.lastIndexOf("@");
    const domain = normaliseDomain(trimmed.slice(at + 1));
    if (domain) {
      return {
        kind: "email",
        value: domain,
        says: `Checking ${domain}, the domain that address sends from.`,
        href: `/check/${domain}`,
      };
    }
  }

  /* ── A single address on the wire ───────────────────────────────────── */
  if (!multiline && looksLikeIpv4(trimmed)) {
    return {
      kind: "ip",
      value: trimmed,
      says: `Checking ${trimmed} against every blocklist that answers today.`,
      href: `/check/ip/${trimmed}`,
    };
  }

  /* ── A domain ───────────────────────────────────────────────────────── */
  if (!multiline && !/\s/.test(trimmed)) {
    const domain = normaliseDomain(trimmed);
    if (domain) {
      return {
        kind: "domain",
        value: domain,
        says: `Checking ${domain}.`,
        href: `/check/${domain}`,
      };
    }
  }

  return {
    kind: "unknown",
    value: trimmed,
    says: multiline
      ? "That does not look like a message — a message starts with header lines like From: and Received:. Paste the full source, or just the sending domain."
      : "That does not look like a domain, an address or an IP. Try yourbrand.com.",
  };
}

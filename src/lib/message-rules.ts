import type { Finding, Severity } from "./dns-check";
import { unfoldHeaders, type HeaderFacts, type HeaderField } from "./header-check";

/**
 * What a real message reveals that DNS never can.
 *
 * Every technical checker in this category reads a message against
 * authentication and stops there. A message also carries evidence of consent
 * and content law — a postal address or the absence of one, a tracking pixel,
 * a subject line that can be compared with the body it claims to describe —
 * and nobody checks any of it. That is the whole reason this file exists.
 *
 * Two house rules are load-bearing here:
 *
 *  - Every finding cites a dated rule from the corpus, or it is not emitted.
 *    Where the corpus has no rule for something we can detect, the finding
 *    says "observation" in its own words rather than borrowing a citation.
 *  - Nothing derived from the body or the subject is ever put in `evidence`.
 *    The share URL renders findings, findings are what we persist, and the
 *    promise on the page is that we keep no body and no subject. A 200
 *    character "here is what Apple sees" excerpt would be a nicer finding and
 *    a broken promise, so the findings state the measurement instead.
 */

export interface MessageContent {
  subject: string | null;
  text: string | null;
  html: string | null;
}

export interface MessageInput {
  headers: HeaderField[];
  facts: HeaderFacts;
  content: MessageContent;
}

const RULE = {
  canSpam: "can-spam-penalty-per-email",
  apple: "apple-intelligence-email-summaries",
  france: "france-email-open-tracking-consent",
  italy: "italy-email-tracking-pixel-consent",
  washington: "washington-misleading-subject-lines",
  transactional: "transactional-vs-commercial-email-is-not-a-subject-line-trick",
} as const;

/**
 * The glossary word behind each rule. A finding says what is wrong and the
 * rule says what you are obliged to do; the word shows the artefact — the
 * literal footer block, the pixel in the HTML, the four-question test that
 * decides whether a message is transactional.
 */
const TERM_BY_RULE: Record<string, string> = {
  [RULE.canSpam]: "can-spam",
  [RULE.apple]: "mpp",
  [RULE.france]: "tracking-pixel",
  [RULE.italy]: "tracking-pixel",
  [RULE.washington]: "cema",
  [RULE.transactional]: "transactional",
};

/* Inbound mail is untrusted input from anyone on the internet, so every stage
   has a ceiling. A message that exceeds one is truncated and analysed anyway
   rather than rejected: the interesting headers and the footer are both inside
   the first megabyte of any real campaign. */
const MAX_BODY_CHARS = 1_000_000;
const MAX_PARTS = 40;
const MAX_MULTIPART_DEPTH = 5;
const MAX_IMG_TAGS = 400;

/** Apple's summariser reads the top of the message. This is that window. */
const SUMMARY_WINDOW = 200;

const SEVERITY_ORDER: Record<Severity, number> = { fail: 0, warn: 1, pass: 2, info: 3 };

/* ────────────────────────────── MIME extraction ───────────────────────────── */

function headerValue(headers: HeaderField[], name: string): string | null {
  return headers.find((header) => header.lower === name)?.value ?? null;
}

function splitHeadAndBody(raw: string): { head: string; body: string } {
  const normalised = raw.replace(/\r\n?/g, "\n");
  const blank = normalised.indexOf("\n\n");
  if (blank < 0) return { head: normalised, body: "" };
  return { head: normalised.slice(0, blank), body: normalised.slice(blank + 2) };
}

function decodeBase64(input: string): string {
  const clean = input.replace(/[^A-Za-z0-9+/=]/g, "");
  if (!clean) return "";
  try {
    const binary = atob(clean);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return new TextDecoder("utf-8").decode(bytes);
  } catch {
    return "";
  }
}

function decodeQuotedPrintable(input: string): string {
  const withoutSoftBreaks = input.replace(/=\r?\n/g, "");
  const encoder = new TextEncoder();
  const bytes: number[] = [];

  for (let index = 0; index < withoutSoftBreaks.length; index += 1) {
    const char = withoutSoftBreaks[index];
    const hex = char === "=" ? withoutSoftBreaks.slice(index + 1, index + 3) : "";
    if (/^[0-9a-f]{2}$/i.test(hex)) {
      bytes.push(Number.parseInt(hex, 16));
      index += 2;
      continue;
    }
    for (const byte of encoder.encode(char)) bytes.push(byte);
  }

  return new TextDecoder("utf-8").decode(new Uint8Array(bytes));
}

function decodeBody(body: string, encoding: string | null): string {
  const label = (encoding ?? "").toLowerCase().trim();
  if (label === "base64") return decodeBase64(body);
  if (label === "quoted-printable") return decodeQuotedPrintable(body);
  return body;
}

function boundaryOf(contentType: string): string | null {
  const match = /boundary\s*=\s*(?:"([^"]+)"|([^;\s]+))/i.exec(contentType);
  return match?.[1] ?? match?.[2] ?? null;
}

function splitParts(body: string, boundary: string): string[] {
  const open = `--${boundary}`;
  const close = `--${boundary}--`;
  const parts: string[] = [];
  let current: string[] | null = null;

  for (const line of body.split("\n")) {
    const trimmed = line.trimEnd();
    if (trimmed === close) break;
    if (trimmed === open) {
      if (current) parts.push(current.join("\n"));
      if (parts.length >= MAX_PARTS) return parts;
      current = [];
      continue;
    }
    if (current) current.push(line);
  }

  if (current) parts.push(current.join("\n"));
  return parts;
}

function collectParts(
  headers: HeaderField[],
  body: string,
  depth: number,
): { text: string | null; html: string | null } {
  const contentType = headerValue(headers, "content-type") ?? "text/plain";
  const disposition = headerValue(headers, "content-disposition") ?? "";

  /* An attached .eml or .pdf is not what the recipient reads, and decoding one
     is pure attack surface for no finding. */
  if (/^\s*attachment/i.test(disposition)) return { text: null, html: null };

  if (/^\s*multipart\//i.test(contentType)) {
    const boundary = depth < MAX_MULTIPART_DEPTH ? boundaryOf(contentType) : null;
    if (!boundary) return { text: null, html: null };

    let text: string | null = null;
    let html: string | null = null;
    for (const part of splitParts(body, boundary)) {
      const { head, body: partBody } = splitHeadAndBody(part.replace(/^\n+/, ""));
      const found = collectParts(unfoldHeaders(head), partBody, depth + 1);
      if (!text && found.text) text = found.text;
      if (!html && found.html) html = found.html;
    }
    return { text, html };
  }

  const decoded = decodeBody(body, headerValue(headers, "content-transfer-encoding"));
  if (/^\s*text\/html/i.test(contentType)) return { text: null, html: decoded };
  if (/^\s*text\/plain/i.test(contentType)) return { text: decoded, html: null };
  return { text: null, html: null };
}

/**
 * Pull the subject and the readable parts out of a whole RFC 5322 message.
 *
 * This is what makes the paste path and the inbound path the same product:
 * paste a full message source and you get the consent and content findings
 * too, not just the authentication ones.
 */
export function extractContent(raw: string): MessageContent {
  const capped = raw.length > MAX_BODY_CHARS ? raw.slice(0, MAX_BODY_CHARS) : raw;
  const { head, body } = splitHeadAndBody(capped);
  const headers = unfoldHeaders(head);
  const subjectRaw = headerValue(headers, "subject");

  /* A headers-only paste is not a message with an empty body, and the
     difference matters: one has nothing to say about content law, the other
     would be reported as an image-only campaign. */
  const parts = body.trim() ? collectParts(headers, body, 0) : { text: null, html: null };
  const present = (value: string | null) => (value && value.trim() ? value : null);

  return {
    subject: subjectRaw ? decodeEncodedWords(subjectRaw) : null,
    text: present(parts.text),
    html: present(parts.html),
  };
}

/**
 * Header values arrive in whichever shape a provider felt like. Rebuilding a
 * flat RFC 5322 block means the parser that already exists and is already
 * tested stays the only thing in this codebase that reads a header.
 */
export function rebuildHeaderBlock(headers: unknown): string {
  if (typeof headers === "string") return headers;

  const lines: string[] = [];
  const push = (name: unknown, value: unknown) => {
    if (typeof name !== "string" || !name.trim()) return;
    const text =
      typeof value === "string" ? value : value === null || value === undefined ? "" : String(value);
    /* A newline inside a header value is header injection, and this block is
       about to be parsed as though it had come off the wire. */
    lines.push(`${name.replace(/[\r\n:]+/g, " ").trim()}: ${text.replace(/[\r\n]+/g, " ").trim()}`);
  };

  if (Array.isArray(headers)) {
    for (const entry of headers) {
      if (Array.isArray(entry)) push(entry[0], entry[1]);
      else if (entry && typeof entry === "object") {
        const record = entry as Record<string, unknown>;
        push(record.name ?? record.key, record.value);
      }
    }
    return lines.join("\n");
  }

  if (headers && typeof headers === "object") {
    for (const [name, value] of Object.entries(headers as Record<string, unknown>)) {
      if (Array.isArray(value)) for (const item of value) push(name, item);
      else push(name, value);
    }
  }
  return lines.join("\n");
}

/**
 * The original MIME headers describe an encoding the provider has already
 * undone for us. Carrying them onto a body we reassembled would point the
 * parser at a boundary that exists nowhere in the message.
 */
function withoutContentHeaders(block: string): string {
  const kept: string[] = [];
  let skipping = false;

  for (const line of block.replace(/\r\n?/g, "\n").split("\n")) {
    if (/^[ \t]/.test(line)) {
      if (!skipping) kept.push(line);
      continue;
    }
    skipping =
      /^(?:content-type|content-transfer-encoding|content-disposition|mime-version)\s*:/i.test(line);
    if (!skipping) kept.push(line);
  }

  /* A trailing blank line would end the header block early and turn what we
     are about to append into body text. */
  return kept.join("\n").replace(/\n+$/, "");
}

/** Grown until it cannot appear in either part, so no body can close it early. */
function uniqueBoundary(...parts: Array<string | null>): string {
  let boundary = "emailrules-boundary";
  while (parts.some((part) => part?.includes(boundary))) boundary += "-x";
  return boundary;
}

/**
 * Assemble the wire form from parts a webhook hands over separately.
 *
 * The body is rejoined as a MIME message rather than passed alongside, so the
 * whole engine has one input shape: whatever arrives, from wherever, what the
 * parser sees is a message.
 */
export function composeMessage(input: {
  headers: unknown;
  text?: string | null;
  html?: string | null;
}): string {
  const raw = rebuildHeaderBlock(input.headers);
  const text = input.text?.trim() ? input.text : null;
  const html = input.html?.trim() ? input.html : null;
  if (!text && !html) return raw;

  const block = withoutContentHeaders(raw);
  if (text && !html) return `${block}\nContent-Type: text/plain; charset=utf-8\n\n${text}`;
  if (html && !text) return `${block}\nContent-Type: text/html; charset=utf-8\n\n${html}`;

  const boundary = uniqueBoundary(text, html);
  return [
    block,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    text,
    `--${boundary}`,
    "Content-Type: text/html; charset=utf-8",
    "",
    html,
    `--${boundary}--`,
    "",
  ].join("\n");
}

/** RFC 2047 words, because a non-English subject is otherwise unreadable. */
export function decodeEncodedWords(value: string): string {
  return value.replace(
    /=\?([^?]+)\?([bBqQ])\?([^?]*)\?=/g,
    (whole, _charset: string, encoding: string, payload: string) => {
      const decoded =
        encoding.toLowerCase() === "b"
          ? decodeBase64(payload)
          : decodeQuotedPrintable(payload.replace(/_/g, " "));
      return decoded || whole;
    },
  );
}

/* ─────────────────────────────── HTML to facts ────────────────────────────── */

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  mdash: "—",
  ndash: "–",
  hellip: "…",
  rsquo: "’",
  lsquo: "‘",
  ldquo: "“",
  rdquo: "”",
  eacute: "é",
  pound: "£",
  euro: "€",
};

function decodeEntities(input: string): string {
  return input
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&([a-z]+);/gi, (whole, name: string) => ENTITIES[name.toLowerCase()] ?? whole);
}

export function collapse(input: string): string {
  return input
    .replace(/ /g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

/**
 * HTML is read for facts and never rendered, so this is deliberately a
 * text extractor and not a sanitiser. Nothing it returns is ever put back
 * into a page as markup.
 */
export function htmlToText(html: string): string {
  const stripped = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|head|title)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<(?:br|\/p|\/div|\/tr|\/td|\/li|\/h[1-6])\b[^>]*>/gi, "\n")
    .replace(/<[^>]*>/g, " ");
  return collapse(decodeEntities(stripped));
}

/**
 * What a summariser and a screen reader actually get.
 *
 * Apple summarises the message it renders, which is the HTML part whenever a
 * message has one. A rich HTML campaign whose text/plain fallback is one
 * "view in browser" line is a real and common shape, and reading the plain
 * part there would flatter it.
 */
export function visibleText(content: MessageContent): string {
  const fromHtml = content.html ? htmlToText(content.html) : "";
  const fromText = content.text ? collapse(content.text) : "";
  if (fromHtml.length >= 40) return fromHtml;
  return fromText.length > fromHtml.length ? fromText : fromHtml;
}

/* ──────────────────────────── CAN-SPAM: the address ───────────────────────── */

const US_STATES =
  "AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC|PR";

/**
 * Two tiers on purpose. A US ZIP behind a real state code or a PO Box is a
 * postal address and nothing else; a street word or a postcode-then-town pair
 * is suggestive on its own and only counts when something else agrees with it.
 *
 * The bias is deliberate: a false negative tells someone to check a footer
 * they already have, a false positive tells them they are compliant when they
 * are not, and this site publishes the $53,088 figure on the next page over.
 */
const POSTAL_SIGNALS: Array<{ strong: boolean; test: RegExp }> = [
  { strong: true, test: /\bp\.?\s?o\.?\s*box\s*#?\s*\d+/i },
  { strong: true, test: new RegExp(String.raw`\b(?:${US_STATES})\.?\s+\d{5}(?:-\d{4})?\b`) },
  { strong: true, test: /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/ },
  { strong: true, test: /\b[A-Z]\d[A-Z]\s?\d[A-Z]\d\b/ },
  {
    strong: false,
    test: /\b\d{1,6}[a-z]?[,\s]+(?:[A-Za-z][\w'’.-]*[,\s]+){0,4}(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|lane|ln|way|court|place|square|suite|ste|floor|parkway|highway)\b/i,
  },
  {
    strong: false,
    /* No word boundary before the German forms on purpose: the street name
       and the word for street are one token there, as in Hauptstraße 12. */
    test: /(?:(?:stra(?:ss|ß)e|\bstr\.|\brue|\bvia|\bviale|\bcalle|\bplaza|\bprospektas|\bgatv[ėe]|\bg\.)\s*,?\s*\d+|\d+\s*,?\s*(?:stra(?:ss|ß)e|rue|via|calle)\b)/i,
  },
  /* A four or five digit group followed by a capitalised word is a European
     postcode and town. Years are excluded because a copyright line is not an
     address and would otherwise supply half of one. */
  { strong: false, test: /\b(?!19\d{2}\b|20\d{2}\b)\d{4,5}\b[,\s]+[A-ZÀ-Ý][a-zà-ÿ]{2,}/ },
];

export function hasPostalAddress(text: string): boolean {
  let weak = 0;
  for (const signal of POSTAL_SIGNALS) {
    if (!signal.test.test(text)) continue;
    if (signal.strong) return true;
    weak += 1;
  }
  return weak >= 2;
}

const OPT_OUT_WORDING =
  /\bunsubscrib\w*|\bopt[\s-]?out\b|manage (?:your )?(?:email )?preferences|email preferences|abmelden|désabonner|desabonner|cancelar (?:la )?suscripci|annulla iscrizione/i;

export function hasOptOutWording(text: string, html: string | null): boolean {
  if (OPT_OUT_WORDING.test(text)) return true;
  return html ? OPT_OUT_WORDING.test(html) : false;
}

/* ────────────────────────────── Tracking pixels ───────────────────────────── */

const PIXEL_SRC_HINTS: RegExp[] = [
  /\/(?:open|opens|track|tracking|beacon|pixel|impression)(?:[./?&]|$)/i,
  /\/(?:o|t|q|e)\.(?:gif|png)(?:$|[?&])/i,
  /\bopens?\.(?:gif|png|aspx|php|jpg)/i,
  /[?&](?:open|track|pixel|beacon)=/i,
  /\b1x1\.(?:gif|png)/i,
  /\/wf\/open/i,
];

function attribute(tag: string, name: string): string | null {
  const match = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(tag);
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? null;
}

/**
 * A heuristic, and the finding says so. It exists because the fact that a
 * message carries an open pixel is the input to two live consent rules, and
 * neither the sender's ESP nor any deliverability vendor will ever tell them.
 */
export function countTrackingPixels(html: string): number {
  const tags = [...html.matchAll(/<img\b[^>]*>/gi)].slice(0, MAX_IMG_TAGS).map((match) => match[0]);
  let found = 0;

  for (const tag of tags) {
    const numeric = (name: string) => {
      const raw = attribute(tag, name);
      if (raw === null) return null;
      const digits = /^\s*(\d+)/.exec(raw);
      return digits ? Number(digits[1]) : null;
    };
    const width = numeric("width");
    const height = numeric("height");
    const style = attribute(tag, "style") ?? "";
    const src = attribute(tag, "src") ?? "";

    const tiny =
      (width !== null && height !== null && width <= 3 && height <= 3) ||
      (/(?:^|[;\s])width\s*:\s*[0-3](?:px)?\b/i.test(style) &&
        /(?:^|[;\s])height\s*:\s*[0-3](?:px)?\b/i.test(style));
    const hidden = /display\s*:\s*none/i.test(style) && Boolean(src);
    const named = Boolean(src) && PIXEL_SRC_HINTS.some((hint) => hint.test(src));

    if (tiny || hidden || named) found += 1;
  }

  return found;
}

/* ─────────────────────── Washington: subject against body ─────────────────── */

const OFFER_TOKEN = /\d{1,3}\s?%|[$€£]\s?\d[\d.,]*/g;

function normaliseOffer(token: string): string {
  return token.replace(/\s+/g, "").toLowerCase();
}

/** Offers named in the subject that appear nowhere in the message text. */
export function unmatchedOffers(subject: string, text: string): number {
  const body = text.replace(/\s+/g, "").toLowerCase();
  const claimed = [...new Set((subject.match(OFFER_TOKEN) ?? []).map(normaliseOffer))];
  return claimed.filter((token) => !body.includes(token)).length;
}

/* ───────────────────────────────── The findings ───────────────────────────── */

function summaryLead(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, SUMMARY_WINDOW);
}

const BOILERPLATE_LEAD =
  /^(?:view (?:this )?(?:e-?mail )?(?:online|in (?:your )?browser)|can'?t see (?:this|the)|trouble viewing|having trouble|email not displaying|is this email not displaying|add us to your address book|click here|open in browser|no images\??)/i;

export function messageFindings(input: MessageInput): Finding[] {
  const { facts, headers, content } = input;
  const findings: Finding[] = [];
  const hasBody = content.text !== null || content.html !== null;
  const text = hasBody ? visibleText(content) : "";
  const declaresBulk = facts.listUnsubscribe.uris.length > 0 || Boolean(facts.listUnsubscribePost);

  /* ── CAN-SPAM: the postal address and the opt-out the recipient can see ── */
  if (hasBody) {
    if (hasPostalAddress(text)) {
      findings.push({
        severity: "pass",
        title: "A postal address is present in the message text",
        stage: "build",
        detail:
          "CAN-SPAM requires a valid physical postal address on every commercial message, and one is readable in the text of this one. Whether it is still the right address is the part no checker can answer.",
        rule: RULE.canSpam,
      });
    } else {
      findings.push({
        severity: declaresBulk ? "fail" : "warn",
        title: "No postal address is readable in the message text",
        stage: "build",
        detail: declaresBulk
          ? "This message carries unsubscribe headers, so its sender is treating it as bulk marketing, and CAN-SPAM requires a valid physical postal address on it. None could be read from the text. An address that exists only inside an image does not count, because the text is all a filter or a screen reader ever sees."
          : "No physical postal address could be read from the text. CAN-SPAM requires one on commercial mail; a single message cannot prove this one is commercial, so this is flagged rather than failed. An address that exists only inside an image does not count.",
        rule: RULE.canSpam,
      });
    }

    if (!hasOptOutWording(text, content.html)) {
      findings.push({
        severity: declaresBulk ? "warn" : "info",
        term: "opt-out",
        title: "No opt-out wording is readable in the message",
        stage: "build",
        detail:
          "CAN-SPAM wants a clear and conspicuous explanation of how to stop the mail inside the message itself, not only in a header a recipient never sees. No unsubscribe or preferences wording was found in the text.",
        rule: RULE.canSpam,
      });
    }
  }

  /* ── Apple: what the summariser has to work with ── */
  if (hasBody) {
    const lead = summaryLead(text);
    if (!text.length) {
      findings.push({
        severity: "fail",
        title: "This message carries no live text",
        stage: "react",
        detail:
          "Nothing readable could be extracted from the body, which is the signature of an image-only campaign. Apple Mail summarises from live text and ignores alt text, so a recipient on Apple Mail sees a summary generated from the subject line alone.",
        rule: RULE.apple,
      });
    } else if (lead.length < 40) {
      findings.push({
        severity: "warn",
        title: `Only ${lead.length} characters of live text sit above the fold`,
        stage: "react",
        detail:
          "Apple Mail builds its summary from the first live text in the message. There is not enough here for it to describe what the message is about, so the summary falls back on the subject line.",
        rule: RULE.apple,
      });
    } else if (BOILERPLATE_LEAD.test(lead)) {
      findings.push({
        severity: "warn",
        title: "The first live text is template boilerplate",
        stage: "react",
        detail:
          "The message opens with a view-in-browser or images-off line, so that is what Apple Mail summarises. Moving one real sentence above it is a template change, not a campaign change.",
        rule: RULE.apple,
      });
    } else {
      findings.push({
        severity: "pass",
        title: `${lead.length} characters of real text open this message`,
        stage: "react",
        detail:
          "There is live text at the top for Apple Mail to summarise from, rather than an image and a view-in-browser line. Whether it says something worth summarising is an editorial question, not a technical one.",
        rule: RULE.apple,
      });
    }
  }

  /* ── The pixel, reported as a fact, and the two rules that turn on it ── */
  if (content.html !== null) {
    const pixels = countTrackingPixels(content.html);
    if (pixels > 0) {
      findings.push({
        severity: "info",
        title:
          pixels === 1
            ? "This message carries an open-tracking pixel"
            : `This message carries ${pixels} tracking pixels`,
        detail:
          "Stated as a fact, not a fault: most ESPs add this by default and most senders never chose it. In France the CNIL treats open tracking as needing its own consent, separate from consent to be emailed, and that is in force now. Whether it applies to you depends on where your recipients are, not on where you are.",
        rule: RULE.france,
      });
      findings.push({
        severity: "info",
        title: "Italy applies the same consent test from 29 October 2026",
        stage: "build",
        detail:
          "Conditional on your audience. If any recipient is in Italy, the Garante's position on individual open tracking starts biting on that date, and switching a pixel off per segment is a build rather than a checkbox in most platforms.",
        rule: RULE.italy,
      });
    } else {
      findings.push({
        severity: "info",
        title: "No open-tracking pixel was detected",
        stage: "build",
        detail:
          "An observation rather than a verdict: detection is a heuristic over the image tags in the HTML, and a pixel served from a first-party domain at ordinary dimensions would not be caught. If you send to France, confirm this in your platform's tracking settings rather than here.",
        rule: RULE.france,
      });
    }
  }

  /* ── Washington: only what a single message can defend ── */
  const subject = content.subject?.trim() ?? "";
  if (subject) {
    const isReplyPrefixed = /^\s*(?:re|fwd?|fw)\s*:/i.test(subject);
    const inThread = headers.some(
      (header) => header.lower === "in-reply-to" || header.lower === "references",
    );
    if (isReplyPrefixed && !inThread) {
      findings.push({
        severity: "warn",
        title: "The subject line is prefixed as a reply, and this is not one",
        stage: "build",
        detail:
          "There is no In-Reply-To or References header, so this message is not part of a thread. Washington treats a subject line that misrepresents the contents of a message as an automatic violation, and a manufactured Re: is the least arguable version of that.",
        rule: RULE.washington,
      });
    }

    if (hasBody && text.length) {
      const missing = unmatchedOffers(subject, text);
      if (missing > 0) {
        findings.push({
          severity: "warn",
          title:
            missing === 1
              ? "An offer named in the subject line does not appear in the message text"
              : `${missing} offers named in the subject line do not appear in the message text`,
          detail:
            "A discount or price in the subject that is nowhere in the text is the shape Washington's statute is about. It can be innocent — the figure may live inside an image, which is its own problem — so this is worth checking rather than a verdict.",
          rule: RULE.washington,
        });
      }
    }
  }

  /* ── Classification, which is where "it's transactional" usually breaks ── */
  if (hasBody && !declaresBulk && text.length) {
    /* Two independent tells, because either alone is thin: a sender who
       offers an opt-out has classified the message themselves, and a price or
       a discount in the body is not something an order receipt argues with. */
    const looksCommercial =
      hasOptOutWording(text, content.html) && (text.match(OFFER_TOKEN)?.length ?? 0) > 0;
    if (looksCommercial) {
      findings.push({
        severity: "warn",
        title: "This message is being sent as though it were transactional",
        stage: "build",
        detail:
          "It has no one-click unsubscribe headers, which is the shape of transactional mail, but it carries marketing content. Classification follows what the message does, not what the template is called, and a promotional message needs consent and a working opt-out whatever folder it was built in.",
        rule: RULE.transactional,
      });
    }
  }

  for (const finding of findings) {
    if (!finding.term && finding.rule) finding.term = TERM_BY_RULE[finding.rule];
  }

  findings.sort((left, right) => SEVERITY_ORDER[left.severity] - SEVERITY_ORDER[right.severity]);
  return findings;
}

/**
 * The sentence at the top of the result and on the share card.
 *
 * Counts of dated findings, never a score. Two tools once rated the same
 * campaign at 85 and 40 percent; a grade here would advertise the opposite of
 * the thing it links to.
 */
export function verdictSentence(findings: Finding[]): string {
  const count = (severity: Severity) => findings.filter((f) => f.severity === severity).length;
  const fails = count("fail");
  const warns = count("warn");

  if (!fails && !warns) return "Nothing to fix in this message.";
  const parts: string[] = [];
  if (fails) parts.push(`${fails} thing${fails > 1 ? "s" : ""} to fix`);
  else parts.push("Nothing broken");
  if (warns) parts.push(`${warns} worth a look`);
  return `${parts.join(", ")}.`;
}

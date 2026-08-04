import { gunzipSync, inflateRawSync } from "node:zlib";

/**
 * DMARC aggregate reports, read without trusting anything in them.
 *
 * Every receiver that honours DMARC mails a daily XML report to the address in
 * your `rua=` tag. It is the only record of what actually happened to mail
 * claiming to be from your domain — who sent it, from which address, and
 * whether it authenticated. DNS tells you what you published; this tells you
 * what arrived.
 *
 * The file is attached as .gz or .zip and the XML inside was written by a
 * stranger's mail system, so this module is deliberately paranoid:
 *
 *  - No XML library. A DOCTYPE or ENTITY declaration is rejected outright
 *    rather than parsed, which is the whole of the billion-laughs and XXE
 *    class of attack refused in one line. We need six element names; a general
 *    parser is a liability we would be importing for nothing.
 *  - Every input is capped before it is walked — compressed bytes, inflated
 *    bytes, nesting depth, and the number of rows.
 *  - Nothing here touches the network or the database. It takes bytes and
 *    returns a value, which is why it can be tested exhaustively.
 *
 * Reference: RFC 7489 §7.2, superseded by RFC 9990 (May 2026) for aggregate
 * reporting. The schema below is unchanged between them.
 */

/** A day of Gmail's reports for a large sender is tens of kilobytes gzipped. */
const MAX_COMPRESSED_BYTES = 8 * 1024 * 1024;
const MAX_INFLATED_BYTES = 64 * 1024 * 1024;
const MAX_DEPTH = 20;
/** Past this a report is not a report, it is someone filling our disk. */
const MAX_ROWS = 5_000;

export type PolicyResult = "pass" | "fail";
export type Disposition = "none" | "quarantine" | "reject";

export interface ReportRow {
  sourceIp: string;
  count: number;
  disposition: Disposition;
  /** policy_evaluated — DMARC alignment, not whether a signature verified. */
  dkim: PolicyResult;
  spf: PolicyResult;
  headerFrom: string | null;
  envelopeFrom: string | null;
  /** auth_results — the raw per-mechanism outcome, kept for the evidence line. */
  dkimDomains: string[];
  spfDomain: string | null;
}

export interface AggregateReport {
  orgName: string;
  reportId: string;
  /** ISO instants derived from the report's own unix timestamps. */
  begin: string;
  end: string;
  domain: string;
  policy: {
    p: string | null;
    sp: string | null;
    adkim: string | null;
    aspf: string | null;
    pct: number | null;
  };
  rows: ReportRow[];
}

/* ── XML ──────────────────────────────────────────────────────────────── */

interface Node {
  name: string;
  text: string;
  children: Node[];
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

/**
 * Only the five predefined entities, and numeric references below U+10FFFF.
 * Anything else is left as written rather than resolved, because resolving a
 * custom entity is the vulnerability.
 */
function decodeEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (whole, body: string) => {
    if (body.startsWith("#")) {
      const code = body[1] === "x" || body[1] === "X"
        ? Number.parseInt(body.slice(2), 16)
        : Number.parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : whole;
    }
    return ENTITIES[body.toLowerCase()] ?? whole;
  });
}

/**
 * A tag-soup reader that understands exactly what a DMARC report contains:
 * nested elements with text leaves. Attributes are skipped, because none of
 * the fields this module reads is ever carried in one.
 */
export function parseXml(source: string): Node | null {
  if (/<!(?:doctype|entity)/i.test(source)) {
    throw new Error("refused: report declares a DOCTYPE or ENTITY");
  }

  const stack: Node[] = [];
  let root: Node | null = null;
  let cursor = 0;

  while (cursor < source.length) {
    const open = source.indexOf("<", cursor);
    if (open === -1) break;

    if (stack.length) {
      stack[stack.length - 1].text += source.slice(cursor, open);
    }

    /* Comments, declarations and processing instructions carry nothing. */
    if (source.startsWith("<!--", open)) {
      const end = source.indexOf("-->", open);
      if (end === -1) break;
      cursor = end + 3;
      continue;
    }
    if (source.startsWith("<?", open)) {
      const end = source.indexOf("?>", open);
      if (end === -1) break;
      cursor = end + 2;
      continue;
    }

    const close = source.indexOf(">", open);
    if (close === -1) break;
    const tag = source.slice(open + 1, close).trim();
    cursor = close + 1;
    if (!tag) continue;

    if (tag.startsWith("/")) {
      const done = stack.pop();
      if (done && !stack.length) root = done;
      continue;
    }

    const selfClosing = tag.endsWith("/");
    const name = tag.replace(/\/$/, "").split(/[\s/]/, 1)[0].toLowerCase();
    if (!name) continue;

    const node: Node = { name, text: "", children: [] };
    if (stack.length) stack[stack.length - 1].children.push(node);

    if (selfClosing) {
      if (!stack.length) root = node;
      continue;
    }

    stack.push(node);
    if (stack.length > MAX_DEPTH) throw new Error("refused: report nests too deeply");
  }

  return root ?? stack[0] ?? null;
}

const child = (node: Node | undefined, name: string): Node | undefined =>
  node?.children.find((c) => c.name === name);

const childAll = (node: Node | undefined, name: string): Node[] =>
  node?.children.filter((c) => c.name === name) ?? [];

const text = (node: Node | undefined, name: string): string | null => {
  const found = child(node, name);
  if (!found) return null;
  const value = decodeEntities(found.text).trim();
  return value || null;
};

/* ── Decompression ────────────────────────────────────────────────────── */

/**
 * Reports arrive as .gz, .zip, or occasionally bare .xml. The ZIP case is a
 * forty-line read of the local file header rather than a dependency: we need
 * the first entry of a single-member archive, which is all any receiver sends.
 */
export function decompress(bytes: Buffer): string {
  if (bytes.byteLength > MAX_COMPRESSED_BYTES) {
    throw new Error("refused: attachment is larger than a report can legitimately be");
  }

  /* gzip magic */
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
    return capped(gunzipSync(bytes, { maxOutputLength: MAX_INFLATED_BYTES }));
  }

  /* PK\x03\x04 — ZIP local file header */
  if (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) {
    const method = bytes.readUInt16LE(8);
    const nameLength = bytes.readUInt16LE(26);
    const extraLength = bytes.readUInt16LE(28);
    const start = 30 + nameLength + extraLength;
    const body = bytes.subarray(start);
    if (method === 0) return capped(body);
    if (method === 8) {
      return capped(inflateRawSync(body, { maxOutputLength: MAX_INFLATED_BYTES }));
    }
    throw new Error(`refused: ZIP compression method ${method} is not supported`);
  }

  return capped(bytes);
}

function capped(buffer: Buffer): string {
  if (buffer.byteLength > MAX_INFLATED_BYTES) {
    throw new Error("refused: report inflates to more than we will read");
  }
  return buffer.toString("utf8");
}

/* ── The report ───────────────────────────────────────────────────────── */

const result = (value: string | null): PolicyResult => (value?.toLowerCase() === "pass" ? "pass" : "fail");

const disposition = (value: string | null): Disposition => {
  const v = value?.toLowerCase();
  return v === "quarantine" || v === "reject" ? v : "none";
};

/** Unix seconds to an ISO instant. Receivers occasionally send milliseconds. */
function instant(value: string | null): string {
  const n = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(n) || n <= 0) return new Date(0).toISOString();
  return new Date(n > 1e11 ? n : n * 1000).toISOString();
}

export function parseAggregateReport(xml: string): AggregateReport {
  const feedback = parseXml(xml);
  if (!feedback || feedback.name !== "feedback") {
    throw new Error("refused: not a DMARC aggregate report");
  }

  const meta = child(feedback, "report_metadata");
  const range = child(meta, "date_range");
  const published = child(feedback, "policy_published");

  const rows: ReportRow[] = [];
  for (const record of childAll(feedback, "record")) {
    if (rows.length >= MAX_ROWS) break;

    const row = child(record, "row");
    const evaluated = child(row, "policy_evaluated");
    const identifiers = child(record, "identifiers");
    const auth = child(record, "auth_results");

    const sourceIp = text(row, "source_ip");
    if (!sourceIp) continue;

    const count = Number.parseInt(text(row, "count") ?? "0", 10);

    rows.push({
      sourceIp,
      count: Number.isFinite(count) && count > 0 ? count : 0,
      disposition: disposition(text(evaluated, "disposition")),
      dkim: result(text(evaluated, "dkim")),
      spf: result(text(evaluated, "spf")),
      headerFrom: text(identifiers, "header_from"),
      envelopeFrom: text(identifiers, "envelope_from"),
      dkimDomains: childAll(auth, "dkim")
        .map((d) => text(d, "domain"))
        .filter((d): d is string => Boolean(d)),
      spfDomain: text(child(auth, "spf"), "domain"),
    });
  }

  return {
    orgName: text(meta, "org_name") ?? "unknown",
    reportId: text(meta, "report_id") ?? "",
    begin: instant(text(range, "begin")),
    end: instant(text(range, "end")),
    domain: (text(published, "domain") ?? "").toLowerCase(),
    policy: {
      p: text(published, "p"),
      sp: text(published, "sp"),
      adkim: text(published, "adkim"),
      aspf: text(published, "aspf"),
      pct: Number.parseInt(text(published, "pct") ?? "", 10) || null,
    },
    rows,
  };
}

/* ── The verdict, which is the entire point ───────────────────────────── */

export type SourceKind = "aligned" | "forwarded" | "dkim-broken" | "unauthenticated";

export interface SourceVerdict {
  kind: SourceKind;
  /** Whether this row belongs on the list of things that need a person. */
  yours: boolean;
  headline: string;
  detail: string;
}

/**
 * Four outcomes, from two bits.
 *
 * Every tool in this category renders a DMARC row as pass or fail and then
 * shows you the failures. That is why a marketer opens a DMARC dashboard and
 * finds two hundred and seventy-seven red rows, most of which are Gmail and
 * iCloud forwarding their own mail, and concludes the tool is lying or that
 * they are under attack. Neither is true and both are the tool's fault.
 *
 * SPF breaks when a message is forwarded — the forwarder is now the sending
 * host and it is not in your SPF record. That is not a defect, it is how SPF
 * works. DKIM signs the message itself, so it survives forwarding. A row that
 * fails SPF and passes DKIM is therefore a forwarded message whose content was
 * not altered, which is close to the opposite of an attack.
 *
 * So the classification is: does anything here prove the message came from
 * you, and if not, is that explained. Only the last case has ever needed
 * anyone to do anything.
 */
export function classifySource(row: Pick<ReportRow, "dkim" | "spf">): SourceVerdict {
  if (row.dkim === "pass" && row.spf === "pass") {
    return {
      kind: "aligned",
      yours: true,
      headline: "Authenticated as you",
      detail:
        "Both SPF and DKIM aligned with your From domain. This is mail you sent, arriving as you intended.",
    };
  }

  if (row.dkim === "pass") {
    return {
      kind: "forwarded",
      yours: false,
      headline: "Forwarded, not forged",
      detail:
        "SPF failed and DKIM passed. SPF breaks by design when a message is forwarded, because the forwarder becomes the sending host; DKIM signs the message itself and survives. A verifying signature means the content was not altered, so this is a mailing list or an auto-forward rather than someone sending as you. Nothing here needs you.",
    };
  }

  if (row.spf === "pass") {
    return {
      kind: "dkim-broken",
      yours: true,
      headline: "Sent by you, but nothing signed it",
      detail:
        "SPF aligned and DKIM did not. The envelope was authorised, but either no signature was applied or it did not verify. This is usually a sending platform where DKIM was never finished — and it is the half of the setup a platform hands back to you.",
    };
  }

  return {
    kind: "unauthenticated",
    yours: true,
    headline: "Nothing proves this came from you",
    detail:
      "Neither SPF nor DKIM aligned. This is the only case worth your attention, and it has two readings: a sender you set up and forgot, or someone using your domain. The source address and the volume below tell you which — a handful of messages from a service you recognise is the first, sustained volume from an address you do not is the second.",
  };
}

export interface Source {
  sourceIp: string;
  messages: number;
  verdict: SourceVerdict;
  dkimDomains: string[];
  spfDomain: string | null;
  envelopeFrom: string | null;
  dispositions: Record<Disposition, number>;
}

/**
 * Collapse rows to one entry per sending address per outcome.
 *
 * A receiver emits a row per (source, result) combination, so the same address
 * legitimately appears several times in one report with different verdicts.
 * Summing them into a single "is this IP OK" answer is what produces a
 * dashboard that contradicts itself, so the key here is the address *and* its
 * outcome, and an address that both authenticates and does not is shown twice
 * on purpose.
 */
export function summarise(reports: AggregateReport[]): Source[] {
  const byKey = new Map<string, Source>();

  for (const report of reports) {
    for (const row of report.rows) {
      const verdict = classifySource(row);
      const key = `${row.sourceIp}|${verdict.kind}`;
      const existing = byKey.get(key);

      if (existing) {
        existing.messages += row.count;
        existing.dispositions[row.disposition] += row.count;
        for (const d of row.dkimDomains) {
          if (!existing.dkimDomains.includes(d)) existing.dkimDomains.push(d);
        }
        continue;
      }

      byKey.set(key, {
        sourceIp: row.sourceIp,
        messages: row.count,
        verdict,
        dkimDomains: [...row.dkimDomains],
        spfDomain: row.spfDomain,
        envelopeFrom: row.envelopeFrom,
        dispositions: {
          none: row.disposition === "none" ? row.count : 0,
          quarantine: row.disposition === "quarantine" ? row.count : 0,
          reject: row.disposition === "reject" ? row.count : 0,
        },
      });
    }
  }

  /* Loudest first, but never by message count alone — an unauthenticated
     source sending eleven messages matters more than a forwarder sending
     eleven thousand, and sorting by volume is how the important row ends up
     on page four. */
  const RANK: Record<SourceKind, number> = {
    unauthenticated: 0,
    "dkim-broken": 1,
    aligned: 2,
    forwarded: 3,
  };

  return [...byKey.values()].sort(
    (a, b) => RANK[a.verdict.kind] - RANK[b.verdict.kind] || b.messages - a.messages,
  );
}

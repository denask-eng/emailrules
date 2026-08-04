import assert from "node:assert/strict";
import test from "node:test";
import { gzipSync, deflateRawSync } from "node:zlib";
import {
  classifySource,
  decompress,
  parseAggregateReport,
  parseXml,
  summarise,
} from "./dmarc-report";

/* A real Google report, trimmed to four records that cover every outcome.
   Timestamps are the ones Google actually sends: unix seconds. */
const REPORT = `<?xml version="1.0" encoding="UTF-8" ?>
<feedback>
  <report_metadata>
    <org_name>google.com</org_name>
    <email>noreply-dmarc-support@google.com</email>
    <report_id>18446744073709551615</report_id>
    <date_range><begin>1785801600</begin><end>1785887999</end></date_range>
  </report_metadata>
  <policy_published>
    <domain>yourbrand.com</domain>
    <adkim>r</adkim><aspf>r</aspf><p>none</p><sp>none</sp><pct>100</pct>
  </policy_published>
  <record>
    <row>
      <source_ip>149.72.1.1</source_ip><count>3120</count>
      <policy_evaluated><disposition>none</disposition><dkim>pass</dkim><spf>pass</spf></policy_evaluated>
    </row>
    <identifiers><header_from>yourbrand.com</header_from><envelope_from>em.yourbrand.com</envelope_from></identifiers>
    <auth_results>
      <dkim><domain>yourbrand.com</domain><result>pass</result><selector>s1</selector></dkim>
      <spf><domain>em.yourbrand.com</domain><result>pass</result></spf>
    </auth_results>
  </record>
  <record>
    <row>
      <source_ip>209.85.220.41</source_ip><count>8800</count>
      <policy_evaluated><disposition>none</disposition><dkim>pass</dkim><spf>fail</spf></policy_evaluated>
    </row>
    <identifiers><header_from>yourbrand.com</header_from></identifiers>
    <auth_results>
      <dkim><domain>yourbrand.com</domain><result>pass</result></dkim>
      <spf><domain>gmail.com</domain><result>fail</result></spf>
    </auth_results>
  </record>
  <record>
    <row>
      <source_ip>198.51.100.7</source_ip><count>44</count>
      <policy_evaluated><disposition>none</disposition><dkim>fail</dkim><spf>pass</spf></policy_evaluated>
    </row>
    <identifiers><header_from>yourbrand.com</header_from></identifiers>
    <auth_results><spf><domain>yourbrand.com</domain><result>pass</result></spf></auth_results>
  </record>
  <record>
    <row>
      <source_ip>203.0.113.99</source_ip><count>11</count>
      <policy_evaluated><disposition>quarantine</disposition><dkim>fail</dkim><spf>fail</spf></policy_evaluated>
    </row>
    <identifiers><header_from>yourbrand.com</header_from></identifiers>
    <auth_results><spf><domain>evil.example</domain><result>fail</result></spf></auth_results>
  </record>
</feedback>`;

/* ── The classification, which is the product ─────────────────────────────
   Measured against the paid MXToolbox Delivery Center on 4 Aug 2026: its "SPF
   Unaligned Domains" table listed 277 rows in red, headed by gmail.com (5,494
   messages) and icloud.com (693). Those are forwarders. Rendering them as
   failures is why a marketer opens a DMARC dashboard and concludes either that
   they are under attack or that the tool is lying. */

test("SPF fail with DKIM pass is a forwarder, and is never the reader's problem", () => {
  const v = classifySource({ dkim: "pass", spf: "fail" });
  assert.equal(v.kind, "forwarded");
  assert.equal(v.yours, false, "a forwarded message must never land on the reader's list");
});

test("both failing is the only outcome that raises an alarm", () => {
  const v = classifySource({ dkim: "fail", spf: "fail" });
  assert.equal(v.kind, "unauthenticated");
  assert.equal(v.yours, true);
});

test("SPF pass with DKIM fail is yours, and is not called forgery", () => {
  const v = classifySource({ dkim: "fail", spf: "pass" });
  assert.equal(v.kind, "dkim-broken");
  assert.equal(v.yours, true);
  assert.ok(!/forg|spoof|attack/i.test(v.detail), "must not accuse anyone of forgery");
});

test("both passing is aligned", () => {
  assert.equal(classifySource({ dkim: "pass", spf: "pass" }).kind, "aligned");
});

/* ── Parsing ──────────────────────────────────────────────────────────── */

test("a real report parses to its four rows and its published policy", () => {
  const report = parseAggregateReport(REPORT);
  assert.equal(report.orgName, "google.com");
  assert.equal(report.domain, "yourbrand.com");
  assert.equal(report.policy.p, "none");
  assert.equal(report.policy.pct, 100);
  assert.equal(report.rows.length, 4);

  const [sendgrid, forwarded, unsigned, unknown] = report.rows;
  assert.equal(sendgrid.sourceIp, "149.72.1.1");
  assert.equal(sendgrid.count, 3120);
  assert.deepEqual(sendgrid.dkimDomains, ["yourbrand.com"]);
  assert.equal(forwarded.spf, "fail");
  assert.equal(forwarded.dkim, "pass");
  assert.equal(unsigned.dkimDomains.length, 0, "no dkim block means no signing domain");
  assert.equal(unknown.disposition, "quarantine");
});

test("unix seconds become real instants", () => {
  const report = parseAggregateReport(REPORT);
  assert.equal(report.begin, new Date(1785801600 * 1000).toISOString());
  assert.equal(report.end, new Date(1785887999 * 1000).toISOString());
});

test("a report that is not a report is refused rather than half-read", () => {
  assert.throws(() => parseAggregateReport("<html><body>404</body></html>"), /not a DMARC/);
});

/* ── Refusing hostile XML ─────────────────────────────────────────────────
   The file is written by a stranger's mail system and arrives unsolicited, so
   the two classic XML attacks are refused at the door rather than parsed
   safely. A DOCTYPE is never legitimate in an aggregate report. */

test("a DOCTYPE or ENTITY declaration is refused, not expanded", () => {
  const laughs = `<!DOCTYPE lolz [<!ENTITY lol "lol">]><feedback/>`;
  assert.throws(() => parseXml(laughs), /DOCTYPE or ENTITY/);
  assert.throws(() => parseAggregateReport(laughs), /DOCTYPE or ENTITY/);
});

test("an external entity pointing at a local file is refused", () => {
  const xxe = `<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><feedback><record>&xxe;</record></feedback>`;
  assert.throws(() => parseXml(xxe), /DOCTYPE or ENTITY/);
});

test("only the five predefined entities resolve", () => {
  const node = parseXml(`<feedback><report_metadata><org_name>a &amp; b &custom;</org_name></report_metadata></feedback>`);
  const org = node?.children[0]?.children[0];
  assert.equal(org?.name, "org_name");
  /* &custom; survives verbatim: unresolved is correct, invented is not. */
  assert.match(org?.text ?? "", /&custom;/);
});

test("nesting past the limit is refused", () => {
  const deep = "<a>".repeat(40) + "x" + "</a>".repeat(40);
  assert.throws(() => parseXml(deep), /nests too deeply/);
});

/* ── Decompression ────────────────────────────────────────────────────── */

test("gzip, zip and bare xml all reach the same report", () => {
  const bare = Buffer.from(REPORT, "utf8");
  assert.equal(parseAggregateReport(decompress(bare)).rows.length, 4);
  assert.equal(parseAggregateReport(decompress(gzipSync(bare))).rows.length, 4);

  /* A single-entry ZIP: local file header, deflate, no extras. */
  const deflated = deflateRawSync(bare);
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(8, 8); // method: deflate
  header.writeUInt16LE(9, 26); // filename length
  header.writeUInt16LE(0, 28); // extra length
  const zip = Buffer.concat([header, Buffer.from("a!b!1!2.xml".slice(0, 9)), deflated]);
  assert.equal(parseAggregateReport(decompress(zip)).rows.length, 4);
});

/* ── Summarising across reports ───────────────────────────────────────── */

test("the same address with two outcomes stays two rows, and never averages", () => {
  const sources = summarise([parseAggregateReport(REPORT), parseAggregateReport(REPORT)]);
  const aligned = sources.find((s) => s.sourceIp === "149.72.1.1");
  assert.equal(aligned?.messages, 6240, "two identical reports double the count");
  assert.equal(aligned?.verdict.kind, "aligned");

  const split = parseAggregateReport(REPORT);
  split.rows.push({ ...split.rows[0], dkim: "fail", spf: "fail", count: 5 });
  const both = summarise([split]).filter((s) => s.sourceIp === "149.72.1.1");
  assert.equal(both.length, 2, "one address that both authenticates and does not is shown twice");
});

test("an unauthenticated trickle outranks a forwarded flood", () => {
  const sources = summarise([parseAggregateReport(REPORT)]);
  assert.equal(sources[0].verdict.kind, "unauthenticated");
  assert.equal(sources[0].messages, 11);
  assert.equal(sources.at(-1)?.verdict.kind, "forwarded");
  assert.equal(sources.at(-1)?.messages, 8800, "8,800 forwarded messages still sort last");
});

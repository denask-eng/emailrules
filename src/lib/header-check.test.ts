import assert from "node:assert/strict";
import test from "node:test";
import {
  alignment,
  analyzeHeaders,
  detectGmailSummaryTable,
  orgDomainGuess,
  unfoldHeaders,
} from "./header-check";
import type { Finding, Severity } from "./dns-check";

const GMAIL_DELIVERED = `Delivered-To: reader@gmail.com
Received: by 2002:a05:example with SMTP id abc123;
        Fri, 1 Aug 2026 08:00:00 -0700 (PDT)
Authentication-Results: mx.google.com;
       dkim=pass header.d=brand.com header.s=news header.b=abc123;
       spf=pass smtp.mailfrom=bounce.brand.com;
       dmarc=pass header.from=brand.com
Return-Path: <campaign@bounce.brand.com>
From: Brand <hello@brand.com>
DKIM-Signature: v=1; a=rsa-sha256; d=brand.com; s=news;
 b=abcdefghijklmnopqrstuvwxyz0123456789
List-Unsubscribe: <mailto:leave@brand.com>, <https://brand.com/unsubscribe/123>
List-Unsubscribe-Post: List-Unsubscribe=One-Click
Subject: August note

The body is ignored.`;

const DOUBLE_SIGNATURE = `From: Brand <hello@brand.com>
Return-Path: <bounce@send.klaviyomail.com>
DKIM-Signature: v=1; d=klaviyomail.com; s=kl;
 b=firstsignature
DKIM-Signature: v=1; d=brand.com; s=kl2;
 b=secondsignature
List-Unsubscribe: <https://brand.com/unsubscribe/123>
List-Unsubscribe-Post: List-Unsubscribe=One-Click
Subject: Two signatures`;

const FOLDED_DKIM = `From: Brand <hello@brand.com>
Return-Path: <hello@brand.com>
DKIM-Signature: v=1; a=rsa-sha256;
	d=email.brand.com;
	s=summer;
	b=abcdefghijklmnopqrstuvwxyz
Subject: Folded`;

const GMAIL_SUMMARY = `Message ID	<CAExample@mail.gmail.com>
Created at: 1 August 2026 at 18:22 (Delivered after 1 second)
From: Brand <hello@brand.com>
To: reader@gmail.com
Subject: August note
SPF: 'PASS' with IP 192.0.2.1
DKIM: 'PASS' with domain brand.com
DMARC: 'PASS'`;

function checked(raw: string) {
  const result = analyzeHeaders(raw);
  if (!result.ok) assert.fail(`expected parsed headers, got ${result.error}`);
  return result;
}

function hasPair(findings: Finding[], severity: Severity, rule: string) {
  return findings.some((finding) => finding.severity === severity && finding.rule === rule);
}

function assertPair(findings: Finding[], severity: Severity, rule: string) {
  assert.equal(
    hasPair(findings, severity, rule),
    true,
    `missing finding pair (${severity}, ${rule})`,
  );
}

test("unfoldHeaders normalises CRLF and unfolds continuation lines", () => {
  const raw = `From: Brand <hello@brand.com>
DKIM-Signature: v=1;
	d=brand.com;
	s=summer
Subject: CRLF fixture`.replace(/\n/g, "\r\n");
  const headers = unfoldHeaders(raw);

  assert.equal(headers.length, 3);
  assert.deepEqual(headers[1], {
    name: "DKIM-Signature",
    lower: "dkim-signature",
    value: "v=1; d=brand.com; s=summer",
  });
});

test("unfoldHeaders stops at the first blank line in a full eml", () => {
  const raw = `From: hello@brand.com
Subject: A complete message

This body contains something that looks like a header.
DKIM-Signature: v=1; d=body.example; s=not-real`;
  const headers = unfoldHeaders(raw);

  assert.deepEqual(
    headers.map((header) => header.lower),
    ["from", "subject"],
  );
});

test("unfoldHeaders skips lines without a colon", () => {
  const raw = `Not a header
From: hello@brand.com
also not a header
Subject: Kept`;
  assert.deepEqual(
    unfoldHeaders(raw).map((header) => header.lower),
    ["from", "subject"],
  );
});

test("Gmail-delivered headers expose the receiver verdict and facts", () => {
  const result = checked(GMAIL_DELIVERED);

  assert.equal(result.facts.fromDomain, "brand.com");
  assert.equal(result.facts.returnPathDomain, "bounce.brand.com");
  assert.equal(result.facts.auth?.authservId, "mx.google.com");
  assert.equal(result.facts.auth?.spf?.result, "pass");
  assert.equal(result.facts.auth?.spf?.smtpMailfrom, "bounce.brand.com");
  assert.equal(result.facts.auth?.dkim[0]?.headerD, "brand.com");
  assert.equal(result.facts.auth?.dmarc?.headerFrom, "brand.com");
  assert.deepEqual(result.facts.listUnsubscribe.uris, [
    "mailto:leave@brand.com",
    "https://brand.com/unsubscribe/123",
  ]);
  assert.equal(result.facts.listUnsubscribe.hasHttps, true);
  assert.equal(result.facts.listUnsubscribePost, "List-Unsubscribe=One-Click");
  assertPair(result.findings, "pass", "outlook-high-volume-sender-authentication");
  assertPair(result.findings, "pass", "dkim-alignment-vs-dkim-passing");
  assertPair(result.findings, "pass", "one-click-unsubscribe-rfc-8058");
});

test("the topmost Authentication-Results header is used", () => {
  const raw = `Authentication-Results: edge.example; dmarc=pass header.from=brand.com
Authentication-Results: internal.example; dmarc=fail header.from=brand.com
From: hello@brand.com
Return-Path: <hello@brand.com>
DKIM-Signature: v=1; d=brand.com; s=main`;
  const result = checked(raw);

  assert.equal(result.facts.auth?.authservId, "edge.example");
  assert.equal(result.facts.auth?.dmarc?.result, "pass");
});

test("receiver authentication failures keep their rule and failure severity", () => {
  const raw = `Authentication-Results: mx.example;
 dkim=fail header.d=brand.com;
 spf=fail smtp.mailfrom=bounce.brand.com;
 dmarc=fail header.from=brand.com
From: hello@brand.com
Return-Path: <bounce@bounce.brand.com>
DKIM-Signature: v=1; d=brand.com; s=main`;
  const result = checked(raw);

  assertPair(result.findings, "fail", "gmail-bulk-sender-requirements");
  assertPair(result.findings, "fail", "dkim-alignment-vs-dkim-passing");
  assertPair(result.findings, "fail", "outlook-high-volume-sender-authentication");
});

test("Klaviyo-style double signing keeps every d= and s= pair", () => {
  const result = checked(DOUBLE_SIGNATURE);

  assert.deepEqual(
    result.facts.dkim.map(({ d, s }) => ({ d, s })),
    [
      { d: "klaviyomail.com", s: "kl" },
      { d: "brand.com", s: "kl2" },
    ],
  );
  assertPair(result.findings, "pass", "dkim-alignment-vs-dkim-passing");
  assertPair(result.findings, "info", "dkim-alignment-vs-dkim-passing");
  assertPair(result.findings, "info", "outlook-high-volume-sender-authentication");
});

test("a folded DKIM-Signature yields its selector and signing domain", () => {
  const result = checked(FOLDED_DKIM);

  assert.equal(result.facts.dkim[0]?.d, "email.brand.com");
  assert.equal(result.facts.dkim[0]?.s, "summer");
  assertPair(result.findings, "pass", "dkim-alignment-vs-dkim-passing");
});

test("a full eml body cannot add fake headers", () => {
  const raw = `From: hello@brand.com
Return-Path: <hello@brand.com>
DKIM-Signature: v=1; d=brand.com; s=real

DKIM-Signature: v=1; d=attacker.example; s=body
From: attacker@example.net`;
  const result = checked(raw);

  assert.equal(result.facts.fromDomain, "brand.com");
  assert.deepEqual(result.facts.dkim.map((signature) => signature.d), ["brand.com"]);
});

test("Gmail's summary table is rejected", () => {
  assert.equal(detectGmailSummaryTable(GMAIL_SUMMARY), true);
  assert.deepEqual(analyzeHeaders(GMAIL_SUMMARY), { ok: false, error: "gmail-summary" });
});

test("a real Received header prevents a Gmail-summary false positive", () => {
  const raw = `Received: from mail.brand.com
Message ID: copied label
Created at: today
SPF: PASS`;
  assert.equal(detectGmailSummaryTable(raw), false);
});

test("missing From is null and produces an inconclusive rule finding", () => {
  const raw = `Return-Path: <bounce@brand.com>
DKIM-Signature: v=1; d=brand.com; s=main
Subject: Missing From`;
  const result = checked(raw);

  assert.equal(result.facts.fromDomain, null);
  assertPair(result.findings, "info", "dkim-alignment-vs-dkim-passing");
});

test("the first of multiple From headers is used and warned about", () => {
  const raw = `From: first@first.example
From: second@second.example
Return-Path: <bounce@first.example>
DKIM-Signature: v=1; d=first.example; s=main`;
  const result = checked(raw);

  assert.equal(result.facts.fromDomain, "first.example");
  assertPair(result.findings, "warn", "dkim-alignment-vs-dkim-passing");
});

test("the last angle-bracket mailbox supplies the From domain", () => {
  const raw = `From: First <first@old.example>, Brand <hello@brand.com>
Return-Path: bounce@brand.com
DKIM-Signature: v=1; d=brand.com; s=main`;
  const result = checked(raw);

  assert.equal(result.facts.fromDomain, "brand.com");
  assert.equal(result.facts.returnPathDomain, "brand.com");
});

test("an empty Return-Path is represented as null", () => {
  const raw = `From: hello@brand.com
Return-Path: <>
DKIM-Signature: v=1; d=brand.com; s=main`;
  const result = checked(raw);

  assert.equal(result.facts.returnPathDomain, null);
  assertPair(result.findings, "info", "outlook-high-volume-sender-authentication");
});

test("Received-SPF is retained when Authentication-Results is absent", () => {
  const raw = `Received-SPF: pass (mx.example: domain of bounce@brand.com designates 192.0.2.1)
From: hello@brand.com
Return-Path: <bounce@brand.com>
DKIM-Signature: v=1; d=brand.com; s=main`;
  const result = checked(raw);

  assert.equal(
    result.facts.receivedSpf,
    "pass (mx.example: domain of bounce@brand.com designates 192.0.2.1)",
  );
  assert.equal(result.facts.auth, null);
  assertPair(result.findings, "info", "gmail-bulk-sender-requirements");
});

test("subdomains on the same organisational domain align in relaxed mode", () => {
  const raw = `From: Shop <hello@shop.brand.com>
Return-Path: <bounce@email.brand.com>
DKIM-Signature: v=1; d=email.brand.com; s=main`;
  const result = checked(raw);

  assert.equal(result.facts.fromDomain, "shop.brand.com");
  assertPair(result.findings, "pass", "dkim-alignment-vs-dkim-passing");
  assertPair(result.findings, "pass", "outlook-high-volume-sender-authentication");
});

test("co.uk organisational domains are compared with three labels", () => {
  const raw = `From: Shop <hello@shop.brand.co.uk>
Return-Path: <bounce@email.brand.co.uk>
DKIM-Signature: v=1; d=email.brand.co.uk; s=main`;
  const result = checked(raw);

  assert.equal(orgDomainGuess(result.facts.fromDomain!), "brand.co.uk");
  assertPair(result.findings, "pass", "dkim-alignment-vs-dkim-passing");
});

const unsubscribeCases: Array<{
  name: string;
  headers: string;
  severity: Severity;
}> = [
  {
    name: "HTTPS List-Unsubscribe plus List-Unsubscribe-Post passes",
    headers: `List-Unsubscribe: <https://brand.com/u/1>
List-Unsubscribe-Post: List-Unsubscribe=One-Click`,
    severity: "pass",
  },
  {
    name: "List-Unsubscribe without List-Unsubscribe-Post fails",
    headers: `List-Unsubscribe: <https://brand.com/u/1>`,
    severity: "fail",
  },
  {
    name: "mailto-only plus List-Unsubscribe-Post warns",
    headers: `List-Unsubscribe: <mailto:leave@brand.com>
List-Unsubscribe-Post: List-Unsubscribe=One-Click`,
    severity: "warn",
  },
  {
    name: "no unsubscribe headers warns",
    headers: `X-Campaign: transactional-or-bulk-unknown`,
    severity: "warn",
  },
];

for (const fixture of unsubscribeCases) {
  test(fixture.name, () => {
    const raw = `From: hello@brand.com
Return-Path: <hello@brand.com>
DKIM-Signature: v=1; d=brand.com; s=main
${fixture.headers}`;
    const result = checked(raw);

    assertPair(result.findings, fixture.severity, "one-click-unsubscribe-rfc-8058");
  });
}

test("no DKIM-Signature is a Gmail requirement failure", () => {
  const raw = `From: hello@brand.com
Return-Path: <hello@brand.com>
Subject: Unsigned`;
  const result = checked(raw);

  assert.equal(result.facts.dkim.length, 0);
  assertPair(result.findings, "fail", "gmail-bulk-sender-requirements");
});

test("unaligned Return-Path and DKIM fail the high-volume authentication rule", () => {
  const raw = `From: hello@brand.com
Return-Path: <bounce@klaviyomail.com>
DKIM-Signature: v=1; d=klaviyomail.com; s=main`;
  const result = checked(raw);

  assertPair(result.findings, "fail", "dkim-alignment-vs-dkim-passing");
  assertPair(result.findings, "fail", "outlook-high-volume-sender-authentication");
});

test("a receiver DMARC pass suppresses the inferred both-unaligned failure", () => {
  const raw = `Authentication-Results: mx.example; dmarc=pass header.from=brand.com
From: hello@brand.com
Return-Path: <bounce@klaviyomail.com>
DKIM-Signature: v=1; d=klaviyomail.com; s=main`;
  const result = checked(raw);

  const outlookFailures = result.findings.filter(
    (finding) =>
      finding.severity === "fail" &&
      finding.rule === "outlook-high-volume-sender-authentication",
  );
  assert.equal(outlookFailures.length, 0);
  assertPair(result.findings, "pass", "outlook-high-volume-sender-authentication");
});

test("findings are severity-sorted and every one names a rule", () => {
  const result = checked(DOUBLE_SIGNATURE);
  const order: Record<Severity, number> = { fail: 0, warn: 1, pass: 2, info: 3 };

  assert.equal(result.findings.every((finding) => Boolean(finding.rule)), true);
  assert.deepEqual(
    result.findings.map((finding) => order[finding.severity]),
    [...result.findings]
      .sort((left, right) => order[left.severity] - order[right.severity])
      .map((finding) => order[finding.severity]),
  );
});

const alignmentCases: Array<[string, string, ReturnType<typeof alignment>]> = [
  ["brand.com", "brand.com", "strict"],
  ["BRAND.COM", "brand.com.", "strict"],
  ["shop.brand.com", "email.brand.com", "relaxed"],
  ["brand.com", "klaviyomail.com", "none"],
  ["shop.brand.co.uk", "email.brand.co.uk", "relaxed"],
  ["shop.one.co.uk", "email.two.co.uk", "none"],
];

for (const [from, authenticated, expected] of alignmentCases) {
  test(`alignment(${from}, ${authenticated}) is ${expected}`, () => {
    assert.equal(alignment(from, authenticated), expected);
  });
}

const organisationCases: Array<[string, string]> = [
  ["shop.brand.com", "brand.com"],
  ["mail.brand.co.uk", "brand.co.uk"],
  ["email.brand.com.au", "brand.com.au"],
  ["brand.co.jp", "brand.co.jp"],
  ["localhost", "localhost"],
];

for (const [domain, expected] of organisationCases) {
  test(`orgDomainGuess(${domain}) returns ${expected}`, () => {
    assert.equal(orgDomainGuess(domain), expected);
  });
}

test("an empty paste has no headers", () => {
  assert.deepEqual(analyzeHeaders(""), { ok: false, error: "no-headers" });
});

test("pastes over roughly 400 KB are rejected", () => {
  const raw = `Subject: large fixture
X-Fill: ${"x".repeat(400 * 1024)}`;
  assert.deepEqual(analyzeHeaders(raw), { ok: false, error: "too-large" });
});

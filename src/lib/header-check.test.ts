import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import {
  alignment,
  analyzeHeaders,
  detectGmailSummaryTable,
  extractFacts,
  orgDomainGuess,
  unfoldHeaders,
} from "./header-check";
import {
  composeMessage,
  countTrackingPixels,
  extractContent,
  hasPostalAddress,
  htmlToText,
  messageFindings,
  rebuildHeaderBlock,
  unmatchedOffers,
  verdictSentence,
} from "./message-rules";
import type { Finding, Severity } from "./dns-check";
/* Relative on purpose: this suite runs under plain Node, which does not read
   the bundler's path aliases. */
import { verifyWebhookSignature } from "../app/api/inbound/signature";

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
    /* The mirror case. RFC 8058 needs the pair; a Post header with no URI to
       post to is exactly as unsatisfied as a URI with no Post header. */
    name: "List-Unsubscribe-Post without List-Unsubscribe fails",
    headers: `List-Unsubscribe-Post: List-Unsubscribe=One-Click`,
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

test("exactly one RFC 8058 finding is emitted per message", () => {
  for (const fixture of unsubscribeCases) {
    const result = checked(`From: hello@brand.com
DKIM-Signature: v=1; d=brand.com; s=main
${fixture.headers}`);
    const oneClick = result.findings.filter(
      (finding) => finding.rule === "one-click-unsubscribe-rfc-8058",
    );
    assert.equal(oneClick.length, 1, `${fixture.name} produced ${oneClick.length} findings`);
  }
});

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

test("pastes over roughly 2 MB are rejected", () => {
  const raw = `Subject: large fixture
X-Fill: ${"x".repeat(2 * 1024 * 1024)}`;
  assert.deepEqual(analyzeHeaders(raw), { ok: false, error: "too-large" });
});

/* ─────────────────────── The message, not only its headers ────────────────── */

const CAMPAIGN = `Authentication-Results: mx.google.com;
       dkim=pass header.d=brand.com header.s=news;
       spf=pass smtp.mailfrom=bounce.brand.com;
       dmarc=pass header.from=brand.com
Return-Path: <campaign@bounce.brand.com>
From: Brand <hello@brand.com>
DKIM-Signature: v=1; a=rsa-sha256; d=brand.com; s=news; b=abcdef
List-Unsubscribe: <https://brand.com/u/1>
List-Unsubscribe-Post: List-Unsubscribe=One-Click
Subject: The August edit is here
Content-Type: text/html; charset=utf-8

<html><body>
<p>Three new coats landed this morning, and the wool one is the reason we made this edit.</p>
<img src="https://cdn.brand.com/coat.jpg" width="600" height="400" alt="A wool coat">
<img src="https://track.brand.com/o/abc123.gif" width="1" height="1">
<p>Brand Ltd, 125 Summer Street, Boston, MA 02110</p>
<p><a href="https://brand.com/u/1">Unsubscribe</a></p>
</body></html>`;

function messageOf(raw: string) {
  const content = extractContent(raw);
  const headers = unfoldHeaders(raw);
  return messageFindings({ headers, facts: extractFacts(headers), content });
}

function titlesFor(findings: Finding[], rule: string): string[] {
  return findings.filter((finding) => finding.rule === rule).map((finding) => finding.title);
}

test("a whole campaign yields content and consent findings, each citing a rule", () => {
  const findings = messageOf(CAMPAIGN);

  assert.equal(findings.every((finding) => Boolean(finding.rule)), true);
  assertPair(findings, "pass", "can-spam-penalty-per-email");
  assertPair(findings, "pass", "apple-intelligence-email-summaries");
  assertPair(findings, "info", "france-email-open-tracking-consent");
  assertPair(findings, "info", "italy-email-tracking-pixel-consent");
});

test("nothing derived from the body or the subject is carried as evidence", () => {
  for (const finding of messageOf(CAMPAIGN)) {
    assert.equal(finding.evidence, undefined, `${finding.title} carried evidence`);
    assert.equal(/wool|Summer Street|August edit/.test(finding.detail), false);
  }
});

test("headers alone produce no body findings at all", () => {
  const headersOnly = `From: Brand <hello@brand.com>
DKIM-Signature: v=1; d=brand.com; s=news
Subject: No body here

`;
  assert.deepEqual(messageOf(headersOnly), []);
});

test("a missing postal address fails when the message declares itself bulk", () => {
  const raw = `From: Brand <hello@brand.com>
List-Unsubscribe: <https://brand.com/u/1>
List-Unsubscribe-Post: List-Unsubscribe=One-Click
Subject: No address
Content-Type: text/plain

Three new coats landed this morning and the wool one is the reason we made this.
Unsubscribe: https://brand.com/u/1`;
  assertPair(messageOf(raw), "fail", "can-spam-penalty-per-email");
});

test("a missing postal address only warns when nothing says the mail is bulk", () => {
  const raw = `From: Brand <hello@brand.com>
Subject: Your order shipped
Content-Type: text/plain

Your order shipped this morning and should arrive on Thursday. Track it any time.`;
  const findings = messageOf(raw);
  assertPair(findings, "warn", "can-spam-penalty-per-email");
  assert.equal(hasPair(findings, "fail", "can-spam-penalty-per-email"), false);
});

const addressCases: Array<[string, boolean]> = [
  ["Brand Ltd, 125 Summer Street, Boston, MA 02110", true],
  ["PO Box 4120, Portland OR", true],
  ["Brand Ltd, 12 Old Street, London EC1V 9BE", true],
  ["emailrules.today, Verkiu g. 39, Vilnius 09109, Lithuania", true],
  ["Musterfirma GmbH, Hauptstraße 12, 10115 Berlin", true],
  /* Regression: a real campaign footer reported as having no address. The
     state was written out and the street line alone is one weak signal. */
  [
    "Beyond Body Fasting, 505 Montgomery Street, 10th & 11th Floors, San Francisco, California, 94111, USA",
    true,
  ],
  /* The same miss without the street word, so the state name carries it. */
  ["Brand Inc, San Francisco, California, 94111", true],
  /* A comma between the abbreviation and the ZIP used to break the match. */
  ["Brand Inc, 125 Summer Street, Boston, MA, 02110", true],
  ["Brand Inc, 350 Fifth Avenue, New York, New York 10118", true],
  ["Brand Inc, Austin, Texas 78701", true],
  /* Two-letter codes stay case-sensitive: "ca." here is circa, not California,
     and a citation is not a postal address. */
  ["Founded ca. 12345 members ago, we still answer every email.", false],
  ["© 2026 Brand. All rights reserved. Sent because you signed up.", false],
  ["Save 30% today only. 24 hours left on everything in the sale.", false],
  ["Questions? Reply to this email or call us on 0800 100 200.", false],
];

for (const [line, expected] of addressCases) {
  test(`hasPostalAddress(${JSON.stringify(line.slice(0, 34))}…) is ${expected}`, () => {
    assert.equal(hasPostalAddress(line), expected);
  });
}

function headerFindingsOf(raw: string) {
  const result = analyzeHeaders(raw);
  assert.equal(result.ok, true, "expected the header block to parse");
  return result.ok ? result.findings : [];
}

test("a forwarded message does not get blamed for the headers the forward stripped", () => {
  /* Gmail removes List-Unsubscribe when a human forwards a campaign. Before
     this, a compliant bulk send arrived here reported as having no one-click
     unsubscribe — telling a sender to fix something that was never broken. */
  const raw = `From: Brand <hello@brand.com>
To: reader@example.com
X-Forwarded-For: reader@gmail.com friend@gmail.com
Subject: Fwd: Three new coats
Content-Type: text/plain

Three new coats landed this morning and the wool one is the reason we made this.`;
  const findings = headerFindingsOf(raw);
  assert.equal(hasPair(findings, "warn", "one-click-unsubscribe-rfc-8058"), false);
  assert.equal(hasPair(findings, "info", "one-click-unsubscribe-rfc-8058"), true);
});

test("a message that was not forwarded still gets the missing-unsubscribe warning", () => {
  const raw = `From: Brand <hello@brand.com>
To: reader@example.com
Subject: Three new coats
Content-Type: text/plain

Three new coats landed this morning and the wool one is the reason we made this.`;
  assert.equal(
    hasPair(headerFindingsOf(raw), "warn", "one-click-unsubscribe-rfc-8058"),
    true,
  );
});

test("extractFacts records why it thinks a message was forwarded", () => {
  const headers = unfoldHeaders(
    `From: Brand <hello@brand.com>\r\nResent-From: reader@gmail.com\r\nSubject: FW: sale\r\n`,
  );
  const facts = extractFacts(headers);
  assert.equal(facts.forwarded.likely, true);
  assert.ok(facts.forwarded.signals.includes("resent-from"));
  assert.ok(facts.forwarded.signals.includes("subject prefix"));
});

test("an ordinary campaign is not mistaken for a forward", () => {
  const headers = unfoldHeaders(
    `From: Brand <hello@brand.com>\r\nSubject: Three new coats landed\r\n`,
  );
  assert.equal(extractFacts(headers).forwarded.likely, false);
});

test("an image-only campaign fails the Apple summary rule", () => {
  const raw = `From: Brand <hello@brand.com>
Subject: Image only
Content-Type: text/html

<html><body><img src="https://cdn.brand.com/whole-email.jpg" alt="Everything is in this image"></body></html>`;
  assertPair(messageOf(raw), "fail", "apple-intelligence-email-summaries");
});

test("view-in-browser boilerplate at the top is what Apple would summarise", () => {
  const raw = `From: Brand <hello@brand.com>
Subject: Boilerplate lead
Content-Type: text/html

<html><body><p>View this email in your browser</p><img src="https://cdn.brand.com/hero.jpg"><p>Three new coats landed this morning and the wool one is why.</p></body></html>`;
  assertPair(messageOf(raw), "warn", "apple-intelligence-email-summaries");
});

test("the HTML part is what Apple reads, not a stub plain-text fallback", () => {
  const raw = `From: Brand <hello@brand.com>
Subject: Multipart
Content-Type: multipart/alternative; boundary="sep"

--sep
Content-Type: text/plain

View in browser
--sep
Content-Type: text/html

<html><body><p>Three new coats landed this morning, and the wool one is the reason we made this edit at all.</p></body></html>
--sep--`;
  const findings = messageOf(raw);
  assertPair(findings, "pass", "apple-intelligence-email-summaries");
  assert.equal(hasPair(findings, "warn", "apple-intelligence-email-summaries"), false);
});

const pixelCases: Array<[string, number]> = [
  ['<img src="https://cdn.brand.com/hero.jpg" width="600" height="400">', 0],
  ['<img src="https://t.brand.com/o/abc.gif" width="1" height="1">', 1],
  ['<img src="https://x.example/img" style="width:1px;height:1px">', 1],
  ['<img src="https://x.example/open?id=9">', 1],
  ['<img src="https://x.example/wf/open?upn=9">', 1],
  ['<img src="https://x.example/spacer.gif" width="20" height="1">', 0],
];

for (const [tag, expected] of pixelCases) {
  test(`countTrackingPixels finds ${expected} in ${tag.slice(0, 44)}…`, () => {
    assert.equal(countTrackingPixels(tag), expected);
  });
}

test("no detected pixel is reported as an observation, not as a clean bill", () => {
  const raw = `From: Brand <hello@brand.com>
Subject: No pixel
Content-Type: text/html

<html><body><p>Three new coats landed this morning, and the wool one is the reason for the edit.</p><p>Brand Ltd, 125 Summer Street, Boston, MA 02110</p></body></html>`;
  const titles = titlesFor(messageOf(raw), "france-email-open-tracking-consent");
  assert.deepEqual(titles, ["No open-tracking pixel was detected"]);
});

test("a manufactured Re: on a message that is not a reply is a Washington finding", () => {
  const raw = `From: Brand <hello@brand.com>
Subject: Re: your order
Content-Type: text/plain

Three new coats landed this morning and the wool one is the reason we made this edit.
Brand Ltd, 125 Summer Street, Boston, MA 02110`;
  assertPair(messageOf(raw), "warn", "washington-misleading-subject-lines");
});

test("a genuine reply carrying In-Reply-To is not flagged", () => {
  const raw = `From: Brand <hello@brand.com>
In-Reply-To: <abc@mail.example>
Subject: Re: your order
Content-Type: text/plain

Thanks for writing in. Your order shipped this morning and arrives Thursday.
Brand Ltd, 125 Summer Street, Boston, MA 02110`;
  assert.deepEqual(titlesFor(messageOf(raw), "washington-misleading-subject-lines"), []);
});

const offerCases: Array<[string, string, number]> = [
  ["30% off everything", "Take 30% off every coat we make.", 0],
  ["30% off everything", "Take 20% off every coat we make.", 1],
  ["£40 off, this week", "Forty pounds off, this week only.", 1],
  ["The August edit", "Three new coats landed this morning.", 0],
];

for (const [subject, body, expected] of offerCases) {
  test(`unmatchedOffers(${JSON.stringify(subject)}) is ${expected}`, () => {
    assert.equal(unmatchedOffers(subject, body), expected);
  });
}

test("an offer in the subject that is nowhere in the body is worth a look", () => {
  const raw = `From: Brand <hello@brand.com>
Subject: 30% off everything
Content-Type: text/plain

Take 20 percent off every coat we make, this week only.
Brand Ltd, 125 Summer Street, Boston, MA 02110`;
  assertPair(messageOf(raw), "warn", "washington-misleading-subject-lines");
});

test("marketing sent without unsubscribe headers is a classification finding", () => {
  const raw = `From: Brand <hello@brand.com>
Subject: Your receipt
Content-Type: text/plain

Take 30% off your next order with this code. Shop the new coats now.
Unsubscribe: https://brand.com/u/1
Brand Ltd, 125 Summer Street, Boston, MA 02110`;
  assertPair(
    messageOf(raw),
    "warn",
    "transactional-vs-commercial-email-is-not-a-subject-line-trick",
  );
});

test("a genuine receipt is not reclassified as marketing", () => {
  const raw = `From: Brand <hello@brand.com>
Subject: Your order shipped
Content-Type: text/plain

Order 4821 shipped this morning. It should reach you on Thursday.
Brand Ltd, 125 Summer Street, Boston, MA 02110`;
  assert.deepEqual(
    titlesFor(messageOf(raw), "transactional-vs-commercial-email-is-not-a-subject-line-trick"),
    [],
  );
});

/* ─────────────────────────── Reading a real message ───────────────────────── */

test("quoted-printable and base64 parts are decoded before they are read", () => {
  const quoted = extractContent(`From: a@b.example
Content-Type: text/plain
Content-Transfer-Encoding: quoted-printable

Caf=C3=A9 = the place, 30=25 off, wrapped =
across a soft break`);
  assert.equal(quoted.text, "Café = the place, 30% off, wrapped across a soft break");

  const encoded = extractContent(`From: a@b.example
Content-Type: text/html
Content-Transfer-Encoding: base64

PGh0bWw+PGJvZHk+PHA+SGVsbG8gY2Fmw6k8L3A+PC9ib2R5PjwvaHRtbD4=`);
  assert.equal(encoded.html, "<html><body><p>Hello café</p></body></html>");
});

test("an RFC 2047 subject is decoded", () => {
  const content = extractContent(`From: a@b.example
Subject: =?utf-8?B?TGUgY2Fmw6kgZHUgbWF0aW4=?=
Content-Type: text/plain

Body`);
  assert.equal(content.subject, "Le café du matin");
});

test("attachments are never decoded or read", () => {
  const content = extractContent(`From: a@b.example
Content-Type: multipart/mixed; boundary="sep"

--sep
Content-Type: text/plain

The readable part.
--sep
Content-Type: text/plain
Content-Disposition: attachment; filename="notes.txt"

This attachment must not become the body.
--sep--`);
  assert.equal(content.text, "The readable part.");
});

test("htmlToText strips scripts and never returns markup", () => {
  const text = htmlToText(
    `<html><head><style>p{color:red}</style></head><body><script>alert(1)</script><p>Hello &amp; welcome</p><div>Second line</div></body></html>`,
  );
  assert.equal(/[<>]/.test(text), false);
  assert.equal(text.includes("alert"), false);
  assert.equal(text, "Hello & welcome\nSecond line");
});

test("composeMessage rebuilds a message the parser can read back", () => {
  const raw = composeMessage({
    headers: {
      From: "Brand <hello@brand.com>",
      Subject: "Rebuilt",
      "Content-Type": 'multipart/alternative; boundary="gone"',
      "List-Unsubscribe": "<https://brand.com/u/1>",
    },
    text: "Plain body.",
    html: "<p>HTML body.</p>",
  });
  const content = extractContent(raw);
  const facts = extractFacts(unfoldHeaders(raw));

  assert.equal(content.subject, "Rebuilt");
  assert.equal(content.text?.trim(), "Plain body.");
  assert.equal(content.html?.trim(), "<p>HTML body.</p>");
  assert.equal(facts.fromDomain, "brand.com");
  assert.deepEqual(facts.listUnsubscribe.uris, ["https://brand.com/u/1"]);
});

test("a newline smuggled into a webhook header value cannot forge a header", () => {
  const raw = rebuildHeaderBlock({
    From: "Brand <hello@brand.com>",
    "X-Note": "harmless\nDKIM-Signature: v=1; d=attacker.example; s=forged",
  });
  const facts = extractFacts(unfoldHeaders(raw));

  assert.equal(facts.fromDomain, "brand.com");
  assert.deepEqual(facts.dkim, []);
});

test("header shapes other than an object are all accepted", () => {
  const fromArray = rebuildHeaderBlock([
    { name: "From", value: "Brand <hello@brand.com>" },
    { name: "Subject", value: "Array shape" },
  ]);
  assert.equal(extractFacts(unfoldHeaders(fromArray)).fromDomain, "brand.com");
  assert.equal(rebuildHeaderBlock("From: hello@brand.com"), "From: hello@brand.com");
});

test("the verdict is a sentence about counts and never a score", () => {
  const of = (severities: Severity[]): Finding[] =>
    severities.map((severity) => ({ severity, title: "t", detail: "d" }));

  assert.equal(verdictSentence(of(["pass", "info"])), "Nothing to fix in this message.");
  assert.equal(verdictSentence(of(["fail"])), "1 thing to fix.");
  assert.equal(verdictSentence(of(["fail", "fail", "warn"])), "2 things to fix, 1 worth a look.");
  assert.equal(verdictSentence(of(["warn"])), "Nothing broken, 1 worth a look.");
  for (const findings of [of(["fail"]), of(["pass"]), of(["warn", "info"])]) {
    assert.equal(/\d+\s*(?:%|percent|\/\s*\d|out of)/.test(verdictSentence(findings)), false);
  }
});

/* ────────────────────────── The webhook's front door ──────────────────────── */

const SECRET = "whsec_dGhpc2lzYXRlc3RzZWNyZXRmb3JzaWduaW5n";

function sign(payload: string, id: string, timestamp: string, secret = SECRET): string {
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  return `v1,${createHmac("sha256", key).update(`${id}.${timestamp}.${payload}`).digest("base64")}`;
}

test("a correctly signed delivery verifies", () => {
  const payload = JSON.stringify({ type: "email.received" });
  const timestamp = String(Math.floor(Date.now() / 1000));
  assert.equal(
    verifyWebhookSignature({
      payload,
      id: "msg_1",
      timestamp,
      signature: sign(payload, "msg_1", timestamp),
      secret: SECRET,
    }),
    null,
  );
});

test("a tampered payload, a stale timestamp and a missing secret are all refused", () => {
  const payload = JSON.stringify({ type: "email.received" });
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = sign(payload, "msg_1", timestamp);

  assert.equal(
    verifyWebhookSignature({
      payload: `${payload} `,
      id: "msg_1",
      timestamp,
      signature,
      secret: SECRET,
    }),
    "bad-signature",
  );
  assert.equal(
    verifyWebhookSignature({
      payload,
      id: "msg_1",
      timestamp: String(Number(timestamp) - 3600),
      signature,
      secret: SECRET,
    }),
    "stale-timestamp",
  );
  assert.equal(
    verifyWebhookSignature({ payload, id: "msg_1", timestamp, signature, secret: undefined }),
    "no-secret",
  );
  assert.equal(
    verifyWebhookSignature({ payload, id: null, timestamp, signature, secret: SECRET }),
    "missing-headers",
  );
});

test("a rotated secret is accepted while both signatures are sent", () => {
  const payload = JSON.stringify({ type: "email.received" });
  const timestamp = String(Math.floor(Date.now() / 1000));
  const old = sign(payload, "msg_1", timestamp, "whsec_b2xkc2VjcmV0dmFsdWVoZXJlMTIzNDU2");
  const current = sign(payload, "msg_1", timestamp);

  assert.equal(
    verifyWebhookSignature({
      payload,
      id: "msg_1",
      timestamp,
      signature: `${old} ${current}`,
      secret: SECRET,
    }),
    null,
  );
});

import assert from "node:assert/strict";
import test from "node:test";
import { detectInput } from "./detect-input";

const kind = (s: string) => detectInput(s).kind;

test("a bare domain is a domain", () => {
  assert.equal(kind("yourbrand.com"), "domain");
  assert.equal(detectInput("  YourBrand.COM  ").value, "yourbrand.com");
});

test("a URL is the domain inside it", () => {
  assert.equal(detectInput("https://www.yourbrand.com/pricing?x=1").value, "yourbrand.com");
  assert.equal(kind("https://www.yourbrand.com/pricing?x=1"), "domain");
});

test("an address is the domain it sends from", () => {
  const d = detectInput("hello@shop.yourbrand.com");
  assert.equal(d.kind, "email");
  assert.equal(d.value, "shop.yourbrand.com");
  assert.equal(d.href, "/check/shop.yourbrand.com");
});

test("an IPv4 address is an address", () => {
  assert.equal(kind("23.83.223.10"), "ip");
  assert.equal(detectInput("23.83.223.10").href, "/check/ip/23.83.223.10");
});

test("a number that is not a valid IPv4 is not one", () => {
  /* 999 is not an octet, and this must not become a domain either. */
  assert.equal(kind("999.1.1.1"), "unknown");
});

/* ── The one that has to win ──────────────────────────────────────────────
   A real message contains domains, addresses and records. If any other rule
   matched first, pasting a campaign would silently check a fragment of it and
   answer confidently about the wrong thing. */

const MESSAGE = `Received: from mail-7.klaviyomail.com ([23.83.223.10])
        by mx.google.com with ESMTPS id abc123
From: Brand <hello@yourbrand.com>
Subject: 30% off
DKIM-Signature: v=1; a=rsa-sha256; d=yourbrand.com; s=kl2

<html><body>hi</body></html>`;

test("a whole message beats every fragment inside it", () => {
  assert.equal(kind(MESSAGE), "message");
  assert.equal(detectInput(MESSAGE).value.startsWith("Received:"), true);
});

test("a message pasted starting at From: is still a message", () => {
  assert.equal(kind("From: a@b.com\nSubject: hi\nTo: c@d.com\n\nbody"), "message");
});

test("prose with an address in it is not a message", () => {
  assert.equal(kind("our emails from hello@brand.com go to spam\nplease help"), "unknown");
});

/* ── Records ──────────────────────────────────────────────────────────── */

test("records are recognised rather than mistaken for domains", () => {
  assert.equal(kind("v=spf1 include:_spf.google.com ~all"), "spf-record");
  assert.equal(kind("v=DMARC1; p=reject; rua=mailto:x@y.com"), "dmarc-record");
  assert.equal(kind("v=DKIM1; k=rsa; p=MIGfMA0GCS"), "dkim-record");
});

test("a record says what it is rather than routing somewhere wrong", () => {
  const d = detectInput("v=spf1 -all");
  assert.equal(d.href, undefined);
  assert.match(d.says, /SPF record/);
});

/* ── Refusing to guess ────────────────────────────────────────────────── */

test("empty asks rather than errors", () => {
  assert.equal(kind(""), "unknown");
  assert.equal(kind("   \n  "), "unknown");
});

test("a sentence is not a domain", () => {
  assert.equal(kind("why are my emails going to spam"), "unknown");
});

test("a single word with no dot is not a domain", () => {
  assert.equal(kind("klaviyo"), "unknown");
});

test("the unknown reason differs for one line and for many", () => {
  assert.match(detectInput("klaviyo").says, /domain, an address or an IP/);
  assert.match(detectInput("line one\nline two").says, /header lines/);
});

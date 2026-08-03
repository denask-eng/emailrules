import assert from "node:assert/strict";
import test from "node:test";
import { classifyCodes, isRefusalCode, reverseAddress, spfTargets } from "./blocklist-check";

/* ── The refusal rule ─────────────────────────────────────────────────────
   Measured against the live zones on 3 Aug 2026: zen.spamhaus.org answered
   127.255.255.254 through Cloudflare for 2.0.0.127, which is a refusal, and
   NXDOMAIN through Google for dbltest.com, which is definitely listed. Read
   the first as a listing and every domain on earth is blacklisted. Read the
   second as clean and the tool lies with total confidence. Both are the same
   bug: believing an answer that was never given. */

test("the whole 127.255.255.0/24 block is a refusal, never a listing", () => {
  for (const code of ["127.255.255.252", "127.255.255.254", "127.255.255.255", "127.255.255.0"]) {
    assert.equal(isRefusalCode(code), true, `${code} must read as refused`);
    assert.equal(classifyCodes([code]).kind, "refused");
  }
});

test("a real listing code is a listing", () => {
  const answer = classifyCodes(["127.0.0.2"]);
  assert.equal(answer.kind, "listed");
  assert.deepEqual(answer.kind === "listed" ? answer.codes : [], ["127.0.0.2"]);
});

test("URIBL's own refusal code is a refusal only for URIBL", () => {
  /* 127.0.0.1 means "we are declining you" at URIBL and nothing at all
     elsewhere, so it is configured per list rather than assumed globally. */
  assert.equal(classifyCodes(["127.0.0.1"], ["127.0.0.1"]).kind, "refused");
  assert.equal(classifyCodes(["127.0.0.1"]).kind, "listed");
});

test("one refusal among several codes still refuses the whole answer", () => {
  assert.equal(classifyCodes(["127.0.0.2", "127.255.255.254"]).kind, "refused");
});

test("no records is absent, which is the only honest form of clean", () => {
  assert.equal(classifyCodes([]).kind, "absent");
});

test("a multi-code listing is kept whole, because the codes say which list", () => {
  /* Mailspike answers 2.0.0.127 with five codes at once. Collapsing them
     would throw away which of its sublists actually holds the entry. */
  const answer = classifyCodes(["127.0.0.2", "127.0.0.10", "127.0.0.12"]);
  assert.equal(answer.kind, "listed");
  assert.equal(answer.kind === "listed" ? answer.codes.length : 0, 3);
});

/* ── Reversing an address ─────────────────────────────────────────────── */

test("IPv4 reverses into DNSBL label order", () => {
  assert.equal(reverseAddress("127.0.0.2"), "2.0.0.127");
  assert.equal(reverseAddress("4.7.16.128"), "128.16.7.4");
});

test("a malformed IPv4 is refused rather than guessed at", () => {
  for (const bad of ["1.2.3", "1.2.3.4.5", "999.1.1.1", "a.b.c.d", ""]) {
    assert.equal(reverseAddress(bad), null, `${bad} must not reverse`);
  }
});

test("IPv6 expands to reversed nibbles", () => {
  assert.equal(
    reverseAddress("2001:db8::1"),
    "1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.8.b.d.0.1.0.0.2",
  );
  /* No :: at all still has to work, and produce the same 32 nibbles. */
  assert.equal(reverseAddress("2001:0db8:0000:0000:0000:0000:0000:0001")?.length, 63);
});

test("an IPv6 with two :: runs is refused", () => {
  assert.equal(reverseAddress("2001::db8::1"), null);
});

/* ── Reading SPF for targets ──────────────────────────────────────────── */

const KLAVIYO_SPF =
  "v=spf1 include:mg-spf.greenhouse.io include:_spf.google.com include:mail.zendesk.com " +
  "include:emailus.freshservice.com include:_spf.salesforce.com ip4:4.7.16.128/26 " +
  "ip4:38.108.186.0/24 ~all";

test("includes are named and never expanded", () => {
  const t = spfTargets(KLAVIYO_SPF);
  assert.equal(t.includes.length, 5);
  assert.ok(t.includes.includes("_spf.google.com"));
});

test("ranges are reported as ranges rather than sampled", () => {
  const t = spfTargets(KLAVIYO_SPF);
  assert.deepEqual(t.ips, []);
  assert.equal(t.ranges.length, 2);
  /* A /26 is 64 addresses and a /24 is 256. Checking eight of either and
     calling the range clean is a sample dressed up as a verdict. */
  assert.equal(t.ranges.reduce((sum, r) => sum + r.addresses, 0), 320);
});

test("single hosts are checked, with or without an explicit /32", () => {
  const t = spfTargets("v=spf1 ip4:203.0.113.7 ip4:203.0.113.8/32 -all");
  assert.deepEqual(t.ips, ["203.0.113.7", "203.0.113.8"]);
  assert.equal(t.ranges.length, 0);
});

test("qualifiers on a mechanism do not hide it", () => {
  const t = spfTargets("v=spf1 +ip4:203.0.113.7 -include:spf.example.net ~all");
  assert.deepEqual(t.ips, ["203.0.113.7"]);
  assert.deepEqual(t.includes, ["spf.example.net"]);
});

test("a bare IPv6 host is a target and a range is not", () => {
  const t = spfTargets("v=spf1 ip6:2001:db8::1 ip6:2001:db8::/64 -all");
  assert.deepEqual(t.ips, ["2001:db8::1"]);
  assert.equal(t.ranges.length, 1);
});

test("the number of hosts queried is capped", () => {
  const many = `v=spf1 ${Array.from({ length: 30 }, (_, i) => `ip4:203.0.113.${i + 1}`).join(" ")} -all`;
  assert.equal(spfTargets(many).ips.length, 8);
});

test("no SPF means no targets rather than an assumption", () => {
  assert.deepEqual(spfTargets(null), { ips: [], ranges: [], includes: [] });
});

test("duplicate mechanisms are counted once", () => {
  const t = spfTargets("v=spf1 ip4:203.0.113.7 ip4:203.0.113.7 include:a.net include:a.net -all");
  assert.equal(t.ips.length, 1);
  assert.equal(t.includes.length, 1);
});

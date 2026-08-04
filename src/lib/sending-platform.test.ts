import assert from "node:assert/strict";
import test from "node:test";
import {
  detectPlatforms,
  detectSpfManager,
  platformClaim,
  primarySender,
  spfIncludes,
} from "./sending-platform";

/* ── The rule this file exists to enforce ─────────────────────────────────
   Every claim here is a claim about somebody's business, printed on a page
   they may forward to their agency. The failure that matters is not missing a
   platform — it is naming the wrong one confidently. These tests are written
   against the case that actually happened: klaviyo.com publishes a key on
   `k1._domainkey`, which is Mailchimp's documented selector and also four
   characters long, and the first version of this page told the reader they
   send through Mailchimp. */

test("a short selector alone never claims the domain sends through a platform", () => {
  const [p] = detectPlatforms(null, ["k1._domainkey (Mailchimp)"]);
  assert.equal(p.name, "Mailchimp");
  assert.equal(p.basis, "dkim");
  assert.match(platformClaim(p), /key is published/i);
  assert.doesNotMatch(platformClaim(p), /you send through/i);
});

test("a selector-only match is never the primary sender", () => {
  const detected = detectPlatforms(null, ["k1._domainkey (Mailchimp)", "s1._domainkey (SendGrid)"]);
  assert.equal(primarySender(detected), null);
});

test("an SPF include alone is reported as permission, not as use", () => {
  const [p] = detectPlatforms("v=spf1 include:_spf.klaviyo.com ~all", []);
  assert.equal(p.name, "Klaviyo");
  assert.equal(p.basis, "spf");
  assert.match(platformClaim(p), /authorises/i);
});

test("include plus a live key is the only thing that claims you send through it", () => {
  const [p] = detectPlatforms("v=spf1 include:_spf.klaviyo.com ~all", ["kl._domainkey (Klaviyo)"]);
  assert.equal(p.basis, "both");
  assert.equal(platformClaim(p), "You send through Klaviyo");
  assert.equal(primarySender([p])?.name, "Klaviyo");
});

/* ── Matching ─────────────────────────────────────────────────────────── */

test("vendors sharded by region and account still match", () => {
  const [p] = detectPlatforms("v=spf1 include:u123.wl.sendgrid.net ~all", []);
  assert.equal(p.name, "SendGrid");
});

test("a lookalike domain does not match", () => {
  assert.deepEqual(detectPlatforms("v=spf1 include:notsendgrid.net ~all", []), []);
});

test("staff mail is never offered as the sending platform", () => {
  const detected = detectPlatforms(
    "v=spf1 include:_spf.google.com include:spf.protection.outlook.com ~all",
    ["google._domainkey (Google Workspace)"],
  );
  assert.ok(detected.length >= 2);
  assert.ok(detected.every((p) => p.kind === "corporate"));
  assert.equal(primarySender(detected), null);
});

test("Salesforce core is not Marketing Cloud", () => {
  const [p] = detectPlatforms("v=spf1 include:_spf.salesforce.com ~all", []);
  assert.equal(p.name, "Salesforce");
  assert.equal(p.kind, "corporate");
  assert.equal(primarySender([p]), null);
});

test("Marketing Cloud's own include is the marketing platform", () => {
  const [p] = detectPlatforms("v=spf1 include:cust-spf.exacttarget.com ~all", []);
  assert.equal(p.name, "Salesforce Marketing Cloud");
  assert.equal(p.kind, "esp");
});

test("the sending platform outranks staff mail in the order", () => {
  const detected = detectPlatforms(
    "v=spf1 include:_spf.google.com include:_spf.klaviyo.com ~all",
    ["kl._domainkey (Klaviyo)"],
  );
  assert.equal(detected[0].name, "Klaviyo");
});

test("evidence is the literal token, never a paraphrase", () => {
  const [p] = detectPlatforms("v=spf1 include:_spf.klaviyo.com ~all", []);
  assert.deepEqual(p.evidence, [{ value: "include:_spf.klaviyo.com", from: "spf" }]);
});

test("includes are read in published order", () => {
  assert.deepEqual(spfIncludes("v=spf1 include:a.example include:b.example -all"), [
    "a.example",
    "b.example",
  ]);
  assert.deepEqual(spfIncludes(null), []);
});

/* ── Delegated SPF ────────────────────────────────────────────────────────
   glossier.com, read live on 4 Aug 2026. One include, no sender names, and
   macros that cannot be expanded by reading the record at all. Going quiet on
   these reads as "we found nothing" when the truth is that the answer is
   deliberately not in DNS. */

test("a macro-based hosted SPF is named, and flagged as unexpandable", () => {
  const m = detectSpfManager("v=spf1 include:%{i}._ip.%{h}._ehlo.%{d}._spf.vali.email ~all");
  assert.equal(m?.name, "Valimail");
  assert.equal(m?.macro, true);
});

test("a plain hosted SPF is named without claiming macros", () => {
  const m = detectSpfManager("v=spf1 include:allbirds_com._es.easydmarc.com ~all");
  assert.equal(m?.name, "EasyDMARC");
  assert.equal(m?.macro, false);
});

test("an ordinary record has no manager", () => {
  assert.equal(detectSpfManager("v=spf1 include:_spf.klaviyo.com ~all"), null);
  assert.equal(detectSpfManager(null), null);
});

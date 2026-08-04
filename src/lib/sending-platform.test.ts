import assert from "node:assert/strict";
import test from "node:test";
import {
  detectPlatforms,
  detectSpfManager,
  platformClaim,
  primarySender,
  signingButUnauthorised,
  spfSendersAreReadable,
  spfAuthorised,
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

/* ── The mismatch, which is the whole reason to read both records ─────────
   `kureapp.health`, live on 4 Aug 2026: SPF authorises Zendesk and nothing
   else, while `kl` and `kl2` both carry live Klaviyo keys. The first version
   of this page called that a possible selector collision and printed "Nothing
   here is yours" — a false negative on a live sender, produced by
   over-correcting the klaviyo.com false positive above. Both directions are
   tested here so neither fix can eat the other. */

test("two of one vendor's selectors is a completed setup, not a collision", () => {
  const detected = detectPlatforms("v=spf1 include:mail.zendesk.com ~all", [
    "kl._domainkey (Klaviyo)",
    "kl2._domainkey (Klaviyo)",
  ]);
  const klaviyo = detected.find((p) => p.name === "Klaviyo");
  assert.equal(klaviyo?.basis, "dkim-confirmed");
  assert.equal(klaviyo?.dkimSelectors, 2);
});

test("a platform signing without SPF authorisation is surfaced", () => {
  const detected = detectPlatforms("v=spf1 include:mail.zendesk.com ~all", [
    "kl._domainkey (Klaviyo)",
    "kl2._domainkey (Klaviyo)",
  ]);
  const orphans = signingButUnauthorised(detected);
  assert.equal(orphans.length, 1);
  assert.equal(orphans[0].name, "Klaviyo");
  assert.match(platformClaim(orphans[0]), /does not list it/);
});

test("one selector alone is still not enough to call it a mismatch", () => {
  /* The guard against re-introducing the klaviyo.com false positive. */
  const detected = detectPlatforms("v=spf1 include:mail.zendesk.com ~all", [
    "k1._domainkey (Mailchimp)",
  ]);
  assert.deepEqual(signingButUnauthorised(detected), []);
});

test("the mismatch names who SPF authorises instead, even when it is not an ESP", () => {
  /* Answering this from the ESP list alone left the sentence empty on exactly
     the domains that need it — Zendesk is infrastructure, not an ESP. */
  const detected = detectPlatforms("v=spf1 include:mail.zendesk.com ~all", [
    "kl._domainkey (Klaviyo)",
    "kl2._domainkey (Klaviyo)",
  ]);
  assert.deepEqual(
    spfAuthorised(detected).map((p) => p.name),
    ["Zendesk"],
  );
  /* And the orphan must never be mistaken for the authorised sender. */
  assert.equal(primarySender(detected), null);
});

test("a properly configured domain reports no mismatch", () => {
  const detected = detectPlatforms("v=spf1 include:_spf.klaviyo.com ~all", [
    "kl._domainkey (Klaviyo)",
    "kl2._domainkey (Klaviyo)",
  ]);
  assert.deepEqual(signingButUnauthorised(detected), []);
  assert.equal(primarySender(detected)?.name, "Klaviyo");
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


/* ── The sender list is not always readable ───────────────────────────────
   Both of these produced a confident, specific, false accusation against a
   real brand before they were caught: gymshark.com was told its SPF "does not
   list SendGrid anywhere" about a Proofpoint macro record that lists nobody
   anywhere by design, and allbirds.com delegates its list to EasyDMARC. */

test("an SPF macro record is not readable", () => {
  assert.equal(
    spfSendersAreReadable("v=spf1 include:%{ir}.%{v}.%{d}.spf.has.pphosted.com ~all"),
    false,
  );
  assert.equal(
    spfSendersAreReadable("v=spf1 include:%{i}._ip.%{h}._ehlo.%{d}._spf.vali.email ~all"),
    false,
  );
});

test("an ordinary SPF record is readable", () => {
  assert.equal(spfSendersAreReadable("v=spf1 include:sendgrid.net -all"), true);
  assert.equal(spfSendersAreReadable(null), true);
});

test("Proofpoint's hosted SPF is recognised as a manager", () => {
  const m = detectSpfManager("v=spf1 include:%{ir}.%{v}.%{d}.spf.has.pphosted.com ~all");
  assert.equal(m?.name, "Proofpoint");
  assert.equal(m?.macro, true);
});

test("EasyDMARC holds the list even when the record has no macro", () => {
  const m = detectSpfManager(
    "v=spf1 include:allbirds_com._es.easydmarc.com include:spf.protection.outlook.com ~all",
  );
  assert.equal(m?.name, "EasyDMARC");
  assert.equal(m?.macro, false);
});

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  parseSubscriberAudience,
  subscriberWantsRule,
} from "@/lib/subscriber-prefs";
import { isMarketChange } from "@/lib/rule-signals";
import {
  describeDomainChanges,
  snapshotsEqual,
  type DomainSnapshot,
} from "@/lib/domain-snapshot";

test("parseSubscriberAudience ignores empty and invalid", () => {
  assert.equal(parseSubscriberAudience(null), null);
  assert.equal(parseSubscriberAudience(""), null);
  assert.equal(parseSubscriberAudience("{}"), null);
  assert.equal(parseSubscriberAudience("not-json"), null);
  assert.equal(parseSubscriberAudience({ eu: false, us: false }), null);
});

test("parseSubscriberAudience keeps active geo/ESP setup", () => {
  const a = parseSubscriberAudience({ eu: true, esp: "klaviyo", role: "lifecycle" });
  assert.ok(a);
  assert.equal(a!.eu, true);
  assert.equal(a!.esp, "klaviyo");
  assert.equal(a!.role, "lifecycle");
});

test("subscriber with no prefs gets every rule", () => {
  const rule = {
    ownership: "yours",
    jurisdictions: ["CA"],
    topic: "consent-tracking",
  };
  assert.equal(subscriberWantsRule(rule, null), true);
  assert.equal(subscriberWantsRule(rule, {}), true);
});

test("subscriber with Canada-only setup skips pure EU rules", () => {
  const caOnly = { ca: true, eu: false, us: false };
  assert.equal(
    subscriberWantsRule(
      { ownership: "yours", jurisdictions: ["EU"], topic: "consent-tracking" },
      caOnly,
    ),
    false,
  );
  assert.equal(
    subscriberWantsRule(
      { ownership: "yours", jurisdictions: ["CA"], topic: "consent-tracking" },
      caOnly,
    ),
    true,
  );
});

test("isMarketChange gates alertable notes", () => {
  assert.equal(isMarketChange("Status moved to in force."), true);
  assert.equal(isMarketChange("Correction: we were wrong about the fine."), true);
  assert.equal(isMarketChange("Re-checked against the source. No change."), false);
  assert.equal(isMarketChange("Added from primary sources."), false);
});

test("domain snapshot diff only when records move", () => {
  const base: DomainSnapshot = {
    spf: "v=spf1 include:_spf.google.com ~all",
    dmarc: "v=DMARC1; p=none;",
    dkim: ["google._domainkey (Google Workspace)"],
    bimi: null,
    mx: ["aspmx.l.google.com"],
  };
  assert.equal(snapshotsEqual(base, { ...base }), true);
  assert.equal(
    snapshotsEqual(base, { ...base, dmarc: "v=DMARC1; p=reject;" }),
    false,
  );
  const lines = describeDomainChanges(base, {
    ...base,
    dmarc: "v=DMARC1; p=reject;",
    spf: null,
  });
  assert.ok(lines.some((l) => l.includes("DMARC")));
  assert.ok(lines.some((l) => l.includes("SPF")));
});

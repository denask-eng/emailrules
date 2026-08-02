import assert from "node:assert/strict";
import { test } from "node:test";
import {
  matchesEspSelection,
  resolveEspApplicability,
  matchesAudience,
  EMPTY_AUDIENCE,
  type Audience,
} from "@/lib/audience";
import type { EspApplicability } from "@/lib/types";

test("resolveEspApplicability prefers explicit esp over provider", () => {
  assert.deepEqual(
    resolveEspApplicability({ esp: ["mailchimp"], provider: "Klaviyo" }),
    ["mailchimp"],
  );
});

test("legacy provider Klaviyo becomes klaviyo product scope", () => {
  assert.deepEqual(resolveEspApplicability({ provider: "Klaviyo" }), ["klaviyo"]);
});

test("mailbox Gmail is not an ESP product scope", () => {
  assert.equal(resolveEspApplicability({ provider: "Gmail" }), "all");
});

test("product page hidden for other ESP and other/custom", () => {
  const rule = { esp: ["klaviyo"] as EspApplicability };
  assert.equal(matchesEspSelection(rule, "klaviyo"), true);
  assert.equal(matchesEspSelection(rule, "mailchimp"), false);
  assert.equal(matchesEspSelection(rule, "other"), false);
  assert.equal(matchesEspSelection(rule, ""), true);
});

test("mainstream scope visible for every tool selection", () => {
  const rule = { esp: "mainstream" as EspApplicability };
  assert.equal(matchesEspSelection(rule, "klaviyo"), true);
  assert.equal(matchesEspSelection(rule, "other"), true);
  assert.equal(matchesEspSelection(rule, ""), true);
});

test("matchesAudience geo + esp together", () => {
  const base: Audience = {
    ...EMPTY_AUDIENCE,
    eu: true,
    esp: "mailchimp",
  };
  const euRule = {
    ownership: "yours",
    jurisdictions: ["EU"],
    esp: "all" as EspApplicability,
  };
  const klaviyoOnly = {
    ownership: "yours",
    jurisdictions: ["Global"],
    provider: "Klaviyo",
    esp: ["klaviyo"] as EspApplicability,
  };
  assert.equal(matchesAudience(euRule, base), true);
  assert.equal(matchesAudience(klaviyoOnly, base), false);
  assert.equal(
    matchesAudience(klaviyoOnly, { ...base, esp: "klaviyo" }),
    true,
  );
});

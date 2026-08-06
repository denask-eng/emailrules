import assert from "node:assert/strict";
import test from "node:test";
import {
  campaignApplicability,
  campaignOwnerLabel,
  findingDetailForContext,
  firstActionForFinding,
  GMAIL_SUB_BULK_CONTEXT,
  parseCampaignContext,
  prioritizedFindings,
  reportAccessTokenMatches,
  type CampaignFinding,
  type CampaignContext,
} from "./campaign-contract";
import type { EspApplicability } from "./types";

test("campaign context requires explicit ESP, geography and Gmail volume", () => {
  assert.equal(parseCampaignContext({ esp: "klaviyo", geographies: [], gmailBulk: true }), null);
  assert.equal(parseCampaignContext({ esp: "unknown", geographies: ["EU"], gmailBulk: true }), null);
  assert.equal(parseCampaignContext({ esp: "klaviyo", geographies: ["EU"] }), null);
  assert.deepEqual(
    parseCampaignContext({ esp: "klaviyo", geographies: ["EU", "EU", "US"], gmailBulk: false }),
    { esp: "klaviyo", geographies: ["EU", "US"], gmailBulk: false },
  );
});

test("a session id cannot authorize its completed report", () => {
  const record = {
    id: "11111111111111111111111111111111",
    reportToken: "22222222222222222222222222222222",
  };
  assert.equal(reportAccessTokenMatches(record.id, record), false);
  assert.equal(reportAccessTokenMatches(record.reportToken, record), true);
});

test("a pre-session report keeps its legacy id URL", () => {
  const id = "11111111111111111111";
  assert.equal(reportAccessTokenMatches(id, { id, reportToken: null }), true);
  assert.equal(reportAccessTokenMatches("22222222222222222222", { id, reportToken: null }), false);
});

test("campaign applicability evaluates ESP, geography and Gmail volume", () => {
  const klaviyoOnly = {
    slug: "klaviyo-setting",
    jurisdictions: ["Global"],
    esp: ["klaviyo"] as EspApplicability,
  };
  const gmailBulk = {
    slug: "gmail-bulk-sender-requirements",
    jurisdictions: ["Global"],
    provider: "Gmail",
  };
  const euRule = { slug: "eu-rule", jurisdictions: ["EU"] };
  const klaviyoEu: CampaignContext = { esp: "klaviyo", geographies: ["EU"], gmailBulk: true };
  const mailchimpUs: CampaignContext = { esp: "mailchimp", geographies: ["US"], gmailBulk: true };

  assert.equal(campaignApplicability(klaviyoOnly, klaviyoEu), "applies");
  assert.equal(campaignApplicability(klaviyoOnly, mailchimpUs), "not_applicable");
  assert.equal(campaignApplicability(euRule, klaviyoEu), "applies");
  assert.equal(campaignApplicability(euRule, mailchimpUs), "not_applicable");
  assert.equal(campaignApplicability(gmailBulk, klaviyoEu), "applies");
  assert.equal(
    campaignApplicability(gmailBulk, { ...klaviyoEu, gmailBulk: false }),
    "not_applicable",
  );
  assert.equal(campaignApplicability(gmailBulk), "not_supplied");
  assert.match(GMAIL_SUB_BULK_CONTEXT, /still requires SPF or DKIM/);
  const contextualDetail = findingDetailForContext(
    gmailBulk.slug,
    "No DKIM signature was found.",
    { ...klaviyoEu, gmailBulk: false },
  );
  assert.match(contextualDetail, /bulk-only layer does not apply/);
  assert.equal(
    findingDetailForContext(gmailBulk.slug, contextualDetail, { ...klaviyoEu, gmailBulk: false }),
    contextualDetail,
  );
});

test("failed findings never inherit a contradictory generic first action", () => {
  const detail = "List-Unsubscribe is present without List-Unsubscribe-Post.";
  const generic = "Nothing, if you are on a mainstream ESP.";
  /* No curated action means no action cell — never the detail restated, and
     never a pass-flavored routine on a failing card. */
  assert.equal(firstActionForFinding({ severity: "fail", detail }, generic), null);
  assert.equal(
    firstActionForFinding({ severity: "fail", detail, mondayMorning: "Add the missing header." }, generic),
    "Add the missing header.",
  );
  assert.equal(campaignOwnerLabel("esp"), "ESP administrator");
});

function finding(
  title: string,
  severity: CampaignFinding["severity"],
  rootCause: string,
  patch: Partial<CampaignFinding> = {},
): CampaignFinding {
  return {
    title,
    severity,
    detail: title,
    evidenceState: "observed",
    confidence: "high",
    applicability: "applies",
    rootCause,
    observed: title,
    why: title,
    owner: "yours",
    firstAction: "Fix it.",
    source: null,
    ruleVersion: null,
    detectorVersion: "message-v1",
    ...patch,
  };
}

test("prioritization caps at five root actions and never treats unknown as open", () => {
  const input = [
    finding("Observed failure", "fail", "auth"),
    finding("Duplicate root", "warn", "auth"),
    finding("Unknown", "fail", "unknown", { evidenceState: "could_not_determine" }),
    finding("Wrong geography", "fail", "geo", { applicability: "not_applicable" }),
    finding("Pass", "pass", "pass"),
    finding("Warn 1", "warn", "one"),
    finding("Warn 2", "warn", "two"),
    finding("Warn 3", "warn", "three"),
    finding("Warn 4", "warn", "four"),
    finding("Warn 5", "warn", "five"),
  ];
  const result = prioritizedFindings(input);
  assert.equal(result.length, 5);
  assert.equal(result[0].title, "Observed failure");
  assert.equal(result.filter((item) => item.rootCause === "auth").length, 1);
  assert.equal(result.some((item) => item.title === "Unknown"), false);
  assert.equal(result.some((item) => item.title === "Wrong geography"), false);
});

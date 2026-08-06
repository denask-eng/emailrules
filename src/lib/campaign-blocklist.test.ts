import assert from "node:assert/strict";
import { test } from "node:test";
import { campaignReputationFindings } from "./campaign-blocklist";
import type { Finding } from "./dns-check";

type Check = Parameters<typeof campaignReputationFindings>[1];

function stub(result: Partial<Awaited<ReturnType<NonNullable<Check>>>>): NonNullable<Check> {
  return (async () =>
    ({
      findings: [],
      lists: [],
      reliable: true,
      actionable: [],
      contextual: [],
      ...result,
    })) as NonNullable<Check>;
}

const LISTED: Finding = {
  severity: "fail",
  title: "example.com is listed on Spamhaus DBL",
  detail: "The domain appears in a spam blocklist.",
  evidence: "example.com on dbl.spamhaus.org → 127.0.1.4",
};

test("no From domain means no reputation lookup and no finding", async () => {
  let called = false;
  const check = stub({ findings: [LISTED] });
  const spy: NonNullable<Check> = async (...args) => {
    called = true;
    return check(...args);
  };
  const findings = await campaignReputationFindings(null, spy);
  assert.equal(called, false);
  assert.deepEqual(findings, []);
});

test("a listing is passed through unchanged", async () => {
  const findings = await campaignReputationFindings("example.com", stub({ findings: [LISTED] }));
  assert.equal(findings.length, 1);
  assert.equal(findings[0].title, LISTED.title);
  assert.equal(findings[0].severity, "fail");
});

test("a reputation lookup that throws yields no finding, never a fake pass", async () => {
  const throwing: NonNullable<Check> = async () => {
    throw new Error("resolver down");
  };
  const findings = await campaignReputationFindings("example.com", throwing);
  assert.deepEqual(findings, []);
});

import assert from "node:assert/strict";
import test from "node:test";
import { isGone, stalenessOf, daysSinceVerified } from "./freshness";

/* The watcher's whole job is to stop this shelf ageing in silence, so the tests
   are about the ways it could lie: treating an unchecked claim as checked, and
   treating a page that refused us as a page that is gone. */

test("a claim with no verification date is never fresh", () => {
  /* The inversion that would matter most. If a missing date read as fresh, an
     unverified rule would be indistinguishable from one checked this morning —
     which is the exact failure the site accuses other tools of. */
  assert.equal(stalenessOf(null), "unknown");
  assert.equal(stalenessOf(undefined), "unknown");
  assert.equal(stalenessOf(""), "unknown");
  assert.notEqual(stalenessOf(null), "fresh");
});

test("staleness bands are by age and the boundaries hold", () => {
  const now = new Date("2026-08-04T12:00:00Z");
  const ago = (days: number) =>
    new Date(now.getTime() - days * 864e5).toISOString().slice(0, 10);

  assert.equal(stalenessOf(ago(0), now), "fresh");
  assert.equal(stalenessOf(ago(90), now), "fresh");
  assert.equal(stalenessOf(ago(91), now), "ageing");
  assert.equal(stalenessOf(ago(180), now), "ageing");
  assert.equal(stalenessOf(ago(181), now), "stale");
  assert.equal(stalenessOf(ago(900), now), "stale");
});

test("a date in the future is unknown, not fresh", () => {
  /* A typo that puts a rule in 2027 must not buy it a permanent green tick. */
  const now = new Date("2026-08-04T12:00:00Z");
  assert.equal(stalenessOf("2027-01-01", now), "unknown");
  assert.equal(daysSinceVerified("2027-01-01", now), null);
});

test("days since verified is a real count, and null without a date", () => {
  const now = new Date("2026-08-04T12:00:00Z");
  assert.equal(daysSinceVerified("2026-08-04", now), 0);
  assert.equal(daysSinceVerified("2026-07-05", now), 30);
  assert.equal(daysSinceVerified(null, now), null);
});

/* ── gone vs unreachable ───────────────────────────────────────────────────
   Measured on the first live sweep, 4 Aug 2026: two M3AAWG best-practice PDFs
   returned 404 to our watcher AND to a browser user-agent, so they are genuinely
   gone from a rule that cites them. check.spamhaus.org, law.justia.com and the
   Maryland AG all returned 403 to both — those refuse automated readers and say
   nothing about whether the page still exists. Counting them together would
   repeat the exact error the blocklist census exists to call out. */

test("404 and 410 mean the citation is gone", () => {
  assert.equal(isGone("HTTP 404"), true);
  assert.equal(isGone("HTTP 410"), true);
});

test("a refusal or a timeout is never read as gone", () => {
  assert.equal(isGone("HTTP 403"), false);
  assert.equal(isGone("HTTP 429"), false);
  assert.equal(isGone("HTTP 500"), false);
  assert.equal(isGone("The operation was aborted due to timeout"), false);
  assert.equal(isGone(null), false);
});

test("a status that merely contains 404 is not a 404", () => {
  /* Guards the regex: HTTP 4040 does not exist, but a message that happens to
     carry the digits must not promote a live page to a dead one. */
  assert.equal(isGone("HTTP 4040"), false);
});

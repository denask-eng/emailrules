import assert from "node:assert/strict";
import { test } from "node:test";
import {
  GLOSSARY,
  GLOSSARY_BY_ID,
  STAGES,
  STARTER_PATH,
  splitAccents,
  segmentWithTerms,
  termsInStage,
} from "./how-email-works";

/**
 * Guards for the corpus, not for the rendering.
 *
 * Two of these exist because the mistake had already shipped. A warm-up ramp
 * told people to send to whoever "opened in the last 30 days" while four other
 * entries on the same site explain that an open has been half machine since
 * 2021 — the sort of contradiction a deliverability lead spots in ten seconds
 * and a reader never recovers from. And "inbox placement" was an alias on two
 * different terms, which made the inline underliner depend on scan order.
 */

test("term ids are unique", () => {
  const ids = GLOSSARY.map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("every seeAlso points at a term that exists", () => {
  for (const t of GLOSSARY) {
    for (const id of t.seeAlso ?? []) {
      assert.ok(GLOSSARY_BY_ID.has(id), `${t.id} → ${id} does not exist`);
    }
  }
});

test("the reading path only names terms that exist", () => {
  for (const id of STARTER_PATH) {
    assert.ok(GLOSSARY_BY_ID.has(id), `starter path → ${id} does not exist`);
  }
});

test("stages are numbered 1..n and none is empty", () => {
  STAGES.forEach((s, i) => {
    assert.equal(s.n, i + 1, `${s.id} is numbered ${s.n}`);
    assert.ok(termsInStage(s.id).length > 0, `${s.id} has no terms`);
  });
});

test("no alias belongs to two terms", () => {
  const owner = new Map<string, string>();
  for (const t of GLOSSARY) {
    for (const alias of t.aliases) {
      const key = alias.toLowerCase();
      const held = owner.get(key);
      assert.ok(
        held === undefined || held === t.id,
        `"${alias}" is claimed by both ${held} and ${t.id}; inline underlining would depend on scan order`,
      );
      owner.set(key, t.id);
    }
  }
});

test("aliases are lowercase, so matching is deterministic", () => {
  for (const t of GLOSSARY) {
    for (const alias of t.aliases) {
      assert.equal(alias, alias.toLowerCase(), `${t.id}: "${alias}"`);
    }
  }
});

test("every figure cites a source", () => {
  for (const t of GLOSSARY) {
    for (const f of t.figures ?? []) {
      assert.ok(f.src?.trim(), `${t.id}: "${f.v} ${f.k}" has no source`);
    }
  }
});

test("every specimen declares where its values come from", () => {
  for (const t of GLOSSARY) {
    if (!t.specimen) continue;
    assert.ok(
      ["spec", "example", "ours"].includes(t.specimen.basis),
      `${t.id}: basis is ${t.specimen.basis}`,
    );
  }
});

/**
 * The site's position is that an open has been partly machine since Apple
 * began prefetching images, so an open may never be the criterion for who to
 * send to. Describing opens is fine; targeting on them is not.
 */
test("opens are never used as a targeting criterion", () => {
  const targeting = /\b(opened|opens|open)\b[^.]{0,40}\b(in the last|last \d|days)\b/i;
  for (const t of GLOSSARY) {
    for (const line of t.specimen?.lines ?? []) {
      assert.ok(
        !targeting.test(line.text),
        `${t.id}: "${line.text}" segments on opens; use clicks or orders`,
      );
    }
    assert.ok(!targeting.test(t.goesWrong ?? ""), `${t.id}: goesWrong segments on opens`);
  }
});

test("accent markers are balanced in every specimen line", () => {
  for (const t of GLOSSARY) {
    for (const line of t.specimen?.lines ?? []) {
      const opens = (line.text.match(/\[\[/g) ?? []).length;
      const closes = (line.text.match(/\]\]/g) ?? []).length;
      assert.equal(opens, closes, `${t.id}: "${line.text}"`);
      assert.equal(
        splitAccents(line.text)
          .map((p) => p.value)
          .join(""),
        line.text.replace(/\[\[|\]\]/g, ""),
        `${t.id}: round-trip failed`,
      );
    }
  }
});

test("gauges only ever mark a value inside their own scale", () => {
  for (const t of GLOSSARY) {
    if (!t.gauge) continue;
    for (const m of t.gauge.marks) {
      assert.ok(m.at > 0 && m.at <= t.gauge.max, `${t.id}: mark ${m.at} outside 0..${t.gauge.max}`);
    }
    assert.ok(t.gauge.you.at > 0, `${t.id}: marker at ${t.gauge.you.at}`);
  }
});

test("segmentWithTerms round-trips the text it is given", () => {
  const sample =
    "Your DMARC policy and DKIM alignment decide whether Gmail believes the From domain.";
  assert.equal(
    segmentWithTerms(sample)
      .map((p) => p.value)
      .join(""),
    sample,
  );
});

test("a term is only marked once per passage", () => {
  const parts = segmentWithTerms("DMARC is DMARC, and DMARC stays DMARC.");
  assert.equal(parts.filter((p) => p.type === "term").length, 1);
});

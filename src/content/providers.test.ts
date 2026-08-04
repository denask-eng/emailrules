import assert from "node:assert/strict";
import test from "node:test";
import { PROVIDERS, WATCHED_PROVIDERS, getProvider, providerSources } from "./providers";

/* ── The house rule, enforced rather than trusted ─────────────────────────
   This corpus is the one most likely to be quoted back at a provider's
   support desk, and the one where a confident invention would do the most
   damage. `rules.ts` keeps its bar by review; this keeps it by test. */

test("every claim, threshold, bounce code and delisting path cites a source", () => {
  for (const p of PROVIDERS) {
    for (const c of p.saidPublicly) {
      assert.ok(c.source?.url, `${p.id}: claim without a source — "${c.claim}"`);
    }
    for (const t of p.thresholds) {
      assert.ok(t.source?.url, `${p.id}: threshold without a source — "${t.name}"`);
    }
    for (const b of p.bounceCodes) {
      assert.ok(b.source?.url, `${p.id}: bounce code without a source — "${b.code}"`);
    }
    for (const d of p.delisting) {
      assert.ok(d.source?.url, `${p.id}: delisting path without a source — "${d.path}"`);
    }
  }
});

test("a negative claim either cites a source or points at a dated rule", () => {
  /* An absence is the hardest thing to check, so it may never be asserted on
     our own authority alone. Either the reader can open the page and see the
     words are not there, or a dated rule page carries the argument. */
  for (const p of PROVIDERS) {
    for (const m of p.neverSaid) {
      assert.ok(
        m.source?.url || m.rule,
        `${p.id}: "never said" with nothing to check it against — "${m.myth}"`,
      );
    }
  }
});

test("every source is a real absolute URL", () => {
  for (const s of providerSources()) {
    assert.match(s.url, /^https:\/\/\S+$/, `not an absolute https URL: ${s.url}`);
  }
});

test("a source that carries a date carries a real one", () => {
  /* Omitting `published` is allowed and expected — Google and Yahoo print no
     date. Inventing one is the failure this guards. */
  for (const s of providerSources()) {
    if (s.published === undefined) continue;
    assert.match(s.published, /^\d{4}-\d{2}-\d{2}$/, `${s.url}: malformed date`);
    assert.ok(
      !Number.isNaN(Date.parse(s.published)),
      `${s.url}: unparseable date ${s.published}`,
    );
  }
});

test("every delisting path names who files it and why", () => {
  /* The whole reason this section is not just another links page. */
  for (const p of PROVIDERS) {
    for (const d of p.delisting) {
      assert.ok(d.whoFiles, `${p.id}: delisting path with no owner — "${d.path}"`);
      assert.ok(
        d.whoFilesWhy && d.whoFilesWhy.length > 20,
        `${p.id}: owner asserted without a reason — "${d.path}"`,
      );
    }
  }
});

test("ids are unique and url-safe", () => {
  const ids = PROVIDERS.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length, "duplicate provider id");
  for (const id of ids) assert.match(id, /^[a-z0-9-]+$/, `unsafe id: ${id}`);
});

test("every provider has been verified on a real date", () => {
  for (const p of PROVIDERS) {
    assert.match(p.lastVerified, /^\d{4}-\d{2}-\d{2}$/, `${p.id}: malformed lastVerified`);
  }
});

test("a provider we cannot read says so instead of guessing", () => {
  /* Apple's postmaster page serves no body text to an automated reader. The
     honest handling is a stated limit, not a quietly thinner page — and a
     page that publishes almost nothing without explaining why is the failure
     mode this guards against. */
  for (const p of PROVIDERS) {
    const thin = p.saidPublicly.length < 3 && p.thresholds.length === 0;
    if (thin) {
      assert.ok(
        p.unreadable,
        `${p.id}: publishes very little and does not say why. Either add sourced claims or set \`unreadable\`.`,
      );
    }
  }
});

test("the watched list explains every absence", () => {
  assert.ok(WATCHED_PROVIDERS.length > 0, "an empty watched list means we stopped looking");
  for (const w of WATCHED_PROVIDERS) {
    assert.ok(w.reason.length > 30, `${w.name}: absence without a real reason`);
  }
});

test("a verbatim quote is never empty and never our own paraphrase marker", () => {
  for (const p of PROVIDERS) {
    const quotes = [
      ...p.saidPublicly.map((c) => c.verbatim),
      ...p.neverSaid.map((m) => m.verbatim),
    ].filter(Boolean) as string[];
    for (const q of quotes) {
      assert.ok(q.trim().length > 10, `${p.id}: suspiciously short verbatim quote`);
      assert.doesNotMatch(q, /^["“]|["”]$/, `${p.id}: quote carries its own quote marks`);
    }
  }
});

test("getProvider resolves every id and rejects unknown ones", () => {
  for (const p of PROVIDERS) assert.equal(getProvider(p.id)?.name, p.name);
  assert.equal(getProvider("not-a-provider"), undefined);
});

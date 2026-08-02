import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePrintedDate, extractDatedItems, contentHash } from "./esp-extract";

/* ─────────────────────────────── dates ────────────────────────────────── */

test("reads the date formats these publishers actually print", () => {
  assert.equal(parsePrintedDate("Posted 2026-07-08"), "2026-07-08");
  assert.equal(parsePrintedDate("December 19, 2023"), "2023-12-19");
  assert.equal(parsePrintedDate("February 5, 2026"), "2026-02-05");
  assert.equal(parsePrintedDate("5 February 2026"), "2026-02-05");
  assert.equal(parsePrintedDate("June 25, 2026"), "2026-06-25");
});

test("a date with no year is never turned into one", () => {
  /* Omnisend prints day and month and no year anywhere. Guessing the year is
     the precise failure this shelf refuses, so nothing there can ever produce
     a dated candidate. */
  assert.equal(parsePrintedDate("February 5"), null);
  assert.equal(parsePrintedDate("5 Feb"), null);
  assert.equal(parsePrintedDate("Updated last Tuesday"), null);
});

test("does not mistake version numbers or ids for dates", () => {
  /* No word boundary between the v and the digits, so a version string is not
     read as a date. Worth pinning: a release labelled v2024-10-15 is a name,
     not the day anything shipped. */
  assert.equal(parsePrintedDate("v2024-10-15"), null);
  assert.equal(parsePrintedDate("released 2024-10-15"), "2024-10-15", "a real date still reads");
  assert.equal(parsePrintedDate("build 1999-01-01"), null, "pre-2000 is not a changelog date");
  assert.equal(parsePrintedDate("order #12345678"), null);
});

/* ────────────────────────────── extraction ────────────────────────────── */

test("pulls title, url and date off a changelog-shaped page", () => {
  const html = `
    <ul>
      <li>
        <time>2026-07-08</time>
        <a href="/whats-new/open-tracking-controls">Manage open tracking per recipient</a>
      </li>
      <li>
        <time>2026-05-28</time>
        <a href="https://example.com/absolute">Branded sending domains for transactional</a>
      </li>
    </ul>`;
  const items = extractDatedItems(html, "https://www.klaviyo.com/whats-new");

  assert.equal(items.length, 2);
  assert.equal(items[0].date, "2026-07-08");
  assert.equal(items[0].title, "Manage open tracking per recipient");
  assert.equal(items[0].url, "https://www.klaviyo.com/whats-new/open-tracking-controls");
  assert.equal(items[1].url, "https://example.com/absolute", "absolute hrefs survive intact");
});

test("an undated link is not a candidate", () => {
  const html = `<a href="/docs/thing">Some page with no date anywhere near it</a>`;
  assert.deepEqual(extractDatedItems(html, "https://example.com"), []);
});

test("chrome and nav links are not candidates", () => {
  const html = `<p>2026-07-08</p><a href="/login">Log in</a><a href="/docs">Docs</a>`;
  assert.deepEqual(extractDatedItems(html, "https://example.com"), []);
});

test("call-to-action link text is not a candidate", () => {
  /* The first real run queued 420 rows, and a large share of them were a date
     sitting next to the words "Learn more". A row whose title tells a reviewer
     nothing is why review queues stop being opened. */
  for (const cta of ["Learn more", "Read more", "Read the docs", "View all", "Get started"]) {
    const html = `<div>2026-07-08 <a href="/x">${cta}</a></div>`;
    assert.deepEqual(
      extractDatedItems(html, "https://example.com"),
      [],
      `"${cta}" should not reach the queue`,
    );
  }
});

test("a title that is only a date is kept", () => {
  /* Braze groups its changelog by release date, so the anchor text IS the date.
     Filtering those out would blind the watcher to Braze entirely. */
  const html = `<h2><a href="/docs/releases/home#july-23-2026">July 23, 2026</a></h2>`;
  const items = extractDatedItems(html, "https://www.braze.com/docs/releases/home");
  assert.equal(items.length, 1);
  assert.equal(items[0].date, "2026-07-23");
});

test("the same item listed twice yields one candidate", () => {
  const html = `
    <div>2026-07-08 <a href="/a">Manage open tracking per recipient</a></div>
    <div>2026-07-08 <a href="/a">Manage open tracking per recipient</a></div>`;
  assert.equal(extractDatedItems(html, "https://example.com").length, 1);
});

test("a page that renders nothing yields nothing rather than throwing", () => {
  /* Salesforce serves a JavaScript shell with no content. That must come back
     as zero items so the caller can report "we could not read it", never as a
     crash and never as a quiet week. */
  assert.deepEqual(extractDatedItems("<html><body><div id=root></div></body></html>", "https://x.com"), []);
  assert.deepEqual(extractDatedItems("", "https://x.com"), []);
});

test("a malformed href does not take the whole page down", () => {
  const html = `<div>2026-07-08 <a href="ht tp://broken">A dated item with a broken link</a></div>`;
  const items = extractDatedItems(html, "https://example.com");
  assert.equal(items.length, 1);
  assert.equal(items[0].date, "2026-07-08");
});

/* ─────────────────────────────── hashing ──────────────────────────────── */

test("content hash ignores markup and whitespace churn", () => {
  const a = `<div class="a">  <p>Klaviyo shipped   open tracking controls</p></div>`;
  const b = `<section id="x"><p>Klaviyo shipped open tracking controls</p></section>`;
  assert.equal(contentHash(a), contentHash(b), "a reskin is not a change");
});

test("content hash moves when the words move", () => {
  const a = `<p>Klaviyo shipped open tracking controls</p>`;
  const b = `<p>Klaviyo shipped open tracking controls and one more thing</p>`;
  assert.notEqual(contentHash(a), contentHash(b));
});

test("scripts and styles do not contribute to the hash", () => {
  const a = `<p>same words</p><script>var t=1</script>`;
  const b = `<p>same words</p><script>var t=999999</script><style>.x{color:red}</style>`;
  assert.equal(contentHash(a), contentHash(b), "an analytics blob is not a changelog entry");
});

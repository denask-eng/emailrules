/**
 * Measured mobile audit at a real phone viewport.
 *
 *   node scripts/mobile-audit.mjs                     # dev server on 3700
 *   node scripts/mobile-audit.mjs https://emailrules.today
 *
 * Exists because "looks fine on my machine" is how a site ends up with a nav
 * that amputates its own labels and a hero that ghosts on repaint. Everything
 * here is a number read out of the rendered page: what overflows, what is too
 * small to tap, what type is too small to read. No screenshots, no opinions.
 *
 * Drives headless Chrome over CDP using Node's built-in WebSocket, so it adds
 * no dependency to a project that does not otherwise need a browser.
 */

import { spawn } from "node:child_process";

const BASE = (process.argv[2] ?? "http://localhost:3700").replace(/\/$/, "");
const CHROME =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9223;

/* iPhone 12 Pro — the device the owner tests on. */
const VIEWPORT = { width: 390, height: 844, deviceScaleFactor: 3, mobile: true };

const PAGES = [
  "/",
  "/rules",
  "/changed",
  "/check",
  "/check/klaviyo.com",
  "/rules/gmail-bulk-sender-requirements",
  "/brief",
  "/esp",
];

/* WCAG 2.5.8 puts the floor at 24px; Apple and Google both say 44. Inline links
   inside a sentence are exempt — you cannot space words out to 44px without
   destroying the paragraph — so those are excluded rather than reported as
   noise nobody will action. */
const TAP_MIN = 44;
const TEXT_MIN = 12;

const MEASURE = `(() => {
  const out = { overflow: null, wide: [], taps: [], tiny: [], viewport: null };
  const de = document.documentElement;
  out.viewport = { scrollWidth: de.scrollWidth, clientWidth: de.clientWidth };
  if (de.scrollWidth > de.clientWidth + 1) out.overflow = de.scrollWidth - de.clientWidth;

  const vw = de.clientWidth;
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;

    if (r.width > vw + 1 && el.children.length === 0) {
      out.wide.push({ tag: el.tagName.toLowerCase(), w: Math.round(r.width), text: (el.textContent||'').trim().slice(0,40) });
    }

    const st = getComputedStyle(el);
    const fs = parseFloat(st.fontSize);
    if (el.children.length === 0 && (el.textContent||'').trim() && fs && fs < ${TEXT_MIN}) {
      out.tiny.push({ px: Math.round(fs*10)/10, text: (el.textContent||'').trim().slice(0,40) });
    }
  }

  /* Inline-in-prose is exempt: you cannot pad a word inside a paragraph to
     44px without wrecking the paragraph. Checking only the immediate parent
     missed the glossary triggers, whose parent is often a short <span>, so
     walk up until a block-level ancestor and compare text length there. */
  const inSentence = (el) => {
    const d = getComputedStyle(el).display;
    if (d !== 'inline' && d !== 'inline-block' && d !== 'inline-flex') return false;
    const own = (el.textContent||'').trim().length;
    let p = el.parentElement, hops = 0;
    while (p && hops < 4) {
      if ((p.textContent||'').trim().length > own + 20) return true;
      p = p.parentElement; hops++;
    }
    return false;
  };

  for (const el of document.querySelectorAll('a[href], button, [role="button"], summary, input, select')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    if (inSentence(el)) continue;  // inline in prose: cannot be spaced to 44px without wrecking the paragraph
    if (Math.min(r.width, r.height) < ${TAP_MIN}) {
      out.taps.push({
        tag: el.tagName.toLowerCase(),
        w: Math.round(r.width), h: Math.round(r.height),
        text: (el.textContent||'').trim().slice(0,36) || el.getAttribute('aria-label') || '(no text)',
      });
    }
  }
  return JSON.stringify(out);
})()`;

const chrome = spawn(CHROME, [
  "--headless=new",
  `--remote-debugging-port=${PORT}`,
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-gpu",
  "--hide-scrollbars",
  "about:blank",
]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function wsUrl() {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      return (await r.json()).webSocketDebuggerUrl;
    } catch {
      await sleep(250);
    }
  }
  throw new Error("Chrome did not expose a debugging port");
}

function client(url) {
  const ws = new WebSocket(url);
  let id = 0;
  const pending = new Map();
  const ready = new Promise((res) => (ws.onopen = res));
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) {
      pending.get(m.id)(m.result ?? {});
      pending.delete(m.id);
    }
  };
  return {
    ready,
    send: (method, params = {}, sessionId) =>
      new Promise((res) => {
        const msg = { id: ++id, method, params };
        if (sessionId) msg.sessionId = sessionId;
        pending.set(msg.id, res);
        ws.send(JSON.stringify(msg));
      }),
    close: () => ws.close(),
  };
}

async function main() {
  const c = client(await wsUrl());
  await c.ready;

  const { targetId } = await c.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await c.send("Target.attachToTarget", { targetId, flatten: true });
  await c.send("Page.enable", {}, sessionId);
  await c.send("Runtime.enable", {}, sessionId);
  await c.send("Emulation.setDeviceMetricsOverride", VIEWPORT, sessionId);

  console.log(`\nmobile audit — ${VIEWPORT.width}×${VIEWPORT.height} — ${BASE}\n`);
  let problems = 0;

  for (const path of PAGES) {
    await c.send("Page.navigate", { url: `${BASE}${path}` }, sessionId);
    await sleep(1600);
    const { result } = await c.send(
      "Runtime.evaluate",
      { expression: MEASURE, returnByValue: true, awaitPromise: false },
      sessionId,
    );
    let m;
    try {
      m = JSON.parse(result.value);
    } catch {
      console.log(`  ??  ${path} — could not measure`);
      continue;
    }

    const issues = [];
    if (m.overflow) issues.push(`h-scroll +${m.overflow}px`);
    if (m.wide.length) issues.push(`${m.wide.length} el wider than viewport`);
    if (m.taps.length) issues.push(`${m.taps.length} tap targets < ${TAP_MIN}px`);
    /* Not counted as a failure: `.label` is a deliberate 10.6px uppercase mono
       token used site-wide. Listed so a real regression is still visible. */
    const notes = m.tiny.length ? [`${m.tiny.length} text < ${TEXT_MIN}px (review, not a fail)`] : [];

    if (issues.length === 0) {
      console.log(`  ok  ${path}${notes.length ? "  · " + notes[0] : ""}`);
    } else {
      problems += issues.length;
      console.log(` FAIL ${path} — ${[...issues, ...notes].join(", ")}`);
      for (const w of m.wide.slice(0, 3)) console.log(`        wide  <${w.tag}> ${w.w}px  "${w.text}"`);
      for (const t of m.taps.slice(0, 6)) console.log(`        tap   <${t.tag}> ${t.w}×${t.h}  "${t.text}"`);
    }
  }

  console.log(problems === 0 ? "\nno mobile issues\n" : `\n${problems} issue groups\n`);
  c.close();
  chrome.kill();
  process.exit(problems === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  chrome.kill();
  process.exit(1);
});

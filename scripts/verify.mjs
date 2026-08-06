/**
 * Pre-ship smoke test.
 *
 *   node scripts/verify.mjs                     # against the dev server on 3700
 *   node scripts/verify.mjs https://emailrules.today
 *
 * This exists because two bugs reached production and neither was visible in a
 * browser: /rules server-rendered no crawlable rule links, and all 39 share
 * cards rendered the same blank fallback. Both returned 200. Both were invisible
 * to anyone with JavaScript and a warm cache — which is every human who looked
 * at the site, and no crawler.
 *
 * So the assertions here are deliberately about what a machine sees: bytes in
 * the response body, distinct images, JSON-LD types, and no content parked
 * behind an animation. Anything a human eye would catch belongs in a screenshot,
 * not here.
 */

const BASE = (process.argv[2] ?? "http://localhost:3700").replace(/\/$/, "");
const results = [];

function record(name, ok, detail) {
  results.push({ name, ok, detail });
  const mark = ok ? "  ok  " : " FAIL ";
  console.log(`${mark} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function get(path) {
  const res = await fetch(`${BASE}${path}`, { redirect: "follow" });
  return { status: res.status, headers: res.headers, body: await res.text() };
}

/** Distinct occurrences, because grep -c counts lines and this HTML is one line. */
function countUnique(html, re) {
  return new Set(html.match(re) ?? []).size;
}

async function main() {
  console.log(`\nverifying ${BASE}\n`);

  /* ── every sitemap URL resolves ────────────────────────────────────────── */
  const sitemap = await get("/sitemap.xml");
  const urls = [...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) =>
    m[1].replace(/^https?:\/\/[^/]+/, ""),
  );
  record("sitemap.xml parses", urls.length > 0, `${urls.length} URLs`);

  const broken = [];
  await Promise.all(
    urls.map(async (u) => {
      const r = await fetch(`${BASE}${u}`, { redirect: "follow" });
      if (r.status !== 200) broken.push(`${r.status} ${u}`);
    }),
  );
  record("every sitemap URL 200s", broken.length === 0, broken.slice(0, 5).join(", "));

  /* ── the browse page is crawlable without JS ───────────────────────────── */
  const rules = await get("/rules");
  const ruleLinks = countUnique(rules.body, /href="\/rules\/[a-z0-9-]+"/g);
  record(
    "/rules server-renders rule links",
    ruleLinks >= 30,
    `${ruleLinks} distinct (a hydration-only shell renders 0)`,
  );

  /* ── the homepage answers without JS ───────────────────────────────────── */
  const home = await get("/");
  const homeLinks = countUnique(home.body, /href="\/rules\/[a-z0-9-]+"/g);
  record("/ server-renders its representative rules", homeLinks >= 3, `${homeLinks} distinct`);

  /* ── nothing important is parked behind an entrance animation ──────────── */
  for (const [path, html] of [
    ["/", home.body],
    ["/rules", rules.body],
  ]) {
    const gated = countUnique(html, /class="[^"]*\breveal\b[^"]*"/g);
    record(`${path} has no opacity-0 reveal gate`, gated === 0, `${gated} found`);
  }

  /* ── rule pages keep the citation architecture ─────────────────────────── */
  const slug = (rules.body.match(/href="\/rules\/([a-z0-9-]+)"/) ?? [])[1];
  if (slug) {
    const rule = await get(`/rules/${slug}`);
    for (const type of ["FAQPage", "Article", "BreadcrumbList"]) {
      record(`rule page JSON-LD ${type}`, rule.body.includes(`"@type":"${type}"`), slug);
    }
  } else {
    record("found a rule slug to test", false, "no rule links on /rules");
  }

  /* ── share cards actually differ per rule ──────────────────────────────────
     The blank-fallback bug produced a valid 200 PNG of identical size for every
     rule, so size alone is not the test — distinctness is. */
  const slugs = [...new Set([...rules.body.matchAll(/href="\/rules\/([a-z0-9-]+)"/g)].map((m) => m[1]))].slice(0, 3);
  if (slugs.length >= 2) {
    const sizes = [];
    for (const s of slugs) {
      const r = await fetch(`${BASE}/rules/${s}/opengraph-image`);
      sizes.push(r.ok ? (await r.arrayBuffer()).byteLength : 0);
    }
    record("rule OG cards render", sizes.every((b) => b > 1000), sizes.join("B, ") + "B");
    record(
      "rule OG cards differ per rule",
      new Set(sizes).size > 1,
      new Set(sizes).size === 1 ? "identical bytes = blank fallback for all" : "distinct",
    );
  }

  /* ── a shared check result unfurls as itself, not as the homepage ──────── */
  const check = await get("/check/klaviyo.com");
  const ogUrl = (check.body.match(/<meta property="og:url" content="([^"]+)"/) ?? [])[1] ?? "";
  record("check result has its own og:url", ogUrl.includes("/check/"), ogUrl || "none");

  /* ── summary ───────────────────────────────────────────────────────────── */
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed\n`);
  if (failed.length) {
    console.log("failed:");
    for (const f of failed) console.log(`  · ${f.name}${f.detail ? ` — ${f.detail}` : ""}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import assert from "node:assert/strict";
import test from "node:test";
import { RULES } from "./rules";
import { PROVIDERS, providerSources } from "./providers";
import type { RuleSource } from "@/lib/types";

/* ── Why this file exists ─────────────────────────────────────────────────
   On 4 August 2026 a rule shipped whose only two citations both returned 404,
   one of them naming a document M3AAWG does not publish, and another page
   cited a state Attorney General's homepage instead of a statute. All three
   carried a `lastVerified` date, because "verified" meant a person believed
   they had read the page.

   /freshness was already publishing "2 citations that are gone (404)" at the
   time. The site knew and shipped anyway, which is what turns a number on a
   page into a test: a published metric is a confession, a failing test is a
   stop. Everything here is cheap and offline except the link sweep, which is
   opt-in so a machine with no egress does not fail spuriously. */

function everySource(): { where: string; source: RuleSource }[] {
  const out: { where: string; source: RuleSource }[] = [];
  for (const r of RULES) for (const s of r.sources) out.push({ where: r.slug, source: s });
  /* Already deduped across the whole provider corpus, so it is added once
     rather than per provider. */
  for (const s of providerSources()) out.push({ where: "providers", source: s });
  return out;
}

test("every rule cites at least one source", () => {
  for (const r of RULES) {
    assert.ok(r.sources.length > 0, `${r.slug}: a claim without a citation does not ship`);
  }
});

test("no citation is a bare homepage", () => {
  /* The Maryland failure. `https://www.marylandattorneygeneral.gov/` is not a
     citation, it is a building. A source has to land on the document. */
  for (const { where, source } of everySource()) {
    const url = new URL(source.url);
    const bare = url.pathname === "/" && !url.search;
    assert.ok(
      !bare,
      `${where}: "${source.name}" cites a bare origin (${source.url}). Link the document, not the publisher.`,
    );
  }
});

test("every citation is https and well formed", () => {
  for (const { where, source } of everySource()) {
    assert.match(source.url, /^https:\/\//, `${where}: ${source.url} is not https`);
    assert.doesNotThrow(() => new URL(source.url), `${where}: ${source.url} is not a URL`);
    assert.ok(source.name.trim().length > 8, `${where}: source name is too thin to identify`);
  }
});

test("a stated publication date is real and not in the future", () => {
  /* Omitting `published` is allowed and expected — Google's help centre prints
     none. Stating one that does not parse, or that has not happened yet, is
     how a cited reference quietly becomes fiction. */
  const today = new Date().toISOString().slice(0, 10);
  for (const { where, source } of everySource()) {
    if (source.published === undefined) continue;
    assert.match(
      source.published,
      /^\d{4}-\d{2}-\d{2}$/,
      `${where}: "${source.name}" has a malformed date ${source.published}`,
    );
    assert.ok(
      !Number.isNaN(Date.parse(source.published)),
      `${where}: "${source.name}" has an unparseable date`,
    );
    assert.ok(
      source.published <= today,
      `${where}: "${source.name}" is dated ${source.published}, which is in the future`,
    );
  }
});

test("lastVerified is never later than today, and never before the rule was added", () => {
  const today = new Date().toISOString().slice(0, 10);
  for (const r of RULES) {
    assert.ok(r.lastVerified <= today, `${r.slug}: verified in the future`);
    assert.ok(
      r.lastVerified >= r.added,
      `${r.slug}: verified ${r.lastVerified}, before it was added ${r.added}`,
    );
  }
});

/* ── The link sweep ───────────────────────────────────────────────────────
   Opt-in, because it needs the network and because a regulator's WAF going
   moody must not block a deploy. Run it before publishing:

       CHECK_LINKS=1 npm test

   403 is tolerated and named: Spamhaus, Justia and several government sites
   refuse automated clients while serving humans perfectly well. 404 is not
   tolerated, because that is the failure this file was written for. */

const SWEEP = process.env.CHECK_LINKS === "1";

test(
  "no cited URL returns 404",
  { skip: SWEEP ? false : "set CHECK_LINKS=1 to sweep every citation over the network" },
  async () => {
    const seen = new Map<string, string>();
    for (const { where, source } of everySource()) {
      if (!seen.has(source.url)) seen.set(source.url, where);
    }

    const dead: string[] = [];
    await Promise.all(
      [...seen].map(async ([url, where]) => {
        try {
          const response = await fetch(url, {
            redirect: "follow",
            headers: {
              /* Several publishers serve nothing to an obvious robot. We are
                 checking that a reader can reach the page, so ask as one. */
              "user-agent":
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
            },
            signal: AbortSignal.timeout(25_000),
          });
          if (response.status === 404 || response.status === 410) {
            dead.push(`${response.status}  ${where}  ${url}`);
          }
        } catch {
          /* A timeout or refused connection is not proof the page is gone —
             acma.gov.au refuses this machine entirely — so it is not a
             failure. The source watcher queues those for a person. */
        }
      }),
    );

    assert.deepEqual(dead, [], `citations that no longer exist:\n${dead.join("\n")}`);
  },
);

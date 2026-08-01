# emailrules.today

A dated, cited reference for the rules that govern marketing email.

**The thesis:** email-marketing *generation* is now commoditised and free inside the ESPs.
What is scarce is knowing **what is actually true right now** — and the rules moved five times
in the last 90 days. This site is the ledger, and it doubles as the rule engine for a paid
pre-send check.

**Why anyone believes us:** we sell no tracking pixels, no seed tests, no open-rate analytics
and no ESP. Validity and Litmus structurally cannot publish "your tracking pixel may be
unlawful in France" because they sell tracking. Independence is the product.

---

## Run it

```bash
npm install
npm run dev          # http://localhost:3700  (this project's permanent port)
npm run build        # static generation of every rule page
```

Port 3700 is registered in `~/.dev-ports.json`. Do not start it on a random port.

---

## Where the content lives

Everything is in **`src/content/rules.ts`**, a typed array. One `Rule` object = one URL =
one answerable question.

The house rule for that file: **if you cannot cite it with a date, it does not go in.**

| Field | Why it exists |
|---|---|
| `question` | The long-tail search query the page targets, used verbatim as the `<title>` and in FAQ schema |
| `effectiveDate` + `status` | Drive the changelog, which is the product |
| `sources[]` | Primary source only. Law-firm summaries help you find things; they are never the citation |
| `enforcement` | Where we refuse to overstate. If nobody has been fined, the page says so |
| `lastVerified` | Pages older than 90 days render a staleness warning rather than pretending |
| `changelog[]` | Per-page history, so a correction is visible rather than silently swallowed |

`src/lib/rules.ts` is the **only** data-access seam. When the admin UI lands, only the bodies
of those functions change to hit Postgres; nothing that imports them needs to know.

---

## SEO and citation architecture

This is a reference site, so distribution is search plus being quoted. Both are built in.

- **One URL per rule**, statically generated, `<title>` = the exact question people type.
- **JSON-LD** on every rule page: `FAQPage` (what gets quoted directly in an AI answer),
  `Article` (gives the claim a publisher and a `dateModified`), `BreadcrumbList`.
  Site-wide `WebSite` + `Organization` so a claim can be attributed to a named publisher.
- **`robots.ts` explicitly welcomes AI crawlers** — GPTBot, ClaudeBot, PerplexityBot,
  OAI-SearchBot and friends. Most sites are busy blocking them. Being the source an assistant
  quotes is the strategy, not a leak.
- **`llms.txt`** — a plain-text map of the corpus with a date on every line, plus a citation
  note asking for the rule URL and its last-verified date.
- **`sitemap.ts`** carries real per-rule `lastModified`, which is what brings a crawler back
  the day after a regulator moves.
- **`feed.xml`** — the changelog as RSS. Feeds get syndicated by newsletters, and every item
  points at a canonical rule URL.

### Backlink engines, in the order they are worth building

1. **The free check** produces a shareable, dated result people post.
2. **Correction credits** — anyone who catches an error is named in the page history.
3. **The RSS changelog** gets picked up by industry newsletters.
4. **Stable citable URLs** so agencies and lawyers link rather than re-explain.
5. **An embeddable "verified as of <date>" badge** for brands that pass the check.

---

## Design

Cool and institutional on purpose — closer to a statute database than a marketing console.
Hairline borders, no gradients, no hover lift, no side-stripe callouts, one accent kept
scarce. Status colours are the only exception.

Every number is `.tabular` (mono + tabular figures). This site is dates; they must align.

---

## Not done yet

- [ ] Admin UI so rules can be added without touching code (needs Postgres, see below)
- [ ] The check actually running rather than showing a sample report
- [ ] `opengraph-image` per rule (dated share cards)
- [ ] Subscribe endpoint (`/api/subscribe` is referenced but not implemented)

### Storage

Not yet provisioned. The intended path is Neon Postgres via the Vercel Marketplace
(`vercel integration add neon`), which needs an interactive `vercel login` first. Until then
the corpus is the typed array and `src/lib/rules.ts` is the seam that makes the swap cheap.

---

Not legal advice.

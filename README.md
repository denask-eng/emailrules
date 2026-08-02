# emailrules.today

Which marketing email rules your ESP already handles, and which ones are genuinely your job.

**The thesis:** email-marketing *generation* is commoditised and free inside the ESPs. What is
scarce is knowing **what is actually true right now** — and, just as importantly, **whether it is
even your problem.** Most rule changes are absorbed by the platform. Klaviyo shipped one-click
unsubscribe long before anyone read RFC 8058. A reference that tells a working marketer to
"implement" something their ESP did for them two years ago has proved it never opened the tool.

**Why anyone believes us:** we sell no tracking pixels, no seed tests, no open-rate analytics and
no ESP. Validity and Litmus structurally cannot publish "your tracking pixel may be unlawful in
France" because they sell tracking. Independence is the product.

---

## Run it

```bash
npm install
npm run dev -- -p 3700   # this project's permanent port
npm run build
```

Port 3700 is registered in `~/.dev-ports.json`. Do not start it on a random port. Note the
explicit `-p`: the bare `dev` script will drift to 3000/3001.

| Command | What it does |
|---|---|
| `npm run db:migrate` | Creates the schema and upserts every rule from `src/content/rules.ts` |
| `npm run admin:hash` | Prompts for an admin password, prints the two env values. Run it in a real terminal |

---

## Where the content lives

**Postgres is authoritative.** One `rules` table: `slug` plus a JSONB `data` column holding the
whole `Rule` object. At this scale, mirroring the TypeScript interface as twenty typed columns
would only buy a migration every time a field is added.

`src/content/rules.ts` stays in the repo as the git-tracked origin of the corpus and as the
fallback: with no `DATABASE_URL` the site still builds and serves the seeded array rather than
erroring.

**`src/lib/rules.ts` is the only data-access seam.** Every page reads through it, and not one page
changed when storage moved from a typed array to Postgres. Keep every read in that file.

The house rule for the corpus: **if you cannot cite it with a date, it does not go in.** A source
may legitimately have *no* date — Google's help centre publishes none — in which case `published`
is omitted and the page renders "Publisher states no date". Inventing a plausible date is how a
cited reference quietly becomes fiction.

| Field | Why it exists |
|---|---|
| `question` | The long-tail query the page targets, used verbatim as the `<title>` and in FAQ schema |
| `plain` / `answer` | The colleague version leads; the cited wording is what the FAQ schema quotes |
| `ownership` + `handled` | Whether it is the ESP's job, shared, yours, or nothing at all. The differentiator |
| `mondayMorning` | The one concrete first move, naming the real screen |
| `ignoreIf` | Who can stop reading. Kills the anxiety in a line |
| `effectiveDate` + `status` | Drive the changelog, which is the product |
| `sources[]` | Primary source only. Law-firm summaries help you find things; they are never the citation |
| `enforcement` | Where we refuse to overstate. If nobody has been fined, the page says so |
| `lastVerified` | Pages older than 90 days render a staleness warning rather than pretending |
| `changelog[]` | Per-page history, so a correction is visible rather than silently swallowed |

---

## /admin

Single operator, no user table. A scrypt password hash and a signed httpOnly cookie.

- `src/proxy.ts` — Next 16 renamed Middleware to Proxy. This does the **optimistic** redirect only.
- `src/lib/auth.ts` — `requireAdmin()` is the real gate. It runs in the `(dash)` layout **and at the
  top of every Server Action**, because a layout does not protect an action.
- The `(dash)` route group exists so the guard does not also wrap `/admin/login`, which would
  redirect the login page to itself forever.

Publishing writes to Postgres and calls `revalidatePath`, so **an edit never triggers a Vercel
build**. Rule pages use `dynamicParams = true` so a newly added rule gets a URL immediately.

`/admin` lists every rule sorted by staleness, because confirming a rule is still true is the
routine job. **Re-verified today** is one click and writes its own changelog entry. New rules are
created as `proposed` drafts with empty prose, so a half-written rule never reads as verified
fact. `/admin/subscribers` lists signups.

Set `ADMIN_PASSWORD_HASH` and `ADMIN_SESSION_SECRET` from `npm run admin:hash`.

---

## Alerts

`/admin` announces a change only when the operator presses **Send this alert**, never on save: a
typo fix must not blast the list. The `rule_alerts` primary key makes a second press a no-op.

The alert obeys every rule this site publishes, which is the whole point:

- **RFC 8058** one-click unsubscribe, with `List-Unsubscribe` **and** `List-Unsubscribe-Post`.
  One without the other does not count.
- **`/api/unsubscribe` is POST-only.** A GET there would be followed by link scanners and
  prefetchers, unsubscribing people who never asked. Humans get `/unsubscribe/<token>`, a page
  with a button. Both suppress immediately, well inside Yahoo's two days.
- A postal address on every message (CAN-SPAM), a subject line that describes what is inside and
  invents no urgency (Washington), and real text in the first 200 characters, never image-only,
  because Apple summarises from live text and ignores alt text.

Sending is from the subdomain `alerts.emailrules.today`, not the root, so the alert stream cannot
damage the root domain's reputation.

---

## The check

`/check/<domain>` runs live DNS lookups and reads them against the corpus: SPF presence, `+all`,
and the 10-lookup limit; DMARC policy and whether anyone is reading the reports; DKIM across the
selectors Klaviyo, Google, Microsoft, Mailchimp, SendGrid and Postmark actually use; plus BIMI
and MX.

Two things it deliberately gets right that most checkers do not:

- It probes an impossible selector first. Domains with a **wildcard** under `_domainkey` make every
  selector resolve, and reporting that as "DKIM present" is a false positive.
- It requires real base64 after `p=`. An empty `p=` is a **revoked** key under RFC 6376, not a
  working one.

Findings are severity-sorted and every one links to the dated rule it came from. Results get a
shareable URL, which is the point.

---

## SEO and citation architecture

- **One URL per rule**, `<title>` = the exact question people type.
- **JSON-LD** per rule: `FAQPage` (quoted directly in AI answers), `Article`, `BreadcrumbList`.
- **`robots.ts` welcomes AI crawlers** — GPTBot, ClaudeBot, PerplexityBot and friends. Being the
  source an assistant quotes is the strategy, not a leak. `/admin` and `/api` are disallowed.
- **`llms.txt`** — a plain-text map with a date on every line.
- **`opengraph-image`** per rule, leading with the date and whose job it is.
- **`sitemap.ts`** carries real per-rule `lastModified`.

`/feed.xml` still works but is deliberately unlinked from every public surface.

---

## Design

Cool and institutional on purpose: closer to a statute database than a marketing console. Hairline
borders, no gradients, one accent kept scarce. **Light only** — no dark variant, because this is
read by marketers in daylight, and a dark reference site reads as a developer tool.

Every number is `.tabular` (mono + tabular figures). This site is dates; they must align.

---

## Not done yet

- [ ] The paid monitoring tier. Nothing on the site sells anything today, and `/methodology` says so
- [ ] Klaviyo read-only connection, to check real sends rather than only DNS
- [ ] Resend marketplace terms, then `RESEND_API_KEY` and the DNS records for `alerts.emailrules.today`
- [ ] `ALERT_POSTAL_ADDRESS` must be set before the first send. CAN-SPAM requires it on every message

---

Not legal advice.

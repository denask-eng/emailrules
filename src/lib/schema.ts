/**
 * One table, one JSONB column.
 *
 * The `Rule` interface in src/lib/types.ts is already the contract every page
 * reads through, so mirroring it as twenty typed columns would buy nothing at
 * seventeen rows and cost a migration every time a field is added. Filtering
 * happens in JS, exactly as it did against the typed array.
 *
 * Deliberately free of imports, including `server-only`, so the migration
 * script can read it from plain Node as well as the app from RSC.
 */
export const SCHEMA = `
  create table if not exists rules (
    slug        text primary key,
    data        jsonb not null,
    updated_at  timestamptz not null default now()
  );
  create index if not exists rules_updated_at_idx on rules (updated_at desc);

  /* Immutable snapshots behind the mutable current rule pointer. Admin saves
     are human approval; old reports and corrections can retain the exact
     source and interpretation used at the time. */
  create table if not exists rule_versions (
    slug             text not null,
    version          int not null,
    data             jsonb not null,
    source_snapshot  jsonb not null,
    detector_version text not null default 'message-v1',
    approved_at      timestamptz not null default now(),
    approved_by      text not null default 'admin',
    primary key (slug, version)
  );
  create index if not exists rule_versions_approved_idx on rule_versions (slug, approved_at desc);

  create table if not exists subscribers (
    email       text primary key,
    created_at  timestamptz not null default now(),
    unsubscribed_at timestamptz
  );

  /* One-click unsubscribe needs a link that works with no login and no
     landing page, so each subscriber carries an unguessable token. */
  alter table subscribers add column if not exists token text;
  create unique index if not exists subscribers_token_idx on subscribers (token);

  /* Rules setup at subscribe time (geo / ESP / role). Null or empty =
     send every market-move alert. When set, notify only if the rule
     matches this audience — habit without inbox noise. */
  alter table subscribers add column if not exists audience jsonb;

  /* Optional sending domain to re-check. When SPF/DKIM/DMARC actually
     change in DNS, one email — same "only real moves" bar as rules. */
  alter table subscribers add column if not exists watch_domain text;
  create index if not exists subscribers_watch_domain_idx
    on subscribers (watch_domain)
    where watch_domain is not null and unsubscribed_at is null;

  /* One row per change actually announced. The unique constraint is the
     safeguard: pressing "notify" twice for the same changelog entry cannot
     send the same alert to the same people again. */
  create table if not exists rule_alerts (
    slug        text not null,
    change_date date not null,
    note        text not null,
    sent_at     timestamptz not null default now(),
    recipients  int  not null default 0,
    primary key (slug, change_date, note)
  );

  /* Last-known auth DNS for watched domains. Diff against a fresh capture
     is what triggers a domain-watch email. */
  create table if not exists domain_snapshots (
    domain      text primary key,
    snapshot    jsonb not null,
    checked_at  timestamptz not null default now()
  );

  /* Dedupe domain-watch sends the same way rule_alerts does. */
  create table if not exists domain_alerts (
    domain      text not null,
    change_key  text not null,
    sent_at     timestamptz not null default now(),
    recipients  int  not null default 0,
    primary key (domain, change_key)
  );

  /* Append-only history, one row per domain per day it was observed.
     domain_snapshots above holds only the latest, because that is all a diff
     needs. This is the other thing: a record of how a domain's authentication
     posture moved over time.

     It exists because history is the one asset that cannot be bought or
     back-filled. Every day this table is not being written is a day of it that
     no longer exists. Capture is therefore unconditional and starts now.
     Whether any of it is ever published is a separate decision, taken later,
     and nothing here assumes the answer is yes. */
  create table if not exists domain_history (
    domain      text not null,
    observed_on date not null,
    snapshot    jsonb not null,
    /* Set when this row differs from the previous one, so a timeline can show
       moves without re-diffing every row it renders. */
    changed     boolean not null default false,
    change_note text,
    primary key (domain, observed_on)
  );
  create index if not exists domain_history_changed_idx
    on domain_history (domain, observed_on desc)
    where changed;

  /* A message someone sent us to be checked.

     We keep the findings and a handful of derived facts. We do not keep the
     message: no body, no subject, no recipient, no raw headers. Findings are
     what the share URL renders, and storing the mail itself would make this a
     place worth breaking into for no product gain.

     expires_at exists so a share link is honest about being temporary rather
     than quietly permanent. */
  create table if not exists message_checks (
    id          text primary key,
    created_at  timestamptz not null default now(),
    expires_at  timestamptz not null,
    from_domain text,
    findings    jsonb not null,
    verdict     text not null
  );
  create index if not exists message_checks_expires_idx on message_checks (expires_at);

  /* A campaign check exists before an address is exposed. The receiving alias,
     private report token and any later share token are separate credentials.
     Raw campaign content never lands in this table. */
  create table if not exists check_sessions (
    id                 text primary key,
    report_token       text not null unique,
    parent_id          text,
    created_at         timestamptz not null default now(),
    receive_expires_at timestamptz not null,
    completed_at       timestamptz,
    status             text not null default 'waiting',
    context            jsonb not null,
    network_hash       text,
    failure_code       text
  );
  create index if not exists check_sessions_report_token_idx on check_sessions (report_token);
  create index if not exists check_sessions_expiry_idx on check_sessions (receive_expires_at);
  create index if not exists check_sessions_rate_idx on check_sessions (network_hash, created_at desc)
    where network_hash is not null;

  /* Redacted report access is revocable and never reuses the receiving alias
     or private result credential. */
  create table if not exists share_reports (
    token       text primary key,
    session_id  text not null,
    created_at  timestamptz not null default now(),
    expires_at  timestamptz not null,
    revoked_at  timestamptz
  );
  create index if not exists share_reports_session_idx on share_reports (session_id, created_at desc);
  create index if not exists share_reports_expiry_idx on share_reports (expires_at);

  /* One row per watched ESP changelog page.

     content_hash is what makes "nothing new" mean something. Without it the
     only way to say a platform was quiet is to have found no items, which is
     indistinguishable from an extractor that broke when the page was
     redesigned. last_ok_at and last_error keep a failed fetch from ever being
     read as silence — the same property the domain history turns on. */
  create table if not exists esp_watch_sources (
    url             text primary key,
    esp             text not null,
    label           text not null,
    content_hash    text,
    item_count      int,
    last_checked_at timestamptz,
    last_ok_at      timestamptz,
    last_error      text
  );

  /* Something dated appeared on a watched page that no published entry cites.

     This table is a queue for a human, never a source the site reads from. The
     watcher records the item's own title, date and URL exactly as printed and
     stops there. It does not summarise, classify or decide what a change means,
     because that is the step where a corpus whose whole value is "every line is
     sourced" would start inventing. A person reads the page and writes the row. */
  create table if not exists esp_candidates (
    id            text primary key,
    esp           text not null,
    source_url    text not null,
    item_url      text,
    title         text not null,
    /* As printed on the page. Null when the publisher prints none — the same
       refusal to guess that governs the rules corpus. */
    published_on  date,
    first_seen_at timestamptz not null default now(),
    /* new | dismissed | published */
    status        text not null default 'new',
    note          text
  );
  create index if not exists esp_candidates_status_idx
    on esp_candidates (status, first_seen_at desc);

  /* A DMARC reporting address, with no account behind it.

     Every other tool in this category makes you sign up before it will accept
     your reports. The one-time message check on this site already proved a
     token in a URL is enough: the address is the key, the page is the key, and
     there is nothing to log into or leak.

     domain is what the reader typed, kept only so the setup page can print the
     record back and the results page can say whose reports these are. A report
     whose policy_published/domain disagrees with it is still stored — the
     receiver is the authority on what it saw, not us — and the results page
     shows the disagreement rather than hiding the rows. */
  create table if not exists dmarc_endpoints (
    token        text primary key,
    domain       text not null,
    created_at   timestamptz not null default now(),
    last_seen_at timestamptz,
    report_count int not null default 0
  );

  /* One row per aggregate report.

     id is org_name|report_id, which is the pair receivers guarantee unique, so
     a redelivered webhook is an upsert rather than a double count — the failure
     mode that makes a DMARC dashboard quietly overstate every volume on it.

     records holds the parsed rows as JSONB. Summarising happens in JS through
     the same pure function the tests cover, rather than in SQL where it would
     be a second implementation of the classification nobody could test. */
  create table if not exists dmarc_reports (
    id          text primary key,
    token       text not null,
    domain      text not null,
    org_name    text not null,
    begins_at   timestamptz not null,
    ends_at     timestamptz not null,
    policy      jsonb not null,
    records     jsonb not null,
    received_at timestamptz not null default now()
  );
  create index if not exists dmarc_reports_token_idx
    on dmarc_reports (token, ends_at desc);

  /* One row per primary source cited by a rule.

     Every rule on this shelf carries a "last verified" date that a person set
     by hand. All 39 were stamped on the two days the site was built, and until
     this table existed nothing moved them — a corpus whose entire claim is
     "dated and verified" was ageing silently, which is the one failure that
     kills a reference in five years.

     This watches the 66 URLs the corpus cites and records when one changes. It
     does NOT decide the rule is wrong: a regulator can reformat a page without
     changing a word of law, and a page can keep its wording while the law under
     it moves. Detection is mechanical, judgement is human, and rule_source_changes
     is the seam — the same division esp_watch_sources already draws.

     slugs is an array because one source backs several rules: RFC 5782 is cited
     by every blocklist rule, and a change to it should surface once per rule
     that leans on it rather than once per URL.

     content_length rides alongside the hash because these are regulator pages
     and vendor help centres wrapped in navigation, cookie banners and build
     stamps. A hash change with a two-byte length delta is almost certainly
     furniture; a large delta is worth opening. The reviewer sees both rather
     than us guessing with a scraper that would break silently. */
  create table if not exists rule_source_watch (
    url             text primary key,
    slugs           text[] not null default '{}',
    content_hash    text,
    content_length  int,
    last_checked_at timestamptz,
    last_ok_at      timestamptz,
    last_error      text
  );
  create index if not exists rule_source_watch_checked_idx
    on rule_source_watch (last_checked_at nulls first);
  alter table rule_source_watch add column if not exists review_interval_days int not null default 30;
  alter table rule_source_watch add column if not exists next_review_at timestamptz;

  /* A cited page moved. Queued for a person, never published by a machine. */
  create table if not exists rule_source_changes (
    id            text primary key,
    url           text not null,
    slugs         text[] not null default '{}',
    old_hash      text,
    new_hash      text not null,
    length_delta  int,
    first_seen_at timestamptz not null default now(),
    /* new | dismissed | reverified */
    status        text not null default 'new',
    note          text
  );
  create index if not exists rule_source_changes_status_idx
    on rule_source_changes (status, first_seen_at desc);

  /* ═══════════════════════════════════════════════════════════════════════
     The instrument tables.

     Everything above records what this site knows. Everything below records
     what it has *measured*, on a date, and keeps measuring. That distinction
     is the whole point: a reference can be copied in an afternoon, and four
     hundred days of dated measurements cannot be backfilled by anybody.

     All three are append-only by day. Nothing is ever updated in place,
     because the value is the series and a series you can edit is not
     evidence.
     ═══════════════════════════════════════════════════════════════════════ */

  /* ── The census: is each blocklist actually alive, today? ──────────────
     census() already probes every zone against its RFC 5782 controls. This
     is that reading, kept. One row per zone per day.

     status is the measured answer: answered | refused | wildcard | silent.
     queried says whether we would use it on a real check, which is a
     judgement — keeping both means the day a refused zone starts answering
     again is visible rather than something a reader has to catch for us. */
  create table if not exists census_snapshots (
    day        date not null,
    zone       text not null,
    label      text not null,
    status     text not null,
    queried    boolean not null,
    kind       text,
    note       text,
    checked_at timestamptz not null default now(),
    primary key (day, zone)
  );
  create index if not exists census_snapshots_day_idx
    on census_snapshots (day desc);
  create index if not exists census_snapshots_zone_idx
    on census_snapshots (zone, day desc);

  /* ── The index roster: public senders we measure every day ─────────────
     Deliberately a table and not a constant. The roster is itself a published
     claim — who we watch, and since when — and it has to be auditable and
     append-only rather than something that quietly changes shape between
     deploys. retired_at rather than deletion, so a domain leaving the index
     cannot silently rewrite the history it contributed to. */
  create table if not exists index_domains (
    domain     text primary key,
    sector     text not null,
    added_at   timestamptz not null default now(),
    retired_at timestamptz,
    note       text
  );
  create index if not exists index_domains_sector_idx
    on index_domains (sector) where retired_at is null;

  /* ── The index: one dated auth posture per domain per day ──────────────
     The aggregate everybody quotes once a year from a PDF, measured daily and
     kept. Booleans and short enums only: this table gets scanned across
     thousands of rows to produce a percentage, and it should never need a
     JSONB parse to answer "how many are at reject".

     spf_readable is here because of a real false accusation this site
     shipped: a macro or hosted-manager record cannot be expanded from DNS, so
     any statistic about "domains authorising their signer" has to exclude
     them rather than count them as failures. */
  create table if not exists index_snapshots (
    day           date not null,
    domain        text not null,
    has_spf       boolean not null,
    spf_all       text,
    spf_lookups   int,
    spf_readable  boolean not null,
    has_dmarc     boolean not null,
    dmarc_policy  text,
    dmarc_has_rua boolean not null,
    dkim_keys     int not null default 0,
    has_bimi      boolean not null,
    mx_provider   text,
    /* Platforms signing that the readable part of SPF does not name. Null when
       SPF is unreadable, because there the question has no answer. */
    unauthorised  int,
    checked_at    timestamptz not null default now(),
    primary key (day, domain)
  );
  create index if not exists index_snapshots_day_idx
    on index_snapshots (day desc);
  create index if not exists index_snapshots_domain_idx
    on index_snapshots (domain, day desc);

  /* ── The ESP truth table: what a platform actually does, measured ──────
     Not what its documentation says. One row per platform per measurement,
     produced by sending a real campaign through it and reading the headers
     that arrived.

     This table stays empty until a real send has been made. It is not seeded
     from vendor documentation, because the entire reason for its existence is
     that vendor documentation lags and sometimes lies — a seeded row would be
     the exact thing it is built to replace, wearing its clothes. */
  create table if not exists esp_measurements (
    id             text primary key,
    esp            text not null,
    measured_on    date not null,
    /* The observed header facts, verbatim from the message that arrived. */
    list_unsub     boolean,
    list_unsub_post boolean,
    unsub_https    boolean,
    dkim_d         text,
    dkim_aligned   boolean,
    return_path    text,
    tracking_pixel boolean,
    postal_address boolean,
    /* How this was obtained, so a reader can repeat it. */
    method         text not null,
    note           text,
    recorded_at    timestamptz not null default now()
  );
  create index if not exists esp_measurements_esp_idx
    on esp_measurements (esp, measured_on desc);

  /* ── Corrections, received ─────────────────────────────────────────────
     Forty-one rule pages, the footer, the changelog and the agent docs all
     end on "wrong or stale? tell us" — and every one of them pointed at a
     mailbox that does not exist, because this domain publishes no MX. A
     reference whose entire claim is that it publishes its own errors could
     not be told about one.

     That is now an HTTP path that lands in a table we own, rather than a
     mailto that depends on infrastructure we have not set up. Email can come
     back later as a second door; the front one should not have been a
     bounce. */
  create table if not exists corrections (
    id          text primary key,
    /* The rule this is about, when the reader came from one. */
    slug        text,
    /* Where they were standing. Beats asking them to describe it. */
    path        text,
    body        text not null,
    /* Optional: a correction is worth having even from someone who does not
       want to be written back to. */
    reply_to    text,
    /* new | reading | published | declined */
    status      text not null default 'new',
    /* What we did, published on /corrections when the outcome is public. */
    resolution  text,
    created_at  timestamptz not null default now(),
    resolved_at timestamptz
  );
  create index if not exists corrections_status_idx
    on corrections (status, created_at desc);
  create index if not exists corrections_slug_idx
    on corrections (slug, created_at desc);
`;

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
`;

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
`;

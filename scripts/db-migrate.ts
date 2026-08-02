/**
 * Creates the schema and seeds it from the typed corpus.
 *
 *   npx dotenv -e .env.local -- npx tsx scripts/db-migrate.ts
 *
 * Idempotent: re-running upserts every rule, so this doubles as the way to
 * push a local edit of src/content/rules.ts into the database. The typed
 * array stays in the repo as the git-tracked origin and the backup.
 */
import { neon } from "@neondatabase/serverless";
import { RULES } from "../src/content/rules";
import { SCHEMA } from "../src/lib/schema";

/* Wrapped in main() rather than using top-level await: the package is CJS,
   so tsx compiles this file with esbuild's cjs output, which rejects it. */
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set. Run: vercel env pull .env.local --yes");
    process.exit(1);
  }

  const sql = neon(url);

  // neon-http cannot run multiple statements in one call, so split the schema.
  for (const statement of SCHEMA.split(";").map((s) => s.trim()).filter(Boolean)) {
    await sql.query(`${statement};`);
  }
  console.log("schema ready");

  let n = 0;
  for (const rule of RULES) {
    await sql.query(
      `insert into rules (slug, data, updated_at)
       values ($1, $2::jsonb, now())
       on conflict (slug) do update set data = excluded.data, updated_at = now()`,
      [rule.slug, JSON.stringify(rule)],
    );
    n += 1;
  }

  const rows = (await sql.query("select count(*)::int as count from rules")) as {
    count: number;
  }[];

  console.log(`seeded ${n} rules, table now holds ${rows[0].count}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

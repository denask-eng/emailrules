import "server-only";

import { neon } from "@neondatabase/serverless";

/**
 * Neon connection, created lazily.
 *
 * `neon()` throws when DATABASE_URL is unset, and Next evaluates top-level
 * module code during `next build`. Calling it at module scope would break the
 * build on any machine or preview without the env var, so it is deferred.
 *
 * Deliberately not a Proxy wrapper: those break libraries that introspect the
 * client, and they hide errors behind a layer that is hard to read later.
 */
type Sql = ReturnType<typeof neon>;

let client: Sql | null = null;

export function sql(): Sql {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set. Run `vercel env pull`.");
    client = neon(url);
  }
  return client;
}

export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export { SCHEMA } from "@/lib/schema";

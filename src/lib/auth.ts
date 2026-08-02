import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

/**
 * Auth for exactly one person.
 *
 * There is no user table and there never will be: this site has a single
 * operator. A password checked against a scrypt hash in an env var, then a
 * signed cookie, is the whole system. Adding Clerk or a users table here
 * would be more surface to maintain alone, for no benefit.
 *
 * Next 16 renamed Middleware to Proxy, and its docs are explicit that proxy
 * must NOT be the authorisation layer. So `src/proxy.ts` only does the
 * optimistic redirect, and `requireAdmin()` below is what actually enforces:
 * it runs in the admin layout AND at the top of every Server Action.
 */

const COOKIE = "er_admin";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 14;
const scryptAsync = promisify(scrypt);

function secret(): string {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error("ADMIN_SESSION_SECRET is missing or shorter than 32 characters.");
  }
  return s;
}

/** `salt:hash`, both hex. Generate with `npm run admin:hash`. */
export async function hashPassword(password: string, saltHex?: string): Promise<string> {
  const salt = saltHex ?? randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${buf.toString("hex")}`;
}

async function passwordMatches(password: string): Promise<boolean> {
  const stored = process.env.ADMIN_PASSWORD_HASH;
  if (!stored || !stored.includes(":")) return false;
  const [salt, want] = stored.split(":");
  const got = (await scryptAsync(password, salt, 64)) as Buffer;
  const wantBuf = Buffer.from(want, "hex");
  // Length check first: timingSafeEqual throws on a mismatch rather than returning false.
  if (wantBuf.length !== got.length) return false;
  return timingSafeEqual(got, wantBuf);
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

function verify(token: string | undefined): boolean {
  if (!token || !token.includes(".")) return false;
  try {
    const [expStr, sig] = token.split(".");
    const expected = sign(expStr);
    if (sig.length !== expected.length) return false;
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
    const exp = Number(expStr);
    return Number.isFinite(exp) && exp > Date.now();
  } catch {
    /* Missing secret, malformed token, anything at all: fail closed. A
       misconfigured environment must lock the admin out, never open it. */
    return false;
  }
}

/** True when the caller holds a valid, unexpired, correctly-signed session. */
export async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  return verify(jar.get(COOKIE)?.value);
}

/**
 * The real gate. Call at the top of the admin layout and of every Server
 * Action that reads or writes admin data. Never rely on the proxy for this.
 */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin/login");
}

export async function signIn(password: string): Promise<boolean> {
  if (!(await passwordMatches(password))) return false;
  const exp = String(Date.now() + MAX_AGE_SECONDS * 1000);
  const jar = await cookies();
  jar.set(COOKIE, `${exp}.${sign(exp)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
  return true;
}

export async function signOut(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

/** Exported so the proxy can check for mere presence without importing crypto. */
export const SESSION_COOKIE = COOKIE;

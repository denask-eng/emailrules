#!/usr/bin/env node
/**
 * Generates the two env values /admin needs, so a password never has to be
 * pasted into a file, a prompt, or a chat window in plain text.
 *
 *   npm run admin:hash                 # interactive, input hidden
 *   echo 'the password' | npm run admin:hash   # piped, no TTY needed
 *
 * The password is read, hashed, and discarded. It is never echoed or stored.
 */
import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";

const scryptAsync = promisify(scrypt);

async function readPassword() {
  /* No TTY (piped input, CI, or a non-interactive shell): take stdin as-is.
     The previous version assumed a terminal and hung forever without one. */
  if (!process.stdin.isTTY) {
    const chunks = [];
    for await (const c of process.stdin) chunks.push(c);
    return Buffer.concat(chunks).toString("utf8").trim();
  }

  /* A TTY: echo the prompt but swallow the keystrokes. */
  let muted = false;
  const out = new Writable({
    write(chunk, enc, cb) {
      if (!muted) process.stdout.write(chunk, enc);
      cb();
    },
  });
  const rl = createInterface({ input: process.stdin, output: out, terminal: true });
  const pending = rl.question("Admin password: ");
  muted = true;
  const answer = await pending;
  muted = false;
  rl.close();
  process.stdout.write("\n");
  return answer.trim();
}

const password = await readPassword();

if (!password || password.length < 12) {
  console.error("\nUse at least 12 characters. Nothing was written.\n");
  process.exit(1);
}

const salt = randomBytes(16).toString("hex");
const hash = (await scryptAsync(password, salt, 64)).toString("hex");

console.log("\nAdd these two lines to .env.local:\n");
console.log(`ADMIN_PASSWORD_HASH=${salt}:${hash}`);
console.log(`ADMIN_SESSION_SECRET=${randomBytes(32).toString("hex")}`);
console.log("\nThe password itself was never written anywhere.\n");

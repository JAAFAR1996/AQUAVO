/**
 * Applies one Knowledge Center migration file to Neon as a SINGLE transaction.
 *
 *   node docs/knowledge-center/wave-9/apply-migration.mjs <file.sql> --commit
 *
 * Without --commit it connects, runs nothing, and reports what it would run.
 *
 * Why not script/run-migration.ts: that runner splits the file on ";", which
 * destroys `DO $$ ... END $$;` blocks and every semicolon inside the quoted
 * Arabic HTML. These migrations must arrive as one statement stream so their
 * own BEGIN/COMMIT and their precondition RAISE EXCEPTIONs behave correctly.
 *
 * Drift is never forced. The migration's own preconditions abort the
 * transaction; this runner just reports the failure verbatim and exits non-zero.
 */
import fs from "node:fs";
import { Client } from "@neondatabase/serverless";
import dotenv from "dotenv";

// Credentials live in the primary worktree's .env, which is gitignored and so
// absent from this worktree. Load it without ever echoing a value.
if (!process.env.DATABASE_URL) {
  for (const p of [".env", "C:/Users/jaafa/Desktop/upload/FishWebClean/.env"]) {
    if (fs.existsSync(p)) {
      dotenv.config({ path: p });
      if (process.env.DATABASE_URL) break;
    }
  }
}

const file = process.argv[2];
const commit = process.argv.includes("--commit");
if (!file) {
  console.error("usage: node apply-migration.mjs <file.sql> [--commit]");
  process.exit(2);
}

const sql = fs.readFileSync(file, "utf8");
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set in this environment");
  process.exit(2);
}

// Never print the URL. Host only, for a sanity check that we are on Neon.
let host = "unknown";
try { host = new URL(url).host.replace(/^[^@]*@/, ""); } catch {}

const statements = (sql.match(/^\s*(BEGIN|COMMIT|INSERT|UPDATE|DELETE|CREATE|DO)\b/gim) ?? []).length;
console.log(`file        : ${file}`);
console.log(`bytes       : ${sql.length}`);
console.log(`top-level   : ~${statements} statements`);
console.log(`target host : ${host}`);
console.log(`mode        : ${commit ? "COMMIT" : "DRY RUN (nothing will be sent)"}`);

if (!commit) {
  console.log("\nDry run only. Re-run with --commit to apply.");
  process.exit(0);
}

const client = new Client(url);
await client.connect();
try {
  // One call, whole file. The file supplies its own BEGIN/COMMIT.
  await client.query(sql);
  console.log("\nAPPLIED — the migration committed and every post-flight assertion passed.");
} catch (err) {
  console.error("\nFAILED — nothing was committed. The transaction rolled back.");
  console.error(`message : ${err.message}`);
  if (err.detail) console.error(`detail  : ${err.detail}`);
  if (err.where) console.error(`where   : ${err.where}`);
  process.exitCode = 1;
} finally {
  await client.end();
}

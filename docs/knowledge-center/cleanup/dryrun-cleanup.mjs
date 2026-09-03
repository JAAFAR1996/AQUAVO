/**
 * TRUE dry run for the cleanup migration.
 *
 *   node docs/knowledge-center/cleanup/dryrun-cleanup.mjs
 *
 * Sends the migration to Neon with its final COMMIT swapped for ROLLBACK, so
 * every precondition, every UPDATE and every post-flight assertion is really
 * executed by the server and then discarded. Nothing persists.
 *
 * This is stronger than a parse check: a migration whose assertions are wrong
 * fails HERE rather than in production. It is also strictly safe — the
 * transaction cannot commit, because the file sent contains no COMMIT.
 *
 * Exits non-zero if the server rejects any statement or raises any assertion.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@neondatabase/serverless";
import dotenv from "dotenv";

const DIR = path.dirname(fileURLToPath(import.meta.url));

// Credentials live in the primary worktree's gitignored .env. Loaded without
// ever echoing a value.
if (!process.env.DATABASE_URL) {
  for (const p of [".env", "C:/Users/jaafa/Desktop/upload/FishWebClean/.env"]) {
    if (fs.existsSync(p)) {
      dotenv.config({ path: p });
      if (process.env.DATABASE_URL) break;
    }
  }
}
const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL is not set"); process.exit(2); }

const file = path.join(DIR, "migration-cleanup.sql");
const sql = fs.readFileSync(file, "utf8");

if (!/\bCOMMIT;\s*$/.test(sql.trim() + "")) {
  console.error("refusing: migration does not end in COMMIT; shape is unexpected");
  process.exit(2);
}
// Swap ONLY the final COMMIT. If more than one exists, abort rather than guess.
const commits = (sql.match(/^COMMIT;$/gm) ?? []).length;
if (commits !== 1) { console.error(`refusing: expected exactly 1 COMMIT, found ${commits}`); process.exit(2); }
const dry = sql.replace(/^COMMIT;$/m, "ROLLBACK;");
if (/^COMMIT;$/m.test(dry)) { console.error("refusing: a COMMIT survived the swap"); process.exit(2); }

let host = "unknown";
try { host = new URL(url).host.replace(/^[^@]*@/, ""); } catch {}

console.log(`file        : ${path.basename(file)}`);
console.log(`bytes       : ${sql.length}`);
console.log(`target host : ${host}`);
console.log(`mode        : DRY RUN — COMMIT replaced with ROLLBACK, nothing persists`);
console.log(`updates     : ${(sql.match(/^UPDATE /gm) ?? []).length}`);
console.log(`assertions  : ${(sql.match(/RAISE EXCEPTION/g) ?? []).length}`);

const client = new Client(url);
await client.connect();
try {
  const before = (await client.query("SELECT count(*)::int AS n FROM blog_posts WHERE is_published = true")).rows[0].n;
  console.log(`\npublished before : ${before}`);

  await client.query(dry);
  console.log("server accepted the full statement stream; all assertions passed");

  const after = (await client.query("SELECT count(*)::int AS n FROM blog_posts WHERE is_published = true")).rows[0].n;
  console.log(`published after  : ${after}`);

  // Prove the rollback took: the defect text must still be there.
  const still = (await client.query(
    "SELECT count(*)::int AS n FROM blog_posts WHERE slug = 'top-5-mistakes' AND title LIKE '%90%'",
  )).rows[0].n;
  console.log(`\nrollback proof   : original title still present = ${still === 1 ? "YES (nothing persisted)" : "NO"}`);
  if (still !== 1 || after !== before) {
    console.error("DRY RUN LEAKED — state changed. Investigate before doing anything else.");
    process.exitCode = 1;
  } else {
    console.log("\nDRY RUN PASSED. Migration is valid and nothing was written.");
  }
} catch (err) {
  console.error(`\nDRY RUN FAILED: ${err.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}

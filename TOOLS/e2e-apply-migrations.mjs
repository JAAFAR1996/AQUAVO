/**
 * Migration executor for the E2E child branch ONLY.
 *
 * Contract honoured:
 *   - every file is verified byte-for-byte against its CURRENT COMMITTED git blob
 *     before execution (no working-tree drift, no "edit until it passes");
 *   - the EXECUTOR owns the transaction: BEGIN; <entire file>; COMMIT;
 *     any error -> ROLLBACK, and the run stops;
 *   - dependency order is explicit and declared below;
 *   - NO session_replication_role, NO global trigger disabling;
 *   - target is whatever E2E_DATABASE_URL points at — Gate 0 in e2e-run.mjs has
 *     already proven that is br-cool-bar-a4x1pig5 and not production.
 *
 * Idempotent: every migration is written to be re-runnable, and a pre-check skips
 * files whose objects already exist.
 */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const ROOT = "C:/Users/jaafa/Desktop/upload/FishWebClean";

/** Dependency-ordered. Each entry: file + a SQL predicate that is TRUE once applied. */
const PLAN = [
  ["migrations/add_order_item_cost_snapshot.sql",
    `SELECT count(*)=1 FROM information_schema.columns WHERE table_name='order_items_relational' AND column_name='cost_snapshot_status'`],
  ["migrations/add_orderitem_backfill_trigger_safety.sql",
    `SELECT count(*)>0 FROM information_schema.tables WHERE table_name='orderitem_backfill_audit'`],
  // The executor — not the file — owns the batch-id GUC. This is the documented
  // contract (docs/audit/neon-migration-execution.md, Operation 3); the file
  // deliberately has no default so a backfill can never run unattributed.
  // `aquavo.backfill_allow_unresolved` is deliberately NOT set.
  ["migrations/backfill_orderitems_from_jsonb.sql",
    // Two-step: Postgres resolves relations at PARSE time, so the batches table
    // has to be proven to exist before it can be queried.
    async (pool) => {
      const t = await pool.query(`SELECT to_regclass('public.orderitem_backfill_batches') IS NOT NULL AS present`);
      if (!t.rows[0].present) return false;
      const r = await pool.query(`SELECT count(*) > 0 AS applied FROM orderitem_backfill_batches WHERE rolled_back_at IS NULL`);
      return r.rows[0].applied === true;
    },
    { preamble: `SELECT set_config('aquavo.backfill_batch_id', gen_random_uuid()::text, true)` }],
  ["migrations/add_fulfillment_costing.sql",
    `SELECT count(*)>0 FROM information_schema.tables WHERE table_name='order_fulfillment_lines'`],
  ["migrations/add_fulfillment_hardening.sql",
    `SELECT count(*)>0 FROM information_schema.tables WHERE table_name='order_fulfillment_sequences'`],
  ["migrations/add_pim_line_identity.sql",
    `SELECT count(*)>0 FROM pg_indexes WHERE indexname='pim_idempotency_line_uidx'`],
  ["migrations/add_product_cost_resolution.sql",
    `SELECT count(*)=1 FROM information_schema.columns WHERE table_name='products' AND column_name='cost_price_resolution'`],
  ["migrations/fix_blocked_ips_timestamptz.sql",
    `SELECT count(*)=1 FROM information_schema.columns WHERE table_name='blocked_ips' AND column_name='expires_at' AND data_type='timestamp with time zone'`],
  ["migrations/drop_product_cost_zero_defaults.sql",
    `SELECT count(*)=0 FROM information_schema.columns WHERE table_name='products' AND column_name='cost_price' AND column_default IS NOT NULL`],
];

const sha = (s) => createHash("sha256").update(s).digest("hex");

function committedBlob(path) {
  return execFileSync(`git show HEAD:${path}`, { cwd: ROOT, encoding: "utf8", shell: true });
}

const url = process.env.E2E_DATABASE_URL;
if (!url) { console.error("no E2E_DATABASE_URL — run through e2e-run.mjs"); process.exit(70); }

const pool = new Pool({ connectionString: url });
const results = [];

try {
  // Prove, from inside the connection itself, that this is not production.
  const who = await pool.query(
    `SELECT current_database() AS db, inet_server_addr()::text AS addr, version() AS v`);
  console.log(`[exec] connected db=${who.rows[0].db}`);

  for (const [file, appliedPredicate, opts] of PLAN) {
    const onDisk = readFileSync(`${ROOT}/${file}`, "utf8");
    const inGit = committedBlob(file);
    const hDisk = sha(onDisk), hGit = sha(inGit);
    if (hDisk !== hGit) {
      throw new Error(`${file}: WORKING TREE DIFFERS FROM COMMITTED BLOB (disk ${hDisk.slice(0, 12)} vs git ${hGit.slice(0, 12)})`);
    }

    if (appliedPredicate) {
      const already = typeof appliedPredicate === "function"
        ? await appliedPredicate(pool)
        : Object.values((await pool.query(appliedPredicate)).rows[0] ?? {})[0] === true;
      if (already) {
        console.log(`[exec] SKIP  ${file}  (already applied)  sha256=${hGit}`);
        results.push({ file, sha256: hGit, status: "already-applied" });
        continue;
      }
    }

    const client = await pool.connect();
    const t0 = Date.now();
    try {
      await client.query("BEGIN");
      // Executor-owned session settings, scoped to THIS transaction only
      // (SET LOCAL semantics). Never session_replication_role, never a global
      // trigger disable — the safety triggers stay armed throughout.
      if (opts?.preamble) await client.query(opts.preamble);
      await client.query(inGit);            // the COMMITTED bytes, unmodified
      await client.query("COMMIT");
      const ms = Date.now() - t0;
      console.log(`[exec] APPLY ${file}  OK ${ms}ms  sha256=${hGit}`);
      results.push({ file, sha256: hGit, status: "applied", ms });
    } catch (e) {
      await client.query("ROLLBACK").catch(() => { });
      console.error(`[exec] FAIL  ${file}  ROLLED BACK: ${e.message}`);
      results.push({ file, sha256: hGit, status: "failed", error: e.message });
      throw e;
    } finally {
      client.release();
    }
  }

  console.log("\n[exec] SUMMARY");
  for (const r of results) console.log(`  ${r.status.padEnd(16)} ${r.file}  ${r.sha256}`);
} finally {
  await pool.end();
}

/**
 * Safe, explicit release gate for migration 0103.
 * Must NOT be executed in production without the owner approving migration + release.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;
const VERSION = "0103_treasury_cashbook";
const CONFIRM = "APPLY_TREASURY_0103";
const FILE = "0103_treasury_cashbook.sql";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required");
  if (process.env.CONFIRM_TREASURY_0103 !== CONFIRM)
    throw new Error(`Explicit owner approval required: CONFIRM_TREASURY_0103=${CONFIRM}`);
  const body = readFileSync(join(process.cwd(),"migrations",FILE),"utf8");
  const checksum = createHash("sha256").update(body).digest("hex");
  const sqlBody = body.replace(/^\s*(?:--[^\n]*\n)*\s*BEGIN;\s*/i,"")
    .replace(/\s*COMMIT;\s*$/i,"").trim();
  if (!sqlBody.includes("CREATE TABLE IF NOT EXISTS public.treasury_accounts"))
    throw new Error("Refusing unexpected migration contents");

  const pool = new Pool({connectionString:databaseUrl,max:1});
  const client = await pool.connect();
  let locked = false;
  try {
    await client.query("SELECT pg_advisory_lock(hashtext('aquavo-treasury-0103'))");
    locked=true;
    const current=await client.query<{checksum:string,rolled_back_at:string|null}>(
      "SELECT checksum,rolled_back_at FROM public.schema_migrations WHERE version=$1", [VERSION]);
    if(current.rows.length){
      if(current.rows[0]?.checksum!==checksum || current.rows[0]?.rolled_back_at)
        throw new Error("0103 migration ledger mismatch; stop and inspect before proceeding");
      console.log("0103 already applied and checksum matches.");
      return;
    }

    const reference=await client.query<{code:string,balance:string}>(
      "SELECT code,balance::text FROM public.v_accounting_live_balances WHERE code IN ('1000','1010','1100') ORDER BY code");
    await client.query("BEGIN");
    try {
      await client.query("SET LOCAL lock_timeout='5s'");
      await client.query("SET LOCAL statement_timeout='40s'");
      await client.query("SELECT set_config('aquavo.migration_checksum',$1,true)",[checksum]);
      await client.query(sqlBody);
      const tables=await client.query<{ok:boolean}>(`
        SELECT to_regclass('public.treasury_accounts') IS NOT NULL
          AND to_regclass('public.treasury_movements') IS NOT NULL
          AND to_regclass('public.treasury_reconciliations') IS NOT NULL
          AND to_regclass('public.treasury_gateway_allocations') IS NOT NULL
          AND (SELECT COUNT(*) FROM public.treasury_accounts)=0 AS ok`);
      const ledger=await client.query<{checksum:string}>(
        "SELECT checksum FROM public.schema_migrations WHERE version=$1 AND rolled_back_at IS NULL",[VERSION]);
      const balances=await client.query<{code:string,balance:string}>(
        "SELECT code,balance::text FROM public.v_accounting_live_balances WHERE code IN ('1000','1010','1100') ORDER BY code");
      if(tables.rows[0]?.ok!==true || ledger.rows[0]?.checksum!==checksum ||
         JSON.stringify(reference.rows)!==JSON.stringify(balances.rows)){
        throw new Error("Treasury migration financial-integrity check failed");
      }
      await client.query("COMMIT");
      console.log(`Treasury 0103 installed, checksum ${checksum}. Existing GL balances unchanged.`);
    } catch(error){
      await client.query("ROLLBACK").catch(()=>undefined);
      throw error;
    }
  } finally {
    if(locked)await client.query("SELECT pg_advisory_unlock(hashtext('aquavo-treasury-0103'))")
      .catch(()=>undefined);
    client.release();
    await pool.end();
  }
}
main().catch(error=>{console.error("[treasury-migration]",error);process.exitCode=1;});

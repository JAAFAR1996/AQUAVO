import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const VERSION = "20260825_alqaseh_online_accounting";
const MIGRATION_FILE = `${VERSION}.sql`;
const CONFIRM_VALUE = "APPLY_ALQASEH_ACCOUNTING_20260825";

function migrationBody(): string {
  return readFileSync(join(process.cwd(), "migrations", MIGRATION_FILE), "utf8");
}

function checksum(body: string): string {
  return createHash("sha256").update(body).digest("hex");
}

function stripOuterTransaction(body: string): string {
  return body
    .replace(/^\s*BEGIN;\s*/i, "")
    .replace(/\s*COMMIT;\s*$/i, "")
    .trim();
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required");
  if (process.env.CONFIRM_ALQASEH_ACCOUNTING !== CONFIRM_VALUE) {
    throw new Error(`CONFIRM_ALQASEH_ACCOUNTING=${CONFIRM_VALUE} is required`);
  }

  const body = migrationBody();
  const bodyChecksum = checksum(body);
  const pool = new Pool({ connectionString, max: 1 });
  const client = await pool.connect();
  let locked = false;
  let transactionOpen = false;

  try {
    await client.query("SET lock_timeout='10s'");
    await client.query("SET statement_timeout='120s'");
    await client.query("SELECT pg_advisory_lock(hashtext('aquavo-alqaseh-accounting-migration'))");
    locked = true;

    const ledger = await client.query<{ applied: boolean }>(
      `SELECT EXISTS(
         SELECT 1 FROM public.schema_migrations
         WHERE version=$1 AND rolled_back_at IS NULL
       ) AS applied`,
      [VERSION],
    );

    if (!ledger.rows[0]?.applied) {
      console.log(`[alqaseh-accounting] apply ${VERSION}`);
      await client.query("BEGIN");
      transactionOpen = true;
      await client.query(stripOuterTransaction(body));
      await client.query(
        `INSERT INTO public.schema_migrations(version,checksum,notes)
         VALUES($1,$2,$3)
         ON CONFLICT(version) DO UPDATE
         SET checksum=EXCLUDED.checksum,
             notes=EXCLUDED.notes,
             rolled_back_at=NULL,
             applied_at=now()`,
        [
          VERSION,
          bodyChecksum,
          "Al-Qaseh online payment delivery accounting: bank custody + capture event; preserve COD path",
        ],
      );
    } else {
      console.log(`[alqaseh-accounting] skip ${VERSION}: already applied`);
    }

    const verification = await client.query<Record<string, boolean>>(`
      SELECT
        EXISTS(
          SELECT 1 FROM public.schema_migrations
          WHERE version='20260825_alqaseh_online_accounting' AND rolled_back_at IS NULL
        ) AS migration_registered,
        pg_get_functiondef('public.record_order_delivery_accounting()'::regprocedure)
          ILIKE '%v6_alqaseh_online_accounting%' AS policy_version,
        pg_get_functiondef('public.record_order_delivery_accounting()'::regprocedure)
          ILIKE '%v_payment_method=''alqaseh''%' AS alqaseh_branch,
        pg_get_functiondef('public.record_order_delivery_accounting()'::regprocedure)
          ILIKE '%v_cash_custody:=''bank''%' AS bank_custody,
        pg_get_functiondef('public.record_order_delivery_accounting()'::regprocedure)
          ILIKE '%''capture'',''completed'',v_gross,''IQD'',''alqaseh''%' AS capture_event,
        pg_get_functiondef('public.post_order_delivery_journal(text)'::regprocedure)
          ILIKE '%''1010'',f.gross_collected%' AS bank_journal,
        EXISTS(
          SELECT 1 FROM pg_trigger t
          WHERE t.tgrelid='public.orders'::regclass
            AND t.tgfoid='public.record_order_delivery_accounting()'::regprocedure
            AND NOT t.tgisinternal
        ) AS delivery_trigger_attached
    `);

    const checks = verification.rows[0];
    if (!checks || Object.values(checks).some((value) => value !== true)) {
      throw new Error(`Al-Qaseh accounting verification failed: ${JSON.stringify(checks)}`);
    }

    if (transactionOpen) {
      await client.query("COMMIT");
      transactionOpen = false;
    }
    console.log(`[alqaseh-accounting] verified ${VERSION} ${bodyChecksum}`);
  } catch (error) {
    if (transactionOpen) {
      await client.query("ROLLBACK").catch(() => undefined);
      transactionOpen = false;
    }
    throw error;
  } finally {
    if (locked) {
      await client.query("SELECT pg_advisory_unlock(hashtext('aquavo-alqaseh-accounting-migration'))").catch(() => undefined);
    }
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("[alqaseh-accounting] failed", error);
  process.exitCode = 1;
});

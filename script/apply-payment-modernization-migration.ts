import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const FILE = "20260825_payment_modernization.sql";
const VERSION = "20260825_payment_modernization";
const CONFIRM = "APPLY_PAYMENT_MODERNIZATION_20260825";

function body(): string {
  return readFileSync(join(process.cwd(), "migrations", FILE), "utf8");
}
function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required");
  if (process.env.CONFIRM_PAYMENT_MODERNIZATION !== CONFIRM) {
    throw new Error(`CONFIRM_PAYMENT_MODERNIZATION=${CONFIRM} is required`);
  }

  const sqlBody = body();
  const checksum = sha256(sqlBody);
  const pool = new Pool({ connectionString, max: 1 });
  const client = await pool.connect();
  let locked = false;
  try {
    await client.query("SET lock_timeout='10s'");
    await client.query("SET statement_timeout='120s'");
    await client.query("SELECT pg_advisory_lock(hashtext('aquavo-payment-modernization-20260825'))");
    locked = true;

    const existing = await client.query<{ checksum: string | null }>(
      `SELECT checksum FROM public.schema_migrations WHERE version=$1 AND rolled_back_at IS NULL LIMIT 1`,
      [VERSION],
    );
    if (existing.rows[0]?.checksum === checksum) {
      console.log(`[payment-modernization] already applied ${VERSION} ${checksum}`);
    } else {
      console.log(`[payment-modernization] apply ${VERSION}`);
      await client.query("BEGIN");
      try {
        await client.query(sqlBody);
        await client.query(
          `UPDATE public.schema_migrations
              SET checksum=$2,
                  notes=COALESCE(notes,'') || ' [runner-verified file sha256]',
                  rolled_back_at=NULL,
                  applied_at=now()
            WHERE version=$1`,
          [VERSION, checksum],
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }

    const verify = await client.query<Record<string, boolean | string | null>>(`
      SELECT
        to_regclass('public.payment_stock_reservations') IS NOT NULL AS reservations,
        to_regclass('public.payment_outbox') IS NOT NULL AS outbox,
        to_regprocedure('public.enforce_payment_stock_reservations()') IS NOT NULL AS guard_function,
        EXISTS(
          SELECT 1 FROM pg_trigger
          WHERE tgname='inventory_movements_payment_reservation_guard' AND NOT tgisinternal
        ) AS guard_trigger,
        EXISTS(
          SELECT 1 FROM public.schema_migrations
          WHERE version='20260825_payment_modernization'
            AND rolled_back_at IS NULL
            AND checksum='${checksum}'
        ) AS ledger_ok
    `);
    const row = verify.rows[0];
    if (!row || Object.values(row).some((value) => value !== true)) {
      throw new Error(`Payment modernization verification failed: ${JSON.stringify(row)}`);
    }
    console.log(`[payment-modernization] verified ${VERSION} ${checksum}`);
  } finally {
    if (locked) await client.query("SELECT pg_advisory_unlock(hashtext('aquavo-payment-modernization-20260825'))").catch(() => undefined);
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("[payment-modernization] failed", error);
  process.exitCode = 1;
});

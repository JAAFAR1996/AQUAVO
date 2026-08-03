import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const MIGRATIONS = [
  "0051_accounting_august_foundation.sql",
  "0052_accounting_cod_delivery_settlements.sql",
  "0053_accounting_expenses_returns.sql",
  "0054_accounting_fulfillment_readiness.sql",
  "0055_accounting_checksum_manifest.sql",
  "0056_accounting_delivery_timestamp.sql",
  "0057_accounting_operating_defaults.sql",
  "0058_accounting_confirm_global_addons_zero.sql",
  "0059_accounting_carrier_other_deductions.sql",
  "0060_accounting_close_state_machine.sql",
] as const;

function versionOf(file: string): string {
  return file.replace(/\.sql$/, "");
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required");
  if (process.env.CONFIRM_ACCOUNTING_PRODUCTION !== "APPLY_0051_TO_0060") {
    throw new Error("CONFIRM_ACCOUNTING_PRODUCTION=APPLY_0051_TO_0060 is required");
  }

  const pool = new Pool({ connectionString, max: 1 });
  const client = await pool.connect();
  try {
    await client.query("SET lock_timeout='10s'");
    await client.query("SET statement_timeout='120s'");
    await client.query("SELECT pg_advisory_lock(hashtext('aquavo-accounting-v2-migrations'))");

    for (const file of MIGRATIONS) {
      const version = versionOf(file);
      const ledger = await client.query<{ applied: boolean }>(
        `SELECT EXISTS(
           SELECT 1 FROM public.schema_migrations
           WHERE version=$1 AND rolled_back_at IS NULL
         ) AS applied`,
        [version],
      );
      if (ledger.rows[0]?.applied) {
        console.log(`[accounting-migrate] skip ${version}: already applied`);
        continue;
      }

      const body = readFileSync(join(process.cwd(), "migrations", file), "utf8");
      console.log(`[accounting-migrate] apply ${version}`);
      await client.query(body);

      const verify = await client.query<{ applied: boolean }>(
        `SELECT EXISTS(
           SELECT 1 FROM public.schema_migrations
           WHERE version=$1 AND rolled_back_at IS NULL
         ) AS applied`,
        [version],
      );
      if (!verify.rows[0]?.applied) {
        throw new Error(`${version} did not register itself in schema_migrations`);
      }
    }

    const health = await client.query(`
      SELECT
        to_regclass('public.order_accounting_facts') IS NOT NULL AS facts,
        to_regclass('public.journal_entries') IS NOT NULL AS journal,
        to_regclass('public.v_accounting_period_readiness') IS NOT NULL AS readiness,
        to_regclass('public.delivery_companies') IS NOT NULL AS companies,
        to_regclass('public.accounting_monthly_positions') IS NOT NULL AS positions,
        EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='delivered_at') AS delivered_at,
        EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='accounting_monthly_positions' AND column_name='other_deduction_amount') AS other_deductions,
        EXISTS(SELECT 1 FROM public.schema_migrations WHERE version='0060_accounting_close_state_machine' AND rolled_back_at IS NULL) AS migration_0060,
        EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='trg_guard_accounting_period_tax_finalization' AND NOT tgisinternal) AS close_state_guard
    `);
    const checks = health.rows[0] as Record<string, boolean> | undefined;
    if (!checks || Object.values(checks).some((value) => value !== true)) {
      throw new Error(`Accounting V2 health failed: ${JSON.stringify(checks)}`);
    }
    console.log(`[accounting-migrate] health OK ${JSON.stringify(checks)}`);
  } finally {
    await client.query("SELECT pg_advisory_unlock(hashtext('aquavo-accounting-v2-migrations'))").catch(() => undefined);
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("[accounting-migrate] failed", error);
  process.exitCode = 1;
});

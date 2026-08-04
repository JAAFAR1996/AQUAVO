import { createHash } from "node:crypto";
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
  "0061_accounting_default_carrier_status_guard.sql",
  "0062_accounting_automation_opening_balances.sql",
  "0063_accounting_cod_refusal_and_store_credit.sql",
  "0064_accounting_customer_credit_posting_links.sql",
  "0065_accounting_separate_warranty_from_cod_refusal.sql",
  "0066_accounting_reassert_refusal_inventory_after_0062.sql",
] as const;

function versionOf(file: string): string { return file.replace(/\.sql$/, ""); }
function fileBody(file: string): string { return readFileSync(join(process.cwd(), "migrations", file), "utf8"); }
function sha256(body: string): string { return createHash("sha256").update(body).digest("hex"); }

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required");
  if (process.env.CONFIRM_ACCOUNTING_PRODUCTION !== "APPLY_0051_TO_0066") {
    throw new Error("CONFIRM_ACCOUNTING_PRODUCTION=APPLY_0051_TO_0066 is required");
  }

  const pool = new Pool({ connectionString, max: 1 });
  const client = await pool.connect();
  let advisoryLocked = false;
  try {
    await client.query("SET lock_timeout='10s'");
    await client.query("SET statement_timeout='120s'");
    await client.query("SELECT pg_advisory_lock(hashtext('aquavo-accounting-v2-migrations'))");
    advisoryLocked = true;

    for (const file of MIGRATIONS) {
      const version = versionOf(file);
      const ledger = await client.query<{ applied: boolean }>(
        `SELECT EXISTS(SELECT 1 FROM public.schema_migrations WHERE version=$1 AND rolled_back_at IS NULL) AS applied`,
        [version],
      );
      if (ledger.rows[0]?.applied) {
        console.log(`[accounting-migrate] skip ${version}: already applied`);
        continue;
      }
      const body = fileBody(file);
      console.log(`[accounting-migrate] apply ${version}`);
      await client.query(body);
      const verify = await client.query<{ applied: boolean }>(
        `SELECT EXISTS(SELECT 1 FROM public.schema_migrations WHERE version=$1 AND rolled_back_at IS NULL) AS applied`,
        [version],
      );
      if (!verify.rows[0]?.applied) throw new Error(`${version} did not register itself in schema_migrations`);
    }

    for (const file of MIGRATIONS) {
      const version = versionOf(file);
      const checksum = sha256(fileBody(file));
      const updated = await client.query(
        `UPDATE public.schema_migrations
         SET checksum=$2,
             notes=CASE WHEN COALESCE(notes,'') LIKE '%[runner-verified file sha256]%' THEN notes ELSE COALESCE(notes,'')||' [runner-verified file sha256]' END
         WHERE version=$1 AND rolled_back_at IS NULL RETURNING version`,
        [version, checksum],
      );
      if (updated.rowCount !== 1) throw new Error(`Cannot normalize ledger checksum for ${version}`);
    }

    const health = await client.query(`
      SELECT
        to_regclass('public.order_accounting_facts') IS NOT NULL AS facts,
        to_regclass('public.journal_entries') IS NOT NULL AS journal,
        to_regclass('public.v_accounting_period_readiness') IS NOT NULL AS readiness,
        to_regclass('public.delivery_companies') IS NOT NULL AS companies,
        to_regclass('public.accounting_monthly_positions') IS NOT NULL AS positions,
        to_regclass('public.v_accounting_live_balances') IS NOT NULL AS live_balances,
        to_regclass('public.order_inventory_custody_events') IS NOT NULL AS custody_events,
        to_regclass('public.v_order_inventory_custody_latest') IS NOT NULL AS custody_latest,
        to_regclass('public.customer_credit_accounts') IS NOT NULL AS credit_accounts,
        to_regclass('public.customer_credit_entries') IS NOT NULL AS credit_entries,
        to_regclass('public.customer_credit_accounting_links') IS NOT NULL AS credit_links,
        to_regclass('public.v_customer_credit_balances') IS NOT NULL AS credit_balances,
        to_regclass('public.v_cod_refusal_policy_exceptions') IS NOT NULL AS refusal_exceptions,
        to_regclass('public.v_cod_refusal_inventory_exceptions') IS NOT NULL AS refusal_inventory_exceptions,
        to_regprocedure('public.auto_close_ended_accounting_periods(text,text)') IS NOT NULL AS auto_close,
        EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='delivered_at') AS delivered_at,
        EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='accounting_monthly_positions' AND column_name='other_deduction_amount') AS other_deductions,
        NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='customer_credit_entries' AND column_name IN ('accounting_status','journal_entry_id')) AS credit_events_immutable_shape,
        EXISTS(SELECT 1 FROM public.schema_migrations WHERE version='0062_accounting_automation_opening_balances' AND rolled_back_at IS NULL) AS migration_0062,
        EXISTS(SELECT 1 FROM public.schema_migrations WHERE version='0063_accounting_cod_refusal_and_store_credit' AND rolled_back_at IS NULL) AS migration_0063,
        EXISTS(SELECT 1 FROM public.schema_migrations WHERE version='0064_accounting_customer_credit_posting_links' AND rolled_back_at IS NULL) AS migration_0064,
        EXISTS(SELECT 1 FROM public.schema_migrations WHERE version='0065_accounting_separate_warranty_from_cod_refusal' AND rolled_back_at IS NULL) AS migration_0065,
        EXISTS(SELECT 1 FROM public.schema_migrations WHERE version='0066_accounting_reassert_refusal_inventory_after_0062' AND rolled_back_at IS NULL) AS migration_0066,
        EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='trg_guard_accounting_period_tax_finalization' AND NOT tgisinternal) AS close_state_guard,
        EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='trg_guard_customer_credit_period_close' AND NOT tgisinternal) AS credit_close_guard,
        EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='journal_entries_closed_period_guard' AND NOT tgisinternal) AS closed_period_guard,
        EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='journal_lines_immutable_guard' AND NOT tgisinternal) AS journal_line_guard,
        EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='order_return_events_enforce_cod_refusal' AND NOT tgisinternal) AS refusal_guard,
        EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='order_inventory_custody_no_update' AND NOT tgisinternal) AS custody_update_guard,
        EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='order_inventory_custody_no_delete' AND NOT tgisinternal) AS custody_delete_guard,
        EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='customer_credit_entries_guard' AND NOT tgisinternal) AS credit_guard,
        EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='customer_credit_accounting_link_validate' AND NOT tgisinternal) AS credit_link_guard,
        pg_get_functiondef('public.apply_verified_return_inventory()'::regprocedure) ILIKE '%NEW.type=''rejected_delivery''%' AS refusal_double_restock_guard,
        pg_get_functiondef('public.reverse_order_inventory_on_terminal_status()'::regprocedure) ILIKE '%carrier_return_pending%' AS refusal_immediate_availability,
        pg_get_functiondef('public.reverse_order_inventory_on_terminal_status()'::regprocedure) ILIKE '%v_restore_inventory%' AS warranty_item_level_guard,
        EXISTS(
          SELECT 1 FROM pg_trigger t
          WHERE t.tgname='orders_apply_default_delivery_company' AND NOT t.tgisinternal
            AND pg_get_triggerdef(t.oid,true) ILIKE '%UPDATE OF carrier, status%'
        ) AS carrier_status_guard
    `);
    const checks = health.rows[0] as Record<string, boolean> | undefined;
    if (!checks || Object.values(checks).some((value) => value !== true)) {
      throw new Error(`Accounting V2 health failed: ${JSON.stringify(checks)}`);
    }
    console.log(`[accounting-migrate] health OK ${JSON.stringify(checks)}`);
  } finally {
    if (advisoryLocked) await client.query("SELECT pg_advisory_unlock(hashtext('aquavo-accounting-v2-migrations'))").catch(() => undefined);
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("[accounting-migrate] failed", error);
  process.exitCode = 1;
});

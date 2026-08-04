import { Router, type NextFunction, type Request, type Response } from "express";
import { sql } from "drizzle-orm";
import { getDb } from "../db.js";
import { requireAccountingAdmin } from "../middleware/accounting-auth-v2.js";

type Row = Record<string, unknown>;
function rowsOf(result: unknown): Row[] {
  if (Array.isArray(result)) return result as Row[];
  const rows = (result as { rows?: Row[] } | null)?.rows;
  return Array.isArray(rows) ? rows : [];
}

export function createAccountingHealthV2Router() {
  const router = Router();
  router.use(requireAccountingAdmin);
  router.get("/v2/health", async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const db = getDb();
      if (!db) {
        res.status(503).json({ message: "قاعدة البيانات غير مهيأة" });
        return;
      }
      const result = await db.execute(sql`
        SELECT
          to_regclass('public.order_accounting_facts') IS NOT NULL AS facts,
          to_regclass('public.journal_entries') IS NOT NULL AS journal,
          to_regclass('public.v_accounting_period_readiness') IS NOT NULL AS readiness,
          to_regclass('public.delivery_companies') IS NOT NULL AS companies,
          to_regclass('public.accounting_monthly_positions') IS NOT NULL AS positions,
          to_regclass('public.v_accounting_live_balances') IS NOT NULL AS live_balances,
          to_regprocedure('public.auto_close_ended_accounting_periods(text,text)') IS NOT NULL AS auto_close,
          EXISTS(
            SELECT 1 FROM information_schema.columns
            WHERE table_schema='public' AND table_name='orders' AND column_name='delivered_at'
          ) AS delivered_at,
          EXISTS(
            SELECT 1 FROM information_schema.columns
            WHERE table_schema='public' AND table_name='accounting_monthly_positions'
              AND column_name='other_deduction_amount'
          ) AS other_deductions,
          EXISTS(
            SELECT 1 FROM public.schema_migrations
            WHERE version='0060_accounting_close_state_machine' AND rolled_back_at IS NULL
          ) AS migration_0060,
          EXISTS(
            SELECT 1 FROM public.schema_migrations
            WHERE version='0061_accounting_default_carrier_status_guard' AND rolled_back_at IS NULL
          ) AS migration_0061,
          EXISTS(
            SELECT 1 FROM public.schema_migrations
            WHERE version='0062_accounting_automation_opening_balances' AND rolled_back_at IS NULL
          ) AS migration_0062,
          EXISTS(
            SELECT 1 FROM pg_trigger
            WHERE tgname='trg_guard_accounting_period_tax_finalization' AND NOT tgisinternal
          ) AS close_state_guard,
          EXISTS(
            SELECT 1 FROM pg_trigger
            WHERE tgname='journal_entries_closed_period_guard' AND NOT tgisinternal
          ) AS closed_period_guard,
          EXISTS(
            SELECT 1 FROM pg_trigger
            WHERE tgname='journal_lines_immutable_guard' AND NOT tgisinternal
          ) AS journal_line_guard,
          EXISTS(
            SELECT 1 FROM pg_trigger t
            WHERE t.tgname='orders_apply_default_delivery_company' AND NOT t.tgisinternal
              AND pg_get_triggerdef(t.oid,true) ILIKE '%UPDATE OF carrier, status%'
          ) AS carrier_status_guard
      `);
      const state = rowsOf(result)[0] ?? {};
      const ready = Object.values(state).every(Boolean);
      if (!ready) {
        res.status(503).json({ message: "ACCOUNTING_V2_MIGRATIONS_0051_TO_0062_REQUIRED", ready: false, checks: state });
        return;
      }
      res.json({
        ready: true,
        cutover: "2026-08-01",
        timezone: "Asia/Baghdad",
        currency: "IQD",
        migrationsThrough: "0062",
        automaticClose: true,
        checks: state,
      });
    } catch (error) {
      next(error);
    }
  });
  return router;
}

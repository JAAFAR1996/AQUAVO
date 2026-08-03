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
            WHERE version='0059_accounting_carrier_other_deductions' AND rolled_back_at IS NULL
          ) AS migration_0059,
          EXISTS(
            SELECT 1 FROM public.schema_migrations
            WHERE version='0060_accounting_close_state_machine' AND rolled_back_at IS NULL
          ) AS migration_0060,
          EXISTS(
            SELECT 1 FROM pg_trigger
            WHERE tgname='trg_guard_accounting_period_tax_finalization' AND NOT tgisinternal
          ) AS close_state_guard
      `);
      const state = rowsOf(result)[0] ?? {};
      const ready = Object.values(state).every(Boolean);
      if (!ready) {
        res.status(503).json({ message: "ACCOUNTING_V2_MIGRATIONS_0051_TO_0060_REQUIRED", ready: false, checks: state });
        return;
      }
      res.json({
        ready: true,
        cutover: "2026-08-01",
        timezone: "Asia/Baghdad",
        currency: "IQD",
        migrationsThrough: "0060",
        checks: state,
      });
    } catch (error) {
      next(error);
    }
  });
  return router;
}

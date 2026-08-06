import { Router, type NextFunction, type Request, type Response } from "express";
import { sql } from "drizzle-orm";
import { getDb } from "../db.js";
import { requireAccountingAdmin } from "../middleware/accounting-auth-v2.js";

type HealthRow = Record<string, boolean>;

function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  const rows = (result as { rows?: T[] } | null)?.rows;
  return Array.isArray(rows) ? rows : [];
}

async function assertAccountingP0Health(): Promise<void> {
  const db = getDb();
  if (!db) {
    throw Object.assign(new Error("قاعدة البيانات غير مهيأة"), { statusCode: 503 });
  }

  const result = await db.execute(sql`
    SELECT
      EXISTS(
        SELECT 1 FROM public.schema_migrations
        WHERE version='0071_accounting_return_line_identity_and_refund_guard'
          AND rolled_back_at IS NULL
      ) AS migration_0071,
      to_regprocedure('public.assert_order_ready_for_accounting_delivery(text)') IS NOT NULL
        AS delivery_readiness_function,
      to_regprocedure('public.accounting_period_account_balance(text,text)') IS NOT NULL
        AS ledger_balance_function,
      to_regprocedure('public.prepare_verified_return_inventory()') IS NOT NULL
        AS return_verifier_function,
      EXISTS(
        SELECT 1 FROM pg_trigger
        WHERE tgname='orders_accounting_delivery_readiness_guard'
          AND NOT tgisinternal
      ) AS delivery_readiness_guard,
      EXISTS(
        SELECT 1 FROM pg_trigger
        WHERE tgname='order_returns_00_lock_verification'
          AND NOT tgisinternal
      ) AS return_verification_lock_guard,
      EXISTS(
        SELECT 1 FROM pg_trigger
        WHERE tgname='order_returns_prepare_verification'
          AND NOT tgisinternal
      ) AS return_verification_guard,
      pg_get_functiondef('public.prepare_verified_return_inventory()'::regprocedure)
        ILIKE '%RETURN_ORDER_ITEM_ID_REQUIRED%'
        AS return_line_identity_guard,
      pg_get_functiondef('public.prepare_verified_return_inventory()'::regprocedure)
        ILIKE '%refund_amount%v_refund_total%'
        AS return_refund_snapshot_guard
  `);

  const state = rowsOf<HealthRow>(result)[0];
  if (!state || Object.values(state).some((value) => value !== true)) {
    throw Object.assign(
      new Error(`ACCOUNTING_V2_MIGRATIONS_0051_TO_0071_REQUIRED:${JSON.stringify(state ?? {})}`),
      { statusCode: 503 },
    );
  }
}

export function createAccountingHealthV2Router() {
  const router = Router();
  router.use(requireAccountingAdmin);

  router.get("/v2/health", async (_req: Request, res: Response, next: NextFunction) => {
    try {
      await assertAccountingP0Health();
      res.json({
        ready: true,
        cutover: "2026-08-01",
        timezone: "Asia/Baghdad",
        currency: "IQD",
        migrationsThrough: "0071",
        automaticClose: true,
        returnLineIdentity: "order_items_relational.id",
        refundSource: "immutable_sale_snapshot",
      });
    } catch (error) {
      next(error);
    }
  });

  // This router is mounted before all Accounting V2 routers. Fail closed for
  // every /v2 request if the delivery, concurrency, line-identity or refund
  // safeguards are missing, even when an older route still performs a weaker
  // compatibility check internally.
  router.use("/v2", async (_req: Request, _res: Response, next: NextFunction) => {
    try {
      await assertAccountingP0Health();
      next();
    } catch (error) {
      next(error);
    }
  });

  return router;
}

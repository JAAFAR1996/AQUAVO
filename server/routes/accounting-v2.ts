import { Router, type NextFunction, type Request, type Response } from "express";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db.js";
import { requireAccountingAdmin } from "../middleware/accounting-auth-v2.js";
import { actorFromRequest } from "../services/accountingAuditTrail.js";

const periodKeySchema = z.string().regex(/^20\d{2}-(0[1-9]|1[0-2])$/);
const closeBodySchema = z.object({ periodKey: periodKeySchema }).strict();
const reopenBodySchema = z.object({ reason: z.string().trim().min(5).max(500) }).strict();

type DbRow = Record<string, unknown>;

function rowsOf<T extends DbRow = DbRow>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  const rows = (result as { rows?: T[] } | null)?.rows;
  return Array.isArray(rows) ? rows : [];
}

function numeric(value: unknown): number {
  if (value == null || value === "") return 0;
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function normalize(row: DbRow): DbRow {
  const moneyFields = new Set([
    "gross_collected", "customer_delivery_fee", "carrier_fee", "product_revenue",
    "merchant_net", "delivery_subsidy", "delivery_surplus", "cogs_amount",
    "contribution_profit", "journal_difference", "fulfillment_cost", "sales_returns",
    "actual_return_loss", "verified_expenses", "revenue", "cogs", "gross_profit",
    "expenses_total", "sales_return_deduction", "final_net_profit",
    "delivery_subsidy_total", "delivery_surplus_total", "fulfillment_cost_total",
    "debit", "credit", "total_debit", "total_credit", "amount", "unit_cost", "total_cost",
  ]);
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, moneyFields.has(key) ? numeric(value) : value]));
}

async function assertV2Schema(db: ReturnType<typeof getDb>): Promise<void> {
  if (!db) throw Object.assign(new Error("قاعدة البيانات غير مهيأة"), { statusCode: 503 });
  const result = await db.execute(sql`
    SELECT
      to_regclass('public.order_accounting_facts') IS NOT NULL AS facts,
      to_regclass('public.journal_entries') IS NOT NULL AS journal,
      to_regclass('public.v_accounting_period_readiness') IS NOT NULL AS readiness
  `);
  const state = rowsOf(result)[0] as { facts?: boolean; journal?: boolean; readiness?: boolean } | undefined;
  if (!state?.facts || !state.journal || !state.readiness) {
    throw Object.assign(new Error("ACCOUNTING_V2_MIGRATION_REQUIRED"), { statusCode: 503 });
  }
}

const blockerLabels: Record<string, string> = {
  incomplete_cost_orders: "طلبات بكلفة منتج غير مكتملة",
  missing_fulfillment_orders: "طلبات بلا كلفة تجهيز مثبتة",
  incomplete_fulfillment_orders: "طلبات بكلفة تجهيز غير مكتملة",
  payment_evidence_errors: "أخطاء بدليل الدفع",
  unsettled_carrier_orders: "طلبات عند شركة التوصيل بلا تسوية مطابقة",
  delivery_surplus_exceptions: "فروقات توصيل زائدة تحتاج تفسيراً",
  unverified_returns: "مرتجعات غير معتمدة",
  undocumented_expenses: "مصاريف غير موثقة",
  inventory_mismatches: "فروقات بين مخزون الموقع ودفتر الحركات",
  open_review_flags: "إشارات مراجعة مفتوحة",
  journal_difference: "فرق في ميزان اليومية",
};

function readinessPayload(row: DbRow | undefined) {
  const normalized = normalize(row ?? {});
  const blockers = Object.entries(blockerLabels)
    .map(([key, label]) => ({ key, label, count: numeric(normalized[key]) }))
    .filter((item) => item.count !== 0);
  return {
    ...normalized,
    blockers,
    administrativeCloseReady: blockers.length === 0,
  };
}

export function createAccountingV2Router() {
  const router = Router();
  router.use(requireAccountingAdmin);

  router.get("/v2/health", async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const db = getDb();
      await assertV2Schema(db);
      res.json({ ready: true, cutover: "2026-08-01", timezone: "Asia/Baghdad", currency: "IQD" });
    } catch (error) {
      next(error);
    }
  });

  router.get("/v2/readiness", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const periodKey = periodKeySchema.parse(req.query.periodKey);
      const db = getDb();
      await assertV2Schema(db);
      const readinessResult = await db!.execute(sql`
        SELECT * FROM public.v_accounting_period_readiness WHERE period_key=${periodKey}
      `);
      const closeResult = await db!.execute(sql`
        SELECT * FROM public.accounting_period_closes WHERE period_key=${periodKey} LIMIT 1
      `);
      res.json({
        periodKey,
        readiness: readinessPayload(rowsOf(readinessResult)[0]),
        close: rowsOf(closeResult)[0] ? normalize(rowsOf(closeResult)[0]) : null,
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/v2/register", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const periodKey = periodKeySchema.parse(req.query.periodKey);
      const db = getDb();
      await assertV2Schema(db);
      const [ordersResult, readinessResult] = await Promise.all([
        db!.execute(sql`
          SELECT * FROM public.v_order_accounting
          WHERE period_key=${periodKey}
          ORDER BY recognized_at, order_number
        `),
        db!.execute(sql`SELECT * FROM public.v_accounting_period_readiness WHERE period_key=${periodKey}`),
      ]);
      const orders = rowsOf(ordersResult).map(normalize);
      const readiness = readinessPayload(rowsOf(readinessResult)[0]);
      res.json({
        periodKey,
        policyVersion: "v2_gross_includes_delivery_carrier_keeps_fee",
        timezone: "Asia/Baghdad",
        currency: "IQD",
        summary: readiness,
        orders,
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/v2/ledger", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const periodKey = periodKeySchema.parse(req.query.periodKey);
      const db = getDb();
      await assertV2Schema(db);
      const result = await db!.execute(sql`
        SELECT j.id,j.entry_number,j.entry_date,j.period_key,j.source_type,j.source_id,
               j.event_kind,j.description,j.status,j.total_debit,j.total_credit,
               j.reversal_of_entry_id,j.evidence,
               COALESCE(jsonb_agg(jsonb_build_object(
                 'lineNumber',l.line_number,'accountCode',l.account_code,'accountName',a.name_ar,
                 'debit',l.debit,'credit',l.credit,'memo',l.memo,'dimensions',l.dimensions
               ) ORDER BY l.line_number) FILTER(WHERE l.id IS NOT NULL),'[]'::jsonb) AS lines
        FROM public.journal_entries j
        LEFT JOIN public.journal_lines l ON l.entry_id=j.id
        LEFT JOIN public.chart_of_accounts a ON a.code=l.account_code
        WHERE j.period_key=${periodKey}
        GROUP BY j.id
        ORDER BY j.entry_date,j.entry_number
      `);
      res.json({ periodKey, entries: rowsOf(result).map(normalize) });
    } catch (error) {
      next(error);
    }
  });

  router.get("/v2/accountant-package", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const periodKey = periodKeySchema.parse(req.query.periodKey);
      const db = getDb();
      await assertV2Schema(db);
      const [profile, readiness, sales, ledger, expenses, returns, settlements, opening, evidence, close] = await Promise.all([
        db!.execute(sql`SELECT * FROM public.tax_profiles WHERE id='al-manba-aquavo'`),
        db!.execute(sql`SELECT * FROM public.v_accounting_period_readiness WHERE period_key=${periodKey}`),
        db!.execute(sql`SELECT * FROM public.v_order_accounting WHERE period_key=${periodKey} ORDER BY recognized_at,order_number`),
        db!.execute(sql`SELECT * FROM public.journal_entries WHERE period_key=${periodKey} ORDER BY entry_date,entry_number`),
        db!.execute(sql`SELECT * FROM public.expenses WHERE deleted_at IS NULL AND to_char(COALESCE(expense_occurred_at,expense_date AT TIME ZONE 'Asia/Baghdad') AT TIME ZONE 'Asia/Baghdad','YYYY-MM')=${periodKey} ORDER BY expense_occurred_at,created_at`),
        db!.execute(sql`SELECT * FROM public.order_return_events WHERE to_char(updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Baghdad','YYYY-MM')=${periodKey} ORDER BY updated_at,created_at`),
        db!.execute(sql`SELECT s.* FROM public.cash_settlements s WHERE to_char(COALESCE(s.received_at,s.updated_at) AT TIME ZONE 'Asia/Baghdad','YYYY-MM')=${periodKey} ORDER BY COALESCE(s.received_at,s.updated_at)`),
        db!.execute(sql`SELECT * FROM public.opening_inventory_snapshot WHERE cutover_id='aquavo-2026-08-01' ORDER BY product_id,variant_id`),
        db!.execute(sql`SELECT * FROM public.evidence_files WHERE to_char(created_at AT TIME ZONE 'Asia/Baghdad','YYYY-MM')<=${periodKey} ORDER BY created_at,id`),
        db!.execute(sql`SELECT * FROM public.accounting_period_closes WHERE period_key=${periodKey} LIMIT 1`),
      ]);
      res.json({
        manifest: {
          packageVersion: "2026-08-v2",
          periodKey,
          generatedAt: new Date().toISOString(),
          legalName: "محل المنبع",
          brand: "AQUAVO",
          timezone: "Asia/Baghdad",
          currency: "IQD",
          taxFinal: String((rowsOf(close)[0] as any)?.status ?? "") === "tax_final",
        },
        profile: rowsOf(profile)[0] ?? null,
        readiness: readinessPayload(rowsOf(readiness)[0]),
        close: rowsOf(close)[0] ? normalize(rowsOf(close)[0]) : null,
        sales: rowsOf(sales).map(normalize),
        journal: rowsOf(ledger).map(normalize),
        expenses: rowsOf(expenses).map(normalize),
        returns: rowsOf(returns).map(normalize),
        settlements: rowsOf(settlements).map(normalize),
        openingInventory: rowsOf(opening).map(normalize),
        evidenceIndex: rowsOf(evidence).map(normalize),
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/v2/periods/close", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { periodKey } = closeBodySchema.parse(req.body);
      const db = getDb();
      await assertV2Schema(db);
      const actor = actorFromRequest(req);
      const result = await db!.execute(sql`
        INSERT INTO public.accounting_period_closes(
          period_key,period_start,period_end,status,closed_by,closed_by_name,snapshot_json,closed_at
        ) VALUES(
          ${periodKey},to_date(${periodKey}||'-01','YYYY-MM-DD'),
          (to_date(${periodKey}||'-01','YYYY-MM-DD')+interval '1 month'),
          'closed',${actor.id},${actor.name},'{}'::jsonb,clock_timestamp()
        )
        ON CONFLICT(period_key) DO UPDATE SET
          status='closed',closed_by=EXCLUDED.closed_by,closed_by_name=EXCLUDED.closed_by_name,
          closed_at=clock_timestamp(),reopened_by=NULL,reopened_reason=NULL,reopened_at=NULL
        RETURNING *
      `);
      res.status(201).json(normalize(rowsOf(result)[0] ?? {}));
    } catch (error) {
      next(error);
    }
  });

  router.post("/v2/periods/:periodKey/reopen", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const periodKey = periodKeySchema.parse(req.params.periodKey);
      const { reason } = reopenBodySchema.parse(req.body);
      const db = getDb();
      await assertV2Schema(db);
      const actor = actorFromRequest(req);
      const result = await db!.execute(sql`
        UPDATE public.accounting_period_closes SET
          status='reopened',reopened_by=${actor.id},reopened_reason=${reason},reopened_at=clock_timestamp()
        WHERE period_key=${periodKey}
        RETURNING *
      `);
      const row = rowsOf(result)[0];
      if (!row) {
        res.status(404).json({ message: "الفترة غير موجودة" });
        return;
      }
      res.json(normalize(row));
    } catch (error) {
      next(error);
    }
  });

  router.post("/v2/periods/:periodKey/tax-final", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const periodKey = periodKeySchema.parse(req.params.periodKey);
      const db = getDb();
      await assertV2Schema(db);
      const actor = actorFromRequest(req);
      const result = await db!.execute(sql`
        UPDATE public.accounting_period_closes SET
          status='tax_final',closed_by=${actor.id},closed_by_name=${actor.name},closed_at=clock_timestamp()
        WHERE period_key=${periodKey}
        RETURNING *
      `);
      const row = rowsOf(result)[0];
      if (!row) {
        res.status(404).json({ message: "أغلق الفترة إدارياً أولاً" });
        return;
      }
      res.json(normalize(row));
    } catch (error) {
      next(error);
    }
  });

  return router;
}

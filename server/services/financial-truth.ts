import { sql } from "drizzle-orm";
import { getDb } from "../db.js";
import { buildFinancialTruth, type FinancialTruth, type TruthRow } from "../../shared/financial-truth.js";

type Db = NonNullable<ReturnType<typeof getDb>>;
type Executor = Pick<Db, "execute">;
function rows(result: unknown): TruthRow[] {
  if (Array.isArray(result)) return result as TruthRow[];
  const value = (result as { rows?: TruthRow[] } | null)?.rows;
  if (!Array.isArray(value)) throw new Error("FINANCIAL_SOURCE_UNREADABLE");
  return value;
}
function one(result: unknown, name: string): TruthRow {
  const value = rows(result)[0];
  if (!value) throw new Error(`FINANCIAL_SOURCE_MISSING:${name}`);
  return value;
}
export function currentFinancialMonth(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Baghdad", year: "numeric", month: "2-digit" }).formatToParts(now);
  return `${parts.find(p => p.type === "year")!.value}-${parts.find(p => p.type === "month")!.value}`;
}

/** Read sources only. The caller owns the stable, read-only transaction. */
export async function readFinancialTruth(db: Executor, periodKey: string): Promise<FinancialTruth> {
  if (!/^20\d{2}-(0[1-9]|1[0-2])$/.test(periodKey)) throw Object.assign(new Error("الشهر المحاسبي غير صالح"), { statusCode: 400 });
  const readiness = one(await db.execute(sql`SELECT * FROM public.accounting_readiness_status`), "readiness");
  const period = rows(await db.execute(sql`SELECT * FROM public.v_accounting_period_readiness WHERE period_key=${periodKey}`))[0] ?? null;
  const cutoverMonth = currentFinancialMonth(new Date(String(readiness.cutover_at)));
  if (!period && periodKey >= cutoverMonth) throw Object.assign(new Error("لا توجد بيانات مالية لهذه الفترة"), { statusCode: 409 });
  const inventory = one(await db.execute(sql`SELECT * FROM public.v_accounting_inventory_asset_reconciliation`), "inventory");
  const costCoverage = one(await db.execute(sql`
    WITH live AS (SELECT * FROM public.products WHERE deleted_at IS NULL),
    sku AS (
      SELECT p.id,p.stock::numeric AS quantity,
        CASE WHEN (p.cost_price>0 AND p.cost_price_resolution='known') OR (p.cost_price=0 AND p.cost_price_resolution='verified_zero') THEN p.cost_price END AS known_cost
      FROM live p WHERE COALESCE(p.has_variants,false)=false
      UNION ALL
      SELECT p.id,COALESCE(NULLIF(v->>'stock','')::numeric,0),
        CASE WHEN v->>'costStatus' IN ('verified_derived','exact','known','verified_zero')
          AND NULLIF(v->>'costPrice','') IS NOT NULL AND (v->>'costPrice')::numeric>=0
          THEN (v->>'costPrice')::numeric END
      FROM live p CROSS JOIN LATERAL jsonb_array_elements(
        CASE WHEN jsonb_typeof(p.variants)='array' THEN p.variants ELSE '[]'::jsonb END) v
      WHERE COALESCE(p.has_variants,false)=true
    ) SELECT
      ((SELECT COUNT(*) FROM sku WHERE quantity>0 AND known_cost IS NULL)
        + (SELECT COUNT(*) FROM live p WHERE p.has_variants=true AND p.stock>0
           AND NOT EXISTS(SELECT 1 FROM sku s WHERE s.id=p.id AND s.quantity>0))) AS missing_stocked_costs,
      (SELECT COUNT(*) FROM live p WHERE COALESCE(p.stock,0)=0 AND COALESCE(p.price,0)=0
        AND (p.cost_price IS NULL OR p.cost_price_resolution='unresolved')
        AND NOT EXISTS(SELECT 1 FROM sku s WHERE s.id=p.id AND s.quantity>0)) AS empty_catalog_drafts
  `), "cost_coverage");
  const settlementSummary = one(await db.execute(sql`
    SELECT COUNT(*) AS affected_orders,
      CASE WHEN COUNT(*)=COUNT(f.merchant_net) THEN COALESCE(SUM(f.merchant_net),0) END AS recorded_net_iqd
    FROM public.order_financial_reconciliation_queue q
    JOIN public.orders o ON o.id=q.order_id AND COALESCE(o.is_test,false)=false
    LEFT JOIN public.order_accounting_facts f ON f.order_id=q.order_id
  `), "settlements");
  const settlements = rows(await db.execute(sql`
    SELECT q.order_id,q.order_number,q.cod_received,q.reconciliation_reason,f.period_key,f.merchant_net
    FROM public.order_financial_reconciliation_queue q
    JOIN public.orders o ON o.id=q.order_id AND COALESCE(o.is_test,false)=false
    LEFT JOIN public.order_accounting_facts f ON f.order_id=q.order_id
    ORDER BY f.recognized_at NULLS LAST,q.order_id LIMIT 200
  `));
  return buildFinancialTruth({ readiness, period, inventory, costCoverage, settlementSummary, settlements, periodKey });
}

/** One committed snapshot for every amount and warning. Never runs auto-close. */
export async function loadFinancialTruth(periodKey = currentFinancialMonth()): Promise<FinancialTruth> {
  const db = getDb();
  if (!db) throw Object.assign(new Error("تعذر الاتصال بمصدر الحسابات"), { statusCode: 503 });
  return db.transaction(async tx => {
    await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY`);
    await tx.execute(sql`SET LOCAL statement_timeout='12000'`);
    return readFinancialTruth(tx, periodKey);
  });
}

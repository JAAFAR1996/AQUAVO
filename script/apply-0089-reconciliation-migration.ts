import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const FILE = "0089_reconciliation_queue_integrity.sql";
const VERSION = "0089_reconciliation_queue_integrity";
const PREREQUISITE = "0088_allow_zero_stock_variant_shape_changes";
const CONFIRM = "APPLY_0089_RECONCILIATION";

function fileBody(): string {
  return readFileSync(join(process.cwd(), "migrations", FILE), "utf8");
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required");
  if (process.env.CONFIRM_RECONCILIATION_0089 !== CONFIRM) {
    throw new Error(`CONFIRM_RECONCILIATION_0089=${CONFIRM} is required`);
  }

  const body = fileBody();
  const checksum = sha256(body);
  const pool = new Pool({ connectionString, max: 1 });
  const client = await pool.connect();
  let locked = false;

  try {
    await client.query("SET lock_timeout='10s'");
    await client.query("SET statement_timeout='120s'");
    await client.query("SELECT pg_advisory_lock(hashtext('aquavo-0089-reconciliation'))");
    locked = true;

    const prerequisite = await client.query<{ active: boolean }>(
      `SELECT EXISTS(
         SELECT 1 FROM public.schema_migrations
         WHERE version=$1 AND rolled_back_at IS NULL
       ) AS active`,
      [PREREQUISITE],
    );
    if (!prerequisite.rows[0]?.active) {
      throw new Error(`Required migration is not active: ${PREREQUISITE}`);
    }

    const existing = await client.query<{ checksum: string }>(
      `SELECT checksum
         FROM public.schema_migrations
        WHERE version=$1 AND rolled_back_at IS NULL
        LIMIT 1`,
      [VERSION],
    );

    if (existing.rows[0]) {
      if (existing.rows[0].checksum !== checksum) {
        throw new Error(
          `${VERSION} is already active with a different checksum; refusing to normalize unknown SQL`,
        );
      }
      console.log(`[reconciliation-0089] already applied ${VERSION} ${checksum}`);
    } else {
      console.log(`[reconciliation-0089] apply ${VERSION}`);
      await client.query(body);

      const updated = await client.query(
        `UPDATE public.schema_migrations
            SET checksum=$2,
                notes=CASE
                  WHEN COALESCE(notes,'') LIKE '%[runner-verified file sha256]%'
                    THEN notes
                  ELSE COALESCE(notes,'') || ' [runner-verified file sha256]'
                END,
                rolled_back_at=NULL,
                applied_at=now()
          WHERE version=$1 AND rolled_back_at IS NULL
          RETURNING version`,
        [VERSION, checksum],
      );
      if (updated.rowCount !== 1) {
        throw new Error(`Cannot normalize ledger checksum for ${VERSION}`);
      }
    }

    const health = await client.query<{
      ledger_ok: boolean;
      finance_null_auto_ok: boolean;
      total_queue_arithmetic_only: boolean;
      invoice_rounding_ok: boolean;
      direct_cash_settlement_ok: boolean;
      no_test_orders_in_finance_queue: boolean;
      no_pre_cutover_orders_in_finance_queue: boolean;
      cost_history_backfill_count: number;
    }>(
      `SELECT
         EXISTS(
           SELECT 1 FROM public.schema_migrations
           WHERE version=$1 AND rolled_back_at IS NULL AND checksum=$2
         ) AS ledger_ok,
         pg_get_viewdef('public.order_financial_reconciliation'::regclass,true)
           NOT ILIKE '%financial_counting_undecided%'
           AS finance_null_auto_ok,
         pg_get_viewdef('public.order_total_reconciliation'::regclass,true)
           NOT ILIKE '%rounded_below_total%'
           AND pg_get_viewdef('public.order_total_reconciliation'::regclass,true)
             ILIKE '%formula_total_snapshot%'
           AS total_queue_arithmetic_only,
         pg_get_viewdef('public.manual_invoice_reconciliation_queue'::regclass,true)
           ILIKE '%ceil(%/ 250.0%'
           AS invoice_rounding_ok,
         pg_get_viewdef('public.v_order_accounting'::regclass,true)
           ILIKE '%not_required%'
           AS direct_cash_settlement_ok,
         NOT EXISTS(
           SELECT 1
           FROM public.order_financial_reconciliation_queue q
           JOIN public.orders o ON o.id=q.order_id
           WHERE COALESCE(o.is_test,false)=true
         ) AS no_test_orders_in_finance_queue,
         NOT EXISTS(
           SELECT 1
           FROM public.order_financial_reconciliation_queue q
           JOIN public.orders o ON o.id=q.order_id
           WHERE COALESCE(o.delivered_at,o.created_at) < public.aquavo_active_cutover()
         ) AS no_pre_cutover_orders_in_finance_queue,
         (
           SELECT COUNT(*)::int
           FROM public.product_cost_history
           WHERE product_id IN (
             'houyi-ceramic-ring',
             'houyi-breathing-ring-white',
             'houyi-feeding-cup'
           )
             AND reason='variant_collapse_top_level_cost_sync'
         ) AS cost_history_backfill_count`,
      [VERSION, checksum],
    );

    const checks = health.rows[0];
    if (
      !checks
      || checks.ledger_ok !== true
      || checks.finance_null_auto_ok !== true
      || checks.total_queue_arithmetic_only !== true
      || checks.invoice_rounding_ok !== true
      || checks.direct_cash_settlement_ok !== true
      || checks.no_test_orders_in_finance_queue !== true
      || checks.no_pre_cutover_orders_in_finance_queue !== true
      || Number(checks.cost_history_backfill_count) !== 3
    ) {
      throw new Error(`Reconciliation migration health failed: ${JSON.stringify(checks)}`);
    }

    console.log(`[reconciliation-0089] verified ${VERSION} ${checksum}`);
  } finally {
    if (locked) {
      await client
        .query("SELECT pg_advisory_unlock(hashtext('aquavo-0089-reconciliation'))")
        .catch(() => undefined);
    }
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("[reconciliation-0089] failed", error);
  process.exitCode = 1;
});

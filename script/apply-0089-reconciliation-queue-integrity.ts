import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const FILE = "0089_reconciliation_queue_integrity.sql";
const VERSION = "0089_reconciliation_queue_integrity";
const PREREQUISITE = "0088_allow_zero_stock_variant_shape_changes";
const CONFIRM = "APPLY_0089_RECONCILIATION_QUEUE";

function fileBody(): string {
  return readFileSync(join(process.cwd(), "migrations", FILE), "utf8");
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required");
  if (process.env.CONFIRM_RECONCILIATION_QUEUE !== CONFIRM) {
    throw new Error(`CONFIRM_RECONCILIATION_QUEUE=${CONFIRM} is required`);
  }

  const body = fileBody();
  const checksum = sha256(body);
  const pool = new Pool({ connectionString, max: 1 });
  const client = await pool.connect();
  let locked = false;

  try {
    await client.query("SET lock_timeout='10s'");
    await client.query("SET statement_timeout='120s'");
    await client.query("SELECT pg_advisory_lock(hashtext('aquavo-0089-reconciliation-queue'))");
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
      console.log(`[reconciliation-queue] already applied ${VERSION} ${checksum}`);
    } else {
      console.log(`[reconciliation-queue] apply ${VERSION}`);
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
      no_test_finance_rows: boolean;
      no_null_auto_false_positive: boolean;
      total_queue_is_arithmetic_only: boolean;
      manual_invoice_queue_is_real_conflict_only: boolean;
      collapsed_cost_history_reconciled: boolean;
    }>(
      `SELECT
         EXISTS(
           SELECT 1 FROM public.schema_migrations
           WHERE version=$1 AND rolled_back_at IS NULL AND checksum=$2
         ) AS ledger_ok,
         NOT EXISTS(
           SELECT 1
           FROM public.order_financial_reconciliation_queue q
           JOIN public.orders o ON o.id=q.order_id
           WHERE COALESCE(o.is_test,false)=true
         ) AS no_test_finance_rows,
         NOT EXISTS(
           SELECT 1
           FROM public.order_financial_reconciliation
           WHERE reconciliation_reason='financial_counting_undecided'
         ) AS no_null_auto_false_positive,
         NOT EXISTS(
           SELECT 1
           FROM public.order_total_reconciliation_queue
           WHERE items_subtotal_snapshot IS NOT NULL
             AND abs(formula_delta)<=1
         ) AS total_queue_is_arithmetic_only,
         NOT EXISTS(
           SELECT 1
           FROM public.manual_invoice_reconciliation_queue
           WHERE reconciliation_reason='total_formula_mismatch'
             AND (
               total=calculated_total
               OR total=ceil(calculated_total/250.0)*250
             )
         ) AS manual_invoice_queue_is_real_conflict_only,
         NOT EXISTS(
           SELECT 1
           FROM public.product_cost_reconciliation_queue
           WHERE product_id IN (
             'houyi-ceramic-ring',
             'houyi-breathing-ring-white',
             'houyi-feeding-cup'
           )
         ) AS collapsed_cost_history_reconciled`,
      [VERSION, checksum],
    );

    const checks = health.rows[0];
    if (!checks || Object.values(checks).some((value) => value !== true)) {
      throw new Error(`Reconciliation migration health failed: ${JSON.stringify(checks)}`);
    }

    console.log(`[reconciliation-queue] verified ${VERSION} ${checksum}`);
  } finally {
    if (locked) {
      await client
        .query("SELECT pg_advisory_unlock(hashtext('aquavo-0089-reconciliation-queue'))")
        .catch(() => undefined);
    }
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("[reconciliation-queue] failed", error);
  process.exitCode = 1;
});

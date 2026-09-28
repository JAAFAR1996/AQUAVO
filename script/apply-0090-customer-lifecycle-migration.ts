import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const FILE = "0090_customer_lifecycle_integrity.sql";
const VERSION = "0090_customer_lifecycle_integrity";
const PREREQUISITE = "0089_reconciliation_queue_integrity";
const CONFIRM = "APPLY_0090_CUSTOMER_LIFECYCLE";

function fileBody(): string {
  return readFileSync(join(process.cwd(), "migrations", FILE), "utf8");
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required");
  if (process.env.CONFIRM_CUSTOMER_LIFECYCLE_0090 !== CONFIRM) {
    throw new Error(`CONFIRM_CUSTOMER_LIFECYCLE_0090=${CONFIRM} is required`);
  }

  const body = fileBody();
  const checksum = sha256(body);
  const pool = new Pool({ connectionString, max: 1 });
  const client = await pool.connect();
  let locked = false;

  try {
    await client.query("SET lock_timeout='10s'");
    await client.query("SET statement_timeout='180s'");
    await client.query("SELECT pg_advisory_lock(hashtext('aquavo-0090-customer-lifecycle'))");
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
      console.log(`[lifecycle-0090] already applied ${VERSION} ${checksum}`);
    } else {
      console.log(`[lifecycle-0090] apply ${VERSION}`);
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
      attribution_columns: number;
      profile_groups: number;
      expected_phone_groups: number;
      missing_profiles: number;
      order_count_mismatches: number;
      purchase_count_mismatches: number;
      spent_mismatches: number;
      stale_active_carts: number;
      pending_legacy_logistics: number;
      inventory_gl_diff: number;
    }>(
      `WITH expected AS (
         SELECT public.aquavo_normalize_iraqi_phone(customer_phone) phone,
                count(*)::int total_orders,
                count(*) FILTER (WHERE status='delivered')::int purchases,
                COALESCE(sum(COALESCE(rounded_total,total)) FILTER (WHERE status='delivered'),0)::int spent
           FROM public.orders
          WHERE COALESCE(is_test,false)=false
            AND public.aquavo_normalize_iraqi_phone(customer_phone) IS NOT NULL
          GROUP BY 1
       )
       SELECT
         EXISTS(
           SELECT 1 FROM public.schema_migrations
           WHERE version=$1 AND rolled_back_at IS NULL AND checksum=$2
         ) AS ledger_ok,
         (
           SELECT COUNT(*)::int
           FROM information_schema.columns
           WHERE table_schema='public'
             AND table_name='orders'
             AND column_name IN (
               'view_session_id','aq_sid','attribution_utm_source','attribution_utm_medium',
               'attribution_utm_campaign','attribution_utm_content','attribution_utm_term',
               'attribution_fbclid','attribution_gclid','attribution_ttclid','attribution_igshid',
               'aq_campaign_id','aq_adset_id','aq_ad_id','aq_creative_id','aq_concept_id',
               'aq_hypothesis_id','aq_experiment_id','attribution_captured_at',
               'first_touch_utm_source','first_touch_utm_medium','first_touch_utm_campaign',
               'first_touch_aq_campaign_id','first_touch_captured_at'
             )
         ) AS attribution_columns,
         (SELECT COUNT(*)::int FROM public.customer_profiles) AS profile_groups,
         (SELECT COUNT(*)::int FROM expected) AS expected_phone_groups,
         (
           SELECT COUNT(*)::int
           FROM expected e
           LEFT JOIN public.customer_profiles p USING(phone)
           WHERE p.phone IS NULL
         ) AS missing_profiles,
         (
           SELECT COUNT(*)::int
           FROM expected e
           JOIN public.customer_profiles p USING(phone)
           WHERE e.total_orders<>p.total_orders_count
         ) AS order_count_mismatches,
         (
           SELECT COUNT(*)::int
           FROM expected e
           JOIN public.customer_profiles p USING(phone)
           WHERE e.purchases<>COALESCE(p.total_purchases,0)
         ) AS purchase_count_mismatches,
         (
           SELECT COUNT(*)::int
           FROM expected e
           JOIN public.customer_profiles p USING(phone)
           WHERE e.spent<>p.total_spent_iqd
         ) AS spent_mismatches,
         (
           SELECT COUNT(*)::int
           FROM public.cart_sessions
           WHERE status='active'
             AND updated_at < now()-interval '24 hours'
         ) AS stale_active_carts,
         (
           SELECT COUNT(*)::int
           FROM public.event_bus
           WHERE event_type='new_order_received' AND status='pending'
         ) AS pending_legacy_logistics,
         (
           SELECT difference_iqd::numeric
           FROM public.v_accounting_inventory_asset_reconciliation
         ) AS inventory_gl_diff`,
      [VERSION, checksum],
    );

    const checks = health.rows[0];
    if (
      !checks
      || checks.ledger_ok !== true
      || Number(checks.attribution_columns) !== 24
      || Number(checks.profile_groups) !== Number(checks.expected_phone_groups)
      || Number(checks.missing_profiles) !== 0
      || Number(checks.order_count_mismatches) !== 0
      || Number(checks.purchase_count_mismatches) !== 0
      || Number(checks.spent_mismatches) !== 0
      || Number(checks.stale_active_carts) !== 0
      || Number(checks.inventory_gl_diff) !== 0
    ) {
      throw new Error(`Customer lifecycle migration health failed: ${JSON.stringify(checks)}`);
    }

    // pending_legacy_logistics can only reappear if an older application build
    // created an order between additive migration application and application
    // rollout. Report it explicitly; the post-deploy audit closes that narrow
    // rollout window without guessing any financial fact.
    if (Number(checks.pending_legacy_logistics) > 0) {
      console.warn(
        `[lifecycle-0090] ${checks.pending_legacy_logistics} legacy logistics events appeared during rollout window`,
      );
    }

    console.log(`[lifecycle-0090] verified ${VERSION} ${checksum}`);
  } finally {
    if (locked) {
      await client
        .query("SELECT pg_advisory_unlock(hashtext('aquavo-0090-customer-lifecycle'))")
        .catch(() => undefined);
    }
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("[lifecycle-0090] failed", error);
  process.exitCode = 1;
});

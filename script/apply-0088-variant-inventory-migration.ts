import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const FILE = "0088_allow_zero_stock_variant_shape_changes.sql";
const VERSION = "0088_allow_zero_stock_variant_shape_changes";
const PREREQUISITE = "0087_accounting_carton_adjustment_inventory_reconciliation";
const CONFIRM = "APPLY_0088_VARIANT_INVENTORY";

function fileBody(): string {
  return readFileSync(join(process.cwd(), "migrations", FILE), "utf8");
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required");
  if (process.env.CONFIRM_VARIANT_INVENTORY !== CONFIRM) {
    throw new Error(`CONFIRM_VARIANT_INVENTORY=${CONFIRM} is required`);
  }

  const body = fileBody();
  const checksum = sha256(body);
  const pool = new Pool({ connectionString, max: 1 });
  const client = await pool.connect();
  let locked = false;

  try {
    await client.query("SET lock_timeout='10s'");
    await client.query("SET statement_timeout='120s'");
    await client.query("SELECT pg_advisory_lock(hashtext('aquavo-0088-variant-inventory'))");
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
      console.log(`[variant-inventory] already applied ${VERSION} ${checksum}`);
    } else {
      console.log(`[variant-inventory] apply ${VERSION}`);
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
      inventory_guard: boolean;
      active_variant_identity_guard: boolean;
      reconciliation_default_release: boolean;
    }>(
      `SELECT
         EXISTS(
           SELECT 1 FROM public.schema_migrations
           WHERE version=$1 AND rolled_back_at IS NULL AND checksum=$2
         ) AS ledger_ok,
         to_regprocedure('public.guard_products_inventory_direct_write()') IS NOT NULL
           AS inventory_guard,
         pg_get_functiondef('public.guard_products_inventory_direct_write()'::regprocedure)
           ILIKE '%COALESCE(OLD.has_variants,false)%'
           AND pg_get_functiondef('public.guard_products_inventory_direct_write()'::regprocedure)
           ILIKE '%COALESCE(NEW.has_variants,false)%'
           AS active_variant_identity_guard,
         pg_get_functiondef('public.sync_product_variant_reconciliation()'::regprocedure)
           ILIKE '%is_active=false%'
           AND pg_get_functiondef('public.sync_product_variant_reconciliation()'::regprocedure)
           ILIKE '%is_default=false%'
           AS reconciliation_default_release`,
      [VERSION, checksum],
    );

    const checks = health.rows[0];
    if (!checks || Object.values(checks).some((value) => value !== true)) {
      throw new Error(`Variant inventory migration health failed: ${JSON.stringify(checks)}`);
    }

    console.log(`[variant-inventory] verified ${VERSION} ${checksum}`);
  } finally {
    if (locked) {
      await client
        .query("SELECT pg_advisory_unlock(hashtext('aquavo-0088-variant-inventory'))")
        .catch(() => undefined);
    }
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("[variant-inventory] failed", error);
  process.exitCode = 1;
});

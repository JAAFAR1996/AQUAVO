import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const FILE = "0091_retire_legacy_logistics_event_bus.sql";
const VERSION = "0091_retire_legacy_logistics_event_bus";
const PREREQUISITE = "0090_customer_lifecycle_integrity";
const CONFIRM = "APPLY_0091_LEGACY_LOGISTICS_GUARD";

function fileBody(): string {
  return readFileSync(join(process.cwd(), "migrations", FILE), "utf8");
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required");
  if (process.env.CONFIRM_LEGACY_LOGISTICS_0091 !== CONFIRM) {
    throw new Error(`CONFIRM_LEGACY_LOGISTICS_0091=${CONFIRM} is required`);
  }

  const body = fileBody();
  const checksum = createHash("sha256").update(body).digest("hex");
  const pool = new Pool({ connectionString, max: 1 });
  const client = await pool.connect();
  let locked = false;

  try {
    await client.query("SET lock_timeout='10s'");
    await client.query("SET statement_timeout='60s'");
    await client.query("SELECT pg_advisory_lock(hashtext('aquavo-0091-legacy-logistics'))");
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
    } else {
      await client.query(body);
      const normalized = await client.query(
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
      if (normalized.rowCount !== 1) {
        throw new Error(`Cannot normalize ledger checksum for ${VERSION}`);
      }
    }

    const health = await client.query<{
      ledger_ok: boolean;
      guard_trigger: boolean;
      pending_legacy: number;
    }>(
      `SELECT
         EXISTS(
           SELECT 1 FROM public.schema_migrations
           WHERE version=$1 AND rolled_back_at IS NULL AND checksum=$2
         ) AS ledger_ok,
         EXISTS(
           SELECT 1
           FROM pg_trigger
           WHERE tgname='event_bus_retire_legacy_logistics'
             AND NOT tgisinternal
         ) AS guard_trigger,
         (
           SELECT COUNT(*)::int
           FROM public.event_bus
           WHERE event_type='new_order_received'
             AND status='pending'
         ) AS pending_legacy`,
      [VERSION, checksum],
    );

    const checks = health.rows[0];
    if (
      !checks
      || checks.ledger_ok !== true
      || checks.guard_trigger !== true
      || Number(checks.pending_legacy) !== 0
    ) {
      throw new Error(`Legacy logistics guard health failed: ${JSON.stringify(checks)}`);
    }

    console.log(`[legacy-logistics-0091] verified ${VERSION} ${checksum}`);
  } finally {
    if (locked) {
      await client
        .query("SELECT pg_advisory_unlock(hashtext('aquavo-0091-legacy-logistics'))")
        .catch(() => undefined);
    }
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("[legacy-logistics-0091] failed", error);
  process.exitCode = 1;
});

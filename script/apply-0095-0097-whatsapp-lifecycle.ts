import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Pool, neonConfig, type PoolClient } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const CONFIRM = "APPLY_WHATSAPP_LIFECYCLE_0095_0097";
const ZERO_CHECKSUM = "0".repeat(64);
const MIGRATIONS = [
  {
    version: "0095_wayl_delivery_accounting",
    file: "0095_wayl_delivery_accounting.sql",
  },
  {
    version: "0096_whatsapp_customer_text_replies",
    file: "0096_whatsapp_customer_text_replies.sql",
  },
  {
    version: "0097_whatsapp_lifecycle_fail_closed",
    file: "0097_whatsapp_lifecycle_fail_closed.sql",
  },
] as const;

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function migrationBody(file: string): string {
  return readFileSync(join(process.cwd(), "migrations", file), "utf8");
}

function stripOuterTransaction(body: string): string {
  return body
    .replace(/^\s*BEGIN;\s*/i, "")
    .replace(/\s*COMMIT;\s*$/i, "")
    .trim();
}

async function requirePrerequisites(client: PoolClient): Promise<void> {
  const result = await client.query<{ version: string }>(
    `SELECT version
       FROM public.schema_migrations
      WHERE rolled_back_at IS NULL
        AND version = ANY($1::text[])`,
    [[
      "20260825_alqaseh_online_accounting",
      "0093_whatsapp_lifecycle_automation",
      "0094_repurchase_per_product_automation",
    ]],
  );
  const active = new Set(result.rows.map((row) => row.version));
  const required = [
    "20260825_alqaseh_online_accounting",
    "0093_whatsapp_lifecycle_automation",
    "0094_repurchase_per_product_automation",
  ];
  const missing = required.filter((version) => !active.has(version));
  if (missing.length > 0) {
    throw new Error(`Missing prerequisite migrations: ${missing.join(", ")}`);
  }
}

async function verifyAppliedShape(client: PoolClient, version: string): Promise<boolean> {
  if (version === "0095_wayl_delivery_accounting") {
    const result = await client.query<{ ok: boolean }>(`
      SELECT
        pg_get_functiondef('public.record_order_delivery_accounting()'::regprocedure)
          ILIKE '%v7_wayl_online_accounting%'
        AND pg_get_functiondef('public.record_order_delivery_accounting()'::regprocedure)
          ILIKE '%wayl%'
        AND pg_get_functiondef('public.post_order_delivery_journal(text)'::regprocedure)
          ILIKE '%1010%'
        AS ok
    `);
    return result.rows[0]?.ok === true;
  }

  if (version === "0096_whatsapp_customer_text_replies") {
    const result = await client.query<{ ok: boolean }>(`
      SELECT to_regclass('public.whatsapp_customer_text_events') IS NOT NULL AS ok
    `);
    return result.rows[0]?.ok === true;
  }

  if (version === "0097_whatsapp_lifecycle_fail_closed") {
    const result = await client.query<{ ok: boolean }>(`
      SELECT
        to_regclass('public.whatsapp_lifecycle_runtime_config') IS NOT NULL
        AND EXISTS(
          SELECT 1 FROM public.whatsapp_lifecycle_runtime_config WHERE id=1
        ) AS ok
    `);
    return result.rows[0]?.ok === true;
  }

  return false;
}

async function applyOne(
  client: PoolClient,
  version: string,
  file: string,
): Promise<{ appliedNow: boolean; checksum: string }> {
  const body = migrationBody(file);
  const checksum = sha256(body);
  const existing = await client.query<{ checksum: string }>(
    `SELECT checksum
       FROM public.schema_migrations
      WHERE version=$1 AND rolled_back_at IS NULL
      LIMIT 1`,
    [version],
  );

  if (existing.rows[0]) {
    const current = String(existing.rows[0].checksum ?? "");
    if (current === checksum) {
      console.log(`[whatsapp-lifecycle-migrate] skip ${version}: already verified`);
      return { appliedNow: false, checksum };
    }

    if (current !== ZERO_CHECKSUM || !(await verifyAppliedShape(client, version))) {
      throw new Error(
        `${version} is active with an unexpected checksum/state; refusing to normalize unknown SQL`,
      );
    }

    await client.query(
      `UPDATE public.schema_migrations
          SET checksum=$2,
              notes=CASE
                WHEN COALESCE(notes,'') LIKE '%[runner-verified file sha256]%'
                  THEN notes
                ELSE COALESCE(notes,'') || ' [runner-verified file sha256]'
              END,
              applied_at=now()
        WHERE version=$1 AND rolled_back_at IS NULL`,
      [version, checksum],
    );
    console.log(`[whatsapp-lifecycle-migrate] normalized ${version} ${checksum}`);
    return { appliedNow: false, checksum };
  }

  console.log(`[whatsapp-lifecycle-migrate] apply ${version}`);
  await client.query("BEGIN");
  try {
    await client.query(stripOuterTransaction(body));
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
      [version, checksum],
    );
    if (normalized.rowCount !== 1) {
      throw new Error(`Cannot normalize migration ledger for ${version}`);
    }
    await client.query("COMMIT");
    return { appliedNow: true, checksum };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  }
}

async function verifyFinalState(
  client: PoolClient,
  expectedChecksums: Map<string, string>,
  requireFailClosed: boolean,
): Promise<void> {
  const ledger = await client.query<{ version: string; checksum: string }>(
    `SELECT version,checksum
       FROM public.schema_migrations
      WHERE rolled_back_at IS NULL
        AND version = ANY($1::text[])`,
    [[...expectedChecksums.keys()]],
  );
  const actual = new Map(ledger.rows.map((row) => [row.version, row.checksum]));
  for (const [version, checksum] of expectedChecksums) {
    if (actual.get(version) !== checksum) {
      throw new Error(`Ledger verification failed for ${version}`);
    }
  }

  const health = await client.query<{
    wayl_accounting_ok: boolean;
    text_inbox_ok: boolean;
    runtime_config_ok: boolean;
    fail_closed: boolean;
  }>(`
    SELECT
      (
        pg_get_functiondef('public.record_order_delivery_accounting()'::regprocedure)
          ILIKE '%v7_wayl_online_accounting%'
        AND pg_get_functiondef('public.record_order_delivery_accounting()'::regprocedure)
          ILIKE '%alqaseh%'
        AND pg_get_functiondef('public.record_order_delivery_accounting()'::regprocedure)
          ILIKE '%wayl%'
      ) AS wayl_accounting_ok,
      (
        to_regclass('public.whatsapp_customer_text_events') IS NOT NULL
        AND EXISTS(
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema='public'
            AND table_name='whatsapp_customer_text_events'
            AND column_name='inbound_message_id'
        )
      ) AS text_inbox_ok,
      EXISTS(
        SELECT 1
        FROM public.whatsapp_lifecycle_runtime_config
        WHERE id=1
      ) AS runtime_config_ok,
      EXISTS(
        SELECT 1
        FROM public.whatsapp_lifecycle_runtime_config
        WHERE id=1
          AND lifecycle_enabled=false
          AND day7_enabled=false
          AND repurchase_enabled=false
          AND activation_at IS NULL
      ) AS fail_closed
  `);

  const checks = health.rows[0];
  if (
    !checks
    || checks.wayl_accounting_ok !== true
    || checks.text_inbox_ok !== true
    || checks.runtime_config_ok !== true
    || (requireFailClosed && checks.fail_closed !== true)
  ) {
    throw new Error(`WhatsApp lifecycle production health failed: ${JSON.stringify(checks)}`);
  }
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required");
  if (process.env.CONFIRM_WHATSAPP_LIFECYCLE_0095_0097 !== CONFIRM) {
    throw new Error(`CONFIRM_WHATSAPP_LIFECYCLE_0095_0097=${CONFIRM} is required`);
  }

  const pool = new Pool({ connectionString, max: 1 });
  const client = await pool.connect();
  let locked = false;

  try {
    await client.query("SET lock_timeout='10s'");
    await client.query("SET statement_timeout='180s'");
    await client.query("SELECT pg_advisory_lock(hashtext('aquavo-whatsapp-lifecycle-0095-0097'))");
    locked = true;

    await requirePrerequisites(client);

    const expectedChecksums = new Map<string, string>();
    let applied0097Now = false;
    for (const migration of MIGRATIONS) {
      const result = await applyOne(client, migration.version, migration.file);
      expectedChecksums.set(migration.version, result.checksum);
      if (migration.version === "0097_whatsapp_lifecycle_fail_closed" && result.appliedNow) {
        applied0097Now = true;
      }
    }

    await verifyFinalState(client, expectedChecksums, applied0097Now);
    console.log("[whatsapp-lifecycle-migrate] verified 0095-0097");
  } finally {
    if (locked) {
      await client
        .query("SELECT pg_advisory_unlock(hashtext('aquavo-whatsapp-lifecycle-0095-0097'))")
        .catch(() => undefined);
    }
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("[whatsapp-lifecycle-migrate] failed", error);
  process.exitCode = 1;
});

/**
 * SCHEMA READINESS GUARD
 * ======================
 * The order-creation path (`storage.createOrderSecure`) writes eight cost-snapshot
 * columns onto `order_items_relational` that were added by application commit
 * ff90377 (2026-07-22). Those columns only exist once
 * `migrations/add_order_item_cost_snapshot.sql` has been applied.
 *
 * If this application version receives traffic BEFORE that migration runs, every
 * storefront checkout fails at the INSERT — one broken order per real customer,
 * discovered one at a time. That is strictly worse than refusing traffic.
 *
 * So: fail readiness loudly and up front, rather than accepting traffic and
 * failing individual customer orders.
 *
 * Deployment order is therefore: migration #1 → THEN this app version.
 * See docs/audit/pre-neon-readiness.md (deployment matrix).
 */

import { sql } from "drizzle-orm";

/** Columns `createOrderSecure` writes that require add_order_item_cost_snapshot.sql. */
export const REQUIRED_ORDER_ITEM_COLUMNS = [
  "unit_cost_price",
  "unit_packaging_cost",
  "unit_insert_cost",
  "cost_snapshot_status",
  "cost_snapshot_source",
  "cost_snapshot_version",
  "cost_snapshot_at",
] as const;

export interface SchemaReadiness {
  ready: boolean;
  /** Columns the app needs that the database does not have. */
  missingColumns: string[];
  /** True when order creation is safe to serve. */
  orderCreationEnabled: boolean;
  checkedAt: string;
  detail: string;
}

type Queryable = { execute: (q: unknown) => Promise<unknown> };

function rowsOf(result: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(result)) return result as Array<Record<string, unknown>>;
  const r = result as { rows?: Array<Record<string, unknown>> };
  return r?.rows ?? [];
}

/**
 * Inspect the live schema. Never throws — a probe failure reports NOT ready
 * rather than crashing the process, so the platform can retry.
 */
export async function checkSchemaReadiness(db: Queryable): Promise<SchemaReadiness> {
  const checkedAt = new Date().toISOString();
  try {
    const result = await db.execute(sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'order_items_relational'
    `);
    const present = new Set(rowsOf(result).map((r) => String(r.column_name)));
    const missingColumns = REQUIRED_ORDER_ITEM_COLUMNS.filter((c) => !present.has(c));

    if (present.size === 0) {
      return {
        ready: false, missingColumns: [...REQUIRED_ORDER_ITEM_COLUMNS],
        orderCreationEnabled: false, checkedAt,
        detail: "order_items_relational not found — database is not initialised for this app version.",
      };
    }
    if (missingColumns.length > 0) {
      return {
        ready: false, missingColumns, orderCreationEnabled: false, checkedAt,
        detail:
          `Missing ${missingColumns.length} cost-snapshot column(s): ${missingColumns.join(", ")}. ` +
          "Apply migrations/add_order_item_cost_snapshot.sql BEFORE routing traffic to this " +
          "app version — order creation writes these columns and would fail per-order.",
      };
    }
    return {
      ready: true, missingColumns: [], orderCreationEnabled: true, checkedAt,
      detail: "Schema satisfies this application version.",
    };
  } catch (err) {
    return {
      ready: false, missingColumns: [], orderCreationEnabled: false, checkedAt,
      detail: `Schema readiness probe failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/** Cached result — the schema cannot change under a running process. */
let cached: SchemaReadiness | null = null;

export async function getSchemaReadiness(db: Queryable, force = false): Promise<SchemaReadiness> {
  if (!cached || force) cached = await checkSchemaReadiness(db);
  return cached;
}

/** Test seam. */
export function __resetSchemaReadinessCache(): void {
  cached = null;
}

/**
 * Guard for the order-creation route. Throws a 503-shaped error when the schema
 * is behind the application, so the failure is a clear deployment fault rather
 * than an opaque per-customer column error.
 */
export function assertOrderCreationReady(readiness: SchemaReadiness): void {
  if (!readiness.orderCreationEnabled) {
    const e = new Error(`Order creation disabled — schema not ready. ${readiness.detail}`) as Error & {
      status?: number; code?: string;
    };
    e.status = 503;
    e.code = "SCHEMA_NOT_READY";
    throw e;
  }
}

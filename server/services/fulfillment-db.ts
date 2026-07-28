// ─────────────────────────────────────────────────────────────────────────────
// Typed database contract for the money-critical fulfillment services.
//
// Replaces the previous `type Db = any`. Both the production driver
// (NeonDatabase<typeof schema>) and the integration-test driver
// (PgliteDatabase<typeof schema>) are structural subtypes of Drizzle's
// `PgDatabase`, so ONE typed contract covers both — and a typo in a column name
// or a wrong operand type is now a compile error inside these services.
// ─────────────────────────────────────────────────────────────────────────────
import type { PgDatabase, PgQueryResultHKT, PgTransaction } from "drizzle-orm/pg-core";
import type { ExtractTablesWithRelations } from "drizzle-orm";
import * as schema from "../../shared/schema.js";

export type FulfillmentSchema = typeof schema;
export type FulfillmentRelations = ExtractTablesWithRelations<FulfillmentSchema>;

/**
 * The operations these services require: select / insert / update / delete /
 * transaction / execute. Every Drizzle pg driver exposes exactly this surface.
 */
export type FulfillmentDb = PgDatabase<PgQueryResultHKT, FulfillmentSchema, FulfillmentRelations>;

/** The transaction handle passed to `db.transaction(async (tx) => …)`. */
export type FulfillmentTx = PgTransaction<PgQueryResultHKT, FulfillmentSchema, FulfillmentRelations>;

/** Either a top-level connection or an open transaction — services accept both. */
export type FulfillmentExecutor = FulfillmentDb | FulfillmentTx;

// ── Typed row aliases (no `any` for event/movement/cost/draft rows) ──────────
export type EventRow = typeof schema.orderFulfillmentEvents.$inferSelect;
export type EventInsert = typeof schema.orderFulfillmentEvents.$inferInsert;
export type LineRow = typeof schema.orderFulfillmentLines.$inferSelect;
export type LineInsert = typeof schema.orderFulfillmentLines.$inferInsert;
export type MovementRow = typeof schema.packagingInventoryMovements.$inferSelect;
export type MovementInsert = typeof schema.packagingInventoryMovements.$inferInsert;
export type MaterialRow = typeof schema.fulfillmentMaterials.$inferSelect;
export type PurchaseRow = typeof schema.packagingPurchases.$inferSelect;
export type CostRecordRow = typeof schema.materialCostRecords.$inferSelect;
export type CostRecordInsert = typeof schema.materialCostRecords.$inferInsert;
export type ProfileFamilyRow = typeof schema.packagingProfileFamilies.$inferSelect;
export type ProfileVersionRow = typeof schema.packagingProfiles.$inferSelect;
export type ProfileItemRow = typeof schema.packagingProfileItems.$inferSelect;
export type DraftRow = typeof schema.fulfillmentPreparationDrafts.$inferSelect;
export type DraftInsert = typeof schema.fulfillmentPreparationDrafts.$inferInsert;
export type DraftLineRow = typeof schema.fulfillmentPreparationDraftLines.$inferSelect;
export type DraftLineInsert = typeof schema.fulfillmentPreparationDraftLines.$inferInsert;

// ── Postgres error classification (bounded retry only for genuine conflicts) ──
export const PG_ERRORS = {
  UNIQUE_VIOLATION: "23505",
  SERIALIZATION_FAILURE: "40001",
  DEADLOCK_DETECTED: "40P01",
} as const;

interface PgErrorLike { code?: unknown; cause?: unknown; message?: unknown }

/** Extract a Postgres SQLSTATE from a driver error (drivers nest it differently). */
export function pgErrorCode(err: unknown): string | undefined {
  let cur: unknown = err;
  for (let depth = 0; depth < 5 && cur && typeof cur === "object"; depth++) {
    const code = (cur as PgErrorLike).code;
    if (typeof code === "string") return code;
    cur = (cur as PgErrorLike).cause;
  }
  return undefined;
}

/** True only for transient conflicts that a bounded retry can legitimately fix. */
export function isRetryableConflict(err: unknown): boolean {
  const code = pgErrorCode(err);
  if (code === PG_ERRORS.SERIALIZATION_FAILURE || code === PG_ERRORS.DEADLOCK_DETECTED) return true;
  if (code === PG_ERRORS.UNIQUE_VIOLATION) return true;
  // PGlite surfaces some errors without a SQLSTATE — fall back to the message.
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return /duplicate key value|could not serialize|deadlock detected/i.test(msg);
}

/** True when the error is specifically a unique-constraint violation. */
export function isUniqueViolation(err: unknown): boolean {
  if (pgErrorCode(err) === PG_ERRORS.UNIQUE_VIOLATION) return true;
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return /duplicate key value/i.test(msg);
}

/**
 * Run `fn` with a BOUNDED retry, retrying ONLY genuine serialization / unique
 * conflicts. Business errors (insufficient stock, already-reversed, …) never retry.
 */
export async function withBoundedRetry<T>(
  fn: (attempt: number) => Promise<T>,
  { maxAttempts = 3 }: { maxAttempts?: number } = {},
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastErr = err;
      if (attempt === maxAttempts || !isRetryableConflict(err)) throw err;
    }
  }
  throw lastErr;
}

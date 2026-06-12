import { and, desc, eq, gte, lte } from "drizzle-orm";
import { getDb } from "../db.js";
import { accountingAuditTrail } from "../../shared/schema.js";
import type { Request } from "express";

type Db = NonNullable<ReturnType<typeof getDb>>;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

export type FinancialEntityType =
  | "order"
  | "expense"
  | "settlement"
  | "return_event"
  | "manual_invoice"
  | "product_cost";

export type FinancialAction = "create" | "update" | "delete" | "status_change";

export interface FinancialChange {
  entityType: FinancialEntityType;
  entityId: string;
  action: FinancialAction;
  /** The specific field changed (e.g. "boxCost"). Omit for whole-row create/delete. */
  fieldName?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  /** Why the change was made. Required by callers for manual edits. */
  reason?: string | null;
  performedBy?: string | null;
  performedByName?: string | null;
}

/** Extract the acting admin's identity from the request, with sane fallbacks. */
export function actorFromRequest(req: Request): { id: string | null; name: string | null } {
  const anyReq = req as unknown as {
    user?: { id?: string; name?: string; username?: string; email?: string };
    session?: { userId?: string; userName?: string };
  };
  const id = anyReq.user?.id ?? anyReq.session?.userId ?? null;
  const name =
    anyReq.user?.name ??
    anyReq.user?.username ??
    anyReq.user?.email ??
    anyReq.session?.userName ??
    null;
  return { id, name };
}

/**
 * Record a single financial mutation. Append-only; never throws into the caller's
 * critical path silently — pass a `tx` to make it atomic with the mutation itself.
 */
export async function recordFinancialChange(
  dbOrTx: Db | Tx,
  change: FinancialChange,
): Promise<void> {
  await dbOrTx.insert(accountingAuditTrail).values({
    entityType: change.entityType,
    entityId: change.entityId,
    action: change.action,
    fieldName: change.fieldName ?? null,
    oldValueJson: change.oldValue === undefined ? null : (change.oldValue as object),
    newValueJson: change.newValue === undefined ? null : (change.newValue as object),
    reason: change.reason?.trim() || null,
    performedBy: change.performedBy ?? null,
    performedByName: change.performedByName ?? null,
  });
}

export interface AuditTrailFilter {
  entityType?: FinancialEntityType;
  entityId?: string;
  start?: Date;
  end?: Date;
  limit?: number;
}

/** List the financial audit trail, newest first. */
export async function listFinancialAuditTrail(db: Db, filter: AuditTrailFilter = {}) {
  const conditions = [] as ReturnType<typeof eq>[];
  if (filter.entityType) conditions.push(eq(accountingAuditTrail.entityType, filter.entityType));
  if (filter.entityId) conditions.push(eq(accountingAuditTrail.entityId, filter.entityId));
  if (filter.start) conditions.push(gte(accountingAuditTrail.createdAt, filter.start));
  if (filter.end) conditions.push(lte(accountingAuditTrail.createdAt, filter.end));

  const rows = await db
    .select()
    .from(accountingAuditTrail)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(accountingAuditTrail.createdAt))
    .limit(Math.min(filter.limit ?? 200, 1000));

  return rows.map((r) => ({
    id: r.id,
    entityType: r.entityType,
    entityId: r.entityId,
    action: r.action,
    fieldName: r.fieldName,
    oldValue: r.oldValueJson,
    newValue: r.newValueJson,
    reason: r.reason,
    performedBy: r.performedBy,
    performedByName: r.performedByName,
    createdAt: (r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt)).toISOString(),
  }));
}

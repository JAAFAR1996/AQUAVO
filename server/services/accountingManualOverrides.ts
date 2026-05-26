import { randomUUID } from "crypto";
import { eq, and, desc } from "drizzle-orm";
import { getDb } from "../db.js";
import {
  accountingManualAdjustments,
  accountingReviewFlags,
  type InsertAccountingManualAdjustment,
} from "../../shared/schema.js";
import type { ManualAdjustmentCreate } from "../../shared/accounting.js";

type Db = NonNullable<ReturnType<typeof getDb>>;

function db(): Db {
  const d = getDb();
  if (!d) throw new Error("DB unavailable");
  return d;
}

// Returns the most recent approved/applied adjustment for a given entity+field, or null.
export async function getApprovedOverride(
  entityType: string,
  entityId: string,
  fieldName: string,
) {
  const rows = await db()
    .select()
    .from(accountingManualAdjustments)
    .where(
      and(
        eq(accountingManualAdjustments.entityType, entityType),
        eq(accountingManualAdjustments.entityId, entityId),
        eq(accountingManualAdjustments.fieldName, fieldName),
      ),
    )
    .orderBy(desc(accountingManualAdjustments.createdAt));

  return rows.find((r) => r.status === "applied" || r.status === "approved") ?? null;
}

// Returns the override value if an approved/applied adjustment exists, else the auto-computed value.
export async function applyOverrideToFinanceValue<T>(
  entityType: string,
  entityId: string,
  fieldName: string,
  autoValue: T,
): Promise<{ value: T; overridden: boolean; override: typeof accountingManualAdjustments.$inferSelect | null }> {
  const override = await getApprovedOverride(entityType, entityId, fieldName);
  if (override) {
    return { value: override.newValueJson as T, overridden: true, override };
  }
  return { value: autoValue, overridden: false, override: null };
}

export async function createAdjustment(
  input: ManualAdjustmentCreate,
  createdBy: string,
) {
  // AI/automated callers must never reach this; route layer blocks x-ai-agent.
  const row: InsertAccountingManualAdjustment = {
    id: randomUUID(),
    entityType: input.entityType,
    entityId: input.entityId,
    fieldName: input.fieldName,
    oldValueJson: input.oldValueJson ?? null,
    newValueJson: input.newValueJson,
    reason: input.reason,
    status: "pending",
    createdBy,
    note: input.note ?? null,
  };
  await db().insert(accountingManualAdjustments).values(row as any);
  return row;
}

export async function approveAdjustment(id: string, approvedBy: string) {
  await db()
    .update(accountingManualAdjustments)
    .set({ status: "approved", approvedBy, approvedAt: new Date() } as any)
    .where(eq(accountingManualAdjustments.id, id));
}

export async function rejectAdjustment(id: string, approvedBy: string) {
  await db()
    .update(accountingManualAdjustments)
    .set({ status: "rejected", approvedBy, approvedAt: new Date() } as any)
    .where(eq(accountingManualAdjustments.id, id));
}

export async function listAdjustments(filters?: { status?: string; entityType?: string }) {
  const rows = await db()
    .select()
    .from(accountingManualAdjustments)
    .orderBy(desc(accountingManualAdjustments.createdAt));

  return rows.filter((r) => {
    if (filters?.status && r.status !== filters.status) return false;
    if (filters?.entityType && r.entityType !== filters.entityType) return false;
    return true;
  });
}

export async function listReviewFlags(filters?: { status?: string; severity?: string }) {
  const rows = await db()
    .select()
    .from(accountingReviewFlags)
    .orderBy(desc(accountingReviewFlags.createdAt));

  return rows.filter((r) => {
    if (filters?.status && r.status !== filters.status) return false;
    if (filters?.severity && r.severity !== filters.severity) return false;
    return true;
  });
}

export async function updateReviewFlagStatus(
  id: string,
  status: "open" | "resolved" | "ignored",
  resolvedBy?: string,
) {
  await db()
    .update(accountingReviewFlags)
    .set({
      status,
      resolvedAt: status !== "open" ? new Date() : null,
      resolvedBy: status !== "open" ? (resolvedBy ?? null) : null,
    } as any)
    .where(eq(accountingReviewFlags.id, id));
}

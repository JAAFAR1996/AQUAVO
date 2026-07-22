// ─────────────────────────────────────────────────────────────────────────────
// Auditable material cost approval (item 6).
//
// The APPROVED COST RECORD is the source of truth. fulfillment_materials.
// current_unit_cost / current_cost_purchase_id are a denormalized MIRROR of the
// single active approved record — a DB trigger rejects any state where they
// contradict it, so the pair can never disagree again.
//
// Cost changes APPEND history: approving a new record supersedes the previous one
// (which stays, immutable, as evidence). Nothing is overwritten.
//   * unknown cost  → unit_cost stays NULL (never coerced to 0);
//   * verified zero → allowed, but only via an explicitly approved record with a reason.
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "node:crypto";
import { eq, and, isNull, desc } from "drizzle-orm";
import { getDb } from "../db.js";
import {
  fulfillmentMaterials, packagingPurchases, materialCostRecords,
} from "../../shared/schema.js";
import { toMoneyOrNull } from "../../shared/order-financials.js";
import type { FulfillmentDb, CostRecordRow, MaterialRow } from "./fulfillment-db.js";

export type CostBasis = "purchase_batch" | "verified_manual_standard";
export type CostApprovalStatus = "pending" | "approved" | "rejected" | "superseded";

function requireDb(dbArg?: FulfillmentDb): FulfillmentDb {
  const db = dbArg ?? (getDb() as FulfillmentDb | null);
  if (!db) throw new Error("Database not available");
  return db;
}

export interface ProposeCostInput {
  materialId: string;
  costBasis: CostBasis;
  /** Required for purchase_batch. The batch is the evidence for the cost. */
  purchaseId?: string | null;
  /** null = unknown (stays unknown). 0 = verified free — permitted only once approved. */
  unitCost: number | null;
  reason: string;
  evidenceUrl?: string | null;
  effectiveDate?: Date | null;
  createdBy?: string | null;
}

/** Record a PROPOSED cost. Nothing about the catalog changes until it is approved. */
export async function proposeMaterialCost(
  dbArg: FulfillmentDb | undefined,
  input: ProposeCostInput,
): Promise<CostRecordRow> {
  const db = requireDb(dbArg);
  if (!input.reason?.trim()) throw new Error("COST_REASON_REQUIRED: a cost record must state its reason");

  let unitCost = toMoneyOrNull(input.unitCost);
  if (input.costBasis === "purchase_batch") {
    if (!input.purchaseId) throw new Error("PURCHASE_REQUIRED: a purchase-batch cost must cite its batch");
    const [batch] = await db.select().from(packagingPurchases)
      .where(eq(packagingPurchases.id, input.purchaseId)).limit(1);
    if (!batch) throw new Error("PURCHASE_NOT_FOUND: the cited purchase batch does not exist");
    if (batch.materialId !== input.materialId) {
      throw new Error("PURCHASE_MATERIAL_MISMATCH: the batch belongs to a different material");
    }
    // Derive from the batch when the caller did not state a cost explicitly.
    if (unitCost == null) unitCost = derivePurchaseUnitCost(batch.totalCost, batch.quantity);
  }
  if (unitCost != null && unitCost < 0) throw new Error("NEGATIVE_COST: a unit cost cannot be negative");

  const row = {
    id: randomUUID(), materialId: input.materialId, costBasis: input.costBasis,
    purchaseId: input.purchaseId ?? null,
    unitCost: unitCost == null ? null : String(unitCost),
    approvalStatus: "pending" as const,
    effectiveDate: input.effectiveDate ?? new Date(),
    reason: input.reason.trim(), evidenceUrl: input.evidenceUrl ?? null,
    createdBy: input.createdBy ?? null,
  };
  await db.insert(materialCostRecords).values(row);
  const [created] = await db.select().from(materialCostRecords)
    .where(eq(materialCostRecords.id, row.id)).limit(1);
  return created!;
}

/** unit = total / quantity. Unknown total or non-positive quantity ⇒ unknown (NULL). */
export function derivePurchaseUnitCost(totalCost: unknown, quantity: unknown): number | null {
  const total = toMoneyOrNull(totalCost);
  const qty = Number(quantity);
  if (total == null || !Number.isFinite(qty) || qty <= 0) return null;
  return total / qty;
}

export interface ApproveCostInput {
  costRecordId: string;
  approvedBy: string;
  /** Required when approving a verified ZERO cost — a free material must be justified. */
  approvalNote?: string | null;
}

/**
 * Approve a cost record in ONE transaction: supersede the previous approved record,
 * mark this one approved, and re-point the catalog mirror at it. Idempotent —
 * approving an already-approved record returns it unchanged.
 */
export async function approveMaterialCost(
  dbArg: FulfillmentDb | undefined,
  input: ApproveCostInput,
): Promise<{ record: CostRecordRow; supersededId: string | null }> {
  const db = requireDb(dbArg);
  if (!input.approvedBy?.trim()) throw new Error("APPROVER_REQUIRED: a cost approval must name its approver");

  return await db.transaction(async (tx) => {
    const [rec] = await tx.select().from(materialCostRecords)
      .where(eq(materialCostRecords.id, input.costRecordId)).limit(1);
    if (!rec) throw new Error("COST_RECORD_NOT_FOUND");
    if (rec.approvalStatus === "approved") return { record: rec, supersededId: null };
    if (rec.approvalStatus !== "pending") {
      throw new Error(`COST_RECORD_NOT_PENDING: record is ${rec.approvalStatus}`);
    }

    const unitCost = toMoneyOrNull(rec.unitCost);
    if (unitCost === 0 && !(rec.reason?.trim() || input.approvalNote?.trim())) {
      throw new Error("ZERO_COST_NEEDS_JUSTIFICATION: a verified-zero cost must state why it is free");
    }

    // Supersede the currently active approved record (there is at most one).
    const [prev] = await tx.select().from(materialCostRecords).where(and(
      eq(materialCostRecords.materialId, rec.materialId),
      eq(materialCostRecords.approvalStatus, "approved"),
      isNull(materialCostRecords.supersededById),
    )).limit(1);

    const now = new Date();
    if (prev) {
      await tx.update(materialCostRecords)
        .set({ approvalStatus: "superseded", supersededById: rec.id, supersededAt: now })
        .where(eq(materialCostRecords.id, prev.id));
    }

    await tx.update(materialCostRecords)
      .set({ approvalStatus: "approved", approvedBy: input.approvedBy, approvedAt: now })
      .where(eq(materialCostRecords.id, rec.id));

    // Mirror onto the catalog. The DB trigger rejects any disagreement, so this is the
    // only path by which current_unit_cost / current_cost_purchase_id can ever change.
    await tx.update(fulfillmentMaterials).set({
      currentCostRecordId: rec.id,
      currentUnitCost: rec.unitCost,
      currentCostPurchaseId: rec.purchaseId,
      updatedAt: now,
    }).where(eq(fulfillmentMaterials.id, rec.materialId));

    const [updated] = await tx.select().from(materialCostRecords)
      .where(eq(materialCostRecords.id, rec.id)).limit(1);
    return { record: updated!, supersededId: prev?.id ?? null };
  });
}

/** Reject a pending proposal. Approved records are evidence and can never be rejected. */
export async function rejectMaterialCost(
  dbArg: FulfillmentDb | undefined,
  costRecordId: string,
  rejectedBy: string,
): Promise<CostRecordRow> {
  const db = requireDb(dbArg);
  const [rec] = await db.select().from(materialCostRecords)
    .where(eq(materialCostRecords.id, costRecordId)).limit(1);
  if (!rec) throw new Error("COST_RECORD_NOT_FOUND");
  if (rec.approvalStatus !== "pending") {
    throw new Error(`COST_RECORD_NOT_PENDING: record is ${rec.approvalStatus}`);
  }
  await db.update(materialCostRecords)
    .set({ approvalStatus: "rejected", createdBy: rec.createdBy, approvedBy: rejectedBy })
    .where(eq(materialCostRecords.id, costRecordId));
  const [updated] = await db.select().from(materialCostRecords)
    .where(eq(materialCostRecords.id, costRecordId)).limit(1);
  return updated!;
}

/** Full, ordered approval history for a material — the audit trail behind its cost. */
export async function getMaterialCostHistory(
  dbArg: FulfillmentDb | undefined,
  materialId: string,
): Promise<CostRecordRow[]> {
  const db = requireDb(dbArg);
  return await db.select().from(materialCostRecords)
    .where(eq(materialCostRecords.materialId, materialId))
    .orderBy(desc(materialCostRecords.createdAt));
}

export interface ApprovedCost {
  materialId: string;
  unitCost: number | null;      // null = UNKNOWN. 0 = verified free.
  costRecordId: string | null;
  costBasis: CostBasis | null;
  approvedAt: string | null;
  approvedBy: string | null;
  /** "approved" when backed by an approved record; "unknown" when there is none. */
  status: "approved" | "unknown";
}

/** The single active approved cost for a material, or an explicit unknown. */
export async function getApprovedCost(
  dbArg: FulfillmentDb | undefined,
  materialId: string,
): Promise<ApprovedCost> {
  const db = requireDb(dbArg);
  const [rec] = await db.select().from(materialCostRecords).where(and(
    eq(materialCostRecords.materialId, materialId),
    eq(materialCostRecords.approvalStatus, "approved"),
    isNull(materialCostRecords.supersededById),
  )).limit(1);
  if (!rec) {
    return { materialId, unitCost: null, costRecordId: null, costBasis: null,
      approvedAt: null, approvedBy: null, status: "unknown" };
  }
  return {
    materialId,
    unitCost: toMoneyOrNull(rec.unitCost),
    costRecordId: rec.id,
    costBasis: rec.costBasis as CostBasis,
    approvedAt: rec.approvedAt ? new Date(rec.approvedAt).toISOString() : null,
    approvedBy: rec.approvedBy,
    status: "approved",
  };
}

/** Batch variant used by the draft/expected-cost calculators. */
export async function getApprovedCosts(
  dbArg: FulfillmentDb | undefined,
  materialIds: string[],
): Promise<Map<string, ApprovedCost>> {
  const out = new Map<string, ApprovedCost>();
  const unique = [...new Set(materialIds.filter(Boolean))];
  for (const id of unique) out.set(id, await getApprovedCost(dbArg, id));
  return out;
}

export type MaterialWithCost = MaterialRow & { approvedCost: ApprovedCost };

// Canonical fulfillment-confirmation service. All money writes go through here.
// Guarantees: immutable snapshots, idempotent confirmation (retries return the
// existing result — never double cost or double stock deduction), reversals via
// new reversing events/movements (never edits history), NULL cost never coerced to 0.
import { randomUUID } from "node:crypto";
import { eq, and, inArray } from "drizzle-orm";
import { getDb } from "../db.js";
import {
  fulfillmentMaterials, packagingProfiles, packagingProfileItems,
  orderFulfillmentEvents, orderFulfillmentLines, packagingInventoryMovements,
  fulfillmentAdjustments,
} from "../../shared/schema.js";
import { toMoneyOrNull } from "../../shared/order-financials.js";
import { COST_COMPONENTS, type CostComponentType } from "../../shared/cost-components.js";

type Db = NonNullable<ReturnType<typeof getDb>>;
export type CostStatus = "exact" | "estimated" | "incomplete" | "unknown";

// ── Pure helpers (unit-tested without a DB) ──────────────────────────────────

/** Deterministic idempotency key so a retried confirm request maps to the same event. */
export function fulfillmentIdempotencyKey(orderId: string, eventType: string, requestId: string): string {
  return `${orderId}:${eventType}:${requestId}`;
}

export interface LineInput {
  materialId: string | null;
  materialName: string;
  quantity: number;
  /** Frozen unit cost. null = unknown (never 0). A verified-free material passes 0. */
  unitCost: number | null;
  source?: "catalog" | "profile" | "manual" | "none";
  costComponentType?: CostComponentType;
}

export interface LineSnapshot extends LineInput {
  totalCost: number | null;   // quantity * unitCost, or null when unit cost unknown
  costStatus: CostStatus;
}

/** Freeze a line: compute its total and status. Unknown unit cost → total null, status unknown. */
export function freezeLine(line: LineInput): LineSnapshot {
  const unitCost = toMoneyOrNull(line.unitCost);
  const qty = Number(line.quantity);
  const known = unitCost != null && Number.isFinite(qty);
  return {
    ...line,
    unitCost,
    source: line.source ?? (line.materialId ? "catalog" : "manual"),
    costComponentType: line.costComponentType ?? COST_COMPONENTS.AQUAVO_FULFILLMENT_MATERIAL,
    totalCost: known ? unitCost! * qty : null,
    costStatus: known ? "exact" : "unknown",
  };
}

/** Summarize an event's frozen lines: actual cost (null if any unknown) + status. */
export function summarizeLines(lines: LineSnapshot[]): { actualCost: number | null; status: CostStatus; unknownLines: number } {
  if (lines.length === 0) return { actualCost: null, status: "unknown", unknownLines: 0 };
  let total = 0, unknown = 0, estimated = false;
  for (const l of lines) {
    if (l.totalCost == null || l.costStatus === "unknown" || l.costStatus === "incomplete") unknown++;
    else { total += l.totalCost; if (l.costStatus === "estimated") estimated = true; }
  }
  const status: CostStatus = unknown > 0 ? "incomplete" : estimated ? "estimated" : "exact";
  return { actualCost: unknown > 0 ? null : total, status, unknownLines: unknown };
}

/** Variance = actual − expected, or null when either is unknown. */
export function computeVariance(expected: number | null, actual: number | null): number | null {
  if (expected == null || actual == null) return null;
  return actual - expected;
}

// ── Transactional commands ───────────────────────────────────────────────────

export interface ConfirmFulfillmentInput {
  orderId: string;
  eventType?: "original" | "reshipment" | "return_handling" | "replacement" | "adjustment";
  requestId: string;                 // stable per user action → idempotency
  profileId?: string | null;
  profileVersion?: number | null;
  expectedCost?: number | null;
  lines: LineInput[];
  recordedBy?: string;
  varianceReason?: string;
  adjustmentReason?: string;
}

export interface ConfirmResult {
  eventId: string;
  reused: boolean;                   // true when a retry returned the existing event
  actualCost: number | null;
  expectedCost: number | null;
  variance: number | null;
  costStatus: CostStatus;
}

/**
 * Confirm a fulfillment event in ONE transaction. Idempotent: a retry with the same
 * (orderId,eventType,requestId) returns the existing event without creating duplicate
 * cost lines or stock movements.
 */
export async function confirmFulfillment(dbArg: Db | undefined, input: ConfirmFulfillmentInput): Promise<ConfirmResult> {
  const db = dbArg ?? getDb();
  if (!db) throw new Error("Database not available");
  const eventType = input.eventType ?? "original";
  const idem = fulfillmentIdempotencyKey(input.orderId, eventType, input.requestId);

  // Fast path: already processed?
  const existing = await db.select().from(orderFulfillmentEvents)
    .where(eq(orderFulfillmentEvents.idempotencyKey, idem)).limit(1);
  if (existing[0]) {
    const e = existing[0];
    return { eventId: e.id, reused: true, actualCost: toMoneyOrNull(e.actualCost),
      expectedCost: toMoneyOrNull(e.expectedCost), variance: toMoneyOrNull(e.variance),
      costStatus: e.costStatus as CostStatus };
  }

  const frozen = input.lines.map(freezeLine);
  const summary = summarizeLines(frozen);
  const expected = toMoneyOrNull(input.expectedCost ?? null);
  const variance = computeVariance(expected, summary.actualCost);
  const eventId = randomUUID();

  return await db.transaction(async (tx) => {
    // Re-check inside the tx to close the race, then insert. A duplicate idem key
    // hits the unique index and we fall back to the existing row.
    try {
      // next sequence number for this order
      const prior = await tx.select().from(orderFulfillmentEvents)
        .where(eq(orderFulfillmentEvents.orderId, input.orderId));
      const sequenceNumber = prior.length + 1;

      await tx.insert(orderFulfillmentEvents).values({
        id: eventId, orderId: input.orderId, eventType, sequenceNumber,
        idempotencyKey: idem, workflowState: "confirmed", costStatus: summary.status,
        profileId: input.profileId ?? null, profileVersion: input.profileVersion ?? null,
        expectedCost: expected == null ? null : String(expected),
        actualCost: summary.actualCost == null ? null : String(summary.actualCost),
        variance: variance == null ? null : String(variance),
        varianceReason: input.varianceReason ?? null,
        recordedBy: input.recordedBy ?? null,
        adjustmentReason: input.adjustmentReason ?? null,
      } as any);

      for (const l of frozen) {
        await tx.insert(orderFulfillmentLines).values({
          id: randomUUID(), eventId, orderId: input.orderId,
          materialId: l.materialId, materialNameSnapshot: l.materialName,
          costComponentType: l.costComponentType!, quantity: String(l.quantity),
          unitCostSnapshot: l.unitCost == null ? null : String(l.unitCost),
          totalCost: l.totalCost == null ? null : String(l.totalCost),
          source: l.source!, costStatus: l.costStatus,
        } as any);

        // one immutable stock movement per material line; unique idem key => no double deduct
        if (l.materialId) {
          await tx.insert(packagingInventoryMovements).values({
            id: randomUUID(), materialId: l.materialId, movementType: "fulfillment_usage",
            quantity: String(-Math.abs(Number(l.quantity))), orderId: input.orderId, eventId,
            idempotencyKey: `use:${eventId}:${l.materialId}`, recordedBy: input.recordedBy ?? null,
          } as any);
        }
      }

      return { eventId, reused: false, actualCost: summary.actualCost, expectedCost: expected,
        variance, costStatus: summary.status };
    } catch (err: any) {
      // unique idempotency violation → someone won the race; return the committed row
      const dup = await db.select().from(orderFulfillmentEvents)
        .where(eq(orderFulfillmentEvents.idempotencyKey, idem)).limit(1);
      if (dup[0]) {
        const e = dup[0];
        return { eventId: e.id, reused: true, actualCost: toMoneyOrNull(e.actualCost),
          expectedCost: toMoneyOrNull(e.expectedCost), variance: toMoneyOrNull(e.variance),
          costStatus: e.costStatus as CostStatus };
      }
      throw err;
    }
  });
}

/**
 * Reverse a confirmed event: mark it reversed, create a reversal event, and post
 * reversing (+) stock movements. Original rows are never edited.
 */
export async function reverseFulfillmentEvent(dbArg: Db | undefined, eventId: string, reason: string, recordedBy?: string): Promise<{ reversalEventId: string }> {
  const db = dbArg ?? getDb();
  if (!db) throw new Error("Database not available");
  return await db.transaction(async (tx) => {
    const [orig] = await tx.select().from(orderFulfillmentEvents).where(eq(orderFulfillmentEvents.id, eventId)).limit(1);
    if (!orig) throw new Error("Event not found");
    if (orig.workflowState === "reversed") throw new Error("Event already reversed");

    const reversalEventId = randomUUID();
    await tx.insert(orderFulfillmentEvents).values({
      id: reversalEventId, orderId: orig.orderId, eventType: "adjustment", sequenceNumber: 9999,
      reversalOfEventId: eventId, idempotencyKey: `reverse:${eventId}`,
      workflowState: "confirmed", costStatus: "exact", recordedBy: recordedBy ?? null,
      adjustmentReason: reason,
    } as any);

    // reversing stock movements for the original usage
    const usages = await tx.select().from(packagingInventoryMovements)
      .where(and(eq(packagingInventoryMovements.eventId, eventId), eq(packagingInventoryMovements.movementType, "fulfillment_usage")));
    for (const u of usages) {
      await tx.insert(packagingInventoryMovements).values({
        id: randomUUID(), materialId: u.materialId, movementType: "reversal",
        quantity: String(-Number(u.quantity)), orderId: orig.orderId, eventId: reversalEventId,
        idempotencyKey: `reverse:${u.id}`, reversalOfMovementId: u.id, recordedBy: recordedBy ?? null,
      } as any);
    }

    // mark the original reversed (state change only; cost lines stay immutable)
    await tx.update(orderFulfillmentEvents)
      .set({ workflowState: "reversed" } as any)
      .where(eq(orderFulfillmentEvents.id, eventId));

    await tx.insert(fulfillmentAdjustments).values({
      id: randomUUID(), orderId: orig.orderId, eventId, type: "reversal", reason,
      recordedBy: recordedBy ?? null,
    } as any);

    return { reversalEventId };
  });
}

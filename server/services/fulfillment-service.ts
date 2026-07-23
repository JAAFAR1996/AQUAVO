// Canonical fulfillment-confirmation service. All money writes go through here.
// Guarantees: immutable snapshots, idempotent confirmation (retries return the
// existing result — never double cost or double stock deduction), reversals via
// new reversing events/movements (never edits history), NULL cost never coerced to 0.
//
// CONCURRENCY (item 1). Sequence numbers are ALLOCATED, not guessed:
//   * a transaction-scoped advisory lock keyed on the order ID serializes the
//     per-order critical section (one-active-original check + stock guard);
//   * the number itself comes from a dedicated per-order counter row updated by a
//     single atomic INSERT … ON CONFLICT DO UPDATE … RETURNING.
// Two distinct concurrent requests for the SAME order therefore BOTH succeed with
// DIFFERENT numbers. Requests for DIFFERENT orders never contend — the lock and the
// counter row are per-order, never global. The unique (order_id, sequence_number)
// index remains as a backstop against out-of-band writes; it is NOT the allocator.
import { randomUUID } from "node:crypto";
import { eq, and, sql } from "drizzle-orm";
import { getDb } from "../db.js";
import {
  orderFulfillmentEvents, orderFulfillmentLines, packagingInventoryMovements,
  fulfillmentAdjustments,
} from "../../shared/schema.js";
import { toMoneyOrNull } from "../../shared/order-financials.js";
import { COST_COMPONENTS, type CostComponentType } from "../../shared/cost-components.js";
import {
  type FulfillmentDb, type FulfillmentExecutor, type EventRow, type MovementRow,
  withBoundedRetry,
} from "./fulfillment-db.js";

export type CostStatus = "exact" | "estimated" | "incomplete" | "unknown";
export type FulfillmentEventType =
  | "original" | "reshipment" | "return_handling" | "replacement" | "adjustment";

export const FULFILLMENT_EVENT_TYPES: readonly FulfillmentEventType[] =
  ["original", "reshipment", "return_handling", "replacement", "adjustment"] as const;

// ── Typed raw-SQL row access (drivers return {rows} or an array) ─────────────
interface DriverRows<T> { rows: T[] }
function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === "object" && Array.isArray((result as DriverRows<T>).rows)) {
    return (result as DriverRows<T>).rows;
  }
  return [];
}

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
  /** Manual quick-entry descriptors (item 8) — frozen with the line. */
  category?: string | null;
  description?: string | null;
  unit?: string | null;
  note?: string | null;
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

// ── Per-order serialization primitives ───────────────────────────────────────

/**
 * Take a TRANSACTION-scoped advisory lock derived from the order ID. Scoped to one
 * order — unrelated orders proceed in parallel. Released automatically at COMMIT/ROLLBACK.
 */
async function lockOrder(tx: FulfillmentExecutor, orderId: string): Promise<void> {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${orderId}))`);
}

/**
 * ALLOCATE the next sequence number for an order. Single atomic statement against a
 * dedicated per-order counter row: concurrent callers serialize on that ROW only and
 * each receives a distinct, monotonically increasing number.
 */
export async function allocateSequenceNumber(tx: FulfillmentExecutor, orderId: string): Promise<number> {
  const result = await tx.execute(sql`
    INSERT INTO order_fulfillment_sequences (order_id, next_sequence)
    VALUES (${orderId}, 2)
    ON CONFLICT (order_id) DO UPDATE
      SET next_sequence = order_fulfillment_sequences.next_sequence + 1,
          updated_at = now()
    RETURNING (next_sequence - 1) AS seq
  `);
  const seq = Number(rowsOf<{ seq: number | string }>(result)[0]?.seq);
  if (!Number.isFinite(seq) || seq < 1) {
    throw new Error("SEQUENCE_ALLOCATION_FAILED: could not allocate a fulfillment sequence number");
  }
  return seq;
}

// ── Transactional commands ───────────────────────────────────────────────────

export interface ConfirmFulfillmentInput {
  orderId: string;
  eventType?: FulfillmentEventType;
  requestId: string;                 // stable per user action → idempotency
  profileFamilyId?: string | null;
  profileId?: string | null;
  profileVersion?: number | null;
  draftId?: string | null;
  parentEventId?: string | null;
  expectedCost?: number | null;
  lines: LineInput[];
  recordedBy?: string;
  varianceReason?: string;
  adjustmentReason?: string;
  /** Owner-approved override to allow packaging stock to go negative. */
  allowNegativeStock?: boolean;
}

export interface ConfirmResult {
  eventId: string;
  reused: boolean;                   // true when a retry returned the existing event
  sequenceNumber: number;
  actualCost: number | null;
  expectedCost: number | null;
  variance: number | null;
  costStatus: CostStatus;
}

function resultFromEvent(e: EventRow, reused: boolean): ConfirmResult {
  return {
    eventId: e.id, reused, sequenceNumber: e.sequenceNumber,
    actualCost: toMoneyOrNull(e.actualCost), expectedCost: toMoneyOrNull(e.expectedCost),
    variance: toMoneyOrNull(e.variance), costStatus: e.costStatus as CostStatus,
  };
}

async function findByIdempotencyKey(db: FulfillmentExecutor, idem: string): Promise<EventRow | undefined> {
  const rows = await db.select().from(orderFulfillmentEvents)
    .where(eq(orderFulfillmentEvents.idempotencyKey, idem)).limit(1);
  return rows[0];
}

/**
 * Confirm a fulfillment event in ONE transaction. Idempotent: a retry with the same
 * (orderId,eventType,requestId) returns the existing event without creating duplicate
 * cost lines or stock movements. Concurrency-safe: see the module header.
 */
export async function confirmFulfillment(
  dbArg: FulfillmentDb | undefined,
  input: ConfirmFulfillmentInput,
): Promise<ConfirmResult> {
  const db = dbArg ?? (getDb() as FulfillmentDb | null);
  if (!db) throw new Error("Database not available");
  const eventType: FulfillmentEventType = input.eventType ?? "original";
  const idem = fulfillmentIdempotencyKey(input.orderId, eventType, input.requestId);

  // Fast path: already processed? (duplicate idempotency request → existing event)
  const existing = await findByIdempotencyKey(db, idem);
  if (existing) return resultFromEvent(existing, true);

  const frozen = input.lines.map(freezeLine);
  const summary = summarizeLines(frozen);
  const expected = toMoneyOrNull(input.expectedCost ?? null);
  const variance = computeVariance(expected, summary.actualCost);

  // Bounded retry ONLY for genuine serialization / unique conflicts.
  return withBoundedRetry(async () => {
    try {
      return await db.transaction(async (tx) => {
        // Serialize the per-order critical section. Per-order only — unrelated orders
        // are untouched and run fully in parallel.
        await lockOrder(tx, input.orderId);

        // Re-check inside the lock: a concurrent duplicate may have committed.
        const raced = await findByIdempotencyKey(tx, idem);
        if (raced) return resultFromEvent(raced, true);

        // At most one active (non-reversed) ORIGINAL per order.
        if (eventType === "original") {
          const originals = await tx.select().from(orderFulfillmentEvents).where(and(
            eq(orderFulfillmentEvents.orderId, input.orderId),
            eq(orderFulfillmentEvents.eventType, "original"),
          ));
          if (originals.some((e) => e.workflowState !== "reversed")) {
            throw new Error("ORIGINAL_ALREADY_EXISTS: this order already has an active original shipment");
          }
        }

        const sequenceNumber = await allocateSequenceNumber(tx, input.orderId);
        const eventId = randomUUID();

        // Stock guard: usage must not drive available below 0 unless explicitly overridden.
        if (!input.allowNegativeStock) {
          for (const l of frozen) {
            if (!l.materialId) continue;
            const balRow = await tx
              .select({ bal: sql<string>`COALESCE(SUM(${packagingInventoryMovements.quantity}), 0)` })
              .from(packagingInventoryMovements)
              .where(eq(packagingInventoryMovements.materialId, l.materialId));
            const available = Number(balRow[0]?.bal ?? 0);
            const need = Math.abs(Number(l.quantity));
            if (available - need < 0) {
              throw new Error(`INSUFFICIENT_STOCK: material ${l.materialId} (available ${available}, need ${need})`);
            }
          }
        }

        await tx.insert(orderFulfillmentEvents).values({
          id: eventId, orderId: input.orderId, eventType, sequenceNumber,
          idempotencyKey: idem, workflowState: "confirmed", costStatus: summary.status,
          parentEventId: input.parentEventId ?? null,
          profileFamilyId: input.profileFamilyId ?? null,
          profileId: input.profileId ?? null, profileVersion: input.profileVersion ?? null,
          draftId: input.draftId ?? null,
          expectedCost: expected == null ? null : String(expected),
          actualCost: summary.actualCost == null ? null : String(summary.actualCost),
          variance: variance == null ? null : String(variance),
          varianceReason: input.varianceReason ?? null,
          recordedBy: input.recordedBy ?? null,
          adjustmentReason: input.adjustmentReason ?? null,
        });

        for (const l of frozen) {
          // F-4: the line's own id is the per-line component of the movement's
          // idempotency key. Without it two lines of ONE event carrying the same
          // material minted the same key and the second INSERT died on
          // pim_idempotency_uidx (23505), aborting the whole confirmation.
          const lineId = randomUUID();
          await tx.insert(orderFulfillmentLines).values({
            id: lineId, eventId, orderId: input.orderId,
            materialId: l.materialId, materialNameSnapshot: l.materialName,
            costComponentType: l.costComponentType ?? COST_COMPONENTS.AQUAVO_FULFILLMENT_MATERIAL,
            quantity: String(l.quantity),
            unitCostSnapshot: l.unitCost == null ? null : String(l.unitCost),
            totalCost: l.totalCost == null ? null : String(l.totalCost),
            source: l.source ?? "manual", costStatus: l.costStatus,
            category: l.category ?? null, description: l.description ?? null,
            unit: l.unit ?? null, note: l.note ?? null,
          });

          // one immutable stock movement per material line; unique idem key => no double deduct
          if (l.materialId) {
            await tx.insert(packagingInventoryMovements).values({
              id: randomUUID(), materialId: l.materialId, movementType: "fulfillment_usage",
              quantity: String(-Math.abs(Number(l.quantity))), orderId: input.orderId, eventId,
              lineId,
              // per-LINE key. Duplicate protection is unchanged: a replayed request
              // never reaches here (it short-circuits on the event's own
              // idempotency key), and pim_line_uidx additionally guarantees at
              // most one movement per line.
              idempotencyKey: `use:${eventId}:${lineId}`, recordedBy: input.recordedBy ?? null,
            });
          }
        }

        return {
          eventId, reused: false, sequenceNumber, actualCost: summary.actualCost,
          expectedCost: expected, variance, costStatus: summary.status,
        };
      });
    } catch (err) {
      // After the tx rolled back, a committed row under the same idempotency key means a
      // concurrent DUPLICATE request won the race → return that row instead of retrying.
      const dup = await findByIdempotencyKey(db, idem);
      if (dup) return resultFromEvent(dup, true);
      throw err;
    }
  });
}

// ── Reversal (item 3) ────────────────────────────────────────────────────────

export interface ReverseResult {
  reversalEventId: string;
  reused: boolean;           // true when this reversal already existed (idempotent)
  reversedMovements: number;
}

/**
 * Reverse a confirmed event with an EXACT counter-entry: a new reversal event plus one
 * reversal movement per original movement, each carrying precisely the negated quantity,
 * the same material and the same order. Original rows are never edited.
 *
 * Enforced here AND in the database (triggers + partial unique indexes):
 *   * an event cannot reverse itself, and reversal links cannot form a cycle;
 *   * only ONE active reversal may exist per target event (a reversal that has itself
 *     been reversed frees the slot for an explicit new event);
 *   * a reversal movement's quantity must equal the exact negative of its referent;
 *   * unrelated orders/materials cannot be linked;
 *   * the operation is idempotent — repeating it returns the existing reversal.
 */
export async function reverseFulfillmentEvent(
  dbArg: FulfillmentDb | undefined,
  eventId: string,
  reason: string,
  recordedBy?: string,
): Promise<ReverseResult> {
  const db = dbArg ?? (getDb() as FulfillmentDb | null);
  if (!db) throw new Error("Database not available");
  if (!reason?.trim()) throw new Error("REVERSAL_REASON_REQUIRED: a reversal must state a reason");
  const idem = `reverse:${eventId}`;

  const existing = await findByIdempotencyKey(db, idem);
  if (existing) {
    return { reversalEventId: existing.id, reused: true, reversedMovements: 0 };
  }

  return withBoundedRetry(async () => {
    try {
      return await db.transaction(async (tx) => {
        const [orig] = await tx.select().from(orderFulfillmentEvents)
          .where(eq(orderFulfillmentEvents.id, eventId)).limit(1);
        if (!orig) throw new Error("EVENT_NOT_FOUND: cannot reverse an event that does not exist");

        await lockOrder(tx, orig.orderId);

        const raced = await findByIdempotencyKey(tx, idem);
        if (raced) return { reversalEventId: raced.id, reused: true, reversedMovements: 0 };

        if (orig.id === eventId && orig.reversalOfEventId === eventId) {
          throw new Error("SELF_REVERSAL: an event cannot reverse itself");
        }
        if (orig.workflowState === "reversed") {
          throw new Error("ALREADY_REVERSED: this event has already been reversed");
        }
        if (!["confirmed", "adjusted"].includes(orig.workflowState)) {
          throw new Error(`NOT_SETTLED: only a settled event can be reversed (state=${orig.workflowState})`);
        }

        // Guard the "one ACTIVE reversal per target" rule in the service too, so the
        // caller gets a domain error rather than a raw constraint violation.
        const priorReversals = await tx.select().from(orderFulfillmentEvents)
          .where(eq(orderFulfillmentEvents.reversalOfEventId, eventId));
        if (priorReversals.some((r) => r.workflowState !== "reversed")) {
          throw new Error("ACTIVE_REVERSAL_EXISTS: this event already has an active reversal");
        }

        const reversalEventId = randomUUID();
        const sequenceNumber = await allocateSequenceNumber(tx, orig.orderId);

        await tx.insert(orderFulfillmentEvents).values({
          id: reversalEventId, orderId: orig.orderId, eventType: "adjustment", sequenceNumber,
          reversalOfEventId: eventId, idempotencyKey: idem,
          workflowState: "confirmed", costStatus: "exact", recordedBy: recordedBy ?? null,
          adjustmentReason: reason,
        });

        // EXACT counter-movements for every movement the original event posted.
        const originalMovements: MovementRow[] = await tx.select().from(packagingInventoryMovements)
          .where(and(
            eq(packagingInventoryMovements.eventId, eventId),
            eq(packagingInventoryMovements.movementType, "fulfillment_usage"),
          ));
        for (const m of originalMovements) {
          const negated = -Number(m.quantity);
          if (!Number.isFinite(negated) || negated === 0) {
            throw new Error(`INVALID_REVERSAL_QUANTITY: movement ${m.id} has a non-reversible quantity`);
          }
          await tx.insert(packagingInventoryMovements).values({
            id: randomUUID(), materialId: m.materialId, movementType: "reversal",
            quantity: String(negated),
            orderId: m.orderId,               // same order as the referent — never cross-linked
            eventId: reversalEventId,
            idempotencyKey: `reverse:${m.id}`, reversalOfMovementId: m.id,
            recordedBy: recordedBy ?? null,
          });
        }

        // Mark the original reversed (state change only; cost lines stay immutable).
        await tx.update(orderFulfillmentEvents)
          .set({ workflowState: "reversed" })
          .where(eq(orderFulfillmentEvents.id, eventId));

        await tx.insert(fulfillmentAdjustments).values({
          id: randomUUID(), orderId: orig.orderId, eventId, type: "reversal", reason,
          recordedBy: recordedBy ?? null,
        });

        return { reversalEventId, reused: false, reversedMovements: originalMovements.length };
      });
    } catch (err) {
      const dup = await findByIdempotencyKey(db, idem);
      if (dup) return { reversalEventId: dup.id, reused: true, reversedMovements: 0 };
      throw err;
    }
  });
}

// ── Read models ──────────────────────────────────────────────────────────────

export interface FulfillmentEventHistoryLine {
  id: string; materialId: string | null; materialName: string;
  quantity: number; unitCost: number | null; totalCost: number | null;
  costStatus: string; source: string | null;
  category: string | null; description: string | null; unit: string | null; note: string | null;
}
export interface FulfillmentEventHistoryEntry {
  id: string; orderId: string; eventType: string; sequenceNumber: number;
  workflowState: string; costStatus: string;
  profileFamilyId: string | null; profileId: string | null; profileVersion: number | null;
  reversalOfEventId: string | null; parentEventId: string | null; draftId: string | null;
  expectedCost: number | null; actualCost: number | null; variance: number | null;
  varianceReason: string | null; adjustmentReason: string | null;
  recordedBy: string | null; recordedAt: string;
  lines: FulfillmentEventHistoryLine[];
}

/** Full, ordered event history for an order — the drill-down behind every amount. */
export async function getFulfillmentHistory(
  dbArg: FulfillmentDb | undefined,
  orderId: string,
): Promise<FulfillmentEventHistoryEntry[]> {
  const db = dbArg ?? (getDb() as FulfillmentDb | null);
  if (!db) throw new Error("Database not available");

  const events = await db.select().from(orderFulfillmentEvents)
    .where(eq(orderFulfillmentEvents.orderId, orderId));
  if (events.length === 0) return [];
  const lines = await db.select().from(orderFulfillmentLines)
    .where(eq(orderFulfillmentLines.orderId, orderId));

  const byEvent = new Map<string, FulfillmentEventHistoryLine[]>();
  for (const l of lines) {
    const arr = byEvent.get(l.eventId) ?? [];
    arr.push({
      id: l.id, materialId: l.materialId, materialName: l.materialNameSnapshot,
      quantity: Number(l.quantity), unitCost: toMoneyOrNull(l.unitCostSnapshot),
      totalCost: toMoneyOrNull(l.totalCost), costStatus: l.costStatus, source: l.source,
      category: l.category, description: l.description, unit: l.unit, note: l.note,
    });
    byEvent.set(l.eventId, arr);
  }

  return events
    .sort((a, b) => a.sequenceNumber - b.sequenceNumber)
    .map((e) => ({
      id: e.id, orderId: e.orderId, eventType: e.eventType, sequenceNumber: e.sequenceNumber,
      workflowState: e.workflowState, costStatus: e.costStatus,
      profileFamilyId: e.profileFamilyId, profileId: e.profileId, profileVersion: e.profileVersion,
      reversalOfEventId: e.reversalOfEventId, parentEventId: e.parentEventId, draftId: e.draftId,
      expectedCost: toMoneyOrNull(e.expectedCost), actualCost: toMoneyOrNull(e.actualCost),
      variance: toMoneyOrNull(e.variance), varianceReason: e.varianceReason,
      adjustmentReason: e.adjustmentReason, recordedBy: e.recordedBy,
      recordedAt: (e.recordedAt instanceof Date ? e.recordedAt : new Date(String(e.recordedAt))).toISOString(),
      lines: byEvent.get(e.id) ?? [],
    }));
}

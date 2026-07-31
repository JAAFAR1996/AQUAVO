// Carton reservations: transactional, idempotent and safe under concurrency.
//
// THE RACE THIS PREVENTS. Two orders confirm at the same instant and one carton
// remains. Availability is DERIVED — on_hand from an immutable movement ledger
// minus active reservations from another table — so there is no single row to
// lock with SELECT ... FOR UPDATE, and no row-level lock can serialise the pair
// of aggregates.
//
// So we take a transaction-scoped advisory lock keyed on the material. Order A
// holds it, re-reads both aggregates INSIDE the lock, inserts its reservation
// and commits; order B was blocked at the lock, wakes to the updated `reserved`
// sum, and fails with INSUFFICIENT_CARTON_STOCK. The lock is per material, so
// orders needing different cartons never contend at all.
//
// SKIP LOCKED is deliberately not used: PostgreSQL's own documentation says it
// "provides an inconsistent view of the data, so this is not suitable for
// general purpose work". An inconsistent view of stock is exactly how you
// promise a carton twice.
//
// Locks are acquired in sorted material order so two orders needing the same two
// cartons can never deadlock by grabbing them in opposite orders.
import { randomUUID } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { cartonReservations } from "../../shared/packing-schema.js";
import type { FulfillmentDb, FulfillmentExecutor } from "./fulfillment-db.js";
import { withBoundedRetry } from "./fulfillment-db.js";

export class CartonStockError extends Error {
  constructor(
    message: string,
    readonly code: "INSUFFICIENT_CARTON_STOCK" | "NO_CARTONS_REQUESTED" | "RESERVATION_NOT_FOUND",
    readonly materialId?: string,
    readonly available?: number,
    readonly needed?: number,
  ) {
    super(message);
    this.name = "CartonStockError";
  }
}

interface DriverRows<T> {
  rows: T[];
}
function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === "object" && Array.isArray((result as DriverRows<T>).rows)) {
    return (result as DriverRows<T>).rows;
  }
  return [];
}

export interface CartonStock {
  materialId: string;
  onHand: number;
  reserved: number;
  available: number;
}

/**
 * Current stock for one material. Available is computed, never stored — there is
 * no counter that can drift away from the ledger.
 */
export async function getCartonStock(
  tx: FulfillmentExecutor,
  materialId: string,
): Promise<CartonStock> {
  const res = await tx.execute(sql`
    SELECT
      COALESCE((SELECT SUM(quantity) FROM packaging_inventory_movements
                 WHERE material_id = ${materialId}), 0) AS on_hand,
      COALESCE((SELECT SUM(quantity) FROM carton_reservations
                 WHERE material_id = ${materialId} AND state = 'active'), 0) AS reserved
  `);
  const row = rowsOf<{ on_hand: string | number; reserved: string | number }>(res)[0];
  const onHand = Number(row?.on_hand ?? 0);
  const reserved = Number(row?.reserved ?? 0);
  return { materialId, onHand, reserved, available: onHand - reserved };
}

/** Transaction-scoped, per material. Released automatically at COMMIT/ROLLBACK. */
async function lockMaterial(tx: FulfillmentExecutor, materialId: string): Promise<void> {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`carton:${materialId}`}))`);
}

export interface ReserveRequest {
  orderId: string;
  planId?: string | null;
  /** materialId -> how many cartons of that type the plan needs. */
  quantities: ReadonlyMap<string, number>;
  /** Stable per user action. A retry with the same value is a no-op. */
  requestId: string;
  reservedBy?: string;
}

export interface ReservationRow {
  id: string;
  orderId: string;
  materialId: string;
  quantity: number;
  state: string;
}

export interface ReserveResult {
  reservations: ReservationRow[];
  /** true when this request had already been processed. */
  reused: boolean;
}

function reserveKey(orderId: string, requestId: string, materialId: string): string {
  return `reserve:${orderId}:${requestId}:${materialId}`;
}

/**
 * Reserve every carton a plan needs, atomically.
 *
 * All-or-nothing: if any one material is short, the whole transaction rolls back
 * and nothing is held. A half-reserved order would sit on stock it can never use.
 */
export async function reserveCartons(
  db: FulfillmentDb,
  req: ReserveRequest,
): Promise<ReserveResult> {
  const materialIds = [...req.quantities.keys()].sort();
  if (materialIds.length === 0) {
    throw new CartonStockError("ماكو كراتين مطلوبة بهذه الخطة", "NO_CARTONS_REQUESTED");
  }

  const keys = materialIds.map((m) => reserveKey(req.orderId, req.requestId, m));
  const existing = await db
    .select()
    .from(cartonReservations)
    .where(inArray(cartonReservations.idempotencyKey, keys));
  if (existing.length === materialIds.length) {
    return { reservations: existing.map(toRow), reused: true };
  }

  return withBoundedRetry(async () => {
    try {
      return await db.transaction(async (tx) => {
        // Sorted order => no deadlock between two orders wanting the same pair.
        for (const materialId of materialIds) await lockMaterial(tx, materialId);

        const raced = await tx
          .select()
          .from(cartonReservations)
          .where(inArray(cartonReservations.idempotencyKey, keys));
        if (raced.length === materialIds.length) {
          return { reservations: raced.map(toRow), reused: true };
        }

        // Check everything before writing anything.
        for (const materialId of materialIds) {
          const need = req.quantities.get(materialId) ?? 0;
          const stock = await getCartonStock(tx, materialId);
          if (stock.available < need) {
            throw new CartonStockError(
              `مخزون الكراتين غير كافي (المتاح ${stock.available}، المطلوب ${need})`,
              "INSUFFICIENT_CARTON_STOCK",
              materialId,
              stock.available,
              need,
            );
          }
        }

        const created: ReservationRow[] = [];
        for (const materialId of materialIds) {
          const quantity = req.quantities.get(materialId) ?? 0;
          const id = randomUUID();
          await tx.insert(cartonReservations).values({
            id,
            orderId: req.orderId,
            materialId,
            quantity: String(quantity),
            state: "active",
            planId: req.planId ?? null,
            idempotencyKey: reserveKey(req.orderId, req.requestId, materialId),
            reservedBy: req.reservedBy ?? null,
          });
          created.push({ id, orderId: req.orderId, materialId, quantity, state: "active" });
        }
        return { reservations: created, reused: false };
      });
    } catch (err) {
      if (err instanceof CartonStockError) throw err;
      const dup = await db
        .select()
        .from(cartonReservations)
        .where(inArray(cartonReservations.idempotencyKey, keys));
      if (dup.length === materialIds.length) return { reservations: dup.map(toRow), reused: true };
      throw err;
    }
  });
}

function toRow(r: {
  id: string;
  orderId: string;
  materialId: string;
  quantity: string | number;
  state: string;
}): ReservationRow {
  return {
    id: r.id,
    orderId: r.orderId,
    materialId: r.materialId,
    quantity: Number(r.quantity),
    state: r.state,
  };
}

/**
 * Release every active reservation on an order — cancellation, or the first half
 * of a carton change. Idempotent: releasing twice releases nothing the second
 * time. No inventory movement is written, because nothing physical happened.
 */
export async function releaseOrderReservations(
  db: FulfillmentDb,
  orderId: string,
  reason: string,
): Promise<number> {
  if (!reason?.trim()) throw new Error("RELEASE_REASON_REQUIRED");
  const res = await db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(cartonReservations)
      .where(and(eq(cartonReservations.orderId, orderId), eq(cartonReservations.state, "active")));
    if (rows.length === 0) return 0;
    await tx
      .update(cartonReservations)
      .set({ state: "released", releasedReason: reason, stateChangedAt: new Date() })
      .where(and(eq(cartonReservations.orderId, orderId), eq(cartonReservations.state, "active")));
    return rows.length;
  });
  return res;
}

/**
 * Mark an order's reservations consumed by a fulfillment event.
 *
 * The physical deduction is NOT written here — `confirmFulfillment` already
 * posts one `fulfillment_usage` movement per line. Doing it here as well is
 * precisely the double-deduction this separation exists to prevent. All this
 * does is close the claim.
 */
export async function consumeOrderReservations(
  tx: FulfillmentExecutor,
  orderId: string,
  eventId: string,
): Promise<number> {
  const rows = await tx
    .select()
    .from(cartonReservations)
    .where(and(eq(cartonReservations.orderId, orderId), eq(cartonReservations.state, "active")));
  if (rows.length === 0) return 0;
  await tx
    .update(cartonReservations)
    .set({ state: "consumed", consumedEventId: eventId, stateChangedAt: new Date() })
    .where(and(eq(cartonReservations.orderId, orderId), eq(cartonReservations.state, "active")));
  return rows.length;
}

/**
 * Swap one carton for another in a single transaction: the old claim is released
 * and the new one taken together, so stock is never briefly double-held and
 * never briefly unheld.
 */
export async function changeReservedCarton(
  db: FulfillmentDb,
  params: {
    orderId: string;
    planId?: string | null;
    newQuantities: ReadonlyMap<string, number>;
    requestId: string;
    reason: string;
    changedBy?: string;
  },
): Promise<ReserveResult> {
  if (!params.reason?.trim() || params.reason.trim().length < 3) {
    throw new Error("CHANGE_REASON_REQUIRED: تغيير الكارتونة يتطلب سبباً");
  }
  const materialIds = [...params.newQuantities.keys()].sort();

  return withBoundedRetry(async () =>
    db.transaction(async (tx) => {
      for (const materialId of materialIds) await lockMaterial(tx, materialId);

      const active = await tx
        .select()
        .from(cartonReservations)
        .where(
          and(
            eq(cartonReservations.orderId, params.orderId),
            eq(cartonReservations.state, "active"),
          ),
        );
      // Release first: the carton being swapped out may be the very one being
      // swapped in at a different quantity, and its units must count as free.
      for (const m of active) await lockMaterial(tx, m.materialId);
      if (active.length > 0) {
        await tx
          .update(cartonReservations)
          .set({
            state: "released",
            releasedReason: params.reason.trim(),
            stateChangedAt: new Date(),
          })
          .where(
            and(
              eq(cartonReservations.orderId, params.orderId),
              eq(cartonReservations.state, "active"),
            ),
          );
      }

      for (const materialId of materialIds) {
        const need = params.newQuantities.get(materialId) ?? 0;
        const stock = await getCartonStock(tx, materialId);
        if (stock.available < need) {
          throw new CartonStockError(
            `مخزون الكراتين غير كافي (المتاح ${stock.available}، المطلوب ${need})`,
            "INSUFFICIENT_CARTON_STOCK",
            materialId,
            stock.available,
            need,
          );
        }
      }

      const created: ReservationRow[] = [];
      for (const materialId of materialIds) {
        const quantity = params.newQuantities.get(materialId) ?? 0;
        const id = randomUUID();
        await tx.insert(cartonReservations).values({
          id,
          orderId: params.orderId,
          materialId,
          quantity: String(quantity),
          state: "active",
          planId: params.planId ?? null,
          idempotencyKey: reserveKey(params.orderId, params.requestId, materialId),
          reservedBy: params.changedBy ?? null,
        });
        created.push({ id, orderId: params.orderId, materialId, quantity, state: "active" });
      }
      return { reservations: created, reused: false };
    }),
  );
}

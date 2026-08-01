// Executes the packaging consequences of a real order-status change.
//
// decideLifecycleAction() is a pure mapping and was, until now, called only by
// its own test: no order-status transition anywhere in the app reserved,
// consumed or released a carton. Reservations existed solely as manual admin
// POSTs, which meant carton stock never moved on its own.
//
// This is the missing executor. It stays deliberately thin -- it decides
// nothing, it only dispatches to the canonical services that already implement
// locking, idempotency and the stock invariants.
//
// WHAT IT REFUSES TO DO
//   * it never invents a plan. No validated plan means no reservation, and the
//     order is packed manually;
//   * it never posts an inventory movement. `consumeOrderReservations` closes
//     the claim; `confirmFulfillment` is what deducts stock. Doing both here is
//     exactly the double-deduction the two-step design prevents;
//   * it never swallows INSUFFICIENT_CARTON_STOCK. Reserving more cartons than
//     exist is a hard failure, not a warning.
import { and, desc, eq, sql } from "drizzle-orm";
import { orderFulfillmentEvents } from "../../shared/schema.js";
import {
  cartonReservations, orderPackingPlans, orderPackingPlanItems,
} from "../../shared/packing-schema.js";
import type { FulfillmentDb } from "./fulfillment-db.js";
import {
  consumeOrderReservations, releaseOrderReservations, reserveCartons,
} from "./carton-reservation-service.js";
import { decideLifecycleAction, wasOrderShipped, type PackagingAction } from "./packaging-lifecycle.js";

export interface LifecycleOutcome {
  action: PackagingAction;
  reasonAr: string;
  /** What actually happened, for the audit line and the admin timeline. */
  detail:
    | "reserved"
    | "reservation_reused"
    | "consumed"
    | "released"
    | "no_validated_plan"
    | "no_fulfillment_event"
    | "nothing_to_release"
    | "noop";
  quantity?: number;
}

/** How many confirmed ORIGINAL fulfillment events this order has. */
async function confirmedOriginalCount(db: FulfillmentDb, orderId: string): Promise<number> {
  const rows = await db
    .select({ n: sql<string>`count(*)` })
    .from(orderFulfillmentEvents)
    .where(and(
      eq(orderFulfillmentEvents.orderId, orderId),
      eq(orderFulfillmentEvents.eventType, "original"),
      eq(orderFulfillmentEvents.workflowState, "confirmed"),
    ));
  return Number(rows[0]?.n ?? 0);
}

/** Cartons required by the order's latest validated plan, keyed by material. */
async function plannedQuantities(
  db: FulfillmentDb,
  orderId: string,
): Promise<{ planId: string; quantities: Map<string, number> } | null> {
  const [plan] = await db
    .select()
    .from(orderPackingPlans)
    .where(eq(orderPackingPlans.orderId, orderId))
    .orderBy(desc(orderPackingPlans.createdAt))
    .limit(1);

  // Only a VALIDATED plan may hold stock. An unsafe arrangement never reaches
  // this state, which is the structural reason no bypass exists.
  if (!plan || (plan.state !== "validated" && plan.state !== "reserved")) return null;

  const items = await db
    .select()
    .from(orderPackingPlanItems)
    .where(eq(orderPackingPlanItems.planId, plan.id));

  // One carton per distinct cartonIndex, not one per item in it.
  const quantities = new Map<string, number>();
  const seen = new Set<number>();
  for (const it of items) {
    if (!it.materialId || seen.has(it.cartonIndex)) continue;
    seen.add(it.cartonIndex);
    quantities.set(it.materialId, (quantities.get(it.materialId) ?? 0) + 1);
  }
  return quantities.size === 0 ? null : { planId: plan.id, quantities };
}

/**
 * Apply the packaging side effects of moving `orderId` to `newStatus`.
 *
 * Idempotent by construction: the reservation request id is derived from the
 * order and the action rather than being random, so a replayed webhook, a double
 * click or a retried request collapses onto the same reservation instead of
 * taking stock twice.
 *
 * Throws CartonStockError(INSUFFICIENT_CARTON_STOCK) when the plan needs more
 * cartons than exist. Callers must let that propagate.
 */
export async function applyPackagingLifecycle(
  db: FulfillmentDb,
  input: {
    orderId: string;
    newStatus: string;
    previousStatus: string | null;
    actor?: string | null;
  },
): Promise<LifecycleOutcome> {
  const shipped = wasOrderShipped(await confirmedOriginalCount(db, input.orderId));
  const decision = decideLifecycleAction(input.newStatus, input.previousStatus, shipped);
  const base = { action: decision.action, reasonAr: decision.reasonAr };

  switch (decision.action) {
    case "reserve": {
      const planned = await plannedQuantities(db, input.orderId);
      // No validated plan is a legitimate state -- missing packing data, or an
      // order the owner packs by hand. It is not an error and must not block the
      // status change.
      if (!planned) return { ...base, detail: "no_validated_plan" };

      const result = await reserveCartons(db, {
        orderId: input.orderId,
        planId: planned.planId,
        quantities: planned.quantities,
        // Stable, not random: this is what makes a repeated transition a no-op.
        requestId: `lifecycle:${input.orderId}:reserve:${planned.planId}`,
        reservedBy: input.actor ?? "system:order-status",
      });
      await db
        .update(orderPackingPlans)
        .set({ state: "reserved", updatedAt: new Date() })
        .where(eq(orderPackingPlans.id, planned.planId));

      return {
        ...base,
        detail: result.reused ? "reservation_reused" : "reserved",
        quantity: Array.from(planned.quantities.values()).reduce((a, b) => a + b, 0),
      };
    }

    case "consume": {
      // Consumption closes the claim against the fulfillment event that actually
      // deducted the stock. Without such an event there is nothing to consume
      // against, and inventing one would post a deduction twice.
      const [event] = await db
        .select({ id: orderFulfillmentEvents.id })
        .from(orderFulfillmentEvents)
        .where(and(
          eq(orderFulfillmentEvents.orderId, input.orderId),
          eq(orderFulfillmentEvents.eventType, "original"),
          eq(orderFulfillmentEvents.workflowState, "confirmed"),
        ))
        .orderBy(desc(orderFulfillmentEvents.recordedAt))
        .limit(1);
      if (!event) return { ...base, detail: "no_fulfillment_event" };

      const n = await consumeOrderReservations(db, input.orderId, event.id);
      // Zero means the reservations were already consumed by an earlier shipment
      // transition. Idempotent, not an error.
      return { ...base, detail: n > 0 ? "consumed" : "noop", quantity: n };
    }

    case "release": {
      const n = await releaseOrderReservations(db, input.orderId, decision.reasonAr);
      return { ...base, detail: n > 0 ? "released" : "nothing_to_release", quantity: n };
    }

    // A full return is CLASSIFICATION, handled by return-packaging-loss-service
    // when the return event is recorded. Touching stock here would either
    // restore a carton that was physically destroyed or count its cost twice.
    case "classify_return_loss":
    case "suggest_only":
    case "none":
    default:
      return { ...base, detail: "noop" };
  }
}

/** True when an order currently holds any active carton reservation. */
export async function hasActiveReservations(db: FulfillmentDb, orderId: string): Promise<boolean> {
  const rows = await db
    .select({ n: sql<string>`count(*)` })
    .from(cartonReservations)
    .where(and(eq(cartonReservations.orderId, orderId), eq(cartonReservations.state, "active")));
  return Number(rows[0]?.n ?? 0) > 0;
}

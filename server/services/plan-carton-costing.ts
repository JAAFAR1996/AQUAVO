// Puts the carton the planner chose into the order's cost snapshot.
//
// THE GAP THIS CLOSES
// The packing plan knew which carton and how many. The fulfillment draft -- the
// thing that becomes the immutable cost snapshot and therefore the order's
// profit -- did not. Nothing connected them, so a carton could be planned,
// reserved, consumed and physically deducted from stock while its cost never
// appeared in the order's internal profit at all.
//
// Reservation and consumption move INVENTORY. This moves COST. Both have to
// happen or the two ledgers disagree.
//
// WHAT IT WILL NOT DO
//   * it never prices a carton itself. The unit cost comes from the approved
//     material-cost record, and an unpriced carton stays «غير معروف» rather than
//     silently costing 0;
//   * it never touches a draft that is already consumed. A confirmed snapshot is
//     immutable, and a carton decided after the fact belongs to an adjustment
//     event, not to a rewrite of history;
//   * it never adds a carton the plan did not choose.
import { and, desc, eq } from "drizzle-orm";
import { fulfillmentPreparationDraftLines, orderFulfillmentEvents } from "../../shared/schema.js";
import { orderPackingPlans, orderPackingPlanItems } from "../../shared/packing-schema.js";
import type { FulfillmentDb } from "./fulfillment-db.js";
import { addCatalogLine, getOrCreateDraft, updateDraftLine } from "./fulfillment-draft-service.js";

export interface PlanCostingResult {
  /** What happened, for the audit line. */
  detail: "synced" | "already_current" | "no_validated_plan" | "draft_not_editable";
  /** materialId -> carton count the plan requires. */
  quantities: Record<string, number>;
}

/** Cartons the order's latest validated plan requires, one per carton index. */
async function plannedCartons(
  db: FulfillmentDb,
  orderId: string,
): Promise<Map<string, number> | null> {
  const [plan] = await db
    .select()
    .from(orderPackingPlans)
    .where(eq(orderPackingPlans.orderId, orderId))
    .orderBy(desc(orderPackingPlans.createdAt))
    .limit(1);
  if (!plan || !["validated", "reserved", "consumed"].includes(plan.state)) return null;

  const items = await db
    .select()
    .from(orderPackingPlanItems)
    .where(eq(orderPackingPlanItems.planId, plan.id));

  const quantities = new Map<string, number>();
  const seen = new Set<number>();
  for (const it of items) {
    // One carton per distinct cartonIndex — not one per item packed inside it.
    if (!it.materialId || seen.has(it.cartonIndex)) continue;
    seen.add(it.cartonIndex);
    quantities.set(it.materialId, (quantities.get(it.materialId) ?? 0) + 1);
  }
  return quantities.size === 0 ? null : quantities;
}

/**
 * Make the order's open draft carry exactly the cartons its validated plan needs.
 *
 * Idempotent: re-running after the plan is unchanged reports `already_current`
 * and writes nothing. Re-running after the plan CHANGED corrects the quantity
 * in place rather than appending a second carton line, so a re-planned order is
 * not charged for both the old carton and the new one.
 */
export async function syncPlanCartonsToDraft(
  db: FulfillmentDb,
  orderId: string,
): Promise<PlanCostingResult> {
  const planned = await plannedCartons(db, orderId);
  if (!planned) return { detail: "no_validated_plan", quantities: {} };

  const quantities = Object.fromEntries(planned);

  // Already fulfilled? Then stop here.
  //
  // Checking the draft's own state is not enough: getOrCreateDraft opens a FRESH
  // draft once the previous one is consumed, so this would happily start a second
  // draft carrying another carton line. Confirming that later would charge the
  // order for a second carton it never used. Re-planning after shipment is an
  // adjustment event the admin makes deliberately, not a silent side effect.
  const [fulfilled] = await db
    .select({ id: orderFulfillmentEvents.id })
    .from(orderFulfillmentEvents)
    .where(and(
      eq(orderFulfillmentEvents.orderId, orderId),
      eq(orderFulfillmentEvents.eventType, "original"),
      eq(orderFulfillmentEvents.workflowState, "confirmed"),
    ))
    .limit(1);
  if (fulfilled) return { detail: "draft_not_editable", quantities };

  const draft = await getOrCreateDraft(db, { orderId });
  if (draft.state === "consumed" || draft.state === "discarded") {
    return { detail: "draft_not_editable", quantities };
  }

  const existing = await db
    .select()
    .from(fulfillmentPreparationDraftLines)
    .where(eq(fulfillmentPreparationDraftLines.draftId, draft.id));

  let changed = false;
  for (const [materialId, qty] of planned) {
    const line = existing.find((l) => l.materialId === materialId);
    if (!line) {
      await addCatalogLine(db, { draftId: draft.id, materialId, quantity: qty });
      changed = true;
      continue;
    }
    if (Number(line.quantity) !== qty) {
      await updateDraftLine(db, { draftId: draft.id, lineId: line.id, quantity: qty });
      changed = true;
    }
  }

  // A carton line for a carton the plan NO LONGER uses is corrected to the new
  // plan above only if the material still appears. One that vanished entirely
  // is left for the admin: silently deleting a cost line is not this function's
  // call to make, and the draft panel shows it plainly.
  return { detail: changed ? "synced" : "already_current", quantities };
}

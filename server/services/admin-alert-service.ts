// Admin low-stock alerts for cartons.
//
// Deduplication is the database's job, not the application's: a partial unique
// index on (material_id) WHERE state = 'open' means at most one open alert per
// carton can exist, so `ON CONFLICT DO NOTHING` is safe even if two requests
// evaluate the same material at the same moment.
//
// Re-arming is a state transition, not a timer. An alert closes only when
// available rises back above the threshold; dropping below again opens a
// genuinely new one. A cooldown window would have been simpler and wrong — it
// would swallow a real new shortage that happened inside the window.
//
// Reading never creates an alert. Only a stock evaluation does.
import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { adminStockAlerts } from "../../shared/packing-schema.js";
import type { FulfillmentDb, FulfillmentExecutor } from "./fulfillment-db.js";
import { getCartonStock } from "./carton-reservation-service.js";

export type AlertLevel = "low" | "critical";

export interface AlertDecision {
  action: "open" | "close" | "none";
  level?: AlertLevel;
  available: number;
  onHand: number;
  reserved: number;
  threshold: number | null;
}

/**
 * Pure decision: given stock and a threshold, should an alert be open, closed,
 * or left alone?
 *
 * `available <= 0` is critical even when a threshold was never configured — no
 * cartons at all is worth saying regardless of how the owner set things up.
 * A null threshold otherwise means "not monitored".
 */
export function decideAlert(
  stock: { onHand: number; reserved: number; available: number },
  threshold: number | null,
  hasOpenAlert: boolean,
  openLevel?: AlertLevel,
): AlertDecision {
  const base = {
    available: stock.available,
    onHand: stock.onHand,
    reserved: stock.reserved,
    threshold,
  };

  if (stock.available <= 0) {
    if (hasOpenAlert && openLevel === "critical") return { action: "none", ...base };
    return { action: "open", level: "critical", ...base };
  }

  if (threshold != null && stock.available <= threshold) {
    if (hasOpenAlert && openLevel === "low") return { action: "none", ...base };
    return { action: "open", level: "low", ...base };
  }

  // Above the threshold: close anything open. This is the re-arm.
  return { action: hasOpenAlert ? "close" : "none", ...base };
}

/** Message shown in the admin, e.g. "تنبيه: بقي 8 كراتين فقط من قياس 27×20×14 سم". */
export function alertMessageAr(params: {
  level: AlertLevel;
  available: number;
  cartonName: string;
  lengthCm?: number | null;
  widthCm?: number | null;
  heightCm?: number | null;
}): string {
  const dims =
    params.lengthCm && params.widthCm && params.heightCm
      ? ` من قياس ${trim(params.lengthCm)}×${trim(params.widthCm)}×${trim(params.heightCm)} سم`
      : ` — ${params.cartonName}`;
  if (params.level === "critical") {
    return `تنبيه حرج: ماكو ولا كارتونة متاحة${dims}`;
  }
  return `تنبيه: بقي ${params.available} كراتين فقط${dims}`;
}

function trim(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(1)));
}

export interface MaterialAlertContext {
  materialId: string;
  name: string;
  lowStockThreshold: number | null;
  internalLengthCm: number | null;
  internalWidthCm: number | null;
  internalHeightCm: number | null;
}

/**
 * Evaluate one carton and open or close its alert.
 *
 * Safe to call after every reservation, release and consumption — repeated calls
 * with unchanged stock do nothing at all.
 */
export async function evaluateStockAlert(
  db: FulfillmentDb,
  material: MaterialAlertContext,
): Promise<AlertDecision> {
  return db.transaction(async (tx: FulfillmentExecutor) => {
    const stock = await getCartonStock(tx, material.materialId);

    const open = await tx
      .select()
      .from(adminStockAlerts)
      .where(
        and(
          eq(adminStockAlerts.materialId, material.materialId),
          eq(adminStockAlerts.state, "open"),
        ),
      )
      .limit(1);
    const existing = open[0];

    const decision = decideAlert(
      stock,
      material.lowStockThreshold,
      Boolean(existing),
      existing?.alertLevel as AlertLevel | undefined,
    );

    if (decision.action === "close" && existing) {
      await tx
        .update(adminStockAlerts)
        .set({ state: "closed", closedAt: new Date() })
        .where(eq(adminStockAlerts.id, existing.id));
      return decision;
    }

    if (decision.action === "open") {
      // A level change (low -> critical) closes the old alert first so the
      // partial unique index stays satisfied and the history keeps both.
      if (existing) {
        await tx
          .update(adminStockAlerts)
          .set({ state: "closed", closedAt: new Date() })
          .where(eq(adminStockAlerts.id, existing.id));
      }
      await tx.execute(sql`
        INSERT INTO admin_stock_alerts
          (id, material_id, alert_level, state, on_hand_snapshot, reserved_snapshot,
           available_snapshot, threshold_snapshot, message_ar)
        VALUES (${randomUUID()}, ${material.materialId}, ${decision.level}, 'open',
                ${stock.onHand}, ${stock.reserved}, ${stock.available},
                ${material.lowStockThreshold},
                ${alertMessageAr({
                  level: decision.level as AlertLevel,
                  available: stock.available,
                  cartonName: material.name,
                  lengthCm: material.internalLengthCm,
                  widthCm: material.internalWidthCm,
                  heightCm: material.internalHeightCm,
                })})
        ON CONFLICT DO NOTHING
      `);
    }

    return decision;
  });
}

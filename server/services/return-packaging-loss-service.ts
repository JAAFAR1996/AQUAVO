// Return-loss classification for packaging.
//
// When a shipped order comes back, the carton is destroyed — but nothing
// physical happens at that moment. The carton left stock at shipment
// (fulfillment_usage) and its cost was frozen then. It does not leave stock
// again and it never returns to stock.
//
// So a return produces a CLASSIFICATION, not an expense:
//   * no inventory movement of any kind — not a return_to_stock, not a second
//     negative quantity, and not a zero-quantity marker row (the ledger records
//     real physical quantity changes, and pim_direction_chk would reject a zero
//     outright);
//   * one row per consumed carton line, carrying the ORIGINAL cost snapshot;
//   * `isReclassificationOnly` true, so reports display the amount and never add
//     it to an expense total.
//
// SCOPE — the sticker and the card come back with the order. They are not
// damaged, they are not losses, and their 50 and 100 IQD stay exactly where they
// are: inside the original fulfillment snapshot. Automatic classification is
// cartons and cartons only. Anything else needs an admin to say so explicitly.
import { toMoneyOrNull } from "../../shared/order-financials.js";

export type LossCategory = "damaged_carton" | "damaged_material" | "missing_material";
export type ClassificationMode = "automatic" | "admin_recorded";

/** A frozen line from the shipment, joined to what kind of material it was. */
export interface ConsumedLine {
  lineId: string;
  eventId: string;
  materialId: string | null;
  materialName: string;
  /** 'carton' | 'consumable'. Only 'carton' is ever classified automatically. */
  materialKind: string | null;
  quantity: number;
  unitCostSnapshot: number | null;
  totalCost: number | null;
  costStatus: string;
}

export interface ReturnLossClassification {
  fulfillmentEventId: string;
  fulfillmentLineId: string;
  materialId: string | null;
  materialNameSnapshot: string;
  quantity: number;
  originalUnitCostSnapshot: number | null;
  originalTotalCostSnapshot: number | null;
  originalCostStatus: string;
  lossCategory: LossCategory;
  classificationMode: ClassificationMode;
  isReclassificationOnly: true;
  reason: string;
}

export const DAMAGED_CARTON_REASON_AR = "كارتونة تالفة بسبب طلب راجع";

/** The return types that damage the carton without anyone having to confirm it. */
export const FULL_RETURN_STATUSES = ["returned", "rejected_returned", "rejected_carrier"] as const;

export function isFullReturnStatus(status: string | null | undefined): boolean {
  const s = (status ?? "").trim().toLowerCase();
  return (FULL_RETURN_STATUSES as readonly string[]).includes(s);
}

/**
 * Which consumed lines a FULL return classifies automatically.
 *
 * Cartons only. A line whose material kind is anything else — sticker, card,
 * tape, filler — is skipped entirely: no row, no loss, no reversal. Lines with
 * no material id (exceptional manual entries) are skipped too, because there is
 * nothing to prove they were a carton.
 */
export function selectAutoClassifiableLines(lines: readonly ConsumedLine[]): ConsumedLine[] {
  return lines
    .filter((l) => l.materialKind === "carton" && l.materialId != null)
    .sort((a, b) => (a.lineId < b.lineId ? -1 : a.lineId > b.lineId ? 1 : 0));
}

/**
 * Build the classification rows for a full return.
 *
 * `alreadyClassifiedLineIds` carries whatever an earlier partial return already
 * recorded, so a full return after a partial one tops up the remaining cartons
 * instead of duplicating the one already classified. The database enforces the
 * same rule independently via a unique index on fulfillment_line_id — this is
 * the readable half of that guarantee, not a substitute for it.
 */
export function classifyFullReturn(
  lines: readonly ConsumedLine[],
  alreadyClassifiedLineIds: ReadonlySet<string> = new Set(),
): ReturnLossClassification[] {
  return selectAutoClassifiableLines(lines)
    .filter((l) => !alreadyClassifiedLineIds.has(l.lineId))
    .map((l) => ({
      fulfillmentEventId: l.eventId,
      fulfillmentLineId: l.lineId,
      materialId: l.materialId,
      materialNameSnapshot: l.materialName,
      quantity: l.quantity,
      originalUnitCostSnapshot: toMoneyOrNull(l.unitCostSnapshot),
      originalTotalCostSnapshot: toMoneyOrNull(l.totalCost),
      originalCostStatus: l.costStatus,
      lossCategory: "damaged_carton" as const,
      classificationMode: "automatic" as const,
      isReclassificationOnly: true as const,
      reason: DAMAGED_CARTON_REASON_AR,
    }));
}

export interface AdminDamageRecord {
  fulfillmentLineId: string;
  quantity: number;
  lossCategory: LossCategory;
  reason: string;
}

export class ReturnClassificationError extends Error {
  constructor(
    message: string,
    readonly code:
      | "REASON_REQUIRED"
      | "LINE_NOT_CONSUMED"
      | "QUANTITY_EXCEEDS_CONSUMED"
      | "ALREADY_CLASSIFIED"
      | "QUANTITY_NOT_POSITIVE",
  ) {
    super(message);
    this.name = "ReturnClassificationError";
  }
}

/**
 * A PARTIAL return classifies nothing on its own.
 *
 * The customer kept part of the order; whether the carton physically came back
 * damaged is a fact only the person opening the parcel knows. So the admin names
 * the line and the quantity, and must give a reason.
 *
 * Guards: the line must belong to this shipment, the quantity must be positive
 * and must not exceed what was actually consumed, and a line already classified
 * cannot be classified again — one carton unit is a loss once.
 */
export function classifyAdminRecordedDamage(
  record: AdminDamageRecord,
  consumedLines: readonly ConsumedLine[],
  alreadyClassifiedLineIds: ReadonlySet<string> = new Set(),
): ReturnLossClassification {
  if (!record.reason || record.reason.trim().length < 3) {
    throw new ReturnClassificationError(
      "تسجيل تلف مواد التغليف يتطلب سبباً",
      "REASON_REQUIRED",
    );
  }
  const line = consumedLines.find((l) => l.lineId === record.fulfillmentLineId);
  if (!line) {
    throw new ReturnClassificationError(
      "هذا السطر لا يعود لشحنة هذا الطلب",
      "LINE_NOT_CONSUMED",
    );
  }
  if (!(record.quantity > 0)) {
    throw new ReturnClassificationError("الكمية لازم تكون أكبر من صفر", "QUANTITY_NOT_POSITIVE");
  }
  if (record.quantity > line.quantity) {
    throw new ReturnClassificationError(
      `الكمية المصنّفة (${record.quantity}) تتجاوز الكمية المستهلكة فعلاً (${line.quantity})`,
      "QUANTITY_EXCEEDS_CONSUMED",
    );
  }
  if (alreadyClassifiedLineIds.has(line.lineId)) {
    throw new ReturnClassificationError(
      "هذا السطر مصنّف مسبقاً — وحدة الكارتونة تُصنّف مرة واحدة فقط",
      "ALREADY_CLASSIFIED",
    );
  }

  // Per-unit cost times the confirmed damaged quantity: a partial classification
  // must not carry the whole line's total when only some units came back.
  const unit = toMoneyOrNull(line.unitCostSnapshot);
  const total =
    unit != null
      ? unit * record.quantity
      : record.quantity === line.quantity
        ? toMoneyOrNull(line.totalCost)
        : null;

  return {
    fulfillmentEventId: line.eventId,
    fulfillmentLineId: line.lineId,
    materialId: line.materialId,
    materialNameSnapshot: line.materialName,
    quantity: record.quantity,
    originalUnitCostSnapshot: unit,
    originalTotalCostSnapshot: total,
    originalCostStatus: line.costStatus,
    lossCategory: record.lossCategory,
    classificationMode: "admin_recorded",
    isReclassificationOnly: true,
    reason: record.reason.trim(),
  };
}

/**
 * The figure shown as "return packaging loss".
 *
 * Only the classified rows count, which is cartons plus anything an admin
 * explicitly recorded. The sticker and the card are absent by construction —
 * they were never classified, so there is nothing here to exclude.
 *
 * Returns null if any contributing snapshot cost is unknown, rather than
 * silently under-reporting the loss.
 */
export function totalReturnPackagingLoss(
  classifications: readonly ReturnLossClassification[],
): number | null {
  if (classifications.length === 0) return 0;
  let total = 0;
  for (const c of classifications) {
    if (c.originalTotalCostSnapshot == null) return null;
    total += c.originalTotalCostSnapshot;
  }
  return total;
}

/**
 * Whether a packaging_loss figure may be added to an expense total.
 *
 * 'manual' rows are historical, hand-typed, and were never part of a fulfillment
 * snapshot — those are real, additive numbers. 'fulfillment_snapshot' rows
 * restate a cost already recognised at shipment; adding them would deduct the
 * same money twice.
 */
export function isAdditiveReturnLoss(source: string | null | undefined): boolean {
  return (source ?? "manual") === "manual";
}

import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import {
  fulfillmentMaterials,
  materialCostRecords,
  packagingInventoryMovements,
} from "../../shared/schema.js";
import {
  PG_ERRORS,
  pgErrorCode,
  type FulfillmentDb,
  type FulfillmentTx,
} from "./fulfillment-db.js";
import { recordFinancialChange } from "./accountingAuditTrail.js";

export interface CartonOnboardingInput {
  name: string;
  sku: string;
  notes?: string | null;
  internalLengthCm: number;
  internalWidthCm: number;
  internalHeightCm: number;
  /** Clearance reserved from every inside wall by the geometry engine. */
  safetyPaddingCm: number;
  maxWeightKg: number;
  lowStockThreshold: number;
  openingQuantity: number;
  unitCostIqd: number;
  costEffectiveDate: string;
  costSource: string;
  idempotencyKey: string;
}

export interface CartonOnboardingActor {
  id: string | null;
  name: string | null;
}

export interface CartonOnboardingHooks {
  afterMaterialCreated?: (tx: FulfillmentTx) => Promise<void> | void;
  afterOpeningStockCreated?: (tx: FulfillmentTx) => Promise<void> | void;
  afterCostCreated?: (tx: FulfillmentTx) => Promise<void> | void;
}

export interface CartonOnboardingResult {
  cartonId: string;
  costRecordId: string;
  openingMovementId: string | null;
  replayed: boolean;
}

function stableId(prefix: string, key: string): string {
  const digest = createHash("sha256").update(key, "utf8").digest("hex").slice(0, 32);
  return prefix + "-" + digest;
}

function sameNumber(value: unknown, expected: number): boolean {
  return Number(value) === expected;
}

function sameDate(value: unknown, expectedDate: string): boolean {
  if (!value) return false;
  return new Date(value as string | number | Date).toISOString().slice(0, 10) === expectedDate;
}

function normalizedText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return value.trim() || null;
}

async function existingReplay(
  db: FulfillmentDb,
  input: CartonOnboardingInput,
  materialId: string,
  costRecordId: string,
  movementId: string,
): Promise<CartonOnboardingResult | null> {
  const [material] = await db
    .select()
    .from(fulfillmentMaterials)
    .where(eq(fulfillmentMaterials.id, materialId))
    .limit(1);
  if (!material) return null;

  const [cost] = await db
    .select()
    .from(materialCostRecords)
    .where(eq(materialCostRecords.id, costRecordId))
    .limit(1);
  const [movement] = input.openingQuantity > 0
    ? await db
        .select()
        .from(packagingInventoryMovements)
        .where(eq(packagingInventoryMovements.id, movementId))
        .limit(1)
    : [undefined];

  const complete =
    material.materialKind === "carton" &&
    material.stockTracked === true &&
    material.name === input.name &&
    material.sku === input.sku &&
    normalizedText(material.notes) === normalizedText(input.notes) &&
    sameNumber(material.internalLengthCm, input.internalLengthCm) &&
    sameNumber(material.internalWidthCm, input.internalWidthCm) &&
    sameNumber(material.internalHeightCm, input.internalHeightCm) &&
    sameNumber(material.safetyPaddingCm, input.safetyPaddingCm) &&
    sameNumber(material.maxWeightKg, input.maxWeightKg) &&
    sameNumber(material.lowStockThreshold, input.lowStockThreshold) &&
    material.currentCostRecordId === costRecordId &&
    cost?.materialId === materialId &&
    cost.approvalStatus === "approved" &&
    sameNumber(cost.unitCost, input.unitCostIqd) &&
    sameDate(cost.effectiveDate, input.costEffectiveDate) &&
    normalizedText(cost.reason) === normalizedText(input.costSource) &&
    (input.openingQuantity === 0 ||
      (movement?.materialId === materialId &&
        movement.movementType === "purchase_receipt" &&
        sameNumber(movement.quantity, input.openingQuantity)));

  if (!complete) {
    throw new Error("IDEMPOTENCY_KEY_REUSED: تعذر إعادة العملية لأن المفتاح مرتبط ببيانات مختلفة أو غير مكتملة");
  }

  return {
    cartonId: materialId,
    costRecordId,
    openingMovementId: input.openingQuantity > 0 ? movementId : null,
    replayed: true,
  };
}

async function duplicateSkuExists(tx: FulfillmentTx, sku: string): Promise<boolean> {
  const rows = await tx
    .select({ id: fulfillmentMaterials.id, sku: fulfillmentMaterials.sku })
    .from(fulfillmentMaterials)
    .where(eq(fulfillmentMaterials.materialKind, "carton"));
  return rows.some((row) => row.sku?.trim().toUpperCase() === sku);
}

async function runTransaction(
  db: FulfillmentDb,
  input: CartonOnboardingInput,
  actor: CartonOnboardingActor,
  hooks: CartonOnboardingHooks,
  materialId: string,
  costRecordId: string,
  movementId: string,
): Promise<CartonOnboardingResult> {
  const replay = await existingReplay(db, input, materialId, costRecordId, movementId);
  if (replay) return replay;

  return db.transaction(async (tx) => {
    const [inside] = await tx
      .select()
      .from(fulfillmentMaterials)
      .where(eq(fulfillmentMaterials.id, materialId))
      .limit(1);
    if (inside) {
      throw new Error("IDEMPOTENCY_CONFLICT");
    }
    if (await duplicateSkuExists(tx, input.sku)) {
      throw new Error("DUPLICATE_CARTON_SKU: رمز الكارتونة مستخدم من قبل");
    }

    await tx.insert(fulfillmentMaterials).values({
      id: materialId,
      name: input.name,
      sku: input.sku,
      category: "box",
      materialKind: "carton",
      calculationBasis: "per_carton",
      stockTracked: true,
      unit: "piece",
      currency: "IQD",
      active: true,
      internalLengthCm: String(input.internalLengthCm),
      internalWidthCm: String(input.internalWidthCm),
      internalHeightCm: String(input.internalHeightCm),
      safetyPaddingCm: String(input.safetyPaddingCm),
      maxWeightKg: String(input.maxWeightKg),
      lowStockThreshold: String(input.lowStockThreshold),
      notes: input.notes?.trim() || null,
    });

    await hooks.afterMaterialCreated?.(tx);

    if (input.openingQuantity > 0) {
      await tx.insert(packagingInventoryMovements).values({
        id: movementId,
        materialId,
        movementType: "purchase_receipt",
        quantity: String(input.openingQuantity),
        idempotencyKey: "carton-opening:" + input.idempotencyKey,
        sourceDocument: "رصيد افتتاحي عند إنشاء الكارتونة",
        recordedBy: actor.id,
      });
      await hooks.afterOpeningStockCreated?.(tx);
    }

    const effectiveDate = new Date(input.costEffectiveDate + "T00:00:00.000Z");
    const now = new Date();
    await tx.insert(materialCostRecords).values({
      id: costRecordId,
      materialId,
      costBasis: "verified_manual_standard",
      purchaseId: null,
      unitCost: String(input.unitCostIqd),
      currency: "IQD",
      approvalStatus: "approved",
      approvedBy: actor.id ?? actor.name ?? "admin",
      approvedAt: now,
      effectiveDate,
      reason: input.costSource,
      evidenceUrl: null,
      createdBy: actor.id,
    });

    await tx
      .update(fulfillmentMaterials)
      .set({
        currentCostRecordId: costRecordId,
        currentCostPurchaseId: null,
        currentUnitCost: String(input.unitCostIqd),
        updatedAt: now,
      })
      .where(eq(fulfillmentMaterials.id, materialId));

    await hooks.afterCostCreated?.(tx);

    await recordFinancialChange(tx, {
      entityType: "fulfillment_material",
      entityId: materialId,
      action: "create",
      fieldName: "carton_created",
      oldValue: null,
      newValue: {
        name: input.name,
        sku: input.sku,
        internalLengthCm: input.internalLengthCm,
        internalWidthCm: input.internalWidthCm,
        internalHeightCm: input.internalHeightCm,
        safetyPaddingCm: input.safetyPaddingCm,
        maxWeightKg: input.maxWeightKg,
        lowStockThreshold: input.lowStockThreshold,
      },
      reason: "إنشاء كارتونة جديدة من نموذج الإعداد الموحد",
      performedBy: actor.id,
      performedByName: actor.name,
    });

    if (input.openingQuantity > 0) {
      await recordFinancialChange(tx, {
        entityType: "fulfillment_material",
        entityId: materialId,
        action: "create",
        fieldName: "opening_carton_stock",
        oldValue: null,
        newValue: { quantity: input.openingQuantity, movementId },
        reason: "تسجيل الرصيد الافتتاحي للكارتونة",
        performedBy: actor.id,
        performedByName: actor.name,
      });
    }

    await recordFinancialChange(tx, {
      entityType: "fulfillment_cost_record",
      entityId: costRecordId,
      action: "create",
      fieldName: "approved_unit_cost",
      oldValue: null,
      newValue: {
        materialId,
        unitCostIqd: input.unitCostIqd,
        effectiveDate: input.costEffectiveDate,
      },
      reason: input.costSource,
      performedBy: actor.id,
      performedByName: actor.name,
    });

    return {
      cartonId: materialId,
      costRecordId,
      openingMovementId: input.openingQuantity > 0 ? movementId : null,
      replayed: false,
    };
  });
}

export async function setupCartonAtomically(
  db: FulfillmentDb,
  input: CartonOnboardingInput,
  actor: CartonOnboardingActor,
  hooks: CartonOnboardingHooks = {},
): Promise<CartonOnboardingResult> {
  const materialId = stableId("carton", input.idempotencyKey);
  const costRecordId = stableId("carton-cost", input.idempotencyKey);
  const movementId = stableId("carton-opening", input.idempotencyKey);

  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await runTransaction(
        db,
        input,
        actor,
        hooks,
        materialId,
        costRecordId,
        movementId,
      );
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      if (message.startsWith("DUPLICATE_CARTON_SKU") || message.startsWith("IDEMPOTENCY_KEY_REUSED")) {
        throw error;
      }

      const code = pgErrorCode(error);
      const transient =
        code === PG_ERRORS.SERIALIZATION_FAILURE ||
        code === PG_ERRORS.DEADLOCK_DETECTED ||
        code === PG_ERRORS.UNIQUE_VIOLATION ||
        message === "IDEMPOTENCY_CONFLICT";
      if (!transient || attempt === 3) break;

      const replay = await existingReplay(db, input, materialId, costRecordId, movementId);
      if (replay) return replay;
    }
  }

  const replay = await existingReplay(db, input, materialId, costRecordId, movementId);
  if (replay) return replay;

  if (pgErrorCode(lastError) === PG_ERRORS.UNIQUE_VIOLATION) {
    throw new Error("DUPLICATE_CARTON_SKU: رمز الكارتونة مستخدم من قبل");
  }
  throw lastError;
}

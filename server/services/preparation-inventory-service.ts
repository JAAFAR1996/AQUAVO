import { randomUUID } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "../db.js";
import {
  fulfillmentMaterials,
  packagingInventoryMovements,
} from "../../shared/schema.js";
import { toMoneyOrNull } from "../../shared/order-financials.js";
import type { FulfillmentDb, FulfillmentExecutor } from "./fulfillment-db.js";
import { recordFinancialChange } from "./accountingAuditTrail.js";

interface DriverRows<T> { rows: T[] }
function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === "object" && Array.isArray((result as DriverRows<T>).rows)) {
    return (result as DriverRows<T>).rows;
  }
  return [];
}

function requireDb(dbArg?: FulfillmentDb): FulfillmentDb {
  const db = dbArg ?? (getDb() as FulfillmentDb | null);
  if (!db) throw new Error("Database not available");
  return db;
}

async function lockMaterial(tx: FulfillmentExecutor, materialId: string): Promise<void> {
  // Same key used by fulfillment confirmation and carton reservations.
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`carton:${materialId}`}))`);
}

async function ledgerBalance(db: FulfillmentExecutor, materialId: string): Promise<number> {
  const result = await db.execute(sql`
    SELECT COALESCE(SUM(quantity), 0) AS balance
      FROM packaging_inventory_movements
     WHERE material_id = ${materialId}
  `);
  return Number(rowsOf<{ balance: string | number }>(result)[0]?.balance ?? 0);
}

async function findMovementByIdempotency(db: FulfillmentExecutor, key: string) {
  const [row] = await db.select().from(packagingInventoryMovements)
    .where(eq(packagingInventoryMovements.idempotencyKey, key)).limit(1);
  return row;
}

async function requirePreparationMaterial(db: FulfillmentExecutor, materialId: string) {
  const [material] = await db.select().from(fulfillmentMaterials).where(and(
    eq(fulfillmentMaterials.id, materialId),
    eq(fulfillmentMaterials.materialKind, "consumable"),
  )).limit(1);
  if (!material) throw new Error("MATERIAL_NOT_FOUND: مادة التجهيز غير موجودة");
  if (material.archivedAt) throw new Error("MATERIAL_INACTIVE: المادة مؤرشفة ولا يمكن تعديل مخزونها");
  return material;
}

export interface PreparationInventoryItem {
  id: string;
  name: string;
  sku: string | null;
  unitCost: number | null;
  currency: string;
  calculationBasis: string;
  stockTracked: boolean;
  stockBalance: number;
  lowStockThreshold: number | null;
  active: boolean;
  archivedAt: string | null;
  notes: string | null;
}

export async function listPreparationInventory(
  dbArg?: FulfillmentDb,
): Promise<PreparationInventoryItem[]> {
  const db = requireDb(dbArg);
  const materials = await db.select().from(fulfillmentMaterials)
    .where(eq(fulfillmentMaterials.materialKind, "consumable"));
  const items: PreparationInventoryItem[] = [];
  for (const material of materials) {
    items.push({
      id: material.id,
      name: material.name,
      sku: material.sku,
      unitCost: toMoneyOrNull(material.currentUnitCost),
      currency: material.currency,
      calculationBasis: material.calculationBasis,
      stockTracked: material.stockTracked,
      stockBalance: await ledgerBalance(db, material.id),
      lowStockThreshold: toMoneyOrNull(material.lowStockThreshold),
      active: material.active,
      archivedAt: material.archivedAt ? new Date(material.archivedAt).toISOString() : null,
      notes: material.notes,
    });
  }
  return items.sort((a, b) => (a.sku ?? a.name).localeCompare(b.sku ?? b.name));
}

export interface PreparationInventoryMovementView {
  id: string;
  movementType: string;
  quantity: number;
  orderId: string | null;
  eventId: string | null;
  lineId: string | null;
  purchaseId: string | null;
  reversalOfMovementId: string | null;
  idempotencyKey: string;
  sourceDocument: string | null;
  recordedBy: string | null;
  createdAt: string;
}

export async function getPreparationInventoryHistory(
  dbArg: FulfillmentDb | undefined,
  materialId: string,
  limit = 200,
): Promise<{ balance: number; movements: PreparationInventoryMovementView[] }> {
  const db = requireDb(dbArg);
  await requirePreparationMaterial(db, materialId);
  const movements = await db.select().from(packagingInventoryMovements)
    .where(eq(packagingInventoryMovements.materialId, materialId))
    .orderBy(desc(packagingInventoryMovements.createdAt))
    .limit(Math.min(Math.max(limit, 1), 500));
  return {
    balance: await ledgerBalance(db, materialId),
    movements: movements.map((m) => ({
      id: m.id,
      movementType: m.movementType,
      quantity: Number(m.quantity),
      orderId: m.orderId,
      eventId: m.eventId,
      lineId: m.lineId,
      purchaseId: m.purchaseId,
      reversalOfMovementId: m.reversalOfMovementId,
      idempotencyKey: m.idempotencyKey,
      sourceDocument: m.sourceDocument,
      recordedBy: m.recordedBy,
      createdAt: (m.createdAt instanceof Date ? m.createdAt : new Date(String(m.createdAt))).toISOString(),
    })),
  };
}

interface Actor {
  id?: string | null;
  name?: string | null;
}

export interface StocktakeInput {
  materialId: string;
  targetQuantity: number;
  reason: string;
  idempotencyKey: string;
  actor?: Actor;
}

export async function stocktakePreparationMaterial(
  dbArg: FulfillmentDb | undefined,
  input: StocktakeInput,
): Promise<{ balance: number; adjustment: number; movementId: string; reused: boolean }> {
  const db = requireDb(dbArg);
  if (!Number.isFinite(input.targetQuantity) || input.targetQuantity < 0) {
    throw new Error("QUANTITY_INVALID: الكمية الفعلية يجب أن تكون صفر أو أكثر");
  }
  const key = `stocktake:${input.materialId}:${input.idempotencyKey}`;
  const existing = await findMovementByIdempotency(db, key);
  if (existing) {
    return {
      balance: await ledgerBalance(db, input.materialId),
      adjustment: Number(existing.quantity), movementId: existing.id, reused: true,
    };
  }

  return db.transaction(async (tx) => {
    await lockMaterial(tx, input.materialId);
    const raced = await findMovementByIdempotency(tx, key);
    if (raced) {
      return {
        balance: await ledgerBalance(tx, input.materialId),
        adjustment: Number(raced.quantity), movementId: raced.id, reused: true,
      };
    }
    const material = await requirePreparationMaterial(tx, input.materialId);
    if (!material.stockTracked) {
      throw new Error("STOCK_TRACKING_REQUIRED: فعّل تتبع مخزون المادة أولاً وحدد الكمية الحالية");
    }
    const before = await ledgerBalance(tx, input.materialId);
    const adjustment = input.targetQuantity - before;
    const movementId = randomUUID();
    await tx.insert(packagingInventoryMovements).values({
      id: movementId,
      materialId: input.materialId,
      movementType: "correction",
      quantity: String(adjustment),
      idempotencyKey: key,
      sourceDocument: `جرد فعلي: ${input.reason.trim()}`,
      recordedBy: input.actor?.id ?? null,
    });
    await recordFinancialChange(tx, {
      entityType: "fulfillment_material",
      entityId: input.materialId,
      action: "update",
      fieldName: "stock_balance_stocktake",
      oldValue: before,
      newValue: input.targetQuantity,
      reason: input.reason,
      performedBy: input.actor?.id ?? null,
      performedByName: input.actor?.name ?? null,
    });
    return { balance: input.targetQuantity, adjustment, movementId, reused: false };
  });
}

export interface ReceiveStockInput {
  materialId: string;
  quantity: number;
  reason: string;
  idempotencyKey: string;
  actor?: Actor;
}

export async function receivePreparationMaterialStock(
  dbArg: FulfillmentDb | undefined,
  input: ReceiveStockInput,
): Promise<{ balance: number; movementId: string; reused: boolean }> {
  const db = requireDb(dbArg);
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    throw new Error("QUANTITY_INVALID: كمية الاستلام يجب أن تكون أكبر من صفر");
  }
  const key = `material-receipt:${input.materialId}:${input.idempotencyKey}`;
  const existing = await findMovementByIdempotency(db, key);
  if (existing) return { balance: await ledgerBalance(db, input.materialId), movementId: existing.id, reused: true };

  return db.transaction(async (tx) => {
    await lockMaterial(tx, input.materialId);
    const raced = await findMovementByIdempotency(tx, key);
    if (raced) return { balance: await ledgerBalance(tx, input.materialId), movementId: raced.id, reused: true };
    const material = await requirePreparationMaterial(tx, input.materialId);
    if (!material.stockTracked) {
      throw new Error("STOCK_TRACKING_REQUIRED: فعّل تتبع مخزون المادة قبل إضافة رصيد");
    }
    const before = await ledgerBalance(tx, input.materialId);
    const movementId = randomUUID();
    await tx.insert(packagingInventoryMovements).values({
      id: movementId,
      materialId: input.materialId,
      movementType: "purchase_receipt",
      quantity: String(input.quantity),
      idempotencyKey: key,
      sourceDocument: `استلام مخزون: ${input.reason.trim()}`,
      recordedBy: input.actor?.id ?? null,
    });
    const after = before + input.quantity;
    await recordFinancialChange(tx, {
      entityType: "fulfillment_material",
      entityId: input.materialId,
      action: "update",
      fieldName: "stock_receipt",
      oldValue: before,
      newValue: after,
      reason: input.reason,
      performedBy: input.actor?.id ?? null,
      performedByName: input.actor?.name ?? null,
    });
    return { balance: after, movementId, reused: false };
  });
}

export interface SetTrackingInput {
  materialId: string;
  enabled: boolean;
  currentQuantity?: number;
  lowStockThreshold?: number | null;
  reason: string;
  idempotencyKey: string;
  actor?: Actor;
}

export async function setPreparationMaterialTracking(
  dbArg: FulfillmentDb | undefined,
  input: SetTrackingInput,
): Promise<{
  stockTracked: boolean;
  balance: number;
  adjustment: number;
  movementId: string | null;
  reused: boolean;
}> {
  const db = requireDb(dbArg);
  if (input.lowStockThreshold != null && (!Number.isFinite(input.lowStockThreshold) || input.lowStockThreshold < 0)) {
    throw new Error("THRESHOLD_INVALID: حد التنبيه يجب أن يكون صفر أو أكثر");
  }
  if (input.enabled && (input.currentQuantity === undefined || !Number.isFinite(input.currentQuantity) || input.currentQuantity < 0)) {
    throw new Error("CURRENT_QUANTITY_REQUIRED: عند تفعيل التتبع يجب إدخال الكمية الفعلية الحالية");
  }

  return db.transaction(async (tx) => {
    await lockMaterial(tx, input.materialId);
    const material = await requirePreparationMaterial(tx, input.materialId);
    const beforeBalance = await ledgerBalance(tx, input.materialId);

    if (material.stockTracked === input.enabled) {
      return {
        stockTracked: material.stockTracked,
        balance: beforeBalance,
        adjustment: 0,
        movementId: null,
        reused: true,
      };
    }

    let movementId: string | null = null;
    let adjustment = 0;
    let resultingBalance = beforeBalance;

    if (input.enabled) {
      const key = `tracking-open:${input.materialId}:${input.idempotencyKey}`;
      const raced = await findMovementByIdempotency(tx, key);
      if (raced) {
        return {
          stockTracked: true,
          balance: await ledgerBalance(tx, input.materialId),
          adjustment: Number(raced.quantity),
          movementId: raced.id,
          reused: true,
        };
      }
      const target = input.currentQuantity as number;
      adjustment = target - beforeBalance;
      resultingBalance = target;
      movementId = randomUUID();
      await tx.insert(packagingInventoryMovements).values({
        id: movementId,
        materialId: input.materialId,
        movementType: "correction",
        quantity: String(adjustment),
        idempotencyKey: key,
        sourceDocument: `جرد افتتاحي عند تفعيل التتبع: ${input.reason.trim()}`,
        recordedBy: input.actor?.id ?? null,
      });
    }

    await tx.update(fulfillmentMaterials).set({
      stockTracked: input.enabled,
      lowStockThreshold: input.lowStockThreshold === undefined
        ? material.lowStockThreshold
        : input.lowStockThreshold === null ? null : String(input.lowStockThreshold),
      updatedAt: new Date(),
    }).where(eq(fulfillmentMaterials.id, input.materialId));

    await recordFinancialChange(tx, {
      entityType: "fulfillment_material",
      entityId: input.materialId,
      action: "update",
      fieldName: "stock_tracking",
      oldValue: { enabled: material.stockTracked, balance: beforeBalance },
      newValue: { enabled: input.enabled, balance: resultingBalance, lowStockThreshold: input.lowStockThreshold },
      reason: input.reason,
      performedBy: input.actor?.id ?? null,
      performedByName: input.actor?.name ?? null,
    });

    return {
      stockTracked: input.enabled,
      balance: resultingBalance,
      adjustment,
      movementId,
      reused: false,
    };
  });
}

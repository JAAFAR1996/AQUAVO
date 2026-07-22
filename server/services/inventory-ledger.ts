import { sql } from "drizzle-orm";
import { getDb } from "../db.js";
import {
  inventoryLocations,
  inventoryMovements,
  inventoryReconciliations,
  productVariantReconciliation,
} from "../../shared/operations-schema.js";

export type InventoryLedgerMode = "off" | "shadow" | "enforce";

export function getInventoryLedgerMode(): InventoryLedgerMode {
  const value = String(process.env.INVENTORY_LEDGER_MODE ?? "off").toLowerCase();
  return value === "enforce" || value === "shadow" ? value : "off";
}

function requireDb() {
  const db = getDb();
  if (!db) throw new Error("Database is not connected");
  return db;
}

async function getMainLocationId(tx: any): Promise<string> {
  const result = await tx.execute(sql`
    SELECT id
    FROM inventory_locations
    WHERE code = 'MAIN' AND is_active = true
    LIMIT 1
  `);
  const rows = Array.isArray(result) ? result : (result?.rows ?? []);
  const locationId = rows[0]?.id;
  if (!locationId) throw new Error("MAIN inventory location is not configured");
  return String(locationId);
}

export async function getCanonicalInventoryBalance(
  productId: string,
  variantId: string | null = null,
): Promise<number> {
  const db = requireDb();
  const result = await db.execute(sql`
    SELECT COALESCE(SUM(m.quantity_delta), 0)::bigint AS balance
    FROM inventory_movements m
    JOIN inventory_locations l ON l.id = m.location_id
    WHERE m.product_id = ${productId}
      AND m.variant_id IS NOT DISTINCT FROM ${variantId}
      AND l.code = 'MAIN'
  `);
  const rows = Array.isArray(result) ? result : (result?.rows ?? []);
  return Number(rows[0]?.balance ?? 0);
}

export async function applyApprovedOpeningBalance(args: {
  reconciliationId: string;
  approvedStock: number;
  actor: string;
  note?: string;
}): Promise<{ applied: boolean; balance: number }> {
  if (!Number.isInteger(args.approvedStock) || args.approvedStock < 0) {
    throw new Error("Approved opening stock must be a non-negative whole number");
  }

  const db = requireDb();
  return db.transaction(async (tx) => {
    const locked = await tx.execute(sql`
      SELECT id, product_id, variant_id, location_id, status, physical_count,
             approved_opening_stock
      FROM inventory_reconciliations
      WHERE id = ${args.reconciliationId}
      FOR UPDATE
    `);
    const rows = Array.isArray(locked) ? locked : (locked?.rows ?? []);
    const row = rows[0];
    if (!row) throw new Error("Inventory reconciliation row was not found");

    if (row.status === "applied") {
      const balance = await tx.execute(sql`
        SELECT COALESCE(SUM(quantity_delta), 0)::bigint AS balance
        FROM inventory_movements
        WHERE product_id = ${String(row.product_id)}
          AND variant_id IS NOT DISTINCT FROM ${row.variant_id ? String(row.variant_id) : null}
          AND location_id = ${String(row.location_id)}
      `);
      const balanceRows = Array.isArray(balance) ? balance : (balance?.rows ?? []);
      return { applied: false, balance: Number(balanceRows[0]?.balance ?? 0) };
    }

    if (!['counted', 'approved'].includes(String(row.status))) {
      throw new Error("Inventory must be counted and approved before an opening balance is applied");
    }

    if (row.physical_count !== null && Number(row.physical_count) !== args.approvedStock) {
      throw new Error("Approved stock differs from the recorded physical count");
    }

    const idempotencyKey = `opening_balance:${args.reconciliationId}`;

    if (args.approvedStock > 0) {
      await tx.insert(inventoryMovements).values({
        productId: String(row.product_id),
        variantId: row.variant_id ? String(row.variant_id) : null,
        locationId: String(row.location_id),
        quantityDelta: args.approvedStock,
        movementType: "opening_balance",
        sourceType: "inventory_reconciliation",
        sourceId: args.reconciliationId,
        idempotencyKey,
        currency: "IQD",
        happenedAt: new Date(),
        createdBy: args.actor,
        metadata: { note: args.note ?? null },
      } as any).onConflictDoNothing({ target: inventoryMovements.idempotencyKey });
    }

    await tx.update(inventoryReconciliations)
      .set({
        status: "applied",
        approvedOpeningStock: args.approvedStock,
        approvedBy: args.actor,
        approvedAt: new Date(),
        notes: args.note,
        updatedAt: new Date(),
      } as any)
      .where(sql`${inventoryReconciliations.id} = ${args.reconciliationId}`);

    if (row.variant_id) {
      await tx.update(productVariantReconciliation)
        .set({
          approvedCanonicalStock: args.approvedStock,
          reconciliationStatus: "approved",
          approvedBy: args.actor,
          approvedAt: new Date(),
          updatedAt: new Date(),
        } as any)
        .where(sql`
          ${productVariantReconciliation.productId} = ${String(row.product_id)}
          AND ${productVariantReconciliation.variantId} = ${String(row.variant_id)}
        `);
    }

    const balance = await tx.execute(sql`
      SELECT COALESCE(SUM(quantity_delta), 0)::bigint AS balance
      FROM inventory_movements
      WHERE product_id = ${String(row.product_id)}
        AND variant_id IS NOT DISTINCT FROM ${row.variant_id ? String(row.variant_id) : null}
        AND location_id = ${String(row.location_id)}
    `);
    const balanceRows = Array.isArray(balance) ? balance : (balance?.rows ?? []);
    return { applied: true, balance: Number(balanceRows[0]?.balance ?? 0) };
  });
}

export async function recordSaleInventoryMovement(
  tx: any,
  args: {
    orderId: string;
    lineKey: string;
    productId: string;
    variantId?: string | null;
    quantity: number;
    actor?: string;
  },
): Promise<{ recorded: boolean; mode: InventoryLedgerMode }> {
  const mode = getInventoryLedgerMode();
  if (mode !== "enforce") return { recorded: false, mode };

  if (!Number.isInteger(args.quantity) || args.quantity <= 0) {
    throw new Error("Sale inventory quantity must be a positive whole number");
  }

  const locationId = await getMainLocationId(tx);
  await tx.insert(inventoryMovements).values({
    productId: args.productId,
    variantId: args.variantId ?? null,
    locationId,
    quantityDelta: -args.quantity,
    movementType: "sale",
    sourceType: "order_line",
    sourceId: args.orderId,
    idempotencyKey: `order:${args.orderId}:line:${args.lineKey}`,
    currency: "IQD",
    happenedAt: new Date(),
    createdBy: args.actor ?? "system",
    metadata: { orderId: args.orderId, lineKey: args.lineKey },
  } as any).onConflictDoNothing({ target: inventoryMovements.idempotencyKey });

  return { recorded: true, mode };
}

export async function postVerifiedGoodsReceipt(
  receiptId: string,
  actor: string,
): Promise<void> {
  const db = requireDb();
  await db.execute(sql`SELECT post_goods_receipt(${receiptId}, ${actor})`);
}

export async function inventoryLedgerHealth(): Promise<{
  mode: InventoryLedgerMode;
  reconciliationOpen: number;
  canonicalMovementCount: number;
  mainLocationConfigured: boolean;
}> {
  const db = requireDb();
  const result = await db.execute(sql`
    SELECT
      (SELECT COUNT(*) FROM inventory_reconciliations WHERE status <> 'applied')::bigint AS reconciliation_open,
      (SELECT COUNT(*) FROM inventory_movements)::bigint AS movement_count,
      EXISTS(SELECT 1 FROM inventory_locations WHERE code='MAIN' AND is_active=true) AS main_location
  `);
  const rows = Array.isArray(result) ? result : (result?.rows ?? []);
  return {
    mode: getInventoryLedgerMode(),
    reconciliationOpen: Number(rows[0]?.reconciliation_open ?? 0),
    canonicalMovementCount: Number(rows[0]?.movement_count ?? 0),
    mainLocationConfigured: Boolean(rows[0]?.main_location),
  };
}

/**
 * CANONICAL product-cost snapshot builder.
 *
 * Every order-creation path in AQUAVO — storefront checkout, admin/WhatsApp
 * manual invoice confirmation, and any future entry point — MUST build its
 * per-line cost evidence here. Before this module existed the two live creation
 * paths disagreed:
 *
 *   F-1  `OrderStorage.lockProductForUpdate()` never SELECTed cost_price /
 *        packaging_cost / insert_cost, so `createOrderSecure` read `undefined`
 *        for every cost field and froze `costStatus:"unknown"` on EVERY new
 *        storefront line. Because `lineCostSnapshot()` honours an explicit
 *        unknown snapshot and refuses to fall back to the resolver, those lines
 *        were permanently uncostable.
 *
 *   F-2  `InvoiceStorage.createOrderFromInvoice()` (admin / WhatsApp) wrote no
 *        cost snapshot at all — neither into `orders.items` (JSONB) nor into
 *        `order_items_relational`.
 *
 * SEMANTICS — the two states below are DIFFERENT and must never collapse:
 *
 *   verified zero : the product genuinely costs 0. Stored as 0 (not NULL),
 *                   costStatus "exact"/"incomplete", costSource
 *                   "product_current". Profit maths may use it.
 *   unknown       : no cost was ever recorded. Stored as NULL (never 0),
 *                   costStatus "unknown", costSource "none", confidence NULL.
 *                   Profit maths must refuse to compute and flag the order.
 *
 * This module NEVER looks at "today's" cost for an order that already exists —
 * it is only ever called while a NEW line is being created, inside the same
 * transaction that locked the product row.
 */

import { sql } from "drizzle-orm";

export type CostSnapshotStatus = "exact" | "estimated" | "incomplete" | "unknown";
export type CostSnapshotSource = "product_current" | "cost_history" | "manual" | "none";
export type CostSnapshotConfidence = "high" | "medium" | "low";

/** Current snapshot format version written by this builder. */
export const COST_SNAPSHOT_VERSION = 1;

/**
 * The product columns a locked row must expose for a snapshot to be buildable.
 * Kept next to the builder so a SELECT can never silently drop one again (F-1).
 */
export const PRODUCT_COST_SNAPSHOT_COLUMNS = [
    "cost_price",
    "packaging_cost",
    "insert_cost",
] as const;

/** Shape returned by {@link lockProductRowForUpdate}. */
export interface LockedProductRow {
    id: string;
    name: string;
    price: string | number;
    stock: number | null;
    variants: any[] | null;
    hasVariants?: boolean;
    /** raw numeric text from products.cost_price — may be null */
    costPrice: string | number | null;
    packagingCost: string | number | null;
    insertCost: string | number | null;
}

export interface ProductCostSnapshot {
    /** null === UNKNOWN. A real 0 stays 0. */
    costPrice: number | null;
    packagingCost: number | null;
    insertCost: number | null;
    costStatus: CostSnapshotStatus;
    costSource: CostSnapshotSource;
    /** NULL whenever costStatus is "unknown". */
    costConfidence: CostSnapshotConfidence | null;
    costSnapshotVersion: number;
    costSnapshotAt: Date;
}

/**
 * Parse a raw numeric column into `number | null`.
 * `null` / `undefined` / `""` / non-finite → null (UNKNOWN).
 * `"0"` / `0` → 0 (VERIFIED ZERO — deliberately not conflated with UNKNOWN).
 */
export function parseCostValue(raw: unknown): number | null {
    if (raw === null || raw === undefined) return null;
    if (typeof raw === "string" && raw.trim() === "") return null;
    const n = Number(raw);
    if (!Number.isFinite(n)) return null;
    return n;
}

/**
 * THE canonical builder. Given a product row that was just locked FOR UPDATE
 * inside the creation transaction, produce the immutable per-unit snapshot.
 */
export function buildProductCostSnapshot(
    product: Partial<LockedProductRow> | Record<string, unknown>,
    now: Date = new Date(),
): ProductCostSnapshot {
    const p = product as Record<string, unknown>;
    // Accept both camelCase (Drizzle) and snake_case (raw SQL) spellings so a
    // future caller cannot reintroduce F-1 by using a different row shape.
    const costPrice = parseCostValue(p.costPrice ?? p.cost_price);
    const packagingCost = parseCostValue(p.packagingCost ?? p.packaging_cost);
    const insertCost = parseCostValue(p.insertCost ?? p.insert_cost);

    if (costPrice === null) {
        // UNKNOWN. All evidence NULL — never fabricate a 0, never partially fill.
        return {
            costPrice: null,
            packagingCost: null,
            insertCost: null,
            costStatus: "unknown",
            costSource: "none",
            costConfidence: null,
            costSnapshotVersion: COST_SNAPSHOT_VERSION,
            costSnapshotAt: now,
        };
    }

    const complete = packagingCost !== null && insertCost !== null;
    return {
        costPrice,
        packagingCost,
        insertCost,
        costStatus: complete ? "exact" : "incomplete",
        costSource: "product_current",
        costConfidence: complete ? "high" : "medium",
        costSnapshotVersion: COST_SNAPSHOT_VERSION,
        costSnapshotAt: now,
    };
}

/** Snapshot fields as they are embedded in the `orders.items` JSONB line. */
export function toJsonbCostFields(snap: ProductCostSnapshot) {
    return {
        costPrice: snap.costPrice,
        packagingCost: snap.packagingCost,
        insertCost: snap.insertCost,
        costStatus: snap.costStatus,
        costSource: snap.costSource,
    };
}

/** Snapshot fields as they are written to `order_items_relational`. */
export function toRelationalCostFields(snap: ProductCostSnapshot) {
    return {
        unitCostPrice: snap.costPrice === null ? null : String(snap.costPrice),
        unitPackagingCost: snap.packagingCost === null ? null : String(snap.packagingCost),
        unitInsertCost: snap.insertCost === null ? null : String(snap.insertCost),
        costSnapshotStatus: snap.costStatus,
        costSnapshotSource: snap.costSource,
        costSnapshotConfidence: snap.costConfidence,
        costSnapshotVersion: snap.costSnapshotVersion,
        costSnapshotAt: snap.costSnapshotAt,
    };
}

/**
 * THE canonical locking read. Single SELECT used by every creation path so the
 * cost columns can never be dropped from one path only (that was F-1).
 * `tx` must be an open transaction — the row lock is meaningless otherwise.
 */
export async function lockProductRowForUpdate(
    tx: { execute: (q: any) => Promise<any> },
    productId: string,
): Promise<LockedProductRow | undefined> {
    const result = await tx.execute(sql`
        SELECT id, name, price, stock, variants, has_variants AS "hasVariants",
               cost_price AS "costPrice",
               packaging_cost AS "packagingCost",
               insert_cost AS "insertCost"
        FROM products
        WHERE id = ${productId}
          AND deleted_at IS NULL
        FOR UPDATE
    `);
    const rows = Array.isArray(result) ? result : (result?.rows ?? []);
    return rows[0] as LockedProductRow | undefined;
}

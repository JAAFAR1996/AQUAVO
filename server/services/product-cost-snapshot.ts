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
 *   F-10 `lockProductRowForUpdate` never SELECTed the F-5 `*_resolution`
 *        columns and `buildProductCostSnapshot` decided "unknown" purely on
 *        `cost_price === null`. Because `products.cost_price` is
 *        `numeric DEFAULT '0'`, a product created without any cost evidence is
 *        BORN holding a 0 — so the builder froze a false `exact 0` COGS for it.
 *        That is the same "unknown must never read as 0" invariant F-5 fixed on
 *        the READ path, reopened on the order-creation WRITE path.
 *
 * SEMANTICS — the three states below are DIFFERENT and must never collapse:
 *
 *   known         : a positive number is evidence of itself. Stored as-is,
 *                   costStatus "exact"/"incomplete", costSource
 *                   "product_current".
 *   verified zero : the product genuinely costs 0, confirmed by a human via
 *                   `cost_price_resolution = 'verified_zero'`. Stored as 0 (not
 *                   NULL), costStatus "verified_zero". Profit maths may use it.
 *   unknown       : no cost was ever recorded — either an explicit NULL, or a 0
 *                   whose resolution is absent/'unresolved' (the `DEFAULT '0'`
 *                   trap). Stored as NULL (never 0), costStatus "unknown",
 *                   costSource "none", confidence NULL. Profit maths must refuse
 *                   to compute and flag the order.
 *
 * A NULL/absent resolution is read as 'unresolved' — the conservative reading —
 * so this module is correct BOTH before and after
 * `migrations/add_product_cost_resolution.sql` is applied.
 *
 * This module NEVER looks at "today's" cost for an order that already exists —
 * it is only ever called while a NEW line is being created, inside the same
 * transaction that locked the product row.
 */

import { sql } from "drizzle-orm";

/**
 * Kept identical to `accounting-engine.CostSnapshotStatus`. `verified_zero` is
 * the status that lets the relational read path preserve a real 0 (see
 * `buildRelationalLineResolver`); without it, a zero written as "exact" is read
 * back as UNKNOWN and the two paths disagree.
 */
export type CostSnapshotStatus = "exact" | "verified_zero" | "estimated" | "incomplete" | "unknown";

/** F-5 vocabulary for what a stored cost number MEANS. */
export type CostResolution = "known" | "verified_zero" | "unresolved";
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
    // F-10: without these the builder cannot tell a verified zero from the
    // `DEFAULT '0'` an untouched product is born with.
    "cost_price_resolution",
    "packaging_cost_resolution",
    "insert_cost_resolution",
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
    /**
     * F-5/F-10 resolution metadata. `null`/absent is read as 'unresolved', so
     * these are optional and the builder is correct before the migration lands.
     */
    costPriceResolution?: string | null;
    packagingCostResolution?: string | null;
    insertCostResolution?: string | null;
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
 * F-10. Decide what one stored cost component MEANS, at snapshot time.
 * Deliberately the same decision table as
 * `accounting-engine.resolveCostComponent`, so the write path and the read path
 * can never disagree about a zero:
 *
 *   NULL / absent / unparsable          -> null (UNKNOWN)
 *   != 0                                -> the value (a number is evidence)
 *   = 0 and resolution 'verified_zero'  -> 0 (a real, human-confirmed zero)
 *   = 0 otherwise                       -> null (UNKNOWN — `DEFAULT '0'` means an
 *                                          untouched product is born holding a 0;
 *                                          freezing that as COGS is a fabrication)
 */
export function resolveSnapshotComponent(
    raw: unknown,
    resolution: string | null | undefined,
): number | null {
    const value = parseCostValue(raw);
    if (value === null) return null;
    if (value !== 0) return value;
    return resolution === "verified_zero" ? 0 : null;
}

/**
 * THE canonical builder. Given a product row that was just locked FOR UPDATE
 * inside the creation transaction, produce the immutable per-unit snapshot.
 *
 * NOTE ON `verified_zero` STATUS: when the cost price is a confirmed 0 the
 * status is `verified_zero`, not `exact`. That is what
 * `buildRelationalLineResolver` keys on to read a stored 0 back as a real 0
 * instead of conservatively demoting it to UNKNOWN.
 */
export function buildProductCostSnapshot(
    product: Partial<LockedProductRow> | Record<string, unknown>,
    now: Date = new Date(),
): ProductCostSnapshot {
    const p = product as Record<string, unknown>;
    // Accept both camelCase (Drizzle) and snake_case (raw SQL) spellings so a
    // future caller cannot reintroduce F-1 by using a different row shape.
    const costRes = (p.costPriceResolution ?? p.cost_price_resolution) as string | null | undefined;
    const packRes = (p.packagingCostResolution ?? p.packaging_cost_resolution) as string | null | undefined;
    const insRes = (p.insertCostResolution ?? p.insert_cost_resolution) as string | null | undefined;

    const rawCostPrice = p.costPrice ?? p.cost_price;
    const costPrice = resolveSnapshotComponent(rawCostPrice, costRes);
    const packagingCost = resolveSnapshotComponent(p.packagingCost ?? p.packaging_cost, packRes);
    const insertCost = resolveSnapshotComponent(p.insertCost ?? p.insert_cost, insRes);

    if (costPrice === null) {
        // UNKNOWN — either an explicit NULL or an unresolved zero. All evidence
        // NULL: never fabricate a 0, never partially fill.
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
    const costStatus: CostSnapshotStatus = !complete
        ? "incomplete"
        : costPrice === 0
            ? "verified_zero"
            : "exact";
    return {
        costPrice,
        packagingCost,
        insertCost,
        costStatus,
        costSource: "product_current",
        costConfidence: complete ? "high" : "medium",
        costSnapshotVersion: COST_SNAPSHOT_VERSION,
        costSnapshotAt: now,
    };
}

/**
 * F-10 WRITE GUARD for the product catalog itself (not for order lines).
 *
 * Applied by every product create/update path so an import or an admin form can
 * never silently produce an ambiguous zero again:
 *
 *   field absent            -> left absent (an update must not clear a cost it
 *                              was not asked to touch)
 *   "" / null               -> null (UNKNOWN) + resolution 'unresolved'
 *   0                       -> 0 kept, but resolution forced to 'unresolved'
 *                              unless the caller EXPLICITLY supplied one. A
 *                              'verified_zero' can only ever be stated
 *                              deliberately, with a note.
 *   != 0                    -> value kept + resolution 'known'
 *
 * An explicitly supplied resolution is always respected — this only fills gaps.
 */
export function normalizeProductCostWrite<T extends Record<string, any>>(input: T): T {
    const out: Record<string, any> = { ...input };
    const pairs = [
        ["costPrice", "costPriceResolution"],
        ["packagingCost", "packagingCostResolution"],
        ["insertCost", "insertCostResolution"],
    ] as const;

    for (const [valueKey, resKey] of pairs) {
        if (!(valueKey in out)) continue;
        const raw = out[valueKey];
        const parsed = raw === "" ? null : parseCostValue(raw);

        if (parsed === null) {
            out[valueKey] = null;
            if (out[resKey] == null) out[resKey] = "unresolved";
            continue;
        }
        out[valueKey] = raw;
        if (out[resKey] != null) continue;           // caller was explicit — respect it
        out[resKey] = parsed === 0 ? "unresolved" : "known";
    }
    return out as T;
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
    // The `*_resolution` columns are read through `to_jsonb(p) ->> ...` on
    // purpose: that yields NULL (== 'unresolved', the conservative reading) when
    // migrations/add_product_cost_resolution.sql has not been applied yet,
    // instead of failing the whole lock with "column does not exist". Order
    // creation therefore keeps working on a pre-migration database.
    const result = await tx.execute(sql`
        SELECT p.id, p.name, p.price, p.stock, p.variants,
               p.has_variants AS "hasVariants",
               p.cost_price AS "costPrice",
               p.packaging_cost AS "packagingCost",
               p.insert_cost AS "insertCost",
               to_jsonb(p) ->> 'cost_price_resolution'     AS "costPriceResolution",
               to_jsonb(p) ->> 'packaging_cost_resolution' AS "packagingCostResolution",
               to_jsonb(p) ->> 'insert_cost_resolution'    AS "insertCostResolution"
        FROM products p
        WHERE p.id = ${productId}
          AND p.deleted_at IS NULL
        FOR UPDATE
    `);
    const rows = Array.isArray(result) ? result : (result?.rows ?? []);
    return rows[0] as LockedProductRow | undefined;
}

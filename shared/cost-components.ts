// ─────────────────────────────────────────────────────────────────────────────
// Stable cost-component taxonomy — the explicit boundary that prevents the SAME
// physical material from being counted in both product COGS and AQUAVO fulfillment.
//
// Each direct order cost belongs to exactly ONE component. Product-side components
// come from the product record; the AQUAVO fulfillment component comes from the
// order_fulfillment_lines snapshot. The engine sums them into SEPARATE totals
// (product COGS vs fulfillment), so nothing is double-counted.
// ─────────────────────────────────────────────────────────────────────────────

export const COST_COMPONENTS = {
  /** What AQUAVO paid the supplier for the product itself. Source: products.costPrice. */
  PRODUCT_ACQUISITION: "product_acquisition",
  /** Packaging that arrives FROM the supplier WITH the product (manufacturer box/blister),
   *  NOT AQUAVO's shipping materials. Source: products.packagingCost. */
  PRODUCT_SUPPLIER_PACKAGING: "product_supplier_packaging",
  /** An insert that ships INSIDE the product from the supplier (e.g. printed manual).
   *  NOT AQUAVO's thank-you card. Source: products.insertCost. */
  PRODUCT_INCLUDED_INSERT: "product_included_insert",
  /** AQUAVO's own order-fulfillment materials: shipping box, AQUAVO sticker, thank-you
   *  card, tape, bubble wrap, filler, label, bag, etc. Source: order_fulfillment_lines. */
  AQUAVO_FULFILLMENT_MATERIAL: "aquavo_fulfillment_material",
  /** Courier / last-mile delivery cost. Source: (future) courier settlement. */
  COURIER_DELIVERY: "courier_delivery",
  /** Any other deterministic direct order cost (payment fee, commission, …). */
  OTHER_DIRECT: "other_direct",
} as const;

export type CostComponentType = (typeof COST_COMPONENTS)[keyof typeof COST_COMPONENTS];

/**
 * Existing product-side fields, documented (item 1 migration-of-interpretation):
 *   products.costPrice     → PRODUCT_ACQUISITION       (unit purchase price)
 *   products.packagingCost → PRODUCT_SUPPLIER_PACKAGING (supplier packaging, NOT AQUAVO box)
 *   products.insertCost    → PRODUCT_INCLUDED_INSERT    (supplier insert, NOT AQUAVO card)
 * These remain PRODUCT COGS. AQUAVO's shipping box / stickers / thank-you card are a
 * DIFFERENT physical set and live only in order_fulfillment_lines
 * (AQUAVO_FULFILLMENT_MATERIAL). The two never share a row, so a given sticker/box/insert
 * can only ever land in ONE component.
 */
export const PRODUCT_COGS_COMPONENTS: CostComponentType[] = [
  COST_COMPONENTS.PRODUCT_ACQUISITION,
  COST_COMPONENTS.PRODUCT_SUPPLIER_PACKAGING,
  COST_COMPONENTS.PRODUCT_INCLUDED_INSERT,
];

export const FULFILLMENT_COMPONENTS: CostComponentType[] = [
  COST_COMPONENTS.AQUAVO_FULFILLMENT_MATERIAL,
];

/** True when a component is product COGS (never fulfillment) and vice-versa —
 *  the two sets are disjoint, which is what guarantees no double counting. */
export function isProductCogs(c: CostComponentType): boolean {
  return PRODUCT_COGS_COMPONENTS.includes(c);
}
export function isFulfillment(c: CostComponentType): boolean {
  return FULFILLMENT_COMPONENTS.includes(c);
}

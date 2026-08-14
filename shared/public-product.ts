/**
 * PUBLIC PRODUCT BOUNDARY
 * =======================
 *
 * The single place where an internal product row becomes something an anonymous visitor may see.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * On 2026-08-14 the unauthenticated endpoint `GET /api/products` returned all 112 products carrying real
 * values for `costPrice`, `packagingCost`, `insertCost`, the three `*Resolution` fields,
 * `costResolutionNote`, `costResolutionBy` and `costResolutionAt` — plus per-variant `costPrice`,
 * `costBasis`, `costStatus` and `costEvidence`. Anyone could read AQUAVO's entire cost basis, and
 * `costResolutionBy` additionally leaked an internal operator identity ("owner_confirmation:jaafar:...").
 *
 * The cause was not a missing filter. It was the absence of a boundary: `server/storage/product-storage.ts`
 * issued `db.select().from(products)` — an unprojected SELECT * — and `server/routes/products.ts` handed
 * the rows to `res.json()` verbatim. `Product` is `typeof products.$inferSelect`, so TypeScript saw a
 * perfectly well-typed response and had nothing to complain about. The types were right; the design was
 * missing.
 *
 * ALLOWLIST, NOT BLACKLIST — AND THE REASON MATTERS
 * -------------------------------------------------
 * A blacklist (`{ ...product, costPrice: undefined }`) fails OPEN. The next migration that adds
 * `supplierNegotiatedRate` to the products table publishes it worldwide the moment it is deployed, and
 * nothing in the codebase objects. An allowlist fails CLOSED: a new column is invisible until somebody
 * deliberately adds its name here, and the worst case is a missing field on the storefront — a bug you
 * find in a minute, not a disclosure you find in a competitor's pricing.
 *
 * So: **never spread a product row into a public response.** These functions construct a new object by
 * naming every key. That is the whole mechanism, and it is deliberately boring.
 *
 * `variants` needs the same treatment one level down, and that is easy to miss: the declared
 * `ProductVariant` interface has no cost fields at all, but `migrations/0073_accounting_final_hardening.sql`
 * writes `costPrice`, `costStatus`, `costBasis` and `costEvidence` straight into the jsonb blob with
 * `jsonb_set`. TypeScript cannot see those keys, so only a runtime allowlist removes them.
 */

/** Product columns an anonymous visitor may see. Every one is used by the storefront. */
export const PUBLIC_PRODUCT_FIELDS = [
  "id",
  "slug",
  "name",
  "brand",
  "category",
  "categoryId",
  "subcategory",
  "description",
  "price",
  "originalPrice",
  "currency",
  "images",
  "thumbnail",
  "rating",
  "reviewCount",
  "stock",
  "lowStockThreshold",
  "isNew",
  "isBestSeller",
  "isProductOfWeek",
  "specifications",
  "hasVariants",
  "createdAt",
  "updatedAt",
] as const;

/**
 * Variant keys an anonymous visitor may see.
 *
 * `image` and `slug` are not on the `ProductVariant` interface but are present in the data and read by
 * the client (`variant.image` in the gallery, `variant.slug` in routing), so they are allowed explicitly
 * rather than arriving by accident.
 */
export const PUBLIC_VARIANT_FIELDS = [
  "id",
  "label",
  "price",
  "originalPrice",
  "stock",
  "sku",
  "isDefault",
  "specifications",
  "image",
  "slug",
] as const;

/**
 * Order-line keys a customer may see on their OWN order.
 *
 * Separate list, because a line item is a different object with a different risk profile: it carries an
 * immutable per-unit cost SNAPSHOT (`costPrice`, `packagingCost`, `insertCost`, `costStatus`,
 * `costSource`) taken at sale time. `enrichOrderItems()` spread those straight to the customer on
 * `GET /api/orders` and `GET /api/orders/:id`. Authenticated, and still nobody outside AQUAVO should see
 * what a product cost to buy.
 */
export const PUBLIC_ORDER_ITEM_FIELDS = [
  "productId",
  "variantId",
  "productName",
  "variantLabel",
  "quantity",
  "priceAtPurchase",
  "lineTotal",
  "image",
  "slug",
] as const;

/**
 * Variant keys that live in the `variants` jsonb but are INTERNAL, written by
 * `migrations/0073_accounting_final_hardening.sql` via `jsonb_set` and absent from the `ProductVariant`
 * TypeScript interface.
 *
 * Declared here as the exact mirror of what `toPublicVariant` drops, because the two directions have to
 * agree: whatever a client is not allowed to SEE is also whatever a client must not be able to DESTROY
 * by sending the object back. `preserveInternalVariantFields` is the write-side half of that pair.
 */
export const INTERNAL_VARIANT_FIELDS = [
  "costPrice",
  "costStatus",
  "costBasis",
  "costEvidence",
] as const;

/**
 * Re-attach internal variant fields that the client could not have sent, matching by variant id.
 *
 * WHY: `updateProductVariants` does `.set({ variants })` — a full REPLACE of the jsonb column. The admin
 * variants dialog reads its products from `/api/products`, which is now sanitized, so the array it PUTs
 * back has no cost keys at all. Without this merge, the first variant edit after the sanitization fix
 * would silently wipe every per-variant cost the accounting engine depends on. The DTO would have caused
 * data loss, quietly, and the only visible symptom would be margins going wrong weeks later.
 *
 * New variants (no id match) legitimately have no cost yet and are left alone.
 */
export function preserveInternalVariantFields(
  incoming: unknown,
  existing: unknown,
): unknown {
  if (!Array.isArray(incoming)) return incoming;
  const existingById = new Map<string, AnyRecord>();
  if (Array.isArray(existing)) {
    for (const v of existing) {
      const id = (v as AnyRecord | null)?.id;
      if (typeof id === "string") existingById.set(id, v as AnyRecord);
    }
  }
  return incoming.map((variant) => {
    if (!variant || typeof variant !== "object") return variant;
    const v = variant as AnyRecord;
    const prior = typeof v.id === "string" ? existingById.get(v.id) : undefined;
    const merged: AnyRecord = { ...v };
    for (const key of INTERNAL_VARIANT_FIELDS) {
      // The client is never a source of truth for cost. An incoming value is discarded whether or not a
      // prior row exists — the `!prior` branch matters most, because a BRAND NEW variant has nothing to
      // restore from, and an earlier version of this function returned such a variant verbatim. That let
      // an admin client inject `costPrice` directly into the jsonb, bypassing `normalizeProductCostWrite`
      // and the `product_cost_history` audit trail that every legitimate cost change goes through.
      // Caught by this module's own test rather than in review.
      if (prior && Object.prototype.hasOwnProperty.call(prior, key)) merged[key] = prior[key];
      else delete merged[key];
    }
    return merged;
  });
}

/**
 * Field-name shapes that must never reach a public response.
 *
 * This is NOT the mechanism — the allowlists above are. This is a tripwire that runs in tests and in
 * development, so that a mistake is caught where it is cheap. Belt and braces, in that order: if the
 * allowlist is ever bypassed (a new route forgetting to call `toPublicProduct`), this pattern still
 * has a chance of catching it, and it is the only part of this file that can catch a leak in a route
 * nobody remembered to change.
 */
export const FORBIDDEN_PUBLIC_FIELD_PATTERN =
  /(^|_|\b)(cost|margin|contribution|supplier|wholesale|purchase_?price|profit|accounting|valuation|internal|landed)/i;

type AnyRecord = Record<string, unknown>;

/** Pick an explicit set of keys. Absent keys stay absent — no `undefined` padding, no spread. */
function pick<T extends AnyRecord>(source: T | null | undefined, keys: readonly string[]): AnyRecord {
  const out: AnyRecord = {};
  if (!source || typeof source !== "object") return out;
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(source, key)) out[key] = source[key];
  }
  return out;
}

/** Strip a single variant down to its public keys. */
export function toPublicVariant(variant: unknown): AnyRecord {
  return pick(variant as AnyRecord, PUBLIC_VARIANT_FIELDS);
}

/**
 * Convert one internal product row into the public shape.
 *
 * Returns `null` for a null/undefined input so callers can pass a `getProduct()` result straight through
 * without losing the "not found" signal.
 */
export function toPublicProduct(product: unknown): AnyRecord | null {
  if (product === null || product === undefined) return null;
  if (typeof product !== "object") return null;

  const publicProduct = pick(product as AnyRecord, PUBLIC_PRODUCT_FIELDS);

  // `variants` is deliberately NOT in PUBLIC_PRODUCT_FIELDS: it must be rebuilt element by element,
  // never copied. The raw blob carries costPrice/costStatus/costBasis/costEvidence written by
  // migration 0073 that the ProductVariant type does not declare.
  const rawVariants = (product as AnyRecord).variants;
  if (Array.isArray(rawVariants)) {
    publicProduct.variants = rawVariants.map(toPublicVariant);
  } else if (rawVariants === null) {
    publicProduct.variants = null;
  }

  return publicProduct;
}

/** Convert a list. Non-object entries are dropped rather than passed through. */
export function toPublicProducts(products: unknown): AnyRecord[] {
  if (!Array.isArray(products)) return [];
  return products.map(toPublicProduct).filter((p): p is AnyRecord => p !== null);
}

/** Strip an enriched order line item down to what the customer who placed the order may see. */
export function toPublicOrderItem(item: unknown): AnyRecord {
  return pick(item as AnyRecord, PUBLIC_ORDER_ITEM_FIELDS);
}

/**
 * Walk any value and report every key path whose NAME looks internal-financial.
 *
 * Used by the regression tests and by the dev-only response assertion. Returns paths rather than a
 * boolean so a failure message can say exactly where the leak is.
 */
export function findForbiddenFieldPaths(value: unknown, path = "$"): string[] {
  const found: string[] = [];
  const seen = new WeakSet<object>();

  const walk = (node: unknown, here: string): void => {
    if (node === null || typeof node !== "object") return;
    if (seen.has(node as object)) return;
    seen.add(node as object);

    if (Array.isArray(node)) {
      node.forEach((child, i) => walk(child, `${here}[${i}]`));
      return;
    }
    for (const [key, child] of Object.entries(node as AnyRecord)) {
      const childPath = `${here}.${key}`;
      if (FORBIDDEN_PUBLIC_FIELD_PATTERN.test(key)) found.push(childPath);
      walk(child, childPath);
    }
  };

  walk(value, path);
  return found;
}

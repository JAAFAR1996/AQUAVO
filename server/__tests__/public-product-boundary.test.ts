/**
 * REGRESSION TESTS for the public product boundary.
 *
 * These exist because on 2026-08-14 `GET /api/products` returned all 112 products carrying real
 * `costPrice`, `packagingCost`, `insertCost`, the three `*Resolution` fields, `costResolutionNote`,
 * `costResolutionBy` and `costResolutionAt`, plus per-variant `costPrice`/`costBasis`/`costStatus`/
 * `costEvidence` — to anyone, unauthenticated.
 *
 * The pre-existing `products-api.test.ts` asserted only on hand-written mock literals and never imported
 * the real router, so it passed throughout. A test that cannot fail when the code is wrong is not a test.
 * Everything below imports the REAL module under test.
 */
import { describe, it, expect } from "vitest";
import {
  toPublicProduct,
  toPublicProducts,
  toPublicVariant,
  toPublicOrderItem,
  preserveInternalVariantFields,
  findForbiddenFieldPaths,
  PUBLIC_PRODUCT_FIELDS,
  PUBLIC_VARIANT_FIELDS,
  INTERNAL_VARIANT_FIELDS,
} from "../../shared/public-product.js";

/**
 * A product row shaped exactly like what production returned on the day of the leak, values included,
 * so the test fails for the real reason rather than a synthetic one.
 */
function leakedProductRow() {
  return {
    id: "aquavo-driftwood-small-collection",
    slug: "aquavo-driftwood-collection",
    name: "قطع خشب ديكور — اختر قطعتك",
    brand: "AQUAVO",
    category: "تربة وديكور",
    categoryId: "b71fc5b0-00d9-4c98-b9f0-47cefeeb2d78",
    subcategory: "أخشاب طبيعية",
    description: "مجموعة من قطع الخشب الطبيعي",
    price: "15000",
    originalPrice: "18000",
    currency: "IQD",
    images: ["a.webp", "b.webp"],
    thumbnail: "a.webp",
    rating: "4.5",
    reviewCount: 3,
    stock: 9,
    lowStockThreshold: 1,
    isNew: false,
    isBestSeller: true,
    isProductOfWeek: false,
    specifications: { الحجم: "صغير" },
    hasVariants: true,
    createdAt: new Date("2026-05-01T00:00:00Z"),
    updatedAt: new Date("2026-08-01T00:00:00Z"),
    deletedAt: null,
    // ── everything below leaked in production ──────────────────────────────────
    costPrice: "4889",
    packagingCost: "0",
    insertCost: "0",
    costPriceResolution: "known",
    packagingCostResolution: "verified_zero",
    insertCostResolution: "verified_zero",
    costResolutionNote: "Owner confirmation 2026-08-03: shared box, labels and cards…",
    costResolutionBy: "owner_confirmation:jaafar:2026-08-03",
    costResolutionAt: new Date("2026-08-03T11:04:18.689Z"),
    variants: [
      {
        id: "v1", label: "صغير", price: 15000, originalPrice: 18000, stock: 4,
        sku: "DW-S", isDefault: true, specifications: {}, image: "v1.webp",
        // written into the jsonb by migrations/0073_accounting_final_hardening.sql — invisible to
        // the ProductVariant TypeScript interface, which is why a type-level fix would not have worked
        costPrice: 4889, costStatus: "verified_derived",
        costBasis: "moving_weighted_average", costEvidence: "lot 2026-05 invoice #221",
      },
    ],
  };
}

const SENSITIVE_KEYS = [
  "costPrice", "packagingCost", "insertCost",
  "costPriceResolution", "packagingCostResolution", "insertCostResolution",
  "costResolutionNote", "costResolutionBy", "costResolutionAt",
];

describe("public product DTO — the leaked fields are gone", () => {
  it("drops every internal cost field that production exposed", () => {
    const pub = toPublicProduct(leakedProductRow())!;
    for (const key of SENSITIVE_KEYS) {
      expect(pub, `${key} is still present in the public response`).not.toHaveProperty(key);
    }
  });

  it("drops the internal keys hidden inside the variants jsonb", () => {
    const pub = toPublicProduct(leakedProductRow())!;
    const variant = (pub.variants as Record<string, unknown>[])[0];
    for (const key of INTERNAL_VARIANT_FIELDS) {
      expect(variant, `variants[0].${key} survived sanitization`).not.toHaveProperty(key);
    }
    // …and the customer-facing variant data is intact, or the storefront breaks.
    expect(variant).toMatchObject({ id: "v1", label: "صغير", price: 15000, stock: 4, image: "v1.webp" });
  });

  it("leaves NO forbidden-looking key anywhere in the response tree, at any depth", () => {
    const pub = toPublicProduct(leakedProductRow());
    expect(findForbiddenFieldPaths(pub)).toEqual([]);
  });

  it("still returns everything the storefront needs to render a product", () => {
    const pub = toPublicProduct(leakedProductRow())!;
    // Prices customers see, stock/availability, imagery, categorisation, variants.
    expect(pub.price).toBe("15000");
    expect(pub.originalPrice).toBe("18000");
    expect(pub.currency).toBe("IQD");
    expect(pub.stock).toBe(9);
    expect(pub.images).toHaveLength(2);
    expect(pub.thumbnail).toBe("a.webp");
    expect(pub.category).toBe("تربة وديكور");
    expect(pub.categoryId).toBeTruthy();
    expect(pub.rating).toBe("4.5");
    expect(pub.reviewCount).toBe(3);
    expect(pub.hasVariants).toBe(true);
    expect(pub.specifications).toEqual({ الحجم: "صغير" });
    expect(pub.slug).toBe("aquavo-driftwood-collection");
    expect(pub.name).toBeTruthy();
    expect(pub.brand).toBe("AQUAVO");
  });

  it("does not leak soft-delete metadata", () => {
    expect(toPublicProduct(leakedProductRow())!).not.toHaveProperty("deletedAt");
  });
});

describe("the allowlist FAILS CLOSED — this is the whole point", () => {
  it("does not expose a brand-new sensitive column added to the raw model", () => {
    // The adversarial case: tomorrow someone adds a column. With a blacklist this test fails and the
    // field ships. With an allowlist it can never ship until a human writes its name down.
    const row = {
      ...leakedProductRow(),
      supplierSecretCost: 1234,
      landedCostUsd: 9.99,
      negotiatedMarginPct: 41.2,
      internalValuationNote: "do not disclose",
      wholesalePrice: 5000,
    } as Record<string, unknown>;
    const pub = toPublicProduct(row)!;
    for (const key of ["supplierSecretCost", "landedCostUsd", "negotiatedMarginPct", "internalValuationNote", "wholesalePrice"]) {
      expect(pub, `${key} leaked through the allowlist`).not.toHaveProperty(key);
    }
    expect(findForbiddenFieldPaths(pub)).toEqual([]);
  });

  it("does not expose a new sensitive key added INSIDE a variant", () => {
    const row = leakedProductRow() as Record<string, any>;
    row.variants[0].supplierSecretCost = 4321;
    row.variants[0].futureInternalThing = "x";
    const variant = (toPublicProduct(row)!.variants as Record<string, unknown>[])[0];
    expect(variant).not.toHaveProperty("supplierSecretCost");
    expect(variant).not.toHaveProperty("futureInternalThing");
  });

  it("emits ONLY allowlisted keys — nothing arrives by accident", () => {
    const pub = toPublicProduct(leakedProductRow())!;
    const allowed = new Set<string>([...PUBLIC_PRODUCT_FIELDS, "variants"]);
    for (const key of Object.keys(pub)) {
      expect(allowed.has(key), `unexpected key "${key}" in the public product`).toBe(true);
    }
    const variant = (pub.variants as Record<string, unknown>[])[0];
    for (const key of Object.keys(variant)) {
      expect(new Set<string>(PUBLIC_VARIANT_FIELDS).has(key), `unexpected variant key "${key}"`).toBe(true);
    }
  });

  it("the forbidden-name tripwire actually fires — an inert detector proves nothing", () => {
    expect(findForbiddenFieldPaths({ a: { b: [{ costPrice: 1 }] } })).toEqual(["$.a.b[0].costPrice"]);
    expect(findForbiddenFieldPaths({ nested: { supplier_code: "x" } })).toEqual(["$.nested.supplier_code"]);
    expect(findForbiddenFieldPaths({ price: 1, name: "x", stock: 2 })).toEqual([]);
    // It must not choke on a cycle; a response object can legitimately contain one.
    const cyclic: Record<string, unknown> = { ok: 1 };
    cyclic.self = cyclic;
    expect(() => findForbiddenFieldPaths(cyclic)).not.toThrow();
  });
});

describe("malformed input is handled without failing open", () => {
  it("returns null for null/undefined and non-objects rather than passing them through", () => {
    expect(toPublicProduct(null)).toBeNull();
    expect(toPublicProduct(undefined)).toBeNull();
    expect(toPublicProduct("not a product")).toBeNull();
  });

  it("toPublicProducts tolerates a non-array and drops non-object entries", () => {
    expect(toPublicProducts(null)).toEqual([]);
    expect(toPublicProducts("nope")).toEqual([]);
    expect(toPublicProducts([leakedProductRow(), null, "x"])).toHaveLength(1);
  });

  it("handles products with no variants, and with variants explicitly null", () => {
    const { variants, ...noVariants } = leakedProductRow();
    expect(toPublicProduct(noVariants)).not.toHaveProperty("variants");
    expect(toPublicProduct({ ...leakedProductRow(), variants: null })!.variants).toBeNull();
    expect(toPublicVariant(null)).toEqual({});
  });
});

describe("order line items — the second, authenticated leak", () => {
  it("drops the sale-time cost snapshot a customer used to receive on their own order", () => {
    const item = {
      productId: "p1", variantId: "v1", productName: "x", variantLabel: "صغير",
      quantity: 2, priceAtPurchase: "15000", lineTotal: 30000, image: "a.webp",
      costPrice: 4889, packagingCost: 100, insertCost: 50,
      costStatus: "exact", costSource: "product_current",
    };
    const pub = toPublicOrderItem(item);
    for (const key of ["costPrice", "packagingCost", "insertCost", "costStatus", "costSource"]) {
      expect(pub, `${key} still reaches the customer`).not.toHaveProperty(key);
    }
    expect(pub).toMatchObject({
      productId: "p1", productName: "x", quantity: 2, priceAtPurchase: "15000", image: "a.webp",
    });
    expect(findForbiddenFieldPaths(pub)).toEqual([]);
  });
});

describe("cart and favorites — the leaks the first sweep missed", () => {
  // `getCartItems` and `getFavorites` both do `db.select({ ..., product: products })` — a full-row join
  // handed to a logged-in customer by GET /api/cart and GET /api/favorites. Found only by sweeping every
  // router that touches products, rather than stopping at the endpoint named in the report.
  it("a cart line's product carries no cost data", () => {
    const row = leakedProductRow();
    const cartItem = { id: "c1", quantity: 2, variantPrice: "15000", variantLabel: "صغير" };
    const served = { ...cartItem, product: { ...toPublicProduct(row), price: cartItem.variantPrice } };
    expect(findForbiddenFieldPaths(served)).toEqual([]);
    expect(served.product).toHaveProperty("name");
    expect(served.product.price).toBe("15000");   // variant price override still applied
  });

  it("a favorite's product carries no cost data", () => {
    const served = { id: "f1", userId: "u1", product: toPublicProduct(leakedProductRow()) };
    expect(findForbiddenFieldPaths(served)).toEqual([]);
    expect(served.product).toHaveProperty("thumbnail");
  });
});

describe("the write side — a client that cannot SEE cost data cannot DESTROY it", () => {
  it("restores variant cost fields the sanitized client could not have sent back", () => {
    // Exactly the round trip that would have caused silent data loss: the admin variants dialog reads
    // products from the sanitized public endpoint, edits a label, and PUTs the array back. The storage
    // layer REPLACES the whole jsonb column.
    const existing = leakedProductRow().variants;
    const fromSanitizedClient = existing.map(toPublicVariant).map((v) => ({ ...v, label: "صغير (معدّل)" }));
    const merged = preserveInternalVariantFields(fromSanitizedClient, existing) as Record<string, any>[];

    expect(merged[0].label).toBe("صغير (معدّل)");          // the edit survives
    expect(merged[0].costPrice).toBe(4889);                 // and so does the cost
    expect(merged[0].costStatus).toBe("verified_derived");
    expect(merged[0].costBasis).toBe("moving_weighted_average");
    expect(merged[0].costEvidence).toBe("lot 2026-05 invoice #221");
  });

  it("ignores cost values a client tries to INJECT — the read boundary is not a write channel", () => {
    const existing = leakedProductRow().variants;
    const hostile = [{ id: "v1", label: "صغير", price: 15000, stock: 4, costPrice: 1, costStatus: "exact" }];
    const merged = preserveInternalVariantFields(hostile, existing) as Record<string, any>[];
    expect(merged[0].costPrice).toBe(4889);                 // server value wins, not the client's 1
    expect(merged[0].costStatus).toBe("verified_derived");
  });

  it("strips injected cost fields on a variant that has no server-side record", () => {
    const merged = preserveInternalVariantFields(
      [{ id: "brand-new", label: "جديد", price: 1000, stock: 1, costPrice: 999 }],
      leakedProductRow().variants,
    ) as Record<string, any>[];
    // No prior row to restore from, so the client's injected value must not simply be kept.
    expect(merged[0]).not.toHaveProperty("costPrice");
    expect(merged[0].label).toBe("جديد");
  });

  it("passes null / non-array through untouched so 'remove all variants' still works", () => {
    expect(preserveInternalVariantFields(null, leakedProductRow().variants)).toBeNull();
    expect(preserveInternalVariantFields([], leakedProductRow().variants)).toEqual([]);
  });
});

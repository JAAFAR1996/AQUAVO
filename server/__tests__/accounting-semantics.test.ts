import { describe, it, expect } from "vitest";
import {
  calcOrderProfit,
  reconcileOrderLines,
  resolveCostComponent,
  productCostFromProduct,
  worstStatus,
  type CostResolver,
  type ProductCost,
  type RelationalLineSnapshot,
} from "../services/accounting-engine.js";

/**
 * F-3 / F-5 semantics. Pure engine tests — no DB.
 *
 * F-3  the relational cost snapshot is the source of truth where it exists, so a
 *      historically backfilled line (unit_cost_price NULL, status 'unknown')
 *      surfaces as UNKNOWN and is NOT silently replaced by today's catalog cost.
 * F-5  a product cannot be made to say "cost 0" unless a human verified it; an
 *      ambiguous stored zero reads as UNKNOWN and never as a cost of zero.
 */

const ORDER_BASE = {
  id: "o1", orderNumber: "FH-260101-T", customerName: null, customerPhone: null,
  status: "delivered", createdAt: new Date("2026-01-01T00:00:00Z"),
  roundedTotal: "10000", total: "10000", shippingCost: "0", boxCost: "0",
  discountTotal: "0", pointsDiscount: "0",
};

function orderWith(items: unknown[]) {
  return { ...ORDER_BASE, items } as any;
}

/** A resolver that would happily substitute TODAY's cost — the F-3 trap. */
function substitutingResolver(cost: Partial<ProductCost> = {}): CostResolver {
  const c: ProductCost = {
    productId: "p1", name: "Filter", price: 10000,
    costPrice: 4000, packagingCost: 500, insertCost: 100,
    costKnown: true, costsComplete: true,
    costStatus: "estimated", costSource: "product_current",
    ...cost,
  };
  return { getCurrent: () => c, getEffective: () => c };
}

function relLine(over: Partial<RelationalLineSnapshot> = {}): RelationalLineSnapshot {
  return {
    orderId: "o1", productId: "p1", quantity: 1, priceAtPurchase: 10000,
    costPrice: null, packagingCost: null, insertCost: null,
    costStatus: "unknown", costSource: "none",
    ...over,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
describe("F-5 — resolveCostComponent: unknown vs verified zero", () => {
  it("NULL is unknown", () => {
    expect(resolveCostComponent(null, "known")).toBeNull();
    expect(resolveCostComponent(undefined, "verified_zero")).toBeNull();
  });

  it("a positive value is evidence of itself, whatever the resolution says", () => {
    expect(resolveCostComponent(4000, "unresolved")).toBe(4000);
    expect(resolveCostComponent(4000, null)).toBe(4000);
  });

  it("an AMBIGUOUS zero reads as UNKNOWN, never as a cost of zero", () => {
    expect(resolveCostComponent(0, "unresolved")).toBeNull();
    expect(resolveCostComponent(0, null)).toBeNull();      // pre-migration rows
    expect(resolveCostComponent(0, undefined)).toBeNull();  // column absent
    expect(resolveCostComponent(0, "known")).toBeNull();    // 'known' + 0 is self-contradictory
  });

  it("a VERIFIED zero stays an exact numeric 0", () => {
    expect(resolveCostComponent(0, "verified_zero")).toBe(0);
  });
});

describe("F-5 — a product can express an unknown cost separately from a real zero", () => {
  const baseProduct = { id: "p1", name: "Filter", price: "10000" } as any;

  it("a product whose zeros are unresolved yields UNKNOWN cost, not zero cost", () => {
    const c = productCostFromProduct({
      ...baseProduct, costPrice: "0", packagingCost: "0", insertCost: "0",
      costPriceResolution: "unresolved", packagingCostResolution: "unresolved",
      insertCostResolution: "unresolved",
    });
    expect(c.costPrice).toBeNull();
    expect(c.packagingCost).toBeNull();
    expect(c.insertCost).toBeNull();
    expect(c.costKnown).toBe(false);
    expect(c.costStatus).toBe("unknown");
    expect(c.costSource).toBe("none");
  });

  it("a product whose zeros are VERIFIED yields exact zeros and status verified_zero", () => {
    const c = productCostFromProduct({
      ...baseProduct, costPrice: "0", packagingCost: "0", insertCost: "0",
      costPriceResolution: "verified_zero", packagingCostResolution: "verified_zero",
      insertCostResolution: "verified_zero", costResolutionNote: "free sample line",
    });
    expect(c.costPrice).toBe(0);
    expect(c.packagingCost).toBe(0);
    expect(c.insertCost).toBe(0);
    expect(c.costKnown).toBe(true);
    expect(c.costStatus).toBe("verified_zero");
  });

  it("behaves identically BEFORE the migration is applied (no resolution columns)", () => {
    const c = productCostFromProduct({
      ...baseProduct, costPrice: "0", packagingCost: "0", insertCost: "0",
    });
    expect(c.costPrice).toBeNull();
    expect(c.costStatus).toBe("unknown");
  });
});

describe("F-5 — a verified zero produces an EXACT zero-cost order", () => {
  it("verified zero does not degrade the order and keeps exact figures", () => {
    const verified = productCostFromProduct({
      id: "p1", name: "Freebie", price: "10000",
      costPrice: "0", packagingCost: "0", insertCost: "0",
      costPriceResolution: "verified_zero", packagingCostResolution: "verified_zero",
      insertCostResolution: "verified_zero", costResolutionNote: "supplier freebie",
    } as any);
    const resolver: CostResolver = { getCurrent: () => verified, getEffective: () => verified };
    const p = calcOrderProfit(
      orderWith([{ productId: "p1", quantity: 1, priceAtPurchase: 10000 }]), resolver);
    expect(p.cogs).toBe(0);
    expect(p.costStatus).toBe("verified_zero");
    expect(p.exactCogs).toBe(0);          // an EXACT zero, not null
    expect(p.exactNetProfit).toBe(10000);
    expect(p.verifiedZeroLines).toBe(1);
    expect(p.items[0].costStatus).toBe("verified_zero");
  });

  it("an UNRESOLVED zero on the same product yields no exact figure at all", () => {
    const unresolved = productCostFromProduct({
      id: "p1", name: "Freebie", price: "10000",
      costPrice: "0", packagingCost: "0", insertCost: "0",
      costPriceResolution: "unresolved", packagingCostResolution: "unresolved",
      insertCostResolution: "unresolved",
    } as any);
    const resolver: CostResolver = { getCurrent: () => unresolved, getEffective: () => unresolved };
    const p = calcOrderProfit(
      orderWith([{ productId: "p1", quantity: 1, priceAtPurchase: 10000 }]), resolver);
    // never converted to zero — excluded and flagged
    expect(p.cogs).toBe(0);
    expect(p.exactCogs).toBeNull();
    expect(p.exactNetProfit).toBeNull();
    expect(p.costStatus).toBe("incomplete");
    expect(p.unknownCostLines).toBe(1);
    expect(p.items[0].unitCostPrice).toBeNull();
    expect(p.items[0].costStatus).toBe("unknown");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("F-3 — relational snapshot is the source of truth", () => {
  it("HISTORICAL UNKNOWN STAYS UNKNOWN — today's cost is NOT substituted", () => {
    const order = orderWith([{ productId: "p1", productName: "Filter", quantity: 1, priceAtPurchase: 10000 }]);
    // Without the relational store the resolver silently substitutes → estimated.
    const before = calcOrderProfit(order, substitutingResolver());
    expect(before.items[0].costStatus).toBe("estimated");
    expect(before.items[0].unitCostPrice).toBe(4000);

    // With the backfilled relational row the unknown signal survives.
    const after = calcOrderProfit(order, substitutingResolver(), undefined, [relLine()]);
    expect(after.costSourceOfTruth).toBe("relational");
    expect(after.sourceReconciled).toBe(true);
    expect(after.items[0].costStatus).toBe("unknown");
    expect(after.items[0].unitCostPrice).toBeNull();
    expect(after.cogs).toBe(0);              // never coerced to zero, never fabricated
    expect(after.exactCogs).toBeNull();
    expect(after.costStatus).toBe("incomplete");
  });

  it("a relational row with a real snapshot is used verbatim (exact, not estimated)", () => {
    const order = orderWith([{ productId: "p1", quantity: 2, priceAtPurchase: 10000 }]);
    const p = calcOrderProfit(order, substitutingResolver(), undefined, [
      relLine({ quantity: 2, costPrice: 3000, packagingCost: 200, insertCost: 50,
                costStatus: "exact", costSource: "manual" }),
    ]);
    expect(p.items[0].costStatus).toBe("exact");
    expect(p.cogs).toBe((3000 + 200 + 50) * 2);
    expect(p.exactCogs).toBe(6500);
  });

  it("ESTIMATED REQUIRES AN EXPLICIT SOURCE — never emitted without one", () => {
    const order = orderWith([{ productId: "p1", quantity: 1, priceAtPurchase: 10000 }]);
    const p = calcOrderProfit(order, substitutingResolver());
    expect(p.items[0].costStatus).toBe("estimated");
    // the substitution that produced it names its origin
    expect(substitutingResolver().getCurrent("p1")!.costSource).toBe("product_current");

    // with NO source available the line is unknown, not "estimated"
    const none: CostResolver = { getCurrent: () => undefined, getEffective: () => undefined };
    const q = calcOrderProfit(order, none);
    expect(q.items[0].costStatus).toBe("unknown");
    expect(q.estimatedCostLines).toBe(1); // counted as a fallback attempt…
    expect(q.costStatus).toBe("incomplete"); // …but never presented as a value
  });

  it("no relational rows → unchanged legacy JSONB behaviour", () => {
    const order = orderWith([{ productId: "p1", quantity: 1, priceAtPurchase: 10000 }]);
    const a = calcOrderProfit(order, substitutingResolver());
    const b = calcOrderProfit(order, substitutingResolver(), undefined, []);
    expect(b).toEqual(a);
    expect(b.costSourceOfTruth).toBe("jsonb");
  });

  it("a DISAGREEING relational store is never merged — the order is degraded instead", () => {
    const order = orderWith([{ productId: "p1", quantity: 2, priceAtPurchase: 10000 }]);
    // relational says quantity 1 → the two stores do not reconcile
    const p = calcOrderProfit(order, substitutingResolver(), undefined, [relLine({ quantity: 1 })]);
    expect(p.sourceReconciled).toBe(false);
    expect(p.costSourceOfTruth).toBe("jsonb");
    expect(p.costStatus).toBe("incomplete");   // residue is visible, not silent
    expect(p.exactCogs).toBeNull();
  });

  it("a relational row that asserts NOTHING does not demote a good JSONB snapshot", () => {
    const order = orderWith([{
      productId: "p1", quantity: 1, priceAtPurchase: 10000,
      costPrice: 3000, packagingCost: 100, insertCost: 0, costStatus: "exact", costSource: "manual",
    }]);
    const p = calcOrderProfit(order, substitutingResolver(), undefined, [
      relLine({ costStatus: null, costSource: null }),
    ]);
    expect(p.items[0].costStatus).toBe("exact");
    expect(p.cogs).toBe(3100);
  });

  it("reconcileOrderLines matches multiple lines of one product positionally", () => {
    const items = [
      { productId: "p1", quantity: 1, priceAtPurchase: 100 },
      { productId: "p1", quantity: 3, priceAtPurchase: 100 },
    ];
    const r = reconcileOrderLines(items, [
      relLine({ quantity: 1, costPrice: 10, packagingCost: 1, insertCost: 0, costStatus: "exact" }),
      relLine({ quantity: 3, costPrice: 20, packagingCost: 2, insertCost: 0, costStatus: "exact" }),
    ]);
    expect(r.reconciled).toBe(true);
    expect(r.sourceOfTruth).toBe("relational");
    expect(r.items[0].costPrice).toBe(10);
    expect(r.items[1].costPrice).toBe(20);
  });
});

describe("legacy ↔ canonical comparison leaves NO unexplained residue", () => {
  /**
   * "Legacy" here = the engine's own pre-F-3 behaviour: JSONB only, so the
   * effective-dated resolver silently substitutes today's cost for the
   * historically backfilled lines. "Canonical" = the same engine with the
   * relational source of truth supplied.
   *
   * The whole difference must be attributable, line by line, to substituted
   * cost that was never evidence — nothing else may move.
   */
  const SUBSTITUTED = { costPrice: 4000, packagingCost: 500, insertCost: 100 }; // 4600/unit

  const lines = [
    { productId: "p1", quantity: 2, priceAtPurchase: 10000 },
    { productId: "p1", quantity: 3, priceAtPurchase: 10000 },
  ];
  const order = orderWith(lines);

  it("the delta equals EXACTLY the substituted cost of the now-unknown lines", () => {
    const legacy = calcOrderProfit(order, substitutingResolver(SUBSTITUTED));
    // both lines are historical backfill: relational says unknown
    const canonical = calcOrderProfit(order, substitutingResolver(SUBSTITUTED), undefined, [
      relLine({ quantity: 2 }), relLine({ quantity: 3 }),
    ]);

    const unitSubstituted =
      SUBSTITUTED.costPrice + SUBSTITUTED.packagingCost + SUBSTITUTED.insertCost;
    const attributed = unitSubstituted * (2 + 3);

    expect(legacy.cogs).toBe(attributed);
    expect(canonical.cogs).toBe(0);
    expect(legacy.cogs - canonical.cogs).toBe(attributed); // fully attributed
    expect(canonical.unknownCostLines).toBe(2);

    // NOTHING ELSE MOVED — revenue, shipping, box cost, discounts are identical.
    expect(canonical.revenue).toBe(legacy.revenue);
    expect(canonical.boxCost).toBe(legacy.boxCost);
    expect(canonical.shipping).toBe(legacy.shipping);
    expect(canonical.couponDiscount).toBe(legacy.couponDiscount);
    expect(canonical.loyaltyDiscount).toBe(legacy.loyaltyDiscount);
    // and the profit delta is exactly the COGS delta
    expect(legacy.netProfit - canonical.netProfit).toBe(-attributed);
  });

  it("neither engine ever presented the substituted figure as EXACT", () => {
    const legacy = calcOrderProfit(order, substitutingResolver(SUBSTITUTED));
    const canonical = calcOrderProfit(order, substitutingResolver(SUBSTITUTED), undefined, [
      relLine({ quantity: 2 }), relLine({ quantity: 3 }),
    ]);
    expect(legacy.exactCogs).toBeNull();      // estimated → not exact
    expect(canonical.exactCogs).toBeNull();   // unknown  → not exact
    expect(legacy.costStatus).toBe("estimated");
    expect(canonical.costStatus).toBe("incomplete");
  });
});

describe("status lattice", () => {
  it("degrades worst-wins: unknown > incomplete > estimated > verified_zero ≈ exact", () => {
    expect(worstStatus("exact", "verified_zero")).toBe("exact");
    expect(worstStatus("verified_zero", "estimated")).toBe("estimated");
    expect(worstStatus("estimated", "incomplete")).toBe("incomplete");
    expect(worstStatus("incomplete", "unknown")).toBe("unknown");
    expect(worstStatus("unknown", "exact")).toBe("unknown");
  });

  it("ACCOUNTING NEVER CONVERTS UNKNOWN TO ZERO — a mixed order keeps the known part only", () => {
    const known = productCostFromProduct({
      id: "p1", name: "A", price: "5000", costPrice: "1000",
      packagingCost: "0", insertCost: "0",
      costPriceResolution: "known", packagingCostResolution: "unresolved",
      insertCostResolution: "unresolved",
    } as any);
    const resolver: CostResolver = { getCurrent: () => known, getEffective: () => known };
    const p = calcOrderProfit(
      orderWith([{ productId: "p1", quantity: 2, priceAtPurchase: 5000 }]), resolver);
    // packaging/insert unknown → excluded, NOT read as 0-cost evidence
    expect(p.cogs).toBe(2000);
    expect(p.items[0].unitPackagingCost).toBeNull();
    expect(p.items[0].costStatus).toBe("incomplete");
    expect(p.incompleteCostLines).toBe(1);
    expect(p.exactCogs).toBeNull();
  });
});

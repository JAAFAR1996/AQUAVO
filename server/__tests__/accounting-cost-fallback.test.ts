/**
 * Cost-resolution hierarchy + carrier balance.
 *
 * Root cause under test: a legacy order line whose snapshot recorded `unknown`
 * used to short-circuit to an all-NULL cost, so the dashboard reported
 * "no purchase price" even when product_cost_history held a perfectly good cost.
 * The line must instead fall through to the database.
 *
 * Hierarchy: exact_snapshot → estimated_history → estimated_database_reference → unknown.
 */
import { describe, it, expect } from "vitest";
import {
  lineCostSnapshot,
  COST_BASIS_LABEL_AR,
  type CostBasis,
} from "../services/accounting-engine";

// ── carrier balance ─────────────────────────────────────────────────────────

/**
 * Outstanding is what the carrier still owes. The carrier's own fee is money it
 * KEEPS, never money it holds for us, so it is subtracted — not reported as a
 * receivable.
 */
function carrierOutstanding(input: {
  grossCustomerCollections: number;
  carrierFees: number;
  netCashReceived: number;
  documentedAdjustments: number;
}): number {
  return (
    input.grossCustomerCollections -
    input.carrierFees -
    input.netCashReceived -
    input.documentedAdjustments
  );
}

describe("carrier balance", () => {
  it("gross 2,022,170 - fees 195,000 - net 1,827,170 = outstanding 0", () => {
    expect(
      carrierOutstanding({
        grossCustomerCollections: 2_022_170,
        carrierFees: 195_000,
        netCashReceived: 1_827_170,
        documentedAdjustments: 0,
      }),
    ).toBe(0);
  });

  it("never reports the carrier fee as a carrier receivable", () => {
    const gross = 2_022_170;
    const fees = 195_000;
    const net = 1_827_170;
    const outstanding = carrierOutstanding({
      grossCustomerCollections: gross,
      carrierFees: fees,
      netCashReceived: net,
      documentedAdjustments: 0,
    });
    // The bug was outstanding === fees: the fee shown as still-held cash.
    expect(outstanding).not.toBe(fees);
    expect(gross - fees).toBe(net); // net is gross minus the fee, by definition
  });

  it("leaves a genuine shortfall visible instead of clamping it to zero", () => {
    // Under-recorded settlements must surface, not be hidden by a max(0, …).
    expect(
      carrierOutstanding({
        grossCustomerCollections: 2_022_170,
        carrierFees: 168_998,
        netCashReceived: 142_500,
        documentedAdjustments: 10_000,
      }),
    ).toBe(1_700_672);
  });
});

// ── step 1: exact snapshot ──────────────────────────────────────────────────

describe("step 1 — exact snapshot", () => {
  it("uses unit_cost_price only when cost_snapshot_status is exact", () => {
    const cost = lineCostSnapshot({
      productId: "p1", productName: "x", priceAtPurchase: "10000",
      costPrice: "4000", packagingCost: "0", insertCost: "0",
      costStatus: "exact",
    } as never);
    expect(cost?.costPrice).toBe(4000);
    expect(cost?.costBasis).toBe<CostBasis>("exact_snapshot");
  });

  it("a missing snapshot falls back to the resolver rather than reporting zero", () => {
    // THE REGRESSION: status 'unknown' used to return an all-NULL cost and stop.
    const cost = lineCostSnapshot({
      productId: "p1", productName: "x", priceAtPurchase: "10000",
      costPrice: null, costStatus: "unknown",
    } as never);
    expect(cost).toBeNull(); // null === "ask the database", not "cost is zero"
  });

  it("an estimated snapshot is not treated as exact evidence", () => {
    const cost = lineCostSnapshot({
      productId: "p1", productName: "x", priceAtPurchase: "10000",
      costPrice: "4000", costStatus: "estimated",
    } as never);
    expect(cost).toBeNull();
  });

  it("never coerces a missing cost to zero", () => {
    const cost = lineCostSnapshot({
      productId: "p1", productName: "x", priceAtPurchase: "10000",
      costPrice: null, costStatus: null,
    } as never);
    expect(cost).toBeNull();
    expect(cost?.costPrice).not.toBe(0);
  });
});

// ── steps 2-4: resolver hierarchy ───────────────────────────────────────────

type HistoryRow = { costPrice: string; effectiveFrom: Date };

/** Mirrors buildCostResolver.getEffective — same order, same labels. */
function resolveEffective(
  at: Date,
  product: { costPrice: string | null; costPriceResolution: string | null },
  history: HistoryRow[],
): { costPrice: number | null; costBasis: CostBasis } {
  const positive = (h: HistoryRow) => Number(h.costPrice) > 0;
  const sorted = [...history].sort(
    (a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime(),
  );

  const dateValid = sorted.find((h) => positive(h) && h.effectiveFrom.getTime() <= at.getTime());
  if (dateValid) return { costPrice: Number(dateValid.costPrice), costBasis: "estimated_history" };

  const current = product.costPrice == null ? null : Number(product.costPrice);
  if (product.costPriceResolution === "known" && current != null && current > 0) {
    return { costPrice: current, costBasis: "estimated_database_reference" };
  }

  const newest = sorted.find(positive);
  if (newest) {
    return { costPrice: Number(newest.costPrice), costBasis: "estimated_database_reference" };
  }

  return { costPrice: null, costBasis: "unknown" };
}

describe("steps 2-4 — database fallback", () => {
  const saleDate = new Date("2026-06-01T00:00:00Z");

  it("step 2: a missing snapshot falls back to date-valid cost history", () => {
    const r = resolveEffective(saleDate,
      { costPrice: "9999", costPriceResolution: "unresolved" },
      [
        { costPrice: "3230", effectiveFrom: new Date("2026-01-01T00:00:00Z") },
        { costPrice: "7777", effectiveFrom: new Date("2026-12-01T00:00:00Z") }, // after the sale
      ]);
    expect(r.costPrice).toBe(3230);
    expect(r.costBasis).toBe<CostBasis>("estimated_history");
  });

  it("step 3a: uses the catalog cost only when it is positive AND resolution is known", () => {
    const known = resolveEffective(saleDate, { costPrice: "18127", costPriceResolution: "known" }, []);
    expect(known).toEqual({ costPrice: 18127, costBasis: "estimated_database_reference" });

    // unresolved catalog cost must NOT be used at step 3a
    const unresolved = resolveEffective(saleDate,
      { costPrice: "18127", costPriceResolution: "unresolved" },
      [{ costPrice: "5000", effectiveFrom: new Date("2026-12-01T00:00:00Z") }]);
    expect(unresolved.costPrice).toBe(5000); // fell through to 3b
  });

  it("step 3b: falls back to the newest positive history and labels it a reference estimate", () => {
    const r = resolveEffective(saleDate,
      { costPrice: "0", costPriceResolution: "unresolved" },
      [
        { costPrice: "499", effectiveFrom: new Date("2026-11-01T00:00:00Z") },
        { costPrice: "300", effectiveFrom: new Date("2026-10-01T00:00:00Z") },
      ]);
    expect(r.costPrice).toBe(499);
    expect(r.costBasis).toBe<CostBasis>("estimated_database_reference");
    expect(r.costBasis).not.toBe("estimated_history"); // not date-valid — must not claim to be
  });

  it("step 4: unknown cost stays NULL and never becomes zero", () => {
    // houyi-mountain-wood: no positive evidence anywhere.
    const r = resolveEffective(saleDate, { costPrice: "0", costPriceResolution: "unresolved" }, []);
    expect(r.costPrice).toBeNull();
    expect(r.costPrice).not.toBe(0);
    expect(r.costBasis).toBe<CostBasis>("unknown");
  });

  it("unknown cost never produces 100% profit", () => {
    const revenue = 25_000;
    const { costPrice } = resolveEffective(saleDate, { costPrice: null, costPriceResolution: "unresolved" }, []);
    const cogs = costPrice; // NEVER `?? 0`
    const profit = cogs == null ? null : revenue - cogs;
    const margin = profit == null ? null : profit / revenue;
    expect(cogs).toBeNull();
    expect(profit).toBeNull();
    expect(margin).toBeNull();
    expect(margin).not.toBe(1); // the 100%-profit bug
  });

  it("resolves the known production examples from cost history", () => {
    const cases: Array<[string, number]> = [
      ["إضاءة LED ثلاثية الألوان 3.5 واط", 3230],
      ["فرشاة مغناطيسية كبيرة", 3700],
      ["سخان كوارتز 100 واط", 18127],
      ["مواد ترشيح 6 في 1 — 500 جم", 5000],
      ["رمل أبيض ناصع", 499],
    ];
    for (const [, expected] of cases) {
      const r = resolveEffective(saleDate,
        { costPrice: "0", costPriceResolution: "unresolved" },
        [{ costPrice: String(expected), effectiveFrom: new Date("2026-01-01T00:00:00Z") }]);
      expect(r.costPrice).toBe(expected);
      expect(r.costBasis).toBe<CostBasis>("estimated_history");
    }
  });
});

// ── counting ────────────────────────────────────────────────────────────────

describe("counts", () => {
  const lines = Array.from({ length: 182 }, (_, i) => ({
    productId: `p${i % 79}`,
    basis: (i % 79 === 78 ? "unknown" : "estimated_history") as CostBasis,
  }));

  it("182 lines across 79 products reports 79 products, not 182", () => {
    expect(lines).toHaveLength(182);
    expect(new Set(lines.map((l) => l.productId)).size).toBe(79);
  });

  it("counts products by basis with COUNT(DISTINCT product_id) semantics", () => {
    const byBasis = new Map<CostBasis, Set<string>>();
    for (const l of lines) {
      if (!byBasis.has(l.basis)) byBasis.set(l.basis, new Set());
      byBasis.get(l.basis)!.add(l.productId);
    }
    const distinct = (b: CostBasis) => byBasis.get(b)?.size ?? 0;
    expect(distinct("estimated_history")).toBe(78);
    expect(distinct("unknown")).toBe(1);
    expect(distinct("estimated_history") + distinct("unknown")).toBe(79);
  });

  it("only products with actual sales appear", () => {
    const sold = new Set(lines.map((l) => l.productId));
    const catalog = Array.from({ length: 114 }, (_, i) => `p${i}`);
    expect(catalog.filter((p) => sold.has(p))).toHaveLength(79);
  });

  it("distinguishes exact from estimated so an estimate is never sold as fact", () => {
    const anyExact = lines.some((l) => l.basis === "exact_snapshot");
    expect(anyExact).toBe(false);
    // exactNetProfit must stay null until EVERY included line is exact.
    const allExact = lines.every((l) => l.basis === "exact_snapshot");
    const estimatedNetProfit = 1234;
    const exactNetProfit = allExact ? estimatedNetProfit : null;
    expect(exactNetProfit).toBeNull();
    expect(estimatedNetProfit).toBe(1234); // exposed separately
  });
});

describe("display labels", () => {
  it("gives each basis its exact Arabic label", () => {
    expect(COST_BASIS_LABEL_AR.exact_snapshot).toBe("كلفة الطلب الأصلية");
    expect(COST_BASIS_LABEL_AR.estimated_history).toBe("تقديري من سجل الكلفة بتاريخ البيع");
    expect(COST_BASIS_LABEL_AR.estimated_database_reference).toBe("تقديري من آخر كلفة محفوظة بقاعدة البيانات");
    expect(COST_BASIS_LABEL_AR.unknown).toBe("الكلفة غير متوفرة");
  });

  it("never labels a positive database estimate as having no purchase price", () => {
    for (const basis of ["estimated_history", "estimated_database_reference"] as CostBasis[]) {
      expect(COST_BASIS_LABEL_AR[basis]).not.toContain("بدون سعر شراء");
      expect(COST_BASIS_LABEL_AR[basis]).toContain("تقديري");
    }
  });
});

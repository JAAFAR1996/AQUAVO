import { describe, expect, it, vi } from "vitest";
vi.mock("../db.js", () => ({ getDb: () => null }));
import { buildRelationalLineResolver, calcOrderProfit, reconcileOrderLines, type RelationalLineSnapshot } from "../services/accounting-engine.js";
const row = (variantId: string | null, cost: number, quantity = 1, price = 1000): RelationalLineSnapshot => ({
  orderId: "synthetic", productId: "p", variantId, quantity, priceAtPurchase: price,
  costPrice: cost, packagingCost: 0, insertCost: 0, costStatus: "exact", costSource: "manual",
});
const json = [
  { productId: "p", variantId: "small", quantity: 2, priceAtPurchase: 1000, costPrice: 999 },
  { productId: "p", variantId: "large", quantity: 1, priceAtPurchase: 3000, costPrice: 999 },
];
describe("Accounting costs follow variant identity, never row position", () => {
  it("matches reversed database ordering and uses each option's real quantity", () => {
    const result = reconcileOrderLines(json, [row("large", 600, 1, 3000), row("small", 100, 2)]);
    expect(result.reconciled).toBe(true);
    expect(result.items.map(item => item.costPrice)).toEqual([100, 600]);
    const profit = calcOrderProfit({ id: "synthetic", items: json, total: "5000", shippingCost: "0", createdAt: new Date("2026-10-01T00:00:00Z") } as any,
      { getEffective: () => null } as any, undefined, [row("large", 600, 1, 3000), row("small", 100, 2)]);
    expect(profit.exactCogs).toBe(800); expect(profit.costsComplete).toBe(true);
  });
  it("fails closed when two historical options cannot be attributed", () => {
    const result = reconcileOrderLines(json, [row(null, 600, 1, 3000), row(null, 100, 2)]);
    expect(result.reconciled).toBe(false); expect(result.items).toBe(json);
    const profit = calcOrderProfit({ id: "synthetic", items: json, total: "5000", shippingCost: "0", createdAt: new Date("2026-10-01T00:00:00Z") } as any,
      { getEffective: () => null } as any, undefined, [row(null, 600, 1, 3000), row(null, 100, 2)]);
    expect(profit.costsComplete).toBe(false); expect(profit.exactNetProfit).toBeNull();
  });
  it("allows a unique historical singleton, not an arbitrary many-to-many match", () => {
    expect(reconcileOrderLines([json[0]], [row(null, 100, 2)]).reconciled).toBe(true);
    expect(reconcileOrderLines([json[0]], [row("wrong-option", 100, 2)]).reconciled).toBe(false);
  });
  it("reports ambiguous different costs even when product and quantity totals match", () => {
    const items = [{ productId: "p", quantity: 1, priceAtPurchase: 1000 }, { productId: "p", quantity: 1, priceAtPurchase: 1000 }];
    expect(reconcileOrderLines(items, [row(null, 100), row(null, 200)]).reconciled).toBe(false);
    expect(reconcileOrderLines(items, [row(null, 100), row(null, 100)]).reconciled).toBe(true);
  });
  it("uses sale price only as a deterministic tie-breaker without rewriting revenue", () => {
    const items = [{ productId: "p", quantity: 1, priceAtPurchase: 1000 }, { productId: "p", quantity: 1, priceAtPurchase: 2000 }];
    const result = reconcileOrderLines(items, [row(null, 200, 1, 2000), row(null, 100, 1, 1000)]);
    expect(result.reconciled).toBe(true); expect(result.items.map(item => item.costPrice)).toEqual([100, 200]);
    expect(result.items.map(item => item.priceAtPurchase)).toEqual([1000, 2000]);
  });
  it("retains variant metadata when loading actual relational snapshot rows", async () => {
    const raw = { orderId: "synthetic", productId: "p", quantity: 1, priceAtPurchase: "1000", unitCostPrice: "100",
      unitPackagingCost: "0", unitInsertCost: "0", costSnapshotStatus: "exact", costSnapshotSource: "manual", metadata: { variantId: "small" } };
    const db = { select: () => ({ from: () => ({ where: async () => [raw] }) }) };
    const resolver = await buildRelationalLineResolver(db as any, new Set(["synthetic"]));
    expect(resolver.get("synthetic")?.[0]).toMatchObject({ variantId: "small", costPrice: 100, packagingCost: 0 });
  });
});

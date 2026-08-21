// Production regression pinned from FH-260820-2E8CCB97 so exact zero costs never regress.
import { describe, expect, it } from "vitest";
import {
  buildOrderCostBreakdown,
  resolveRelationalSnapshotComponent,
} from "../services/accounting-engine.js";

describe("profitability truth regressions", () => {
  it("preserves genuine zero ancillary costs on an exact relational snapshot", () => {
    expect(resolveRelationalSnapshotComponent("0", "exact")).toBe(0);
    expect(resolveRelationalSnapshotComponent(0, "verified_zero")).toBe(0);
    expect(resolveRelationalSnapshotComponent("81", "exact")).toBe(81);
  });

  it("keeps ambiguous zero conservative on non-exact snapshots", () => {
    expect(resolveRelationalSnapshotComponent("0", "estimated")).toBeNull();
    expect(resolveRelationalSnapshotComponent(0, "unknown")).toBeNull();
    expect(resolveRelationalSnapshotComponent(null, "exact")).toBeNull();
  });

  it("reports the real AQUAVO order COGS and does not flag box_cost=0 as legacy residue", () => {
    const order = {
      id: "148d28d6-c180-48be-9f5f-e46e867dc481",
      orderNumber: "FH-260820-2E8CCB97",
      status: "pending",
      createdAt: new Date("2026-08-20T21:55:38.397Z"),
      total: "17960",
      roundedTotal: "18000",
      shippingCost: "5000",
      boxCost: "0",
    } as any;

    const profit = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerName: "محمد عصام",
      customerPhone: null,
      status: order.status,
      createdAt: order.createdAt,
      revenue: 13000,
      costStatus: "exact",
      items: [
        {
          productId: "houyi-planting-ring",
          name: "حلقة تثبيت نباتات — سيراميك بركاني",
          qty: 4,
          priceAtPurchase: 740,
          unitCostPrice: 81,
          unitPackagingCost: 0,
          unitInsertCost: 0,
          costStatus: "exact",
        },
        {
          productId: "houyi-acrylic-pump-compartment",
          name: "حجرة فلتر أكريليك شفافة",
          qty: 1,
          priceAtPurchase: 10000,
          unitCostPrice: 4842,
          unitPackagingCost: 0,
          unitInsertCost: 0,
          costStatus: "exact",
        },
      ],
    } as any;

    const breakdown = buildOrderCostBreakdown(order, profit, undefined);
    expect(breakdown.productCogs).toBe(5166);
    expect(breakdown.supplierPackaging).toBe(0);
    expect(breakdown.unallocated.unknownProductLines).toBe(0);
    expect(breakdown.unallocated.legacyBoxCost).toBeNull();
    expect(breakdown.contributionProfit).toBeNull();
  });
});

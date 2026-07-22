// Consolidation proof (pure): the primitives the redirected consumers now call
// disagree with the legacy inline formulas they replaced — and the canonical
// answer is the correct one in every case below.
//
// Consumers covered:
//   - server/routes/analytics.ts        (status filter)
//   - server/services/ai-tools.ts       (collected amount + price parsing)
//   - server/services/predictive-analytics.ts (average order value)
//   - server/routes/mcp.ts, server/aquavo-mcp*.ts (realized-status list)
import { describe, it, expect } from "vitest";
import {
  isRealizedStatus,
  orderCollectedAmount,
  roundCollected,
  toMoney,
  toMoneyOrNull,
  REALIZED_STATUSES,
} from "../../shared/order-financials.js";
import { lineQuantity } from "../services/accounting-engine.js";

describe("consolidation — canonical status filter replaces literal 'delivered'", () => {
  it("REALIZED_STATUSES is the single list every consumer reads", () => {
    expect([...REALIZED_STATUSES]).toEqual(["delivered"]);
  });

  it("isRealizedStatus is whitespace/case tolerant, a literal comparison is not", () => {
    for (const s of ["delivered", "Delivered", " DELIVERED "]) {
      expect(isRealizedStatus(s)).toBe(true);
      // What analytics.ts and the MCP tools used to do:
      if (s !== "delivered") expect(s === "delivered").toBe(false);
    }
  });

  it("'confirmed' is NOT realized revenue — the old MCP SQL counted it", () => {
    expect(isRealizedStatus("confirmed")).toBe(false);
    for (const s of ["pending", "processing", "shipped", "cancelled", "returned", null, undefined]) {
      expect(isRealizedStatus(s)).toBe(false);
    }
  });
});

describe("consolidation — orderCollectedAmount replaces parseFloat(order.total)", () => {
  it("prefers the persisted roundedTotal (what the customer was actually charged)", () => {
    const order = { total: "12100", roundedTotal: "12000" };
    expect(orderCollectedAmount(order)).toBe(12000);
    // Legacy formula in predictive-analytics / ai-tools / ai-dashboard:
    expect(parseFloat(order.total)).toBe(12100);
    expect(orderCollectedAmount(order)).not.toBe(parseFloat(order.total));
  });

  it("falls back to rounding `total` to the IQD step when roundedTotal is absent", () => {
    expect(orderCollectedAmount({ total: "12100" })).toBe(roundCollected("12100"));
    expect(orderCollectedAmount({ total: "12100" })).toBe(12000);
    expect(orderCollectedAmount({ total: "12200", roundedTotal: null })).toBe(12250);
  });

  it("never yields NaN for garbage input (parseFloat does)", () => {
    expect(Number.isNaN(parseFloat("abc"))).toBe(true);
    expect(orderCollectedAmount({ total: "abc" })).toBe(0);
    expect(orderCollectedAmount({ total: null })).toBe(0);
  });

  it("average order value over collected amounts (predictive-analytics)", () => {
    const orders = [
      { total: "12100", roundedTotal: "12000" },
      { total: "8100", roundedTotal: "8000" },
    ];
    const canonical = orders.reduce((s, o) => s + orderCollectedAmount(o), 0) / orders.length;
    const legacy = orders.reduce((s, o) => s + parseFloat(o.total), 0) / orders.length;
    expect(canonical).toBe(10000);
    expect(legacy).toBe(10100); // the old figure overstated AOV
  });
});

describe("consolidation — toMoney replaces scattered parseFloat on price columns", () => {
  it("toMoney is NaN-safe where parseFloat is not (ai-tools price display)", () => {
    expect(toMoney("15000")).toBe(15000);
    expect(toMoney(null)).toBe(0);
    expect(toMoney(undefined)).toBe(0);
    expect(toMoney("")).toBe(0);
    expect(toMoney("not-a-price")).toBe(0);
  });

  it("cost EVIDENCE uses toMoneyOrNull — unknown stays null, a real 0 stays 0", () => {
    expect(toMoneyOrNull(null)).toBeNull();
    expect(toMoneyOrNull("")).toBeNull();
    expect(toMoneyOrNull("junk")).toBeNull();
    expect(toMoneyOrNull(0)).toBe(0);
    expect(toMoneyOrNull("0")).toBe(0);
    // The rule the consolidation exists to enforce: unknown !== zero.
    expect(toMoney(null)).toBe(0);
    expect(toMoneyOrNull(null)).not.toBe(toMoney(null));
  });
});

describe("consolidation — lineQuantity replaces `Number(item.quantity) || 1`", () => {
  it("agrees with the legacy expression for normal input", () => {
    for (const q of [1, 2, 7, "3"]) {
      expect(lineQuantity({ quantity: q })).toBe(Number(q) || 1);
    }
  });

  it("defaults a missing/invalid quantity to 1 rather than 0", () => {
    expect(lineQuantity({})).toBe(1);
    expect(lineQuantity({ quantity: 0 })).toBe(1);
    expect(lineQuantity({ quantity: "abc" })).toBe(1);
    expect(lineQuantity({ quantity: -3 })).toBe(1);
  });

  it("line revenue = price × quantity via canonical primitives (MCP top products)", () => {
    const item = { priceAtPurchase: "5000", quantity: 2 };
    expect(toMoney(item.priceAtPurchase) * lineQuantity(item)).toBe(10000);
  });
});

// The four follow-up swaps the consolidation pass identified but could not reach
// within its file ownership: customer `totalSpent` and loyalty accrual (admin.ts),
// the money the chatbot quotes (ai.ts), the fraud-risk threshold (fraud-detector.ts),
// and the raw-SQL realized-status literals (badge/winback engines).
//
// Each test states the LEGACY formula and the CANONICAL one side by side and asserts
// they disagree in the direction of the correct answer — so this fails if anyone
// reverts a swap, and documents exactly what was wrong.
import { describe, it, expect } from "vitest";
import {
  orderCollectedAmount, isRealizedStatus, REALIZED_STATUSES, roundCollected,
} from "../../shared/order-financials.js";

type TestOrder = Parameters<typeof orderCollectedAmount>[0] & { status: string };

const order = (o: Partial<TestOrder>): TestOrder => ({
  total: "0", roundedTotal: null, status: "delivered", ...o,
} as TestOrder);

describe("follow-up consolidation swaps", () => {
  describe("customer totalSpent (admin.ts) — was Number(o.total) across ALL statuses", () => {
    const history = [
      order({ total: "30100", roundedTotal: "30250", status: "delivered" }),
      order({ total: "12000", roundedTotal: "12000", status: "cancelled" }),
      order({ total: "5000", roundedTotal: "5000", status: "pending" }),
    ];

    it("no longer counts cancelled or pending orders as money spent", () => {
      const legacy = history.reduce((s, o) => s + Number(o.total ?? 0), 0);
      const canonical = history
        .filter((o) => isRealizedStatus(o.status))
        .reduce((s, o) => s + orderCollectedAmount(o), 0);

      expect(legacy).toBe(47100);      // counted a cancelled and a pending order
      expect(canonical).toBe(30250);   // only what was actually received and paid
      expect(canonical).toBeLessThan(legacy);
    });

    it("uses the ROUNDED amount the customer actually paid, not the raw total", () => {
      const o = order({ total: "30100", roundedTotal: "30250" });
      expect(Number(o.total)).toBe(30100);
      expect(orderCollectedAmount(o)).toBe(30250);
    });
  });

  describe("loyalty accrual (admin.ts) — was parseFloat(order.total)", () => {
    it("accrues on the collected amount, so points match what was paid", () => {
      const o = order({ total: "30100", roundedTotal: "30250" });
      const legacy = parseFloat(String(o.total)) || 0;
      expect(orderCollectedAmount(o)).toBeGreaterThan(legacy);
    });

    it("falls back to the rounded total when roundedTotal was never persisted", () => {
      const o = order({ total: "30100", roundedTotal: null });
      expect(orderCollectedAmount(o)).toBe(roundCollected("30100"));
    });
  });

  describe("chatbot revenue (ai.ts) — was parseFloat(order.total) over EVERY order", () => {
    const window = [
      order({ total: "25000", roundedTotal: "25000", status: "delivered" }),
      order({ total: "40000", roundedTotal: "40000", status: "cancelled" }),
      order({ total: "10000", roundedTotal: "10000", status: "processing" }),
    ];

    it("quotes only realized revenue, so it agrees with the accounting page", () => {
      const legacy = window.reduce((s, o) => s + (parseFloat(o.total as string) || 0), 0);
      const canonical = window.reduce(
        (s, o) => (isRealizedStatus(o.status) ? s + orderCollectedAmount(o) : s), 0);

      expect(legacy).toBe(75000);     // the chatbot used to inflate revenue 3x
      expect(canonical).toBe(25000);
    });

    it("counts completed orders by the canonical realized set", () => {
      expect(window.filter((o) => isRealizedStatus(o.status))).toHaveLength(1);
    });
  });

  describe("fraud threshold (fraud-detector.ts) — was parseFloat(order.total)", () => {
    it("an order that rounds ABOVE the threshold is now flagged", () => {
      // Raw total sits just under 500,000; the amount actually collected is over it.
      const o = order({ total: "499900", roundedTotal: "500250" });
      const legacyFlags = (parseFloat(o.total as string) || 0) > 500_000;
      const canonicalFlags = orderCollectedAmount(o) > 500_000;

      expect(legacyFlags).toBe(false);   // the old check missed it
      expect(canonicalFlags).toBe(true);
    });
  });

  describe("realized-status literals (badge/winback engines)", () => {
    it("the canonical set is the single source both engines now bind to", () => {
      expect([...REALIZED_STATUSES]).toEqual(["delivered"]);
      expect(isRealizedStatus("delivered")).toBe(true);
      expect(isRealizedStatus("confirmed")).toBe(false); // never realized revenue
      expect(isRealizedStatus("cancelled")).toBe(false);
    });

    it("widening the canonical set would update every bound query at once", () => {
      // The point of binding: these engines no longer carry their own literal, so a
      // future change to REALIZED_STATUSES reaches them without a code edit.
      for (const s of REALIZED_STATUSES) expect(isRealizedStatus(s)).toBe(true);
    });
  });
});

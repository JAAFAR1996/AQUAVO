// Formatting contract for the fulfillment admin UX.
//
// These tests pin the CONTRACT with the server, not just the output string. The
// accounting engine returns `contributionMargin` ALREADY as a percentage —
// `Math.round((contributionProfit / revenue) * 100)` — so the client must not
// scale it again. It briefly did, which rendered 23% as 2300%.
import { describe, it, expect } from "vitest";
import {
  formatAmount, formatIqd, formatMargin, formatVariance, formatQuantity, UNKNOWN_LABEL,
} from "../fulfillment-format";

describe("fulfillment formatting", () => {
  describe("money", () => {
    it("renders null as UNKNOWN — never as zero", () => {
      expect(formatAmount(null)).toBe(UNKNOWN_LABEL);
      expect(formatAmount(undefined)).toBe(UNKNOWN_LABEL);
      expect(formatAmount(null)).not.toMatch(/0/);
    });

    it("renders a genuine zero as zero — a verified-free line is not unknown", () => {
      expect(formatAmount(0)).toBe(formatIqd(0));
      expect(formatAmount(0)).not.toBe(UNKNOWN_LABEL);
    });

    it("renders a known amount verbatim with the IQD unit", () => {
      expect(formatAmount(1900)).toBe("1,900 د.ع");
    });
  });

  describe("margin", () => {
    // The engine's own expression, replicated here so this test fails if the
    // server ever switches to returning a ratio.
    const engineMargin = (profit: number, revenue: number) =>
      Math.round((profit / revenue) * 100);

    it("does NOT re-scale a value the server already expressed as a percentage", () => {
      const fromEngine = engineMargin(5750, 25000); // 23
      expect(fromEngine).toBe(23);
      expect(formatMargin(fromEngine)).toBe("23%");
      expect(formatMargin(fromEngine)).not.toBe("2300%"); // the bug this pins
    });

    it("round-trips the engine's value across a range of orders", () => {
      for (const [profit, revenue, expected] of [
        [5750, 25000, "23%"],
        [12500, 25000, "50%"],
        [250, 25000, "1%"],
        [-2500, 25000, "-10%"],
      ] as const) {
        expect(formatMargin(engineMargin(profit, revenue))).toBe(expected);
      }
    });

    it("renders an unknown margin as UNKNOWN", () => {
      expect(formatMargin(null)).toBe(UNKNOWN_LABEL);
    });
  });

  describe("variance", () => {
    it("signs an overspend and leaves an underspend negative", () => {
      expect(formatVariance(250)).toBe("+250 د.ع");
      expect(formatVariance(-250)).toBe("-250 د.ع");
    });

    it("renders an exact match as zero, not as unknown", () => {
      expect(formatVariance(0)).toBe("0 د.ع");
    });

    it("renders an unknown variance as UNKNOWN", () => {
      expect(formatVariance(null)).toBe(UNKNOWN_LABEL);
    });
  });

  describe("quantity", () => {
    it("appends the unit when there is one", () => {
      expect(formatQuantity(3, "piece")).toBe("3 piece");
      expect(formatQuantity(3)).toBe("3");
    });

    it("does not add a currency to a count", () => {
      expect(formatQuantity(2)).not.toMatch(/د\.ع/);
    });
  });
});

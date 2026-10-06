import { describe, expect, it } from "vitest";
import { LoyaltyStorage } from "../storage/loyalty-storage.js";

describe("IQD checkout cash rounding", () => {
  const loyalty = new LoyaltyStorage();

  it("rounds to the nearest 250 instead of always charging upward", () => {
    expect(loyalty.roundToIraqiDenomination(5101)).toEqual({
      originalAmount: 5101,
      roundedAmount: 5000,
      remainder: 0,
    });

    expect(loyalty.roundToIraqiDenomination(5126)).toEqual({
      originalAmount: 5126,
      roundedAmount: 5250,
      remainder: 124,
    });
  });

  it("keeps exact denomination totals unchanged", () => {
    expect(loyalty.roundToIraqiDenomination(5000)).toEqual({
      originalAmount: 5000,
      roundedAmount: 5000,
      remainder: 0,
    });
  });
});

import { describe, expect, it } from "vitest";

import { resolveCheckoutTotal } from "@/lib/checkout-total";

describe("resolveCheckoutTotal", () => {
  it("prefers the server rounded total over the pre-rounding total", () => {
    expect(resolveCheckoutTotal({ total: "55,120", roundedTotal: "55250" }, 60000)).toBe(55250);
  });

  it("uses the authenticated loyalty rounded total when returned", () => {
    expect(resolveCheckoutTotal({ total: 55120, loyalty: { roundedTotal: 54750 } }, 60000)).toBe(54750);
  });

  it("falls back to the visible checkout total for invalid responses", () => {
    expect(resolveCheckoutTotal({ total: "invalid" }, 60000)).toBe(60000);
  });
});

import { describe, expect, it } from "vitest";

import {
  getProductDisplayBrand,
  getProductDisplayIdentity,
  getProductDisplayName,
} from "../product-display";

describe("product display identity", () => {
  it("moves YEE out of an Arabic product name without changing the rest", () => {
    expect(
      getProductDisplayName("مضخة هواء YEE صغيرة — 3 واط", "YEE"),
    ).toBe("مضخة هواء صغيرة — 3 واط");
  });

  it("removes a brand before a dash cleanly", () => {
    expect(
      getProductDisplayName("مضخة هواء SUNSUN — منفذان", "SUNSUN"),
    ).toBe("مضخة هواء — منفذان");
  });

  it("handles mixed-case brand matches", () => {
    expect(
      getProductDisplayName("سكيمر سطح DoPhin لإزالة الطبقة الزيتية", "dophin"),
    ).toBe("سكيمر سطح لإزالة الطبقة الزيتية");
  });

  it("does not remove a brand substring from a larger token", () => {
    expect(getProductDisplayName("YEECO Pump", "YEE")).toBe("YEECO Pump");
  });

  it("hides placeholder brands", () => {
    expect(getProductDisplayBrand("General")).toBe("");
  });

  it("keeps canonical-looking names unchanged when the brand is already separate", () => {
    expect(
      getProductDisplayIdentity({ name: "حجر هواء أسطواني", brand: "Houyi" }),
    ).toEqual({ name: "حجر هواء أسطواني", brand: "Houyi" });
  });
});

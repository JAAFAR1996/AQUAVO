import { describe, expect, it } from "vitest";
import { normalizePhoneInputDigits } from "../customer-info-form";

describe("normalizePhoneInputDigits", () => {
  it("converts Arabic-Indic digits to ASCII without changing the Iraqi number", () => {
    expect(normalizePhoneInputDigits("٠٧٨٠١٢٣٤٥٦٧")).toBe("07801234567");
  });

  it("converts Eastern Arabic/Sorani digits to ASCII", () => {
    expect(normalizePhoneInputDigits("۰۷۵۰۱۲۳۴۵۶۷")).toBe("07501234567");
  });

  it("preserves an already normalized international number", () => {
    expect(normalizePhoneInputDigits("+964 780 123 4567")).toBe("+964 780 123 4567");
  });
});

import { describe, expect, it } from "vitest";
import { sourceForGlossaryConcept } from "../../TOOLS/i18n/_glossary-context.js";

describe("Arabic payment glossary context", () => {
  it("does not interpret pushing a brush wire as paying money", () => {
    expect(sourceForGlossaryConcept("تجنب دفع السلك بقوة داخل الأنابيب الزجاجية أو الانحناءات الضيقة.", "payment")).not.toContain("دفع");
  });
  it.each(["دفع السعر", "الدفع عند الاستلام", "دفع رسوم التوصيل"])("preserves the financial phrase %s", (text) => {
    expect(sourceForGlossaryConcept(text, "payment")).toBe(text);
  });
  it("retains a financial occurrence alongside a physical occurrence", () => {
    expect(sourceForGlossaryConcept("تجنب دفع السلك بقوة؛ الدفع عند الاستلام متاح.", "payment")).toContain("الدفع عند الاستلام");
  });
  it("leaves every other glossary concept unchanged", () => {
    const text = "تجنب دفع السلك بقوة";
    expect(sourceForGlossaryConcept(text, "wire")).toBe(text);
  });
});

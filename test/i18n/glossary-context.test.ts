import { describe, expect, it } from "vitest";
import { sourceForGlossaryConcept } from "../../TOOLS/i18n/_glossary-context.js";

describe("Arabic charging-port glossary context", () => {
  it.each(["USB", "USB-C"])("recognizes the charging specification %s", (specificationValue) => {
    expect(sourceForGlossaryConcept("الشحن", "delivery", { specificationValue })).toBe("");
  });
  it("still checks an isolated shipping label without a charging-port value", () => {
    expect(sourceForGlossaryConcept("الشحن", "delivery")).toBe("الشحن");
    expect(sourceForGlossaryConcept("الشحن", "delivery", { specificationValue: "إلى بغداد" })).toBe("الشحن");
  });
  it("retains shipping prose even beside a charging-port value", () => {
    const source = "الشحن إلى جميع المحافظات";
    expect(sourceForGlossaryConcept(source, "delivery", { specificationValue: "USB-C" })).toBe(source);
  });
  it("preserves unrelated glossary concepts", () => {
    expect(sourceForGlossaryConcept("الشحن", "payment", { specificationValue: "USB-C" })).toBe("الشحن");
  });
});

it("distinguishes pushing suspended particles from a later payment reference", () => {
  const source = "يساعد على دفع العوالق نحو الفلتر؛ الدفع عند الاستلام متاح.";
  const financial = sourceForGlossaryConcept(source, "payment");
  expect(financial).not.toContain("دفع العوالق");
  expect(financial).toContain("الدفع عند الاستلام");
  expect(sourceForGlossaryConcept(source, "filter")).toBe(source);
});

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

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("checkout WhatsApp consent contract", () => {
  it("keeps required terms acceptance separate from optional marketing consent", () => {
    const view = read("client/src/components/cart/checkout/confirmation-view.tsx");
    expect(view).toContain('id="agree"');
    expect(view).toContain("setAgreed(accepted)");
    expect(view).toContain('id="whatsapp-marketing-opt-in"');
    expect(view).toContain("checked={whatsappMarketingOptIn}");
    expect(view).toContain("setWhatsappMarketingOptIn(checked === true)");
    expect(view).not.toContain("setWhatsappMarketingOptIn(accepted)");
  });

  it("explains separate marketing consent in Arabic, English, and Sorani", () => {
    for (const locale of ["ar", "en", "ckb"]) {
      const doc = JSON.parse(read(`client/src/locales/${locale}/checkout.json`));
      expect(doc.confirm.agreeSuffix.length).toBeGreaterThan(20);
      expect(doc.confirm.whatsappOptIn.length).toBeGreaterThan(20);
      expect(doc.confirm.whatsappOptInHint.length).toBeGreaterThan(20);
    }
    const ar = JSON.parse(read("client/src/locales/ar/checkout.json"));
    expect(ar.confirm.agreeSuffix).toContain("موافقة اختيارية منفصلة");
    expect(ar.confirm.whatsappOptIn).toContain("واتساب");
  });

  it("keeps the terms page available", () => {
    const terms = read("client/src/pages/terms.tsx");
    expect(terms).toContain('t("terms.s66")');
    expect(terms).toContain('t("terms.s67")');
    expect(terms).toContain('t("terms.s68")');
  });
});

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("checkout terms consent contract", () => {
  it("shows exactly the linked terms text on the only required checkbox", () => {
    const view = read("client/src/components/cart/checkout/confirmation-view.tsx");
    expect(view).toContain('id="agree"');
    expect(view).toContain("setAgreed(accepted)");
    expect(view).toContain('t("confirm.agreePrefix")');
    expect(view).toContain('t("confirm.terms")');
    expect(view).not.toContain('t("confirm.agreeSuffix")');
    expect(view).not.toContain('id="whatsapp-marketing-opt-in"');
    expect(view).not.toContain("setWhatsappMarketingOptIn(accepted)");
    expect(view).not.toContain("setWhatsappMarketingOptIn(checked === true)");
  });

  it("maintains translated terms-only consent wording for all storefront languages", () => {
    const ar = JSON.parse(read("client/src/locales/ar/checkout.json"));
    expect(ar.confirm.agreePrefix + " " + ar.confirm.terms).toBe("أوافق على الشروط والأحكام");
    for (const locale of ["ar", "en", "ckb"]) {
      const doc = JSON.parse(read(`client/src/locales/${locale}/checkout.json`));
      expect(doc.confirm.agreePrefix.length).toBeGreaterThan(0);
      expect(doc.confirm.terms.length).toBeGreaterThan(0);
      expect(doc.confirm).not.toHaveProperty("agreeSuffix");
    }
  });

  it("keeps legal terms linked", () => {
    const terms = read("client/src/pages/terms.tsx");
    expect(terms).toContain('t("terms.s66")');
    expect(terms).toContain('t("terms.s67")');
    expect(terms).toContain('t("terms.s68")');
  });
});

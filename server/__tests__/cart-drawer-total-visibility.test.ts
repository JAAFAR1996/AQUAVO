import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("cart drawer total visibility", () => {
  it("shows a complete estimated payable amount using the configured delivery fee", () => {
    const navbar = read("client/src/components/navbar.tsx");
    expect(navbar).toContain("const shippingFee = useShippingFee()");
    expect(navbar).toContain('{t("cart.subtotal")}');
    expect(navbar).toContain('{t("cart.shipping")}');
    expect(navbar).toContain('{t("cart.estimatedTotal")}');
    expect(navbar).toContain("price(totalPrice + shippingFee)");
    expect(navbar).toContain('onClick={() => {\n                            setIsCartOpen(false);\n                            setLocation("/checkout");');
  });

  it("offers labels in Arabic, English and Kurdish, without promising post-discount totals", () => {
    for (const locale of ["ar", "en", "ckb"]) {
      const nav = JSON.parse(read(`client/src/locales/${locale}/nav.json`));
      for (const key of ["subtotal", "shipping", "estimatedTotal"]) {
        expect(nav.cart[key]).toBeTruthy();
      }
    }
    const ar = JSON.parse(read("client/src/locales/ar/nav.json"));
    expect(ar.cart.estimatedTotal).toContain("قبل الخصومات");
  });
});

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read=(path:string)=>readFileSync(resolve(process.cwd(),path),"utf8");

describe("checkout WhatsApp consent contract",()=>{
  it("uses the existing terms checkbox as the single consent control",()=>{
    const view=read("client/src/components/cart/checkout/confirmation-view.tsx");
    expect(view).toContain('id="agree"');
    expect(view).toContain("setAgreed(accepted)");
    expect(view).toContain("setWhatsappMarketingOptIn(accepted)");
    expect(view).not.toContain("setWhatsappMarketingOptIn(false)");
    expect(view).not.toContain('id="whatsapp-marketing-opt-in"');
  });

  it("keeps WhatsApp disclosure in the terms while the single checkbox records acceptance",()=>{
    const ar=read("client/src/locales/ar/checkout.json");
    const en=read("client/src/locales/en/checkout.json");
    const ckb=read("client/src/locales/ckb/checkout.json");
    expect(ar).toContain("الشروط والأحكام");
    expect(en).toContain("terms");
    expect(JSON.parse(ar).confirm.agreeSuffix).not.toMatch(/واتساب|العروض/);
    expect(JSON.parse(en).confirm.agreeSuffix).not.toMatch(/WhatsApp|offers/i);
    expect(JSON.parse(ckb).confirm.agreeSuffix).not.toMatch(/واتسئاپ|پێشنیار/);
    expect(ckb).toContain("AQUAVO");
    expect(view).toContain("setWhatsappMarketingOptIn(accepted)");
  });

  it("keeps WhatsApp communication terms inside the terms page",()=>{
    const terms=read("client/src/pages/terms.tsx");
    expect(terms).toContain('t("terms.s66")');
    expect(terms).toContain('t("terms.s67")');
    expect(terms).toContain('t("terms.s68")');
  });
});

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
    expect(view).not.toContain('id="whatsapp-marketing-opt-in"');
  });

  it("makes the single checkbox itself explicit about AQUAVO WhatsApp messages",()=>{
    const ar=read("client/src/locales/ar/checkout.json");
    const en=read("client/src/locales/en/checkout.json");
    const ckb=read("client/src/locales/ckb/checkout.json");
    expect(ar).toContain("AQUAVO");
    expect(ar).toContain("واتساب");
    expect(ar).toContain("التذكيرات والعروض");
    expect(en).toContain("AQUAVO may message me on WhatsApp");
    expect(ckb).toContain("AQUAVO");
    expect(ckb).toContain("واتسئاپ");
  });

  it("keeps WhatsApp communication terms inside the terms page",()=>{
    const terms=read("client/src/pages/terms.tsx");
    expect(terms).toContain('t("terms.s66")');
    expect(terms).toContain('t("terms.s67")');
    expect(terms).toContain('t("terms.s68")');
  });
});

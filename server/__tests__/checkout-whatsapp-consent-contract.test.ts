import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read=(path:string)=>readFileSync(resolve(process.cwd(),path),"utf8");

describe("checkout WhatsApp consent contract",()=>{
  it("keeps purchase terms required and marketing consent optional",()=>{
    const view=read("client/src/components/cart/checkout/confirmation-view.tsx");
    expect(view).toContain('id="agree"');
    expect(view).toContain("setAgreed(accepted)");
    expect(view).toContain('id="whatsapp-marketing-opt-in"');
    expect(view).toContain("setWhatsappMarketingOptIn(checked === true)");
    expect(view).not.toContain("setWhatsappMarketingOptIn(accepted)");
  });

  it("does not bundle marketing language into the required terms checkbox",()=>{
    const ar=JSON.parse(read("client/src/locales/ar/checkout.json"));
    const en=JSON.parse(read("client/src/locales/en/checkout.json"));
    const ckb=JSON.parse(read("client/src/locales/ckb/checkout.json"));

    expect(ar.confirm.agreeSuffix).toBe("وأؤكد صحة رقم الهاتف المدخل");
    expect(en.confirm.agreeSuffix).toBe("and confirm my phone number is correct");
    expect(ckb.confirm.agreeSuffix).toBe("و دڵنیایی دەدەم ژمارەی مۆبایلەکە ڕاستە");

    expect(ar.confirm.whatsappOptIn).toContain("واتساب");
    expect(en.confirm.whatsappOptIn).toContain("WhatsApp");
    expect(ckb.confirm.whatsappOptIn).toContain("واتسئاپ");
    expect(ar.confirm.whatsappOptInHint).toContain("اختياري");
  });

  it("keeps WhatsApp communication terms inside the terms page",()=>{
    const terms=read("client/src/pages/terms.tsx");
    expect(terms).toContain('t("terms.s66")');
    expect(terms).toContain('t("terms.s67")');
    expect(terms).toContain('t("terms.s68")');
  });
});

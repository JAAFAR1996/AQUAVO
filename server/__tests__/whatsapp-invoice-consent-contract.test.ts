import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read=(path:string)=>readFileSync(resolve(process.cwd(),path),"utf8");

describe("manual WhatsApp invoice marketing consent",()=>{
  it("collects explicit consent on the customer invoice confirmation surface",()=>{
    const view=read("client/src/pages/invoice-view.tsx");
    const ar=JSON.parse(read("client/src/locales/ar/orders.json"));
    expect(view).toContain("whatsappMarketingOptIn: true");
    expect(view).toContain('invoice-view.s42');
    expect(ar["invoice-view"].s42).toContain("AQUAVO");
    expect(ar["invoice-view"].s42).toContain("واتساب");
    expect(ar["invoice-view"].s42).toContain("عروض");
  });

  it("persists the consent on the WhatsApp order before projecting it to CRM",()=>{
    const route=read("server/routes/invoice-v2.ts");
    expect(route).toContain("req.body?.whatsappMarketingOptIn === true");
    expect(route).toContain("whatsappMarketingOptIn,");
    expect(route).toContain("whatsappMarketingOptInAt: whatsappMarketingOptIn ? snapshotAt : undefined");
    expect(route).toContain("recordWhatsAppInvoiceMarketingOptIn(outcome.orderId)");
  });

  it("records WhatsApp invoice consent with the real source instead of labelling it checkout",()=>{
    const lifecycle=read("server/services/whatsapp-lifecycle.ts");
    expect(lifecycle).toContain('recordOrderWhatsAppMarketingOptIn(orderIdInput, "checkout")');
    expect(lifecycle).toContain('recordOrderWhatsAppMarketingOptIn(orderIdInput, "whatsapp")');
    expect(lifecycle).toContain("whatsapp_marketing_consent_source=CASE");
    expect(lifecycle).toContain("'delivery_care_and_replenishment'");
    expect(lifecycle).toContain("CASE WHEN o.source='whatsapp' THEN 'whatsapp' ELSE 'checkout' END AS consent_source");
    expect(lifecycle).toContain('consentSource === "whatsapp"');
  });
});

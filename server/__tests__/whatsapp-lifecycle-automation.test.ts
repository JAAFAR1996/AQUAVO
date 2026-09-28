import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { classifyLifecycleConsentCommand } from "../services/whatsapp-lifecycle-automation.js";

const read=(path:string)=>readFileSync(path,"utf8");

describe("WhatsApp lifecycle automation",()=>{
  it("recognizes only explicit lifecycle opt-in and opt-out commands",()=>{
    for(const command of ["إيقاف","ايقاف","وقف","إلغاء","STOP","unsubscribe","وەستاندن"]){
      expect(classifyLifecycleConsentCommand(command)).toBe("opt_out");
    }
    for(const command of ["اشتراك","تفعيل","ابدأ","START","subscribe","دەستپێکردن"]){
      expect(classifyLifecycleConsentCommand(command)).toBe("opt_in");
    }
    for(const text of ["ما اريد هذا المنتج","ممكن توقف الطلب؟","شكراً","عندي مشكلة","stop please"]){
      expect(classifyLifecycleConsentCommand(text)).toBeNull();
    }
  });

  it("captures consent separately from required checkout terms and defaults it off",()=>{
    const checkout=read("client/src/pages/checkout.tsx");
    const confirmation=read("client/src/components/cart/checkout/confirmation-view.tsx");
    expect(checkout).toContain("useState(false)");
    expect(checkout).toContain("whatsappFollowupOptIn: testMode ? false : whatsappFollowupOptIn");
    expect(confirmation).toContain('id="whatsapp-followup-opt-in"');
    expect(confirmation).toContain('id="agree"');
    expect(confirmation).toContain("showWhatsAppFollowupConsent");
  });

  it("requires approved templates and an activation boundary before automatic sends",()=>{
    const service=read("server/services/whatsapp-lifecycle-automation.ts");
    expect(service).toContain("WHATSAPP_LIFECYCLE_AUTOMATION_ENABLED");
    expect(service).toContain("WHATSAPP_LIFECYCLE_TEMPLATES_APPROVED");
    expect(service).toContain("WHATSAPP_LIFECYCLE_ACTIVATION_AT");
    expect(service).toContain("WHATSAPP_DAY7_TEMPLATE");
    expect(service).toContain("WHATSAPP_REPURCHASE_TEMPLATE");
    expect(service).toContain("created_at <");
  });

  it("uses a conservative Iraq-local send window and replenishment frequency cap",()=>{
    const service=read("server/services/whatsapp-lifecycle-automation.ts");
    expect(service).toContain('timeZone: "Asia/Baghdad"');
    expect(service).toContain("WHATSAPP_LIFECYCLE_SEND_START_HOUR");
    expect(service).toContain("WHATSAPP_LIFECYCLE_SEND_END_HOUR");
    expect(service).toContain("interval '30 days'");
    expect(service).toContain("frequencyCapDays");
  });

  it("never blindly retries an ambiguous provider send",()=>{
    const service=read("server/services/whatsapp-lifecycle-automation.ts");
    expect(service).toContain("WHATSAPP_LIFECYCLE_TIMEOUT_AMBIGUOUS");
    expect(service).toContain("WHATSAPP_LIFECYCLE_NETWORK_AMBIGUOUS");
    expect(service).toContain("WHATSAPP_LIFECYCLE_ACCEPTANCE_AMBIGUOUS");
    expect(service).toContain("response.status === 429 || response.status >= 500");
    expect(service).toContain("MAX_SEND_ATTEMPTS = 5");
  });

  it("honors opt-out from the signed WhatsApp webhook",()=>{
    const webhook=read("server/routes/whatsapp-webhook.ts");
    const service=read("server/services/whatsapp-lifecycle-automation.ts");
    expect(webhook).toContain("extractLifecycleConsentTextEvents");
    expect(webhook).toContain("handleLifecycleConsentInbound");
    expect(service).toContain("'customer_opt_out'");
    expect(service).toContain("whatsapp_marketing_opt_in=false");
    expect(service).toContain("status IN ('planned','ready')");
  });

  it("routes only consented lifecycle work to automatic WhatsApp",()=>{
    const growth=read("server/services/growth-operating-system.ts");
    expect(growth).toContain("cp.whatsapp_followup_opt_in=true");
    expect(growth).toContain("cp.whatsapp_marketing_opt_in=true");
    expect(growth).toContain("'utility','followup'");
    expect(growth).toContain("'marketing','marketing'");
    expect(growth).toContain("delivery_issue");
  });

  it("keeps provider lifecycle status durable across webhook races",()=>{
    const provider=read("server/services/whatsapp-provider-status.ts");
    const service=read("server/services/whatsapp-lifecycle-automation.ts");
    expect(provider).toContain("public.customer_lifecycle_jobs");
    expect(service).toContain("reconcileWhatsAppProviderEvents(providerMessageId)");
    expect(service).toContain("provider_message_id");
  });

  it("runs from the already protected five-minute customer messaging worker",()=>{
    const cron=read("server/routes/cron.ts");
    expect(cron).toContain('router.get("/customer-messaging"');
    expect(cron).toContain("runDueLifecycleWhatsAppJobs(5)");
    expect(cron).toContain("lifecycleFailed");
  });

  it("adds reversible DB state for consent and at-most-once provider state",()=>{
    const migration=read("migrations/0093_whatsapp_lifecycle_automation.sql");
    const rollback=read("migrations/0093_whatsapp_lifecycle_automation_rollback.sql");
    for(const token of [
      "whatsapp_followup_opt_in",
      "whatsapp_marketing_opt_in",
      "whatsapp_followup_opt_out_at",
      "provider_message_id",
      "attempt_count",
      "whatsapp_lifecycle_consent_events",
    ]){
      expect(migration).toContain(token);
      expect(rollback).toContain(token);
    }
    expect(migration).toContain("whatsapp_lifecycle_consent_checkout_uq");
  });
});

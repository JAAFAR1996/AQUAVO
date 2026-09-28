import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read=(path:string)=>readFileSync(path,"utf8");

describe("automatic WhatsApp lifecycle contract",()=>{
  it("keeps service and marketing as separate approved-template paths",()=>{
    const env=read(".env.example");
    const service=read("server/services/whatsapp-lifecycle.ts");
    expect(env).toContain("WHATSAPP_DAY7_CARE_TEMPLATE=aquavo_day7_care_v1");
    expect(env).toContain("WHATSAPP_REPURCHASE_TEMPLATE=aquavo_repurchase_reminder_v1");
    expect(env).toContain("category: UTILITY");
    expect(env).toContain("category: MARKETING");
    expect(service).toContain("context.jobType === \"day7_care\"");
    expect(service).toContain("context.marketingOptIn");
  });

  it("captures optional explicit checkout marketing consent",()=>{
    const checkout=read("client/src/components/cart/checkout/confirmation-view.tsx");
    const orderRoute=read("server/routes/orders.ts");
    const wayl=read("server/routes/wayl.ts");
    const migration=read("migrations/0093_whatsapp_lifecycle_automation.sql");
    expect(checkout).toContain('id="whatsapp-marketing-opt-in"');
    expect(checkout).toContain("whatsappMarketingOptIn");
    expect(orderRoute).toContain("whatsappMarketingOptIn");
    expect(wayl).toContain("whatsappMarketingOptIn");
    expect(migration).toContain("customer_messaging_consent_events");
    expect(migration).toContain("marketing_opt_in");
  });

  it("never treats an unchecked box as opt-out",()=>{
    const service=read("server/services/whatsapp-lifecycle.ts");
    const orders=read("server/routes/orders.ts");
    expect(orders).toContain("if (whatsappMarketingOptIn)");
    expect(service).toContain("recordCheckoutWhatsAppMarketingOptIn");
    expect(service).toContain("whatsapp_marketing_opt_out_at");
    expect(service).not.toContain("whatsapp_marketing_opt_in=false,\n             whatsapp_marketing_opt_out_at=clock_timestamp()");
  });

  it("repairs post-commit consent persistence without blocking commerce",()=>{
    const service=read("server/services/whatsapp-lifecycle.ts");
    const growth=read("server/services/growth-operating-system.ts");
    expect(service).toContain("syncCheckoutWhatsAppMarketingConsents");
    expect(service).toContain("customer_messaging_consent_events");
    expect(service).toContain("source_event_id='order:' || o.id");
    expect(growth).toContain("syncCheckoutWhatsAppMarketingConsents()");
  });

  it("learns replenishment cadence only from enough realized repeat-consumable evidence",()=>{
    const growth=read("server/services/growth-operating-system.ts");
    expect(growth).toContain("refreshObservedRepurchaseProfiles");
    expect(growth).toContain("percentile_cont(0.5)");
    expect(growth).toContain("COUNT(*)>=4");
    expect(growth).toContain("COUNT(DISTINCT customer_phone)>=2");
    expect(growth).toContain("base.is_consumable=true");
    expect(growth).toContain("purchase_day-prior_day BETWEEN 7 AND 180");
  });

  it("does not remind a later-due consumable at the earliest product window",()=>{
    const growth=read("server/services/growth-operating-system.ts");
    expect(growth).toContain("repurchase_candidates AS");
    expect(growth).toContain("repurchase_target AS");
    expect(growth).toContain("c.interval_target_days=t.target_days");
  });

  it("enforces anti-spam and replenishment suppression controls",()=>{
    const service=read("server/services/whatsapp-lifecycle.ts");
    expect(service).toContain("MARKETING_FREQUENCY_CAP_DAYS = 30");
    expect(service).toContain("ALREADY_REPLENISHED");
    expect(service).toContain("RECOMMENDED_PRODUCT_UNAVAILABLE");
    expect(service).toContain("SUPPORT_ISSUE_OPEN");
    expect(service).toContain("MARKETING_OPT_IN_REQUIRED");
    expect(service).toContain("isBaghdadLifecycleSendWindow");
    expect(service).toContain("total >= 10 * 60");
    expect(service).toContain("total <= 19 * 60 + 30");
  });

  it("uses bounded safe retry and never blindly retries ambiguous transport",()=>{
    const service=read("server/services/whatsapp-lifecycle.ts");
    expect(service).toContain("WHATSAPP_TIMEOUT_AMBIGUOUS");
    expect(service).toContain("WHATSAPP_NETWORK_AMBIGUOUS");
    expect(service).toContain("throw new LifecycleSendError(code, false)");
    expect(service).toContain("attempt.response.status === 429 || attempt.response.status >= 500");
    expect(service).toContain("MAX_ATTEMPTS = 5");
  });

  it("routes lifecycle quick replies separately and supports durable race recovery",()=>{
    const webhook=read("server/routes/whatsapp-webhook.ts");
    const migration=read("migrations/0093_whatsapp_lifecycle_automation.sql");
    const service=read("server/services/whatsapp-lifecycle.ts");
    expect(webhook).toContain("handleLifecycleReply");
    expect(webhook).toContain("recordPendingLifecycleReply");
    expect(migration).toContain("whatsapp_lifecycle_reply_events");
    expect(service).toContain("repurchase_stop");
    expect(service).toContain("MARKETING_OPTED_OUT");
  });

  it("surfaces help and repurchase-interest replies for human follow-up",()=>{
    const lifecycle=read("server/services/whatsapp-lifecycle.ts");
    const growth=read("server/services/growth-operating-system.ts");
    const dashboard=read("client/src/components/admin/business-intelligence-dashboard.tsx");
    expect(lifecycle).toContain("AQUAVO — رد يحتاج متابعة");
    expect(lifecycle).toContain("sendTelegramMessage");
    expect(growth).toContain("repurchase_interest");
    expect(growth).toContain("day7_help");
    expect(growth).toContain("reply_handled_at");
    expect(dashboard).toContain("ردود زبائن تحتاج متابعة");
  });

  it("runs from the protected five-minute messaging worker",()=>{
    const cron=read("server/routes/cron.ts");
    expect(cron).toContain("runDueLifecycleWhatsAppJobs(5)");
    expect(cron).toContain("reconcilePendingLifecycleReplies(25)");
    expect(cron).toContain("cleanupLifecycleReplyInbox(500)");
  });

  it("stores provider lifecycle for both immediate and Growth OS sends",()=>{
    const status=read("server/services/whatsapp-provider-status.ts");
    expect(status).toContain("public.customer_message_jobs");
    expect(status).toContain("public.customer_lifecycle_jobs");
    expect(status).toContain("provider_status_at");
  });

  it("creates automatic Growth OS jobs at deliberate Baghdad daytime times",()=>{
    const growth=read("server/services/growth-operating-system.ts");
    expect(growth).toContain("'planned','whatsapp'");
    expect(growth).toContain("time '11:30'");
    expect(growth).toContain("time '12:30'");
    expect(growth).toContain("AT TIME ZONE 'Asia/Baghdad'");
  });
});

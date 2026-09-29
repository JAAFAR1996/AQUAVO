import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read=(path:string)=>readFileSync(path,"utf8");

describe("automatic WhatsApp lifecycle contract",()=>{
  it("keeps service and marketing as separate approved-template paths",()=>{
    const env=read(".env.example");
    const service=read("server/services/whatsapp-lifecycle.ts");
    expect(env).toContain("WHATSAPP_DAY7_CARE_TEMPLATE=aquavo_day7_care_v1");
    expect(env).toContain("WHATSAPP_REPURCHASE_TEMPLATE=aquavo_repurchase_reminder_v1");
    expect(env.toLowerCase()).toContain("category: utility");
    expect(env.toLowerCase()).toContain("category: marketing");
    expect(service).toContain("context.jobType === \"day7_care\"");
    expect(service).toContain("context.marketingOptIn");
  });

  it("captures optional explicit checkout marketing consent",()=>{
    const checkout=read("client/src/components/cart/checkout/confirmation-view.tsx");
    const orderRoute=read("server/routes/orders.ts");
    const wayl=read("server/routes/wayl.ts");
    const migration=read("migrations/0093_whatsapp_lifecycle_automation.sql");
    expect(checkout).not.toContain('id="whatsapp-marketing-opt-in"');
    expect(checkout).toContain("whatsappMarketingOptIn");
    expect(orderRoute).toContain("whatsappMarketingOptIn");
    expect(wayl).toContain("whatsappMarketingOptIn");
    expect(wayl).toContain("whatsappMarketingOptIn: parsed.data.whatsappMarketingOptIn");
    expect(migration).toContain("customer_messaging_consent_events");
    expect(migration).toContain("marketing_opt_in");
  });

  it("never treats an unchecked box as opt-out",()=>{
    const service=read("server/services/whatsapp-lifecycle.ts");
    const orders=read("server/routes/orders.ts");
    expect(orders).toContain("if ((order as any).whatsappMarketingOptIn)");
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
    expect(growth).toContain("candidate.is_consumable=true");
    expect(growth).toContain("purchase_day-prior_day BETWEEN 7 AND 365");
  });

  it("keeps observed repurchase learning disabled by default",()=>{
    const growth=read("server/services/growth-operating-system.ts");
    const env=read(".env.example");
    expect(growth).toContain("GROWTH_REPURCHASE_OBSERVED_LEARNING_ENABLED");
    expect(growth).toContain('mode: "rule_only"');
    expect(env).toContain("GROWTH_REPURCHASE_OBSERVED_LEARNING_ENABLED=false");
  });

  it("makes replenishment timing variant and purchased-quantity aware",()=>{
    const growth=read("server/services/growth-operating-system.ts");
    expect(growth).toContain("parseRepurchasePackMeasure");
    expect(growth).toContain("variant_id");
    expect(growth).toContain("purchased_quantity");
    expect(growth).toContain("normalized_gap_days");
    expect(growth).toContain("prior_quantity");
    expect(growth).toContain("pr.interval_target_days*SUM(GREATEST(1,oi.quantity))");
    expect(growth).toContain("'variantId',g.variant_id");
    expect(growth).toContain("'quantity',g.purchased_quantity");
    expect(growth).toContain("packFactor=");
  });

  it("matches the approved buttonless day-7 and repurchase template shapes",()=>{
    const service=read("server/services/whatsapp-lifecycle.ts");
    expect(service).toContain("bodyParameters = [firstName];");
    expect(service).toContain("bodyParameters = [firstName, productSummary];");
    expect(service).not.toContain('sub_type: "quick_reply"');
    expect(service).not.toContain("buttons: Array<{ index: string; payload: string }>");
  });

  it("accepts verified Wayl orders as financially eligible without pretending COD was received",()=>{
    const lifecycle=read("server/services/whatsapp-lifecycle.ts");
    const growth=read("server/services/growth-operating-system.ts");
    const migration=read("migrations/0095_wayl_delivery_accounting.sql");
    expect(lifecycle).toContain('context.paymentMethod === "wayl"');
    expect(lifecycle).toContain('context.paymentRecordStatus === "completed"');
    expect(growth).toContain("realized_payment.method IN ('wayl','alqaseh')");
    expect(migration).toContain("v_payment_method IN ('alqaseh','wayl')");
    expect(migration).toContain("ONLINE_CAPTURE_EVENT_MISSING_OR_MISMATCH");
    expect(migration).toContain("0095_DEPENDENCY_MISSING");
    expect(migration.indexOf("IF FOUND THEN RETURN v_entry_id; END IF;"))
      .toBeLessThan(migration.indexOf("SELECT method INTO v_payment_method"));
  });

  it("stores checkout consent evidence in the order transaction before CRM projection",()=>{
    const orderStorage=read("server/storage/order-storage.ts");
    const orders=read("server/routes/orders.ts");
    const wayl=read("server/services/wayl-order-payment.ts");
    expect(orderStorage).toContain("whatsappMarketingOptIn: commerceContext.whatsappMarketingOptIn === true");
    expect(orderStorage).toContain("whatsappMarketingOptInAt: commerceContext.whatsappMarketingOptIn === true");
    expect(orders).toContain("whatsappMarketingOptIn,");
    expect(wayl).toContain("whatsappMarketingOptIn: input.whatsappMarketingOptIn === true");
    expect(wayl).toContain("whatsappMarketingOptInAt: input.whatsappMarketingOptIn === true");
  });

  it("groups nearby consumables from one order into one smart reminder",()=>{
    const growth=read("server/services/growth-operating-system.ts");
    const migration=read("migrations/0094_repurchase_per_product_automation.sql");
    expect(growth).toContain("o.interval_target_days-g.bundle_start_days > 15");
    expect(growth).toContain("'bundle:' || b.bundle_no::text");
    expect(growth).toContain("jsonb_agg(to_jsonb(g.product_id)");
    expect(growth).toContain("'bundleWindowDays',15");
    expect(growth).toContain("WITH RECURSIVE runtime AS");
    expect(growth).toContain("smart_grouped_replenishment_12_30_baghdad");
    expect(growth).toContain("ON CONFLICT(order_id,job_type,scope_key)");
    expect(growth).toContain("metadata->>'deferReason'");
    expect(migration).toContain("UNIQUE(order_id,job_type,scope_key)");
  });

  it("keeps a grouped reminder useful when one item was already repurchased or has an active offer",()=>{
    const growth=read("server/services/growth-operating-system.ts");
    const lifecycle=read("server/services/whatsapp-lifecycle.ts");
    expect(growth).toContain("jsonb_array_elements_text(j.recommended_product_ids) WITH ORDINALITY");
    expect(growth).toContain("already_replenished_all");
    expect(lifecycle).toContain("loadRepurchaseProducts");
    expect(lifecycle).toContain("eligibleProducts");
    expect(lifecycle).toContain("public.discounts");
    expect(lifecycle).toContain("buildRepurchaseProductSummary");
    expect(lifecycle).toContain("activeOffers");
  });

  it("uses a durable activation boundary and does not backfill old delivered orders",()=>{
    const growth=read("server/services/growth-operating-system.ts");
    const lifecycle=read("server/services/whatsapp-lifecycle.ts");
    const migration=read("migrations/0094_repurchase_per_product_automation.sql");
    expect(migration).toContain("whatsapp_lifecycle_runtime_config");
    expect(migration).toContain("repurchase_enabled");
    expect(migration).toContain("clock_timestamp()");
    expect(growth).toContain("d.delivered_at >= cfg.activation_at");
    expect(lifecycle).toContain("FROM public.whatsapp_lifecycle_runtime_config");
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
    expect(service).toContain("response.status === 429 || response.status >= 500");
    expect(service).toContain("MAX_ATTEMPTS = 5");
  });

  it("routes lifecycle replies separately and keeps durable legacy race recovery",()=>{
    const webhook=read("server/routes/whatsapp-webhook.ts");
    const migration=read("migrations/0093_whatsapp_lifecycle_automation.sql");
    const service=read("server/services/whatsapp-lifecycle.ts");
    expect(webhook).toContain("handleLifecycleReply");
    expect(webhook).toContain("recordPendingLifecycleReply");
    expect(migration).toContain("whatsapp_lifecycle_reply_events");
    expect(service).toContain("repurchase_stop");
    expect(service).toContain("MARKETING_OPTED_OUT");
  });

  it("lets a later stop request override an earlier repurchase-interest tap",()=>{
    const lifecycle=read("server/services/whatsapp-lifecycle.ts");
    const growth=read("server/services/growth-operating-system.ts");
    expect(lifecycle).toContain("latest_choice");
    expect(lifecycle).toContain("subsequent_choices");
    expect(lifecycle).toContain("Opt-out is terminal");
    expect(lifecycle).toContain("recordWhatsAppMarketingOptOut");
    expect(growth).toContain("metadata->'reply'->>'latest_choice'");
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

  it("requires current WhatsApp consent before Day-7 or repurchase sends",()=>{
    const service=read("server/services/whatsapp-lifecycle.ts");
    expect(service).toContain("WHATSAPP_OPT_IN_REQUIRED");
    expect(service).toContain("MARKETING_OPT_IN_REQUIRED");
    expect(service).toContain("day7_care','repurchase");
  });

  it("matches the approved buttonless lifecycle template shapes",()=>{
    const service=read("server/services/whatsapp-lifecycle.ts");
    const env=read(".env.example");
    expect(service).toContain("bodyParameters = [firstName]");
    expect(service).toContain("bodyParameters = [firstName, productSummary]");
    expect(service).not.toContain('sub_type: "quick_reply"');
    expect(env).toContain("Day-7 service follow-up, category: UTILITY. One variable, no buttons.");
    expect(env).toContain("Two variables, no buttons.");
  });

  it("accepts verified Wayl orders as financially realized lifecycle orders",()=>{
    const lifecycle=read("server/services/whatsapp-lifecycle.ts");
    const growth=read("server/services/growth-operating-system.ts");
    const migration=read("migrations/0095_wayl_delivery_accounting.sql");
    expect(lifecycle).toContain('context.paymentMethod === "wayl"');
    expect(lifecycle).toContain('context.paymentRecordStatus === "completed"');
    expect(growth).toContain("realized_payment.method IN ('wayl','alqaseh')");
    expect(migration).toContain("v_payment_method IN ('alqaseh','wayl')");
    expect(migration).toContain("ONLINE_CAPTURE_EVENT_MISSING_OR_MISMATCH");
  });

  it("persists checkout consent inside the order transaction before CRM projection",()=>{
    const storage=read("server/storage/order-storage.ts");
    const wayl=read("server/services/wayl-order-payment.ts");
    expect(storage).toContain("whatsappMarketingOptIn: commerceContext.whatsappMarketingOptIn === true");
    expect(storage).toContain("whatsappMarketingOptInAt: commerceContext.whatsappMarketingOptIn === true");
    expect(wayl).toContain("whatsappMarketingOptIn: input.whatsappMarketingOptIn === true");
    expect(wayl).toContain("whatsappMarketingOptInAt: input.whatsappMarketingOptIn === true");
  });

  it("treats recent non-positive free-text service replies as open support issues",()=>{
    const lifecycle=read("server/services/whatsapp-lifecycle.ts");
    const textReplies=read("server/services/whatsapp-customer-text-replies.ts");
    expect(lifecycle).toContain("FROM public.whatsapp_customer_text_events txt");
    expect(lifecycle).toContain("txt.matched_job_type IN ('delivery_care','day7_care')");
    expect(lifecycle).toContain("interval '14 days'");
    expect(lifecycle).toContain("SUPPORT_ISSUE_OPEN");
    expect(textReplies).toContain('"لا أريد رسائل"');
    expect(textReplies).toContain('"إيقاف الرسائل"');
  });

  it("uses durable order consent if the customer-profile projection is temporarily behind",()=>{
    const lifecycle=read("server/services/whatsapp-lifecycle.ts");
    const immediate=read("server/services/customer-messaging.ts");
    expect(lifecycle).toContain("o.whatsapp_marketing_opt_in=true");
    expect(lifecycle).toContain("o.whatsapp_marketing_opt_in_at > cp.whatsapp_marketing_opt_out_at");
    expect(immediate).toContain("o.whatsapp_marketing_opt_in=true");
    expect(immediate).toContain("o.whatsapp_marketing_opt_in_at > cp.whatsapp_marketing_opt_out_at");
  });

  it("also gates lifecycle sends in-process when DB migrations lag deployment",()=>{
    const service=read("server/services/whatsapp-lifecycle.ts");
    const env=read(".env.example");
    expect(service).toContain("WHATSAPP_DAY7_TEMPLATE_APPROVED");
    expect(service).toContain("WHATSAPP_REPURCHASE_TEMPLATE_APPROVED");
    expect(service).toContain("const day7Enabled = day7ProviderApproved");
    expect(service).toContain("const repurchaseEnabled = repurchaseProviderApproved");
    expect(env).toContain("WHATSAPP_DAY7_TEMPLATE_APPROVED=false");
    expect(env).toContain("WHATSAPP_REPURCHASE_TEMPLATE_APPROVED=false");
  });

  it("keeps unapproved Day-7 and repurchase templates fail closed",()=>{
    const safety=read("migrations/0097_whatsapp_lifecycle_fail_closed.sql");
    expect(safety).toContain("lifecycle_enabled=false");
    expect(safety).toContain("day7_enabled=false");
    expect(safety).toContain("repurchase_enabled=false");
    expect(safety).toContain("activation_at=NULL");
    expect(safety).toContain("0097_DEPENDENCY_MISSING");
    expect(safety).toContain("Approved/Active");
  });

  it("ships a manual guarded production runner for 0095-0097",()=>{
    const runner=read("script/apply-0095-0097-whatsapp-lifecycle.ts");
    const workflow=read(".github/workflows/whatsapp-lifecycle-production-migrate.yml");
    const pkg=read("package.json");
    expect(runner).toContain("APPLY_WHATSAPP_LIFECYCLE_0095_0097");
    expect(runner).toContain("0095_wayl_delivery_accounting");
    expect(runner).toContain("0096_whatsapp_customer_text_replies");
    expect(runner).toContain("0097_whatsapp_lifecycle_fail_closed");
    expect(runner).toContain("pg_advisory_lock");
    expect(runner).toContain("runner-verified file sha256");
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).not.toContain("push:");
    expect(workflow).toContain("environment: production");
    expect(workflow).toContain("CONFIRM_WHATSAPP_LIFECYCLE_0095_0097");
    expect(pkg).toContain('"migrate:0095-0097"');
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

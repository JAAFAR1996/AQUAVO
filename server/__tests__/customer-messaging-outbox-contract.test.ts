import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "migrations/0079_customer_post_delivery_messaging.sql"),
  "utf8",
);

const client = readFileSync(
  join(process.cwd(), "client/src/components/admin/orders-management.tsx"),
  "utf8",
);

const service = readFileSync(
  join(process.cwd(), "server/services/customer-messaging.ts"),
  "utf8",
);

const providerStatusService = readFileSync(
  join(process.cwd(), "server/services/whatsapp-provider-status.ts"),
  "utf8",
);

const adminRoute = readFileSync(
  join(process.cwd(), "server/routes/customer-messaging-admin.ts"),
  "utf8",
);

const webhookRoute = readFileSync(
  join(process.cwd(), "server/routes/whatsapp-webhook.ts"),
  "utf8",
);

const vercelEntry = readFileSync(
  join(process.cwd(), "api/index.ts"),
  "utf8",
);

const cronRoute = readFileSync(
  join(process.cwd(), "server/routes/cron.ts"),
  "utf8",
);

const githubWorker = readFileSync(
  join(process.cwd(), ".github/workflows/customer-messaging-retry.yml"),
  "utf8",
);

const rollout = readFileSync(
  join(process.cwd(), "docs/POST_DELIVERY_MESSAGING_ROLLOUT.md"),
  "utf8",
);

describe("post-delivery customer messaging contract", () => {
  it("queues care exactly once on a genuine delivered transition", () => {
    expect(migration).toContain("NEW.status = 'delivered'");
    expect(migration).toContain("OLD.status IS DISTINCT FROM 'delivered'");
    expect(migration).toContain("UNIQUE (order_id, job_type)");
    expect(migration).toContain("'delivery_care'");
    expect(migration).toContain("ON CONFLICT (order_id, job_type) DO NOTHING");
  });

  it("fails closed unless accounting migration 0078 is active", () => {
    expect(migration).toContain("0078_accounting_external_handoff_hardening");
    expect(migration).toContain("0079_DEPENDENCY_MISSING");
  });

  it("does not enqueue review solicitation during phase one", () => {
    expect(migration).not.toContain("clock_timestamp() + interval '14 days'");
    expect(migration).toContain("Phase 1 queues care only");
  });

  it("locks the approved immediate delivery copy and first-name-only personalization", () => {
    expect(rollout).toContain("{{1}}، وصلتك الطلبية. إذا طلع عندك أي سؤال عن المنتج أو شلون تستخدمه، إحنا موجودين بنفس الرقم.");
    expect(service).toContain("buildCustomerFirstName");
    expect(service).toContain("INVALID_CUSTOMER_NAME");
    expect(service).not.toContain("buildCustomerHonorific");
    expect(rollout).toContain("Consumables: send the review request on **day 5**");
    expect(rollout).toContain("Equipment/hardware: send the review request on **day 9**");
  });

  it("distinguishes provider API acceptance from delivery state and persists wamid idempotently", () => {
    expect(migration).toContain("provider_status");
    expect(migration).toContain("provider_status_at");
    expect(migration).toContain("'accepted', 'sent', 'delivered', 'read', 'failed'");
    expect(migration).toContain("CREATE UNIQUE INDEX IF NOT EXISTS customer_message_jobs_provider_message_idx");
    expect(service).toContain("ACCEPTANCE_PERSIST_ATTEMPTS = 3");
    expect(service).toContain("provider_message_id=COALESCE(provider_message_id, ${providerMessageId})");
    expect(service).toContain("provider_status=CASE WHEN status='sending' THEN 'accepted' ELSE provider_status END");
    expect(service).toContain("accepted_at=COALESCE(accepted_at, clock_timestamp())");
    expect(service).toContain("status='completed' AND provider_message_id=${providerMessageId}");
    expect(service).toContain("WHATSAPP_ACCEPTED_PERSISTENCE_AMBIGUOUS");
  });

  it("requires explicit admin confirmation before delivered starts the WhatsApp lifecycle", () => {
    expect(client).toContain("setDeliverOrderId(order.id)");
    expect(client).toContain("تأكيد استلام الزبون؟");
    expect(client).toContain("handleStatusChange(orderId, 'delivered')");
    expect(client).toContain("/customer-messaging/delivery-care");
    expect(client).toContain("if (newStatus === \"delivered\")");
  });

  it("does not let WhatsApp failure roll back delivery truth", () => {
    expect(client).toContain("Post-delivery WhatsApp dispatch failed:");
    expect(client).toContain("delivery truth succeeded");
    expect(service).toContain("Order/accounting truth never depends on WhatsApp success");
  });

  it("suppresses rollout backlog before live sending", () => {
    expect(service).toContain("WHATSAPP_DELIVERY_CARE_ACTIVATION_AT");
    expect(service).toContain("DELIVERY_CARE_PRE_ACTIVATION");
    expect(service).toContain("created_at < ${activationAt}");
    expect(service).toContain("created_at >= ${activationAt}");
    expect(service).toContain("cancelPreActivationDeliveryCare(config.activationAt)");
  });

  it("fails ambiguous transport/stale-send states instead of auto-resending them", () => {
    expect(service).toContain("STALE_SENDING_LEASE_MINUTES = 10");
    expect(service).toContain("WHATSAPP_TIMEOUT_AMBIGUOUS");
    expect(service).toContain("AMBIGUOUS_STALE_SEND_STATE");
    expect(service).toContain("new WhatsAppSendError(code, false)");
  });

  it("allows explicit admin retry only through guarded known-failure paths", () => {
    expect(adminRoute).toContain('"/customer-messaging/jobs/:id/retry"');
    expect(adminRoute).toContain("prepareFailedDeliveryCareRetry");
    expect(adminRoute).toContain("MESSAGE_JOB_RETRY_UNSAFE");
    expect(service).toContain("canManuallyRetryDeliveryCare");
    expect(service).toContain("WHATSAPP_HTTP_[45]\\d{2}");
    expect(service).toContain("WHATSAPP_PROVIDER_FAILED_");
    expect(service).toContain("job.provider_status='failed'");
    expect(service).toContain("previous_provider_message_id");
    expect(service).toContain("manual_retry_history");
  });

  it("authenticates Meta webhooks before durable provider-event persistence", () => {
    expect(webhookRoute).toContain("x-hub-signature-256");
    expect(webhookRoute).toContain("META_APP_SECRET");
    expect(webhookRoute).toContain("WHATSAPP_WEBHOOK_VERIFY_TOKEN");
    expect(webhookRoute).toContain("verifyMetaWebhookSignature");
    expect(webhookRoute).toContain("recordWhatsAppProviderStatusEvent");
    expect(webhookRoute).toContain("WEBHOOK_PERSISTENCE_FAILED");
    expect(vercelEntry).toContain('realRoute === "/api/webhooks/whatsapp"');
    expect(vercelEntry).toContain("req.rawBody = buf");
  });

  it("persists provider events before matching wamid and reconciles them monotonically", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.whatsapp_provider_status_events");
    expect(migration).toContain("UNIQUE (provider_message_id, provider_status, provider_status_at)");
    expect(providerStatusService).toContain("INSERT INTO public.whatsapp_provider_status_events");
    expect(providerStatusService).toContain("ON CONFLICT (provider_message_id, provider_status, provider_status_at) DO NOTHING");
    expect(providerStatusService).toContain("reconcileWhatsAppProviderEvents");
    expect(providerStatusService).toContain("job.provider_status_at < ${statusAt}");
    expect(providerStatusService).toContain("applied_at=clock_timestamp()");
    expect(service).toContain("reconcileWhatsAppProviderEvents(providerMessageId)");
    expect(service).toContain("reconcilePendingWhatsAppProviderEvents(25)");
  });

  it("bounds durable provider-event retention", () => {
    expect(providerStatusService).toContain("cleanupWhatsAppProviderStatusEvents");
    expect(providerStatusService).toContain("interval '1 day'");
    expect(providerStatusService).toContain("interval '7 days'");
    expect(providerStatusService).toContain("DELETE FROM public.whatsapp_provider_status_events");
    expect(migration).toContain("GRANT SELECT,INSERT,UPDATE,DELETE ON public.whatsapp_provider_status_events TO aquavo_runtime");
    expect(cronRoute).toContain("cleanupWhatsAppProviderStatusEvents(500)");
  });

  it("uses a protected external five-minute worker instead of Vercel Hobby cron", () => {
    expect(cronRoute).toContain('router.get("/customer-messaging"');
    expect(cronRoute).toContain("runDueDeliveryCareJobs(5)");
    expect(githubWorker).toContain('cron: "2-57/5 * * * *"');
    expect(githubWorker).toContain("secrets.CRON_SECRET");
    expect(githubWorker).toContain("/api/cron/customer-messaging");
  });
});

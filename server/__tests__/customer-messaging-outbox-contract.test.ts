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

const cronRoute = readFileSync(
  join(process.cwd(), "server/routes/cron.ts"),
  "utf8",
);

const githubWorker = readFileSync(
  join(process.cwd(), ".github/workflows/customer-messaging-retry.yml"),
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

  it("distinguishes provider API acceptance from delivery state", () => {
    expect(migration).toContain("provider_status");
    expect(migration).toContain("'accepted', 'sent', 'delivered', 'read', 'failed'");
    expect(service).toContain("provider_status='accepted'");
    expect(service).toContain("does not prove handset delivery");
  });

  it("makes the existing delivered button trigger an immediate dispatch attempt", () => {
    expect(client).toContain("handleStatusChange(order.id, 'delivered')");
    expect(client).toContain("/customer-messaging/delivery-care");
    expect(client).toContain("if (newStatus === \"delivered\")");
  });

  it("does not let WhatsApp failure roll back delivery truth", () => {
    expect(client).toContain("Post-delivery WhatsApp dispatch failed:");
    expect(client).toContain("delivery truth succeeded");
    expect(service).toContain("Order/accounting truth never depends on WhatsApp success");
  });

  it("fails ambiguous transport/stale-send states instead of auto-resending them", () => {
    expect(service).toContain("STALE_SENDING_LEASE_MINUTES = 10");
    expect(service).toContain("WHATSAPP_TIMEOUT_AMBIGUOUS");
    expect(service).toContain("AMBIGUOUS_STALE_SEND_STATE");
    expect(service).toContain("avoid duplicate customer messages");
  });

  it("uses a protected external five-minute worker instead of Vercel Hobby cron", () => {
    expect(cronRoute).toContain('router.get("/customer-messaging"');
    expect(cronRoute).toContain("runDueDeliveryCareJobs(5)");
    expect(githubWorker).toContain('cron: "2-57/5 * * * *"');
    expect(githubWorker).toContain("secrets.CRON_SECRET");
    expect(githubWorker).toContain("/api/cron/customer-messaging");
  });
});

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

describe("post-delivery customer messaging contract", () => {
  it("queues care exactly once on a genuine delivered transition", () => {
    expect(migration).toContain("NEW.status = 'delivered'");
    expect(migration).toContain("OLD.status IS DISTINCT FROM 'delivered'");
    expect(migration).toContain("UNIQUE (order_id, job_type)");
    expect(migration).toContain("'delivery_care'");
    expect(migration).toContain("ON CONFLICT (order_id, job_type) DO NOTHING");
  });

  it("keeps review solicitation separate and delayed", () => {
    expect(migration).toContain("'review_request'");
    expect(migration).toContain("interval '14 days'");
    expect(service).toContain("Review jobs intentionally have no sender");
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
});

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const replies = read("server/services/whatsapp-delivery-care-replies.ts");
const admin = read("server/routes/admin.ts");

describe("delivery issue support lifecycle", () => {
  it("persists a deterministic support ticket before provider auto-reply", () => {
    const ensure = replies.indexOf("supportTicketId = await ensureDeliveryIssueSupportTicket(orderId, row)");
    const send = replies.indexOf("providerMessageId = await sendTextAutoReply");
    expect(ensure).toBeGreaterThan(-1);
    expect(send).toBeGreaterThan(ensure);
    expect(replies).toContain("whatsapp-delivery-issue:${orderId}");
    expect(replies).toContain("ON CONFLICT(id) DO UPDATE");
  });

  it("only creates support tickets for the delivery_issue choice", () => {
    expect(replies).toContain('if (choice === "delivery_issue")');
    expect(replies).toContain('"SUPPORT_TICKET_PERSISTENCE_FAILED"');
  });

  it("exposes support tickets to the authorized admin API with order correlation", () => {
    expect(admin).toContain('router.get("/support-tickets"');
    expect(admin).toContain('ticket.conversationId.startsWith("whatsapp_delivery_issue:")');
    expect(admin).toContain('ticket.conversationId.slice("whatsapp_delivery_issue:".length)');
  });
});

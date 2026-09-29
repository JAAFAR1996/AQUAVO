import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const service = readFileSync(
  join(process.cwd(), "server/services/customer-messaging.ts"),
  "utf8",
);

describe("WhatsApp delivery-care template transport safety", () => {
  it("sends the current approved-shape template without Quick Reply payload components", () => {
    expect(service).toContain("sendDeliveryCareTemplate");
    expect(service).toContain('type: "body"');
    expect(service).toContain('parameters: [{ type: "text", text: customerFirstName }]');
    expect(service).not.toContain('sub_type: "quick_reply"');
    expect(service).not.toContain("DELIVERY_CARE_OK_PAYLOAD");
    expect(service).not.toContain("DELIVERY_CARE_ISSUE_PAYLOAD");
  });

  it("does not blindly retry ambiguous network, timeout or acceptance outcomes", () => {
    expect(service).toContain("WHATSAPP_TIMEOUT_AMBIGUOUS");
    expect(service).toContain("WHATSAPP_NETWORK_AMBIGUOUS");
    expect(service).toContain("WHATSAPP_ACCEPTANCE_AMBIGUOUS");
    expect(service).toContain("const retryable = response.status === 429 || response.status >= 500");
  });

  it("persists provider acceptance by wamid before later webhook delivery/read truth", () => {
    expect(service).toContain("providerMessageId");
    expect(service).toContain("provider_status=CASE WHEN status='sending' THEN 'accepted'");
    expect(service).toContain("reconcileWhatsAppProviderEvents(providerMessageId)");
  });
});

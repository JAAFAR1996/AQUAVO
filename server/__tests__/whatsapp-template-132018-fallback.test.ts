import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const service = readFileSync(
  join(process.cwd(), "server/services/customer-messaging.ts"),
  "utf8",
);

describe("WhatsApp template 132018 recovery", () => {
  it("retries an explicitly rejected template once without Quick Reply payload parameters", () => {
    expect(service).toContain("includeQuickReplyPayloads");
    expect(service).toContain("attempt.response.status === 400");
    expect(service).toContain("Number(attempt.body.error?.code) === 132018");
    expect(service).toContain("attempt = await requestTemplate(false)");
  });

  it("preserves the normal Quick Reply payload path first", () => {
    expect(service).toContain("let attempt = await requestTemplate(true)");
    expect(service).toContain('sub_type: "quick_reply"');
    expect(service).toContain("DELIVERY_CARE_OK_PAYLOAD");
    expect(service).toContain("DELIVERY_CARE_ISSUE_PAYLOAD");
  });

  it("does not classify the explicit 132018 fallback as a blind transport retry", () => {
    expect(service).toContain("HTTP 400");
    expect(service).toContain("safe from duplicate delivery");
    expect(service).toContain("WHATSAPP_TIMEOUT_AMBIGUOUS");
    expect(service).toContain("WHATSAPP_NETWORK_AMBIGUOUS");
  });
});

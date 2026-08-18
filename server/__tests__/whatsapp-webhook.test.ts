import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  extractWhatsAppStatusEvents,
  verifyMetaWebhookSignature,
} from "../routes/whatsapp-webhook.js";

describe("WhatsApp webhook security and payload parsing", () => {
  it("accepts only a valid sha256 signature over the exact raw body", () => {
    const secret = "test-meta-app-secret";
    const rawBody = Buffer.from('{"object":"whatsapp_business_account","entry":[]}', "utf8");
    const signature = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;

    expect(verifyMetaWebhookSignature(rawBody, signature, secret)).toBe(true);
    expect(verifyMetaWebhookSignature(Buffer.from("{}"), signature, secret)).toBe(false);
    expect(verifyMetaWebhookSignature(rawBody, "sha256=deadbeef", secret)).toBe(false);
    expect(verifyMetaWebhookSignature(rawBody, undefined, secret)).toBe(false);
    expect(verifyMetaWebhookSignature(rawBody, signature, "wrong-secret")).toBe(false);
  });

  it("extracts supported status events and their provider timestamps", () => {
    const events = extractWhatsAppStatusEvents({
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              field: "messages",
              value: {
                statuses: [
                  {
                    id: "wamid.sent",
                    status: "sent",
                    timestamp: "1700000000",
                    recipient_id: "9647000000000",
                  },
                  {
                    id: "wamid.failed",
                    status: "failed",
                    timestamp: "1700000001",
                    errors: [{ code: 131026, title: "not persisted" }],
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    expect(events).toEqual([
      {
        providerMessageId: "wamid.sent",
        status: "sent",
        statusAt: new Date(1700000000 * 1000),
        errorCode: null,
      },
      {
        providerMessageId: "wamid.failed",
        status: "failed",
        statusAt: new Date(1700000001 * 1000),
        errorCode: "WHATSAPP_PROVIDER_FAILED_131026",
      },
    ]);
  });

  it("ignores incoming messages, deleted/unknown statuses and malformed timestamps", () => {
    const events = extractWhatsAppStatusEvents({
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              field: "messages",
              value: {
                messages: [{ id: "incoming-message", type: "text" }],
                statuses: [
                  { id: "wamid.deleted", status: "deleted", timestamp: "1700000000" },
                  { id: "wamid.bad-time", status: "delivered", timestamp: "not-a-time" },
                  { id: "", status: "read", timestamp: "1700000000" },
                ],
              },
            },
          ],
        },
      ],
    });

    expect(events).toEqual([]);
  });
});

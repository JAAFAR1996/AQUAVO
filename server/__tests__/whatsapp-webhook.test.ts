import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  extractDeliveryCareButtonReplyEvents,
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

  it("extracts a Meta quick-reply button callback and keeps the original wamid", () => {
    const events = extractDeliveryCareButtonReplyEvents({
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              field: "messages",
              value: {
                messages: [
                  {
                    button: {
                      payload: "aquavo_delivery_ok_v1",
                      text: "وصلتني وكلشي تمام",
                    },
                    context: {
                      from: "9647747880673",
                      id: "wamid.original-template",
                    },
                    from: "9647721310937",
                    id: "wamid.customer-button",
                    timestamp: "1700000100",
                    type: "button",
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
        inboundMessageId: "wamid.customer-button",
        contextProviderMessageId: "wamid.original-template",
        fromPhone: "9647721310937",
        receivedAt: new Date(1700000100 * 1000),
        payload: "aquavo_delivery_ok_v1",
        buttonText: "وصلتني وكلشي تمام",
      },
    ]);
  });

  it("ignores ordinary incoming text and malformed button callbacks", () => {
    const events = extractDeliveryCareButtonReplyEvents({
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              field: "messages",
              value: {
                messages: [
                  { id: "incoming-text", type: "text", text: { body: "مرحبا" } },
                  {
                    id: "button-without-context",
                    type: "button",
                    from: "9647721310937",
                    timestamp: "1700000100",
                    button: { payload: "aquavo_delivery_ok_v1", text: "وصلتني وكلشي تمام" },
                  },
                  {
                    id: "button-bad-time",
                    type: "button",
                    from: "9647721310937",
                    timestamp: "bad",
                    context: { id: "wamid.original" },
                    button: { payload: "aquavo_delivery_ok_v1", text: "وصلتني وكلشي تمام" },
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    expect(events).toEqual([]);
  });

  it("ignores deleted/unknown statuses and malformed timestamps", () => {
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

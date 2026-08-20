import { describe, expect, it } from "vitest";
import { summarizeWhatsAppWebhookForDiagnostics } from "../routes/whatsapp-webhook.js";

describe("WhatsApp webhook diagnostics", () => {
  it("summarizes routing shape without customer or provider content", () => {
    const summary = summarizeWhatsAppWebhookForDiagnostics({
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              field: "messages",
              value: {
                messages: [
                  {
                    id: "wamid.customer-sensitive",
                    from: "9647716666543",
                    type: "button",
                    context: { id: "wamid.template-sensitive" },
                    button: {
                      payload: "aquavo_delivery_ok_v1",
                      text: "وصلتني وكلشي تمام",
                    },
                  },
                  {
                    id: "wamid.other-sensitive",
                    from: "9647000000000",
                    type: "text",
                    text: { body: "private message" },
                  },
                ],
                statuses: [
                  {
                    id: "wamid.status-sensitive",
                    status: "read",
                    recipient_id: "9647716666543",
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    expect(summary).toEqual({
      object: "whatsapp_business_account",
      fields: ["messages"],
      messageTypes: ["button", "text"],
      messageCount: 2,
      statusCount: 1,
      contextualMessageCount: 1,
    });

    const serialized = JSON.stringify(summary);
    expect(serialized).not.toContain("9647716666543");
    expect(serialized).not.toContain("wamid.customer-sensitive");
    expect(serialized).not.toContain("aquavo_delivery_ok_v1");
    expect(serialized).not.toContain("وصلتني وكلشي تمام");
    expect(serialized).not.toContain("private message");
  });
});

import { createHmac, timingSafeEqual } from "node:crypto";
import type { Request, Response, Router as RouterType } from "express";
import { Router } from "express";
import { z } from "zod";
import {
  recordPendingDeliveryCareButtonReply,
  recordSubsequentDeliveryCareChoice,
} from "../services/whatsapp-delivery-care-button-inbox.js";
import {
  handleDeliveryCareButtonReply,
  type DeliveryCareButtonReplyEvent,
} from "../services/whatsapp-delivery-care-replies.js";
import {
  recordWhatsAppProviderStatusEvent,
  type WhatsAppProviderStatus,
  type WhatsAppProviderStatusEvent,
} from "../services/whatsapp-provider-status.js";

type RawBodyRequest = Request & { rawBody?: Buffer };

export type WhatsAppStatusEvent = WhatsAppProviderStatusEvent;

const unixTimestampSchema = z.string().regex(/^[1-9]\d{0,12}$/);
const webhookEnvelopeSchema = z.object({
  object: z.literal("whatsapp_business_account"),
  entry: z.array(z.object({
    changes: z.array(z.object({
      field: z.string(),
      value: z.unknown(),
    }).passthrough()),
  }).passthrough()),
}).passthrough();

const providerStatusSchema = z.object({
  id: z.string().trim().min(1).max(500),
  status: z.enum(["sent", "delivered", "read", "failed"]),
  timestamp: unixTimestampSchema,
  errors: z.array(z.object({
    code: z.union([z.number().int(), z.string().regex(/^\d+$/)]).optional(),
  }).passthrough()).optional(),
}).passthrough();

const quickReplyButtonSchema = z.object({
  payload: z.string().max(2048).optional(),
  text: z.string().max(2048).optional(),
}).passthrough().refine(
  (button) => Boolean(button.payload?.trim() || button.text?.trim()),
  "quick reply must contain payload or text",
);

const messageContextSchema = z.object({
  id: z.string().trim().min(1).max(500),
}).passthrough();

const quickReplyMessageSchema = z.object({
  id: z.string().trim().min(1).max(500),
  from: z.string().regex(/^\d{5,20}$/),
  timestamp: unixTimestampSchema,
  type: z.literal("button"),
  context: messageContextSchema,
  button: quickReplyButtonSchema,
}).passthrough();

// Some WhatsApp client/coexistence paths surface a reply-button tap as an
// interactive button_reply instead of the legacy template type="button" shape.
const interactiveReplyMessageSchema = z.object({
  id: z.string().trim().min(1).max(500),
  from: z.string().regex(/^\d{5,20}$/),
  timestamp: unixTimestampSchema,
  type: z.literal("interactive"),
  context: messageContextSchema,
  interactive: z.object({
    type: z.literal("button_reply"),
    button_reply: z.object({
      id: z.string().max(2048).optional(),
      title: z.string().max(2048).optional(),
    }).passthrough().refine(
      (reply) => Boolean(reply.id?.trim() || reply.title?.trim()),
      "button reply must contain id or title",
    ),
  }).passthrough(),
}).passthrough();

// In coexistence, WhatsApp can also mirror the selected quick-reply as a
// contextual text reply. We only surface contextual text here; the downstream
// delivery-care contract still accepts only AQUAVO's two exact choices and the
// handler still requires context.id + sender phone to match the completed job.
const contextualTextReplyMessageSchema = z.object({
  id: z.string().trim().min(1).max(500),
  from: z.string().regex(/^\d{5,20}$/),
  timestamp: unixTimestampSchema,
  type: z.literal("text"),
  context: messageContextSchema,
  text: z.object({
    body: z.string().trim().min(1).max(2048),
  }).passthrough(),
}).passthrough();

const statusesValueSchema = z.object({ statuses: z.array(z.unknown()) }).passthrough();
const messagesValueSchema = z.object({ messages: z.array(z.unknown()) }).passthrough();

function constantTimeStringEquals(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

/** Verify Meta's X-Hub-Signature-256 against the exact raw request bytes. */
export function verifyMetaWebhookSignature(
  rawBody: Buffer,
  signatureHeader: string | undefined,
  appSecret: string,
): boolean {
  if (!Buffer.isBuffer(rawBody) || !rawBody.length || !signatureHeader || !appSecret) return false;

  const match = /^sha256=([a-f0-9]{64})$/i.exec(signatureHeader.trim());
  if (!match?.[1]) return false;

  const expected = createHmac("sha256", appSecret).update(rawBody).digest();
  const supplied = Buffer.from(match[1], "hex");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function compactProviderFailureCode(status: Record<string, unknown>): string {
  const errors = Array.isArray(status.errors) ? status.errors : [];
  const firstError = asRecord(errors[0]);
  const rawCode = firstError?.code;
  const code = typeof rawCode === "number" || typeof rawCode === "string"
    ? String(rawCode).replace(/[^A-Za-z0-9_-]/g, "").slice(0, 50)
    : "UNKNOWN";
  return `WHATSAPP_PROVIDER_FAILED_${code}`.slice(0, 120);
}

/** Extract outgoing-message lifecycle events we persist. */
export function extractWhatsAppStatusEvents(payload: unknown): WhatsAppStatusEvent[] {
  const root = webhookEnvelopeSchema.safeParse(payload);
  if (!root.success) return [];

  const events: WhatsAppStatusEvent[] = [];
  for (const entry of root.data.entry) {
    for (const change of entry.changes) {
      if (change.field !== "messages") continue;
      const value = statusesValueSchema.safeParse(change.value);
      if (!value.success) continue;

      for (const rawStatus of value.data.statuses) {
        const parsedStatus = providerStatusSchema.safeParse(rawStatus);
        if (!parsedStatus.success) continue;
        const statusObject = parsedStatus.data;
        const timestampSeconds = Number(statusObject.timestamp);
        const statusAt = new Date(timestampSeconds * 1000);
        if (!Number.isFinite(statusAt.getTime())) continue;

        events.push({
          providerMessageId: statusObject.id,
          status: statusObject.status as WhatsAppProviderStatus,
          statusAt,
          errorCode: statusObject.status === "failed"
            ? compactProviderFailureCode(statusObject as Record<string, unknown>)
            : null,
        });
      }
    }
  }

  return events;
}

/**
 * Extract delivery-care replies while preserving Meta's original context wamid.
 * Standard template quick replies arrive as type="button". We also accept the
 * contextual interactive/text variants seen on coexistence clients; downstream
 * matching remains strict to AQUAVO's exact choices, completed wamid and sender.
 */
export function extractDeliveryCareButtonReplyEvents(
  payload: unknown,
): DeliveryCareButtonReplyEvent[] {
  const root = webhookEnvelopeSchema.safeParse(payload);
  if (!root.success) return [];

  const events: DeliveryCareButtonReplyEvent[] = [];
  for (const entry of root.data.entry) {
    for (const change of entry.changes) {
      if (change.field !== "messages") continue;
      const value = messagesValueSchema.safeParse(change.value);
      if (!value.success) continue;

      for (const rawMessage of value.data.messages) {
        const parsedButton = quickReplyMessageSchema.safeParse(rawMessage);
        if (parsedButton.success) {
          const message = parsedButton.data;
          const timestampSeconds = Number(message.timestamp);
          const receivedAt = new Date(timestampSeconds * 1000);
          if (!Number.isFinite(receivedAt.getTime())) continue;

          events.push({
            inboundMessageId: message.id,
            contextProviderMessageId: message.context.id,
            fromPhone: message.from,
            receivedAt,
            payload: message.button.payload?.trim() ?? "",
            buttonText: message.button.text?.trim() ?? "",
          });
          continue;
        }

        const parsedInteractive = interactiveReplyMessageSchema.safeParse(rawMessage);
        if (parsedInteractive.success) {
          const message = parsedInteractive.data;
          const timestampSeconds = Number(message.timestamp);
          const receivedAt = new Date(timestampSeconds * 1000);
          if (!Number.isFinite(receivedAt.getTime())) continue;

          events.push({
            inboundMessageId: message.id,
            contextProviderMessageId: message.context.id,
            fromPhone: message.from,
            receivedAt,
            payload: message.interactive.button_reply.id?.trim() ?? "",
            buttonText: message.interactive.button_reply.title?.trim() ?? "",
          });
          continue;
        }

        const parsedText = contextualTextReplyMessageSchema.safeParse(rawMessage);
        if (!parsedText.success) continue;
        const message = parsedText.data;
        const timestampSeconds = Number(message.timestamp);
        const receivedAt = new Date(timestampSeconds * 1000);
        if (!Number.isFinite(receivedAt.getTime())) continue;

        events.push({
          inboundMessageId: message.id,
          contextProviderMessageId: message.context.id,
          fromPhone: message.from,
          receivedAt,
          payload: "",
          buttonText: message.text.body.trim(),
        });
      }
    }
  }

  return events;
}

export function createWhatsAppWebhookRouter(): RouterType {
  const router = Router();

  router.get("/", (req: Request, res: Response): void => {
    const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim() ?? "";
    const mode = typeof req.query["hub.mode"] === "string" ? req.query["hub.mode"] : "";
    const token = typeof req.query["hub.verify_token"] === "string" ? req.query["hub.verify_token"] : "";
    const challenge = typeof req.query["hub.challenge"] === "string" ? req.query["hub.challenge"] : "";

    if (!expectedToken) {
      res.status(503).json({ code: "WHATSAPP_WEBHOOK_NOT_CONFIGURED" });
      return;
    }

    if (mode === "subscribe" && token && challenge && constantTimeStringEquals(token, expectedToken)) {
      res.status(200).type("text/plain").send(challenge);
      return;
    }

    res.sendStatus(403);
  });

  router.post("/", async (req: Request, res: Response): Promise<void> => {
    const appSecret = process.env.META_APP_SECRET?.trim() ?? "";
    if (!appSecret) {
      res.status(503).json({ code: "WHATSAPP_WEBHOOK_NOT_CONFIGURED" });
      return;
    }

    const rawBody = (req as RawBodyRequest).rawBody;
    const signature = req.get("x-hub-signature-256") ?? undefined;
    if (!rawBody || !verifyMetaWebhookSignature(rawBody, signature, appSecret)) {
      res.sendStatus(401);
      return;
    }

    let payload: unknown;
    try {
      payload = JSON.parse(rawBody.toString("utf8"));
    } catch {
      res.status(400).json({ code: "INVALID_WEBHOOK_JSON" });
      return;
    }

    const statusEvents = extractWhatsAppStatusEvents(payload);
    const buttonReplyEvents = extractDeliveryCareButtonReplyEvents(payload);

    try {
      // Persist signed provider lifecycle status first. If wamid acceptance is
      // still racing, the existing durable inbox retains it for reconciliation.
      for (const event of statusEvents) {
        await recordWhatsAppProviderStatusEvent(event);
      }

      let buttonRepliesHandled = 0;
      for (const event of buttonReplyEvents) {
        const result = await handleDeliveryCareButtonReply(event);
        if (result.status === "db_unavailable") {
          res.status(503).json({ code: "WEBHOOK_PERSISTENCE_FAILED" });
          return;
        }
        if (result.status === "unmatched") {
          // Meta can deliver the customer's reply before markAccepted() commits
          // the originating outbound wamid. Persist the signed callback and ACK
          // only after the inbox write succeeds; the five-minute worker will
          // reconcile it once the delivery-care job is correlated.
          await recordPendingDeliveryCareButtonReply(event);
          buttonRepliesHandled += 1;
          continue;
        }
        if (result.status === "duplicate") {
          // A later, different button press is useful support state but must not
          // cause a second automatic response. The helper is idempotent by inbound
          // message id and ignores an exact webhook redelivery.
          await recordSubsequentDeliveryCareChoice(event);
          buttonRepliesHandled += 1;
          continue;
        }
        if (result.status === "retryable_failed") {
          // Keep Meta redelivery as a second recovery path. The durable callback
          // state and the external worker independently enforce the same bounded
          // retry policy, so duplicate provider sends remain impossible.
          res.status(503).json({ code: "WHATSAPP_AUTO_REPLY_RETRY_REQUESTED" });
          return;
        }
        if (result.status === "replied") {
          buttonRepliesHandled += 1;
        }
      }

      res.status(200).json({
        received: true,
        events: statusEvents.length,
        buttonReplies: buttonReplyEvents.length,
        buttonRepliesHandled,
      });
    } catch {
      // Non-2xx deliberately asks Meta to retry a verified event when persistence
      // failed. No provider payload, phone, customer text or token is logged.
      res.status(503).json({ code: "WEBHOOK_PERSISTENCE_FAILED" });
    }
  });

  return router;
}

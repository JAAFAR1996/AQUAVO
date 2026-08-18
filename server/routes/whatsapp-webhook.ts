import { createHmac, timingSafeEqual } from "node:crypto";
import type { Request, Response, Router as RouterType } from "express";
import { Router } from "express";
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
  const root = asRecord(payload);
  if (!root || root.object !== "whatsapp_business_account" || !Array.isArray(root.entry)) return [];

  const events: WhatsAppStatusEvent[] = [];
  for (const rawEntry of root.entry) {
    const entry = asRecord(rawEntry);
    if (!entry || !Array.isArray(entry.changes)) continue;

    for (const rawChange of entry.changes) {
      const change = asRecord(rawChange);
      if (!change || change.field !== "messages") continue;
      const value = asRecord(change.value);
      if (!value || !Array.isArray(value.statuses)) continue;

      for (const rawStatus of value.statuses) {
        const statusObject = asRecord(rawStatus);
        if (!statusObject) continue;

        const providerMessageId = String(statusObject.id ?? "").trim();
        const status = String(statusObject.status ?? "").trim() as WhatsAppProviderStatus;
        const timestampSeconds = Number(statusObject.timestamp);
        if (!providerMessageId || !["sent", "delivered", "read", "failed"].includes(status)) continue;
        if (!Number.isFinite(timestampSeconds) || timestampSeconds <= 0) continue;

        const statusAt = new Date(timestampSeconds * 1000);
        if (!Number.isFinite(statusAt.getTime())) continue;

        events.push({
          providerMessageId,
          status,
          statusAt,
          errorCode: status === "failed" ? compactProviderFailureCode(statusObject) : null,
        });
      }
    }
  }

  return events;
}

/**
 * Meta sends a message with type="button" when a customer taps a Quick Reply on
 * an interactive message template. context.id points back to AQUAVO's original
 * template wamid, which is the correlation key used by the delivery-care handler.
 */
export function extractDeliveryCareButtonReplyEvents(
  payload: unknown,
): DeliveryCareButtonReplyEvent[] {
  const root = asRecord(payload);
  if (!root || root.object !== "whatsapp_business_account" || !Array.isArray(root.entry)) return [];

  const events: DeliveryCareButtonReplyEvent[] = [];
  for (const rawEntry of root.entry) {
    const entry = asRecord(rawEntry);
    if (!entry || !Array.isArray(entry.changes)) continue;

    for (const rawChange of entry.changes) {
      const change = asRecord(rawChange);
      if (!change || change.field !== "messages") continue;
      const value = asRecord(change.value);
      if (!value || !Array.isArray(value.messages)) continue;

      for (const rawMessage of value.messages) {
        const message = asRecord(rawMessage);
        if (!message || String(message.type ?? "") !== "button") continue;

        const button = asRecord(message.button);
        const context = asRecord(message.context);
        const inboundMessageId = String(message.id ?? "").trim();
        const contextProviderMessageId = String(context?.id ?? "").trim();
        const fromPhone = String(message.from ?? "").trim();
        const payloadValue = String(button?.payload ?? "").trim();
        const buttonText = String(button?.text ?? "").trim();
        const timestampSeconds = Number(message.timestamp);

        if (!inboundMessageId || !contextProviderMessageId || !fromPhone) continue;
        if (!payloadValue && !buttonText) continue;
        if (!Number.isFinite(timestampSeconds) || timestampSeconds <= 0) continue;

        const receivedAt = new Date(timestampSeconds * 1000);
        if (!Number.isFinite(receivedAt.getTime())) continue;

        events.push({
          inboundMessageId,
          contextProviderMessageId,
          fromPhone,
          receivedAt,
          payload: payloadValue,
          buttonText,
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
        if (result.status === "retryable_failed") {
          // Meta may safely retry this exact signed webhook: the prior send got an
          // explicit retryable rejection (429/5xx), and the durable callback claim
          // allows only bounded retries for the same inbound message id.
          res.status(503).json({ code: "WHATSAPP_AUTO_REPLY_RETRY_REQUESTED" });
          return;
        }
        if (result.status === "replied" || result.status === "duplicate") {
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

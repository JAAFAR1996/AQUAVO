import { createHmac, timingSafeEqual } from "node:crypto";
import type { Request, Response, Router as RouterType } from "express";
import { Router } from "express";
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

/**
 * Extract only outgoing-message lifecycle events we persist. Incoming messages,
 * contacts and unsupported/deleted statuses are deliberately ignored.
 */
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

    const events = extractWhatsAppStatusEvents(payload);
    try {
      // Persist each signed provider status before attempting to match it to an
      // outbox job. If wamid acceptance is still racing, the event stays pending
      // and markAccepted()/cron reconciliation will apply it later.
      for (const event of events) {
        await recordWhatsAppProviderStatusEvent(event);
      }
    } catch {
      // Non-2xx deliberately asks Meta to retry a verified event when persistence
      // failed. No provider payload/phone/error text is written to application logs.
      res.status(503).json({ code: "WEBHOOK_PERSISTENCE_FAILED" });
      return;
    }

    res.status(200).json({ received: true, events: events.length });
  });

  return router;
}

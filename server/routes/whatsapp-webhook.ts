import { createHmac, timingSafeEqual } from "node:crypto";
import type { Request, Response, Router as RouterType } from "express";
import { Router } from "express";
import { sql } from "drizzle-orm";
import { getDb } from "../db.js";

type RawBodyRequest = Request & { rawBody?: Buffer };

type WhatsAppProviderStatus = "sent" | "delivered" | "read" | "failed";

export type WhatsAppStatusEvent = {
  providerMessageId: string;
  status: WhatsAppProviderStatus;
  statusAt: Date;
  errorCode: string | null;
};

const PROVIDER_STATUS_RANK: Record<"accepted" | WhatsAppProviderStatus, number> = {
  accepted: 0,
  sent: 1,
  delivered: 2,
  read: 3,
  failed: 4,
};

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
  if (!match) return false;

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

async function persistWhatsAppStatusEvent(event: WhatsAppStatusEvent): Promise<boolean> {
  const db = getDb();
  if (!db) throw new Error("DB_UNAVAILABLE");

  const incomingRank = PROVIDER_STATUS_RANK[event.status];
  const result = await db.execute(sql`
    UPDATE public.customer_message_jobs AS job
       SET provider_status=${event.status},
           provider_status_at=${event.statusAt},
           last_error_code=CASE
             WHEN ${event.status}='failed' THEN ${event.errorCode}
             WHEN job.last_error_code LIKE 'WHATSAPP_PROVIDER_FAILED_%' THEN NULL
             ELSE job.last_error_code
           END,
           last_error_at=CASE
             WHEN ${event.status}='failed' THEN ${event.statusAt}
             WHEN job.last_error_code LIKE 'WHATSAPP_PROVIDER_FAILED_%' THEN NULL
             ELSE job.last_error_at
           END,
           updated_at=clock_timestamp()
     WHERE job.provider_message_id=${event.providerMessageId}
       AND job.status='completed'
       AND (
         job.provider_status_at IS NULL
         OR job.provider_status_at < ${event.statusAt}
         OR (
           job.provider_status_at = ${event.statusAt}
           AND CASE job.provider_status
             WHEN 'accepted' THEN 0
             WHEN 'sent' THEN 1
             WHEN 'delivered' THEN 2
             WHEN 'read' THEN 3
             WHEN 'failed' THEN 4
             ELSE -1
           END < ${incomingRank}
         )
       )
    RETURNING job.id
  `);

  const rows = Array.isArray(result)
    ? result
    : ((result as { rows?: unknown[] } | null)?.rows ?? []);
  return rows.length > 0;
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

    const db = getDb();
    if (!db) {
      res.status(503).json({ code: "DB_UNAVAILABLE" });
      return;
    }

    const events = extractWhatsAppStatusEvents(payload);
    let updated = 0;
    try {
      for (const event of events) {
        if (await persistWhatsAppStatusEvent(event)) updated += 1;
      }
    } catch (error) {
      if (error instanceof Error && error.message === "DB_UNAVAILABLE") {
        res.status(503).json({ code: "DB_UNAVAILABLE" });
        return;
      }
      throw error;
    }

    // A verified webhook is acknowledged even if it references a message that is
    // not ours. Meta may redeliver notifications, so persistence is idempotent.
    res.status(200).json({ received: true, events: events.length, updated });
  });

  return router;
}

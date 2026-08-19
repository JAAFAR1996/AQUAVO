import { sql } from "drizzle-orm";
import { getDb } from "../db.js";
import { reconcilePendingDeliveryCareButtonReplies } from "./whatsapp-delivery-care-button-inbox.js";
import {
  handleDeliveryCareButtonReply,
  type DeliveryCareButtonReplyEvent,
  type DeliveryCareAutoReplyRecoveryResult,
} from "./whatsapp-delivery-care-replies.js";

type Row = Record<string, unknown>;

type ResilientRecoveryResult = DeliveryCareAutoReplyRecoveryResult & {
  inboxReconciled: number;
  inboxErrors: number;
};

const MAX_AUTO_REPLY_ATTEMPTS = 3;
const STALE_AUTO_REPLY_PROCESSING_MINUTES = 10;
const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 10;

function rowsOf(result: unknown): Row[] {
  if (Array.isArray(result)) return result as Row[];
  const rows = (result as { rows?: Row[] } | null)?.rows;
  return Array.isArray(rows) ? rows : [];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function metadataRecord(value: unknown): Record<string, unknown> {
  const direct = asRecord(value);
  if (direct) return direct;
  if (typeof value !== "string") return {};
  try {
    return asRecord(JSON.parse(value)) ?? {};
  } catch {
    return {};
  }
}

function readConfigured(): boolean {
  if (process.env.WHATSAPP_CLOUD_ENABLED?.trim().toLowerCase() !== "true") return false;
  const version = process.env.WHATSAPP_API_VERSION?.trim() ?? "";
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() ?? "";
  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim() ?? "";
  return /^v\d+\.\d+$/.test(version) && /^\d+$/.test(phoneNumberId) && Boolean(token);
}

function eventFromMetadata(row: Row): DeliveryCareButtonReplyEvent | null {
  const root = metadataRecord(row.metadata);
  const reply = asRecord(root.delivery_care_reply);
  if (!reply) return null;

  const inboundMessageId = typeof reply.inbound_message_id === "string" ? reply.inbound_message_id.trim() : "";
  const contextProviderMessageId = typeof reply.context_provider_message_id === "string"
    ? reply.context_provider_message_id.trim()
    : "";
  const fromPhone = typeof reply.sender_phone === "string" ? reply.sender_phone.trim() : "";
  const payload = typeof reply.button_payload === "string" ? reply.button_payload : "";
  const buttonText = typeof reply.button_text === "string" ? reply.button_text : "";
  const receivedAt = new Date(String(reply.received_at ?? ""));

  if (!inboundMessageId || !contextProviderMessageId || !fromPhone) return null;
  if (!payload && !buttonText) return null;
  if (!Number.isFinite(receivedAt.getTime())) return null;

  return {
    inboundMessageId,
    contextProviderMessageId,
    fromPhone,
    receivedAt,
    payload,
    buttonText,
  };
}

function candidateIsDue(row: Row): boolean {
  const root = metadataRecord(row.metadata);
  const reply = asRecord(root.delivery_care_reply);
  if (!reply) return false;

  const status = String(reply.auto_reply_status ?? "");
  const attempts = Math.max(0, Number(reply.auto_reply_attempts ?? 0) || 0);
  if (status === "disabled") return true;
  if (status !== "retryable_failed" || attempts >= MAX_AUTO_REPLY_ATTEMPTS) return false;

  const retryRaw = String(reply.auto_reply_retry_at ?? "").trim();
  if (!retryRaw) return true;
  const retryAt = new Date(retryRaw);
  return Number.isFinite(retryAt.getTime()) && retryAt.getTime() <= Date.now();
}

async function markRecoveryMetadataInvalid(jobId: string): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db.execute(sql`
    UPDATE public.customer_message_jobs
       SET metadata=jsonb_set(
             COALESCE(metadata, '{}'::jsonb),
             '{delivery_care_reply}',
             COALESCE(metadata->'delivery_care_reply', '{}'::jsonb)
             || jsonb_build_object(
                  'auto_reply_status', 'failed',
                  'auto_reply_error_code', 'WHATSAPP_REPLY_RECOVERY_METADATA_INVALID',
                  'auto_reply_processing_at', NULL,
                  'auto_reply_retry_at', NULL,
                  'auto_reply_finished_at', clock_timestamp()
                ),
             true
           ),
           updated_at=clock_timestamp()
     WHERE id=${jobId}
  `);
}

/**
 * Expire abandoned provider-send claims one row at a time. Parsing timestamps in
 * application code prevents one malformed JSON value from poisoning the whole
 * SQL batch through a timestamptz cast.
 */
async function expireStaleProcessingClaims(limit = 50): Promise<number> {
  const db = getDb();
  if (!db) return 0;

  const candidates = await db.execute(sql`
    SELECT id,metadata
    FROM public.customer_message_jobs
    WHERE job_type='delivery_care'
      AND status='completed'
      AND metadata->'delivery_care_reply'->>'auto_reply_status'='processing'
    ORDER BY updated_at ASC
    LIMIT ${Math.max(1, Math.min(200, Math.floor(limit)))}
  `);

  const cutoff = Date.now() - STALE_AUTO_REPLY_PROCESSING_MINUTES * 60_000;
  let expired = 0;
  for (const row of rowsOf(candidates)) {
    try {
      const root = metadataRecord(row.metadata);
      const reply = asRecord(root.delivery_care_reply);
      const processingAt = new Date(String(reply?.auto_reply_processing_at ?? ""));
      if (!Number.isFinite(processingAt.getTime()) || processingAt.getTime() > cutoff) continue;

      const jobId = String(row.id ?? "").trim();
      if (!jobId) continue;
      const result = await db.execute(sql`
        UPDATE public.customer_message_jobs
           SET metadata=jsonb_set(
                 COALESCE(metadata, '{}'::jsonb),
                 '{delivery_care_reply}',
                 COALESCE(metadata->'delivery_care_reply', '{}'::jsonb)
                 || jsonb_build_object(
                      'auto_reply_status', 'ambiguous',
                      'auto_reply_error_code', 'WHATSAPP_REPLY_STALE_PROCESSING_AMBIGUOUS',
                      'auto_reply_processing_at', NULL,
                      'auto_reply_finished_at', clock_timestamp()
                    ),
                 true
               ),
               updated_at=clock_timestamp()
         WHERE id=${jobId}
           AND metadata->'delivery_care_reply'->>'auto_reply_status'='processing'
        RETURNING id
      `);
      expired += rowsOf(result).length;
    } catch {
      // One corrupt or temporarily unavailable row must not starve the batch.
    }
  }
  return expired;
}

/**
 * Fault-isolated five-minute recovery. Every candidate is handled independently,
 * so one malformed row or transient DB failure cannot discard results from other
 * delivery-care jobs. Provider ambiguity remains terminal and is never retried.
 */
export async function runResilientDeliveryCareAutoReplyRecovery(
  limit = DEFAULT_LIMIT,
): Promise<ResilientRecoveryResult> {
  const db = getDb();
  if (!db) {
    return {
      processed: 0,
      replied: 0,
      retryable: 0,
      failed: 0,
      ambiguous: 0,
      staleAmbiguous: 0,
      inboxReconciled: 0,
      inboxErrors: 0,
    };
  }

  let inboxReconciled = 0;
  let inboxErrors = 0;
  try {
    inboxReconciled = await reconcilePendingDeliveryCareButtonReplies(25);
  } catch {
    inboxErrors = 1;
  }

  let staleAmbiguous = 0;
  try {
    staleAmbiguous = await expireStaleProcessingClaims();
  } catch {
    // Continue with due callbacks even if maintenance of stale claims failed.
  }

  if (!readConfigured()) {
    return {
      processed: 0,
      replied: 0,
      retryable: 0,
      failed: 0,
      ambiguous: 0,
      staleAmbiguous,
      inboxReconciled,
      inboxErrors,
    };
  }

  const safeLimit = Math.max(1, Math.min(MAX_LIMIT, Math.floor(limit)));
  const candidates = await db.execute(sql`
    SELECT id,metadata
    FROM public.customer_message_jobs
    WHERE job_type='delivery_care'
      AND status='completed'
      AND metadata->'delivery_care_reply'->>'auto_reply_status' IN ('disabled','retryable_failed')
    ORDER BY updated_at ASC,created_at ASC
    LIMIT ${safeLimit * 4}
  `);

  let processed = 0;
  let replied = 0;
  let retryable = 0;
  let failed = 0;
  let ambiguous = 0;

  for (const row of rowsOf(candidates)) {
    if (processed >= safeLimit) break;
    if (!candidateIsDue(row)) continue;

    const jobId = String(row.id ?? "").trim();
    const event = eventFromMetadata(row);
    if (!event) {
      processed += 1;
      failed += 1;
      if (jobId) {
        try {
          await markRecoveryMetadataInvalid(jobId);
        } catch {
          // Keep going; a later run can inspect/retry maintenance of this row.
        }
      }
      continue;
    }

    try {
      const result = await handleDeliveryCareButtonReply(event);
      if (result.status === "duplicate") continue;

      processed += 1;
      if (result.status === "replied") replied += 1;
      if (result.status === "retryable_failed") retryable += 1;
      if (["failed", "sender_mismatch", "db_unavailable"].includes(result.status)) failed += 1;
      if (result.status === "ambiguous") ambiguous += 1;
    } catch {
      processed += 1;
      failed += 1;
    }
  }

  return {
    processed,
    replied,
    retryable,
    failed,
    ambiguous,
    staleAmbiguous,
    inboxReconciled,
    inboxErrors,
  };
}

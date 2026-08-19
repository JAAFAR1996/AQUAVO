import { sql } from "drizzle-orm";
import { getDb } from "../db.js";
import { normalizeIraqiWhatsAppPhone } from "./customer-messaging.js";
import {
  getDeliveryCareAutoReplyText,
  resolveDeliveryCareReplyChoice,
  type DeliveryCareReplyChoice,
} from "./whatsapp-delivery-care-contract.js";

const WHATSAPP_REPLY_TIMEOUT_MS = 7_000;
const MAX_AUTO_REPLY_ATTEMPTS = 3;
const AUTO_REPLY_RETRY_DELAY_MS = 60_000;
const AUTO_REPLY_METADATA_PERSIST_ATTEMPTS = 3;
const STALE_AUTO_REPLY_PROCESSING_MINUTES = 10;
const DEFAULT_AUTO_REPLY_WORKER_LIMIT = 5;
const MAX_AUTO_REPLY_WORKER_LIMIT = 10;

type Row = Record<string, unknown>;

type MetaSendResponse = {
  messages?: Array<{ id?: string }>;
  error?: {
    code?: number;
    error_subcode?: number;
  };
};

type ReplyConfig = {
  apiVersion: string;
  phoneNumberId: string;
  accessToken: string;
};

export type DeliveryCareButtonReplyEvent = {
  inboundMessageId: string;
  contextProviderMessageId: string;
  fromPhone: string;
  receivedAt: Date;
  payload: string;
  buttonText: string;
};

export type DeliveryCareButtonReplyResult = {
  status:
    | "replied"
    | "ignored"
    | "unmatched"
    | "sender_mismatch"
    | "duplicate"
    | "disabled"
    | "retryable_failed"
    | "failed"
    | "ambiguous"
    | "db_unavailable";
  orderId?: string;
  jobId?: string;
  choice?: DeliveryCareReplyChoice;
  providerMessageId?: string;
  errorCode?: string;
};

export type DeliveryCareAutoReplyRecoveryResult = {
  processed: number;
  replied: number;
  retryable: number;
  failed: number;
  ambiguous: number;
  staleAmbiguous: number;
};

class AutoReplySendError extends Error {
  readonly code: string;
  readonly ambiguous: boolean;
  readonly retryable: boolean;

  constructor(code: string, ambiguous: boolean, retryable = false) {
    super(code);
    this.name = "AutoReplySendError";
    this.code = code;
    this.ambiguous = ambiguous;
    this.retryable = retryable;
  }
}

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readReplyConfig(): ReplyConfig | null {
  if (process.env.WHATSAPP_CLOUD_ENABLED?.trim().toLowerCase() !== "true") return null;

  const apiVersion = process.env.WHATSAPP_API_VERSION?.trim() ?? "";
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() ?? "";
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim() ?? "";

  if (!/^v\d+\.\d+$/.test(apiVersion)) return null;
  if (!/^\d+$/.test(phoneNumberId)) return null;
  if (!accessToken) return null;

  return { apiVersion, phoneNumberId, accessToken };
}

function compactMetaErrorCode(httpStatus: number, body: MetaSendResponse): string {
  const metaCode = Number(body.error?.code);
  const subcode = Number(body.error?.error_subcode);
  const suffix = Number.isFinite(metaCode)
    ? `_META_${metaCode}${Number.isFinite(subcode) ? `_${subcode}` : ""}`
    : "";
  return `WHATSAPP_REPLY_HTTP_${httpStatus}${suffix}`.slice(0, 120);
}

async function sendTextAutoReply(
  config: ReplyConfig,
  recipientPhone: string,
  text: string,
): Promise<string> {
  const endpoint = `https://graph.facebook.com/${config.apiVersion}/${encodeURIComponent(config.phoneNumberId)}/messages`;

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipientPhone,
        type: "text",
        text: {
          preview_url: false,
          body: text,
        },
      }),
      signal: AbortSignal.timeout(WHATSAPP_REPLY_TIMEOUT_MS),
    });
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    const code = name === "TimeoutError" || name === "AbortError"
      ? "WHATSAPP_REPLY_TIMEOUT_AMBIGUOUS"
      : "WHATSAPP_REPLY_NETWORK_AMBIGUOUS";

    // A transport failure can occur after Meta accepted the message. Never retry
    // an ambiguous send automatically because that could duplicate the reply.
    throw new AutoReplySendError(code, true, false);
  }

  let body: MetaSendResponse = {};
  try {
    body = await response.json() as MetaSendResponse;
  } catch {
    // Provider body is deliberately not logged or persisted.
  }

  const providerMessageId = String(body.messages?.[0]?.id ?? "").trim();
  if (response.ok && providerMessageId) return providerMessageId;

  if (response.ok) {
    throw new AutoReplySendError("WHATSAPP_REPLY_ACCEPTANCE_AMBIGUOUS", true, false);
  }

  // An explicit 429/5xx proves the request was rejected at this attempt and is
  // safe to retry. Other explicit HTTP failures are terminal until human action.
  const retryable = response.status === 429 || response.status >= 500;
  throw new AutoReplySendError(compactMetaErrorCode(response.status, body), false, retryable);
}

async function mergeReplyMetadata(
  jobId: string,
  values: Record<string, unknown>,
): Promise<void> {
  const db = getDb();
  if (!db) throw new Error("DB_UNAVAILABLE");
  await db.execute(sql`
    UPDATE public.customer_message_jobs
       SET metadata=jsonb_set(
             COALESCE(metadata, '{}'::jsonb),
             '{delivery_care_reply}',
             COALESCE(metadata->'delivery_care_reply', '{}'::jsonb) || ${JSON.stringify(values)}::jsonb,
             true
           ),
           updated_at=clock_timestamp()
     WHERE id=${jobId}
  `);
}

/**
 * Provider sends are never repeated merely because PostgreSQL acknowledgement is
 * uncertain. Metadata writes are idempotent JSON merges, so retry only the local
 * persistence step a few times; the provider request itself happens exactly once.
 */
async function persistReplyMetadata(
  jobId: string,
  values: Record<string, unknown>,
): Promise<boolean> {
  for (let attempt = 1; attempt <= AUTO_REPLY_METADATA_PERSIST_ATTEMPTS; attempt += 1) {
    try {
      await mergeReplyMetadata(jobId, values);
      return true;
    } catch {
      if (attempt < AUTO_REPLY_METADATA_PERSIST_ATTEMPTS) {
        await sleep(attempt * 75);
      }
    }
  }
  return false;
}

function retryAtIsDue(value: unknown): boolean {
  const raw = String(value ?? "").trim();
  if (!raw) return true;
  const retryAt = new Date(raw);
  return Number.isFinite(retryAt.getTime()) && retryAt.getTime() <= Date.now();
}

/**
 * A serverless process can die after the durable claim but before the final
 * provider result is persisted. That state is ambiguous: a provider request may
 * already have left the process. Expire it to a terminal ambiguous state rather
 * than ever resending it.
 */
async function failStaleAutoReplyClaims(): Promise<number> {
  const db = getDb();
  if (!db) return 0;

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
     WHERE job_type='delivery_care'
       AND status='completed'
       AND metadata->'delivery_care_reply'->>'auto_reply_status'='processing'
       AND metadata->'delivery_care_reply'->>'auto_reply_processing_at' IS NOT NULL
       AND (metadata->'delivery_care_reply'->>'auto_reply_processing_at')::timestamptz
           <= clock_timestamp() - (${STALE_AUTO_REPLY_PROCESSING_MINUTES} * interval '1 minute')
    RETURNING id
  `);

  return rowsOf(result).length;
}

/**
 * Processes only replies to AQUAVO's own delivered-order template. The original
 * outbound wamid (`context.id`) is the correlation key; the sender phone must also
 * match the phone stored on that order. The inbound message id and verified sender
 * are durably claimed before any outbound auto-reply. Webhook retries can only
 * repeat a send after an explicit retryable provider rejection, never after an
 * ambiguous transport state. A callback received while Cloud API sending is
 * disabled is retained and can be resumed by the recovery worker after
 * configuration is enabled.
 */
export async function handleDeliveryCareButtonReply(
  event: DeliveryCareButtonReplyEvent,
): Promise<DeliveryCareButtonReplyResult> {
  const choice = resolveDeliveryCareReplyChoice(event.payload, event.buttonText);
  if (!choice) return { status: "ignored" };

  const senderPhone = normalizeIraqiWhatsAppPhone(event.fromPhone);
  if (!senderPhone) return { status: "ignored", choice };

  const db = getDb();
  if (!db) return { status: "db_unavailable", choice };

  const lookup = await db.execute(sql`
    SELECT job.id,
           job.order_id,
           job.metadata,
           orders.customer_phone
      FROM public.customer_message_jobs AS job
      JOIN public.orders AS orders ON orders.id=job.order_id
     WHERE job.provider_message_id=${event.contextProviderMessageId}
       AND job.job_type='delivery_care'
       AND job.status='completed'
     LIMIT 1
  `);
  const row = rowsOf(lookup)[0];
  if (!row) return { status: "unmatched", choice };

  const jobId = String(row.id ?? "");
  const orderId = String(row.order_id ?? "");
  const orderPhone = normalizeIraqiWhatsAppPhone(row.customer_phone);
  if (!orderPhone || orderPhone !== senderPhone) {
    return { status: "sender_mismatch", jobId, orderId, choice };
  }

  const existingRoot = metadataRecord(row.metadata);
  const existingReply = asRecord(existingRoot.delivery_care_reply);
  const existingInboundMessageId = String(existingReply?.inbound_message_id ?? "");
  const existingContextProviderMessageId = String(existingReply?.context_provider_message_id ?? "");
  const existingChoice = String(existingReply?.choice ?? "");
  const existingSenderPhone = String(existingReply?.sender_phone ?? "");
  const existingStatus = String(existingReply?.auto_reply_status ?? "");
  const existingAttempts = Math.max(0, Number(existingReply?.auto_reply_attempts ?? 0) || 0);

  let claimed = false;
  let attemptCount = 1;

  if (!existingReply) {
    const claim = await db.execute(sql`
      UPDATE public.customer_message_jobs
         SET metadata=jsonb_set(
               COALESCE(metadata, '{}'::jsonb),
               '{delivery_care_reply}',
               jsonb_build_object(
                 'inbound_message_id', ${event.inboundMessageId},
                 'context_provider_message_id', ${event.contextProviderMessageId},
                 'sender_phone', ${senderPhone},
                 'choice', ${choice},
                 'button_payload', ${event.payload},
                 'button_text', ${event.buttonText},
                 'received_at', ${event.receivedAt},
                 'auto_reply_status', 'processing',
                 'auto_reply_attempts', 1,
                 'auto_reply_processing_at', clock_timestamp()
               ),
               true
             ),
             updated_at=clock_timestamp()
       WHERE id=${jobId}
         AND NOT (COALESCE(metadata, '{}'::jsonb) ? 'delivery_care_reply')
      RETURNING id
    `);
    claimed = rowsOf(claim).length > 0;
  } else {
    const sameCallback =
      existingInboundMessageId === event.inboundMessageId
      && existingContextProviderMessageId === event.contextProviderMessageId
      && existingChoice === choice
      && existingSenderPhone === senderPhone;

    if (sameCallback && existingStatus === "disabled") {
      attemptCount = Math.max(1, existingAttempts);
      const reclaimDisabled = await db.execute(sql`
        UPDATE public.customer_message_jobs
           SET metadata=jsonb_set(
                 COALESCE(metadata, '{}'::jsonb),
                 '{delivery_care_reply}',
                 COALESCE(metadata->'delivery_care_reply', '{}'::jsonb)
                 || jsonb_build_object(
                      'auto_reply_status', 'processing',
                      'auto_reply_attempts', ${attemptCount},
                      'auto_reply_error_code', NULL,
                      'auto_reply_processing_at', clock_timestamp(),
                      'auto_reply_retry_at', NULL
                    ),
                 true
               ),
               updated_at=clock_timestamp()
         WHERE id=${jobId}
           AND metadata->'delivery_care_reply'->>'inbound_message_id'=${event.inboundMessageId}
           AND metadata->'delivery_care_reply'->>'context_provider_message_id'=${event.contextProviderMessageId}
           AND metadata->'delivery_care_reply'->>'sender_phone'=${senderPhone}
           AND metadata->'delivery_care_reply'->>'choice'=${choice}
           AND metadata->'delivery_care_reply'->>'auto_reply_status'='disabled'
        RETURNING id
      `);
      claimed = rowsOf(reclaimDisabled).length > 0;
    } else if (
      sameCallback
      && existingStatus === "retryable_failed"
      && existingAttempts < MAX_AUTO_REPLY_ATTEMPTS
      && retryAtIsDue(existingReply?.auto_reply_retry_at)
    ) {
      attemptCount = existingAttempts + 1;
      const reclaim = await db.execute(sql`
        UPDATE public.customer_message_jobs
           SET metadata=jsonb_set(
                 COALESCE(metadata, '{}'::jsonb),
                 '{delivery_care_reply}',
                 COALESCE(metadata->'delivery_care_reply', '{}'::jsonb)
                 || jsonb_build_object(
                      'auto_reply_status', 'processing',
                      'auto_reply_attempts', ${attemptCount},
                      'auto_reply_error_code', NULL,
                      'auto_reply_processing_at', clock_timestamp(),
                      'auto_reply_retry_at', NULL
                    ),
                 true
               ),
               updated_at=clock_timestamp()
         WHERE id=${jobId}
           AND metadata->'delivery_care_reply'->>'inbound_message_id'=${event.inboundMessageId}
           AND metadata->'delivery_care_reply'->>'context_provider_message_id'=${event.contextProviderMessageId}
           AND metadata->'delivery_care_reply'->>'sender_phone'=${senderPhone}
           AND metadata->'delivery_care_reply'->>'choice'=${choice}
           AND metadata->'delivery_care_reply'->>'auto_reply_status'='retryable_failed'
           AND COALESCE((metadata->'delivery_care_reply'->>'auto_reply_attempts')::integer, 0) < ${MAX_AUTO_REPLY_ATTEMPTS}
           AND (
             metadata->'delivery_care_reply'->>'auto_reply_retry_at' IS NULL
             OR (metadata->'delivery_care_reply'->>'auto_reply_retry_at')::timestamptz <= clock_timestamp()
           )
        RETURNING id
      `);
      claimed = rowsOf(reclaim).length > 0;
    }
  }

  if (!claimed) {
    return { status: "duplicate", jobId, orderId, choice };
  }

  const config = readReplyConfig();
  if (!config) {
    const persisted = await persistReplyMetadata(jobId, {
      auto_reply_status: "disabled",
      auto_reply_error_code: "WHATSAPP_REPLY_NOT_CONFIGURED",
      auto_reply_processing_at: null,
      auto_reply_retry_at: null,
      auto_reply_deferred_at: new Date().toISOString(),
      auto_reply_finished_at: null,
    });
    if (!persisted) {
      return {
        status: "db_unavailable",
        jobId,
        orderId,
        choice,
        errorCode: "WHATSAPP_REPLY_DEFER_PERSISTENCE_FAILED",
      };
    }
    return {
      status: "disabled",
      jobId,
      orderId,
      choice,
      errorCode: "WHATSAPP_REPLY_NOT_CONFIGURED",
    };
  }

  let providerMessageId: string;
  try {
    providerMessageId = await sendTextAutoReply(
      config,
      senderPhone,
      getDeliveryCareAutoReplyText(choice),
    );
  } catch (error) {
    const sendError = error instanceof AutoReplySendError
      ? error
      : new AutoReplySendError("WHATSAPP_REPLY_UNKNOWN_AMBIGUOUS", true, false);

    const retryableNow = sendError.retryable && attemptCount < MAX_AUTO_REPLY_ATTEMPTS;
    const storedStatus = sendError.ambiguous
      ? "ambiguous"
      : retryableNow
        ? "retryable_failed"
        : "failed";
    const retryAt = retryableNow
      ? new Date(Date.now() + AUTO_REPLY_RETRY_DELAY_MS).toISOString()
      : null;

    const persisted = await persistReplyMetadata(jobId, {
      auto_reply_status: storedStatus,
      auto_reply_error_code: sendError.code,
      auto_reply_processing_at: null,
      auto_reply_retry_at: retryAt,
      auto_reply_finished_at: retryableNow ? null : new Date().toISOString(),
    });
    if (!persisted) {
      return {
        status: "db_unavailable",
        jobId,
        orderId,
        choice,
        errorCode: "WHATSAPP_REPLY_RESULT_PERSISTENCE_FAILED",
      };
    }

    return {
      status: sendError.ambiguous
        ? "ambiguous"
        : retryableNow
          ? "retryable_failed"
          : "failed",
      jobId,
      orderId,
      choice,
      errorCode: sendError.code,
    };
  }

  const acceptedPersisted = await persistReplyMetadata(jobId, {
    auto_reply_status: "sent",
    auto_reply_provider_message_id: providerMessageId,
    auto_reply_error_code: null,
    auto_reply_processing_at: null,
    auto_reply_retry_at: null,
    auto_reply_finished_at: new Date().toISOString(),
  });
  if (!acceptedPersisted) {
    // Meta already returned a wamid. Never send again merely because the local
    // acknowledgement could not be persisted; the durable processing claim and
    // stale-claim guard keep later webhook/worker attempts from duplicating it.
    return {
      status: "ambiguous",
      jobId,
      orderId,
      choice,
      providerMessageId,
      errorCode: "WHATSAPP_REPLY_ACCEPTED_PERSISTENCE_AMBIGUOUS",
    };
  }

  return {
    status: "replied",
    jobId,
    orderId,
    choice,
    providerMessageId,
  };
}

function recoveryEventFromRow(row: Row): DeliveryCareButtonReplyEvent | null {
  const root = metadataRecord(row.metadata);
  const reply = asRecord(root.delivery_care_reply);
  if (!reply) return null;

  const inboundMessageId = String(reply.inbound_message_id ?? "").trim();
  const contextProviderMessageId = String(reply.context_provider_message_id ?? "").trim();
  const fromPhone = String(reply.sender_phone ?? "").trim();
  const payload = String(reply.button_payload ?? "").trim();
  const buttonText = String(reply.button_text ?? "").trim();
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

/**
 * Five-minute external-worker recovery for Quick Reply auto-responses. It is a
 * second path independent of Meta webhook redelivery: callbacks received while
 * sending is disabled are resumed after enablement, and explicit 429/5xx
 * rejections are retried only after a short delay and only up to the same bounded
 * three-attempt limit. Recovery always targets the sender phone that was verified
 * and stored at callback claim time; it never substitutes a later-edited order
 * phone. Ambiguous transport states are never selected here.
 */
export async function runPendingDeliveryCareAutoReplies(
  limit = DEFAULT_AUTO_REPLY_WORKER_LIMIT,
): Promise<DeliveryCareAutoReplyRecoveryResult> {
  const db = getDb();
  if (!db) {
    return {
      processed: 0,
      replied: 0,
      retryable: 0,
      failed: 0,
      ambiguous: 0,
      staleAmbiguous: 0,
    };
  }

  const staleAmbiguous = await failStaleAutoReplyClaims();

  // Keep disabled callbacks durable but untouched until the same production
  // configuration used by immediate replies is actually available.
  if (!readReplyConfig()) {
    return {
      processed: 0,
      replied: 0,
      retryable: 0,
      failed: 0,
      ambiguous: 0,
      staleAmbiguous,
    };
  }

  const safeLimit = Math.max(1, Math.min(MAX_AUTO_REPLY_WORKER_LIMIT, Math.floor(limit)));
  const due = await db.execute(sql`
    SELECT job.id,
           job.metadata
      FROM public.customer_message_jobs AS job
     WHERE job.job_type='delivery_care'
       AND job.status='completed'
       AND metadata->'delivery_care_reply'->>'auto_reply_status' IN ('disabled', 'retryable_failed')
       AND (
         metadata->'delivery_care_reply'->>'auto_reply_status'='disabled'
         OR (
           COALESCE((metadata->'delivery_care_reply'->>'auto_reply_attempts')::integer, 0) < ${MAX_AUTO_REPLY_ATTEMPTS}
           AND (
             metadata->'delivery_care_reply'->>'auto_reply_retry_at' IS NULL
             OR (metadata->'delivery_care_reply'->>'auto_reply_retry_at')::timestamptz <= clock_timestamp()
           )
         )
       )
     ORDER BY job.updated_at ASC, job.created_at ASC
     LIMIT ${safeLimit}
  `);

  let processed = 0;
  let replied = 0;
  let retryable = 0;
  let failed = 0;
  let ambiguous = 0;

  for (const row of rowsOf(due)) {
    const event = recoveryEventFromRow(row);
    if (!event) {
      const jobId = String(row.id ?? "").trim();
      if (jobId) {
        const persisted = await persistReplyMetadata(jobId, {
          auto_reply_status: "failed",
          auto_reply_error_code: "WHATSAPP_REPLY_RECOVERY_METADATA_INVALID",
          auto_reply_processing_at: null,
          auto_reply_retry_at: null,
          auto_reply_finished_at: new Date().toISOString(),
        });
        if (!persisted) throw new Error("WHATSAPP_REPLY_RECOVERY_PERSISTENCE_FAILED");
      }
      processed += 1;
      failed += 1;
      continue;
    }

    const result = await handleDeliveryCareButtonReply(event);
    if (result.status === "duplicate") continue;
    if (result.status === "db_unavailable") {
      throw new Error(result.errorCode || "WHATSAPP_REPLY_RECOVERY_DB_UNAVAILABLE");
    }

    processed += 1;
    if (result.status === "replied") replied += 1;
    if (result.status === "retryable_failed") retryable += 1;
    if (result.status === "failed" || result.status === "sender_mismatch") failed += 1;
    if (result.status === "ambiguous") ambiguous += 1;
  }

  return {
    processed,
    replied,
    retryable,
    failed,
    ambiguous,
    staleAmbiguous,
  };
}

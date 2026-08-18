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
  if (!db) return;
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
 * Processes only replies to AQUAVO's own delivered-order template. The original
 * outbound wamid (`context.id`) is the correlation key; the sender phone must also
 * match the phone stored on that order. The inbound message id is durably claimed
 * before any outbound auto-reply. Webhook retries can only repeat a send after an
 * explicit retryable provider rejection, never after an ambiguous transport state.
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
                 'choice', ${choice},
                 'button_payload', ${event.payload},
                 'button_text', ${event.buttonText},
                 'received_at', ${event.receivedAt},
                 'auto_reply_status', 'processing',
                 'auto_reply_attempts', 1
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
      && existingChoice === choice;

    if (
      sameCallback
      && existingStatus === "retryable_failed"
      && existingAttempts < MAX_AUTO_REPLY_ATTEMPTS
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
                      'auto_reply_retry_at', clock_timestamp()
                    ),
                 true
               ),
               updated_at=clock_timestamp()
         WHERE id=${jobId}
           AND metadata->'delivery_care_reply'->>'inbound_message_id'=${event.inboundMessageId}
           AND metadata->'delivery_care_reply'->>'context_provider_message_id'=${event.contextProviderMessageId}
           AND metadata->'delivery_care_reply'->>'choice'=${choice}
           AND metadata->'delivery_care_reply'->>'auto_reply_status'='retryable_failed'
           AND COALESCE((metadata->'delivery_care_reply'->>'auto_reply_attempts')::integer, 0) < ${MAX_AUTO_REPLY_ATTEMPTS}
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
    await mergeReplyMetadata(jobId, {
      auto_reply_status: "disabled",
      auto_reply_error_code: "WHATSAPP_REPLY_NOT_CONFIGURED",
      auto_reply_finished_at: new Date().toISOString(),
    });
    return {
      status: "disabled",
      jobId,
      orderId,
      choice,
      errorCode: "WHATSAPP_REPLY_NOT_CONFIGURED",
    };
  }

  try {
    const providerMessageId = await sendTextAutoReply(
      config,
      senderPhone,
      getDeliveryCareAutoReplyText(choice),
    );

    await mergeReplyMetadata(jobId, {
      auto_reply_status: "sent",
      auto_reply_provider_message_id: providerMessageId,
      auto_reply_error_code: null,
      auto_reply_finished_at: new Date().toISOString(),
    });

    return {
      status: "replied",
      jobId,
      orderId,
      choice,
      providerMessageId,
    };
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

    await mergeReplyMetadata(jobId, {
      auto_reply_status: storedStatus,
      auto_reply_error_code: sendError.code,
      auto_reply_finished_at: new Date().toISOString(),
    });

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
}

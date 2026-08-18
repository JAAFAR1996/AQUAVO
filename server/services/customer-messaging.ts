import { sql } from "drizzle-orm";
import { getDb } from "../db.js";

const WHATSAPP_REQUEST_TIMEOUT_MS = 7_000;
const MAX_SEND_ATTEMPTS = 5;
const STALE_SENDING_LEASE_MINUTES = 10;
const DEFAULT_WORKER_LIMIT = 5;
const MAX_WORKER_LIMIT = 10;
const RETRY_DELAYS_MS = [60_000, 5 * 60_000, 30 * 60_000, 2 * 60 * 60_000] as const;

export type CustomerMessageDispatchStatus =
  | "sent"
  | "disabled"
  | "not_due"
  | "already_handled"
  | "invalid_phone"
  | "retry_scheduled"
  | "failed"
  | "db_unavailable";

export interface CustomerMessageDispatchResult {
  status: CustomerMessageDispatchStatus;
  jobId?: string;
  providerMessageId?: string;
  errorCode?: string;
}

export type ManualRetryPrepareStatus =
  | "ready"
  | "db_unavailable"
  | "not_found"
  | "wrong_job_type"
  | "not_failed"
  | "order_not_delivered"
  | "unsafe_to_retry"
  | "conflict";

export interface ManualRetryPrepareResult {
  status: ManualRetryPrepareStatus;
  jobId?: string;
  orderId?: string;
  errorCode?: string;
}

type Row = Record<string, unknown>;

type ClaimedJob = {
  id: string;
  orderId: string;
  attemptCount: number;
};

type OrderRecipient = {
  customerName: string | null;
  customerPhone: string | null;
};

type WhatsAppConfig = {
  apiVersion: string;
  phoneNumberId: string;
  accessToken: string;
  deliveryCareTemplate: string;
  languageCode: string;
};

type MetaSendResponse = {
  messages?: Array<{ id?: string }>;
  error?: {
    code?: number;
    error_subcode?: number;
    type?: string;
    message?: string;
  };
};

class WhatsAppSendError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(code: string, retryable: boolean) {
    super(code);
    this.name = "WhatsAppSendError";
    this.code = code;
    this.retryable = retryable;
  }
}

function rowsOf(result: unknown): Row[] {
  if (Array.isArray(result)) return result as Row[];
  const rows = (result as { rows?: Row[] } | null)?.rows;
  return Array.isArray(rows) ? rows : [];
}

function digitsOnly(value: unknown): string {
  const arabicIndic = "٠١٢٣٤٥٦٧٨٩";
  const easternArabic = "۰۱۲۳۴۵۶۷۸۹";
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[٠-٩]/g, (digit) => String(arabicIndic.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String(easternArabic.indexOf(digit)))
    .replace(/\D/g, "");
}

/** Canonical WhatsApp recipient for Iraqi mobile numbers: 9647XXXXXXXXX. */
export function normalizeIraqiWhatsAppPhone(value: unknown): string | null {
  let digits = digitsOnly(value);
  if (!digits) return null;

  if (digits.startsWith("00964")) digits = digits.slice(2);
  if (digits.startsWith("9640")) digits = `964${digits.slice(4)}`;
  if (digits.startsWith("0") && digits.length === 11) digits = `964${digits.slice(1)}`;
  if (digits.startsWith("7") && digits.length === 10) digits = `964${digits}`;

  return /^9647\d{9}$/.test(digits) ? digits : null;
}

/**
 * The approved delivery-care copy uses the customer's first name only. We never
 * invent an honorific or fallback name: a malformed/missing name is held for
 * inspection instead of changing the approved customer-facing wording.
 */
export function buildCustomerFirstName(value: unknown): string | null {
  const raw = String(value ?? "")
    .normalize("NFKC")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!raw) return null;

  const first = raw.split(" ")[0]?.replace(/[^\p{L}\p{M}'’-]/gu, "") ?? "";
  if (first.length < 2 || first.length > 30) return null;
  if (!/[\p{L}]/u.test(first)) return null;

  return first;
}

export function retryDelayMs(attemptCount: number): number | null {
  if (!Number.isInteger(attemptCount) || attemptCount <= 0) return RETRY_DELAYS_MS[0];
  if (attemptCount >= MAX_SEND_ATTEMPTS) return null;
  return RETRY_DELAYS_MS[Math.min(attemptCount - 1, RETRY_DELAYS_MS.length - 1)];
}

/**
 * Manual retries are allowed only when we have evidence that the provider did
 * not accept the message. Transport ambiguity is deliberately excluded because
 * Meta may have accepted the first request even if our process never received a
 * wamid, and resending could duplicate the customer message.
 */
export function canManuallyRetryDeliveryCare(errorCode: unknown): boolean {
  const code = String(errorCode ?? "").trim();
  if (!code) return false;

  if ([
    "INVALID_IRAQI_MOBILE",
    "INVALID_CUSTOMER_NAME",
    "ORDER_NOT_DELIVERED_OR_MISSING",
  ].includes(code)) {
    return true;
  }

  return /^WHATSAPP_HTTP_\d{3}(?:_|$)/.test(code);
}

function readWhatsAppConfig(): WhatsAppConfig | null {
  if (process.env.WHATSAPP_CLOUD_ENABLED?.trim().toLowerCase() !== "true") return null;

  const apiVersion = process.env.WHATSAPP_API_VERSION?.trim() ?? "";
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() ?? "";
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim() ?? "";
  const deliveryCareTemplate = process.env.WHATSAPP_DELIVERY_CARE_TEMPLATE?.trim() ?? "";
  const languageCode = process.env.WHATSAPP_TEMPLATE_LANGUAGE?.trim() || "ar";

  if (!/^v\d+\.\d+$/.test(apiVersion)) return null;
  if (!/^\d+$/.test(phoneNumberId)) return null;
  if (!accessToken || !deliveryCareTemplate) return null;

  return { apiVersion, phoneNumberId, accessToken, deliveryCareTemplate, languageCode };
}

async function claimDeliveryCareJob(orderId: string): Promise<ClaimedJob | null> {
  const db = getDb();
  if (!db) return null;

  const result = await db.execute(sql`
    WITH candidate AS (
      SELECT id
      FROM public.customer_message_jobs
      WHERE order_id=${orderId}
        AND job_type='delivery_care'
        AND status='pending'
        AND attempt_count < ${MAX_SEND_ATTEMPTS}
        AND due_at <= clock_timestamp()
      ORDER BY due_at ASC, created_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    UPDATE public.customer_message_jobs AS job
       SET status='sending',
           attempt_count=job.attempt_count + 1,
           locked_at=clock_timestamp(),
           updated_at=clock_timestamp()
      FROM candidate
     WHERE job.id=candidate.id
    RETURNING job.id,job.order_id,job.attempt_count
  `);

  const row = rowsOf(result)[0];
  if (!row) return null;
  return {
    id: String(row.id),
    orderId: String(row.order_id),
    attemptCount: Number(row.attempt_count) || 1,
  };
}

async function loadOrderRecipient(orderId: string): Promise<OrderRecipient | null> {
  const db = getDb();
  if (!db) return null;

  const result = await db.execute(sql`
    SELECT customer_name,customer_phone
    FROM public.orders
    WHERE id=${orderId}
      AND status='delivered'
    LIMIT 1
  `);
  const row = rowsOf(result)[0];
  if (!row) return null;
  return {
    customerName: row.customer_name == null ? null : String(row.customer_name),
    customerPhone: row.customer_phone == null ? null : String(row.customer_phone),
  };
}

function compactMetaErrorCode(httpStatus: number, body: MetaSendResponse): string {
  const metaCode = Number(body.error?.code);
  const subcode = Number(body.error?.error_subcode);
  const suffix = Number.isFinite(metaCode)
    ? `_META_${metaCode}${Number.isFinite(subcode) ? `_${subcode}` : ""}`
    : "";
  return `WHATSAPP_HTTP_${httpStatus}${suffix}`.slice(0, 120);
}

async function sendDeliveryCareTemplate(
  config: WhatsAppConfig,
  recipientPhone: string,
  customerFirstName: string,
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
        type: "template",
        template: {
          name: config.deliveryCareTemplate,
          language: { code: config.languageCode },
          components: [
            {
              type: "body",
              parameters: [{ type: "text", text: customerFirstName }],
            },
          ],
        },
      }),
      signal: AbortSignal.timeout(WHATSAPP_REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    const code = name === "TimeoutError" || name === "AbortError"
      ? "WHATSAPP_TIMEOUT_AMBIGUOUS"
      : "WHATSAPP_NETWORK_AMBIGUOUS";

    // A transport failure can happen after Meta already accepted the request but
    // before the response reached us. Without a wamid there is no safe automatic
    // deduplication key, so prefer at-most-once customer messaging and escalate.
    throw new WhatsAppSendError(code, false);
  }

  let body: MetaSendResponse = {};
  try {
    body = await response.json() as MetaSendResponse;
  } catch {
    // Keep provider response bodies out of logs; an invalid JSON body is enough
    // to classify the failure without exposing arbitrary upstream content.
  }

  const providerMessageId = String(body.messages?.[0]?.id ?? "").trim();
  if (response.ok && providerMessageId) return providerMessageId;

  const code = compactMetaErrorCode(response.status, body);
  const retryable = response.status === 429 || response.status >= 500;
  throw new WhatsAppSendError(code, retryable);
}

async function markAccepted(jobId: string, providerMessageId: string): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db.execute(sql`
    UPDATE public.customer_message_jobs
       SET status='completed',
           provider_status='accepted',
           provider_message_id=${providerMessageId},
           accepted_at=clock_timestamp(),
           locked_at=NULL,
           last_error_code=NULL,
           last_error_at=NULL,
           updated_at=clock_timestamp()
     WHERE id=${jobId}
       AND status='sending'
  `);
}

async function markPermanentFailure(jobId: string, errorCode: string): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db.execute(sql`
    UPDATE public.customer_message_jobs
       SET status='failed',
           last_error_code=${errorCode},
           last_error_at=clock_timestamp(),
           locked_at=NULL,
           updated_at=clock_timestamp()
     WHERE id=${jobId}
       AND status='sending'
  `);
}

async function scheduleRetry(jobId: string, errorCode: string, dueAt: Date): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db.execute(sql`
    UPDATE public.customer_message_jobs
       SET status='pending',
           due_at=${dueAt},
           last_error_code=${errorCode},
           last_error_at=clock_timestamp(),
           locked_at=NULL,
           updated_at=clock_timestamp()
     WHERE id=${jobId}
       AND status='sending'
  `);
}

async function releaseClaimAsFailed(job: ClaimedJob, errorCode: string, retryable: boolean): Promise<CustomerMessageDispatchResult> {
  const delay = retryable ? retryDelayMs(job.attemptCount) : null;
  if (delay == null) {
    await markPermanentFailure(job.id, errorCode);
    return { status: "failed", jobId: job.id, errorCode };
  }

  await scheduleRetry(job.id, errorCode, new Date(Date.now() + delay));
  return { status: "retry_scheduled", jobId: job.id, errorCode };
}

/**
 * Requeues a failed delivery-care job only when its last failure is known-safe
 * to retry. Ambiguous network/timeout/stale-send failures are never requeued.
 * A successful manual reset starts a fresh bounded attempt window and records
 * the previous failure in metadata for operator auditability.
 */
export async function prepareFailedDeliveryCareRetry(jobId: string): Promise<ManualRetryPrepareResult> {
  const db = getDb();
  if (!db) return { status: "db_unavailable" };

  const normalizedJobId = String(jobId ?? "").trim();
  if (!normalizedJobId) return { status: "not_found" };

  const lookup = await db.execute(sql`
    SELECT job.id,
           job.order_id,
           job.job_type,
           job.status,
           job.last_error_code,
           job.provider_message_id,
           job.accepted_at,
           orders.status AS order_status
    FROM public.customer_message_jobs AS job
    JOIN public.orders AS orders ON orders.id=job.order_id
    WHERE job.id=${normalizedJobId}
    LIMIT 1
  `);
  const row = rowsOf(lookup)[0];
  if (!row) return { status: "not_found" };

  const orderId = String(row.order_id ?? "");
  const errorCode = String(row.last_error_code ?? "").trim();
  if (String(row.job_type) !== "delivery_care") {
    return { status: "wrong_job_type", jobId: normalizedJobId, orderId, errorCode };
  }
  if (String(row.status) !== "failed") {
    return { status: "not_failed", jobId: normalizedJobId, orderId, errorCode };
  }
  if (String(row.order_status) !== "delivered") {
    return { status: "order_not_delivered", jobId: normalizedJobId, orderId, errorCode };
  }
  if (row.provider_message_id != null || row.accepted_at != null || !canManuallyRetryDeliveryCare(errorCode)) {
    return { status: "unsafe_to_retry", jobId: normalizedJobId, orderId, errorCode };
  }

  const updated = await db.execute(sql`
    UPDATE public.customer_message_jobs AS job
       SET status='pending',
           due_at=clock_timestamp(),
           attempt_count=0,
           locked_at=NULL,
           last_error_code=NULL,
           last_error_at=NULL,
           updated_at=clock_timestamp(),
           metadata=jsonb_set(
             COALESCE(job.metadata, '{}'::jsonb),
             '{manual_retry_history}',
             COALESCE(job.metadata->'manual_retry_history', '[]'::jsonb)
             || jsonb_build_array(jsonb_build_object(
               'requested_at', clock_timestamp(),
               'previous_error_code', ${errorCode},
               'previous_attempt_count', job.attempt_count
             )),
             true
           )
      FROM public.orders AS orders
     WHERE job.id=${normalizedJobId}
       AND job.order_id=orders.id
       AND orders.status='delivered'
       AND job.job_type='delivery_care'
       AND job.status='failed'
       AND job.provider_message_id IS NULL
       AND job.accepted_at IS NULL
       AND job.last_error_code=${errorCode}
    RETURNING job.order_id
  `);

  const updatedRow = rowsOf(updated)[0];
  if (!updatedRow) {
    return { status: "conflict", jobId: normalizedJobId, orderId, errorCode };
  }

  return {
    status: "ready",
    jobId: normalizedJobId,
    orderId: String(updatedRow.order_id ?? orderId),
    errorCode,
  };
}

/**
 * Immediately attempts the care message created by the delivered-order DB trigger.
 * Order/accounting truth never depends on WhatsApp success: every error is converted
 * into a durable outbox state for later retry/inspection.
 *
 * The public result value "sent" is retained for admin-UI compatibility. Internally
 * the database records provider_status='accepted' because Meta returning a wamid does
 * not prove handset delivery; later webhook states are sent/delivered/read/failed.
 */
export async function dispatchDeliveryCareForOrder(orderId: string): Promise<CustomerMessageDispatchResult> {
  const db = getDb();
  if (!db) return { status: "db_unavailable" };

  const config = readWhatsAppConfig();
  if (!config) return { status: "disabled" };

  const job = await claimDeliveryCareJob(orderId);
  if (!job) {
    const lookup = await db.execute(sql`
      SELECT status,due_at,locked_at,attempt_count
      FROM public.customer_message_jobs
      WHERE order_id=${orderId} AND job_type='delivery_care'
      LIMIT 1
    `);
    const row = rowsOf(lookup)[0];
    if (!row) return { status: "already_handled" };
    if (String(row.status) === "pending") return { status: "not_due" };
    return { status: "already_handled" };
  }

  try {
    const recipient = await loadOrderRecipient(orderId);
    if (!recipient) {
      return await releaseClaimAsFailed(job, "ORDER_NOT_DELIVERED_OR_MISSING", false);
    }

    const phone = normalizeIraqiWhatsAppPhone(recipient.customerPhone);
    if (!phone) {
      await markPermanentFailure(job.id, "INVALID_IRAQI_MOBILE");
      return { status: "invalid_phone", jobId: job.id, errorCode: "INVALID_IRAQI_MOBILE" };
    }

    const firstName = buildCustomerFirstName(recipient.customerName);
    if (!firstName) {
      return await releaseClaimAsFailed(job, "INVALID_CUSTOMER_NAME", false);
    }

    const providerMessageId = await sendDeliveryCareTemplate(
      config,
      phone,
      firstName,
    );
    await markAccepted(job.id, providerMessageId);
    return { status: "sent", jobId: job.id, providerMessageId };
  } catch (error) {
    if (error instanceof WhatsAppSendError) {
      return await releaseClaimAsFailed(job, error.code, error.retryable);
    }
    return await releaseClaimAsFailed(job, "WHATSAPP_UNKNOWN_AMBIGUOUS", false);
  }
}

async function failStaleClaims(): Promise<number> {
  const db = getDb();
  if (!db) return 0;
  const result = await db.execute(sql`
    UPDATE public.customer_message_jobs
       SET status='failed',
           last_error_code='AMBIGUOUS_STALE_SEND_STATE',
           last_error_at=clock_timestamp(),
           locked_at=NULL,
           updated_at=clock_timestamp()
     WHERE job_type='delivery_care'
       AND status='sending'
       AND locked_at IS NOT NULL
       AND locked_at <= clock_timestamp() - (${STALE_SENDING_LEASE_MINUTES} * interval '1 minute')
    RETURNING id
  `);
  return rowsOf(result).length;
}

/**
 * Durable recovery worker used by the external GitHub Actions scheduler on Vercel
 * Hobby. Pending jobs are retried when the provider explicitly returned a retryable
 * HTTP failure. Ambiguous stale in-flight sends are failed for manual inspection
 * rather than resent, which avoids duplicate customer messages.
 */
export async function runDueDeliveryCareJobs(limit = DEFAULT_WORKER_LIMIT): Promise<{
  processed: number;
  sent: number;
  retried: number;
  failed: number;
  staleFailed: number;
}> {
  const db = getDb();
  if (!db || !readWhatsAppConfig()) {
    return { processed: 0, sent: 0, retried: 0, failed: 0, staleFailed: 0 };
  }

  const safeLimit = Math.max(1, Math.min(MAX_WORKER_LIMIT, Math.floor(limit)));
  const staleFailed = await failStaleClaims();
  const due = await db.execute(sql`
    SELECT order_id
    FROM public.customer_message_jobs
    WHERE job_type='delivery_care'
      AND status='pending'
      AND attempt_count < ${MAX_SEND_ATTEMPTS}
      AND due_at <= clock_timestamp()
    ORDER BY due_at ASC,created_at ASC
    LIMIT ${safeLimit}
  `);

  let sent = 0;
  let retried = 0;
  let failed = 0;
  let processed = 0;

  for (const row of rowsOf(due)) {
    const orderId = String(row.order_id ?? "");
    if (!orderId) continue;
    const result = await dispatchDeliveryCareForOrder(orderId);
    if (result.status === "sent") sent += 1;
    if (result.status === "retry_scheduled") retried += 1;
    if (result.status === "failed" || result.status === "invalid_phone") failed += 1;
    if (!["already_handled", "not_due", "disabled", "db_unavailable"].includes(result.status)) processed += 1;
  }

  return { processed, sent, retried, failed, staleFailed };
}
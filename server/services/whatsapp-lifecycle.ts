import { sql } from "drizzle-orm";
import { getDb } from "../db.js";
import {
  buildCustomerFirstName,
  normalizeIraqiWhatsAppPhone,
} from "./customer-messaging.js";
import {
  reconcileWhatsAppProviderEvents,
} from "./whatsapp-provider-status.js";
import { escapeHtml, sendTelegramMessage } from "./order-notifications.js";

type Row = Record<string, unknown>;

export type LifecycleReplyEvent = {
  inboundMessageId: string;
  contextProviderMessageId: string;
  fromPhone: string;
  receivedAt: Date;
  payload: string;
  buttonText: string;
};

export type LifecycleReplyStatus =
  | "handled"
  | "duplicate"
  | "unmatched"
  | "db_unavailable";

type LifecycleConfig = {
  apiVersion: string;
  phoneNumberId: string;
  accessToken: string;
  languageCode: string;
  activationAt: Date;
  day7Template: string | null;
  repurchaseTemplate: string | null;
  repurchaseEnabled: boolean;
};

type LifecycleChoice =
  | "day7_ok"
  | "day7_help"
  | "repurchase_interest"
  | "repurchase_stop";

type ClaimedLifecycleJob = {
  id: string;
  orderId: string;
  jobType: "day7_care" | "repurchase";
  attemptCount: number;
};

type LifecycleContext = {
  id: string;
  orderId: string;
  jobType: "day7_care" | "repurchase";
  customerPhone: string;
  customerName: string | null;
  orderNumber: string;
  orderStatus: string;
  paymentStatus: string;
  codReceived: boolean;
  isTest: boolean;
  recommendedProductIds: string[];
  marketingOptIn: boolean;
  marketingOptInAt: Date | null;
  marketingOptOutAt: Date | null;
  supportIssueOpen: boolean;
  originalOrderCreatedAt: Date;
};

const REQUEST_TIMEOUT_MS = 7_000;
const MAX_ATTEMPTS = 5;
const STALE_SENDING_MINUTES = 10;
const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 10;
const RETRY_DELAYS_MS = [60_000, 5 * 60_000, 30 * 60_000, 2 * 60 * 60_000] as const;
const MARKETING_FREQUENCY_CAP_DAYS = 30;

const DAY7_OK_PAYLOAD = "AQUAVO_DAY7_OK";
const DAY7_HELP_PAYLOAD = "AQUAVO_DAY7_HELP";
const REPURCHASE_INTEREST_PAYLOAD = "AQUAVO_REPURCHASE_INTEREST";
const REPURCHASE_STOP_PAYLOAD = "AQUAVO_REPURCHASE_STOP";

class LifecycleSendError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(code: string, retryable: boolean) {
    super(code);
    this.name = "LifecycleSendError";
    this.code = code;
    this.retryable = retryable;
  }
}

function rowsOf(result: unknown): Row[] {
  if (Array.isArray(result)) return result as Row[];
  const rows = (result as { rows?: Row[] } | null)?.rows;
  return Array.isArray(rows) ? rows : [];
}

function asDate(value: unknown): Date | null {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value;
  const date = new Date(String(value ?? ""));
  return Number.isFinite(date.getTime()) ? date : null;
}

function parseJsonArray(value: unknown): string[] {
  const parsed = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? (() => { try { return JSON.parse(value); } catch { return []; } })()
      : [];
  if (!Array.isArray(parsed)) return [];
  return parsed.map((item) => String(item ?? "").trim()).filter(Boolean);
}

function readLifecycleConfig(): LifecycleConfig | null {
  if (process.env.WHATSAPP_CLOUD_ENABLED?.trim().toLowerCase() !== "true") return null;
  if (process.env.WHATSAPP_LIFECYCLE_ENABLED?.trim().toLowerCase() !== "true") return null;

  const apiVersion = process.env.WHATSAPP_API_VERSION?.trim() ?? "";
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() ?? "";
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim() ?? "";
  const languageCode = process.env.WHATSAPP_TEMPLATE_LANGUAGE?.trim() || "ar";
  const activationRaw = process.env.WHATSAPP_LIFECYCLE_ACTIVATION_AT?.trim() ?? "";
  const activationAt = activationRaw ? new Date(activationRaw) : new Date(Number.NaN);
  const day7Template = process.env.WHATSAPP_DAY7_CARE_TEMPLATE?.trim() || null;
  const repurchaseTemplate = process.env.WHATSAPP_REPURCHASE_TEMPLATE?.trim() || null;
  const repurchaseEnabled = process.env.WHATSAPP_REPURCHASE_ENABLED?.trim().toLowerCase() === "true";

  if (!/^v\d+\.\d+$/.test(apiVersion)) return null;
  if (!/^\d+$/.test(phoneNumberId)) return null;
  if (!accessToken) return null;
  if (!activationRaw || !Number.isFinite(activationAt.getTime())) return null;
  if (activationAt.getTime() > Date.now()) return null;
  if (!day7Template && !(repurchaseEnabled && repurchaseTemplate)) return null;

  return {
    apiVersion,
    phoneNumberId,
    accessToken,
    languageCode,
    activationAt,
    day7Template,
    repurchaseTemplate,
    repurchaseEnabled,
  };
}

function baghdadClock(): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Baghdad",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  return {
    hour: Number(parts.find((part) => part.type === "hour")?.value ?? 0),
    minute: Number(parts.find((part) => part.type === "minute")?.value ?? 0),
  };
}

/**
 * Proactive lifecycle messages are deliberately restricted to a daytime window
 * in Iraq. A five-minute worker leaves due rows untouched outside the window and
 * picks them up later; no fake exact send time is promised to the customer.
 */
export function isBaghdadLifecycleSendWindow(): boolean {
  const { hour, minute } = baghdadClock();
  const total = hour * 60 + minute;
  return total >= 10 * 60 && total <= 19 * 60 + 30;
}

function retryDelayMs(attemptCount: number): number | null {
  if (!Number.isInteger(attemptCount) || attemptCount <= 0) return RETRY_DELAYS_MS[0];
  if (attemptCount >= MAX_ATTEMPTS) return null;
  return RETRY_DELAYS_MS[Math.min(attemptCount - 1, RETRY_DELAYS_MS.length - 1)];
}

function compactMetaErrorCode(httpStatus: number, body: any): string {
  const metaCode = Number(body?.error?.code);
  const subcode = Number(body?.error?.error_subcode);
  const suffix = Number.isFinite(metaCode)
    ? `_META_${metaCode}${Number.isFinite(subcode) ? `_${subcode}` : ""}`
    : "";
  return `WHATSAPP_HTTP_${httpStatus}${suffix}`.slice(0, 120);
}

function resolveLifecycleChoice(payload: string, buttonText: string): LifecycleChoice | null {
  const rawPayload = String(payload ?? "").trim();
  const text = String(buttonText ?? "").normalize("NFKC").trim();

  if (rawPayload === DAY7_OK_PAYLOAD || text === "كلشي تمام") return "day7_ok";
  if (
    rawPayload === DAY7_HELP_PAYLOAD
    || text === "أحتاج مساعدة"
    || text === "احتاج مساعدة"
    || text === "عندي سؤال"
  ) return "day7_help";
  if (
    rawPayload === REPURCHASE_INTEREST_PAYLOAD
    || text === "أحتاجه"
    || text === "احتاجه"
    || text === "أحتاج المنتج"
  ) return "repurchase_interest";
  if (
    rawPayload === REPURCHASE_STOP_PAYLOAD
    || text === "إيقاف التذكيرات"
    || text === "ايقاف التذكيرات"
    || text === "إلغاء التذكيرات"
    || text === "الغاء التذكيرات"
  ) return "repurchase_stop";

  return null;
}

function jobTypeForChoice(choice: LifecycleChoice): "day7_care" | "repurchase" {
  return choice.startsWith("day7_") ? "day7_care" : "repurchase";
}

async function cancelUnsafeBacklog(config: LifecycleConfig): Promise<number> {
  const db = getDb();
  if (!db) return 0;

  const result = await db.execute(sql`
    UPDATE public.customer_lifecycle_jobs
       SET status='suppressed',
           last_error_code='LIFECYCLE_PRE_ACTIVATION',
           last_error_at=clock_timestamp(),
           locked_at=NULL,
           updated_at=clock_timestamp(),
           metadata=metadata || jsonb_build_object(
             'suppressReason','pre_activation',
             'suppressedAt',clock_timestamp()
           )
     WHERE channel='whatsapp'
       AND status IN ('planned','ready')
       AND (
         created_at < ${config.activationAt}
         OR (
           NULLIF(metadata->>'deliveredAt','') IS NOT NULL
           AND (metadata->>'deliveredAt')::timestamptz < ${config.activationAt}
         )
       )
    RETURNING id
  `);

  return rowsOf(result).length;
}

async function failStaleLifecycleClaims(): Promise<number> {
  const db = getDb();
  if (!db) return 0;

  const result = await db.execute(sql`
    UPDATE public.customer_lifecycle_jobs
       SET status='failed',
           last_error_code='AMBIGUOUS_STALE_SEND_STATE',
           last_error_at=clock_timestamp(),
           locked_at=NULL,
           updated_at=clock_timestamp()
     WHERE channel='whatsapp'
       AND status='sending'
       AND locked_at IS NOT NULL
       AND locked_at <= clock_timestamp() - (${STALE_SENDING_MINUTES} * interval '1 minute')
    RETURNING id
  `);

  return rowsOf(result).length;
}

async function claimLifecycleJob(jobId: string, config: LifecycleConfig): Promise<ClaimedLifecycleJob | null> {
  const db = getDb();
  if (!db) return null;

  const result = await db.execute(sql`
    UPDATE public.customer_lifecycle_jobs AS job
       SET status='sending',
           attempt_count=job.attempt_count+1,
           locked_at=clock_timestamp(),
           updated_at=clock_timestamp()
     WHERE job.id=${jobId}
       AND job.channel='whatsapp'
       AND job.status='ready'
       AND job.created_at >= ${config.activationAt}
       AND job.attempt_count < ${MAX_ATTEMPTS}
       AND job.due_at <= clock_timestamp()
    RETURNING job.id,job.order_id,job.job_type,job.attempt_count
  `);

  const row = rowsOf(result)[0];
  if (!row) return null;
  const type = String(row.job_type);
  if (type !== "day7_care" && type !== "repurchase") return null;
  return {
    id: String(row.id),
    orderId: String(row.order_id),
    jobType: type,
    attemptCount: Number(row.attempt_count) || 1,
  };
}

async function loadLifecycleContext(job: ClaimedLifecycleJob): Promise<LifecycleContext | null> {
  const db = getDb();
  if (!db) return null;

  const result = await db.execute(sql`
    SELECT
      j.id,j.order_id,j.job_type,j.recommended_product_ids,
      o.order_number,o.customer_name,o.customer_phone,o.status AS order_status,
      o.payment_status,COALESCE(o.cod_received,false) AS cod_received,
      COALESCE(o.is_test,false) AS is_test,o.created_at AS order_created_at,
      COALESCE(cp.whatsapp_marketing_opt_in,false) AS marketing_opt_in,
      cp.whatsapp_marketing_opt_in_at,cp.whatsapp_marketing_opt_out_at,
      (
        EXISTS (
          SELECT 1
          FROM public.customer_message_jobs dc
          WHERE dc.order_id=o.id
            AND dc.job_type='delivery_care'
            AND COALESCE(
              dc.metadata->'delivery_care_reply'->>'latest_choice',
              dc.metadata->'delivery_care_reply'->>'choice'
            )='issue'
        )
        OR EXISTS (
          SELECT 1
          FROM public.customer_lifecycle_jobs followup
          WHERE followup.order_id=o.id
            AND followup.job_type='day7_care'
            AND COALESCE(
              followup.metadata->'reply'->>'latest_choice',
              followup.metadata->'reply'->>'choice'
            )='day7_help'
        )
      ) AS support_issue_open
    FROM public.customer_lifecycle_jobs j
    JOIN public.orders o ON o.id=j.order_id
    LEFT JOIN public.customer_profiles cp
      ON cp.phone=public.aquavo_normalize_iraqi_phone(o.customer_phone)
    WHERE j.id=${job.id}
    LIMIT 1
  `);

  const row = rowsOf(result)[0];
  if (!row) return null;
  const jobType = String(row.job_type);
  if (jobType !== "day7_care" && jobType !== "repurchase") return null;

  return {
    id: String(row.id),
    orderId: String(row.order_id),
    jobType,
    customerPhone: String(row.customer_phone ?? ""),
    customerName: row.customer_name == null ? null : String(row.customer_name),
    orderNumber: String(row.order_number ?? row.order_id ?? ""),
    orderStatus: String(row.order_status ?? ""),
    paymentStatus: String(row.payment_status ?? ""),
    codReceived: Boolean(row.cod_received),
    isTest: Boolean(row.is_test),
    recommendedProductIds: parseJsonArray(row.recommended_product_ids),
    marketingOptIn: Boolean(row.marketing_opt_in),
    marketingOptInAt: asDate(row.whatsapp_marketing_opt_in_at),
    marketingOptOutAt: asDate(row.whatsapp_marketing_opt_out_at),
    supportIssueOpen: Boolean(row.support_issue_open),
    originalOrderCreatedAt: asDate(row.order_created_at) ?? new Date(0),
  };
}

async function suppressLifecycleJob(jobId: string, reason: string): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db.execute(sql`
    UPDATE public.customer_lifecycle_jobs
       SET status='suppressed',
           locked_at=NULL,
           last_error_code=${reason.slice(0,120)},
           last_error_at=clock_timestamp(),
           metadata=metadata || jsonb_build_object(
             'suppressReason',${reason.slice(0,120)},
             'suppressedAt',clock_timestamp()
           ),
           updated_at=clock_timestamp()
     WHERE id=${jobId}
       AND status='sending'
  `);
}

async function failLifecycleJob(jobId: string, errorCode: string): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db.execute(sql`
    UPDATE public.customer_lifecycle_jobs
       SET status='failed',
           locked_at=NULL,
           last_error_code=${errorCode.slice(0,120)},
           last_error_at=clock_timestamp(),
           updated_at=clock_timestamp()
     WHERE id=${jobId}
       AND status='sending'
  `);
}

async function scheduleLifecycleRetry(job: ClaimedLifecycleJob, errorCode: string): Promise<"retry" | "failed"> {
  const db = getDb();
  if (!db) return "failed";
  const delay = retryDelayMs(job.attemptCount);
  if (delay == null) {
    await failLifecycleJob(job.id, errorCode);
    return "failed";
  }

  await db.execute(sql`
    UPDATE public.customer_lifecycle_jobs
       SET status='ready',
           due_at=${new Date(Date.now() + delay)},
           locked_at=NULL,
           last_error_code=${errorCode.slice(0,120)},
           last_error_at=clock_timestamp(),
           updated_at=clock_timestamp()
     WHERE id=${job.id}
       AND status='sending'
  `);
  return "retry";
}

async function alreadyReplenished(context: LifecycleContext): Promise<boolean> {
  const db = getDb();
  if (!db || context.recommendedProductIds.length === 0) return false;

  const result = await db.execute(sql`
    SELECT EXISTS (
      SELECT 1
      FROM public.orders later
      JOIN public.order_items_relational li ON li.order_id=later.id
      WHERE COALESCE(later.is_test,false)=false
        AND later.status='delivered'
        AND later.payment_status='paid'
        AND later.cod_received=true
        AND public.aquavo_normalize_iraqi_phone(later.customer_phone)
            =public.aquavo_normalize_iraqi_phone(${context.customerPhone})
        AND later.created_at > ${context.originalOrderCreatedAt}
        AND li.product_id IN (
          SELECT jsonb_array_elements_text(${JSON.stringify(context.recommendedProductIds)}::jsonb)
        )
    ) AS replenished
  `);
  return Boolean(rowsOf(result)[0]?.replenished);
}

async function marketingFrequencyCapReached(context: LifecycleContext): Promise<boolean> {
  const db = getDb();
  if (!db) return true;

  const result = await db.execute(sql`
    SELECT EXISTS (
      SELECT 1
      FROM public.customer_lifecycle_jobs sent
      JOIN public.orders so ON so.id=sent.order_id
      WHERE sent.id<>${context.id}
        AND sent.job_type='repurchase'
        AND sent.channel='whatsapp'
        AND sent.status='completed'
        AND sent.accepted_at >= clock_timestamp() - (${MARKETING_FREQUENCY_CAP_DAYS} * interval '1 day')
        AND public.aquavo_normalize_iraqi_phone(so.customer_phone)
            =public.aquavo_normalize_iraqi_phone(${context.customerPhone})
    ) AS capped
  `);

  return Boolean(rowsOf(result)[0]?.capped);
}

async function chooseRepurchaseProduct(context: LifecycleContext): Promise<string | null> {
  const db = getDb();
  if (!db || context.recommendedProductIds.length === 0) return null;

  const result = await db.execute(sql`
    SELECT p.name
    FROM public.products p
    WHERE p.id IN (
      SELECT jsonb_array_elements_text(${JSON.stringify(context.recommendedProductIds)}::jsonb)
    )
      AND p.deleted_at IS NULL
      AND COALESCE(p.stock,0)>0
      AND COALESCE(p.is_storefront_visible,true)=true
    ORDER BY array_position(
      ARRAY(SELECT jsonb_array_elements_text(${JSON.stringify(context.recommendedProductIds)}::jsonb)),
      p.id
    )
    LIMIT 1
  `);
  const row = rowsOf(result)[0];
  return row?.name == null ? null : String(row.name).trim().slice(0,120);
}

async function sendTemplate(
  config: LifecycleConfig,
  input: {
    templateName: string;
    to: string;
    bodyParameters: string[];
    buttons: Array<{ index: string; payload: string }>;
  },
): Promise<string> {
  const endpoint = `https://graph.facebook.com/${config.apiVersion}/${encodeURIComponent(config.phoneNumberId)}/messages`;

  const request = async (includePayloads: boolean): Promise<{ response: Response; body: any }> => {
    let response: Response;
    try {
      const components: Array<Record<string, unknown>> = [{
        type: "body",
        parameters: input.bodyParameters.map((value) => ({ type: "text", text: value })),
      }];

      if (includePayloads) {
        for (const button of input.buttons) {
          components.push({
            type: "button",
            sub_type: "quick_reply",
            index: button.index,
            parameters: [{ type: "payload", payload: button.payload }],
          });
        }
      }

      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: input.to,
          type: "template",
          template: {
            name: input.templateName,
            language: { code: config.languageCode },
            components,
          },
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      const name = error instanceof Error ? error.name : "";
      const code = name === "TimeoutError" || name === "AbortError"
        ? "WHATSAPP_TIMEOUT_AMBIGUOUS"
        : "WHATSAPP_NETWORK_AMBIGUOUS";
      throw new LifecycleSendError(code, false);
    }

    let body: any = {};
    try { body = await response.json(); } catch { /* no provider body in logs */ }
    return { response, body };
  };

  let attempt = await request(true);
  let wamid = String(attempt.body?.messages?.[0]?.id ?? "").trim();
  if (attempt.response.ok && wamid) return wamid;

  // Same safe compatibility fallback used by immediate delivery-care.
  if (attempt.response.status === 400 && Number(attempt.body?.error?.code) === 132018) {
    attempt = await request(false);
    wamid = String(attempt.body?.messages?.[0]?.id ?? "").trim();
    if (attempt.response.ok && wamid) return wamid;
  }

  const code = compactMetaErrorCode(attempt.response.status, attempt.body);
  const retryable = attempt.response.status === 429 || attempt.response.status >= 500;
  throw new LifecycleSendError(code, retryable);
}

async function markLifecycleAccepted(jobId: string, providerMessageId: string, context: LifecycleContext): Promise<boolean> {
  const db = getDb();
  if (!db) return false;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const updated = await db.execute(sql`
        UPDATE public.customer_lifecycle_jobs
           SET status='completed',
               provider_message_id=COALESCE(provider_message_id,${providerMessageId}),
               provider_status=CASE WHEN status='sending' THEN 'accepted' ELSE provider_status END,
               provider_status_at=CASE WHEN status='sending' THEN NULL ELSE provider_status_at END,
               accepted_at=COALESCE(accepted_at,clock_timestamp()),
               locked_at=NULL,
               last_error_code=CASE WHEN status='sending' THEN NULL ELSE last_error_code END,
               last_error_at=CASE WHEN status='sending' THEN NULL ELSE last_error_at END,
               updated_at=clock_timestamp()
         WHERE id=${jobId}
           AND (
             status='sending'
             OR (status='completed' AND provider_message_id=${providerMessageId})
           )
        RETURNING id
      `);

      if (rowsOf(updated).length > 0) {
        if (context.jobType === "repurchase") {
          await db.execute(sql`
            UPDATE public.customer_profiles
               SET whatsapp_marketing_last_message_at=clock_timestamp(),
                   updated_at=clock_timestamp()
             WHERE phone=public.aquavo_normalize_iraqi_phone(${context.customerPhone})
          `);
        }
        try { await reconcileWhatsAppProviderEvents(providerMessageId); } catch { /* durable inbox recovers later */ }
        return true;
      }
      return false;
    } catch {
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 75));
      }
    }
  }
  return false;
}

async function dispatchLifecycleJob(jobId: string, config: LifecycleConfig): Promise<"sent"|"retry"|"failed"|"suppressed"|"noop"> {
  const job = await claimLifecycleJob(jobId, config);
  if (!job) return "noop";

  try {
    const context = await loadLifecycleContext(job);
    if (!context) {
      await failLifecycleJob(job.id, "LIFECYCLE_CONTEXT_MISSING");
      return "failed";
    }

    if (
      context.isTest
      || context.orderStatus !== "delivered"
      || context.paymentStatus !== "paid"
      || !context.codReceived
    ) {
      await suppressLifecycleJob(job.id, "ORDER_NO_LONGER_ELIGIBLE");
      return "suppressed";
    }

    if (context.supportIssueOpen) {
      await suppressLifecycleJob(job.id, "SUPPORT_ISSUE_OPEN");
      return "suppressed";
    }

    const phone = normalizeIraqiWhatsAppPhone(context.customerPhone);
    if (!phone) {
      await failLifecycleJob(job.id, "INVALID_IRAQI_MOBILE");
      return "failed";
    }

    const firstName = buildCustomerFirstName(context.customerName);
    if (!firstName) {
      await failLifecycleJob(job.id, "INVALID_CUSTOMER_NAME");
      return "failed";
    }

    let templateName: string | null = null;
    let bodyParameters: string[] = [];
    let buttons: Array<{ index: string; payload: string }> = [];

    if (context.jobType === "day7_care") {
      templateName = config.day7Template;
      if (!templateName) {
        await suppressLifecycleJob(job.id, "DAY7_TEMPLATE_NOT_CONFIGURED");
        return "suppressed";
      }
      bodyParameters = [firstName, context.orderNumber];
      buttons = [
        { index: "0", payload: DAY7_OK_PAYLOAD },
        { index: "1", payload: DAY7_HELP_PAYLOAD },
      ];
    } else {
      if (!config.repurchaseEnabled || !config.repurchaseTemplate) {
        await suppressLifecycleJob(job.id, "REPURCHASE_AUTOMATION_DISABLED");
        return "suppressed";
      }

      const consentIsCurrent = context.marketingOptIn
        && context.marketingOptInAt != null
        && (
          context.marketingOptOutAt == null
          || context.marketingOptInAt.getTime() > context.marketingOptOutAt.getTime()
        );
      if (!consentIsCurrent) {
        await suppressLifecycleJob(job.id, "MARKETING_OPT_IN_REQUIRED");
        return "suppressed";
      }

      if (await alreadyReplenished(context)) {
        await suppressLifecycleJob(job.id, "ALREADY_REPLENISHED");
        return "suppressed";
      }

      if (await marketingFrequencyCapReached(context)) {
        await suppressLifecycleJob(job.id, "MARKETING_FREQUENCY_CAP_30D");
        return "suppressed";
      }

      const productName = await chooseRepurchaseProduct(context);
      if (!productName) {
        await suppressLifecycleJob(job.id, "RECOMMENDED_PRODUCT_UNAVAILABLE");
        return "suppressed";
      }

      templateName = config.repurchaseTemplate;
      bodyParameters = [firstName, productName];
      buttons = [
        { index: "0", payload: REPURCHASE_INTEREST_PAYLOAD },
        { index: "1", payload: REPURCHASE_STOP_PAYLOAD },
      ];
    }

    const providerMessageId = await sendTemplate(config, {
      templateName,
      to: phone,
      bodyParameters,
      buttons,
    });

    const persisted = await markLifecycleAccepted(job.id, providerMessageId, context);
    if (!persisted) {
      await failLifecycleJob(job.id, "WHATSAPP_ACCEPTED_PERSISTENCE_AMBIGUOUS");
      return "failed";
    }
    return "sent";
  } catch (error) {
    if (error instanceof LifecycleSendError) {
      if (error.retryable) return await scheduleLifecycleRetry(job, error.code);
      await failLifecycleJob(job.id, error.code);
      return "failed";
    }
    await failLifecycleJob(job.id, "WHATSAPP_UNKNOWN_AMBIGUOUS");
    return "failed";
  }
}

export async function runDueLifecycleWhatsAppJobs(limit = DEFAULT_LIMIT): Promise<{
  enabled: boolean;
  outsideSendWindow: boolean;
  processed: number;
  sent: number;
  retried: number;
  failed: number;
  suppressed: number;
  staleFailed: number;
  preActivationSuppressed: number;
}> {
  const db = getDb();
  const config = readLifecycleConfig();
  if (!db || !config) {
    return {
      enabled: false,
      outsideSendWindow: false,
      processed: 0,
      sent: 0,
      retried: 0,
      failed: 0,
      suppressed: 0,
      staleFailed: 0,
      preActivationSuppressed: 0,
    };
  }

  const preActivationSuppressed = await cancelUnsafeBacklog(config);
  const staleFailed = await failStaleLifecycleClaims();

  if (!isBaghdadLifecycleSendWindow()) {
    return {
      enabled: true,
      outsideSendWindow: true,
      processed: 0,
      sent: 0,
      retried: 0,
      failed: 0,
      suppressed: 0,
      staleFailed,
      preActivationSuppressed,
    };
  }

  const safeLimit = Math.max(1, Math.min(MAX_LIMIT, Math.floor(Number(limit) || DEFAULT_LIMIT)));
  const due = await db.execute(sql`
    SELECT id
    FROM public.customer_lifecycle_jobs
    WHERE channel='whatsapp'
      AND status='ready'
      AND created_at >= ${config.activationAt}
      AND attempt_count < ${MAX_ATTEMPTS}
      AND due_at <= clock_timestamp()
      AND job_type IN ('day7_care','repurchase')
    ORDER BY due_at ASC,created_at ASC
    LIMIT ${safeLimit}
  `);

  let processed = 0;
  let sent = 0;
  let retried = 0;
  let failed = 0;
  let suppressed = 0;

  for (const row of rowsOf(due)) {
    const id = String(row.id ?? "");
    if (!id) continue;
    const result = await dispatchLifecycleJob(id, config);
    if (result === "noop") continue;
    processed += 1;
    if (result === "sent") sent += 1;
    else if (result === "retry") retried += 1;
    else if (result === "failed") failed += 1;
    else if (result === "suppressed") suppressed += 1;
  }

  return {
    enabled: true,
    outsideSendWindow: false,
    processed,
    sent,
    retried,
    failed,
    suppressed,
    staleFailed,
    preActivationSuppressed,
  };
}

async function setMarketingOptOut(
  canonicalPhone: string,
  sourceEventId: string,
  orderId: string | null,
  occurredAt: Date,
): Promise<void> {
  const db = getDb();
  if (!db) throw new Error("DB_UNAVAILABLE");

  await db.execute(sql`
    WITH updated AS (
      UPDATE public.customer_profiles
         SET whatsapp_marketing_opt_in=false,
             whatsapp_marketing_opt_out_at=${occurredAt},
             whatsapp_marketing_consent_source='whatsapp',
             updated_at=clock_timestamp()
       WHERE phone=${canonicalPhone}
       RETURNING phone
    )
    INSERT INTO public.customer_messaging_consent_events(
      customer_phone,order_id,event_type,source,source_event_id,metadata,occurred_at
    )
    SELECT
      ${canonicalPhone},${orderId},'marketing_opt_out','whatsapp',${sourceEventId},
      jsonb_build_object('channel','whatsapp','purpose','replenishment'),
      ${occurredAt}
    FROM updated
    ON CONFLICT (source,source_event_id)
      WHERE source_event_id IS NOT NULL
    DO NOTHING
  `);

  await db.execute(sql`
    UPDATE public.customer_lifecycle_jobs j
       SET status='suppressed',
           last_error_code='MARKETING_OPTED_OUT',
           last_error_at=clock_timestamp(),
           metadata=j.metadata || jsonb_build_object(
             'suppressReason','marketing_opted_out',
             'suppressedAt',clock_timestamp()
           ),
           updated_at=clock_timestamp()
      FROM public.orders o
     WHERE j.order_id=o.id
       AND j.job_type='repurchase'
       AND j.status IN ('planned','ready')
       AND public.aquavo_normalize_iraqi_phone(o.customer_phone)=${canonicalPhone}
  `);
}

export async function handleLifecycleReply(event: LifecycleReplyEvent): Promise<LifecycleReplyStatus> {
  const choice = resolveLifecycleChoice(event.payload,event.buttonText);
  if (!choice) return "unmatched";

  const db = getDb();
  if (!db) return "db_unavailable";

  const jobType = jobTypeForChoice(choice);
  const senderPhone = normalizeIraqiWhatsAppPhone(event.fromPhone);
  if (!senderPhone) return "unmatched";

  const result = await db.execute(sql`
    SELECT j.id,j.order_id,j.job_type,j.metadata,
           o.customer_phone,o.customer_name,o.order_number
    FROM public.customer_lifecycle_jobs j
    JOIN public.orders o ON o.id=j.order_id
    WHERE j.provider_message_id=${event.contextProviderMessageId}
      AND j.job_type=${jobType}
      AND j.status='completed'
    LIMIT 1
  `);
  const row = rowsOf(result)[0];
  if (!row) return "unmatched";

  const orderPhone = normalizeIraqiWhatsAppPhone(row.customer_phone);
  if (!orderPhone || orderPhone !== senderPhone) return "unmatched";

  const existingInbound = String((row.metadata as any)?.reply?.inbound_message_id ?? "").trim();
  if (existingInbound === event.inboundMessageId) return "duplicate";

  const jobId = String(row.id);
  const orderId = String(row.order_id);
  const update = await db.execute(sql`
    UPDATE public.customer_lifecycle_jobs
       SET metadata=jsonb_set(
             COALESCE(metadata,'{}'::jsonb),
             '{reply}',
             CASE
               WHEN metadata->'reply' IS NULL THEN
                 jsonb_build_object(
                   'inbound_message_id',${event.inboundMessageId},
                   'choice',${choice},
                   'received_at',${event.receivedAt},
                   'latest_choice',${choice},
                   'latest_choice_at',${event.receivedAt},
                   'subsequent_choices','[]'::jsonb
                 )
               ELSE
                 metadata->'reply'
                 || jsonb_build_object(
                      'latest_choice',${choice},
                      'latest_choice_at',${event.receivedAt},
                      'subsequent_choices',
                        COALESCE(metadata->'reply'->'subsequent_choices','[]'::jsonb)
                        || jsonb_build_array(
                             jsonb_build_object(
                               'inbound_message_id',${event.inboundMessageId},
                               'choice',${choice},
                               'received_at',${event.receivedAt}
                             )
                           )
                    )
             END,
             true
           ),
           updated_at=clock_timestamp()
     WHERE id=${jobId}
       AND metadata->'reply'->>'inbound_message_id' IS DISTINCT FROM ${event.inboundMessageId}
       AND NOT EXISTS (
         SELECT 1
         FROM jsonb_array_elements(
           COALESCE(metadata->'reply'->'subsequent_choices','[]'::jsonb)
         ) item
         WHERE item->>'inbound_message_id'=${event.inboundMessageId}
       )
    RETURNING id
  `);

  if (rowsOf(update).length === 0) return "duplicate";

  // Opt-out is terminal from a marketing perspective and must win even if the
  // same customer previously tapped "أحتاجه" on this message.
  if (choice === "repurchase_stop") {
    await setMarketingOptOut(senderPhone,event.inboundMessageId,orderId,event.receivedAt);
  }

  if (choice === "day7_help" || choice === "repurchase_interest") {
    const intentLabel = choice === "day7_help"
      ? "الزبون طلب مساعدة بعد المتابعة"
      : "الزبون مهتم بإعادة الشراء";
    const customerName = String(row.customer_name ?? "").trim();
    const orderNumber = String(row.order_number ?? orderId).trim();
    const waUrl = `https://wa.me/${senderPhone}`;
    const alert = [
      "🔔 <b>AQUAVO — رد يحتاج متابعة</b>",
      "",
      `<b>الحالة:</b> ${escapeHtml(intentLabel)}`,
      customerName ? `<b>الزبون:</b> ${escapeHtml(customerName)}` : "",
      `<b>الطلب:</b> <code>${escapeHtml(orderNumber)}</code>`,
      `<a href="${waUrl}">فتح محادثة WhatsApp</a>`,
    ].filter(Boolean).join("\n");
    void sendTelegramMessage(alert).catch(() => {
      // The reply is already durable in PostgreSQL. Telegram is only a fast
      // operator alert and must never determine whether the customer reply exists.
    });
  }

  return "handled";
}

export async function recordPendingLifecycleReply(event: LifecycleReplyEvent): Promise<boolean> {
  const choice = resolveLifecycleChoice(event.payload,event.buttonText);
  const senderPhone = normalizeIraqiWhatsAppPhone(event.fromPhone);
  if (!choice || !senderPhone) return false;

  const db = getDb();
  if (!db) throw new Error("DB_UNAVAILABLE");

  const result = await db.execute(sql`
    INSERT INTO public.whatsapp_lifecycle_reply_events(
      inbound_message_id,context_provider_message_id,sender_phone,
      button_payload,button_text,received_at
    ) VALUES(
      ${event.inboundMessageId},${event.contextProviderMessageId},${senderPhone},
      ${event.payload},${event.buttonText},${event.receivedAt}
    )
    ON CONFLICT(inbound_message_id) DO NOTHING
    RETURNING id
  `);
  return rowsOf(result).length > 0;
}

export async function reconcilePendingLifecycleReplies(limit = 25): Promise<number> {
  const db = getDb();
  if (!db) return 0;
  const safeLimit = Math.max(1,Math.min(100,Math.floor(Number(limit)||25)));

  const pending = await db.execute(sql`
    SELECT id,inbound_message_id,context_provider_message_id,sender_phone,
           button_payload,button_text,received_at
    FROM public.whatsapp_lifecycle_reply_events
    WHERE applied_at IS NULL
    ORDER BY received_at ASC,created_at ASC
    LIMIT ${safeLimit}
  `);

  let applied = 0;
  for (const row of rowsOf(pending)) {
    const event: LifecycleReplyEvent = {
      inboundMessageId:String(row.inbound_message_id ?? ""),
      contextProviderMessageId:String(row.context_provider_message_id ?? ""),
      fromPhone:String(row.sender_phone ?? ""),
      receivedAt:asDate(row.received_at) ?? new Date(0),
      payload:String(row.button_payload ?? ""),
      buttonText:String(row.button_text ?? ""),
    };
    const result = await handleLifecycleReply(event);
    if (result === "unmatched") continue;
    if (result === "db_unavailable") throw new Error("DB_UNAVAILABLE");

    const marked = await db.execute(sql`
      UPDATE public.whatsapp_lifecycle_reply_events
         SET applied_at=clock_timestamp()
       WHERE id=${String(row.id)}
         AND applied_at IS NULL
      RETURNING id
    `);
    applied += rowsOf(marked).length;
  }
  return applied;
}

export async function cleanupLifecycleReplyInbox(limit = 500): Promise<number> {
  const db = getDb();
  if (!db) return 0;
  const safeLimit = Math.max(1,Math.min(2000,Math.floor(Number(limit)||500)));
  const result = await db.execute(sql`
    WITH expired AS (
      SELECT id
      FROM public.whatsapp_lifecycle_reply_events
      WHERE (
        applied_at IS NOT NULL
        AND applied_at <= clock_timestamp()-interval '1 day'
      ) OR (
        applied_at IS NULL
        AND created_at <= clock_timestamp()-interval '7 days'
      )
      ORDER BY created_at ASC
      LIMIT ${safeLimit}
    )
    DELETE FROM public.whatsapp_lifecycle_reply_events e
    USING expired
    WHERE e.id=expired.id
    RETURNING e.id
  `);
  return rowsOf(result).length;
}

export async function recordCheckoutWhatsAppMarketingOptIn(orderIdInput: string): Promise<{
  ok: boolean;
  reason?: string;
  customerPhone?: string;
}> {
  const db = getDb();
  if (!db) return { ok: false, reason: "database_not_connected" };

  const orderId = String(orderIdInput ?? "").trim();
  if (!orderId) return { ok: false, reason: "invalid_order_id" };

  // Idempotent order-level evidence. A repeated checkout response never moves
  // the original consent timestamp forward and therefore cannot resurrect an
  // opt-in that the customer later revoked.
  const updated = await db.execute(sql`
    UPDATE public.orders
       SET whatsapp_marketing_opt_in=true,
           whatsapp_marketing_opt_in_at=COALESCE(whatsapp_marketing_opt_in_at,clock_timestamp()),
           updated_at=clock_timestamp()
     WHERE id=${orderId}
       AND COALESCE(is_test,false)=false
     RETURNING customer_phone,whatsapp_marketing_opt_in_at
  `);
  const order = rowsOf(updated)[0];
  if (!order) return { ok: false, reason: "eligible_order_not_found" };

  const customerPhone = normalizeIraqiWhatsAppPhone(order.customer_phone);
  const consentAt = asDate(order.whatsapp_marketing_opt_in_at);
  if (!customerPhone || !consentAt) {
    return { ok: false, reason: "invalid_customer_identity" };
  }

  // The canonical CRM row is phone-centric and can represent guest orders. The
  // refresh function is already non-financial and idempotent.
  await db.execute(sql`SELECT public.aquavo_refresh_customer_profile(${customerPhone})`);

  // Only a consent event newer than the latest opt-out may reactivate marketing.
  // Historical/replayed order evidence is preserved in the audit ledger but
  // cannot override a later customer stop request.
  await db.execute(sql`
    UPDATE public.customer_profiles
       SET whatsapp_marketing_opt_in=CASE
             WHEN whatsapp_marketing_opt_out_at IS NULL
               OR ${consentAt} > whatsapp_marketing_opt_out_at
             THEN true
             ELSE whatsapp_marketing_opt_in
           END,
           whatsapp_marketing_opt_in_at=CASE
             WHEN whatsapp_marketing_opt_out_at IS NULL
               OR ${consentAt} > whatsapp_marketing_opt_out_at
             THEN GREATEST(
               COALESCE(whatsapp_marketing_opt_in_at,'-infinity'::timestamptz),
               ${consentAt}
             )
             ELSE whatsapp_marketing_opt_in_at
           END,
           whatsapp_marketing_opt_out_at=CASE
             WHEN whatsapp_marketing_opt_out_at IS NOT NULL
               AND ${consentAt} > whatsapp_marketing_opt_out_at
             THEN NULL
             ELSE whatsapp_marketing_opt_out_at
           END,
           whatsapp_marketing_consent_source=CASE
             WHEN whatsapp_marketing_opt_out_at IS NULL
               OR ${consentAt} > whatsapp_marketing_opt_out_at
             THEN 'checkout'
             ELSE whatsapp_marketing_consent_source
           END,
           whatsapp_marketing_source_order_id=CASE
             WHEN whatsapp_marketing_opt_out_at IS NULL
               OR ${consentAt} > whatsapp_marketing_opt_out_at
             THEN ${orderId}
             ELSE whatsapp_marketing_source_order_id
           END,
           updated_at=clock_timestamp()
     WHERE phone=${customerPhone}
  `);

  await db.execute(sql`
    INSERT INTO public.customer_messaging_consent_events(
      customer_phone,order_id,event_type,source,source_event_id,metadata,occurred_at
    ) VALUES(
      ${customerPhone},${orderId},'marketing_opt_in','checkout',
      ${"order:" + orderId},
      jsonb_build_object('channel','whatsapp','purpose','replenishment'),
      ${consentAt}
    )
    ON CONFLICT (source,source_event_id)
      WHERE source_event_id IS NOT NULL
    DO NOTHING
  `);

  return { ok: true, customerPhone };
}

/**
 * Daily repair for the deliberate non-blocking checkout boundary. If commerce
 * succeeded but the post-commit CRM write had a transient failure, the order's
 * durable opt-in flag is enough to reconstruct the consent ledger later.
 */
export async function syncCheckoutWhatsAppMarketingConsents(limitInput = 200): Promise<{
  candidates: number;
  repaired: number;
  failed: number;
}> {
  const db = getDb();
  if (!db) return { candidates: 0, repaired: 0, failed: 0 };

  const limit = Math.max(1, Math.min(1000, Math.floor(Number(limitInput) || 200)));
  const pending = await db.execute(sql`
    SELECT o.id
    FROM public.orders o
    WHERE COALESCE(o.is_test,false)=false
      AND o.whatsapp_marketing_opt_in=true
      AND o.whatsapp_marketing_opt_in_at IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.customer_messaging_consent_events e
        WHERE e.source='checkout'
          AND e.source_event_id='order:' || o.id
      )
    ORDER BY o.whatsapp_marketing_opt_in_at ASC,o.id ASC
    LIMIT ${limit}
  `);

  let repaired = 0;
  let failed = 0;
  for (const row of rowsOf(pending)) {
    const id = String(row.id ?? "").trim();
    if (!id) continue;
    try {
      const result = await recordCheckoutWhatsAppMarketingOptIn(id);
      if (result.ok) repaired += 1;
      else failed += 1;
    } catch {
      failed += 1;
    }
  }

  return { candidates: rowsOf(pending).length, repaired, failed };
}

export async function getWhatsAppLifecycleAutomationHealth() {
  const db = getDb();
  if (!db) throw new Error("DATABASE_NOT_CONNECTED");

  const result = await db.execute(sql`
    SELECT
      COUNT(*) FILTER(WHERE channel='whatsapp' AND status='planned')::int AS planned,
      COUNT(*) FILTER(WHERE channel='whatsapp' AND status='ready')::int AS ready,
      COUNT(*) FILTER(WHERE channel='whatsapp' AND status='completed')::int AS completed,
      COUNT(*) FILTER(WHERE channel='whatsapp' AND status='failed')::int AS failed,
      COUNT(*) FILTER(WHERE channel='whatsapp' AND status='suppressed')::int AS suppressed,
      COUNT(*) FILTER(WHERE channel='whatsapp' AND provider_status='read')::int AS read_count
    FROM public.customer_lifecycle_jobs
  `);
  const consent = await db.execute(sql`
    SELECT
      COUNT(*) FILTER(WHERE whatsapp_marketing_opt_in=true)::int AS opted_in,
      COUNT(*) FILTER(WHERE whatsapp_marketing_opt_out_at IS NOT NULL)::int AS opted_out
    FROM public.customer_profiles
  `);
  return {
    configured:Boolean(readLifecycleConfig()),
    sendWindowOpen:isBaghdadLifecycleSendWindow(),
    jobs:rowsOf(result)[0] ?? {},
    consent:rowsOf(consent)[0] ?? {},
  };
}

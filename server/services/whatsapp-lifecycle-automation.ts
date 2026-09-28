import { sql } from "drizzle-orm";
import { getDb } from "../db.js";
import {
  buildCustomerFirstName,
  normalizeIraqiWhatsAppPhone,
} from "./customer-messaging.js";
import { reconcileWhatsAppProviderEvents } from "./whatsapp-provider-status.js";

const REQUEST_TIMEOUT_MS = 7_000;
const MAX_SEND_ATTEMPTS = 5;
const STALE_SEND_MINUTES = 10;
const DEFAULT_WORKER_LIMIT = 5;
const MAX_WORKER_LIMIT = 10;
const RETRY_DELAYS_MS = [
  5 * 60_000,
  30 * 60_000,
  2 * 60 * 60_000,
  6 * 60 * 60_000,
] as const;

type Row = Record<string, unknown>;
type LifecycleJobType = "day7_care" | "repurchase";
type ConsentAction = "opt_in" | "opt_out";

type LifecycleWhatsAppConfig = {
  apiVersion: string;
  phoneNumberId: string;
  accessToken: string;
  languageCode: string;
  day7Template: string;
  repurchaseTemplate: string;
  activationAt: Date;
  sendStartHour: number;
  sendEndHour: number;
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

type ClaimedLifecycleJob = {
  id: string;
  orderId: string;
  jobType: LifecycleJobType;
  attemptCount: number;
};

class LifecycleSendError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly ambiguous: boolean;

  constructor(code: string, options: { retryable?: boolean; ambiguous?: boolean } = {}) {
    super(code);
    this.name = "LifecycleSendError";
    this.code = code;
    this.retryable = options.retryable === true;
    this.ambiguous = options.ambiguous === true;
  }
}

function rowsOf(result: unknown): Row[] {
  if (Array.isArray(result)) return result as Row[];
  const rows = (result as { rows?: Row[] } | null)?.rows;
  return Array.isArray(rows) ? rows : [];
}

function boundedHour(value: unknown, fallback: number): number {
  const hour = Number(value);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return fallback;
  return hour;
}

function readLifecycleConfig(): LifecycleWhatsAppConfig | null {
  if (process.env.WHATSAPP_CLOUD_ENABLED?.trim().toLowerCase() !== "true") return null;
  if (process.env.WHATSAPP_LIFECYCLE_AUTOMATION_ENABLED?.trim().toLowerCase() !== "true") return null;
  if (process.env.WHATSAPP_LIFECYCLE_TEMPLATES_APPROVED?.trim().toLowerCase() !== "true") return null;

  const apiVersion = process.env.WHATSAPP_API_VERSION?.trim() ?? "";
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() ?? "";
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim() ?? "";
  const languageCode = process.env.WHATSAPP_TEMPLATE_LANGUAGE?.trim() || "ar";
  const day7Template = process.env.WHATSAPP_DAY7_TEMPLATE?.trim() ?? "";
  const repurchaseTemplate = process.env.WHATSAPP_REPURCHASE_TEMPLATE?.trim() ?? "";
  const activationRaw = process.env.WHATSAPP_LIFECYCLE_ACTIVATION_AT?.trim() ?? "";
  const activationAt = activationRaw ? new Date(activationRaw) : new Date(Number.NaN);
  const sendStartHour = boundedHour(process.env.WHATSAPP_LIFECYCLE_SEND_START_HOUR, 10);
  const sendEndHour = boundedHour(process.env.WHATSAPP_LIFECYCLE_SEND_END_HOUR, 20);

  if (!/^v\d+\.\d+$/.test(apiVersion)) return null;
  if (!/^\d+$/.test(phoneNumberId)) return null;
  if (!accessToken || !day7Template || !repurchaseTemplate) return null;
  if (!activationRaw || !Number.isFinite(activationAt.getTime())) return null;
  if (activationAt.getTime() > Date.now()) return null;
  if (sendStartHour >= sendEndHour) return null;

  return {
    apiVersion,
    phoneNumberId,
    accessToken,
    languageCode,
    day7Template,
    repurchaseTemplate,
    activationAt,
    sendStartHour,
    sendEndHour,
  };
}

export function getLifecycleWhatsAppReadiness() {
  const activationRaw = process.env.WHATSAPP_LIFECYCLE_ACTIVATION_AT?.trim() ?? "";
  const activationAt = activationRaw ? new Date(activationRaw) : null;
  const start = boundedHour(process.env.WHATSAPP_LIFECYCLE_SEND_START_HOUR, 10);
  const end = boundedHour(process.env.WHATSAPP_LIFECYCLE_SEND_END_HOUR, 20);
  const config = readLifecycleConfig();

  return {
    enabled: Boolean(config),
    cloudEnabled: process.env.WHATSAPP_CLOUD_ENABLED?.trim().toLowerCase() === "true",
    lifecycleEnabled: process.env.WHATSAPP_LIFECYCLE_AUTOMATION_ENABLED?.trim().toLowerCase() === "true",
    templatesApproved: process.env.WHATSAPP_LIFECYCLE_TEMPLATES_APPROVED?.trim().toLowerCase() === "true",
    apiVersionConfigured: /^v\d+\.\d+$/.test(process.env.WHATSAPP_API_VERSION?.trim() ?? ""),
    phoneNumberConfigured: /^\d+$/.test(process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() ?? ""),
    tokenConfigured: Boolean(process.env.WHATSAPP_ACCESS_TOKEN?.trim()),
    day7TemplateConfigured: Boolean(process.env.WHATSAPP_DAY7_TEMPLATE?.trim()),
    repurchaseTemplateConfigured: Boolean(process.env.WHATSAPP_REPURCHASE_TEMPLATE?.trim()),
    activationAt: activationAt && Number.isFinite(activationAt.getTime()) ? activationAt.toISOString() : null,
    sendWindowBaghdad: { startHour: start, endHour: end },
  };
}

function baghdadHour(now = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Baghdad",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "-1");
  return Number.isInteger(hour) ? hour : -1;
}

function withinSendWindow(config: LifecycleWhatsAppConfig, now = new Date()): boolean {
  const hour = baghdadHour(now);
  return hour >= config.sendStartHour && hour < config.sendEndHour;
}

function compactMetaErrorCode(httpStatus: number, body: MetaSendResponse): string {
  const metaCode = Number(body.error?.code);
  const subcode = Number(body.error?.error_subcode);
  const suffix = Number.isFinite(metaCode)
    ? `_META_${metaCode}${Number.isFinite(subcode) ? `_${subcode}` : ""}`
    : "";
  return `WHATSAPP_LIFECYCLE_HTTP_${httpStatus}${suffix}`.slice(0, 120);
}

function retryDelayMs(attemptCount: number): number | null {
  if (!Number.isInteger(attemptCount) || attemptCount <= 0) return RETRY_DELAYS_MS[0];
  if (attemptCount >= MAX_SEND_ATTEMPTS) return null;
  return RETRY_DELAYS_MS[Math.min(attemptCount - 1, RETRY_DELAYS_MS.length - 1)];
}

function normalizeConsentCommand(value: unknown): string {
  return String(value ?? "")
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("ar")
    .replace(/[.!؟?،,;؛:]+$/u, "")
    .replace(/\s+/g, " ");
}

const OPT_OUT_COMMANDS = new Set([
  "إيقاف",
  "ايقاف",
  "وقف",
  "إلغاء",
  "الغاء",
  "stop",
  "unsubscribe",
  "وەستاندن",
  "وەستێنە",
]);

const OPT_IN_COMMANDS = new Set([
  "اشتراك",
  "تفعيل",
  "ابدأ",
  "إبدأ",
  "start",
  "subscribe",
  "دەستپێکردن",
  "دەستپێبکە",
]);

export function classifyLifecycleConsentCommand(value: unknown): ConsentAction | null {
  const command = normalizeConsentCommand(value);
  if (OPT_OUT_COMMANDS.has(command)) return "opt_out";
  if (OPT_IN_COMMANDS.has(command)) return "opt_in";
  return null;
}

export async function recordCheckoutWhatsAppConsent(input: {
  phone: string;
  customerName?: string | null;
  orderId?: string | null;
  optedIn: boolean;
}): Promise<{ ok: boolean; phone?: string; reason?: string }> {
  if (!input.optedIn) return { ok: true, reason: "not_opted_in" };

  const phone = normalizeIraqiWhatsAppPhone(input.phone);
  if (!phone) return { ok: false, reason: "invalid_phone" };

  const db = getDb();
  if (!db) return { ok: false, reason: "db_unavailable" };

  const name = String(input.customerName ?? "").trim().slice(0, 255) || null;
  await db.transaction(async (tx) => {
    await tx.execute(sql`
      INSERT INTO public.customer_profiles(
        phone,name,whatsapp_followup_opt_in,whatsapp_followup_opt_in_at,
        whatsapp_marketing_opt_in,whatsapp_marketing_opt_in_at,
        whatsapp_followup_opt_out_at,whatsapp_consent_source,
        whatsapp_consent_updated_at,created_at,updated_at
      ) VALUES(
        ${phone},${name},true,clock_timestamp(),true,clock_timestamp(),
        NULL,'checkout',clock_timestamp(),clock_timestamp(),clock_timestamp()
      )
      ON CONFLICT(phone) DO UPDATE SET
        name=COALESCE(NULLIF(public.customer_profiles.name,''),EXCLUDED.name),
        whatsapp_followup_opt_in=true,
        whatsapp_followup_opt_in_at=clock_timestamp(),
        whatsapp_marketing_opt_in=true,
        whatsapp_marketing_opt_in_at=clock_timestamp(),
        whatsapp_followup_opt_out_at=NULL,
        whatsapp_consent_source='checkout',
        whatsapp_consent_updated_at=clock_timestamp(),
        updated_at=clock_timestamp()
    `);

    await tx.execute(sql`
      INSERT INTO public.whatsapp_lifecycle_consent_events(
        customer_phone,action,scope,source,order_id,occurred_at,metadata
      ) VALUES(
        ${phone},'opt_in','all','checkout',${input.orderId ?? null},
        clock_timestamp(),jsonb_build_object('version','checkout_v1')
      )
      ON CONFLICT DO NOTHING
    `);
  });

  return { ok: true, phone };
}

export async function handleLifecycleConsentInbound(input: {
  inboundMessageId: string;
  fromPhone: string;
  text: string;
  receivedAt: Date;
}): Promise<{ status: "ignored" | "applied" | "duplicate" | "db_unavailable"; action?: ConsentAction }> {
  const action = classifyLifecycleConsentCommand(input.text);
  if (!action) return { status: "ignored" };

  const phone = normalizeIraqiWhatsAppPhone(input.fromPhone);
  if (!phone) return { status: "ignored", action };

  const inboundMessageId = String(input.inboundMessageId ?? "").trim().slice(0, 500);
  if (!inboundMessageId || !Number.isFinite(input.receivedAt.getTime())) {
    return { status: "ignored", action };
  }

  const db = getDb();
  if (!db) return { status: "db_unavailable", action };

  return db.transaction(async (tx) => {
    const inserted = await tx.execute(sql`
      INSERT INTO public.whatsapp_lifecycle_consent_events(
        inbound_message_id,customer_phone,action,scope,source,occurred_at,metadata
      ) VALUES(
        ${inboundMessageId},${phone},${action},'all','whatsapp_reply',
        ${input.receivedAt},jsonb_build_object('version','reply_command_v1')
      )
      ON CONFLICT(inbound_message_id) DO NOTHING
      RETURNING id
    `);
    if (rowsOf(inserted).length === 0) return { status: "duplicate" as const, action };

    if (action === "opt_out") {
      await tx.execute(sql`
        INSERT INTO public.customer_profiles(
          phone,whatsapp_followup_opt_in,whatsapp_marketing_opt_in,
          whatsapp_followup_opt_out_at,whatsapp_consent_source,
          whatsapp_consent_updated_at,created_at,updated_at
        ) VALUES(
          ${phone},false,false,${input.receivedAt},'whatsapp_reply',
          ${input.receivedAt},clock_timestamp(),clock_timestamp()
        )
        ON CONFLICT(phone) DO UPDATE SET
          whatsapp_followup_opt_in=false,
          whatsapp_marketing_opt_in=false,
          whatsapp_followup_opt_out_at=${input.receivedAt},
          whatsapp_consent_source='whatsapp_reply',
          whatsapp_consent_updated_at=${input.receivedAt},
          updated_at=clock_timestamp()
      `);

      await tx.execute(sql`
        UPDATE public.customer_lifecycle_jobs
        SET status='suppressed',
            metadata=metadata || jsonb_build_object(
              'suppressReason','customer_opt_out',
              'suppressedAt',${input.receivedAt}
            ),
            updated_at=clock_timestamp()
        WHERE customer_phone=${phone}
          AND status IN ('planned','ready')
      `);
    } else {
      await tx.execute(sql`
        INSERT INTO public.customer_profiles(
          phone,whatsapp_followup_opt_in,whatsapp_followup_opt_in_at,
          whatsapp_marketing_opt_in,whatsapp_marketing_opt_in_at,
          whatsapp_followup_opt_out_at,whatsapp_consent_source,
          whatsapp_consent_updated_at,created_at,updated_at
        ) VALUES(
          ${phone},true,${input.receivedAt},true,${input.receivedAt},
          NULL,'whatsapp_reply',${input.receivedAt},clock_timestamp(),clock_timestamp()
        )
        ON CONFLICT(phone) DO UPDATE SET
          whatsapp_followup_opt_in=true,
          whatsapp_followup_opt_in_at=${input.receivedAt},
          whatsapp_marketing_opt_in=true,
          whatsapp_marketing_opt_in_at=${input.receivedAt},
          whatsapp_followup_opt_out_at=NULL,
          whatsapp_consent_source='whatsapp_reply',
          whatsapp_consent_updated_at=${input.receivedAt},
          updated_at=clock_timestamp()
      `);
    }

    return { status: "applied" as const, action };
  });
}

async function sendTemplate(
  config: LifecycleWhatsAppConfig,
  recipientPhone: string,
  templateName: string,
  bodyParameters: string[],
): Promise<string> {
  const endpoint =
    `https://graph.facebook.com/${config.apiVersion}/${encodeURIComponent(config.phoneNumberId)}/messages`;

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
          name: templateName,
          language: { code: config.languageCode },
          components: [{
            type: "body",
            parameters: bodyParameters.map((parameter) => ({
              type: "text",
              text: parameter,
            })),
          }],
        },
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    const code = name === "TimeoutError" || name === "AbortError"
      ? "WHATSAPP_LIFECYCLE_TIMEOUT_AMBIGUOUS"
      : "WHATSAPP_LIFECYCLE_NETWORK_AMBIGUOUS";
    throw new LifecycleSendError(code, { ambiguous: true });
  }

  let body: MetaSendResponse = {};
  try {
    body = await response.json() as MetaSendResponse;
  } catch {
    // Never persist or log provider payloads that could include sensitive data.
  }

  const providerMessageId = String(body.messages?.[0]?.id ?? "").trim();
  if (response.ok && providerMessageId) return providerMessageId;

  if (response.ok) {
    throw new LifecycleSendError("WHATSAPP_LIFECYCLE_ACCEPTANCE_AMBIGUOUS", {
      ambiguous: true,
    });
  }

  const retryable = response.status === 429 || response.status >= 500;
  throw new LifecycleSendError(compactMetaErrorCode(response.status, body), { retryable });
}

async function failStaleSendingClaims(): Promise<number> {
  const db = getDb();
  if (!db) return 0;
  const result = await db.execute(sql`
    UPDATE public.customer_lifecycle_jobs
    SET status=CASE WHEN provider_message_id IS NULL THEN 'failed' ELSE 'completed' END,
        completed_at=CASE WHEN provider_message_id IS NULL THEN completed_at ELSE COALESCE(completed_at,clock_timestamp()) END,
        last_error_code=CASE
          WHEN provider_message_id IS NULL THEN 'WHATSAPP_LIFECYCLE_STALE_SENDING_AMBIGUOUS'
          ELSE last_error_code
        END,
        last_error_at=CASE
          WHEN provider_message_id IS NULL THEN clock_timestamp()
          ELSE last_error_at
        END,
        locked_at=NULL,
        updated_at=clock_timestamp()
    WHERE channel='whatsapp'
      AND status='sending'
      AND locked_at <= clock_timestamp() - (${STALE_SEND_MINUTES} * interval '1 minute')
    RETURNING id
  `);
  return rowsOf(result).length;
}

async function suppressUnsafeDueJobs(config: LifecycleWhatsAppConfig): Promise<{
  preActivation: number;
  consentRevoked: number;
  stale: number;
  issueOpen: number;
  alreadyReplenished: number;
}> {
  const db = getDb();
  if (!db) return { preActivation: 0, consentRevoked: 0, stale: 0, issueOpen: 0, alreadyReplenished: 0 };

  const preActivation = await db.execute(sql`
    UPDATE public.customer_lifecycle_jobs
    SET status='suppressed',
        metadata=metadata || jsonb_build_object(
          'suppressReason','lifecycle_pre_activation',
          'suppressedAt',clock_timestamp()
        ),
        updated_at=clock_timestamp()
    WHERE channel='whatsapp'
      AND status IN ('planned','ready')
      AND created_at < ${config.activationAt}
    RETURNING id
  `);

  const consentRevoked = await db.execute(sql`
    UPDATE public.customer_lifecycle_jobs j
    SET status='suppressed',
        metadata=j.metadata || jsonb_build_object(
          'suppressReason','consent_not_active',
          'suppressedAt',clock_timestamp()
        ),
        updated_at=clock_timestamp()
    WHERE j.channel='whatsapp'
      AND j.status IN ('planned','ready')
      AND NOT EXISTS (
        SELECT 1
        FROM public.customer_profiles cp
        WHERE cp.phone=j.customer_phone
          AND (
            (j.job_type='day7_care' AND cp.whatsapp_followup_opt_in=true)
            OR
            (j.job_type='repurchase' AND cp.whatsapp_marketing_opt_in=true)
          )
          AND (
            cp.whatsapp_followup_opt_out_at IS NULL
            OR COALESCE(
              CASE WHEN j.job_type='day7_care' THEN cp.whatsapp_followup_opt_in_at END,
              CASE WHEN j.job_type='repurchase' THEN cp.whatsapp_marketing_opt_in_at END
            ) > cp.whatsapp_followup_opt_out_at
          )
      )
    RETURNING j.id
  `);

  const stale = await db.execute(sql`
    UPDATE public.customer_lifecycle_jobs
    SET status='suppressed',
        metadata=metadata || jsonb_build_object(
          'suppressReason','lifecycle_stale',
          'suppressedAt',clock_timestamp()
        ),
        updated_at=clock_timestamp()
    WHERE channel='whatsapp'
      AND status IN ('planned','ready')
      AND (
        (job_type='day7_care' AND due_at < clock_timestamp() - interval '14 days')
        OR
        (job_type='repurchase' AND due_at < clock_timestamp() - interval '45 days')
      )
    RETURNING id
  `);

  const issueOpen = await db.execute(sql`
    UPDATE public.customer_lifecycle_jobs j
    SET status='suppressed',
        metadata=j.metadata || jsonb_build_object(
          'suppressReason','delivery_issue_reported',
          'suppressedAt',clock_timestamp()
        ),
        updated_at=clock_timestamp()
    WHERE j.channel='whatsapp'
      AND j.status IN ('planned','ready')
      AND EXISTS (
        SELECT 1
        FROM public.customer_message_jobs m
        WHERE m.order_id=j.order_id
          AND m.job_type='delivery_care'
          AND COALESCE(
            m.metadata->'delivery_care_reply'->>'latest_choice',
            m.metadata->'delivery_care_reply'->>'choice'
          )='delivery_issue'
      )
    RETURNING j.id
  `);

  const alreadyReplenished = await db.execute(sql`
    UPDATE public.customer_lifecycle_jobs j
    SET status='suppressed',
        metadata=j.metadata || jsonb_build_object(
          'suppressReason','already_replenished',
          'suppressedAt',clock_timestamp()
        ),
        updated_at=clock_timestamp()
    WHERE j.channel='whatsapp'
      AND j.job_type='repurchase'
      AND j.status IN ('planned','ready')
      AND EXISTS (
        SELECT 1
        FROM public.orders later
        JOIN public.order_items_relational li ON li.order_id=later.id
        WHERE COALESCE(later.is_test,false)=false
          AND later.status='delivered'
          AND later.payment_status='paid'
          AND later.cod_received=true
          AND public.aquavo_normalize_iraqi_phone(later.customer_phone)=j.customer_phone
          AND later.created_at > (
            SELECT original.created_at FROM public.orders original WHERE original.id=j.order_id
          )
          AND li.product_id IN (
            SELECT jsonb_array_elements_text(j.recommended_product_ids)
          )
      )
    RETURNING j.id
  `);

  // AQUAVO's own marketing cap: one automated replenishment template per phone
  // per rolling 30 days. Delay rather than suppress so a legitimate reminder
  // remains eligible later without producing repeated nudges.
  await db.execute(sql`
    WITH recent AS (
      SELECT
        pending.id,
        MAX(COALESCE(sent.accepted_at,sent.completed_at,sent.sent_at,sent.updated_at)) AS last_sent_at
      FROM public.customer_lifecycle_jobs pending
      JOIN public.customer_lifecycle_jobs sent
        ON sent.customer_phone=pending.customer_phone
       AND sent.job_type='repurchase'
       AND sent.status='completed'
       AND COALESCE(sent.provider_status,'accepted')<>'failed'
       AND sent.id<>pending.id
      WHERE pending.channel='whatsapp'
        AND pending.job_type='repurchase'
        AND pending.status IN ('planned','ready')
      GROUP BY pending.id
    )
    UPDATE public.customer_lifecycle_jobs j
    SET due_at=GREATEST(j.due_at,recent.last_sent_at+interval '30 days'),
        status='planned',
        metadata=j.metadata || jsonb_build_object(
          'frequencyCapAppliedAt',clock_timestamp(),
          'frequencyCapDays',30
        ),
        updated_at=clock_timestamp()
    FROM recent
    WHERE j.id=recent.id
      AND recent.last_sent_at IS NOT NULL
      AND recent.last_sent_at > clock_timestamp()-interval '30 days'
      AND j.due_at < recent.last_sent_at+interval '30 days'
  `);

  return {
    preActivation: rowsOf(preActivation).length,
    consentRevoked: rowsOf(consentRevoked).length,
    stale: rowsOf(stale).length,
    issueOpen: rowsOf(issueOpen).length,
    alreadyReplenished: rowsOf(alreadyReplenished).length,
  };
}

async function promoteDueJobs(): Promise<number> {
  const db = getDb();
  if (!db) return 0;
  const result = await db.execute(sql`
    UPDATE public.customer_lifecycle_jobs
    SET status='ready',updated_at=clock_timestamp()
    WHERE channel='whatsapp'
      AND status='planned'
      AND due_at<=clock_timestamp()
    RETURNING id
  `);
  return rowsOf(result).length;
}

async function claimDueJob(config: LifecycleWhatsAppConfig): Promise<ClaimedLifecycleJob | null> {
  const db = getDb();
  if (!db) return null;
  const result = await db.execute(sql`
    WITH candidate AS (
      SELECT j.id
      FROM public.customer_lifecycle_jobs j
      JOIN public.orders o ON o.id=j.order_id
      JOIN public.customer_profiles cp ON cp.phone=j.customer_phone
      WHERE j.channel='whatsapp'
        AND j.status='ready'
        AND j.created_at>=${config.activationAt}
        AND j.due_at<=clock_timestamp()
        AND j.attempt_count<${MAX_SEND_ATTEMPTS}
        AND o.status='delivered'
        AND o.payment_status='paid'
        AND o.cod_received=true
        AND (
          (j.job_type='day7_care' AND cp.whatsapp_followup_opt_in=true)
          OR
          (j.job_type='repurchase' AND cp.whatsapp_marketing_opt_in=true)
        )
      ORDER BY j.due_at ASC,j.created_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    UPDATE public.customer_lifecycle_jobs j
    SET status='sending',
        attempt_count=j.attempt_count+1,
        locked_at=clock_timestamp(),
        updated_at=clock_timestamp()
    FROM candidate
    WHERE j.id=candidate.id
    RETURNING j.id,j.order_id,j.job_type,j.attempt_count
  `);
  const row = rowsOf(result)[0];
  if (!row) return null;
  return {
    id: String(row.id),
    orderId: String(row.order_id),
    jobType: String(row.job_type) as LifecycleJobType,
    attemptCount: Number(row.attempt_count) || 1,
  };
}

async function loadMessageInput(job: ClaimedLifecycleJob): Promise<{
  recipientPhone: string;
  firstName: string;
  orderNumber: string;
  productText: string;
} | null> {
  const db = getDb();
  if (!db) return null;
  const result = await db.execute(sql`
    SELECT
      j.customer_phone,j.recommended_product_ids,
      o.order_number,o.customer_name,
      COALESCE((
        SELECT string_agg(p.name,'، ' ORDER BY p.name)
        FROM public.products p
        WHERE p.id IN (SELECT jsonb_array_elements_text(j.recommended_product_ids))
      ),'') AS product_text
    FROM public.customer_lifecycle_jobs j
    JOIN public.orders o ON o.id=j.order_id
    WHERE j.id=${job.id}
      AND j.status='sending'
    LIMIT 1
  `);
  const row=rowsOf(result)[0];
  if(!row) return null;
  const recipientPhone=normalizeIraqiWhatsAppPhone(row.customer_phone);
  const firstName=buildCustomerFirstName(row.customer_name);
  const orderNumber=String(row.order_number ?? "").trim().slice(0,80);
  const productText=String(row.product_text ?? "").trim().slice(0,300);
  if(!recipientPhone || !firstName || !orderNumber) return null;
  if(job.jobType==="repurchase" && !productText) return null;
  return {recipientPhone,firstName,orderNumber,productText};
}

async function markAccepted(job: ClaimedLifecycleJob, providerMessageId: string): Promise<boolean> {
  const db=getDb();
  if(!db) return false;
  try{
    const result=await db.execute(sql`
      UPDATE public.customer_lifecycle_jobs
      SET status='completed',
          provider_message_id=COALESCE(provider_message_id,${providerMessageId}),
          provider_status=COALESCE(provider_status,'accepted'),
          accepted_at=COALESCE(accepted_at,clock_timestamp()),
          sent_at=COALESCE(sent_at,clock_timestamp()),
          completed_at=COALESCE(completed_at,clock_timestamp()),
          locked_at=NULL,
          last_error_code=NULL,
          last_error_at=NULL,
          updated_at=clock_timestamp()
      WHERE id=${job.id}
        AND (
          status='sending'
          OR (status='completed' AND provider_message_id=${providerMessageId})
        )
      RETURNING id
    `);
    const persisted=rowsOf(result).length>0;
    if(persisted){
      try{ await reconcileWhatsAppProviderEvents(providerMessageId); }catch{ /* recovery worker retries */ }
    }
    return persisted;
  }catch{
    // Never resend after provider acceptance merely because our acknowledgement
    // write is uncertain. The stale-sending guard converts this to ambiguity.
    return false;
  }
}

async function failJob(jobId: string, code: string): Promise<void> {
  const db=getDb();
  if(!db) return;
  await db.execute(sql`
    UPDATE public.customer_lifecycle_jobs
    SET status='failed',
        last_error_code=${code},
        last_error_at=clock_timestamp(),
        locked_at=NULL,
        updated_at=clock_timestamp()
    WHERE id=${jobId} AND status='sending'
  `);
}

async function retryJob(job: ClaimedLifecycleJob, code: string, dueAt: Date): Promise<void> {
  const db=getDb();
  if(!db) return;
  await db.execute(sql`
    UPDATE public.customer_lifecycle_jobs
    SET status='planned',
        due_at=${dueAt},
        last_error_code=${code},
        last_error_at=clock_timestamp(),
        locked_at=NULL,
        updated_at=clock_timestamp()
    WHERE id=${job.id} AND status='sending'
  `);
}

async function processClaim(config: LifecycleWhatsAppConfig, job: ClaimedLifecycleJob) {
  const messageInput=await loadMessageInput(job);
  if(!messageInput){
    await failJob(job.id,"WHATSAPP_LIFECYCLE_INVALID_RECIPIENT_OR_TEMPLATE_DATA");
    return {status:"failed" as const,jobId:job.id};
  }

  const templateName=job.jobType==="day7_care"
    ? config.day7Template
    : config.repurchaseTemplate;
  const parameters=job.jobType==="day7_care"
    ? [messageInput.firstName,messageInput.orderNumber]
    : [messageInput.firstName,messageInput.productText];

  try{
    const providerMessageId=await sendTemplate(
      config,
      messageInput.recipientPhone,
      templateName,
      parameters,
    );
    const persisted=await markAccepted(job,providerMessageId);
    if(!persisted){
      return {status:"ambiguous" as const,jobId:job.id,errorCode:"WHATSAPP_LIFECYCLE_ACCEPTANCE_PERSIST_AMBIGUOUS"};
    }
    return {status:"sent" as const,jobId:job.id,providerMessageId};
  }catch(error){
    const sendError=error instanceof LifecycleSendError
      ? error
      : new LifecycleSendError("WHATSAPP_LIFECYCLE_UNKNOWN_AMBIGUOUS",{ambiguous:true});

    if(sendError.ambiguous){
      await failJob(job.id,sendError.code);
      return {status:"ambiguous" as const,jobId:job.id,errorCode:sendError.code};
    }

    const delay=sendError.retryable ? retryDelayMs(job.attemptCount) : null;
    if(delay!=null){
      await retryJob(job,sendError.code,new Date(Date.now()+delay));
      return {status:"retry_scheduled" as const,jobId:job.id,errorCode:sendError.code};
    }

    await failJob(job.id,sendError.code);
    return {status:"failed" as const,jobId:job.id,errorCode:sendError.code};
  }
}

export async function runDueLifecycleWhatsAppJobs(limitInput=DEFAULT_WORKER_LIMIT) {
  const config=readLifecycleConfig();
  const limit=Math.max(1,Math.min(MAX_WORKER_LIMIT,Math.floor(Number(limitInput)||DEFAULT_WORKER_LIMIT)));

  if(!config){
    return {
      enabled:false,
      withinSendWindow:false,
      processed:0,
      sent:0,
      retried:0,
      failed:0,
      ambiguous:0,
      suppressed:{preActivation:0,consentRevoked:0,stale:0,issueOpen:0,alreadyReplenished:0},
    };
  }

  const staleClaims=await failStaleSendingClaims();
  const suppressed=await suppressUnsafeDueJobs(config);
  await promoteDueJobs();

  if(!withinSendWindow(config)){
    return {
      enabled:true,
      withinSendWindow:false,
      staleClaims,
      processed:0,
      sent:0,
      retried:0,
      failed:0,
      ambiguous:0,
      suppressed,
    };
  }

  let processed=0,sent=0,retried=0,failed=0,ambiguous=0;
  for(let index=0;index<limit;index+=1){
    const job=await claimDueJob(config);
    if(!job) break;
    processed+=1;
    const result=await processClaim(config,job);
    if(result.status==="sent") sent+=1;
    else if(result.status==="retry_scheduled") retried+=1;
    else if(result.status==="ambiguous") ambiguous+=1;
    else failed+=1;
  }

  return {
    enabled:true,
    withinSendWindow:true,
    staleClaims,
    processed,
    sent,
    retried,
    failed,
    ambiguous,
    suppressed,
  };
}

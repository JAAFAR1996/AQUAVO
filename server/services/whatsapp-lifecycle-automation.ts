import { sql } from "drizzle-orm";
import { getDb } from "../db.js";
import {
  buildCustomerFirstName,
  normalizeIraqiWhatsAppPhone,
  retryDelayMs,
} from "./customer-messaging.js";
import {
  reconcilePendingWhatsAppProviderEvents,
  reconcileWhatsAppProviderEvents,
} from "./whatsapp-provider-status.js";

const REQUEST_TIMEOUT_MS = 7_000;
const MAX_SEND_ATTEMPTS = 5;
const STALE_SENDING_MINUTES = 10;
const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 10;
const DAY7_FREQUENCY_CAP_DAYS = 14;
const REPURCHASE_FREQUENCY_CAP_DAYS = 30;
const BAGHDAD_SEND_START_HOUR = 10;
const BAGHDAD_SEND_END_HOUR = 20;

type Row = Record<string, unknown>;
type LifecycleKind = "day7_care" | "repurchase";
type OutboxKind = "lifecycle_day7" | "lifecycle_repurchase";

type LifecycleConfig = {
  apiVersion: string;
  phoneNumberId: string;
  accessToken: string;
  languageCode: string;
  day7Template: string;
  repurchaseTemplate: string;
  activationAt: Date;
};

type ClaimedOutbox = {
  id: string;
  orderId: string;
  jobType: OutboxKind;
  attemptCount: number;
  metadata: Record<string, unknown>;
};

type MetaSendResponse = {
  messages?: Array<{ id?: string }>;
  error?: { code?: number; error_subcode?: number; message?: string; type?: string };
};

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

function rowsOf<T extends Row = Row>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  const rows = (result as { rows?: T[] } | null)?.rows;
  return Array.isArray(rows) ? rows : [];
}

function readConfig(): LifecycleConfig | null {
  if (process.env.WHATSAPP_CLOUD_ENABLED?.trim().toLowerCase() !== "true") return null;
  if (process.env.WHATSAPP_LIFECYCLE_AUTO_ENABLED?.trim().toLowerCase() !== "true") return null;

  const apiVersion = process.env.WHATSAPP_API_VERSION?.trim() ?? "";
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() ?? "";
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim() ?? "";
  const languageCode = process.env.WHATSAPP_TEMPLATE_LANGUAGE?.trim() || "ar";
  const day7Template = process.env.WHATSAPP_DAY7_TEMPLATE?.trim() ?? "";
  const repurchaseTemplate = process.env.WHATSAPP_REPURCHASE_TEMPLATE?.trim() ?? "";
  const activationRaw = process.env.WHATSAPP_LIFECYCLE_ACTIVATION_AT?.trim() ?? "";
  const activationAt = activationRaw ? new Date(activationRaw) : new Date(Number.NaN);

  if (!/^v\d+\.\d+$/.test(apiVersion)) return null;
  if (!/^\d+$/.test(phoneNumberId)) return null;
  if (!accessToken || !day7Template || !repurchaseTemplate) return null;
  if (!activationRaw || !Number.isFinite(activationAt.getTime())) return null;
  if (activationAt.getTime() > Date.now()) return null;

  return {
    apiVersion,
    phoneNumberId,
    accessToken,
    languageCode,
    day7Template,
    repurchaseTemplate,
    activationAt,
  };
}

function baghdadHour(now = new Date()): number {
  const value = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Baghdad",
    hour: "2-digit",
    hour12: false,
  }).format(now);
  const hour = Number(value);
  return Number.isFinite(hour) ? hour : 0;
}

export function isLifecycleSendWindow(now = new Date()): boolean {
  const hour = baghdadHour(now);
  return hour >= BAGHDAD_SEND_START_HOUR && hour < BAGHDAD_SEND_END_HOUR;
}

function compactMetaErrorCode(status: number, body: MetaSendResponse): string {
  const code = Number(body.error?.code);
  const subcode = Number(body.error?.error_subcode);
  const suffix = Number.isFinite(code)
    ? `_META_${code}${Number.isFinite(subcode) ? `_${subcode}` : ""}`
    : "";
  return `WHATSAPP_LIFECYCLE_HTTP_${status}${suffix}`.slice(0, 120);
}

function outboxKind(kind: LifecycleKind): OutboxKind {
  return kind === "day7_care" ? "lifecycle_day7" : "lifecycle_repurchase";
}

function requiredConsentColumn(kind: LifecycleKind): "care_opt_in" | "marketing_opt_in" {
  return kind === "day7_care" ? "care_opt_in" : "marketing_opt_in";
}

function frequencyCapDays(kind: LifecycleKind): number {
  return kind === "day7_care" ? DAY7_FREQUENCY_CAP_DAYS : REPURCHASE_FREQUENCY_CAP_DAYS;
}

async function frequencyCapHit(phone: string, kind: LifecycleKind): Promise<boolean> {
  const db = getDb();
  if (!db) return true;
  const target = outboxKind(kind);
  const days = frequencyCapDays(kind);
  const result = await db.execute(sql`
    SELECT 1
    FROM public.customer_message_jobs j
    JOIN public.orders o ON o.id=j.order_id
    WHERE j.job_type=${target}
      AND public.aquavo_normalize_iraqi_phone(o.customer_phone)=${phone}
      AND (
        (
          j.status IN ('pending','sending')
          AND j.created_at >= clock_timestamp() - (${days} * interval '1 day')
        )
        OR
        (
          j.status='completed'
          AND COALESCE(j.provider_status,'accepted')<>'failed'
          AND COALESCE(j.accepted_at,j.updated_at) >= clock_timestamp() - (${days} * interval '1 day')
        )
      )
    LIMIT 1
  `);
  return rowsOf(result).length > 0;
}

async function repurchaseAlreadySatisfied(lifecycleJobId: string): Promise<boolean> {
  const db = getDb();
  if (!db) return true;
  const result = await db.execute(sql`
    SELECT 1
    FROM public.customer_lifecycle_jobs j
    JOIN public.orders source_order ON source_order.id=j.order_id
    JOIN public.orders later
      ON public.aquavo_normalize_iraqi_phone(later.customer_phone)=j.customer_phone
     AND later.created_at > source_order.created_at
     AND COALESCE(later.is_test,false)=false
     AND later.status='delivered'
     AND later.payment_status='paid'
     AND later.cod_received=true
    JOIN public.order_items_relational li ON li.order_id=later.id
    WHERE j.id=${lifecycleJobId}
      AND j.job_type='repurchase'
      AND li.product_id IN (
        SELECT jsonb_array_elements_text(j.recommended_product_ids)
      )
    LIMIT 1
  `);
  return rowsOf(result).length > 0;
}

async function markLifecycleSuppressed(lifecycleJobId: string, reason: string): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db.execute(sql`
    UPDATE public.customer_lifecycle_jobs
    SET status='suppressed',
        channel='whatsapp',
        metadata=metadata || jsonb_build_object(
          'suppressReason',${reason},
          'suppressedAt',clock_timestamp()
        ),
        updated_at=clock_timestamp()
    WHERE id=${lifecycleJobId}
      AND status IN ('planned','ready')
  `);
}

async function materializeDueLifecycleJobs(config: LifecycleConfig, limit: number): Promise<number> {
  const db = getDb();
  if (!db) return 0;
  const safeLimit = Math.max(1, Math.min(MAX_LIMIT * 4, Math.floor(limit) * 4));

  const candidates = await db.execute(sql`
    SELECT
      j.id,j.order_id,j.job_type,j.customer_phone,j.due_at,j.recommended_product_ids,
      j.created_at,p.care_opt_in,p.marketing_opt_in,p.care_opt_in_at,p.marketing_opt_in_at,
      p.all_opt_out_at
    FROM public.customer_lifecycle_jobs j
    JOIN public.orders o ON o.id=j.order_id
    JOIN public.customer_whatsapp_preferences p ON p.phone=j.customer_phone
    WHERE j.status IN ('planned','ready')
      AND j.due_at <= clock_timestamp()
      AND o.status='delivered'
      AND o.payment_status='paid'
      AND o.cod_received=true
      AND COALESCE(o.is_test,false)=false
      AND p.all_opt_out_at IS NULL
      AND (
        (j.job_type='day7_care' AND p.care_opt_in=true AND p.care_opt_in_at >= ${config.activationAt})
        OR
        (j.job_type='repurchase' AND p.marketing_opt_in=true AND p.marketing_opt_in_at >= ${config.activationAt})
      )
    ORDER BY j.due_at ASC,j.created_at ASC
    LIMIT ${safeLimit}
  `);

  let created = 0;
  for (const row of rowsOf(candidates)) {
    const kind = String(row.job_type) as LifecycleKind;
    const lifecycleJobId = String(row.id);
    const phone = normalizeIraqiWhatsAppPhone(row.customer_phone);
    if (!phone || !["day7_care","repurchase"].includes(kind)) continue;

    if (kind === "repurchase" && await repurchaseAlreadySatisfied(lifecycleJobId)) {
      await markLifecycleSuppressed(lifecycleJobId, "already_replenished_before_send");
      continue;
    }

    if (await frequencyCapHit(phone, kind)) {
      await markLifecycleSuppressed(lifecycleJobId, `frequency_cap_${frequencyCapDays(kind)}d`);
      continue;
    }

    const targetOutboxKind = outboxKind(kind);
    const templateName = kind === "day7_care" ? config.day7Template : config.repurchaseTemplate;
    const inserted = await db.execute(sql`
      INSERT INTO public.customer_message_jobs(
        order_id,job_type,channel,status,due_at,metadata
      ) VALUES(
        ${String(row.order_id)},${targetOutboxKind},'whatsapp','pending',clock_timestamp(),
        jsonb_build_object(
          'source','growth_os_lifecycle',
          'lifecycleJobId',${lifecycleJobId},
          'lifecycleKind',${kind},
          'templateName',${templateName},
          'recommendedProductIds',COALESCE(${JSON.stringify(row.recommended_product_ids ?? [])}::jsonb,'[]'::jsonb)
        )
      )
      ON CONFLICT(order_id,job_type) DO NOTHING
      RETURNING id
    `);

    if (rowsOf(inserted).length > 0) created += 1;
    await db.execute(sql`
      UPDATE public.customer_lifecycle_jobs
      SET channel='whatsapp',template_name=${templateName},updated_at=clock_timestamp()
      WHERE id=${lifecycleJobId} AND status IN ('planned','ready')
    `);
  }
  return created;
}

async function claimDueOutbox(activationAt: Date): Promise<ClaimedOutbox | null> {
  const db = getDb();
  if (!db) return null;
  const result = await db.execute(sql`
    WITH candidate AS (
      SELECT j.id
      FROM public.customer_message_jobs j
      JOIN public.orders o ON o.id=j.order_id
      WHERE j.job_type IN ('lifecycle_day7','lifecycle_repurchase')
        AND j.status='pending'
        AND j.attempt_count < ${MAX_SEND_ATTEMPTS}
        AND j.due_at <= clock_timestamp()
        AND j.created_at >= ${activationAt}
        AND o.status='delivered'
        AND o.payment_status='paid'
        AND o.cod_received=true
        AND COALESCE(o.is_test,false)=false
      ORDER BY j.due_at ASC,j.created_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    UPDATE public.customer_message_jobs j
    SET status='sending',
        attempt_count=j.attempt_count+1,
        locked_at=clock_timestamp(),
        updated_at=clock_timestamp()
    FROM candidate
    WHERE j.id=candidate.id
    RETURNING j.id,j.order_id,j.job_type,j.attempt_count,j.metadata
  `);
  const row = rowsOf(result)[0];
  if (!row) return null;
  return {
    id:String(row.id),
    orderId:String(row.order_id),
    jobType:String(row.job_type) as OutboxKind,
    attemptCount:Number(row.attempt_count)||1,
    metadata:(row.metadata && typeof row.metadata==="object" ? row.metadata : {}) as Record<string,unknown>,
  };
}

async function loadRecipientAndPermission(job: ClaimedOutbox): Promise<{
  phone:string;
  firstName:string;
  orderNumber:string;
  lifecycleJobId:string;
  kind:LifecycleKind;
  productSummary:string;
} | null> {
  const db = getDb();
  if (!db) return null;
  const kind:LifecycleKind = job.jobType === "lifecycle_day7" ? "day7_care" : "repurchase";
  const consentColumn = requiredConsentColumn(kind);
  const lifecycleJobId = String(job.metadata.lifecycleJobId ?? "");
  if (!lifecycleJobId) return null;

  const result = await db.execute(sql`
    SELECT
      o.customer_name,o.customer_phone,o.order_number,
      public.aquavo_normalize_iraqi_phone(o.customer_phone) AS normalized_phone,
      p.care_opt_in,p.marketing_opt_in,p.all_opt_out_at,
      j.status AS lifecycle_status,j.recommended_product_ids,
      COALESCE((
        SELECT string_agg(product_name,'، ' ORDER BY product_name)
        FROM (
          SELECT DISTINCT p2.name AS product_name
          FROM public.products p2
          WHERE p2.id IN (
            SELECT jsonb_array_elements_text(j.recommended_product_ids)
          )
          ORDER BY p2.name
          LIMIT 2
        ) names
      ),'المستهلكات اللي أخذتها') AS product_summary
    FROM public.orders o
    JOIN public.customer_lifecycle_jobs j ON j.id=${lifecycleJobId} AND j.order_id=o.id
    JOIN public.customer_whatsapp_preferences p
      ON p.phone=public.aquavo_normalize_iraqi_phone(o.customer_phone)
    WHERE o.id=${job.orderId}
      AND o.status='delivered'
      AND o.payment_status='paid'
      AND o.cod_received=true
      AND COALESCE(o.is_test,false)=false
      AND j.status IN ('planned','ready')
      AND p.all_opt_out_at IS NULL
      AND CASE WHEN ${consentColumn}='care_opt_in' THEN p.care_opt_in ELSE p.marketing_opt_in END
    LIMIT 1
  `);
  const row=rowsOf(result)[0];
  if(!row) return null;
  const phone=normalizeIraqiWhatsAppPhone(row.normalized_phone ?? row.customer_phone);
  const firstName=buildCustomerFirstName(row.customer_name);
  if(!phone || !firstName) return null;
  return {
    phone,
    firstName,
    orderNumber:String(row.order_number ?? job.orderId),
    lifecycleJobId,
    kind,
    productSummary:String(row.product_summary ?? "المستهلكات اللي أخذتها").slice(0,120),
  };
}

async function sendTemplate(
  config:LifecycleConfig,
  payload:{phone:string;firstName:string;orderNumber:string;kind:LifecycleKind;productSummary:string},
):Promise<string>{
  const templateName=payload.kind==="day7_care"?config.day7Template:config.repurchaseTemplate;
  const bodyParams=payload.kind==="day7_care"
    ? [payload.firstName,payload.orderNumber]
    : [payload.firstName,payload.productSummary];
  const endpoint=`https://graph.facebook.com/${config.apiVersion}/${encodeURIComponent(config.phoneNumberId)}/messages`;
  let response:Response;
  try{
    response=await fetch(endpoint,{
      method:"POST",
      headers:{Authorization:`Bearer ${config.accessToken}`,"Content-Type":"application/json"},
      body:JSON.stringify({
        messaging_product:"whatsapp",
        recipient_type:"individual",
        to:payload.phone,
        type:"template",
        template:{
          name:templateName,
          language:{code:config.languageCode},
          components:[{
            type:"body",
            parameters:bodyParams.map((value)=>({type:"text",text:value})),
          }],
        },
      }),
      signal:AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  }catch(error){
    const name=error instanceof Error?error.name:"";
    const code=name==="TimeoutError"||name==="AbortError"
      ?"WHATSAPP_LIFECYCLE_TIMEOUT_AMBIGUOUS"
      :"WHATSAPP_LIFECYCLE_NETWORK_AMBIGUOUS";
    throw new LifecycleSendError(code,false);
  }

  let body:MetaSendResponse={};
  try{body=await response.json() as MetaSendResponse;}catch{/* no provider body needed */}
  const providerMessageId=String(body.messages?.[0]?.id ?? "").trim();
  if(response.ok && providerMessageId) return providerMessageId;
  if(response.ok) throw new LifecycleSendError("WHATSAPP_LIFECYCLE_ACCEPTANCE_AMBIGUOUS",false);

  const code=compactMetaErrorCode(response.status,body);
  const retryable=response.status===429 || response.status>=500;
  throw new LifecycleSendError(code,retryable);
}

async function markAccepted(job:ClaimedOutbox,providerMessageId:string,lifecycleJobId:string):Promise<boolean>{
  const db=getDb();
  if(!db) return false;
  try{
    const result=await db.execute(sql`
      UPDATE public.customer_message_jobs
      SET status='completed',
          provider_message_id=COALESCE(provider_message_id,${providerMessageId}),
          provider_status='accepted',
          accepted_at=COALESCE(accepted_at,clock_timestamp()),
          provider_status_at=NULL,
          locked_at=NULL,
          last_error_code=NULL,
          last_error_at=NULL,
          updated_at=clock_timestamp()
      WHERE id=${job.id} AND status='sending'
      RETURNING id
    `);
    if(rowsOf(result).length===0) return false;

    await db.execute(sql`
      UPDATE public.customer_lifecycle_jobs
      SET status='completed',completed_at=clock_timestamp(),channel='whatsapp',
          metadata=metadata || jsonb_build_object(
            'automationStatus','accepted',
            'providerMessageId',${providerMessageId},
            'acceptedAt',clock_timestamp()
          ),
          updated_at=clock_timestamp()
      WHERE id=${lifecycleJobId}
        AND status IN ('planned','ready')
    `);

    try{await reconcileWhatsAppProviderEvents(providerMessageId);}catch{/* durable provider inbox handles race */}
    return true;
  }catch{
    return false;
  }
}

async function markFailed(job:ClaimedOutbox,code:string):Promise<void>{
  const db=getDb();
  if(!db) return;
  await db.execute(sql`
    UPDATE public.customer_message_jobs
    SET status='failed',last_error_code=${code},last_error_at=clock_timestamp(),
        locked_at=NULL,updated_at=clock_timestamp()
    WHERE id=${job.id} AND status='sending'
  `);
}

async function scheduleRetry(job:ClaimedOutbox,code:string):Promise<boolean>{
  const db=getDb();
  if(!db) return false;
  const delay=retryDelayMs(job.attemptCount);
  if(delay==null) return false;
  const dueAt=new Date(Date.now()+delay);
  await db.execute(sql`
    UPDATE public.customer_message_jobs
    SET status='pending',due_at=${dueAt},last_error_code=${code},
        last_error_at=clock_timestamp(),locked_at=NULL,updated_at=clock_timestamp()
    WHERE id=${job.id} AND status='sending'
  `);
  return true;
}

async function failStaleClaims():Promise<number>{
  const db=getDb();
  if(!db) return 0;
  const result=await db.execute(sql`
    UPDATE public.customer_message_jobs
    SET status='failed',
        last_error_code='WHATSAPP_LIFECYCLE_AMBIGUOUS_STALE_SEND',
        last_error_at=clock_timestamp(),locked_at=NULL,updated_at=clock_timestamp()
    WHERE job_type IN ('lifecycle_day7','lifecycle_repurchase')
      AND status='sending'
      AND locked_at IS NOT NULL
      AND locked_at <= clock_timestamp() - (${STALE_SENDING_MINUTES} * interval '1 minute')
    RETURNING id
  `);
  return rowsOf(result).length;
}

async function cancelNoLongerEligibleOutbox():Promise<number>{
  const db=getDb();
  if(!db) return 0;
  const result=await db.execute(sql`
    UPDATE public.customer_message_jobs j
    SET status='cancelled',cancelled_at=clock_timestamp(),locked_at=NULL,
        last_error_code='WHATSAPP_LIFECYCLE_NOT_ELIGIBLE',
        last_error_at=clock_timestamp(),updated_at=clock_timestamp()
    FROM public.orders o
    WHERE o.id=j.order_id
      AND j.job_type IN ('lifecycle_day7','lifecycle_repurchase')
      AND j.status='pending'
      AND (
        o.status<>'delivered'
        OR o.payment_status<>'paid'
        OR COALESCE(o.cod_received,false)=false
        OR COALESCE(o.is_test,false)=true
        OR NOT EXISTS (
          SELECT 1
          FROM public.customer_whatsapp_preferences p
          WHERE p.phone=public.aquavo_normalize_iraqi_phone(o.customer_phone)
            AND p.all_opt_out_at IS NULL
            AND CASE
              WHEN j.job_type='lifecycle_day7' THEN p.care_opt_in
              ELSE p.marketing_opt_in
            END
        )
        OR NOT EXISTS (
          SELECT 1
          FROM public.customer_lifecycle_jobs lifecycle
          WHERE lifecycle.id=j.metadata->>'lifecycleJobId'
            AND lifecycle.order_id=j.order_id
            AND lifecycle.status IN ('planned','ready')
        )
      )
    RETURNING j.id
  `);
  return rowsOf(result).length;
}

async function reconcileAcceptedLifecycleSources():Promise<number>{
  const db=getDb();
  if(!db) return 0;
  const result=await db.execute(sql`
    UPDATE public.customer_lifecycle_jobs lifecycle
    SET status='completed',
        completed_at=COALESCE(lifecycle.completed_at,outbox.accepted_at,outbox.updated_at),
        channel='whatsapp',
        metadata=lifecycle.metadata || jsonb_build_object(
          'automationStatus','accepted_reconciled',
          'providerMessageId',outbox.provider_message_id,
          'acceptedAt',COALESCE(outbox.accepted_at,outbox.updated_at)
        ),
        updated_at=clock_timestamp()
    FROM public.customer_message_jobs outbox
    WHERE outbox.job_type IN ('lifecycle_day7','lifecycle_repurchase')
      AND outbox.status='completed'
      AND outbox.provider_message_id IS NOT NULL
      AND lifecycle.id=outbox.metadata->>'lifecycleJobId'
      AND lifecycle.order_id=outbox.order_id
      AND lifecycle.status IN ('planned','ready')
    RETURNING lifecycle.id
  `);
  return rowsOf(result).length;
}

export async function getLifecycleWhatsAppAutomationHealth(){
  const db=getDb();
  const configured=readConfig()!=null;
  if(!db){
    return {configured,sendWindow:isLifecycleSendWindow(),database:false};
  }
  const result=await db.execute(sql`
    SELECT
      (SELECT COUNT(*) FROM public.customer_whatsapp_preferences WHERE care_opt_in=true AND all_opt_out_at IS NULL)::int AS care_opted_in,
      (SELECT COUNT(*) FROM public.customer_whatsapp_preferences WHERE marketing_opt_in=true AND all_opt_out_at IS NULL)::int AS marketing_opted_in,
      (SELECT COUNT(*) FROM public.customer_whatsapp_preferences WHERE all_opt_out_at IS NOT NULL)::int AS opted_out_all,
      (SELECT COUNT(*) FROM public.customer_message_jobs WHERE job_type IN ('lifecycle_day7','lifecycle_repurchase') AND status='pending')::int AS outbox_pending,
      (SELECT COUNT(*) FROM public.customer_message_jobs WHERE job_type IN ('lifecycle_day7','lifecycle_repurchase') AND status='completed')::int AS outbox_completed,
      (SELECT COUNT(*) FROM public.customer_message_jobs WHERE job_type IN ('lifecycle_day7','lifecycle_repurchase') AND status='failed')::int AS outbox_failed
  `);
  const row=rowsOf(result)[0] ?? {};
  return {
    configured,
    sendWindow:isLifecycleSendWindow(),
    database:true,
    careOptedIn:Number(row.care_opted_in ?? 0),
    marketingOptedIn:Number(row.marketing_opted_in ?? 0),
    optedOutAll:Number(row.opted_out_all ?? 0),
    outboxPending:Number(row.outbox_pending ?? 0),
    outboxCompleted:Number(row.outbox_completed ?? 0),
    outboxFailed:Number(row.outbox_failed ?? 0),
  };
}

export async function runDueLifecycleWhatsAppJobs(limit=DEFAULT_LIMIT):Promise<{
  configured:boolean;
  sendWindow:boolean;
  materialized:number;
  processed:number;
  sent:number;
  retried:number;
  failed:number;
  cancelled:number;
  staleFailed:number;
  providerEventsReconciled:number;
}>{
  const db=getDb();
  const config=readConfig();
  if(!db || !config){
    return {
      configured:Boolean(config),sendWindow:isLifecycleSendWindow(),materialized:0,
      processed:0,sent:0,retried:0,failed:0,cancelled:0,staleFailed:0,providerEventsReconciled:0,
    };
  }

  let providerEventsReconciled=0;
  try{providerEventsReconciled=await reconcilePendingWhatsAppProviderEvents(25);}catch{/* later worker can retry */}

  await reconcileAcceptedLifecycleSources();
  const cancelled=await cancelNoLongerEligibleOutbox();
  const staleFailed=await failStaleClaims();

  if(!isLifecycleSendWindow()){
    return {
      configured:true,sendWindow:false,materialized:0,processed:0,sent:0,retried:0,failed:0,
      cancelled,staleFailed,providerEventsReconciled,
    };
  }

  const safeLimit=Math.max(1,Math.min(MAX_LIMIT,Math.floor(limit)||DEFAULT_LIMIT));
  const materialized=await materializeDueLifecycleJobs(config,safeLimit);

  let processed=0,sent=0,retried=0,failed=0;
  for(let i=0;i<safeLimit;i+=1){
    const job=await claimDueOutbox(config.activationAt);
    if(!job) break;
    processed+=1;

    const recipient=await loadRecipientAndPermission(job);
    if(!recipient){
      await markFailed(job,"WHATSAPP_LIFECYCLE_PERMISSION_OR_ORDER_INVALID");
      failed+=1;
      continue;
    }

    if(recipient.kind==="repurchase" && await repurchaseAlreadySatisfied(recipient.lifecycleJobId)){
      await markLifecycleSuppressed(recipient.lifecycleJobId,"already_replenished_before_send");
      await markFailed(job,"WHATSAPP_LIFECYCLE_ALREADY_REPLENISHED");
      failed+=1;
      continue;
    }

    try{
      const providerMessageId=await sendTemplate(config,recipient);
      const accepted=await markAccepted(job,providerMessageId,recipient.lifecycleJobId);
      if(accepted) sent+=1;
      else {
        await markFailed(job,"WHATSAPP_LIFECYCLE_ACCEPTED_PERSISTENCE_AMBIGUOUS");
        failed+=1;
      }
    }catch(error){
      if(error instanceof LifecycleSendError && error.retryable && await scheduleRetry(job,error.code)){
        retried+=1;
      }else{
        const code=error instanceof LifecycleSendError?error.code:"WHATSAPP_LIFECYCLE_UNKNOWN_AMBIGUOUS";
        await markFailed(job,code);
        failed+=1;
      }
    }
  }

  return {
    configured:true,sendWindow:true,materialized,processed,sent,retried,failed,cancelled,
    staleFailed,providerEventsReconciled,
  };
}

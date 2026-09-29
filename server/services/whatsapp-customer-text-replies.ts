import { sql } from "drizzle-orm";
import { getDb } from "../db.js";
import { normalizeIraqiWhatsAppPhone } from "./customer-messaging.js";
import { recordWhatsAppMarketingOptOut } from "./whatsapp-lifecycle.js";
import { escapeHtml, sendTelegramMessage } from "./order-notifications.js";

type Row = Record<string, unknown>;

export type WhatsAppCustomerTextEvent = {
  inboundMessageId: string;
  contextProviderMessageId: string | null;
  fromPhone: string;
  receivedAt: Date;
  text: string;
  suppressOperatorAlert?: boolean;
};

export type WhatsAppCustomerTextResult =
  | "handled"
  | "duplicate"
  | "ignored"
  | "db_unavailable";

function rowsOf(result: unknown): Row[] {
  if (Array.isArray(result)) return result as Row[];
  const rows=(result as { rows?: Row[] } | null)?.rows;
  return Array.isArray(rows) ? rows : [];
}

function isExplicitStop(text: string): boolean {
  const normalized=text.normalize("NFKC").trim().toLowerCase().replace(/[.!؟،]+$/g,"").replace(/\s+/g," ");
  return new Set([
    "stop",
    "unsubscribe",
    "إيقاف التذكيرات",
    "ايقاف التذكيرات",
    "إلغاء التذكيرات",
    "الغاء التذكيرات",
    "وقف التذكيرات",
    "لا ترسل تذكيرات",
    "لاترسل تذكيرات",
  ]).has(normalized);
}

export async function handleWhatsAppCustomerText(
  event: WhatsAppCustomerTextEvent,
): Promise<WhatsAppCustomerTextResult> {
  const senderPhone=normalizeIraqiWhatsAppPhone(event.fromPhone);
  const messageText=String(event.text ?? "").normalize("NFKC").trim().slice(0,2048);
  const inboundMessageId=String(event.inboundMessageId ?? "").trim().slice(0,500);
  const contextProviderMessageId=event.contextProviderMessageId
    ? String(event.contextProviderMessageId).trim().slice(0,500)
    : null;

  if (!senderPhone || !messageText || !inboundMessageId || !Number.isFinite(event.receivedAt.getTime())) {
    return "ignored";
  }

  const db=getDb();
  if (!db) return "db_unavailable";

  await db.execute(sql`
    INSERT INTO public.whatsapp_customer_text_events(
      inbound_message_id,context_provider_message_id,sender_phone,message_text,received_at
    ) VALUES(
      ${inboundMessageId},${contextProviderMessageId},${senderPhone},${messageText},${event.receivedAt}
    )
    ON CONFLICT(inbound_message_id) DO NOTHING
  `);

  const storedResult=await db.execute(sql`
    SELECT id,alert_status,marketing_opt_out
    FROM public.whatsapp_customer_text_events
    WHERE inbound_message_id=${inboundMessageId}
    LIMIT 1
  `);
  const stored=rowsOf(storedResult)[0];
  if (!stored) return "db_unavailable";
  if (String(stored.alert_status)==="sent") return "duplicate";

  const matchResult=await db.execute(sql`
    WITH candidates AS (
      SELECT
        'delivery_care'::text AS job_type,
        j.id AS job_id,
        j.order_id,
        j.accepted_at,
        j.provider_message_id,
        o.customer_name,
        o.order_number,
        0 AS source_rank
      FROM public.customer_message_jobs j
      JOIN public.orders o ON o.id=j.order_id
      WHERE j.job_type='delivery_care'
        AND j.status='completed'
        AND j.accepted_at IS NOT NULL
        AND public.aquavo_normalize_iraqi_phone(o.customer_phone)=${senderPhone}
        AND j.accepted_at BETWEEN ${event.receivedAt} - interval '30 days' AND ${event.receivedAt} + interval '5 minutes'

      UNION ALL

      SELECT
        j.job_type,
        j.id,
        j.order_id,
        j.accepted_at,
        j.provider_message_id,
        o.customer_name,
        o.order_number,
        1 AS source_rank
      FROM public.customer_lifecycle_jobs j
      JOIN public.orders o ON o.id=j.order_id
      WHERE j.job_type IN ('day7_care','repurchase')
        AND j.status='completed'
        AND j.accepted_at IS NOT NULL
        AND public.aquavo_normalize_iraqi_phone(o.customer_phone)=${senderPhone}
        AND j.accepted_at BETWEEN ${event.receivedAt} - interval '30 days' AND ${event.receivedAt} + interval '5 minutes'
    )
    SELECT *
    FROM candidates
    WHERE (
      ${contextProviderMessageId}::text IS NULL
      OR provider_message_id=${contextProviderMessageId}
    )
    ORDER BY
      CASE WHEN ${contextProviderMessageId}::text IS NOT NULL
             AND provider_message_id=${contextProviderMessageId}
           THEN 0 ELSE 1 END,
      accepted_at DESC,
      source_rank ASC
    LIMIT 1
  `);
  const matched=rowsOf(matchResult)[0] ?? null;
  const jobType=matched ? String(matched.job_type ?? "") : null;
  const jobId=matched ? String(matched.job_id ?? "") : null;
  const orderId=matched ? String(matched.order_id ?? "") : null;

  const stop=isExplicitStop(messageText);
  if (stop && !Boolean(stored.marketing_opt_out)) {
    await recordWhatsAppMarketingOptOut(
      senderPhone,
      inboundMessageId,
      orderId,
      event.receivedAt,
    );
  }

  await db.execute(sql`
    UPDATE public.whatsapp_customer_text_events
       SET matched_job_type=${jobType},
           matched_job_id=${jobId},
           matched_order_id=${orderId},
           marketing_opt_out=${stop},
           updated_at=clock_timestamp()
     WHERE inbound_message_id=${inboundMessageId}
  `);

  if (event.suppressOperatorAlert) {
    await db.execute(sql`
      UPDATE public.whatsapp_customer_text_events
         SET alert_status='sent',
             alert_processing_at=NULL,
             alerted_at=COALESCE(alerted_at,clock_timestamp()),
             updated_at=clock_timestamp()
       WHERE inbound_message_id=${inboundMessageId}
         AND alert_status<>'sent'
    `);
    return "handled";
  }

  const claim=await db.execute(sql`
    UPDATE public.whatsapp_customer_text_events
       SET alert_status='processing',
           alert_attempt_count=alert_attempt_count+1,
           alert_processing_at=clock_timestamp(),
           updated_at=clock_timestamp()
     WHERE inbound_message_id=${inboundMessageId}
       AND alert_status='pending'
    RETURNING id
  `);
  if (rowsOf(claim).length===0) {
    const current=rowsOf(await db.execute(sql`
      SELECT alert_status FROM public.whatsapp_customer_text_events
      WHERE inbound_message_id=${inboundMessageId}
      LIMIT 1
    `))[0];
    return String(current?.alert_status)==="sent" ? "duplicate" : "handled";
  }

  const customerName=String(matched?.customer_name ?? "").trim();
  const orderNumber=String(matched?.order_number ?? orderId ?? "").trim();
  const flowLabel=jobType==="delivery_care"
    ? "متابعة بعد الاستلام"
    : jobType==="day7_care"
      ? "متابعة اليوم السابع"
      : jobType==="repurchase"
        ? "تذكير إعادة الشراء"
        : "رسالة WhatsApp عامة";
  const waUrl=`https://wa.me/${senderPhone}`;
  const alert=[
    "🔔 <b>AQUAVO — رد WhatsApp من زبون</b>",
    "",
    `<b>المسار:</b> ${escapeHtml(flowLabel)}`,
    customerName ? `<b>الزبون:</b> ${escapeHtml(customerName)}` : "",
    orderNumber ? `<b>الطلب:</b> <code>${escapeHtml(orderNumber)}</code>` : "",
    stop ? "<b>الحالة:</b> طلب إيقاف رسائل التسويق" : "",
    `<b>الرسالة:</b> ${escapeHtml(messageText)}`,
    `<a href="${waUrl}">فتح محادثة WhatsApp</a>`,
  ].filter(Boolean).join("\n");

  try {
    await sendTelegramMessage(alert);
    await db.execute(sql`
      UPDATE public.whatsapp_customer_text_events
         SET alert_status='sent',
             alert_processing_at=NULL,
             alerted_at=clock_timestamp(),
             updated_at=clock_timestamp()
       WHERE inbound_message_id=${inboundMessageId}
         AND alert_status='processing'
    `);
  } catch {
    await db.execute(sql`
      UPDATE public.whatsapp_customer_text_events
         SET alert_status='pending',
             alert_processing_at=NULL,
             updated_at=clock_timestamp()
       WHERE inbound_message_id=${inboundMessageId}
         AND alert_status='processing'
    `);
    throw new Error("WHATSAPP_SUPPORT_ALERT_FAILED");
  }

  return "handled";
}


export async function runPendingWhatsAppCustomerTextAlerts(limit=20): Promise<{
  processed:number;
  handled:number;
  failed:number;
  staleReset:number;
}> {
  const db=getDb();
  if (!db) return { processed:0,handled:0,failed:0,staleReset:0 };

  const stale=await db.execute(sql`
    UPDATE public.whatsapp_customer_text_events
       SET alert_status='pending',
           alert_processing_at=NULL,
           updated_at=clock_timestamp()
     WHERE alert_status='processing'
       AND alert_processing_at IS NOT NULL
       AND alert_processing_at <= clock_timestamp() - interval '10 minutes'
    RETURNING id
  `);
  const staleReset=rowsOf(stale).length;
  const safeLimit=Math.max(1,Math.min(100,Math.floor(Number(limit)||20)));
  const pending=await db.execute(sql`
    SELECT inbound_message_id,context_provider_message_id,sender_phone,message_text,received_at
    FROM public.whatsapp_customer_text_events
    WHERE alert_status='pending'
    ORDER BY received_at ASC,created_at ASC
    LIMIT ${safeLimit}
  `);

  let processed=0,handled=0,failed=0;
  for (const row of rowsOf(pending)) {
    const receivedAt=row.received_at instanceof Date ? row.received_at : new Date(String(row.received_at ?? ""));
    if (!Number.isFinite(receivedAt.getTime())) continue;
    processed+=1;
    try {
      const result=await handleWhatsAppCustomerText({
        inboundMessageId:String(row.inbound_message_id ?? ""),
        contextProviderMessageId:row.context_provider_message_id == null ? null : String(row.context_provider_message_id),
        fromPhone:String(row.sender_phone ?? ""),
        receivedAt,
        text:String(row.message_text ?? ""),
      });
      if (result==="handled" || result==="duplicate") handled+=1;
      else failed+=1;
    } catch {
      failed+=1;
    }
  }
  return { processed,handled,failed,staleReset };
}

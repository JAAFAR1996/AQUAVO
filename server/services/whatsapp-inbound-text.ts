import { sql } from "drizzle-orm";
import { getDb } from "../db.js";
import { normalizeIraqiWhatsAppPhone } from "./customer-messaging.js";
import { recordWhatsAppMarketingOptOut } from "./whatsapp-lifecycle.js";
import { escapeHtml, sendTelegramMessage } from "./order-notifications.js";

type Row = Record<string, unknown>;

export type WhatsAppTextReplyEvent = {
  inboundMessageId: string;
  contextProviderMessageId: string;
  fromPhone: string;
  receivedAt: Date;
  text: string;
};

function rowsOf(result: unknown): Row[] {
  if (Array.isArray(result)) return result as Row[];
  const rows = (result as { rows?: Row[] } | null)?.rows;
  return Array.isArray(rows) ? rows : [];
}

function normalizeReplyText(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[ـ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function isExplicitStopText(value: string): boolean {
  const normalized = normalizeReplyText(value);
  return new Set([
    "stop",
    "unsubscribe",
    "ايقاف",
    "إيقاف",
    "ايقاف التذكيرات",
    "إيقاف التذكيرات",
    "الغاء التذكيرات",
    "إلغاء التذكيرات",
    "لا ترسل",
    "لا ترسلون",
    "لا اريد رسائل",
    "لا أريد رسائل",
  ].map(normalizeReplyText)).has(normalized);
}

async function matchRecentOutbound(
  senderPhone: string,
  contextProviderMessageId: string,
  receivedAt: Date,
): Promise<{ orderId: string | null; sourceJobKind: string | null; sourceJobId: string | null }> {
  const db = getDb();
  if (!db) return { orderId: null, sourceJobKind: null, sourceJobId: null };

  const result = await db.execute(sql`
    WITH candidates AS (
      SELECT
        j.order_id,
        'delivery_care'::text AS source_job_kind,
        j.id AS source_job_id,
        j.provider_message_id,
        COALESCE(j.accepted_at,j.updated_at,j.created_at) AS sent_at
      FROM public.customer_message_jobs j
      JOIN public.orders o ON o.id=j.order_id
      WHERE j.job_type='delivery_care'
        AND j.status='completed'
        AND public.aquavo_normalize_iraqi_phone(o.customer_phone)=${senderPhone}

      UNION ALL

      SELECT
        j.order_id,
        j.job_type::text AS source_job_kind,
        j.id AS source_job_id,
        j.provider_message_id,
        COALESCE(j.accepted_at,j.updated_at,j.created_at) AS sent_at
      FROM public.customer_lifecycle_jobs j
      JOIN public.orders o ON o.id=j.order_id
      WHERE j.job_type IN ('day7_care','repurchase')
        AND j.status='completed'
        AND public.aquavo_normalize_iraqi_phone(o.customer_phone)=${senderPhone}
    )
    SELECT order_id,source_job_kind,source_job_id
    FROM candidates
    WHERE (
      ${contextProviderMessageId}<>'' AND provider_message_id=${contextProviderMessageId}
    ) OR (
      ${contextProviderMessageId}=''
      AND sent_at<=${receivedAt}
      AND sent_at>=${receivedAt} - interval '30 days'
    )
    ORDER BY
      CASE WHEN ${contextProviderMessageId}<>'' AND provider_message_id=${contextProviderMessageId}
           THEN 0 ELSE 1 END,
      sent_at DESC
    LIMIT 1
  `);

  const row=rowsOf(result)[0];
  return {
    orderId: row?.order_id == null ? null : String(row.order_id),
    sourceJobKind: row?.source_job_kind == null ? null : String(row.source_job_kind),
    sourceJobId: row?.source_job_id == null ? null : String(row.source_job_id),
  };
}

export async function recordWhatsAppTextReply(event: WhatsAppTextReplyEvent): Promise<"stored"|"duplicate"|"ignored"|"db_unavailable"> {
  const db=getDb();
  if (!db) return "db_unavailable";

  const senderPhone=normalizeIraqiWhatsAppPhone(event.fromPhone);
  const text=String(event.text ?? "").normalize("NFKC").trim().slice(0,2048);
  if (!senderPhone || !text || !event.inboundMessageId) return "ignored";

  const match=await matchRecentOutbound(senderPhone,event.contextProviderMessageId,event.receivedAt);
  const stop=isExplicitStopText(text);

  const inserted=await db.execute(sql`
    INSERT INTO public.whatsapp_inbound_text_events(
      inbound_message_id,context_provider_message_id,sender_phone,message_text,
      received_at,order_id,source_job_kind,source_job_id,marketing_opt_out
    ) VALUES(
      ${event.inboundMessageId},
      ${event.contextProviderMessageId || null},
      ${senderPhone},
      ${text},
      ${event.receivedAt},
      ${match.orderId},
      ${match.sourceJobKind},
      ${match.sourceJobId},
      ${stop}
    )
    ON CONFLICT(inbound_message_id) DO NOTHING
    RETURNING id
  `);
  if (rowsOf(inserted).length===0) return "duplicate";

  if (stop) {
    await recordWhatsAppMarketingOptOut(
      senderPhone,
      event.inboundMessageId,
      match.orderId,
      event.receivedAt,
    );
  }

  const alert=[
    "💬 <b>AQUAVO — رد WhatsApp من زبون</b>",
    match.sourceJobKind ? `<b>المسار:</b> ${escapeHtml(match.sourceJobKind)}` : "",
    match.orderId ? `<b>الطلب:</b> <code>${escapeHtml(match.orderId)}</code>` : "",
    stop ? "<b>الحالة:</b> طلب إيقاف الرسائل التسويقية" : "",
    `<b>النص:</b> ${escapeHtml(text.slice(0,700))}`,
    `<a href="https://wa.me/${senderPhone}">فتح محادثة WhatsApp</a>`,
  ].filter(Boolean).join("\n");

  try {
    await sendTelegramMessage(alert);
    await db.execute(sql`
      UPDATE public.whatsapp_inbound_text_events
      SET operator_alerted_at=clock_timestamp()
      WHERE inbound_message_id=${event.inboundMessageId}
        AND operator_alerted_at IS NULL
    `);
  } catch {
    // The inbound event is already durable. A later operator/worker audit can
    // surface rows with operator_alerted_at IS NULL without losing the reply.
  }

  return "stored";
}

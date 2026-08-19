import { sql } from "drizzle-orm";
import { getDb } from "../db.js";
import { normalizeIraqiWhatsAppPhone } from "./customer-messaging.js";
import {
  resolveDeliveryCareReplyChoice,
} from "./whatsapp-delivery-care-contract.js";
import {
  handleDeliveryCareButtonReply,
  type DeliveryCareButtonReplyEvent,
} from "./whatsapp-delivery-care-replies.js";

type Row = Record<string, unknown>;

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

function toEvent(row: Row): DeliveryCareButtonReplyEvent | null {
  const inboundMessageId = typeof row.inbound_message_id === "string" ? row.inbound_message_id.trim() : "";
  const contextProviderMessageId = typeof row.context_provider_message_id === "string"
    ? row.context_provider_message_id.trim()
    : "";
  const fromPhone = typeof row.sender_phone === "string" ? row.sender_phone.trim() : "";
  const payload = typeof row.button_payload === "string" ? row.button_payload : "";
  const buttonText = typeof row.button_text === "string" ? row.button_text : "";
  const receivedAt = row.received_at instanceof Date
    ? row.received_at
    : new Date(String(row.received_at ?? ""));

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
 * Persist a verified delivery-care button callback that could not yet be matched
 * to a completed outbound job. This closes the small race between Meta accepting
 * the outbound template and markAccepted() durably storing its wamid.
 */
export async function recordPendingDeliveryCareButtonReply(
  event: DeliveryCareButtonReplyEvent,
): Promise<boolean> {
  const db = getDb();
  if (!db) throw new Error("DB_UNAVAILABLE");

  const choice = resolveDeliveryCareReplyChoice(event.payload, event.buttonText);
  const senderPhone = normalizeIraqiWhatsAppPhone(event.fromPhone);
  if (!choice || !senderPhone) return false;

  const result = await db.execute(sql`
    INSERT INTO public.whatsapp_delivery_care_button_events (
      inbound_message_id,
      context_provider_message_id,
      sender_phone,
      button_payload,
      button_text,
      received_at
    ) VALUES (
      ${event.inboundMessageId},
      ${event.contextProviderMessageId},
      ${senderPhone},
      ${event.payload},
      ${event.buttonText},
      ${event.receivedAt}
    )
    ON CONFLICT (inbound_message_id) DO NOTHING
    RETURNING id
  `);

  return rowsOf(result).length > 0;
}

/**
 * A customer can change their mind after the first Quick Reply. The first inbound
 * callback remains the idempotency key for the automatic response, so later
 * choices are recorded for support visibility but never trigger a second auto
 * reply. Repeated presses of the same effective choice are ignored.
 */
export async function recordSubsequentDeliveryCareChoice(
  event: DeliveryCareButtonReplyEvent,
): Promise<boolean> {
  const db = getDb();
  if (!db) throw new Error("DB_UNAVAILABLE");

  const choice = resolveDeliveryCareReplyChoice(event.payload, event.buttonText);
  const senderPhone = normalizeIraqiWhatsAppPhone(event.fromPhone);
  if (!choice || !senderPhone) return false;

  const lookup = await db.execute(sql`
    SELECT job.id,
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
  if (!row) return false;

  const orderPhone = normalizeIraqiWhatsAppPhone(row.customer_phone);
  if (!orderPhone || orderPhone !== senderPhone) return false;

  const root = metadataRecord(row.metadata);
  const reply = asRecord(root.delivery_care_reply);
  if (!reply) return false;

  const primaryInboundMessageId = String(reply.inbound_message_id ?? "").trim();
  const currentChoice = String(reply.latest_choice ?? reply.choice ?? "").trim();
  if (!primaryInboundMessageId || primaryInboundMessageId === event.inboundMessageId) return false;
  if (currentChoice === choice) return false;

  const jobId = String(row.id ?? "").trim();
  if (!jobId) return false;

  const result = await db.execute(sql`
    UPDATE public.customer_message_jobs AS job
       SET metadata=jsonb_set(
             COALESCE(job.metadata, '{}'::jsonb),
             '{delivery_care_reply}',
             COALESCE(job.metadata->'delivery_care_reply', '{}'::jsonb)
             || jsonb_build_object(
                  'latest_choice', ${choice},
                  'latest_choice_at', ${event.receivedAt},
                  'subsequent_choices',
                    COALESCE(job.metadata->'delivery_care_reply'->'subsequent_choices', '[]'::jsonb)
                    || jsonb_build_array(
                         jsonb_build_object(
                           'inbound_message_id', ${event.inboundMessageId},
                           'choice', ${choice},
                           'received_at', ${event.receivedAt}
                         )
                       )
                ),
             true
           ),
           updated_at=clock_timestamp()
     WHERE job.id=${jobId}
       AND job.metadata->'delivery_care_reply' IS NOT NULL
       AND job.metadata->'delivery_care_reply'->>'inbound_message_id' IS DISTINCT FROM ${event.inboundMessageId}
       AND COALESCE(
             job.metadata->'delivery_care_reply'->>'latest_choice',
             job.metadata->'delivery_care_reply'->>'choice'
           )=${currentChoice}
       AND NOT EXISTS (
         SELECT 1
         FROM jsonb_array_elements(
           COALESCE(job.metadata->'delivery_care_reply'->'subsequent_choices', '[]'::jsonb)
         ) AS item
         WHERE item->>'inbound_message_id'=${event.inboundMessageId}
       )
    RETURNING job.id
  `);

  return rowsOf(result).length > 0;
}

/**
 * Replays only callbacks that were durably parked because the originating wamid
 * had not been persisted yet. Once the handler moves the event into the job's
 * metadata (or determines it is terminal), the inbox row is marked applied.
 */
export async function reconcilePendingDeliveryCareButtonReplies(limit = 25): Promise<number> {
  const db = getDb();
  if (!db) return 0;

  const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
  const pending = await db.execute(sql`
    SELECT id,
           inbound_message_id,
           context_provider_message_id,
           sender_phone,
           button_payload,
           button_text,
           received_at
      FROM public.whatsapp_delivery_care_button_events
     WHERE applied_at IS NULL
     ORDER BY received_at ASC, created_at ASC
     LIMIT ${safeLimit}
  `);

  let applied = 0;
  for (const row of rowsOf(pending)) {
    const eventId = String(row.id ?? "").trim();
    const event = toEvent(row);
    if (!eventId || !event) {
      if (eventId) {
        await db.execute(sql`
          UPDATE public.whatsapp_delivery_care_button_events
             SET applied_at=clock_timestamp()
           WHERE id=${eventId} AND applied_at IS NULL
        `);
      }
      continue;
    }

    const result = await handleDeliveryCareButtonReply(event);
    if (result.status === "unmatched") continue;
    if (result.status === "db_unavailable") throw new Error("DB_UNAVAILABLE");
    if (result.status === "duplicate") {
      await recordSubsequentDeliveryCareChoice(event);
    }

    const marked = await db.execute(sql`
      UPDATE public.whatsapp_delivery_care_button_events
         SET applied_at=clock_timestamp()
       WHERE id=${eventId}
         AND applied_at IS NULL
      RETURNING id
    `);
    applied += rowsOf(marked).length;
  }

  return applied;
}

/** Applied inbox rows are short-lived; unmatched races are retained for seven days. */
export async function cleanupDeliveryCareButtonInbox(limit = 500): Promise<number> {
  const db = getDb();
  if (!db) return 0;

  const safeLimit = Math.max(1, Math.min(2_000, Math.floor(limit)));
  const result = await db.execute(sql`
    WITH expired AS (
      SELECT id
      FROM public.whatsapp_delivery_care_button_events
      WHERE (
        applied_at IS NOT NULL
        AND applied_at <= clock_timestamp() - interval '1 day'
      ) OR (
        applied_at IS NULL
        AND created_at <= clock_timestamp() - interval '7 days'
      )
      ORDER BY created_at ASC
      LIMIT ${safeLimit}
    )
    DELETE FROM public.whatsapp_delivery_care_button_events AS event
    USING expired
    WHERE event.id=expired.id
    RETURNING event.id
  `);

  return rowsOf(result).length;
}

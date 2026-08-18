import { sql } from "drizzle-orm";
import { getDb } from "../db.js";

export type WhatsAppProviderStatus = "sent" | "delivered" | "read" | "failed";

export type WhatsAppProviderStatusEvent = {
  providerMessageId: string;
  status: WhatsAppProviderStatus;
  statusAt: Date;
  errorCode: string | null;
};

type Row = Record<string, unknown>;

const PROVIDER_STATUS_RANK: Record<"accepted" | WhatsAppProviderStatus, number> = {
  accepted: 0,
  sent: 1,
  delivered: 2,
  read: 3,
  failed: 4,
};

function rowsOf(result: unknown): Row[] {
  if (Array.isArray(result)) return result as Row[];
  const rows = (result as { rows?: Row[] } | null)?.rows;
  return Array.isArray(rows) ? rows : [];
}

/**
 * Persist the verified provider event before trying to match it to an outbox job.
 * This closes the race where Meta can post a status before markAccepted() stores
 * the returned wamid in customer_message_jobs.
 */
export async function recordWhatsAppProviderStatusEvent(event: WhatsAppProviderStatusEvent): Promise<void> {
  const db = getDb();
  if (!db) throw new Error("DB_UNAVAILABLE");

  await db.execute(sql`
    INSERT INTO public.whatsapp_provider_status_events (
      provider_message_id,
      provider_status,
      provider_status_at,
      error_code
    ) VALUES (
      ${event.providerMessageId},
      ${event.status},
      ${event.statusAt},
      ${event.errorCode}
    )
    ON CONFLICT (provider_message_id, provider_status, provider_status_at) DO NOTHING
  `);

  await reconcileWhatsAppProviderEvents(event.providerMessageId);
}

/**
 * Apply every unapplied event for one wamid in provider timestamp order. Once an
 * AQUAVO job exists, old/duplicate events are marked applied even if the monotonic
 * guard makes them a no-op; this keeps the inbox finite and idempotent.
 */
export async function reconcileWhatsAppProviderEvents(providerMessageId: string): Promise<number> {
  const db = getDb();
  if (!db) throw new Error("DB_UNAVAILABLE");

  const normalizedId = String(providerMessageId ?? "").trim();
  if (!normalizedId) return 0;

  const jobLookup = await db.execute(sql`
    SELECT id
    FROM public.customer_message_jobs
    WHERE provider_message_id=${normalizedId}
      AND status='completed'
    LIMIT 1
  `);
  if (rowsOf(jobLookup).length === 0) return 0;

  const pending = await db.execute(sql`
    SELECT id,provider_status,provider_status_at,error_code
    FROM public.whatsapp_provider_status_events
    WHERE provider_message_id=${normalizedId}
      AND applied_at IS NULL
    ORDER BY provider_status_at ASC,
             CASE provider_status
               WHEN 'sent' THEN 1
               WHEN 'delivered' THEN 2
               WHEN 'read' THEN 3
               WHEN 'failed' THEN 4
               ELSE 9
             END ASC,
             created_at ASC
  `);

  let applied = 0;
  for (const row of rowsOf(pending)) {
    const eventId = String(row.id ?? "");
    const status = String(row.provider_status ?? "") as WhatsAppProviderStatus;
    const statusAt = row.provider_status_at instanceof Date
      ? row.provider_status_at
      : new Date(String(row.provider_status_at ?? ""));
    const errorCode = row.error_code == null ? null : String(row.error_code);
    const incomingRank = PROVIDER_STATUS_RANK[status];

    if (!eventId || incomingRank == null || !Number.isFinite(statusAt.getTime())) continue;

    await db.execute(sql`
      UPDATE public.customer_message_jobs AS job
         SET provider_status=${status},
             provider_status_at=${statusAt},
             last_error_code=CASE
               WHEN ${status}='failed' THEN ${errorCode}
               WHEN job.last_error_code LIKE 'WHATSAPP_PROVIDER_FAILED_%' THEN NULL
               ELSE job.last_error_code
             END,
             last_error_at=CASE
               WHEN ${status}='failed' THEN ${statusAt}
               WHEN job.last_error_code LIKE 'WHATSAPP_PROVIDER_FAILED_%' THEN NULL
               ELSE job.last_error_at
             END,
             updated_at=clock_timestamp()
       WHERE job.provider_message_id=${normalizedId}
         AND job.status='completed'
         AND (
           job.provider_status_at IS NULL
           OR job.provider_status_at < ${statusAt}
           OR (
             job.provider_status_at = ${statusAt}
             AND CASE job.provider_status
               WHEN 'accepted' THEN 0
               WHEN 'sent' THEN 1
               WHEN 'delivered' THEN 2
               WHEN 'read' THEN 3
               WHEN 'failed' THEN 4
               ELSE -1
             END < ${incomingRank}
           )
         )
    `);

    const marked = await db.execute(sql`
      UPDATE public.whatsapp_provider_status_events AS event
         SET applied_at=clock_timestamp()
       WHERE event.id=${eventId}
         AND event.applied_at IS NULL
         AND EXISTS (
           SELECT 1
           FROM public.customer_message_jobs AS job
           WHERE job.provider_message_id=${normalizedId}
             AND job.status='completed'
         )
      RETURNING event.id
    `);
    applied += rowsOf(marked).length;
  }

  return applied;
}

/** Recovery for any event that survived a race/transient DB failure. */
export async function reconcilePendingWhatsAppProviderEvents(limit = 25): Promise<number> {
  const db = getDb();
  if (!db) return 0;

  const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
  const result = await db.execute(sql`
    SELECT DISTINCT event.provider_message_id
    FROM public.whatsapp_provider_status_events AS event
    JOIN public.customer_message_jobs AS job
      ON job.provider_message_id=event.provider_message_id
     AND job.status='completed'
    WHERE event.applied_at IS NULL
    ORDER BY event.provider_message_id
    LIMIT ${safeLimit}
  `);

  let applied = 0;
  for (const row of rowsOf(result)) {
    const providerMessageId = String(row.provider_message_id ?? "");
    if (!providerMessageId) continue;
    applied += await reconcileWhatsAppProviderEvents(providerMessageId);
  }
  return applied;
}

/**
 * Bound provider-event storage without shortening the wamid race window. Applied
 * events are disposable after one day; unmatched events stay seven days so a
 * delayed acceptance/reconciliation can still recover them. Work is capped per
 * invocation to keep the five-minute worker predictable.
 */
export async function cleanupWhatsAppProviderStatusEvents(limit = 500): Promise<number> {
  const db = getDb();
  if (!db) return 0;

  const safeLimit = Math.max(1, Math.min(2_000, Math.floor(limit)));
  const result = await db.execute(sql`
    WITH expired AS (
      SELECT id
      FROM public.whatsapp_provider_status_events
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
    DELETE FROM public.whatsapp_provider_status_events AS event
    USING expired
    WHERE event.id=expired.id
    RETURNING event.id
  `);

  return rowsOf(result).length;
}

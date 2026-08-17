-- 0079_customer_post_delivery_messaging
-- Durable post-delivery messaging outbox for AQUAVO.
--
-- Design goals:
--   1. A successful transition into orders.status='delivered' creates the
--      customer-care job inside the SAME PostgreSQL transaction as the status
--      update (transactional outbox pattern).
--   2. UNIQUE(order_id, job_type) makes delivery/retry paths idempotent.
--   3. WhatsApp/API failures can never roll back or corrupt order/accounting data.
--   4. Review solicitation is intentionally delayed and kept separate from the
--      immediate post-delivery care message.
--
-- 0078 is intentionally reserved by the in-flight accounting hardening branch.

BEGIN;

CREATE TABLE IF NOT EXISTS public.customer_message_jobs (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_id text NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  job_type text NOT NULL,
  channel text NOT NULL DEFAULT 'whatsapp',
  status text NOT NULL DEFAULT 'pending',
  due_at timestamptz NOT NULL,
  attempt_count integer NOT NULL DEFAULT 0,
  provider_message_id text,
  last_error_code text,
  last_error_at timestamptz,
  locked_at timestamptz,
  sent_at timestamptz,
  cancelled_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT customer_message_jobs_type_chk
    CHECK (job_type IN ('delivery_care', 'review_request', 'review_reminder')),
  CONSTRAINT customer_message_jobs_channel_chk
    CHECK (channel IN ('whatsapp')),
  CONSTRAINT customer_message_jobs_status_chk
    CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'cancelled')),
  CONSTRAINT customer_message_jobs_attempt_count_chk
    CHECK (attempt_count >= 0),
  CONSTRAINT customer_message_jobs_order_type_uq
    UNIQUE (order_id, job_type)
);

CREATE INDEX IF NOT EXISTS customer_message_jobs_due_idx
  ON public.customer_message_jobs (due_at, created_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS customer_message_jobs_provider_message_idx
  ON public.customer_message_jobs (provider_message_id)
  WHERE provider_message_id IS NOT NULL;

COMMENT ON TABLE public.customer_message_jobs IS
  'Durable idempotent outbox for AQUAVO post-delivery customer messages. Order truth remains in orders; this table only schedules/records messaging.';

COMMENT ON CONSTRAINT customer_message_jobs_order_type_uq
  ON public.customer_message_jobs IS
  'At most one lifecycle message of each type per order, even if an admin retries the same status update or a worker is invoked more than once.';

CREATE OR REPLACE FUNCTION public.aquavo_enqueue_post_delivery_messages()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- New genuine delivery transition. The care message is due immediately.
  IF NEW.status = 'delivered' AND OLD.status IS DISTINCT FROM 'delivered' THEN
    INSERT INTO public.customer_message_jobs (
      order_id,
      job_type,
      due_at,
      metadata
    ) VALUES (
      NEW.id,
      'delivery_care',
      clock_timestamp(),
      jsonb_build_object(
        'source', 'order_status_transition',
        'from_status', OLD.status,
        'to_status', NEW.status
      )
    )
    ON CONFLICT (order_id, job_type) DO NOTHING;

    -- Conservative fallback. Application code may move this to day 7 for
    -- fast-use-only orders after product classification; mixed/equipment orders
    -- stay at day 14. Keeping the DB fallback at 14 prevents an accidental
    -- premature review request if classification is unavailable.
    INSERT INTO public.customer_message_jobs (
      order_id,
      job_type,
      due_at,
      metadata
    ) VALUES (
      NEW.id,
      'review_request',
      clock_timestamp() + interval '14 days',
      jsonb_build_object(
        'source', 'order_status_transition',
        'schedule_policy', 'conservative_fallback_14d'
      )
    )
    ON CONFLICT (order_id, job_type) DO NOTHING;
  END IF;

  -- If a delivery is corrected into a non-delivered terminal/problem state,
  -- suppress review solicitation. We deliberately do not try to "unsend" an
  -- already-sent care message.
  IF OLD.status = 'delivered'
     AND NEW.status IS DISTINCT FROM 'delivered'
     AND NEW.status IN ('cancelled', 'rejected', 'rejected_returned', 'rejected_carrier', 'returned') THEN
    UPDATE public.customer_message_jobs
       SET status = 'cancelled',
           cancelled_at = clock_timestamp(),
           locked_at = NULL,
           updated_at = clock_timestamp(),
           last_error_code = 'ORDER_NO_LONGER_DELIVERED'
     WHERE order_id = NEW.id
       AND job_type IN ('review_request', 'review_reminder')
       AND status = 'pending';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_post_delivery_messages ON public.orders;
CREATE TRIGGER trg_orders_post_delivery_messages
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.aquavo_enqueue_post_delivery_messages();

INSERT INTO public.schema_migrations(version, checksum, notes)
VALUES(
  '0079_customer_post_delivery_messaging',
  '0079007900790079007900790079007900790079007900790079007900790079',
  'Transactional outbox + idempotent delivery-care/review scheduling on delivered order transition'
)
ON CONFLICT(version) DO UPDATE
SET checksum=EXCLUDED.checksum,
    notes=EXCLUDED.notes,
    rolled_back_at=NULL,
    applied_at=now();

COMMIT;

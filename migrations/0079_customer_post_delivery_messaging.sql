-- 0079_customer_post_delivery_messaging
-- Durable post-delivery messaging outbox for AQUAVO.
--
-- Phase 1 scope is intentionally narrow: queue only the immediate delivery-care
-- message. Review requests are enabled only after the secure review-token and
-- support-suppression flow exists.
--
-- Design goals:
--   1. A successful transition into orders.status='delivered' creates the
--      customer-care job inside the SAME PostgreSQL transaction as the status
--      update (transactional outbox pattern).
--   2. UNIQUE(order_id, job_type) makes enqueue/retry paths idempotent.
--   3. WhatsApp/API failures can never roll back or corrupt order/accounting data.
--   4. Provider acceptance is distinguished from handset delivery/read status.
--   5. 0079 fails closed unless accounting migration 0078 is already active.

BEGIN;

DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.schema_migrations
    WHERE version='0078_accounting_external_handoff_hardening'
      AND rolled_back_at IS NULL
  ) THEN
    RAISE EXCEPTION
      '0079_DEPENDENCY_MISSING: apply active 0078_accounting_external_handoff_hardening before customer messaging'
      USING ERRCODE='55000';
  END IF;
END
$do$;

CREATE TABLE IF NOT EXISTS public.customer_message_jobs (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_id text NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  job_type text NOT NULL,
  channel text NOT NULL DEFAULT 'whatsapp',
  status text NOT NULL DEFAULT 'pending',
  due_at timestamptz NOT NULL,
  attempt_count integer NOT NULL DEFAULT 0,
  provider_message_id text,
  provider_status text,
  last_error_code text,
  last_error_at timestamptz,
  locked_at timestamptz,
  accepted_at timestamptz,
  cancelled_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT customer_message_jobs_type_chk
    CHECK (job_type IN ('delivery_care', 'review_request', 'review_reminder')),
  CONSTRAINT customer_message_jobs_channel_chk
    CHECK (channel IN ('whatsapp')),
  CONSTRAINT customer_message_jobs_status_chk
    CHECK (status IN ('pending', 'sending', 'completed', 'failed', 'cancelled')),
  CONSTRAINT customer_message_jobs_provider_status_chk
    CHECK (provider_status IS NULL OR provider_status IN ('accepted', 'sent', 'delivered', 'read', 'failed')),
  CONSTRAINT customer_message_jobs_attempt_count_chk
    CHECK (attempt_count >= 0),
  CONSTRAINT customer_message_jobs_order_type_uq
    UNIQUE (order_id, job_type)
);

CREATE INDEX IF NOT EXISTS customer_message_jobs_due_idx
  ON public.customer_message_jobs (due_at, created_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS customer_message_jobs_stale_sending_idx
  ON public.customer_message_jobs (locked_at, created_at)
  WHERE status = 'sending';

CREATE INDEX IF NOT EXISTS customer_message_jobs_provider_message_idx
  ON public.customer_message_jobs (provider_message_id)
  WHERE provider_message_id IS NOT NULL;

COMMENT ON TABLE public.customer_message_jobs IS
  'Durable idempotent outbox for AQUAVO customer messages. Job completion means provider API acceptance; provider_status tracks later WhatsApp delivery lifecycle.';

COMMENT ON CONSTRAINT customer_message_jobs_order_type_uq
  ON public.customer_message_jobs IS
  'At most one lifecycle message of each type per order, even if an admin retries the same status update or a worker is invoked more than once.';

CREATE OR REPLACE FUNCTION public.aquavo_enqueue_post_delivery_messages()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- New genuine delivery transition. Phase 1 queues care only.
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
        'to_status', NEW.status,
        'phase', 'delivery_care_only'
      )
    )
    ON CONFLICT (order_id, job_type) DO NOTHING;
  END IF;

  -- If delivery was corrected before a pending lifecycle message was sent,
  -- suppress it. We do not mutate an in-flight 'sending' row because the
  -- provider request may already have left the process.
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
       AND job_type IN ('delivery_care', 'review_request', 'review_reminder')
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

-- Production runtime receives only the privileges needed by the outbox path.
DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='aquavo_runtime') THEN
    REVOKE ALL ON public.customer_message_jobs FROM PUBLIC;
    GRANT SELECT,INSERT,UPDATE ON public.customer_message_jobs TO aquavo_runtime;
    REVOKE ALL ON FUNCTION public.aquavo_enqueue_post_delivery_messages() FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.aquavo_enqueue_post_delivery_messages() TO aquavo_runtime;
  END IF;
END
$do$;

INSERT INTO public.schema_migrations(version, checksum, notes)
VALUES(
  '0079_customer_post_delivery_messaging',
  '0079007900790079007900790079007900790079007900790079007900790079',
  'Transactional delivery-care outbox; provider acceptance status; review automation intentionally deferred'
)
ON CONFLICT(version) DO UPDATE
SET checksum=EXCLUDED.checksum,
    notes=EXCLUDED.notes,
    rolled_back_at=NULL,
    applied_at=now();

COMMIT;

-- A committed provider capture cannot be downgraded by stale poll/link writes.
-- Refunds remain a separate event-backed transition governed by existing guards.
BEGIN;
SET LOCAL lock_timeout='5s';
CREATE OR REPLACE FUNCTION public.guard_wayl_completed_payment()
RETURNS trigger LANGUAGE plpgsql AS $body$
BEGIN
  IF OLD.method='wayl' AND OLD.status='completed' AND NEW.status IN ('pending','failed','cancelled','expired') THEN
    RAISE EXCEPTION 'WAYL_CAPTURE_STATE_IS_MONOTONIC' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END
$body$;
CREATE OR REPLACE TRIGGER payments_wayl_monotonic_guard BEFORE UPDATE OF status ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.guard_wayl_completed_payment();
CREATE OR REPLACE FUNCTION public.guard_wayl_paid_order()
RETURNS trigger LANGUAGE plpgsql AS $body$
BEGIN
  IF OLD.payment_status='paid' AND NEW.payment_status IN ('pending','failed','cancelled','expired')
     AND EXISTS(SELECT 1 FROM public.payment_events WHERE order_id=OLD.id AND method='wayl' AND event_type='capture' AND status='completed') THEN
    RAISE EXCEPTION 'WAYL_CAPTURE_STATE_IS_MONOTONIC' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END
$body$;
CREATE OR REPLACE TRIGGER orders_wayl_monotonic_guard BEFORE UPDATE OF payment_status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.guard_wayl_paid_order();
DO $ledger$
DECLARE v_checksum text:=current_setting('aquavo.migration_checksum',true);
BEGIN
  IF v_checksum IS NULL OR v_checksum !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION '0102_REQUIRES_ACTUAL_FILE_SHA256'; END IF;
  IF EXISTS(SELECT 1 FROM public.schema_migrations WHERE version='0102_wayl_monotonic_payment_guards' AND checksum IS DISTINCT FROM v_checksum) THEN
    RAISE EXCEPTION '0102_MIGRATION_CHECKSUM_MISMATCH';
  END IF;
  INSERT INTO public.schema_migrations(version,checksum,notes)
  VALUES('0102_wayl_monotonic_payment_guards',v_checksum,'Prevent stale application writes downgrading verified Wayl captures. Historical rows unchanged.')
  ON CONFLICT(version) DO NOTHING;
END
$ledger$;
COMMIT;

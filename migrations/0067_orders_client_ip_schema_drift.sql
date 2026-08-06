-- 0067_orders_client_ip_schema_drift.sql
-- Restore the optional order IP snapshot required by order creation and the
-- atomic admin status-transition route. Nullable by design: historical rows may
-- not have a recoverable source IP.
BEGIN;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS client_ip text;

COMMENT ON COLUMN public.orders.client_ip IS
  'First client IP recorded at order creation for repeated-refusal abuse tracking.';

INSERT INTO public.schema_migrations(version,checksum,applied_by,notes)
VALUES(
  '0067_orders_client_ip_schema_drift',
  '411cdfb06596a3aeaf5abf3a4b876120803cbf84515490d99cb1af78217198c7',
  current_user,
  'Add the optional orders.client_ip column required by order creation and atomic admin status transitions'
)
ON CONFLICT(version) DO UPDATE SET
  checksum=EXCLUDED.checksum,
  applied_by=EXCLUDED.applied_by,
  notes=EXCLUDED.notes,
  rolled_back_at=NULL,
  applied_at=now();

COMMIT;

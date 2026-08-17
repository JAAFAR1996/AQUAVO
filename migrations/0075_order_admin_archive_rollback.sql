-- 0075_order_admin_archive_rollback.sql
-- Safe rollback is allowed only while no order is archived. Once archive state is
-- in use, fail closed so an operator cannot silently make archived orders active
-- again by dropping the marker column.

BEGIN;

DO $do$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.orders
    WHERE archived_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION
      '0075_ROLLBACK_BLOCKED: archived orders exist; restore them explicitly before removing order archive support'
      USING ERRCODE='55000';
  END IF;
END $do$;

DROP INDEX IF EXISTS public.orders_archived_at_idx;
ALTER TABLE public.orders DROP COLUMN IF EXISTS archived_at;

UPDATE public.schema_migrations
SET rolled_back_at=clock_timestamp(),
    notes=COALESCE(notes,'')||' [order archive support rolled back before archive state was in use]'
WHERE version='0075_order_admin_archive';

COMMIT;

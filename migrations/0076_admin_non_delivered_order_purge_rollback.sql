BEGIN;

DROP FUNCTION IF EXISTS public.purge_non_delivered_order(text,text,text);

UPDATE public.schema_migrations
SET rolled_back_at=clock_timestamp(),
    notes=COALESCE(notes,'')||' [admin non-delivered order purge support rolled back]'
WHERE version='0076_admin_non_delivered_order_purge';

COMMIT;

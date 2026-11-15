-- Roll back application code first. The additive column can remain in place.
BEGIN;
SET LOCAL lock_timeout = '5s';
LOCK TABLE public.manual_invoices IN ACCESS EXCLUSIVE MODE;
DO $rollback$
BEGIN
  IF EXISTS (SELECT 1 FROM public.manual_invoices WHERE invoice_locale <> 'ar') THEN
    RAISE EXCEPTION '0105_ROLLBACK_WOULD_DISCARD_INVOICE_LANGUAGE';
  END IF;
END $rollback$;
ALTER TABLE public.manual_invoices DROP COLUMN invoice_locale;
DELETE FROM public.schema_migrations WHERE version = '0105_manual_invoice_locale';
COMMIT;

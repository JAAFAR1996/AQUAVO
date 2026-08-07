-- 0072_accounting_require_explicit_shipped_carrier_rollback.sql
-- Restore the pre-0072 compatibility behavior from migrations 0057/0061.
BEGIN;

CREATE OR REPLACE FUNCTION public.apply_default_delivery_company_to_order()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_name text;v_fee numeric;
BEGIN
  IF NULLIF(btrim(COALESCE(NEW.carrier,'')),'') IS NULL THEN
    SELECT name,default_fee INTO v_name,v_fee
    FROM public.delivery_companies
    WHERE active=true AND is_default=true
    LIMIT 1;
    IF v_name IS NOT NULL THEN
      NEW.carrier:=v_name;
      IF NEW.carrier_fee IS NULL THEN NEW.carrier_fee:=v_fee;END IF;
    END IF;
  ELSE
    SELECT default_fee INTO v_fee
    FROM public.delivery_companies
    WHERE active=true AND lower(name)=lower(btrim(NEW.carrier))
    LIMIT 1;
    IF FOUND AND (NEW.carrier_fee IS NULL OR (TG_OP='UPDATE' AND NEW.carrier IS DISTINCT FROM OLD.carrier)) THEN
      NEW.carrier_fee:=v_fee;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS orders_apply_default_delivery_company ON public.orders;
CREATE TRIGGER orders_apply_default_delivery_company
BEFORE INSERT OR UPDATE OF carrier,status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.apply_default_delivery_company_to_order();

UPDATE public.schema_migrations
SET rolled_back_at=clock_timestamp(),
    notes=COALESCE(notes,'')||' [explicit shipped carrier guard rolled back]'
WHERE version='0072_accounting_require_explicit_shipped_carrier';

COMMIT;

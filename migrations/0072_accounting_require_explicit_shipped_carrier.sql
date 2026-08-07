-- 0072_accounting_require_explicit_shipped_carrier.sql
-- Require an explicit active delivery company when an order enters shipped.
-- Existing non-shipped compatibility keeps the legacy default-carrier behavior.
BEGIN;

CREATE OR REPLACE FUNCTION public.apply_default_delivery_company_to_order()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_name text;
  v_fee numeric;
  v_entering_shipped boolean;
BEGIN
  v_entering_shipped :=
    NEW.status='shipped'
    AND (
      TG_OP='INSERT'
      OR (TG_OP='UPDATE' AND OLD.status IS DISTINCT FROM NEW.status)
    );

  IF v_entering_shipped THEN
    IF NULLIF(btrim(COALESCE(NEW.carrier,'')),'') IS NULL THEN
      RAISE EXCEPTION
        'DELIVERY_COMPANY_REQUIRED_FOR_SHIPPED: اختر شركة توصيل فعالة قبل تسليم الطلب للنقل';
    END IF;

    SELECT name,default_fee INTO v_name,v_fee
    FROM public.delivery_companies
    WHERE active=true AND name=btrim(NEW.carrier)
    LIMIT 1;

    IF v_name IS NULL THEN
      RAISE EXCEPTION
        'DELIVERY_COMPANY_INACTIVE_OR_UNKNOWN: شركة التوصيل غير موجودة أو غير فعالة';
    END IF;

    NEW.carrier:=v_name;
    NEW.carrier_fee:=v_fee;
    RETURN NEW;
  END IF;

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
    WHERE active=true AND name=btrim(NEW.carrier)
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

INSERT INTO public.schema_migrations(version,checksum,notes)
VALUES(
  '0072_accounting_require_explicit_shipped_carrier',
  '5165e24b4d4c4a9388594072e42122255b3943e67c89ddc82c45a83787c2dec6',
  'Require an explicit active delivery company on shipped transitions while preserving legacy defaults outside shipped'
)
ON CONFLICT(version) DO UPDATE SET
  checksum=EXCLUDED.checksum,
  notes=EXCLUDED.notes,
  rolled_back_at=NULL,
  applied_at=now();

COMMIT;

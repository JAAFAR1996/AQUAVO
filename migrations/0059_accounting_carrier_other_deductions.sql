-- 0059_accounting_carrier_other_deductions.sql
-- Delivery fees remain exact multiples of the selected company's configured fee.
-- Any remaining statement deduction is shown separately and requires an explanation.
BEGIN;

ALTER TABLE public.accounting_monthly_positions
  ADD COLUMN IF NOT EXISTS other_deduction_amount numeric NOT NULL DEFAULT 0;
ALTER TABLE public.accounting_monthly_positions
  ADD COLUMN IF NOT EXISTS other_deduction_note text;

ALTER TABLE public.accounting_monthly_positions
  DROP CONSTRAINT IF EXISTS accounting_monthly_positions_carrier_chk;
ALTER TABLE public.accounting_monthly_positions
  ADD CONSTRAINT accounting_monthly_positions_carrier_chk CHECK(
    (
      position_type='carrier_receivable'
      AND delivery_company_id IS NOT NULL
      AND amount=gross_amount-fee_amount-other_deduction_amount
      AND (other_deduction_amount=0 OR NULLIF(btrim(COALESCE(other_deduction_note,'')),'') IS NOT NULL)
    )
    OR
    (
      position_type<>'carrier_receivable'
      AND delivery_company_id IS NULL
      AND gross_amount=0
      AND fee_amount=0
      AND other_deduction_amount=0
      AND other_deduction_note IS NULL
    )
  ) NOT VALID;
ALTER TABLE public.accounting_monthly_positions
  VALIDATE CONSTRAINT accounting_monthly_positions_carrier_chk;

CREATE OR REPLACE FUNCTION public.validate_carrier_monthly_position_fee()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_default_fee numeric;
BEGIN
  IF NEW.position_type<>'carrier_receivable' THEN RETURN NEW;END IF;
  SELECT default_fee INTO v_default_fee
  FROM public.delivery_companies
  WHERE id=NEW.delivery_company_id AND active=true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'DELIVERY_COMPANY_NOT_ACTIVE';
  END IF;
  IF v_default_fee>0 AND mod(NEW.fee_amount,v_default_fee)<>0 THEN
    RAISE EXCEPTION 'CARRIER_FEE_NOT_MULTIPLE: delivery fees must be multiples of %; put any remaining difference in other_deduction_amount',v_default_fee;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS accounting_monthly_positions_validate_carrier_fee ON public.accounting_monthly_positions;
CREATE TRIGGER accounting_monthly_positions_validate_carrier_fee
BEFORE INSERT OR UPDATE OF position_type,delivery_company_id,fee_amount
ON public.accounting_monthly_positions
FOR EACH ROW EXECUTE FUNCTION public.validate_carrier_monthly_position_fee();

INSERT INTO public.schema_migrations(version,checksum,notes)
VALUES(
  '0059_accounting_carrier_other_deductions',
  '4a7a60c66042d42237fc73cd8ba70ecc840f724fda19ba9e77b24da473e20e75',
  'Separate fixed delivery fees from explained carrier statement deductions'
)
ON CONFLICT(version) DO UPDATE SET
  checksum=EXCLUDED.checksum,
  notes=EXCLUDED.notes,
  rolled_back_at=NULL,
  applied_at=now();

COMMIT;

-- 0059_accounting_carrier_other_deductions_rollback.sql
-- A rollback is safe only before any explained non-delivery deduction exists.
BEGIN;

DO $$
BEGIN
  IF EXISTS(
    SELECT 1 FROM public.accounting_monthly_positions
    WHERE COALESCE(other_deduction_amount,0)<>0
  ) THEN
    RAISE EXCEPTION '0059_ROLLBACK_BLOCKED: explained carrier statement deductions already exist';
  END IF;
END $$;

DROP TRIGGER IF EXISTS accounting_monthly_positions_validate_carrier_fee ON public.accounting_monthly_positions;
DROP FUNCTION IF EXISTS public.validate_carrier_monthly_position_fee();

ALTER TABLE public.accounting_monthly_positions
  DROP CONSTRAINT IF EXISTS accounting_monthly_positions_carrier_chk;
ALTER TABLE public.accounting_monthly_positions
  ADD CONSTRAINT accounting_monthly_positions_carrier_chk CHECK(
    (position_type='carrier_receivable' AND delivery_company_id IS NOT NULL AND amount=gross_amount-fee_amount)
    OR
    (position_type<>'carrier_receivable' AND delivery_company_id IS NULL AND gross_amount=0 AND fee_amount=0)
  ) NOT VALID;
ALTER TABLE public.accounting_monthly_positions
  VALIDATE CONSTRAINT accounting_monthly_positions_carrier_chk;

ALTER TABLE public.accounting_monthly_positions DROP COLUMN IF EXISTS other_deduction_note;
ALTER TABLE public.accounting_monthly_positions DROP COLUMN IF EXISTS other_deduction_amount;

UPDATE public.schema_migrations
SET rolled_back_at=clock_timestamp(),notes=COALESCE(notes,'')||' [rolled back before other deductions]'
WHERE version='0059_accounting_carrier_other_deductions';

COMMIT;

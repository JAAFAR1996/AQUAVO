-- 0057_accounting_operating_defaults.sql
-- Multiple delivery companies, default Al-Waseet selection, and optional monthly
-- financial-position snapshots. Snapshots reconcile custody/balances; they never
-- overwrite monthly profit or create revenue by themselves.
BEGIN;

CREATE TABLE IF NOT EXISTS public.delivery_companies (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_key text NOT NULL UNIQUE,
  name text NOT NULL UNIQUE,
  default_fee numeric NOT NULL DEFAULT 5000,
  active boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  notes text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT delivery_companies_key_chk CHECK(company_key ~ '^[a-z0-9][a-z0-9_-]{1,63}$'),
  CONSTRAINT delivery_companies_name_chk CHECK(NULLIF(btrim(name),'') IS NOT NULL),
  CONSTRAINT delivery_companies_fee_chk CHECK(default_fee>=0)
);
CREATE UNIQUE INDEX IF NOT EXISTS delivery_companies_one_default_idx
  ON public.delivery_companies((is_default)) WHERE is_default=true AND active=true;
CREATE INDEX IF NOT EXISTS delivery_companies_active_name_idx
  ON public.delivery_companies(active,name);

INSERT INTO public.delivery_companies(company_key,name,default_fee,active,is_default,notes,created_by)
VALUES('alwaseet','الوسيط',5000,true,true,'شركة التوصيل الافتراضية الحالية لـ AQUAVO','migration_0057')
ON CONFLICT(company_key) DO UPDATE SET
  name=EXCLUDED.name,
  default_fee=EXCLUDED.default_fee,
  active=true,
  is_default=true,
  updated_at=clock_timestamp();

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
BEFORE INSERT OR UPDATE OF carrier ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.apply_default_delivery_company_to_order();

CREATE TABLE IF NOT EXISTS public.accounting_monthly_positions (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  period_key text NOT NULL,
  position_type text NOT NULL,
  delivery_company_id text REFERENCES public.delivery_companies(id) ON DELETE RESTRICT,
  amount numeric NOT NULL DEFAULT 0,
  gross_amount numeric NOT NULL DEFAULT 0,
  fee_amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'IQD',
  evidence_mode text NOT NULL DEFAULT 'owner_confirmation',
  evidence_file_id text REFERENCES public.evidence_files(id) ON DELETE RESTRICT,
  note text,
  status text NOT NULL DEFAULT 'confirmed',
  confirmed_by text,
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT accounting_monthly_positions_period_chk CHECK(period_key ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  CONSTRAINT accounting_monthly_positions_type_chk CHECK(position_type IN ('cash','bank','carrier_receivable','supplier_payable','other_receivable')),
  CONSTRAINT accounting_monthly_positions_money_chk CHECK(amount>=0 AND gross_amount>=0 AND fee_amount>=0),
  CONSTRAINT accounting_monthly_positions_mode_chk CHECK(evidence_mode IN ('owner_confirmation','electronic_attachment','system_derived')),
  CONSTRAINT accounting_monthly_positions_status_chk CHECK(status IN ('confirmed','superseded')),
  CONSTRAINT accounting_monthly_positions_carrier_chk CHECK(
    (position_type='carrier_receivable' AND delivery_company_id IS NOT NULL AND amount=gross_amount-fee_amount)
    OR
    (position_type<>'carrier_receivable' AND delivery_company_id IS NULL AND gross_amount=0 AND fee_amount=0)
  ),
  CONSTRAINT accounting_monthly_positions_evidence_chk CHECK(
    (evidence_mode='electronic_attachment' AND evidence_file_id IS NOT NULL)
    OR
    (evidence_mode='owner_confirmation' AND NULLIF(btrim(COALESCE(note,'')),'') IS NOT NULL)
    OR
    evidence_mode='system_derived'
  )
);
CREATE UNIQUE INDEX IF NOT EXISTS accounting_monthly_positions_current_unique_idx
  ON public.accounting_monthly_positions(period_key,position_type,COALESCE(delivery_company_id,''))
  WHERE status='confirmed';
CREATE INDEX IF NOT EXISTS accounting_monthly_positions_period_idx
  ON public.accounting_monthly_positions(period_key,position_type,confirmed_at);

INSERT INTO public.schema_migrations(version,checksum,notes)
VALUES(
  '0057_accounting_operating_defaults',
  '5f1de7532dd120185d2810906c04476b7cac2d5510cba74a2d9b50fb37603610',
  'Multiple delivery companies with Al-Waseet default and optional monthly position snapshots'
)
ON CONFLICT(version) DO UPDATE SET
  checksum=EXCLUDED.checksum,
  notes=EXCLUDED.notes,
  rolled_back_at=NULL,
  applied_at=now();

COMMIT;

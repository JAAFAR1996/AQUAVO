-- 0051_accounting_august_foundation.sql
-- Generated from the fresh-Neon-validated August accounting cutover.

BEGIN;

-- AQUAVO / محل المنبع — accounting cutover from 2026-08-01 Asia/Baghdad.
-- Gross COD already includes customer delivery. Example: 30,000 gross;
-- carrier keeps 5,000; AQUAVO product revenue and net entitlement are 25,000.

CREATE TABLE IF NOT EXISTS public.accounting_cutovers (
  id text PRIMARY KEY,
  cutover_at timestamptz NOT NULL,
  timezone text NOT NULL,
  currency text NOT NULL DEFAULT 'IQD',
  status text NOT NULL DEFAULT 'active',
  notes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT accounting_cutovers_status_chk CHECK (status IN ('active','superseded','cancelled')),
  CONSTRAINT accounting_cutovers_timezone_chk CHECK (timezone = 'Asia/Baghdad')
);

INSERT INTO public.accounting_cutovers(id,cutover_at,timezone,currency,status,notes)
VALUES('aquavo-2026-08-01','2026-08-01 00:00:00 Asia/Baghdad'::timestamptz,'Asia/Baghdad','IQD','active',
  jsonb_build_object('legal_name','محل المنبع','brand','AQUAVO','policy','gross COD includes customer delivery; carrier retains its fee; merchant receives net'))
ON CONFLICT(id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.order_accounting_facts (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_id text NOT NULL UNIQUE REFERENCES public.orders(id),
  payment_event_id text NOT NULL UNIQUE REFERENCES public.payment_events(id),
  recognized_at timestamptz NOT NULL,
  period_key text NOT NULL,
  gross_collected numeric NOT NULL,
  customer_delivery_fee numeric NOT NULL,
  carrier_fee numeric NOT NULL,
  product_revenue numeric NOT NULL,
  merchant_net numeric NOT NULL,
  delivery_subsidy numeric NOT NULL DEFAULT 0,
  delivery_surplus numeric NOT NULL DEFAULT 0,
  cash_custody text NOT NULL DEFAULT 'carrier',
  cogs_amount numeric,
  cost_status text NOT NULL,
  currency text NOT NULL DEFAULT 'IQD',
  policy_version text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT order_accounting_facts_period_chk CHECK(period_key ~ '^[0-9]{4}-[0-9]{2}$'),
  CONSTRAINT order_accounting_facts_money_nonnegative_chk CHECK(gross_collected>=0 AND customer_delivery_fee>=0 AND carrier_fee>=0 AND product_revenue>=0 AND merchant_net>=0 AND delivery_subsidy>=0 AND delivery_surplus>=0 AND (cogs_amount IS NULL OR cogs_amount>=0)),
  CONSTRAINT order_accounting_facts_gross_identity_chk CHECK(gross_collected=product_revenue+customer_delivery_fee),
  CONSTRAINT order_accounting_facts_net_identity_chk CHECK(merchant_net=gross_collected-carrier_fee),
  CONSTRAINT order_accounting_facts_delivery_variance_chk CHECK(delivery_subsidy=GREATEST(carrier_fee-customer_delivery_fee,0) AND delivery_surplus=GREATEST(customer_delivery_fee-carrier_fee,0)),
  CONSTRAINT order_accounting_facts_cash_custody_chk CHECK(cash_custody IN ('carrier','owner_cash','bank','other')),
  CONSTRAINT order_accounting_facts_cost_status_chk CHECK(cost_status IN ('exact','verified_zero','incomplete','unknown'))
);
CREATE INDEX IF NOT EXISTS order_accounting_facts_period_idx ON public.order_accounting_facts(period_key,recognized_at);

CREATE TABLE IF NOT EXISTS public.order_accounting_settlements (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_fact_id text NOT NULL UNIQUE REFERENCES public.order_accounting_facts(id) ON DELETE RESTRICT,
  settlement_id text NOT NULL REFERENCES public.cash_settlements(id) ON DELETE RESTRICT,
  settlement_item_id text NOT NULL UNIQUE REFERENCES public.cash_settlement_items(id) ON DELETE RESTRICT,
  gross_amount numeric NOT NULL,
  carrier_fee numeric NOT NULL,
  merchant_net numeric NOT NULL,
  status text NOT NULL DEFAULT 'matched',
  matched_at timestamptz NOT NULL DEFAULT now(),
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT order_accounting_settlements_money_chk CHECK(gross_amount>=0 AND carrier_fee>=0 AND merchant_net>=0 AND merchant_net=gross_amount-carrier_fee),
  CONSTRAINT order_accounting_settlements_status_chk CHECK(status IN ('matched','disputed')),
  CONSTRAINT order_accounting_settlements_settlement_order_unique UNIQUE(settlement_id,order_fact_id)
);
CREATE INDEX IF NOT EXISTS order_accounting_settlements_settlement_idx ON public.order_accounting_settlements(settlement_id,matched_at);

CREATE TABLE IF NOT EXISTS public.chart_of_accounts (
  code text PRIMARY KEY,
  name_ar text NOT NULL,
  account_type text NOT NULL,
  normal_side text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  system_account boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chart_of_accounts_type_chk CHECK(account_type IN ('asset','liability','equity','revenue','expense','contra_revenue')),
  CONSTRAINT chart_of_accounts_side_chk CHECK(normal_side IN ('debit','credit'))
);
INSERT INTO public.chart_of_accounts(code,name_ar,account_type,normal_side,system_account) VALUES
('1000','الصندوق','asset','debit',true),('1010','البنك','asset','debit',true),('1100','ذمم COD لدى شركة التوصيل','asset','debit',true),('1200','مخزون المنتجات','asset','debit',true),('1210','مخزون مواد التجهيز','asset','debit',true),('2100','مستحقات شركة التوصيل','liability','credit',true),('2200','فروقات توصيل معلقة','liability','credit',true),('3000','مبيعات المنتجات','revenue','credit',true),('3100','رأس مال المالك','equity','credit',true),('3200','مسحوبات المالك','equity','debit',true),('4000','كلفة البضاعة المباعة','expense','debit',true),('4100','مردودات المبيعات','contra_revenue','debit',true),('4200','خسائر المرتجعات','expense','debit',true),('5100','مواد تجهيز وتغليف AQUAVO','expense','debit',true),('5200','دعم التوصيل','expense','debit',true),('5300','مصاريف تشغيلية','expense','debit',true)
ON CONFLICT(code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.journal_entries (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  entry_number bigint GENERATED BY DEFAULT AS IDENTITY UNIQUE,
  entry_date timestamptz NOT NULL,
  period_key text NOT NULL,
  source_type text NOT NULL,
  source_id text NOT NULL,
  event_kind text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'posted',
  currency text NOT NULL DEFAULT 'IQD',
  total_debit numeric NOT NULL,
  total_credit numeric NOT NULL,
  reversal_of_entry_id text REFERENCES public.journal_entries(id),
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT journal_entries_period_chk CHECK(period_key ~ '^[0-9]{4}-[0-9]{2}$'),
  CONSTRAINT journal_entries_status_chk CHECK(status IN ('posted','reversed')),
  CONSTRAINT journal_entries_balanced_chk CHECK(total_debit=total_credit AND total_debit>=0),
  CONSTRAINT journal_entries_source_unique UNIQUE(source_type,source_id,event_kind)
);
CREATE TABLE IF NOT EXISTS public.journal_lines (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  entry_id text NOT NULL REFERENCES public.journal_entries(id) ON DELETE RESTRICT,
  line_number integer NOT NULL,
  account_code text NOT NULL REFERENCES public.chart_of_accounts(code),
  debit numeric NOT NULL DEFAULT 0,
  credit numeric NOT NULL DEFAULT 0,
  memo text,
  dimensions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT journal_lines_side_chk CHECK(debit>=0 AND credit>=0 AND ((debit>0 AND credit=0) OR (credit>0 AND debit=0))),
  CONSTRAINT journal_lines_number_unique UNIQUE(entry_id,line_number)
);
CREATE INDEX IF NOT EXISTS journal_entries_period_date_idx ON public.journal_entries(period_key,entry_date,entry_number);
CREATE INDEX IF NOT EXISTS journal_lines_account_idx ON public.journal_lines(account_code,entry_id);

CREATE TABLE IF NOT EXISTS public.evidence_files (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  document_type text NOT NULL,
  document_number text,
  document_date date,
  issuer text,
  amount numeric,
  currency text NOT NULL DEFAULT 'IQD',
  storage_provider text,
  object_key text,
  sha256 text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  uploaded_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT evidence_files_sha256_chk CHECK(sha256 ~ '^[a-f0-9]{64}$'),
  CONSTRAINT evidence_files_unique UNIQUE(sha256,entity_type,entity_id)
);
CREATE TABLE IF NOT EXISTS public.tax_profiles (
  id text PRIMARY KEY,
  legal_name text NOT NULL,
  brand_name text NOT NULL,
  taxpayer_number text,
  tax_branch text,
  chamber_number text,
  chamber_class text,
  trade_name_registration text,
  registered_address text,
  fiscal_year_start_month integer NOT NULL DEFAULT 1,
  currency text NOT NULL DEFAULT 'IQD',
  timezone text NOT NULL DEFAULT 'Asia/Baghdad',
  status text NOT NULL DEFAULT 'draft',
  accountant_name text,
  accountant_license_number text,
  accountant_approved_at timestamptz,
  approval_evidence_id text REFERENCES public.evidence_files(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tax_profiles_month_chk CHECK(fiscal_year_start_month BETWEEN 1 AND 12),
  CONSTRAINT tax_profiles_status_chk CHECK(status IN ('draft','review','approved')),
  CONSTRAINT tax_profiles_timezone_chk CHECK(timezone='Asia/Baghdad')
);
INSERT INTO public.tax_profiles(id,legal_name,brand_name,currency,timezone,status) VALUES('al-manba-aquavo','محل المنبع','AQUAVO','IQD','Asia/Baghdad','draft') ON CONFLICT(id) DO NOTHING;

ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS vendor_name text;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS document_number text;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS document_date date;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS paid_from_account_code text;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS business_purpose text;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS evidence jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS evidence_hash text;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS accounting_status text NOT NULL DEFAULT 'recorded';
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS tax_treatment text NOT NULL DEFAULT 'pending';
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS reviewed_by text;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'IQD';
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS expense_occurred_at timestamptz;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS evidence_file_id text REFERENCES public.evidence_files(id);
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS review_note text;
DO $$ BEGIN ALTER TABLE public.expenses ADD CONSTRAINT expenses_accounting_status_chk CHECK(accounting_status IN ('recorded','verified','rejected')) NOT VALID; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.expenses ADD CONSTRAINT expenses_tax_treatment_chk CHECK(tax_treatment IN ('pending','deductible','nondeductible')) NOT VALID; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.expenses ADD CONSTRAINT expenses_paid_from_account_fk FOREIGN KEY(paid_from_account_code) REFERENCES public.chart_of_accounts(code) NOT VALID; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.prepare_expense_accounting_fields() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.expense_occurred_at IS NULL OR (TG_OP='UPDATE' AND NEW.expense_date IS DISTINCT FROM OLD.expense_date) THEN NEW.expense_occurred_at:=NEW.expense_date AT TIME ZONE 'Asia/Baghdad'; END IF;
 IF NEW.accounting_status='verified' AND (TG_OP='INSERT' OR OLD.accounting_status IS DISTINCT FROM 'verified') THEN
  IF NEW.evidence_file_id IS NULL OR NEW.evidence_hash IS NULL OR NEW.evidence_hash !~ '^[a-f0-9]{64}$' OR NEW.payment_method IS NULL OR NEW.paid_from_account_code IS NULL OR NULLIF(btrim(COALESCE(NEW.business_purpose,'')),'') IS NULL OR NULLIF(btrim(COALESCE(NEW.reviewed_by,'')),'') IS NULL THEN RAISE EXCEPTION 'EXPENSE_VERIFICATION_BLOCKED: evidence, payment source, business purpose and reviewer are required'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.evidence_files ef WHERE ef.id=NEW.evidence_file_id AND ef.entity_type='expense' AND ef.entity_id=NEW.id AND ef.sha256=NEW.evidence_hash) THEN RAISE EXCEPTION 'EXPENSE_VERIFICATION_BLOCKED: linked evidence does not match expense %',NEW.id; END IF;
  NEW.reviewed_at:=COALESCE(NEW.reviewed_at,clock_timestamp());
 END IF;
 IF TG_OP='UPDATE' AND OLD.accounting_status='verified' THEN
  IF NEW.category IS DISTINCT FROM OLD.category OR NEW.amount IS DISTINCT FROM OLD.amount OR NEW.expense_date IS DISTINCT FROM OLD.expense_date OR NEW.expense_occurred_at IS DISTINCT FROM OLD.expense_occurred_at OR NEW.description IS DISTINCT FROM OLD.description OR NEW.vendor_name IS DISTINCT FROM OLD.vendor_name OR NEW.document_number IS DISTINCT FROM OLD.document_number OR NEW.document_date IS DISTINCT FROM OLD.document_date OR NEW.payment_method IS DISTINCT FROM OLD.payment_method OR NEW.paid_from_account_code IS DISTINCT FROM OLD.paid_from_account_code OR NEW.business_purpose IS DISTINCT FROM OLD.business_purpose OR NEW.evidence_hash IS DISTINCT FROM OLD.evidence_hash OR NEW.evidence_file_id IS DISTINCT FROM OLD.evidence_file_id OR NEW.currency IS DISTINCT FROM OLD.currency OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN RAISE EXCEPTION 'VERIFIED_EXPENSE_IMMUTABLE: create a reversal/corrective expense instead'; END IF;
  IF NEW.accounting_status NOT IN ('verified','rejected') THEN RAISE EXCEPTION 'VERIFIED_EXPENSE_IMMUTABLE: only rejection with a reversal is allowed'; END IF;
  IF NEW.accounting_status='rejected' AND NULLIF(btrim(COALESCE(NEW.review_note,'')),'') IS NULL THEN RAISE EXCEPTION 'EXPENSE_REVERSAL_REASON_REQUIRED'; END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS expenses_prepare_accounting ON public.expenses;
CREATE TRIGGER expenses_prepare_accounting BEFORE INSERT OR UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.prepare_expense_accounting_fields();

CREATE TABLE IF NOT EXISTS public.opening_inventory_snapshot (
 id text PRIMARY KEY DEFAULT gen_random_uuid()::text,cutover_id text NOT NULL REFERENCES public.accounting_cutovers(id),product_id text NOT NULL REFERENCES public.products(id),variant_id text,location_id text NOT NULL REFERENCES public.inventory_locations(id),quantity integer NOT NULL,unit_cost numeric,cost_status text NOT NULL,total_cost numeric,as_of timestamptz NOT NULL,evidence jsonb NOT NULL DEFAULT '{}'::jsonb,created_at timestamptz NOT NULL DEFAULT now(),CONSTRAINT opening_inventory_quantity_chk CHECK(quantity>=0),CONSTRAINT opening_inventory_cost_status_chk CHECK(cost_status IN ('known','provisional','unknown')),CONSTRAINT opening_inventory_unique UNIQUE(cutover_id,product_id,variant_id,location_id)
);
CREATE OR REPLACE FUNCTION public.aquavo_active_cutover() RETURNS timestamptz LANGUAGE sql STABLE AS $$ SELECT cutover_at FROM public.accounting_cutovers WHERE status='active' ORDER BY cutover_at DESC LIMIT 1 $$;
CREATE OR REPLACE FUNCTION public.reject_immutable_accounting_fact_change() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'ACCOUNTING_FACT_IMMUTABLE: % on % is not allowed',TG_OP,TG_TABLE_NAME USING ERRCODE='55000'; END $$;
DROP TRIGGER IF EXISTS order_accounting_facts_immutable ON public.order_accounting_facts;
CREATE TRIGGER order_accounting_facts_immutable BEFORE UPDATE OR DELETE ON public.order_accounting_facts FOR EACH ROW EXECUTE FUNCTION public.reject_immutable_accounting_fact_change();
DROP TRIGGER IF EXISTS order_accounting_settlements_immutable ON public.order_accounting_settlements;
CREATE TRIGGER order_accounting_settlements_immutable BEFORE UPDATE OR DELETE ON public.order_accounting_settlements FOR EACH ROW EXECUTE FUNCTION public.reject_immutable_accounting_fact_change();

INSERT INTO public.schema_migrations(version,checksum,notes) VALUES('0051_accounting_august_foundation','a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1','Foundation: cutover, immutable facts, journal, evidence, tax profile and expense evidence fields') ON CONFLICT(version) DO NOTHING;
COMMIT;

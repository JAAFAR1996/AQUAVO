-- 0073_accounting_final_hardening
-- Formalizes the accounting schema/functions already hardened directly in Production on 2026-08-08.
-- Production is the source of truth. Schema/function changes are idempotent where practical.
-- Historical financial corrections are isolated at the end and guarded by stable identities/fingerprints.
-- Never fabricate procurement, settlement, supplier-payment, or return data.

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Accounts required by P2P, explicit cash rounding, and FX settlement.
-- -----------------------------------------------------------------------------
INSERT INTO public.chart_of_accounts(code,name_ar,account_type,normal_side,active,system_account)
VALUES
  ('2000','ذمم الموردين','liability','credit',true,true),
  ('3050','فروقات التقريب النقدي','revenue','credit',true,true),
  ('5400','فروقات العملة','expense','debit',true,true)
ON CONFLICT(code) DO NOTHING;

DO $do$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.chart_of_accounts
    WHERE code='2000' AND (account_type<>'liability' OR normal_side<>'credit')
  ) THEN RAISE EXCEPTION '0073_ACCOUNT_2000_SEMANTICS_MISMATCH'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.chart_of_accounts
    WHERE code='3050' AND (account_type<>'revenue' OR normal_side<>'credit')
  ) THEN RAISE EXCEPTION '0073_ACCOUNT_3050_SEMANTICS_MISMATCH'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.chart_of_accounts
    WHERE code='5400' AND (account_type<>'expense' OR normal_side<>'debit')
  ) THEN RAISE EXCEPTION '0073_ACCOUNT_5400_SEMANTICS_MISMATCH'; END IF;
END $do$;

-- -----------------------------------------------------------------------------
-- 2. Existing-table extensions from the direct Production P2P/final hardening.
-- -----------------------------------------------------------------------------
ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS exchange_rate_to_iqd numeric,
  ADD COLUMN IF NOT EXISTS exchange_rate_source text,
  ADD COLUMN IF NOT EXISTS exchange_rate_effective_at timestamptz;

ALTER TABLE public.supplier_payments
  ADD COLUMN IF NOT EXISTS supplier_id text,
  ADD COLUMN IF NOT EXISTS currency text,
  ADD COLUMN IF NOT EXISTS amount_original numeric,
  ADD COLUMN IF NOT EXISTS exchange_rate_to_iqd numeric,
  ADD COLUMN IF NOT EXISTS paid_from_account_code text,
  ADD COLUMN IF NOT EXISTS payment_reference text,
  ADD COLUMN IF NOT EXISTS evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS accounting_posted_at timestamptz,
  ADD COLUMN IF NOT EXISTS accounting_reversed_at timestamptz,
  ADD COLUMN IF NOT EXISTS exchange_rate_source text,
  ADD COLUMN IF NOT EXISTS exchange_rate_effective_at timestamptz;

ALTER TABLE public.landed_cost_allocations
  ADD COLUMN IF NOT EXISTS payee_type text;

ALTER TABLE public.order_accounting_facts
  ADD COLUMN IF NOT EXISTS carrier_snapshot text,
  ADD COLUMN IF NOT EXISTS rounding_adjustment numeric NOT NULL DEFAULT 0;

ALTER TABLE public.order_return_events
  ADD COLUMN IF NOT EXISTS refund_account_code text,
  ADD COLUMN IF NOT EXISTS refund_evidence jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.purchase_orders'::regclass AND conname='purchase_orders_exchange_rate_positive_chk') THEN
    ALTER TABLE public.purchase_orders ADD CONSTRAINT purchase_orders_exchange_rate_positive_chk CHECK(exchange_rate_to_iqd IS NULL OR exchange_rate_to_iqd>0) NOT VALID;
    ALTER TABLE public.purchase_orders VALIDATE CONSTRAINT purchase_orders_exchange_rate_positive_chk;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.supplier_payments'::regclass AND conname='supplier_payments_exchange_rate_positive_chk') THEN
    ALTER TABLE public.supplier_payments ADD CONSTRAINT supplier_payments_exchange_rate_positive_chk CHECK(exchange_rate_to_iqd IS NULL OR exchange_rate_to_iqd>0) NOT VALID;
    ALTER TABLE public.supplier_payments VALIDATE CONSTRAINT supplier_payments_exchange_rate_positive_chk;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.supplier_payments'::regclass AND conname='supplier_payments_supplier_id_fkey') THEN
    ALTER TABLE public.supplier_payments ADD CONSTRAINT supplier_payments_supplier_id_fkey FOREIGN KEY(supplier_id) REFERENCES public.suppliers(id) NOT VALID;
    ALTER TABLE public.supplier_payments VALIDATE CONSTRAINT supplier_payments_supplier_id_fkey;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.supplier_payments'::regclass AND conname='supplier_payments_paid_from_account_code_fkey') THEN
    ALTER TABLE public.supplier_payments ADD CONSTRAINT supplier_payments_paid_from_account_code_fkey FOREIGN KEY(paid_from_account_code) REFERENCES public.chart_of_accounts(code) NOT VALID;
    ALTER TABLE public.supplier_payments VALIDATE CONSTRAINT supplier_payments_paid_from_account_code_fkey;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.landed_cost_allocations'::regclass AND conname='landed_cost_allocations_payee_type_check') THEN
    ALTER TABLE public.landed_cost_allocations ADD CONSTRAINT landed_cost_allocations_payee_type_check CHECK(payee_type IS NULL OR payee_type IN ('product_supplier','cash','bank','external_supplier')) NOT VALID;
    ALTER TABLE public.landed_cost_allocations VALIDATE CONSTRAINT landed_cost_allocations_payee_type_check;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.order_return_events'::regclass AND conname='order_return_events_refund_account_code_fkey') THEN
    ALTER TABLE public.order_return_events ADD CONSTRAINT order_return_events_refund_account_code_fkey FOREIGN KEY(refund_account_code) REFERENCES public.chart_of_accounts(code) NOT VALID;
    ALTER TABLE public.order_return_events VALIDATE CONSTRAINT order_return_events_refund_account_code_fkey;
  END IF;
END $do$;

-- -----------------------------------------------------------------------------
-- 3. Immutable procurement/AP facts and payment applications.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.purchase_accounting_facts(
  id text PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  goods_receipt_id text NOT NULL UNIQUE REFERENCES public.goods_receipts(id),
  purchase_order_id text NOT NULL REFERENCES public.purchase_orders(id),
  supplier_id text NOT NULL REFERENCES public.suppliers(id),
  recognized_at timestamptz NOT NULL,
  period_key text NOT NULL CHECK(period_key ~ '^[0-9]{4}-[0-9]{2}$'),
  currency text NOT NULL,
  exchange_rate_to_iqd numeric NOT NULL CHECK(exchange_rate_to_iqd>0),
  base_inventory_iqd numeric NOT NULL CHECK(base_inventory_iqd>=0),
  landed_cost_iqd numeric NOT NULL DEFAULT 0 CHECK(landed_cost_iqd>=0),
  inventory_value_iqd numeric NOT NULL CHECK(inventory_value_iqd>=0),
  payable_iqd numeric NOT NULL CHECK(payable_iqd>=0),
  policy_version text NOT NULL DEFAULT 'p2p_v1_receipt_accrual',
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  payable_original numeric NOT NULL,
  CONSTRAINT purchase_accounting_facts_check CHECK(inventory_value_iqd=base_inventory_iqd+landed_cost_iqd),
  CONSTRAINT purchase_accounting_facts_payable_not_over_inventory CHECK(payable_iqd>=0 AND payable_iqd<=inventory_value_iqd)
);
CREATE INDEX IF NOT EXISTS purchase_accounting_facts_supplier_recognized_idx ON public.purchase_accounting_facts(supplier_id,recognized_at,id);

CREATE TABLE IF NOT EXISTS public.purchase_accounting_reversals(
  id text PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  purchase_accounting_fact_id text NOT NULL UNIQUE REFERENCES public.purchase_accounting_facts(id),
  goods_receipt_id text NOT NULL UNIQUE REFERENCES public.goods_receipts(id),
  reversed_at timestamptz NOT NULL DEFAULT now(),
  reason text NOT NULL,
  journal_entry_id text NOT NULL REFERENCES public.journal_entries(id),
  created_by text,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.supplier_payment_applications(
  id text PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  payment_id integer NOT NULL REFERENCES public.supplier_payments(id),
  purchase_accounting_fact_id text NOT NULL REFERENCES public.purchase_accounting_facts(id),
  applied_amount_iqd numeric NOT NULL CHECK(applied_amount_iqd>0),
  status text NOT NULL DEFAULT 'matched' CHECK(status IN ('matched','reversed')),
  matched_at timestamptz NOT NULL DEFAULT now(),
  reversed_at timestamptz,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  applied_amount_original numeric,
  carrying_amount_iqd numeric,
  cash_amount_iqd numeric,
  fx_difference_iqd numeric,
  UNIQUE(payment_id,purchase_accounting_fact_id)
);
CREATE INDEX IF NOT EXISTS supplier_payment_applications_fact_status_idx ON public.supplier_payment_applications(purchase_accounting_fact_id,status);

CREATE OR REPLACE FUNCTION public.prepare_purchase_accounting_fact_currency()
RETURNS trigger LANGUAGE plpgsql AS $function$
BEGIN
  IF NEW.exchange_rate_to_iqd IS NULL OR NEW.exchange_rate_to_iqd<=0 THEN RAISE EXCEPTION 'PURCHASE_ACCOUNTING_FX_INVALID';END IF;
  NEW.payable_original:=NEW.payable_iqd/NEW.exchange_rate_to_iqd;
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.reject_purchase_accounting_fact_mutation()
RETURNS trigger LANGUAGE plpgsql AS $function$
BEGIN RAISE EXCEPTION 'PURCHASE_ACCOUNTING_FACT_IMMUTABLE: use reversal workflow' USING ERRCODE='55000'; END $function$;

CREATE OR REPLACE FUNCTION public.guard_accounted_purchase_order_mutation()
RETURNS trigger LANGUAGE plpgsql AS $function$
BEGIN
  IF EXISTS(SELECT 1 FROM public.purchase_accounting_facts f WHERE f.purchase_order_id=OLD.id) THEN
    IF NEW.supplier_id IS DISTINCT FROM OLD.supplier_id OR NEW.currency IS DISTINCT FROM OLD.currency OR NEW.subtotal IS DISTINCT FROM OLD.subtotal OR NEW.shipping_cost IS DISTINCT FROM OLD.shipping_cost OR NEW.customs_cost IS DISTINCT FROM OLD.customs_cost OR NEW.other_cost IS DISTINCT FROM OLD.other_cost OR NEW.total IS DISTINCT FROM OLD.total OR NEW.exchange_rate_to_iqd IS DISTINCT FROM OLD.exchange_rate_to_iqd OR NEW.exchange_rate_source IS DISTINCT FROM OLD.exchange_rate_source OR NEW.exchange_rate_effective_at IS DISTINCT FROM OLD.exchange_rate_effective_at THEN
      RAISE EXCEPTION 'ACCOUNTED_PURCHASE_ORDER_IMMUTABLE: reverse posted receipts before changing economic fields' USING ERRCODE='55000';
    END IF;
  END IF;
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.guard_accounted_purchase_order_item_mutation()
RETURNS trigger LANGUAGE plpgsql AS $function$
BEGIN
  IF EXISTS(SELECT 1 FROM public.purchase_accounting_facts f JOIN public.goods_receipt_items gri ON gri.goods_receipt_id=f.goods_receipt_id WHERE gri.purchase_order_item_id=OLD.id) THEN
    IF NEW.product_id IS DISTINCT FROM OLD.product_id OR NEW.variant_id IS DISTINCT FROM OLD.variant_id OR NEW.ordered_quantity IS DISTINCT FROM OLD.ordered_quantity OR NEW.unit_cost IS DISTINCT FROM OLD.unit_cost OR NEW.line_total IS DISTINCT FROM OLD.line_total OR NEW.supplier_product_id IS DISTINCT FROM OLD.supplier_product_id THEN
      RAISE EXCEPTION 'ACCOUNTED_PURCHASE_ORDER_ITEM_IMMUTABLE: reverse posted receipt before changing economic fields' USING ERRCODE='55000';
    END IF;
  END IF;
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.guard_posted_goods_receipt_mutation()
RETURNS trigger LANGUAGE plpgsql AS $function$
BEGIN
  IF OLD.status='posted' AND COALESCE(current_setting('aquavo.purchase_receipt_reversal',true),'')<>'on' THEN
    RAISE EXCEPTION 'POSTED_GOODS_RECEIPT_IMMUTABLE: use reversal workflow' USING ERRCODE='55000';
  END IF;
  RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $function$;

CREATE OR REPLACE FUNCTION public.guard_posted_goods_receipt_item_mutation()
RETURNS trigger LANGUAGE plpgsql AS $function$
DECLARE v_receipt_id text; v_status text;
BEGIN
  v_receipt_id:=CASE WHEN TG_OP='DELETE' THEN OLD.goods_receipt_id ELSE NEW.goods_receipt_id END;
  SELECT status INTO v_status FROM public.goods_receipts WHERE id=v_receipt_id;
  IF v_status='posted' THEN RAISE EXCEPTION 'POSTED_GOODS_RECEIPT_ITEM_IMMUTABLE: use reversal workflow' USING ERRCODE='55000'; END IF;
  RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $function$;

CREATE OR REPLACE FUNCTION public.guard_supplier_payment_application_mutation()
RETURNS trigger LANGUAGE plpgsql AS $function$
BEGIN
  IF TG_OP='DELETE' AND OLD.status='matched' THEN RAISE EXCEPTION 'MATCHED_SUPPLIER_PAYMENT_APPLICATION_IMMUTABLE' USING ERRCODE='55000';END IF;
  IF TG_OP='UPDATE' AND OLD.status='matched' THEN
    IF NEW.status='reversed' AND NEW.payment_id IS NOT DISTINCT FROM OLD.payment_id AND NEW.purchase_accounting_fact_id IS NOT DISTINCT FROM OLD.purchase_accounting_fact_id AND NEW.applied_amount_iqd IS NOT DISTINCT FROM OLD.applied_amount_iqd AND NEW.applied_amount_original IS NOT DISTINCT FROM OLD.applied_amount_original AND NEW.carrying_amount_iqd IS NOT DISTINCT FROM OLD.carrying_amount_iqd AND NEW.cash_amount_iqd IS NOT DISTINCT FROM OLD.cash_amount_iqd AND NEW.fx_difference_iqd IS NOT DISTINCT FROM OLD.fx_difference_iqd THEN RETURN NEW;END IF;
    RAISE EXCEPTION 'MATCHED_SUPPLIER_PAYMENT_APPLICATION_IMMUTABLE' USING ERRCODE='55000';
  END IF;
  RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $function$;

CREATE OR REPLACE FUNCTION public.guard_paid_supplier_payment_mutation()
RETURNS trigger LANGUAGE plpgsql AS $function$
BEGIN
  IF TG_OP='DELETE' AND OLD.status::text='paid' THEN RAISE EXCEPTION 'PAID_SUPPLIER_PAYMENT_IMMUTABLE: cancel to create reversal' USING ERRCODE='55000'; END IF;
  IF TG_OP='UPDATE' AND OLD.status::text='paid' AND COALESCE(current_setting('aquavo.supplier_payment_posting',true),'')<>'on' THEN
    IF NEW.status::text='cancelled' AND NEW.supplier_name IS NOT DISTINCT FROM OLD.supplier_name AND NEW.amount_usd IS NOT DISTINCT FROM OLD.amount_usd AND NEW.amount_iqd IS NOT DISTINCT FROM OLD.amount_iqd AND NEW.supplier_id IS NOT DISTINCT FROM OLD.supplier_id AND NEW.currency IS NOT DISTINCT FROM OLD.currency AND NEW.amount_original IS NOT DISTINCT FROM OLD.amount_original AND NEW.exchange_rate_to_iqd IS NOT DISTINCT FROM OLD.exchange_rate_to_iqd AND NEW.paid_from_account_code IS NOT DISTINCT FROM OLD.paid_from_account_code AND NEW.paid_at IS NOT DISTINCT FROM OLD.paid_at THEN RETURN NEW; END IF;
    RAISE EXCEPTION 'PAID_SUPPLIER_PAYMENT_IMMUTABLE: cancel to create reversal' USING ERRCODE='55000';
  END IF;
  RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $function$;

-- -----------------------------------------------------------------------------
-- 4. Moving weighted-average inventory costing and immutable valuation evidence.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_cost_events(
  id text PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  movement_id text NOT NULL UNIQUE REFERENCES public.inventory_movements(id),
  product_id text NOT NULL REFERENCES public.products(id),
  variant_id text,
  method text NOT NULL,
  qty_before numeric NOT NULL,
  unit_cost_before numeric NOT NULL,
  received_qty numeric NOT NULL,
  received_value_iqd numeric NOT NULL,
  unit_cost_after numeric NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inventory_valuation_baselines(
  id text PRIMARY KEY,
  effective_at timestamptz NOT NULL,
  method text NOT NULL,
  total_value_iqd numeric NOT NULL,
  gl_inventory_before numeric NOT NULL,
  adjustment_iqd numeric NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  journal_entry_id text UNIQUE REFERENCES public.journal_entries(id)
);

CREATE TABLE IF NOT EXISTS public.inventory_valuation_baseline_lines(
  id text PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  baseline_id text NOT NULL REFERENCES public.inventory_valuation_baselines(id),
  product_id text NOT NULL REFERENCES public.products(id),
  variant_id text,
  quantity numeric NOT NULL,
  unit_cost_iqd numeric NOT NULL,
  value_iqd numeric NOT NULL,
  cost_source text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.set_current_inventory_unit_cost(p_product_id text,p_variant_id text,p_cost numeric,p_actor text,p_note text)
RETURNS void LANGUAGE plpgsql AS $function$
BEGIN
  IF p_cost<0 THEN RAISE EXCEPTION 'INVENTORY_COST_NEGATIVE';END IF;
  IF p_variant_id IS NULL THEN
    UPDATE public.products SET cost_price=round(p_cost,6),cost_price_resolution='known',cost_resolution_note=p_note,cost_resolution_by=p_actor,cost_resolution_at=clock_timestamp() WHERE id=p_product_id;
  ELSE
    UPDATE public.products SET variants=(SELECT jsonb_agg(CASE WHEN e->>'id'=p_variant_id THEN jsonb_set(jsonb_set(jsonb_set(jsonb_set(e,'{costPrice}',to_jsonb(round(p_cost,6)),true),'{costStatus}',to_jsonb('verified_derived'::text),true),'{costBasis}',to_jsonb('moving_weighted_average'::text),true),'{costEvidence}',to_jsonb(p_note),true) ELSE e END ORDER BY ord) FROM jsonb_array_elements(COALESCE(products.variants,'[]'::jsonb)) WITH ORDINALITY a(e,ord)) WHERE id=p_product_id AND EXISTS(SELECT 1 FROM jsonb_array_elements(COALESCE(products.variants,'[]'::jsonb)) e WHERE e->>'id'=p_variant_id);
    IF NOT FOUND THEN RAISE EXCEPTION 'INVENTORY_COST_VARIANT_NOT_FOUND: %/%',p_product_id,p_variant_id;END IF;
  END IF;
END $function$;

CREATE OR REPLACE FUNCTION public.prepare_purchase_receipt_weighted_cost()
RETURNS trigger LANGUAGE plpgsql AS $function$
DECLARE v_qty numeric;v_old_cost numeric;v_received_value numeric;v_new_cost numeric;v_variant jsonb;
BEGIN
  IF NEW.movement_type<>'purchase_receipt' OR NEW.quantity_delta<=0 THEN RETURN NEW;END IF;
  SELECT COALESCE(SUM(quantity_delta),0) INTO v_qty FROM public.inventory_movements WHERE location_id=NEW.location_id AND product_id=NEW.product_id AND variant_id IS NOT DISTINCT FROM NEW.variant_id;
  IF NEW.variant_id IS NULL THEN SELECT cost_price INTO v_old_cost FROM public.products WHERE id=NEW.product_id;
  ELSE SELECT e INTO v_variant FROM public.products p CROSS JOIN LATERAL jsonb_array_elements(COALESCE(p.variants,'[]'::jsonb)) e WHERE p.id=NEW.product_id AND e->>'id'=NEW.variant_id LIMIT 1;v_old_cost:=NULLIF(v_variant->>'costPrice','')::numeric;END IF;
  IF v_old_cost IS NULL THEN RAISE EXCEPTION 'PURCHASE_WAC_BASE_COST_MISSING';END IF;
  v_received_value:=COALESCE(NULLIF(NEW.metadata->>'base_value_iqd','')::numeric,0)+COALESCE(NULLIF(NEW.metadata->>'landed_cost_iqd','')::numeric,0);
  IF v_received_value<=0 THEN RAISE EXCEPTION 'PURCHASE_WAC_RECEIVED_VALUE_MISSING';END IF;
  v_new_cost:=((v_qty*v_old_cost)+v_received_value)/(v_qty+NEW.quantity_delta);
  NEW.metadata:=COALESCE(NEW.metadata,'{}'::jsonb)||jsonb_build_object('cost_method','moving_weighted_average','wac_qty_before',v_qty,'wac_unit_cost_before',v_old_cost,'wac_received_value_iqd',v_received_value,'wac_unit_cost_after',round(v_new_cost,6));
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.apply_purchase_receipt_weighted_cost()
RETURNS trigger LANGUAGE plpgsql AS $function$
DECLARE v_old numeric;v_new numeric;v_qty numeric;v_value numeric;
BEGIN
  IF NEW.movement_type<>'purchase_receipt' OR NEW.quantity_delta<=0 THEN RETURN NEW;END IF;
  v_old:=NULLIF(NEW.metadata->>'wac_unit_cost_before','')::numeric;v_new:=NULLIF(NEW.metadata->>'wac_unit_cost_after','')::numeric;v_qty:=NULLIF(NEW.metadata->>'wac_qty_before','')::numeric;v_value:=NULLIF(NEW.metadata->>'wac_received_value_iqd','')::numeric;
  IF v_new IS NULL THEN RAISE EXCEPTION 'PURCHASE_WAC_METADATA_MISSING';END IF;
  PERFORM public.set_current_inventory_unit_cost(NEW.product_id,NEW.variant_id,v_new,'database_trigger','moving weighted average from goods receipt '||COALESCE(NEW.metadata->>'goods_receipt_id',NEW.source_id));
  INSERT INTO public.inventory_cost_events(movement_id,product_id,variant_id,method,qty_before,unit_cost_before,received_qty,received_value_iqd,unit_cost_after,evidence) VALUES(NEW.id,NEW.product_id,NEW.variant_id,'moving_weighted_average',v_qty,v_old,NEW.quantity_delta,v_value,v_new,jsonb_build_object('goods_receipt_id',NEW.metadata->>'goods_receipt_id','purchase_order_id',NEW.metadata->>'purchase_order_id'));
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.reject_inventory_cost_event_mutation()
RETURNS trigger LANGUAGE plpgsql AS $function$ BEGIN RAISE EXCEPTION 'INVENTORY_COST_EVENT_IMMUTABLE' USING ERRCODE='55000';END $function$;
CREATE OR REPLACE FUNCTION public.reject_inventory_valuation_baseline_mutation()
RETURNS trigger LANGUAGE plpgsql AS $function$ BEGIN RAISE EXCEPTION 'INVENTORY_VALUATION_BASELINE_IMMUTABLE' USING ERRCODE='55000';END $function$;

CREATE OR REPLACE FUNCTION public.capture_current_inventory_valuation_baseline(p_baseline_id text,p_actor text,p_evidence jsonb)
RETURNS numeric LANGUAGE plpgsql AS $function$
DECLARE v_main text;v_mismatch bigint;v_missing bigint;v_total numeric;v_gl numeric;v_adj numeric;v_entry text;
BEGIN
  IF EXISTS(SELECT 1 FROM public.inventory_valuation_baselines WHERE id=p_baseline_id) THEN SELECT adjustment_iqd INTO v_adj FROM public.inventory_valuation_baselines WHERE id=p_baseline_id;RETURN v_adj;END IF;
  IF COALESCE(p_evidence,'{}'::jsonb)='{}'::jsonb THEN RAISE EXCEPTION 'INVENTORY_BASELINE_EVIDENCE_REQUIRED';END IF;
  SELECT id INTO v_main FROM public.inventory_locations WHERE code='MAIN' AND is_active=true LIMIT 1;IF v_main IS NULL THEN RAISE EXCEPTION 'MAIN_LOCATION_MISSING';END IF;
  WITH ledger AS (SELECT product_id,variant_id,SUM(quantity_delta) qty FROM public.inventory_movements WHERE location_id=v_main GROUP BY product_id,variant_id),current_keys AS (SELECT p.id product_id,NULL::text variant_id,p.stock::numeric qty,p.cost_price::numeric unit_cost FROM public.products p WHERE p.deleted_at IS NULL AND COALESCE(p.has_variants,false)=false UNION ALL SELECT p.id,v->>'id',(v->>'stock')::numeric,NULLIF(v->>'costPrice','')::numeric FROM public.products p CROSS JOIN LATERAL jsonb_array_elements(COALESCE(p.variants,'[]'::jsonb)) v WHERE p.deleted_at IS NULL AND COALESCE(p.has_variants,false)=true) SELECT COUNT(*) FILTER(WHERE ck.qty<>COALESCE(l.qty,0)),COUNT(*) FILTER(WHERE ck.unit_cost IS NULL),COALESCE(SUM(ck.qty*ck.unit_cost),0) INTO v_mismatch,v_missing,v_total FROM current_keys ck LEFT JOIN ledger l ON l.product_id=ck.product_id AND l.variant_id IS NOT DISTINCT FROM ck.variant_id;
  IF v_mismatch<>0 THEN RAISE EXCEPTION 'INVENTORY_BASELINE_STOCK_MISMATCH: %',v_mismatch;END IF;IF v_missing<>0 THEN RAISE EXCEPTION 'INVENTORY_BASELINE_COST_MISSING: %',v_missing;END IF;
  SELECT COALESCE(SUM(jl.debit-jl.credit),0) INTO v_gl FROM public.journal_entries je JOIN public.journal_lines jl ON jl.entry_id=je.id WHERE jl.account_code='1200';v_adj:=v_total-v_gl;
  IF v_adj<>0 THEN
    INSERT INTO public.journal_entries(entry_date,period_key,source_type,source_id,event_kind,description,total_debit,total_credit,evidence,created_by) VALUES(clock_timestamp(),to_char(clock_timestamp() AT TIME ZONE 'Asia/Baghdad','YYYY-MM'),'inventory_valuation_baseline',p_baseline_id,'current_inventory_valuation_alignment','مواءمة قيمة مخزون المنتجات مع الكلف الحالية المعتمدة',abs(v_adj),abs(v_adj),p_evidence||jsonb_build_object('target_inventory_value_iqd',v_total,'gl_inventory_before_iqd',v_gl,'adjustment_iqd',v_adj),p_actor) RETURNING id INTO v_entry;
    IF v_adj>0 THEN INSERT INTO public.journal_lines(entry_id,line_number,account_code,debit,memo) VALUES(v_entry,1,'1200',v_adj,'زيادة تقييم المخزون إلى القيمة الحالية المعتمدة');INSERT INTO public.journal_lines(entry_id,line_number,account_code,credit,memo) VALUES(v_entry,2,'3100',v_adj,'تصحيح رأس المال مقابل تقييم المخزون');
    ELSE INSERT INTO public.journal_lines(entry_id,line_number,account_code,debit,memo) VALUES(v_entry,1,'3100',abs(v_adj),'تخفيض رأس المال مقابل تصحيح تقييم المخزون');INSERT INTO public.journal_lines(entry_id,line_number,account_code,credit,memo) VALUES(v_entry,2,'1200',abs(v_adj),'تخفيض تقييم المخزون إلى القيمة الحالية المعتمدة');END IF;
    PERFORM public.validate_journal_entry(v_entry);
  END IF;
  INSERT INTO public.inventory_valuation_baselines(id,effective_at,method,total_value_iqd,gl_inventory_before,adjustment_iqd,journal_entry_id,evidence,created_by) VALUES(p_baseline_id,clock_timestamp(),'current_authoritative_cost_by_current_inventory_identity',v_total,v_gl,v_adj,v_entry,p_evidence,p_actor);
  WITH current_keys AS (SELECT p.id product_id,NULL::text variant_id,p.stock::numeric qty,p.cost_price::numeric unit_cost,'product_current_cost'::text source FROM public.products p WHERE p.deleted_at IS NULL AND COALESCE(p.has_variants,false)=false UNION ALL SELECT p.id,v->>'id',(v->>'stock')::numeric,(v->>'costPrice')::numeric,'variant_current_verified_cost'::text FROM public.products p CROSS JOIN LATERAL jsonb_array_elements(COALESCE(p.variants,'[]'::jsonb)) v WHERE p.deleted_at IS NULL AND COALESCE(p.has_variants,false)=true) INSERT INTO public.inventory_valuation_baseline_lines(baseline_id,product_id,variant_id,quantity,unit_cost_iqd,value_iqd,cost_source,evidence) SELECT p_baseline_id,product_id,variant_id,qty,unit_cost,qty*unit_cost,source,p_evidence FROM current_keys;
  RETURN v_adj;
END $function$;

-- -----------------------------------------------------------------------------
-- 5. Goods receipt -> inventory -> AP, with exact PO/product/variant/price identity.
-- -----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS goods_receipt_items_po_item_unique_idx ON public.goods_receipt_items(goods_receipt_id,purchase_order_item_id);

CREATE OR REPLACE FUNCTION public.post_goods_receipt(receipt_id text,actor text)
RETURNS void LANGUAGE plpgsql AS $function$
DECLARE receipt_record record;po_record record;item_record record;movement_id text;movement_key text;v_fx numeric;v_base_iqd numeric:=0;v_landed_iqd numeric:=0;v_landed_ap_iqd numeric:=0;v_landed_cash_iqd numeric:=0;v_landed_bank_iqd numeric:=0;v_item_landed_iqd numeric:=0;v_item_landed_ap numeric:=0;v_item_landed_cash numeric:=0;v_item_landed_bank numeric:=0;v_ancillary_iqd numeric:=0;v_alloc_total numeric:=0;v_fact_id text;v_entry_id text;v_line integer:=0;
BEGIN
  SELECT id,purchase_order_id,location_id,status,received_at INTO receipt_record FROM public.goods_receipts WHERE id=receipt_id FOR UPDATE;IF NOT FOUND THEN RAISE EXCEPTION 'GOODS_RECEIPT_NOT_FOUND: %',receipt_id;END IF;IF receipt_record.status='posted' THEN RETURN;END IF;IF receipt_record.status<>'verified' THEN RAISE EXCEPTION 'GOODS_RECEIPT_NOT_VERIFIED: %',receipt_id;END IF;
  SELECT id,supplier_id,currency,subtotal,shipping_cost,customs_cost,other_cost,total,exchange_rate_to_iqd,exchange_rate_source,exchange_rate_effective_at INTO po_record FROM public.purchase_orders WHERE id=receipt_record.purchase_order_id FOR UPDATE;IF NOT FOUND THEN RAISE EXCEPTION 'PURCHASE_ORDER_NOT_FOUND: %',receipt_record.purchase_order_id;END IF;
  IF EXISTS(SELECT 1 FROM public.goods_receipt_items gri JOIN public.purchase_order_items poi ON poi.id=gri.purchase_order_item_id WHERE gri.goods_receipt_id=receipt_id AND (poi.purchase_order_id<>po_record.id OR poi.product_id<>gri.product_id OR poi.variant_id IS DISTINCT FROM gri.variant_id)) THEN RAISE EXCEPTION 'GOODS_RECEIPT_IDENTITY_MISMATCH';END IF;
  IF EXISTS(SELECT 1 FROM public.goods_receipt_items gri JOIN public.purchase_order_items poi ON poi.id=gri.purchase_order_item_id WHERE gri.goods_receipt_id=receipt_id AND gri.unit_cost IS NOT NULL AND gri.unit_cost<>poi.unit_cost) THEN RAISE EXCEPTION 'GOODS_RECEIPT_PRICE_VARIANCE_REQUIRES_PO_AMENDMENT';END IF;
  UPDATE public.goods_receipt_items gri SET unit_cost=poi.unit_cost FROM public.purchase_order_items poi WHERE gri.goods_receipt_id=receipt_id AND poi.id=gri.purchase_order_item_id AND gri.unit_cost IS NULL;
  IF EXISTS(SELECT 1 FROM public.goods_receipt_items gri JOIN public.purchase_order_items poi ON poi.id=gri.purchase_order_item_id WHERE gri.goods_receipt_id=receipt_id AND poi.received_quantity+gri.accepted_quantity>poi.ordered_quantity) THEN RAISE EXCEPTION 'GOODS_RECEIPT_EXCEEDS_ORDERED_QUANTITY';END IF;
  IF EXISTS(SELECT 1 FROM public.landed_cost_allocations l JOIN public.purchase_order_items poi ON poi.id=l.purchase_order_item_id WHERE l.purchase_order_id=po_record.id AND l.purchase_order_item_id IS NOT NULL AND poi.purchase_order_id<>po_record.id) THEN RAISE EXCEPTION 'LANDED_COST_ALLOCATION_PO_ITEM_MISMATCH';END IF;
  IF po_record.currency='IQD' THEN v_fx:=1;ELSE v_fx:=po_record.exchange_rate_to_iqd;IF v_fx IS NULL OR v_fx<=0 OR NULLIF(btrim(COALESCE(po_record.exchange_rate_source,'')),'') IS NULL OR po_record.exchange_rate_effective_at IS NULL THEN RAISE EXCEPTION 'PURCHASE_FX_REQUIRED';END IF;END IF;
  IF abs(COALESCE(po_record.subtotal,0)-(SELECT COALESCE(SUM(line_total),0) FROM public.purchase_order_items WHERE purchase_order_id=po_record.id))>0.01 THEN RAISE EXCEPTION 'PURCHASE_ORDER_SUBTOTAL_MISMATCH';END IF;
  v_ancillary_iqd:=(COALESCE(po_record.shipping_cost,0)+COALESCE(po_record.customs_cost,0)+COALESCE(po_record.other_cost,0))*v_fx;
  IF v_ancillary_iqd>0 THEN
    IF EXISTS(SELECT 1 FROM public.landed_cost_allocations l WHERE l.purchase_order_id=po_record.id AND l.purchase_order_item_id IS NULL) THEN RAISE EXCEPTION 'LANDED_COST_ITEM_ALLOCATION_REQUIRED';END IF;
    IF EXISTS(SELECT 1 FROM public.landed_cost_allocations l WHERE l.purchase_order_id=po_record.id AND l.allocated_amount_iqd IS NULL) THEN RAISE EXCEPTION 'LANDED_COST_IQD_REQUIRED';END IF;
    IF EXISTS(SELECT 1 FROM public.landed_cost_allocations l WHERE l.purchase_order_id=po_record.id AND l.payee_type IS NULL) THEN RAISE EXCEPTION 'LANDED_COST_PAYEE_REQUIRED';END IF;
    IF EXISTS(SELECT 1 FROM public.landed_cost_allocations l WHERE l.purchase_order_id=po_record.id AND l.payee_type='external_supplier') THEN RAISE EXCEPTION 'LANDED_COST_EXTERNAL_SUPPLIER_REQUIRES_SEPARATE_PAYABLE_WORKFLOW';END IF;
    SELECT COALESCE(SUM(allocated_amount_iqd),0) INTO v_alloc_total FROM public.landed_cost_allocations WHERE purchase_order_id=po_record.id;IF abs(v_alloc_total-v_ancillary_iqd)>1 THEN RAISE EXCEPTION 'LANDED_COST_NOT_RECONCILED';END IF;
  END IF;
  FOR item_record IN SELECT gri.id,gri.purchase_order_item_id,gri.product_id,gri.variant_id,gri.accepted_quantity,poi.unit_cost,poi.ordered_quantity,COALESCE((SELECT SUM(l.allocated_amount_iqd) FROM public.landed_cost_allocations l WHERE l.purchase_order_id=po_record.id AND l.purchase_order_item_id=gri.purchase_order_item_id),0) item_alloc_total,COALESCE((SELECT SUM(l.allocated_amount_iqd) FROM public.landed_cost_allocations l WHERE l.purchase_order_id=po_record.id AND l.purchase_order_item_id=gri.purchase_order_item_id AND l.payee_type='product_supplier'),0) item_alloc_ap,COALESCE((SELECT SUM(l.allocated_amount_iqd) FROM public.landed_cost_allocations l WHERE l.purchase_order_id=po_record.id AND l.purchase_order_item_id=gri.purchase_order_item_id AND l.payee_type='cash'),0) item_alloc_cash,COALESCE((SELECT SUM(l.allocated_amount_iqd) FROM public.landed_cost_allocations l WHERE l.purchase_order_id=po_record.id AND l.purchase_order_item_id=gri.purchase_order_item_id AND l.payee_type='bank'),0) item_alloc_bank FROM public.goods_receipt_items gri JOIN public.purchase_order_items poi ON poi.id=gri.purchase_order_item_id WHERE gri.goods_receipt_id=receipt_id ORDER BY gri.id FOR UPDATE OF gri LOOP
    IF item_record.accepted_quantity>0 THEN
      IF item_record.accepted_quantity<>trunc(item_record.accepted_quantity) THEN RAISE EXCEPTION 'GOODS_RECEIPT_WHOLE_UNITS_REQUIRED';END IF;
      v_item_landed_iqd:=item_record.item_alloc_total*(item_record.accepted_quantity/item_record.ordered_quantity);v_item_landed_ap:=item_record.item_alloc_ap*(item_record.accepted_quantity/item_record.ordered_quantity);v_item_landed_cash:=item_record.item_alloc_cash*(item_record.accepted_quantity/item_record.ordered_quantity);v_item_landed_bank:=item_record.item_alloc_bank*(item_record.accepted_quantity/item_record.ordered_quantity);
      v_base_iqd:=v_base_iqd+(item_record.accepted_quantity*item_record.unit_cost*v_fx);v_landed_iqd:=v_landed_iqd+v_item_landed_iqd;v_landed_ap_iqd:=v_landed_ap_iqd+v_item_landed_ap;v_landed_cash_iqd:=v_landed_cash_iqd+v_item_landed_cash;v_landed_bank_iqd:=v_landed_bank_iqd+v_item_landed_bank;
      movement_key:='goods_receipt_item:'||item_record.id;movement_id:=NULL;
      INSERT INTO public.inventory_movements(product_id,variant_id,location_id,quantity_delta,movement_type,source_type,source_id,idempotency_key,unit_cost,currency,happened_at,created_by,metadata) VALUES(item_record.product_id,item_record.variant_id,receipt_record.location_id,item_record.accepted_quantity::integer,'purchase_receipt','goods_receipt_item',item_record.id,movement_key,item_record.unit_cost,po_record.currency,COALESCE(receipt_record.received_at,clock_timestamp()),actor,jsonb_build_object('goods_receipt_id',receipt_id,'purchase_order_id',po_record.id,'exchange_rate_to_iqd',v_fx,'base_value_iqd',item_record.accepted_quantity*item_record.unit_cost*v_fx,'landed_cost_iqd',v_item_landed_iqd,'landed_ap_iqd',v_item_landed_ap,'landed_cash_iqd',v_item_landed_cash,'landed_bank_iqd',v_item_landed_bank)) ON CONFLICT(idempotency_key) DO NOTHING RETURNING id INTO movement_id;
      IF movement_id IS NULL THEN SELECT id INTO movement_id FROM public.inventory_movements WHERE idempotency_key=movement_key;ELSE UPDATE public.purchase_order_items SET received_quantity=received_quantity+item_record.accepted_quantity WHERE id=item_record.purchase_order_item_id;END IF;
      UPDATE public.goods_receipt_items SET inventory_movement_id=movement_id WHERE id=item_record.id AND inventory_movement_id IS DISTINCT FROM movement_id;
    END IF;
  END LOOP;
  UPDATE public.goods_receipts SET status='posted',verified_at=COALESCE(verified_at,clock_timestamp()),verified_by=COALESCE(verified_by,actor),updated_at=clock_timestamp() WHERE id=receipt_id;
  UPDATE public.purchase_orders po SET status=CASE WHEN EXISTS(SELECT 1 FROM public.purchase_order_items poi WHERE poi.purchase_order_id=po.id AND poi.received_quantity<poi.ordered_quantity) THEN 'partially_received' ELSE 'received' END,updated_at=clock_timestamp() WHERE po.id=po_record.id;
  IF (v_base_iqd+v_landed_iqd)>0 THEN
    INSERT INTO public.purchase_accounting_facts(goods_receipt_id,purchase_order_id,supplier_id,recognized_at,period_key,currency,exchange_rate_to_iqd,base_inventory_iqd,landed_cost_iqd,inventory_value_iqd,payable_iqd,evidence,created_by) VALUES(receipt_id,po_record.id,po_record.supplier_id,COALESCE(receipt_record.received_at,clock_timestamp()),to_char(COALESCE(receipt_record.received_at,clock_timestamp()) AT TIME ZONE 'Asia/Baghdad','YYYY-MM'),po_record.currency,v_fx,v_base_iqd,v_landed_iqd,v_base_iqd+v_landed_iqd,v_base_iqd+v_landed_ap_iqd,jsonb_build_object('purchase_order_id',po_record.id,'goods_receipt_id',receipt_id,'exchange_rate_source',po_record.exchange_rate_source,'exchange_rate_effective_at',po_record.exchange_rate_effective_at,'landed_ap_iqd',v_landed_ap_iqd,'landed_cash_iqd',v_landed_cash_iqd,'landed_bank_iqd',v_landed_bank_iqd),actor) RETURNING id INTO v_fact_id;
    INSERT INTO public.journal_entries(entry_date,period_key,source_type,source_id,event_kind,description,total_debit,total_credit,evidence,created_by) VALUES(COALESCE(receipt_record.received_at,clock_timestamp()),to_char(COALESCE(receipt_record.received_at,clock_timestamp()) AT TIME ZONE 'Asia/Baghdad','YYYY-MM'),'goods_receipt',receipt_id,'purchase_receipt_recognition','إثبات استلام بضاعة وتكاليفها',v_base_iqd+v_landed_iqd,v_base_iqd+v_landed_iqd,jsonb_build_object('purchase_accounting_fact_id',v_fact_id,'purchase_order_id',po_record.id,'supplier_id',po_record.supplier_id,'base_inventory_iqd',v_base_iqd,'landed_cost_iqd',v_landed_iqd,'landed_ap_iqd',v_landed_ap_iqd,'landed_cash_iqd',v_landed_cash_iqd,'landed_bank_iqd',v_landed_bank_iqd),actor) RETURNING id INTO v_entry_id;
    v_line:=v_line+1;INSERT INTO public.journal_lines(entry_id,line_number,account_code,debit,memo,dimensions) VALUES(v_entry_id,v_line,'1200',v_base_iqd+v_landed_iqd,'زيادة مخزون المنتجات',jsonb_build_object('purchase_order_id',po_record.id,'goods_receipt_id',receipt_id));
    IF v_base_iqd+v_landed_ap_iqd>0 THEN v_line:=v_line+1;INSERT INTO public.journal_lines(entry_id,line_number,account_code,credit,memo,dimensions) VALUES(v_entry_id,v_line,'2000',v_base_iqd+v_landed_ap_iqd,'ذمة مورد المنتج والتكاليف التابعة له',jsonb_build_object('supplier_id',po_record.supplier_id,'purchase_order_id',po_record.id));END IF;
    IF v_landed_cash_iqd>0 THEN v_line:=v_line+1;INSERT INTO public.journal_lines(entry_id,line_number,account_code,credit,memo,dimensions) VALUES(v_entry_id,v_line,'1000',v_landed_cash_iqd,'تكاليف شراء مدفوعة نقداً',jsonb_build_object('purchase_order_id',po_record.id));END IF;
    IF v_landed_bank_iqd>0 THEN v_line:=v_line+1;INSERT INTO public.journal_lines(entry_id,line_number,account_code,credit,memo,dimensions) VALUES(v_entry_id,v_line,'1010',v_landed_bank_iqd,'تكاليف شراء مدفوعة من البنك',jsonb_build_object('purchase_order_id',po_record.id));END IF;
    PERFORM public.validate_journal_entry(v_entry_id);
  END IF;
END $function$;

CREATE OR REPLACE FUNCTION public.reverse_posted_goods_receipt(receipt_id text,actor text,reason text)
RETURNS void LANGUAGE plpgsql AS $function$
DECLARE gr record;f record;item_record record;original_journal_id text;reversal_journal_id text;movement_key text;v_rev_movement text;v_cost_event record;v_total numeric;
BEGIN
  IF NULLIF(btrim(COALESCE(reason,'')),'') IS NULL THEN RAISE EXCEPTION 'PURCHASE_RECEIPT_REVERSAL_REASON_REQUIRED';END IF;
  SELECT * INTO gr FROM public.goods_receipts WHERE id=receipt_id FOR UPDATE;IF NOT FOUND THEN RAISE EXCEPTION 'GOODS_RECEIPT_NOT_FOUND: %',receipt_id;END IF;
  SELECT * INTO f FROM public.purchase_accounting_facts WHERE goods_receipt_id=receipt_id;IF NOT FOUND THEN RAISE EXCEPTION 'PURCHASE_ACCOUNTING_FACT_NOT_FOUND: %',receipt_id;END IF;
  IF EXISTS(SELECT 1 FROM public.purchase_accounting_reversals r WHERE r.purchase_accounting_fact_id=f.id) THEN RETURN;END IF;
  IF EXISTS(SELECT 1 FROM public.supplier_payment_applications a WHERE a.purchase_accounting_fact_id=f.id AND a.status='matched') THEN RAISE EXCEPTION 'PURCHASE_RECEIPT_REVERSAL_BLOCKED_BY_PAYMENT: reverse supplier payment first';END IF;
  SELECT id,total_debit INTO original_journal_id,v_total FROM public.journal_entries WHERE source_type='goods_receipt' AND source_id=receipt_id AND event_kind='purchase_receipt_recognition';IF original_journal_id IS NULL THEN RAISE EXCEPTION 'PURCHASE_RECEIPT_ORIGINAL_JOURNAL_MISSING: %',receipt_id;END IF;
  IF EXISTS(SELECT 1 FROM public.journal_lines WHERE entry_id=original_journal_id AND account_code IN ('1000','1010') AND credit>0) THEN RAISE EXCEPTION 'PURCHASE_RECEIPT_REVERSAL_REQUIRES_DIRECT_COST_REFUND_WORKFLOW: direct-paid landed cost exists';END IF;
  FOR item_record IN SELECT gri.id,gri.purchase_order_item_id,gri.product_id,gri.variant_id,gri.accepted_quantity,gri.inventory_movement_id,im.unit_cost,im.currency,im.created_at FROM public.goods_receipt_items gri JOIN public.inventory_movements im ON im.id=gri.inventory_movement_id WHERE gri.goods_receipt_id=receipt_id AND gri.accepted_quantity>0 ORDER BY gri.id LOOP
    SELECT * INTO v_cost_event FROM public.inventory_cost_events ce WHERE ce.movement_id=item_record.inventory_movement_id;IF NOT FOUND THEN RAISE EXCEPTION 'PURCHASE_RECEIPT_REVERSAL_COST_EVENT_MISSING: %',item_record.inventory_movement_id;END IF;
    IF EXISTS(SELECT 1 FROM public.inventory_movements later WHERE later.location_id=gr.location_id AND later.product_id=item_record.product_id AND later.variant_id IS NOT DISTINCT FROM item_record.variant_id AND later.id<>item_record.inventory_movement_id AND later.created_at>item_record.created_at) THEN RAISE EXCEPTION 'PURCHASE_RECEIPT_REVERSAL_BLOCKED_BY_LATER_INVENTORY_ACTIVITY: %/%',item_record.product_id,COALESCE(item_record.variant_id,'base');END IF;
    movement_key:='goods_receipt_reversal:'||item_record.id;v_rev_movement:=NULL;
    INSERT INTO public.inventory_movements(product_id,variant_id,location_id,quantity_delta,movement_type,source_type,source_id,idempotency_key,unit_cost,currency,happened_at,created_by,reversed_movement_id,metadata) VALUES(item_record.product_id,item_record.variant_id,gr.location_id,-item_record.accepted_quantity::integer,'manual_adjustment','goods_receipt_reversal',receipt_id,movement_key,item_record.unit_cost,item_record.currency,clock_timestamp(),actor,item_record.inventory_movement_id,jsonb_build_object('reason',reason,'goods_receipt_id',receipt_id,'purchase_accounting_fact_id',f.id,'cost_method','moving_weighted_average_reversal')) ON CONFLICT(idempotency_key) DO NOTHING RETURNING id INTO v_rev_movement;
    IF v_rev_movement IS NULL THEN SELECT id INTO v_rev_movement FROM public.inventory_movements WHERE idempotency_key=movement_key;END IF;
    PERFORM public.set_current_inventory_unit_cost(item_record.product_id,item_record.variant_id,v_cost_event.unit_cost_before,actor,'reversal of goods receipt '||receipt_id);
    INSERT INTO public.inventory_cost_events(movement_id,product_id,variant_id,method,qty_before,unit_cost_before,received_qty,received_value_iqd,unit_cost_after,evidence) VALUES(v_rev_movement,item_record.product_id,item_record.variant_id,'moving_weighted_average_reversal',v_cost_event.qty_before+v_cost_event.received_qty,v_cost_event.unit_cost_after,-v_cost_event.received_qty,-v_cost_event.received_value_iqd,v_cost_event.unit_cost_before,jsonb_build_object('reversal_of_movement_id',item_record.inventory_movement_id,'reason',reason)) ON CONFLICT(movement_id) DO NOTHING;
    UPDATE public.purchase_order_items SET received_quantity=received_quantity-item_record.accepted_quantity WHERE id=item_record.purchase_order_item_id;
  END LOOP;
  INSERT INTO public.journal_entries(entry_date,period_key,source_type,source_id,event_kind,description,total_debit,total_credit,reversal_of_entry_id,evidence,created_by) VALUES(clock_timestamp(),to_char(clock_timestamp() AT TIME ZONE 'Asia/Baghdad','YYYY-MM'),'goods_receipt',receipt_id,'purchase_receipt_reversal','عكس استلام مورد: '||reason,v_total,v_total,original_journal_id,jsonb_build_object('purchase_accounting_fact_id',f.id,'reason',reason),actor) RETURNING id INTO reversal_journal_id;
  INSERT INTO public.journal_lines(entry_id,line_number,account_code,debit,credit,memo,dimensions) SELECT reversal_journal_id,line_number,account_code,credit,debit,'عكس: '||COALESCE(memo,''),dimensions FROM public.journal_lines WHERE entry_id=original_journal_id ORDER BY line_number;PERFORM public.validate_journal_entry(reversal_journal_id);
  INSERT INTO public.purchase_accounting_reversals(purchase_accounting_fact_id,goods_receipt_id,reversed_at,reason,journal_entry_id,created_by,evidence) VALUES(f.id,receipt_id,clock_timestamp(),reason,reversal_journal_id,actor,jsonb_build_object('original_journal_id',original_journal_id));
  PERFORM set_config('aquavo.purchase_receipt_reversal','on',true);UPDATE public.goods_receipts SET status='cancelled',notes=concat_ws(' | ',NULLIF(notes,''),'Accounting reversal: '||reason),updated_at=clock_timestamp() WHERE id=receipt_id;
  UPDATE public.purchase_orders po SET status=CASE WHEN EXISTS(SELECT 1 FROM public.purchase_order_items poi WHERE poi.purchase_order_id=po.id AND poi.received_quantity>0) THEN CASE WHEN EXISTS(SELECT 1 FROM public.purchase_order_items poi WHERE poi.purchase_order_id=po.id AND poi.received_quantity<poi.ordered_quantity) THEN 'partially_received' ELSE 'received' END ELSE 'ordered' END,updated_at=clock_timestamp() WHERE po.id=f.purchase_order_id;
END $function$;

-- -----------------------------------------------------------------------------
-- 6. Supplier payment posting/reversal with original-currency AP and FX P/L.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.post_supplier_payment(p_payment_id integer,actor text)
RETURNS void LANGUAGE plpgsql AS $function$
DECLARE p record;v_supplier_id text;v_match_count integer;v_currency text;v_original numeric;v_amount_iqd numeric;v_fx numeric;v_outstanding_original numeric;v_remaining numeric;v_cash_remaining numeric;rec_fact record;v_apply numeric;v_carry numeric;v_cash numeric;v_fx_diff numeric;v_total_carry numeric:=0;v_total_cash numeric:=0;v_total_fx numeric:=0;v_entry_id text;v_line integer:=0;v_journal_total numeric;
BEGIN
  SELECT * INTO p FROM public.supplier_payments WHERE id=p_payment_id FOR UPDATE;IF NOT FOUND THEN RAISE EXCEPTION 'SUPPLIER_PAYMENT_NOT_FOUND: %',p_payment_id;END IF;IF p.status::text<>'paid' THEN RAISE EXCEPTION 'SUPPLIER_PAYMENT_NOT_PAID: %',p_payment_id;END IF;IF p.accounting_posted_at IS NOT NULL THEN RETURN;END IF;IF COALESCE(p.approved_by_founder,false)<>true THEN RAISE EXCEPTION 'SUPPLIER_PAYMENT_OWNER_APPROVAL_REQUIRED: %',p_payment_id;END IF;
  v_supplier_id:=p.supplier_id;IF v_supplier_id IS NULL THEN SELECT COUNT(*),MIN(id) INTO v_match_count,v_supplier_id FROM public.suppliers WHERE is_active=true AND (display_name=p.supplier_name OR legal_name=p.supplier_name OR code=p.supplier_name);IF v_match_count<>1 THEN RAISE EXCEPTION 'SUPPLIER_PAYMENT_SUPPLIER_REQUIRED';END IF;END IF;
  v_currency:=COALESCE(NULLIF(btrim(p.currency),''),'USD');v_original:=COALESCE(p.amount_original,CASE WHEN v_currency='USD' THEN p.amount_usd::numeric WHEN v_currency='IQD' THEN p.amount_iqd::numeric ELSE NULL END);IF v_original IS NULL OR v_original<=0 THEN RAISE EXCEPTION 'SUPPLIER_PAYMENT_ORIGINAL_AMOUNT_REQUIRED';END IF;
  IF v_currency='IQD' THEN v_fx:=1;v_amount_iqd:=v_original;ELSE v_fx:=p.exchange_rate_to_iqd;IF v_fx IS NULL OR v_fx<=0 OR NULLIF(btrim(COALESCE(p.exchange_rate_source,'')),'') IS NULL OR p.exchange_rate_effective_at IS NULL THEN RAISE EXCEPTION 'SUPPLIER_PAYMENT_FX_EVIDENCE_REQUIRED';END IF;v_amount_iqd:=round(v_original*v_fx);IF p.amount_iqd IS NOT NULL AND abs(p.amount_iqd-v_amount_iqd)>1 THEN RAISE EXCEPTION 'SUPPLIER_PAYMENT_IQD_AMOUNT_MISMATCH';END IF;END IF;
  IF v_amount_iqd<=0 OR v_amount_iqd<>trunc(v_amount_iqd) THEN RAISE EXCEPTION 'SUPPLIER_PAYMENT_IQD_AMOUNT_INVALID';END IF;IF p.paid_at IS NULL THEN RAISE EXCEPTION 'SUPPLIER_PAYMENT_PAID_AT_REQUIRED';END IF;IF p.paid_from_account_code NOT IN ('1000','1010') THEN RAISE EXCEPTION 'SUPPLIER_PAYMENT_SOURCE_ACCOUNT_REQUIRED';END IF;
  SELECT COALESCE(SUM(GREATEST(f.payable_original-COALESCE(a.applied_original,0),0)),0) INTO v_outstanding_original FROM public.purchase_accounting_facts f LEFT JOIN (SELECT purchase_accounting_fact_id,SUM(applied_amount_original) FILTER(WHERE status='matched') applied_original FROM public.supplier_payment_applications GROUP BY purchase_accounting_fact_id) a ON a.purchase_accounting_fact_id=f.id LEFT JOIN public.purchase_accounting_reversals r ON r.purchase_accounting_fact_id=f.id WHERE f.supplier_id=v_supplier_id AND f.currency=v_currency AND r.id IS NULL;IF v_original>v_outstanding_original THEN RAISE EXCEPTION 'SUPPLIER_PAYMENT_EXCEEDS_PAYABLE';END IF;
  v_remaining:=v_original;v_cash_remaining:=v_amount_iqd;
  FOR rec_fact IN SELECT f.id,f.payable_original,f.payable_iqd,(f.payable_original-COALESCE(a.applied_original,0)) outstanding_original,(f.payable_iqd-COALESCE(a.carrying_iqd,0)) outstanding_carrying FROM public.purchase_accounting_facts f LEFT JOIN (SELECT purchase_accounting_fact_id,SUM(applied_amount_original) FILTER(WHERE status='matched') applied_original,SUM(carrying_amount_iqd) FILTER(WHERE status='matched') carrying_iqd FROM public.supplier_payment_applications GROUP BY purchase_accounting_fact_id) a ON a.purchase_accounting_fact_id=f.id LEFT JOIN public.purchase_accounting_reversals r ON r.purchase_accounting_fact_id=f.id WHERE f.supplier_id=v_supplier_id AND f.currency=v_currency AND r.id IS NULL AND f.payable_original-COALESCE(a.applied_original,0)>0 ORDER BY f.recognized_at,f.id FOR UPDATE OF f LOOP
    EXIT WHEN v_remaining<=0;v_apply:=LEAST(v_remaining,rec_fact.outstanding_original);IF v_apply=rec_fact.outstanding_original THEN v_carry:=rec_fact.outstanding_carrying;ELSE v_carry:=round((rec_fact.payable_iqd/rec_fact.payable_original)*v_apply);END IF;IF v_apply=v_remaining THEN v_cash:=v_cash_remaining;ELSE v_cash:=round(v_apply*v_fx);END IF;v_fx_diff:=v_cash-v_carry;
    INSERT INTO public.supplier_payment_applications(payment_id,purchase_accounting_fact_id,applied_amount_iqd,applied_amount_original,carrying_amount_iqd,cash_amount_iqd,fx_difference_iqd,status,matched_at,evidence) VALUES(p_payment_id,rec_fact.id,v_carry,v_apply,v_carry,v_cash,v_fx_diff,'matched',p.paid_at AT TIME ZONE 'Asia/Baghdad',jsonb_build_object('auto_applied_fifo',true,'actor',actor,'payment_fx',v_fx,'currency',v_currency));
    v_total_carry:=v_total_carry+v_carry;v_total_cash:=v_total_cash+v_cash;v_total_fx:=v_total_fx+v_fx_diff;v_remaining:=v_remaining-v_apply;v_cash_remaining:=v_cash_remaining-v_cash;
  END LOOP;
  IF v_remaining<>0 OR v_cash_remaining<>0 THEN RAISE EXCEPTION 'SUPPLIER_PAYMENT_APPLICATION_INCOMPLETE';END IF;
  v_journal_total:=GREATEST(v_total_carry,v_total_cash);INSERT INTO public.journal_entries(entry_date,period_key,source_type,source_id,event_kind,description,total_debit,total_credit,evidence,created_by) VALUES(p.paid_at AT TIME ZONE 'Asia/Baghdad',to_char(p.paid_at,'YYYY-MM'),'supplier_payment',p_payment_id::text,'supplier_payment','دفع مبلغ مستحق إلى المورد',v_journal_total,v_journal_total,jsonb_build_object('supplier_id',v_supplier_id,'supplier_name',p.supplier_name,'payment_reference',p.payment_reference,'currency',v_currency,'amount_original',v_original,'exchange_rate_to_iqd',v_fx,'carrying_amount_iqd',v_total_carry,'cash_amount_iqd',v_total_cash,'fx_difference_iqd',v_total_fx),actor) RETURNING id INTO v_entry_id;
  v_line:=v_line+1;INSERT INTO public.journal_lines(entry_id,line_number,account_code,debit,memo,dimensions) VALUES(v_entry_id,v_line,'2000',v_total_carry,'تخفيض ذمم الموردين بالقيمة الدفترية',jsonb_build_object('supplier_id',v_supplier_id,'payment_id',p_payment_id));IF v_total_fx>0 THEN v_line:=v_line+1;INSERT INTO public.journal_lines(entry_id,line_number,account_code,debit,memo,dimensions) VALUES(v_entry_id,v_line,'5400',v_total_fx,'خسارة فرق عملة عند تسوية المورد',jsonb_build_object('supplier_id',v_supplier_id,'payment_id',p_payment_id));END IF;v_line:=v_line+1;INSERT INTO public.journal_lines(entry_id,line_number,account_code,credit,memo,dimensions) VALUES(v_entry_id,v_line,p.paid_from_account_code,v_total_cash,'دفع المورد بالقيمة الفعلية',jsonb_build_object('supplier_id',v_supplier_id,'payment_id',p_payment_id));IF v_total_fx<0 THEN v_line:=v_line+1;INSERT INTO public.journal_lines(entry_id,line_number,account_code,credit,memo,dimensions) VALUES(v_entry_id,v_line,'5400',abs(v_total_fx),'ربح فرق عملة عند تسوية المورد',jsonb_build_object('supplier_id',v_supplier_id,'payment_id',p_payment_id));END IF;PERFORM public.validate_journal_entry(v_entry_id);
  PERFORM set_config('aquavo.supplier_payment_posting','on',true);UPDATE public.supplier_payments SET supplier_id=v_supplier_id,currency=v_currency,amount_original=v_original,exchange_rate_to_iqd=v_fx,amount_iqd=v_amount_iqd::integer,accounting_posted_at=clock_timestamp() WHERE id=p_payment_id;
END $function$;

CREATE OR REPLACE FUNCTION public.reverse_supplier_payment(p_payment_id integer,actor text,reason text)
RETURNS void LANGUAGE plpgsql AS $function$
DECLARE p record;v_original_id text;v_entry_id text;v_total numeric;v_period text;
BEGIN
  SELECT * INTO p FROM public.supplier_payments WHERE id=p_payment_id FOR UPDATE;IF NOT FOUND THEN RAISE EXCEPTION 'SUPPLIER_PAYMENT_NOT_FOUND';END IF;IF p.accounting_posted_at IS NULL OR p.accounting_reversed_at IS NOT NULL THEN RETURN;END IF;IF NULLIF(btrim(COALESCE(reason,'')),'') IS NULL THEN RAISE EXCEPTION 'SUPPLIER_PAYMENT_REVERSAL_REASON_REQUIRED';END IF;
  SELECT id,total_debit,period_key INTO v_original_id,v_total,v_period FROM public.journal_entries WHERE source_type='supplier_payment' AND source_id=p_payment_id::text AND event_kind='supplier_payment';IF v_original_id IS NULL THEN RAISE EXCEPTION 'SUPPLIER_PAYMENT_ORIGINAL_JOURNAL_MISSING';END IF;
  INSERT INTO public.journal_entries(entry_date,period_key,source_type,source_id,event_kind,description,total_debit,total_credit,reversal_of_entry_id,evidence,created_by) VALUES(clock_timestamp(),to_char(clock_timestamp() AT TIME ZONE 'Asia/Baghdad','YYYY-MM'),'supplier_payment',p_payment_id::text,'supplier_payment_reversal','عكس دفعة مورد: '||reason,v_total,v_total,v_original_id,jsonb_build_object('reason',reason,'supplier_id',p.supplier_id,'original_period',v_period),actor) RETURNING id INTO v_entry_id;
  INSERT INTO public.journal_lines(entry_id,line_number,account_code,debit,credit,memo,dimensions) SELECT v_entry_id,line_number,account_code,credit,debit,'عكس: '||COALESCE(memo,''),dimensions FROM public.journal_lines WHERE entry_id=v_original_id ORDER BY line_number;PERFORM public.validate_journal_entry(v_entry_id);
  UPDATE public.supplier_payment_applications SET status='reversed',reversed_at=clock_timestamp() WHERE payment_id=p_payment_id AND status='matched';PERFORM set_config('aquavo.supplier_payment_posting','on',true);UPDATE public.supplier_payments SET accounting_reversed_at=clock_timestamp() WHERE id=p_payment_id;
END $function$;

CREATE OR REPLACE FUNCTION public.supplier_payment_accounting_trigger()
RETURNS trigger LANGUAGE plpgsql AS $function$
BEGIN
  IF NEW.status::text='paid' AND (TG_OP='INSERT' OR OLD.status::text IS DISTINCT FROM 'paid') THEN PERFORM public.post_supplier_payment(NEW.id,'supplier_payment_status_trigger');
  ELSIF TG_OP='UPDATE' AND OLD.status::text='paid' AND NEW.status::text='cancelled' THEN PERFORM public.reverse_supplier_payment(NEW.id,'supplier_payment_status_trigger',COALESCE(NULLIF(btrim(NEW.notes),''),'payment cancelled'));END IF;
  RETURN NEW;
END $function$;

-- -----------------------------------------------------------------------------
-- 7. Carrier settlement identity, payment-event identity, and immutability.
-- -----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS cash_settlement_items_one_matched_order_idx ON public.cash_settlement_items(order_id) WHERE reconciliation_status IN ('matched','approved');
CREATE UNIQUE INDEX IF NOT EXISTS cash_settlement_items_one_matched_payment_idx ON public.cash_settlement_items(payment_event_id) WHERE payment_event_id IS NOT NULL AND reconciliation_status IN ('matched','approved');

CREATE TABLE IF NOT EXISTS public.order_accounting_carrier_snapshots(
  order_fact_id text PRIMARY KEY REFERENCES public.order_accounting_facts(id),
  order_id text NOT NULL UNIQUE REFERENCES public.orders(id),
  carrier text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text
);

CREATE OR REPLACE FUNCTION public.reject_order_accounting_carrier_snapshot_mutation()
RETURNS trigger LANGUAGE plpgsql AS $function$ BEGIN RAISE EXCEPTION 'ORDER_ACCOUNTING_CARRIER_SNAPSHOT_IMMUTABLE' USING ERRCODE='55000';END $function$;

CREATE OR REPLACE FUNCTION public.validate_cash_settlement_reconciliation()
RETURNS trigger LANGUAGE plpgsql AS $function$
DECLARE item_gross numeric;item_fees numeric;item_net numeric;r record;f public.order_accounting_facts%ROWTYPE;pe record;v_carrier text;
BEGIN
  IF NEW.status NOT IN ('reconciled','closed') OR NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW;END IF;
  SELECT COALESCE(SUM(gross_amount),0),COALESCE(SUM(fee_amount),0),COALESCE(SUM(net_amount),0) INTO item_gross,item_fees,item_net FROM public.cash_settlement_items WHERE settlement_id=NEW.id;
  IF item_gross<>NEW.gross_amount OR item_fees<>NEW.fees_amount OR item_net<>NEW.net_amount THEN RAISE EXCEPTION 'SETTLEMENT_HEADER_MISMATCH: settlement % header does not match items',NEW.id;END IF;
  IF EXISTS(SELECT 1 FROM public.cash_settlement_items WHERE settlement_id=NEW.id AND reconciliation_status NOT IN ('matched','approved')) THEN RAISE EXCEPTION 'SETTLEMENT_UNRESOLVED_ITEMS: settlement % contains unresolved items',NEW.id;END IF;
  FOR r IN SELECT * FROM public.cash_settlement_items WHERE settlement_id=NEW.id ORDER BY id LOOP
    SELECT * INTO f FROM public.order_accounting_facts WHERE order_id=r.order_id;IF NOT FOUND THEN RAISE EXCEPTION 'SETTLEMENT_FACT_MISSING: order % has no accounting fact',r.order_id;END IF;
    SELECT COALESCE(f.carrier_snapshot,cs.carrier,o.carrier) INTO v_carrier FROM public.orders o LEFT JOIN public.order_accounting_carrier_snapshots cs ON cs.order_id=o.id WHERE o.id=r.order_id;
    IF v_carrier IS NULL OR v_carrier<>NEW.carrier THEN RAISE EXCEPTION 'SETTLEMENT_CARRIER_MISMATCH: order % carrier % settlement carrier %',r.order_id,COALESCE(v_carrier,'<missing>'),NEW.carrier;END IF;
    IF r.gross_amount<>f.gross_collected OR r.fee_amount<>f.carrier_fee OR r.net_amount<>f.merchant_net THEN RAISE EXCEPTION 'SETTLEMENT_FACT_MISMATCH: order %',r.order_id;END IF;
    IF r.payment_event_id IS NULL THEN RAISE EXCEPTION 'SETTLEMENT_PAYMENT_EVENT_REQUIRED: order %',r.order_id;END IF;
    SELECT id,order_id,status,amount INTO pe FROM public.payment_events WHERE id=r.payment_event_id;IF NOT FOUND OR pe.order_id<>r.order_id OR pe.status<>'completed' OR pe.amount<>f.gross_collected THEN RAISE EXCEPTION 'SETTLEMENT_PAYMENT_EVENT_MISMATCH: order % payment event %',r.order_id,r.payment_event_id;END IF;
    IF EXISTS(SELECT 1 FROM public.order_accounting_settlements os WHERE os.order_fact_id=f.id AND os.status='matched' AND os.settlement_id<>NEW.id) THEN RAISE EXCEPTION 'SETTLEMENT_DUPLICATE_ORDER: order % already matched',r.order_id;END IF;
  END LOOP;
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.guard_posted_cash_settlement_item_mutation()
RETURNS trigger LANGUAGE plpgsql AS $function$
DECLARE v_settlement_id text;v_status text;
BEGIN
  v_settlement_id:=CASE WHEN TG_OP='DELETE' THEN OLD.settlement_id ELSE NEW.settlement_id END;SELECT status INTO v_status FROM public.cash_settlements WHERE id=v_settlement_id;
  IF v_status IN ('reconciled','closed') THEN RAISE EXCEPTION 'POSTED_CASH_SETTLEMENT_ITEM_IMMUTABLE: reverse settlement before changing items' USING ERRCODE='55000';END IF;
  RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $function$;

CREATE OR REPLACE FUNCTION public.guard_posted_cash_settlement_mutation()
RETURNS trigger LANGUAGE plpgsql AS $function$
BEGIN
  IF TG_OP='DELETE' AND OLD.status IN ('reconciled','closed') THEN RAISE EXCEPTION 'POSTED_CASH_SETTLEMENT_IMMUTABLE: use reversal workflow' USING ERRCODE='55000';END IF;
  IF TG_OP='UPDATE' AND OLD.status IN ('reconciled','closed') THEN
    IF NEW.status='closed' AND OLD.status='reconciled' AND NEW.carrier IS NOT DISTINCT FROM OLD.carrier AND NEW.gross_amount IS NOT DISTINCT FROM OLD.gross_amount AND NEW.fees_amount IS NOT DISTINCT FROM OLD.fees_amount AND NEW.net_amount IS NOT DISTINCT FROM OLD.net_amount AND NEW.currency IS NOT DISTINCT FROM OLD.currency AND NEW.received_at IS NOT DISTINCT FROM OLD.received_at AND NEW.bank_reference IS NOT DISTINCT FROM OLD.bank_reference AND NEW.evidence IS NOT DISTINCT FROM OLD.evidence THEN RETURN NEW;END IF;
    RAISE EXCEPTION 'POSTED_CASH_SETTLEMENT_IMMUTABLE: economic fields cannot change after reconciliation' USING ERRCODE='55000';
  END IF;
  RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $function$;

CREATE OR REPLACE FUNCTION public.post_settlement_journal_and_match_facts()
RETURNS trigger LANGUAGE plpgsql AS $function$
DECLARE item record;f public.order_accounting_facts%ROWTYPE;v_entry_id text;v_account text;v_period text;v_inserted text;
BEGIN
  IF NEW.status NOT IN ('reconciled','closed') OR NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW;END IF;
  FOR item IN SELECT * FROM public.cash_settlement_items WHERE settlement_id=NEW.id ORDER BY id LOOP
    SELECT * INTO f FROM public.order_accounting_facts WHERE order_id=item.order_id;IF NOT FOUND THEN RAISE EXCEPTION 'SETTLEMENT_FACT_MISSING: %',item.order_id;END IF;v_inserted:=NULL;
    INSERT INTO public.order_accounting_settlements(order_fact_id,settlement_id,settlement_item_id,gross_amount,carrier_fee,merchant_net,status,matched_at,evidence) VALUES(f.id,NEW.id,item.id,item.gross_amount,item.fee_amount,item.net_amount,'matched',COALESCE(NEW.received_at,NEW.updated_at,clock_timestamp()),jsonb_build_object('settlement_number',NEW.settlement_number,'carrier',NEW.carrier,'item_reconciliation_status',item.reconciliation_status)) ON CONFLICT(order_fact_id) DO NOTHING RETURNING id INTO v_inserted;
    IF v_inserted IS NULL AND NOT EXISTS(SELECT 1 FROM public.order_accounting_settlements os WHERE os.order_fact_id=f.id AND os.settlement_id=NEW.id AND os.settlement_item_id=item.id AND os.status='matched') THEN RAISE EXCEPTION 'SETTLEMENT_DUPLICATE_ORDER: order % already matched elsewhere',item.order_id;END IF;
  END LOOP;
  SELECT id INTO v_entry_id FROM public.journal_entries WHERE source_type='cash_settlement' AND source_id=NEW.id AND event_kind='net_receipt';
  IF v_entry_id IS NULL AND NEW.net_amount>0 THEN
    v_account:=CASE WHEN NEW.bank_reference IS NOT NULL THEN '1010' ELSE '1000' END;v_period:=to_char(COALESCE(NEW.received_at,NEW.updated_at,clock_timestamp()) AT TIME ZONE 'Asia/Baghdad','YYYY-MM');
    INSERT INTO public.journal_entries(entry_date,period_key,source_type,source_id,event_kind,description,total_debit,total_credit,evidence) VALUES(COALESCE(NEW.received_at,NEW.updated_at,clock_timestamp()),v_period,'cash_settlement',NEW.id,'net_receipt','استلام صافي تسوية شركة التوصيل',NEW.net_amount,NEW.net_amount,NEW.evidence) RETURNING id INTO v_entry_id;
    INSERT INTO public.journal_lines(entry_id,line_number,account_code,debit,memo) VALUES(v_entry_id,1,v_account,NEW.net_amount,'صافي النقد المستلم');INSERT INTO public.journal_lines(entry_id,line_number,account_code,credit,memo) VALUES(v_entry_id,2,'1100',NEW.net_amount,'تصفية ذمم COD');PERFORM public.validate_journal_entry(v_entry_id);
  END IF;
  RETURN NEW;
END $function$;

-- -----------------------------------------------------------------------------
-- 8. Explicit rounding classification and post-settlement return funding source.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.post_order_delivery_journal(p_fact_id text)
RETURNS text LANGUAGE plpgsql AS $function$
DECLARE f public.order_accounting_facts%ROWTYPE;v_entry_id text;v_line integer:=0;v_total numeric;
BEGIN
  SELECT * INTO f FROM public.order_accounting_facts WHERE id=p_fact_id;IF NOT FOUND THEN RAISE EXCEPTION 'order accounting fact % not found',p_fact_id;END IF;SELECT id INTO v_entry_id FROM public.journal_entries WHERE source_type='order' AND source_id=f.order_id AND event_kind='delivery_recognition';IF FOUND THEN RETURN v_entry_id;END IF;
  IF f.cash_custody='carrier' THEN v_total:=f.merchant_net+f.delivery_subsidy;ELSE v_total:=f.gross_collected+f.delivery_subsidy;END IF;
  INSERT INTO public.journal_entries(entry_date,period_key,source_type,source_id,event_kind,description,total_debit,total_credit,evidence) VALUES(f.recognized_at,f.period_key,'order',f.order_id,'delivery_recognition','إثبات بيع COD عند التسليم',v_total,v_total,jsonb_build_object('order_accounting_fact_id',f.id,'payment_event_id',f.payment_event_id,'policy_version',f.policy_version)) RETURNING id INTO v_entry_id;
  IF f.cash_custody='carrier' AND f.merchant_net>0 THEN v_line:=v_line+1;INSERT INTO public.journal_lines(entry_id,line_number,account_code,debit,memo,dimensions) VALUES(v_entry_id,v_line,'1100',f.merchant_net,'صافي مستحق من شركة التوصيل',jsonb_build_object('order_id',f.order_id));ELSIF f.cash_custody<>'carrier' AND f.gross_collected>0 THEN v_line:=v_line+1;INSERT INTO public.journal_lines(entry_id,line_number,account_code,debit,memo,dimensions) VALUES(v_entry_id,v_line,CASE WHEN f.cash_custody='bank' THEN '1010' ELSE '1000' END,f.gross_collected,'إجمالي COD مستلم',jsonb_build_object('order_id',f.order_id));END IF;
  IF f.delivery_subsidy>0 THEN v_line:=v_line+1;INSERT INTO public.journal_lines(entry_id,line_number,account_code,debit,memo,dimensions) VALUES(v_entry_id,v_line,'5200',f.delivery_subsidy,'دعم توصيل تتحمله AQUAVO',jsonb_build_object('order_id',f.order_id));END IF;
  IF f.rounding_adjustment<0 THEN v_line:=v_line+1;INSERT INTO public.journal_lines(entry_id,line_number,account_code,debit,memo,dimensions) VALUES(v_entry_id,v_line,'3050',abs(f.rounding_adjustment),'فرق تقريب سلبي',jsonb_build_object('order_id',f.order_id));END IF;
  IF f.product_revenue>0 THEN v_line:=v_line+1;INSERT INTO public.journal_lines(entry_id,line_number,account_code,credit,memo,dimensions) VALUES(v_entry_id,v_line,'3000',f.product_revenue,'مبيعات المنتجات فقط',jsonb_build_object('order_id',f.order_id));END IF;
  IF f.rounding_adjustment>0 THEN v_line:=v_line+1;INSERT INTO public.journal_lines(entry_id,line_number,account_code,credit,memo,dimensions) VALUES(v_entry_id,v_line,'3050',f.rounding_adjustment,'فرق تقريب إيجابي',jsonb_build_object('order_id',f.order_id));END IF;
  IF f.cash_custody<>'carrier' AND f.carrier_fee>0 THEN v_line:=v_line+1;INSERT INTO public.journal_lines(entry_id,line_number,account_code,credit,memo,dimensions) VALUES(v_entry_id,v_line,'2100',f.carrier_fee,'أجرة مستحقة لشركة التوصيل',jsonb_build_object('order_id',f.order_id));END IF;
  IF f.delivery_surplus>0 THEN v_line:=v_line+1;INSERT INTO public.journal_lines(entry_id,line_number,account_code,credit,memo,dimensions) VALUES(v_entry_id,v_line,'2200',f.delivery_surplus,'فرق توصيل معلّق وليس مبيعات منتجات',jsonb_build_object('order_id',f.order_id));END IF;PERFORM public.validate_journal_entry(v_entry_id);RETURN v_entry_id;
END $function$;

CREATE OR REPLACE FUNCTION public.record_order_delivery_accounting()
RETURNS trigger LANGUAGE plpgsql AS $function$
DECLARE v_cutover timestamptz;v_recognized_at timestamptz;v_period_key text;v_gross numeric;v_customer_fee numeric;v_carrier_fee numeric;v_product_revenue numeric;v_rounding numeric;v_merchant_net numeric;v_delivery_subsidy numeric;v_delivery_surplus numeric;v_event_id text;v_fact_id text;v_cogs numeric;v_line_count bigint;v_bad_cost_count bigint;v_cost_status text;
BEGIN
  IF lower(COALESCE(NEW.status,''))<>'delivered' OR lower(COALESCE(OLD.status,''))='delivered' THEN RETURN NEW;END IF;v_cutover:=public.aquavo_active_cutover();v_recognized_at:=COALESCE(NEW.delivered_at,clock_timestamp());IF v_recognized_at<v_cutover THEN RETURN NEW;END IF;
  v_gross:=COALESCE(NEW.rounded_total,NEW.total,0);v_customer_fee:=COALESCE(NEW.shipping_cost,0);v_carrier_fee:=COALESCE(NEW.carrier_fee,v_customer_fee,0);
  SELECT COALESCE(SUM(COALESCE(final_unit_sale_price_snapshot,price_at_purchase)*quantity),0),COUNT(*),COUNT(*) FILTER(WHERE cost_snapshot_status IS NULL OR cost_snapshot_status NOT IN ('exact','verified_zero') OR unit_cost_price IS NULL OR unit_packaging_cost IS NULL OR unit_insert_cost IS NULL),SUM((COALESCE(unit_cost_price,0)+COALESCE(unit_packaging_cost,0)+COALESCE(unit_insert_cost,0))*quantity) INTO v_product_revenue,v_line_count,v_bad_cost_count,v_cogs FROM public.order_items_relational WHERE order_id=NEW.id;
  IF v_line_count=0 THEN RAISE EXCEPTION 'ORDER_ACCOUNTING_INVALID: no relational order items for %',NEW.id;END IF;v_rounding:=(v_gross-v_customer_fee)-v_product_revenue;v_merchant_net:=v_gross-v_carrier_fee;v_delivery_subsidy:=GREATEST(v_carrier_fee-v_customer_fee,0);v_delivery_surplus:=GREATEST(v_customer_fee-v_carrier_fee,0);v_period_key:=to_char(v_recognized_at AT TIME ZONE 'Asia/Baghdad','YYYY-MM');IF v_product_revenue<0 OR v_merchant_net<0 THEN RAISE EXCEPTION 'ORDER_ACCOUNTING_INVALID: negative revenue/net for order %',NEW.id;END IF;
  INSERT INTO public.payment_events(order_id,event_type,status,amount,currency,method,provider,idempotency_key,occurred_at,evidence,metadata,created_by) VALUES(NEW.id,'cod_received','completed',v_gross,'IQD','cod',COALESCE(NEW.carrier,'carrier'),'delivery:'||NEW.id||':cod_received',v_recognized_at,jsonb_build_object('source','order_delivery_transition','delivered_at',v_recognized_at),jsonb_build_object('gross_collected',v_gross,'customer_delivery_fee',v_customer_fee,'carrier_fee',v_carrier_fee,'product_revenue',v_product_revenue,'rounding_adjustment',v_rounding,'merchant_net',v_merchant_net,'delivery_subsidy',v_delivery_subsidy,'delivery_surplus',v_delivery_surplus,'policy_version','v3_explicit_rounding_carrier_snapshot'),'database_trigger') ON CONFLICT(idempotency_key) DO NOTHING;
  SELECT id INTO v_event_id FROM public.payment_events WHERE idempotency_key='delivery:'||NEW.id||':cod_received' AND status='completed' AND amount=v_gross;IF v_event_id IS NULL THEN RAISE EXCEPTION 'COD_EVENT_MISSING_OR_MISMATCH for delivered order %',NEW.id;END IF;
  IF v_bad_cost_count>0 THEN v_cost_status:='incomplete';v_cogs:=NULL;ELSIF v_cogs=0 THEN v_cost_status:='verified_zero';ELSE v_cost_status:='exact';END IF;
  INSERT INTO public.order_accounting_facts(order_id,payment_event_id,recognized_at,period_key,gross_collected,customer_delivery_fee,carrier_fee,product_revenue,rounding_adjustment,merchant_net,delivery_subsidy,delivery_surplus,cash_custody,cogs_amount,cost_status,currency,policy_version,carrier_snapshot,evidence) VALUES(NEW.id,v_event_id,v_recognized_at,v_period_key,v_gross,v_customer_fee,v_carrier_fee,v_product_revenue,v_rounding,v_merchant_net,v_delivery_subsidy,v_delivery_surplus,'carrier',v_cogs,v_cost_status,'IQD','v3_explicit_rounding_carrier_snapshot',NEW.carrier,jsonb_build_object('created_by','database_trigger','order_number',NEW.order_number,'delivered_at',v_recognized_at,'order_total_source',CASE WHEN NEW.rounded_total IS NOT NULL THEN 'rounded_total' ELSE 'total' END)) ON CONFLICT(order_id) DO NOTHING RETURNING id INTO v_fact_id;
  IF v_fact_id IS NULL THEN SELECT id INTO v_fact_id FROM public.order_accounting_facts WHERE order_id=NEW.id;END IF;PERFORM public.post_order_delivery_journal(v_fact_id);PERFORM public.post_order_cogs_journal(v_fact_id);PERFORM public.post_order_fulfillment_journal(NEW.id);RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.post_verified_return_journal()
RETURNS trigger LANGUAGE plpgsql AS $function$
DECLARE v_fact public.order_accounting_facts%ROWTYPE;v_entry_id text;v_original_id text;v_refund_credit_account text;v_cash_loss numeric;v_restock_cogs numeric;v_total numeric;v_line integer:=0;v_period text;v_settlement_account text;
BEGIN
  IF NEW.created_at<(public.aquavo_active_cutover() AT TIME ZONE 'UTC') THEN RETURN NEW;END IF;
  IF NEW.status='verified' AND OLD.status IS DISTINCT FROM 'verified' THEN
    v_cash_loss:=COALESCE(NEW.delivery_cost_loss,0)+COALESCE(NEW.return_shipping_cost,0)+CASE WHEN COALESCE(NEW.packaging_loss_source,'manual')='manual' THEN COALESCE(NEW.packaging_loss,0) ELSE 0 END;
    SELECT COALESCE(SUM(COALESCE(NULLIF(elem->>'qty','')::numeric,0)*COALESCE(NULLIF(elem->>'cogsAtTime','')::numeric,0)),0) INTO v_restock_cogs FROM jsonb_array_elements(COALESCE(NEW.affected_items,'[]'::jsonb)) elem WHERE NEW.restocked=true AND NEW.type<>'rejected_delivery';v_total:=COALESCE(NEW.refund_amount,0)+v_cash_loss+v_restock_cogs;IF v_total=0 THEN RETURN NEW;END IF;
    SELECT * INTO v_fact FROM public.order_accounting_facts WHERE order_id=NEW.order_id;IF NOT FOUND THEN RAISE EXCEPTION 'RETURN_JOURNAL_BLOCKED: accounting fact required for order %',NEW.order_id;END IF;
    IF v_fact.cash_custody='carrier' AND NOT EXISTS(SELECT 1 FROM public.order_accounting_settlements os WHERE os.order_fact_id=v_fact.id AND os.status='matched') THEN v_refund_credit_account:='1100';
    ELSE
      IF NEW.refund_account_code IS NOT NULL THEN IF NEW.refund_account_code NOT IN ('1000','1010') THEN RAISE EXCEPTION 'RETURN_REFUND_ACCOUNT_INVALID: use cash 1000 or bank 1010';END IF;IF COALESCE(NEW.refund_evidence,'{}'::jsonb)='{}'::jsonb THEN RAISE EXCEPTION 'RETURN_REFUND_EVIDENCE_REQUIRED_FOR_OVERRIDE';END IF;v_refund_credit_account:=NEW.refund_account_code;
      ELSE SELECT CASE WHEN s.bank_reference IS NOT NULL THEN '1010' ELSE '1000' END INTO v_settlement_account FROM public.order_accounting_settlements os JOIN public.cash_settlements s ON s.id=os.settlement_id WHERE os.order_fact_id=v_fact.id AND os.status='matched' ORDER BY os.matched_at DESC LIMIT 1;v_refund_credit_account:=COALESCE(v_settlement_account,CASE WHEN v_fact.cash_custody='bank' THEN '1010' ELSE '1000' END);END IF;
    END IF;
    v_period:=to_char(NEW.updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Baghdad','YYYY-MM');
    INSERT INTO public.journal_entries(entry_date,period_key,source_type,source_id,event_kind,description,total_debit,total_credit,evidence,created_by) VALUES(NEW.updated_at AT TIME ZONE 'UTC',v_period,'return_event',NEW.id,'return_verification','اثبات مرتجع معتمد للطلب '||NEW.order_id,v_total,v_total,jsonb_build_object('order_id',NEW.order_id,'restocked',NEW.restocked,'restock_cogs',v_restock_cogs,'note',NEW.note,'refund_account_code',v_refund_credit_account,'refund_evidence',NEW.refund_evidence,'packaging_loss_source',NEW.packaging_loss_source),NEW.created_by) ON CONFLICT(source_type,source_id,event_kind) DO NOTHING RETURNING id INTO v_entry_id;
    IF v_entry_id IS NOT NULL THEN
      IF COALESCE(NEW.refund_amount,0)>0 THEN v_line:=v_line+1;INSERT INTO public.journal_lines(entry_id,line_number,account_code,debit,memo) VALUES(v_entry_id,v_line,'4100',NEW.refund_amount,'عكس ايراد المبلغ المرتجع');END IF;
      IF v_restock_cogs>0 THEN v_line:=v_line+1;INSERT INTO public.journal_lines(entry_id,line_number,account_code,debit,memo) VALUES(v_entry_id,v_line,'1200',v_restock_cogs,'اعادة كلفة المنتجات الصالحة للبيع الى المخزون');END IF;
      IF v_cash_loss>0 THEN v_line:=v_line+1;INSERT INTO public.journal_lines(entry_id,line_number,account_code,debit,memo) VALUES(v_entry_id,v_line,'4200',v_cash_loss,'كلف الراجع التشغيلية الفعلية');END IF;
      IF COALESCE(NEW.refund_amount,0)>0 THEN v_line:=v_line+1;INSERT INTO public.journal_lines(entry_id,line_number,account_code,credit,memo) VALUES(v_entry_id,v_line,v_refund_credit_account,NEW.refund_amount,'تسوية او دفع مبلغ الراجع');END IF;
      IF v_cash_loss>0 THEN v_line:=v_line+1;INSERT INTO public.journal_lines(entry_id,line_number,account_code,credit,memo) VALUES(v_entry_id,v_line,CASE WHEN NEW.refund_account_code IN ('1000','1010') THEN NEW.refund_account_code ELSE '1000' END,v_cash_loss,'كلف نقدية للراجع');END IF;
      IF v_restock_cogs>0 THEN v_line:=v_line+1;INSERT INTO public.journal_lines(entry_id,line_number,account_code,credit,memo) VALUES(v_entry_id,v_line,'4000',v_restock_cogs,'عكس كلفة البضاعة للمنتجات المعادة الى المخزون');END IF;PERFORM public.validate_journal_entry(v_entry_id);
    END IF;
  END IF;
  IF OLD.status='verified' AND NEW.status IS DISTINCT FROM 'verified' THEN
    SELECT id INTO v_original_id FROM public.journal_entries WHERE source_type='return_event' AND source_id=NEW.id AND event_kind='return_verification';IF v_original_id IS NOT NULL THEN SELECT total_debit,period_key INTO v_total,v_period FROM public.journal_entries WHERE id=v_original_id;INSERT INTO public.journal_entries(entry_date,period_key,source_type,source_id,event_kind,description,total_debit,total_credit,reversal_of_entry_id,evidence,created_by) VALUES(clock_timestamp(),to_char(clock_timestamp() AT TIME ZONE 'Asia/Baghdad','YYYY-MM'),'return_event',NEW.id,'return_reversal','عكس راجع معتمد: '||NEW.note,v_total,v_total,v_original_id,jsonb_build_object('reason',NEW.note,'original_period',v_period),NEW.created_by) ON CONFLICT(source_type,source_id,event_kind) DO NOTHING RETURNING id INTO v_entry_id;IF v_entry_id IS NOT NULL THEN INSERT INTO public.journal_lines(entry_id,line_number,account_code,debit,credit,memo,dimensions) SELECT v_entry_id,line_number,account_code,credit,debit,'عكس: '||COALESCE(memo,''),dimensions FROM public.journal_lines WHERE entry_id=v_original_id ORDER BY line_number;PERFORM public.validate_journal_entry(v_entry_id);END IF;END IF;
  END IF;
  RETURN NEW;
END $function$;

-- -----------------------------------------------------------------------------
-- 9. Opening carrier receivable traceability.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.opening_carrier_receivable_lots(
  id text PRIMARY KEY,
  effective_at timestamptz NOT NULL,
  original_amount_iqd numeric NOT NULL CHECK(original_amount_iqd>=0),
  description text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.opening_carrier_receivable_applications(
  id text PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  lot_id text NOT NULL REFERENCES public.opening_carrier_receivable_lots(id),
  idempotency_key text NOT NULL UNIQUE,
  amount_iqd numeric NOT NULL CHECK(amount_iqd>0),
  received_at timestamptz NOT NULL,
  account_code text NOT NULL REFERENCES public.chart_of_accounts(code),
  carrier text,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  journal_entry_id text NOT NULL UNIQUE REFERENCES public.journal_entries(id),
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE VIEW public.v_opening_carrier_receivable_lots AS SELECT l.id,l.effective_at,l.original_amount_iqd,COALESCE(sum(a.amount_iqd),0::numeric) settled_iqd,l.original_amount_iqd-COALESCE(sum(a.amount_iqd),0::numeric) outstanding_iqd,l.description,l.evidence FROM public.opening_carrier_receivable_lots l LEFT JOIN public.opening_carrier_receivable_applications a ON a.lot_id=l.id GROUP BY l.id,l.effective_at,l.original_amount_iqd,l.description,l.evidence;
CREATE OR REPLACE FUNCTION public.reject_opening_carrier_receivable_mutation() RETURNS trigger LANGUAGE plpgsql AS $function$ BEGIN RAISE EXCEPTION 'OPENING_CARRIER_RECEIVABLE_IMMUTABLE' USING ERRCODE='55000';END $function$;
CREATE OR REPLACE FUNCTION public.post_opening_carrier_receivable_settlement(p_lot_id text,p_idempotency_key text,p_amount_iqd numeric,p_account_code text,p_carrier text,p_evidence jsonb,p_actor text)
RETURNS text LANGUAGE plpgsql AS $function$
DECLARE v_lot record;v_outstanding numeric;v_entry_id text;v_existing text;
BEGIN
  IF p_account_code NOT IN ('1000','1010') THEN RAISE EXCEPTION 'OPENING_CARRIER_SETTLEMENT_ACCOUNT_INVALID';END IF;IF p_amount_iqd<=0 OR p_amount_iqd<>trunc(p_amount_iqd) THEN RAISE EXCEPTION 'OPENING_CARRIER_SETTLEMENT_AMOUNT_INVALID';END IF;IF COALESCE(p_evidence,'{}'::jsonb)='{}'::jsonb THEN RAISE EXCEPTION 'OPENING_CARRIER_SETTLEMENT_EVIDENCE_REQUIRED';END IF;
  SELECT journal_entry_id INTO v_existing FROM public.opening_carrier_receivable_applications WHERE idempotency_key=p_idempotency_key;IF v_existing IS NOT NULL THEN RETURN v_existing;END IF;SELECT * INTO v_lot FROM public.opening_carrier_receivable_lots WHERE id=p_lot_id FOR UPDATE;IF NOT FOUND THEN RAISE EXCEPTION 'OPENING_CARRIER_LOT_NOT_FOUND';END IF;SELECT outstanding_iqd INTO v_outstanding FROM public.v_opening_carrier_receivable_lots WHERE id=p_lot_id;IF p_amount_iqd>v_outstanding THEN RAISE EXCEPTION 'OPENING_CARRIER_SETTLEMENT_EXCEEDS_OUTSTANDING';END IF;
  INSERT INTO public.journal_entries(entry_date,period_key,source_type,source_id,event_kind,description,total_debit,total_credit,evidence,created_by) VALUES(clock_timestamp(),to_char(clock_timestamp() AT TIME ZONE 'Asia/Baghdad','YYYY-MM'),'opening_carrier_receivable',p_lot_id,'opening_carrier_settlement','تحصيل من ذمم شركات التوصيل الافتتاحية',p_amount_iqd,p_amount_iqd,p_evidence,p_actor) RETURNING id INTO v_entry_id;INSERT INTO public.journal_lines(entry_id,line_number,account_code,debit,memo) VALUES(v_entry_id,1,p_account_code,p_amount_iqd,'تحصيل ذمة افتتاحية من شركة التوصيل');INSERT INTO public.journal_lines(entry_id,line_number,account_code,credit,memo) VALUES(v_entry_id,2,'1100',p_amount_iqd,'تخفيض ذمم COD الافتتاحية');PERFORM public.validate_journal_entry(v_entry_id);
  INSERT INTO public.opening_carrier_receivable_applications(lot_id,idempotency_key,amount_iqd,received_at,account_code,carrier,evidence,journal_entry_id,created_by) VALUES(p_lot_id,p_idempotency_key,p_amount_iqd,clock_timestamp(),p_account_code,p_carrier,p_evidence,v_entry_id,p_actor);RETURN v_entry_id;
END $function$;

-- -----------------------------------------------------------------------------
-- 10. Procurement/AP and period readiness, including variants and settlements.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_supplier_payables AS
SELECT f.id purchase_accounting_fact_id,f.goods_receipt_id,f.purchase_order_id,f.supplier_id,s.display_name supplier_name,f.recognized_at,f.payable_iqd,
CASE WHEN r.id IS NOT NULL THEN 0 ELSE COALESCE(a.carrying_iqd,0) END paid_iqd,
CASE WHEN r.id IS NOT NULL THEN 0 ELSE f.payable_iqd-COALESCE(a.carrying_iqd,0) END outstanding_iqd,
CASE WHEN r.id IS NOT NULL THEN 'reversed' WHEN f.payable_original-COALESCE(a.applied_original,0)=0 THEN 'paid' WHEN COALESCE(a.applied_original,0)>0 THEN 'partially_paid' ELSE 'unpaid' END payment_status,
f.currency,f.payable_original,CASE WHEN r.id IS NOT NULL THEN 0 ELSE COALESCE(a.applied_original,0) END paid_original,CASE WHEN r.id IS NOT NULL THEN 0 ELSE f.payable_original-COALESCE(a.applied_original,0) END outstanding_original,CASE WHEN r.id IS NOT NULL THEN 0 ELSE COALESCE(a.cash_iqd,0) END cash_paid_iqd,CASE WHEN r.id IS NOT NULL THEN 0 ELSE COALESCE(a.fx_iqd,0) END fx_difference_iqd
FROM public.purchase_accounting_facts f JOIN public.suppliers s ON s.id=f.supplier_id LEFT JOIN public.purchase_accounting_reversals r ON r.purchase_accounting_fact_id=f.id LEFT JOIN (SELECT purchase_accounting_fact_id,SUM(applied_amount_original) FILTER(WHERE status='matched') applied_original,SUM(carrying_amount_iqd) FILTER(WHERE status='matched') carrying_iqd,SUM(cash_amount_iqd) FILTER(WHERE status='matched') cash_iqd,SUM(fx_difference_iqd) FILTER(WHERE status='matched') fx_iqd FROM public.supplier_payment_applications GROUP BY purchase_accounting_fact_id) a ON a.purchase_accounting_fact_id=f.id;

CREATE OR REPLACE VIEW public.v_procurement_accounting_readiness AS
WITH gl AS (SELECT COALESCE(SUM(l.credit-l.debit),0) ap_balance FROM public.journal_lines l WHERE l.account_code='2000'),sub AS (SELECT COALESCE(SUM(outstanding_iqd),0) ap_outstanding FROM public.v_supplier_payables),received AS (SELECT poi.id,poi.received_quantity,COALESCE(SUM(CASE WHEN gr.status='posted' THEN gri.accepted_quantity ELSE 0 END),0) canonical_received FROM public.purchase_order_items poi LEFT JOIN public.goods_receipt_items gri ON gri.purchase_order_item_id=poi.id LEFT JOIN public.goods_receipts gr ON gr.id=gri.goods_receipt_id GROUP BY poi.id,poi.received_quantity)
SELECT (SELECT COUNT(*) FROM public.goods_receipts gr WHERE gr.status='posted' AND NOT EXISTS(SELECT 1 FROM public.purchase_accounting_facts f WHERE f.goods_receipt_id=gr.id)) posted_receipts_missing_fact,(SELECT COUNT(*) FROM public.purchase_accounting_facts f WHERE NOT EXISTS(SELECT 1 FROM public.journal_entries j WHERE j.source_type='goods_receipt' AND j.source_id=f.goods_receipt_id AND j.event_kind='purchase_receipt_recognition')) facts_missing_journal,(SELECT COUNT(*) FROM public.supplier_payments sp WHERE sp.status::text='paid' AND sp.accounting_posted_at IS NULL) paid_supplier_payments_missing_journal,(SELECT COUNT(*) FROM received WHERE received_quantity<>canonical_received) purchase_item_received_mismatches,(SELECT ap_outstanding FROM sub) ap_subledger_iqd,(SELECT ap_balance FROM gl) ap_gl_iqd,(SELECT ap_outstanding FROM sub)-(SELECT ap_balance FROM gl) ap_difference_iqd;

CREATE OR REPLACE VIEW public.v_accounting_period_readiness AS
WITH months AS (SELECT to_char(gs,'YYYY-MM') period_key FROM public.accounting_cutovers c CROSS JOIN LATERAL generate_series(date_trunc('month',c.cutover_at AT TIME ZONE 'Asia/Baghdad'),date_trunc('month',clock_timestamp() AT TIME ZONE 'Asia/Baghdad'),interval '1 month') gs WHERE c.status='active'),main AS (SELECT id FROM public.inventory_locations WHERE code='MAIN' AND is_active=true LIMIT 1),ledger AS (SELECT product_id,variant_id,SUM(quantity_delta)::integer qty FROM public.inventory_movements WHERE location_id=(SELECT id FROM main) GROUP BY product_id,variant_id),inventory_check AS (SELECT (SELECT COUNT(*) FROM public.products p LEFT JOIN ledger l ON l.product_id=p.id AND l.variant_id IS NULL WHERE p.deleted_at IS NULL AND COALESCE(p.has_variants,false)=false AND COALESCE(p.stock,0)<>COALESCE(l.qty,0))+(SELECT COUNT(*) FROM public.products p CROSS JOIN LATERAL jsonb_array_elements(COALESCE(p.variants,'[]'::jsonb)) v LEFT JOIN ledger l ON l.product_id=p.id AND l.variant_id=v->>'id' WHERE p.deleted_at IS NULL AND COALESCE(p.has_variants,false)=true AND COALESCE(NULLIF(v->>'stock','')::integer,0)<>COALESCE(l.qty,0)) mismatches),flags AS (SELECT COUNT(*) n FROM public.accounting_review_flags WHERE status='open' AND category<>'deployment_governance'),governance_flags AS (SELECT COUNT(*) n FROM public.accounting_review_flags WHERE status='open' AND category='deployment_governance'),procurement AS (SELECT CASE WHEN posted_receipts_missing_fact<>0 OR facts_missing_journal<>0 OR paid_supplier_payments_missing_journal<>0 OR purchase_item_received_mismatches<>0 OR ap_difference_iqd<>0 THEN 1 ELSE 0 END n FROM public.v_procurement_accounting_readiness),settlement_integrity AS (SELECT (SELECT COUNT(*) FROM public.cash_settlements s WHERE s.status IN ('reconciled','closed') AND COALESCE(s.received_at,s.created_at)>=public.aquavo_active_cutover() AND s.net_amount>0 AND NOT EXISTS(SELECT 1 FROM public.journal_entries j WHERE j.source_type='cash_settlement' AND j.source_id=s.id AND j.event_kind='net_receipt' AND j.total_debit=s.net_amount AND j.total_credit=s.net_amount))+(SELECT COUNT(*) FROM (SELECT i.order_id FROM public.cash_settlement_items i JOIN public.cash_settlements s ON s.id=i.settlement_id WHERE i.reconciliation_status IN ('matched','approved') AND COALESCE(s.received_at,s.created_at)>=public.aquavo_active_cutover() GROUP BY i.order_id HAVING COUNT(*)>1)d) n)
SELECT m.period_key,COALESCE((SELECT COUNT(*) FROM public.order_accounting_facts f WHERE f.period_key=m.period_key),0) realized_orders,COALESCE((SELECT COUNT(*) FROM public.order_accounting_facts f WHERE f.period_key=m.period_key AND (f.cost_status NOT IN ('exact','verified_zero') OR f.cogs_amount IS NULL)),0) incomplete_cost_orders,COALESCE((SELECT COUNT(*) FROM public.order_accounting_facts f JOIN public.orders o ON o.id=f.order_id WHERE f.period_key=m.period_key AND NOT EXISTS(SELECT 1 FROM public.order_fulfillment_events e WHERE e.order_id=f.order_id AND e.event_type='original' AND e.workflow_state='confirmed') AND COALESCE(o.box_cost,0)<=0),0) missing_fulfillment_orders,COALESCE((SELECT COUNT(*) FROM public.order_accounting_facts f WHERE f.period_key=m.period_key AND EXISTS(SELECT 1 FROM public.order_fulfillment_events e WHERE e.order_id=f.order_id AND e.event_type='original' AND e.workflow_state='confirmed' AND (e.cost_status NOT IN ('exact','verified_zero') OR e.actual_cost IS NULL))),0) incomplete_fulfillment_orders,COALESCE((SELECT COUNT(*) FROM public.order_accounting_facts f WHERE f.period_key=m.period_key AND NOT EXISTS(SELECT 1 FROM public.payment_events p WHERE p.id=f.payment_event_id AND p.status='completed' AND p.amount=f.gross_collected)),0) payment_evidence_errors,COALESCE((SELECT COUNT(*) FROM public.order_accounting_facts f WHERE f.period_key=m.period_key AND f.cash_custody='carrier' AND NOT EXISTS(SELECT 1 FROM public.order_accounting_settlements s WHERE s.order_fact_id=f.id AND s.status='matched')),0) unsettled_carrier_orders,COALESCE((SELECT COUNT(*) FROM public.order_accounting_facts f WHERE f.period_key=m.period_key AND f.delivery_surplus>0),0) delivery_surplus_exceptions,COALESCE((SELECT COUNT(*) FROM public.order_return_events r WHERE to_char(r.updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Baghdad','YYYY-MM')=m.period_key AND r.status='recorded'),0) unverified_returns,COALESCE((SELECT COUNT(*) FROM public.expenses e WHERE to_char(COALESCE(e.expense_occurred_at,e.expense_date AT TIME ZONE 'Asia/Baghdad') AT TIME ZONE 'Asia/Baghdad','YYYY-MM')=m.period_key AND e.deleted_at IS NULL AND e.accounting_status NOT IN ('verified','rejected')),0) undocumented_expenses,(SELECT mismatches FROM inventory_check) inventory_mismatches,(SELECT n FROM flags) open_review_flags,COALESCE((SELECT SUM(l.debit)-SUM(l.credit) FROM public.journal_entries j JOIN public.journal_lines l ON l.entry_id=j.id WHERE j.period_key=m.period_key),0) journal_difference,public.accounting_period_account_balance(m.period_key,'3000') product_revenue,COALESCE((SELECT SUM(f.merchant_net) FROM public.order_accounting_facts f WHERE f.period_key=m.period_key),0) merchant_net,COALESCE((SELECT SUM(f.delivery_subsidy) FROM public.order_accounting_facts f WHERE f.period_key=m.period_key),0) delivery_subsidy,COALESCE((SELECT SUM(f.delivery_surplus) FROM public.order_accounting_facts f WHERE f.period_key=m.period_key),0) delivery_surplus,public.accounting_period_account_balance(m.period_key,'4000') cogs,public.accounting_period_account_balance(m.period_key,'5100') fulfillment_cost,public.accounting_period_account_balance(m.period_key,'4100') sales_returns,public.accounting_period_account_balance(m.period_key,'4200') actual_return_loss,COALESCE((SELECT SUM(e.amount) FROM public.expenses e WHERE e.deleted_at IS NULL AND e.accounting_status='verified' AND to_char(COALESCE(e.expense_occurred_at,e.expense_date AT TIME ZONE 'Asia/Baghdad') AT TIME ZONE 'Asia/Baghdad','YYYY-MM')=m.period_key),0) verified_expenses,(SELECT COALESCE(n,0) FROM procurement) procurement_integrity_failures,(SELECT COALESCE(n,0) FROM settlement_integrity) settlement_integrity_failures,public.accounting_period_account_balance(m.period_key,'3050') rounding_adjustment,public.accounting_period_account_balance(m.period_key,'5400') fx_net_expense,(SELECT n FROM governance_flags) governance_review_flags FROM months m;

CREATE OR REPLACE FUNCTION public.guard_accounting_period_tax_finalization()
RETURNS trigger LANGUAGE plpgsql AS $function$
DECLARE r public.v_accounting_period_readiness%ROWTYPE;p public.tax_profiles%ROWTYPE;v_period_end date;v_old_status text;v_new_status text;
BEGIN
  v_old_status:=CASE WHEN TG_OP='UPDATE' THEN lower(COALESCE(OLD.status,'')) ELSE '' END;v_new_status:=lower(COALESCE(NEW.status,''));
  IF TG_OP='UPDATE' THEN IF v_old_status='tax_final' AND v_new_status IS DISTINCT FROM v_old_status THEN RAISE EXCEPTION 'PERIOD_STATE_BLOCKED: tax-final period % is immutable',NEW.period_key;END IF;IF v_new_status='reopened' AND v_old_status<>'closed' THEN RAISE EXCEPTION 'PERIOD_STATE_BLOCKED: only a closed period can be reopened';END IF;IF v_new_status='tax_final' AND v_old_status<>'closed' THEN RAISE EXCEPTION 'TAX_FINALIZATION_BLOCKED: administrative close required';END IF;IF v_new_status='closed' AND v_old_status NOT IN ('closed','reopened') THEN RAISE EXCEPTION 'PERIOD_STATE_BLOCKED: period must be open/reopened before administrative close';END IF;ELSIF v_new_status IN ('reopened','tax_final') THEN RAISE EXCEPTION 'PERIOD_STATE_BLOCKED: new periods must start with administrative close';END IF;
  IF v_new_status='reopened' THEN NEW.close_type:='administrative';RETURN NEW;END IF;SELECT * INTO r FROM public.v_accounting_period_readiness WHERE period_key=NEW.period_key;IF NOT FOUND THEN RAISE EXCEPTION 'CLOSE_BLOCKED: readiness row missing for %',NEW.period_key;END IF;v_period_end:=(to_date(NEW.period_key||'-01','YYYY-MM-DD')+interval '1 month')::date;
  IF v_new_status IN ('closed','administrative_closed','locked') THEN IF (clock_timestamp() AT TIME ZONE 'Asia/Baghdad')::date<v_period_end THEN RAISE EXCEPTION 'ADMIN_CLOSE_BLOCKED: period % has not ended',NEW.period_key;END IF;IF r.incomplete_cost_orders>0 OR r.missing_fulfillment_orders>0 OR r.incomplete_fulfillment_orders>0 OR r.payment_evidence_errors>0 OR r.unverified_returns>0 OR r.undocumented_expenses>0 OR r.inventory_mismatches>0 OR r.procurement_integrity_failures>0 OR r.settlement_integrity_failures>0 OR r.open_review_flags>0 OR r.unsettled_carrier_orders>0 OR r.delivery_surplus_exceptions>0 OR r.journal_difference<>0 THEN RAISE EXCEPTION 'ADMIN_CLOSE_BLOCKED: readiness failed for %',NEW.period_key;END IF;NEW.status:='closed';NEW.close_type:='administrative';END IF;
  IF v_new_status IN ('final','finalized','approved','tax_final') THEN SELECT * INTO p FROM public.tax_profiles WHERE id='al-manba-aquavo';IF NOT FOUND THEN RAISE EXCEPTION 'TAX_FINALIZATION_BLOCKED: tax profile missing';END IF;IF p.status<>'approved' OR p.taxpayer_number IS NULL OR p.tax_branch IS NULL OR p.registered_address IS NULL OR p.accountant_license_number IS NULL OR p.accountant_approved_at IS NULL OR p.approval_evidence_id IS NULL THEN RAISE EXCEPTION 'TAX_FINALIZATION_BLOCKED: tax profile/accountant approval incomplete';END IF;NEW.status:='tax_final';NEW.close_type:='tax_final';END IF;
  NEW.revenue:=r.product_revenue+r.rounding_adjustment;NEW.cogs:=r.cogs;NEW.gross_profit:=NEW.revenue-r.cogs;NEW.expenses_total:=r.verified_expenses+r.fx_net_expense;NEW.sales_return_deduction:=r.sales_returns;NEW.actual_return_loss:=r.actual_return_loss;NEW.delivery_subsidy_total:=r.delivery_subsidy;NEW.delivery_surplus_total:=r.delivery_surplus;NEW.fulfillment_cost_total:=r.fulfillment_cost;NEW.final_net_profit:=r.product_revenue+r.rounding_adjustment-r.cogs-r.fulfillment_cost-r.delivery_subsidy-r.sales_returns-r.actual_return_loss-r.verified_expenses-r.fx_net_expense;NEW.delivered_orders:=r.realized_orders;NEW.readiness_json:=to_jsonb(r);NEW.snapshot_json:=COALESCE(NEW.snapshot_json,'{}'::jsonb)||jsonb_build_object('policy_version','v3_explicit_rounding_fx_procurement_integrity','timezone','Asia/Baghdad','cutover','2026-08-01','readiness',to_jsonb(r));RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.prevent_accounting_period_close_delete() RETURNS trigger LANGUAGE plpgsql AS $function$ BEGIN RAISE EXCEPTION 'ACCOUNTING_PERIOD_CLOSE_DELETE_BLOCKED: use controlled reopen workflow; never hard-delete' USING ERRCODE='55000';END $function$;

-- -----------------------------------------------------------------------------
-- 11. Canonical trigger wiring. Drop/recreate only triggers; no financial rows.
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS purchase_accounting_fact_currency_prepare ON public.purchase_accounting_facts;
CREATE TRIGGER purchase_accounting_fact_currency_prepare BEFORE INSERT ON public.purchase_accounting_facts FOR EACH ROW EXECUTE FUNCTION public.prepare_purchase_accounting_fact_currency();
DROP TRIGGER IF EXISTS purchase_accounting_facts_immutable ON public.purchase_accounting_facts;
CREATE TRIGGER purchase_accounting_facts_immutable BEFORE DELETE OR UPDATE ON public.purchase_accounting_facts FOR EACH ROW EXECUTE FUNCTION public.reject_purchase_accounting_fact_mutation();
DROP TRIGGER IF EXISTS purchase_orders_accounted_immutable ON public.purchase_orders;
CREATE TRIGGER purchase_orders_accounted_immutable BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.guard_accounted_purchase_order_mutation();
DROP TRIGGER IF EXISTS purchase_order_items_accounted_immutable ON public.purchase_order_items;
CREATE TRIGGER purchase_order_items_accounted_immutable BEFORE UPDATE ON public.purchase_order_items FOR EACH ROW EXECUTE FUNCTION public.guard_accounted_purchase_order_item_mutation();
DROP TRIGGER IF EXISTS goods_receipts_posted_immutable ON public.goods_receipts;
CREATE TRIGGER goods_receipts_posted_immutable BEFORE DELETE OR UPDATE ON public.goods_receipts FOR EACH ROW EXECUTE FUNCTION public.guard_posted_goods_receipt_mutation();
DROP TRIGGER IF EXISTS goods_receipt_items_posted_immutable ON public.goods_receipt_items;
CREATE TRIGGER goods_receipt_items_posted_immutable BEFORE DELETE OR UPDATE ON public.goods_receipt_items FOR EACH ROW EXECUTE FUNCTION public.guard_posted_goods_receipt_item_mutation();
DROP TRIGGER IF EXISTS supplier_payment_applications_immutable ON public.supplier_payment_applications;
CREATE TRIGGER supplier_payment_applications_immutable BEFORE DELETE OR UPDATE ON public.supplier_payment_applications FOR EACH ROW EXECUTE FUNCTION public.guard_supplier_payment_application_mutation();
DROP TRIGGER IF EXISTS supplier_payments_paid_immutable ON public.supplier_payments;
CREATE TRIGGER supplier_payments_paid_immutable BEFORE DELETE OR UPDATE ON public.supplier_payments FOR EACH ROW EXECUTE FUNCTION public.guard_paid_supplier_payment_mutation();
DROP TRIGGER IF EXISTS supplier_payments_accounting ON public.supplier_payments;
CREATE TRIGGER supplier_payments_accounting AFTER INSERT OR UPDATE OF status ON public.supplier_payments FOR EACH ROW EXECUTE FUNCTION public.supplier_payment_accounting_trigger();
DROP TRIGGER IF EXISTS inventory_movements_purchase_wac_prepare ON public.inventory_movements;
CREATE TRIGGER inventory_movements_purchase_wac_prepare BEFORE INSERT ON public.inventory_movements FOR EACH ROW EXECUTE FUNCTION public.prepare_purchase_receipt_weighted_cost();
DROP TRIGGER IF EXISTS inventory_movements_purchase_wac_apply ON public.inventory_movements;
CREATE TRIGGER inventory_movements_purchase_wac_apply AFTER INSERT ON public.inventory_movements FOR EACH ROW EXECUTE FUNCTION public.apply_purchase_receipt_weighted_cost();
DROP TRIGGER IF EXISTS inventory_cost_events_immutable ON public.inventory_cost_events;
CREATE TRIGGER inventory_cost_events_immutable BEFORE DELETE OR UPDATE ON public.inventory_cost_events FOR EACH ROW EXECUTE FUNCTION public.reject_inventory_cost_event_mutation();
DROP TRIGGER IF EXISTS inventory_valuation_baselines_immutable ON public.inventory_valuation_baselines;
CREATE TRIGGER inventory_valuation_baselines_immutable BEFORE DELETE OR UPDATE ON public.inventory_valuation_baselines FOR EACH ROW EXECUTE FUNCTION public.reject_inventory_valuation_baseline_mutation();
DROP TRIGGER IF EXISTS inventory_valuation_baseline_lines_immutable ON public.inventory_valuation_baseline_lines;
CREATE TRIGGER inventory_valuation_baseline_lines_immutable BEFORE DELETE OR UPDATE ON public.inventory_valuation_baseline_lines FOR EACH ROW EXECUTE FUNCTION public.reject_inventory_valuation_baseline_mutation();
DROP TRIGGER IF EXISTS cash_settlements_validate_reconciliation ON public.cash_settlements;
CREATE TRIGGER cash_settlements_validate_reconciliation BEFORE UPDATE OF status ON public.cash_settlements FOR EACH ROW EXECUTE FUNCTION public.validate_cash_settlement_reconciliation();
DROP TRIGGER IF EXISTS cash_settlements_post_journal ON public.cash_settlements;
CREATE TRIGGER cash_settlements_post_journal AFTER UPDATE OF status ON public.cash_settlements FOR EACH ROW EXECUTE FUNCTION public.post_settlement_journal_and_match_facts();
DROP TRIGGER IF EXISTS cash_settlements_posted_immutable ON public.cash_settlements;
CREATE TRIGGER cash_settlements_posted_immutable BEFORE DELETE OR UPDATE ON public.cash_settlements FOR EACH ROW EXECUTE FUNCTION public.guard_posted_cash_settlement_mutation();
DROP TRIGGER IF EXISTS cash_settlement_items_posted_immutable ON public.cash_settlement_items;
CREATE TRIGGER cash_settlement_items_posted_immutable BEFORE INSERT OR DELETE OR UPDATE ON public.cash_settlement_items FOR EACH ROW EXECUTE FUNCTION public.guard_posted_cash_settlement_item_mutation();
DROP TRIGGER IF EXISTS order_accounting_carrier_snapshots_immutable ON public.order_accounting_carrier_snapshots;
CREATE TRIGGER order_accounting_carrier_snapshots_immutable BEFORE DELETE OR UPDATE ON public.order_accounting_carrier_snapshots FOR EACH ROW EXECUTE FUNCTION public.reject_order_accounting_carrier_snapshot_mutation();
DROP TRIGGER IF EXISTS opening_carrier_receivable_lots_immutable ON public.opening_carrier_receivable_lots;
CREATE TRIGGER opening_carrier_receivable_lots_immutable BEFORE DELETE OR UPDATE ON public.opening_carrier_receivable_lots FOR EACH ROW EXECUTE FUNCTION public.reject_opening_carrier_receivable_mutation();
DROP TRIGGER IF EXISTS opening_carrier_receivable_applications_immutable ON public.opening_carrier_receivable_applications;
CREATE TRIGGER opening_carrier_receivable_applications_immutable BEFORE DELETE OR UPDATE ON public.opening_carrier_receivable_applications FOR EACH ROW EXECUTE FUNCTION public.reject_opening_carrier_receivable_mutation();
DROP TRIGGER IF EXISTS accounting_period_closes_prevent_delete ON public.accounting_period_closes;
CREATE TRIGGER accounting_period_closes_prevent_delete BEFORE DELETE ON public.accounting_period_closes FOR EACH ROW EXECUTE FUNCTION public.prevent_accounting_period_close_delete();

-- -----------------------------------------------------------------------------
-- 12. Function privilege hardening exactly matching Production authority.
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.post_goods_receipt(text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reverse_posted_goods_receipt(text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.post_supplier_payment(integer,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reverse_supplier_payment(integer,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validate_cash_settlement_reconciliation() FROM PUBLIC;
DO $do$
BEGIN
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='aquavo_runtime') THEN
    GRANT EXECUTE ON FUNCTION public.post_goods_receipt(text,text) TO aquavo_runtime;
    GRANT EXECUTE ON FUNCTION public.reverse_posted_goods_receipt(text,text,text) TO aquavo_runtime;
    GRANT EXECUTE ON FUNCTION public.post_supplier_payment(integer,text) TO aquavo_runtime;
    GRANT EXECUTE ON FUNCTION public.reverse_supplier_payment(integer,text,text) TO aquavo_runtime;
  END IF;
END $do$;

-- -----------------------------------------------------------------------------
-- 13. One-time historical corrections. Each block is fail-closed and fingerprinted.
-- No block runs when the canonical Production evidence already exists.
-- -----------------------------------------------------------------------------

-- 13a. Opening COD 153,750: create traceability lot only if the opening journal proves it.
INSERT INTO public.opening_carrier_receivable_lots(id,effective_at,original_amount_iqd,description,evidence,created_by)
SELECT 'opening-cod-20260801-owner-confirmed','2026-07-31 21:00:00+00'::timestamptz,153750,
'رصيد COD افتتاحي مجمع مؤكد من المالك عند بدء Accounting V2؛ لا يوجد تفصيل موثوق على مستوى الطلب ولا يتم اختراعه',
jsonb_build_object('source','owner-confirmed opening monthly position and opening journal','cutover','2026-08-01','amount_iqd',153750,'order_level_breakdown','not available; intentionally not fabricated'),
'owner_confirmation:opening_accounting'
WHERE NOT EXISTS(SELECT 1 FROM public.opening_carrier_receivable_lots WHERE id='opening-cod-20260801-owner-confirmed')
  AND EXISTS(SELECT 1 FROM public.journal_entries WHERE source_type='accounting_cutover' AND source_id='aquavo-2026-08-01' AND event_kind='opening_balances' AND COALESCE((evidence->>'carrier_receivable')::numeric,0)=153750);

-- 13b. Legacy carrier snapshot: lock the already-accounted order to its corrected canonical carrier.
INSERT INTO public.order_accounting_carrier_snapshots(order_fact_id,order_id,carrier,evidence,created_by)
SELECT f.id,f.order_id,o.carrier,jsonb_build_object('reason','existing post-cutover accounting fact predates carrier_snapshot column; carrier locked from corrected canonical order before final accounting hardening','captured_at','2026-08-08T15:06:31.629775+00:00','order_number',o.order_number),'database_hardening_20260808'
FROM public.order_accounting_facts f JOIN public.orders o ON o.id=f.order_id
WHERE f.id='fb881051-e1f8-49ba-afcf-95e0244f8e4f' AND f.order_id='8cbffbb9-8b31-4c08-b7b2-68557d746f75' AND o.order_number='FH-260805-C142795A' AND o.carrier='الطائر المميز للنقل'
  AND NOT EXISTS(SELECT 1 FROM public.order_accounting_carrier_snapshots WHERE order_fact_id=f.id OR order_id=f.order_id);

-- 13c. Historical 150 IQD rounding classification only; does not change cash/profit.
DO $do$
DECLARE v_entry text;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.journal_entries WHERE source_type='accounting_correction' AND source_id='8cbffbb9-8b31-4c08-b7b2-68557d746f75' AND event_kind='rounding_reclassification_v3')
     AND EXISTS(SELECT 1 FROM public.orders WHERE id='8cbffbb9-8b31-4c08-b7b2-68557d746f75' AND order_number='FH-260805-C142795A')
     AND EXISTS(SELECT 1 FROM public.order_accounting_facts WHERE id='fb881051-e1f8-49ba-afcf-95e0244f8e4f' AND order_id='8cbffbb9-8b31-4c08-b7b2-68557d746f75' AND product_revenue=12250)
     AND (SELECT COALESCE(SUM(COALESCE(final_unit_sale_price_snapshot,price_at_purchase)*quantity),0) FROM public.order_items_relational WHERE order_id='8cbffbb9-8b31-4c08-b7b2-68557d746f75')=12100 THEN
    INSERT INTO public.journal_entries(entry_date,period_key,source_type,source_id,event_kind,description,total_debit,total_credit,evidence,created_by) VALUES(clock_timestamp(),'2026-08','accounting_correction','8cbffbb9-8b31-4c08-b7b2-68557d746f75','rounding_reclassification_v3','إعادة تصنيف فرق التقريب من مبيعات المنتجات',150,150,jsonb_build_object('reason','classification only; no cash or total profit change','order_number','FH-260805-C142795A','rounding_difference',150,'immutable_line_sales',12100,'legacy_product_revenue',12250),'database_hardening_20260808') RETURNING id INTO v_entry;
    INSERT INTO public.journal_lines(entry_id,line_number,account_code,debit,memo) VALUES(v_entry,1,'3000',150,'إزالة فرق التقريب من مبيعات المنتجات');
    INSERT INTO public.journal_lines(entry_id,line_number,account_code,credit,memo) VALUES(v_entry,2,'3050',150,'فرق تقريب نقدي للطلب');
    PERFORM public.validate_journal_entry(v_entry);
  END IF;
END $do$;

-- 13d. Current inventory valuation baseline: execute only on the exact pre-hardening fingerprint.
DO $do$
DECLARE v_main text;v_total numeric;v_gl numeric;v_mismatch bigint;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.inventory_valuation_baselines WHERE id='aquavo-current-inventory-baseline-20260808-final') THEN
    SELECT id INTO v_main FROM public.inventory_locations WHERE code='MAIN' AND is_active=true LIMIT 1;
    WITH ledger AS (SELECT product_id,variant_id,SUM(quantity_delta) qty FROM public.inventory_movements WHERE location_id=v_main GROUP BY product_id,variant_id),current_keys AS (SELECT p.id product_id,NULL::text variant_id,p.stock::numeric qty,p.cost_price::numeric unit_cost FROM public.products p WHERE p.deleted_at IS NULL AND COALESCE(p.has_variants,false)=false UNION ALL SELECT p.id,v->>'id',(v->>'stock')::numeric,NULLIF(v->>'costPrice','')::numeric FROM public.products p CROSS JOIN LATERAL jsonb_array_elements(COALESCE(p.variants,'[]'::jsonb)) v WHERE p.deleted_at IS NULL AND COALESCE(p.has_variants,false)=true) SELECT COUNT(*) FILTER(WHERE ck.qty<>COALESCE(l.qty,0)),COALESCE(SUM(ck.qty*ck.unit_cost),0) INTO v_mismatch,v_total FROM current_keys ck LEFT JOIN ledger l ON l.product_id=ck.product_id AND l.variant_id IS NOT DISTINCT FROM ck.variant_id;
    SELECT COALESCE(SUM(jl.debit-jl.credit),0) INTO v_gl FROM public.journal_entries je JOIN public.journal_lines jl ON jl.entry_id=je.id WHERE jl.account_code='1200';
    IF v_mismatch=0 AND v_total=2212145 AND v_gl=2251039 THEN
      PERFORM public.capture_current_inventory_valuation_baseline('aquavo-current-inventory-baseline-20260808-final','database_hardening_20260808',jsonb_build_object('date','2026-08-08','scope','current product identities only; nonvariant NULL plus current JSON variant ids','purpose','current-date go-live inventory valuation baseline after deep accounting audit','cost_authority','owner confirmed current database costs authoritative on 2026-08-07','historical_policy','historical opening snapshot and historical COGS are not rewritten'));
    END IF;
  END IF;
END $do$;

-- -----------------------------------------------------------------------------
-- 14. Migration ledger self-registration. Runner normalizes this provisional
-- identity to SHA-256(file bytes), exactly like earlier Accounting V2 migrations.
-- -----------------------------------------------------------------------------
INSERT INTO public.schema_migrations(version,checksum,notes)
VALUES('0073_accounting_final_hardening','d8f30a63e25558bf13e85a0a75abb764651746bb54cc7d5eb2fd9938dc71846f','Formalize Production P2P/AP/FX/WAC/settlement/rounding/readiness/privilege hardening; historical corrections are explicitly guarded')
ON CONFLICT(version) DO UPDATE SET checksum=EXCLUDED.checksum,notes=EXCLUDED.notes,rolled_back_at=NULL,applied_at=now();

COMMIT;

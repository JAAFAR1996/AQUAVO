-- 0052_accounting_cod_delivery_settlements.sql
-- Generated from the fresh-Neon-validated August accounting cutover.
BEGIN;

CREATE OR REPLACE FUNCTION public.validate_journal_entry(p_entry_id text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE v_header record;v_debit numeric;v_credit numeric;
BEGIN
 SELECT total_debit,total_credit INTO v_header FROM public.journal_entries WHERE id=p_entry_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'journal entry % not found',p_entry_id;END IF;
 SELECT COALESCE(SUM(debit),0),COALESCE(SUM(credit),0) INTO v_debit,v_credit FROM public.journal_lines WHERE entry_id=p_entry_id;
 IF v_debit<>v_credit OR v_debit<>v_header.total_debit OR v_credit<>v_header.total_credit THEN RAISE EXCEPTION 'JOURNAL_UNBALANCED: entry % header %/% lines %/%',p_entry_id,v_header.total_debit,v_header.total_credit,v_debit,v_credit;END IF;
END $$;

CREATE OR REPLACE FUNCTION public.post_order_delivery_journal(p_fact_id text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE f public.order_accounting_facts%ROWTYPE;v_entry_id text;v_line integer:=0;v_total numeric;
BEGIN
 SELECT * INTO f FROM public.order_accounting_facts WHERE id=p_fact_id;IF NOT FOUND THEN RAISE EXCEPTION 'order accounting fact % not found',p_fact_id;END IF;
 SELECT id INTO v_entry_id FROM public.journal_entries WHERE source_type='order' AND source_id=f.order_id AND event_kind='delivery_recognition';IF FOUND THEN RETURN v_entry_id;END IF;
 IF f.cash_custody='carrier' THEN v_total:=f.merchant_net+f.delivery_subsidy;ELSE v_total:=f.gross_collected+f.delivery_subsidy;END IF;
 INSERT INTO public.journal_entries(entry_date,period_key,source_type,source_id,event_kind,description,total_debit,total_credit,evidence) VALUES(f.recognized_at,f.period_key,'order',f.order_id,'delivery_recognition','إثبات بيع COD عند التسليم',v_total,v_total,jsonb_build_object('order_accounting_fact_id',f.id,'payment_event_id',f.payment_event_id,'policy_version',f.policy_version)) RETURNING id INTO v_entry_id;
 IF f.cash_custody='carrier' THEN IF f.merchant_net>0 THEN v_line:=v_line+1;INSERT INTO public.journal_lines(entry_id,line_number,account_code,debit,memo,dimensions) VALUES(v_entry_id,v_line,'1100',f.merchant_net,'صافي مستحق من شركة التوصيل',jsonb_build_object('order_id',f.order_id));END IF;ELSE IF f.gross_collected>0 THEN v_line:=v_line+1;INSERT INTO public.journal_lines(entry_id,line_number,account_code,debit,memo,dimensions) VALUES(v_entry_id,v_line,CASE WHEN f.cash_custody='bank' THEN '1010' ELSE '1000' END,f.gross_collected,'إجمالي COD مستلم',jsonb_build_object('order_id',f.order_id));END IF;END IF;
 IF f.delivery_subsidy>0 THEN v_line:=v_line+1;INSERT INTO public.journal_lines(entry_id,line_number,account_code,debit,memo,dimensions) VALUES(v_entry_id,v_line,'5200',f.delivery_subsidy,'دعم توصيل تتحمله AQUAVO',jsonb_build_object('order_id',f.order_id));END IF;
 IF f.product_revenue>0 THEN v_line:=v_line+1;INSERT INTO public.journal_lines(entry_id,line_number,account_code,credit,memo,dimensions) VALUES(v_entry_id,v_line,'3000',f.product_revenue,'مبيعات المنتجات فقط',jsonb_build_object('order_id',f.order_id));END IF;
 IF f.cash_custody<>'carrier' AND f.carrier_fee>0 THEN v_line:=v_line+1;INSERT INTO public.journal_lines(entry_id,line_number,account_code,credit,memo,dimensions) VALUES(v_entry_id,v_line,'2100',f.carrier_fee,'أجرة مستحقة لشركة التوصيل',jsonb_build_object('order_id',f.order_id));END IF;
 IF f.delivery_surplus>0 THEN v_line:=v_line+1;INSERT INTO public.journal_lines(entry_id,line_number,account_code,credit,memo,dimensions) VALUES(v_entry_id,v_line,'2200',f.delivery_surplus,'فرق توصيل معلّق وليس مبيعات منتجات',jsonb_build_object('order_id',f.order_id));END IF;
 PERFORM public.validate_journal_entry(v_entry_id);RETURN v_entry_id;
END $$;

CREATE OR REPLACE FUNCTION public.post_order_cogs_journal(p_fact_id text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE f public.order_accounting_facts%ROWTYPE;v_entry_id text;
BEGIN
 SELECT * INTO f FROM public.order_accounting_facts WHERE id=p_fact_id;IF NOT FOUND OR f.cogs_amount IS NULL OR f.cogs_amount<=0 THEN RETURN NULL;END IF;
 SELECT id INTO v_entry_id FROM public.journal_entries WHERE source_type='order' AND source_id=f.order_id AND event_kind='cogs_recognition';IF FOUND THEN RETURN v_entry_id;END IF;
 INSERT INTO public.journal_entries(entry_date,period_key,source_type,source_id,event_kind,description,total_debit,total_credit,evidence) VALUES(f.recognized_at,f.period_key,'order',f.order_id,'cogs_recognition','إثبات كلفة البضاعة المباعة',f.cogs_amount,f.cogs_amount,jsonb_build_object('order_accounting_fact_id',f.id)) RETURNING id INTO v_entry_id;
 INSERT INTO public.journal_lines(entry_id,line_number,account_code,debit,memo) VALUES(v_entry_id,1,'4000',f.cogs_amount,'كلفة البضاعة المباعة');
 INSERT INTO public.journal_lines(entry_id,line_number,account_code,credit,memo) VALUES(v_entry_id,2,'1200',f.cogs_amount,'إخراج كلفة من المخزون');
 PERFORM public.validate_journal_entry(v_entry_id);RETURN v_entry_id;
END $$;

CREATE OR REPLACE FUNCTION public.record_order_delivery_accounting() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_cutover timestamptz;v_recognized_at timestamptz;v_period_key text;v_gross numeric;v_customer_fee numeric;v_carrier_fee numeric;v_product_revenue numeric;v_merchant_net numeric;v_delivery_subsidy numeric;v_delivery_surplus numeric;v_event_id text;v_fact_id text;v_cogs numeric;v_line_count bigint;v_bad_cost_count bigint;v_cost_status text;
BEGIN
 IF lower(COALESCE(NEW.status,''))<>'delivered' OR lower(COALESCE(OLD.status,''))='delivered' THEN RETURN NEW;END IF;
 v_cutover:=public.aquavo_active_cutover();v_recognized_at:=clock_timestamp();IF v_recognized_at<v_cutover THEN RETURN NEW;END IF;
 v_gross:=COALESCE(NEW.rounded_total,NEW.total,0);v_customer_fee:=COALESCE(NEW.shipping_cost,0);v_carrier_fee:=COALESCE(NEW.carrier_fee,v_customer_fee,0);v_product_revenue:=v_gross-v_customer_fee;v_merchant_net:=v_gross-v_carrier_fee;v_delivery_subsidy:=GREATEST(v_carrier_fee-v_customer_fee,0);v_delivery_surplus:=GREATEST(v_customer_fee-v_carrier_fee,0);v_period_key:=to_char(v_recognized_at AT TIME ZONE 'Asia/Baghdad','YYYY-MM');
 IF v_product_revenue<0 THEN RAISE EXCEPTION 'ORDER_ACCOUNTING_INVALID: customer delivery fee exceeds gross total for order %',NEW.id;END IF;IF v_merchant_net<0 THEN RAISE EXCEPTION 'ORDER_ACCOUNTING_INVALID: carrier fee exceeds gross total for order %',NEW.id;END IF;
 INSERT INTO public.payment_events(order_id,event_type,status,amount,currency,method,provider,idempotency_key,occurred_at,evidence,metadata,created_by) VALUES(NEW.id,'cod_received','completed',v_gross,'IQD','cod',COALESCE(NEW.carrier,'carrier'),'delivery:'||NEW.id||':cod_received',v_recognized_at,jsonb_build_object('source','order_delivery_transition'),jsonb_build_object('gross_collected',v_gross,'customer_delivery_fee',v_customer_fee,'carrier_fee',v_carrier_fee,'product_revenue',v_product_revenue,'merchant_net',v_merchant_net,'delivery_subsidy',v_delivery_subsidy,'delivery_surplus',v_delivery_surplus,'policy_version','v2_gross_includes_delivery_carrier_keeps_fee'),'database_trigger') ON CONFLICT(idempotency_key) DO NOTHING;
 SELECT id INTO v_event_id FROM public.payment_events WHERE idempotency_key='delivery:'||NEW.id||':cod_received' AND status='completed' AND amount=v_gross;IF v_event_id IS NULL THEN RAISE EXCEPTION 'COD_EVENT_MISSING_OR_MISMATCH for delivered order %',NEW.id;END IF;
 SELECT COUNT(*),COUNT(*) FILTER(WHERE cost_snapshot_status IS NULL OR cost_snapshot_status NOT IN ('exact','verified_zero') OR unit_cost_price IS NULL OR unit_packaging_cost IS NULL OR unit_insert_cost IS NULL),SUM((COALESCE(unit_cost_price,0)+COALESCE(unit_packaging_cost,0)+COALESCE(unit_insert_cost,0))*quantity) INTO v_line_count,v_bad_cost_count,v_cogs FROM public.order_items_relational WHERE order_id=NEW.id;
 IF v_line_count=0 THEN v_cost_status:='unknown';v_cogs:=NULL;ELSIF v_bad_cost_count>0 THEN v_cost_status:='incomplete';v_cogs:=NULL;ELSIF v_cogs=0 THEN v_cost_status:='verified_zero';ELSE v_cost_status:='exact';END IF;
 INSERT INTO public.order_accounting_facts(order_id,payment_event_id,recognized_at,period_key,gross_collected,customer_delivery_fee,carrier_fee,product_revenue,merchant_net,delivery_subsidy,delivery_surplus,cash_custody,cogs_amount,cost_status,currency,policy_version,evidence) VALUES(NEW.id,v_event_id,v_recognized_at,v_period_key,v_gross,v_customer_fee,v_carrier_fee,v_product_revenue,v_merchant_net,v_delivery_subsidy,v_delivery_surplus,'carrier',v_cogs,v_cost_status,'IQD','v2_gross_includes_delivery_carrier_keeps_fee',jsonb_build_object('created_by','database_trigger','order_number',NEW.order_number,'order_total_source',CASE WHEN NEW.rounded_total IS NOT NULL THEN 'rounded_total' ELSE 'total' END)) ON CONFLICT(order_id) DO NOTHING RETURNING id INTO v_fact_id;
 IF v_fact_id IS NULL THEN SELECT id INTO v_fact_id FROM public.order_accounting_facts WHERE order_id=NEW.id;END IF;
 PERFORM public.post_order_delivery_journal(v_fact_id);PERFORM public.post_order_cogs_journal(v_fact_id);PERFORM public.post_order_fulfillment_journal(NEW.id);RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS orders_record_delivery_accounting ON public.orders;
CREATE TRIGGER orders_record_delivery_accounting AFTER UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.record_order_delivery_accounting();

CREATE OR REPLACE FUNCTION public.post_settlement_journal_and_match_facts() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE item record;f public.order_accounting_facts%ROWTYPE;v_entry_id text;v_account text;v_period text;v_cutover timestamptz;v_payment_occurred_at timestamptz;
BEGIN
 IF NEW.status NOT IN ('reconciled','closed') OR NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW;END IF;v_cutover:=public.aquavo_active_cutover();
 FOR item IN SELECT * FROM public.cash_settlement_items WHERE settlement_id=NEW.id ORDER BY id LOOP
  SELECT * INTO f FROM public.order_accounting_facts WHERE order_id=item.order_id;
  IF NOT FOUND THEN SELECT occurred_at INTO v_payment_occurred_at FROM public.payment_events WHERE id=item.payment_event_id;IF v_payment_occurred_at IS NOT NULL AND v_payment_occurred_at>=v_cutover THEN RAISE EXCEPTION 'SETTLEMENT_FACT_MISSING: post-cutover payment for order % has no immutable accounting fact',item.order_id;END IF;CONTINUE;END IF;
  IF item.gross_amount<>f.gross_collected OR item.fee_amount<>f.carrier_fee OR item.net_amount<>f.merchant_net THEN RAISE EXCEPTION 'SETTLEMENT_FACT_MISMATCH: order % settlement %/%/% fact %/%/%',item.order_id,item.gross_amount,item.fee_amount,item.net_amount,f.gross_collected,f.carrier_fee,f.merchant_net;END IF;
  INSERT INTO public.order_accounting_settlements(order_fact_id,settlement_id,settlement_item_id,gross_amount,carrier_fee,merchant_net,status,matched_at,evidence) VALUES(f.id,NEW.id,item.id,item.gross_amount,item.fee_amount,item.net_amount,'matched',COALESCE(NEW.received_at,NEW.updated_at,clock_timestamp()),jsonb_build_object('settlement_number',NEW.settlement_number,'carrier',NEW.carrier,'item_reconciliation_status',item.reconciliation_status)) ON CONFLICT(order_fact_id) DO NOTHING;
 END LOOP;
 SELECT id INTO v_entry_id FROM public.journal_entries WHERE source_type='cash_settlement' AND source_id=NEW.id AND event_kind='net_receipt';
 IF v_entry_id IS NULL AND NEW.net_amount>0 THEN v_account:=CASE WHEN NEW.bank_reference IS NOT NULL THEN '1010' ELSE '1000' END;v_period:=to_char(COALESCE(NEW.received_at,NEW.updated_at,clock_timestamp()) AT TIME ZONE 'Asia/Baghdad','YYYY-MM');INSERT INTO public.journal_entries(entry_date,period_key,source_type,source_id,event_kind,description,total_debit,total_credit,evidence) VALUES(COALESCE(NEW.received_at,NEW.updated_at,clock_timestamp()),v_period,'cash_settlement',NEW.id,'net_receipt','استلام صافي تسوية شركة التوصيل',NEW.net_amount,NEW.net_amount,NEW.evidence) RETURNING id INTO v_entry_id;INSERT INTO public.journal_lines(entry_id,line_number,account_code,debit,memo) VALUES(v_entry_id,1,v_account,NEW.net_amount,'صافي النقد المستلم');INSERT INTO public.journal_lines(entry_id,line_number,account_code,credit,memo) VALUES(v_entry_id,2,'1100',NEW.net_amount,'تصفية ذمم COD');PERFORM public.validate_journal_entry(v_entry_id);END IF;RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS cash_settlements_post_journal ON public.cash_settlements;
CREATE TRIGGER cash_settlements_post_journal AFTER UPDATE OF status ON public.cash_settlements FOR EACH ROW EXECUTE FUNCTION public.post_settlement_journal_and_match_facts();

CREATE OR REPLACE FUNCTION public.reject_journal_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'POSTED_JOURNAL_IMMUTABLE: use a reversal entry' USING ERRCODE='55000';END $$;
DROP TRIGGER IF EXISTS journal_entries_immutable ON public.journal_entries;
CREATE TRIGGER journal_entries_immutable BEFORE UPDATE OR DELETE ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION public.reject_journal_mutation();
DROP TRIGGER IF EXISTS journal_lines_immutable ON public.journal_lines;
CREATE TRIGGER journal_lines_immutable BEFORE UPDATE OR DELETE ON public.journal_lines FOR EACH ROW EXECUTE FUNCTION public.reject_journal_mutation();

INSERT INTO public.schema_migrations(version,checksum,notes) VALUES('0052_accounting_cod_delivery_settlements','b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2','Automatic COD recognition, gross-to-net journals, settlements and immutable journal') ON CONFLICT(version) DO NOTHING;
COMMIT;

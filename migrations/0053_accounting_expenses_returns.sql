-- 0053_accounting_expenses_returns.sql
-- Verified expenses and returns are journaled; corrections are reversal-only.
BEGIN;

CREATE OR REPLACE FUNCTION public.post_verified_expense_journal() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_entry_id text;v_original_id text;v_expense_account text;v_period text;
BEGIN
 v_expense_account:=CASE WHEN NEW.category='shipping_cost' THEN '5200' ELSE '5300' END;v_period:=to_char(COALESCE(NEW.expense_occurred_at,clock_timestamp()) AT TIME ZONE 'Asia/Baghdad','YYYY-MM');
 IF NEW.accounting_status='verified' AND (TG_OP='INSERT' OR OLD.accounting_status IS DISTINCT FROM 'verified') THEN
  INSERT INTO public.journal_entries(entry_date,period_key,source_type,source_id,event_kind,description,total_debit,total_credit,evidence,created_by) VALUES(COALESCE(NEW.expense_occurred_at,clock_timestamp()),v_period,'expense',NEW.id,'expense_recognition',COALESCE(NULLIF(NEW.description,''),'إثبات مصروف تشغيلي'),NEW.amount,NEW.amount,jsonb_build_object('evidence_file_id',NEW.evidence_file_id,'evidence_hash',NEW.evidence_hash,'vendor_name',NEW.vendor_name,'document_number',NEW.document_number),NEW.reviewed_by) ON CONFLICT(source_type,source_id,event_kind) DO NOTHING RETURNING id INTO v_entry_id;
  IF v_entry_id IS NOT NULL THEN INSERT INTO public.journal_lines(entry_id,line_number,account_code,debit,memo) VALUES(v_entry_id,1,v_expense_account,NEW.amount,NEW.business_purpose);INSERT INTO public.journal_lines(entry_id,line_number,account_code,credit,memo) VALUES(v_entry_id,2,NEW.paid_from_account_code,NEW.amount,'مصدر دفع المصروف');PERFORM public.validate_journal_entry(v_entry_id);END IF;
 END IF;
 IF TG_OP='UPDATE' AND OLD.accounting_status='verified' AND NEW.accounting_status='rejected' THEN
  SELECT id INTO v_original_id FROM public.journal_entries WHERE source_type='expense' AND source_id=NEW.id AND event_kind='expense_recognition';IF v_original_id IS NULL THEN RAISE EXCEPTION 'EXPENSE_REVERSAL_BLOCKED: original journal is missing for %',NEW.id;END IF;
  INSERT INTO public.journal_entries(entry_date,period_key,source_type,source_id,event_kind,description,total_debit,total_credit,reversal_of_entry_id,evidence,created_by) VALUES(clock_timestamp(),to_char(clock_timestamp() AT TIME ZONE 'Asia/Baghdad','YYYY-MM'),'expense',NEW.id,'expense_reversal','عكس مصروف معتمد: '||NEW.review_note,NEW.amount,NEW.amount,v_original_id,jsonb_build_object('reason',NEW.review_note),NEW.reviewed_by) ON CONFLICT(source_type,source_id,event_kind) DO NOTHING RETURNING id INTO v_entry_id;
  IF v_entry_id IS NOT NULL THEN INSERT INTO public.journal_lines(entry_id,line_number,account_code,debit,memo) VALUES(v_entry_id,1,NEW.paid_from_account_code,NEW.amount,'عكس مصدر دفع المصروف');INSERT INTO public.journal_lines(entry_id,line_number,account_code,credit,memo) VALUES(v_entry_id,2,v_expense_account,NEW.amount,'عكس المصروف');PERFORM public.validate_journal_entry(v_entry_id);END IF;
 END IF;RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS expenses_post_verified_journal ON public.expenses;
CREATE TRIGGER expenses_post_verified_journal AFTER INSERT OR UPDATE OF accounting_status ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.post_verified_expense_journal();

CREATE OR REPLACE FUNCTION public.prepare_verified_return_inventory() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.status='disputed' AND NEW.status='verified' THEN RAISE EXCEPTION 'RETURN_REVERIFY_BLOCKED: create a new return event instead of rewriting history';END IF;
 IF OLD.status='verified' AND NEW.status IS DISTINCT FROM 'verified' AND NULLIF(btrim(COALESCE(NEW.note,'')),'') IS NULL THEN RAISE EXCEPTION 'RETURN_REVERSAL_REASON_REQUIRED';END IF;
 IF NEW.status='verified' AND OLD.status IS DISTINCT FROM 'verified' AND NEW.restocked=true AND NEW.restocked_at IS NULL THEN NEW.restocked_at:=clock_timestamp();END IF;RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS order_returns_prepare_verification ON public.order_return_events;
CREATE TRIGGER order_returns_prepare_verification BEFORE UPDATE OF status ON public.order_return_events FOR EACH ROW EXECUTE FUNCTION public.prepare_verified_return_inventory();

CREATE OR REPLACE FUNCTION public.apply_verified_return_inventory() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_cutover timestamptz;v_location text;elem jsonb;v_idx integer:=0;v_product text;v_variant text;v_qty integer;v_original_movement text;
BEGIN
 v_cutover:=public.aquavo_active_cutover();IF NEW.created_at<(v_cutover AT TIME ZONE 'UTC') THEN RETURN NEW;END IF;SELECT id INTO v_location FROM public.inventory_locations WHERE code='MAIN' AND is_active=true LIMIT 1;IF v_location IS NULL THEN RAISE EXCEPTION 'MAIN inventory location is not configured';END IF;
 IF NEW.status='verified' AND OLD.status IS DISTINCT FROM 'verified' AND NEW.restocked=true THEN
  FOR elem IN SELECT value FROM jsonb_array_elements(COALESCE(NEW.affected_items,'[]'::jsonb)) LOOP v_idx:=v_idx+1;v_product:=NULLIF(elem->>'productId','');v_variant:=NULLIF(COALESCE(elem->>'variantId',elem->>'variant_id'),'');v_qty:=COALESCE(NULLIF(elem->>'qty','')::integer,0);IF v_product IS NULL OR v_qty<=0 THEN RAISE EXCEPTION 'RETURN_INVENTORY_INVALID: event % item %',NEW.id,v_idx;END IF;INSERT INTO public.inventory_movements(product_id,variant_id,location_id,quantity_delta,movement_type,source_type,source_id,idempotency_key,unit_cost,currency,happened_at,created_by,metadata) VALUES(v_product,v_variant,v_location,v_qty,'sale_reversal','return_event',NEW.id,'return_event:'||NEW.id||':'||v_idx,NULLIF(elem->>'cogsAtTime','')::numeric,'IQD',COALESCE(NEW.restocked_at,clock_timestamp()),'database_trigger',jsonb_build_object('return_event_id',NEW.id,'item',elem)) ON CONFLICT(idempotency_key) DO NOTHING;END LOOP;
 END IF;
 IF OLD.status='verified' AND NEW.status IS DISTINCT FROM 'verified' AND OLD.restocked=true THEN
  v_idx:=0;FOR elem IN SELECT value FROM jsonb_array_elements(COALESCE(OLD.affected_items,'[]'::jsonb)) LOOP v_idx:=v_idx+1;v_product:=NULLIF(elem->>'productId','');v_variant:=NULLIF(COALESCE(elem->>'variantId',elem->>'variant_id'),'');v_qty:=COALESCE(NULLIF(elem->>'qty','')::integer,0);SELECT id INTO v_original_movement FROM public.inventory_movements WHERE idempotency_key='return_event:'||OLD.id||':'||v_idx;IF v_original_movement IS NULL THEN RAISE EXCEPTION 'RETURN_INVENTORY_REVERSAL_BLOCKED: original movement missing for event % item %',OLD.id,v_idx;END IF;INSERT INTO public.inventory_movements(product_id,variant_id,location_id,quantity_delta,movement_type,source_type,source_id,idempotency_key,unit_cost,currency,happened_at,created_by,metadata,reversed_movement_id) VALUES(v_product,v_variant,v_location,-v_qty,'return_out','return_event_reversal',NEW.id,'return_event_reversal:'||NEW.id||':'||v_idx,NULLIF(elem->>'cogsAtTime','')::numeric,'IQD',clock_timestamp(),'database_trigger',jsonb_build_object('return_event_id',NEW.id,'reason',NEW.note,'item',elem),v_original_movement) ON CONFLICT(idempotency_key) DO NOTHING;END LOOP;
 END IF;RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS order_returns_apply_inventory ON public.order_return_events;
CREATE TRIGGER order_returns_apply_inventory AFTER UPDATE OF status ON public.order_return_events FOR EACH ROW EXECUTE FUNCTION public.apply_verified_return_inventory();

CREATE OR REPLACE FUNCTION public.post_verified_return_journal() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_fact public.order_accounting_facts%ROWTYPE;v_entry_id text;v_original_id text;v_refund_credit_account text;v_cash_loss numeric;v_inventory_loss numeric;v_total numeric;v_line integer:=0;v_period text;
BEGIN
 IF NEW.created_at<(public.aquavo_active_cutover() AT TIME ZONE 'UTC') THEN RETURN NEW;END IF;
 IF NEW.status='verified' AND OLD.status IS DISTINCT FROM 'verified' THEN
  SELECT * INTO v_fact FROM public.order_accounting_facts WHERE order_id=NEW.order_id;IF NOT FOUND THEN RAISE EXCEPTION 'RETURN_JOURNAL_BLOCKED: accounting fact missing for order %',NEW.order_id;END IF;
  IF v_fact.cash_custody='carrier' AND NOT EXISTS(SELECT 1 FROM public.order_accounting_settlements os WHERE os.order_fact_id=v_fact.id AND os.status='matched') THEN v_refund_credit_account:='1100';ELSIF v_fact.cash_custody='bank' THEN v_refund_credit_account:='1010';ELSE v_refund_credit_account:='1000';END IF;
  v_cash_loss:=COALESCE(NEW.delivery_cost_loss,0)+COALESCE(NEW.return_shipping_cost,0)+COALESCE(NEW.packaging_loss,0);v_inventory_loss:=COALESCE(NEW.product_write_off_amount,0)+CASE WHEN NEW.restocked=true THEN 0 ELSE COALESCE(NEW.cogs_loss,0) END;v_total:=COALESCE(NEW.refund_amount,0)+v_cash_loss+v_inventory_loss;v_period:=to_char(NEW.updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Baghdad','YYYY-MM');
  IF v_total>0 THEN INSERT INTO public.journal_entries(entry_date,period_key,source_type,source_id,event_kind,description,total_debit,total_credit,evidence,created_by) VALUES(NEW.updated_at AT TIME ZONE 'UTC',v_period,'return_event',NEW.id,'return_verification','إثبات مرتجع معتمد للطلب '||NEW.order_id,v_total,v_total,jsonb_build_object('order_id',NEW.order_id,'restocked',NEW.restocked,'note',NEW.note),NEW.created_by) ON CONFLICT(source_type,source_id,event_kind) DO NOTHING RETURNING id INTO v_entry_id;
   IF v_entry_id IS NOT NULL THEN IF COALESCE(NEW.refund_amount,0)>0 THEN v_line:=v_line+1;INSERT INTO public.journal_lines(entry_id,line_number,account_code,debit,memo) VALUES(v_entry_id,v_line,'4100',NEW.refund_amount,'عكس إيراد المبلغ المرتجع');END IF;IF v_cash_loss+v_inventory_loss>0 THEN v_line:=v_line+1;INSERT INTO public.journal_lines(entry_id,line_number,account_code,debit,memo) VALUES(v_entry_id,v_line,'4200',v_cash_loss+v_inventory_loss,'خسائر المرتجع الفعلية');END IF;IF COALESCE(NEW.refund_amount,0)>0 THEN v_line:=v_line+1;INSERT INTO public.journal_lines(entry_id,line_number,account_code,credit,memo) VALUES(v_entry_id,v_line,v_refund_credit_account,NEW.refund_amount,'تسوية/دفع مبلغ المرتجع');END IF;IF v_cash_loss>0 THEN v_line:=v_line+1;INSERT INTO public.journal_lines(entry_id,line_number,account_code,credit,memo) VALUES(v_entry_id,v_line,'1000',v_cash_loss,'كلف نقدية للمرتجع');END IF;IF v_inventory_loss>0 THEN v_line:=v_line+1;INSERT INTO public.journal_lines(entry_id,line_number,account_code,credit,memo) VALUES(v_entry_id,v_line,'1200',v_inventory_loss,'شطب/خسارة مخزون');END IF;PERFORM public.validate_journal_entry(v_entry_id);END IF;
  END IF;
 END IF;
 IF OLD.status='verified' AND NEW.status IS DISTINCT FROM 'verified' THEN SELECT id INTO v_original_id FROM public.journal_entries WHERE source_type='return_event' AND source_id=NEW.id AND event_kind='return_verification';IF v_original_id IS NOT NULL THEN SELECT total_debit,period_key INTO v_total,v_period FROM public.journal_entries WHERE id=v_original_id;INSERT INTO public.journal_entries(entry_date,period_key,source_type,source_id,event_kind,description,total_debit,total_credit,reversal_of_entry_id,evidence,created_by) VALUES(clock_timestamp(),to_char(clock_timestamp() AT TIME ZONE 'Asia/Baghdad','YYYY-MM'),'return_event',NEW.id,'return_reversal','عكس مرتجع معتمد: '||NEW.note,v_total,v_total,v_original_id,jsonb_build_object('reason',NEW.note,'original_period',v_period),NEW.created_by) ON CONFLICT(source_type,source_id,event_kind) DO NOTHING RETURNING id INTO v_entry_id;IF v_entry_id IS NOT NULL THEN INSERT INTO public.journal_lines(entry_id,line_number,account_code,debit,credit,memo,dimensions) SELECT v_entry_id,line_number,account_code,credit,debit,'عكس: '||COALESCE(memo,''),dimensions FROM public.journal_lines WHERE entry_id=v_original_id ORDER BY line_number;PERFORM public.validate_journal_entry(v_entry_id);END IF;END IF;END IF;RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS order_returns_post_journal ON public.order_return_events;
CREATE TRIGGER order_returns_post_journal AFTER UPDATE OF status ON public.order_return_events FOR EACH ROW EXECUTE FUNCTION public.post_verified_return_journal();
CREATE OR REPLACE FUNCTION public.prevent_return_event_hard_delete() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'RETURN_EVENT_IMMUTABLE: mark disputed/void; do not hard delete' USING ERRCODE='55000';END $$;
DROP TRIGGER IF EXISTS order_return_events_prevent_delete ON public.order_return_events;
CREATE TRIGGER order_return_events_prevent_delete BEFORE DELETE ON public.order_return_events FOR EACH ROW EXECUTE FUNCTION public.prevent_return_event_hard_delete();
CREATE OR REPLACE FUNCTION public.prevent_expense_hard_delete() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'EXPENSE_IMMUTABLE: use soft delete' USING ERRCODE='55000';END $$;
DROP TRIGGER IF EXISTS expenses_prevent_hard_delete ON public.expenses;
CREATE TRIGGER expenses_prevent_hard_delete BEFORE DELETE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.prevent_expense_hard_delete();

INSERT INTO public.schema_migrations(version,checksum,notes) VALUES('0053_accounting_expenses_returns','c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3','Verified expense and return journals, inventory return movements and reversal-only corrections') ON CONFLICT(version) DO NOTHING;
COMMIT;

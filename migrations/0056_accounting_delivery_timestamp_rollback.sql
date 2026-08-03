-- 0056_accounting_delivery_timestamp_rollback.sql
-- Restores the 0052 recognition behavior. delivered_at is retained when any
-- accounting fact exists, because dropping historical commercial evidence would
-- be destructive. On an unused branch the column and index are removed.
BEGIN;

DROP TRIGGER IF EXISTS orders_stamp_delivered_at ON public.orders;
DROP FUNCTION IF EXISTS public.stamp_order_delivered_at();

CREATE OR REPLACE FUNCTION public.record_order_delivery_accounting()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
 v_cutover timestamptz;v_recognized_at timestamptz;v_period_key text;
 v_gross numeric;v_customer_fee numeric;v_carrier_fee numeric;
 v_product_revenue numeric;v_merchant_net numeric;v_delivery_subsidy numeric;v_delivery_surplus numeric;
 v_event_id text;v_fact_id text;v_cogs numeric;v_line_count bigint;v_bad_cost_count bigint;v_cost_status text;
BEGIN
 IF lower(COALESCE(NEW.status,''))<>'delivered' OR lower(COALESCE(OLD.status,''))='delivered' THEN RETURN NEW;END IF;
 v_cutover:=public.aquavo_active_cutover();v_recognized_at:=clock_timestamp();IF v_recognized_at<v_cutover THEN RETURN NEW;END IF;
 v_gross:=COALESCE(NEW.rounded_total,NEW.total,0);v_customer_fee:=COALESCE(NEW.shipping_cost,0);
 v_carrier_fee:=COALESCE(NEW.carrier_fee,v_customer_fee,0);v_product_revenue:=v_gross-v_customer_fee;
 v_merchant_net:=v_gross-v_carrier_fee;v_delivery_subsidy:=GREATEST(v_carrier_fee-v_customer_fee,0);
 v_delivery_surplus:=GREATEST(v_customer_fee-v_carrier_fee,0);
 v_period_key:=to_char(v_recognized_at AT TIME ZONE 'Asia/Baghdad','YYYY-MM');
 IF v_product_revenue<0 THEN RAISE EXCEPTION 'ORDER_ACCOUNTING_INVALID: customer delivery fee exceeds gross total for order %',NEW.id;END IF;
 IF v_merchant_net<0 THEN RAISE EXCEPTION 'ORDER_ACCOUNTING_INVALID: carrier fee exceeds gross total for order %',NEW.id;END IF;
 INSERT INTO public.payment_events(order_id,event_type,status,amount,currency,method,provider,idempotency_key,occurred_at,evidence,metadata,created_by)
 VALUES(NEW.id,'cod_received','completed',v_gross,'IQD','cod',COALESCE(NEW.carrier,'carrier'),
   'delivery:'||NEW.id||':cod_received',v_recognized_at,jsonb_build_object('source','order_delivery_transition'),
   jsonb_build_object('gross_collected',v_gross,'customer_delivery_fee',v_customer_fee,'carrier_fee',v_carrier_fee,
     'product_revenue',v_product_revenue,'merchant_net',v_merchant_net,'delivery_subsidy',v_delivery_subsidy,
     'delivery_surplus',v_delivery_surplus,'policy_version','v2_gross_includes_delivery_carrier_keeps_fee'),'database_trigger')
 ON CONFLICT(idempotency_key) DO NOTHING;
 SELECT id INTO v_event_id FROM public.payment_events
  WHERE idempotency_key='delivery:'||NEW.id||':cod_received' AND status='completed' AND amount=v_gross;
 IF v_event_id IS NULL THEN RAISE EXCEPTION 'COD_EVENT_MISSING_OR_MISMATCH for delivered order %',NEW.id;END IF;
 SELECT COUNT(*),COUNT(*) FILTER(WHERE cost_snapshot_status IS NULL OR cost_snapshot_status NOT IN ('exact','verified_zero')
   OR unit_cost_price IS NULL OR unit_packaging_cost IS NULL OR unit_insert_cost IS NULL),
   SUM((COALESCE(unit_cost_price,0)+COALESCE(unit_packaging_cost,0)+COALESCE(unit_insert_cost,0))*quantity)
 INTO v_line_count,v_bad_cost_count,v_cogs FROM public.order_items_relational WHERE order_id=NEW.id;
 IF v_line_count=0 THEN v_cost_status:='unknown';v_cogs:=NULL;
 ELSIF v_bad_cost_count>0 THEN v_cost_status:='incomplete';v_cogs:=NULL;
 ELSIF v_cogs=0 THEN v_cost_status:='verified_zero';ELSE v_cost_status:='exact';END IF;
 INSERT INTO public.order_accounting_facts(order_id,payment_event_id,recognized_at,period_key,gross_collected,
   customer_delivery_fee,carrier_fee,product_revenue,merchant_net,delivery_subsidy,delivery_surplus,
   cash_custody,cogs_amount,cost_status,currency,policy_version,evidence)
 VALUES(NEW.id,v_event_id,v_recognized_at,v_period_key,v_gross,v_customer_fee,v_carrier_fee,v_product_revenue,
   v_merchant_net,v_delivery_subsidy,v_delivery_surplus,'carrier',v_cogs,v_cost_status,'IQD',
   'v2_gross_includes_delivery_carrier_keeps_fee',
   jsonb_build_object('created_by','database_trigger','order_number',NEW.order_number,
     'order_total_source',CASE WHEN NEW.rounded_total IS NOT NULL THEN 'rounded_total' ELSE 'total' END))
 ON CONFLICT(order_id) DO NOTHING RETURNING id INTO v_fact_id;
 IF v_fact_id IS NULL THEN SELECT id INTO v_fact_id FROM public.order_accounting_facts WHERE order_id=NEW.id;END IF;
 PERFORM public.post_order_delivery_journal(v_fact_id);
 PERFORM public.post_order_cogs_journal(v_fact_id);
 PERFORM public.post_order_fulfillment_journal(NEW.id);
 RETURN NEW;
END $$;

DO $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.order_accounting_facts) THEN
   DROP INDEX IF EXISTS public.orders_delivered_at_idx;
   ALTER TABLE public.orders DROP COLUMN IF EXISTS delivered_at;
 END IF;
END $$;

UPDATE public.schema_migrations
   SET rolled_back_at=now()
 WHERE version='0056_accounting_delivery_timestamp';
COMMIT;

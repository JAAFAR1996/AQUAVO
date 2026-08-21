-- ============================================================================
-- 20260821_fix_delivery_discount_rounding.sql
--
-- Fix delivered-order accounting when an order has a coupon/customer-credit
-- discount. The old trigger derived `rounding_adjustment` by comparing the
-- collected product amount with the GROSS order-line subtotal. That folded an
-- order-level discount into cash rounding and could produce a journal whose
-- line totals exceeded its header total (JOURNAL_UNBALANCED).
--
-- Accounting contract after this migration:
--   * orders.total is the authoritative pre-round total after order/coupon discount.
--   * orders.points_discount is customer-credit/cashback applied after orders.total.
--   * product revenue is the resulting transaction price less customer delivery fee.
--   * cash rounding is ONLY the residual between pre-round payable and COD collected.
--   * the journal header is derived from the exact posting lines and fail-closes
--     before insertion if debit and credit control totals differ.
--
-- Example that exposed the defect:
--   subtotal 26,000 - coupon 780 + delivery 5,000 = pre-round total 30,220
--   COD collected = 30,250
--   correct product revenue = 25,220; cash rounding = +30; COD receivable = 25,250.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.post_order_delivery_journal(p_fact_id text)
RETURNS text
LANGUAGE plpgsql
AS $function$
DECLARE
  f public.order_accounting_facts%ROWTYPE;
  v_entry_id text;
  v_line integer:=0;
  v_total numeric;
  v_debit_total numeric;
  v_credit_total numeric;
BEGIN
  SELECT * INTO f FROM public.order_accounting_facts WHERE id=p_fact_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'order accounting fact % not found',p_fact_id; END IF;
  SELECT id INTO v_entry_id FROM public.journal_entries WHERE source_type='order' AND source_id=f.order_id AND event_kind='delivery_recognition';
  IF FOUND THEN RETURN v_entry_id; END IF;

  IF f.cash_custody='carrier' THEN
    v_debit_total:=f.merchant_net+f.delivery_subsidy;
  ELSE
    v_debit_total:=f.gross_collected+f.delivery_subsidy;
  END IF;
  v_debit_total:=v_debit_total+GREATEST(-COALESCE(f.rounding_adjustment,0),0);
  v_credit_total:=f.product_revenue
    +GREATEST(COALESCE(f.rounding_adjustment,0),0)
    +CASE WHEN f.cash_custody<>'carrier' THEN f.carrier_fee ELSE 0 END
    +f.delivery_surplus;

  IF v_debit_total<>v_credit_total THEN
    RAISE EXCEPTION 'DELIVERY_JOURNAL_PRECHECK_UNBALANCED: order % debit % credit %',f.order_id,v_debit_total,v_credit_total;
  END IF;
  v_total:=v_debit_total;

  INSERT INTO public.journal_entries(entry_date,period_key,source_type,source_id,event_kind,description,total_debit,total_credit,evidence)
  VALUES(f.recognized_at,f.period_key,'order',f.order_id,'delivery_recognition','إثبات بيع COD عند التسليم',v_total,v_total,
         jsonb_build_object('order_accounting_fact_id',f.id,'payment_event_id',f.payment_event_id,'policy_version',f.policy_version,'journal_control_total_source','calculated_from_posting_lines'))
  RETURNING id INTO v_entry_id;

  IF f.cash_custody='carrier' AND f.merchant_net>0 THEN
    v_line:=v_line+1;
    INSERT INTO public.journal_lines(entry_id,line_number,account_code,debit,memo,dimensions)
    VALUES(v_entry_id,v_line,'1100',f.merchant_net,'صافي مستحق من شركة التوصيل',jsonb_build_object('order_id',f.order_id));
  ELSIF f.cash_custody<>'carrier' AND f.gross_collected>0 THEN
    v_line:=v_line+1;
    INSERT INTO public.journal_lines(entry_id,line_number,account_code,debit,memo,dimensions)
    VALUES(v_entry_id,v_line,CASE WHEN f.cash_custody='bank' THEN '1010' ELSE '1000' END,f.gross_collected,'إجمالي COD مستلم',jsonb_build_object('order_id',f.order_id));
  END IF;
  IF f.delivery_subsidy>0 THEN
    v_line:=v_line+1;
    INSERT INTO public.journal_lines(entry_id,line_number,account_code,debit,memo,dimensions)
    VALUES(v_entry_id,v_line,'5200',f.delivery_subsidy,'دعم توصيل تتحمله AQUAVO',jsonb_build_object('order_id',f.order_id));
  END IF;
  IF f.rounding_adjustment<0 THEN
    v_line:=v_line+1;
    INSERT INTO public.journal_lines(entry_id,line_number,account_code,debit,memo,dimensions)
    VALUES(v_entry_id,v_line,'3050',abs(f.rounding_adjustment),'فرق تقريب سلبي',jsonb_build_object('order_id',f.order_id));
  END IF;
  IF f.product_revenue>0 THEN
    v_line:=v_line+1;
    INSERT INTO public.journal_lines(entry_id,line_number,account_code,credit,memo,dimensions)
    VALUES(v_entry_id,v_line,'3000',f.product_revenue,'مبيعات المنتجات فقط',jsonb_build_object('order_id',f.order_id));
  END IF;
  IF f.rounding_adjustment>0 THEN
    v_line:=v_line+1;
    INSERT INTO public.journal_lines(entry_id,line_number,account_code,credit,memo,dimensions)
    VALUES(v_entry_id,v_line,'3050',f.rounding_adjustment,'فرق تقريب إيجابي',jsonb_build_object('order_id',f.order_id));
  END IF;
  IF f.cash_custody<>'carrier' AND f.carrier_fee>0 THEN
    v_line:=v_line+1;
    INSERT INTO public.journal_lines(entry_id,line_number,account_code,credit,memo,dimensions)
    VALUES(v_entry_id,v_line,'2100',f.carrier_fee,'أجرة مستحقة لشركة التوصيل',jsonb_build_object('order_id',f.order_id));
  END IF;
  IF f.delivery_surplus>0 THEN
    v_line:=v_line+1;
    INSERT INTO public.journal_lines(entry_id,line_number,account_code,credit,memo,dimensions)
    VALUES(v_entry_id,v_line,'2200',f.delivery_surplus,'فرق توصيل معلّق وليس مبيعات منتجات',jsonb_build_object('order_id',f.order_id));
  END IF;

  PERFORM public.validate_journal_entry(v_entry_id);
  RETURN v_entry_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.record_order_delivery_accounting()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_cutover timestamptz;
  v_recognized_at timestamptz;
  v_period_key text;
  v_gross numeric;
  v_customer_fee numeric;
  v_carrier_fee numeric;
  v_product_revenue numeric;
  v_rounding numeric;
  v_pre_round_payable numeric;
  v_merchant_net numeric;
  v_delivery_subsidy numeric;
  v_delivery_surplus numeric;
  v_event_id text;
  v_fact_id text;
  v_cogs numeric;
  v_line_count bigint;
  v_bad_cost_count bigint;
  v_cost_status text;
BEGIN
  IF lower(COALESCE(NEW.status,''))<>'delivered' OR lower(COALESCE(OLD.status,''))='delivered' THEN
    RETURN NEW;
  END IF;

  v_cutover:=public.aquavo_active_cutover();
  v_recognized_at:=COALESCE(NEW.delivered_at,clock_timestamp());
  IF v_recognized_at<v_cutover THEN RETURN NEW; END IF;

  v_gross:=COALESCE(NEW.rounded_total,NEW.total,0);
  v_customer_fee:=COALESCE(NEW.shipping_cost,0);
  v_carrier_fee:=COALESCE(NEW.carrier_fee,v_customer_fee,0);

  v_pre_round_payable:=GREATEST(COALESCE(NEW.total,0)-COALESCE(NEW.points_discount,0),0);
  v_product_revenue:=GREATEST(v_pre_round_payable-v_customer_fee,0);
  v_rounding:=v_gross-v_pre_round_payable;

  SELECT
    COUNT(*),
    COUNT(*) FILTER(
      WHERE cost_snapshot_status IS NULL
         OR cost_snapshot_status NOT IN ('exact','verified_zero')
         OR unit_cost_price IS NULL
         OR unit_packaging_cost IS NULL
         OR unit_insert_cost IS NULL
    ),
    SUM((COALESCE(unit_cost_price,0)+COALESCE(unit_packaging_cost,0)+COALESCE(unit_insert_cost,0))*quantity)
  INTO v_line_count,v_bad_cost_count,v_cogs
  FROM public.order_items_relational
  WHERE order_id=NEW.id;

  IF v_line_count=0 THEN
    RAISE EXCEPTION 'ORDER_ACCOUNTING_INVALID: no relational order items for %',NEW.id;
  END IF;

  v_merchant_net:=v_gross-v_carrier_fee;
  v_delivery_subsidy:=GREATEST(v_carrier_fee-v_customer_fee,0);
  v_delivery_surplus:=GREATEST(v_customer_fee-v_carrier_fee,0);
  v_period_key:=to_char(v_recognized_at AT TIME ZONE 'Asia/Baghdad','YYYY-MM');

  IF v_product_revenue<0 OR v_merchant_net<0 THEN
    RAISE EXCEPTION 'ORDER_ACCOUNTING_INVALID: negative revenue/net for order %',NEW.id;
  END IF;

  INSERT INTO public.payment_events(
    order_id,event_type,status,amount,currency,method,provider,idempotency_key,
    occurred_at,evidence,metadata,created_by
  ) VALUES(
    NEW.id,'cod_received','completed',v_gross,'IQD','cod',COALESCE(NEW.carrier,'carrier'),
    'delivery:'||NEW.id||':cod_received',v_recognized_at,
    jsonb_build_object('source','order_delivery_transition','delivered_at',v_recognized_at),
    jsonb_build_object(
      'gross_collected',v_gross,
      'customer_delivery_fee',v_customer_fee,
      'carrier_fee',v_carrier_fee,
      'product_revenue',v_product_revenue,
      'rounding_adjustment',v_rounding,
      'merchant_net',v_merchant_net,
      'delivery_subsidy',v_delivery_subsidy,
      'delivery_surplus',v_delivery_surplus,
      'order_discount_total',COALESCE(NEW.discount_total,0),
      'customer_credit_discount',COALESCE(NEW.points_discount,0),
      'pre_round_payable',v_pre_round_payable,
      'policy_version','v4_net_transaction_price_cash_rounding'
    ),
    'database_trigger'
  )
  ON CONFLICT(idempotency_key) DO NOTHING;

  SELECT id INTO v_event_id
  FROM public.payment_events
  WHERE idempotency_key='delivery:'||NEW.id||':cod_received'
    AND status='completed'
    AND amount=v_gross;

  IF v_event_id IS NULL THEN
    RAISE EXCEPTION 'COD_EVENT_MISSING_OR_MISMATCH for delivered order %',NEW.id;
  END IF;

  IF v_bad_cost_count>0 THEN
    v_cost_status:='incomplete';
    v_cogs:=NULL;
  ELSIF COALESCE(v_cogs,0)=0 THEN
    v_cost_status:='verified_zero';
    v_cogs:=0;
  ELSE
    v_cost_status:='exact';
  END IF;

  INSERT INTO public.order_accounting_facts(
    order_id,payment_event_id,recognized_at,period_key,gross_collected,
    customer_delivery_fee,carrier_fee,product_revenue,rounding_adjustment,
    merchant_net,delivery_subsidy,delivery_surplus,cash_custody,cogs_amount,
    cost_status,currency,policy_version,carrier_snapshot,evidence
  ) VALUES(
    NEW.id,v_event_id,v_recognized_at,v_period_key,v_gross,v_customer_fee,
    v_carrier_fee,v_product_revenue,v_rounding,v_merchant_net,v_delivery_subsidy,
    v_delivery_surplus,'carrier',v_cogs,v_cost_status,'IQD',
    'v4_net_transaction_price_cash_rounding',NEW.carrier,
    jsonb_build_object(
      'created_by','database_trigger',
      'order_number',NEW.order_number,
      'delivered_at',v_recognized_at,
      'order_total_source',CASE WHEN NEW.rounded_total IS NOT NULL THEN 'rounded_total' ELSE 'total' END,
      'raw_order_total',COALESCE(NEW.total,0),
      'order_discount_total',COALESCE(NEW.discount_total,0),
      'customer_credit_discount',COALESCE(NEW.points_discount,0),
      'pre_round_payable',v_pre_round_payable,
      'financial_snapshot_version',NEW.total_formula_version
    )
  )
  ON CONFLICT(order_id) DO NOTHING
  RETURNING id INTO v_fact_id;

  IF v_fact_id IS NULL THEN
    SELECT id INTO v_fact_id
    FROM public.order_accounting_facts
    WHERE order_id=NEW.id;
  END IF;

  PERFORM public.post_order_delivery_journal(v_fact_id);
  PERFORM public.post_order_cogs_journal(v_fact_id);
  PERFORM public.post_order_fulfillment_journal(NEW.id);
  RETURN NEW;
END;
$function$;

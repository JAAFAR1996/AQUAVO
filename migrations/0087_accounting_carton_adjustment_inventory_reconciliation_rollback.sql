-- Safety-preserving rollback for 0087_accounting_carton_adjustment_inventory_reconciliation.
--
-- Restores the pre-0087 posting functions (0054) and the pre-0087 per-order view
-- (0083), and removes the two objects 0087 introduced.
--
-- Four changes are deliberately NOT reversed, each because undoing it would
-- recreate a proven defect or overturn a recorded owner decision:
--
--   1. Posted journal entries. The ledger is append-only; a posted entry is
--      undone by its own reversal entry, never by deletion. Deleting the
--      adjustment postings here would silently drop real, validated cost.
--   2. v_accounting_period_readiness. 0087 pointed inventory_check at the
--      canonical reconciliation queue because the previous per-variant
--      comparison reported false mismatches for products collapsed from a sole
--      default variant. Restoring it would reintroduce that false alarm.
--   3. products.cost_price for the three collapsed-variant products. The synced
--      values match their verified default-variant costs and the GL inventory
--      valuation; the previous top-level values were stale.
--   4. Resolved carton_evidence_missing flags. Resolving them was the owner's
--      decision of 2026-08-24 that historical shipments may stand without a
--      reconstructed carton. Reopening them would re-litigate that waiver and
--      invent no new evidence.

BEGIN;

-- 1) Restore the pre-0087 posting functions. The 0054 originals know nothing of
--    adjustment events, which is exactly the behaviour being rolled back to.
CREATE OR REPLACE FUNCTION public.post_order_fulfillment_journal(p_order_id text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE f public.order_accounting_facts%ROWTYPE;o public.orders%ROWTYPE;v_entry_id text;v_events bigint;v_bad bigint;v_cost numeric;
BEGIN
 SELECT * INTO f FROM public.order_accounting_facts WHERE order_id=p_order_id;IF NOT FOUND THEN RETURN NULL;END IF;SELECT * INTO o FROM public.orders WHERE id=p_order_id;
 SELECT COUNT(*)::bigint,COUNT(*) FILTER(WHERE cost_status NOT IN ('exact','verified_zero') OR actual_cost IS NULL)::bigint,COALESCE(SUM(actual_cost) FILTER(WHERE cost_status IN ('exact','verified_zero') AND actual_cost IS NOT NULL),0) INTO v_events,v_bad,v_cost FROM public.order_fulfillment_events WHERE order_id=p_order_id AND event_type='original' AND workflow_state='confirmed';
 IF v_events=0 THEN v_cost:=COALESCE(o.box_cost,0);IF v_cost<=0 THEN RETURN NULL;END IF;ELSIF v_bad>0 THEN RETURN NULL;END IF;
 SELECT id INTO v_entry_id FROM public.journal_entries WHERE source_type='order' AND source_id=p_order_id AND event_kind='fulfillment_recognition';IF FOUND THEN IF (SELECT total_debit FROM public.journal_entries WHERE id=v_entry_id)<>v_cost THEN RAISE EXCEPTION 'FULFILLMENT_JOURNAL_IMMUTABLE: cost changed for order %; reverse and repost',p_order_id;END IF;RETURN v_entry_id;END IF;
 INSERT INTO public.journal_entries(entry_date,period_key,source_type,source_id,event_kind,description,total_debit,total_credit,evidence) VALUES(f.recognized_at,f.period_key,'order',p_order_id,'fulfillment_recognition','إثبات كلفة مواد تجهيز وتغليف AQUAVO',v_cost,v_cost,jsonb_build_object('order_accounting_fact_id',f.id,'source',CASE WHEN v_events>0 THEN 'confirmed_fulfillment_event' ELSE 'legacy_box_cost' END)) RETURNING id INTO v_entry_id;
 INSERT INTO public.journal_lines(entry_id,line_number,account_code,debit,memo) VALUES(v_entry_id,1,'5100',v_cost,'مواد تجهيز وتغليف الطلب');
 INSERT INTO public.journal_lines(entry_id,line_number,account_code,credit,memo) VALUES(v_entry_id,2,'1210',v_cost,'استهلاك مخزون مواد التجهيز');
 PERFORM public.validate_journal_entry(v_entry_id);RETURN v_entry_id;
END $$;

CREATE OR REPLACE FUNCTION public.post_fulfillment_after_confirmation() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_original text;v_reversal text;v_total numeric;v_period text;
BEGIN
 IF NEW.event_type='original' AND NEW.workflow_state='confirmed' AND (TG_OP='INSERT' OR OLD.workflow_state IS DISTINCT FROM 'confirmed' OR OLD.actual_cost IS DISTINCT FROM NEW.actual_cost OR OLD.cost_status IS DISTINCT FROM NEW.cost_status) THEN PERFORM public.post_order_fulfillment_journal(NEW.order_id);END IF;
 IF TG_OP='UPDATE' AND OLD.event_type='original' AND OLD.workflow_state='confirmed' AND NEW.workflow_state='reversed' THEN
  SELECT id,total_debit,period_key INTO v_original,v_total,v_period FROM public.journal_entries WHERE source_type='order' AND source_id=NEW.order_id AND event_kind='fulfillment_recognition';
  IF v_original IS NOT NULL THEN INSERT INTO public.journal_entries(entry_date,period_key,source_type,source_id,event_kind,description,total_debit,total_credit,reversal_of_entry_id,evidence,created_by) VALUES(clock_timestamp(),to_char(clock_timestamp() AT TIME ZONE 'Asia/Baghdad','YYYY-MM'),'order_fulfillment_event',NEW.id,'fulfillment_reversal','عكس كلفة تجهيز طلب: '||COALESCE(NEW.adjustment_reason,'تم عكس حدث التجهيز'),v_total,v_total,v_original,jsonb_build_object('order_id',NEW.order_id,'original_period',v_period),NEW.recorded_by) ON CONFLICT(source_type,source_id,event_kind) DO NOTHING RETURNING id INTO v_reversal;IF v_reversal IS NOT NULL THEN INSERT INTO public.journal_lines(entry_id,line_number,account_code,debit,credit,memo,dimensions) SELECT v_reversal,line_number,account_code,credit,debit,'عكس: '||COALESCE(memo,''),dimensions FROM public.journal_lines WHERE entry_id=v_original ORDER BY line_number;PERFORM public.validate_journal_entry(v_reversal);END IF;END IF;
 END IF;RETURN NEW;
END $$;

-- 2) Restore the pre-0087 per-order view. The 0083 form reads revenue and
--    fulfillment cost from the accounting facts rather than from the ledger.
CREATE OR REPLACE VIEW public.v_order_accounting AS
SELECT
  f.order_id,o.order_number,o.source,o.status,o.payment_status,o.cod_received,
  f.recognized_at,f.period_key,f.gross_collected,f.customer_delivery_fee,
  f.carrier_fee,f.product_revenue,f.merchant_net,f.delivery_subsidy,
  f.delivery_surplus,f.cash_custody,f.cogs_amount,f.cost_status,
  CASE
    WHEN f.cogs_amount IS NULL THEN NULL::numeric
    ELSE f.product_revenue-f.cogs_amount-f.delivery_subsidy-
      COALESCE(
        (
          SELECT SUM(e.actual_cost)
          FROM public.order_fulfillment_events e
          WHERE e.order_id=f.order_id
            AND e.event_type='original'
            AND e.workflow_state='confirmed'
        ),
        CASE WHEN COALESCE(o.box_cost,0)>0 THEN o.box_cost ELSE 0 END
      )
  END AS contribution_profit,
  CASE WHEN s.id IS NULL THEN 'unsettled' ELSE s.status END AS settlement_status,
  s.settlement_id,f.policy_version
FROM public.order_accounting_facts f
JOIN public.orders o ON o.id=f.order_id
LEFT JOIN public.order_accounting_settlements s ON s.order_fact_id=f.id
WHERE COALESCE(o.is_test,false)=false;

-- 3) Drop the objects 0087 introduced. Ordered after the function and view
--    restores above, so nothing still references them at drop time.
DROP FUNCTION IF EXISTS public.post_fulfillment_adjustment_journal(text);
DROP FUNCTION IF EXISTS public.accounting_order_account_balance(text, text);

UPDATE public.schema_migrations
SET rolled_back_at=clock_timestamp(),
    notes=COALESCE(notes,'')||' | Safety-preserving rollback: 0054 posting functions and 0083 per-order view restored. Posted adjustment journals, the canonical inventory reconciliation check, the synced collapsed-variant costs and the owner-resolved carton evidence flags are intentionally retained.'
WHERE version='0087_accounting_carton_adjustment_inventory_reconciliation'
  AND rolled_back_at IS NULL;

COMMIT;

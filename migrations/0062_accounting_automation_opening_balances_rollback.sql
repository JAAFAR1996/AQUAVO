-- 0062_accounting_automation_opening_balances_rollback.sql
-- Structural rollback only. The opening journal is retained as immutable audit
-- evidence and can be reversed through a dated reversal entry if ever required.
BEGIN;

DROP FUNCTION IF EXISTS public.auto_close_ended_accounting_periods(text,text);

DROP TRIGGER IF EXISTS journal_lines_immutable_guard ON public.journal_lines;
DROP FUNCTION IF EXISTS public.guard_journal_line_mutation();

DROP TRIGGER IF EXISTS journal_entries_closed_period_guard ON public.journal_entries;
DROP FUNCTION IF EXISTS public.guard_closed_period_journal_insert();

DROP VIEW IF EXISTS public.v_accounting_live_balances;

-- Restore the pre-0062 monetary-return journal function. This reinstates the
-- original requirement for an accounting fact before any verified return.
CREATE OR REPLACE FUNCTION public.post_verified_return_journal()
RETURNS trigger
LANGUAGE plpgsql
AS $return_journal_pre_0062$
DECLARE
  v_fact public.order_accounting_facts%ROWTYPE;
  v_entry_id text;
  v_original_id text;
  v_refund_credit_account text;
  v_cash_loss numeric;
  v_inventory_loss numeric;
  v_total numeric;
  v_line integer:=0;
  v_period text;
BEGIN
  IF NEW.created_at<(public.aquavo_active_cutover() AT TIME ZONE 'UTC') THEN
    RETURN NEW;
  END IF;

  IF NEW.status='verified' AND OLD.status IS DISTINCT FROM 'verified' THEN
    SELECT * INTO v_fact
    FROM public.order_accounting_facts
    WHERE order_id=NEW.order_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'RETURN_JOURNAL_BLOCKED: accounting fact missing for order %',NEW.order_id;
    END IF;

    IF v_fact.cash_custody='carrier'
       AND NOT EXISTS(
         SELECT 1 FROM public.order_accounting_settlements os
         WHERE os.order_fact_id=v_fact.id AND os.status='matched'
       ) THEN
      v_refund_credit_account:='1100';
    ELSIF v_fact.cash_custody='bank' THEN
      v_refund_credit_account:='1010';
    ELSE
      v_refund_credit_account:='1000';
    END IF;

    v_cash_loss:=COALESCE(NEW.delivery_cost_loss,0)
      +COALESCE(NEW.return_shipping_cost,0)
      +COALESCE(NEW.packaging_loss,0);
    v_inventory_loss:=COALESCE(NEW.product_write_off_amount,0)
      +CASE WHEN NEW.restocked=true THEN 0 ELSE COALESCE(NEW.cogs_loss,0) END;
    v_total:=COALESCE(NEW.refund_amount,0)+v_cash_loss+v_inventory_loss;
    v_period:=to_char(NEW.updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Baghdad','YYYY-MM');

    IF v_total>0 THEN
      INSERT INTO public.journal_entries(
        entry_date,period_key,source_type,source_id,event_kind,description,
        total_debit,total_credit,evidence,created_by
      ) VALUES(
        NEW.updated_at AT TIME ZONE 'UTC',v_period,'return_event',NEW.id,
        'return_verification','إثبات مرتجع معتمد للطلب '||NEW.order_id,
        v_total,v_total,
        jsonb_build_object('order_id',NEW.order_id,'restocked',NEW.restocked,'note',NEW.note),
        NEW.created_by
      )
      ON CONFLICT(source_type,source_id,event_kind) DO NOTHING
      RETURNING id INTO v_entry_id;

      IF v_entry_id IS NOT NULL THEN
        IF COALESCE(NEW.refund_amount,0)>0 THEN
          v_line:=v_line+1;
          INSERT INTO public.journal_lines(entry_id,line_number,account_code,debit,memo)
          VALUES(v_entry_id,v_line,'4100',NEW.refund_amount,'عكس إيراد المبلغ المرتجع');
        END IF;
        IF v_cash_loss+v_inventory_loss>0 THEN
          v_line:=v_line+1;
          INSERT INTO public.journal_lines(entry_id,line_number,account_code,debit,memo)
          VALUES(v_entry_id,v_line,'4200',v_cash_loss+v_inventory_loss,'خسائر المرتجع الفعلية');
        END IF;
        IF COALESCE(NEW.refund_amount,0)>0 THEN
          v_line:=v_line+1;
          INSERT INTO public.journal_lines(entry_id,line_number,account_code,credit,memo)
          VALUES(v_entry_id,v_line,v_refund_credit_account,NEW.refund_amount,'تسوية/دفع مبلغ المرتجع');
        END IF;
        IF v_cash_loss>0 THEN
          v_line:=v_line+1;
          INSERT INTO public.journal_lines(entry_id,line_number,account_code,credit,memo)
          VALUES(v_entry_id,v_line,'1000',v_cash_loss,'كلف نقدية للمرتجع');
        END IF;
        IF v_inventory_loss>0 THEN
          v_line:=v_line+1;
          INSERT INTO public.journal_lines(entry_id,line_number,account_code,credit,memo)
          VALUES(v_entry_id,v_line,'1200',v_inventory_loss,'شطب/خسارة مخزون');
        END IF;
        PERFORM public.validate_journal_entry(v_entry_id);
      END IF;
    END IF;
  END IF;

  IF OLD.status='verified' AND NEW.status IS DISTINCT FROM 'verified' THEN
    SELECT id INTO v_original_id
    FROM public.journal_entries
    WHERE source_type='return_event'
      AND source_id=NEW.id
      AND event_kind='return_verification';
    IF v_original_id IS NOT NULL THEN
      SELECT total_debit,period_key INTO v_total,v_period
      FROM public.journal_entries WHERE id=v_original_id;
      INSERT INTO public.journal_entries(
        entry_date,period_key,source_type,source_id,event_kind,description,
        total_debit,total_credit,reversal_of_entry_id,evidence,created_by
      ) VALUES(
        clock_timestamp(),to_char(clock_timestamp() AT TIME ZONE 'Asia/Baghdad','YYYY-MM'),
        'return_event',NEW.id,'return_reversal','عكس مرتجع معتمد: '||NEW.note,
        v_total,v_total,v_original_id,
        jsonb_build_object('reason',NEW.note,'original_period',v_period),NEW.created_by
      )
      ON CONFLICT(source_type,source_id,event_kind) DO NOTHING
      RETURNING id INTO v_entry_id;
      IF v_entry_id IS NOT NULL THEN
        INSERT INTO public.journal_lines(entry_id,line_number,account_code,debit,credit,memo,dimensions)
        SELECT v_entry_id,line_number,account_code,credit,debit,
               'عكس: '||COALESCE(memo,''),dimensions
        FROM public.journal_lines
        WHERE entry_id=v_original_id
        ORDER BY line_number;
        PERFORM public.validate_journal_entry(v_entry_id);
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $return_journal_pre_0062$;

-- Restore the pre-0062 inventory timing function exactly. This rollback is
-- intentionally explicit so operators understand that 'rejected' would again
-- restore stock before physical receipt.
CREATE OR REPLACE FUNCTION public.reverse_order_inventory_on_terminal_status()
RETURNS trigger
LANGUAGE plpgsql
AS $inventory_pre_0062$
DECLARE
  mode text;
  main_location text;
  item_row record;
  line_variant text;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  SELECT value INTO mode FROM settings WHERE key='inventory_ledger_mode';
  IF COALESCE(mode,'off')<>'enforce' THEN RETURN NEW; END IF;
  IF NEW.status NOT IN ('cancelled','rejected','rejected_returned','rejected_carrier','returned') THEN
    IF OLD.status IN ('cancelled','rejected','rejected_returned','rejected_carrier','returned')
       AND EXISTS(SELECT 1 FROM inventory_movements WHERE source_type='order_status_reversal' AND source_id=NEW.id) THEN
      RAISE EXCEPTION 'order % inventory was reversed; reopening requires an explicit inventory workflow',NEW.id;
    END IF;
    RETURN NEW;
  END IF;
  SELECT id INTO main_location FROM inventory_locations WHERE code='MAIN' AND is_active=true LIMIT 1;
  FOR item_row IN
    SELECT oi.id,oi.product_id,oi.quantity,oi.metadata
    FROM order_items_relational oi WHERE oi.order_id=NEW.id
  LOOP
    IF EXISTS(SELECT 1 FROM inventory_movements WHERE idempotency_key='order_item:'||item_row.id) THEN
      line_variant:=NULLIF(item_row.metadata->>'variantId','');
      INSERT INTO inventory_movements(
        product_id,variant_id,location_id,quantity_delta,movement_type,source_type,
        source_id,idempotency_key,currency,happened_at,created_by,metadata
      ) VALUES(
        item_row.product_id,line_variant,main_location,item_row.quantity,'sale_reversal',
        'order_status_reversal',NEW.id,'order_reversal:'||NEW.id||':'||item_row.id,
        'IQD',now(),'database_trigger',
        jsonb_build_object('order_id',NEW.id,'order_item_id',item_row.id,'status',NEW.status)
      )
      ON CONFLICT(idempotency_key) DO NOTHING;
    END IF;
  END LOOP;
  RETURN NEW;
END $inventory_pre_0062$;

UPDATE public.schema_migrations
SET rolled_back_at=now(),notes=COALESCE(notes,'')||' [structural rollback; immutable opening entry retained]'
WHERE version='0062_accounting_automation_opening_balances';

COMMIT;

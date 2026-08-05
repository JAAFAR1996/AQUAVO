-- 0069_accounting_return_integrity_rollback.sql
-- Restores the pre-0069 return functions. Blocked after any return event has
-- been processed while 0069 is active because canonical variant/COGS evidence
-- and its journals must not be reinterpreted by the older writer.
BEGIN;

DO $$
DECLARE
  v_applied_at timestamptz;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.schema_migrations
    WHERE version='0070_accounting_ledger_backed_views'
      AND rolled_back_at IS NULL
  ) THEN
    RAISE EXCEPTION '0069_ROLLBACK_BLOCKED: roll back 0070 first';
  END IF;

  SELECT applied_at INTO v_applied_at
  FROM public.schema_migrations
  WHERE version='0069_accounting_return_integrity'
    AND rolled_back_at IS NULL;

  IF v_applied_at IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.order_return_events r
    WHERE r.updated_at >= (v_applied_at AT TIME ZONE 'UTC')
  ) THEN
    RAISE EXCEPTION '0069_ROLLBACK_BLOCKED: return events changed after 0069 was applied';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.prepare_verified_return_inventory()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF OLD.status='disputed' AND NEW.status='verified' THEN
    RAISE EXCEPTION 'RETURN_REVERIFY_BLOCKED: create a new return event instead of rewriting history';
  END IF;

  IF OLD.status='verified'
     AND NEW.status IS DISTINCT FROM 'verified'
     AND NULLIF(btrim(COALESCE(NEW.note,'')),'') IS NULL THEN
    RAISE EXCEPTION 'RETURN_REVERSAL_REASON_REQUIRED';
  END IF;

  IF NEW.status='verified'
     AND OLD.status IS DISTINCT FROM 'verified'
     AND NEW.restocked=true
     AND NEW.restocked_at IS NULL THEN
    NEW.restocked_at:=clock_timestamp();
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.post_verified_return_journal()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
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
    v_cash_loss:=COALESCE(NEW.delivery_cost_loss,0)
      +COALESCE(NEW.return_shipping_cost,0)
      +CASE
        WHEN COALESCE(NEW.packaging_loss_source,'manual')='manual'
          THEN COALESCE(NEW.packaging_loss,0)
        ELSE 0
      END;
    v_inventory_loss:=COALESCE(NEW.product_write_off_amount,0)
      +CASE WHEN NEW.restocked=true THEN 0 ELSE COALESCE(NEW.cogs_loss,0) END;
    v_total:=COALESCE(NEW.refund_amount,0)+v_cash_loss+v_inventory_loss;

    IF v_total=0 THEN
      RETURN NEW;
    END IF;

    SELECT * INTO v_fact
    FROM public.order_accounting_facts
    WHERE order_id=NEW.order_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'RETURN_JOURNAL_BLOCKED: monetary return requires accounting fact for order %',NEW.order_id;
    END IF;

    IF v_fact.cash_custody='carrier'
       AND NOT EXISTS(
         SELECT 1
         FROM public.order_accounting_settlements os
         WHERE os.order_fact_id=v_fact.id
           AND os.status='matched'
       ) THEN
      v_refund_credit_account:='1100';
    ELSIF v_fact.cash_custody='bank' THEN
      v_refund_credit_account:='1010';
    ELSE
      v_refund_credit_account:='1000';
    END IF;

    v_period:=to_char(
      NEW.updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Baghdad',
      'YYYY-MM'
    );

    INSERT INTO public.journal_entries(
      entry_date,period_key,source_type,source_id,event_kind,description,
      total_debit,total_credit,evidence,created_by
    ) VALUES(
      NEW.updated_at AT TIME ZONE 'UTC',
      v_period,
      'return_event',
      NEW.id,
      'return_verification',
      'إثبات مرتجع معتمد للطلب '||NEW.order_id,
      v_total,
      v_total,
      jsonb_build_object(
        'order_id',NEW.order_id,
        'restocked',NEW.restocked,
        'note',NEW.note,
        'packaging_loss_source',NEW.packaging_loss_source
      ),
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

  IF OLD.status='verified' AND NEW.status IS DISTINCT FROM 'verified' THEN
    SELECT id INTO v_original_id
    FROM public.journal_entries
    WHERE source_type='return_event'
      AND source_id=NEW.id
      AND event_kind='return_verification';

    IF v_original_id IS NOT NULL THEN
      SELECT total_debit,period_key INTO v_total,v_period
      FROM public.journal_entries
      WHERE id=v_original_id;

      INSERT INTO public.journal_entries(
        entry_date,period_key,source_type,source_id,event_kind,description,
        total_debit,total_credit,reversal_of_entry_id,evidence,created_by
      ) VALUES(
        clock_timestamp(),
        to_char(clock_timestamp() AT TIME ZONE 'Asia/Baghdad','YYYY-MM'),
        'return_event',NEW.id,'return_reversal','عكس مرتجع معتمد: '||NEW.note,
        v_total,v_total,v_original_id,
        jsonb_build_object('reason',NEW.note,'original_period',v_period),
        NEW.created_by
      )
      ON CONFLICT(source_type,source_id,event_kind) DO NOTHING
      RETURNING id INTO v_entry_id;

      IF v_entry_id IS NOT NULL THEN
        INSERT INTO public.journal_lines(
          entry_id,line_number,account_code,debit,credit,memo,dimensions
        )
        SELECT
          v_entry_id,line_number,account_code,credit,debit,
          'عكس: '||COALESCE(memo,''),dimensions
        FROM public.journal_lines
        WHERE entry_id=v_original_id
        ORDER BY line_number;

        PERFORM public.validate_journal_entry(v_entry_id);
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

UPDATE public.schema_migrations
SET rolled_back_at=now()
WHERE version='0069_accounting_return_integrity'
  AND rolled_back_at IS NULL;

COMMIT;

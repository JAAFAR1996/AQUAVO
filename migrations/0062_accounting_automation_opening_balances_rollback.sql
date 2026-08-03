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

-- Restore the pre-0062 inventory timing function exactly. This rollback is
-- intentionally explicit so operators understand that 'rejected' would again
-- restore stock before physical receipt.
CREATE OR REPLACE FUNCTION public.reverse_order_inventory_on_terminal_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
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
  FOR item_row IN SELECT oi.id,oi.product_id,oi.quantity,oi.metadata FROM order_items_relational oi WHERE oi.order_id=NEW.id LOOP
    IF EXISTS(SELECT 1 FROM inventory_movements WHERE idempotency_key='order_item:'||item_row.id) THEN
      line_variant:=NULLIF(item_row.metadata->>'variantId','');
      INSERT INTO inventory_movements(product_id,variant_id,location_id,quantity_delta,movement_type,source_type,source_id,idempotency_key,currency,happened_at,created_by,metadata)
      VALUES(item_row.product_id,line_variant,main_location,item_row.quantity,'sale_reversal','order_status_reversal',NEW.id,'order_reversal:'||NEW.id||':'||item_row.id,'IQD',now(),'database_trigger',jsonb_build_object('order_id',NEW.id,'order_item_id',item_row.id,'status',NEW.status))
      ON CONFLICT(idempotency_key) DO NOTHING;
    END IF;
  END LOOP;
  RETURN NEW;
END $$;

UPDATE public.schema_migrations
SET rolled_back_at=now(),notes=COALESCE(notes,'')||' [structural rollback; immutable opening entry retained]'
WHERE version='0062_accounting_automation_opening_balances';

COMMIT;

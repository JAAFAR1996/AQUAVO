-- 0066_accounting_reassert_refusal_inventory_after_0062_rollback.sql
-- 0066 is a reassertion of the owner-approved 0065 function after ordering drift.
-- Rolling it back restores the canonical 0065 definition; it must never restore
-- the broader 0062 behavior that conflates warranty returns with COD refusal.
--
-- Two independent preconditions guard that, and BOTH must hold:
--   1. 0065 itself must still be active — otherwise there is no canonical
--      definition to restore and the rollback would reinstate 0062 behaviour.
--   2. every migration layered on top (0067..0070) must already be rolled back —
--      otherwise later objects would be left standing on a reverted base.
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.schema_migrations
    WHERE version='0065_accounting_separate_warranty_from_cod_refusal'
      AND rolled_back_at IS NULL
  ) THEN
    RAISE EXCEPTION '0066_ROLLBACK_BLOCKED: migration 0065 must remain active';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.schema_migrations
    WHERE version IN (
      '0067_orders_client_ip_schema_drift',
      '0068_accounting_delivery_readiness_guard',
      '0069_accounting_return_integrity',
      '0070_accounting_ledger_backed_views',
      '0071_accounting_return_line_identity_and_refund_guard'
    )
      AND rolled_back_at IS NULL
  ) THEN
    RAISE EXCEPTION '0066_ROLLBACK_BLOCKED: roll back migrations 0071 through 0067 first';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.reverse_order_inventory_on_terminal_status()
RETURNS trigger
LANGUAGE plpgsql
AS $inventory_workflow_0065_restore$
DECLARE
  mode text;
  main_location text;
  item_row record;
  line_variant text;
  v_restore_inventory boolean:=false;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;

  IF NEW.status IN ('rejected','rejected_carrier') THEN
    INSERT INTO public.order_inventory_custody_events(
      order_id,custody_state,source_order_status,idempotency_key,metadata
    ) VALUES(
      NEW.id,'carrier_return_pending',NEW.status,
      'order_custody:'||NEW.id||':carrier_return_pending',
      jsonb_build_object('previous_status',OLD.status,'sellable_restored_at_refusal',true)
    ) ON CONFLICT(idempotency_key) DO NOTHING;
  ELSIF NEW.status IN ('rejected_returned','returned')
        AND OLD.status IN ('rejected','rejected_carrier','rejected_returned') THEN
    INSERT INTO public.order_inventory_custody_events(
      order_id,custody_state,source_order_status,idempotency_key,metadata
    ) VALUES(
      NEW.id,'main_received',NEW.status,
      'order_custody:'||NEW.id||':main_received',
      jsonb_build_object('previous_status',OLD.status,'inventory_incremented',false)
    ) ON CONFLICT(idempotency_key) DO NOTHING;
  END IF;

  v_restore_inventory:=
    NEW.status IN ('cancelled','rejected','rejected_carrier','rejected_returned')
    OR (
      NEW.status='returned'
      AND OLD.status IN ('rejected','rejected_carrier','rejected_returned')
    );

  SELECT value INTO mode FROM public.settings WHERE key='inventory_ledger_mode';
  IF COALESCE(mode,'off')<>'enforce' THEN RETURN NEW; END IF;

  IF NOT v_restore_inventory THEN
    IF OLD.status IN ('cancelled','rejected','rejected_carrier','rejected_returned')
       AND NEW.status<>'returned'
       AND EXISTS(
         SELECT 1 FROM public.inventory_movements
         WHERE source_type='order_status_reversal' AND source_id=NEW.id
       ) THEN
      RAISE EXCEPTION 'order % inventory was reversed; reopening requires an explicit inventory workflow',NEW.id;
    END IF;
    RETURN NEW;
  END IF;

  SELECT id INTO main_location
  FROM public.inventory_locations
  WHERE code='MAIN' AND is_active=true LIMIT 1;
  IF main_location IS NULL THEN
    RAISE EXCEPTION 'MAIN inventory location is not configured';
  END IF;

  FOR item_row IN
    SELECT oi.id,oi.product_id,oi.quantity,oi.metadata
    FROM public.order_items_relational oi
    WHERE oi.order_id=NEW.id
  LOOP
    IF EXISTS(
      SELECT 1 FROM public.inventory_movements
      WHERE idempotency_key='order_item:'||item_row.id
    ) THEN
      line_variant:=NULLIF(item_row.metadata->>'variantId','');
      INSERT INTO public.inventory_movements(
        product_id,variant_id,location_id,quantity_delta,movement_type,source_type,
        source_id,idempotency_key,currency,happened_at,created_by,metadata
      ) VALUES(
        item_row.product_id,line_variant,main_location,item_row.quantity,'sale_reversal',
        'order_status_reversal',NEW.id,'order_reversal:'||NEW.id||':'||item_row.id,
        'IQD',clock_timestamp(),'database_trigger',
        jsonb_build_object(
          'order_id',NEW.id,'order_item_id',item_row.id,'status',NEW.status,
          'sellable_restored_at_refusal',NEW.status IN ('rejected','rejected_carrier'),
          'physical_receipt_only',NEW.status='returned'
        )
      ) ON CONFLICT(idempotency_key) DO NOTHING;
    END IF;
  END LOOP;
  RETURN NEW;
END $inventory_workflow_0065_restore$;

UPDATE public.schema_migrations
SET rolled_back_at=clock_timestamp(),
    notes=COALESCE(notes,'')||' [rolled back to canonical 0065 function]'
WHERE version='0066_accounting_reassert_refusal_inventory_after_0062'
  AND rolled_back_at IS NULL;

COMMIT;

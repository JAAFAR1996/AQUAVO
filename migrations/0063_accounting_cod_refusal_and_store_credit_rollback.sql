-- 0063_accounting_cod_refusal_and_store_credit_rollback.sql
-- Restores the exact post-0062 behavior: rejected inventory remains out until
-- physical receipt, and verified return events resume their original stock path.
BEGIN;

-- Restore the 0062 order-status inventory timing function.
CREATE OR REPLACE FUNCTION public.reverse_order_inventory_on_terminal_status()
RETURNS trigger
LANGUAGE plpgsql
AS $inventory_post_0062$
DECLARE
  mode text;
  main_location text;
  item_row record;
  line_variant text;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  SELECT value INTO mode FROM public.settings WHERE key='inventory_ledger_mode';
  IF COALESCE(mode,'off')<>'enforce' THEN RETURN NEW; END IF;

  IF NEW.status NOT IN ('cancelled','rejected_returned','returned') THEN
    IF OLD.status IN ('cancelled','rejected_returned','returned')
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

  FOR item_row IN
    SELECT oi.id,oi.product_id,oi.quantity,oi.metadata
    FROM public.order_items_relational oi WHERE oi.order_id=NEW.id
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
        'IQD',now(),'database_trigger',
        jsonb_build_object('order_id',NEW.id,'order_item_id',item_row.id,'status',NEW.status)
      ) ON CONFLICT(idempotency_key) DO NOTHING;
    END IF;
  END LOOP;
  RETURN NEW;
END $inventory_post_0062$;

-- Restore the 0053 verified-return inventory function.
CREATE OR REPLACE FUNCTION public.apply_verified_return_inventory()
RETURNS trigger
LANGUAGE plpgsql
AS $return_inventory_pre_0063$
DECLARE
  v_cutover timestamptz;
  v_location text;
  elem jsonb;
  v_idx integer:=0;
  v_product text;
  v_variant text;
  v_qty integer;
  v_original_movement text;
BEGIN
  v_cutover:=public.aquavo_active_cutover();
  IF NEW.created_at<(v_cutover AT TIME ZONE 'UTC') THEN RETURN NEW; END IF;
  SELECT id INTO v_location
  FROM public.inventory_locations
  WHERE code='MAIN' AND is_active=true LIMIT 1;
  IF v_location IS NULL THEN RAISE EXCEPTION 'MAIN inventory location is not configured'; END IF;

  IF NEW.status='verified' AND OLD.status IS DISTINCT FROM 'verified' AND NEW.restocked=true THEN
    FOR elem IN SELECT value FROM jsonb_array_elements(COALESCE(NEW.affected_items,'[]'::jsonb)) LOOP
      v_idx:=v_idx+1;
      v_product:=NULLIF(elem->>'productId','');
      v_variant:=NULLIF(COALESCE(elem->>'variantId',elem->>'variant_id'),'');
      v_qty:=COALESCE(NULLIF(elem->>'qty','')::integer,0);
      IF v_product IS NULL OR v_qty<=0 THEN
        RAISE EXCEPTION 'RETURN_INVENTORY_INVALID: event % item %',NEW.id,v_idx;
      END IF;
      INSERT INTO public.inventory_movements(
        product_id,variant_id,location_id,quantity_delta,movement_type,source_type,
        source_id,idempotency_key,unit_cost,currency,happened_at,created_by,metadata
      ) VALUES(
        v_product,v_variant,v_location,v_qty,'sale_reversal','return_event',NEW.id,
        'return_event:'||NEW.id||':'||v_idx,NULLIF(elem->>'cogsAtTime','')::numeric,
        'IQD',COALESCE(NEW.restocked_at,clock_timestamp()),'database_trigger',
        jsonb_build_object('return_event_id',NEW.id,'item',elem)
      ) ON CONFLICT(idempotency_key) DO NOTHING;
    END LOOP;
  END IF;

  IF OLD.status='verified' AND NEW.status IS DISTINCT FROM 'verified' AND OLD.restocked=true THEN
    v_idx:=0;
    FOR elem IN SELECT value FROM jsonb_array_elements(COALESCE(OLD.affected_items,'[]'::jsonb)) LOOP
      v_idx:=v_idx+1;
      v_product:=NULLIF(elem->>'productId','');
      v_variant:=NULLIF(COALESCE(elem->>'variantId',elem->>'variant_id'),'');
      v_qty:=COALESCE(NULLIF(elem->>'qty','')::integer,0);
      SELECT id INTO v_original_movement
      FROM public.inventory_movements
      WHERE idempotency_key='return_event:'||OLD.id||':'||v_idx;
      IF v_original_movement IS NULL THEN
        RAISE EXCEPTION 'RETURN_INVENTORY_REVERSAL_BLOCKED: original movement missing for event % item %',OLD.id,v_idx;
      END IF;
      INSERT INTO public.inventory_movements(
        product_id,variant_id,location_id,quantity_delta,movement_type,source_type,
        source_id,idempotency_key,unit_cost,currency,happened_at,created_by,metadata,
        reversed_movement_id
      ) VALUES(
        v_product,v_variant,v_location,-v_qty,'return_out','return_event_reversal',NEW.id,
        'return_event_reversal:'||NEW.id||':'||v_idx,NULLIF(elem->>'cogsAtTime','')::numeric,
        'IQD',clock_timestamp(),'database_trigger',
        jsonb_build_object('return_event_id',NEW.id,'reason',NEW.note,'item',elem),
        v_original_movement
      ) ON CONFLICT(idempotency_key) DO NOTHING;
    END LOOP;
  END IF;
  RETURN NEW;
END $return_inventory_pre_0063$;

DROP VIEW IF EXISTS public.v_cod_refusal_inventory_exceptions;
DROP VIEW IF EXISTS public.v_cod_refusal_policy_exceptions;

DROP TRIGGER IF EXISTS customer_credit_entries_no_delete ON public.customer_credit_entries;
DROP TRIGGER IF EXISTS customer_credit_entries_no_update ON public.customer_credit_entries;
DROP TRIGGER IF EXISTS customer_credit_entries_guard ON public.customer_credit_entries;
DROP FUNCTION IF EXISTS public.prevent_customer_credit_entry_mutation();
DROP FUNCTION IF EXISTS public.guard_customer_credit_entry();
DROP VIEW IF EXISTS public.v_customer_credit_balances;
DROP TABLE IF EXISTS public.customer_credit_entries;
DROP TABLE IF EXISTS public.customer_credit_accounts;
DELETE FROM public.chart_of_accounts a
WHERE a.code='2300'
  AND NOT EXISTS(SELECT 1 FROM public.journal_lines l WHERE l.account_code=a.code);

DROP TRIGGER IF EXISTS order_return_events_enforce_cod_refusal ON public.order_return_events;
DROP FUNCTION IF EXISTS public.enforce_cod_refusal_return_policy();

DROP VIEW IF EXISTS public.v_order_inventory_custody_latest;
DROP TRIGGER IF EXISTS order_inventory_custody_no_delete ON public.order_inventory_custody_events;
DROP TRIGGER IF EXISTS order_inventory_custody_no_update ON public.order_inventory_custody_events;
DROP FUNCTION IF EXISTS public.prevent_custody_event_mutation();
DROP TABLE IF EXISTS public.order_inventory_custody_events;

UPDATE public.fulfillment_materials
   SET name='ملصق السعر',
       notes='يُحتسب مرة واحدة لكل طلب مهما كان عدد الكراتين',
       updated_at=clock_timestamp()
 WHERE sku='PRICE_LABEL';

UPDATE public.schema_migrations
   SET rolled_back_at=clock_timestamp(),
       notes=COALESCE(notes,'')||' [rolled back to post-0062 behavior]'
 WHERE version='0063_accounting_cod_refusal_and_store_credit'
   AND rolled_back_at IS NULL;

COMMIT;

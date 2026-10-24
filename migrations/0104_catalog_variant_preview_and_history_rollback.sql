-- Guarded rollback: data migration must be separately reversed first.
BEGIN;
SET LOCAL lock_timeout = '5s';
DO $guard$
BEGIN
  IF EXISTS(SELECT 1 FROM public.product_inventory_variant_routes) THEN
    RAISE EXCEPTION '0104_ROLLBACK_BLOCKED: historical inventory routes remain in use';
  END IF;
  IF EXISTS(SELECT 1 FROM public.products p,
      LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(p.variants)='array' THEN p.variants ELSE '[]'::jsonb END) v
      WHERE (v->'price'='null'::jsonb AND v->>'priceStatus'='pending') OR COALESCE((v->>'isArchived')::boolean,false)) THEN
    RAISE EXCEPTION '0104_ROLLBACK_BLOCKED: pending-price or archived variants remain in use';
  END IF;
END $guard$;
CREATE OR REPLACE FUNCTION public.validate_product_variants_json()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$ DECLARE duplicate_ids integer; default_count integer; newly_negative integer; newly_invalid_price integer; BEGIN IF NEW.variants IS NULL THEN RETURN NEW; END IF; IF jsonb_typeof(NEW.variants)<>'array' THEN RAISE EXCEPTION 'product variants must be a JSON array'; END IF; SELECT COUNT(*)-COUNT(DISTINCT x.value->>'id'),COUNT(*) FILTER(WHERE COALESCE((x.value->>'isDefault')::boolean,false)) INTO duplicate_ids,default_count FROM jsonb_array_elements(NEW.variants) x(value) WHERE NULLIF(x.value->>'id','') IS NOT NULL; IF EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.variants) x(value) WHERE NULLIF(x.value->>'id','') IS NULL) THEN RAISE EXCEPTION 'every product variant must have a non-empty id'; END IF; IF duplicate_ids>0 THEN RAISE EXCEPTION 'product variants contain duplicate ids'; END IF; IF default_count>1 THEN RAISE EXCEPTION 'a product can have at most one default variant'; END IF; IF TG_OP='INSERT' THEN SELECT COUNT(*) FILTER(WHERE NULLIF(x.value->>'stock','') IS NULL OR (x.value->>'stock')::numeric<0 OR trunc((x.value->>'stock')::numeric)<>(x.value->>'stock')::numeric),COUNT(*) FILTER(WHERE NULLIF(x.value->>'price','') IS NULL OR (x.value->>'price')::numeric<=0) INTO newly_negative,newly_invalid_price FROM jsonb_array_elements(NEW.variants) x(value); ELSE SELECT COUNT(*) INTO newly_negative FROM jsonb_array_elements(NEW.variants) n(value) WHERE (NULLIF(n.value->>'stock','') IS NULL OR (n.value->>'stock')::numeric<0 OR trunc((n.value->>'stock')::numeric)<>(n.value->>'stock')::numeric) AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(OLD.variants)='array' THEN OLD.variants ELSE '[]'::jsonb END) o(value) WHERE o.value->>'id'=n.value->>'id' AND (NULLIF(o.value->>'stock','') IS NULL OR (o.value->>'stock')::numeric<0 OR trunc((o.value->>'stock')::numeric)<>(o.value->>'stock')::numeric)); SELECT COUNT(*) INTO newly_invalid_price FROM jsonb_array_elements(NEW.variants) n(value) WHERE (NULLIF(n.value->>'price','') IS NULL OR (n.value->>'price')::numeric<=0) AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(OLD.variants)='array' THEN OLD.variants ELSE '[]'::jsonb END) o(value) WHERE o.value->>'id'=n.value->>'id' AND (NULLIF(o.value->>'price','') IS NULL OR (o.value->>'price')::numeric<=0)); END IF; IF newly_negative>0 THEN RAISE EXCEPTION 'new or worsened variant stock must be a non-negative whole number'; END IF; IF newly_invalid_price>0 THEN RAISE EXCEPTION 'new or worsened variant price must be greater than zero'; END IF; RETURN NEW; END; $function$;
CREATE OR REPLACE FUNCTION public.sync_product_variant_reconciliation()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE product_variant_reconciliation
  SET is_active=false,
      is_default=false,
      updated_at=now()
  WHERE product_id=NEW.id;

  INSERT INTO product_variant_reconciliation(
    product_id,variant_id,label,sku,observed_price,observed_original_price,
    observed_stock,is_default,specifications,source_snapshot,
    reconciliation_status,is_active
  )
  SELECT
    NEW.id,
    x.value->>'id',
    COALESCE(NULLIF(x.value->>'label',''),x.value->>'id'),
    NULLIF(x.value->>'sku',''),
    CASE WHEN NULLIF(x.value->>'price','') IS NULL THEN NULL ELSE (x.value->>'price')::numeric END,
    CASE WHEN NULLIF(x.value->>'originalPrice','') IS NULL THEN NULL ELSE (x.value->>'originalPrice')::numeric END,
    CASE WHEN NULLIF(x.value->>'stock','') IS NULL THEN NULL ELSE (x.value->>'stock')::integer END,
    COALESCE((x.value->>'isDefault')::boolean,false),
    COALESCE(x.value->'specifications','{}'::jsonb),
    x.value,
    CASE
      WHEN NULLIF(x.value->>'stock','') IS NOT NULL AND (x.value->>'stock')::integer<0
        THEN 'conflict'
      ELSE 'pending'
    END,
    true
  FROM jsonb_array_elements(
    CASE WHEN jsonb_typeof(NEW.variants)='array' THEN NEW.variants ELSE '[]'::jsonb END
  ) x(value)
  WHERE NULLIF(x.value->>'id','') IS NOT NULL
  ON CONFLICT(product_id,variant_id) DO UPDATE SET
    label=EXCLUDED.label,
    sku=EXCLUDED.sku,
    observed_price=EXCLUDED.observed_price,
    observed_original_price=EXCLUDED.observed_original_price,
    observed_stock=EXCLUDED.observed_stock,
    is_default=EXCLUDED.is_default,
    specifications=EXCLUDED.specifications,
    source_snapshot=EXCLUDED.source_snapshot,
    is_active=true,
    reconciliation_status=CASE
      WHEN product_variant_reconciliation.reconciliation_status='approved'
        THEN product_variant_reconciliation.reconciliation_status
      ELSE EXCLUDED.reconciliation_status
    END,
    updated_at=now();
  RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION public.enforce_product_stock_from_variants()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$ DECLARE variant_sum bigint; BEGIN IF COALESCE(NEW.has_variants,false)=true THEN IF jsonb_typeof(NEW.variants)<>'array' THEN RAISE EXCEPTION 'variant product % must have a variants array',NEW.id; END IF; IF EXISTS (SELECT 1 FROM jsonb_array_elements(NEW.variants) v WHERE NULLIF(v->>'stock','') IS NULL OR (v->>'stock')::numeric<0 OR trunc((v->>'stock')::numeric)<>(v->>'stock')::numeric) THEN RAISE EXCEPTION 'variant stocks for product % must be non-negative whole numbers',NEW.id; END IF; SELECT COALESCE(SUM((v->>'stock')::bigint),0) INTO variant_sum FROM jsonb_array_elements(NEW.variants) v; NEW.stock:=variant_sum::integer; END IF; RETURN NEW; END; $function$;
CREATE OR REPLACE FUNCTION public.apply_verified_return_inventory()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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

  IF NEW.type='rejected_delivery' THEN
    RETURN NEW;
  END IF;

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
END $function$;
CREATE OR REPLACE FUNCTION public.reverse_order_inventory_on_terminal_status()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE mode text;main_location text;item_row record;line_variant text;v_restore_inventory boolean:=false;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  IF COALESCE(NEW.is_test,false) THEN RETURN NEW; END IF;
  IF NEW.status IN ('rejected','rejected_carrier') THEN INSERT INTO public.order_inventory_custody_events(order_id,custody_state,source_order_status,idempotency_key,metadata) VALUES(NEW.id,'carrier_return_pending',NEW.status,'order_custody:'||NEW.id||':carrier_return_pending',jsonb_build_object('previous_status',OLD.status,'sellable_restored_at_refusal',true)) ON CONFLICT(idempotency_key) DO NOTHING;
  ELSIF NEW.status IN ('rejected_returned','returned') AND OLD.status IN ('delivered','rejected','rejected_carrier','rejected_returned') THEN INSERT INTO public.order_inventory_custody_events(order_id,custody_state,source_order_status,idempotency_key,metadata) VALUES(NEW.id,'main_received',NEW.status,'order_custody:'||NEW.id||':main_received',jsonb_build_object('previous_status',OLD.status,'inventory_incremented',OLD.status='delivered')) ON CONFLICT(idempotency_key) DO NOTHING; END IF;
  v_restore_inventory:=NEW.status IN ('cancelled','rejected','rejected_carrier','rejected_returned') OR (NEW.status='returned' AND OLD.status IN ('delivered','rejected','rejected_carrier','rejected_returned'));
  SELECT value INTO mode FROM public.settings WHERE key='inventory_ledger_mode'; IF COALESCE(mode,'off')<>'enforce' THEN RETURN NEW; END IF;
  IF NOT v_restore_inventory THEN IF OLD.status IN ('cancelled','rejected','rejected_carrier','rejected_returned') AND NEW.status<>'returned' AND EXISTS(SELECT 1 FROM public.inventory_movements WHERE source_type='order_status_reversal' AND source_id=NEW.id) THEN RAISE EXCEPTION 'order % inventory was reversed; reopening requires an explicit inventory workflow',NEW.id; END IF; RETURN NEW; END IF;
  SELECT id INTO main_location FROM public.inventory_locations WHERE code='MAIN' AND is_active=true LIMIT 1; IF main_location IS NULL THEN RAISE EXCEPTION 'MAIN inventory location is not configured'; END IF;
  FOR item_row IN SELECT oi.id,oi.product_id,oi.quantity,oi.metadata FROM public.order_items_relational oi WHERE oi.order_id=NEW.id LOOP
    IF EXISTS(SELECT 1 FROM public.inventory_movements WHERE idempotency_key='order_item:'||item_row.id) THEN line_variant:=NULLIF(item_row.metadata->>'variantId',''); INSERT INTO public.inventory_movements(product_id,variant_id,location_id,quantity_delta,movement_type,source_type,source_id,idempotency_key,currency,happened_at,created_by,metadata) VALUES(item_row.product_id,line_variant,main_location,item_row.quantity,'sale_reversal','order_status_reversal',NEW.id,'order_reversal:'||NEW.id||':'||item_row.id,'IQD',clock_timestamp(),'database_trigger',jsonb_build_object('order_id',NEW.id,'order_item_id',item_row.id,'status',NEW.status,'previous_status',OLD.status,'sellable_restored_at_refusal',NEW.status IN ('rejected','rejected_carrier'),'physical_receipt_only',NEW.status IN ('returned','rejected_returned'),'post_delivery_return',OLD.status='delivered')) ON CONFLICT(idempotency_key) DO NOTHING; END IF;
  END LOOP; RETURN NEW;
END
$function$;
DROP FUNCTION public.resolve_historical_inventory_variant(text,text);
DROP TRIGGER product_inventory_variant_route_valid ON public.product_inventory_variant_routes;
DROP FUNCTION public.validate_inventory_variant_route();
DROP TABLE public.product_inventory_variant_routes;
DROP FUNCTION public.catalog_variant_stock_is_valid(jsonb);
DROP FUNCTION public.catalog_variant_price_is_valid(jsonb);
DELETE FROM public.schema_migrations WHERE version='0104_catalog_variant_preview_and_history';
COMMIT;

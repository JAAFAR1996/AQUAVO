-- 0104: Preview-only incoming variants and preserved historical inventory identity.
-- No products, stock, prices, orders or ledger movements are changed by this migration.
-- Register route rows only during an independently audited, net-zero reclassification.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE OR REPLACE FUNCTION public.catalog_variant_price_is_valid(v jsonb)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $body$
DECLARE p numeric; s numeric;
BEGIN
  IF NOT (v ? 'price') THEN RETURN false; END IF;
  IF v->'price'='null'::jsonb THEN
    IF v->>'priceStatus' IS DISTINCT FROM 'pending'
       OR v->>'availabilityStatus' IS DISTINCT FROM 'coming_soon'
       OR NULLIF(v->>'stock','') IS NULL THEN RETURN false; END IF;
    s:=(v->>'stock')::numeric;
    RETURN s=0;
  END IF;
  IF jsonb_typeof(v->'price') NOT IN ('number','string')
     OR NULLIF(v->>'price','') IS NULL THEN RETURN false; END IF;
  p:=(v->>'price')::numeric;
  RETURN p>0 AND p::text NOT IN ('NaN','Infinity','-Infinity');
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
  RETURN false;
END $body$;

CREATE OR REPLACE FUNCTION public.catalog_variant_stock_is_valid(v jsonb)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $body$
DECLARE s numeric;
BEGIN
  IF jsonb_typeof(v->'stock') NOT IN ('number','string')
     OR NULLIF(v->>'stock','') IS NULL THEN RETURN false; END IF;
  s:=(v->>'stock')::numeric;
  RETURN s>=0 AND s=trunc(s) AND s::text NOT IN ('NaN','Infinity','-Infinity');
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
  RETURN false;
END $body$;

CREATE OR REPLACE FUNCTION public.validate_product_variants_json()
RETURNS trigger LANGUAGE plpgsql AS $body$
DECLARE duplicate_ids integer; default_count integer; v jsonb; old_variants jsonb;
BEGIN
  IF NEW.variants IS NULL THEN RETURN NEW; END IF;
  IF jsonb_typeof(NEW.variants)<>'array' THEN
    RAISE EXCEPTION 'product variants must be a JSON array';
  END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.variants) x(value)
            WHERE jsonb_typeof(x.value)<>'object' OR NULLIF(x.value->>'id','') IS NULL) THEN
    RAISE EXCEPTION 'every product variant must have a non-empty id';
  END IF;
  SELECT COUNT(*)-COUNT(DISTINCT x.value->>'id'),
         COUNT(*) FILTER(WHERE COALESCE((x.value->>'isDefault')::boolean,false) AND NOT COALESCE((x.value->>'isArchived')::boolean,false))
  INTO duplicate_ids,default_count FROM jsonb_array_elements(NEW.variants) x(value);
  IF duplicate_ids>0 THEN RAISE EXCEPTION 'product variants contain duplicate ids'; END IF;
  IF default_count>1 THEN RAISE EXCEPTION 'a product can have at most one default variant'; END IF;
  old_variants:='[]'::jsonb;
  IF TG_OP='UPDATE' AND jsonb_typeof(OLD.variants)='array' THEN old_variants:=OLD.variants; END IF;
  FOR v IN SELECT value FROM jsonb_array_elements(NEW.variants) LOOP
    -- Preserve unchanged legacy malformed values, but never introduce or worsen one.
    IF NOT public.catalog_variant_stock_is_valid(v) AND NOT EXISTS(
      SELECT 1 FROM jsonb_array_elements(old_variants) o(value)
      WHERE o.value->>'id'=v->>'id'
        AND NOT public.catalog_variant_stock_is_valid(o.value)
        AND o.value->'stock' IS NOT DISTINCT FROM v->'stock'
    ) THEN RAISE EXCEPTION 'new or worsened variant stock must be a non-negative whole number'; END IF;
    IF NOT public.catalog_variant_price_is_valid(v) AND NOT EXISTS(
      SELECT 1 FROM jsonb_array_elements(old_variants) o(value)
      WHERE o.value->>'id'=v->>'id'
        AND NOT public.catalog_variant_price_is_valid(o.value)
        AND o.value->'price' IS NOT DISTINCT FROM v->'price'
        AND o.value->'stock' IS NOT DISTINCT FROM v->'stock'
        AND o.value->'priceStatus' IS NOT DISTINCT FROM v->'priceStatus'
        AND o.value->'availabilityStatus' IS NOT DISTINCT FROM v->'availabilityStatus'
    ) THEN RAISE EXCEPTION 'new or worsened variant price must be greater than zero or explicitly pending at zero stock'; END IF;
  END LOOP;
  RETURN NEW;
END $body$;

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
    COALESCE((x.value->>'isDefault')::boolean,false) AND NOT COALESCE((x.value->>'isArchived')::boolean,false),
    COALESCE(x.value->'specifications','{}'::jsonb),
    x.value,
    CASE
      WHEN NULLIF(x.value->>'stock','') IS NOT NULL AND (x.value->>'stock')::integer<0
        THEN 'conflict'
      ELSE 'pending'
    END,
    NOT COALESCE((x.value->>'isArchived')::boolean,false)
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
    is_active=EXCLUDED.is_active,
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
AS $function$ DECLARE variant_sum bigint; BEGIN IF COALESCE(NEW.has_variants,false)=true THEN IF jsonb_typeof(NEW.variants)<>'array' THEN RAISE EXCEPTION 'variant product % must have a variants array',NEW.id; END IF; IF EXISTS (SELECT 1 FROM jsonb_array_elements(NEW.variants) v WHERE NULLIF(v->>'stock','') IS NULL OR (v->>'stock')::numeric<0 OR trunc((v->>'stock')::numeric)<>(v->>'stock')::numeric) THEN RAISE EXCEPTION 'variant stocks for product % must be non-negative whole numbers',NEW.id; END IF; SELECT COALESCE(SUM((v->>'stock')::bigint),0) INTO variant_sum FROM jsonb_array_elements(NEW.variants) v WHERE NOT COALESCE((v->>'isArchived')::boolean,false); NEW.stock:=variant_sum::integer; END IF; RETURN NEW; END; $function$;

-- A null/base identity may map to one confirmed current option; concrete legacy
-- variant IDs are never guessed or remapped. Old order facts remain untouched.
CREATE TABLE IF NOT EXISTS public.product_inventory_variant_routes (
  product_id text PRIMARY KEY REFERENCES public.products(id) ON DELETE RESTRICT,
  target_variant_id text NOT NULL CHECK(length(trim(target_variant_id))>0),
  reason text NOT NULL CHECK(length(trim(reason))>=10),
  created_by text NOT NULL CHECK(length(trim(created_by))>0),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE OR REPLACE FUNCTION public.validate_inventory_variant_route()
RETURNS trigger LANGUAGE plpgsql AS $body$
BEGIN
  IF NOT EXISTS(
    SELECT 1 FROM public.products p,
      LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(p.variants)='array' THEN p.variants ELSE '[]'::jsonb END) v
    WHERE p.id=NEW.product_id AND p.has_variants=true
      AND v->>'id'=NEW.target_variant_id
      AND public.catalog_variant_price_is_valid(v) AND v->'price'<>'null'::jsonb
      AND COALESCE(v->>'priceStatus','')<>'pending'
      AND NOT COALESCE((v->>'isArchived')::boolean,false)
  ) THEN RAISE EXCEPTION 'INVENTORY_ROUTE_REQUIRES_CURRENT_CONFIRMED_VARIANT'; END IF;
  IF TG_OP='UPDATE' AND (NEW.product_id IS DISTINCT FROM OLD.product_id OR NEW.target_variant_id IS DISTINCT FROM OLD.target_variant_id) THEN
    RAISE EXCEPTION 'INVENTORY_ROUTE_IDENTITY_IMMUTABLE: use an explicitly reviewed inventory migration';
  END IF;
  RETURN NEW;
END $body$;
DROP TRIGGER IF EXISTS product_inventory_variant_route_valid ON public.product_inventory_variant_routes;
CREATE TRIGGER product_inventory_variant_route_valid BEFORE INSERT OR UPDATE
  ON public.product_inventory_variant_routes FOR EACH ROW
  EXECUTE FUNCTION public.validate_inventory_variant_route();

CREATE OR REPLACE FUNCTION public.resolve_historical_inventory_variant(p_product text,p_variant text)
RETURNS text LANGUAGE plpgsql VOLATILE AS $body$
DECLARE target text;
BEGIN
  IF p_variant IS NOT NULL THEN RETURN p_variant; END IF;
  -- Serialize base-identity returns with catalog conversion before any bucket lock.
  -- Keep this lock and route read as separate statements: after waiting, VOLATILE
  -- uses a fresh READ COMMITTED snapshot for the committed conversion route.
  PERFORM 1 FROM public.products WHERE id=p_product FOR UPDATE;
  SELECT target_variant_id INTO target FROM public.product_inventory_variant_routes WHERE product_id=p_product;
  IF target IS NULL THEN RETURN NULL; END IF;
  IF NOT EXISTS(
    SELECT 1 FROM public.products p,
      LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(p.variants)='array' THEN p.variants ELSE '[]'::jsonb END) v
    WHERE p.id=p_product AND p.has_variants=true AND v->>'id'=target
  ) THEN RAISE EXCEPTION 'HISTORICAL_INVENTORY_ROUTE_TARGET_MISSING: product %',p_product; END IF;
  RETURN target;
END $body$;

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
  v_source_variant text;
  v_original_location text;
  v_original_product text;
  v_original_qty integer;
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
      v_source_variant:=NULLIF(COALESCE(elem->>'variantId',elem->>'variant_id'),'');
      v_variant:=public.resolve_historical_inventory_variant(v_product,v_source_variant);
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
        jsonb_build_object('return_event_id',NEW.id,'item',elem,'historical_variant_id',v_source_variant,'inventory_variant_id',v_variant)
      ) ON CONFLICT(idempotency_key) DO NOTHING;
    END LOOP;
  END IF;

  IF OLD.status='verified' AND NEW.status IS DISTINCT FROM 'verified' AND OLD.restocked=true THEN
    v_idx:=0;
    FOR elem IN SELECT value FROM jsonb_array_elements(COALESCE(OLD.affected_items,'[]'::jsonb)) LOOP
      v_idx:=v_idx+1;
      v_product:=NULLIF(elem->>'productId','');
      v_source_variant:=NULLIF(COALESCE(elem->>'variantId',elem->>'variant_id'),'');
      v_variant:=public.resolve_historical_inventory_variant(v_product,v_source_variant);
      v_qty:=COALESCE(NULLIF(elem->>'qty','')::integer,0);
      SELECT id,variant_id,location_id,product_id,quantity_delta INTO v_original_movement,v_source_variant,v_original_location,v_original_product,v_original_qty
      FROM public.inventory_movements
      WHERE idempotency_key='return_event:'||OLD.id||':'||v_idx;
      IF v_original_movement IS NULL THEN
        RAISE EXCEPTION 'RETURN_INVENTORY_REVERSAL_BLOCKED: original movement missing for event % item %',OLD.id,v_idx;
      END IF;
      IF v_original_product IS DISTINCT FROM v_product OR v_original_qty IS DISTINCT FROM v_qty THEN
        RAISE EXCEPTION 'RETURN_INVENTORY_REVERSAL_BLOCKED: original identity or quantity mismatch';
      END IF;
      -- Reverse the actual posted bucket, not an edited return line. A pre-conversion
      -- base bucket resolves through its audited route after the net-zero transfer.
      v_variant:=public.resolve_historical_inventory_variant(v_product,v_source_variant);
      INSERT INTO public.inventory_movements(
        product_id,variant_id,location_id,quantity_delta,movement_type,source_type,
        source_id,idempotency_key,unit_cost,currency,happened_at,created_by,metadata,
        reversed_movement_id
      ) VALUES(
        v_product,v_variant,v_original_location,-v_qty,'return_out','return_event_reversal',NEW.id,
        'return_event_reversal:'||NEW.id||':'||v_idx,NULLIF(elem->>'cogsAtTime','')::numeric,
        'IQD',clock_timestamp(),'database_trigger',
        jsonb_build_object('return_event_id',NEW.id,'reason',NEW.note,'item',elem,'historical_variant_id',v_source_variant,'inventory_variant_id',v_variant),
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
    IF EXISTS(SELECT 1 FROM public.inventory_movements WHERE idempotency_key='order_item:'||item_row.id) THEN line_variant:=NULLIF(item_row.metadata->>'variantId',''); INSERT INTO public.inventory_movements(product_id,variant_id,location_id,quantity_delta,movement_type,source_type,source_id,idempotency_key,currency,happened_at,created_by,metadata) VALUES(item_row.product_id,public.resolve_historical_inventory_variant(item_row.product_id,line_variant),main_location,item_row.quantity,'sale_reversal','order_status_reversal',NEW.id,'order_reversal:'||NEW.id||':'||item_row.id,'IQD',clock_timestamp(),'database_trigger',jsonb_build_object('order_id',NEW.id,'order_item_id',item_row.id,'historical_variant_id',line_variant,'inventory_variant_id',public.resolve_historical_inventory_variant(item_row.product_id,line_variant),'status',NEW.status,'previous_status',OLD.status,'sellable_restored_at_refusal',NEW.status IN ('rejected','rejected_carrier'),'physical_receipt_only',NEW.status IN ('returned','rejected_returned'),'post_delivery_return',OLD.status='delivered')) ON CONFLICT(idempotency_key) DO NOTHING; END IF;
  END LOOP; RETURN NEW;
END
$function$;

DO $ledger$
DECLARE v_checksum text:=current_setting('aquavo.migration_checksum',true);
BEGIN
  IF v_checksum IS NULL OR v_checksum !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION '0104_REQUIRES_ACTUAL_FILE_SHA256';
  END IF;
  IF EXISTS(SELECT 1 FROM public.schema_migrations
    WHERE version='0104_catalog_variant_preview_and_history' AND checksum IS DISTINCT FROM v_checksum) THEN
    RAISE EXCEPTION '0104_MIGRATION_CHECKSUM_MISMATCH';
  END IF;
  INSERT INTO public.schema_migrations(version,checksum,notes)
  VALUES('0104_catalog_variant_preview_and_history',v_checksum,
    'Explicit zero-stock pending prices, archived reconciliation and audited base-variant historical return routes; no catalog or stock mutations.')
  ON CONFLICT(version) DO NOTHING;
END $ledger$;
COMMIT;

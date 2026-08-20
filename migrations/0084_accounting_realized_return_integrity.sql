-- 0084_accounting_realized_return_integrity
-- Real delivered orders cannot become returned without a same-transaction
-- recorded/restocked FULL return event. Direct delivered -> returned restores
-- product inventory exactly once. First-class test orders are excluded.

BEGIN;

DO $guard$
BEGIN
  IF NOT EXISTS(
    SELECT 1 FROM public.schema_migrations
    WHERE version='0083_production_test_order_isolation'
      AND rolled_back_at IS NULL
  ) THEN
    RAISE EXCEPTION '0084_REQUIRES_ACTIVE_0083_TEST_ORDER_ISOLATION';
  END IF;
END
$guard$;

CREATE OR REPLACE FUNCTION public.reverse_order_inventory_on_terminal_status()
RETURNS trigger
LANGUAGE plpgsql
AS $inventory_workflow_0084$
DECLARE
  mode text;
  main_location text;
  item_row record;
  line_variant text;
  v_restore_inventory boolean:=false;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  IF COALESCE(NEW.is_test,false) THEN RETURN NEW; END IF;

  IF NEW.status IN ('rejected','rejected_carrier') THEN
    INSERT INTO public.order_inventory_custody_events(
      order_id,custody_state,source_order_status,idempotency_key,metadata
    ) VALUES(
      NEW.id,'carrier_return_pending',NEW.status,
      'order_custody:'||NEW.id||':carrier_return_pending',
      jsonb_build_object(
        'previous_status',OLD.status,
        'sellable_restored_at_refusal',true
      )
    ) ON CONFLICT(idempotency_key) DO NOTHING;
  ELSIF NEW.status IN ('rejected_returned','returned')
        AND OLD.status IN ('delivered','rejected','rejected_carrier','rejected_returned') THEN
    INSERT INTO public.order_inventory_custody_events(
      order_id,custody_state,source_order_status,idempotency_key,metadata
    ) VALUES(
      NEW.id,'main_received',NEW.status,
      'order_custody:'||NEW.id||':main_received',
      jsonb_build_object(
        'previous_status',OLD.status,
        'inventory_incremented',OLD.status='delivered'
      )
    ) ON CONFLICT(idempotency_key) DO NOTHING;
  END IF;

  v_restore_inventory:=
    NEW.status IN ('cancelled','rejected','rejected_carrier','rejected_returned')
    OR (
      NEW.status='returned'
      AND OLD.status IN ('delivered','rejected','rejected_carrier','rejected_returned')
    );

  SELECT value INTO mode
  FROM public.settings
  WHERE key='inventory_ledger_mode';

  IF COALESCE(mode,'off')<>'enforce' THEN RETURN NEW; END IF;

  IF NOT v_restore_inventory THEN
    IF OLD.status IN ('cancelled','rejected','rejected_carrier','rejected_returned')
       AND NEW.status<>'returned'
       AND EXISTS(
         SELECT 1 FROM public.inventory_movements
         WHERE source_type='order_status_reversal' AND source_id=NEW.id
       ) THEN
      RAISE EXCEPTION
        'order % inventory was reversed; reopening requires an explicit inventory workflow',
        NEW.id;
    END IF;
    RETURN NEW;
  END IF;

  SELECT id INTO main_location
  FROM public.inventory_locations
  WHERE code='MAIN' AND is_active=true
  LIMIT 1;

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
        item_row.product_id,line_variant,main_location,item_row.quantity,
        'sale_reversal','order_status_reversal',NEW.id,
        'order_reversal:'||NEW.id||':'||item_row.id,'IQD',clock_timestamp(),
        'database_trigger',
        jsonb_build_object(
          'order_id',NEW.id,'order_item_id',item_row.id,'status',NEW.status,
          'previous_status',OLD.status,
          'sellable_restored_at_refusal',NEW.status IN ('rejected','rejected_carrier'),
          'physical_receipt_only',NEW.status IN ('returned','rejected_returned'),
          'post_delivery_return',OLD.status='delivered'
        )
      ) ON CONFLICT(idempotency_key) DO NOTHING;
    END IF;
  END LOOP;

  RETURN NEW;
END
$inventory_workflow_0084$;

CREATE OR REPLACE FUNCTION public.enforce_realized_return_event_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=pg_catalog,public
AS $return_integrity_0084$
BEGIN
  IF COALESCE(NEW.is_test,false) THEN RETURN NEW; END IF;

  IF OLD.status='delivered'
     AND NEW.status IN ('returned','rejected_returned')
     AND NOT EXISTS(
       SELECT 1
       FROM public.order_return_events e
       WHERE e.order_id=NEW.id
         AND e.status IN ('recorded','verified')
         AND COALESCE(e.restocked,false)=true
         AND jsonb_array_length(COALESCE(e.affected_items,'[]'::jsonb))>0
         AND NOT EXISTS(
           SELECT 1
           FROM public.order_items_relational oi
           WHERE oi.order_id=NEW.id
             AND COALESCE((
               SELECT SUM(COALESCE(NULLIF(item->>'qty','')::integer,0))
               FROM jsonb_array_elements(COALESCE(e.affected_items,'[]'::jsonb)) item
               WHERE NULLIF(COALESCE(item->>'orderItemId',item->>'order_item_id'),'')=oi.id
             ),0)<>oi.quantity
         )
     ) THEN
    RAISE EXCEPTION
      'ORDER_RETURN_EVENT_REQUIRED: delivered order % cannot become % without a complete recorded/restocked return event covering every order line in the same transaction',
      NEW.id,NEW.status
      USING ERRCODE='23514';
  END IF;

  RETURN NEW;
END
$return_integrity_0084$;

DROP TRIGGER IF EXISTS orders_realized_return_event_integrity_guard ON public.orders;
CREATE CONSTRAINT TRIGGER orders_realized_return_event_integrity_guard
AFTER UPDATE OF status ON public.orders
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
WHEN (OLD.status='delivered' AND NEW.status IN ('returned','rejected_returned'))
EXECUTE FUNCTION public.enforce_realized_return_event_integrity();

REVOKE ALL ON FUNCTION public.enforce_realized_return_event_integrity() FROM PUBLIC;

-- Never fabricate historical refund/carrier values. If a REAL realized return is
-- already missing its event, create a review item instead. Test orders are excluded.
INSERT INTO public.accounting_review_flags(
  id,category,severity,entity_type,entity_id,title,description,
  detected_value_json,suggested_value_json,status,created_at
)
SELECT
  'return-lifecycle-'||md5(o.id),
  'return_lifecycle_integrity','high','order',o.id,
  'Returned realized order is missing its return event',
  'A financially realized real order is marked returned/rejected_returned but has no recorded or verified return event. Review actual return evidence before period close.',
  jsonb_build_object(
    'order_id',o.id,'order_number',o.order_number,'status',o.status,
    'gross_collected',f.gross_collected,'product_revenue',f.product_revenue,
    'cogs_amount',f.cogs_amount,'recognized_at',f.recognized_at
  ),
  jsonb_build_object(
    'required','reconstruct actual return lifecycle from evidence; never invent refund amounts or carrier deductions'
  ),
  'open',clock_timestamp() AT TIME ZONE 'UTC'
FROM public.orders o
JOIN public.order_accounting_facts f ON f.order_id=o.id
WHERE COALESCE(o.is_test,false)=false
  AND o.status IN ('returned','rejected_returned')
  AND NOT EXISTS(
    SELECT 1 FROM public.order_return_events e
    WHERE e.order_id=o.id AND e.status IN ('recorded','verified')
  )
ON CONFLICT(id) DO NOTHING;

INSERT INTO public.schema_migrations(version,checksum,notes)
VALUES(
  '0084_accounting_realized_return_integrity',
  '0084008400840084008400840084008400840084008400840084008400840084',
  'Protect real delivered-to-returned transitions with idempotent stock reversal plus deferred complete return-event integrity; first-class test orders are excluded'
)
ON CONFLICT(version) DO UPDATE
SET checksum=EXCLUDED.checksum,notes=EXCLUDED.notes,rolled_back_at=NULL,applied_at=now();

COMMIT;

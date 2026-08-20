-- 0083_accounting_realized_return_integrity
-- Close the delivered -> returned integrity gap discovered in production.
--
-- Design goals:
-- 1. A physically received return after delivery restores sellable inventory exactly once.
-- 2. A delivered order cannot finish a transaction in a returned state unless a matching
--    return event was recorded in the same transaction.
-- 3. Existing inconsistent historical rows are surfaced for human review; this migration
--    never invents refund amounts, carrier deductions, or return evidence.
--
-- PostgreSQL constraint triggers are intentionally DEFERRABLE INITIALLY DEFERRED here:
-- the admin transaction changes orders.status first and creates/verifies the return event
-- later in the same transaction. The invariant is checked at transaction end.

BEGIN;

CREATE OR REPLACE FUNCTION public.reverse_order_inventory_on_terminal_status()
RETURNS trigger
LANGUAGE plpgsql
AS $inventory_workflow_0083$
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
    -- A sale reversal is valid only for a line that really had a canonical sale
    -- movement. The idempotency key makes retries/status replays harmless.
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
          'order_id',NEW.id,
          'order_item_id',item_row.id,
          'status',NEW.status,
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
$inventory_workflow_0083$;

-- Enforce the cross-table lifecycle invariant at COMMIT time. This catches direct SQL,
-- forgotten side routes, and future code paths that change the order status without
-- recording the return lifecycle. It deliberately does not create financial evidence.
CREATE OR REPLACE FUNCTION public.enforce_realized_return_event_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $return_integrity_0083$
BEGIN
  IF OLD.status='delivered'
     AND NEW.status IN ('returned','rejected_returned')
     AND NOT EXISTS(
       SELECT 1
       FROM public.order_return_events e
       WHERE e.order_id=NEW.id
         AND e.status IN ('recorded','verified')
         AND COALESCE(e.restocked,false)=true
     ) THEN
    RAISE EXCEPTION
      'ORDER_RETURN_EVENT_REQUIRED: delivered order % cannot become % without a recorded/restocked return event in the same transaction',
      NEW.id,NEW.status
      USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END
$return_integrity_0083$;

DROP TRIGGER IF EXISTS orders_realized_return_event_integrity_guard ON public.orders;
CREATE CONSTRAINT TRIGGER orders_realized_return_event_integrity_guard
AFTER UPDATE OF status ON public.orders
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
WHEN (
  OLD.status='delivered'
  AND NEW.status IN ('returned','rejected_returned')
)
EXECUTE FUNCTION public.enforce_realized_return_event_integrity();

REVOKE ALL ON FUNCTION public.enforce_realized_return_event_integrity() FROM PUBLIC;

-- Surface pre-existing inconsistencies instead of fabricating a historical return.
-- The accounting team must reconstruct the real event from carrier/customer evidence.
INSERT INTO public.accounting_review_flags(
  id,category,severity,entity_type,entity_id,title,description,
  detected_value_json,suggested_value_json,status,created_at
)
SELECT
  'return-lifecycle-'||md5(o.id),
  'return_lifecycle_integrity',
  'high',
  'order',
  o.id,
  'Returned realized order is missing its return event',
  'A financially realized order is currently marked returned/rejected_returned but has no recorded or verified return event. Inventory, revenue reversal, carrier deduction, and refund evidence must be reviewed before period close.',
  jsonb_build_object(
    'order_id',o.id,
    'order_number',o.order_number,
    'status',o.status,
    'gross_collected',f.gross_collected,
    'product_revenue',f.product_revenue,
    'cogs_amount',f.cogs_amount,
    'recognized_at',f.recognized_at
  ),
  jsonb_build_object(
    'required','reconstruct the actual return lifecycle from evidence; create/verify the return event through the supported accounting workflow and reconcile inventory/GL without inventing amounts'
  ),
  'open',
  clock_timestamp() AT TIME ZONE 'UTC'
FROM public.orders o
JOIN public.order_accounting_facts f ON f.order_id=o.id
WHERE o.status IN ('returned','rejected_returned')
  AND NOT EXISTS(
    SELECT 1
    FROM public.order_return_events e
    WHERE e.order_id=o.id
      AND e.status IN ('recorded','verified')
  )
ON CONFLICT(id) DO NOTHING;

INSERT INTO public.schema_migrations(version,checksum,notes)
VALUES(
  '0083_accounting_realized_return_integrity',
  '0083008300830083008300830083008300830083008300830083008300830083',
  'Protect delivered-to-returned transitions with idempotent stock reversal plus a deferred cross-table return-event invariant; surface historical gaps for human review'
)
ON CONFLICT(version) DO UPDATE
SET checksum=EXCLUDED.checksum,
    notes=EXCLUDED.notes,
    rolled_back_at=NULL,
    applied_at=now();

COMMIT;

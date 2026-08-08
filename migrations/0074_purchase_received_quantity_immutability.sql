-- 0074_purchase_received_quantity_immutability
-- Prevent direct mutation of purchase_order_items.received_quantity after receipt/accounting starts.
-- Legitimate post/reversal flows are authorized by a short-lived transaction-local context armed
-- only by the canonical inventory movement they create immediately before updating the PO item.
-- No historical financial data is changed by this migration.

BEGIN;

CREATE OR REPLACE FUNCTION public.arm_purchase_received_quantity_internal_context()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_item_id text;
  v_receipt_status text;
  v_fact_exists boolean;
  v_reversal_exists boolean;
BEGIN
  IF NEW.source_type='goods_receipt_item'
     AND NEW.movement_type='purchase_receipt'
     AND NEW.quantity_delta>0 THEN
    SELECT gri.purchase_order_item_id,
           gr.status,
           EXISTS(
             SELECT 1
             FROM public.purchase_accounting_facts f
             WHERE f.goods_receipt_id=gr.id
           )
      INTO v_item_id,v_receipt_status,v_fact_exists
      FROM public.goods_receipt_items gri
      JOIN public.goods_receipts gr ON gr.id=gri.goods_receipt_id
     WHERE gri.id=NEW.source_id
       AND gri.product_id=NEW.product_id
       AND gri.variant_id IS NOT DISTINCT FROM NEW.variant_id
       AND (NEW.metadata->>'goods_receipt_id' IS NULL OR NEW.metadata->>'goods_receipt_id'=gr.id)
     LIMIT 1;

    IF v_item_id IS NOT NULL
       AND v_receipt_status='verified'
       AND NOT COALESCE(v_fact_exists,false) THEN
      PERFORM set_config('aquavo.purchase_received_quantity_mode','post_goods_receipt',true);
      PERFORM set_config('aquavo.purchase_received_quantity_movement_id',NEW.id,true);
    END IF;

  ELSIF NEW.source_type='goods_receipt_reversal'
        AND NEW.movement_type='manual_adjustment'
        AND NEW.quantity_delta<0
        AND NEW.reversed_movement_id IS NOT NULL THEN
    SELECT gri.purchase_order_item_id,
           gr.status,
           EXISTS(
             SELECT 1
             FROM public.purchase_accounting_facts f
             WHERE f.goods_receipt_id=gr.id
           ),
           EXISTS(
             SELECT 1
             FROM public.purchase_accounting_reversals r
             JOIN public.purchase_accounting_facts f ON f.id=r.purchase_accounting_fact_id
             WHERE f.goods_receipt_id=gr.id
           )
      INTO v_item_id,v_receipt_status,v_fact_exists,v_reversal_exists
      FROM public.inventory_movements original
      JOIN public.goods_receipt_items gri
        ON original.source_type='goods_receipt_item'
       AND original.source_id=gri.id
      JOIN public.goods_receipts gr ON gr.id=gri.goods_receipt_id
     WHERE original.id=NEW.reversed_movement_id
       AND NEW.source_id=gr.id
       AND original.product_id=NEW.product_id
       AND original.variant_id IS NOT DISTINCT FROM NEW.variant_id
     LIMIT 1;

    IF v_item_id IS NOT NULL
       AND v_receipt_status='posted'
       AND COALESCE(v_fact_exists,false)
       AND NOT COALESCE(v_reversal_exists,false) THEN
      PERFORM set_config('aquavo.purchase_received_quantity_mode','reverse_posted_goods_receipt',true);
      PERFORM set_config('aquavo.purchase_received_quantity_movement_id',NEW.id,true);
    END IF;
  END IF;

  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.clear_purchase_received_quantity_internal_context()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.received_quantity IS DISTINCT FROM OLD.received_quantity THEN
    PERFORM set_config('aquavo.purchase_received_quantity_mode','',true);
    PERFORM set_config('aquavo.purchase_received_quantity_movement_id','',true);
  END IF;
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.guard_accounted_purchase_order_item_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_accounted boolean;
  v_has_receipt_movement boolean;
  v_mode text;
  v_movement_id text;
  v_context_item_id text;
  v_context_delta numeric;
BEGIN
  SELECT EXISTS(
    SELECT 1
    FROM public.purchase_accounting_facts f
    JOIN public.goods_receipt_items gri ON gri.goods_receipt_id=f.goods_receipt_id
    WHERE gri.purchase_order_item_id=OLD.id
  ) INTO v_accounted;

  SELECT EXISTS(
    SELECT 1
    FROM public.goods_receipt_items gri
    JOIN public.inventory_movements im
      ON im.source_type='goods_receipt_item'
     AND im.source_id=gri.id
    WHERE gri.purchase_order_item_id=OLD.id
  ) INTO v_has_receipt_movement;

  IF NEW.received_quantity IS DISTINCT FROM OLD.received_quantity
     AND (COALESCE(v_accounted,false) OR COALESCE(v_has_receipt_movement,false)) THEN
    v_mode:=COALESCE(current_setting('aquavo.purchase_received_quantity_mode',true),'');
    v_movement_id:=COALESCE(current_setting('aquavo.purchase_received_quantity_movement_id',true),'');
    v_context_item_id:=NULL;
    v_context_delta:=NULL;

    IF v_mode='post_goods_receipt' AND v_movement_id<>'' THEN
      SELECT gri.purchase_order_item_id,im.quantity_delta::numeric
        INTO v_context_item_id,v_context_delta
        FROM public.inventory_movements im
        JOIN public.goods_receipt_items gri ON gri.id=im.source_id
        JOIN public.goods_receipts gr ON gr.id=gri.goods_receipt_id
       WHERE im.id=v_movement_id
         AND im.source_type='goods_receipt_item'
         AND im.movement_type='purchase_receipt'
         AND im.quantity_delta>0
         AND gri.product_id=im.product_id
         AND gri.variant_id IS NOT DISTINCT FROM im.variant_id
         AND gr.status='verified'
         AND NOT EXISTS(
           SELECT 1 FROM public.purchase_accounting_facts f WHERE f.goods_receipt_id=gr.id
         )
       LIMIT 1;

    ELSIF v_mode='reverse_posted_goods_receipt' AND v_movement_id<>'' THEN
      SELECT gri.purchase_order_item_id,rev.quantity_delta::numeric
        INTO v_context_item_id,v_context_delta
        FROM public.inventory_movements rev
        JOIN public.inventory_movements original ON original.id=rev.reversed_movement_id
        JOIN public.goods_receipt_items gri
          ON original.source_type='goods_receipt_item'
         AND original.source_id=gri.id
        JOIN public.goods_receipts gr ON gr.id=gri.goods_receipt_id
        JOIN public.purchase_accounting_facts f ON f.goods_receipt_id=gr.id
       WHERE rev.id=v_movement_id
         AND rev.source_type='goods_receipt_reversal'
         AND rev.movement_type='manual_adjustment'
         AND rev.quantity_delta<0
         AND rev.source_id=gr.id
         AND original.product_id=rev.product_id
         AND original.variant_id IS NOT DISTINCT FROM rev.variant_id
         AND gr.status='posted'
         AND NOT EXISTS(
           SELECT 1
           FROM public.purchase_accounting_reversals r
           WHERE r.purchase_accounting_fact_id=f.id
         )
       LIMIT 1;
    END IF;

    IF v_context_item_id IS DISTINCT FROM OLD.id
       OR v_context_delta IS NULL
       OR NEW.received_quantity-OLD.received_quantity IS DISTINCT FROM v_context_delta THEN
      RAISE EXCEPTION 'ACCOUNTED_PURCHASE_ORDER_ITEM_RECEIVED_QUANTITY_IMMUTABLE: use post_goods_receipt or reverse_posted_goods_receipt'
        USING ERRCODE='55000';
    END IF;
  END IF;

  IF COALESCE(v_accounted,false) THEN
    IF NEW.product_id IS DISTINCT FROM OLD.product_id
       OR NEW.variant_id IS DISTINCT FROM OLD.variant_id
       OR NEW.ordered_quantity IS DISTINCT FROM OLD.ordered_quantity
       OR NEW.unit_cost IS DISTINCT FROM OLD.unit_cost
       OR NEW.line_total IS DISTINCT FROM OLD.line_total
       OR NEW.supplier_product_id IS DISTINCT FROM OLD.supplier_product_id THEN
      RAISE EXCEPTION 'ACCOUNTED_PURCHASE_ORDER_ITEM_IMMUTABLE: reverse posted receipt before changing economic fields'
        USING ERRCODE='55000';
    END IF;
  END IF;

  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS inventory_movements_received_quantity_context ON public.inventory_movements;
CREATE TRIGGER inventory_movements_received_quantity_context
AFTER INSERT ON public.inventory_movements
FOR EACH ROW EXECUTE FUNCTION public.arm_purchase_received_quantity_internal_context();

DROP TRIGGER IF EXISTS purchase_order_items_accounted_immutable ON public.purchase_order_items;
CREATE TRIGGER purchase_order_items_accounted_immutable
BEFORE UPDATE ON public.purchase_order_items
FOR EACH ROW EXECUTE FUNCTION public.guard_accounted_purchase_order_item_mutation();

DROP TRIGGER IF EXISTS purchase_order_items_received_quantity_context_clear ON public.purchase_order_items;
CREATE TRIGGER purchase_order_items_received_quantity_context_clear
AFTER UPDATE OF received_quantity ON public.purchase_order_items
FOR EACH ROW EXECUTE FUNCTION public.clear_purchase_received_quantity_internal_context();

INSERT INTO public.schema_migrations(version,checksum,notes)
VALUES(
  '0074_purchase_received_quantity_immutability',
  '0074007400740074007400740074007400740074007400740074007400740074',
  'Prevent direct mutation of accounted purchase_order_items.received_quantity while preserving canonical goods-receipt post/reversal flows'
)
ON CONFLICT(version) DO UPDATE
SET checksum=EXCLUDED.checksum,
    notes=EXCLUDED.notes,
    rolled_back_at=NULL,
    applied_at=now();

COMMIT;

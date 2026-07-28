-- ============================================================================
-- ROLLBACK for add_orderitem_backfill_trigger_safety.sql
-- ============================================================================
-- EXECUTION CONTRACT (mandatory)
--   No top-level BEGIN / COMMIT / ROLLBACK. The EXECUTOR owns the transaction
--   and MUST submit the complete file through one write-capable transactional
--   call:  BEGIN;  <entire file>  COMMIT;      -- on any error: ROLLBACK;
--
-- WHAT THIS DOES
--   Restores record_order_item_inventory_sale() and
--   prevent_unsafe_order_dependency_mutation() to their EXACT original bodies
--   as captured verbatim (pg_get_functiondef) in
--   docs/audit/orderitem-trigger-forensics.md §2, byte-for-byte — the two
--   CREATE OR REPLACE statements below reproduce that captured $function$...
--   $function$ text with NOT ONE CHARACTER changed. This is independently
--   verifiable: SHA-256 of pg_get_functiondef(oid) for each function after
--   this rollback must equal the fingerprint recorded in that forensics doc
--   (c14f31465132476698f4f587cc15849bf3a535f919eab51dd0c0ab35f45dee3c and
--   98c626552eb4fe75728dc7c64648e2a50b952f9503dd4b7060550d8e5219f631).
--
--   Also drops orderitem_trigger_safety_audit — the ONLY new object this
--   workstream introduced (the forward migration touches no other table:
--   it does not alter orderitem_backfill_batches or any table owned by
--   another migration). Dropping it here returns the schema, for THESE TWO
--   objects, byte-for-byte to its pre-migration state.
--
-- This file does not touch orderitem_backfill_batches, order_items_relational
-- rows, or any other table. It only ever un-does what
-- add_orderitem_backfill_trigger_safety.sql did.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.record_order_item_inventory_sale()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$ DECLARE mode text; main_location text; line_variant text; BEGIN SELECT value INTO mode FROM settings WHERE key='inventory_ledger_mode'; IF COALESCE(mode,'off')<>'enforce' THEN RETURN NEW; END IF; SELECT id INTO main_location FROM inventory_locations WHERE code='MAIN' AND is_active=true LIMIT 1; IF main_location IS NULL THEN RAISE EXCEPTION 'MAIN inventory location is not configured'; END IF; line_variant:=NULLIF(NEW.metadata->>'variantId',''); INSERT INTO inventory_movements(product_id,variant_id,location_id,quantity_delta,movement_type,source_type,source_id,idempotency_key,currency,happened_at,created_by,metadata) VALUES (NEW.product_id,line_variant,main_location,-NEW.quantity,'sale','order_line',NEW.order_id,'order_item:'||NEW.id,'IQD',now(),'database_trigger',jsonb_build_object('order_id',NEW.order_id,'order_item_id',NEW.id)) ON CONFLICT(idempotency_key) DO NOTHING; RETURN NEW; END; $function$
;

CREATE OR REPLACE FUNCTION public.prevent_unsafe_order_dependency_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$ DECLARE old_order_id text; new_order_id text; BEGIN old_order_id:=to_jsonb(OLD)->>TG_ARGV[0]; IF TG_OP='UPDATE' THEN new_order_id:=to_jsonb(NEW)->>TG_ARGV[0]; IF old_order_id IS NOT DISTINCT FROM new_order_id THEN RETURN NEW; END IF; END IF; IF old_order_id IS NOT NULL AND NOT order_is_hard_deletable(old_order_id) THEN RAISE EXCEPTION 'order % is audited and its dependent records cannot be removed or detached',old_order_id; END IF; IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW; END; $function$
;

DROP TABLE IF EXISTS orderitem_trigger_safety_audit;

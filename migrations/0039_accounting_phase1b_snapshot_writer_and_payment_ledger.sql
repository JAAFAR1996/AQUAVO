-- =============================================================================
-- 0039_accounting_phase1b_snapshot_writer_and_payment_ledger
-- =============================================================================
-- GOVERNANCE RECOVERY FILE — reconstructed from LIVE Production definitions.
--
-- This migration was applied to Production on 2026-07-30T15:19:58.891Z by
-- neondb_owner and recorded in public.schema_migrations with checksum
--   7b76a29582d293d8413b32205afb38400f35faa06127d1a67f40c75f2ea30b11
-- but its SQL file was never committed to git. This file restores the file
-- side of that record. It does NOT re-apply anything to Production.
--
-- HOW THIS CONTENT WAS DERIVED (no guessing, no invention):
--   Base   : br-late-thunder-a42sjx9q  "backup-before-accounting-phase1b-20260730"
--            created 2026-07-30T15:18:39Z — 79 seconds BEFORE 0039 was applied.
--   Compare: br-patient-mouse-a4d4cgr4  "production" (post-0039).
--   Method : catalog signature diff (tables / columns / functions / triggers /
--            constraints / indexes) over both branches, then verbatim
--            extraction of the differing objects with pg_get_functiondef(),
--            pg_get_triggerdef() and pg_get_viewdef().
--
--   Diff result (read-only, 2026-07-31):
--     tables       250 -> 250   identical hash
--     constraints  843 -> 843   identical hash
--     indexes      767 -> 767   identical hash
--     columns     3369 -> 3386  (+17 = the 17 columns of the new VIEW below)
--     functions    193 -> 194   (+1 = write_order_item_financial_snapshots)
--     triggers      48 -> 49    (+1 = order_items_b_write_financial_snapshots)
--     settings     payment_ledger_enabled 'false' -> 'true'
--                  financial_snapshot_writer_enabled  absent -> 'true'
--
-- IDEMPOTENCY CONTRACT
--   Running this file against Production performs NO change:
--     * CREATE OR REPLACE FUNCTION  -> byte-identical body, no-op
--     * trigger creation is guarded -> already present, skipped
--     * CREATE OR REPLACE VIEW      -> byte-identical definition, no-op
--     * settings writes are guarded -> already at target values, no-op
--   Running it against a branch cut before 0039 reproduces the exact state.
--
-- ROLLBACK: 0039_accounting_phase1b_snapshot_writer_and_payment_ledger_rollback.sql
-- =============================================================================

BEGIN;

-- 1) Snapshot writer -----------------------------------------------------------
-- Freezes sale-price and cost snapshots on NEW order lines only. Gated by the
-- settings flag so it is inert until explicitly enabled. NULL cost stays NULL —
-- never coerced to 0.
CREATE OR REPLACE FUNCTION public.write_order_item_financial_snapshots()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_enabled text;
  v_order_source text;
  v_order_created timestamp without time zone;
  v_product record;
  v_variant jsonb;
  v_variant_id text;
  v_variant_cost numeric;
  v_variant_cost_status text;
  v_unit_cost numeric;
  v_packaging_cost numeric;
  v_insert_cost numeric;
  v_cost_confidence text;
  v_list_unit numeric;
  v_final_unit numeric;
  v_discount numeric;
  v_cost_resolved boolean;
  v_packaging_resolved boolean;
  v_insert_resolved boolean;
  v_variant_cost_resolved boolean;
BEGIN
  SELECT value INTO v_enabled FROM public.settings WHERE key='financial_snapshot_writer_enabled';
  IF COALESCE(v_enabled,'false')<>'true' THEN RETURN NEW; END IF;
  IF NEW.quantity IS NULL OR NEW.quantity<=0 THEN RAISE EXCEPTION 'financial snapshot writer requires a positive quantity for order item %',NEW.id; END IF;
  IF NEW.price_at_purchase IS NULL OR NEW.price_at_purchase<0 OR NEW.total_price IS NULL OR NEW.total_price<0 THEN RAISE EXCEPTION 'financial snapshot writer requires non-negative sale amounts for order item %',NEW.id; END IF;
  SELECT o.source,o.created_at INTO v_order_source,v_order_created FROM public.orders o WHERE o.id=NEW.order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'financial snapshot writer could not find order %',NEW.order_id; END IF;
  SELECT p.* INTO v_product FROM public.products p WHERE p.id=NEW.product_id AND p.deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'financial snapshot writer could not find active product %',NEW.product_id; END IF;
  v_list_unit:=NEW.price_at_purchase;
  v_final_unit:=NEW.total_price/NEW.quantity;
  IF v_final_unit>v_list_unit THEN RAISE EXCEPTION 'final unit price % exceeds list unit price % for order item %',v_final_unit,v_list_unit,NEW.id; END IF;
  v_discount:=v_list_unit-v_final_unit;
  NEW.unit_sale_price_snapshot:=v_list_unit;
  NEW.discount_snapshot:=v_discount;
  NEW.final_unit_sale_price_snapshot:=v_final_unit;
  NEW.sale_price_snapshot_at:=COALESCE(v_order_created,now());
  NEW.sale_price_source:=CASE WHEN lower(COALESCE(v_order_source,''))='website' THEN 'product_current' ELSE 'manual' END;
  v_variant_id:=NULLIF(NEW.metadata->>'variantId','');
  IF v_variant_id IS NOT NULL AND jsonb_typeof(v_product.variants)='array' THEN SELECT e INTO v_variant FROM jsonb_array_elements(v_product.variants) e WHERE e->>'id'=v_variant_id LIMIT 1; END IF;
  IF v_variant IS NOT NULL THEN
    v_variant_cost:=CASE WHEN NULLIF(v_variant->>'costPrice','') IS NULL THEN NULL ELSE (v_variant->>'costPrice')::numeric END;
    v_variant_cost_status:=NULLIF(v_variant->>'costStatus','');
  END IF;
  v_cost_resolved:=COALESCE(v_product.cost_price_resolution,'') IN ('known','verified_zero');
  v_packaging_resolved:=COALESCE(v_product.packaging_cost_resolution,'') IN ('known','verified_zero');
  v_insert_resolved:=COALESCE(v_product.insert_cost_resolution,'') IN ('known','verified_zero');
  v_variant_cost_resolved:=v_variant_id IS NULL OR (v_variant_cost IS NOT NULL AND v_variant_cost_status='verified_derived');
  IF v_variant_id IS NOT NULL AND v_variant_cost IS NOT NULL AND v_variant_cost_status='verified_derived' THEN
    v_unit_cost:=v_variant_cost; v_cost_confidence:='medium';
  ELSIF v_cost_resolved AND v_product.cost_price IS NOT NULL THEN
    v_unit_cost:=v_product.cost_price; v_cost_confidence:=CASE WHEN v_variant_id IS NULL THEN 'medium' ELSE 'low' END;
  ELSE
    v_unit_cost:=NULL; v_cost_confidence:=NULL;
  END IF;
  v_packaging_cost:=CASE WHEN v_packaging_resolved THEN v_product.packaging_cost ELSE NULL END;
  v_insert_cost:=CASE WHEN v_insert_resolved THEN v_product.insert_cost ELSE NULL END;
  NEW.unit_cost_price:=v_unit_cost;
  NEW.unit_packaging_cost:=v_packaging_cost;
  NEW.unit_insert_cost:=v_insert_cost;
  NEW.cost_snapshot_version:=1;
  NEW.cost_snapshot_at:=COALESCE(v_order_created,now());
  IF v_unit_cost IS NULL THEN
    NEW.cost_snapshot_status:='unknown'; NEW.cost_snapshot_source:='none'; NEW.cost_snapshot_confidence:=NULL;
  ELSIF v_cost_resolved AND v_packaging_resolved AND v_insert_resolved AND v_variant_cost_resolved THEN
    NEW.cost_snapshot_status:='exact'; NEW.cost_snapshot_source:='product_current'; NEW.cost_snapshot_confidence:='high';
  ELSE
    NEW.cost_snapshot_status:='incomplete'; NEW.cost_snapshot_source:='product_current'; NEW.cost_snapshot_confidence:=v_cost_confidence;
  END IF;
  RETURN NEW;
END;
$function$;

-- 2) Trigger (BEFORE INSERT only — historical rows are never touched) ----------
-- Guarded rather than DROP/CREATE so a re-run against Production is a true no-op.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relname = 'order_items_relational'
       AND t.tgname  = 'order_items_b_write_financial_snapshots'
       AND NOT t.tgisinternal
  ) THEN
    CREATE TRIGGER order_items_b_write_financial_snapshots
      BEFORE INSERT ON public.order_items_relational
      FOR EACH ROW EXECUTE FUNCTION write_order_item_financial_snapshots();
  END IF;
END $$;

-- 3) Readiness view (17 columns) ------------------------------------------------
-- Reports operational-accounting readiness and keeps TAX FINAL fail-closed by
-- naming the primary blocker.
CREATE OR REPLACE VIEW public.accounting_readiness_status AS
 WITH line_stats AS (
         SELECT count(*) AS total_lines,
            count(*) FILTER (WHERE oi.unit_sale_price_snapshot IS NOT NULL AND oi.discount_snapshot IS NOT NULL AND oi.final_unit_sale_price_snapshot IS NOT NULL AND oi.sale_price_snapshot_at IS NOT NULL AND oi.sale_price_source IS NOT NULL) AS sale_snapshot_lines,
            count(*) FILTER (WHERE oi.cost_snapshot_status = 'exact'::text) AS exact_cost_lines,
            count(*) FILTER (WHERE o.status = 'delivered'::text AND o.financially_counted IS TRUE) AS realized_lines,
            count(*) FILTER (WHERE o.status = 'delivered'::text AND o.financially_counted IS TRUE AND oi.cost_snapshot_status = 'exact'::text) AS realized_exact_cost_lines,
            count(*) FILTER (WHERE o.status = 'delivered'::text AND o.financially_counted IS TRUE AND oi.unit_sale_price_snapshot IS NOT NULL AND oi.discount_snapshot IS NOT NULL AND oi.final_unit_sale_price_snapshot IS NOT NULL AND oi.sale_price_snapshot_at IS NOT NULL AND oi.sale_price_source IS NOT NULL) AS realized_sale_snapshot_lines
           FROM order_items_relational oi
             JOIN orders o ON o.id = oi.order_id
        ), product_stats AS (
         SELECT count(*) AS active_products,
            count(*) FILTER (WHERE products.cost_price_resolution = ANY (ARRAY['known'::text, 'verified_zero'::text])) AS product_cost_resolved,
            count(*) FILTER (WHERE products.packaging_cost_resolution = ANY (ARRAY['known'::text, 'verified_zero'::text])) AS packaging_cost_resolved,
            count(*) FILTER (WHERE products.insert_cost_resolution = ANY (ARRAY['known'::text, 'verified_zero'::text])) AS insert_cost_resolved
           FROM products
          WHERE products.deleted_at IS NULL
        ), settings_state AS (
         SELECT max(settings.value) FILTER (WHERE settings.key = 'inventory_ledger_mode'::text) AS inventory_ledger_mode,
            max(settings.value) FILTER (WHERE settings.key = 'payment_ledger_enabled'::text) AS payment_ledger_enabled,
            max(settings.value) FILTER (WHERE settings.key = 'financial_snapshot_writer_enabled'::text) AS snapshot_writer_enabled
           FROM settings
        )
 SELECT now() AS checked_at,
    s.inventory_ledger_mode,
    s.payment_ledger_enabled,
    s.snapshot_writer_enabled,
    l.total_lines,
    l.sale_snapshot_lines,
    l.exact_cost_lines,
    l.realized_lines,
    l.realized_exact_cost_lines,
    l.realized_sale_snapshot_lines,
    p.active_products,
    p.product_cost_resolved,
    p.packaging_cost_resolved,
    p.insert_cost_resolved,
    s.inventory_ledger_mode = 'enforce'::text AND s.payment_ledger_enabled = 'true'::text AND s.snapshot_writer_enabled = 'true'::text AS operational_accounting_ready,
    l.realized_lines > 0 AND l.realized_exact_cost_lines = l.realized_lines AND l.realized_sale_snapshot_lines = l.realized_lines AND p.packaging_cost_resolved = p.active_products AND p.insert_cost_resolved = p.active_products AS tax_report_ready,
        CASE
            WHEN l.realized_exact_cost_lines <> l.realized_lines THEN 'historical_realized_lines_lack_exact_cost_snapshots'::text
            WHEN l.realized_sale_snapshot_lines <> l.realized_lines THEN 'historical_realized_lines_lack_sale_price_snapshots'::text
            WHEN p.packaging_cost_resolved <> p.active_products THEN 'packaging_cost_evidence_incomplete'::text
            WHEN p.insert_cost_resolved <> p.active_products THEN 'insert_cost_evidence_incomplete'::text
            ELSE NULL::text
        END AS primary_tax_blocker
   FROM line_stats l
     CROSS JOIN product_stats p
     CROSS JOIN settings_state s;

-- 4) Operational flags ----------------------------------------------------------
-- Guarded so a re-run against Production writes nothing (values already match).
UPDATE public.settings
   SET value = 'true', updated_at = now()
 WHERE key = 'payment_ledger_enabled' AND value IS DISTINCT FROM 'true';

INSERT INTO public.settings (key, value)
SELECT 'financial_snapshot_writer_enabled', 'true'
 WHERE NOT EXISTS (SELECT 1 FROM public.settings WHERE key = 'financial_snapshot_writer_enabled');

UPDATE public.settings
   SET value = 'true', updated_at = now()
 WHERE key = 'financial_snapshot_writer_enabled' AND value IS DISTINCT FROM 'true';

-- NOTE: public.schema_migrations is deliberately NOT written here. The 0039 row
-- already exists in Production with its original checksum and applied_at. This
-- file is a git-governance recovery, not a re-application. When applying to a
-- FRESH branch that has no 0039 row, register it with:
--   INSERT INTO public.schema_migrations (version, checksum, applied_by, notes)
--   VALUES ('0039_accounting_phase1b_snapshot_writer_and_payment_ledger',
--           '7b76a29582d293d8413b32205afb38400f35faa06127d1a67f40c75f2ea30b11',
--           current_user, 'recovered file, applied to test branch');

COMMIT;

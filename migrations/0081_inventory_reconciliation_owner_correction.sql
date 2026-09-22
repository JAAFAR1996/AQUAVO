-- 0081_inventory_reconciliation_owner_correction
-- Owner-confirmed operational correction only. No tax configuration/state changes.
-- The 2026-07-30 zeroing was erroneous; current quantities existed before the 2026-08-01 cutover.
-- Preserve the historical movement trail; restore verified YEE variant costs and align GL inventory to owned inventory.

BEGIN;

DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.schema_migrations
    WHERE version='0080_accounting_operational_hardening'
      AND rolled_back_at IS NULL
  ) THEN
    RAISE EXCEPTION '0081_REQUIRES_ACTIVE_0080_ACCOUNTING_OPERATIONAL_HARDENING';
  END IF;
END
$do$;

-- Verified cost authority captured immutably on 2026-08-08 before the later
-- inventory-source unification accidentally dropped costPrice from these variants.
DO $do$
DECLARE
  v_missing bigint;
  v_changed_after_baseline bigint;
BEGIN
  WITH expected(variant_id,unit_cost_iqd) AS (VALUES
    ('35cube'::text,12200::numeric),
    ('40cube'::text,16400::numeric),
    ('40x23'::text,8920::numeric),
    ('50x27'::text,13820::numeric),
    ('60x30'::text,17780::numeric),
    ('60x40'::text,25800::numeric)
  )
  SELECT COUNT(*)
    INTO v_missing
  FROM expected e
  LEFT JOIN public.inventory_valuation_baseline_lines b
    ON b.baseline_id='aquavo-current-inventory-baseline-20260808-final'
   AND b.product_id='yee-06255'
   AND b.variant_id=e.variant_id
   AND b.unit_cost_iqd=e.unit_cost_iqd
  WHERE b.id IS NULL;

  IF v_missing<>0 THEN
    RAISE EXCEPTION '0081_VERIFIED_YEE_COST_BASELINE_MISMATCH: %',v_missing;
  END IF;

  SELECT COUNT(*)
    INTO v_changed_after_baseline
  FROM public.inventory_cost_events e
  WHERE e.product_id='yee-06255'
    AND e.created_at>'2026-08-08T15:02:13.716Z'::timestamptz;

  IF v_changed_after_baseline<>0 THEN
    RAISE EXCEPTION '0081_YEE_COST_CHANGED_AFTER_VERIFIED_BASELINE: %',v_changed_after_baseline;
  END IF;
END
$do$;

-- Restore only missing costPrice fields from the immutable verified baseline.
-- If a non-null current cost disagrees with that baseline, fail instead of overwriting it.
DO $do$
DECLARE
  v_conflicts bigint;
BEGIN
  WITH expected(variant_id,unit_cost_iqd) AS (VALUES
    ('35cube'::text,12200::numeric),
    ('40cube'::text,16400::numeric),
    ('40x23'::text,8920::numeric),
    ('50x27'::text,13820::numeric),
    ('60x30'::text,17780::numeric),
    ('60x40'::text,25800::numeric)
  ), current_variants AS (
    SELECT v.elem->>'id' AS variant_id,NULLIF(v.elem->>'costPrice','')::numeric AS cost_price
    FROM public.products p
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(p.variants,'[]'::jsonb)) v(elem)
    WHERE p.id='yee-06255'
  )
  SELECT COUNT(*)
    INTO v_conflicts
  FROM expected e
  LEFT JOIN current_variants c ON c.variant_id=e.variant_id
  WHERE c.variant_id IS NULL
     OR (c.cost_price IS NOT NULL AND c.cost_price<>e.unit_cost_iqd);

  IF v_conflicts<>0 THEN
    RAISE EXCEPTION '0081_YEE_CURRENT_COST_CONFLICT: %',v_conflicts;
  END IF;
END
$do$;

WITH expected AS (
  SELECT variant_id,unit_cost_iqd
  FROM public.inventory_valuation_baseline_lines
  WHERE baseline_id='aquavo-current-inventory-baseline-20260808-final'
    AND product_id='yee-06255'
), rebuilt AS (
  SELECT jsonb_agg(
    CASE
      WHEN e.unit_cost_iqd IS NOT NULL AND NULLIF(v.elem->>'costPrice','') IS NULL
        THEN jsonb_set(v.elem,'{costPrice}',to_jsonb(e.unit_cost_iqd),true)
      ELSE v.elem
    END
    ORDER BY v.ord
  ) AS variants
  FROM public.products p
  CROSS JOIN LATERAL jsonb_array_elements(p.variants) WITH ORDINALITY AS v(elem,ord)
  LEFT JOIN expected e ON e.variant_id=v.elem->>'id'
  WHERE p.id='yee-06255'
)
UPDATE public.products p
SET variants=rebuilt.variants,
    updated_at=clock_timestamp()
FROM rebuilt
WHERE p.id='yee-06255';

-- Prove the current quantities are the owner-confirmed quantities and that the
-- canonical inventory ledger agrees with the storefront/product state.
DO $do$
DECLARE
  v_variant_mismatch bigint;
  v_global_stock_mismatch bigint;
BEGIN
  WITH expected(variant_id,qty) AS (VALUES
    ('35cube'::text,2::numeric),
    ('40cube'::text,2::numeric),
    ('40x23'::text,0::numeric),
    ('50x27'::text,1::numeric),
    ('60x30'::text,1::numeric),
    ('60x40'::text,2::numeric)
  ), current_variants AS (
    SELECT v.elem->>'id' AS variant_id,(v.elem->>'stock')::numeric AS qty
    FROM public.products p
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(p.variants,'[]'::jsonb)) v(elem)
    WHERE p.id='yee-06255'
  )
  SELECT COUNT(*)
    INTO v_variant_mismatch
  FROM expected e
  LEFT JOIN current_variants c ON c.variant_id=e.variant_id
  WHERE c.variant_id IS NULL OR c.qty<>e.qty;

  IF v_variant_mismatch<>0 THEN
    RAISE EXCEPTION '0081_OWNER_CONFIRMED_YEE_QUANTITY_MISMATCH: %',v_variant_mismatch;
  END IF;

  WITH main AS (
    SELECT id FROM public.inventory_locations WHERE code='MAIN' AND is_active=true LIMIT 1
  ), ledger AS (
    SELECT im.product_id,im.variant_id,SUM(im.quantity_delta)::numeric qty
    FROM public.inventory_movements im,main
    WHERE im.location_id=main.id
    GROUP BY im.product_id,im.variant_id
  ), current_keys AS (
    SELECT p.id product_id,NULL::text variant_id,p.stock::numeric qty
    FROM public.products p
    WHERE p.deleted_at IS NULL AND COALESCE(p.has_variants,false)=false
    UNION ALL
    SELECT p.id,v->>'id',(v->>'stock')::numeric
    FROM public.products p
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(p.variants,'[]'::jsonb)) v
    WHERE p.deleted_at IS NULL AND COALESCE(p.has_variants,false)=true
  )
  SELECT COUNT(*) FILTER (WHERE ck.qty<>COALESCE(l.qty,0))
    INTO v_global_stock_mismatch
  FROM current_keys ck
  LEFT JOIN ledger l
    ON l.product_id=ck.product_id
   AND l.variant_id IS NOT DISTINCT FROM ck.variant_id;

  IF v_global_stock_mismatch<>0 THEN
    RAISE EXCEPTION '0081_CANONICAL_STOCK_MISMATCH: %',v_global_stock_mismatch;
  END IF;
END
$do$;

-- Dynamic owned-inventory reconciliation. Main stock plus inventory already
-- removed for active unrealized orders must equal GL 1200 after the correction.
CREATE OR REPLACE VIEW public.v_accounting_inventory_asset_reconciliation AS
WITH current_keys AS (
  SELECT p.id product_id,NULL::text variant_id,p.stock::numeric quantity,p.cost_price::numeric unit_cost
  FROM public.products p
  WHERE p.deleted_at IS NULL AND COALESCE(p.has_variants,false)=false
  UNION ALL
  SELECT p.id,v->>'id',(v->>'stock')::numeric,NULLIF(v->>'costPrice','')::numeric
  FROM public.products p
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(p.variants,'[]'::jsonb)) v
  WHERE p.deleted_at IS NULL AND COALESCE(p.has_variants,false)=true
), on_hand AS (
  SELECT COUNT(*) FILTER (WHERE unit_cost IS NULL) AS missing_current_costs,
         COALESCE(SUM(quantity*unit_cost),0)::numeric AS on_hand_inventory_iqd
  FROM current_keys
), unrealized AS (
  SELECT COUNT(*) FILTER (WHERE oi.unit_cost_price IS NULL) AS missing_unrealized_costs,
         COALESCE(SUM(oi.quantity*oi.unit_cost_price),0)::numeric AS unrealized_order_inventory_iqd
  FROM public.orders o
  JOIN public.order_items_relational oi ON oi.order_id=o.id
  WHERE lower(COALESCE(o.status,'')) IN ('pending','confirmed','processing','shipped')
    AND COALESCE(o.financially_counted,false)=false
    AND NOT EXISTS(SELECT 1 FROM public.order_accounting_facts f WHERE f.order_id=o.id)
    AND EXISTS(
      SELECT 1
      FROM public.inventory_movements im
      WHERE im.source_type='order_line'
        AND im.source_id=o.id
        AND im.movement_type='sale'
    )
), gl AS (
  SELECT COALESCE(SUM(jl.debit-jl.credit),0)::numeric AS gl_inventory_iqd
  FROM public.journal_entries je
  JOIN public.journal_lines jl ON jl.entry_id=je.id
  WHERE jl.account_code='1200'
)
SELECT
  on_hand.missing_current_costs,
  unrealized.missing_unrealized_costs,
  on_hand.on_hand_inventory_iqd,
  unrealized.unrealized_order_inventory_iqd,
  gl.gl_inventory_iqd,
  (on_hand.on_hand_inventory_iqd+unrealized.unrealized_order_inventory_iqd-gl.gl_inventory_iqd)::numeric AS difference_iqd
FROM on_hand,unrealized,gl;

COMMENT ON VIEW public.v_accounting_inventory_asset_reconciliation IS
'Owned product inventory reconciliation: current on-hand stock plus inventory removed for active unrealized orders must equal GL account 1200. Missing costs are explicit and never replaced with zero.';

DO $do$
DECLARE
  v_batch_effect numeric;
  v_missing_current bigint;
  v_missing_unrealized bigint;
  v_gap numeric;
  v_entry text;
BEGIN
  WITH expected AS (
    SELECT variant_id,unit_cost_iqd
    FROM public.inventory_valuation_baseline_lines
    WHERE baseline_id='aquavo-current-inventory-baseline-20260808-final'
      AND product_id='yee-06255'
  )
  SELECT COALESCE(SUM(im.quantity_delta*e.unit_cost_iqd),0)
    INTO v_batch_effect
  FROM public.inventory_movements im
  JOIN expected e ON e.variant_id=im.variant_id
  WHERE im.product_id='yee-06255'
    AND im.source_type='owner_stock_reconciliation'
    AND im.source_id='INVENTORY-UNIFY-20260817';

  IF v_batch_effect<>131480 THEN
    RAISE EXCEPTION '0081_YEE_RECONCILIATION_VALUE_MISMATCH: %',v_batch_effect;
  END IF;

  SELECT missing_current_costs,missing_unrealized_costs,difference_iqd
    INTO v_missing_current,v_missing_unrealized,v_gap
  FROM public.v_accounting_inventory_asset_reconciliation;

  IF v_missing_current<>0 OR v_missing_unrealized<>0 THEN
    RAISE EXCEPTION '0081_INVENTORY_COST_EVIDENCE_INCOMPLETE: current=% unrealized=%',v_missing_current,v_missing_unrealized;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.journal_entries
    WHERE source_type='inventory_reconciliation'
      AND source_id='INVENTORY-UNIFY-20260817'
      AND event_kind='pre_cutover_owned_inventory_valuation_correction'
  ) THEN
    IF v_gap<>131480 THEN
      RAISE EXCEPTION '0081_PRE_CORRECTION_GL_GAP_MISMATCH: %',v_gap;
    END IF;

    INSERT INTO public.journal_entries(
      entry_date,period_key,source_type,source_id,event_kind,description,
      total_debit,total_credit,evidence,created_by
    )
    VALUES(
      clock_timestamp(),
      to_char(clock_timestamp() AT TIME ZONE 'Asia/Baghdad','YYYY-MM'),
      'inventory_reconciliation',
      'INVENTORY-UNIFY-20260817',
      'pre_cutover_owned_inventory_valuation_correction',
      'تصحيح قيمة مخزون مملوك قبل 1 آب بعد إلغاء تصفير مخزون خاطئ',
      131480,131480,
      jsonb_build_object(
        'ownership','confirmed_pre_cutover',
        'adjustment_iqd',131480,
        'classification','opening_equity_inventory_correction',
        'pnl_impact_iqd',0,
        'correction_batch','INVENTORY-UNIFY-20260817',
        'owner_confirmation','التصفير بتاريخ 2026-07-30 كان خطأ والمخزون الحالي هو الصحيح',
        'verified_cost_source','aquavo-current-inventory-baseline-20260808-final',
        'pre_correction_inventory_gap_iqd',v_gap
      ),
      'owner:Jaafar'
    )
    RETURNING id INTO v_entry;

    INSERT INTO public.journal_lines(entry_id,line_number,account_code,debit,credit,memo,dimensions)
    VALUES(
      v_entry,1,'1200',131480,0,
      'زيادة قيمة مخزون المنتجات المملوك قبل القطع بعد تصحيح التصفير الخاطئ',
      jsonb_build_object('batch','INVENTORY-UNIFY-20260817','classification','pre_cutover_owned_inventory')
    );

    INSERT INTO public.journal_lines(entry_id,line_number,account_code,debit,credit,memo,dimensions)
    VALUES(
      v_entry,2,'3100',0,131480,
      'تصحيح رأس مال المالك مقابل مخزون مملوك قبل 1 آب لم يكن ممثلاً بالكامل في الدفتر',
      jsonb_build_object('batch','INVENTORY-UNIFY-20260817','classification','opening_equity_inventory_correction')
    );

    PERFORM public.validate_journal_entry(v_entry);
  END IF;
END
$do$;

INSERT INTO public.accounting_manual_adjustments(
  id,entity_type,entity_id,field_name,old_value_json,new_value_json,reason,
  status,created_by,approved_by,created_at,approved_at,applied_at,note
)
SELECT
  'inventory-unify-20260817-valuation-correction',
  'inventory_reconciliation',
  'INVENTORY-UNIFY-20260817',
  'gl_inventory_valuation',
  jsonb_build_object('status','unresolved_owner_provenance'),
  jsonb_build_object('adjustment_iqd',131480,'debit_account','1200','credit_account','3100'),
  'Owner confirmed the 2026-07-30 zeroing was erroneous; current quantities existed before 2026-08-01. Verified YEE costs were restored from the immutable 2026-08-08 valuation baseline.',
  'applied','owner:Jaafar','owner:Jaafar',clock_timestamp(),clock_timestamp(),clock_timestamp(),
  'No P&L effect. Historical zeroing/reconciliation movements are preserved for audit.'
WHERE NOT EXISTS(
  SELECT 1 FROM public.accounting_manual_adjustments
  WHERE id='inventory-unify-20260817-valuation-correction'
);

UPDATE public.accounting_review_flags
SET status='resolved',
    resolved_at=COALESCE(resolved_at,clock_timestamp()),
    resolved_by=COALESCE(resolved_by,'owner:Jaafar'),
    description=CASE
      WHEN description ILIKE '%Resolved 2026-08-18:%' THEN description
      ELSE description||' Resolved 2026-08-18: owner confirmed the 2026-07-30 zeroing was erroneous and current quantities existed before cutover. 131,480 IQD posted as inventory/opening-equity correction; six YEE variant costs restored from immutable 2026-08-08 verified baseline.'
    END
WHERE id='inventory-reconciliation-bdea88802ce3a265d6bd62e01578b4fe';

DO $do$
DECLARE
  v_missing_current bigint;
  v_missing_unrealized bigint;
  v_gap numeric;
BEGIN
  SELECT missing_current_costs,missing_unrealized_costs,difference_iqd
    INTO v_missing_current,v_missing_unrealized,v_gap
  FROM public.v_accounting_inventory_asset_reconciliation;

  IF v_missing_current<>0 OR v_missing_unrealized<>0 OR v_gap<>0 THEN
    RAISE EXCEPTION '0081_POST_CORRECTION_INVENTORY_RECONCILIATION_FAILED: current=% unrealized=% gap=%',
      v_missing_current,v_missing_unrealized,v_gap;
  END IF;

  IF EXISTS(
    SELECT 1 FROM public.accounting_review_flags
    WHERE id='inventory-reconciliation-bdea88802ce3a265d6bd62e01578b4fe'
      AND status='open'
  ) THEN
    RAISE EXCEPTION '0081_REVIEW_FLAG_STILL_OPEN';
  END IF;
END
$do$;

INSERT INTO public.schema_migrations(version,checksum,notes)
VALUES(
  '0081_inventory_reconciliation_owner_correction',
  '0081008100810081008100810081008100810081008100810081008100810081',
  'Owner-confirmed pre-cutover inventory correction: restore six verified YEE variant costs, debit inventory 1200 / credit owner equity 3100 by 131,480 IQD, resolve review flag, and expose owned-inventory reconciliation view'
)
ON CONFLICT(version) DO UPDATE
SET checksum=EXCLUDED.checksum,
    notes=EXCLUDED.notes,
    rolled_back_at=NULL,
    applied_at=now();

COMMIT;

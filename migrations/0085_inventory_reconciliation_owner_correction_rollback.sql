-- Audited rollback for 0085_inventory_reconciliation_owner_correction.
-- Journal history is append-only: reverse the correction instead of deleting it.
-- Variant costs are cleared only when they still equal the immutable baseline and
-- no newer YEE cost event exists after 0085 was applied.

BEGIN;

DO $do$
DECLARE
  v_applied_at timestamptz;
  v_original text;
  v_reversal text;
BEGIN
  SELECT applied_at INTO v_applied_at
  FROM public.schema_migrations
  WHERE version='0085_inventory_reconciliation_owner_correction'
    AND rolled_back_at IS NULL;

  IF v_applied_at IS NULL THEN
    RAISE EXCEPTION '0085_ROLLBACK_REQUIRES_ACTIVE_MIGRATION';
  END IF;

  IF EXISTS(
    SELECT 1
    FROM public.inventory_cost_events e
    WHERE e.product_id='yee-06255'
      AND e.created_at>v_applied_at
  ) THEN
    RAISE EXCEPTION
      '0085_ROLLBACK_BLOCKED: newer YEE cost evidence exists after the migration';
  END IF;

  SELECT id INTO v_original
  FROM public.journal_entries
  WHERE source_type='inventory_reconciliation'
    AND source_id='INVENTORY-UNIFY-20260817'
    AND event_kind='pre_cutover_owned_inventory_valuation_correction'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_original IS NOT NULL
     AND NOT EXISTS(
       SELECT 1 FROM public.journal_entries
       WHERE reversal_of_entry_id=v_original
     ) THEN
    INSERT INTO public.journal_entries(
      entry_date,period_key,source_type,source_id,event_kind,description,
      total_debit,total_credit,reversal_of_entry_id,evidence,created_by
    )
    SELECT
      clock_timestamp(),
      to_char(clock_timestamp() AT TIME ZONE 'Asia/Baghdad','YYYY-MM'),
      'inventory_reconciliation_rollback',
      v_original,
      'journal_reversal',
      'عكس تصحيح تقييم مخزون YEE رقم 0085',
      total_debit,total_credit,v_original,
      jsonb_build_object(
        'rollback_of','0085_inventory_reconciliation_owner_correction',
        'original_entry_id',v_original,
        'reason','explicit migration rollback'
      ),
      'system:migration_rollback'
    FROM public.journal_entries
    WHERE id=v_original
    RETURNING id INTO v_reversal;

    INSERT INTO public.journal_lines(
      entry_id,line_number,account_code,debit,credit,memo,dimensions
    )
    SELECT
      v_reversal,line_number,account_code,credit,debit,
      'عكس 0085: '||COALESCE(memo,''),dimensions
    FROM public.journal_lines
    WHERE entry_id=v_original
    ORDER BY line_number;

    PERFORM public.validate_journal_entry(v_reversal);
  END IF;
END
$do$;

-- Restore only the six values that 0085 filled from the immutable baseline.
WITH expected AS (
  SELECT variant_id,unit_cost_iqd
  FROM public.inventory_valuation_baseline_lines
  WHERE baseline_id='aquavo-current-inventory-baseline-20260808-final'
    AND product_id='yee-06255'
), rebuilt AS (
  SELECT jsonb_agg(
    CASE
      WHEN e.variant_id IS NOT NULL
       AND NULLIF(v.elem->>'costPrice','')::numeric=e.unit_cost_iqd
        THEN v.elem-'costPrice'
      ELSE v.elem
    END
    ORDER BY v.ord
  ) AS variants
  FROM public.products p
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(p.variants,'[]'::jsonb))
    WITH ORDINALITY AS v(elem,ord)
  LEFT JOIN expected e ON e.variant_id=v.elem->>'id'
  WHERE p.id='yee-06255'
)
UPDATE public.products p
SET variants=rebuilt.variants,
    updated_at=clock_timestamp()
FROM rebuilt
WHERE p.id='yee-06255';

DROP VIEW IF EXISTS public.v_accounting_inventory_asset_reconciliation;

UPDATE public.accounting_review_flags
SET status='open',
    resolved_at=NULL,
    resolved_by=NULL,
    description=description||' Rollback 0085: inventory valuation correction was explicitly reversed and requires renewed review.'
WHERE id='inventory-reconciliation-bdea88802ce3a265d6bd62e01578b4fe';

UPDATE public.schema_migrations
SET rolled_back_at=clock_timestamp(),
    notes=COALESCE(notes,'')||' | Audited rollback: correction journal reversed, review reopened, baseline-filled YEE costs cleared only when unchanged.'
WHERE version='0085_inventory_reconciliation_owner_correction'
  AND rolled_back_at IS NULL;

COMMIT;

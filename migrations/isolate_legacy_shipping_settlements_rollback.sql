-- ============================================================================
-- ROLLBACK for isolate_legacy_shipping_settlements.sql
--
-- Moves `archive.shipping_settlements` back to `public`, unchanged.
-- NO ROW IS DELETED, NO VALUE IS MODIFIED — this is the exact inverse of the
-- forward migration.
--
-- NOTE: restoring the table does NOT restore it as a financial source. The
-- accounting code reads carrier money exclusively from cash_settlements
-- (status='reconciled'); this rollback only undoes the schema move.
--
-- Idempotent: re-running is a no-op.
-- ============================================================================

BEGIN;

DO $$
DECLARE
  archived_rows bigint;
  restored_rows bigint;
BEGIN
  -- Already back in public → nothing to do.
  IF to_regclass('public.shipping_settlements') IS NOT NULL
     AND to_regclass('archive.shipping_settlements') IS NULL THEN
    RAISE NOTICE 'shipping_settlements already in public — no action taken.';
    RETURN;
  END IF;

  IF to_regclass('archive.shipping_settlements') IS NULL THEN
    RAISE NOTICE 'archive.shipping_settlements does not exist — nothing to roll back.';
    RETURN;
  END IF;

  -- Both exist: refuse rather than merge or overwrite live data.
  IF to_regclass('public.shipping_settlements') IS NOT NULL THEN
    RAISE EXCEPTION
      'public.shipping_settlements already exists while archive.shipping_settlements is still present. Resolve manually — this rollback will not merge or overwrite.';
  END IF;

  EXECUTE 'SELECT count(*) FROM archive.shipping_settlements' INTO archived_rows;

  ALTER TABLE archive.shipping_settlements SET SCHEMA public;

  EXECUTE 'SELECT count(*) FROM public.shipping_settlements' INTO restored_rows;

  IF restored_rows <> archived_rows THEN
    RAISE EXCEPTION
      'Row count changed during rollback: % before, % after. Aborting.',
      archived_rows, restored_rows;
  END IF;

  RAISE NOTICE 'Restored shipping_settlements: % row(s) moved intact.', restored_rows;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.shipping_settlements') IS NOT NULL THEN
    EXECUTE $c$
      COMMENT ON TABLE public.shipping_settlements IS
        'LEGACY operational carrier-payment log. Under-records real cash — NOT a financial source of truth. Carrier money comes from cash_settlements WHERE status = ''reconciled''.'
    $c$;
  END IF;
END
$$;

-- The archive schema is left in place: it may hold other retired tables, and
-- dropping it here could destroy data this rollback never created.

COMMIT;

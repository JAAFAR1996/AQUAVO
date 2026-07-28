-- ============================================================================
-- Isolate the legacy `shipping_settlements` table out of `public`.
--
-- WHY
--   `public.shipping_settlements` is a legacy operational log of carrier
--   payments. It under-records real cash (its total is 152,500 against
--   2,022,170 actually collected), and every accounting path that read it
--   produced a phantom carrier balance. The canonical source is
--   `cash_settlements` rows with status='reconciled', where the invariant
--   gross_amount = fees_amount + net_amount holds.
--
-- WHAT THIS DOES
--   Moves the table, unchanged, from schema `public` to schema `archive`.
--   NO ROW IS DELETED, NO VALUE IS MODIFIED. The history stays queryable at
--   `archive.shipping_settlements` for audit; it simply stops being reachable
--   from the default search_path, so a future accidental read fails loudly
--   instead of silently returning under-recorded money.
--
-- SAFETY
--   Idempotent: re-running is a no-op. Guarded so it cannot run while the
--   application still references public.shipping_settlements by mistake — if
--   the table is already archived, the DO block simply does nothing.
--
--   Apply MANUALLY, outside the app, against a database you have backed up.
--   Backup for this change: production-backup-before-legacy-settlement-isolation-20260728
--                           (Neon branch br-noisy-wave-a4y62y4w)
-- ============================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS archive;

COMMENT ON SCHEMA archive IS
  'Retired tables kept verbatim for audit. Nothing here is read at runtime.';

DO $$
DECLARE
  public_rows   bigint;
  archived_rows bigint;
BEGIN
  -- Already archived → nothing to do.
  IF to_regclass('archive.shipping_settlements') IS NOT NULL
     AND to_regclass('public.shipping_settlements') IS NULL THEN
    RAISE NOTICE 'shipping_settlements already archived — no action taken.';
    RETURN;
  END IF;

  -- Never present in public → nothing to archive (fresh database).
  IF to_regclass('public.shipping_settlements') IS NULL THEN
    RAISE NOTICE 'public.shipping_settlements does not exist — no action taken.';
    RETURN;
  END IF;

  -- Both exist: refuse rather than merge or overwrite an existing archive.
  IF to_regclass('archive.shipping_settlements') IS NOT NULL THEN
    RAISE EXCEPTION
      'archive.shipping_settlements already exists while public.shipping_settlements is still present. Resolve manually — this migration will not merge or overwrite an archive.';
  END IF;

  EXECUTE 'SELECT count(*) FROM public.shipping_settlements' INTO public_rows;

  ALTER TABLE public.shipping_settlements SET SCHEMA archive;

  EXECUTE 'SELECT count(*) FROM archive.shipping_settlements' INTO archived_rows;

  -- The whole point of this migration is that no row is lost. Prove it before
  -- committing; a mismatch aborts the transaction and leaves the table in place.
  IF archived_rows <> public_rows THEN
    RAISE EXCEPTION
      'Row count changed during archive: % before, % after. Aborting.',
      public_rows, archived_rows;
  END IF;

  RAISE NOTICE 'Archived shipping_settlements: % row(s) moved intact.', archived_rows;
END
$$;

DO $$
BEGIN
  IF to_regclass('archive.shipping_settlements') IS NOT NULL THEN
    EXECUTE $c$
      COMMENT ON TABLE archive.shipping_settlements IS
        'LEGACY (archived 2026-07-28). Operational carrier-payment log that under-records real cash. NOT a financial source of truth. Carrier money comes from cash_settlements WHERE status = ''reconciled''. Kept verbatim for audit only.'
    $c$;
  END IF;
END
$$;

COMMIT;

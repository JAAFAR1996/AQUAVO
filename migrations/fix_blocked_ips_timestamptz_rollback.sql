-- Rollback for fix_blocked_ips_timestamptz.sql — idempotent, fail-closed.
--
-- Reverts the four columns from `timestamptz` back to `timestamp` (WITHOUT time
-- zone), reversing the exact transformation the forward migration applied:
--     forward:  timestamp  --(AT TIME ZONE 'UTC')-->  timestamptz   (attach UTC)
--     rollback: timestamptz --(AT TIME ZONE 'UTC')-->  timestamp     (drop to UTC wall-clock)
-- `<tstz> AT TIME ZONE 'UTC'` yields the UTC wall-clock as a tz-less timestamp —
-- i.e. the byte-identical naked value that was stored before the forward run.
-- The round trip is loss-free for every row.
--
-- WARNING: this reinstates the F-8 read skew (tz-less columns misread as local
-- +03:00) and the app-side JS-clock comparison it feeds. Only roll back if the
-- forward migration must be undone; the application code expects timestamptz.
--
-- EXECUTION CONTRACT: no top-level BEGIN/COMMIT — the executor owns the
-- transaction and submits this whole file inside one.

DO $revert$
DECLARE
  target RECORD;
BEGIN
  FOR target IN
    SELECT * FROM (VALUES
      ('blocked_ips',    'expires_at'),
      ('blocked_ips',    'blocked_at'),
      ('blocked_ips',    'created_at'),
      ('login_attempts', 'created_at')
    ) AS t(tbl, col)
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name  = target.tbl
        AND column_name = target.col
        AND data_type   = 'timestamp with time zone'
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ALTER COLUMN %I TYPE timestamp USING %I AT TIME ZONE ''UTC''',
        target.tbl, target.col, target.col
      );
    END IF;
  END LOOP;
END
$revert$;

COMMENT ON COLUMN blocked_ips.expires_at IS 'null = حظر دائم';

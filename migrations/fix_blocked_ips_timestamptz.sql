-- ============================================================================
-- F-8 (HIGH): blocked_ips.expires_at read back with a +03:00 skew, so expired
--             temporary IP blocks never lift — a 5-minute lockout becomes
--             effectively PERMANENT and produced a real 429.
-- ============================================================================
-- EXECUTION CONTRACT (mandatory)
--   This file contains NO top-level BEGIN / COMMIT / ROLLBACK. The EXECUTOR owns
--   the transaction and MUST submit the complete file through one write-capable
--   transactional call:
--       BEGIN;  <entire file>  COMMIT;      -- on any error: ROLLBACK;
--
-- THE DEFECT (root cause: timestamp-vs-timestamptz confusion)
--   blocked_ips.expires_at / blocked_at / created_at and login_attempts.created_at
--   are `timestamp` (WITHOUT time zone). The app writes a JS Date; the driver
--   serialises its UTC wall-clock (e.g. 2026-07-23 09:54:20.907) into the tz-less
--   column, but reads it back interpreting the naked wall-clock as Asia/Baghdad
--   local (+03:00). A row that truly expires 09:54Z was served as
--   expiresAt: 12:54Z. The old code then compared that skewed value against a JS
--   `new Date()`, so a block that should last 5 minutes was seen as 3 hours in the
--   future and NEVER lifted. Live evidence: verification branch, read-only.
--
-- THE FIX (schema half)
--   Convert every one of these columns to `timestamptz`, RE-INTERPRETING the
--   stored naked wall-clock as UTC (which is exactly what the driver wrote):
--       ... TYPE timestamptz USING <col> AT TIME ZONE 'UTC'
--   `AT TIME ZONE 'UTC'` on a `timestamp without time zone` value ATTACHES the
--   UTC zone, yielding the correct absolute instant. This BOTH fixes the schema
--   AND repairs every existing row in one reversible step — no is_active flag is
--   touched, so NOTHING is unblocked by this migration.
--
--   The application half (server/storage/security-storage.ts) compares expiry
--   in-DB against now() (never a JS clock) and never touches expires_at IS NULL
--   (permanent) rows. Middleware and cleanup share ONE predicate.
--
-- PERMANENT vs TEMPORARY
--   expires_at IS NULL  = PERMANENT block. Untouched here and never auto-lifted.
--   expires_at NOT NULL = TEMPORARY block. Its instant is corrected; if it has
--                         already passed, the middleware/cleanup will lift it on
--                         next evaluation — the intended behaviour, not a mass
--                         unblock (is_active is not changed by this migration).
--
-- COMPATIBILITY
--   Additive/behavioural only: no column is dropped or renamed; row values keep
--   the SAME absolute instant they always denoted. OLD code reading the NEW
--   timestamptz columns receives a correct Date (the bug it had is simply gone).
--   Idempotent + fail-closed: each column is converted only if it is still
--   `timestamp without time zone`; re-running is a no-op.
-- ============================================================================

-- Guard: both tables must exist.
DO $guard$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_schema = 'public' AND table_name = 'blocked_ips') THEN
    RAISE EXCEPTION 'fix_blocked_ips_timestamptz: blocked_ips table is missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_schema = 'public' AND table_name = 'login_attempts') THEN
    RAISE EXCEPTION 'fix_blocked_ips_timestamptz: login_attempts table is missing';
  END IF;
END
$guard$;

-- Idempotent conversion helper: only convert a column that is still tz-less,
-- interpreting its stored wall-clock as UTC (matching how the driver wrote it).
DO $convert$
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
        AND data_type   = 'timestamp without time zone'
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ALTER COLUMN %I TYPE timestamptz USING %I AT TIME ZONE ''UTC''',
        target.tbl, target.col, target.col
      );
      RAISE NOTICE 'fix_blocked_ips_timestamptz: converted %.% to timestamptz (values read as UTC)', target.tbl, target.col;
    ELSE
      RAISE NOTICE 'fix_blocked_ips_timestamptz: %.% already timestamptz (or absent) — skipped', target.tbl, target.col;
    END IF;
  END LOOP;
END
$convert$;

-- Fail-closed verification: every target column must now be timestamptz.
DO $verify$
DECLARE bad int;
BEGIN
  SELECT count(*) INTO bad
  FROM (VALUES
    ('blocked_ips',    'expires_at'),
    ('blocked_ips',    'blocked_at'),
    ('blocked_ips',    'created_at'),
    ('login_attempts', 'created_at')
  ) AS t(tbl, col)
  JOIN information_schema.columns c
    ON c.table_schema = 'public' AND c.table_name = t.tbl AND c.column_name = t.col
  WHERE c.data_type <> 'timestamp with time zone';
  IF bad > 0 THEN
    RAISE EXCEPTION 'fix_blocked_ips_timestamptz: % target column(s) are not timestamptz after conversion', bad;
  END IF;
END
$verify$;

-- Evidence report (NOTICE only — changes nothing). Classifies existing rows so an
-- operator can see the fix did not silently unblock anyone. is_active untouched.
DO $report$
DECLARE perm bigint; active_temp bigint; expired_temp bigint;
BEGIN
  SELECT count(*) INTO perm         FROM blocked_ips WHERE is_active AND expires_at IS NULL;
  SELECT count(*) INTO active_temp  FROM blocked_ips WHERE is_active AND expires_at IS NOT NULL AND expires_at >  now();
  SELECT count(*) INTO expired_temp FROM blocked_ips WHERE is_active AND expires_at IS NOT NULL AND expires_at <= now();
  RAISE NOTICE 'fix_blocked_ips_timestamptz classification (is_active rows): permanent(NULL)=%, temporary-still-active=%, temporary-already-expired(will lift on next check)=%',
    perm, active_temp, expired_temp;
END
$report$;

COMMENT ON COLUMN blocked_ips.expires_at IS
  'F-8: timestamptz. NULL = permanent block. Expiry is ALWAYS compared in-DB against now(); a temporary block lifts when expires_at <= now(). Never store/compare on the JS clock.';

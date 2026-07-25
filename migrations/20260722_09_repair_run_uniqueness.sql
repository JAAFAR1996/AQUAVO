-- AQUAVO database repair: one audit row per migration per database
-- Date: 2026-07-22

WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY environment,migration_name
      ORDER BY completed_at DESC NULLS LAST,started_at DESC,id DESC
    ) AS row_rank
  FROM database_repair_runs
)
DELETE FROM database_repair_runs r
USING ranked x
WHERE r.id=x.id AND x.row_rank>1;

CREATE UNIQUE INDEX IF NOT EXISTS database_repair_runs_migration_unique_idx
  ON database_repair_runs(environment,migration_name);

-- Rollback for migration blog-metadata-truth-20260829
-- Target: Neon project shiny-tree-43710630 (fishweb), production default branch
--
-- Restores every value the migration changed to exactly what production held
-- immediately before it ran. The values come from the backup table the
-- migration creates in its first statement, inside the same transaction as the
-- changes — so the snapshot cannot be of a different state than the one that
-- was modified, and nothing here is transcribed by hand.
--
-- A rollback here restores the false data faithfully. That is the point: it
-- returns production to its prior state, it does not re-decide the question.
--
-- Second, independent recovery path: this Neon project retains 6 hours of
-- point-in-time history (history_retention_seconds = 21600), so a restore to a
-- timestamp before the migration is available for that window regardless of
-- this file.

BEGIN;

-- Refuse to run if the snapshot is missing or is not the expected shape.
DO $$
DECLARE
  backup_rows int;
BEGIN
  IF to_regclass('public.blog_posts_metadata_backup_20260829') IS NULL THEN
    RAISE EXCEPTION 'backup table blog_posts_metadata_backup_20260829 does not exist; cannot roll back safely';
  END IF;
  SELECT count(*) INTO backup_rows FROM blog_posts_metadata_backup_20260829;
  IF backup_rows <> 81 THEN
    RAISE EXCEPTION 'expected 81 backed-up rows, found %', backup_rows;
  END IF;
END $$;

-- Restore author, published_at and read_time for every row that was snapshotted.
-- Joined on id, so a row deleted since the migration is simply not restored
-- rather than being resurrected with stale content.
UPDATE blog_posts p
   SET author       = b.author,
       published_at = b.published_at,
       read_time    = b.read_time
  FROM blog_posts_metadata_backup_20260829 b
 WHERE p.id = b.id;

-- Confirm the restore put back exactly what was taken.
DO $$
DECLARE
  mismatched int;
BEGIN
  SELECT count(*) INTO mismatched
    FROM blog_posts p
    JOIN blog_posts_metadata_backup_20260829 b ON b.id = p.id
   WHERE p.author IS DISTINCT FROM b.author
      OR p.published_at IS DISTINCT FROM b.published_at
      OR p.read_time IS DISTINCT FROM b.read_time;
  IF mismatched <> 0 THEN
    RAISE EXCEPTION '% rows did not restore to their backed-up values', mismatched;
  END IF;
END $$;

COMMIT;

-- The backup table is deliberately NOT dropped here. Drop it only once the
-- correction has been accepted and is not going to be reversed:
--
--   DROP TABLE blog_posts_metadata_backup_20260829;

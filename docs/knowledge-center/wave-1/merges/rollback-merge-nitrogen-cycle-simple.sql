-- Rollback for kc-wave1-merge-nitrogen-cycle-simple-20260902.
-- Republishes the merged article. Remove the vercel.json redirect too, or the
-- URL stays unreachable regardless of publication state.

BEGIN;

UPDATE blog_posts b SET is_published = k.is_published
  FROM blog_posts_backup_merge_nitrogen_20260902 k
 WHERE b.id = k.id;

COMMIT;

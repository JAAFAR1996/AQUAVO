-- Rollback for kc-wave1-nitrogen-cycle-hub-20260901.
BEGIN;
UPDATE blog_posts p
   SET content = b.content, excerpt = b.excerpt, read_time = b.read_time, updated_at = now()
  FROM blog_posts_backup_kc_nitrogen_20260901 b
 WHERE p.id = b.id;
COMMIT;

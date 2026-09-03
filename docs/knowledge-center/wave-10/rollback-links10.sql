-- Rollback for kc-wave10-links-20260903.

BEGIN;

UPDATE blog_posts b SET content = k.content
  FROM blog_posts_backup_links10_20260903 k
 WHERE b.id = k.id AND b.content IS DISTINCT FROM k.content;

COMMIT;

-- Rollback for kc-wave9-links-20260903. Restores the 19 edited articles.

BEGIN;

UPDATE blog_posts b SET content = k.content
  FROM blog_posts_backup_links9_20260903 k
 WHERE b.id = k.id AND b.content IS DISTINCT FROM k.content;

COMMIT;

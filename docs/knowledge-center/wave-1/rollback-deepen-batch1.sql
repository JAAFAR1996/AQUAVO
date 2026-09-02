-- Rollback for kc-wave1-deepen-batch1-20260902. Restores title, excerpt and content verbatim.

BEGIN;

UPDATE blog_posts b
   SET title = k.title, excerpt = k.excerpt, content = k.content
  FROM blog_posts_backup_deepen_b1_20260902 k
 WHERE b.id = k.id AND b.content IS DISTINCT FROM k.content;

COMMIT;

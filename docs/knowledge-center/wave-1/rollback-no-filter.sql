-- Rollback for kc-wave1-no-filter-rewrite-20260902. Restores title, excerpt and content verbatim.

BEGIN;

UPDATE blog_posts b
   SET title = k.title, excerpt = k.excerpt, content = k.content
  FROM blog_posts_backup_kc_nofilter_20260902 k
 WHERE b.id = k.id;

COMMIT;

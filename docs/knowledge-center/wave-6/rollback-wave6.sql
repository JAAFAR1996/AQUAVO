-- Rollback for kc-wave6-articles-20260902.

BEGIN;

DELETE FROM blog_posts WHERE slug IN ('angelfish-care-guide', 'gourami-care-guide');

UPDATE blog_posts b SET title = k.title, excerpt = k.excerpt, content = k.content
  FROM blog_posts_backup_wave6_20260902 k
 WHERE b.id = k.id AND b.content IS DISTINCT FROM k.content;

COMMIT;

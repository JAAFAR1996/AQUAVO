-- Rollback for kc-wave9-articles-20260903. Deletes the 3 new articles and restores the 3 rewrites.

BEGIN;

DELETE FROM blog_posts WHERE slug IN ('small-schooling-fish-selection', 'aquarium-barbs-guide', 'aquarium-loaches-guide');

UPDATE blog_posts b SET title = k.title, excerpt = k.excerpt, content = k.content
  FROM blog_posts_backup_wave9_20260903 k
 WHERE b.id = k.id AND b.content IS DISTINCT FROM k.content;

COMMIT;

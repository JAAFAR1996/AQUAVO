-- Rollback for kc-wave7-articles-20260902.

BEGIN;

DELETE FROM blog_posts WHERE slug IN ('first-aquarium-setup-guide', 'aquarium-plant-fertilizer-guide', 'aquarium-safe-rocks-and-wood', 'aquarium-electrical-safety');

UPDATE blog_posts b SET title = k.title, excerpt = k.excerpt, content = k.content
  FROM blog_posts_backup_wave7_20260902 k
 WHERE b.id = k.id AND b.content IS DISTINCT FROM k.content;

COMMIT;

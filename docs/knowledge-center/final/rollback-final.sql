-- Rollback for kc-final-expansion-20260903.

BEGIN;

DELETE FROM blog_posts WHERE slug IN ('choosing-healthy-fish-in-store', 'aquarium-hygiene-and-human-safety', 'fish-that-outgrow-home-tanks', 'fish-eye-problems');

UPDATE blog_posts b SET title = k.title, excerpt = k.excerpt, content = k.content
  FROM blog_posts_backup_final_20260903 k
 WHERE b.id = k.id AND b.content IS DISTINCT FROM k.content;

COMMIT;

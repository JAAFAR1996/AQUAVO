-- Rollback for kc-wave1-new-articles-20260902. Deletes the three new articles and restores the hub.

BEGIN;

DELETE FROM blog_posts WHERE slug IN ('aquarium-water-change-guide', 'quarantine-new-fish-guide', 'how-many-fish-in-aquarium');

UPDATE blog_posts b SET content = k.content
  FROM blog_posts_backup_new_articles_20260902 k
 WHERE b.id = k.id AND b.content IS DISTINCT FROM k.content;

COMMIT;

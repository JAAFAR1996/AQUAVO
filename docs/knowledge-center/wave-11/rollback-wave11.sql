-- Rollback for kc-wave11-articles-20260903.

BEGIN;

DELETE FROM blog_posts WHERE slug IN ('external-fish-parasites', 'internal-fish-parasites', 'fish-treatment-protocol', 'aquarium-water-flow', 'aquarium-placement-and-stand');

UPDATE blog_posts b SET content = k.content
  FROM blog_posts_backup_wave11_20260903 k
 WHERE b.id = k.id AND b.content IS DISTINCT FROM k.content;

COMMIT;

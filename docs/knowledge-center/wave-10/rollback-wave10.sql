-- Rollback for kc-wave10-articles-20260903.
--
-- Restores the old Arabic slug too, so the vercel.json 301 must be reverted in
-- the same step or the old URL will redirect to a slug that no longer exists.

BEGIN;

DELETE FROM blog_posts WHERE slug IN ('dwarf-cichlids-guide', 'fish-breeding-basics', 'raising-fish-fry');

UPDATE blog_posts SET slug = 'دليل-شامل-لتربة-وديكور-الأحواض-اختيار-الأسطح-المثا-1787451489298' WHERE slug = 'aquarium-substrate-and-decor-guide';

UPDATE blog_posts b SET title = k.title, excerpt = k.excerpt, content = k.content
  FROM blog_posts_backup_wave10_20260903 k
 WHERE b.id = k.id AND b.content IS DISTINCT FROM k.content;

COMMIT;

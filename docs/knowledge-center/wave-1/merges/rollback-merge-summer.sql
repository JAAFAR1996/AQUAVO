-- Rollback for kc-wave1-merge-summer-20260902. Restores all three rows verbatim.
-- Remove the matching vercel.json redirects too.

BEGIN;

UPDATE blog_posts b
   SET title = k.title, excerpt = k.excerpt, content = k.content, is_published = k.is_published
  FROM blog_posts_backup_merge_summer_20260902 k
 WHERE b.id = k.id
   AND (b.content IS DISTINCT FROM k.content OR b.is_published IS DISTINCT FROM k.is_published);

COMMIT;

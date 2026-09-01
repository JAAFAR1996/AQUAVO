-- Rollback for migration blog-editorial-commerce-20260901
-- Target: Neon project shiny-tree-43710630 (fishweb), production default branch
--
-- Restores title, excerpt, content and is_published for every row the migration
-- could touch, from the snapshot it took inside its own transaction. Nothing
-- here is transcribed by hand.

BEGIN;

DO $$
DECLARE n int;
BEGIN
  IF to_regclass('public.blog_posts_content_backup_20260901') IS NULL THEN
    RAISE EXCEPTION 'backup table blog_posts_content_backup_20260901 does not exist; cannot roll back safely';
  END IF;
  SELECT count(*) INTO n FROM blog_posts_content_backup_20260901;
  IF n < 81 THEN RAISE EXCEPTION 'backup holds only % rows', n; END IF;
END $$;

UPDATE blog_posts p
   SET title        = b.title,
       excerpt      = b.excerpt,
       content      = b.content,
       is_published = b.is_published
  FROM blog_posts_content_backup_20260901 b
 WHERE p.id = b.id;

DO $$
DECLARE mismatched int;
BEGIN
  SELECT count(*) INTO mismatched
    FROM blog_posts p
    JOIN blog_posts_content_backup_20260901 b ON b.id = p.id
   WHERE p.content IS DISTINCT FROM b.content
      OR p.is_published IS DISTINCT FROM b.is_published;
  IF mismatched <> 0 THEN
    RAISE EXCEPTION '% rows did not restore', mismatched;
  END IF;
END $$;

COMMIT;

-- Drop the snapshot only once the correction is accepted:
--   DROP TABLE blog_posts_content_backup_20260901;

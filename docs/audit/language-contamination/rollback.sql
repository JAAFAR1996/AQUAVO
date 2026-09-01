-- Rollback for blog-language-contamination-20260901.
-- Restores content verbatim from the snapshot taken inside the migration.
-- Only content is restored, which is the only column the migration wrote.

BEGIN;

UPDATE blog_posts p SET content = b.content
  FROM blog_posts_content_backup_lang_20260901 b
 WHERE p.id = b.id AND p.content IS DISTINCT FROM b.content;

COMMIT;

-- Rollback for blog-language-contamination-pass2-20260902.
-- Restores content verbatim from the snapshot. content is the only column the
-- migration wrote, so this is fully reversible.

BEGIN;
UPDATE blog_posts b
   SET content = k.content
  FROM blog_posts_content_backup_lang_p2_20260902 k
 WHERE b.id = k.id AND b.content IS DISTINCT FROM k.content;
COMMIT;

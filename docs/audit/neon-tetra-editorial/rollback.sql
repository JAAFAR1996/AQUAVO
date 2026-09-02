-- Rollback for blog-neon-tetra-editorial-20260902.
-- Restores `content` verbatim from the snapshot taken inside that migration.
-- Only `content` was ever written, so this is a complete reversal.

BEGIN;

UPDATE blog_posts b
   SET content = k.content
  FROM blog_posts_backup_neon_tetra_editorial_20260902 k
 WHERE b.id = k.id AND b.content IS DISTINCT FROM k.content;

COMMIT;

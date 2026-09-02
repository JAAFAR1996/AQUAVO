-- Rollback for blog-claims-truth-batch4-20260902.
-- Restores `content` verbatim from the snapshot taken inside that migration.
-- Only `content` was ever written, so this is a complete reversal.

BEGIN;

UPDATE blog_posts b
   SET content = k.content, excerpt = k.excerpt
  FROM blog_posts_backup_claims_b4_20260902 k
 WHERE b.id = k.id
   AND (b.content IS DISTINCT FROM k.content OR b.excerpt IS DISTINCT FROM k.excerpt);

COMMIT;

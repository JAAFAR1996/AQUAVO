-- Rollback for blog-claims-truth-pass1-batch3-20260902.
BEGIN;
UPDATE blog_posts b SET content = k.content FROM blog_posts_backup_claims_b3_20260902 k
 WHERE b.id = k.id AND b.content IS DISTINCT FROM k.content;
COMMIT;

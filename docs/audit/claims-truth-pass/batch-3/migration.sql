-- Migration ID: blog-claims-truth-pass1-batch3-20260902
-- Target:       Neon production, blog_posts (one row)
-- Rollback:     rollback.sql
--
-- Fixes a regression introduced by batch 1. Replacing the unsupported "first
-- professional ornamental-fish store in Iraq" claim, batch 1 wrote "AQUAVO, a
-- specialised Iraqi store, PROVIDES ornamental-fish keeping supplies" — which
-- puts an availability verb next to أسماك الزينة, and the editorial guard
-- (shared/editorial-guard.ts, FALSE_AVAILABILITY) cannot distinguish that from
-- claiming AQUAVO supplies the fish. The guard is right to fail closed; the
-- wording is the thing to fix. Caught by re-running the corpus audit after
-- commit rather than by the migration's own post-flight, which did not know
-- about this rule.

BEGIN;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM blog_posts WHERE is_published;
  IF n <> 80 THEN RAISE EXCEPTION 'expected 80 published posts, found %', n; END IF;
  SELECT (length(content) - length(replace(content, 'AQUAVO متجر عراقي مختص يوفر مستلزمات تربية أسماك الزينة.', ''))) / nullif(length('AQUAVO متجر عراقي مختص يوفر مستلزمات تربية أسماك الزينة.'), 0)
    INTO n FROM blog_posts WHERE slug = 'flowerhorn-breeding-nuchal-hump-secrets';
  IF n IS DISTINCT FROM 1 THEN RAISE EXCEPTION 'target not present exactly once (got %)', n; END IF;
END $$;

CREATE TABLE blog_posts_backup_claims_b3_20260902 AS
SELECT id, slug, title, excerpt, content, is_published, now() AS backed_up_at FROM blog_posts;

UPDATE blog_posts SET content = replace(content, 'AQUAVO متجر عراقي مختص يوفر مستلزمات تربية أسماك الزينة.', 'AQUAVO متجر عراقي مختص بمستلزمات الأحواض.')
 WHERE slug = 'flowerhorn-breeding-nuchal-hump-secrets';

DO $$
DECLARE c text; n int;
BEGIN
  SELECT content INTO c FROM blog_posts WHERE slug = 'flowerhorn-breeding-nuchal-hump-secrets';
  IF c ~ 'يوفر مستلزمات تربية أسماك الزينة' THEN RAISE EXCEPTION 'availability wording survived'; END IF;
  IF position('AQUAVO متجر عراقي مختص بمستلزمات الأحواض.' in c) = 0 THEN RAISE EXCEPTION 'replacement not present'; END IF;
  SELECT count(*) INTO n FROM blog_posts b JOIN blog_posts_backup_claims_b3_20260902 k USING (id)
   WHERE b.title IS DISTINCT FROM k.title OR b.excerpt IS DISTINCT FROM k.excerpt
      OR b.is_published IS DISTINCT FROM k.is_published;
  IF n <> 0 THEN RAISE EXCEPTION '% rows had title/excerpt/is_published altered', n; END IF;
  SELECT count(*) INTO n FROM blog_posts b JOIN blog_posts_backup_claims_b3_20260902 k USING (id)
   WHERE b.content IS DISTINCT FROM k.content;
  IF n <> 1 THEN RAISE EXCEPTION 'expected exactly 1 content rewrite, got %', n; END IF;
END $$;

COMMIT;

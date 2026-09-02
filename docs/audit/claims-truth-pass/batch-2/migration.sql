-- Migration ID: blog-claims-truth-pass1-batch2-20260902
-- Target:       Neon production, blog_posts (one row)
-- Rollback:     rollback.sql
--
-- Residue from batch 1, found by the post-commit corpus verification rather than
-- by the drafting scan: batch 1 fixed the FIRST 'guarantein salud' in this
-- article and there was a second, in a different sentence. Re-reading the
-- surrounding block for that second hit exposed three more false claims that the
-- pattern sweep had not surfaced — a "leading company" superlative, a quality
-- guarantee on live fish, and delivery of live fish across Iraq. AQUAVO sells no
-- live fish at all.
--
-- Lesson recorded in audit.md: an occurrence-count check must be per corpus, not
-- per drafted target.

BEGIN;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM blog_posts WHERE is_published;
  IF n <> 80 THEN RAISE EXCEPTION 'expected 80 published posts, found %', n; END IF;
END $$;

CREATE TABLE blog_posts_backup_claims_b2_20260902 AS
SELECT id, slug, title, excerpt, content, is_published, now() AS backed_up_at
  FROM blog_posts;

DO $$
DECLARE bad text;
BEGIN
  SELECT string_agg(left(t.frag, 60), chr(10)) INTO bad
    FROM (VALUES
      ('AQUAVO هي شركة رائدة في مجال تربية الأسماك في العراق، وتقدم خدمات عالية الجودة لجميع هواة تربية الأسماك.'),
      ('   <li>ضمان جودة عالية لجميع الأسماك</li>
   <li>تسليم الأسماك إلى جميع أنحاء العراق</li>
   <li>دعم فني لجميع هواة تربية الأسماك</li>'),
      ('ويمكنك guarantein salud الحوض وجمال الأسماك.')
    ) AS t(frag)
    JOIN blog_posts b ON b.slug = 'corydoras-types-best-cleaner-fish'
   WHERE (length(b.content) - length(replace(b.content, t.frag, ''))) / nullif(length(t.frag), 0) <> 1;
  IF bad IS NOT NULL THEN RAISE EXCEPTION 'live content changed since drafting: %', bad; END IF;
END $$;

-- corydoras-types-best-cleaner-fish (3 corrections)
--   REMOVE · 'A leading company in fish keeping in Iraq' has no source.
--   REMOVE · A quality guarantee on all FISH, and delivery of FISH across Iraq. AQUAVO sells no live fish, and its return policy grants no blanket guarantee. Replaced with the real categories and the verified delivery term; technical support is real and is kept.
--   CORRECT · Second occurrence of the Spanish 'salud' plus the malformed pseudo-word for 'guarantee'. Batch 1 corrected only the first; this one sits in a different sentence and was missed.
UPDATE blog_posts SET content = replace(replace(replace(content, 'AQUAVO هي شركة رائدة في مجال تربية الأسماك في العراق، وتقدم خدمات عالية الجودة لجميع هواة تربية الأسماك.', 'AQUAVO متجر عراقي مختص بمستلزمات الأحواض.'), '   <li>ضمان جودة عالية لجميع الأسماك</li>
   <li>تسليم الأسماك إلى جميع أنحاء العراق</li>
   <li>دعم فني لجميع هواة تربية الأسماك</li>', '   <li>مستلزمات الفلترة والتهوية ومعالجة المياه</li>
   <li>توصيل إلى 18 محافظة في العراق</li>
   <li>دعم فني لهواة تربية الأسماك</li>'), 'ويمكنك guarantein salud الحوض وجمال الأسماك.', 'ويمكنك الحفاظ على صحة الحوض وجمال الأسماك.')
 WHERE slug = 'corydoras-types-best-cleaner-fish';

DO $$
DECLARE c text; hit text;
BEGIN
  SELECT content INTO c FROM blog_posts WHERE slug = 'corydoras-types-best-cleaner-fish';
  IF c ~ 'guarantein' OR c ~ 'salud' THEN RAISE EXCEPTION 'foreign fragment survived'; END IF;
  IF c ~ 'شركة رائدة' THEN RAISE EXCEPTION 'superlative survived'; END IF;
  IF c ~ 'تسليم الأسماك' THEN RAISE EXCEPTION 'fish-delivery claim survived'; END IF;
  IF c ~ 'ضمان جودة عالية لجميع الأسماك' THEN RAISE EXCEPTION 'fish guarantee survived'; END IF;
  SELECT string_agg(slug, ', ') INTO hit FROM blog_posts
   WHERE is_published AND (content LIKE '%guarantein%' OR content LIKE '%salud%' OR content LIKE '%تسليم الأسماك%');
  IF hit IS NOT NULL THEN RAISE EXCEPTION 'residue elsewhere in the corpus: %', hit; END IF;
END $$;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM blog_posts b JOIN blog_posts_backup_claims_b2_20260902 k USING (id)
   WHERE b.title IS DISTINCT FROM k.title OR b.excerpt IS DISTINCT FROM k.excerpt
      OR b.is_published IS DISTINCT FROM k.is_published;
  IF n <> 0 THEN RAISE EXCEPTION '% rows had title/excerpt/is_published altered', n; END IF;
  SELECT count(*) INTO n FROM blog_posts b JOIN blog_posts_backup_claims_b2_20260902 k USING (id)
   WHERE b.content IS DISTINCT FROM k.content;
  IF n <> 1 THEN RAISE EXCEPTION 'expected exactly 1 content rewrite, got %', n; END IF;
END $$;

COMMIT;

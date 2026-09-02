-- Migration ID: blog-neon-tetra-editorial-20260902
-- Target:       Neon production, blog_posts (one row)
-- Rollback:     rollback.sql (restores content verbatim from the backup table)
-- Depends on:   docs/audit/language-contamination/pass-2/migration.sql
--
-- Corrects false and unsupported claims in `neon-tetra-color-care-guide`.
-- Deliberately separate from the script-purity work: that pass repairs
-- corrupted glyphs, this one repairs claims. See audit.md for the per-claim
-- ledger and the live evidence behind every verdict.
--
-- Claims verified TRUE and therefore left untouched: 18 governorates, the
-- 20-24 C range, and the heater / filter / air-pump advice.

BEGIN;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM blog_posts WHERE is_published;
  IF n <> 80 THEN RAISE EXCEPTION 'expected 80 published posts, found %', n; END IF;
END $$;

-- Pre-flight: pass 2 must already be applied. Two targets below only exist in
-- their corrected form afterwards, so a silent no-op is not acceptable here.
DO $$
DECLARE c text;
BEGIN
  SELECT content INTO c FROM blog_posts WHERE slug = 'neon-tetra-color-care-guide';
  IF c IS NULL THEN RAISE EXCEPTION 'neon-tetra-color-care-guide not found'; END IF;
  IF position('استخدام ط Ard' in c) > 0 THEN
    RAISE EXCEPTION 'pass-2 script-purity migration has not been applied yet; run it first';
  END IF;
  IF position('<p>"<h2>مقدمة حول أسماك النيون تيترا</h2>' in c) > 0 THEN
    RAISE EXCEPTION 'pass-2 wrapper fix has not been applied yet; run it first';
  END IF;
END $$;

CREATE TABLE blog_posts_backup_neon_tetra_editorial_20260902 AS
SELECT id, slug, title, excerpt, content, is_published, now() AS backed_up_at
  FROM blog_posts;

-- Pre-flight: every target sentence must still be present verbatim.
DO $$
DECLARE missing text;
BEGIN
  SELECT string_agg(t.frag, chr(10)) INTO missing
    FROM (VALUES
      ('وينبغي أن تكون المياه خالية من الشوائب والكائنات الدقيقة الضارة، ويمكن تحقيق ذلك باستخدام مضخات عالية الجودة ومستويات الأكسجين المناسبة.'),
      ('استخدام معقم المياه لمنع تلوث المياه.'),
      ('ويمكن تحقيق ذلك بتوفير نباتات مائية واهتمام دقيق، وينبغي أن تكون بيئة الأسماك خالية من الشوائب والكائنات الدقيقة الضارة.'),
      ('يمكن الاعتماد على AQUAVO كواحدة من أفضل وأكبر متاجر الأسماك المائية في العراق، حيث نقدم ضمانات عالية الجودة وخدمات تسليم سريعة في 18 محافظة، ونتوفر على مجموعة واسعة من المنتجات المستوردة عالية الجودة.')
    ) AS t(frag)
    JOIN blog_posts b ON b.slug = 'neon-tetra-color-care-guide'
   WHERE position(t.frag in b.content) = 0;
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'live content changed since drafting; missing targets: %', missing;
  END IF;
END $$;

-- Claim 1 · FALSE. Sterile water is the opposite of a cycled aquarium, and
-- AQUAVO sells beneficial-bacteria cultures itself. Restated as the parameters
-- that actually matter, which is also what the nitrogen-cycle hub teaches.
-- Claim 2 · UNSUPPORTED. No steriliser exists in the catalogue; the water
-- treatment category carries a conditioner and a dechlorinator, which is the
-- correct advice and the real product.
-- Claim 3 · CONFLICTS WITH THE CATALOGUE. AQUAVO sells no live plants. Natural
-- driftwood and decor are stocked and are genuinely what a neon tetra needs
-- for cover, so the advice stays true and the catalogue claim becomes accurate.
-- Claims 4-6 · UNSUPPORTED superlative, wrong business type, and a blanket
-- guarantee that the store's own return policy explicitly disclaims. Replaced
-- with the delivery terms and the product range, both verifiable.
UPDATE blog_posts SET content =
  replace(
  replace(
  replace(
  replace(content,
    'وينبغي أن تكون المياه خالية من الشوائب والكائنات الدقيقة الضارة، ويمكن تحقيق ذلك باستخدام مضخات عالية الجودة ومستويات الأكسجين المناسبة.',
    'وينبغي أن تكون المياه خالية من الأمونيا والنتريت ومستقرة كيميائياً، ويمكن تحقيق ذلك بدورة بيولوجية ناضجة وفلترة جيدة ومستويات الأكسجين المناسبة.'),
    'استخدام معقم المياه لمنع تلوث المياه.',
    'استخدام معالج مياه ومزيل كلور قبل إضافة أي ماء جديد.'),
    'ويمكن تحقيق ذلك بتوفير نباتات مائية واهتمام دقيق، وينبغي أن تكون بيئة الأسماك خالية من الشوائب والكائنات الدقيقة الضارة.',
    'ويمكن تحقيق ذلك بتوفير مخابئ وديكورات طبيعية مثل الخشب الطبيعي، وينبغي أن تبقى معايير الماء ثابتة وضمن المدى المناسب.'),
    'يمكن الاعتماد على AQUAVO كواحدة من أفضل وأكبر متاجر الأسماك المائية في العراق، حيث نقدم ضمانات عالية الجودة وخدمات تسليم سريعة في 18 محافظة، ونتوفر على مجموعة واسعة من المنتجات المستوردة عالية الجودة.',
    'يمكن الاعتماد على AQUAVO كمتجر عراقي مختص بمعدات ومستلزمات أحواض الأسماك، مع توصيل إلى 18 محافظة برسوم ثابتة 5,000 دينار، ومجموعة واسعة من مستلزمات الفلترة والتهوية ومعالجة المياه.')
 WHERE slug = 'neon-tetra-color-care-guide';

-- Post-flight: the corrected claims must be gone, and the verified ones kept.
DO $$
DECLARE c text;
BEGIN
  SELECT content INTO c FROM blog_posts WHERE slug = 'neon-tetra-color-care-guide';
  IF position('نباتات مائية' in c) > 0 THEN RAISE EXCEPTION 'live-plant claim survived'; END IF;
  IF position('أفضل وأكبر' in c) > 0 THEN RAISE EXCEPTION 'superlative survived'; END IF;
  IF position('ضمانات عالية الجودة' in c) > 0 THEN RAISE EXCEPTION 'blanket guarantee claim survived'; END IF;
  IF position('متاجر الأسماك' in c) > 0 THEN RAISE EXCEPTION 'fish-store wording survived'; END IF;
  IF position('الكائنات الدقيقة الضارة' in c) > 0 THEN RAISE EXCEPTION 'sterile-water claim survived'; END IF;
  IF position('معقم المياه' in c) > 0 THEN RAISE EXCEPTION 'steriliser claim survived'; END IF;
  IF position('18 محافظة' in c) = 0 THEN RAISE EXCEPTION 'verified delivery claim was lost'; END IF;
  IF position('20-24 درجة مئوية' in c) = 0 THEN RAISE EXCEPTION 'verified temperature range was lost'; END IF;
END $$;

-- Post-flight: exactly one row changed, and only its content.
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n
    FROM blog_posts b JOIN blog_posts_backup_neon_tetra_editorial_20260902 k USING (id)
   WHERE b.title IS DISTINCT FROM k.title
      OR b.excerpt IS DISTINCT FROM k.excerpt
      OR b.is_published IS DISTINCT FROM k.is_published;
  IF n <> 0 THEN RAISE EXCEPTION '% rows had title/excerpt/is_published altered', n; END IF;

  SELECT count(*) INTO n
    FROM blog_posts b JOIN blog_posts_backup_neon_tetra_editorial_20260902 k USING (id)
   WHERE b.content IS DISTINCT FROM k.content;
  IF n <> 1 THEN RAISE EXCEPTION 'expected exactly 1 content rewrite, got %', n; END IF;
END $$;

COMMIT;

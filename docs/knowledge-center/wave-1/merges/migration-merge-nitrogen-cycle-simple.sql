-- Migration ID: kc-wave1-merge-nitrogen-cycle-simple-20260902
-- Target:       Neon production, blog_posts (one row)
-- Rollback:     rollback-merge-nitrogen-cycle-simple.sql
-- Pairs with:   the permanent redirect added to vercel.json in the same commit.
--
-- Wave 1 merge: /blog/nitrogen-cycle-simple is absorbed by the canonical hub
-- /blog/nitrogen-cycle-simple-arabic-explained.
--
-- Nothing was absorbed, deliberately. The hub covers every section the loser
-- has, and where the two disagree the loser is wrong: it teaches "three stages"
-- (the hub's own section is titled "خطوتان، مو ثلاث مراحل"), credits step two to
-- Nitrobacter when freshwater biofilters are dominated by Nitrospira, and gives
-- a 0.5 ppm ammonia threshold that the research dossier records as RESEARCH
-- BLOCKED because every defensible figure is expressed as un-ionised NH3. Its
-- title also carries an emoji, which the brand rules forbid outright.
--
-- So this is a redirect, not a content merge. The row is unpublished rather than
-- deleted: the redirect makes the URL unreachable, and unpublishing removes it
-- from /api/blog/posts and the sitemap so the duplicate stops competing with the
-- hub for the same query.

BEGIN;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM blog_posts WHERE slug = 'nitrogen-cycle-simple' AND is_published;
  IF n <> 1 THEN RAISE EXCEPTION 'merge source not found or already unpublished'; END IF;

  SELECT count(*) INTO n FROM blog_posts
   WHERE slug = 'nitrogen-cycle-simple-arabic-explained' AND is_published AND length(content) > 8000;
  IF n <> 1 THEN RAISE EXCEPTION 'canonical hub missing or not the rewritten version'; END IF;
END $$;

CREATE TABLE blog_posts_backup_merge_nitrogen_20260902 AS
SELECT id, slug, title, excerpt, content, is_published, now() AS backed_up_at
  FROM blog_posts WHERE slug = 'nitrogen-cycle-simple';

UPDATE blog_posts SET is_published = FALSE WHERE slug = 'nitrogen-cycle-simple';

-- Post-flight: exactly one row left the index, the hub is untouched, and no
-- other article's publication state moved.
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM blog_posts WHERE slug = 'nitrogen-cycle-simple' AND is_published;
  IF n <> 0 THEN RAISE EXCEPTION 'merge source is still published'; END IF;

  SELECT count(*) INTO n FROM blog_posts WHERE slug = 'nitrogen-cycle-simple-arabic-explained' AND is_published;
  IF n <> 1 THEN RAISE EXCEPTION 'canonical hub is no longer published'; END IF;

  SELECT count(*) INTO n FROM blog_posts WHERE is_published;
  IF n <> 79 THEN RAISE EXCEPTION 'expected 79 published posts after the merge, found %', n; END IF;
END $$;

COMMIT;

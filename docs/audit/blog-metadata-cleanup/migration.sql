-- Migration ID: blog-metadata-truth-20260829
-- Target:       Neon project shiny-tree-43710630 (fishweb), production default branch
-- Prepared:     2026-08-29, after c3af2257 shipped the render-side corrections
-- Rollback:     rollback.sql in this directory (exact prior values, keyed per id)
--
-- Corrects three sets of stored values the truth audit proved false. Every
-- statement is keyed to an explicit primary key, so the affected row set cannot
-- drift between the review of this migration and its execution. The single
-- exception is SET C, which is deliberately catalogue-wide and is discussed
-- where it appears.
--
-- NOT touched: content, title, excerpt, slug, category, image_url, is_published,
-- is_featured, view_count, created_at, updated_at, and the 70 legitimate
-- "AQUAVO Team" bylines.

BEGIN;

-- Guard: refuse to run against a catalogue that is not the one reviewed.
DO $$
DECLARE
  persona_rows int;
  backdated_rows int;
  total int;
BEGIN
  SELECT count(*) INTO persona_rows   FROM blog_posts WHERE author = 'شريمب 🦐';
  SELECT count(*) INTO backdated_rows FROM blog_posts WHERE published_at < created_at - interval '1 day';
  SELECT count(*) INTO total          FROM blog_posts;
  IF total <> 81          THEN RAISE EXCEPTION 'expected 81 posts, found %', total; END IF;
  IF persona_rows <> 11   THEN RAISE EXCEPTION 'expected 11 persona rows, found %', persona_rows; END IF;
  IF backdated_rows <> 10 THEN RAISE EXCEPTION 'expected 10 backdated rows, found %', backdated_rows; END IF;
END $$;

-- ---------------------------------------------------------------------------
-- STEP 0 — snapshot every row this migration can touch, inside the same
-- transaction as the changes.
--
-- Taking the backup here rather than in a separate earlier session means the
-- snapshot is provably of the state being modified: if the transaction aborts,
-- both the backup and the changes disappear together, and there is no window in
-- which a row could change between being backed up and being corrected.
--
-- rollback.sql restores from this table by join. It is not dropped by either
-- file; drop it by hand once the correction is accepted.
-- ---------------------------------------------------------------------------
CREATE TABLE blog_posts_metadata_backup_20260829 AS
SELECT id, slug, author, published_at, read_time, now() AS backed_up_at
  FROM blog_posts;

DO $$
DECLARE
  backup_rows int;
BEGIN
  SELECT count(*) INTO backup_rows FROM blog_posts_metadata_backup_20260829;
  IF backup_rows <> 81 THEN
    RAISE EXCEPTION 'backup captured % rows, expected 81', backup_rows;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- SET A — 10 fabricated publication dates.
--
-- Each row was inserted on 2026-02-23 and stamped with a date from the previous
-- autumn, spaced weekly, manufacturing a publishing history that did not
-- happen. The honest first-publication date is the row's own creation.
--
-- The other 71 posts are NOT touched. Their published_at also sits a few
-- milliseconds before created_at — an artifact of the seed insert order, not a
-- backdate — which is why the predicate identifying this set required a gap of
-- more than a day. Correcting those would move real dates for no reason.
-- ---------------------------------------------------------------------------
UPDATE blog_posts SET published_at = created_at WHERE id = '20296a10-0f15-40a5-a032-9e917af50529';  -- algae-war-guide                2025-10-31 -> 2026-02-23
UPDATE blog_posts SET published_at = created_at WHERE id = '25a76157-174b-4b54-926f-3052f4c2c22f';  -- filter-types-guide             2025-11-04 -> 2026-02-23
UPDATE blog_posts SET published_at = created_at WHERE id = '89e6d642-779e-493b-b0ff-0c41f1815ee8';  -- budget-aquascaping             2025-11-09 -> 2026-02-23
UPDATE blog_posts SET published_at = created_at WHERE id = '79af18e1-495d-4a5d-a3fe-f82227ece6b4';  -- tank-mates-compatibility       2025-11-17 -> 2026-02-23
UPDATE blog_posts SET published_at = created_at WHERE id = '035777ad-ef34-4d45-abcc-e911f1f0bd87';  -- nitrogen-cycle-simple          2025-11-24 -> 2026-02-23
UPDATE blog_posts SET published_at = created_at WHERE id = 'af5ed3d3-aa56-4d66-8da7-13db1515b2c8';  -- top-5-mistakes                 2025-11-30 -> 2026-02-23
UPDATE blog_posts SET published_at = created_at WHERE id = 'f130c8d3-74f0-49fe-ba62-26d77aedc3dc';  -- cloudy-water-fix               2025-12-07 -> 2026-02-23
UPDATE blog_posts SET published_at = created_at WHERE id = 'd260cf7c-829f-4ca9-b637-0cdba4dd1168';  -- real-vs-fake-plants            2025-12-14 -> 2026-02-23
UPDATE blog_posts SET published_at = created_at WHERE id = '1625e34b-488a-42b2-bcac-d8027b5d8ff6';  -- goldfish-bowl-myth             2025-12-21 -> 2026-02-23
UPDATE blog_posts SET published_at = created_at WHERE id = '140b7fc3-5bda-4a15-bf84-1fd7f628c714';  -- iraqi-summer-aquarium-cooling  2025-12-27 -> 2026-02-23

-- ---------------------------------------------------------------------------
-- SET B — 11 chatbot-persona bylines.
--
-- "شريمب" is the storefront's AI chat assistant, cast in its system prompt as an
-- aquarium specialist of fifteen years. These are AQUAVO editorial articles and
-- now say so. The render layer already resolves this value to the editorial-team
-- Organization; this makes the stored value agree with what is published, so the
-- two cannot drift apart again.
--
-- The eleventh row is here for its byline only — its publication date is genuine
-- and is deliberately absent from SET A.
-- ---------------------------------------------------------------------------
UPDATE blog_posts SET author = 'AQUAVO Editorial Team' WHERE id = '20296a10-0f15-40a5-a032-9e917af50529';  -- algae-war-guide
UPDATE blog_posts SET author = 'AQUAVO Editorial Team' WHERE id = '25a76157-174b-4b54-926f-3052f4c2c22f';  -- filter-types-guide
UPDATE blog_posts SET author = 'AQUAVO Editorial Team' WHERE id = '89e6d642-779e-493b-b0ff-0c41f1815ee8';  -- budget-aquascaping
UPDATE blog_posts SET author = 'AQUAVO Editorial Team' WHERE id = '79af18e1-495d-4a5d-a3fe-f82227ece6b4';  -- tank-mates-compatibility
UPDATE blog_posts SET author = 'AQUAVO Editorial Team' WHERE id = '035777ad-ef34-4d45-abcc-e911f1f0bd87';  -- nitrogen-cycle-simple
UPDATE blog_posts SET author = 'AQUAVO Editorial Team' WHERE id = 'af5ed3d3-aa56-4d66-8da7-13db1515b2c8';  -- top-5-mistakes
UPDATE blog_posts SET author = 'AQUAVO Editorial Team' WHERE id = 'f130c8d3-74f0-49fe-ba62-26d77aedc3dc';  -- cloudy-water-fix
UPDATE blog_posts SET author = 'AQUAVO Editorial Team' WHERE id = 'd260cf7c-829f-4ca9-b637-0cdba4dd1168';  -- real-vs-fake-plants
UPDATE blog_posts SET author = 'AQUAVO Editorial Team' WHERE id = '1625e34b-488a-42b2-bcac-d8027b5d8ff6';  -- goldfish-bowl-myth
UPDATE blog_posts SET author = 'AQUAVO Editorial Team' WHERE id = '140b7fc3-5bda-4a15-bf84-1fd7f628c714';  -- iraqi-summer-aquarium-cooling
UPDATE blog_posts SET author = 'AQUAVO Editorial Team' WHERE id = 'auto-1787451489298';                    -- byline only; this row's date is genuine

-- ---------------------------------------------------------------------------
-- SET C — 81 stale read_time strings, cleared rather than rewritten.
--
-- Every one of the 81 overstates its own article, median 4.5x and worst 15x.
-- Nothing reads this column any more: both the browser and the crawler derive
-- the figure from the article body through shared/article-reading.ts.
--
-- So it is set to NULL. Writing recomputed values would put fresh numbers into
-- a column nothing consumes, and they would drift out of date the next time an
-- article is edited — which is exactly how these became false. NULL removes the
-- false claim without inventing a replacement.
--
-- This is the one catalogue-wide statement in the file. It is bounded by the
-- IS NOT NULL predicate and by the row-count guard above, and its rollback
-- restores all 81 values individually.
--
-- The column is left in place: dropping it is a schema change that belongs with
-- removing it from shared/schema.ts, not with a data correction.
-- ---------------------------------------------------------------------------
UPDATE blog_posts SET read_time = NULL WHERE read_time IS NOT NULL;

-- Verify before committing. Any mismatch aborts the whole transaction.
DO $$
DECLARE
  bad_dates int;
  personas int;
  read_times int;
  team_bylines int;
  total int;
BEGIN
  SELECT count(*) INTO bad_dates    FROM blog_posts WHERE published_at < created_at - interval '1 day';
  SELECT count(*) INTO personas     FROM blog_posts WHERE author = 'شريمب 🦐';
  SELECT count(*) INTO read_times   FROM blog_posts WHERE read_time IS NOT NULL;
  SELECT count(*) INTO team_bylines FROM blog_posts WHERE author IN ('AQUAVO Team', 'AQUAVO Editorial Team');
  SELECT count(*) INTO total        FROM blog_posts;
  IF bad_dates <> 0     THEN RAISE EXCEPTION 'backdated rows remain: %', bad_dates; END IF;
  IF personas <> 0      THEN RAISE EXCEPTION 'persona bylines remain: %', personas; END IF;
  IF read_times <> 0    THEN RAISE EXCEPTION 'read_time values remain: %', read_times; END IF;
  IF team_bylines <> 81 THEN RAISE EXCEPTION 'expected all 81 bylines to be the team, found %', team_bylines; END IF;
  IF total <> 81        THEN RAISE EXCEPTION 'row count changed to %', total; END IF;
END $$;

COMMIT;

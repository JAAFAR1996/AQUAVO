/**
 * Emits the rewrite migration for /blog/fish-that-live-without-filter.
 *
 *   node docs/knowledge-center/wave-1/build-no-filter.mjs
 *
 * Reads the live row to pin the pre-flight to what is actually published, so a
 * change made between drafting and applying aborts rather than overwrites.
 */
import fs from "node:fs";
import path from "node:path";

const BASE = "https://aquavoiq.com";
const SLUG = "fish-that-live-without-filter";
const ID = "kc-wave1-no-filter-rewrite-20260902";
const BACKUP = "blog_posts_backup_kc_nofilter_20260902";
const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));

const TITLE = "حوض بلا فلتر: أي سمكة تتحمل فعلاً، وبأي شروط؟";
const EXCERPT =
  "ما توجد سمكة تعيش بلا فلتر وبلا أوكسجين. هذا الدليل يفصل بين الجهاز والترشيح البايولوجي، ويشرح أي الأسماك تتحمل قلة الأوكسجين فعلاً وبأي شروط — وليش الجولدفش والنيون أسوأ خيارين.";

const html = fs.readFileSync(path.join(HERE, "no-filter-aquarium.html"), "utf8").trim();

const res = await fetch(`${BASE}/api/blog/posts/${SLUG}`);
if (!res.ok) throw new Error(`live row unavailable: ${res.status}`);
const body = await res.json();
const live = body.post ?? body;
if (!live?.id) throw new Error("live row has no id");
console.log(`live row : ${live.id}`);
console.log(`current  : ${live.content.length} chars`);
console.log(`rewrite  : ${html.length} chars`);

const q = (s) => "'" + s.replace(/'/g, "''") + "'";
const lf = (t) => t.split(String.fromCharCode(13) + String.fromCharCode(10)).join(String.fromCharCode(10));

const sql = `-- Migration ID: ${ID}
-- Target:       Neon production, blog_posts (one row)
-- Rollback:     rollback-no-filter.sql
--
-- Phase 3: rewrite, not repair. The live page named goldfish and neon tetra as
-- the fish best able to live "without a filter or oxygen". Those are close to
-- the two worst possible answers — goldfish are among the highest-waste fish
-- kept, and neon tetra need a fully cycled tank with ammonia and nitrite at
-- zero. A beginner acting on that during an Iraqi power cut loses the tank.
--
-- The premise was audited from scratch rather than preserved because the URL
-- exists. Decision and sources in dossier-no-filter-aquarium.md. The rewrite
-- keeps the URL and the search intent and replaces the answer: it separates
-- "no device" from "no biological filtration" from "no oxygenation", names the
-- anabantoids that genuinely tolerate low dissolved oxygen via the labyrinth
-- organ, and states plainly that no fish tolerates ammonia.
--
-- The draft passes all three content guards before this file is generated:
-- script purity 0, editorial 0, business truth 0.

BEGIN;

-- Pre-flight: the row must be the one that was audited.
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM blog_posts WHERE id = ${q(live.id)} AND is_published;
  IF n <> 1 THEN RAISE EXCEPTION 'target row not found or not published'; END IF;

  SELECT length(content) INTO n FROM blog_posts WHERE id = ${q(live.id)};
  IF n <> ${live.content.length} THEN
    RAISE EXCEPTION 'content changed since drafting (expected ${live.content.length} chars, found %)', n;
  END IF;

  SELECT count(*) INTO n FROM blog_posts
   WHERE id = ${q(live.id)} AND content LIKE '%' || 'أسماك النيون من الأفضلية في العيش بدون فلتر' || '%';
  IF n <> 1 THEN RAISE EXCEPTION 'the neon-tetra claim this rewrite exists to remove is not present'; END IF;
END $$;

CREATE TABLE ${BACKUP} AS
SELECT id, slug, title, excerpt, content, is_published, now() AS backed_up_at
  FROM blog_posts WHERE id = ${q(live.id)};

UPDATE blog_posts
   SET title = ${q(TITLE)},
       excerpt = ${q(EXCERPT)},
       content = ${q(html)}
 WHERE id = ${q(live.id)};

-- Post-flight: the dangerous claims are gone, the structure is there, and the
-- guards' own rules hold.
DO $$
DECLARE c text;
BEGIN
  SELECT content INTO c FROM blog_posts WHERE id = ${q(live.id)};

  IF c LIKE '%' || 'أسماك النيون من الأفضلية في العيش بدون فلتر' || '%' THEN
    RAISE EXCEPTION 'the neon-tetra claim survived';
  END IF;
  IF c LIKE '%' || 'الجولدي' || '%' AND c NOT LIKE '%' || 'يحتاج ترشيحاً أقوى' || '%' THEN
    RAISE EXCEPTION 'goldfish still recommended without the correction';
  END IF;

  IF length(c) < 4000 THEN RAISE EXCEPTION 'rewrite shorter than expected: %', length(c); END IF;
  IF c !~ '<table' THEN RAISE EXCEPTION 'rewrite lost its tables'; END IF;
  IF (length(c) - length(replace(c, 'href="/', ''))) / 7 < 5 THEN
    RAISE EXCEPTION 'rewrite has fewer than 5 internal links';
  END IF;

  -- Same script set the real guard rejects, not the narrow subset that let the
  -- first contamination sweep certify a corpus it had never checked.
  IF c ~ '[一-鿿぀-ヿ가-힯Ѐ-ӿऀ-ॿ฀-๿֐-׿Ā-ɏḀ-ỿ]' THEN
    RAISE EXCEPTION 'rewrite introduced stray script';
  END IF;
  IF c ~ 'سوق الغزل' OR c ~ 'الشورجة' THEN RAISE EXCEPTION 'rewrite names an external marketplace'; END IF;
  -- Truth contract: no blanket warranty, ranking, sourcing or branch claim.
  IF c ~ 'ضمانات' OR c ~ 'أفضل متجر' OR c ~ 'أول متجر' OR c ~ 'مستوردة من' OR c ~ 'فروعنا' THEN
    RAISE EXCEPTION 'rewrite introduced a business claim';
  END IF;
END $$;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM blog_posts b JOIN ${BACKUP} k USING (id)
   WHERE b.is_published IS DISTINCT FROM k.is_published;
  IF n <> 0 THEN RAISE EXCEPTION 'publication state changed'; END IF;
END $$;

COMMIT;
`;

fs.writeFileSync(path.join(HERE, "migration-no-filter.sql"), lf(sql));
fs.writeFileSync(
  path.join(HERE, "rollback-no-filter.sql"),
  lf(`-- Rollback for ${ID}. Restores title, excerpt and content verbatim.

BEGIN;

UPDATE blog_posts b
   SET title = k.title, excerpt = k.excerpt, content = k.content
  FROM ${BACKUP} k
 WHERE b.id = k.id;

COMMIT;
`),
);
console.log("emitted migration-no-filter.sql and rollback-no-filter.sql");

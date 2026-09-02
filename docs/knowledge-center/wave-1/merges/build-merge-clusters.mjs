/**
 * Wave 1 merges, batch 3 — the last three clusters: algae, filters, goldfish.
 *
 *   node docs/knowledge-center/wave-1/merges/build-merge-clusters.mjs
 *
 * Each surviving article takes a new body and the loser is unpublished behind a
 * permanent redirect. Rationale per cluster is in the SQL and in merges/README.md.
 */
import fs from "node:fs";
import path from "node:path";

const BASE = "https://aquavoiq.com";
const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const WAVE1 = path.join(HERE, "..");
const ID = "kc-wave1-merge-clusters-20260902";
const BACKUP = "blog_posts_backup_merge_clusters_20260902";

const MERGES = [
  {
    keep: "algae-war-guide",
    drop: "how-to-get-rid-of-green-algae",
    draft: "algae-hub.html",
    title: "دليل الطحالب: شخّص النوع قبل ما تعالج",
    excerpt:
      "الطحالب عرَض لفائض ضوء أو مغذيات، لا مرض يُقتل بدواء. جدول تشخيص بالنوع، وليش الطحالب البنية في الحوض الجديد تُترك ولا تُعالج.",
    why:
      "algae-war-guide already had the right structure — diagnose by type, because that is how a reader arrives. The loser was 93 words with one good point (anti-algae chemicals are a trap, which is absorbed) and one claim already corrected in batch 1 for listing live cleanup fish as AQUAVO stock. black-beard-algae-removal-steps is deliberately NOT merged: BBA is a distinct high-difficulty query and stays a spoke, linked from the hub table.",
  },
  {
    keep: "filter-types-guide",
    drop: "best-aquarium-filters-iraq",
    draft: "filter-hub.html",
    title: "أي فلتر يناسب حوضك؟ اختر بالحجم لا بالسعر",
    excerpt:
      "الفلتر لا ينظف الماء بل يسكّن البكتيريا التي تعالجه. جدول اختيار بحجم الحوض، مقارنة الأنواع الثلاثة، ومعدل التدوير الذي ينفع فعلاً.",
    why:
      "The two overlapped almost completely: one compared types, the other recommended by tank size. The merged article does both, and the types guide keeps the URL because it is the evergreen architecture the filter-media and sump-vs-canister spokes point back to. The size-based recommendation table is absorbed from the loser.",
  },
  {
    keep: "goldfish-5-deadly-mistakes-beginners",
    drop: "goldfish-bowl-myth",
    draft: "goldfish.html",
    title: "الجولدفش: خمس أخطاء تبدأ قبل ما تشتري السمكة",
    excerpt:
      "الجولدفش ليست سمكة صغيرة ولا استوائية: تصل 25-30 سم، تحتاج ماءً بارداً وحوضاً من 110 لتر وفلترة أقوى من الاستوائية — وهي من أسوأ الخيارات لصيف حار.",
    why:
      "The two contradicted each other in production: the bowl-myth article said 75 L minimum while the 5-mistakes article opened by saying goldfish are easy to keep in small tanks. Both understated it. Sources put common goldfish at 25-30 cm adult length and a minimum around 110 L for one fish, so the merged article corrects UPWARD rather than splitting the difference. The broader slug survives because 'goldfish mistakes' is the wider query; the bowl content becomes mistake one.",
  },
];

const q = (s) => "'" + s.replace(/'/g, "''") + "'";
// Postgres length() counts characters; JavaScript .length counts UTF-16 code
// units, so any astral character — an emoji in a legacy title or body — makes
// the two disagree by one per occurrence. Pinning the pre-flight to the JS
// number silently mis-pins exactly those rows, which is what algae-war-guide
// (it carries an emoji) did. Count code points instead.
const pgLength = (s) => [...s].length;
const lf = (t) => t.split(String.fromCharCode(13) + String.fromCharCode(10)).join(String.fromCharCode(10));

let body = "";
for (const m of MERGES) {
  for (const slug of [m.keep, m.drop]) {
    const res = await fetch(`${BASE}/api/blog/posts/${slug}`);
    if (!res.ok) throw new Error(`${slug}: ${res.status}`);
    const data = await res.json();
    const p = data.post ?? data;
    if (!p?.id) throw new Error(`${slug}: no id`);
    m[slug === m.keep ? "keepRow" : "dropRow"] = p;
  }
  const html = fs.readFileSync(path.join(WAVE1, m.draft), "utf8").trim();
  console.log(`${m.keep}: ${pgLength(m.keepRow.content)} -> ${pgLength(html)}   (drops ${m.drop})`);

  body += `-- ${m.keep}  <-  ${m.drop}
--   ${m.why}
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM blog_posts WHERE slug = ${q(m.keep)} AND is_published
     AND length(content) = ${pgLength(m.keepRow.content)};
  IF n <> 1 THEN RAISE EXCEPTION '${m.keep}: survivor missing or changed since drafting'; END IF;
  SELECT count(*) INTO n FROM blog_posts WHERE slug = ${q(m.drop)} AND is_published;
  IF n <> 1 THEN RAISE EXCEPTION '${m.drop}: merge source missing or already unpublished'; END IF;
END $$;

UPDATE blog_posts SET title = ${q(m.title)}, excerpt = ${q(m.excerpt)}, content = ${q(html)}
 WHERE slug = ${q(m.keep)};

UPDATE blog_posts SET is_published = FALSE WHERE slug = ${q(m.drop)};

`;
}

const sql = `-- Migration ID: ${ID}
-- Target:       Neon production, blog_posts (3 rewritten, 3 unpublished)
-- Rollback:     rollback-merge-clusters.sql
-- Pairs with:   three permanent redirects added to vercel.json in the same commit.
--
-- The last three Wave 1 merge clusters. One correction is substantive rather
-- than editorial: the two goldfish articles contradicted each other on tank
-- size, and both understated it. The merged article corrects upward to the
-- sourced figures instead of splitting the difference.
--
-- All three drafts passed script-purity, editorial and business-truth via
-- scripts/gate-draft.ts before this file was generated.

BEGIN;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM blog_posts WHERE is_published;
  IF n <> 75 THEN RAISE EXCEPTION 'expected 75 published posts, found %', n; END IF;
END $$;

CREATE TABLE ${BACKUP} AS
SELECT id, slug, title, excerpt, content, is_published, now() AS backed_up_at
  FROM blog_posts;

${body}-- Post-flight.
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM blog_posts
   WHERE slug IN (${MERGES.map((m) => q(m.keep)).join(", ")})
     AND is_published AND length(content) > 3000
     AND content LIKE '%<table%' AND content LIKE '%href="/blog/%';
  IF n <> ${MERGES.length} THEN RAISE EXCEPTION 'only % of ${MERGES.length} survivors carry their structure', n; END IF;

  SELECT count(*) INTO n FROM blog_posts
   WHERE slug IN (${MERGES.map((m) => q(m.drop)).join(", ")}) AND is_published;
  IF n <> 0 THEN RAISE EXCEPTION 'a merge source is still published'; END IF;

  SELECT count(*) INTO n FROM blog_posts WHERE is_published;
  IF n <> 72 THEN RAISE EXCEPTION 'expected 72 published posts after the merges, found %', n; END IF;

  -- The BBA spoke must survive: it is linked from the new algae hub, and a
  -- redirect or unpublish there would strand that link.
  SELECT count(*) INTO n FROM blog_posts WHERE slug = 'black-beard-algae-removal-steps' AND is_published;
  IF n <> 1 THEN RAISE EXCEPTION 'the BBA spoke is no longer published'; END IF;

  -- The contradiction this batch exists to fix must be gone.
  SELECT count(*) INTO n FROM blog_posts
   WHERE slug = 'goldfish-5-deadly-mistakes-beginners'
     AND content LIKE '%' || 'يمكن تربيتها بسهولة في الأحواض الصغيرة' || '%';
  IF n <> 0 THEN RAISE EXCEPTION 'the small-tank goldfish claim survived'; END IF;

  -- The one guard rule SQL can state faithfully.
  SELECT count(*) INTO n FROM blog_posts
   WHERE slug IN (${MERGES.map((m) => q(m.keep)).join(", ")})
     AND content ~ '[一-鿿぀-ヿ가-힯Ѐ-ӿऀ-ॿ฀-๿֐-׿Ā-ɏḀ-ỿ]';
  IF n <> 0 THEN RAISE EXCEPTION 'a rewrite introduced stray script'; END IF;
END $$;

COMMIT;
`;

fs.writeFileSync(path.join(HERE, "migration-merge-clusters.sql"), lf(sql));
fs.writeFileSync(
  path.join(HERE, "rollback-merge-clusters.sql"),
  lf(`-- Rollback for ${ID}. Restores all six rows verbatim.
-- Remove the matching vercel.json redirects too.

BEGIN;

UPDATE blog_posts b
   SET title = k.title, excerpt = k.excerpt, content = k.content, is_published = k.is_published
  FROM ${BACKUP} k
 WHERE b.id = k.id
   AND (b.content IS DISTINCT FROM k.content OR b.is_published IS DISTINCT FROM k.is_published);

COMMIT;
`),
);
console.log("emitted migration-merge-clusters.sql and rollback-merge-clusters.sql");

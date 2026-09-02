/**
 * Wave 1, three-way merge: the summer-heat cluster.
 *
 *   node docs/knowledge-center/wave-1/merges/build-merge-summer.mjs
 *
 * Three published articles competed for the same Iraqi query. The survivor
 * keeps the best slug and takes an entirely new body; the other two are
 * unpublished behind permanent redirects. Reasoning in dossier-summer-heat.md.
 */
import fs from "node:fs";
import path from "node:path";

const BASE = "https://aquavoiq.com";
const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const WAVE1 = path.join(HERE, "..");
const ID = "kc-wave1-merge-summer-20260902";
const BACKUP = "blog_posts_backup_merge_summer_20260902";

const KEEP = "protect-fish-iraqi-summer-50-degrees";
const DROP = [
  "iraqi-summer-aquarium-cooling",
  "كيف-تحافظ-على-أجواء-مريحة-لأحواض-السمك-في-حرارة-ال-1788055556978",
];
const TITLE = "كيف تحمي أسماكك في صيف العراق وحرارة الـ 50 مئوية؟";
const EXCERPT =
  "الحرارة ما تقتل السمكة مباشرة بل تخنقها: الأوكسجين يقل وحاجة السمكة له تزيد بنفس الوقت. جدول طوارئ بالدرجات، والطرق العملية مرتبة بالفائدة مقابل الكلفة.";

const html = fs.readFileSync(path.join(WAVE1, "summer-heat.html"), "utf8").trim();

async function row(slug) {
  const res = await fetch(`${BASE}/api/blog/posts/${encodeURIComponent(slug)}`);
  if (!res.ok) throw new Error(`${slug}: ${res.status}`);
  const body = await res.json();
  const p = body.post ?? body;
  if (!p?.id) throw new Error(`${slug}: no id`);
  return p;
}

const keepRow = await row(KEEP);
const dropRows = [];
for (const s of DROP) dropRows.push(await row(s));
console.log(`keep  ${KEEP}: ${keepRow.content.length} -> ${html.length} chars`);
for (const d of dropRows) console.log(`drop  ${d.slug}: ${d.content.length} chars`);

const q = (s) => "'" + s.replace(/'/g, "''") + "'";
const lf = (t) => t.split(String.fromCharCode(13) + String.fromCharCode(10)).join(String.fromCharCode(10));

const sql = `-- Migration ID: ${ID}
-- Target:       Neon production, blog_posts (1 rewritten, 2 unpublished)
-- Rollback:     rollback-merge-summer.sql
-- Pairs with:   two permanent redirects added to vercel.json in the same commit.
--
-- Three articles competed for the same query — the worst duplication in the
-- corpus. The survivor keeps the strongest slug ("50 degrees" is what Iraqi
-- readers actually type) and takes an entirely new body, because its own
-- content was circular and recommended cooling fans and fish air-conditioners
-- that do not exist in the catalogue.
--
-- The one article with real content (iraqi-summer-aquarium-cooling) is absorbed
-- and is the basis of the practical half. The third has a machine-generated
-- timestamp slug that is unusable as a URL.
--
-- The rewrite explains the mechanism the old pages never did: heat lowers the
-- dissolved-oxygen ceiling while raising the fish's demand, and the two move in
-- opposite directions at once. Sources and confidence in dossier-summer-heat.md.
-- Draft passed all three gates before this file was generated.

BEGIN;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM blog_posts WHERE is_published;
  IF n <> 77 THEN RAISE EXCEPTION 'expected 77 published posts, found %', n; END IF;

  SELECT count(*) INTO n FROM blog_posts WHERE slug = ${q(KEEP)} AND is_published
     AND length(content) = ${keepRow.content.length};
  IF n <> 1 THEN RAISE EXCEPTION 'survivor missing or changed since drafting'; END IF;

  SELECT count(*) INTO n FROM blog_posts WHERE slug IN (${DROP.map(q).join(", ")}) AND is_published;
  IF n <> 2 THEN RAISE EXCEPTION 'expected 2 published merge sources, found %', n; END IF;
END $$;

CREATE TABLE ${BACKUP} AS
SELECT id, slug, title, excerpt, content, is_published, now() AS backed_up_at
  FROM blog_posts;

UPDATE blog_posts SET title = ${q(TITLE)}, excerpt = ${q(EXCERPT)}, content = ${q(html)}
 WHERE slug = ${q(KEEP)};

UPDATE blog_posts SET is_published = FALSE WHERE slug IN (${DROP.map(q).join(", ")});

-- Post-flight.
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM blog_posts WHERE slug = ${q(KEEP)} AND is_published
     AND length(content) > 4000
     AND (length(content) - length(replace(content, '<table', ''))) / 6 >= 2
     AND content LIKE '%href="/blog/%';
  IF n <> 1 THEN RAISE EXCEPTION 'rewrite missing its structure'; END IF;

  SELECT count(*) INTO n FROM blog_posts WHERE slug IN (${DROP.map(q).join(", ")}) AND is_published;
  IF n <> 0 THEN RAISE EXCEPTION 'a merge source is still published'; END IF;

  SELECT count(*) INTO n FROM blog_posts WHERE is_published;
  IF n <> 75 THEN RAISE EXCEPTION 'expected 75 published posts after the merge, found %', n; END IF;

  -- Script purity is the one guard rule SQL can state faithfully; the
  -- context-sensitive rules are enforced by gate-draft.ts before this file
  -- exists and by the three corpus audits after it is applied.
  SELECT count(*) INTO n FROM blog_posts WHERE slug = ${q(KEEP)}
     AND content ~ '[一-鿿぀-ヿ가-힯Ѐ-ӿऀ-ॿ฀-๿֐-׿Ā-ɏḀ-ỿ]';
  IF n <> 0 THEN RAISE EXCEPTION 'rewrite introduced stray script'; END IF;
END $$;

COMMIT;
`;

fs.writeFileSync(path.join(HERE, "migration-merge-summer.sql"), lf(sql));
fs.writeFileSync(
  path.join(HERE, "rollback-merge-summer.sql"),
  lf(`-- Rollback for ${ID}. Restores all three rows verbatim.
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
console.log("emitted migration-merge-summer.sql and rollback-merge-summer.sql");

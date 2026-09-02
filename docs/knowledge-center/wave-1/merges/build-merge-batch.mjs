/**
 * Wave 1 merges, batch 2: two duplicate pairs collapse to one deepened article
 * each, and the loser is unpublished behind a permanent redirect.
 *
 *   node docs/knowledge-center/wave-1/merges/build-merge-batch.mjs
 *
 * Pins every pre-flight to the live rows, so a change between drafting and
 * applying aborts rather than overwrites.
 */
import fs from "node:fs";
import path from "node:path";

const BASE = "https://aquavoiq.com";
const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const WAVE1 = path.join(HERE, "..");
const ID = "kc-wave1-merge-batch2-20260902";
const BACKUP = "blog_posts_backup_merge_b2_20260902";

const MERGES = [
  {
    keep: "cloudy-water-fix",
    drop: "cloudy-aquarium-water-causes-fix",
    draft: "cloudy-water.html",
    title: "ماء الحوض معكّر؟ شخّصه باللون وعالجه صح",
    excerpt:
      "التعكر ثلاث مشاكل مختلفة تشترك بعرض واحد، ولون الماء يحدد أيها عندك. دليل تشخيصي: الأبيض الحليبي والأخضر والأصفر — وليش تغيير الماء الكثير يزيد الحالة الأولى سوءاً.",
    why:
      "cloudy-water-fix is the better of the pair: it diagnoses by water colour, which is how a reader actually arrives at this question. Its rival is generic and tells the reader to change 10-15% of the water DAILY, which is destabilising and wrong for a bacterial bloom specifically. Nothing from the loser is absorbed; its one real point (overfeeding is the root cause) the survivor already made, and now makes better.",
  },
  {
    keep: "real-vs-fake-plants-iraq",
    drop: "real-vs-fake-plants",
    draft: "real-vs-fake-plants.html",
    title: "نباتات طبيعية أم صناعية لحوض السمك في العراق؟",
    excerpt:
      "الطبيعي أفضل بيئياً، لكن انقطاع الكهرباء يقلب المعادلة أحياناً. مقارنة صريحة بين الطبيعي والحريري والبلاستيك، ومتى يكون الصناعي هو القرار الصحيح لا التنازل.",
    why:
      "The -iraq slug matches local search intent and carries the angle that actually differentiates this topic here: power cuts kill light-dependent plants, and a rotting plant raises ammonia. The species list and the silk-vs-hard-plastic fin warning are absorbed from the loser, which is the only content worth keeping from it.",
  },
];

const q = (s) => "'" + s.replace(/'/g, "''") + "'";
const lf = (t) => t.split(String.fromCharCode(13) + String.fromCharCode(10)).join(String.fromCharCode(10));

let body = "";
for (const m of MERGES) {
  for (const slug of [m.keep, m.drop]) {
    const res = await fetch(`${BASE}/api/blog/posts/${slug}`);
    if (!res.ok) throw new Error(`${slug}: ${res.status}`);
    const p = (await res.json()).post ?? (await (await fetch(`${BASE}/api/blog/posts/${slug}`)).json());
    if (!p?.id) throw new Error(`${slug}: no id`);
    m[slug === m.keep ? "keepRow" : "dropRow"] = p;
  }
  const html = fs.readFileSync(path.join(WAVE1, m.draft), "utf8").trim();
  m.html = html;
  console.log(`${m.keep}: ${m.keepRow.content.length} -> ${html.length} chars   (drops ${m.drop})`);

  body += `-- ${m.keep}  <-  ${m.drop}
--   ${m.why}
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM blog_posts WHERE slug = ${q(m.keep)} AND is_published
     AND length(content) = ${m.keepRow.content.length};
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
-- Target:       Neon production, blog_posts (4 rows: 2 rewritten, 2 unpublished)
-- Rollback:     rollback-merge-batch.sql
-- Pairs with:   the two permanent redirects added to vercel.json in the same commit.
--
-- Wave 1, priority 1 and 2 together: each pair of near-duplicate articles was
-- cannibalising its own query. The better of each pair is rewritten and
-- deepened, the other is unpublished behind a permanent redirect.
--
-- Both drafts passed script-purity, editorial and business-truth before this
-- file was generated (scripts/gate-draft.ts).

BEGIN;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM blog_posts WHERE is_published;
  IF n <> 79 THEN RAISE EXCEPTION 'expected 79 published posts, found %', n; END IF;
END $$;

CREATE TABLE ${BACKUP} AS
SELECT id, slug, title, excerpt, content, is_published, now() AS backed_up_at
  FROM blog_posts;

${body}-- Post-flight: two survivors deepened, two losers gone from the index, and
-- nothing else moved.
DO $$
DECLARE n int;
BEGIN
${MERGES.map(
  (m) => `  SELECT count(*) INTO n FROM blog_posts WHERE slug = ${q(m.keep)} AND is_published
     AND length(content) > 3000 AND content LIKE '%<table%' AND content LIKE '%href="/blog/%';
  IF n <> 1 THEN RAISE EXCEPTION '${m.keep}: rewrite missing its structure'; END IF;
  SELECT count(*) INTO n FROM blog_posts WHERE slug = ${q(m.drop)} AND is_published;
  IF n <> 0 THEN RAISE EXCEPTION '${m.drop}: still published'; END IF;
`,
).join("")}
  SELECT count(*) INTO n FROM blog_posts WHERE is_published;
  IF n <> 77 THEN RAISE EXCEPTION 'expected 77 published posts after the merges, found %', n; END IF;

  SELECT count(*) INTO n FROM blog_posts b JOIN ${BACKUP} k USING (id)
   WHERE b.content IS DISTINCT FROM k.content;
  IF n <> 2 THEN RAISE EXCEPTION 'expected 2 content rewrites, got %', n; END IF;

  SELECT count(*) INTO n FROM blog_posts b JOIN ${BACKUP} k USING (id)
   WHERE b.is_published IS DISTINCT FROM k.is_published;
  IF n <> 2 THEN RAISE EXCEPTION 'expected 2 unpublished rows, got %', n; END IF;
END $$;

-- Script purity on the two rewritten rows. This is the ONE guard rule SQL can
-- state faithfully — it is the same character class shared/script-purity.ts
-- rejects. The business and editorial rules are context-sensitive (a warranty
-- word is only a claim when it is *offered*; a marketplace name is allowed on a
-- comparison page), so re-stating them as substring greps here would be a
-- cruder rule than the guard and would fail on articles the guard passes. It
-- did, on 15 of them. Those rules are enforced where they can be enforced
-- honestly: scripts/gate-draft.ts before this file is generated, and the three
-- corpus audits after it is applied.
DO $$
DECLARE hit text;
BEGIN
  SELECT string_agg(slug, ', ') INTO hit FROM blog_posts
   WHERE slug IN (${MERGES.map((m) => q(m.keep)).join(", ")})
     AND content ~ '[一-鿿぀-ヿ가-힯Ѐ-ӿऀ-ॿ฀-๿֐-׿Ā-ɏḀ-ỿ]';
  IF hit IS NOT NULL THEN RAISE EXCEPTION 'rewrite introduced stray script: %', hit; END IF;
END $$;

COMMIT;
`;

fs.writeFileSync(path.join(HERE, "migration-merge-batch.sql"), lf(sql));
fs.writeFileSync(
  path.join(HERE, "rollback-merge-batch.sql"),
  lf(`-- Rollback for ${ID}. Restores all four rows verbatim.
-- Remove the matching vercel.json redirects too, or the merged URLs stay
-- unreachable regardless of publication state.

BEGIN;

UPDATE blog_posts b
   SET title = k.title, excerpt = k.excerpt, content = k.content, is_published = k.is_published
  FROM ${BACKUP} k
 WHERE b.id = k.id
   AND (b.content IS DISTINCT FROM k.content OR b.is_published IS DISTINCT FROM k.is_published);

COMMIT;
`),
);
console.log("emitted migration-merge-batch.sql and rollback-merge-batch.sql");

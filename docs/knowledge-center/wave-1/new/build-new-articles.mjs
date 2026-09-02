/**
 * Wave 1 — publish three new canonical articles, and repair one internal link.
 *
 *   node docs/knowledge-center/wave-1/new/build-new-articles.mjs
 *
 * These three are Topic Registry gaps: none appears in any published title, and
 * "تغيير الماء" is referenced by ten articles while being owned by none.
 * Dossier and claim ledgers in dossier-wave1-new.md.
 */
import fs from "node:fs";
import path from "node:path";

const BASE = "https://aquavoiq.com";
const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const WAVE1 = path.join(HERE, "..");
const ID = "kc-wave1-new-articles-20260902";
const BACKUP = "blog_posts_backup_new_articles_20260902";

const NEW = [
  {
    slug: "aquarium-water-change-guide",
    draft: "water-change.html",
    category: "للمبتدئين",
    icon: "Droplet",
    title: "تغيير ماء الحوض: كم، ومتى، وكيف بالضبط",
    excerpt:
      "الفلتر لا يزيل النترات — تغيير الماء هو الطريقة الوحيدة لإخراجها. خطوات التنفيذ، والأخطاء التي تحوّل التغيير إلى مشكلة، وقاعدة قرار تحدد جدولك بدل نسبة ثابتة.",
  },
  {
    slug: "quarantine-new-fish-guide",
    draft: "quarantine.html",
    category: "للمبتدئين",
    icon: "Shield",
    title: "الحجر الصحي للسمكة الجديدة: ليش أسابيع مو أيام",
    excerpt:
      "أغلب الأمراض تدخل الحوض مع سمكة تبدو سليمة، لأن للطفيليات أطواراً مخفية. حوض حجر بسيط، مدة معقولة، وخطوات عملية إن لم يكن عندك واحد.",
  },
  {
    slug: "how-many-fish-in-aquarium",
    draft: "stocking.html",
    category: "للمبتدئين",
    icon: "Fish",
    title: "كم سمكة يتحمل حوضك؟ وليش قاعدة الإنش لكل غالون غلط",
    excerpt:
      "القاعدة الشائعة تتجاهل كتلة الجسم والفلترة ومساحة السطح والسلوك. العوامل الخمسة التي تقرر فعلاً، والاختبار الذي يعطيك الجواب عن حوضك أنت.",
  },
];

// One repair rides along: the nitrogen hub links to an article this Wave's own
// merge unpublished. The redirect catches the reader, but an internal link
// should point at the canonical directly rather than spend a hop.
const RELINK = {
  slug: "nitrogen-cycle-simple-arabic-explained",
  from: "/blog/cloudy-aquarium-water-causes-fix",
  to: "/blog/cloudy-water-fix",
};

const q = (s) => "'" + s.replace(/'/g, "''") + "'";
const pgLength = (s) => [...s].length;
const lf = (t) => t.split(String.fromCharCode(13) + String.fromCharCode(10)).join(String.fromCharCode(10));

// Every new slug must be genuinely free.
const listBody = await (await fetch(`${BASE}/api/blog/posts`)).json();
const live = new Set((Array.isArray(listBody) ? listBody : listBody.posts).map((p) => p.slug));
for (const n of NEW) {
  if (live.has(n.slug)) throw new Error(`${n.slug}: slug already published`);
  n.html = fs.readFileSync(path.join(HERE, n.draft), "utf8").trim();
  console.log(`new  ${n.slug}: ${pgLength(n.html)} chars`);
}

const hubRes = await fetch(`${BASE}/api/blog/posts/${RELINK.slug}`);
const hubBody = await hubRes.json();
const hub = hubBody.post ?? hubBody;
if (!hub.content.includes(RELINK.from)) throw new Error("relink target not present in the hub");
const hubFixed = hub.content.split(RELINK.from).join(RELINK.to);
console.log(`relink ${RELINK.slug}: ${RELINK.from} -> ${RELINK.to}`);

const sql = `-- Migration ID: ${ID}
-- Target:       Neon production, blog_posts (3 inserts, 1 link repair)
-- Rollback:     rollback-new-articles.sql
--
-- Publishes three new canonical articles. All three are Topic Registry gaps
-- confirmed against the live corpus — none appears in any published title — and
-- the water-change one closes the largest hole in the corpus: ten articles tell
-- the reader to change water and none of them owns the instruction.
--
-- Claim ledgers, sources and the RESEARCH BLOCKED items are in
-- dossier-wave1-new.md. In particular none of the three publishes a number the
-- sources do not support: no universal water-change percentage, no single
-- quarantine duration, and no stocking formula. Each gives the decision rule and
-- the reading that settles it.
--
-- All three drafts passed script-purity, editorial, business-truth AND internal
-- link resolution via scripts/gate-draft.ts before this file was generated.
--
-- The link repair rides along because this Wave's own merge unpublished the
-- article the nitrogen hub pointed at. The redirect catches the reader; an
-- internal link should not need it.

BEGIN;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM blog_posts WHERE is_published;
  IF n <> 72 THEN RAISE EXCEPTION 'expected 72 published posts, found %', n; END IF;

  SELECT count(*) INTO n FROM blog_posts WHERE slug IN (${NEW.map((x) => q(x.slug)).join(", ")});
  IF n <> 0 THEN RAISE EXCEPTION 'one of the new slugs already exists'; END IF;

  SELECT count(*) INTO n FROM blog_posts WHERE slug = ${q(RELINK.slug)} AND is_published
     AND length(content) = ${pgLength(hub.content)};
  IF n <> 1 THEN RAISE EXCEPTION 'hub missing or changed since drafting'; END IF;
END $$;

CREATE TABLE ${BACKUP} AS
SELECT id, slug, title, excerpt, content, is_published, now() AS backed_up_at
  FROM blog_posts;

${NEW.map(
  (n) => `INSERT INTO blog_posts (title, slug, excerpt, content, category, icon_name, author, is_published, published_at)
VALUES (${q(n.title)}, ${q(n.slug)}, ${q(n.excerpt)}, ${q(n.html)}, ${q(n.category)}, ${q(n.icon)},
        'AQUAVO Editorial Team', TRUE, now());
`,
).join("\n")}
UPDATE blog_posts SET content = ${q(hubFixed)} WHERE slug = ${q(RELINK.slug)};

-- Post-flight.
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM blog_posts WHERE is_published;
  IF n <> 75 THEN RAISE EXCEPTION 'expected 75 published posts after the inserts, found %', n; END IF;

  SELECT count(*) INTO n FROM blog_posts
   WHERE slug IN (${NEW.map((x) => q(x.slug)).join(", ")})
     AND is_published AND length(content) > 3000
     AND content LIKE '%<table%' AND content LIKE '%href="/blog/%'
     AND author = 'AQUAVO Editorial Team';
  IF n <> ${NEW.length} THEN RAISE EXCEPTION 'only % of ${NEW.length} new articles are complete', n; END IF;

  SELECT count(*) INTO n FROM blog_posts
   WHERE slug = ${q(RELINK.slug)} AND content LIKE '%' || ${q(RELINK.from)} || '%';
  IF n <> 0 THEN RAISE EXCEPTION 'the stale hub link survived'; END IF;

  -- No published article may link to an unpublished one. This is the check that
  -- would have caught the hub link before it shipped.
  SELECT count(*) INTO n
    FROM blog_posts b
    CROSS JOIN LATERAL regexp_matches(b.content, 'href="/blog/([^"#?]+)"', 'g') AS m(parts)
   WHERE b.is_published
     AND NOT EXISTS (
       SELECT 1 FROM blog_posts t WHERE t.slug = m.parts[1] AND t.is_published
     );
  IF n <> 0 THEN RAISE EXCEPTION '% internal links point at unpublished articles', n; END IF;

  SELECT count(*) INTO n FROM blog_posts
   WHERE slug IN (${NEW.map((x) => q(x.slug)).join(", ")})
     AND content ~ '[一-鿿぀-ヿ가-힯Ѐ-ӿऀ-ॿ฀-๿֐-׿Ā-ɏḀ-ỿ]';
  IF n <> 0 THEN RAISE EXCEPTION 'a new article carries stray script'; END IF;
END $$;

COMMIT;
`;

fs.writeFileSync(path.join(HERE, "migration-new-articles.sql"), lf(sql));
fs.writeFileSync(
  path.join(HERE, "rollback-new-articles.sql"),
  lf(`-- Rollback for ${ID}. Deletes the three new articles and restores the hub.

BEGIN;

DELETE FROM blog_posts WHERE slug IN (${NEW.map((x) => q(x.slug)).join(", ")});

UPDATE blog_posts b SET content = k.content
  FROM ${BACKUP} k
 WHERE b.id = k.id AND b.content IS DISTINCT FROM k.content;

COMMIT;
`),
);
console.log(`emitted migration-new-articles.sql (${NEW.length} inserts + 1 relink)`);

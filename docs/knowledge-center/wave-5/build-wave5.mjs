/**
 * Wave 2 — publish four new canonical articles.
 *
 *   node docs/knowledge-center/wave-2/build-wave2.mjs
 *
 * All four are Topic Registry gaps confirmed against the live corpus: none
 * appears in any published title. Dossier, claim ledgers and the RESEARCH
 * BLOCKED items are in dossier-wave2.md.
 */
import fs from "node:fs";
import path from "node:path";

const BASE = "https://aquavoiq.com";
const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const ID = "kc-wave5-articles-20260902";
const BACKUP = "blog_posts_backup_wave5_20260902";

const NEW = [
  {
    slug: "aquarium-fish-feeding-guide",
    draft: "feeding.html",
    category: "للمبتدئين",
    icon: "Utensils",
    title: "تغذية أسماك الزينة: كم مرة، كم كمية، وأي نوع",
    excerpt:
      "الإفراط بالعلف هو السبب الجذري لأغلب مشاكل الحوض. قاعدة الدقيقتين، جدول حسب الحالة، والفرق العملي بين الحبيبات والرقائق والمجفف بالتجميد.",
  },
  {
    slug: "fish-fungus-vs-columnaris",
    draft: "fungus.html",
    category: "مشاكل وحلول",
    icon: "AlertTriangle",
    title: "الزغب الأبيض: فطر حقيقي أم كولومناريس بكتيري؟",
    excerpt:
      "أغلب ما يسمّيه الهواة فطراً بكتيريا لا تستجيب لأي مضاد فطري. كيف تفرّق بالنظر، وليش رفع الحرارة هنا قد يسرّع المرض بدل ما يعالجه.",
  },
  {
    slug: "aquarium-airborne-toxins",
    draft: "airborne.html",
    category: "مشاكل وحلول",
    icon: "Wind",
    title: "سموم الهواء: كيف يقتل بخّاخ الحشرات حوضك في ساعات",
    excerpt:
      "مضخة الهواء تسحب هواء الغرفة وتضخّه في الماء مباشرة. هذا يفسّر موتاً جماعياً مفاجئاً مع فحص ماء سليم تماماً — والوقاية أبسط مما تظن.",
  },
  {
    slug: "why-fish-jump-out-aquarium",
    draft: "jumping.html",
    category: "مشاكل وحلول",
    icon: "ArrowUp",
    title: "ليش تقفز الأسماك خارج الحوض؟ والغطاء الصحيح",
    excerpt:
      "القفز عرَض قبل أن يكون عادة: ماء متدهور أو نقص أوكسجين أو مطاردة. ولماذا الغطاء المحكم تماماً خطر على الأنواع التي تتنفس هواء الجو.",
  },
];

const q = (s) => "'" + s.replace(/'/g, "''") + "'";
const pgLength = (s) => [...s].length;
const lf = (t) => t.split(String.fromCharCode(13) + String.fromCharCode(10)).join(String.fromCharCode(10));

const listBody = await (await fetch(`${BASE}/api/blog/posts`)).json();
const liveSlugs = (Array.isArray(listBody) ? listBody : listBody.posts).map((p) => p.slug);
const live = new Set(liveSlugs);
const publishedCount = liveSlugs.length;

for (const n of NEW) {
  if (live.has(n.slug)) throw new Error(`${n.slug}: slug already published`);
  n.html = fs.readFileSync(path.join(HERE, n.draft), "utf8").trim();
  // Every internal link must resolve against the live corpus plus the slugs
  // this same migration creates.
  const linked = [...n.html.matchAll(/href="\/blog\/([^"#?]+)"/g)].map((m) => decodeURIComponent(m[1]));
  const dead = linked.filter((s) => !live.has(s) && !NEW.some((x) => x.slug === s));
  if (dead.length) throw new Error(`${n.slug}: dead links ${dead.join(", ")}`);
  console.log(`new  ${n.slug}: ${pgLength(n.html)} chars, ${linked.length} internal links`);
}

const sql = `-- Migration ID: ${ID}
-- Target:       Neon production, blog_posts (${NEW.length} inserts)
-- Rollback:     rollback-wave5.sql
--
-- Wave 2: four Topic Registry gaps, none of which appears in any published
-- title. Claim ledgers, sources and the RESEARCH BLOCKED items are in
-- dossier-wave2.md.
--
-- Two of the four rest on genuinely contested evidence and say so rather than
-- picking a side: whether a long open-bag drip is safer than a fast transfer
-- for shipped fish, and whether scaleless species tolerate aquarium salt. In
-- both cases the practical advice follows from the disagreement itself, so no
-- source had to be overstated to make the article useful.
--
-- No dose is published for salt as an ich treatment: doses vary between sources
-- and species, and the corpus already stands behind the temperature-plus-
-- medication protocol in the white-spot article.
--
-- AQUAVO sells no aquarium salt, so that article names no product at all — the
-- business-truth guard would reject an availability claim there, correctly.
--
-- All four drafts passed script-purity, editorial, business-truth, internal
-- link resolution and block-tag balance via scripts/gate-draft.ts.

BEGIN;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM blog_posts WHERE is_published;
  IF n <> ${publishedCount} THEN RAISE EXCEPTION 'expected ${publishedCount} published posts, found %', n; END IF;

  SELECT count(*) INTO n FROM blog_posts WHERE slug IN (${NEW.map((x) => q(x.slug)).join(", ")});
  IF n <> 0 THEN RAISE EXCEPTION 'one of the new slugs already exists'; END IF;
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
-- Post-flight.
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM blog_posts WHERE is_published;
  IF n <> ${publishedCount + NEW.length} THEN RAISE EXCEPTION 'expected ${publishedCount + NEW.length} published posts, found %', n; END IF;

  SELECT count(*) INTO n FROM blog_posts
   WHERE slug IN (${NEW.map((x) => q(x.slug)).join(", ")})
     AND is_published AND length(content) > 2500
     AND content LIKE '%<table%' AND content LIKE '%href="/blog/%'
     AND author = 'AQUAVO Editorial Team';
  IF n <> ${NEW.length} THEN RAISE EXCEPTION 'only % of ${NEW.length} new articles are complete', n; END IF;

  -- No published article may link to an unpublished one, corpus-wide.
  SELECT count(*) INTO n
    FROM blog_posts b
    CROSS JOIN LATERAL regexp_matches(b.content, 'href="/blog/([^"#?]+)"', 'g') AS m(parts)
   WHERE b.is_published
     AND NOT EXISTS (SELECT 1 FROM blog_posts t WHERE t.slug = m.parts[1] AND t.is_published);
  IF n <> 0 THEN RAISE EXCEPTION '% internal links point at unpublished articles', n; END IF;

  SELECT count(*) INTO n FROM blog_posts
   WHERE slug IN (${NEW.map((x) => q(x.slug)).join(", ")})
     AND content ~ '[一-鿿぀-ヿ가-힯Ѐ-ӿऀ-ॿ฀-๿֐-׿Ā-ɏḀ-ỿ]';
  IF n <> 0 THEN RAISE EXCEPTION 'a new article carries stray script'; END IF;
END $$;

COMMIT;
`;

fs.writeFileSync(path.join(HERE, "migration-wave5.sql"), lf(sql));
fs.writeFileSync(
  path.join(HERE, "rollback-wave5.sql"),
  lf(`-- Rollback for ${ID}. Deletes the four new articles.

BEGIN;

DELETE FROM blog_posts WHERE slug IN (${NEW.map((x) => q(x.slug)).join(", ")});

COMMIT;
`),
);
console.log(`emitted migration-wave5.sql (${NEW.length} inserts)`);

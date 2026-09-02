/**
 * Wave 3 — the diagnosis hub, and the oxygen article the corpus kept referring to.
 *
 *   node docs/knowledge-center/wave-3/build-wave3.mjs
 *
 * Selection came from the regenerated Topic Registry (79 published articles),
 * ranked by mentions-without-ownership, safety, link opportunity and local
 * usefulness. See dossier-wave3.md.
 */
import fs from "node:fs";
import path from "node:path";

const BASE = "https://www.aquavoiq.com";
const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const ID = "kc-wave6-articles-20260902";
const BACKUP = "blog_posts_backup_wave6_20260902";

// New article: nothing in the corpus owns symptom-to-cause diagnosis.
const NEW = [
  {
    slug: "angelfish-care-guide",
    draft: "angelfish.html",
    category: "أنواع الأسماك",
    icon: "Fish",
    title: "الأنجل فيش: سمكة سيكلد بمظهر مسالم",
    excerpt:
      "تُباع بحجم عملة وتصل 15 سم طولاً و20 ارتفاعاً، وهي سيكلد تصير إقليمية عند البلوغ. ولماذا ارتفاع الحوض يهمّها أكثر من طوله.",
  },
  {
    slug: "gourami-care-guide",
    draft: "gourami.html",
    category: "أنواع الأسماك",
    icon: "Fish",
    title: "الغورامي: سمكة تتنفس هواء الجو، وماذا يعني ذلك عملياً",
    excerpt:
      "العضو المتاهي يمنحها هامش أمان مع انقطاع الكهرباء وحرارة الصيف — لكنه يعني أيضاً أن الغطاء المحكم تماماً خطر عليها.",
  },
];

// Strategic reframe, not a merge. The registry found "الأكسجة والتهوية"
// mentioned in 21 articles and owned by none — the largest unowned topic in the
// corpus. air-pumps-decoration-or-necessity is the closest thing, but it is
// about the *device*; the gap is about dissolved oxygen as a *parameter*.
// Publishing a separate oxygen article would cannibalise it, so this one is
// widened to own the parameter, with the pump as one answer inside it.
const REFRAME = {
  slug: "ammonia-spike-emergency-treatment",
  draft: "ammonia.html",
  title: "ارتفاع الأمونيا المفاجئ: افعل هذا الآن، بهذا الترتيب",
  excerpt:
    "عشرة مقالات على هذا الموقع تحيلك هنا وقت الطوارئ، فهذي الخطوات الست مرتبة بالأولوية — ولماذا تنظيف الفلتر الآن يحوّل المشكلة إلى كارثة.",
};

const q = (s) => "'" + s.replace(/'/g, "''") + "'";
const pgLength = (s) => [...s].length;
const lf = (t) => t.split(String.fromCharCode(13) + String.fromCharCode(10)).join(String.fromCharCode(10));

const listBody = await (await fetch(`${BASE}/api/blog/posts`)).json();
const liveSlugs = (Array.isArray(listBody) ? listBody : listBody.posts).map((p) => p.slug);
const live = new Set(liveSlugs);
const published = liveSlugs.length;

const created = new Set(NEW.map((n) => n.slug));
for (const item of [...NEW, REFRAME]) {
  item.html = fs.readFileSync(path.join(HERE, item.draft), "utf8").trim();
  const linked = [...item.html.matchAll(/href="\/blog\/([^"#?]+)"/g)].map((m) => decodeURIComponent(m[1]));
  const dead = linked.filter((s) => !live.has(s) && !created.has(s));
  if (dead.length) throw new Error(`${item.slug}: dead links ${dead.join(", ")}`);
  item.links = linked.length;
}
for (const n of NEW) {
  if (live.has(n.slug)) throw new Error(`${n.slug}: slug already published`);
  console.log(`new      ${n.slug}: ${pgLength(n.html)} chars, ${n.links} links`);
}
const rRes = await fetch(`${BASE}/api/blog/posts/${REFRAME.slug}`);
const rBody = await rRes.json();
const rRow = rBody.post ?? rBody;
if (!rRow?.id) throw new Error("reframe target not found");
console.log(`reframe  ${REFRAME.slug}: ${pgLength(rRow.content)} -> ${pgLength(REFRAME.html)} chars, ${REFRAME.links} links`);

const sql = `-- Migration ID: ${ID}
-- Target:       Neon production, blog_posts (1 insert, 1 rewrite)
-- Rollback:     rollback-wave6.sql
--
-- Selection came from the Topic Registry regenerated against the 79 published
-- articles, ranked by how many articles mention a topic without owning it,
-- safety weight, internal-link opportunity and local usefulness.
--
-- INSERT: fish-disease-symptoms-diagnosis. Nine articles reference symptoms and
-- none owns diagnosis. It leads with the point that matters most for safety —
-- most sudden "disease" in a beginner tank is water poisoning wearing the same
-- symptoms, and medicating it makes things worse.
--
-- REWRITE: air-pumps-decoration-or-necessity, widened rather than replaced.
-- "الأكسجة والتهوية" is mentioned in 21 articles and owned by none, the largest
-- unowned topic in the corpus. Publishing a separate oxygen article would have
-- cannibalised the air-pump page, so the air-pump page is widened to own the
-- parameter with the pump as one answer inside it. The URL is unchanged.
--
-- On the bubbles question the article declines the popular hobby line. "Bubbles
-- do not oxygenate, only surface agitation does" is an oversimplification: gas
-- exchange happens at any air-water interface, including each bubble's, and the
-- relative contribution depends on tank geometry. The practical advice is the
-- same either way, so nothing is lost by being accurate.
--
-- Both drafts passed script-purity, editorial, business-truth, link resolution
-- and tag balance via scripts/gate-draft.ts.

BEGIN;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM blog_posts WHERE is_published;
  IF n <> ${published} THEN RAISE EXCEPTION 'expected ${published} published posts, found %', n; END IF;

  SELECT count(*) INTO n FROM blog_posts WHERE slug IN (${NEW.map((x) => q(x.slug)).join(", ")});
  IF n <> 0 THEN RAISE EXCEPTION 'the new slug already exists'; END IF;

  SELECT count(*) INTO n FROM blog_posts WHERE slug = ${q(REFRAME.slug)} AND is_published
     AND length(content) = ${pgLength(rRow.content)};
  IF n <> 1 THEN RAISE EXCEPTION 'reframe target missing or changed since drafting'; END IF;
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
UPDATE blog_posts SET title = ${q(REFRAME.title)}, excerpt = ${q(REFRAME.excerpt)}, content = ${q(REFRAME.html)}
 WHERE slug = ${q(REFRAME.slug)};

-- Post-flight.
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM blog_posts WHERE is_published;
  IF n <> ${published + NEW.length} THEN RAISE EXCEPTION 'expected ${published + NEW.length} published, found %', n; END IF;

  SELECT count(*) INTO n FROM blog_posts
   WHERE slug IN (${[...NEW.map((x) => x.slug), REFRAME.slug].map(q).join(", ")})
     AND is_published AND length(content) > 2500
     AND content LIKE '%<table%' AND content LIKE '%href="/blog/%';
  IF n <> ${NEW.length + 1} THEN RAISE EXCEPTION 'only % of ${NEW.length + 1} articles carry their structure', n; END IF;

  -- No published article may link to an unpublished one, corpus-wide.
  SELECT count(*) INTO n
    FROM blog_posts b
    CROSS JOIN LATERAL regexp_matches(b.content, 'href="/blog/([^"#?]+)"', 'g') AS m(parts)
   WHERE b.is_published
     AND NOT EXISTS (SELECT 1 FROM blog_posts t WHERE t.slug = m.parts[1] AND t.is_published);
  IF n <> 0 THEN RAISE EXCEPTION '% internal links point at unpublished articles', n; END IF;

  SELECT count(*) INTO n FROM blog_posts
   WHERE slug IN (${[...NEW.map((x) => x.slug), REFRAME.slug].map(q).join(", ")})
     AND content ~ '[一-鿿぀-ヿ가-힯Ѐ-ӿऀ-ॿ฀-๿֐-׿Ā-ɏḀ-ỿ]';
  IF n <> 0 THEN RAISE EXCEPTION 'stray script in a Wave 3 article'; END IF;
END $$;

COMMIT;
`;

fs.writeFileSync(path.join(HERE, "migration-wave6.sql"), lf(sql));
fs.writeFileSync(
  path.join(HERE, "rollback-wave6.sql"),
  lf(`-- Rollback for ${ID}.

BEGIN;

DELETE FROM blog_posts WHERE slug IN (${NEW.map((x) => q(x.slug)).join(", ")});

UPDATE blog_posts b SET title = k.title, excerpt = k.excerpt, content = k.content
  FROM ${BACKUP} k
 WHERE b.id = k.id AND b.content IS DISTINCT FROM k.content;

COMMIT;
`),
);
console.log("emitted migration-wave6.sql");

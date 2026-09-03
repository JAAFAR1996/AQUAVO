/**
 * Wave 10 — Discovery Cycle 10.
 *
 *   node docs/knowledge-center/wave-10/build-wave10.mjs
 *
 * Three new canonical topics, one deepening, and the slug normalisation that
 * Cycle 9 deferred. Decisions and evidence are in dossier-wave10.md.
 */
import fs from "node:fs";
import path from "node:path";

const BASE = "https://www.aquavoiq.com";
const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const ID = "kc-wave10-articles-20260903";
const BACKUP = "blog_posts_backup_wave10_20260903";

// The corpus owns no dwarf cichlid, no egg-layer breeding, and no fry rearing.
// All three were confirmed absent across the full text of every live article.
const NEW = [
  { slug:"dwarf-cichlids-guide", draft:"dwarf-cichlids.html", category:"أنواع الأسماك", icon:"Fish",
    title:"السيكلد القزم (رام وأبيستو): سيكلد بحجم الحوض المجتمعي",
    excerpt:"ذكاء السيكلد وسلوكه الترابي ببضعة سنتيمترات. وليش يموت البلو رام بسرعة عند كثيرين — والبديل الأسهل اللي يعطي نفس الشكل تقريباً." },
  { slug:"fish-breeding-basics", draft:"breeding-basics.html", category:"للمبتدئين", icon:"Heart",
    title:"التفريخ كقرار: ولود أم بايض، وهل تريده أصلاً؟",
    excerpt:"السؤال يسبق الطريقة: وين يروح الناتج؟ الفرق بين الولودة والبايضة، وأربع مدارس مختلفة داخل البايضة تغيّر التحضير كلياً." },
  { slug:"raising-fish-fry", draft:"fry-rearing.html", category:"للمبتدئين", icon:"Droplets",
    title:"تربية الصغار: من الفقس إلى حجم البيع",
    excerpt:"أغلب الصغار ما تموت جوعاً — تموت لأن الطعام أكبر من فمها. والتقزّم ضرر دائم لا يُعوَّض حتى بظروف ممتازة لاحقاً." },
];

// Rainbowfish are GROUPed here rather than given a page: same intent (which
// schooling fish to buy) as the article Cycle 9 published, different size class.
const REFRAMES = [
  { slug:"small-schooling-fish-selection", draft:"schooling-selection-deepened.html",
    title:"التيترا والرازبورا والدانيو: أي سمكة سربية تختار؟",
    excerpt:"ثلاث عوائل تُباع كأنها شي واحد. الفرق بين النيون والكاردينال بفحص بصري واحد، وليش ليست كل تيترا مسالمة — وأي سرب تختار إذا أردت حجماً أكبر." },
];

// The last orphan in the corpus. Its slug is raw Arabic, which the corpus-wide
// dead-link post-flight cannot match against a percent-encoded href, so it
// could not be linked until the slug itself was normalised. A 301 for the old
// path goes into vercel.json in the same change, following the redirect that
// already exists for a previously renamed Arabic slug.
const RENAME = {
  from: "دليل-شامل-لتربة-وديكور-الأحواض-اختيار-الأسطح-المثا-1787451489298",
  to: "aquarium-substrate-and-decor-guide",
};

// One contextual link so the renamed article stops being an orphan.
const LINK = {
  slug: "aquarium-safe-rocks-and-wood",
  html: `<p>وبعد ما تتأكد إن المادة آمنة، يبقى سؤال الشكل والتوزيع: أي سطح وأي تربة تناسب حوضك ونباتاته — <a href="/blog/${RENAME.to}">دليل التربة والديكور واختيار الأسطح</a>.</p>`,
};

const NL = String.fromCharCode(10);
const q = (s) => "'" + s.replace(/'/g, "''") + "'";
const pgLength = (s) => [...s].length;
const lf = (t) => t.split(String.fromCharCode(13) + String.fromCharCode(10)).join(String.fromCharCode(10));

const listBody = await (await fetch(`${BASE}/api/blog/posts`)).json();
const liveSlugs = (Array.isArray(listBody) ? listBody : listBody.posts).map((p) => p.slug);
const live = new Set(liveSlugs);
const published = liveSlugs.length;

if (!live.has(RENAME.from)) throw new Error("rename source not live — was it already renamed?");
if (live.has(RENAME.to)) throw new Error("rename target slug already exists");

const created = new Set([...NEW.map((n) => n.slug), RENAME.to]);
const resolve = (item) => {
  item.html = fs.readFileSync(path.join(HERE, item.draft), "utf8").trim();
  const linked = [...item.html.matchAll(/href="\/blog\/([^"#?]+)"/g)].map((m) => decodeURIComponent(m[1]));
  const dead = linked.filter((s) => !live.has(s) && !created.has(s));
  if (dead.length) throw new Error(`${item.slug}: dead links ${dead.join(", ")}`);
  item.links = linked.length;
};

for (const n of NEW) {
  if (live.has(n.slug)) throw new Error(`${n.slug}: already published`);
  resolve(n);
  console.log(`new      ${n.slug}: ${pgLength(n.html)} chars, ${n.links} links`);
}

for (const rf of REFRAMES) {
  const body = await (await fetch(`${BASE}/api/blog/posts/${rf.slug}`)).json();
  const row = body.post ?? body;
  if (!row?.id) throw new Error(`${rf.slug}: reframe target not found`);
  rf.row = row;
  resolve(rf);
  console.log(`reframe  ${rf.slug}: ${pgLength(row.content)} -> ${pgLength(rf.html)} chars`);
}

const renameBody = await (await fetch(`${BASE}/api/blog/posts/${encodeURIComponent(RENAME.from)}`)).json();
const renameRow = renameBody.post ?? renameBody;
if (!renameRow?.id) throw new Error("rename source could not be fetched");
console.log(`rename   ${RENAME.from}\n      -> ${RENAME.to}`);

const linkBody = await (await fetch(`${BASE}/api/blog/posts/${LINK.slug}`)).json();
const linkRow = linkBody.post ?? linkBody;
if (!linkRow?.content) throw new Error(`${LINK.slug}: link source not found`);
LINK.before = linkRow.content;
LINK.after = linkRow.content.trimEnd() + "\n" + LINK.html;
console.log(`link     ${LINK.slug}: ${pgLength(LINK.before)} -> ${pgLength(LINK.after)} chars`);

const ALL = [...NEW.map((x) => x.slug), ...REFRAMES.map((x) => x.slug)];

const sql = `-- Migration ID: ${ID}
-- Target:       Neon production, blog_posts
--               (${NEW.length} inserts, ${REFRAMES.length} rewrite, 1 slug rename, 1 link append)
-- Rollback:     rollback-wave10.sql
-- Companion:    vercel.json gains a 301 for the old Arabic path. Deploy that
--               with or before this migration so the old URL never 404s.
--
-- Discovery Cycle 10. Species and topics were again closed by decision, not by
-- publishing one article each.
--
-- NEW dwarf-cichlids-guide. The corpus covers oscar, discus, angelfish,
-- flowerhorn and African cichlids, and owns no dwarf cichlid at all: "راميريزي",
-- "أبيستوغراما" and "بلو رام" return zero matches across all 103 articles. The
-- article leads with the failure that actually happens — the blue ram sold to a
-- beginner for an immature tank — and names the hardier alternative.
--
-- NEW fish-breeding-basics. Breeding is mentioned in 18 articles and owned for
-- livebearers and snails only. Egg-laying has no coverage whatsoever: "يضع
-- البيض", "بياضة" and "حاضنة الفم" return zero matches. It is framed as a
-- husbandry decision rather than a technique, because the outcome that actually
-- bites is population management.
--
-- NEW raising-fish-fry. Zero coverage: "زريعة", "ارتيميا" and "إنفوزوريا" appear
-- nowhere in the corpus, while the livebearer article Cycle 9 rewrote points at
-- fry rearing as a next step. Leads with mouth size, and states plainly that
-- stunting is permanent.
--
-- GROUPed, not published separately: rainbowfish. Same intent as
-- small-schooling-fish-selection — which schooling fish to buy — so a separate
-- page would cannibalise it. Added there as the larger-bodied option, with the
-- point that decides the purchase: juveniles look drab in the shop tank.
--
-- ALREADY COVERED: danio. Present in 5 articles, including six mentions in
-- 5-hardy-fish-for-beginners and its own row in the Cycle 9 selection table.
--
-- NOT WORTH STANDALONE: killifish. Zero coverage, but the gap is real only in a
-- taxonomic sense: annual species, diapause eggs and peat spawning are a
-- specialist pursuit with no meaningful local availability. Publishing it would
-- be filler, which the cycle rules forbid.
--
-- RENAME. The corpus's last orphan carried a raw-Arabic slug. The corpus-wide
-- dead-link post-flight compares the href capture to blog_posts.slug with no URL
-- decoding, so a percent-encoded href to it reads as dead and a raw-Arabic href
-- is re-encoded by the browser. Neither could be linked, which is why Cycle 9
-- excluded it. Normalising the slug removes the whole class of problem, and the
-- 301 preserves the old URL.
--
-- All four drafts passed script-purity, editorial, business-truth, internal link
-- resolution and block-tag balance via scripts/gate-draft.ts.

BEGIN;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM blog_posts WHERE is_published;
  IF n <> ${published} THEN RAISE EXCEPTION 'expected ${published} published posts, found %', n; END IF;

  SELECT count(*) INTO n FROM blog_posts WHERE slug IN (${[...NEW.map((x) => q(x.slug)), q(RENAME.to)].join(", ")});
  IF n <> 0 THEN RAISE EXCEPTION 'one of the new slugs already exists'; END IF;

  SELECT count(*) INTO n FROM blog_posts WHERE slug = ${q(RENAME.from)} AND is_published;
  IF n <> 1 THEN RAISE EXCEPTION 'the rename source is missing'; END IF;

${REFRAMES.map((rf) => `  SELECT count(*) INTO n FROM blog_posts WHERE slug = ${q(rf.slug)} AND is_published
     AND length(content) = ${pgLength(rf.row.content)};
  IF n <> 1 THEN RAISE EXCEPTION '${rf.slug}: reframe target missing or changed since drafting'; END IF;`).join(NL)}

  SELECT count(*) INTO n FROM blog_posts WHERE slug = ${q(LINK.slug)} AND is_published
     AND length(content) = ${pgLength(LINK.before)};
  IF n <> 1 THEN RAISE EXCEPTION '${LINK.slug}: link source missing or changed since drafting'; END IF;
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
${REFRAMES.map((rf) => `UPDATE blog_posts SET title = ${q(rf.title)}, excerpt = ${q(rf.excerpt)}, content = ${q(rf.html)}
 WHERE slug = ${q(rf.slug)};`).join(NL)}

UPDATE blog_posts SET slug = ${q(RENAME.to)} WHERE slug = ${q(RENAME.from)};

UPDATE blog_posts SET content = ${q(LINK.after)} WHERE slug = ${q(LINK.slug)};

-- Post-flight.
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM blog_posts WHERE is_published;
  IF n <> ${published + NEW.length} THEN RAISE EXCEPTION 'expected ${published + NEW.length} published, found %', n; END IF;

  -- Structure, for everything this migration writes prose into.
  SELECT count(*) INTO n FROM blog_posts
   WHERE slug IN (${ALL.map(q).join(", ")})
     AND is_published AND length(content) > 2500
     AND content LIKE '%<table%' AND content LIKE '%href="/blog/%';
  IF n <> ${ALL.length} THEN RAISE EXCEPTION 'only % of ${ALL.length} articles carry their structure', n; END IF;

  -- Byline only for the rows this migration creates. The rewrite and the link
  -- source keep whatever byline they already carry.
  SELECT count(*) INTO n FROM blog_posts
   WHERE slug IN (${NEW.map((x) => q(x.slug)).join(", ")}) AND author = 'AQUAVO Editorial Team';
  IF n <> ${NEW.length} THEN RAISE EXCEPTION 'only % of ${NEW.length} new articles carry the editorial byline', n; END IF;

  -- The rename happened, and nothing answers to the old slug any more.
  SELECT count(*) INTO n FROM blog_posts WHERE slug = ${q(RENAME.to)} AND is_published;
  IF n <> 1 THEN RAISE EXCEPTION 'the renamed article is missing'; END IF;
  SELECT count(*) INTO n FROM blog_posts WHERE slug = ${q(RENAME.from)};
  IF n <> 0 THEN RAISE EXCEPTION 'the old Arabic slug still exists'; END IF;

  -- The renamed article now has an inbound link, so the corpus has no orphan
  -- left that this cycle set out to fix.
  SELECT count(*) INTO n FROM blog_posts b
   WHERE b.is_published AND b.content LIKE '%href="/blog/${RENAME.to}"%';
  IF n < 1 THEN RAISE EXCEPTION 'the renamed article has no inbound link'; END IF;

  -- No published article may link to an unpublished one, corpus-wide.
  SELECT count(*) INTO n
    FROM blog_posts b
    CROSS JOIN LATERAL regexp_matches(b.content, 'href="/blog/([^"#?]+)"', 'g') AS m(parts)
   WHERE b.is_published
     AND NOT EXISTS (SELECT 1 FROM blog_posts t WHERE t.slug = m.parts[1] AND t.is_published);
  IF n <> 0 THEN RAISE EXCEPTION '% internal links point at unpublished articles', n; END IF;

  -- No article may link to itself.
  SELECT count(*) INTO n
    FROM blog_posts b
    CROSS JOIN LATERAL regexp_matches(b.content, 'href="/blog/([^"#?]+)"', 'g') AS m(parts)
   WHERE b.is_published AND m.parts[1] = b.slug;
  IF n <> 0 THEN RAISE EXCEPTION '% self links', n; END IF;

  SELECT count(*) INTO n FROM blog_posts
   WHERE slug IN (${[...ALL, RENAME.to, LINK.slug].map(q).join(", ")})
     AND content ~ '[一-鿿぀-ヿ가-힯Ѐ-ӿऀ-ॿ฀-๿֐-׿Ā-ɏḀ-ỿ]';
  IF n <> 0 THEN RAISE EXCEPTION 'a Wave 10 article carries stray script'; END IF;
END $$;

COMMIT;
`;

fs.writeFileSync(path.join(HERE, "migration-wave10.sql"), lf(sql));
fs.writeFileSync(
  path.join(HERE, "rollback-wave10.sql"),
  lf(`-- Rollback for ${ID}.
--
-- Restores the old Arabic slug too, so the vercel.json 301 must be reverted in
-- the same step or the old URL will redirect to a slug that no longer exists.

BEGIN;

DELETE FROM blog_posts WHERE slug IN (${NEW.map((x) => q(x.slug)).join(", ")});

UPDATE blog_posts SET slug = ${q(RENAME.from)} WHERE slug = ${q(RENAME.to)};

UPDATE blog_posts b SET title = k.title, excerpt = k.excerpt, content = k.content
  FROM ${BACKUP} k
 WHERE b.id = k.id AND b.content IS DISTINCT FROM k.content;

COMMIT;
`),
);
console.log(`\nemitted migration-wave10.sql (${NEW.length} inserts, ${REFRAMES.length} rewrite, 1 rename, 1 link)`);

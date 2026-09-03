/**
 * Wave 10 — inbound links for the new articles.
 *
 *   node docs/knowledge-center/wave-10/build-links10.mjs
 *
 * migration-wave10.sql asserted that the *renamed* article gained an inbound
 * link, but did not assert the same for the three it inserted. Two of the three
 * link to each other; dwarf-cichlids-guide was left with none, so it replaced
 * the renamed article as the corpus's single orphan.
 *
 * This adds contextual paragraphs that fix that, and deliberately sources them
 * from articles that currently have NO outbound links — so the same edit also
 * starts on the other half of the graph problem.
 */
import fs from "node:fs";
import path from "node:path";

const BASE = "https://www.aquavoiq.com";
const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const ID = "kc-wave10-links-20260903";
const BACKUP = "blog_posts_backup_links10_20260903";

const q = (s) => "'" + s.replace(/'/g, "''") + "'";
const pgLength = (s) => [...s].length;
const lf = (t) => t.split(String.fromCharCode(13) + String.fromCharCode(10)).join(String.fromCharCode(10));
const A = (slug, text) => `<a href="/blog/${slug}">${text}</a>`;

const EDITS = [
  // Zero-outbound legacy article, and the most natural home for the dwarf
  // cichlids: the article is about how the cichlid family splits.
  { slug: "american-vs-african-cichlids-differences", html:
    `<p>وهذا التقسيم لا يقتصر على الأسماك الكبيرة. العائلة فيها قسم قزم كامل يحمل نفس السلوك الترابي بحجم يناسب الحوض المجتمعي، ويتوزع على الجهتين — ${A("dwarf-cichlids-guide","السيكلد القزم: رام وأبيستو")}.</p>` },

  // Zero-outbound legacy article. Angelfish are cichlids, and the substrate-
  // spawning behaviour it describes is the same one the breeding article maps.
  { slug: "flowerhorn-breeding-nuchal-hump-secrets", html:
    `<p>وللخلفية العامة عن استراتيجيات التكاثر — ولود أم بايض، ولماذا يتغير سلوك الزوج بعد التزاوج — راجع ${A("fish-breeding-basics","التفريخ كقرار")}. وبعد الفقس تبدأ مرحلة لها متطلباتها الخاصة: ${A("raising-fish-fry","تربية الصغار")}.</p>` },
];

const listBody = await (await fetch(`${BASE}/api/blog/posts`)).json();
const posts = Array.isArray(listBody) ? listBody : listBody.posts;
const live = new Set(posts.map((p) => p.slug));

const targets = new Set();
for (const e of EDITS) {
  if (!live.has(e.slug)) throw new Error(`source not published: ${e.slug}`);
  const body = await (await fetch(`${BASE}/api/blog/posts/${e.slug}`)).json();
  const row = body.post ?? body;
  if (!row?.content) throw new Error(`${e.slug}: no content`);
  e.before = row.content;
  for (const m of e.html.matchAll(/href="\/blog\/([^"#?]+)"/g)) {
    if (!live.has(m[1])) throw new Error(`${e.slug}: dead link -> ${m[1]}`);
    if (m[1] === e.slug) throw new Error(`${e.slug}: self link`);
    targets.add(m[1]);
  }
  e.after = row.content.trimEnd() + "\n" + e.html;
  console.log(`link  ${e.slug}: ${pgLength(e.before)} -> ${pgLength(e.after)} chars`);
}
console.log(`\n${EDITS.length} sources, ${targets.size} targets: ${[...targets].join(", ")}`);

const sql = `-- Migration ID: ${ID}
-- Target:       Neon production, blog_posts (${EDITS.length} link-only appends)
-- Rollback:     rollback-links10.sql
--
-- migration-wave10.sql asserted an inbound link for the article it renamed, but
-- not for the three it inserted. Two of those link to each other;
-- dwarf-cichlids-guide had none, so it simply replaced the renamed article as
-- the corpus's single orphan. This closes that.
--
-- Both sources are articles that currently have zero outbound links, so the
-- same edit also begins on the other half of the graph problem rather than
-- adding links from pages that already carry plenty.

BEGIN;

DO $$
DECLARE n int;
BEGIN
${EDITS.map((e) => `  SELECT count(*) INTO n FROM blog_posts WHERE slug = ${q(e.slug)} AND is_published
     AND length(content) = ${pgLength(e.before)};
  IF n <> 1 THEN RAISE EXCEPTION '${e.slug}: source missing or changed since drafting'; END IF;`).join("\n")}
END $$;

CREATE TABLE ${BACKUP} AS
SELECT id, slug, title, excerpt, content, is_published, now() AS backed_up_at
  FROM blog_posts;

${EDITS.map((e) => `UPDATE blog_posts SET content = ${q(e.after)} WHERE slug = ${q(e.slug)};`).join("\n\n")}

-- Post-flight.
DO $$
DECLARE n int;
BEGIN
  -- Every article this cycle created or renamed must now have an inbound link.
  SELECT count(*) INTO n FROM (
    SELECT t.slug FROM blog_posts t
     WHERE t.slug IN ('dwarf-cichlids-guide', 'fish-breeding-basics', 'raising-fish-fry',
                      'aquarium-substrate-and-decor-guide')
       AND NOT EXISTS (
         SELECT 1 FROM blog_posts b
          CROSS JOIN LATERAL regexp_matches(b.content, 'href="/blog/([^"#?]+)"', 'g') AS m(parts)
          WHERE b.is_published AND b.slug <> t.slug AND m.parts[1] = t.slug)
  ) AS still_orphaned;
  IF n <> 0 THEN RAISE EXCEPTION '% Cycle 10 articles still have no inbound link', n; END IF;

  -- No published article may link to an unpublished one, corpus-wide.
  SELECT count(*) INTO n
    FROM blog_posts b
    CROSS JOIN LATERAL regexp_matches(b.content, 'href="/blog/([^"#?]+)"', 'g') AS m(parts)
   WHERE b.is_published
     AND NOT EXISTS (SELECT 1 FROM blog_posts t WHERE t.slug = m.parts[1] AND t.is_published);
  IF n <> 0 THEN RAISE EXCEPTION '% internal links point at unpublished articles', n; END IF;

  SELECT count(*) INTO n
    FROM blog_posts b
    CROSS JOIN LATERAL regexp_matches(b.content, 'href="/blog/([^"#?]+)"', 'g') AS m(parts)
   WHERE b.is_published AND m.parts[1] = b.slug;
  IF n <> 0 THEN RAISE EXCEPTION '% self links', n; END IF;

  SELECT count(*) INTO n FROM blog_posts
   WHERE slug IN (${EDITS.map((e) => q(e.slug)).join(", ")})
     AND content ~ '[一-鿿぀-ヿ가-힯Ѐ-ӿऀ-ॿ฀-๿֐-׿Ā-ɏḀ-ỿ]';
  IF n <> 0 THEN RAISE EXCEPTION 'stray script in an edited article'; END IF;
END $$;

COMMIT;
`;

fs.writeFileSync(path.join(HERE, "migration-links10.sql"), lf(sql));
fs.writeFileSync(
  path.join(HERE, "rollback-links10.sql"),
  lf(`-- Rollback for ${ID}.

BEGIN;

UPDATE blog_posts b SET content = k.content
  FROM ${BACKUP} k
 WHERE b.id = k.id AND b.content IS DISTINCT FROM k.content;

COMMIT;
`),
);
console.log(`emitted migration-links10.sql (${EDITS.length} appends)`);

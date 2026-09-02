/**
 * Wave 9 — Discovery Cycle 9: species coverage closed by decision, not by
 * one-article-per-species, plus two targeted scientific corrections.
 *
 *   node docs/knowledge-center/wave-9/build-wave9.mjs
 *
 * Selection and the NEW / GROUP / DEEPEN / NOT-WORTH-STANDALONE ruling for all
 * six requested species are in dossier-wave9.md.
 */
import fs from "node:fs";
import path from "node:path";

const BASE = "https://www.aquavoiq.com";
const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const ID = "kc-wave9-articles-20260903";
const BACKUP = "blog_posts_backup_wave9_20260903";

// cardinal tetra and rasbora are GROUPed into the first article rather than
// given standalone pages: both are name-drops only in the live corpus, and a
// per-species care page would compete with neon-tetra-color-care-guide for the
// same queries. barbs and loaches earn standalone pages because each owns a
// distinct, high-consequence failure mode nothing else in the corpus covers.
const NEW = [
  { slug:"small-schooling-fish-selection", draft:"schooling-selection.html", category:"أنواع الأسماك", icon:"Fish",
    title:"التيترا والرازبورا والدانيو: أي سمكة سربية تختار؟",
    excerpt:"ثلاث عوائل تُباع كأنها شي واحد. الفرق بين النيون والكاردينال بفحص بصري واحد، وليش ليست كل تيترا مسالمة — قسم منها يقرض الزعانف." },
  { slug:"aquarium-barbs-guide", draft:"barbs.html", category:"أنواع الأسماك", icon:"Users",
    title:"البارب: أي نوع آمن للحوض المجتمعي؟",
    excerpt:"قرض الزعانف سلوك مجموعة لا طبع شخصي، ولهذا زيادة العدد تقلل المشكلة لا تزيدها. وأي جيران يدفعون الثمن أولاً." },
  { slug:"aquarium-loaches-guide", draft:"loaches.html", category:"أنواع الأسماك", icon:"Waves",
    title:"اللوتش (المهرج والكولي): قبل ما تشتري",
    excerpt:"سمكة تنباع بحجم إصبع وتصير أضعافه وتعيش سنوات. وكونه عديم الحراشف يغيّر بروتوكول الدواء بحوضك كله." },
];

// Two of these three are scientific corrections to live text, not expansions.
const REFRAMES = [
  { slug:"fish-bloating-swim-bladder-dropsy", draft:"bloat-corrected.html",
    title:"سمكة منتفخة أو تطفو: استسقاء أم سبب آخر؟",
    excerpt:"بروز الحراشف كثمرة الصنوبر علامة قوية على تجمّع سوائل جهازي. أما الطفو بجسم أملس فليس تشخيص كيس سباحة تلقائياً — له أسباب متعددة تبدأ من فحص الماء." },
  { slug:"best-aquarium-cleaner-fish-pleco-corydoras", draft:"cleaner-corrected.html",
    title:"أسماك التنظيف (الزبال): أي منظّف لأي مشكلة؟",
    excerpt:"لا توجد سمكة تأكل الفضلات. والأوتوسينكلس ليس فريق طوارئ — إضافته لحوض جديد أو حوض نُظّف للتو تجويع بطيء." },
  { slug:"molly-platy-breeding-save-fry", draft:"livebearers.html",
    title:"الأسماك الولودة (مولي، بلاتي، جوبي، سوردتيل): التفريخ وإدارة العدد",
    excerpt:"الأنثى تخزّن ما تحتاجه وتنجب دفعات متتالية بعد تزاوج واحد — فالتحدي إدارة العدد لا إنتاج الصغار. ونسبة الذكور للإناث ليست تفصيلاً." },
];

const NL = String.fromCharCode(10);
const NL2 = NL + NL;
const q = (s) => "'" + s.replace(/'/g, "''") + "'";
const pgLength = (s) => [...s].length;
const lf = (t) => t.split(String.fromCharCode(13) + String.fromCharCode(10)).join(String.fromCharCode(10));

const listBody = await (await fetch(`${BASE}/api/blog/posts`)).json();
const liveSlugs = (Array.isArray(listBody) ? listBody : listBody.posts).map((p) => p.slug);
const live = new Set(liveSlugs);
const published = liveSlugs.length;

const created = new Set(NEW.map((n) => n.slug));
const resolve = (item) => {
  item.html = fs.readFileSync(path.join(HERE, item.draft), "utf8").trim();
  const linked = [...item.html.matchAll(/href="\/blog\/([^"#?]+)"/g)].map((m) => decodeURIComponent(m[1]));
  const dead = linked.filter((s) => !live.has(s) && !created.has(s));
  if (dead.length) throw new Error(`${item.slug}: dead links ${dead.join(", ")}`);
  item.links = linked.length;
};

for (const n of NEW) {
  if (live.has(n.slug)) throw new Error(`${n.slug}: slug already published`);
  resolve(n);
  console.log(`new      ${n.slug}: ${pgLength(n.html)} chars, ${n.links} links`);
}

for (const rf of REFRAMES) {
  const body = await (await fetch(`${BASE}/api/blog/posts/${rf.slug}`)).json();
  const row = body.post ?? body;
  if (!row?.id) throw new Error(`${rf.slug}: reframe target not found`);
  rf.row = row;
  resolve(rf);
  console.log(`reframe  ${rf.slug}: ${pgLength(row.content)} -> ${pgLength(rf.html)} chars, ${rf.links} links`);
}

const ALL = [...NEW.map((x) => x.slug), ...REFRAMES.map((x) => x.slug)];

const sql = `-- Migration ID: ${ID}
-- Target:       Neon production, blog_posts (${NEW.length} inserts, ${REFRAMES.length} rewrites)
-- Rollback:     rollback-wave9.sql
--
-- Discovery Cycle 9. Species coverage was closed by decision rather than by
-- publishing one article per species. Evidence: all six requested species
-- (cardinal tetra, rasbora, barb, otocinclus, loach, swordtail) appear in the
-- live corpus as bare name-drops only — no care or selection content anywhere.
--
-- GROUPed, not standalone: cardinal tetra and rasbora. A per-species care page
-- would compete with neon-tetra-color-care-guide and schooling-fish-minimum-
-- numbers for the same queries. They are covered inside a selection article
-- whose intent (which schooling fish to buy) nothing in the corpus owned.
--
-- NEW standalone: barbs and loaches. Each owns a distinct failure mode. Barbs:
-- fin-nipping is a group-size effect, so the counter-intuitive fix is a larger
-- shoal. Loaches: sold at a fraction of adult size, and scaleless, which
-- changes the medication protocol for the whole tank.
--
-- NOT WORTH STANDALONE: swordtail. Its mechanics are identical to the other
-- livebearers, so molly-platy-breeding-save-fry is widened to own the family
-- instead. That article was also the weakest in the corpus: three promotional
-- blocks and almost no actionable content.
--
-- CORRECTION 1 (fish-bloating-swim-bladder-dropsy). The published version drew
-- a clean binary and stated "smooth body + buoyancy problem = swim bladder".
-- That is an automatic diagnosis and it is wrong: buoyancy is a sign with
-- several possible causes. The table column is reframed, a differential list is
-- added, and water testing is moved ahead of fasting in the ordered steps.
-- Pineconing is retained and tightened as a strong indicator of systemic fluid
-- accumulation, which is well supported and was already correct.
-- The two-day fast is kept but de-generalised: the claim that it "often solves
-- it on its own" is not supportable, so it is stated as a common mitigating
-- step that may help a digestive cause, with explicit exceptions (fry and
-- juveniles, small fast-metabolism species, and any fish already off its food).
--
-- CORRECTION 2 (best-aquarium-cleaner-fish-pleco-corydoras). The published text
-- called otocinclus a "brilliant emergency crew". That advice starves them:
-- they graze a biofilm a new or freshly-scrubbed tank does not have. Corrected,
-- with the supplemental-feeding and mature-tank requirements stated. The
-- article's closing store line was also removed: it invited readers to browse
-- fish species at AQUAVO, which sells no live animals, and carried an
-- unverifiable "largest store" superlative.
--
-- All six drafts passed script-purity, editorial, business-truth, internal link
-- resolution and block-tag balance via scripts/gate-draft.ts.

BEGIN;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM blog_posts WHERE is_published;
  IF n <> ${published} THEN RAISE EXCEPTION 'expected ${published} published posts, found %', n; END IF;

  SELECT count(*) INTO n FROM blog_posts WHERE slug IN (${NEW.map((x) => q(x.slug)).join(", ")});
  IF n <> 0 THEN RAISE EXCEPTION 'one of the new slugs already exists'; END IF;

${REFRAMES.map((rf) => `  SELECT count(*) INTO n FROM blog_posts WHERE slug = ${q(rf.slug)} AND is_published
     AND length(content) = ${pgLength(rf.row.content)};
  IF n <> 1 THEN RAISE EXCEPTION '${rf.slug}: reframe target missing or changed since drafting'; END IF;`).join(NL)}
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
 WHERE slug = ${q(rf.slug)};`).join(NL2)}

-- Post-flight.
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM blog_posts WHERE is_published;
  IF n <> ${published + NEW.length} THEN RAISE EXCEPTION 'expected ${published + NEW.length} published, found %', n; END IF;

  -- Structure is asserted for all six.
  SELECT count(*) INTO n FROM blog_posts
   WHERE slug IN (${ALL.map(q).join(", ")})
     AND is_published AND length(content) > 2500
     AND content LIKE '%<table%' AND content LIKE '%href="/blog/%';
  IF n <> ${ALL.length} THEN RAISE EXCEPTION 'only % of ${ALL.length} articles carry their structure', n; END IF;

  -- Byline is asserted only for the articles this migration creates. The three
  -- rewrite targets keep whatever byline they already carry: two of them are
  -- legacy articles bylined 'AQUAVO Team', and changing a published byline is a
  -- separate editorial decision, not a side effect of a content correction.
  -- Asserting it across all six is what rolled back the first apply attempt.
  SELECT count(*) INTO n FROM blog_posts
   WHERE slug IN (${NEW.map((x) => q(x.slug)).join(", ")})
     AND author = 'AQUAVO Editorial Team';
  IF n <> ${NEW.length} THEN RAISE EXCEPTION 'only % of ${NEW.length} new articles carry the editorial byline', n; END IF;

  -- The corrected article must no longer assert the automatic diagnosis.
  SELECT count(*) INTO n FROM blog_posts
   WHERE slug = 'fish-bloating-swim-bladder-dropsy'
     AND content LIKE '%مشكلة طفو = كيس سباحة%';
  IF n <> 0 THEN RAISE EXCEPTION 'the swim-bladder auto-diagnosis is still published'; END IF;

  -- The corrected article must no longer call otocinclus an emergency crew.
  SELECT count(*) INTO n FROM blog_posts
   WHERE slug = 'best-aquarium-cleaner-fish-pleco-corydoras'
     AND content LIKE '%فريق طوارئ مبدع%';
  IF n <> 0 THEN RAISE EXCEPTION 'the otocinclus emergency-crew claim is still published'; END IF;

  -- No published article may link to an unpublished one, corpus-wide.
  SELECT count(*) INTO n
    FROM blog_posts b
    CROSS JOIN LATERAL regexp_matches(b.content, 'href="/blog/([^"#?]+)"', 'g') AS m(parts)
   WHERE b.is_published
     AND NOT EXISTS (SELECT 1 FROM blog_posts t WHERE t.slug = m.parts[1] AND t.is_published);
  IF n <> 0 THEN RAISE EXCEPTION '% internal links point at unpublished articles', n; END IF;

  SELECT count(*) INTO n FROM blog_posts
   WHERE slug IN (${ALL.map(q).join(", ")})
     AND content ~ '[一-鿿぀-ヿ가-힯Ѐ-ӿऀ-ॿ฀-๿֐-׿Ā-ɏḀ-ỿ]';
  IF n <> 0 THEN RAISE EXCEPTION 'a Wave 9 article carries stray script'; END IF;
END $$;

COMMIT;
`;

fs.writeFileSync(path.join(HERE, "migration-wave9.sql"), lf(sql));
fs.writeFileSync(
  path.join(HERE, "rollback-wave9.sql"),
  lf(`-- Rollback for ${ID}. Deletes the ${NEW.length} new articles and restores the ${REFRAMES.length} rewrites.

BEGIN;

DELETE FROM blog_posts WHERE slug IN (${NEW.map((x) => q(x.slug)).join(", ")});

UPDATE blog_posts b SET title = k.title, excerpt = k.excerpt, content = k.content
  FROM ${BACKUP} k
 WHERE b.id = k.id AND b.content IS DISTINCT FROM k.content;

COMMIT;
`),
);
console.log(`emitted migration-wave9.sql (${NEW.length} inserts, ${REFRAMES.length} rewrites)`);

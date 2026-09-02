/**
 * Wave 9 — internal link graph repair.
 *
 *   node docs/knowledge-center/wave-9/build-links9.mjs
 *
 * Runs AFTER migration-wave9.sql. At that point the corpus is 103 articles and
 * 44 of them have no inbound link at all, so nothing in the site points a
 * reader — or a crawler — at them.
 *
 * The repair is not a generic "related articles" block. Each source article
 * gains one closing paragraph written for that article's own subject, linking
 * the orphans that genuinely follow from it. 18 sources cover 43 orphans.
 *
 * NOT covered here, deliberately: the one article whose slug is raw Arabic
 * (دليل-شامل-لتربة-وديكور-الأحواض-...-1787451489298). The corpus-wide
 * post-flight compares the raw href capture against blog_posts.slug without URL
 * decoding, so a percent-encoded href would read as a dead link and abort the
 * migration, while a raw-Arabic href is re-encoded by the browser on navigation.
 * That article needs a slug normalisation first — see dossier-wave9.md.
 */
import fs from "node:fs";
import path from "node:path";

const BASE = "https://www.aquavoiq.com";
const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const ID = "kc-wave9-links-20260903";
const BACKUP = "blog_posts_backup_links9_20260903";

const q = (s) => "'" + s.replace(/'/g, "''") + "'";
const pgLength = (s) => [...s].length;
const lf = (t) => t.split(String.fromCharCode(13) + String.fromCharCode(10)).join(String.fromCharCode(10));
const A = (slug, text) => `<a href="/blog/${slug}">${text}</a>`;

// source slug -> the paragraph appended to it. Every link is contextual to the
// source's own subject; none is a bare "read also" list.
const EDITS = [
  { slug: "nitrogen-cycle-simple-arabic-explained", html:
    `<p>والدورة هي أول ما ينهار لمّا يُبنى الحوض بترتيب غلط — ${A("first-aquarium-setup-guide","إعداد أول حوض")} يشرح موقعها الصحيح بين المراحل. وإذا انهارت فجأة بحوض شغّال فراجع ${A("why-fish-die-suddenly-rescue-guide","أسباب الموت المفاجئ")}. أما منتجات البكتيريا الجاهزة فتسرّع البداية ولا تلغيها — ${A("blackwater-extract-filter-bacteria-guide","سائل البكتيريا")}.</p>` },

  { slug: "aquarium-test-kit-guide", html:
    `<p>وإذا طلعت قراءات ماء الحنفية صعبة التعديل، فالسؤال التالي هو مصدر الماء نفسه — ${A("ro-water-vs-tap-water-aquarium","ماء RO مقابل ماء الإسالة")}. وانتبه إن ${A("activated-carbon-aquarium-when-to-use","الفحم النشط")} يسحب مواد من الماء ويؤثر على ما تقرأه، فاعرف متى يكون موجوداً بالفلتر ومتى يُرفع.</p>` },

  { slug: "how-many-fish-in-aquarium", html:
    `<p>وأكثر ما تنكسر عنده هذي الحسبة هو الأسماك اللي تُشترى صغيرة وتكبر كثيراً: ${A("oscar-fish-care-guide-water-dog","الأوسكار")} و${A("arowana-fish-care-guide-prices","الأروانا")}، وخارج البيت ${A("koi-fish-outdoor-pond-building-tips","الكوي")} اللي مكانه بركة لا حوض. وقبل أي شي تأكد من سعة حوضك الفعلية بـ${A("calculate-aquarium-capacity-liters","حساب السعة باللتر")}.</p>` },

  { slug: "protect-fish-iraqi-summer-50-degrees", html:
    `<p>والوجه الآخر من نفس المشكلة يجي بالشتاء، حيث التبريد الليلي المفاجئ لا الحرارة — ${A("aquarium-heater-winter-iraq","هل السخان ضروري بالشتاء")}. وإذا اضطررت تنقل الحوض أو الأسماك بذروة الحر فالحرارة هي القيد الأول — ${A("transporting-fish-and-aquarium","نقل الأسماك والحوض")}.</p>` },

  { slug: "ammonia-spike-emergency-treatment", html:
    `<p>وتسمم الأمونيا المزمن يسبق كثيراً من الأعراض اللي تنقرأ غلط كأمراض مستقلة — منها الانتفاخ ومشاكل الطفو، وهذا مفصّل بـ${A("fish-bloating-swim-bladder-dropsy","سمكة منتفخة أو تطفو")}. وأغلب هذي الارتفاعات ترجع لنفس الأخطاء المتكررة بـ${A("top-5-mistakes","أخطاء المبتدئين")}.</p>` },

  { slug: "aquarium-water-change-guide", html:
    `<p>وتذكّر إن تبديل الماء هو ما يزيل الفضلات فعلاً، لا سمكة "الزبال" — التفصيل بـ${A("best-aquarium-cleaner-fish-pleco-corydoras","أسماك التنظيف")}. وإذا تدهور الماء بلا سبب ظاهر رغم انتظام التبديل، فكّر بمصدر خارجي: ${A("aquarium-airborne-toxins","سموم الهواء")}.</p>` },

  { slug: "algae-war-guide", html:
    `<p>والنبات الحي منافس مباشر للطحالب على نفس المغذيات، وهذا فرق جوهري عن الصناعي — ${A("real-vs-fake-plants-iraq","طبيعية أم صناعية")}. والأنواع سريعة النمو وكبيرة الورقة مثل ${A("amazon-sword-plant-care-propagation","الأمازون سورد")} من أكثر ما يسحب الفائض.</p>` },

  { slug: "hardscape-rock-arrangement-visual-depth", html:
    `<p>وإذا أردت تطبيق هذي المبادئ بأسلوب محدد فـ${A("iwagumi-aquascape-step-by-step","الإيواغومي")} أوضح مدرسة تعتمد على الحجر وحده. وللتنفيذ بكلفة أقل ${A("budget-aquascaping","ديكور بميزانية محدودة")}، وللعمق الكامل خلف الزجاج ${A("diy-3d-aquarium-background","الخلفيات ثلاثية الأبعاد")}.</p>` },

  { slug: "aquarium-soil-volcanic-substrate-secrets", html:
    `<p>واختيار الركيزة يتبع الأسلوب اللي تقصده: حوض يحاكي بيئة طبيعية بعينها له متطلبات مختلفة عن حوض زينة عام — ${A("amazon-biotope-aquarium-setup","حوض البيوتوب")}.</p>` },

  { slug: "tank-mates-compatibility", html:
    `<p>وأكبر مصدر لسوء التوافق هو السيكلد، لأن الاسم يجمع مجموعتين مختلفتين تماماً بالماء والسلوك — ${A("american-vs-african-cichlids-differences","الفرق بين الأمريكية والإفريقية")} و${A("african-cichlids-best-types-colors","أنواع السيكلد الإفريقي")}. وبعض الأنواع ما تصلح لأي جار أصلاً مثل ${A("freshwater-pufferfish-care-guide","البفر فيش")}، وبعض التركيبات تتجاوز الأسماك كلياً مثل ${A("turtles-with-aquarium-fish","السلاحف مع الأسماك")}.</p>` },

  { slug: "aquarium-fish-feeding-guide", html:
    `<p>وتنويع العلف ما يعني بالضرورة كلفة أعلى: الخضار المنزلية خيار حقيقي لآكلات النبات — ${A("feeding-fish-vegetables-cucumber-peas","إطعام الخضراوات")}. ولمقارنة العلف التجاري بالاقتصادي راجع ${A("tetra-food-vs-budget-brands-comparison","مقارنة الأعلاف")}.</p>` },

  { slug: "quarantine-new-fish-guide", html:
    `<p>وسبب الحاجة للحجر يبدأ قبل المتجر: أغلب أسماك الزينة تمر بسلسلة نقل طويلة قبل ما توصل — ${A("ornamental-fish-import-middle-east-origins","من أين تجي أسماك المتاجر")}. ولهذا يهم من تشتري منه، خصوصاً مع البيع الإلكتروني — ${A("avoid-fake-fish-stores-instagram-scams","المتاجر الوهمية")}.</p>` },

  { slug: "how-to-choose-aquarium-tank", html:
    `<p>وقبل ما تحسم الحجم، احسم النوع: ${A("saltwater-vs-freshwater-aquarium-beginners","العذب مقابل المالح")} يغيّر الكلفة والمعدات كلياً. وللميزانية راجع ${A("aquarium-fish-prices-iraq-2026","أسعار أسماك الزينة")}، ولاختيار جهة الشراء ${A("best-aquarium-store-iraq-2026","دليل المتاجر")}.</p>` },

  { slug: "best-aquarium-store-iraq-2026", html:
    `<p>ولنظرة أوسع على اتجاه الهواية محلياً وأين تتجه خلال السنوات القادمة راجع ${A("future-of-fish-keeping-iraq-2026-aquavo","مستقبل هواية أسماك الزينة في العراق")}.</p>` },

  { slug: "betta-fish-bowl-truth-iraq", html:
    `<p>وخلف هذي النقاشات سؤال أعمق عن إدراك السمكة نفسها — ${A("can-fish-see-recognize-owners-science","هل تتعرف الأسماك علينا")}. ومن الجهة الأخرى، للحوض أثر على صاحبه أيضاً: ${A("fish-keeping-stress-relief-mental-health","الهواية وتخفيف التوتر")} و${A("aquarium-bedroom-feng-shui-sound-effect","الحوض في غرفة النوم")}.</p>` },

  { slug: "aquarium-planted-led-lighting-guide", html:
    `<p>والنبات اللي ينمو جيداً يحتاج تقليماً منتظماً وإلا ظلّل نفسه — ${A("aquarium-plant-trimming-propagation","تقليم النباتات وإكثارها")}. وإذا أردت توثيق النتيجة بصورة تشبه ما تشوفه بعينك فالإضاءة هي العامل الأول — ${A("aquarium-photography-mobile-tips","تصوير الحوض بالموبايل")}.</p>` },

  { slug: "5-hardy-fish-for-beginners", html:
    `<p>وإذا اخترت سمكة سربية من هذي القائمة فالخطوة التالية هي اختيار العائلة والعدد — ${A("small-schooling-fish-selection","أي سمكة سربية تختار")}. وإذا اخترت ولودة مثل البلاتي أو المولي فتوقّع صغاراً بلا تخطيط — ${A("molly-platy-breeding-save-fry","الأسماك الولودة وإدارة العدد")}.</p>` },

  { slug: "aquarium-fish-aggression", html:
    `<p>وأشهر حالة يُلام فيها الطبع بدل السلوك هي قرض الزعانف عند ${A("aquarium-barbs-guide","البارب")}. وبالطرف الآخر توجد أنواع عدوانيتها بنيوية لا ظرفية مثل ${A("flowerhorn-breeding-nuchal-hump-secrets","الفلورهورن")}.</p>` },

  { slug: "aquarium-snail-population-control", html:
    `<p>وقبل ما تعتمد على سمكة تأكل الحلزون، اعرف كلفتها بعيدة المدى — ${A("aquarium-loaches-guide","اللوتش قبل ما تشتري")}.</p>` },
];

const listBody = await (await fetch(`${BASE}/api/blog/posts`)).json();
const posts = Array.isArray(listBody) ? listBody : listBody.posts;
const live = new Set(posts.map((p) => p.slug));

// This migration is applied after kc-wave9-articles-20260903, so the three
// articles that migration inserts are legitimate link targets even though they
// are not live at the time this script runs.
const PENDING = ["small-schooling-fish-selection", "aquarium-barbs-guide", "aquarium-loaches-guide"];
for (const s of PENDING) {
  if (live.has(s)) throw new Error(`${s} is already live — re-check migration order`);
  live.add(s);
}

const targets = new Set();
for (const e of EDITS) {
  if (!live.has(e.slug)) throw new Error(`source not published: ${e.slug}`);
  const body = await (await fetch(`${BASE}/api/blog/posts/${e.slug}`)).json();
  const row = body.post ?? body;
  if (!row?.content) throw new Error(`${e.slug}: no content`);
  e.before = row.content;
  for (const m of e.html.matchAll(/href="\/blog\/([^"#?]+)"/g)) {
    const t = m[1];
    if (!live.has(t)) throw new Error(`${e.slug}: dead link -> ${t}`);
    if (t === e.slug) throw new Error(`${e.slug}: self link`);
    targets.add(t);
  }
  e.after = row.content.trimEnd() + "\n" + e.html;
  console.log(`link  ${e.slug}: ${pgLength(e.before)} -> ${pgLength(e.after)} chars`);
}
console.log(`\n${EDITS.length} sources, ${targets.size} distinct targets`);

const sql = `-- Migration ID: ${ID}
-- Target:       Neon production, blog_posts (${EDITS.length} link-only appends)
-- Rollback:     rollback-links9.sql
-- Depends on:   kc-wave9-articles-20260903 must be applied first.
--
-- Internal link graph repair. Before this migration ${targets.size} articles carry no
-- inbound link anywhere in the corpus, so no reader path and no crawler path
-- reaches them except the index.
--
-- Each source gains exactly one closing paragraph written for that source's own
-- subject. No generic "related articles" block, no reciprocal link padding, and
-- no article is edited except by appending that paragraph.
--
-- One orphan is deliberately excluded: the article whose slug is raw Arabic.
-- The corpus-wide dead-link post-flight below compares the href capture against
-- blog_posts.slug with no URL decoding, so a percent-encoded href would abort
-- this migration. It needs a slug normalisation first.

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
  -- Every article this migration targets must now have at least one inbound link.
  SELECT count(*) INTO n FROM (
    SELECT t.slug FROM blog_posts t
     WHERE t.slug IN (${[...targets].map(q).join(", ")})
       AND NOT EXISTS (
         SELECT 1 FROM blog_posts b
          CROSS JOIN LATERAL regexp_matches(b.content, 'href="/blog/([^"#?]+)"', 'g') AS m(parts)
          WHERE b.is_published AND b.slug <> t.slug AND m.parts[1] = t.slug)
  ) AS still_orphaned;
  IF n <> 0 THEN RAISE EXCEPTION '% targeted articles still have no inbound link', n; END IF;

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
   WHERE slug IN (${EDITS.map((e) => q(e.slug)).join(", ")})
     AND content ~ '[一-鿿぀-ヿ가-힯Ѐ-ӿऀ-ॿ฀-๿֐-׿Ā-ɏḀ-ỿ]';
  IF n <> 0 THEN RAISE EXCEPTION 'stray script in an edited article'; END IF;
END $$;

COMMIT;
`;

fs.writeFileSync(path.join(HERE, "migration-links9.sql"), lf(sql));
fs.writeFileSync(
  path.join(HERE, "rollback-links9.sql"),
  lf(`-- Rollback for ${ID}. Restores the ${EDITS.length} edited articles.

BEGIN;

UPDATE blog_posts b SET content = k.content
  FROM ${BACKUP} k
 WHERE b.id = k.id AND b.content IS DISTINCT FROM k.content;

COMMIT;
`),
);
console.log(`emitted migration-links9.sql (${EDITS.length} appends, ${targets.size} targets)`);

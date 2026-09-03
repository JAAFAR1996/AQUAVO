/**
 * Wave 11 — Discovery Cycle 11.
 *
 *   node docs/knowledge-center/wave-11/build-wave11.mjs
 *
 * Five new canonical topics and three deepenings. Decisions, the intent and
 * cannibalisation review, and the fresh domain sweep are in dossier-wave11.md.
 */
import fs from "node:fs";
import path from "node:path";

const BASE = "https://www.aquavoiq.com";
const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const ID = "kc-wave11-articles-20260903";
const BACKUP = "blog_posts_backup_wave11_20260903";

const NEW = [
  { slug:"external-fish-parasites", draft:"external-parasites.html", category:"مشاكل وحلول", icon:"AlertTriangle",
    title:"طفيليات خارجية: غبار ذهبي، دود مرئي، وحكّة بلا نقط",
    excerpt:"أول علامة ليست شيئاً تشوفه — هي حكّة واحتكاك بالديكور. جدول يفرز المخمل عن ديدان الخياشيم عن دودة المرساة، وليش المخمل يضرب الخياشيم قبل ما يظهر." },
  { slug:"internal-fish-parasites", draft:"internal-parasites.html", category:"مشاكل وحلول", icon:"Activity",
    title:"الطفيليات الداخلية: سمكة تأكل ولا تسمن",
    excerpt:"لا شي مرئي على الجسم، والعلامة المفتاحية اجتماع ثلاثة: أكل طبيعي، وزن ينزل، براز أبيض خيطي. والبراز الأبيض وحده ليس تشخيصاً." },
  { slug:"fish-treatment-protocol", draft:"treatment-protocol.html", category:"مشاكل وحلول", icon:"Stethoscope",
    title:"العلاج الصحيح: حوض العزل والجرعة والمدة",
    excerpt:"أغلب فشل العلاج ليس بالدواء. خمسة أخطاء تُفشل أي دواء صحيح — أولها الجرعة على حجم الحوض المكتوب لا الفعلي، وآخرها الفحم النشط اللي يسحب الدواء." },
  { slug:"aquarium-water-flow", draft:"water-flow.html", category:"المعدات", icon:"Wind",
    title:"التيار وحركة الماء: عامل مستقل لا نتيجة جانبية للفلتر",
    excerpt:"تحريك السطح أهم من قوة التيار بالعمق، لأن تبادل الغازات يحصل هناك. وكيف تكتشف المناطق الميتة اللي تتجمع فيها الفضلات بصمت." },
  { slug:"aquarium-placement-and-stand", draft:"tank-placement.html", category:"ديكور وأحواض", icon:"Mountain",
    title:"أين تضع الحوض وعلى ماذا: الوزن والاستواء والسلامة",
    excerpt:"الماء وحده كيلوغرام لكل لتر. حبة حصى واحدة تحت القاعدة تكفي لتصير نقطة ضغط تشقّ الزجاج، ولا يُحرَّك حوض مملوء إطلاقاً." },
];

// Three deepenings, appended as one section each. All were classified DEEPEN
// rather than NEW: the owning article already holds the intent, and a separate
// page would compete with it. The air-pump one also supplies the inbound link
// that aquarium-water-flow would otherwise lack.
const DEEPEN = [
  { slug: "first-aquarium-setup-guide", html:
`<h2>ترتيب إدخال الأسماك بعد التدوير</h2>
<p>التدوير ينتهي، ويجي سؤال يُهمَل: أي سمكة تدخل أولاً؟ الجواب يغيّر فرص نجاح الحوض بالشهر الأول.</p>
<ul>
  <li><strong>ادخل على دفعات، لا مرة واحدة.</strong> المستعمرة البكتيرية تتوسع حسب الحمل الموجود؛ إضافة كل الأسماك دفعة واحدة تقفز بالحمل فوق قدرتها فترتفع الأمونيا — <a href="/blog/nitrogen-cycle-simple-arabic-explained">الدورة البيولوجية</a>.</li>
  <li><strong>الأصلب أولاً.</strong> الأنواع المتحمّلة تعبر تذبذب الأسابيع الأولى بأمان، والحساسة تدخل بعد ما تستقر القراءات — <a href="/blog/5-hardy-fish-for-beginners">الأسماك اللي ما تموت بسرعة</a>.</li>
  <li><strong>الأعدائية أخيراً.</strong> السمكة اللي تحتل منطقة تدخل بعد ما يستقر البقية، وإلا تعاملت مع كل قادم جديد كدخيل — <a href="/blog/aquarium-fish-aggression">العدوانية والمطاردة</a>.</li>
  <li><strong>افحص بين دفعة وأخرى.</strong> ارتفاع بسيط بالأمونيا أو النتريت بعد إضافة يعني انتظر قبل الدفعة التالية — <a href="/blog/aquarium-test-kit-guide">قراءة الفحص</a>.</li>
</ul>
<p>ولا تتجاوز الحجر الصحي مع أي دفعة بعد الأولى، لأن الحوض صار فيه ما تخسره — <a href="/blog/quarantine-new-fish-guide">الحجر الصحي</a>.</p>
<p>وإذا كنت ما زلت بمرحلة اختيار المكان والطاولة، فتلك المرحلة تسبق كل ما سبق — <a href="/blog/aquarium-placement-and-stand">أين تضع الحوض وعلى ماذا</a>.</p>` },

  { slug: "air-pumps-decoration-or-necessity", html:
`<h2>التيار نفسه، لا المضخة وحدها</h2>
<p>مضخة الهواء واحدة من طرق تحريك الماء، لكن الحركة نفسها عامل بيئي أوسع: توزيع الأوكسجين، ومناطق الركود اللي تتجمع فيها الفضلات، ومقدار الجهد اللي تبذله السمكة للبقاء بمكانها.</p>
<p>وتحريك السطح تحديداً أهم من قوة التيار بالعمق، لأن تبادل الغازات يحصل عند السطح. التفصيل الكامل — بما فيه كيف تكتشف المناطق الميتة وعلامات أن التيار صار كثيراً — بـ<a href="/blog/aquarium-water-flow">التيار وحركة الماء</a>.</p>` },

  { slug: "aquarium-test-kit-guide", html:
`<h2>كم مرة تفحص فعلاً</h2>
<p>الفحص اليومي ليس ضرورياً بحوض مستقر، والفحص العشوائي كل بضعة أشهر لا يكشف شيئاً بوقته. التكرار يتبع حالة الحوض لا التقويم:</p>
<table>
  <tr><th>الحالة</th><th>التكرار المعقول</th><th>الأهم</th></tr>
  <tr><td>حوض جديد يدوّر</td><td>يومياً أو كل يومين</td><td>الأمونيا والنتريت</td></tr>
  <tr><td>بعد إضافة أسماك</td><td>كل يومين لأسبوع</td><td>الأمونيا</td></tr>
  <tr><td>حوض مستقر</td><td>مرة أسبوعياً أو كل أسبوعين</td><td>النترات مؤشر كفاية التبديل</td></tr>
  <tr><td>عند ظهور أي عرض</td><td>فوراً وقبل أي دواء</td><td>الكل</td></tr>
</table>
<p>والقراءة المفردة أقل فائدة من الاتجاه: رقم واحد لا يقول إن كان الوضع يتحسن أو يسوء. سجّل القراءات ببساطة وقارنها بالأسبوع السابق — هذا يكشف الانحدار قبل ما يصير أزمة.</p>` },
];

const NL = String.fromCharCode(10);
const q = (s) => "'" + s.replace(/'/g, "''") + "'";
const pgLength = (s) => [...s].length;
const lf = (t) => t.split(String.fromCharCode(13) + String.fromCharCode(10)).join(String.fromCharCode(10));

const listBody = await (await fetch(`${BASE}/api/blog/posts`)).json();
const liveSlugs = (Array.isArray(listBody) ? listBody : listBody.posts).map((p) => p.slug);
const live = new Set(liveSlugs);
const published = liveSlugs.length;

const created = new Set(NEW.map((n) => n.slug));
const checkLinks = (slug, html) => {
  const linked = [...html.matchAll(/href="\/blog\/([^"#?]+)"/g)].map((m) => decodeURIComponent(m[1]));
  const dead = linked.filter((s) => !live.has(s) && !created.has(s));
  if (dead.length) throw new Error(`${slug}: dead links ${dead.join(", ")}`);
  if (linked.includes(slug)) throw new Error(`${slug}: self link`);
  return linked.length;
};

for (const n of NEW) {
  if (live.has(n.slug)) throw new Error(`${n.slug}: already published`);
  n.html = fs.readFileSync(path.join(HERE, n.draft), "utf8").trim();
  console.log(`new     ${n.slug}: ${pgLength(n.html)} chars, ${checkLinks(n.slug, n.html)} links`);
}

for (const d of DEEPEN) {
  const body = await (await fetch(`${BASE}/api/blog/posts/${d.slug}`)).json();
  const row = body.post ?? body;
  if (!row?.content) throw new Error(`${d.slug}: deepen target not found`);
  d.before = row.content;
  checkLinks(d.slug, d.html);
  d.after = row.content.trimEnd() + "\n" + d.html;
  console.log(`deepen  ${d.slug}: ${pgLength(d.before)} -> ${pgLength(d.after)} chars`);
}

const ALL = [...NEW.map((x) => x.slug), ...DEEPEN.map((x) => x.slug)];

const sql = `-- Migration ID: ${ID}
-- Target:       Neon production, blog_posts (${NEW.length} inserts, ${DEEPEN.length} deepenings)
-- Rollback:     rollback-wave11.sql
--
-- Discovery Cycle 11. Five canonical topics the corpus did not own, and three
-- deepenings where an owner already exists.
--
-- The disease coverage was decided by intent, not by pathogen. The corpus owns
-- ich, fin rot, fungus-vs-columnaris and a symptom-to-cause diagnosis hub. It
-- owned nothing for velvet, gill/skin flukes, anchor worm, fish lice or
-- internal worms, and nothing at all for HOW to treat.
--
-- external-fish-parasites is ONE hub, not four pages. Velvet was assessed for a
-- standalone and rejected: the reader intent is "something is on my fish, which
-- is it", and four thin pages would compete with each other and with the ich
-- article. The hub defers white spots to that article explicitly rather than
-- restating it.
--
-- internal-fish-parasites IS standalone, because the intent is genuinely
-- different: nothing visible on the body, and the signals are wasting despite
-- eating plus white stringy faeces. It also states that white faeces alone is
-- not diagnostic, which is the most common misreading.
--
-- fish-treatment-protocol merges the hospital tank with dosing discipline into
-- one canonical. Splitting them yields two thin pages that each repeat the
-- other, since you medicate in a hospital tank. Four existing articles already
-- defer to this page's subject without it existing.
--
-- No dose and no compound name is published anywhere in these three. Product
-- concentrations and availability differ between markets, and a single number
-- that suits one product harms with another.
--
-- aquarium-water-flow: "التيار" appears in 26 articles and is owned by none.
-- aquarium-placement-and-stand: weight, levelling and placement had zero
-- coverage, and the failure mode is property damage, not just fish loss.
--
-- DEEPEN, not NEW, and why: stocking order belongs to the setup guide, which
-- already owns the ordering intent; test frequency belongs to the test-kit
-- guide, which already owns reading the numbers. Separate pages would compete.
--
-- Also assessed and NOT written: photoperiod is already owned by the planted
-- lighting article, which carries a dedicated "المدة قبل الشدة" section, an
-- hours table and the 6-8 hour guidance. Shrimp husbandry is already owned by
-- aquarium-shrimp-snails-guide across six sections. Neither needs a page.
--
-- All drafts passed script-purity, editorial, business-truth, link resolution
-- and block-tag balance via scripts/gate-draft.ts.

BEGIN;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM blog_posts WHERE is_published;
  IF n <> ${published} THEN RAISE EXCEPTION 'expected ${published} published posts, found %', n; END IF;

  SELECT count(*) INTO n FROM blog_posts WHERE slug IN (${NEW.map((x) => q(x.slug)).join(", ")});
  IF n <> 0 THEN RAISE EXCEPTION 'one of the new slugs already exists'; END IF;

${DEEPEN.map((d) => `  SELECT count(*) INTO n FROM blog_posts WHERE slug = ${q(d.slug)} AND is_published
     AND length(content) = ${pgLength(d.before)};
  IF n <> 1 THEN RAISE EXCEPTION '${d.slug}: deepen target missing or changed since drafting'; END IF;`).join(NL)}
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
${DEEPEN.map((d) => `UPDATE blog_posts SET content = ${q(d.after)} WHERE slug = ${q(d.slug)};`).join(NL + NL)}

-- Post-flight.
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM blog_posts WHERE is_published;
  IF n <> ${published + NEW.length} THEN RAISE EXCEPTION 'expected ${published + NEW.length} published, found %', n; END IF;

  SELECT count(*) INTO n FROM blog_posts
   WHERE slug IN (${ALL.map(q).join(", ")})
     AND is_published AND length(content) > 2500
     AND content LIKE '%<table%' AND content LIKE '%href="/blog/%';
  IF n <> ${ALL.length} THEN RAISE EXCEPTION 'only % of ${ALL.length} articles carry their structure', n; END IF;

  SELECT count(*) INTO n FROM blog_posts
   WHERE slug IN (${NEW.map((x) => q(x.slug)).join(", ")}) AND author = 'AQUAVO Editorial Team';
  IF n <> ${NEW.length} THEN RAISE EXCEPTION 'only % of ${NEW.length} new articles carry the editorial byline', n; END IF;

  -- Every article this cycle creates must have an inbound link. Cycle 10 lost
  -- this check by folding linking into the article migration, and left an
  -- orphan behind; it is asserted here in the same migration that creates them.
  SELECT count(*) INTO n FROM (
    SELECT t.slug FROM blog_posts t
     WHERE t.slug IN (${NEW.map((x) => q(x.slug)).join(", ")})
       AND NOT EXISTS (
         SELECT 1 FROM blog_posts b
          CROSS JOIN LATERAL regexp_matches(b.content, 'href="/blog/([^"#?]+)"', 'g') AS m(parts)
          WHERE b.is_published AND b.slug <> t.slug AND m.parts[1] = t.slug)
  ) AS orphaned;
  IF n <> 0 THEN RAISE EXCEPTION '% new articles have no inbound link', n; END IF;

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
   WHERE slug IN (${ALL.map(q).join(", ")})
     AND content ~ '[一-鿿぀-ヿ가-힯Ѐ-ӿऀ-ॿ฀-๿֐-׿Ā-ɏḀ-ỿ]';
  IF n <> 0 THEN RAISE EXCEPTION 'a Wave 11 article carries stray script'; END IF;
END $$;

COMMIT;
`;

fs.writeFileSync(path.join(HERE, "migration-wave11.sql"), lf(sql));
fs.writeFileSync(
  path.join(HERE, "rollback-wave11.sql"),
  lf(`-- Rollback for ${ID}.

BEGIN;

DELETE FROM blog_posts WHERE slug IN (${NEW.map((x) => q(x.slug)).join(", ")});

UPDATE blog_posts b SET content = k.content
  FROM ${BACKUP} k
 WHERE b.id = k.id AND b.content IS DISTINCT FROM k.content;

COMMIT;
`),
);
console.log(`\nemitted migration-wave11.sql (${NEW.length} inserts, ${DEEPEN.length} deepenings)`);

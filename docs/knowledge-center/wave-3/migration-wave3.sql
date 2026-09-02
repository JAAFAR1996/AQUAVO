-- Migration ID: kc-wave3-articles-20260902
-- Target:       Neon production, blog_posts (1 insert, 1 rewrite)
-- Rollback:     rollback-wave3.sql
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
  IF n <> 79 THEN RAISE EXCEPTION 'expected 79 published posts, found %', n; END IF;

  SELECT count(*) INTO n FROM blog_posts WHERE slug IN ('fish-disease-symptoms-diagnosis');
  IF n <> 0 THEN RAISE EXCEPTION 'the new slug already exists'; END IF;

  SELECT count(*) INTO n FROM blog_posts WHERE slug = 'air-pumps-decoration-or-necessity' AND is_published
     AND length(content) = 2373;
  IF n <> 1 THEN RAISE EXCEPTION 'reframe target missing or changed since drafting'; END IF;
END $$;

CREATE TABLE blog_posts_backup_wave3_20260902 AS
SELECT id, slug, title, excerpt, content, is_published, now() AS backed_up_at
  FROM blog_posts;

INSERT INTO blog_posts (title, slug, excerpt, content, category, icon_name, author, is_published, published_at)
VALUES ('دليل تشخيص أعراض الأسماك: ابدأ بالماء لا بالدواء', 'fish-disease-symptoms-diagnosis', 'أغلب الأمراض المفاجئة عند المبتدئين ليست أمراضاً بل تسمم ماء يعطي الأعراض نفسها. جدول عرَض ← أرجح سبب ← أول خطوة، ومتى تكون الحالة طوارئ.', '<h2>ابدأ بالماء، لا بالدواء</h2>
<p>أغلب "الأمراض" المفاجئة بأحواض المبتدئين ليست أمراضاً. تسمم ماء يعطي أعراضاً تشبه المرض تماماً، والفرق أن الدواء لا ينفع معه — بل يزيد الضغط على سمكة أصلاً مسمومة.</p>
<blockquote>القاعدة قبل أي تشخيص: <strong>افحص الأمونيا والنتريت أولاً</strong>. إذا كان أيّهما فوق الصفر فهذي مشكلتك حتى يثبت العكس، مهما بدت الأعراض شبيهة بمرض. <a href="/blog/aquarium-test-kit-guide">قراءة اختبارات الماء</a>.</blockquote>

<h2>جدول: العرض ← الاحتمال الأول</h2>
<table>
  <tr><th>ما تراه</th><th>الاحتمال الأرجح</th><th>أول خطوة</th></tr>
  <tr><td>لهاث عند السطح، تنفس سريع، ماء صافٍ</td><td>نقص أوكسجين أو نتريت مرتفع</td><td>زد التهوية فوراً ثم افحص</td></tr>
  <tr><td>نقاط بيضاء كحبات الملح</td><td>النقط البيضاء</td><td>رفع حرارة تدريجي + دواء مخصص</td></tr>
  <tr><td>زعانف متآكلة أو حوافها بيضاء</td><td>تعفن زعانف، غالباً بعد إجهاد أو ماء رديء</td><td>حسّن الماء قبل أي دواء</td></tr>
  <tr><td>حك الجسم بالحصى والديكور</td><td>طفيلي مبكر أو تهيّج كيميائي</td><td>افحص الماء، وراقب ظهور نقاط</td></tr>
  <tr><td>احمرار الخياشيم أو الجسم</td><td>حروق أمونيا أو كلور غير معالَج</td><td>افحص، وتحقق من معالجة الماء</td></tr>
  <tr><td>لزوم القاع وانطواء الزعانف</td><td>إجهاد عام: حرارة، ماء، أو ترهيب من رفقاء الحوض</td><td>راجع الحرارة والفحص والتوافق</td></tr>
  <tr><td>طفو مقلوب أو صعوبة اتزان</td><td>مشكلة هضم/انتفاخ، شائعة بمستديري الجسم</td><td>صيام يومين وتقليل الطعام الطافي</td></tr>
  <tr><td>رفض الأكل بلا أعراض أخرى</td><td>ماء أو حرارة أو سمكة جديدة لم تتأقلم</td><td>افحص، وامنح وقتاً</td></tr>
</table>

<h2>ثلاثة أخطاء تشخيصية شائعة</h2>
<ul>
  <li><strong>علاج العرض بدل السبب.</strong> تعفن الزعانف غالباً نتيجة ماء رديء؛ الدواء يعالج العدوى ثم ترجع لأن السبب باقٍ. التفاصيل في <a href="/blog/fin-rot-treatment-guide">علاج تعفن الزعانف</a>.</li>
  <li><strong>خلط الاختناق بالمرض.</strong> اللهاث عند السطح بماء صافٍ غالباً أوكسجين أو نتريت، لا طفيلي. <a href="/blog/air-pumps-decoration-or-necessity">الأوكسجين الذائب والتهوية</a>.</li>
  <li><strong>الدواء الوقائي.</strong> إعطاء دواء بلا تشخيص يضغط على السمكة ويضر البكتيريا النافعة داخل الفلتر.</li>
</ul>

<h2>متى تكون حالة طوارئ</h2>
<p>تصرّف فوراً، وافحص بعدها، إذا رأيت:</p>
<ul>
  <li>أكثر من سمكة تلهث عند السطح بنفس الوقت.</li>
  <li>موت مفاجئ لأكثر من سمكة خلال ساعات.</li>
  <li>أمونيا أو نتريت فوق الصفر بأي قراءة.</li>
</ul>
<p>الإجراء الأول بهذه الحالات واحد: <strong>زد التهوية وغيّر جزءاً من الماء بماء معالَج بنفس الحرارة</strong>، ثم شخّص. البروتوكول الكامل في <a href="/blog/ammonia-spike-emergency-treatment">ارتفاع الأمونيا المفاجئ</a>.</p>

<h2>الوقاية التي تغني عن التشخيص</h2>
<ul>
  <li><strong>حجر صحي لكل سمكة جديدة</strong> — أكثر الأمراض تدخل هيك. <a href="/blog/quarantine-new-fish-guide">الحجر الصحي</a>.</li>
  <li><strong>حرارة ثابتة</strong> — التذبذب يضعف المناعة أكثر من أي رقم بحد ذاته.</li>
  <li><strong>تغيير ماء منتظم</strong> بدل انتظار المشكلة. <a href="/blog/aquarium-water-change-guide">تغيير الماء</a>.</li>
  <li><strong>عدد أسماك ضمن طاقة الحوض</strong> — الاكتظاظ إجهاد مزمن. <a href="/blog/how-many-fish-in-aquarium">كم سمكة يتحمل حوضك</a>.</li>
  <li><strong>لا تستخدم أدوية بشرية</strong> ولا تقدّر الجرعة بالتخمين. <a href="/blog/human-medicine-dangers-for-fish">خطر الأدوية البشرية</a>.</li>
</ul>
<p>ملاحظة صادقة: هذا الجدول يرتّب الاحتمالات، ولا يشخّص بشكل قاطع. أعراض كثيرة تتشارك بين أسباب مختلفة، ولهذا الفحص هو الفاصل وليس الشكل الظاهري.</p>', 'مشاكل وحلول', 'Stethoscope',
        'AQUAVO Editorial Team', TRUE, now());

UPDATE blog_posts SET title = 'الأوكسجين الذائب في الحوض: متى تكون مضخة الهواء ضرورة؟', excerpt = 'أغلب حالات الموت المفاجئ اختناق لا مرض. كيف يدخل الأوكسجين فعلاً، ما الذي يستهلكه، ولماذا الحرارة تخفض المعروض وترفع الطلب في اللحظة نفسها.', content = '<h2>الأوكسجين هو أول ما ينفد، وآخر ما ينتبه له أحد</h2>
<p>أغلب حالات الموت المفاجئ بالحوض ما سببها مرض ولا تسمم — سببها اختناق. والسمكة اللي تلزم السطح وتلهث مو "جائعة" ولا "تتدلع"، بل تحاول تتنفس من الطبقة الوحيدة الغنية بالأوكسجين.</p>
<p>هذا المقال عن الأوكسجين الذائب نفسه: كيف يدخل الماء، شنو يستهلكه، وكيف تعرف إنه ناقص قبل ما تخسر أسماكاً.</p>

<h2>كيف يدخل الأوكسجين فعلاً</h2>
<p>ينتشر بين الهواة أن "الفقاعات ما تعطي أوكسجين، الحركة السطحية هي كل شي". هذا تبسيط زائد. الحقيقة أدق: <strong>تبادل الغازات يصير عند أي سطح تماس بين الهواء والماء</strong> — سطح الحوض نفسه، وسطح كل فقاعة.</p>
<table>
  <tr><th>المسار</th><th>كيف يعمل</th><th>متى يكون الأهم</th></tr>
  <tr><td>سطح الحوض</td><td>تماس مباشر مع هواء الغرفة</td><td>الأحواض الواطئة العريضة — مساحة سطح كبيرة</td></tr>
  <tr><td>سطح الفقاعات</td><td>كل فقاعة سطح تماس متنقل</td><td>الأحواض العالية الضيقة</td></tr>
  <tr><td>التيار الصاعد من حجر الهواء</td><td>يدفع الماء العميق للسطح فيتجدد</td><td>دائماً — وهذا أهم أدوار حجر الهواء</td></tr>
</table>
<blockquote>النتيجة العملية واحدة مهما اختلف التفسير: <strong>سطح ساكن = مشكلة</strong>. سواء حرّكت السطح بمخرج الفلتر أو بحجر هواء أو بمروحة، المهم أن الماء عند السطح يتجدد باستمرار.</blockquote>

<h2>ما الذي يستهلك الأوكسجين</h2>
<p>الأسماك ليست المستهلك الوحيد، ولا حتى الأكبر أحياناً:</p>
<ul>
  <li><strong>الأسماك</strong> — وبكميات ترتفع بشدة مع الحرارة.</li>
  <li><strong>البكتيريا النافعة داخل الفلتر</strong> — أكسدة الأمونيا عملية تستهلك أوكسجيناً. فلترك يتنفس.</li>
  <li><strong>المواد العضوية المتحللة</strong> — علف زائد وفضلات ونبات ميت.</li>
  <li><strong>الانفجار البكتيري</strong> — الماء الأبيض الضبابي يستهلك كميات كبيرة، ولهذا التهوية أول إجراء فيه لا تغيير الماء. شوف <a href="/blog/cloudy-water-fix">تشخيص تعكر الماء</a>.</li>
  <li><strong>النباتات ليلاً</strong> — تستهلك أوكسجيناً بالظلام بدل ما تنتجه.</li>
</ul>

<h2>الحرارة: العامل الذي يقلب كل شي</h2>
<p>هذي أهم علاقة بالموضوع، وهي حرجة بالعراق تحديداً: <strong>الماء الأدفأ يحمل أوكسجيناً أقل، بينما السمكة الأدفأ تحتاجه أكثر</strong>. المعروض ينزل والطلب يصعد بنفس اللحظة.</p>
<p>سقف الأوكسجين الذائب ينزل من حوالي ٩.١ ملغم/لتر عند ٢٠ درجة إلى حوالي ٧.٠ عند ٣٥ درجة — أي انخفاض بنحو ٢٣٪ قبل ما تتنفس سمكة واحدة. وبنفس الوقت الأيض يتضاعف تقريباً مع كل ١٠ درجات. التفاصيل والجدول الكامل في <a href="/blog/protect-fish-iraqi-summer-50-degrees">حماية الأسماك من حرارة الصيف</a>.</p>

<h2>علامات النقص، مرتبة زمنياً</h2>
<ol>
  <li><strong>تجمّع عند السطح</strong> خاصة الصبح الباكر — قبل الإضاءة يكون الأوكسجين بأدنى مستوياته بعد ليلة كاملة من الاستهلاك.</li>
  <li><strong>تنفس سريع</strong> وحركة خياشيم واضحة.</li>
  <li><strong>خمول وفقدان شهية.</strong></li>
  <li><strong>تجمّع عند مخرج الفلتر</strong> — أكثر نقطة أوكسجيناً بالحوض.</li>
</ol>
<p>وانتبه: النتريت المرتفع يعطي <strong>نفس الأعراض تماماً</strong> لأنه يمنع الدم من حمل الأوكسجين. فقبل ما تفترض نقص تهوية، افحص — <a href="/blog/aquarium-test-kit-guide">قراءة اختبارات الماء</a>.</p>

<h2>مضخة الهواء: متى ضرورة ومتى زينة</h2>
<p>بحوض واسع السطح، قليل الأسماك، بارد، وبفلتر يحرك السطح جيداً — المضخة تحسين لا ضرورة. لكنها تصير <strong>ضرورة</strong> في:</p>
<ul>
  <li>الصيف وأي موجة حر.</li>
  <li>الأحواض المكتظة أو العالية الضيقة — <a href="/blog/how-many-fish-in-aquarium">كم سمكة يتحمل حوضك</a>.</li>
  <li>أثناء العلاج بالأدوية ورفع الحرارة — <a href="/blog/common-fish-diseases-white-spot">النقط البيضاء</a>.</li>
  <li>أحواض التفريخ والفلاتر الإسفنجية، لأنها تعمل بالهواء أصلاً — <a href="/blog/filter-types-guide">اختيار الفلتر</a>.</li>
</ul>
<p>مضخات الهواء وحجر الهواء والموزعات وصمامات عدم الرجوع متوفرة في AQUAVO ضمن قسم التهوية والأكسجين.</p>

<h2>وقت انقطاع الكهرباء</h2>
<p>توقف الفلتر والمضخة يعني توقف تجديد السطح — بالضبط لما يكون الحوض محتاجه. الإجراء اليدوي البسيط: اغرف ماءً بكوب وصبّه من ارتفاع بسيط كل فترة، فهذا يحرك السطح ويجدد التماس. وقلّل العلف تماماً حتى ترجع الكهرباء. التفاصيل في <a href="/blog/power-outage-emergency-aquarium-tools">أدوات الطوارئ عند انقطاع الكهرباء</a>.</p>'
 WHERE slug = 'air-pumps-decoration-or-necessity';

-- Post-flight.
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM blog_posts WHERE is_published;
  IF n <> 80 THEN RAISE EXCEPTION 'expected 80 published, found %', n; END IF;

  SELECT count(*) INTO n FROM blog_posts
   WHERE slug IN ('fish-disease-symptoms-diagnosis', 'air-pumps-decoration-or-necessity')
     AND is_published AND length(content) > 2500
     AND content LIKE '%<table%' AND content LIKE '%href="/blog/%';
  IF n <> 2 THEN RAISE EXCEPTION 'only % of 2 articles carry their structure', n; END IF;

  -- No published article may link to an unpublished one, corpus-wide.
  SELECT count(*) INTO n
    FROM blog_posts b
    CROSS JOIN LATERAL regexp_matches(b.content, 'href="/blog/([^"#?]+)"', 'g') AS m(parts)
   WHERE b.is_published
     AND NOT EXISTS (SELECT 1 FROM blog_posts t WHERE t.slug = m.parts[1] AND t.is_published);
  IF n <> 0 THEN RAISE EXCEPTION '% internal links point at unpublished articles', n; END IF;

  SELECT count(*) INTO n FROM blog_posts
   WHERE slug IN ('fish-disease-symptoms-diagnosis', 'air-pumps-decoration-or-necessity')
     AND content ~ '[一-鿿぀-ヿ가-힯Ѐ-ӿऀ-ॿ฀-๿֐-׿Ā-ɏḀ-ỿ]';
  IF n <> 0 THEN RAISE EXCEPTION 'stray script in a Wave 3 article'; END IF;
END $$;

COMMIT;

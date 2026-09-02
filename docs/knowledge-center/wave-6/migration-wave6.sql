-- Migration ID: kc-wave6-articles-20260902
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
  IF n <> 88 THEN RAISE EXCEPTION 'expected 88 published posts, found %', n; END IF;

  SELECT count(*) INTO n FROM blog_posts WHERE slug IN ('angelfish-care-guide', 'gourami-care-guide');
  IF n <> 0 THEN RAISE EXCEPTION 'the new slug already exists'; END IF;

  SELECT count(*) INTO n FROM blog_posts WHERE slug = 'ammonia-spike-emergency-treatment' AND is_published
     AND length(content) = 2044;
  IF n <> 1 THEN RAISE EXCEPTION 'reframe target missing or changed since drafting'; END IF;
END $$;

CREATE TABLE blog_posts_backup_wave6_20260902 AS
SELECT id, slug, title, excerpt, content, is_published, now() AS backed_up_at
  FROM blog_posts;

INSERT INTO blog_posts (title, slug, excerpt, content, category, icon_name, author, is_published, published_at)
VALUES ('الأنجل فيش: سمكة سيكلد بمظهر مسالم', 'angelfish-care-guide', 'تُباع بحجم عملة وتصل 15 سم طولاً و20 ارتفاعاً، وهي سيكلد تصير إقليمية عند البلوغ. ولماذا ارتفاع الحوض يهمّها أكثر من طوله.', '<h2>سمكة سيكلد بمظهر مسالم</h2>
<p>الأنجل فيش تُباع غالباً كسمكة زينة هادئة، والحقيقة أنها <strong>من عائلة السيكلد</strong> — وهذا يفسّر كل ما يفاجئ المبتدئ فيها لاحقاً: الإقليمية عند البلوغ، والعدوانية أثناء التزاوج، ومطاردة السمك الصغير.</p>
<p>هي سمكة رائعة لكنها ليست سمكة مبتدئ صرف، والسبب ليس صعوبة رعايتها بل <strong>ما تتحول إليه بعد أشهر</strong>.</p>

<h2>الحجم والحوض: الخطأ الأول</h2>
<table>
  <tr><th></th><th>الواقع</th></tr>
  <tr><td>الحجم عند الشراء</td><td>بحجم عملة معدنية غالباً</td></tr>
  <tr><td>الحجم البالغ</td><td>يصل ١٥ سم طولاً، <strong>وحتى ٢٠ سم ارتفاعاً</strong> مع الزعانف</td></tr>
  <tr><td>ما يهم بالحوض</td><td><strong>الارتفاع</strong> قبل الطول — جسمها مضغوط جانبياً وزعانفها طويلة عمودياً</td></tr>
  <tr><td>حوض منخفض</td><td>غير مناسب مهما كانت لتراته كبيرة</td></tr>
</table>
<blockquote>هذي السمكة الوحيدة تقريباً التي يكون فيها <strong>ارتفاع الحوض</strong> عاملاً حاسماً. حوض واسع لكنه منخفض يجبر الأنجل البالغة على وضع غير طبيعي، وهو اعتبار لا ينطبق على أغلب الأسماك الأخرى — راجع <a href="/blog/how-to-choose-aquarium-tank">اختيار الحوض المناسب</a>.</blockquote>

<h2>مع من تعيش</h2>
<ul>
  <li><strong>لا تضعها مع أسماك صغيرة جداً.</strong> النيون تترا الكلاسيكي مع الأنجل فكرة سيئة: الأنجل البالغة تأكل ما يدخل فمها، والنيون بالضبط بهذا الحجم.</li>
  <li><strong>لا تضعها مع قارضي الزعانف</strong> — بعض أنواع البارب تنقر زعانفها الطويلة باستمرار.</li>
  <li><strong>الأنجل مع الأنجل:</strong> مجموعة صغار تتعايش، ثم عند البلوغ يتشكل زوج ويطارد البقية. هذا سلوك طبيعي وليس خللاً، لكنه يعني أن الحوض يجب أن يتحمل النتيجة.</li>
  <li><strong>الأفضل:</strong> أسماك متوسطة هادئة لا تُبتلع ولا تنقر.</li>
</ul>
<p>مبدأ التوافق العام في <a href="/blog/tank-mates-compatibility">توافق الأسماك</a>، وحدود العدد في <a href="/blog/how-many-fish-in-aquarium">كم سمكة يتحمل حوضك</a>.</p>

<h2>الماء والحرارة</h2>
<p>الأنجل من أمريكا الجنوبية وتفضل ماءً دافئاً نسبياً وهادئ التيار. النقاط العملية:</p>
<ul>
  <li><strong>تيار لطيف.</strong> زعانفها الطويلة تجعل السباحة بتيار قوي مجهدة — وجّه مخرج الفلتر على الزجاج لتكسيره. <a href="/blog/filter-types-guide">اختيار الفلتر</a>.</li>
  <li><strong>حرارة ثابتة</strong> أهم من رقم مثالي. التذبذب هو ما يفتح باب المرض.</li>
  <li><strong>ارتفاع الحوض</strong> يعني عمود ماء أطول ومساحة سطح أصغر نسبياً، فانتبه للتهوية. <a href="/blog/air-pumps-decoration-or-necessity">الأوكسجين الذائب</a>.</li>
  <li><strong>الأمونيا والنتريت صفر</strong> كأي حوض. <a href="/blog/aquarium-test-kit-guide">قراءة الفحص</a>.</li>
</ul>

<h2>الزعانف الطويلة: نقطة ضعف عملية</h2>
<p>زعانف الأنجل الطويلة تجعلها أكثر عرضة لشيئين: <strong>التمزق</strong> من ديكور حاد أو رفقاء نقّارين، و<strong>تعفن الزعانف</strong> بعد أي تمزق إن كان الماء رديئاً. اختر ديكوراً بحواف ناعمة، وعالج جودة الماء قبل الدواء عند أي تآكل — <a href="/blog/fin-rot-treatment-guide">تعفن الزعانف</a> و<a href="/blog/fish-fungus-vs-columnaris">الزغب الأبيض</a>.</p>

<h2>حدود ما نستطيع قوله</h2>
<p>لن نعطيك جدول توافق قاطعاً بالأسماء: سلوك الأنجل يختلف بين فرد وآخر، وبين مرحلة الصغر والبلوغ، وبين حوض واسع وضيق. القاعدة الصادقة أدق من أي قائمة: <strong>خطّط للسمكة البالغة الإقليمية، لا للصغيرة الهادئة التي اشتريتها</strong> — ومعظم مشاكل الأنجل تبدأ من نسيان هذا.</p>', 'أنواع الأسماك', 'Fish',
        'AQUAVO Editorial Team', TRUE, now());

INSERT INTO blog_posts (title, slug, excerpt, content, category, icon_name, author, is_published, published_at)
VALUES ('الغورامي: سمكة تتنفس هواء الجو، وماذا يعني ذلك عملياً', 'gourami-care-guide', 'العضو المتاهي يمنحها هامش أمان مع انقطاع الكهرباء وحرارة الصيف — لكنه يعني أيضاً أن الغطاء المحكم تماماً خطر عليها.', '<h2>سمكة تتنفس هواء الجو</h2>
<p>الغورامي من مجموعة الأنابانتويد، ومعها الفايتر — وكلاهما يملك <strong>العضو المتاهي (labyrinth organ)</strong>: تركيب داخل الرأس مبطّن بأوعية دموية يسمح لها بسحب الأوكسجين من هواء الجو مباشرة.</p>
<p>هذا يفسّر سلوكها الأول الذي يقلق المبتدئ: صعودها المتكرر للسطح وأخذ نفس. هذا طبيعي تماماً وليس علامة اختناق.</p>
<blockquote>ويترتب عليه شرط عملي مهم: <strong>لا تغلق الحوض إغلاقاً محكماً تماماً</strong>. الغورامي يجب أن تصل للسطح، وبعض أنواعها تنفسها الهوائي إجباري لا اختياري. اترك مسافة هواء بين الماء والغطاء، وغطِّ الفجوات فقط — <a href="/blog/why-fish-jump-out-aquarium">القفز والغطاء الصحيح</a>.</blockquote>
<p>وانتبه: هذي القدرة تعني تحمّل <strong>قلة الأوكسجين الذائب</strong>، ولا تعني إطلاقاً تحمّل الأمونيا. لا سمكة تتحمل الأمونيا. الآلية في <a href="/blog/air-pumps-decoration-or-necessity">الأوكسجين الذائب والتهوية</a> و<a href="/blog/fish-that-live-without-filter">حوض بلا فلتر</a>.</p>

<h2>لماذا تناسب الظروف العراقية</h2>
<p>القدرة على التنفس الهوائي تجعل الغورامي أقل تضرراً من الحالات التي تقتل غيرها: <strong>انقطاع الكهرباء</strong> الذي يوقف المضخة والفلتر، و<strong>حرارة الصيف</strong> التي تخفض الأوكسجين الذائب.</p>
<p>لكن هذا هامش أمان، لا حصانة. الفلتر يبقى ضرورياً للترشيح البيولوجي — والأمونيا ترتفع بنفس الطريقة عند توقفه. <a href="/blog/power-outage-emergency-aquarium-tools">أدوات الطوارئ</a> و<a href="/blog/protect-fish-iraqi-summer-50-degrees">حرارة الصيف</a>.</p>

<h2>السلوك: ما يفاجئ المبتدئ</h2>
<table>
  <tr><th>السلوك</th><th>التفسير</th></tr>
  <tr><td>صعود متكرر للسطح</td><td>تنفس طبيعي عبر العضو المتاهي — لا تقلق</td></tr>
  <tr><td>عدوانية بين الذكور</td><td>إقليمية، تزداد بحوض ضيق أو بلا مخابئ</td></tr>
  <tr><td>فقاعات على السطح</td><td>عش فقاعات يبنيه الذكر — سلوك تكاثري طبيعي</td></tr>
  <tr><td>مطاردة سمكة بعينها</td><td>غالباً إقليمية أو نسبة جنسين غير متوازنة</td></tr>
  <tr><td>الزعانف الخيطية الطويلة</td><td>أعضاء حسية تستكشف بها المحيط — ليست تشوهاً</td></tr>
</table>
<p>تمييز الذكر من الأنثى وضبط النسبة في <a href="/blog/how-to-sex-aquarium-fish">تمييز الذكر من الأنثى</a>.</p>

<h2>الحوض المناسب</h2>
<ul>
  <li><strong>سطح هادئ.</strong> هذي أهم نقطة تخص الغورامي تحديداً: تيار قوي عند السطح يزعج سمكة تصعد للتنفس باستمرار. وجّه مخرج الفلتر للأسفل أو على الزجاج. <a href="/blog/filter-types-guide">اختيار الفلتر</a>.</li>
  <li><strong>نباتات وأسطح عائمة</strong> تمنحها إحساس الأمان وتخفف العدوانية.</li>
  <li><strong>مخابئ وخطوط رؤية مكسورة</strong> — الديكور الذي يقطع الرؤية يقلل الإقليمية أكثر من زيادة المساحة وحدها.</li>
  <li><strong>مساحة سطح كافية</strong> — لأن السطح ليس للتبادل فقط بل للتنفس المباشر أيضاً.</li>
</ul>

<h2>مع من تعيش</h2>
<ul>
  <li>أسماك <strong>مسالمة متوسطة</strong> لا تنقر الزعانف الخيطية الطويلة.</li>
  <li><strong>تجنب</strong> قارضي الزعانف، والأسماك النشطة جداً التي تُبقي السطح مضطرباً.</li>
  <li><strong>ذكران في حوض صغير</strong> وصفة مطاردة مستمرة — إما ذكر واحد أو حوض واسع بمخابئ كثيرة.</li>
  <li>مع الفايتر: كلاهما أنابانتويد إقليمي، والجمع بينهما محفوف بالمخاطر. <a href="/blog/betta-compatible-tank-mates">توافق الفايتر</a>.</li>
</ul>
<p>وحدود العدد كالعادة تُقرَّر بالفحص لا بالتقدير — <a href="/blog/how-many-fish-in-aquarium">كم سمكة يتحمل حوضك</a>.</p>', 'أنواع الأسماك', 'Fish',
        'AQUAVO Editorial Team', TRUE, now());

UPDATE blog_posts SET title = 'ارتفاع الأمونيا المفاجئ: افعل هذا الآن، بهذا الترتيب', excerpt = 'عشرة مقالات على هذا الموقع تحيلك هنا وقت الطوارئ، فهذي الخطوات الست مرتبة بالأولوية — ولماذا تنظيف الفلتر الآن يحوّل المشكلة إلى كارثة.', content = '<h2>افعل هذا الآن، ثم اقرأ الباقي</h2>
<p>إذا كانت قراءتك للأمونيا فوق الصفر والأسماك تلهث أو خاملة، ابدأ بهذي الخطوات بهذا الترتيب. الترتيب مقصود.</p>
<table>
  <tr><th>#</th><th>الإجراء</th><th>ليش بهذا الترتيب</th></tr>
  <tr><td>١</td><td><strong>أوقف العلف تماماً</strong></td><td>أسرع إجراء وأرخصه: يوقف إنتاج أمونيا جديدة فوراً</td></tr>
  <tr><td>٢</td><td><strong>زد التهوية</strong></td><td>الأمونيا تحرق الخياشيم، والسمكة المتضررة تحتاج أوكسجيناً أكثر لا أقل</td></tr>
  <tr><td>٣</td><td><strong>غيّر جزءاً من الماء</strong> بماء معالَج وبنفس الحرارة</td><td>التخفيف هو الطريقة الوحيدة السريعة لخفض التركيز فعلياً</td></tr>
  <tr><td>٤</td><td><strong>أضف معالج ماء يربط الأمونيا</strong></td><td>يحوّلها لصورة أقل ضرراً مؤقتاً حتى تلحق البكتيريا</td></tr>
  <tr><td>٥</td><td><strong>ابحث عن السبب</strong></td><td>بلا هذا سترجع خلال أيام</td></tr>
  <tr><td>٦</td><td><strong>أعد الفحص بعد ساعات</strong></td><td>القراءة الواحدة حالة؛ القراءتان اتجاه</td></tr>
</table>
<blockquote><strong>ولا تنظّف الفلتر</strong>، ولا تبدّل ميديته، ولا تغسلها بماء الحنفية — لا اليوم ولا هذا الأسبوع. البكتيريا التي تعالج الأمونيا تعيش هناك، وتنظيف الفلتر أثناء أزمة أمونيا يحوّل المشكلة إلى كارثة.</blockquote>

<h2>ليش الرقم وحده لا يكفي</h2>
<p>الأمونيا موجودة بصورتين، والنسبة بينهما تحددها <strong>الحرارة والـ pH</strong>. الصورة السامة ترتفع نسبتها كلما ارتفع أحدهما. لهذا:</p>
<ul>
  <li>نفس قراءة الأمونيا تكون أخطر بكثير بحوض دافئ قاعدي منها بحوض بارد حامضي.</li>
  <li>وبصيف العراق يجتمع العاملان: حرارة عالية، وأوكسجين أقل — فالسمكة تتلقى ضربتين. <a href="/blog/protect-fish-iraqi-summer-50-degrees">حرارة الصيف</a>.</li>
</ul>
<p>ولا تحاول خفض الـ pH لتقليل السمّية: تذبذب الـ pH ضرر إضافي على سمكة أصلاً متضررة. الجدول الكامل للعلاقة في <a href="/blog/nitrogen-cycle-simple-arabic-explained">الدورة البيولوجية</a>.</p>

<h2>من أين جاءت؟ ابحث هنا</h2>
<p>ارتفاع الأمونيا نتيجة لا سبب. راجع ما تغيّر خلال الأيام الماضية:</p>
<ul>
  <li><strong>علف زائد</strong> — السبب الأول بفارق كبير. <a href="/blog/aquarium-fish-feeding-guide">دليل التغذية</a>.</li>
  <li><strong>سمكة نافقة مختبئة</strong> خلف الديكور أو تحت الحصى — ابحث جيداً وعُدّ أسماكك.</li>
  <li><strong>غسل الفلتر بماء الحنفية</strong> أو تبديل الميديا كاملة. <a href="/blog/how-to-treat-tap-water-for-fish-iraq">معالجة ماء الحنفية</a>.</li>
  <li><strong>انقطاع كهرباء طويل</strong> أوقف مرور الماء على البكتيريا. <a href="/blog/power-outage-emergency-aquarium-tools">أدوات الطوارئ</a>.</li>
  <li><strong>أسماك جديدة</strong> رفعت الحمل فجأة. <a href="/blog/how-many-fish-in-aquarium">كم سمكة يتحمل حوضك</a>.</li>
  <li><strong>دواء</strong> أضرّ بالبكتيريا النافعة.</li>
  <li><strong>حوض جديد لم يكتمل تدويره</strong> — وهذي ليست أزمة بل مرحلة طبيعية.</li>
</ul>

<h2>حوض جديد: الحالة المختلفة</h2>
<p>إذا كان حوضك قيد التدوير فارتفاع الأمونيا متوقع، والهدف مختلف: <strong>إبقاء التركيز منخفضاً بما يكفي لسلامة الأسماك بلا إيقاف بناء المستعمرة</strong>. تغييرات ماء أصغر وأكثر تكراراً، وصبر. التغيير الضخم المتكرر يبطئ التدوير.</p>
<p>وإذا كان الحوض بلا سمك فلا داعي للتدخل أصلاً — دعه يكمل.</p>

<h2>علامات التسمم على السمكة</h2>
<ul>
  <li>لهاث عند السطح وتنفس سريع.</li>
  <li>احمرار الخياشيم أو خطوط دموية على الزعانف.</li>
  <li>خمول، لزوم القاع، رفض الأكل.</li>
  <li>حك الجسم بالأسطح.</li>
</ul>
<p>وانتبه: النتريت المرتفع يعطي أعراضاً شبه متطابقة، والفرق بينهما يظهر بالفحص لا بالنظر. راجع <a href="/blog/fish-disease-symptoms-diagnosis">دليل تشخيص الأعراض</a> و<a href="/blog/aquarium-test-kit-guide">قراءة اختبارات الماء</a>. تتوفر في AQUAVO شرائط فحص واختبارات سائلة للأمونيا والنتريت ومعالجات مياه، ضمن قسمي الفحص والمراقبة ومعالجة المياه.</p>

<h2>بعد انتهاء الأزمة</h2>
<p>لا تعُد للروتين القديم مباشرة. أعد العلف تدريجياً، وافحص يومياً لبضعة أيام، وراجع السبب الجذري — <a href="/blog/aquarium-water-change-guide">جدول تغيير الماء</a> أو عدد الأسماك أو كمية العلف. الأزمة التي تتكرر ليست حادثة، بل نظام غير متوازن.</p>'
 WHERE slug = 'ammonia-spike-emergency-treatment';

-- Post-flight.
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM blog_posts WHERE is_published;
  IF n <> 90 THEN RAISE EXCEPTION 'expected 90 published, found %', n; END IF;

  SELECT count(*) INTO n FROM blog_posts
   WHERE slug IN ('angelfish-care-guide', 'gourami-care-guide', 'ammonia-spike-emergency-treatment')
     AND is_published AND length(content) > 2500
     AND content LIKE '%<table%' AND content LIKE '%href="/blog/%';
  IF n <> 3 THEN RAISE EXCEPTION 'only % of 3 articles carry their structure', n; END IF;

  -- No published article may link to an unpublished one, corpus-wide.
  SELECT count(*) INTO n
    FROM blog_posts b
    CROSS JOIN LATERAL regexp_matches(b.content, 'href="/blog/([^"#?]+)"', 'g') AS m(parts)
   WHERE b.is_published
     AND NOT EXISTS (SELECT 1 FROM blog_posts t WHERE t.slug = m.parts[1] AND t.is_published);
  IF n <> 0 THEN RAISE EXCEPTION '% internal links point at unpublished articles', n; END IF;

  SELECT count(*) INTO n FROM blog_posts
   WHERE slug IN ('angelfish-care-guide', 'gourami-care-guide', 'ammonia-spike-emergency-treatment')
     AND content ~ '[一-鿿぀-ヿ가-힯Ѐ-ӿऀ-ॿ฀-๿֐-׿Ā-ɏḀ-ỿ]';
  IF n <> 0 THEN RAISE EXCEPTION 'stray script in a Wave 3 article'; END IF;
END $$;

COMMIT;

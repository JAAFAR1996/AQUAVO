-- Migration ID: kc-wave2-articles-20260902
-- Target:       Neon production, blog_posts (4 inserts)
-- Rollback:     rollback-wave2.sql
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
  IF n <> 75 THEN RAISE EXCEPTION 'expected 75 published posts, found %', n; END IF;

  SELECT count(*) INTO n FROM blog_posts WHERE slug IN ('acclimating-new-fish', 'aquarium-test-kit-guide', 'gh-kh-water-hardness-guide', 'aquarium-salt-guide');
  IF n <> 0 THEN RAISE EXCEPTION 'one of the new slugs already exists'; END IF;
END $$;

CREATE TABLE blog_posts_backup_wave2_20260902 AS
SELECT id, slug, title, excerpt, content, is_published, now() AS backed_up_at
  FROM blog_posts;

INSERT INTO blog_posts (title, slug, excerpt, content, category, icon_name, author, is_published, published_at)
VALUES ('أقلمة السمكة الجديدة: ليش فتح الكيس يزيد الخطر', 'acclimating-new-fish', 'الكيس المغلق يحمي السمكة كيميائياً، وفتحه يرفع الـ pH فيحوّل الأمونيا الموجودة إلى صورتها السامة. الطريقة العملية، ونقطة الخلاف بين التنقيط والنقل السريع.', '<h2>الخطر اللي ما ينتبه له أحد: فتح الكيس يزيد سمّية الأمونيا</h2>
<p>هذي أهم معلومة بالموضوع، وهي عكس ما يظن أغلب الناس. السمكة داخل كيس مغلق تطرح أمونيا، والكيس بنفس الوقت يتراكم فيه ثاني أكسيد الكربون فينزل الـ pH. والـ pH الواطي يحوّل الأمونيا إلى صورتها الأقل سمّية بكثير.</p>
<p>يعني الكيس المغلق كان يحميها كيميائياً. ولما تفتحه:</p>
<ul>
  <li>ثاني أكسيد الكربون يتسرب للهواء.</li>
  <li>الـ pH يبدأ يرتفع.</li>
  <li>نفس كمية الأمونيا الموجودة أصلاً تتحول تدريجياً إلى الصورة السامة.</li>
</ul>
<blockquote>النتيجة العملية: <strong>كل دقيقة إضافية والكيس مفتوح تزيد سمّية الأمونيا الموجودة فيه</strong>. فالتنقيط البطيء لساعة داخل ماء الكيس ممكن يكون أسوأ من النقل السريع، خصوصاً إذا السمكة قضت وقتاً طويلاً بالكيس قبل ما توصلك. آلية علاقة الـ pH بالأمونيا مشروحة في <a href="/blog/nitrogen-cycle-simple-arabic-explained">الدورة البيولوجية</a>.</blockquote>

<h2>الطريقة العملية</h2>
<table>
  <tr><th>الخطوة</th><th>التنفيذ</th><th>ليش</th></tr>
  <tr><td>١. عوّم الكيس مغلقاً</td><td>١٥–٢٠ دقيقة</td><td>تقارب الحرارة وحدها، والكيس يبقى مغلقاً فيبقى الـ pH واطئاً</td></tr>
  <tr><td>٢. افتح وانقل</td><td>بشبكة أو كوب، بلا ماء الكيس</td><td>يقلل زمن التعرض بعد ارتفاع الـ pH</td></tr>
  <tr><td>٣. تخلّص من ماء الكيس</td><td>خارج الحوض تماماً</td><td>يحمل أمونيا وربما مسببات مرض</td></tr>
  <tr><td>٤. إضاءة خافتة</td><td>ساعات بعد النقل</td><td>يقلل التوتر بأول ساعات</td></tr>
  <tr><td>٥. لا تطعم</td><td>أول ٢٤ ساعة</td><td>السمكة المجهدة ما تأكل، والعلف يتحلل ويلوّث</td></tr>
</table>
<p>وإذا الفرق بالكيمياء كبير فعلاً — ماء متجر مختلف تماماً عن ماء بيتك — فالتنقيط يبقى مفيداً، لكن سوّه <strong>بعد</strong> نقل السمكة إلى وعاء نظيف بلا ماء الكيس، مو داخل الكيس نفسه.</p>

<h2>نقطة خلافية، ونقولها كما هي</h2>
<p>فيه خلاف حقيقي بين المختصين: بعضهم يفضل التنقيط البطيء لتقليل صدمة الكيمياء، وبعضهم — خصوصاً مع الأسماك المشحونة لمسافات — يفضل تعويم الحرارة ثم النقل المباشر لتقليل التعرض للأمونيا. ما راح نحسم خلافاً ما هو محسوم، لكن الميزان يميل حسب حالتك: <strong>كلما طالت مدة بقاء السمكة بالكيس قبل وصولها، صار التعرض للأمونيا هو الخطر الأكبر</strong>، وصار السرعة أفضل.</p>

<h2>أخطاء شائعة</h2>
<ul>
  <li><strong>سكب ماء الكيس بالحوض.</strong> أشهر خطأ وأسهل تفاديه.</li>
  <li><strong>تنقيط ساعة أو أكثر داخل الكيس المفتوح</strong> — للسبب الكيميائي أعلاه.</li>
  <li><strong>إدخال السمكة مباشرة للحوض الرئيسي</strong> بلا حجر صحي. التفصيل في <a href="/blog/quarantine-new-fish-guide">الحجر الصحي للسمكة الجديدة</a>.</li>
  <li><strong>إضافة عدة أسماك دفعة واحدة</strong> — يرفع الحمل الحيوي فجأة قبل ما تلحق البكتيريا. شوف <a href="/blog/how-many-fish-in-aquarium">كم سمكة يتحمل حوضك</a>.</li>
  <li><strong>تشغيل إضاءة قوية فوراً</strong> بعد النقل.</li>
</ul>

<h2>بعد النقل</h2>
<p>راقب أول ٤٨ ساعة: تنفس سريع، لزوم القاع أو السطح، رفض الأكل بعد اليوم الأول، أو حك الجسم بالأسطح. وافحص الأمونيا والنتريت بعد يومين — أي سمكة جديدة إضافة على الحمل الحيوي، وإذا ارتفعت القراءة فالإجراء في <a href="/blog/ammonia-spike-emergency-treatment">ارتفاع الأمونيا المفاجئ</a>. شرائط الفحص واختبارات الأمونيا متوفرة في AQUAVO ضمن الفحص والمراقبة.</p>', 'للمبتدئين', 'Droplet',
        'AQUAVO Editorial Team', TRUE, now());

INSERT INTO blog_posts (title, slug, excerpt, content, category, icon_name, author, is_published, published_at)
VALUES ('قراءة اختبارات ماء الحوض: شنو يعني كل رقم', 'aquarium-test-kit-guide', 'رقمان لازم يكونان صفراً دائماً، وواحد يُقرأ بالاتجاه لا بالقيمة. وليش قراءة الأمونيا وحدها بلا الـ pH والحرارة قد تخدعك تماماً.', '<h2>خمسة أرقام، وكل واحد يقول لك شيئاً مختلفاً</h2>
<p>الفحص مو طقساً شهرياً تسويه وتنسى النتيجة. كل رقم يجاوب على سؤال مختلف، والأهم إن رقمين منها <strong>لازم يكونان صفراً دائماً</strong> ولا يوجد نقاش بهذا.</p>
<table>
  <tr><th>القياس</th><th>يجاوب على</th><th>القراءة المطلوبة</th><th>إذا انحرف</th></tr>
  <tr><td>الأمونيا</td><td>هل الترشيح البايولوجي يعمل؟</td><td><strong>صفر</strong></td><td>طوارئ — تغيير ماء فوري</td></tr>
  <tr><td>النتريت</td><td>هل الخطوة الثانية تعمل؟</td><td><strong>صفر</strong></td><td>طوارئ — السمكة تختنق</td></tr>
  <tr><td>النترات</td><td>هل جدول تغيير الماء كافٍ؟</td><td>ثابتة بين تغييرين</td><td>زد التغيير أو قلّل الحمل</td></tr>
  <tr><td>الـ pH</td><td>ما مدى سمّية الأمونيا الموجودة؟</td><td>ثابت أكثر من كونه رقماً معيناً</td><td>ابحث عن سبب التذبذب</td></tr>
  <tr><td>KH</td><td>هل الـ pH محمي من الانهيار؟</td><td>كافٍ ليثبّت</td><td>راجع القساوة</td></tr>
</table>

<h2>الأمونيا: الرقم وحده لا يكفي</h2>
<p>هذي النقطة اللي تغيّر طريقة قراءتك للفحص كلياً. الأمونيا موجودة بصورتين: صورة سامة وصورة أقل سمّية بكثير، والنسبة بينهما تتحدد بـ<strong>الـ pH والحرارة</strong>.</p>
<blockquote>يعني نفس قراءة الأمونيا على الجهاز تكون شبه محتملة بحوض حامضي بارد، وحالة طوارئ بحوض قاعدي دافئ. فلا تقرأ الأمونيا لوحدها أبداً — اقرأها مع الـ pH والحرارة. الجدول الكامل في <a href="/blog/nitrogen-cycle-simple-arabic-explained">الدورة البيولوجية</a>.</blockquote>
<p>وإذا طلعت الأمونيا فوق الصفر فالإجراء الفوري في <a href="/blog/ammonia-spike-emergency-treatment">ارتفاع الأمونيا المفاجئ</a>.</p>

<h2>النتريت: اختناق بماء صافٍ</h2>
<p>النتريت يمنع الدم من حمل الأوكسجين. فالسمكة تلهث وتلزم السطح <strong>رغم أن الماء صافٍ والتهوية شغالة</strong> — وهذا يخدع الكثيرين فيبحثون عن مشكلة تهوية غير موجودة. أي قراءة نتريت فوق الصفر تعامل كطوارئ.</p>

<h2>النترات: اقرأ الاتجاه لا الرقم</h2>
<p>النترات ناتج نهائي للدورة، والفلتر ما يشيلها — تغيير الماء يشيلها. ما راح نعطيك سقفاً رقمياً لأن الأرقام المتداولة ما لكينا لها مصدراً أولياً موثوقاً، لكن القاعدة العملية أوضح من أي رقم:</p>
<ul>
  <li><strong>ثابتة بين تغييرين</strong> = جدولك مناسب.</li>
  <li><strong>تتسلق أسبوعاً بعد أسبوع</strong> = الإخراج أقل من الإنتاج. زد التغيير أو قلّل العلف وعدد الأسماك.</li>
</ul>
<p>التنفيذ في <a href="/blog/aquarium-water-change-guide">دليل تغيير الماء</a>، وحدود الحمل في <a href="/blog/how-many-fish-in-aquarium">كم سمكة يتحمل حوضك</a>.</p>

<h2>متى تفحص</h2>
<ul>
  <li><strong>حوض جديد:</strong> كل يومين حتى تستقر القراءات — هيك تعرف وين أنت من التدوير.</li>
  <li><strong>حوض مستقر:</strong> أسبوعياً قبل تغيير الماء، لأن هذي أعلى نقطة بالدورة الأسبوعية.</li>
  <li><strong>بعد أي تغيير:</strong> سمكة جديدة، دواء، تنظيف فلتر، انقطاع كهرباء طويل، أو موجة حر.</li>
  <li><strong>عند أي سلوك غريب</strong> قبل ما تفترض مرضاً — أغلب "الأمراض" المفاجئة تسمم ماء.</li>
</ul>

<h2>أخطاء تجعل الفحص بلا معنى</h2>
<ul>
  <li><strong>الفحص بعد تغيير الماء مباشرة.</strong> راح تقرأ الماء الجديد لا حوضك. افحص قبل.</li>
  <li><strong>شرائط منتهية الصلاحية أو مخزّنة بالحر</strong> — والصيف العراقي قاسٍ على الكواشف. خزّنها ببارد وجاف.</li>
  <li><strong>قراءة الألوان بإضاءة صفراء</strong> — اقرأ بضوء النهار.</li>
  <li><strong>تسجيل لا شي.</strong> القراءة الواحدة تخبرك بالحالة؛ سلسلة قراءات تخبرك بالاتجاه، وهو الأهم.</li>
</ul>
<p>شرائط الفحص ٩ في ١ واختبارات الأمونيا والنتريت السائلة متوفرة في AQUAVO ضمن قسم الفحص والمراقبة.</p>', 'علوم الأحواض', 'Activity',
        'AQUAVO Editorial Team', TRUE, now());

INSERT INTO blog_posts (title, slug, excerpt, content, category, icon_name, author, is_published, published_at)
VALUES ('القساوة GH و KH و TDS: أي رقم يقرر ماذا؟', 'gh-kh-water-hardness-guide', 'الـ KH يمنع الـ pH من الانهيار، والـ GH يحدد ملاءمة الماء للنوع، والـ TDS لا يعوّض عن أي منهما. وليش الاستقرار أهم من الرقم المثالي.', '<h2>ثلاثة قياسات يخلطها الجميع</h2>
<p>القساوة مو رقماً واحداً. ثلاثة قياسات مختلفة تُذكر مع بعض ويُظن أنها نفس الشي، وكل واحد منها يقرر شيئاً آخر بحوضك:</p>
<table>
  <tr><th></th><th>شنو يقيس</th><th>يقرر</th></tr>
  <tr><td><strong>KH</strong> القساوة الكربونية</td><td>القدرة على معادلة الأحماض (القاعدية)</td><td>هل الـ pH يبقى ثابتاً أم ينهار</td></tr>
  <tr><td><strong>GH</strong> القساوة العامة</td><td>الكالسيوم والمغنيسيوم أساساً</td><td>ملاءمة الماء للنوع، وصحة القشور والأصداف</td></tr>
  <tr><td><strong>TDS</strong> مجموع الذائبات</td><td>كل شي ذائب مجتمعاً</td><td>مؤشر عام فقط — <strong>لا يعوّض</strong> عن الاثنين أعلاه</td></tr>
</table>
<p>الخلط الشائع: أن TDS مرتفع يعني قساوة مرتفعة. ليس بالضرورة — TDS يجمع الأملاح والمعادن والمواد العضوية بلا تمييز، فقد يرتفع لأسباب لا علاقة لها بالكالسيوم أو الكربونات.</p>

<h2>KH هو الرقم الذي يمنع الكارثة</h2>
<p>الـ KH ليس مهماً لأنه يغيّر الـ pH، بل لأنه <strong>يمنع الـ pH من التحرك</strong>. فكّر به كمخزون يمتص الأحماض المتكوّنة بالحوض. ولما ينفد المخزون، الـ pH ما ينزل بهدوء — بل ينهار.</p>
<blockquote>وهنا التقاطع المهم: عملية الترشيح البايولوجي نفسها <strong>تستهلك القاعدية</strong>. يعني حوض قيد التدوير بـ KH واطئ ممكن ينهار الـ pH فيه في منتصف التدوير، فتتوقف البكتيريا وتظن أن الفلتر فشل بينما المشكلة أن المخزون نفد.</blockquote>
<p>المصادر المتخصصة تشير إلى أن KH تحت حوالي ٣ درجات يجعل انهيار الـ pH احتمالاً وارداً أثناء التدوير، وأن نشاط البكتيريا يضعف بشدة كلما نزل الـ pH ويقارب التوقف قرب ٦.٠. نضعها كإشارة تحذير لا كحد قاطع — فهي متداولة على نطاق واسع لكننا لم نتتبعها إلى دراسة أولية. آلية التدوير في <a href="/blog/nitrogen-cycle-simple-arabic-explained">الدورة البيولوجية</a>.</p>

<h2>GH: الملاءمة لا الجودة</h2>
<p>الـ GH ليس مقياس "نظافة" ولا "جودة". هو مقياس <strong>ملاءمة</strong>: أسماك المياه الطرية مثل التترا والديسكس تفضل GH واطئاً، وأسماك مثل الجوبي والمولي والسيكلد الإفريقي تفضله أعلى، والروبيان والحلزونات تحتاج كالسيوماً كافياً لبناء الهيكل والصدفة.</p>
<p>وهنا القاعدة العملية الأهم: <strong>الاستقرار أهم من الرقم المثالي</strong>. أغلب أسماك الزينة تتأقلم على مدى واسع إذا كان ثابتاً، وتتضرر من التذبذب حتى لو كان ضمن "المدى المثالي".</p>

<h2>ما نعرفه وما لا نعرفه عن ماء العراق</h2>
<p>لن نخبرك بقيم GH أو KH لماء الحنفية عندك، لأننا لا نملك مصدراً يثبتها — والقيم تختلف بين مدينة ومدينة وبين مصدر ومصدر. الجواب الوحيد الصادق: <strong>قِسها</strong>.</p>
<ul>
  <li>افحص ماء الحنفية نفسه، وافحص ماء الحوض. الفرق بينهما يخبرك بما يفعله حوضك بالماء.</li>
  <li>إذا كان KH بحوضك ينزل مع الوقت فهو يُستهلك، وتغيير الماء المنتظم هو ما يجدده.</li>
  <li>الـ pH وحده لا يكفي — pH ثابت مع KH واطئ هو استقرار هشّ. تفاصيل الـ pH في <a href="/blog/ph-level-iraqi-tap-water-fish">درجة الحموضة في ماء الحنفية</a>.</li>
</ul>

<h2>لا تطارد الأرقام</h2>
<p>أكثر ضرر يقع بهذا الموضوع يأتي من محاولة تعديل الأرقام بالمواد الكيميائية. منتجات "رفع" أو "خفض" الـ pH تعطي تغييراً سريعاً ثم يعود الماء لطبيعته، فتحصل على تذبذب — وهو أسوأ من الرقم غير المثالي الذي بدأت منه.</p>
<ul>
  <li><strong>اختر أسماكاً تناسب ماءك</strong> بدل تعديل الماء ليناسب أسماكاً اخترتها مسبقاً. هذي أنجح استراتيجية بالهواية كلها.</li>
  <li>إذا لزم التعديل فليكن <strong>بطيئاً ومستمراً</strong> عبر الركيزة أو الخشب أو مزج الماء، لا بجرعة صادمة.</li>
  <li>وراقب الأثر بالفحص المنتظم — <a href="/blog/aquarium-test-kit-guide">قراءة اختبارات الماء</a> و<a href="/blog/aquarium-water-change-guide">تغيير الماء</a>.</li>
</ul>', 'علوم الأحواض', 'Beaker',
        'AQUAVO Editorial Team', TRUE, now());

INSERT INTO blog_posts (title, slug, excerpt, content, category, icon_name, author, is_published, published_at)
VALUES ('ملح الحوض: دواء بجرعة ومدة، لا مكمّل يومي', 'aquarium-salt-guide', 'أسماك المياه العذبة لا تحتاج ملحاً روتينياً. الخطأ الذي يرفع التركيز بلا أن تشعر، ولماذا خلاف المصادر حول الأسماك عديمة الحراشف لا يمنع استنتاجاً عملياً.', '<h2>الملح دواء، مو مكمّل يومي</h2>
<p>ينتشر بين الهواة أن إضافة ملح لحوض المياه العذبة "تقوّي" الأسماك وتقي من الأمراض. هذا غير صحيح كقاعدة عامة: أسماك المياه العذبة <strong>لا تحتاج ملحاً بشكل روتيني</strong>، وبيئاتها الطبيعية عذبة أصلاً.</p>
<p>الملح أداة علاجية لحالات محددة ولمدة محدودة. والفرق بين "دواء" و"مكمّل" مو لفظياً — الدواء له جرعة ومدة وسبب، والمكمّل يُضاف بلا تفكير. التعامل معه كمكمّل هو مصدر أغلب الضرر.</p>

<h2>الخطأ الذي يقتل: الملح لا يتبخر</h2>
<blockquote>الماء يتبخر، والملح يبقى. فإذا عوّضت الماء المتبخر بماء عذب فالتركيز يبقى كما هو — لكن إذا "جدّدت" الملح مع كل تعويض، فأنت ترفع التركيز كل مرة بلا أن تشعر، حتى يصل لمستوى ضار.</blockquote>
<p>القاعدة: <strong>الملح يخرج من الحوض بتغيير الماء فقط</strong>. أضف ملحاً لكمية الماء الجديد المُستبدَل فحسب، لا لكامل الحوض من جديد. وبصيف العراق حيث التبخر عالٍ، هذا الخطأ يتراكم أسرع بكثير.</p>

<h2>نقطة خلافية نعرضها كما هي</h2>
<p>يتردد كثيراً أن الأسماك عديمة الحراشف — القرموط الصغير والكوريدوراس والبوتيا — لا تتحمل الملح إطلاقاً. الحقيقة أن المصادر <strong>مختلفة فعلاً</strong>:</p>
<table>
  <tr><th>الموقف</th><th>الحجة</th></tr>
  <tr><td>ضد الاستخدام</td><td>مختصون يعدّونه دواءً لا يُستخدم مع عديمة الحراشف، ويشيرون إلى اضطراب التوازن الأسموزي</td></tr>
  <tr><td>مع الاستخدام الحذر</td><td>مربّون ذوو خبرة طويلة يعدّون التعميم مبالغاً فيه، ودراسة على الكوريدوراس سجّلت نجاة المجموعة كاملة عند تركيز منخفض</td></tr>
</table>
<p>لن نحسم خلافاً غير محسوم. لكن الاستنتاج العملي لا يحتاج حسماً: <strong>مع الأنواع عديمة الحراشف تحديداً، الحذر هو الموقف المعقول</strong> — جرعة أقل، مدة أقصر، ومراقبة لصيقة، أو تجنّبه أصلاً إذا وُجد بديل.</p>

<h2>ما لا يفعله الملح</h2>
<ul>
  <li><strong>لا يعالج كل شي.</strong> يُستخدم لحالات معينة، ولا يصلح كعلاج شامل لأي عرض.</li>
  <li><strong>ليس علاجنا المعتمد للنقط البيضاء.</strong> البروتوكول الذي نقف خلفه — رفع الحرارة تدريجياً مع دواء مخصص وتهوية قوية — في <a href="/blog/common-fish-diseases-white-spot">النقط البيضاء</a>. لا ننشر جرعة ملح علاجية لأن الجرعات تختلف بين المصادر والأنواع.</li>
  <li><strong>لا يصلح للأحواض المزروعة.</strong> النباتات عموماً حساسة للملح بالتراكيز العلاجية.</li>
  <li><strong>لا يعوّض عن جودة الماء.</strong> إذا كانت الأمونيا مرتفعة فالمشكلة ماء لا مرض — <a href="/blog/aquarium-test-kit-guide">اقرأ الفحص</a> أولاً.</li>
</ul>

<h2>إذا قررت استخدامه</h2>
<ol>
  <li><strong>لسبب محدد ومدة محدودة</strong>، لا بشكل دائم.</li>
  <li><strong>بحوض منفصل إن أمكن</strong> — تعالج سمكة واحدة بدل تعريض الحوض كله. حوض الحجر مناسب لهذا تماماً: <a href="/blog/quarantine-new-fish-guide">الحجر الصحي</a>.</li>
  <li><strong>ذوّبه بالماء قبل الإضافة</strong>، ولا تسكبه مباشرة على الأسماك أو الركيزة.</li>
  <li><strong>أضفه تدريجياً</strong> لا دفعة واحدة.</li>
  <li><strong>تخلّص منه بتغييرات ماء</strong> بعد انتهاء المدة، لا بالانتظار.</li>
</ol>
<p>ملاحظة: AQUAVO لا يبيع ملح أحواض، فهذا المقال تعليمي بحت ولا يوجّهك لشراء شي.</p>', 'مشاكل وحلول', 'AlertTriangle',
        'AQUAVO Editorial Team', TRUE, now());

-- Post-flight.
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM blog_posts WHERE is_published;
  IF n <> 79 THEN RAISE EXCEPTION 'expected 79 published posts, found %', n; END IF;

  SELECT count(*) INTO n FROM blog_posts
   WHERE slug IN ('acclimating-new-fish', 'aquarium-test-kit-guide', 'gh-kh-water-hardness-guide', 'aquarium-salt-guide')
     AND is_published AND length(content) > 2500
     AND content LIKE '%<table%' AND content LIKE '%href="/blog/%'
     AND author = 'AQUAVO Editorial Team';
  IF n <> 4 THEN RAISE EXCEPTION 'only % of 4 new articles are complete', n; END IF;

  -- No published article may link to an unpublished one, corpus-wide.
  SELECT count(*) INTO n
    FROM blog_posts b
    CROSS JOIN LATERAL regexp_matches(b.content, 'href="/blog/([^"#?]+)"', 'g') AS m(parts)
   WHERE b.is_published
     AND NOT EXISTS (SELECT 1 FROM blog_posts t WHERE t.slug = m.parts[1] AND t.is_published);
  IF n <> 0 THEN RAISE EXCEPTION '% internal links point at unpublished articles', n; END IF;

  SELECT count(*) INTO n FROM blog_posts
   WHERE slug IN ('acclimating-new-fish', 'aquarium-test-kit-guide', 'gh-kh-water-hardness-guide', 'aquarium-salt-guide')
     AND content ~ '[一-鿿぀-ヿ가-힯Ѐ-ӿऀ-ॿ฀-๿֐-׿Ā-ɏḀ-ỿ]';
  IF n <> 0 THEN RAISE EXCEPTION 'a new article carries stray script'; END IF;
END $$;

COMMIT;

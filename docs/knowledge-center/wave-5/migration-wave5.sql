-- Migration ID: kc-wave5-articles-20260902
-- Target:       Neon production, blog_posts (4 inserts)
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
  IF n <> 84 THEN RAISE EXCEPTION 'expected 84 published posts, found %', n; END IF;

  SELECT count(*) INTO n FROM blog_posts WHERE slug IN ('aquarium-fish-feeding-guide', 'fish-fungus-vs-columnaris', 'aquarium-airborne-toxins', 'why-fish-jump-out-aquarium');
  IF n <> 0 THEN RAISE EXCEPTION 'one of the new slugs already exists'; END IF;
END $$;

CREATE TABLE blog_posts_backup_wave5_20260902 AS
SELECT id, slug, title, excerpt, content, is_published, now() AS backed_up_at
  FROM blog_posts;

INSERT INTO blog_posts (title, slug, excerpt, content, category, icon_name, author, is_published, published_at)
VALUES ('تغذية أسماك الزينة: كم مرة، كم كمية، وأي نوع', 'aquarium-fish-feeding-guide', 'الإفراط بالعلف هو السبب الجذري لأغلب مشاكل الحوض. قاعدة الدقيقتين، جدول حسب الحالة، والفرق العملي بين الحبيبات والرقائق والمجفف بالتجميد.', '<h2>الإفراط بالعلف هو السبب الجذري لأغلب مشاكل الحوض</h2>
<p>لو رجعت لأكثر مقالات المشاكل بهذا الموقع — الماء المعكّر، الطحالب، ارتفاع الأمونيا، تعكر ما بعد السفر — راح تلكي سبباً مشتركاً يتكرر: <strong>طعام أكثر مما يُؤكل</strong>.</p>
<p>الطعام اللي ما ينأكل يتحلل، يرفع الأمونيا، يغذي البكتيريا العائمة والطحالب، ويستهلك أوكسجيناً. فتقليل العلف ليس بخلاً — هو أرخص إجراء وقائي بالهواية كلها.</p>

<h2>كم مرة، وكم كمية</h2>
<table>
  <tr><th>الحالة</th><th>عدد المرات</th><th>الكمية</th></tr>
  <tr><td>أسماك بالغة سليمة</td><td>مرة يومياً تكفي تماماً</td><td>ما ينتهي خلال دقيقتين</td></tr>
  <tr><td>صغار وأسماك نامية</td><td>مرتان أو ثلاث</td><td>كميات صغيرة جداً كل مرة</td></tr>
  <tr><td>حوض جديد قيد التدوير</td><td>أقل من المعتاد</td><td>الحد الأدنى — البكتيريا لم تكتمل بعد</td></tr>
  <tr><td>موجة حر</td><td>قلّل أو أوقف مؤقتاً</td><td>الأيض مرتفع والأوكسجين أقل</td></tr>
  <tr><td>بعد نقل سمكة جديدة</td><td>لا شيء أول ٢٤ ساعة</td><td>—</td></tr>
</table>
<blockquote>قاعدة الدقيقتين هي المقياس العملي الوحيد الذي يصمد: أعطِ كمية تختفي خلال دقيقتين. إذا بقي طعام على القاع بعدها فقد أعطيت أكثر من اللازم — والفائض لن يُؤكل لاحقاً، بل سيتحلل.</blockquote>
<p>ويوم صيام أسبوعي ممارسة شائعة ومفيدة، خصوصاً للأنواع المستديرة الجسم المعرّضة لمشاكل الهضم والطفو.</p>

<h2>أنواع الطعام: لكل واحد دور</h2>
<table>
  <tr><th>النوع</th><th>مميزاته</th><th>انتبه</th></tr>
  <tr><td>حبيبات (Pellets)</td><td>غذاء يومي متكامل، تغرق فتصل للأسماك الوسطى والقاعية</td><td>اختر حجماً يناسب الفم</td></tr>
  <tr><td>رقائق (Flakes)</td><td>تطفو، مناسبة لأسماك السطح</td><td>تتفتت وتلوّث إذا زادت</td></tr>
  <tr><td>مجفف بالتجميد (أرتيميا)</td><td>بروتين عالٍ، محفّز ممتاز للشهية والتلوين</td><td>انقعه ثواني قبل التقديم</td></tr>
  <tr><td>خضار مسلوقة</td><td>ألياف للأنواع النباتية والقاعية</td><td>ارفع البقايا خلال ساعات</td></tr>
  <tr><td>طعام قاعي غاطس</td><td>يصل للكوريدوراس والقاعيات فعلاً</td><td>الأسماك العلوية تخطفه قبل النزول أحياناً</td></tr>
</table>
<p>القاعدة: <strong>أساس يومي من حبيبات أو رقائق جيدة، مع تنويع محدود</strong>. التنويع مفيد لكنه ليس بديلاً عن غذاء أساسي متوازن. تتوفر في AQUAVO حبيبات وأطعمة مخصصة للبيتا والجولدفش والروبيان وصغار الأسماك، وأرتيميا مجففة بالتجميد، ضمن قسم طعام الأسماك.</p>

<h2>اقرأ العبوة، لا الإعلان</h2>
<p>أهم مؤشر على جودة العلف هو <strong>ترتيب المكونات</strong>: علف يبدأ بمسحوق سمك أو روبيان أفضل من علف يبدأ بالقمح أو فتات الحبوب. وتاريخ الصلاحية مهم فعلاً — الفيتامينات تتدهور، وبحر العراق تخزين العلبة بمكان حار يسرّع ذلك. خزّنها ببارد وجاف ومغلقة.</p>

<h2>علامات أنك تفرط</h2>
<ul>
  <li>طعام على القاع بعد أكثر من دقيقتين.</li>
  <li>ماء يتعكر بعد يوم من التنظيف — <a href="/blog/cloudy-water-fix">تشخيص تعكر الماء</a>.</li>
  <li>طحالب تعود بعناد رغم ضبط الإضاءة — <a href="/blog/algae-war-guide">دليل الطحالب</a>.</li>
  <li>نترات تتسلق أسبوعاً بعد أسبوع — <a href="/blog/aquarium-water-change-guide">تغيير الماء</a>.</li>
  <li>أي قراءة أمونيا فوق الصفر — <a href="/blog/aquarium-test-kit-guide">قراءة الفحص</a>.</li>
</ul>
<p>وإذا كان عدد الأسماك نفسه فوق طاقة الحوض فتقليل العلف يخفف ولا يحل — <a href="/blog/how-many-fish-in-aquarium">كم سمكة يتحمل حوضك</a>. وعند السفر لا تحمّل أحداً مسؤولية التقدير: <a href="/blog/aquarium-care-while-traveling">السفر وترك الحوض</a>.</p>', 'للمبتدئين', 'Utensils',
        'AQUAVO Editorial Team', TRUE, now());

INSERT INTO blog_posts (title, slug, excerpt, content, category, icon_name, author, is_published, published_at)
VALUES ('الزغب الأبيض: فطر حقيقي أم كولومناريس بكتيري؟', 'fish-fungus-vs-columnaris', 'أغلب ما يسمّيه الهواة فطراً بكتيريا لا تستجيب لأي مضاد فطري. كيف تفرّق بالنظر، وليش رفع الحرارة هنا قد يسرّع المرض بدل ما يعالجه.', '<h2>أغلب ما يسمّيه الهواة "فطر" ليس فطراً</h2>
<p>الزغب الأبيض على السمكة له سببان مختلفان تماماً، ويُخلط بينهما باستمرار — والخلط مكلف، لأن علاج أحدهما لا يعمل على الآخر إطلاقاً.</p>
<ul>
  <li><strong>الفطر الحقيقي</strong> (من مجموعة العفن المائي) ينمو على <strong>جرح أو نسيج ميت</strong>.</li>
  <li><strong>الكولومناريس</strong> بكتيريا، ويُسمّى شعبياً "مرض الصوف القطني" رغم أنه ليس فطراً — <strong>ولا يستجيب لأي مضاد فطري</strong>.</li>
</ul>
<blockquote>وهنا الخطورة: الكولومناريس سريع، وبينما تُجرَّب مضادات الفطريات بلا فائدة تكون البكتيريا قد تقدمت. الوقت الضائع بالتشخيص الخطأ هو ما يقتل، لا صعوبة العلاج.</blockquote>

<h2>كيف تفرّق بينهما بالنظر</h2>
<table>
  <tr><th></th><th>فطر حقيقي</th><th>كولومناريس (بكتيري)</th></tr>
  <tr><td>الشكل</td><td>كتلة قطنية <strong>ثلاثية الأبعاد</strong> بارزة عن الجسم</td><td>بقعة <strong>مسطّحة</strong> ملتصقة بالسطح</td></tr>
  <tr><td>المكان</td><td>على جرح أو نسيج متضرر</td><td>غالباً بلا جرح سابق — الفم، الظهر، الخياشيم</td></tr>
  <tr><td>السرعة</td><td>أبطأ</td><td>سريع، وقد يقتل خلال أيام</td></tr>
  <tr><td>العلاج</td><td>مضاد فطري</td><td>مضاد بكتيري — المضاد الفطري بلا أثر</td></tr>
</table>
<p>العلامة العملية الأسهل: <strong>بارز وكثيف كالقطن = فطر. مسطّح وملتصق وبلا جرح = بكتيري.</strong> وإذا رأيت بقعة على الظهر تشبه "سرج" أو تآكلاً عند الفم، فكّر بالبكتيري أولاً.</p>

<h2>كلاهما يعني أن شيئاً آخر حدث أولاً</h2>
<p>هذي أهم نقطة على المدى الطويل: الفطر الحقيقي لا يهاجم سمكة سليمة الجلد، والكولومناريس يستغل الإجهاد. فظهور أيّهما إشارة إلى سبب سابق:</p>
<ul>
  <li><strong>جرح</strong> من ديكور حاد أو عراك أو شبكة صيد.</li>
  <li><strong>ماء متدهور</strong> — أمونيا أو نتريت فوق الصفر. <a href="/blog/aquarium-test-kit-guide">قراءة الفحص</a>.</li>
  <li><strong>تذبذب حرارة</strong> أو حرارة مرتفعة مستمرة. <a href="/blog/protect-fish-iraqi-summer-50-degrees">حرارة الصيف</a>.</li>
  <li><strong>اكتظاظ ومطاردة</strong> — إجهاد مزمن. <a href="/blog/how-many-fish-in-aquarium">كم سمكة يتحمل حوضك</a>.</li>
</ul>
<p>ولهذا علاج العدوى وحدها يعطي تحسناً مؤقتاً ثم تعود: السبب باقٍ. نفس المنطق في <a href="/blog/fin-rot-treatment-guide">تعفن الزعانف</a>.</p>

<h2>ماذا تفعل عملياً</h2>
<ol>
  <li><strong>افحص الماء أولاً</strong>، قبل أي دواء. <a href="/blog/fish-disease-symptoms-diagnosis">دليل تشخيص الأعراض</a>.</li>
  <li><strong>افصل المصاب</strong> بحوض علاج إن أمكن — أفضل للسمكة وأأمن لبقية الحوض وللافقاريات. <a href="/blog/quarantine-new-fish-guide">الحجر الصحي</a>.</li>
  <li><strong>حدد النوع بالشكل</strong> قبل اختيار الدواء، وفق الجدول أعلاه.</li>
  <li><strong>اتبع جرعة العبوة</strong> ولا تجتهد. تتوفر في AQUAVO أزرق الميثيلين ومسحوق معالجة للحالات البكتيرية ضمن قسم معالجة المياه.</li>
  <li><strong>لا ترفع الحرارة تلقائياً.</strong> رفع الحرارة يساعد في النقط البيضاء، لكنه قد <strong>يسرّع</strong> الكولومناريس. لا تنقل بروتوكولاً من مرض إلى آخر. <a href="/blog/common-fish-diseases-white-spot">النقط البيضاء</a>.</li>
</ol>

<h2>حدود ما نستطيع قوله</h2>
<p>التمييز النهائي بين هذه الحالات يحتاج فحصاً مجهرياً، وما راح ندّعي إن الشكل الظاهري يكفي دائماً. الجدول أعلاه يرجّح ولا يجزم — لكن الترجيح الصحيح أفضل بكثير من افتراض "فطر" تلقائياً لكل زغب أبيض، وهو الافتراض الذي يضيّع الوقت في الحالة الأخطر.</p>
<p>ولا تستخدم أدوية بشرية بأي حال: <a href="/blog/human-medicine-dangers-for-fish">خطر الأدوية البشرية على الأسماك</a>.</p>', 'مشاكل وحلول', 'AlertTriangle',
        'AQUAVO Editorial Team', TRUE, now());

INSERT INTO blog_posts (title, slug, excerpt, content, category, icon_name, author, is_published, published_at)
VALUES ('سموم الهواء: كيف يقتل بخّاخ الحشرات حوضك في ساعات', 'aquarium-airborne-toxins', 'مضخة الهواء تسحب هواء الغرفة وتضخّه في الماء مباشرة. هذا يفسّر موتاً جماعياً مفاجئاً مع فحص ماء سليم تماماً — والوقاية أبسط مما تظن.', '<h2>حوضك يتنفس هواء الغرفة</h2>
<p>ينشغل الهواة بجودة الماء وينسون إن الحوض مفتوح على الغرفة من جهتين: <strong>سطح الماء</strong>، و<strong>مضخة الهواء</strong>. والمضخة تحديداً تسحب هواء الغرفة وتضخّه داخل الماء مباشرة — أي أن أي شيء متطاير بالغرفة يدخل الحوض بأسرع طريق ممكن.</p>
<blockquote>هذا يفسّر حالات "الحوض كان ممتاز وفجأة ماتت كل الأسماك" بلا أي تغيّر بالفحص. الماء كان سليماً فعلاً — المشكلة دخلت من الهواء.</blockquote>

<h2>أكثر المصادر شيوعاً في البيت العراقي</h2>
<table>
  <tr><th>المصدر</th><th>الخطورة</th><th>الإجراء</th></tr>
  <tr><td>مبيد حشري بخّاخ</td><td><strong>الأعلى</strong> — مصمم أصلاً لقتل لافقاريات</td><td>أطفئ المضخة وغطِّ الحوض واخرج بالرش لغرفة أخرى</td></tr>
  <tr><td>بخور ومعطرات جو ورذاذ</td><td>متوسطة إلى عالية بالتكرار</td><td>تهوية جيدة، وابتعاد عن غرفة الحوض</td></tr>
  <tr><td>دخان السجائر</td><td>تراكمية</td><td>لا تدخّن في غرفة الحوض</td></tr>
  <tr><td>أصباغ ومذيبات وتنر</td><td>عالية أثناء الطلاء والتجفيف</td><td>انقل الحوض أو أغلق الغرفة تماماً</td></tr>
  <tr><td>منظفات ومبيّضات ذات أبخرة</td><td>متوسطة</td><td>لا تنظف زجاج الحوض بأي منظف</td></tr>
  <tr><td>كريم يد ومطهّر كحولي</td><td>مباشرة عبر اليد</td><td>اغسل يديك بماء فقط قبل إدخالها</td></tr>
</table>

<h2>الحالة الأخطر: رش المبيدات</h2>
<p>المبيد الحشري مصمّم لقتل المفصليات، والروبيان والحلزون مفصليات ورخويات مائية — أي أنهما هدف مثالي له. لكن الأسماك تتأثر أيضاً، وسريعاً.</p>
<p>إذا كان لا بد من الرش:</p>
<ol>
  <li><strong>أطفئ مضخة الهواء</strong> قبل الرش بوقت كافٍ — هذي الخطوة الأهم، لأنها تمنع الضخ المباشر.</li>
  <li><strong>غطِّ الحوض</strong> بغطاء أو بلاستيك يقلل التماس السطحي.</li>
  <li><strong>أطفئ الفلتر ذا المخرج المكشوف</strong> إن كان يحرّك السطح بقوة، لفترة قصيرة فقط.</li>
  <li><strong>هوِّ الغرفة جيداً</strong> بعد الرش قبل إعادة التشغيل.</li>
  <li><strong>لا تطل الإطفاء.</strong> ساعة أو ساعتان مقبولة؛ ساعات طويلة تخلق مشكلة أوكسجين أكبر من المشكلة الأصلية — <a href="/blog/air-pumps-decoration-or-necessity">الأوكسجين الذائب والتهوية</a>.</li>
</ol>
<p>واللافقاريات هي الأكثر حساسية دائماً، وهي أول من يتأثر: <a href="/blog/aquarium-shrimp-snails-guide">الروبيان والحلزون</a>.</p>

<h2>اليدان: المصدر الذي يُنسى</h2>
<p>الصابون وكريم اليد والمطهّر الكحولي تدخل مع يدك مباشرة إلى الماء. القاعدة: <strong>اغسل يديك بماء فقط</strong> قبل إدخالها، أو استخدم أدوات بدل اليد. وبعد استخدام المطهّر الكحولي انتظر حتى يجف تماماً.</p>

<h2>كيف تعرف إن السبب من الهواء</h2>
<p>العلامة المميزة: <strong>أعراض مفاجئة وجماعية مع فحص ماء سليم</strong>. إذا كانت الأمونيا والنتريت صفراً والحرارة مستقرة ومع ذلك الأسماك تلهث أو تموت خلال ساعات، فكّر بما حدث في <em>الغرفة</em> خلال اليوم الماضي، لا بما حدث في الماء.</p>
<ul>
  <li>افحص أولاً لتستبعد الماء — <a href="/blog/aquarium-test-kit-guide">قراءة الفحص</a>.</li>
  <li>راجع بقية الاحتمالات — <a href="/blog/fish-disease-symptoms-diagnosis">دليل تشخيص الأعراض</a>.</li>
  <li>الإجراء الإسعافي واحد: <strong>تغيير ماء كبير نسبياً بماء معالَج بنفس الحرارة، وكربون نشط بالفلتر</strong> لامتصاص ما يمكن امتصاصه، مع تهوية قوية.</li>
</ul>

<h2>الوقاية</h2>
<ul>
  <li>لا ترش أي شيء في غرفة الحوض، ولو "بعيداً عنه".</li>
  <li>ضع مضخة الهواء بمكان هواؤه نظيف، ولا تضعها قرب مصدر أبخرة.</li>
  <li>غطِّ الحوض جزئياً — يقلل التماس ويقلل التبخر أيضاً.</li>
  <li>نبّه من يشاركك البيت: هذي مخاطرة لا يعرفها أحد إلا إذا قيلت له صراحة.</li>
</ul>', 'مشاكل وحلول', 'Wind',
        'AQUAVO Editorial Team', TRUE, now());

INSERT INTO blog_posts (title, slug, excerpt, content, category, icon_name, author, is_published, published_at)
VALUES ('ليش تقفز الأسماك خارج الحوض؟ والغطاء الصحيح', 'why-fish-jump-out-aquarium', 'القفز عرَض قبل أن يكون عادة: ماء متدهور أو نقص أوكسجين أو مطاردة. ولماذا الغطاء المحكم تماماً خطر على الأنواع التي تتنفس هواء الجو.', '<h2>سمكة تقفز ليست سمكة "مجنونة"</h2>
<p>القفز سلوك طبيعي وقديم: بالطبيعة تقفز الأسماك لتفلت من مفترس، أو لتعبر بين مسطحات مائية، أو لتصطاد حشرة. فوجود السلوك ليس شذوذاً — لكن <strong>تكراره داخل الحوض إشارة</strong>، وغالباً إشارة إلى شيء تستطيع إصلاحه.</p>
<blockquote>وأغلب حالات القفز تُكتشف متأخرة: السمكة تُوجد على الأرض صباحاً. لهذا الغطاء ليس اختياراً تجميلياً — هو الفرق بين حادثة ونجاة.</blockquote>

<h2>ليش تقفز داخل الحوض</h2>
<table>
  <tr><th>السبب</th><th>العلامة المصاحبة</th><th>الحل</th></tr>
  <tr><td>ماء متدهور</td><td>لهاث، خمول، أو حك بالأسطح</td><td>افحص فوراً — أمونيا ونتريت</td></tr>
  <tr><td>نقص أوكسجين</td><td>تجمّع عند السطح قبل القفز</td><td>زد التهوية وحركة السطح</td></tr>
  <tr><td>مطاردة وعدوانية</td><td>زعانف ممزقة، اختباء</td><td>راجع التوافق والعدد</td></tr>
  <tr><td>حرارة مرتفعة</td><td>نشاط مفرط ثم خمول</td><td>برّد تدريجياً</td></tr>
  <tr><td>سمكة جديدة غير مستقرة</td><td>خلال أول أيام فقط</td><td>إضاءة خافتة وهدوء</td></tr>
  <tr><td>طبيعة النوع</td><td>بلا أي عرض آخر</td><td>غطاء — لا حل غيره</td></tr>
</table>
<p>يعني القفز عرَض قبل أن يكون عادة. إذا تكرر، ابدأ من الماء لا من الغطاء — <a href="/blog/aquarium-test-kit-guide">قراءة اختبارات الماء</a> ثم <a href="/blog/fish-disease-symptoms-diagnosis">دليل تشخيص الأعراض</a>.</p>

<h2>أنواع تقفز أكثر من غيرها</h2>
<ul>
  <li><strong>الأسماك السطحية</strong> التي تتغذى من السطح — أفواهها موجهة للأعلى وطبيعتها تتضمن الوثب.</li>
  <li><strong>الأنواع الطويلة النحيلة</strong> السريعة، التي تسبح قرب السطح.</li>
  <li><strong>الفايتر</strong> — يتنفس هواء الجو ويصعد للسطح باستمرار، فاحتمال خروجه أعلى. <a href="/blog/fish-that-live-without-filter">حوض بلا فلتر</a> يشرح تنفسه الهوائي.</li>
  <li><strong>أي سمكة جديدة</strong> خلال أيامها الأولى — <a href="/blog/acclimating-new-fish">أقلمة السمكة الجديدة</a>.</li>
</ul>

<h2>الغطاء: ما يجب أن ينتبه له</h2>
<ol>
  <li><strong>غطِّ الفجوات، لا السطح فقط.</strong> أغلب الحوادث تحصل من فتحة الخراطيم أو الفلتر أو زاوية مرفوعة، لا من منتصف الغطاء.</li>
  <li><strong>لا تغلق بإحكام تام.</strong> الحوض يحتاج تبادل غازات، وبعض الأنواع — مثل الغورامي — <strong>يجب</strong> أن تصل للسطح لتتنفس هواءً. إغلاق محكم عليها خطر حقيقي.</li>
  <li><strong>اترك مسافة بين الماء والغطاء.</strong> مستوى ماء ملامس للحافة يسهّل الخروج ويقلل التهوية.</li>
  <li><strong>انتبه للحرارة.</strong> الغطاء المحكم يحبس الحرارة، وهذا يهم بصيف العراق — <a href="/blog/protect-fish-iraqi-summer-50-degrees">حرارة الصيف</a>.</li>
</ol>
<p>والموازنة بين التغطية والتهوية هي جوهر الموضوع: غطاء يمنع الخروج ويسمح بالتبادل، لا صندوق مغلق. تفاصيل التبادل في <a href="/blog/air-pumps-decoration-or-necessity">الأوكسجين الذائب والتهوية</a>.</p>

<h2>إذا وجدت سمكة خارج الحوض</h2>
<p>لا تفترض الموت فوراً إذا كانت رطبة وحديثة السقوط. أعدها للماء برفق، وراقبها بمكان هادئ بإضاءة خافتة وتهوية جيدة. فرص النجاة تعتمد على المدة وجفاف الخياشيم، وقد تنجو إذا كان الوقت قصيراً — وقد لا تنجو رغم كل شيء، وهذا وارد.</p>
<p>ثم ابحث عن السبب: سمكة قفزت مرة قد تقفز مرة ثانية، والغطاء يعالج النتيجة بينما الفحص يعالج السبب.</p>', 'مشاكل وحلول', 'ArrowUp',
        'AQUAVO Editorial Team', TRUE, now());

-- Post-flight.
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM blog_posts WHERE is_published;
  IF n <> 88 THEN RAISE EXCEPTION 'expected 88 published posts, found %', n; END IF;

  SELECT count(*) INTO n FROM blog_posts
   WHERE slug IN ('aquarium-fish-feeding-guide', 'fish-fungus-vs-columnaris', 'aquarium-airborne-toxins', 'why-fish-jump-out-aquarium')
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
   WHERE slug IN ('aquarium-fish-feeding-guide', 'fish-fungus-vs-columnaris', 'aquarium-airborne-toxins', 'why-fish-jump-out-aquarium')
     AND content ~ '[一-鿿぀-ヿ가-힯Ѐ-ӿऀ-ॿ฀-๿֐-׿Ā-ɏḀ-ỿ]';
  IF n <> 0 THEN RAISE EXCEPTION 'a new article carries stray script'; END IF;
END $$;

COMMIT;

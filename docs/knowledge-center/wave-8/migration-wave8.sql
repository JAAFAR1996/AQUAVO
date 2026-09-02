-- Migration ID: kc-wave8-articles-20260903
-- Target:       Neon production, blog_posts (6 inserts)
-- Rollback:     rollback-wave8.sql
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
  IF n <> 94 THEN RAISE EXCEPTION 'expected 94 published posts, found %', n; END IF;

  SELECT count(*) INTO n FROM blog_posts WHERE slug IN ('fish-bloating-swim-bladder-dropsy', 'aquarium-fish-aggression', 'aquarium-snail-population-control', 'nitrite-spike-aquarium', 'transporting-fish-and-aquarium', 'aquarium-plant-trimming-propagation');
  IF n <> 0 THEN RAISE EXCEPTION 'one of the new slugs already exists'; END IF;
END $$;

CREATE TABLE blog_posts_backup_wave8_20260903 AS
SELECT id, slug, title, excerpt, content, is_published, now() AS backed_up_at
  FROM blog_posts;

INSERT INTO blog_posts (title, slug, excerpt, content, category, icon_name, author, is_published, published_at)
VALUES ('سمكة منتفخة أو تطفو: استسقاء أم كيس سباحة؟', 'fish-bloating-swim-bladder-dropsy', 'فارق بصري واحد يفصل بين مشكلة هضم بسيطة وحالة غالباً قاتلة: انظر للسمكة من الأعلى. حراشف بارزة كثمرة الصنوبر تعني شيئاً مختلفاً تماماً.', '<h2>سمكة منتفخة أو تطفو: حالتان مختلفتان تماماً</h2>
<p>هاتان الحالتان تُخلطان دائماً، والفرق بينهما هو الفرق بين مشكلة هضم بسيطة وحالة غالباً قاتلة. ويوجد فارق بصري واحد يفصلهما بوضوح:</p>
<table>
  <tr><th></th><th>الاستسقاء (Dropsy)</th><th>اضطراب كيس السباحة</th></tr>
  <tr><td>شكل الجسم</td><td><strong>الحراشف بارزة كثمرة الصنوبر</strong> عند النظر من الأعلى</td><td>الجسم <strong>أملس</strong> ومحيطه طبيعي</td></tr>
  <tr><td>العرض</td><td>انتفاخ بالبطن وتورم عام</td><td>مشكلة اتزان: تطفو أو تغرق أو تميل</td></tr>
  <tr><td>الطبيعة</td><td>عرَض لعدوى داخلية جهازية غالباً</td><td>غالباً هضمي أو متعلق بجودة الماء</td></tr>
  <tr><td>المآل</td><td><strong>سيئ</strong> — خصوصاً بعد بروز الحراشف</td><td>جيد إذا عولج مبكراً</td></tr>
</table>
<blockquote>الفحص العملي: انظر للسمكة <strong>من الأعلى</strong>، لا من الجانب. بروز الحراشف يظهر من هذه الزاوية فقط. حراشف بارزة = استسقاء. جسم أملس مع مشكلة طفو = كيس سباحة.</blockquote>

<h2>مشكلة الطفو: ابدأ بالصيام</h2>
<p>أشيع أسبابها الإمساك وابتلاع الهواء مع الطعام الطافي، وهي شائعة بشكل خاص عند الأنواع مستديرة الجسم مثل الجولدفش المزخرف والبيتا.</p>
<ol>
  <li><strong>صيام يومين إلى ثلاثة.</strong> السمكة البالغة السليمة تتحمله بسهولة، وكثيراً ما يحل المشكلة وحده.</li>
  <li><strong>انقع الحبيبات</strong> قبل التقديم، أو انتقل لعلف غاطس — يقلل الهواء المبتلع عند السطح.</li>
  <li><strong>افحص الماء.</strong> جودة الماء الرديئة سبب مُهمَل لمشاكل الطفو. <a href="/blog/aquarium-test-kit-guide">قراءة الفحص</a>.</li>
  <li><strong>راجع كمية العلف</strong> عموماً — <a href="/blog/aquarium-fish-feeding-guide">دليل التغذية</a>.</li>
</ol>
<p>وإذا استمرت المشكلة أسابيع بلا تحسّن، فقد تكون إصابة أو تشوهاً دائماً، وبعض الأسماك تتعايش معها بحوض هادئ قليل التيار.</p>

<h2>الاستسقاء: كن صريحاً مع نفسك</h2>
<p>الاستسقاء ليس مرضاً بحد ذاته بل <strong>عرَض</strong>: تجمّع سوائل في الأنسجة يرافق غالباً عدوى بكتيرية داخلية أو فشل عضوي. ولهذا لا يوجد "دواء استسقاء" يعالج السبب دائماً.</p>
<ul>
  <li><strong>المآل سيئ</strong> بعد ظهور بروز الحراشف بوضوح، حتى مع العلاج. نقول هذا صراحة لأن الوعد بالشفاء هنا غير صادق.</li>
  <li><strong>اعزل السمكة فوراً</strong> — للراحة، ولحماية البقية إن كان السبب معدياً. <a href="/blog/quarantine-new-fish-guide">الحجر الصحي</a>.</li>
  <li><strong>حسّن الماء</strong>: هذا أكثر ما تستطيع فعله فعلياً.</li>
  <li><strong>لا تعالج بالتخمين.</strong> ولا تستخدم أدوية بشرية إطلاقاً — <a href="/blog/human-medicine-dangers-for-fish">خطر الأدوية البشرية</a>.</li>
</ul>
<blockquote>ولن ننشر جرعة مضاد حيوي: توفر المضادات وتنظيمها يختلفان، والعلاج الجهازي بلا تشخيص دقيق يضر أكثر مما ينفع. إذا توفر لديك طبيب بيطري مختص بالأسماك فهو الجهة الصحيحة.</blockquote>

<h2>ما الذي يسبق الحالتين عادةً</h2>
<p>كلتاهما تظهران غالباً بعد فترة من الضغط على السمكة، لا فجأة من فراغ:</p>
<ul>
  <li><strong>ماء متدهور</strong> لفترة طويلة — <a href="/blog/ammonia-spike-emergency-treatment">ارتفاع الأمونيا</a>.</li>
  <li><strong>إفراط مزمن بالعلف</strong>.</li>
  <li><strong>اكتظاظ</strong> وإجهاد مستمر — <a href="/blog/how-many-fish-in-aquarium">كم سمكة يتحمل حوضك</a>.</li>
  <li><strong>تذبذب حرارة</strong> — <a href="/blog/protect-fish-iraqi-summer-50-degrees">حرارة الصيف</a>.</li>
</ul>
<p>ولتمييز هذه الأعراض عن غيرها راجع <a href="/blog/fish-disease-symptoms-diagnosis">دليل تشخيص الأعراض</a>.</p>', 'مشاكل وحلول', 'AlertTriangle',
        'AQUAVO Editorial Team', TRUE, now());

INSERT INTO blog_posts (title, slug, excerpt, content, category, icon_name, author, is_published, published_at)
VALUES ('العدوانية والمطاردة في الحوض: أسبابها وحلولها', 'aquarium-fish-aggression', 'المطاردة سلوك وظيفي لا شخصي. ومفارقة مفيدة: الأسماك السربية تصير أعدائية بأعداد قليلة لا كثيرة — وكسر خطوط الرؤية أفعل من زيادة اللترات.', '<h2>المطاردة ليست شخصية</h2>
<p>السمكة لا "تكره" جارتها. العدوانية بالحوض سلوك وظيفي له أسباب محددة، وأغلبها قابل للإصلاح بتغيير الظروف لا بإخراج السمكة "الشريرة".</p>
<table>
  <tr><th>النمط</th><th>السبب الأرجح</th><th>الحل</th></tr>
  <tr><td>مطاردة مستمرة لفرد واحد</td><td>إقليمية، أو نسبة جنسين غير متوازنة</td><td>اكسر خطوط الرؤية، وعدّل النسبة</td></tr>
  <tr><td>مطاردة بين ذكور نفس النوع</td><td>تنافس إقليمي</td><td>ذكر واحد، أو مساحة ومخابئ أكثر</td></tr>
  <tr><td>نقر الزعانف الطويلة</td><td>سلوك نوع معيّن</td><td>فصل الأنواع — لا يُصلَح بالمساحة</td></tr>
  <tr><td>عدوانية مفاجئة بحوض هادئ</td><td>تكاثر، أو ماء متدهور، أو ازدحام</td><td>افحص الماء أولاً</td></tr>
  <tr><td>مطاردة داخل سرب صغير</td><td>عدد أقل من الحد الأدنى</td><td>زد أفراد السرب</td></tr>
</table>
<blockquote>مفارقة مفيدة: <strong>الأسماك السربية تصير أكثر عدوانية بأعداد قليلة، لا أكثر</strong>. السرب يوزّع التفاعلات؛ ثلاثة أفراد يعني أن واحداً يستقبل كل الضغط. زيادة العدد غالباً تهدّئ الحوض. <a href="/blog/schooling-fish-minimum-numbers">الأسماك السربية</a>.</blockquote>

<h2>ثلاث أدوات تقلل العدوانية</h2>
<ol>
  <li><strong>كسر خطوط الرؤية.</strong> الأهم بينها: نبات وخشب وصخر يقطع الرؤية المباشرة عبر الحوض. سمكتان لا تريان بعضهما باستمرار تتشاجران أقل — وهذا أفعل من مجرد زيادة اللترات.</li>
  <li><strong>مخابئ متعددة ومخارج.</strong> المخبأ ذو المدخل الواحد فخ؛ اجعل للسمكة المطارَدة طريق هروب.</li>
  <li><strong>توزيع الطعام بأكثر من نقطة</strong> — وقت الطعام أكثر لحظات التوتر.</li>
</ol>

<h2>متى تكون المشكلة اختياراً خاطئاً لا ظرفاً</h2>
<p>بعض التركيبات لا تنجح مهما حسّنت الظروف:</p>
<ul>
  <li><strong>سمكة إقليمية بطبعها بحوض صغير</strong> — بعض السيكلد يحتاج مساحة لا يوفرها الحوض المنزلي المتوسط.</li>
  <li><strong>حجم متفاوت جداً</strong> — ما يدخل الفم يُؤكل، بلا عدوانية أصلاً. <a href="/blog/angelfish-care-guide">الأنجل فيش</a>.</li>
  <li><strong>نقّار زعانف مع سمكة طويلة الزعانف</strong> — سلوك النوع لا يتغير.</li>
  <li><strong>الفايتر مع أنواع تشبهه</strong> — <a href="/blog/betta-compatible-tank-mates">توافق الفايتر</a>.</li>
</ul>
<p>القاعدة قبل الشراء أنفع من أي حل بعده: <a href="/blog/tank-mates-compatibility">توافق الأسماك</a>.</p>

<h2>افحص الماء قبل أن تتهم السمكة</h2>
<p>العدوانية المفاجئة في حوض كان مستقراً غالباً عرَض لا سبب. الازدحام وتدهور الماء يرفعان التوتر ويظهران كسلوك عدواني.</p>
<ul>
  <li>افحص الأمونيا والنتريت — <a href="/blog/aquarium-test-kit-guide">قراءة الفحص</a>.</li>
  <li>راجع العدد مقابل طاقة الحوض — <a href="/blog/how-many-fish-in-aquarium">كم سمكة يتحمل حوضك</a>.</li>
  <li>راجع الحرارة: الحرارة المرتفعة ترفع الأيض والنشاط والتوتر معاً.</li>
</ul>

<h2>الجروح بعد الشجار</h2>
<p>الجرح باب مفتوح للعدوى، وأول ما يظهر عليه زغب أو تآكل. الأولوية تحسين الماء لا الدواء الفوري — <a href="/blog/fish-fungus-vs-columnaris">الزغب الأبيض</a> و<a href="/blog/fin-rot-treatment-guide">تعفن الزعانف</a>. وإذا كانت السمكة المطارَدة تختبئ دائماً وترفض الأكل، فالفصل أحياناً هو الحل الوحيد الصادق.</p>', 'أنواع الأسماك', 'Users',
        'AQUAVO Editorial Team', TRUE, now());

INSERT INTO blog_posts (title, slug, excerpt, content, category, icon_name, author, is_published, published_at)
VALUES ('تكاثر الحلزون في الحوض: السبب الحقيقي والسيطرة عليه', 'aquarium-snail-population-control', 'الانفجار العددي مؤشر على علف زائد لا على حلزون شرير. ولماذا مبيدات الحلزون النحاسية تقتل الروبيان أولاً وتبقى في الركيزة لأشهر.', '<h2>الحلزون لا يتكاثر من فراغ</h2>
<p>الشكوى الشائعة: "دخل حلزون واحد وصار الحوض مليئاً". والسبب الحقيقي ليس الحلزون — بل <strong>الطعام الزائد</strong>. أعداد الحلزون تتبع كمية الغذاء المتاح: علف أكثر يعني حلزوناً أكثر، وقلّة الغذاء تحدّ العدد تلقائياً.</p>
<blockquote>لهذا الانفجار العددي مؤشر تشخيصي مفيد: <strong>إذا تكاثر الحلزون بشدة فأنت غالباً تفرط بالعلف</strong>. عالج السبب وسينخفض العدد وحده. <a href="/blog/aquarium-fish-feeding-guide">دليل التغذية</a>.</blockquote>

<h2>هل هو ضار أصلاً؟</h2>
<table>
  <tr><th>الاعتقاد</th><th>الواقع</th></tr>
  <tr><td>يأكل النباتات</td><td>أغلب الأنواع الشائعة ترعى الطحالب والأنسجة <strong>الميتة</strong>؛ نبات سليم نادراً ما يُؤكل</td></tr>
  <tr><td>يلوّث الحوض</td><td>يضيف حملاً حيوياً كأي كائن، لكنه يفكك البقايا أيضاً</td></tr>
  <tr><td>علامة حوض قذر</td><td>علامة <strong>طعام زائد</strong> تحديداً</td></tr>
  <tr><td>يجب التخلص منه</td><td>عدد معتدل مفيد فعلاً كطاقم تنظيف</td></tr>
</table>

<h2>السيطرة على العدد — بالترتيب</h2>
<ol>
  <li><strong>قلّل العلف.</strong> الإجراء الأول والأكثر فعالية بفارق كبير.</li>
  <li><strong>ارفع البقايا</strong> بعد التغذية، خصوصاً الخضار.</li>
  <li><strong>الإزالة اليدوية.</strong> ضع قطعة خضار مسلوقة ليلاً، وارفعها صباحاً بما عليها. كرّرها أياماً.</li>
  <li><strong>سيفنة القاع</strong> تشيل البيض والصغار مع الفضلات — <a href="/blog/how-to-clean-aquarium-properly">تنظيف الحوض</a>.</li>
  <li><strong>افحص النبات الجديد</strong> قبل إدخاله؛ البيض يدخل ملتصقاً بالأوراق.</li>
</ol>

<h2>تحذير مهم: مبيدات الحلزون</h2>
<p>أغلب منتجات "قاتل الحلزون" <strong>نحاسية الأساس</strong>. وهذا يعني:</p>
<ul>
  <li><strong>تقتل الروبيان قبل الحلزون</strong> — الروبيان أحسّ للنحاس من الحلزون المستهدف نفسه.</li>
  <li><strong>النحاس لا يتحلل</strong>: يرتبط بالركيزة والسيليكون ويتسرب لأشهر، وقد يجعل الحوض غير صالح للافقاريات لاحقاً.</li>
  <li><strong>موت جماعي مفاجئ</strong> للحلزون يرفع الأمونيا بشدة — عشرات الأجسام المتحللة دفعة واحدة.</li>
</ul>
<p>التفصيل في <a href="/blog/aquarium-shrimp-snails-guide">الروبيان والحلزون</a>. والخلاصة: تقليل العلف أأمن وأفعل من أي منتج.</p>

<h2>الأسماك الآكلة للحلزون: حل بشرطين</h2>
<p>بعض الأسماك تأكل الحلزون، لكن إضافتها قرار دائم لا علاج مؤقت:</p>
<ul>
  <li>ستبقى في حوضك بعد اختفاء الحلزون، وتحتاج مساحتها ومتطلباتها.</li>
  <li>قد تأكل الروبيان والحلزون المرغوب أيضاً، لا الزائد فقط.</li>
  <li>وتضيف حملاً حيوياً — <a href="/blog/how-many-fish-in-aquarium">كم سمكة يتحمل حوضك</a>.</li>
</ul>
<p>لا تضف كائناً حياً لوظيفة واحدة ثم تهمله. إذا كانت المشكلة علفاً زائداً، فالحل علف أقل.</p>

<h2>الحلزون المفيد</h2>
<p>عدد معتدل يرعى الطحالب على الزجاج والديكور ويفكك بقايا الطعام، وبعض الأنواع تنبش الركيزة فتمنع تكوّن جيوب لاهوائية. وحساسيته العالية لتدهور الماء تجعله مؤشراً مبكراً — إذا بدأ حلزونك يموت أو تتآكل أصدافه، افحص الماء والقساوة قبل أن تُصاب الأسماك. <a href="/blog/gh-kh-water-hardness-guide">القساوة GH و KH</a>.</p>', 'مشاكل وحلول', 'Shell',
        'AQUAVO Editorial Team', TRUE, now());

INSERT INTO blog_posts (title, slug, excerpt, content, category, icon_name, author, is_published, published_at)
VALUES ('ارتفاع النتريت: اختناق بماء صافٍ', 'nitrite-spike-aquarium', 'النتريت لا يقلل الأوكسجين بالماء بل يمنع الدم من حمله. أعراض اختناق مع ماء صافٍ وتهوية جيدة تعني فحص النتريت فوراً.', '<h2>اختناق بماء صافٍ</h2>
<p>ارتفاع النتريت يعطي مشهداً مربكاً: الأسماك تلهث عند السطح وتبدو مختنقة، <strong>والماء صافٍ والتهوية شغالة</strong>. فيبحث صاحب الحوض عن مشكلة أوكسجين لا وجود لها.</p>
<p>السبب أن النتريت لا يقلل الأوكسجين بالماء — بل <strong>يمنع دم السمكة من حمله</strong>. الأوكسجين موجود، والسمكة لا تستطيع الاستفادة منه. ولهذا زيادة التهوية وحدها لا تحل المشكلة، رغم أنها تبقى مفيدة.</p>
<blockquote>القاعدة: <strong>أعراض اختناق + ماء صافٍ + تهوية جيدة = افحص النتريت فوراً</strong>. هذا أكثر سيناريو يُشخَّص خطأ في الحوض المنزلي.</blockquote>

<h2>افعل هذا الآن</h2>
<table>
  <tr><th>#</th><th>الإجراء</th><th>ليش</th></tr>
  <tr><td>١</td><td>أوقف العلف</td><td>يوقف إنتاج أمونيا تتحول لنتريت</td></tr>
  <tr><td>٢</td><td>غيّر جزءاً من الماء بماء معالَج بنفس الحرارة</td><td>التخفيف هو الإجراء الفوري الوحيد الفعال</td></tr>
  <tr><td>٣</td><td>زد التهوية</td><td>لا تحل السبب لكنها تخفف الضغط على سمكة متضررة</td></tr>
  <tr><td>٤</td><td><strong>لا تنظّف الفلتر</strong></td><td>البكتيريا التي تؤكسد النتريت تعيش هناك</td></tr>
  <tr><td>٥</td><td>أعد الفحص بعد ساعات</td><td>القراءتان تعطيان الاتجاه</td></tr>
</table>

<h2>لماذا ظهر النتريت أصلاً</h2>
<p>النتريت مرحلة وسطى: البكتيريا تحوّل الأمونيا إليه، ثم بكتيريا أخرى تحوّله إلى نترات. ظهوره يعني أن <strong>الخطوة الأولى تعمل والثانية لم تلحق</strong>.</p>
<ul>
  <li><strong>حوض جديد قيد التدوير:</strong> طبيعي تماماً. ذروة النتريت تأتي بعد ذروة الأمونيا، وهي علامة تقدّم لا فشل. <a href="/blog/nitrogen-cycle-simple-arabic-explained">الدورة البيولوجية</a>.</li>
  <li><strong>حوض مستقر فجأة:</strong> شيء أضرّ بالمستعمرة — غسل الفلتر بماء الحنفية، أو دواء، أو انقطاع كهرباء طويل، أو زيادة مفاجئة بالأسماك.</li>
  <li><strong>حمل تجاوز الطاقة:</strong> أسماك جديدة أو علف زائد أرفعا الإنتاج فوق قدرة المعالجة — <a href="/blog/how-many-fish-in-aquarium">كم سمكة يتحمل حوضك</a>.</li>
</ul>

<h2>ملاحظة على الكلوريد</h2>
<p>يُذكر بالمصادر أن الكلوريد ينافس النتريت على مواقع الامتصاص في الخياشيم فيقلل أثره. الآلية معروفة، <strong>لكن النسب المتداولة مأخوذة من استزراع أسماك غذائية بأحواض إنتاج</strong> — أنواع ومقاييس مختلفة عن حوض زينة منزلي. لذلك لن ننشر نسبة أو جرعة: الإجراء المنزلي الموثوق يبقى <strong>تغيير الماء</strong>.</p>

<h2>الفرق عن التسمم بالأمونيا</h2>
<p>الأعراض متشابهة جداً، والفرق يظهر بالفحص لا بالنظر:</p>
<ul>
  <li><strong>الأمونيا:</strong> غالباً مع احمرار خياشيم وحروق ظاهرة — <a href="/blog/ammonia-spike-emergency-treatment">ارتفاع الأمونيا المفاجئ</a>.</li>
  <li><strong>النتريت:</strong> أعراض اختناق أوضح مع مظهر خارجي أقل تضرراً.</li>
  <li><strong>وقد يرتفعان معاً</strong> بحوض جديد أو بعد انهيار الفلتر.</li>
</ul>
<p>افحص الاثنين دائماً معاً — <a href="/blog/aquarium-test-kit-guide">قراءة اختبارات الماء</a> و<a href="/blog/fish-disease-symptoms-diagnosis">دليل تشخيص الأعراض</a>. وبعد انتهاء الأزمة راجع الجدول والحمل: <a href="/blog/aquarium-water-change-guide">تغيير الماء</a>.</p>', 'مشاكل وحلول', 'Activity',
        'AQUAVO Editorial Team', TRUE, now());

INSERT INTO blog_posts (title, slug, excerpt, content, category, icon_name, author, is_published, published_at)
VALUES ('نقل الأسماك ونقل الحوض: ما يهم فعلاً', 'transporting-fish-and-aquarium', 'الهواء في الكيس أهم من الماء، والخطأ الأكثر كلفة عند نقل حوض كامل هو ترك ميديا الفلتر تجف.', '<h2>الأكياس والصناديق: ما يهم فعلاً</h2>
<p>نقل السمكة عملية قصيرة لكنها مركّزة الضغط: مساحة صغيرة، وأوكسجين محدود، وأمونيا تتراكم بلا فلتر، وحرارة تتغير. والقاعدة الأساسية تخالف الحدس:</p>
<blockquote><strong>الهواء في الكيس أهم من الماء.</strong> املأ الكيس ثلثاً ماءً وثلثين هواءً. الماء الزائد لا يفيد — الحيّز الهوائي هو ما يجدّد الأوكسجين طوال الطريق.</blockquote>
<ul>
  <li><strong>لا تطعم</strong> قبل النقل بيوم — الطعام غير المهضوم يلوّث ماء الكيس بسرعة.</li>
  <li><strong>كيس مزدوج</strong> والزوايا مطوية، فالسمك الصغير يعلق في الزاوية.</li>
  <li><strong>عتّم الكيس</strong> بصندوق أو قماش — الظلام يهدّئ ويقلل استهلاك الأوكسجين.</li>
  <li><strong>اعزل حرارياً</strong>: صندوق فلين أو كرتون مبطّن. بصيف العراق سيارة واقفة بالشمس تقتل خلال دقائق — <a href="/blog/protect-fish-iraqi-summer-50-degrees">حرارة الصيف</a>.</li>
  <li><strong>أسماك ذات أشواك أو زعانف صلبة</strong> تحتاج كيساً أقوى أو حاوية صلبة.</li>
</ul>

<h2>عند الوصول</h2>
<p>لا تفتح الكيس فوراً وتترك السمكة فيه ساعة. فتح الكيس يرفع الـ pH فيحوّل الأمونيا المتراكمة إلى صورتها السامة — والتنقيط الطويل داخل ماء الكيس يزيد الضرر. الطريقة الصحيحة والتفصيل الكيميائي في <a href="/blog/acclimating-new-fish">أقلمة السمكة الجديدة</a>.</p>
<p>ولا تسكب ماء النقل في الحوض، وأدخل السمكة لحوض حجر إن أمكن — <a href="/blog/quarantine-new-fish-guide">الحجر الصحي</a>.</p>

<h2>نقل الحوض كاملاً</h2>
<table>
  <tr><th>#</th><th>الخطوة</th><th>ملاحظة</th></tr>
  <tr><td>١</td><td>لا تطعم يوماً قبل النقل</td><td>يقلل التلوث بالطريق</td></tr>
  <tr><td>٢</td><td>احفظ ماءً من الحوض بدلاء نظيفة</td><td>لنقل الأسماك فيه ولإعادة تعبئة جزء من الحوض</td></tr>
  <tr><td>٣</td><td><strong>أبقِ ميديا الفلتر مغمورة بماء الحوض</strong></td><td>هذي أهم خطوة كلها — الميديا الجافة تعني موت المستعمرة</td></tr>
  <tr><td>٤</td><td>انقل الأسماك بأكياس أو دلاء مغطاة</td><td>لا تنقلها داخل الحوض أثناء الحمل</td></tr>
  <tr><td>٥</td><td>أفرغ الحوض تماماً قبل تحريكه</td><td>الحوض المملوء جزئياً ينكسر من إجهاد السيليكون</td></tr>
  <tr><td>٦</td><td>احمله من القاعدة لا من الحواف</td><td>الحمل من الإطار العلوي يفكك الوصلات</td></tr>
  <tr><td>٧</td><td>أعد التركيب ثم أضف الأسماك أخيراً</td><td>شغّل الفلتر والسخان أولاً</td></tr>
</table>
<blockquote>الخطأ الأكثر كلفة: ترك ميديا الفلتر تجف أثناء النقل. تفقد المستعمرة البكتيرية، فيعود الحوض عملياً غير مدوَّر ويبدأ ارتفاع الأمونيا بعد أيام. أبقِها مغمورة دائماً. <a href="/blog/nitrogen-cycle-simple-arabic-explained">الدورة البيولوجية</a>.</blockquote>

<h2>بعد النقل: توقّع أسبوعاً غير مستقر</h2>
<ul>
  <li><strong>افحص يومياً</strong> لأسبوع — <a href="/blog/aquarium-test-kit-guide">قراءة الفحص</a>.</li>
  <li><strong>أطعم قليلاً جداً</strong> أول أيام.</li>
  <li><strong>توقّع تعكراً</strong> من الركيزة المقلوبة؛ يصفو وحده — <a href="/blog/cloudy-water-fix">تشخيص التعكر</a>.</li>
  <li><strong>إذا ارتفعت الأمونيا</strong> تعامل معه كحوض قيد التدوير — <a href="/blog/ammonia-spike-emergency-treatment">ارتفاع الأمونيا</a>.</li>
</ul>
<p>ولا تضف أسماكاً جديدة قبل استقرار الحوض بأسابيع.</p>', 'للمبتدئين', 'Truck',
        'AQUAVO Editorial Team', TRUE, now());

INSERT INTO blog_posts (title, slug, excerpt, content, category, icon_name, author, is_published, published_at)
VALUES ('تقليم النباتات المائية وإكثارها: الطريقة حسب النوع', 'aquarium-plant-trimming-propagation', 'النبات المتروك بلا تقليم يظلّل نفسه فيموت من الأسفل. جدول بالطريقة لكل نوع، ولماذا ترك القصاصات في الماء يرفع الأمونيا.', '<h2>التقليم ليس تجميلاً — هو ما يبقي النبات حياً</h2>
<p>النبات المائي المتروك بلا تقليم يظلّل نفسه: الأوراق العليا تحجب الضوء عن السفلى، فتصفرّ السفلى وتتعفن، ثم تتحلل وترفع الحمل على الماء. والنتيجة نبات "يموت من الأسفل" رغم أن قمته تبدو ممتازة.</p>
<blockquote>وللتقليم فائدة ثانية: النبات المقلَّم ينمو أكثف. قطع القمة يوقف النمو الطولي مؤقتاً ويحفّز تفرّعاً جانبياً، فتحصل على شكل أفضل ونبات أصح معاً.</blockquote>

<h2>الطريقة حسب نوع النبات</h2>
<table>
  <tr><th>النوع</th><th>أمثلة</th><th>الإكثار والتقليم</th></tr>
  <tr><td>ساقية</td><td>إيلوديا، هيغروفيلا</td><td>اقطع القمة واغرسها بالتربة — تصير نبتة مستقلة</td></tr>
  <tr><td>جذمورية</td><td>أنوبياس، جافا فيرن</td><td>قسّم الجذمور بسكين نظيف، لا تدفنه، واربطه على خشب أو حجر</td></tr>
  <tr><td>وردية</td><td>الأمازون سورد</td><td>تُنتج فروعاً جانبية؛ افصلها بعد أن تكوّن جذورها</td></tr>
  <tr><td>مدّادة</td><td>الفاليسنيريا</td><td>تنشر مدّادات تحت الركيزة؛ افصل النبتة الجديدة بعد رسوخها</td></tr>
  <tr><td>موس</td><td>جافا موس</td><td>قسّم الكتلة وثبّتها على سطح جديد</td></tr>
</table>
<p>ملاحظة على الجافا فيرن تحديداً: تُنتج نبتات صغيرة على حواف الأوراق القديمة. لا تنزعها مبكراً — انتظر حتى تكوّن جذيرات قبل الفصل.</p>

<h2>قواعد عملية</h2>
<ol>
  <li><strong>مقص نظيف وحاد.</strong> الأدوات المهترئة تسحق الأنسجة بدل أن تقطعها، فتتعفن الحواف.</li>
  <li><strong>ارفع القصاصات فوراً.</strong> الأوراق الطافية تتحلل وترفع الأمونيا. هذي أكثر خطوة تُنسى.</li>
  <li><strong>لا تقلّم أكثر من ثلث النبات مرة واحدة.</strong> التقليم إجهاد، والإفراط به يوقف النمو.</li>
  <li><strong>لا تقلّم نبتة تذوب أصلاً</strong> — إذا كانت بمرحلة انتقال من نمو هوائي فانتظر النمو الجديد. <a href="/blog/aquatic-plant-root-rot-treatment">مشاكل النباتات المائية</a>.</li>
  <li><strong>افحص بعد تقليم كبير</strong> — الأنسجة المقطوعة والمواد المتسربة قد تعكّر الماء مؤقتاً.</li>
</ol>

<h2>التقليم والطحالب</h2>
<p>الورقة القديمة المتضررة أرض خصبة للطحالب: نموها بطيء فتلتصق بها الطحالب أسرع مما تستطيع مقاومته. إزالة الأوراق المتضررة إجراء وقائي ضد الطحالب لا تجميل فقط — <a href="/blog/algae-war-guide">دليل الطحالب</a>.</p>
<p>وبعد تقليم كثيف ينخفض استهلاك المغذيات مؤقتاً لأن الكتلة النباتية قلّت، فقد يظهر فائض يغذّي الطحالب. قلّل التسميد أسبوعاً بعد أي تقليم كبير — <a href="/blog/aquarium-plant-fertilizer-guide">تسميد النباتات</a>.</p>

<h2>الإكثار يوفّر عليك</h2>
<p>أغلب نباتات المبتدئ تتكاثر ذاتياً بلا معدات: قصاصة ساقية تغرسها تصير نبتة كاملة خلال أسابيع. هذي أرخص طريقة لملء الحوض، وأضمنها أيضاً لأن النبتة الناتجة متأقلمة على ماء حوضك أصلاً — بخلاف نبتة جديدة تحتاج مرحلة انتقال.</p>
<p>ابدأ بالأنواع منخفضة الاحتياج — <a href="/blog/best-low-tech-aquarium-plants-beginners">نباتات منخفضة الاحتياج</a> — وثبّت الإضاءة قبل التوسّع: <a href="/blog/aquarium-planted-led-lighting-guide">دليل الإضاءة</a>. وللتثبيت على الخشب والصخر تتوفر في AQUAVO خيوط وشباك وغراء أكواسكيب ضمن قسم تربة وديكور.</p>', 'نباتات مائية', 'Scissors',
        'AQUAVO Editorial Team', TRUE, now());

-- Post-flight.
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM blog_posts WHERE is_published;
  IF n <> 100 THEN RAISE EXCEPTION 'expected 100 published posts, found %', n; END IF;

  SELECT count(*) INTO n FROM blog_posts
   WHERE slug IN ('fish-bloating-swim-bladder-dropsy', 'aquarium-fish-aggression', 'aquarium-snail-population-control', 'nitrite-spike-aquarium', 'transporting-fish-and-aquarium', 'aquarium-plant-trimming-propagation')
     AND is_published AND length(content) > 2500
     AND content LIKE '%<table%' AND content LIKE '%href="/blog/%'
     AND author = 'AQUAVO Editorial Team';
  IF n <> 6 THEN RAISE EXCEPTION 'only % of 6 new articles are complete', n; END IF;

  -- No published article may link to an unpublished one, corpus-wide.
  SELECT count(*) INTO n
    FROM blog_posts b
    CROSS JOIN LATERAL regexp_matches(b.content, 'href="/blog/([^"#?]+)"', 'g') AS m(parts)
   WHERE b.is_published
     AND NOT EXISTS (SELECT 1 FROM blog_posts t WHERE t.slug = m.parts[1] AND t.is_published);
  IF n <> 0 THEN RAISE EXCEPTION '% internal links point at unpublished articles', n; END IF;

  SELECT count(*) INTO n FROM blog_posts
   WHERE slug IN ('fish-bloating-swim-bladder-dropsy', 'aquarium-fish-aggression', 'aquarium-snail-population-control', 'nitrite-spike-aquarium', 'transporting-fish-and-aquarium', 'aquarium-plant-trimming-propagation')
     AND content ~ '[一-鿿぀-ヿ가-힯Ѐ-ӿऀ-ॿ฀-๿֐-׿Ā-ɏḀ-ỿ]';
  IF n <> 0 THEN RAISE EXCEPTION 'a new article carries stray script'; END IF;
END $$;

COMMIT;

-- Migration ID: kc-wave7-articles-20260902
-- Target:       Neon production, blog_posts (1 insert, 1 rewrite)
-- Rollback:     rollback-wave7.sql
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
  IF n <> 90 THEN RAISE EXCEPTION 'expected 90 published posts, found %', n; END IF;

  SELECT count(*) INTO n FROM blog_posts WHERE slug IN ('first-aquarium-setup-guide', 'aquarium-plant-fertilizer-guide', 'aquarium-safe-rocks-and-wood', 'aquarium-electrical-safety');
  IF n <> 0 THEN RAISE EXCEPTION 'the new slug already exists'; END IF;

  SELECT count(*) INTO n FROM blog_posts WHERE slug = 'aquarium-planted-led-lighting-guide' AND is_published
     AND length(content) = 1016;
  IF n <> 1 THEN RAISE EXCEPTION 'aquarium-planted-led-lighting-guide: reframe target missing or changed since drafting'; END IF;
  SELECT count(*) INTO n FROM blog_posts WHERE slug = 'how-to-clean-aquarium-properly' AND is_published
     AND length(content) = 893;
  IF n <> 1 THEN RAISE EXCEPTION 'how-to-clean-aquarium-properly: reframe target missing or changed since drafting'; END IF;
  SELECT count(*) INTO n FROM blog_posts WHERE slug = 'aquatic-plant-root-rot-treatment' AND is_published
     AND length(content) = 1904;
  IF n <> 1 THEN RAISE EXCEPTION 'aquatic-plant-root-rot-treatment: reframe target missing or changed since drafting'; END IF;
END $$;

CREATE TABLE blog_posts_backup_wave7_20260902 AS
SELECT id, slug, title, excerpt, content, is_published, now() AS backed_up_at
  FROM blog_posts;

INSERT INTO blog_posts (title, slug, excerpt, content, category, icon_name, author, is_published, published_at)
VALUES ('إعداد أول حوض سمك: الترتيب الصحيح خطوة بخطوة', 'first-aquarium-setup-guide', 'أغلب من يخسر أسماكه بالشهر الأول نفّذ الترتيب غلط لا اشترى معدات رديئة. سبع مراحل بالترتيب، وأين تقع مرحلة التدوير التي يتخطاها الجميع.', '<h2>الترتيب يهم أكثر من المعدات</h2>
<p>أغلب من يخسر أسماكه بالشهر الأول ما اشترى معدات رديئة — اشترى معدات جيدة ونفّذ الترتيب غلط. أشهر خطأ بالهواية كلها: <strong>شراء الأسماك بنفس يوم شراء الحوض</strong>.</p>
<blockquote>الحوض الجديد ماء نظيف بلا بكتيريا. والبكتيريا هي التي تحوّل الأمونيا السامة إلى مواد أقل ضرراً، وبناؤها يحتاج أسابيع لا ساعات. وضع سمكة قبلها يعني تركها تعوم بسمّها. الآلية في <a href="/blog/nitrogen-cycle-simple-arabic-explained">الدورة البيولوجية</a>.</blockquote>

<h2>الترتيب الصحيح</h2>
<table>
  <tr><th>المرحلة</th><th>ماذا تفعل</th><th>المدة</th></tr>
  <tr><td>١. الاختيار</td><td>حوض أكبر مما تظن، ومكان بعيد عن الشمس المباشرة</td><td>قبل الشراء</td></tr>
  <tr><td>٢. التركيب</td><td>سطح مستوٍ ومتين، اغسل الركيزة بماء فقط، ركّب الفلتر والسخان</td><td>يوم</td></tr>
  <tr><td>٣. الملء</td><td>ماء معالَج بمزيل كلور، صبّه على طبق حتى لا تقلب الركيزة</td><td>يوم</td></tr>
  <tr><td>٤. التشغيل</td><td>شغّل الفلتر والسخان ٢٤ ساعة قبل أي شي آخر</td><td>يوم</td></tr>
  <tr><td>٥. التدوير</td><td>مصدر أمونيا + صبر + فحص دوري</td><td><strong>أسابيع</strong></td></tr>
  <tr><td>٦. أول الأسماك</td><td>عدد قليل جداً، بعد أن تصير الأمونيا والنتريت صفراً</td><td>بعد التدوير</td></tr>
  <tr><td>٧. التوسّع</td><td>دفعات صغيرة متباعدة بأسابيع</td><td>أشهر</td></tr>
</table>

<h2>قرارات المرحلة الأولى</h2>
<ul>
  <li><strong>الحجم:</strong> الحوض الأكبر أسهل لا أصعب — كتلة الماء الأكبر تقاوم التغيّر المفاجئ بالحرارة والكيمياء. <a href="/blog/how-to-choose-aquarium-tank">اختيار الحوض</a>.</li>
  <li><strong>المكان:</strong> بعيداً عن الشمس المباشرة والشباك (طحالب وحرارة)، وعلى سطح يتحمل الوزن — لتر واحد كيلوغرام تقريباً، فحوض ١٠٠ لتر يتجاوز ١٠٠ كغم مع الركيزة.</li>
  <li><strong>الفلتر:</strong> اختر بالحجم لا بالسعر. <a href="/blog/filter-types-guide">اختيار الفلتر</a>.</li>
  <li><strong>السخان:</strong> ومعه ميزان حرارة منفصل. <a href="/blog/aquarium-heaters-cheap-vs-premium">دليل السخانات</a>.</li>
  <li><strong>لا تشترِ أسماكاً بعد.</strong> هذي أهم نقطة بالقائمة.</li>
</ul>

<h2>التدوير: المرحلة التي يتخطاها الجميع</h2>
<p>التدوير هو بناء مستعمرة البكتيريا داخل الفلتر. تحتاج مصدر أمونيا لتتغذى عليه، ووقتاً. تعرف أنه اكتمل حين تصل الأمونيا <strong>والنتريت</strong> إلى الصفر معاً وتظهر النترات.</p>
<ul>
  <li>افحص كل يومين — <a href="/blog/aquarium-test-kit-guide">قراءة اختبارات الماء</a>.</li>
  <li>لا تغيّر ماءً كثيراً أثناء التدوير: تُبطئ العملية.</li>
  <li>لا تنظّف الفلتر إطلاقاً بهذه المرحلة.</li>
  <li>الطحالب البنية التي تظهر بالأسابيع الأولى طبيعية وتزول وحدها — <a href="/blog/algae-war-guide">دليل الطحالب</a>.</li>
</ul>

<h2>أول أسماكك</h2>
<p>ابدأ بعدد أقل بكثير من طاقة الحوض النهائية، واختر أنواعاً قوية — <a href="/blog/5-hardy-fish-for-beginners">أسماك قوية للمبتدئين</a>. وأقلمها صح عند النقل: <a href="/blog/acclimating-new-fish">أقلمة السمكة الجديدة</a>. وإذا كانت الأنواع سربية فاحسب السرب الكامل من البداية: <a href="/blog/schooling-fish-minimum-numbers">الأسماك السربية</a>.</p>
<p>ثم أضف تدريجياً على دفعات، لأن كل إضافة ترفع الحمل قبل أن تلحق البكتيريا — <a href="/blog/how-many-fish-in-aquarium">كم سمكة يتحمل حوضك</a>.</p>

<h2>الروتين بعد الاستقرار</h2>
<ul>
  <li><strong>يومياً:</strong> علفة واحدة تنتهي خلال دقيقتين، ونظرة على الحرارة والسلوك. <a href="/blog/aquarium-fish-feeding-guide">دليل التغذية</a>.</li>
  <li><strong>أسبوعياً:</strong> فحص، وتغيير جزء من الماء، وسيفنة القاع. <a href="/blog/aquarium-water-change-guide">تغيير الماء</a>.</li>
  <li><strong>شهرياً:</strong> اغسل ميديا الفلتر بماء الحوض — لا بماء الحنفية أبداً. <a href="/blog/how-to-treat-tap-water-for-fish-iraq">معالجة ماء الحنفية</a>.</li>
</ul>
<p>وبالعراق أضف اعتبارين من اليوم الأول: حرارة الصيف وانقطاع الكهرباء — <a href="/blog/protect-fish-iraqi-summer-50-degrees">حرارة الصيف</a> و<a href="/blog/power-outage-emergency-aquarium-tools">أدوات الطوارئ</a>.</p>', 'للمبتدئين', 'Sparkles',
        'AQUAVO Editorial Team', TRUE, now());

INSERT INTO blog_posts (title, slug, excerpt, content, category, icon_name, author, is_published, published_at)
VALUES ('تسميد النباتات المائية: متى تحتاجه ومتى لا', 'aquarium-plant-fertilizer-guide', 'الطحالب تستفيد من الفائض، فالتوازن هو الهدف لا الحد الأقصى. من أين يأخذ النبات غذاءه، ولماذا النباتات المربوطة على الخشب لا تستفيد من سماد التربة.', '<h2>النبات يأكل، والماء وحده لا يكفيه</h2>
<p>النبات المائي يحتاج ثلاثة أشياء مجتمعة: <strong>إضاءة، ومغذيات، وثاني أكسيد الكربون</strong>. ونقص أي واحد منها يوقف الاستفادة من الاثنين الآخرين — وهذا يفسّر لماذا زيادة الإضاءة وحدها لا تُنمي النبات، بل تُنمي الطحالب.</p>
<blockquote>القاعدة الأهم بهذا الموضوع: <strong>الطحالب تستفيد من الفائض</strong>. إضاءة أقوى من قدرة النبات على الاستهلاك، أو مغذيات أكثر مما يحتاج، تذهب للطحالب. التوازن هو الهدف لا الحد الأقصى. <a href="/blog/algae-war-guide">دليل الطحالب</a>.</blockquote>

<h2>من أين يأخذ النبات غذاءه</h2>
<table>
  <tr><th>المصدر</th><th>يغذي</th><th>ملاحظة</th></tr>
  <tr><td>فضلات الأسماك</td><td>النترات والفوسفات أساساً</td><td>يكفي وحده كثيراً من الأحواض منخفضة الاحتياج</td></tr>
  <tr><td>تربة مغذّية / سماد تأسيسي</td><td>النباتات ذات الجذور</td><td>يوضع تحت الركيزة عند التأسيس</td></tr>
  <tr><td>سماد سائل</td><td>النباتات التي تمتص من الأوراق</td><td>للأنوبياس والجافا فيرن المربوطة على الخشب</td></tr>
  <tr><td>أقراص جذرية</td><td>النباتات المزروعة كثيفة التغذية</td><td>توضع قرب الجذور مباشرة</td></tr>
</table>
<p>ملاحظة عملية مهمة: النباتات المربوطة على الخشب والصخر — أنوبياس وجافا فيرن — <strong>تمتص من عمود الماء لا من الركيزة</strong>. وضع سماد بالتربة لها لا ينفع كثيراً.</p>

<h2>هل تحتاج سماداً أصلاً؟</h2>
<p>ليس دائماً، وهذا جواب صادق لا تهرّب:</p>
<ul>
  <li><strong>حوض بأسماك وإضاءة معتدلة ونباتات منخفضة الاحتياج:</strong> فضلات الأسماك غالباً تكفي. ابدأ بلا سماد.</li>
  <li><strong>حوض بإضاءة قوية أو نباتات سريعة النمو:</strong> الاستهلاك يفوق ما تنتجه الأسماك، فالسماد يصير ضرورياً.</li>
  <li><strong>حوض بلا أسماك تقريباً:</strong> لا مصدر مغذيات طبيعياً — سيحتاج تسميداً.</li>
</ul>
<p>يتوفر في AQUAVO سماد تأسيسي لتربة الأحواض المزروعة وسرنجة تسميد دقيقة وتربة أكواسكيب، ضمن قسم تربة وديكور.</p>

<h2>القاعدة الذهبية: قلّل، لا تزد</h2>
<ol>
  <li><strong>ابدأ بأقل من الجرعة الموصى بها</strong> على العبوة، وراقب أسبوعين.</li>
  <li><strong>غيّر شيئاً واحداً في كل مرة.</strong> إذا زدت السماد والإضاءة معاً ثم ظهرت طحالب، لن تعرف السبب.</li>
  <li><strong>الإضاءة أولاً.</strong> ثبّت ساعات الإضاءة على ٦–٨ ساعات قبل أن تلمس السماد إطلاقاً — <a href="/blog/aquarium-planted-led-lighting-guide">دليل الإضاءة</a>.</li>
  <li><strong>تغيير الماء المنتظم يعيد الضبط.</strong> يخرج الفائض ويمنع التراكم — <a href="/blog/aquarium-water-change-guide">تغيير الماء</a>.</li>
</ol>

<h2>انتبه: السماد واللافقاريات</h2>
<p>بعض الأسمدة السائلة تحتوي نحاساً ضمن العناصر الصغرى، والنحاس سام للروبيان والحلزون بتراكيز لا تؤذي الأسماك. إذا كان بحوضك لافقاريات، اقرأ التركيب قبل الشراء واختر ما يُصرّح بأنه آمن لها. التفصيل في <a href="/blog/aquarium-shrimp-snails-guide">الروبيان والحلزون</a>.</p>

<h2>وإذا ظهرت أعراض على النبات</h2>
<p>الاصفرار والثقوب والذوبان ليست دائماً نقص سماد — قد تكون مرحلة تأقلم أو مشكلة إضاءة. شخّصها قبل أن تضيف شيئاً: <a href="/blog/aquatic-plant-root-rot-treatment">مشاكل النباتات المائية</a>. واختيار النوع المناسب أصلاً يقلل الحاجة للتسميد: <a href="/blog/best-low-tech-aquarium-plants-beginners">نباتات منخفضة الاحتياج</a>.</p>', 'نباتات مائية', 'Sprout',
        'AQUAVO Editorial Team', TRUE, now());

INSERT INTO blog_posts (title, slug, excerpt, content, category, icon_name, author, is_published, published_at)
VALUES ('هل هذا الحجر أو الخشب آمن للحوض؟ اختبار الخل وما يُرفض فوراً', 'aquarium-safe-rocks-and-wood', 'بعض الأحجار تذوب ببطء وترفع القساوة والـ pH بلا أن تلاحظ. اختبار منزلي بسيط، وقائمة ما يُرفض فوراً، ولماذا الفوران لا يعني ممنوعاً دائماً.', '<h2>ليس كل حجر أو خشب صالحاً للحوض</h2>
<p>الديكور ليس قطعة جمالية فقط — هو <strong>سطح يتفاعل مع الماء لسنوات</strong>. بعض الأحجار تذوب ببطء وترفع القساوة والـ pH، وبعض الأخشاب تعفن، والمعادن قد تسرّب ما يقتل اللافقاريات قبل الأسماك.</p>
<p>والمشكلة أن الأثر تدريجي: لا تلاحظ شيئاً بالأسبوع الأول، ثم تجد الـ pH ارتفع والقساوة تغيّرت ولا تعرف لماذا.</p>

<h2>اختبار الحجر: الخل</h2>
<p>أبسط اختبار منزلي وأكثره فائدة. ضع قطرات خل على الحجر بمكان جاف ونظيف:</p>
<table>
  <tr><th>النتيجة</th><th>يعني</th><th>القرار</th></tr>
  <tr><td><strong>فوران وفقاعات</strong></td><td>الحجر كربوني ويذوب ببطء في الماء</td><td>يرفع القساوة والـ pH تدريجياً</td></tr>
  <tr><td><strong>لا تفاعل</strong></td><td>خامل نسبياً</td><td>مناسب لأغلب الأحواض</td></tr>
</table>
<blockquote>والفوران لا يعني "ممنوع" دائماً: الحجر الكربوني مفيد فعلاً لأحواض السيكلد الإفريقي التي تحتاج ماءً قاسياً وقاعدياً. لكنه كارثة لحوض تترا أو ديسكس يحتاج ماءً طرياً. المسألة ملاءمة لا صلاحية. <a href="/blog/gh-kh-water-hardness-guide">القساوة GH و KH</a>.</blockquote>

<h2>ما ترفضه فوراً</h2>
<ul>
  <li><strong>أي حجر فيه عروق معدنية لامعة أو صدأ</strong> — المعادن الذائبة سامة، واللافقاريات تتأثر أولاً.</li>
  <li><strong>الحجر المطلي أو المصبوغ</strong>، وأحجار الديكور المنزلي غير المخصصة للأحواض.</li>
  <li><strong>الأصداف والمرجان</strong> إذا كان حوضك يحتاج ماءً طرياً — كلها كربونات ترفع القساوة.</li>
  <li><strong>الخشب الطازج أو المعالَج كيميائياً</strong> — خشب الأثاث والأخشاب المعالجة ضد الحشرات ممنوعة تماماً.</li>
  <li><strong>الحجر من مصدر مجهول قرب أراضٍ زراعية</strong> — احتمال بقايا مبيدات.</li>
</ul>

<h2>الخشب: التحضير إلزامي</h2>
<p>الخشب المخصص للأحواض يحتاج تحضيراً قبل الإدخال:</p>
<ol>
  <li><strong>افركه بفرشاة وماء فقط</strong> — لا صابون ولا منظفات إطلاقاً.</li>
  <li><strong>اغلِه</strong> إن كان حجمه يسمح: يعقّمه ويقلل التانين ويساعده على الغرق.</li>
  <li><strong>انقعه</strong> أياماً وغيّر الماء — يقلل تلوين الماء لاحقاً.</li>
  <li><strong>توقّع اللون.</strong> التانين يصبغ الماء كالشاي وهو غير ضار، وبعض الأسماك تفضله. التفصيل في <a href="/blog/driftwood-preparation-yellow-water-fix">تحضير الخشب واصفرار الماء</a>.</li>
</ol>
<p>يتوفر في AQUAVO خشب طبيعي مخصص للأحواض والأكواسكيب وأحجار بركانية وحجر التنين، ضمن قسم تربة وديكور.</p>

<h2>الحواف والفجوات: خطر ميكانيكي</h2>
<ul>
  <li><strong>الحواف الحادة</strong> تمزّق زعانف الأسماك طويلة الزعنفة، والجرح باب للعدوى — <a href="/blog/fish-fungus-vs-columnaris">الزغب الأبيض</a>.</li>
  <li><strong>الفجوات الضيقة</strong> تحبس السمك الصغير.</li>
  <li><strong>الأحجار غير المستقرة</strong> تنهار وتكسر الزجاج. ابنِ من الأسفل على قاعدة ثابتة، ولا تسند حجراً كبيراً على زجاج الحوض مباشرة. <a href="/blog/hardscape-rock-arrangement-visual-depth">ترتيب الصخور</a>.</li>
</ul>

<h2>القاعدة العملية</h2>
<p>إذا كنت غير متأكد من قطعة: <strong>اختبرها بالخل، وانقعها بدلو منفصل أسبوعاً مع مراقبة الـ pH والقساوة</strong>، قبل إدخالها لحوض فيه أسماك. الدلو أرخص من حوض كامل. وراقب الفحص بعد الإدخال أيضاً — <a href="/blog/aquarium-test-kit-guide">قراءة اختبارات الماء</a>.</p>', 'ديكور وأحواض', 'Mountain',
        'AQUAVO Editorial Team', TRUE, now());

INSERT INTO blog_posts (title, slug, excerpt, content, category, icon_name, author, is_published, published_at)
VALUES ('السلامة الكهربائية حول الحوض: حلقة التنقيط وقواعد أساسية', 'aquarium-electrical-safety', 'ماء وأجهزة تعمل 24 ساعة. حلقة التنقيط إجراء مجاني يمنع أخطر مسار، وقاعدة واحدة غير قابلة للتفاوض قبل إدخال يدك في الماء.', '<h2>ماء وكهرباء في مكان واحد</h2>
<p>الحوض يجمع ماءً وأجهزة كهربائية تعمل ٢٤ ساعة: فلتر، سخان، مضخة، إضاءة. هذا آمن تماماً بشروط بسيطة — ومخاطرة حقيقية بدونها، على السمكة وعلى الإنسان.</p>
<blockquote>القاعدة الأولى وغير القابلة للتفاوض: <strong>افصل الكهرباء عن جميع الأجهزة قبل إدخال يدك في الماء</strong>. لا استثناء، ولا "بسرعة"، ولا "بس أعدّل الديكور". أغلب حوادث الصعق المنزلية حول الأحواض تبدأ بجملة "دقيقة وأخلص".</blockquote>

<h2>حلقة التنقيط: أبسط إجراء وأهمه</h2>
<p>اترك سلك كل جهاز ينزل إلى <strong>أسفل مستوى المقبس</strong> ثم يصعد إليه، فيتكوّن انحناء يشبه حرف U.</p>
<table>
  <tr><th>بلا حلقة تنقيط</th><th>مع حلقة تنقيط</th></tr>
  <tr><td>الماء المتساقط على السلك ينزلق باتجاه المقبس</td><td>الماء يتجمع عند أسفل الانحناء ويقطر على الأرض</td></tr>
</table>
<p>إجراء مجاني تماماً، ويستغرق ثانية عند التركيب، ويمنع أكثر مسار خطر شيوعاً. طبّقه على كل سلك بلا استثناء.</p>

<h2>قواعد التشغيل</h2>
<ul>
  <li><strong>لا تشغّل السخان خارج الماء</strong> ولا تسحبه وهو يعمل — الصدمة الحرارية تكسر الغلاف الزجاجي، والكسر داخل الماء خطر مضاعف.</li>
  <li><strong>أطفئ السخان قبل تغيير الماء</strong> إذا كان المستوى سينزل تحته، وشغّله بعد إعادة الملء.</li>
  <li><strong>لا تشغّل فلتراً جافاً</strong> — كثير من المضخات تُبرّد بالماء المار فيها.</li>
  <li><strong>افحص الأسلاك دورياً</strong> بحثاً عن تشقق أو تآكل، خصوصاً قرب مدخل الماء.</li>
  <li><strong>لا تستخدم وصلة مبللة أو مكشوفة</strong>، واحفظ المقابس فوق مستوى الحوض إن أمكن.</li>
</ul>

<h2>انقطاع الكهرباء ورجوعها</h2>
<p>الرجوع المفاجئ للتيار قد يشغّل كل الأجهزة دفعة واحدة. نقطتان عمليتان بالعراق:</p>
<ul>
  <li><strong>سخان بقي شغالاً بماء نزل مستواه</strong> أثناء الانقطاع قد ينكشف جزئياً ثم يسخن ويُصدم بالماء عند العودة.</li>
  <li><strong>فلتر توقف ساعات</strong> يحتاج انتباهاً قبل تشغيله — الميديا الراكدة قد تكون فسدت. الإجراء الكامل في <a href="/blog/power-outage-emergency-aquarium-tools">أدوات الطوارئ عند انقطاع الكهرباء</a>.</li>
</ul>

<h2>علامات مشكلة كهربائية</h2>
<ul>
  <li><strong>وخز خفيف</strong> عند لمس الماء — أوقف كل شيء فوراً من القاطع، وافصل الأجهزة واحداً واحداً لتحديد المصدر. لا تتجاهل الوخز الخفيف.</li>
  <li><strong>أسماك تلزم زاوية واحدة</strong> بلا سبب واضح وبفحص ماء سليم — احتمال تسرب كهربائي ضعيف يستحق الفحص.</li>
  <li><strong>رائحة احتراق أو سخونة غير طبيعية</strong> بجهاز أو وصلة.</li>
  <li><strong>قاطع يفصل</strong> عند تشغيل جهاز معيّن — لا تعيد تشغيله قبل معرفة السبب.</li>
</ul>

<h2>حدود ما نستطيع قوله</h2>
<p>التمديدات الكهربائية المنزلية ومواصفات الحماية تختلف بين بيت وآخر، ولن نصف لك تعديلاً كهربائياً تجريه بنفسك. ما نقوله محصور بما يخص الحوض: <strong>حلقة تنقيط لكل سلك، وفصل التيار قبل إدخال اليد، وفحص الأسلاك دورياً، ومراجعة كهربائي مختص لأي شك بالتمديد نفسه</strong>. وإذا لاحظت أي وخز، فهذا ليس موضوع أسماك — أوقف كل شيء واستعن بمختص.</p>', 'المعدات', 'Zap',
        'AQUAVO Editorial Team', TRUE, now());

UPDATE blog_posts SET title = 'إضاءة الأحواض المزروعة: المدة قبل الشدة، والواط لا يقيس ما تظنه', excerpt = 'مع الـ LED صار الواط مقياس استهلاك كهرباء لا مقياس ضوء يصل للنبات. لماذا ضبط عدد الساعات أهم من كل شيء، وليش رفع الإضاءة أول إجراء هو غالباً أسوأ إجراء.', content = '<h2>الواط لا يقيس ما تظنه</h2>
<p>سؤال "كم واط أحتاج؟" موروث من عصر مصابيح الفلورسنت. مع الـ LED صار الواط مقياس <strong>استهلاك الكهرباء</strong>، لا مقياس الضوء الذي يصل للنبات — ومصباحان بنفس الواط قد يعطيان نتيجتين مختلفتين تماماً.</p>
<p>ما يهم النبات هو <strong>شدة الضوء الواصلة إلى قاع الحوض</strong>، وهي تعتمد على قوة المصباح وعمق الماء والمسافة والانعكاس. ولهذا العمق عامل حاسم: نفس المصباح فوق حوض عميق يعطي عند القاع أقل بكثير مما يعطيه فوق حوض واطئ.</p>

<h2>المدة قبل الشدة</h2>
<blockquote>إذا كنت ستضبط شيئاً واحداً فقط، اضبط <strong>عدد الساعات</strong>. ٦ إلى ٨ ساعات يومياً تكفي أي حوض منزلي. أكثر من ذلك لا يعطي نبات أقوى — يعطي طحالب أكثر، لأن الطحالب أسرع استفادة من الفائض.</blockquote>
<table>
  <tr><th>الحالة</th><th>الساعات</th><th>ملاحظة</th></tr>
  <tr><td>حوض بلا نبات</td><td>٤–٦</td><td>الإضاءة للمشاهدة فقط</td></tr>
  <tr><td>نباتات منخفضة الاحتياج</td><td>٦–٨</td><td>الأنسب لأغلب الأحواض</td></tr>
  <tr><td>حوض مزروع كثيف</td><td>٨ كحد أقصى</td><td>ويحتاج تسميداً موازياً</td></tr>
  <tr><td>حوض فيه طحالب</td><td>قلّل، أو عتّم ٣ أيام</td><td><a href="/blog/algae-war-guide">دليل الطحالب</a></td></tr>
</table>
<p>واستخدم مؤقتاً. الانتظام أهم من الرقم: إضاءة متقطعة غير منتظمة تربك النبات وتفيد الطحالب.</p>

<h2>الضوء وحده لا يُنمي النبات</h2>
<p>النبات يحتاج ثلاثة معاً: <strong>ضوء، ومغذيات، وثاني أكسيد الكربون</strong>. ونقص أي واحد يجعل الزيادة في الآخرين ضاراً لا نافعاً.</p>
<ul>
  <li>إضاءة قوية + مغذيات قليلة = طحالب.</li>
  <li>إضاءة قوية + بلا CO2 كافٍ = طحالب.</li>
  <li>إضاءة معتدلة متوازنة مع الاثنين = نبات سليم.</li>
</ul>
<p>ولهذا رفع الإضاءة أول إجراء عند فشل النبات هو غالباً أسوأ إجراء. راجع <a href="/blog/aquarium-plant-fertilizer-guide">تسميد النباتات</a> و<a href="/blog/co2-system-planted-aquarium-guide">نظام ثاني أكسيد الكربون</a>.</p>

<h2>الشمس المباشرة: ليست إضاءة مجانية</h2>
<p>حوض قرب شباك مشمس يستقبل ضوءاً هائلاً وغير منضبط، والنتيجة شبه مؤكدة: <strong>ماء أخضر وطحالب مستمرة</strong> مهما ضبطت مصباحك. وبالعراق يضاف خطر ثانٍ: التسخين المباشر عبر الزجاج.</p>
<p>ابعد الحوض عن الشمس المباشرة، أو اعزله بستارة. تفاصيل الحرارة في <a href="/blog/protect-fish-iraqi-summer-50-degrees">حرارة الصيف</a> ومشكلة الماء الأخضر في <a href="/blog/cloudy-water-fix">تشخيص تعكر الماء</a>.</p>

<h2>الإضاءة والأسماك</h2>
<ul>
  <li><strong>فترة ظلام متصلة ضرورية.</strong> الأسماك تحتاج راحة، والنبات يستهلك أوكسجيناً ليلاً بدل أن ينتجه — وهذا يهم بحوض مكتظ أو حار. <a href="/blog/air-pumps-decoration-or-necessity">الأوكسجين الذائب</a>.</li>
  <li><strong>لا تشعل الإضاءة القوية فجأة</strong> على حوض مظلم؛ ضوء الغرفة أولاً يقلل الفزع.</li>
  <li><strong>الأسماك الخجولة</strong> تفضل إضاءة أخف ونباتات عائمة تكسر الضوء.</li>
  <li><strong>بعد نقل سمكة جديدة</strong> أبقِ الإضاءة خافتة — <a href="/blog/acclimating-new-fish">أقلمة السمكة الجديدة</a>.</li>
</ul>
<p>تتوفر إضاءة LED للأحواض في AQUAVO ضمن قسم الإضاءة.</p>

<h2>حدود ما نستطيع قوله</h2>
<p>لن نعطيك رقماً واحداً لشدة الإضاءة المطلوبة: القياسات الدقيقة تحتاج أجهزة غير متاحة للهاوي، والقيم تتغير مع العمق والمسافة ونوع النبات. القاعدة العملية الصادقة: <strong>ابدأ بمدة قصيرة وشدة معتدلة، وزد ببطء فقط إذا كان النبات يتطلب ذلك ولم تظهر طحالب</strong> — والطحالب هي مؤشرك الأدق على أنك تجاوزت الحد.</p>'
 WHERE slug = 'aquarium-planted-led-lighting-guide';

UPDATE blog_posts SET title = 'تنظيف الحوض بلا قتل البكتيريا: ما يُنظَّف ومتى وكيف', excerpt = 'الحوض النظيف بصرياً ليس الحوض السليم بيولوجياً. جدول بما يُنظَّف ومتى، وأربع قواعد، وعلامات أنك نظّفت أكثر من اللازم.', content = '<h2>التنظيف الخاطئ يقتل أكثر مما ينظّف</h2>
<p>أشهر كارثة عند المبتدئ: تفريغ الحوض بالكامل، ونقل الأسماك لوعاء، وغسل كل شي حتى يلمع — ثم موت الأسماك خلال أيام رغم أن الحوض "نظيف".</p>
<blockquote>السبب أن <strong>الحوض النظيف بصرياً ليس الحوض السليم بيولوجياً</strong>. البكتيريا التي تعالج الأمونيا تعيش على الأسطح: الإسفنج والحصى والديكور. غسلها يعني تدمير جهاز المعالجة، فيعود الحوض لحالة حوض جديد بلا أن تنتبه. <a href="/blog/nitrogen-cycle-simple-arabic-explained">الدورة البيولوجية</a>.</blockquote>

<h2>ما يُنظَّف ومتى</h2>
<table>
  <tr><th>العنصر</th><th>التكرار</th><th>الطريقة</th></tr>
  <tr><td>سيفنة القاع + تغيير ماء</td><td>أسبوعياً</td><td>سيفون، وماء جديد معالَج بنفس الحرارة</td></tr>
  <tr><td>الزجاج الداخلي</td><td>أسبوعياً أو عند الحاجة</td><td>مغناطيس أو إسفنجة مخصصة، بلا صابون</td></tr>
  <tr><td>ميديا الفلتر</td><td>عند ضعف التدفق فقط</td><td><strong>غسل خفيف بماء الحوض المسحوب</strong></td></tr>
  <tr><td>الديكور والخشب</td><td>نادراً</td><td>فرك بماء الحوض، لا إخراج وغسل كامل</td></tr>
  <tr><td>الزجاج الخارجي</td><td>عند الحاجة</td><td>رشّ على القماش لا على الحوض</td></tr>
</table>
<p><strong>ولا تنظّف الفلتر بنفس جلسة تغيير الماء الكبير.</strong> كل واحد منهما يزعزع التوازن قليلاً، واجتماعهما بيوم واحد يضاعف الأثر. باعد بينهما بأيام.</p>

<h2>القواعد الأربع</h2>
<ol>
  <li><strong>لا صابون ولا منظفات ولا مبيّض.</strong> إطلاقاً، ولا حتى "قليلاً جداً وأشطف جيداً". بقايا المنظفات تقتل.</li>
  <li><strong>ماء الحوض لغسل الميديا، لا ماء الحنفية.</strong> الكلور يقتل المستعمرة البكتيرية — <a href="/blog/how-to-treat-tap-water-for-fish-iraq">معالجة ماء الحنفية</a>.</li>
  <li><strong>لا تبدّل كل الميديا دفعة واحدة.</strong> بدّل جزءاً واترك الباقي أسبوعين ليستوطن الجديد.</li>
  <li><strong>افصل الكهرباء قبل إدخال اليد.</strong> <a href="/blog/aquarium-electrical-safety">السلامة الكهربائية حول الحوض</a>.</li>
</ol>

<h2>لماذا السيفون تحديداً</h2>
<p>الفضلات وبقايا العلف تتجمع <strong>بين حبات الحصى</strong>، لا على السطح. سحب الماء من الأعلى يأخذ ماءً نظيفاً نسبياً ويترك المصدر مكانه. السيفون يسحب الماء والفضلات معاً، فيؤدي وظيفتين بعملية واحدة.</p>
<p>وبالحوض المزروع خفّف السيفنة قرب الجذور حتى لا تقلع النبات أو تسحب التربة المغذية. تتوفر سيفونات ومكانس قاع في AQUAVO ضمن قسم الصيانة والتنظيف.</p>

<h2>علامات أنك نظّفت أكثر من اللازم</h2>
<ul>
  <li>ارتفاع أمونيا أو نتريت بعد التنظيف بيوم أو يومين — <a href="/blog/aquarium-test-kit-guide">قراءة الفحص</a>.</li>
  <li>تعكّر أبيض ضبابي بعد التنظيف — انفجار بكتيري، وعلاجه ليس مزيداً من التنظيف. <a href="/blog/cloudy-water-fix">تشخيص التعكر</a>.</li>
  <li>أسماك خاملة أو تلهث بعد الجلسة مباشرة.</li>
</ul>
<p>إذا حصل ذلك: <strong>توقف عن التنظيف</strong>، قلّل العلف، زد التهوية، وراقب. <a href="/blog/ammonia-spike-emergency-treatment">ارتفاع الأمونيا المفاجئ</a>.</p>

<h2>الخلاصة</h2>
<p>هدف التنظيف إزالة <strong>الفائض</strong> — علف زائد وفضلات ونترات متراكمة — لا إزالة الحياة الدقيقة التي تدير الحوض. أقل تدخلاً وأكثر انتظاماً أفضل من حملة تنظيف شاملة كل شهرين. وتفاصيل شق الماء في <a href="/blog/aquarium-water-change-guide">دليل تغيير الماء</a>.</p>'
 WHERE slug = 'how-to-clean-aquarium-properly';

UPDATE blog_posts SET title = 'مشاكل النباتات المائية: اصفرار وثقوب وذوبان — اقرأ الورقة', excerpt = 'مفتاح تشخيصي واحد يفرز أغلب الأعراض: هل تتأثر الأوراق القديمة أم الجديدة؟ وتصحيح خلط شائع — النبات المغمور لا يُروى.', content = '<h2>اقرأ الورقة: القديمة أم الجديدة؟</h2>
<p>أعراض النبات المائي تبدو متشابهة — اصفرار، ثقوب، ذوبان — لكن يوجد مفتاح تشخيصي واحد يفرز أغلبها: <strong>أي الأوراق تتأثر أولاً</strong>.</p>
<p>بعض المغذيات يستطيع النبات نقلها داخلياً، فيسحبها من الأوراق القديمة ليبني بها الجديدة. وبعضها لا يستطيع نقله. النتيجة:</p>
<table>
  <tr><th>الأوراق المتأثرة</th><th>يعني</th><th>مثال</th></tr>
  <tr><td><strong>القديمة أولاً</strong></td><td>نقص عنصر <em>متنقل</em> — النبات يفكّكها لتغذية الجديد</td><td>نيتروجين، بوتاسيوم، مغنيسيوم</td></tr>
  <tr><td><strong>الجديدة أولاً</strong></td><td>نقص عنصر <em>غير متنقل</em> — لا يستطيع سحبه من القديم</td><td>حديد</td></tr>
</table>

<h2>جدول الأعراض</h2>
<table>
  <tr><th>ما تراه</th><th>الأرجح</th><th>أول خطوة</th></tr>
  <tr><td>اصفرار بين العروق مع بقاء العروق خضراء، على الأوراق <strong>الجديدة</strong></td><td>نقص حديد</td><td>سماد يحتوي حديداً، وراجع الإضاءة</td></tr>
  <tr><td>ثقوب صغيرة كالدبوس، وحواف صفراء، على الأوراق <strong>القديمة</strong></td><td>نقص بوتاسيوم</td><td>سماد شامل</td></tr>
  <tr><td>الأوراق <strong>القديمة</strong> تصفرّ وتشفّ ثم تذوب</td><td>نقص نيتروجين</td><td>غالباً حوض قليل الأسماك أو تغيير ماء مفرط</td></tr>
  <tr><td>ذوبان واسع بعد الشراء بأيام</td><td><strong>انتقال طبيعي</strong> من نمو هوائي إلى مائي</td><td>لا تفعل شيئاً — انتظر النمو الجديد</td></tr>
  <tr><td>الجذمور مدفون والنبات يتعفن</td><td>خطأ زراعة لا نقص غذاء</td><td>ارفع الجذمور واربطه على خشب أو صخر</td></tr>
  <tr><td>طحالب تغطي الأوراق</td><td>فائض ضوء أو مغذيات</td><td><a href="/blog/algae-war-guide">دليل الطحالب</a></td></tr>
</table>

<h2>الذوبان بعد الشراء: طبيعي وليس فشلاً</h2>
<blockquote>أغلب النباتات تُزرع في المشاتل <strong>خارج الماء</strong> بأوراق هوائية. عند غمرها، تلك الأوراق تذوب لأنها غير مهيأة للحياة تحت الماء، ويبني النبات أوراقاً جديدة مختلفة الشكل. هذا انتقال، لا موت — والتخلص من النبات بهذه المرحلة خطأ شائع.</blockquote>
<p>القاعدة: احكم على <strong>النمو الجديد</strong>. إذا كانت الأوراق الجديدة سليمة فالنبات بخير مهما ذابت القديمة. وإذا استمرت الأعراض على الجديد بعد استقراره، عندها ابحث عن نقص فعلي.</p>

<h2>تصحيح مهم: النبات المائي لا "يُروى"</h2>
<p>ينتشر بالمحتوى العربي خلط بين النبات المنزلي والنبات المائي، فتُنسب مشاكل الحوض إلى "الإفراط في الري" أو "قلة الري". النبات المغمور يعيش في الماء دائماً، ولا معنى للري عنده. أسباب تعفن جذوره الحقيقية:</p>
<ul>
  <li><strong>دفن الجذمور</strong> عند الأنوبياس والجافا فيرن — السبب الأول بفارق كبير. هذي النباتات تُربط على سطح، ولا تُدفن.</li>
  <li><strong>ركيزة مضغوطة</strong> بلا حركة ماء، تخلق جيوباً لاهوائية عند الجذور.</li>
  <li><strong>أنسجة ميتة متروكة</strong> تتعفن وتنشر التعفن لما حولها.</li>
  <li><strong>ماء متدهور</strong> أصلاً — <a href="/blog/aquarium-test-kit-guide">قراءة اختبارات الماء</a>.</li>
</ul>

<h2>العلاج العملي</h2>
<ol>
  <li><strong>قصّ الأنسجة الميتة</strong> بمقص نظيف. الورقة الذائبة لن تتعافى، وبقاؤها يلوّث ويستهلك أوكسجيناً.</li>
  <li><strong>ارفع الجذمور</strong> إن كان مدفوناً، واربطه بخيط أو غراء أكواسكيب على خشب أو حجر.</li>
  <li><strong>حسّن حركة الماء</strong> حول المنطقة الراكدة — <a href="/blog/filter-types-guide">اختيار الفلتر</a>.</li>
  <li><strong>ثبّت الإضاءة</strong> على ٦–٨ ساعات قبل تغيير أي شي آخر — <a href="/blog/aquarium-planted-led-lighting-guide">دليل الإضاءة</a>.</li>
  <li><strong>غيّر عاملاً واحداً وانتظر أسبوعين.</strong> النبات يستجيب ببطء، وتغيير كل شي دفعة واحدة يمنعك من معرفة ما نفع.</li>
</ol>
<p>وتفاصيل التسميد ومتى تحتاجه أصلاً في <a href="/blog/aquarium-plant-fertilizer-guide">تسميد النباتات المائية</a>، واختيار أنواع متسامحة في <a href="/blog/best-low-tech-aquarium-plants-beginners">نباتات منخفضة الاحتياج</a>.</p>

<h2>حدود التشخيص البصري</h2>
<p>الأعراض تتداخل: نقص عنصرين معاً يعطي صورة مركّبة، وضعف الإضاءة يقلّد نقص المغذيات لأن النبات لا يستطيع استهلاكها أصلاً. الجدول أعلاه يرجّح ولا يجزم. والقاعدة الأسلم أن تبدأ بالإضاءة والانتظام، لأنهما مجانيان، قبل أن تضيف مواد إلى الماء.</p>'
 WHERE slug = 'aquatic-plant-root-rot-treatment';

-- Post-flight.
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM blog_posts WHERE is_published;
  IF n <> 94 THEN RAISE EXCEPTION 'expected 94 published, found %', n; END IF;

  SELECT count(*) INTO n FROM blog_posts
   WHERE slug IN ('first-aquarium-setup-guide', 'aquarium-plant-fertilizer-guide', 'aquarium-safe-rocks-and-wood', 'aquarium-electrical-safety', 'aquarium-planted-led-lighting-guide', 'how-to-clean-aquarium-properly', 'aquatic-plant-root-rot-treatment')
     AND is_published AND length(content) > 2500
     AND content LIKE '%<table%' AND content LIKE '%href="/blog/%';
  IF n <> 7 THEN RAISE EXCEPTION 'only % of 7 articles carry their structure', n; END IF;

  -- No published article may link to an unpublished one, corpus-wide.
  SELECT count(*) INTO n
    FROM blog_posts b
    CROSS JOIN LATERAL regexp_matches(b.content, 'href="/blog/([^"#?]+)"', 'g') AS m(parts)
   WHERE b.is_published
     AND NOT EXISTS (SELECT 1 FROM blog_posts t WHERE t.slug = m.parts[1] AND t.is_published);
  IF n <> 0 THEN RAISE EXCEPTION '% internal links point at unpublished articles', n; END IF;

  SELECT count(*) INTO n FROM blog_posts
   WHERE slug IN ('first-aquarium-setup-guide', 'aquarium-plant-fertilizer-guide', 'aquarium-safe-rocks-and-wood', 'aquarium-electrical-safety', 'aquarium-planted-led-lighting-guide', 'how-to-clean-aquarium-properly', 'aquatic-plant-root-rot-treatment')
     AND content ~ '[一-鿿぀-ヿ가-힯Ѐ-ӿऀ-ॿ฀-๿֐-׿Ā-ɏḀ-ỿ]';
  IF n <> 0 THEN RAISE EXCEPTION 'stray script in a Wave 3 article'; END IF;
END $$;

COMMIT;

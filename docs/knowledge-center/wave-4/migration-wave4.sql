-- Migration ID: kc-wave4-articles-20260902
-- Target:       Neon production, blog_posts (4 inserts)
-- Rollback:     rollback-wave4.sql
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
  IF n <> 80 THEN RAISE EXCEPTION 'expected 80 published posts, found %', n; END IF;

  SELECT count(*) INTO n FROM blog_posts WHERE slug IN ('aquarium-shrimp-snails-guide', 'schooling-fish-minimum-numbers', 'aquarium-care-while-traveling', 'how-to-sex-aquarium-fish');
  IF n <> 0 THEN RAISE EXCEPTION 'one of the new slugs already exists'; END IF;
END $$;

CREATE TABLE blog_posts_backup_wave4_20260902 AS
SELECT id, slug, title, excerpt, content, is_published, now() AS backed_up_at
  FROM blog_posts;

INSERT INTO blog_posts (title, slug, excerpt, content, category, icon_name, author, is_published, published_at)
VALUES ('الروبيان والحلزون في الحوض: النحاس أولاً، ثم كل شيء آخر', 'aquarium-shrimp-snails-guide', 'اللافقاريات أحساس للنحاس بمراحل من الأسماك، والنحاس لا يتحلل بل يبقى في الركيزة لأشهر. ما تحتاجه فعلاً من الماء والفلتر والمخابئ.', '<h2>قبل أي شي: النحاس يقتلها</h2>
<p>إذا كنت تنوي تربية روبيان أو حلزون، هذي أهم فقرة راح تقرأها. اللافقاريات <strong>أكثر حساسية للنحاس بمراحل من الأسماك</strong>، والنحاس موجود بأماكن ما تتوقعها:</p>
<ul>
  <li><strong>أدوية الأسماك</strong> — كثير منها نحاسي الأساس، ويقتل الروبيان بتركيز لا يؤذي السمكة.</li>
  <li><strong>مبيدات الحلزون</strong> — أغلبها نحاسي، والروبيان أحساس من الحلزون المستهدف نفسه.</li>
  <li><strong>بعض أسمدة النبات السائلة.</strong></li>
</ul>
<blockquote>والأخطر أن النحاس <strong>لا يتحلل</strong>: يرتبط بالركيزة والصخور والسيليكون ويتسرب ببطء لأشهر. يعني حوض عولج بالنحاس مرة قد لا يصلح للافقاريات بعدها إطلاقاً. القاعدة العملية: <strong>عالج الأسماك بحوض منفصل دائماً</strong> — وهذي فائدة إضافية لحوض الحجر الصحي: <a href="/blog/quarantine-new-fish-guide">الحجر الصحي</a>.</blockquote>

<h2>ما هي فعلاً، وما ليست</h2>
<table>
  <tr><th>الاعتقاد</th><th>الواقع</th></tr>
  <tr><td>طاقم تنظيف يغنيك عن الصيانة</td><td>تأكل الطحالب وبقايا الطعام، لكنها <strong>تضيف</strong> حملاً حيوياً ولا تلغي تغيير الماء</td></tr>
  <tr><td>تتحمل أي ماء</td><td>حساسة للأمونيا والنحاس أكثر من الأسماك بكثير</td></tr>
  <tr><td>لا تحتاج طعاماً</td><td>تحتاج غذاء مخصصاً إذا قلّت الطحالب</td></tr>
  <tr><td>تعيش مع أي سمكة</td><td>أغلب الأسماك متوسطة الحجم تأكل الروبيان الصغير</td></tr>
</table>

<h2>الماء الذي تحتاجه</h2>
<ul>
  <li><strong>أمونيا ونتريت صفر، بلا استثناء.</strong> اللافقاريات تتأثر قبل الأسماك، فهي مؤشر مبكر على تدهور الماء. <a href="/blog/aquarium-test-kit-guide">قراءة اختبارات الماء</a>.</li>
  <li><strong>كالسيوم كافٍ للأصداف والهيكل.</strong> الحلزون والروبيان يبنيان صدفة وهيكلاً، وماء طري جداً يعطي أصدافاً هشّة ومشاكل عند الانسلاخ. هذا شغل الـ GH — <a href="/blog/gh-kh-water-hardness-guide">القساوة GH و KH</a>.</li>
  <li><strong>استقرار قبل كل شي.</strong> تغيّر مفاجئ بالحرارة أو الكيمياء أخطر عليها منه على السمك، فتغييرات ماء أصغر وأكثر تكراراً — <a href="/blog/aquarium-water-change-guide">تغيير الماء</a>.</li>
</ul>

<h2>الفلتر: نقطة تقتل الصغار بصمت</h2>
<p>مدخل الفلتر يسحب الروبيان الصغير وصغار الحلزون. الحل البسيط: <strong>فلتر إسفنجي</strong>، أو غطاء إسفنجي على مدخل أي فلتر آخر. الفلاتر الإسفنجية متوفرة في AQUAVO ضمن قسم الفلترة والتنقية، وبعضها مصنوع أصلاً للروبيان وصغار الأسماك. تفاصيل الأنواع في <a href="/blog/filter-types-guide">اختيار الفلتر</a>.</p>

<h2>الطعام والمخابئ</h2>
<ul>
  <li><strong>طعام مخصص للروبيان</strong> متوفر في AQUAVO ضمن قسم طعام الأسماك، ويُقدَّم بكميات صغيرة جداً — الفائض يلوّث بسرعة.</li>
  <li><strong>أوراق الكاتابا</strong> (اللوز الهندي) تتحلل ببطء وتوفّر سطحاً حيوياً يرعى عليه الروبيان، وهي متوفرة ضمن معالجة المياه.</li>
  <li><strong>مخابئ كثيرة</strong> — الروبيان ينسلخ ويصير هشاً وضعيفاً لساعات بعدها، ويحتاج مكاناً يختفي فيه. الخشب الطبيعي والموس مثاليان.</li>
</ul>

<h2>مع أي سمكة</h2>
<p>القاعدة الصادقة: <strong>أي سمكة يدخل الروبيان بفمها سيأكله عاجلاً أو آجلاً</strong>. الأسماك الصغيرة المسالمة خيار أفضل، والأسماك متوسطة أو كبيرة الفم لا تتعايش مع روبيان صغير مهما بدت هادئة.</p>
<p>والحلزون أقل عرضة، لكن بعض الأنواع تنقره. وانتبه للعدد: الحلزون يتكاثر حسب توفر الطعام، فالإفراط بالعلف هو ما يحوّل بضع حلزونات إلى انفجار عددي — لا الحلزون نفسه.</p>
<p>ولحساب حمل حوضك قبل الإضافة شوف <a href="/blog/how-many-fish-in-aquarium">كم سمكة يتحمل حوضك</a>.</p>', 'أنواع الأسماك', 'Shell',
        'AQUAVO Editorial Team', TRUE, now());

INSERT INTO blog_posts (title, slug, excerpt, content, category, icon_name, author, is_published, published_at)
VALUES ('الأسماك السربية: ليش ستة وليس ثلاثة؟', 'schooling-fish-minimum-numbers', 'السرب آلية أمان لا زينة. السمكة السربية وحدها تعيش بتأهب دائم يضعف مناعتها، وشراء ثلاثة بدل ستة ليس توفيراً بل خسارة الثلاثة.', '<h2>سمكة سربية لوحدها ليست سمكة سعيدة</h2>
<p>الأنواع السربية تطوّرت لتعيش بمجموعة، والمجموعة ليست ترفاً جمالياً — هي <strong>آلية أمان</strong>. السمكة داخل سرب تعرف أن الخطر موزّع، فتتصرف بطبيعتها: تسبح بالمنتصف، تأكل بثقة، وتُظهر ألوانها.</p>
<p>ونفس النوع لوحده أو باثنين يعيش بحالة تأهب دائم: يختبئ، يفقد لونه، يأكل بتردد، وأحياناً يصير عدوانياً على غيره. وهذا التوتر المزمن يضعف المناعة، فتصير الأمراض متكررة بلا سبب ظاهر.</p>
<blockquote>يعني شراء ثلاث تترات بدل ستة ليس توفيراً. غالباً ينتهي بخسارة الثلاثة، لأن التوتر المزمن يفتح الباب لكل شي — وأولها النقط البيضاء: <a href="/blog/common-fish-diseases-white-spot">النقط البيضاء</a>.</blockquote>

<h2>الحد الأدنى العملي</h2>
<table>
  <tr><th>النمط</th><th>أمثلة شائعة</th><th>العدد الأدنى المعقول</th></tr>
  <tr><td>سربية حقيقية</td><td>نيون تترا، رازبورا، دانيو</td><td><strong>ستة فأكثر</strong>، والأفضل أكثر</td></tr>
  <tr><td>قاعية اجتماعية</td><td>كوريدوراس</td><td><strong>ستة فأكثر</strong> من النوع نفسه</td></tr>
  <tr><td>تعيش بمجموعات مرنة</td><td>جوبي، مولي، بلاتي</td><td>مجموعة صغيرة، مع مراعاة نسبة الإناث للذكور</td></tr>
  <tr><td>انفرادية أو إقليمية</td><td>الفايتر، بعض السيكلد</td><td>واحد، أو زوج بشروط</td></tr>
</table>
<p>ملاحظة مهمة: <strong>ستة من نوع واحد</strong>، لا ستة مختلطة. سمكتان من هذا النوع وثلاث من ذاك لا تشكّلان سرباً — كل واحدة تبقى وحيدة داخل حوض مزدحم.</p>

<h2>الخطأ الذي يبدو منطقياً</h2>
<p>المبتدئ يريد تنوعاً، فيشتري اثنين من كل نوع. النتيجة حوض فيه تنوع بصري وصفر راحة: كل نوع تحت عدده الأدنى، والحمل الحيوي مرتفع كأنه سرب كامل.</p>
<p><strong>البديل الأفضل:</strong> نوع أو نوعان بأعداد كافية. حوض فيه ثمانية نيون وستة كوريدوراس أجمل بصرياً وأصح بيولوجياً من حوض فيه اثنا عشر نوعاً بزوجين لكل نوع.</p>

<h2>وهنا يصطدم العدد بالحمل الحيوي</h2>
<p>سرب من ستة يعني حملاً أعلى من سمكتين. ولهذا لا يمكن اتخاذ قرار السرب بمعزل عن حجم الحوض وقوة الفلترة:</p>
<ul>
  <li>احسب على أساس السرب الكامل من البداية، لا على أساس ما ستشتريه اليوم.</li>
  <li>أضف السرب على دفعات صغيرة متباعدة لتلحق البكتيريا — <a href="/blog/nitrogen-cycle-simple-arabic-explained">الدورة البيولوجية</a>.</li>
  <li>وإذا كان الحوض لا يتحمل ستة من نوع، فالنوع نفسه غير مناسب لهذا الحوض. اختر نوعاً أصغر بدل تقليل العدد — <a href="/blog/how-many-fish-in-aquarium">كم سمكة يتحمل حوضك</a>.</li>
</ul>

<h2>مساحة السباحة، لا اللترات فقط</h2>
<p>الأسماك السربية النشطة تسبح أفقياً باستمرار، فيهمّها <strong>طول الحوض</strong> أكثر من ارتفاعه. حوض طويل واطئ أفضل لسرب نشط من حوض عالٍ ضيّق بنفس اللترات — وله ميزة ثانية: مساحة سطح أكبر تعني تبادل غازات أفضل. <a href="/blog/air-pumps-decoration-or-necessity">الأوكسجين الذائب والتهوية</a>.</p>

<h2>علامات أن السرب ناقص</h2>
<ul>
  <li>اختباء دائم بين النبات والديكور، وظهور خاطف عند الطعام فقط.</li>
  <li>باهتة اللون مقارنة بما رأيته بالمتجر.</li>
  <li>مطاردة داخل النوع نفسه — سلوك يظهر بأعداد صغيرة ويهدأ بعدد كافٍ.</li>
  <li>أمراض متكررة رغم أن الفحص سليم. راجع <a href="/blog/fish-disease-symptoms-diagnosis">دليل تشخيص الأعراض</a> أولاً لاستبعاد الماء.</li>
</ul>
<p>وإذا اكتشفت أن سربك ناقص، الحل إضافة أفراد من النوع نفسه تدريجياً — بشرط أن يتحمل الحوض العدد الكامل.</p>', 'أنواع الأسماك', 'Users',
        'AQUAVO Editorial Team', TRUE, now());

INSERT INTO blog_posts (title, slug, excerpt, content, category, icon_name, author, is_published, published_at)
VALUES ('السفر وترك الحوض: الجوع أهون من الماء الفاسد', 'aquarium-care-while-traveling', 'أكثر حوض يُفقد أثناء السفر لم يمت جوعاً بل من إفراط في العلف قبل المغادرة. جدول حسب مدة الغياب، وتحضير يبدأ قبل يومين لا قبل ساعة.', '<h2>الأسماك تتحمل الجوع أكثر مما تتحمل الماء الفاسد</h2>
<p>أول ما يقلق المسافر: مين يطعّم الأسماك؟ والحقيقة أن هذا آخر ما يجب أن يقلقك. السمكة البالغة السليمة تتحمل أياماً بلا طعام بلا ضرر يُذكر — لكنها <strong>لا تتحمل أياماً بماء متدهور</strong>.</p>
<blockquote>أكثر حوض يُفقد أثناء السفر ما مات جوعاً. مات لأن أحدهم أفرط بالعلف قبل السفر أو تركه لقريب "يطعّمهم كل يوم"، فتحلل الفائض ورفع الأمونيا بلا أحد ينتبه. <strong>الإفراط بالعلف أخطر من الصيام بكثير.</strong></blockquote>

<h2>حسب مدة الغياب</h2>
<table>
  <tr><th>المدة</th><th>الطعام</th><th>التحضير</th></tr>
  <tr><td>يومان إلى ثلاثة</td><td>لا شي — لا تطعم إطلاقاً</td><td>تغيير ماء قبل السفر ولا شي آخر</td></tr>
  <tr><td>أسبوع</td><td>لا شي للأسماك البالغة السليمة</td><td>تغيير ماء، تنظيف، فحص، تقليل الإضاءة</td></tr>
  <tr><td>أكثر من أسبوع</td><td>شخص يطعّم <strong>مرة كل يومين أو ثلاثة</strong> بكمية مقسّمة مسبقاً</td><td>كل ما سبق + تعليمات مكتوبة</td></tr>
</table>
<p>الأسماك الصغيرة وصغار التفريخ استثناء: تحتاج تغذية متكررة ولا تُترك. وكذلك السمكة المريضة أو التي في علاج.</p>

<h2>قبل السفر بيومين، لا بساعة</h2>
<ol>
  <li><strong>غيّر جزءاً من الماء</strong> وسيفن القاع — تبدأ غيابك بأدنى نترات ممكنة. <a href="/blog/aquarium-water-change-guide">تغيير الماء</a>.</li>
  <li><strong>افحص الأمونيا والنتريت.</strong> إذا كان الحوض غير مستقر أصلاً، السفر سيكشفه لا يخفيه. <a href="/blog/aquarium-test-kit-guide">قراءة الفحص</a>.</li>
  <li><strong>نظّف الفلتر قبلها بأسبوع، لا قبل السفر مباشرة.</strong> التنظيف يزعزع المستعمرة البكتيرية مؤقتاً، وتريد أن يحدث ذلك وأنت موجود.</li>
  <li><strong>قلّل ساعات الإضاءة</strong> أو أوقفها — ضوء أقل يعني طحالب أقل بغيابك.</li>
  <li><strong>تأكد من مستوى الماء</strong>: التبخر بغيابك يركّز كل شي ذائب، وبصيف العراق التبخر عالٍ. اترك المستوى ممتلئاً.</li>
  <li><strong>افحص السخان والفلتر</strong> — عطل يظهر بغيابك أسوأ توقيت ممكن. <a href="/blog/aquarium-heaters-cheap-vs-premium">دليل السخانات</a>.</li>
</ol>

<h2>إذا تركت شخصاً يطعّم</h2>
<p>هذي أخطر نقطة عملياً، والحل ليس ثقة أكثر بل <strong>تقليل ما يمكن أن يُخطئ فيه</strong>:</p>
<ul>
  <li><strong>قسّم الجرعات مسبقاً</strong> بأكياس أو علب صغيرة — واحدة لكل مرة. لا تترك العلبة كاملة أبداً.</li>
  <li><strong>اكتب التعليمات</strong> بجملة واحدة واضحة: "كيس واحد كل ثلاثة أيام، ولا شي غير هذا".</li>
  <li><strong>اطلب صراحة عدم إضافة أي شي</strong> — لا ماء، ولا أدوية، ولا "تنظيف".</li>
  <li><strong>قل له صراحة</strong>: إذا نسيت، لا تعوّض بجرعة مضاعفة.</li>
</ul>

<h2>البُعد العراقي: الغياب وانقطاع الكهرباء</h2>
<p>هنا تتضاعف المخاطر: انقطاع طويل بغيابك يعني فلتراً متوقفاً وحرارة متغيرة بلا أحد يتصرف. لا يوجد حل كامل، لكن يوجد تقليل ضرر:</p>
<ul>
  <li><strong>لا تضف أسماكاً قبل سفرك</strong> بأسابيع — الحوض يحتاج استقراراً لا حملاً جديداً. <a href="/blog/quarantine-new-fish-guide">الحجر الصحي</a>.</li>
  <li><strong>خفّف الحمل الحيوي</strong> قبل الغياب الطويل: أقل علف يعني أقل أمونيا يعني هامش أمان أكبر.</li>
  <li><strong>اترك الغطاء مفتوحاً جزئياً</strong> لتبادل غازات أفضل إذا كان الجو حاراً — <a href="/blog/protect-fish-iraqi-summer-50-degrees">حرارة الصيف</a>.</li>
  <li><strong>اشرح لمن يمر على البيت</strong> ما يفعله عند انقطاع طويل: تحريك سطح الماء بكوب، وعدم الإطعام. <a href="/blog/power-outage-emergency-aquarium-tools">أدوات الطوارئ</a>.</li>
</ul>

<h2>بعد الرجوع</h2>
<p>لا تعوّض الصيام بوجبة كبيرة. ابدأ بكمية صغيرة، وافحص الأمونيا والنتريت قبل أي شي آخر، وغيّر جزءاً من الماء إذا كانت القراءات مرتفعة أو الغياب طويلاً.</p>', 'للمبتدئين', 'Plane',
        'AQUAVO Editorial Team', TRUE, now());

INSERT INTO blog_posts (title, slug, excerpt, content, category, icon_name, author, is_published, published_at)
VALUES ('تمييز الذكر من الأنثى: العلامات الموثوقة وحدود المعرفة', 'how-to-sex-aquarium-fish', 'النسبة الخطأ بين الجنسين تسبب مطاردة مستمرة وتكاثراً غير مخطط. العلامات حسب النوع، والحالات التي لا يمكن الجزم فيها بصرياً.', '<h2>ليش يهمّك تعرف الذكر من الأنثى</h2>
<p>السؤال يبدو فضولاً، لكنه عملي تماماً — النسبة الخطأ بين الجنسين تسبب مشاكل حقيقية:</p>
<ul>
  <li><strong>مطاردة مستمرة.</strong> عند الولودات مثل الجوبي والمولي، الذكر يطارد الأنثى بلا توقف. ذكر واحد مع أنثى واحدة يعني أنثى منهكة.</li>
  <li><strong>تكاثر غير مخطط.</strong> الولودات تلد صغاراً أحياء بلا أي تدخل منك، فيتضاعف الحمل الحيوي فجأة.</li>
  <li><strong>عدوانية بين الذكور</strong> عند الأنواع الإقليمية.</li>
</ul>
<blockquote>القاعدة العملية للولودات: <strong>أنثيان أو ثلاث لكل ذكر</strong>. هذا يوزّع المطاردة بدل ما تتركز على أنثى واحدة.</blockquote>

<h2>العلامات حسب النوع</h2>
<table>
  <tr><th>النوع</th><th>الذكر</th><th>الأنثى</th></tr>
  <tr><td>الجوبي</td><td>أصغر، ألوان زاهية، زعنفة ذيل كبيرة، وزعنفة شرجية مدببة</td><td>أكبر، أبهت، بطن ممتلئ، زعنفة شرجية مروحية</td></tr>
  <tr><td>المولي والبلاتي</td><td>زعنفة شرجية مدببة كالعصا</td><td>زعنفة شرجية عريضة مثلثة</td></tr>
  <tr><td>الفايتر</td><td>زعانف طويلة، ألوان أقوى، يبني عش فقاعات</td><td>زعانف أقصر، وغالباً خط عمودي عند الاستعداد</td></tr>
  <tr><td>الكوريدوراس</td><td>أنحف وأصغر</td><td>أعرض بوضوح من الأعلى، خاصة عند حمل البيض</td></tr>
  <tr><td>الجولدفش</td><td>نقاط بيضاء صغيرة على الخياشيم والزعانف بموسم التكاثر</td><td>أكثر استدارة من الجانب</td></tr>
</table>
<p>العلامة الأوضح والأسهل عند الولودات هي <strong>شكل الزعنفة الشرجية</strong> — الزعنفة أسفل البطن. مدببة كالعصا تعني ذكراً، ومروحية عريضة تعني أنثى. هذي أوثق من اللون أو الحجم.</p>

<h2>متى لا تستطيع الجزم — وهذا طبيعي</h2>
<p>لن نعطيك طريقة قاطعة لكل نوع، لأنها غير موجودة:</p>
<ul>
  <li><strong>الصغار</strong> لا تظهر عليهم الفروق قبل النضج، ومعظم ما يُباع صغير.</li>
  <li><strong>أنواع كثيرة</strong> — أغلب التترا والرازبورا والدانيو — الفروق فيها طفيفة جداً وغير موثوقة بالنظر.</li>
  <li><strong>سلالات مهجّنة</strong> غيّرت الألوان والزعانف فطمست العلامات التقليدية.</li>
</ul>
<p>وإذا كان النوع لا يُميَّز بصرياً، فالحل العملي بسيط: <strong>اشترِ مجموعة</strong> وتعامل مع النتيجة. وهذا يتوافق أصلاً مع حاجة الأنواع السربية لعدد كافٍ — <a href="/blog/schooling-fish-minimum-numbers">الأسماك السربية وعددها الأدنى</a>.</p>

<h2>وإذا وُلد صغار بلا تخطيط</h2>
<p>الولودات تتكاثر في حوض عادي بلا أي تحضير. ما يحصل عادة أن أغلب الصغار يُؤكل، وهذا توازن طبيعي لا يحتاج تدخلاً. لكن إذا أردت إنقاذهم:</p>
<ul>
  <li><strong>مخابئ كثيفة</strong> — نبات أو موس عند السطح يكفي لنجاة جزء منهم.</li>
  <li><strong>صندوق عزل أو حاضنة</strong> للأنثى قرب الولادة، وتُعاد للحوض بعدها فوراً لأن الحبس يجهدها. صناديق العزل والحاضنات متوفرة في AQUAVO ضمن قسم العزل والتفريخ.</li>
  <li><strong>انتبه للحمل الحيوي</strong> — الصغار يكبرون. عشرون صغيراً اليوم تعني حوضاً مكتظاً بعد أشهر. <a href="/blog/how-many-fish-in-aquarium">كم سمكة يتحمل حوضك</a>.</li>
  <li><strong>طعام للصغار</strong> بحجم مناسب لأفواههم، متوفر ضمن قسم طعام الأسماك.</li>
</ul>
<p>ولا تنسَ أن أي زيادة بالعدد ترفع الأمونيا قبل ما تلحق البكتيريا — <a href="/blog/nitrogen-cycle-simple-arabic-explained">الدورة البيولوجية</a>.</p>', 'أنواع الأسماك', 'Fish',
        'AQUAVO Editorial Team', TRUE, now());

-- Post-flight.
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM blog_posts WHERE is_published;
  IF n <> 84 THEN RAISE EXCEPTION 'expected 84 published posts, found %', n; END IF;

  SELECT count(*) INTO n FROM blog_posts
   WHERE slug IN ('aquarium-shrimp-snails-guide', 'schooling-fish-minimum-numbers', 'aquarium-care-while-traveling', 'how-to-sex-aquarium-fish')
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
   WHERE slug IN ('aquarium-shrimp-snails-guide', 'schooling-fish-minimum-numbers', 'aquarium-care-while-traveling', 'how-to-sex-aquarium-fish')
     AND content ~ '[一-鿿぀-ヿ가-힯Ѐ-ӿऀ-ॿ฀-๿֐-׿Ā-ɏḀ-ỿ]';
  IF n <> 0 THEN RAISE EXCEPTION 'a new article carries stray script'; END IF;
END $$;

COMMIT;

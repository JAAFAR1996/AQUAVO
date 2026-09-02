-- Migration ID: kc-wave1-deepen-batch1-20260902
-- Target:       Neon production, blog_posts (3 rows)
-- Rollback:     rollback-deepen-batch1.sql
--
-- Wave 1 deepening, batch 1. Three articles with high search intent and no
-- duplicate to merge; each keeps its URL and gets a body that answers the
-- question rather than restating it.
--
-- All three drafts passed script-purity, editorial and business-truth via
-- scripts/gate-draft.ts before this file was generated.

BEGIN;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM blog_posts WHERE is_published;
  IF n <> 75 THEN RAISE EXCEPTION 'expected 75 published posts, found %', n; END IF;
END $$;

CREATE TABLE blog_posts_backup_deepen_b1_20260902 AS
SELECT id, slug, title, excerpt, content, is_published, now() AS backed_up_at
  FROM blog_posts;

-- common-fish-diseases-white-spot
--   The old page gave the right protocol and never said why it works. The parasite has four stages and only the free-swimming theront is exposed to medication; the visible white spot is under the fish's epithelium and the reproductive stage is inside a cyst. That single fact explains the two things that make keepers stop too early — spots increasing after treatment starts, and spots disappearing before the parasite is gone.
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM blog_posts WHERE slug = 'common-fish-diseases-white-spot' AND is_published
     AND length(content) = 1358;
  IF n <> 1 THEN RAISE EXCEPTION 'common-fish-diseases-white-spot: missing or changed since drafting'; END IF;
END $$;

UPDATE blog_posts SET title = 'النقط البيضاء (Ich): ليش الدواء ما يقتل النقط اللي تشوفها؟', excerpt = 'طور واحد فقط من الطفيلي مكشوف للدواء، والنقطة اللي تشوفها ليست منه. هذا يفسّر ليش تزيد النقط بعد بدء العلاج، وليش اختفاؤها لا يعني الشفاء.', content = '<h2>لماذا الدواء ما يقتل النقط اللي تشوفها</h2>
<p>هذي أهم معلومة بالموضوع كله، وأكثر واحد يفشل بعلاج النقط البيضاء ما يعرفها: <strong>النقطة البيضاء اللي تشوفها على السمكة محمية، والدواء ما يوصل لها</strong>.</p>
<p>الطفيلي المسبب (Ichthyophthirius multifiliis) يمر بأطوار، وطور واحد فقط منها مكشوف للدواء:</p>
<table>
  <tr><th>الطور</th><th>وين يكون</th><th>يتأثر بالدواء؟</th></tr>
  <tr><td>الطور المتغذي — النقطة البيضاء</td><td>تحت طبقة جلد السمكة، يتغذى عليها</td><td><strong>لا</strong> — محمي بأنسجة السمكة</td></tr>
  <tr><td>الطور الكيسي</td><td>ينفصل عن السمكة ويلتصق بالحصى والديكور داخل كيس، وينقسم لمئات</td><td><strong>لا</strong> — الكيس يحميه</td></tr>
  <tr><td>الطور السابح الحر</td><td>يخرج من الكيس ويسبح بحثاً عن سمكة</td><td><strong>نعم</strong> — مكشوف تماماً</td></tr>
</table>
<p>يعني العلاج كله يستهدف الطور الثالث فقط. ولهذا يصير شيئان يبدوان غريبين:</p>
<ul>
  <li><strong>النقط تزيد بعد بداية العلاج أحياناً.</strong> طبيعي — هذي أطوار كانت أصلاً داخل الجلد وظهرت، والدواء ما كان يقدر عليها.</li>
  <li><strong>اختفاء النقط لا يعني انتهاء المرض.</strong> اختفاؤها يعني إن الطفيليات نزلت للحصى لتتكاثر. إذا وقّفت العلاج هنا، الجيل الجديد يرجع أقوى.</li>
</ul>
<blockquote>القاعدة العملية: استمر بالعلاج <strong>من ٣ إلى ٥ أيام بعد اختفاء آخر نقطة</strong>، مو من يوم اختفائها. هذا الفرق بين علاج ينجح وعلاج يتكرر.</blockquote>

<h2>ليش رفع الحرارة يشتغل</h2>
<p>رفع الحرارة ما يقتل الطفيلي، بل <strong>يسرّع دورة حياته</strong> فيوصل للطور المكشوف أسرع، ويبقى تحت تأثير الدواء مدة أطول نسبةً لعمره. الطور السابح الحر يعيش حوالي ٤٨ ساعة عند ٢٤ درجة، وأقل كلما ارتفعت الحرارة.</p>
<ol>
  <li>ارفع الحرارة <strong>تدريجياً</strong> إلى ٢٩–٣٠ درجة — درجة أو درجتين كل بضع ساعات، لا دفعة واحدة.</li>
  <li><strong>زد التهوية بقوة.</strong> هذي خطوة إلزامية مو اختيارية: الماء الأدفأ يحمل أوكسجين أقل، والسمكة المريضة أصلاً مجهدة. الآلية مشروحة في <a href="/blog/protect-fish-iraqi-summer-50-degrees">حماية الأسماك من الحرارة</a>.</li>
  <li>استخدم دواء مخصص — أزرق الميثيلين (Methylene Blue) أو علاج النقط البيضاء، وكلاهما متوفر في AQUAVO ضمن معالجة المياه. اتبع جرعة العبوة ولا تجتهد بها.</li>
  <li>لا ترفع الحرارة فوق ٣٠ إلا إذا كنت تعرف تحمّل نوعك تحديداً.</li>
</ol>

<h2>كيف تعرف إنه نقط بيضاء وليس شيئاً ثانياً</h2>
<ul>
  <li><strong>الشكل:</strong> حبات ملح بيضاء بارزة، متناثرة على الجسم والزعانف — بحجم رأس الدبوس تقريباً.</li>
  <li><strong>السلوك:</strong> السمكة تحك جسمها بالحصى والديكور قبل ظهور النقط بأيام أحياناً. الحك من غير نقط علامة مبكرة.</li>
  <li><strong>خمول وفقدان شهية</strong>، وتنفس سريع إذا أصابت الخياشيم.</li>
</ul>
<p>لو الأعراض تنفس سريع بلا نقط إطلاقاً، فغالباً مشكلة جودة ماء مو طفيلي — افحص الأمونيا والنتريت أولاً، وشوف <a href="/blog/ammonia-spike-emergency-treatment">ارتفاع الأمونيا المفاجئ</a>.</p>

<h2>ليش ينتشر بالعراق بالربيع والخريف</h2>
<p>السبب مو موسمي بحد ذاته، بل سلوكي: كثيرون يطفئون السخان لما يدفأ الجو نهاراً، والليل يبقى بارداً. هذا التذبذب اليومي يضعف مناعة السمكة، والطفيلي الكامن يستغلها.</p>
<p>الحل بسيط: خلّ السخان شغالاً طول السنة على منظم حرارة (Thermostat) مضبوط على ٢٦ درجة. راح يفصل تلقائياً بالصيف ويشتغل بالليالي الباردة فقط. تفاصيل اختيار السخان وقدرته في <a href="/blog/aquarium-heaters-cheap-vs-premium">دليل السخانات</a>.</p>

<h2>الوقاية أرخص من العلاج</h2>
<ul>
  <li><strong>حرارة ثابتة</strong> — التذبذب هو المحفّز الأول.</li>
  <li><strong>حجر صحي للسمك الجديد</strong> قبل إدخاله للحوض الرئيسي. أغلب الإصابات تدخل مع سمكة جديدة.</li>
  <li><strong>لا تنقل ماء المتجر</strong> إلى حوضك مع السمكة الجديدة.</li>
  <li><strong>حوض مستقر</strong> — السمكة المجهدة بأمونيا أو نترات مرتفعة تصاب أسرع. الأساس في <a href="/blog/nitrogen-cycle-simple-arabic-explained">الدورة البيولوجية</a>.</li>
</ul>
<p>ملاحظة أخيرة وجدّية: لا تستخدم أدوية بشرية على الأسماك ولا تقدّر الجرعة بالتخمين — التفاصيل في <a href="/blog/human-medicine-dangers-for-fish">خطر الأدوية البشرية على الأسماك</a>.</p>'
 WHERE slug = 'common-fish-diseases-white-spot';

-- how-to-treat-tap-water-for-fish-iraq
--   The old page asserted that Iraqi treatment plants switched to chloramine. The nitrogen-cycle dossier records that exact question as RESEARCH BLOCKED — no source was found establishing which disinfectant is used, and the truth contract forbids generalising Iraqi water chemistry. The rewrite gives the reader a test that answers it for their own supply (ammonia present right after a water change means chloramine the conditioner did not cover) instead of asserting it for a country.
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM blog_posts WHERE slug = 'how-to-treat-tap-water-for-fish-iraq' AND is_published
     AND length(content) = 1403;
  IF n <> 1 THEN RAISE EXCEPTION 'how-to-treat-tap-water-for-fish-iraq: missing or changed since drafting'; END IF;
END $$;

UPDATE blog_posts SET title = 'معالجة ماء الحنفية للأسماك: كلور أم كلورامين، والفرق العملي', excerpt = 'المعالجة الصحيحة تعتمد على نوع المعقّم في شبكتك، وطريقة الترك تحت الشمس تنفع مع واحد ولا تنفع مع الآخر. وفحص بسيط يعطيك الجواب عن مصدرك أنت.', content = '<h2>الخلاصة</h2>
<p>ماء الحنفية معقَّم، والمعقِّم اللي يحمينا نحن يقتل خياشيم السمكة والبكتيريا النافعة داخل الفلتر معاً. لا تضع ماء حنفية بالحوض قبل معالجته — لا للتغيير الدوري ولا لغسل الميديا.</p>
<p>والمعالجة الصحيحة تعتمد على شي واحد: <strong>هل شبكتك تستخدم كلوراً حراً أم كلورامين؟</strong> لأن العلاج يختلف، وطريقة الآباء القديمة تنفع مع واحد ولا تنفع مع الثاني إطلاقاً.</p>

<table>
  <tr><th></th><th>الكلور الحر</th><th>الكلورامين</th></tr>
  <tr><td>يتطاير بالتعريض للهواء؟</td><td>نعم، خلال ٢٤–٤٨ ساعة</td><td><strong>لا</strong> — مستقر ولا يتطاير عملياً</td></tr>
  <tr><td>مزيل كلور عادي يكفي؟</td><td>نعم</td><td>يفكك الرابطة ويترك <strong>أمونيا</strong> بالماء</td></tr>
  <tr><td>المطلوب</td><td>معالج مياه بسيط</td><td>معالج ينص على معادلة الكلورامين والأمونيا</td></tr>
</table>

<h2>نقطة صدق: ما نعرف شنو تستخدم شبكتك</h2>
<p>ينتشر بالمحتوى العربي جزم بأن محطات العراق تحوّلت للكلورامين. نحن ما لكينا مصدراً موثوقاً يثبت هذا لكل المحافظات، وما راح نقوله لأن الفرق عملي مو نظري: لو افترضت كلورامين وأنت على كلور حر فقد صرفت زيادة بلا داعي، ولو افترضت العكس فقد تركت أمونيا بحوضك.</p>
<blockquote>الطريقة الوحيدة المؤكدة: اسأل مصلحة الماء بمنطقتك، أو — وهذا أسهل — <strong>افحص الأمونيا بعد تغيير الماء مباشرة</strong>. إذا ظهرت أمونيا بماء نظيف معالَج، فشبكتك على الأغلب كلورامين ومعالِجك ما يغطيه.</blockquote>
<p>هذا فحص عملي يعطيك جواباً عن مصدرك أنت، بدل تعميم على بلد كامل. شرائط الفحص واختبارات الأمونيا متوفرة في AQUAVO ضمن قسم الفحص والمراقبة.</p>

<h2>طريقة "اتركه تحت الشمس" — متى تنفع ومتى لا</h2>
<p>ترك الماء مكشوفاً يوماً أو يومين يطيّر <strong>الكلور الحر</strong> فعلاً، والتهوية تسرّع ذلك. لكنها:</p>
<ul>
  <li><strong>لا تعمل مع الكلورامين</strong> مهما طال الوقت.</li>
  <li>لا تزيل المعادن الثقيلة المتسربة من الأنابيب القديمة.</li>
  <li>غير عملية بصيف العراق: الماء المكشوف يسخن ويتبخر، وتصير تضيف ماءً حاراً لحوض أصلاً تحت ضغط حراري.</li>
</ul>
<p>فهي حل قديم يشتغل بحالة واحدة، ومعالج المياه أسرع وأضمن بكل الحالات.</p>

<h2>الاستخدام العملي</h2>
<ol>
  <li><strong>عالج الماء قبل إضافته، لا بعده.</strong> إضافة ماء حنفية للحوض ثم إضافة المعالج تعني إن الأسماك والبكتيريا تعرّضت للكلور فعلاً ولو لدقائق.</li>
  <li><strong>الجرعة على حجم الماء المضاف</strong>، مو على حجم الحوض كله — إلا إذا نصّت العبوة غير ذلك.</li>
  <li><strong>قرّب حرارة الماء الجديد من حرارة الحوض</strong> قبل الإضافة. الصدمة الحرارية سبب إجهاد قائم بذاته.</li>
  <li><strong>اغسل ميديا الفلتر بماء الحوض</strong>، لا تحت الحنفية أبداً — الكلور يقتل البكتيريا النافعة، وهذا أشهر سبب لانهيار حوض مستقر.</li>
</ol>
<p>معالج المياه ومزيل الكلور متوفران في AQUAVO ضمن قسم معالجة المياه.</p>

<h2>ليش هذا مهم أكثر مما يبدو</h2>
<p>الكلور ما يؤذي السمكة فقط، بل يضرب <strong>الترشيح البايولوجي</strong>. البكتيريا اللي تحوّل الأمونيا تعيش على سطوح الفلتر والحصى، وغسلها بماء الحنفية يعيد حوضك لحالة حوض جديد بلا ما تنتبه — ثم ترتفع الأمونيا بعد أيام وأنت ما غيّرت شيئاً ظاهرياً.</p>
<p>الآلية كاملة في <a href="/blog/nitrogen-cycle-simple-arabic-explained">الدورة البيولوجية</a>، وإذا ارتفعت القراءات فعلاً فالإجراء الفوري في <a href="/blog/ammonia-spike-emergency-treatment">ارتفاع الأمونيا المفاجئ</a>. ولحساب كمية الماء المطلوب معالجتها استخدم <a href="/calculators">الحاسبات</a>.</p>'
 WHERE slug = 'how-to-treat-tap-water-for-fish-iraq';

-- aquarium-heaters-cheap-vs-premium
--   The old page was 93 words: a wattage rule of thumb and a link to a calculator. The rewrite gives the wattage as a table that accounts for room temperature, explains that two smaller heaters beat one large one because a stuck heater then lacks the power to cook the tank, and reframes the cheap-versus-good question around failure mode — the real risk is a thermostat that sticks ON, which kills by suffocation rather than heat.
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM blog_posts WHERE slug = 'aquarium-heaters-cheap-vs-premium' AND is_published
     AND length(content) = 623;
  IF n <> 1 THEN RAISE EXCEPTION 'aquarium-heaters-cheap-vs-premium: missing or changed since drafting'; END IF;
END $$;

UPDATE blog_posts SET title = 'السخان الرخيص مقابل الجيد: الفرق في طريقة الفشل، لا في التسخين', excerpt = 'كل سخان يسخّن؛ الفرق في دقة المنظّم وفي ماذا يحدث حين يتعطل. السخان الذي يعلق شغالاً أخطر من الذي ينطفئ، وهذا ما يحدد ما تشتريه.', content = '<h2>السخان مو للتدفئة — للثبات</h2>
<p>أغلب الناس تشتري السخان لترفع الحرارة بالشتاء. وظيفته الحقيقية أهم: <strong>يمنع التذبذب</strong>. السمكة الاستوائية تتحمل ٢٤ أو ٢٧ درجة، لكنها ما تتحمل أن تنزل من ٢٧ لـ٢١ كل ليلة وترجع كل نهار.</p>
<p>هذا التذبذب اليومي هو المحفّز الأول لمرض النقط البيضاء، ولهذا تنتشر الإصابات بالربيع والخريف — مو بعز الشتاء — لما يطفئ الناس السخان لأن النهار دفأ. التفاصيل في <a href="/blog/common-fish-diseases-white-spot">علاج النقط البيضاء</a>.</p>
<blockquote>القاعدة: خلّ السخان شغالاً طول السنة على منظم حرارة مضبوط على ٢٦ درجة. راح يفصل تلقائياً بالصيف ويشتغل بالليالي الباردة فقط. إطفاؤه موسمياً غلط، مو توفير.</blockquote>

<h2>كم واط تحتاج</h2>
<p>القاعدة الشائعة: حوالي <strong>١ واط لكل لتر</strong>. لكنها قاعدة تقريبية تفترض غرفة معتدلة — وكلما كان الفرق بين حرارة الغرفة وحرارة الحوض أكبر، احتجت قدرة أعلى.</p>
<table>
  <tr><th>حجم الحوض</th><th>غرفة مدفّأة</th><th>غرفة باردة أو حوض قرب شباك</th></tr>
  <tr><td>٥٠ لتر</td><td>٥٠ واط</td><td>٧٥–١٠٠ واط</td></tr>
  <tr><td>١٠٠ لتر</td><td>١٠٠ واط</td><td>١٥٠–٢٠٠ واط</td></tr>
  <tr><td>٢٠٠ لتر</td><td>٢٠٠ واط</td><td>سخانان بدل واحد</td></tr>
</table>
<p><strong>سخانان أصغر أفضل من سخان واحد كبير</strong> في الأحواض الكبيرة، لسببين: إذا فشل واحد ما ينهار الحوض، وإذا علق واحد على وضع التشغيل فقدرته وحدها لا تكفي لطبخ الحوض. ولحساب حجم حوضك بدقة استخدم <a href="/calculators">الحاسبات</a>.</p>

<h2>الفرق الحقيقي بين الرخيص والجيد</h2>
<p>الفرق مو بالتسخين — كل سخان يسخّن. الفرق بالمنظِّم (Thermostat) وبطريقة الفشل:</p>
<table>
  <tr><th></th><th>سخان رديء</th><th>سخان جيد</th></tr>
  <tr><td>دقة المنظم</td><td>انحراف واسع عن الرقم المكتوب</td><td>انحراف ضيق ومتكرر بثبات</td></tr>
  <tr><td>طريقة الفشل</td><td>غالباً يعلق <strong>على وضع التشغيل</strong></td><td>يفصل عند الخلل</td></tr>
  <tr><td>الغلاف</td><td>زجاج رقيق ينكسر بالصدمة الحرارية</td><td>كوارتز أو ستانلس</td></tr>
</table>
<p>وطريقة الفشل هي بيت القصيد. السخان اللي ينطفئ يخلي الحوض يبرد ببطء وتلاحظ وتتصرف. السخان اللي <strong>يعلق شغالاً</strong> يرفع الحرارة بهدوء حتى ٣٥ أو أكثر، وتكتشفها لما تكون الأسماك تلهث على السطح — والحرارة العالية تخنق قبل ما تحرق، لأن الماء الحار يحمل أوكسجين أقل. الآلية في <a href="/blog/protect-fish-iraqi-summer-50-degrees">حماية الأسماك من الحرارة</a>.</p>

<h2>الاحتياط اللي يوفر عليك حوضاً كاملاً</h2>
<ul>
  <li><strong>ميزان حرارة منفصل، دائماً.</strong> لا تثق برقم السخان نفسه — لو انحرف منظّمه فأنت تقرأ خطأه لا حقيقة الماء. موازين الحرارة الزجاجية والرقمية متوفرة في AQUAVO ضمن قسم الفحص والمراقبة، وهي أرخص قطعة تشتريها وأكثرها فائدة.</li>
  <li><strong>شوف الميزان يومياً</strong> ولو نظرة سريعة. تغيّر درجتين إشارة مبكرة على منظّم بدأ يفشل.</li>
  <li><strong>لا تشغّل السخان خارج الماء</strong> ولا تسحبه من الماء وهو شغال — الصدمة الحرارية تكسر الغلاف الزجاجي.</li>
  <li><strong>أطفئه قبل تغيير الماء</strong> إذا كان مستوى الماء سينزل تحته، وانتظر بعد إعادة الملء قبل تشغيله.</li>
  <li><strong>بعد انقطاع الكهرباء الطويل</strong> راقب الحرارة عند رجوعها — التغيّر المفاجئ بالاتجاهين مضر. شوف <a href="/blog/power-outage-emergency-aquarium-tools">أدوات الطوارئ عند انقطاع الكهرباء</a>.</li>
</ul>

<h2>الخلاصة</h2>
<p>اشترِ قدرة تناسب حجم حوضك وبرودة غرفتك، وسخانين بدل واحد إذا كان الحوض كبيراً، وميزان حرارة منفصل مهما كان السخان. ثم اتركه شغالاً طول السنة على ٢٦ درجة. الثبات هو المنتج، والحرارة مجرد وسيلة له.</p>'
 WHERE slug = 'aquarium-heaters-cheap-vs-premium';

-- Post-flight: every rewrite carries its structure, nothing was unpublished,
-- and exactly the drafted rows changed.
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM blog_posts
   WHERE slug IN ('common-fish-diseases-white-spot', 'how-to-treat-tap-water-for-fish-iraq', 'aquarium-heaters-cheap-vs-premium')
     AND is_published AND length(content) > 3000
     AND content LIKE '%<table%' AND content LIKE '%href="/blog/%';
  IF n <> 3 THEN RAISE EXCEPTION 'only % of 3 rewrites carry their structure', n; END IF;

  SELECT count(*) INTO n FROM blog_posts WHERE is_published;
  IF n <> 75 THEN RAISE EXCEPTION 'publication count moved: %', n; END IF;

  SELECT count(*) INTO n FROM blog_posts b JOIN blog_posts_backup_deepen_b1_20260902 k USING (id)
   WHERE b.content IS DISTINCT FROM k.content;
  IF n <> 3 THEN RAISE EXCEPTION 'expected 3 content rewrites, got %', n; END IF;

  -- The one guard rule SQL can state faithfully. The context-sensitive rules
  -- are enforced by gate-draft.ts before this file exists and by the three
  -- corpus audits after it is applied.
  SELECT count(*) INTO n FROM blog_posts
   WHERE slug IN ('common-fish-diseases-white-spot', 'how-to-treat-tap-water-for-fish-iraq', 'aquarium-heaters-cheap-vs-premium')
     AND content ~ '[一-鿿぀-ヿ가-힯Ѐ-ӿऀ-ॿ฀-๿֐-׿Ā-ɏḀ-ỿ]';
  IF n <> 0 THEN RAISE EXCEPTION 'a rewrite introduced stray script'; END IF;

  -- The claim this batch exists to remove must not survive.
  SELECT count(*) INTO n FROM blog_posts
   WHERE slug = 'how-to-treat-tap-water-for-fish-iraq'
     AND content LIKE '%' || 'تعمدت محطات التنقية' || '%';
  IF n <> 0 THEN RAISE EXCEPTION 'the unsourced Iraq-wide chloramine claim survived'; END IF;
END $$;

COMMIT;

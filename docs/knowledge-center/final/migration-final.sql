-- Migration ID: kc-final-expansion-20260903
-- Target:       Neon production, blog_posts
--               (4 inserts, 1 rewrite, 18 deepenings)
-- Rollback:     rollback-final.sql
--
-- Final expansion phase. One discovery pass over a 166-concept map of the whole
-- freshwater domain, matched against all 111 live articles, produced this batch.
-- Roadmap: ROADMAP.md. Research: dossiers.md.
--
-- The map returned 100 OWNED, 34 MENTION, 32 ABSENT. Hand-verification of the
-- MENTION and ABSENT rows overturned four of the scan's own results, which is
-- why nothing here was published on scan output alone:
--   winter heating      scan said gap    -> OWNED (pattern missed the title)
--   mouth fungus        scan said absent -> ALREADY COVERED (it is columnaris)
--   shrimp moulting     scan said absent -> partially covered, demoted to DEEPEN
--   eye problems        scan said absent -> ABSENT confirmed (diagnosis hub has
--                                           zero eye mentions), so it ships
--
-- NEW #1 choosing-healthy-fish-in-store: the corpus starts after purchase.
-- Quarantine owns after, acclimation owns the bag, the scam article owns the
-- seller; nothing owned assessing the fish itself. States explicitly that a
-- visual check does NOT replace quarantine, because it would otherwise be read
-- that way.
--
-- NEW #2 aquarium-hygiene-and-human-safety: zero coverage across the corpus,
-- which repeatedly tells readers to put hands in tank water and never mentions
-- covering cuts. The only gap whose consequence lands on the keeper. Names no
-- human medication, no dose, no diagnosis and no prevalence figure; its single
-- actionable instruction is to tell a doctor about the aquarium.
--
-- NEW #3 fish-that-outgrow-home-tanks: pangasius, shark-types, lifespan and
-- rehoming were all zero. Publishes no per-species centimetre figures, because
-- sources vary; uses relative framing instead. Refuses release into the wild.
--
-- NEW #4 fish-eye-problems: one eye vs both is a clean differential a keeper
-- can apply unaided. Frames exophthalmia as a sign, not a disease, matching the
-- corrected buoyancy article. Declines to publish an Epsom-salt protocol: the
-- practice is widely repeated but the evidence is thin and doses conflict, so
-- it is flagged as contested and undosed.
--
-- REWRITE ph-level-iraqi-tap-water-fish: 2,328 characters of filler with a
-- promotional block. gh-kh-water-hardness-guide already owns what the numbers
-- mean, so a new page would cannibalise it; the rewrite owns the DECISION
-- instead. Framing is strictly measured-water -- no blanket claim about Iraqi
-- tap water appears, and the corpus was audited to confirm none exists today.
--
-- All 23 targets passed script-purity, editorial, business-truth, link
-- resolution and block-tag balance via scripts/gate-draft.ts, and the projected
-- post-migration graph was checked before this file was applied.

BEGIN;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM blog_posts WHERE is_published;
  IF n <> 111 THEN RAISE EXCEPTION 'expected 111 published posts, found %', n; END IF;

  SELECT count(*) INTO n FROM blog_posts WHERE slug IN ('choosing-healthy-fish-in-store', 'aquarium-hygiene-and-human-safety', 'fish-that-outgrow-home-tanks', 'fish-eye-problems');
  IF n <> 0 THEN RAISE EXCEPTION 'one of the new slugs already exists'; END IF;

  SELECT count(*) INTO n FROM blog_posts WHERE slug = 'ph-level-iraqi-tap-water-fish' AND is_published
     AND length(content) = 2328;
  IF n <> 1 THEN RAISE EXCEPTION 'ph-level-iraqi-tap-water-fish: target missing or changed since drafting'; END IF;
  SELECT count(*) INTO n FROM blog_posts WHERE slug = 'aquarium-water-change-guide' AND is_published
     AND length(content) = 4011;
  IF n <> 1 THEN RAISE EXCEPTION 'aquarium-water-change-guide: target missing or changed since drafting'; END IF;
  SELECT count(*) INTO n FROM blog_posts WHERE slug = 'why-fish-die-suddenly-rescue-guide' AND is_published
     AND length(content) = 2452;
  IF n <> 1 THEN RAISE EXCEPTION 'why-fish-die-suddenly-rescue-guide: target missing or changed since drafting'; END IF;
  SELECT count(*) INTO n FROM blog_posts WHERE slug = 'fish-treatment-protocol' AND is_published
     AND length(content) = 4944;
  IF n <> 1 THEN RAISE EXCEPTION 'fish-treatment-protocol: target missing or changed since drafting'; END IF;
  SELECT count(*) INTO n FROM blog_posts WHERE slug = 'internal-fish-parasites' AND is_published
     AND length(content) = 3592;
  IF n <> 1 THEN RAISE EXCEPTION 'internal-fish-parasites: target missing or changed since drafting'; END IF;
  SELECT count(*) INTO n FROM blog_posts WHERE slug = 'aquarium-fish-feeding-guide' AND is_published
     AND length(content) = 3525;
  IF n <> 1 THEN RAISE EXCEPTION 'aquarium-fish-feeding-guide: target missing or changed since drafting'; END IF;
  SELECT count(*) INTO n FROM blog_posts WHERE slug = 'algae-war-guide' AND is_published
     AND length(content) = 4033;
  IF n <> 1 THEN RAISE EXCEPTION 'algae-war-guide: target missing or changed since drafting'; END IF;
  SELECT count(*) INTO n FROM blog_posts WHERE slug = 'aquarium-placement-and-stand' AND is_published
     AND length(content) = 3682;
  IF n <> 1 THEN RAISE EXCEPTION 'aquarium-placement-and-stand: target missing or changed since drafting'; END IF;
  SELECT count(*) INTO n FROM blog_posts WHERE slug = 'aquarium-care-while-traveling' AND is_published
     AND length(content) = 3449;
  IF n <> 1 THEN RAISE EXCEPTION 'aquarium-care-while-traveling: target missing or changed since drafting'; END IF;
  SELECT count(*) INTO n FROM blog_posts WHERE slug = 'filter-types-guide' AND is_published
     AND length(content) = 3598;
  IF n <> 1 THEN RAISE EXCEPTION 'filter-types-guide: target missing or changed since drafting'; END IF;
  SELECT count(*) INTO n FROM blog_posts WHERE slug = 'hardscape-rock-arrangement-visual-depth' AND is_published
     AND length(content) = 2674;
  IF n <> 1 THEN RAISE EXCEPTION 'hardscape-rock-arrangement-visual-depth: target missing or changed since drafting'; END IF;
  SELECT count(*) INTO n FROM blog_posts WHERE slug = 'air-pumps-decoration-or-necessity' AND is_published
     AND length(content) = 4432;
  IF n <> 1 THEN RAISE EXCEPTION 'air-pumps-decoration-or-necessity: target missing or changed since drafting'; END IF;
  SELECT count(*) INTO n FROM blog_posts WHERE slug = 'transporting-fish-and-aquarium' AND is_published
     AND length(content) = 3011;
  IF n <> 1 THEN RAISE EXCEPTION 'transporting-fish-and-aquarium: target missing or changed since drafting'; END IF;
  SELECT count(*) INTO n FROM blog_posts WHERE slug = 'aquarium-shrimp-snails-guide' AND is_published
     AND length(content) = 3277;
  IF n <> 1 THEN RAISE EXCEPTION 'aquarium-shrimp-snails-guide: target missing or changed since drafting'; END IF;
  SELECT count(*) INTO n FROM blog_posts WHERE slug = 'how-to-clean-aquarium-properly' AND is_published
     AND length(content) = 3064;
  IF n <> 1 THEN RAISE EXCEPTION 'how-to-clean-aquarium-properly: target missing or changed since drafting'; END IF;
  SELECT count(*) INTO n FROM blog_posts WHERE slug = 'aquarium-water-flow' AND is_published
     AND length(content) = 3436;
  IF n <> 1 THEN RAISE EXCEPTION 'aquarium-water-flow: target missing or changed since drafting'; END IF;
  SELECT count(*) INTO n FROM blog_posts WHERE slug = 'fish-disease-symptoms-diagnosis' AND is_published
     AND length(content) = 3404;
  IF n <> 1 THEN RAISE EXCEPTION 'fish-disease-symptoms-diagnosis: target missing or changed since drafting'; END IF;
  SELECT count(*) INTO n FROM blog_posts WHERE slug = 'how-many-fish-in-aquarium' AND is_published
     AND length(content) = 3877;
  IF n <> 1 THEN RAISE EXCEPTION 'how-many-fish-in-aquarium: target missing or changed since drafting'; END IF;
  SELECT count(*) INTO n FROM blog_posts WHERE slug = 'quarantine-new-fish-guide' AND is_published
     AND length(content) = 3565;
  IF n <> 1 THEN RAISE EXCEPTION 'quarantine-new-fish-guide: target missing or changed since drafting'; END IF;
END $$;

CREATE TABLE blog_posts_backup_final_20260903 AS
SELECT id, slug, title, excerpt, content, is_published, now() AS backed_up_at
  FROM blog_posts;

INSERT INTO blog_posts (title, slug, excerpt, content, category, icon_name, author, is_published, published_at)
VALUES ('اختيار سمكة سليمة قبل الشراء: ما تنظر إليه بالمتجر', 'choosing-healthy-fish-in-store', 'أرخص علاج هو سمكة ما اشتريتها. انظر للمنظومة كلها لا للسمكة وحدها، واطلب أن تشوفها تأكل — وهذا لا يغني عن الحجر الصحي.', '<h2>أرخص علاج هو سمكة ما اشتريتها</h2>
<p>كل ما بهذا الموقع عن الأمراض يبدأ بعد ما تصل السمكة لبيتك. لكن أكبر قرار وقائي يصير قبل ذلك بدقائق: وأنت واقف قدام حوض المتجر. السمكة اللي ما تشتريها ما تقدر تنقل شيئاً لحوضك.</p>
<blockquote>ومع ذلك — ولأن هذا يُساء فهمه دائماً — <strong>الفحص البصري لا يغني عن <a href="/blog/quarantine-new-fish-guide">الحجر الصحي</a></strong>. سمكة تبدو سليمة تماماً قد تحمل عدوى كامنة لا تظهر بالعين. الفحص يقلل الاحتمال؛ الحجر يتعامل مع ما تبقّى منه.</blockquote>

<h2>انظر للحوض كله، لا للسمكة وحدها</h2>
<p>هذي النقطة يتخطاها أغلب المشترين. كثير من المتاجر تشغّل عدة أحواض على منظومة فلترة واحدة، فالماء يدور بينها كلها. وإذا كان الأمر كذلك، فسمكة مريضة بحوض مجاور تعنيك أنت.</p>
<ul>
  <li><strong>اسأل إذا كانت الأحواض مشتركة بالفلترة</strong> — سؤال بسيط ويغيّر القرار. ليست كل المتاجر تعمل هكذا.</li>
  <li><strong>سمكة ميتة أو محتضرة بأي حوض متصل</strong> سبب كافٍ للتأجيل، حتى لو كانت السمكة اللي تريدها تبدو ممتازة.</li>
  <li><strong>ماء عكر أو رائحة قوية</strong> بالمنظومة إشارة على حمل زائد أو إهمال.</li>
  <li><strong>أسماك تحتك بالديكور</strong> بأي حوض متصل — الحكّة سلوك يسبق الأعراض المرئية، مشروح بـ<a href="/blog/external-fish-parasites">الطفيليات الخارجية</a>.</li>
</ul>

<h2>ما تنظر إليه بالسمكة نفسها</h2>
<table>
  <tr><th>العلامة</th><th>ماذا تعني</th></tr>
  <tr><td>زعانف مطوية على الجسم</td><td>توتر أو مرض — السمكة السليمة تفرد زعانفها</td></tr>
  <tr><td>تنفس سريع أو لاهث</td><td>مشكلة خياشيم أو ماء — لا تشتريها</td></tr>
  <tr><td>بطن غائر أو ظهر بارز</td><td>هزال — قد يعني <a href="/blog/internal-fish-parasites">طفيليات داخلية</a></td></tr>
  <tr><td>براز أبيض خيطي معلّق</td><td>إشارة هضمية تستحق التأجيل</td></tr>
  <tr><td>نقط أو غبار أو زوائد</td><td>طفيلي ظاهر — الحوض كله مشكوك فيه</td></tr>
  <tr><td>عين منتفخة أو غائمة</td><td><a href="/blog/fish-eye-problems">مشاكل العين</a> — تحتاج سبباً معروفاً قبل الشراء</td></tr>
  <tr><td>احمرار أو تقرّح أو بقع دموية</td><td>إصابة أو عدوى</td></tr>
  <tr><td>انحناء بالعمود الفقري</td><td>تشوّه دائم بالعادة</td></tr>
  <tr><td>خمول أو وقوف بزاوية غريبة</td><td>راقبها دقيقة قبل الحكم</td></tr>
</table>
<p>ولا تحكم من نظرة واحدة. قف دقيقة كاملة وراقب: السمكة السليمة تتحرك بثقة، تستكشف، وتتفاعل مع حركة الحوض.</p>

<h2>الفحص الأقوى: اطلب أن تشوفها تأكل</h2>
<p>هذا أفضل اختبار متاح لك بالمتجر، وأسهله. السمكة اللي ترفض الأكل قدامك نادراً ما تتحسن بعد إجهاد النقل — والنقل نفسه ضغط إضافي مشروح بـ<a href="/blog/transporting-fish-and-aquarium">نقل الأسماك</a>.</p>
<ul>
  <li><strong>اسأل متى وصلت.</strong> السمكة اللي وصلت اليوم ما زالت بذروة إجهاد الشحن. التأجيل بضعة أيام يعطيك معلومة أفضل ويعطيها فرصة.</li>
  <li><strong>اسأل عن حجمها البالغ</strong> — وتحقق بنفسك، لأن كثير من الأسماك تُباع بجزء صغير من حجمها النهائي. راجع <a href="/blog/fish-that-outgrow-home-tanks">أسماك تنباع صغيرة</a>.</li>
  <li><strong>اسأل عن ماء المتجر</strong> إن أمكن. فرق كبير بالقساوة أو الحرارة يعني أقلمة أبطأ — <a href="/blog/acclimating-new-fish">الأقلمة</a>.</li>
</ul>

<h2>متى تمشي وما تشتري</h2>
<p>ليس عيباً أن تخرج بلا شراء. القائمة القصيرة اللي تستحق الانسحاب:</p>
<ol>
  <li><strong>أي علامة مرضية على أي سمكة بالمنظومة نفسها.</strong></li>
  <li><strong>السمكة لا تأكل</strong> ولا يوجد تفسير مقنع.</li>
  <li><strong>حجمها البالغ لا يناسب حوضك</strong> — هذي ليست مشكلة صحة، لكنها أسوأ خطأ شراء على المدى الطويل، واحسبها بـ<a href="/blog/how-many-fish-in-aquarium">كم سمكة يتحمل حوضك</a>.</li>
  <li><strong>حوضك غير جاهز أصلاً</strong> — ما زال يدوّر — <a href="/blog/nitrogen-cycle-simple-arabic-explained">الدورة البيولوجية</a>.</li>
</ol>
<p>وإذا اشتريت، فالخطوة التالية ليست إدخالها للحوض مباشرة: <a href="/blog/quarantine-new-fish-guide">الحجر الصحي</a> ثم <a href="/blog/acclimating-new-fish">الأقلمة</a>. ولاختيار جهة الشراء عموماً، خصوصاً بالبيع الإلكتروني، راجع <a href="/blog/avoid-fake-fish-stores-instagram-scams">المتاجر الوهمية</a>.</p>', 'أدلة التسوق', 'Fish',
        'AQUAVO Editorial Team', TRUE, now());

INSERT INTO blog_posts (title, slug, excerpt, content, category, icon_name, author, is_published, published_at)
VALUES ('نظافة الحوض وسلامتك أنت: احتياطات بسيطة', 'aquarium-hygiene-and-human-safety', 'الهواية آمنة والمشاكل غير شائعة، لكن قاعدة واحدة تستحق المعرفة: الجلد المجروح لا يدخل الماء. ولو ظهر التهاب لا يتحسن، أخبر طبيبك أن عندك حوضاً.', '<h2>الهواية آمنة — وفيها احتياط واحد يستحق المعرفة</h2>
<p>كل ما بهذا الموقع تقريباً يتكلم عن سلامة السمكة. هذا المقال عن سلامتك أنت. لأن الحوض يتطلب منك إدخال يدك بالماء باستمرار — سيفون، تنظيف زجاج، زراعة نبات، إمساك سمكة — وهذي نقطة تماس يومية بين جلدك وبيئة مائية دافئة.</p>
<blockquote>الخلاصة المتوازنة: تربية الأسماك هواية آمنة، والمشاكل الصحية المرتبطة بها <strong>غير شائعة</strong>. لكن الاحتياط بسيط ومجاني، والمعرفة تفيد لو حصل شي — لأن الطبيب قد لا يسأل عن الحوض إذا ما ذكرته أنت.</blockquote>

<h2>القاعدة الأساسية: الجلد المجروح لا يدخل الماء</h2>
<p>أهم نقطة بالمقال كله. الماء الدافئ يحتوي كائنات دقيقة طبيعية، والجلد السليم حاجز فعّال ضدها. المشكلة تبدأ لمّا يكون الحاجز مكسوراً.</p>
<ul>
  <li><strong>جرح أو خدش أو تشقق بيدك؟</strong> غطِّه بلاصق مقاوم للماء، أو استخدم قفازاً طويلاً يغطي الساعد، أو أجّل العمل.</li>
  <li><strong>اغسل يديك بالماء والصابون</strong> بعد أي تعامل مع الحوض — قبل الأكل وقبل لمس الوجه.</li>
  <li><strong>انتبه للخدوش أثناء العمل نفسه.</strong> حواف الديكور والصخور والزجاج تجرح بسهولة، وأنت منشغل.</li>
  <li><strong>لا تشفط السيفون بفمك إطلاقاً.</strong> ابدأ التدفق بالغمر والرفع أو بمضخة يدوية. هذي عادة شائعة ولا مبرر لها.</li>
</ul>

<h2>ما الذي قد يحصل، وكيف يبدو</h2>
<p>من المعروف طبياً أن التعامل مع مياه الأحواض قد ينقل — عبر جرح — التهاباً جلدياً بطيء التطور يُعرف بأسماء منها "ورم حبيبي لأحواض الأسماك". وهو <strong>غير شائع</strong>، لكن له صفة عملية تستحق المعرفة:</p>
<table>
  <tr><th>الملمح</th><th>الوصف العام</th></tr>
  <tr><td>مكانه</td><td>غالباً اليد أو الساعد — منطقة التماس</td></tr>
  <tr><td>شكله</td><td>عقدة أو تقرّح موضعي يتطور ببطء</td></tr>
  <tr><td>سرعته</td><td>بطيء الظهور وبطيء الاستجابة للعلاج المعتاد</td></tr>
  <tr><td>لماذا يهمك</td><td>بطء الاستجابة هو ما يجعل ذكر الحوض للطبيب مهماً</td></tr>
</table>
<blockquote>وهنا حدود ما نستطيع قوله: <strong>هذا المقال لا يشخّص ولا يصف علاجاً.</strong> لا نذكر دواءً بشرياً ولا جرعة. الشي الوحيد الذي نقوله بثقة: إذا ظهر عندك التهاب جلدي لا يتحسن كالمعتاد وأنت تتعامل مع حوض، <strong>أخبر طبيبك أن عندك حوض أسماك</strong>. هذي المعلومة وحدها قد تختصر عليه الكثير، وهي كل ما نستطيع تقديمه.</blockquote>

<h2>احتياطات عملية بلا مبالغة</h2>
<ol>
  <li><strong>خصّص أدوات للحوض</strong> — دلو وإسفنجة وسيفون لا تُستخدم لغير الحوض.</li>
  <li><strong>قفاز طويل عند العمل المطوّل</strong> أو عند وجود أي جرح.</li>
  <li><strong>لا تغسل معدات الحوض بحوض المطبخ</strong> حيث يُحضَّر الطعام؛ استخدم مكاناً آخر واغسله بعدها.</li>
  <li><strong>اغسل يديك بعد كل تعامل</strong> — أبسط إجراء وأكثره فعالية.</li>
  <li><strong>إذا كان عندك وضع صحي يؤثر على المناعة</strong>، اسأل طبيبك عن احتياطات إضافية تناسب حالتك. هذا سؤال طبي شخصي لا نستطيع الإجابة عنه هنا.</li>
</ol>

<h2>الأطفال والحوض</h2>
<p>الحوض تجربة تعليمية ممتازة للطفل. الاحتياط نفسه ينطبق ولا يزيد: يد مغسولة بعد اللمس، وعدم إدخال اليد بجروح، وإشراف عند التعامل مع الماء أو المعدات الكهربائية. وللجانب الكهربائي تحديداً راجع <a href="/blog/aquarium-electrical-safety">السلامة الكهربائية حول الحوض</a>.</p>

<h2>الاتجاه المعاكس أيضاً</h2>
<p>كما أن ماء الحوض يستحق احتياطاً منك، فأنت أيضاً مصدر خطر على الحوض: كريمات اليدين والصابون والمعطرات وبقايا المنظفات تدخل الماء من يدك مباشرة. اشطف يديك بماء نظيف قبل إدخالها إن كان عليها أي منتج — و<a href="/blog/aquarium-airborne-toxins">سموم الهواء</a> تشرح المسار الآخر.</p>
<p>ولا تعطِ أسماكك دواءً بشرياً بأي حال — الاتجاه المقلوب من هذا المقال مشروح بـ<a href="/blog/human-medicine-dangers-for-fish">مخاطر الأدوية البشرية على الأسماك</a>. وللنظافة الروتينية للحوض نفسه راجع <a href="/blog/how-to-clean-aquarium-properly">تنظيف الحوض</a> و<a href="/blog/aquarium-water-change-guide">تغيير الماء</a>.</p>', 'للمبتدئين', 'Shield',
        'AQUAVO Editorial Team', TRUE, now());

INSERT INTO blog_posts (title, slug, excerpt, content, category, icon_name, author, is_published, published_at)
VALUES ('أسماك تنباع صغيرة ولا تصلح لحوض بيتي', 'fish-that-outgrow-home-tanks', 'السمكة لا تنمو بقدر حوضها — تتقزّم، والتقزّم ضرر دائم. الأنواع اللي يتكرر فيها هذا، والخيارات الواقعية إذا صارت المشكلة عندك فعلاً.', '<h2>حوض المتجر يخفي الحقيقة</h2>
<p>السمكة اللي تشوفها بحجم إصبعك قد تكون طفلاً لسمكة تتجاوز طول ذراعك. هذا ليس استثناءً نادراً — هو نمط بيع كامل: أنواع نهرية كبيرة تُعرض صغيرة، بأحواض صغيرة، بسعر منخفض، بلا أي إشارة لحجمها البالغ.</p>
<blockquote>وقبل أي شي، تصحيح خرافة: <strong>السمكة لا تنمو "بقدر حوضها"</strong>. الحوض الضيق لا يعطي سمكة صغيرة سليمة — يعطي سمكة متقزّمة، والتقزّم ضرر دائم لا يُعوَّض، مشروح بـ<a href="/blog/raising-fish-fry">تربية الصغار</a>.</blockquote>

<h2>الأنواع اللي يتكرر فيها هذا</h2>
<table>
  <tr><th>ما يُباع</th><th>ما يصير</th></tr>
  <tr><td>"قرش المياه العذبة" / بانجاسيوس</td><td>سمكة نهرية ضخمة وسبّاحة — من أكثر ما يُباع بوصف مضلل</td></tr>
  <tr><td>البليكو الشائع</td><td>أضعاف حجم البيع، ومنتج فضلات كبير</td></tr>
  <tr><td>القرموط أحمر الذيل</td><td>من أكبر ما يدخل تجارة الزينة</td></tr>
  <tr><td><a href="/blog/oscar-fish-care-guide-water-dog">الأوسكار</a></td><td>كبير وترابي وطويل العمر</td></tr>
  <tr><td><a href="/blog/arowana-fish-care-guide-prices">الأروانا</a></td><td>يحتاج حوضاً استثنائياً بالطول</td></tr>
  <tr><td>لوتش المهرج</td><td>يكبر كثيراً ويعيش سنوات — <a href="/blog/aquarium-loaches-guide">تفصيل</a></td></tr>
  <tr><td><a href="/blog/koi-fish-outdoor-pond-building-tips">الكوي</a></td><td>سمكة بركة، لا سمكة حوض منزلي</td></tr>
</table>
<p>ولا ننشر أرقاماً بالسنتيمتر لكل نوع: المصادر تختلف والظروف تغيّر النتيجة. القاعدة العملية أدق من أي رقم — <strong>اسأل عن الحجم البالغ قبل الشراء، وافترض أنه أكبر مما يبدو</strong>.</p>

<h2>ليش هذا أسوأ من مجرد "حوض صغير"</h2>
<p>المشكلة ليست جمالية. السمكة اللي تتجاوز حوضها تدفع الثمن بأشكال متعددة:</p>
<ul>
  <li><strong>حمل حيوي يتضاعف مع الحجم.</strong> سمكة كبيرة تنتج فضلات أكثر بكثير، فيتحول الحوض لمعركة أمونيا دائمة — <a href="/blog/ammonia-spike-emergency-treatment">ارتفاع الأمونيا</a>.</li>
  <li><strong>مساحة سباحة غير كافية</strong> للأنواع النهرية النشيطة، فتصير خاملة أو تصطدم بالزجاج.</li>
  <li><strong>عدوانية تتصاعد مع البلوغ</strong> تجاه جيران كانوا مناسبين وهي صغيرة — <a href="/blog/aquarium-fish-aggression">العدوانية والمطاردة</a>.</li>
  <li><strong>ضغط على المعدات</strong> ما صُمّمت لهذا الحمل — <a href="/blog/aquarium-placement-and-stand">وزن الحوض والمكان</a>.</li>
</ul>
<p>ولحساب ما يتحمله حوضك فعلاً بالأرقام راجع <a href="/blog/how-many-fish-in-aquarium">كم سمكة يتحمل حوضك</a> — هذا المقال عن قرار الشراء، وذاك عن الحساب.</p>

<h2>السؤالان قبل الشراء</h2>
<ol>
  <li><strong>ما حجمها البالغ؟</strong> اسأل البائع، ثم تحقق من مصدر ثانٍ. البائع قد لا يعرف، وليس بالضرورة سوء نية.</li>
  <li><strong>كم تعيش؟</strong> كثير من هذي الأنواع تعيش سنوات طويلة. أنت لا تشتري زينة لموسم — أنت تلتزم بكائن لسنوات، وهذا يشمل النقل والسفر وتغيير السكن.</li>
</ol>
<p>وإذا كان الجواب لا يناسب حوضك الحالي، فالخيار الأمين هو نوع آخر — وليس "أشتريها وأشوف". راجع <a href="/blog/choosing-healthy-fish-in-store">اختيار سمكة سليمة قبل الشراء</a> و<a href="/blog/5-hardy-fish-for-beginners">أسماك لا تموت بسرعة</a>.</p>

<h2>صارت المشكلة عندك فعلاً — شنو الخيارات؟</h2>
<p>إذا كنت تقرأ هذا متأخراً، فالمقال لا يلومك. البائع لم يخبرك، والمعلومة ما كانت متاحة بسهولة. الخيارات الواقعية:</p>
<ul>
  <li><strong>حوض أكبر</strong> إن كان ممكناً — الحل المباشر، وله كلفة ومساحة ووزن.</li>
  <li><strong>هاوٍ عنده حوض مناسب.</strong> مجتمعات الهواية المحلية أفضل طريق، والسمكة الكبيرة الصحية مرغوبة بالعادة.</li>
  <li><strong>متجر مختص</strong> قد يستلمها أو يساعد بإيجاد بيت. اسأل — الجواب يختلف من مكان لآخر.</li>
</ul>
<blockquote>وخيار واحد مرفوض تماماً: <strong>لا تطلق سمكة بنهر أو بحيرة أو مجرى ماء</strong>. الأنواع الدخيلة تضر البيئة المحلية، والسمكة نفسها غالباً تموت. هذا ليس رأفة — هو ضرر مزدوج.</blockquote>
<p>وإذا نقلتها لبيت آخر فالنقل نفسه يحتاج تحضيراً — <a href="/blog/transporting-fish-and-aquarium">نقل الأسماك والحوض</a>.</p>', 'أدلة التسوق', 'AlertTriangle',
        'AQUAVO Editorial Team', TRUE, now());

INSERT INTO blog_posts (title, slug, excerpt, content, category, icon_name, author, is_published, published_at)
VALUES ('مشاكل عين السمكة: الجحوظ والغشاوة', 'fish-eye-problems', 'عين واحدة أم اثنتان؟ هذا أول سؤال ويوجّه البحث كله: الواحدة تميل لسبب موضعي، والاثنتان للماء أو لحالة أعم. والجحوظ عرَض لا مرض.', '<h2>عين واحدة أم اثنتان؟ هذا أول سؤال</h2>
<p>مشاكل العين من أوضح ما يلاحظه صاحب الحوض: عين بارزة للخارج، أو غشاوة بيضاء تغطي السطح. والخبر الجيد أن العين تعطي مفتاحاً تشخيصياً نادر الوضوح — <strong>عدد العيون المصابة</strong>.</p>
<table>
  <tr><th></th><th>عين واحدة</th><th>العينان معاً</th></tr>
  <tr><td>الاتجاه الأرجح</td><td>سبب موضعي</td><td>سبب عام أو متعلق بالماء</td></tr>
  <tr><td>الأسباب الشائعة</td><td>ارتطام بالديكور، إصابة من مطاردة، التهاب موضعي بعدها</td><td>تدهور جودة الماء، أو حالة جهازية</td></tr>
  <tr><td>أول إجراء</td><td>ابحث عن مصدر الإصابة بالحوض</td><td>افحص الماء فوراً</td></tr>
</table>
<blockquote>وهذا ترجيح لا تشخيص. <strong>جحوظ العين عرَض لا مرض</strong> — نفس المنطق المطبّق على مشاكل الطفو بـ<a href="/blog/fish-bloating-swim-bladder-dropsy">سمكة منتفخة أو تطفو</a>. العدد يوجّه البحث، ولا يحسمه وحده.</blockquote>

<h2>العين البارزة (الجحوظ)</h2>
<p>العين تبرز للخارج بدرجات، من بروز طفيف إلى واضح جداً. المسار العملي:</p>
<ol>
  <li><strong>افحص الماء أولاً</strong> — الأمونيا والنتريت والنترات. هذي خطوة تسبق كل شي بالحوض كله — <a href="/blog/aquarium-test-kit-guide">قراءة الفحص</a>.</li>
  <li><strong>فتّش عن سبب ميكانيكي</strong> إذا كانت عيناً واحدة: حواف حادة بالديكور، أو <a href="/blog/aquarium-fish-aggression">مطاردة</a> من جار.</li>
  <li><strong>راقب بقية الجسم.</strong> إذا رافق الجحوظ بروز حراشف كثمرة الصنوبر فأنت أمام حالة مختلفة وأخطر — راجع مقال الاستسقاء أعلاه فوراً.</li>
  <li><strong>حسّن الظروف وراقب.</strong> كثير من الحالات الموضعية تتحسن بماء نظيف مستقر وبيئة هادئة بلا تدخل دوائي.</li>
</ol>
<p>وإذا احتاج الأمر علاجاً، فالطريقة — العزل والجرعة والمدة — بـ<a href="/blog/fish-treatment-protocol">العلاج الصحيح</a>. ولا ننشر جرعة هنا.</p>

<h2>العين الغائمة</h2>
<p>غشاوة أو بياض على سطح العين. الأسباب المرتبطة بها عملياً:</p>
<ul>
  <li><strong>جودة الماء</strong> — الأكثر شيوعاً وأول ما يُستبعد.</li>
  <li><strong>إصابة أو احتكاك</strong> بسطح خشن.</li>
  <li><strong>تهيّج كيميائي</strong> — بقايا منظفات أو معالجة غير مشطوفة.</li>
  <li><strong>حالة أوسع</strong> تظهر العين كأحد أعراضها.</li>
</ul>
<p>ولا تخلطها ببقعة بيضاء <em>على الجلد</em> قرب العين: تلك مسألة أخرى مشروحة بـ<a href="/blog/fish-fungus-vs-columnaris">الزغب الأبيض</a>، والنقط الصغيرة المنتشرة بـ<a href="/blog/common-fish-diseases-white-spot">النقط البيضاء</a>.</p>

<h2>نقطة خلافية نعرضها كما هي</h2>
<blockquote>يتردد كثيراً استخدام ملح إبسوم لتخفيف الجحوظ. المصادر الهاوية تكرره، لكن الأدلة عليه ضعيفة والجرعات المذكورة متضاربة، ولهذا <strong>لا ننشر جرعة له ولا نوصي به كبروتوكول</strong>. نذكره لأنك ستقابله، ونقول بصراحة إننا لا نملك أساساً كافياً لتوصية. وملح الحوض عموماً له حدوده ومحاذيره — <a href="/blog/aquarium-salt-guide">دليل ملح الحوض</a>.</blockquote>

<h2>المآل: ماذا تتوقع</h2>
<ul>
  <li><strong>التحسن ممكن</strong> إذا عولج السبب مبكراً، خصوصاً بالحالات الموضعية.</li>
  <li><strong>العين المتضررة بشدة قد لا تعود لشكلها</strong>، وقد تفقد السمكة الإبصار بها.</li>
  <li><strong>وسمكة بعين واحدة تعيش حياة طبيعية</strong> بحوض هادئ: تأكل وتتنقل وتتفاعل. هذي ليست حالة تستدعي قراراً قاسياً.</li>
  <li><strong>إصابة العينين معاً مع أعراض أخرى</strong> أخطر، لأنها تشير لسبب أعمق — ابدأ من <a href="/blog/fish-disease-symptoms-diagnosis">دليل تشخيص الأعراض</a>.</li>
</ul>
<p>والوقاية هي نفسها الوقاية من كل شي آخر بالحوض: ماء مستقر، ديكور بلا حواف حادة، وأعداد لا تسبب مطاردة دائمة — <a href="/blog/aquarium-water-change-guide">تغيير الماء</a> و<a href="/blog/how-many-fish-in-aquarium">كم سمكة يتحمل حوضك</a>. وقبل شراء أي سمكة، العين من أول ما يُفحَص — <a href="/blog/choosing-healthy-fish-in-store">اختيار سمكة سليمة</a>.</p>', 'مشاكل وحلول', 'Activity',
        'AQUAVO Editorial Team', TRUE, now());

UPDATE blog_posts SET title = 'قراءاتك عالية: تعدّل الماء أم تختار أسماكاً تناسبه؟', excerpt = 'ثبات ماء لا يناسب مثالياً أفضل من ماء مثالي متذبذب. متى يكون الاختيار أذكى من التعديل، ومتى يصير خلط ماء منزوع المعادن منطقياً فعلاً.', content = '<h2>القرار الذي يسبق كل تعديل</h2>
<p>افحصت ماءك وطلعت القراءات عالية — pH مرتفع، أو GH و KH عاليان. السؤال الطبيعي: كيف أنزّلها؟ لكن السؤال الصحيح يسبقه: <strong>هل تحتاج أن تنزّلها أصلاً؟</strong></p>
<p>وقبل أي شي، اعرف أرقامك فعلاً بدل ما تفترضها. ماء الحنفية يختلف من منطقة لأخرى ومن موسم لآخر، ولا يصح افتراض رقم لأي مدينة أو بلد. القياس بشرائط أو محلول اختبار هو المصدر الوحيد المعتبر — <a href="/blog/aquarium-test-kit-guide">قراءة الفحص</a> وشرح الأرقام نفسها بـ<a href="/blog/gh-kh-water-hardness-guide">دليل GH و KH و TDS</a>.</p>
<blockquote>الجواب العملي لأغلب الحالات: <strong>ثبات ماء لا يناسب مثالياً أفضل من ماء مثالي متذبذب.</strong> الأسماك تتأقلم مع مدى واسع من القساوة والحموضة، لكنها لا تتأقلم مع تغيّر مستمر. مطاردة رقم "مثالي" تنتج تذبذباً، والتذبذب هو ما يقتل.</blockquote>

<h2>مسارك حسب ما قرأته</h2>
<table>
  <tr><th>وضعك</th><th>الخيار الأنسب</th></tr>
  <tr><td>قراءات عالية وثابتة، وما زلت تختار أسماكك</td><td><strong>اختر أنواعاً تناسب هذا الماء</strong> — الأسهل والأنجح</td></tr>
  <tr><td>قراءات عالية وعندك أسماك متأقلمة وبصحة جيدة</td><td><strong>لا تغيّر شيئاً</strong> — سمكة مستقرة لا تحتاج إنقاذاً</td></tr>
  <tr><td>تريد نوعاً يتطلب ماءً طرياً تحديداً (تفريخ مثلاً)</td><td>تعديل مدروس بخلط ماء منزوع المعادن — وليس بالمواد الكيميائية السريعة</td></tr>
  <tr><td>القراءات متذبذبة أصلاً</td><td>عالج سبب التذبذب أولاً قبل أي تعديل</td></tr>
</table>

<h2>ليش الاختيار أفضل من التعديل</h2>
<ul>
  <li><strong>التعديل التزام دائم.</strong> كل تبديل ماء يعيد الخزان لنقطة البداية، فتصير مضطراً لتكرار المعالجة كل مرة، بنفس الدقة، إلى الأبد. أي مرة تنساها تعني قفزة مفاجئة.</li>
  <li><strong>مخفّضات pH السريعة تنتج تأرجحاً.</strong> KH هو ما يقاوم تغيّر الحموضة، ومحاولة خفض pH بماء عالي KH تنتهي بارتداد الرقم لأعلى ثم انخفاضه مجدداً — وهذا أسوأ من الرقم المرتفع الثابت.</li>
  <li><strong>الأسماك المتوفرة محلياً غالباً متأقلمة</strong> على ماء المنطقة نفسها إن كانت مرباة محلياً، فتكون الملاءمة أفضل مما تتوقع.</li>
  <li><strong>وأنواع كثيرة تتحمل مدى واسعاً</strong> فعلاً، لا مجاملةً — راجع <a href="/blog/5-hardy-fish-for-beginners">أسماك لا تموت بسرعة</a>.</li>
</ul>

<h2>أنواع تتعامل مع الماء الأقسى بشكل جيد</h2>
<p>إذا كانت قراءاتك عالية، هذي عوائل تُوصف عموماً بأنها مرتاحة بماء قاسٍ أو متوسط القساوة:</p>
<ul>
  <li><strong>الولودة</strong> — مولي وبلاتي وجوبي وسوردتيل، ومن أكثرها ملاءمة للماء الأقسى — <a href="/blog/molly-platy-breeding-save-fry">الأسماك الولودة</a>.</li>
  <li><strong>السيكلد الإفريقي</strong> — مرتبط ببيئات بحيرية قاسية وقلوية — <a href="/blog/african-cichlids-best-types-colors">أنواع السيكلد الإفريقي</a>.</li>
  <li><strong>الدانيو</strong> وأنواع سربية متحمّلة — <a href="/blog/small-schooling-fish-selection">أي سمكة سربية تختار</a>.</li>
  <li>وبالمقابل، أنواع مثل <a href="/blog/discus-fish-care-guide">الديسكس</a> والكاردينال تفضّل الأطرى، ولهذا هي خيار أصعب على ماء قاسٍ.</li>
</ul>
<p>والنباتات كذلك تتفاوت: أنواع كثيرة منخفضة الاحتياج تتعامل مع مدى واسع بلا مشاكل — <a href="/blog/best-low-tech-aquarium-plants-beginners">نباتات منخفضة الاحتياج</a>.</p>

<h2>متى يكون خلط الماء منزوع المعادن منطقياً</h2>
<p>خلط ماء RO مع ماء الحنفية طريقة تخفيف حقيقية، لكنها تناسب حالات محددة لا الاستخدام العام:</p>
<ol>
  <li><strong>هدف محدد</strong> — تفريخ نوع يتطلب ماءً طرياً، أو نوع حساس بعينه. لا "لأن الأرقام عالية".</li>
  <li><strong>نسبة ثابتة ومقاسة</strong> كل مرة، لأن الهدف هو الثبات لا الوصول لرقم.</li>
  <li><strong>إعادة تمعدن عند الحاجة</strong> — ماء RO وحده فقير بالمعادن وبلا قدرة على مقاومة تغيّر الحموضة، وهذا خطر بحد ذاته.</li>
  <li><strong>وكلفة وجهد مستمران</strong> — الخلفية بـ<a href="/blog/ro-water-vs-tap-water-aquarium">مياه RO مقابل ماء الإسالة</a>.</li>
</ol>
<blockquote>وحدود ما نستطيع قوله: لا ننشر وصفة خلط ولا أرقاماً مستهدفة. النسبة تعتمد على قراءات مائك أنت وعلى النوع الذي تربّيه، والرقم الصحيح لحوض قد يكون خاطئاً لآخر. القاعدة الوحيدة العامة: <strong>غيّر ببطء، وقِس، وثبّت.</strong></blockquote>

<h2>وإذا قررت التعديل رغم كل هذا</h2>
<ul>
  <li><strong>ببطء شديد.</strong> التغيير المفاجئ بالقساوة أو الحموضة صدمة — وأسوأ من الرقم الذي تهرب منه.</li>
  <li><strong>عدّل بالدلو لا بالحوض.</strong> جهّز ماء التبديل وقِسه قبل إدخاله.</li>
  <li><strong>راقب KH.</strong> انهياره يعني فقدان القدرة على مقاومة تغيّر الحموضة، وهو باب التأرجح.</li>
  <li><strong>وانتبه للخشب والحجر.</strong> بعضها يرفع القساوة ببطء وبعضها يخفض الحموضة — <a href="/blog/aquarium-safe-rocks-and-wood">اختبار الحجر والخشب</a> و<a href="/blog/driftwood-preparation-yellow-water-fix">الأخشاب المتحجرة</a>.</li>
</ul>
<p>وابدأ دائماً بمعالجة ماء الحنفية قبل أي حساب آخر — <a href="/blog/how-to-treat-tap-water-for-fish-iraq">معالجة ماء الحنفية</a>.</p>'
 WHERE slug = 'ph-level-iraqi-tap-water-fish';

UPDATE blog_posts SET content = '<h2>ليش نغيّر الماء أصلاً؟</h2>
<p>الفلتر ما ينظف الماء بالمعنى اللي تتخيله. البكتيريا النافعة تحوّل الأمونيا السامة إلى نتريت ثم إلى <strong>نترات</strong> — وهنا تنتهي الدورة. النترات تتراكم ولا يشيلها أي فلتر بيولوجي.</p>
<p>فتغيير الماء مو "تنظيف"، بل <strong>الطريقة الوحيدة العملية لإخراج النترات من الحوض</strong>. ومعها تخرج المواد العضوية الذائبة اللي ما تظهر بأي اختبار لكنها تتراكم وتضغط على الأسماك.</p>
<p>الأساس كله مشروح في <a href="/blog/nitrogen-cycle-simple-arabic-explained">الدورة البيولوجية</a>؛ هذا المقال عن التنفيذ.</p>

<h2>كم وكم مرة؟ خلّ الرقم يقرر</h2>
<p>ما راح نعطيك نسبة ثابتة تنفع كل حوض، لأنها ما موجودة: تتغير بعدد الأسماك وكمية العلف والنبات وحجم الحوض. بدلها، استخدم قاعدة قرار:</p>
<table>
  <tr><th>قراءة النترات قبل التغيير</th><th>يعني</th><th>الإجراء</th></tr>
  <tr><td>منخفضة ومستقرة أسبوعياً</td><td>الجدول الحالي كافٍ</td><td>استمر عليه</td></tr>
  <tr><td>ترتفع من أسبوع لأسبوع</td><td>الإخراج أقل من الإنتاج</td><td>زد النسبة أو التكرار</td></tr>
  <tr><td>ترتفع بسرعة رغم التغيير</td><td>الحمل أكبر من الحوض</td><td>قلّل العلف وعدد الأسماك أولاً</td></tr>
</table>
<p>نقطة مهمة: <strong>الأمونيا والنتريت لازم يكونان صفراً دائماً</strong>. إذا ظهرا فالمشكلة مو جدول التغيير، بل الترشيح البيولوجي نفسه — شوف <a href="/blog/ammonia-spike-emergency-treatment">ارتفاع الأمونيا المفاجئ</a>. شرائط الفحص واختبارات الأمونيا والنتريت متوفرة في AQUAVO ضمن قسم الفحص والمراقبة.</p>
<blockquote>القاعدة العامة: تغييرات <strong>صغيرة ومتكررة</strong> أفضل من تغيير كبير مفاجئ. الحوض كائن يعيش على الاستقرار، وأي قفزة بالحرارة أو الكيمياء إجهاد بحد ذاته حتى لو كان الماء الجديد أنظف.</blockquote>

<h2>الخطوات</h2>
<ol>
  <li><strong>جهّز الماء الجديد أولاً.</strong> عالجه بمزيل الكلور <em>قبل</em> ما يدخل الحوض، لا بعده. تفاصيل الكلور والكلورامين في <a href="/blog/how-to-treat-tap-water-for-fish-iraq">معالجة ماء الحنفية</a>.</li>
  <li><strong>قرّب الحرارة.</strong> خلّ الماء الجديد بحرارة قريبة من حرارة الحوض. الفرق الكبير صدمة، وبالصيف العراقي ماء الحنفية ممكن يكون أحر من الحوض لا أبرد.</li>
  <li><strong>اسحب من القاع بالسيفون.</strong> لا تسحب من السطح: الفضلات تتجمع بين الحصى، والسيفون يشيلها مع الماء. السيفونات ومكانس القاع متوفرة في AQUAVO ضمن الصيانة والتنظيف.</li>
  <li><strong>أطفئ السخان</strong> إذا كان مستوى الماء سينزل تحته، وشغّله بعد إعادة الملء.</li>
  <li><strong>أضف الماء بهدوء</strong> على طبق أو على الزجاج حتى ما تقلب الحصى وتعكّر الماء.</li>
</ol>

<h2>أخطاء تحوّل التغيير من علاج إلى مشكلة</h2>
<ul>
  <li><strong>غسل ميديا الفلتر بماء الحنفية بنفس الجلسة.</strong> أسوأ تركيبة ممكنة: تشيل جزءاً من الماء المستقر وتقتل البكتيريا معاً. اغسل الميديا بماء الحوض المسحوب، وبجلسة منفصلة عن التغيير الكبير.</li>
  <li><strong>تغيير ١٠٠٪ أو تفريغ الحوض بالكامل</strong> — نادراً ما يكون ضرورياً، ويعيد الحوض عملياً لحالة غير مدوّرة.</li>
  <li><strong>ماء غير معالج "لأنها كمية قليلة".</strong> الكلور يضرب البكتيريا مهما كانت الكمية.</li>
  <li><strong>التغيير فقط عند ظهور مشكلة.</strong> التغيير وقاية مو علاج طوارئ؛ الانتظار حتى يتعكر الماء يعني إن الأسماك عاشت أسابيع تحت ضغط.</li>
</ul>

<h2>حالات خاصة</h2>
<ul>
  <li><strong>حوض جديد قيد التدوير:</strong> غيّر أقل — التغيير الكثير يبطئ بناء المستعمرة البكتيرية.</li>
  <li><strong>موجة حر:</strong> تغييرات أصغر وأكثر تكراراً، وانتبه لحرارة الماء الجديد. شوف <a href="/blog/protect-fish-iraqi-summer-50-degrees">حماية الأسماك من الحرارة</a>.</li>
  <li><strong>ماء أبيض ضبابي (انفجار بكتيري):</strong> هنا التغيير الكثير <em>يزيد</em> المشكلة. التفصيل في <a href="/blog/cloudy-water-fix">تشخيص تعكر الماء</a>.</li>
  <li><strong>بعد انقطاع كهرباء طويل:</strong> افحص قبل ما تغيّر، وابدأ صغيراً.</li>
</ul>
<p>ولحساب حجم حوضك وكمية الماء المطلوبة بدقة استخدم <a href="/calculators">الحاسبات</a>.</p>
<p>وتذكّر إن تبديل الماء هو ما يزيل الفضلات فعلاً، لا سمكة "الزبال" — التفصيل بـ<a href="/blog/best-aquarium-cleaner-fish-pleco-corydoras">أسماك التنظيف</a>. وإذا تدهور الماء بلا سبب ظاهر رغم انتظام التبديل، فكّر بمصدر خارجي: <a href="/blog/aquarium-airborne-toxins">سموم الهواء</a>.</p>
<h2>نتراتك عالية رغم انتظام التبديل</h2>
<p>تبدّل الماء بانتظام ومع ذلك تبقى النترات مرتفعة. هذا لا يعني أن التبديل بلا فائدة — يعني أن مصدر الإنتاج أسرع مما يزيله التبديل، أو أن الماء الداخل نفسه ليس نظيفاً.</p>
<ul>
  <li><strong>افحص ماء الحنفية نفسه.</strong> إذا كان يحتوي نترات أصلاً فأنت تضيفها مع كل تبديل — قياس بسيط يحسم هذا.</li>
  <li><strong>الحمل الحيوي أعلى مما تظن</strong> — <a href="/blog/how-many-fish-in-aquarium">كم سمكة يتحمل حوضك</a>.</li>
  <li><strong>إفراط بالعلف</strong>، وهو السبب الأكثر شيوعاً — <a href="/blog/aquarium-fish-feeding-guide">دليل التغذية</a>.</li>
  <li><strong>فضلات متراكمة بمناطق راكدة</strong> لا يصلها السيفون — <a href="/blog/aquarium-water-flow">التيار وحركة الماء</a>.</li>
  <li><strong>نبات سريع النمو يستهلك النترات</strong> فعلاً، وهو حل بنيوي لا مؤقت — <a href="/blog/best-low-tech-aquarium-plants-beginners">نباتات منخفضة الاحتياج</a>.</li>
</ul>
<p>أما مزيلات النترات الكيميائية فتعالج الرقم لا السبب، وتخفي المشكلة بدل ما تحلها. عالج المصدر أولاً، وزد نسبة التبديل مؤقتاً — بتدرّج لا دفعة واحدة.</p>' WHERE slug = 'aquarium-water-change-guide';

UPDATE blog_posts SET content = '

<h2>مقدمة</h2>
<p>تعتبر تربية الأسماك الزينة من الهوايات الشائعة في العراق، حيث يمكن رؤية الأحواض المائية في العديد من المنازل والشركات. ومع ذلك، قد تواجه هذه الأسماك مشاكل خطيرة تؤدي إلى موتها الفجائي. في هذا المقال، سنناقش أسباب موت أسماك الزينة فجأة وكيفية إنقاذ الحوض المائي.</p>

<h2>أسباب موت أسماك الزينة فجأة</h2>
<p>توجد العديد من الأسباب التي قد تؤدي إلى موت أسماك الزينة فجأة، ومنها:</p>
<ul>
   <li>التغيرات المفاجئة في درجة الحرارة: يمكن أن تؤدي التغيرات المفاجئة في درجة الحرارة إلى إجهاد الأسماك وتؤدي إلى موتها.</li>
   <li>جودة الماء: الماء الملوث أو الماء الذي يحتوي على كميات كبيرة من الكلور يمكن أن يؤدي إلى موت الأسماك.</li>
   <li>الإجهاد: يمكن أن يؤدي الإجهاد الناجم عن التغيرات في بيئة الأسماك إلى موتها.</li>
</ul>

<h3>التغيرات المفاجئة في درجة الحرارة</h3>
<p>درجة الحرارة هي واحدة من العوامل الأكثر أهمية في تربية الأسماك الزينة. درجات الحرارة العالية أو المنخفضة يمكن أن تؤدي إلى إجهاد الأسماك وتؤدي إلى موتها. في العراق، يمكن أن تصل درجات الحرارة إلى 50 درجة مئوية في الصيف، مما يزيد من خطر موت الأسماك. يجب على مالكي الأحواض المائية استخدام أنظمة تحكم في درجة الحرارة لضمان استقرار درجة الحرارة في الحوض.</p>

<h3>جودة الماء</h3>
<p>جودة الماء عامل آخر مهم في تربية الأسماك الزينة. الماء الملوث أو الماء الذي يحتوي على كميات كبيرة من الكلور يمكن أن يؤدي إلى موت الأسماك. في العراق، يعتبر الماء النقي من النادر، وتحتوي معظم أنواع الماء على كميات كبيرة من الكلور. يجب على مالكي الأحواض المائية استخدام أنظمة تنقية الماء لضمان جودة الماء.</p>

<h2>كيفية إنقاذ الحوض المائي</h2>
<p>إذا لاحظت أن أسماكك الزينة تموت فجأة، يجب عليك اتخاذ الإجراءات اللازمة لإنقاذ الحوض المائي. يمكنك القيام بذلك عن طريق:</p>
<ol>
   <li>فحص درجة الحرارة: تأكد من أن درجة الحرارة في الحوض مستقرة ولا توجد تغيرات مفاجئة.</li>
   <li>فحص جودة الماء: تأكد من أن الماء نظيف وخالي من الكلور.</li>
   <li>توفير بيئة آمنة: تأكد من أن الحوض خالي من أي مصادر إجهاد.</li>
</ol>

<blockquote>نصيحة ذهبية من AQUAVO: يجب على مالكي الأحواض المائية استخدام أنظمة تحكم في درجة الحرارة وأنظمة تنقية الماء لضمان استقرار درجة الحرارة وجودة الماء في الحوض.  يمكننا توصيل المنتجات إلى جميع أنحاء العراق، ونتوفر على ضمانات لجميع المنتجات.</blockquote>

<h2>استنتاج</h2>
<p>موت أسماك الزينة فجأة هو مشكلة شائعة في العراق، ولكن يمكن الوقاية منها باتخاذ الإجراءات اللازمة. يجب على مالكي الأحواض المائية استخدام أنظمة تحكم في درجة الحرارة وأنظمة تنقية الماء لضمان استقرار درجة الحرارة وجودة الماء في الحوض.  تذكر، دائمًا يجب أن تضع صحة أسماكك الزينة في المقام الأول.</p>
<h2>ماتت سمكة — شنو تسوي الآن بالضبط</h2>
<p>لحظة يمر بها كل هاوٍ، وفيها إجراءات تفرق:</p>
<ol>
  <li><strong>أخرجها فوراً.</strong> السمكة الميتة تتحلل بسرعة وترفع الأمونيا، والحوض الصغير يتأثر بساعات — <a href="/blog/ammonia-spike-emergency-treatment">ارتفاع الأمونيا</a>.</li>
  <li><strong>افحصها بالنظر قبل التخلص منها.</strong> نقط، غشاوة، زعانف متآكلة، بطن غائر — معلومة تفيدك مع البقية.</li>
  <li><strong>افحص الماء فوراً.</strong> السبب الأشيع للموت المفاجئ ليس مرضاً بل الماء — <a href="/blog/aquarium-test-kit-guide">قراءة الفحص</a>.</li>
  <li><strong>راقب البقية عن قرب</strong> بضعة أيام: تنفس، شهية، سلوك.</li>
  <li><strong>لا تعالج الحوض بالتخمين.</strong> إضافة دواء بعد موت واحدة بلا تشخيص تضر أكثر مما تنفع — <a href="/blog/fish-treatment-protocol">العلاج الصحيح</a>.</li>
</ol>
<p>واغسل يديك بعد أي تعامل، وغطِّ أي جرح قبل إدخال يدك — <a href="/blog/aquarium-hygiene-and-human-safety">نظافة الحوض وسلامتك</a>.</p>' WHERE slug = 'why-fish-die-suddenly-rescue-guide';

UPDATE blog_posts SET content = '<h2>أغلب فشل العلاج ليس بالدواء</h2>
<p>الحوض اللي "جرّب كل الأدوية وما نفع" غالباً ما جرّب أياً منها بشكل صحيح. الدواء الصح بجرعة تقديرية، أو لمدة نصف الدورة، أو بحوض فيه فحم نشط يسحبه، أو على سمكة سببها الحقيقي أمونيا لا ميكروب — كلها تنتهي بنفس النتيجة وتُقرأ كأنها فشل دواء.</p>
<blockquote>قاعدتان قبل كل شي. الأولى: <strong>ابدأ بالماء لا بالدواء</strong>. والثانية: <strong>نشرة المنتج وتوجيه الطبيب البيطري يتقدّمان على أي نصيحة عامة</strong> — بما فيها ما بهذا المقال؛ ما هنا إطار عمل لا بديل عن تعليمات المنتج الذي بيدك. نسبة كبيرة مما يبدو مرضاً هو تسمم بأمونيا أو نتريت يرتدي نفس الأعراض، وعلاجه بمضاد حيوي يزيده سوءاً — <a href="/blog/fish-disease-symptoms-diagnosis">دليل تشخيص الأعراض</a> و<a href="/blog/aquarium-test-kit-guide">قراءة الفحص</a>.</blockquote>

<h2>حوض العلاج: ليش منفصل</h2>
<p>معالجة الحوض الرئيسي كامل خيار سيئ بالعادة. حوض علاج بسيط أفضل لأسباب عملية:</p>
<table>
  <tr><th>المسألة</th><th>بالحوض الرئيسي</th><th>بحوض علاج</th></tr>
  <tr><td>كمية الدواء</td><td>حجم كبير = كلفة أعلى وخطأ أكبر</td><td>حجم صغير محسوب</td></tr>
  <tr><td>البكتيريا النافعة</td><td>كثير من الأدوية تضربها</td><td>الفلتر الرئيسي بمأمن</td></tr>
  <tr><td>الروبيان واللافقاريات</td><td>تتضرر أو تموت</td><td>خارج التعرّض تماماً</td></tr>
  <tr><td>مراقبة السمكة</td><td>صعبة وسط الديكور</td><td>واضحة ومباشرة</td></tr>
</table>
<ul>
  <li><strong>بلا ركيزة وبلا ديكور مسامي.</strong> الحصى والخشب يمتصان الدواء ويجعلان التركيز مجهولاً. قاع عارٍ مع مخبأ بسيط من مادة غير مسامية.</li>
  <li><strong>فلتر إسفنجي بالهواء</strong>، ويُفضَّل أن يكون قد شُغِّل مسبقاً بالحوض الرئيسي حتى يحمل بكتيريا — <a href="/blog/filter-types-guide">أي فلتر يناسب حوضك</a>.</li>
  <li><strong>سخّان وتهوية.</strong> كثير من الأدوية تقلل الأوكسجين الذائب، والتهوية تصير أهم لا أقل — <a href="/blog/air-pumps-decoration-or-necessity">مضخة الهواء</a>.</li>
  <li><strong>نفس التجهيز، غرضان مختلفان.</strong> حوض الحجر الصحي وحوض العلاج يتشابهان بالمعدات لكن لا يتطابقان بالوظيفة: <strong>الحجر مراقبة</strong> لسمكة جديدة تبدو سليمة، لمدة معلومة وبلا دواء افتراضي؛ و<strong>العلاج تدخّل</strong> على سمكة ظهرت عليها حالة. المعالجة الوقائية لكل قادم جديد ليست حجراً صحياً — هي تعريض بلا سبب. التفصيل بـ<a href="/blog/quarantine-new-fish-guide">الحجر الصحي</a>.</li>
</ul>

<h2>الأخطاء الخمسة اللي تُفشل أي دواء</h2>
<ol>
  <li><strong>الجرعة على حجم الحوض المكتوب لا الفعلي.</strong> حوض "100 لتر" فيه ركيزة وديكور وماء أقل من الحافة يحمل ماءً أقل بكثير. احسب الحجم الحقيقي — <a href="/blog/calculate-aquarium-capacity-liters">حساب السعة باللتر</a>. الجرعة الناقصة لا تقتل الممرض وتدرّبه؛ والزائدة تقتل السمكة.</li>
  <li><strong>إيقاف العلاج عند اختفاء الأعراض.</strong> اختفاء العلامة الظاهرة لا يعني انتهاء الدورة. أوضح مثال النقط البيضاء، حيث الطور الحسّاس للدواء ليس الطور اللي تشوفه — <a href="/blog/common-fish-diseases-white-spot">النقط البيضاء</a>. أكمل المدة المكتوبة.</li>
  <li><strong>تجاهل ما تقوله النشرة عن الفحم النشط.</strong> الفحم يسحب مواد ذائبة من الماء، وكثير من نشرات الأدوية تطلب رفعه أثناء العلاج لهذا السبب. لكن هذا <strong>ليس قاعدة مطلقة</strong> لكل منتج — بعضها لا يشترطه. اقرأ النشرة واتبعها، ولا تفترض. وإذا طلبت رفعه، فإعادته بعد انتهاء الدورة طريقة معتادة لسحب البقايا — <a href="/blog/activated-carbon-aquarium-when-to-use">الفحم النشط</a>.</li>
  <li><strong>خلط دوائين بلا توافق مثبت.</strong> لا تجمع منتجين إلا إذا كانت نشرة أحدهما تذكر التوافق صراحة؛ غياب التحذير ليس إذناً. الخلط يضاعف الإجهاد وقد ينتج تأثيراً لا يتوقعه أي من المنتجين، والتبديل كل يومين يعني أنك ما أعطيت أياً منهما فرصة. دواء واحد، دورة كاملة، ثم تقييم.</li>
  <li><strong>تجاهل الأنواع الحساسة.</strong> عديمة الحراشف والروبيان قواعدهما مختلفة — <a href="/blog/aquarium-loaches-guide">اللوتش</a> و<a href="/blog/aquarium-shrimp-snails-guide">الروبيان والحلزون</a>. واقرأ نشرة المنتج قبل أي جرعة.</li>
</ol>

<h2>أثناء العلاج وبعده</h2>
<ul>
  <li><strong>تبديل ماء قبل الجرعة التالية</strong> بحسب النشرة — يمنع تراكماً غير محسوب.</li>
  <li><strong>راقب التنفس.</strong> لهاث مفاجئ بعد جرعة إشارة إجهاد أو نقص أوكسجين، لا تحسّن.</li>
  <li><strong>لا تُطعم بكثرة</strong> — سمكة مريضة تأكل أقل، والفائض يفسد ماءً صغير الحجم بسرعة.</li>
  <li><strong>بعد الانتهاء</strong>: فحم نشط لسحب البقايا، ثم تبديل ماء، ثم إعادة السمكة للحوض الرئيسي بهدوء — <a href="/blog/acclimating-new-fish">الأقلمة</a>.</li>
</ul>
<blockquote>ولن ننشر جرعات ولا أسماء مركّبات: التوفر والتنظيم والتركيز تختلف بين الأسواق والمنتجات، ونشر رقم واحد يصلح لمنتج ولا يصلح لغيره ضرر لا فائدة. النشرة المرفقة بالمنتج هي المرجع، وإذا توفر طبيب بيطري مختص بالأسماك فهو الجهة الصحيحة. ولا تستخدم أدوية بشرية إطلاقاً — <a href="/blog/human-medicine-dangers-for-fish">مخاطر الأدوية البشرية</a>.</blockquote>
<p>وللحالات المحددة: <a href="/blog/external-fish-parasites">الطفيليات الخارجية</a>، <a href="/blog/internal-fish-parasites">الطفيليات الداخلية</a>، <a href="/blog/fish-fungus-vs-columnaris">الزغب الأبيض</a>، <a href="/blog/fin-rot-treatment-guide">تعفن الزعانف</a>.</p>
<h2>تبديل الماء أثناء دورة العلاج</h2>
<p>سؤال يتكرر: هل أبدّل الماء وأنا أعالج؟ الجواب يعتمد على النشرة، لكن القواعد العامة واضحة:</p>
<ul>
  <li><strong>النشرة تحكم.</strong> كثير من المنتجات تحدد تبديلاً بنسبة معينة قبل كل جرعة تالية؛ اتبع ما تقوله لا ما اعتدت عليه.</li>
  <li><strong>التبديل يزيل جزءاً من الدواء</strong> — ولهذا يُعاد الحساب بعده إن طلبت النشرة ذلك. لا تضف جرعة كاملة لماء لم يُبدَّل بالكامل.</li>
  <li><strong>ولا توقف التبديل خوفاً على الدواء.</strong> السمكة المريضة بماء متدهور لن تتحسن مهما كان العلاج صحيحاً.</li>
  <li><strong>بعد انتهاء الدورة</strong>: تبديل ماء، ثم فحم نشط لسحب البقايا إن كانت النشرة طلبت رفعه أثناء العلاج.</li>
</ul>
<p>وطريقة التبديل نفسها بـ<a href="/blog/aquarium-water-change-guide">تغيير ماء الحوض</a>.</p>' WHERE slug = 'fish-treatment-protocol';

UPDATE blog_posts SET content = '<h2>سمكة تأكل ولا تسمن</h2>
<p>الطفيليات الداخلية تختلف عن الخارجية بشي أساسي: <strong>ما تشوف شيئاً على السمكة</strong>. الجسم نظيف، لا نقط ولا غبار ولا دود ظاهر، ومع ذلك السمكة تضعف تدريجياً. ولأن العلامة الأولى بطيئة ومتدرجة، أغلب الحالات تُكتشف متأخرة.</p>
<table>
  <tr><th>العلامة</th><th>ماذا تعني</th></tr>
  <tr><td>هزال رغم أكل طبيعي</td><td>الغذاء يُستهلك داخلياً — أوضح إشارة مبكرة</td></tr>
  <tr><td>براز أبيض خيطي أو شفاف</td><td>الأمعاء لا تهضم كالمعتاد</td></tr>
  <tr><td>بطن غائر وظهر بارز</td><td>هزال متقدم</td></tr>
  <tr><td>رفض الأكل بعد فترة شراهة</td><td>مرحلة متأخرة بالعادة</td></tr>
  <tr><td>خيوط حمراء قصيرة بارزة من فتحة الإخراج</td><td>ديدان داخلية بمرحلة متقدمة</td></tr>
</table>
<blockquote>الفارق العملي عن الطفيليات الخارجية: هناك تبدأ بحكّة وسلوك، وهنا تبدأ بـ<strong>وزن وبراز</strong>. إذا كانت العلامات على السطح فراجع <a href="/blog/external-fish-parasites">الطفيليات الخارجية</a>.</blockquote>

<h2>البراز الأبيض ليس تشخيصاً وحده</h2>
<p>البراز الأبيض الخيطي أشهر علامة تُذكر، لكنه ليس دليلاً قاطعاً على دودة. له أكثر من سبب، وبعضها لا يحتاج دواءً إطلاقاً:</p>
<ul>
  <li><strong>سمكة ما أكلت من فترة</strong> — البراز يصير مخاطياً فاتحاً لأن الأمعاء تفرغ. سمكة متوترة من نقل أو مطاردة تعطي نفس المنظر.</li>
  <li><strong>علف رديء أو مفاجئ التغيير</strong> — اضطراب هضمي مؤقت.</li>
  <li><strong>ماء متدهور</strong> — يظهر بأشكال كثيرة، منها هذي. ابدأ دائماً من <a href="/blog/aquarium-test-kit-guide">قراءة الفحص</a>.</li>
  <li><strong>طفيليات داخلية فعلاً</strong> — وهذا يُرجَّح لمّا يجتمع البراز الأبيض مع <strong>هزال مستمر</strong> رغم الأكل، لا لمّا يظهر وحده ليوم أو يومين.</li>
</ul>
<p>يعني: العلامة المفتاحية هي <strong>الاجتماع</strong> — أكل طبيعي + وزن ينزل + براز غير طبيعي، على مدى أسابيع لا أيام.</p>

<h2>ليش هذي الحالة أصعب من غيرها</h2>
<p>علاج الطفيليات الداخلية أصعب من الخارجية لسببين بنيويين:</p>
<ol>
  <li><strong>الدواء لازم يوصل للداخل.</strong> إضافة دواء للماء تعالج ما يلامس الجلد والخياشيم؛ الطفيلي داخل الأمعاء لا يتأثر بنفس الطريقة. ولهذا الطريقة المتعارف عليها هي العلاج عبر الطعام — وهي تفشل تماماً مع سمكة توقفت عن الأكل، وهو بالضبط ما يحصل بالمراحل المتأخرة.</li>
  <li><strong>نافذة العلاج تضيق مع الوقت.</strong> السمكة اللي ما زالت تأكل قابلة للعلاج؛ السمكة الهزيلة الرافضة للأكل احتمالاتها أضعف بكثير. ولهذا التبكير هنا أهم من أي تفصيل آخر.</li>
</ol>
<blockquote>ولن ننشر جرعة ولا اسم مركّب: هذي الأدوية تختلف بتوفرها وتنظيمها، وجرعة خاطئة على سمكة هزيلة تقتلها أسرع من الطفيلي. الطريقة الصحيحة — العزل والجرعة والمدة — بـ<a href="/blog/fish-treatment-protocol">العلاج الصحيح</a>، ولا تستخدم أدوية بشرية إطلاقاً: <a href="/blog/human-medicine-dangers-for-fish">مخاطر الأدوية البشرية</a>.</blockquote>

<h2>من أين تدخل</h2>
<p>الطفيليات الداخلية تصل بالعادة مع السمكة نفسها، لا تتولد بالحوض:</p>
<ul>
  <li><strong>سمكة جديدة حاملة بلا أعراض.</strong> سمكة تبدو سليمة تماماً قد تحمل عدوى داخلية تظهر بعد أسابيع. هذا بالضبط ما يجعل <a href="/blog/quarantine-new-fish-guide">الحجر الصحي</a> أسابيع لا أيام.</li>
  <li><strong>علف حي غير موثوق</strong> — مصدر معروف لبعض الدورات.</li>
  <li><strong>الإجهاد المزمن</strong> يحوّل عدوى محدودة لمشكلة ظاهرة — <a href="/blog/how-many-fish-in-aquarium">الاكتظاظ</a> و<a href="/blog/aquarium-fish-aggression">المطاردة المستمرة</a>.</li>
</ul>
<p>ولتمييز الهزال عن أسباب أخرى تشبهه — كسمكة تُمنع من الوصول للطعام بسبب جارها — راجع <a href="/blog/fish-disease-symptoms-diagnosis">دليل تشخيص الأعراض</a> و<a href="/blog/aquarium-fish-feeding-guide">دليل التغذية</a>. والأنواع الحساسة كـ<a href="/blog/discus-fish-care-guide">الديسكس</a> تُصاب أوضح وأسرع من غيرها.</p>
<h2>ثقب الرأس: شكل مختلف من المشكلة الداخلية</h2>
<p>حالة تظهر كحفر أو تآكل صغير برأس السمكة وحول العينين، وتُعرف بـ"ثقب الرأس". ترتبط غالباً بالسيكلد الكبير — <a href="/blog/oscar-fish-care-guide-water-dog">الأوسكار</a> و<a href="/blog/discus-fish-care-guide">الديسكس</a> — وتترافق كثيراً مع هزال وتراجع شهية.</p>
<ul>
  <li><strong>ما يُتفق عليه:</strong> ترتبط بظروف مزمنة رديئة — ماء متدهور، نترات مرتفعة لفترات طويلة، تغذية فقيرة أو أحادية، وإجهاد مستمر.</li>
  <li><strong>وما هو محل خلاف:</strong> الدور الدقيق للطفيلي مقابل دور البيئة والتغذية غير محسوم بالمصادر، ونعرضه كما هو بدل ما نحسمه.</li>
  <li><strong>العملي:</strong> تحسين الماء والتنويع الغذائي أساس لا يُستغنى عنه مهما كان العلاج، والحالة المبكرة أقبل للتحسن.</li>
</ul>' WHERE slug = 'internal-fish-parasites';

UPDATE blog_posts SET content = '<h2>الإفراط بالعلف هو السبب الجذري لأغلب مشاكل الحوض</h2>
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
<p>وإذا كان عدد الأسماك نفسه فوق طاقة الحوض فتقليل العلف يخفف ولا يحل — <a href="/blog/how-many-fish-in-aquarium">كم سمكة يتحمل حوضك</a>. وعند السفر لا تحمّل أحداً مسؤولية التقدير: <a href="/blog/aquarium-care-while-traveling">السفر وترك الحوض</a>.</p>
<p>وتنويع العلف ما يعني بالضرورة كلفة أعلى: الخضار المنزلية خيار حقيقي لآكلات النبات — <a href="/blog/feeding-fish-vegetables-cucumber-peas">إطعام الخضراوات</a>. ولمقارنة العلف التجاري بالاقتصادي راجع <a href="/blog/tetra-food-vs-budget-brands-comparison">مقارنة الأعلاف</a>.</p>
<h2>العلف الحي والمجمّد: فائدة ومحاذير</h2>
<p>التنويع مفيد فعلاً، لكن لكل شكل تعامله:</p>
<ul>
  <li><strong>العلف الحي</strong> يحفّز الشهية والسلوك الطبيعي، ويستخدمه كثيرون قبل التفريخ — <a href="/blog/fish-breeding-basics">التفريخ كقرار</a>. لكنه أيضاً مسار معروف لإدخال ممرضات إذا كان مصدره مجهولاً؛ المصدر الموثوق هو الفارق.</li>
  <li><strong>المجمّد أأمن من هذي الناحية</strong> وأسهل تخزيناً. يُذاب بقليل من ماء الحوض بكوب صغير، ولا يُلقى قطعة مجمدة بالحوض.</li>
  <li><strong>لا تصبّ ماء الإذابة</strong> بالحوض — يحمل سوائل تلوّث الماء بلا فائدة غذائية.</li>
  <li><strong>ولا تُعاد القطعة المذابة للتجميد.</strong></li>
  <li><strong>ويبقى قاعدة</strong>: التنويع لا يعني زيادة الكمية. الإفراط بالعلف يبقى السبب الجذري لأغلب مشاكل الحوض.</li>
</ul>' WHERE slug = 'aquarium-fish-feeding-guide';

UPDATE blog_posts SET content = '<h2>الطحالب عرَض، مو مرض</h2>
<p>ما موجود حوض خالٍ تماماً من الطحالب، ولا حتى أحواض المحترفين. الطحالب تنمو لما يصير عندك <strong>فائض</strong>: ضوء أكثر من حاجة النبات، أو مغذيات أكثر من استهلاكه. فالسؤال الصحيح مو "شنو يقتلها" بل "شنو الفائض عندي".</p>
<p>ولهذا المواد الكيميائية المكتوب عليها مضاد طحالب حل خادع: تقتل الظاهر خلال يومين، ما تلمس السبب، وترجع الطحالب أقوى — وأحياناً كتلة الطحالب الميتة نفسها ترفع الأمونيا وتسوي مشكلة أكبر من الأصلية.</p>

<h2>شخّص النوع أولاً</h2>
<table>
  <tr><th>النوع</th><th>الشكل</th><th>السبب الغالب</th><th>الحل</th></tr>
  <tr><td>خضراء على الزجاج</td><td>بقع خضراء ناعمة</td><td>إضاءة طويلة + نترات مرتفعة</td><td>مسح ميكانيكي، قلّل ساعات الإضاءة</td></tr>
  <tr><td>بنية (دياتوم)</td><td>غبار بني يغطي كل شي</td><td>حوض جديد، سيليكات، إضاءة ضعيفة</td><td><strong>تختفي وحدها</strong> خلال أسابيع</td></tr>
  <tr><td>خيطية</td><td>خيوط خضراء طويلة</td><td>خلل بين الضوء والمغذيات</td><td>إزالة يدوية + موازنة الإضاءة</td></tr>
  <tr><td>ماء أخضر</td><td>الماء نفسه أخضر عكر</td><td>ضوء زائد أو شمس مباشرة</td><td>تعتيم كامل ٣ أيام</td></tr>
  <tr><td>لحية سوداء</td><td>خصلات سوداء قاسية على الحواف</td><td>تذبذب التيار والمغذيات</td><td>الأصعب — <a href="/blog/black-beard-algae-removal-steps">دليل مخصص</a></td></tr>
</table>

<h2>الطحالب البنية: لا تسوي شي</h2>
<p>هذي أكثر نوع يخوّف المبتدئ وأقلها خطراً. الدياتوم تظهر بالأحواض الجديدة لأن السيليكات متوفرة والحوض ما استقر بعد. تغطي الحصى والزجاج والنبات بغبار بني خلال أيام.</p>
<blockquote>العلاج هو الصبر. تختفي وحدها لما ينضب مصدر السيليكات ويستقر الحوض — عادة خلال أسابيع قليلة. أي محاولة كيميائية هنا تضر الحوض الجديد أكثر مما تنفع، لأنه أصلاً في منتصف التدوير.</blockquote>
<p>إذا حوضك جديد فهذي إشارة طبيعية على مسار التدوير، مو إشارة فشل — اقرأ <a href="/blog/nitrogen-cycle-simple-arabic-explained">الدورة البيولوجية</a>.</p>

<h2>الماء الأخضر: مشكلة ضوء بالدرجة الأولى</h2>
<p>الماء الأخضر طحالب مجهرية عائمة، ما تنشال بالفلتر لأن حجمها أصغر من مسام القطن. التعتيم الكامل لثلاثة أيام يقضي عليها لأنها تعتمد على الضوء كلياً، والأسماك تتحمل التعتيم بلا مشكلة.</p>
<p>الخطوات وتفاصيل التفريق بينها وبين التعكر البكتيري الأبيض في <a href="/blog/cloudy-water-fix">تشخيص تعكر الماء باللون</a>.</p>

<h2>الأسباب الجذرية الأربعة</h2>
<ol>
  <li><strong>ساعات إضاءة طويلة.</strong> ٦–٨ ساعات تكفي أي حوض منزلي. أكثر من ذلك يغذي الطحالب مو النبات.</li>
  <li><strong>ضوء شمس مباشر.</strong> شباك مشمس يكفي لوحده لإبقاء المشكلة مهما سويت غير ذلك.</li>
  <li><strong>نترات متراكمة</strong> من قلة تغيير الماء أو كثرة الأسماك أو زيادة العلف.</li>
  <li><strong>علف زائد.</strong> السبب الجذري لأغلب مشاكل الماء، ومنها هذي.</li>
</ol>

<h2>آكلات الطحالب: مساعدة، لا حل</h2>
<p>بعض الأسماك واللافقاريات تأكل أنواعاً معينة من الطحالب — أوتوسينكلس للدياتوم، وروبيان أمانو للخيطية، وحلزون النيريت للخضراء على الزجاج. لكن انتبه لنقطتين:</p>
<ul>
  <li><strong>ما تحل السبب.</strong> إذا الفائض باقٍ، الطحالب تنمو أسرع من قدرتها على الأكل.</li>
  <li><strong>كائن حي مو أداة.</strong> إضافة أسماك لحل مشكلة تزيد الحمل الحيوي على حوض أصلاً متعب، وكل نوع له متطلباته. لا تشتري كائناً لوظيفة واحدة ثم تهمله.</li>
</ul>
<p>ملاحظة على أجهزة التعقيم بالأشعة فوق البنفسجية: تنفع ضد الماء الأخضر تحديداً لأنها تقتل الخلايا العائمة، وما تنفع مع الطحالب الملتصقة على الأسطح.</p>

<h2>الخطة العملية</h2>
<ol>
  <li>ثبّت الإضاءة على ٦–٨ ساعات بمؤقّت، وابعد الحوض عن الشمس.</li>
  <li>غيّر ٢٠–٢٥٪ من الماء أسبوعياً بانتظام.</li>
  <li>قلّل العلف لما ينتهي خلال دقيقتين.</li>
  <li>نظّف ميكانيكياً بالمغناطيس أو الفرشاة — الإزالة اليدوية دائماً جزء من الحل.</li>
  <li>اصبر أسبوعين قبل ما تحكم. الحوض يستجيب ببطء، وتغيير كل شي دفعة واحدة يمنعك من معرفة أي عامل كان المسبب.</li>
</ol>
<p>ولحساب حجم حوضك وكمية التغيير الأسبوعي استخدم <a href="/calculators">الحاسبات</a>.</p>
<p>والنبات الحي منافس مباشر للطحالب على نفس المغذيات، وهذا فرق جوهري عن الصناعي — <a href="/blog/real-vs-fake-plants-iraq">طبيعية أم صناعية</a>. والأنواع سريعة النمو وكبيرة الورقة مثل <a href="/blog/amazon-sword-plant-care-propagation">الأمازون سورد</a> من أكثر ما يسحب الفائض.</p>
<h2>الطحالب الخيطية والشعرية</h2>
<p>خيوط خضراء طويلة تتعلق بالنبات والديكور وتُسحب باليد كخصلة. تختلف عن <a href="/blog/black-beard-algae-removal-steps">اللحية السوداء</a> بأنها أطول وأنعم ولونها أخضر.</p>
<ul>
  <li><strong>سببها المعتاد</strong> فائض مغذيات مع إضاءة أكثر مما يستهلكه النبات — نفس معادلة بقية الطحالب.</li>
  <li><strong>الإزالة اليدوية فعّالة معها</strong> تحديداً: لفّها على عود وسحبها. هذا يقلل الكتلة فوراً بينما تعالج السبب.</li>
  <li><strong>راجع ساعات الإضاءة قبل شدتها</strong> — <a href="/blog/aquarium-planted-led-lighting-guide">دليل الإضاءة</a>.</li>
  <li><strong>وروبيان أمانو</strong> من أكثر ما يتعامل معها، ضمن حدود أن آكلات الطحالب مساعدة لا حل — <a href="/blog/aquarium-shrimp-snails-guide">الروبيان والحلزون</a>.</li>
</ul>' WHERE slug = 'algae-war-guide';

UPDATE blog_posts SET content = '<h2>الحوض أثقل بكثير مما يبدو</h2>
<p>هذي نقطة تُهمَل حتى يقع الضرر. الماء وحده يزن كيلوغراماً لكل لتر تقريباً، ويُضاف له وزن الزجاج والركيزة والصخور. يعني حوض متوسط الحجم يتحول بعد التعبئة إلى حمل ثابت بعشرات الكيلوغرامات مركّز على مساحة صغيرة.</p>
<table>
  <tr><th>المكوّن</th><th>مساهمته بالوزن</th></tr>
  <tr><td>الماء</td><td>الأكبر — كيلوغرام لكل لتر تقريباً</td></tr>
  <tr><td>الزجاج</td><td>يزداد بسرعة مع زيادة الحجم والسماكة</td></tr>
  <tr><td>الركيزة والصخور</td><td>أثقل من الماء لنفس الحجم</td></tr>
</table>
<blockquote>احسب سعة حوضك الفعلية أولاً — <a href="/blog/calculate-aquarium-capacity-liters">حساب السعة باللتر</a> — ثم قدّر الوزن الكلي قبل ما تقرر مكاناً أو طاولة. الطاولة اللي تحمل تلفزيوناً لا تعني أنها تحمل حوضاً.</blockquote>

<h2>الاستواء ليس تفصيلاً جمالياً</h2>
<p>الحوض الزجاجي يوزّع الضغط على حوافه. إذا كان السطح غير مستوٍ، أو فيه حبة حصى أو نتوء تحت قاعدة الحوض، يتركّز الضغط بنقطة واحدة بدل ما ينتشر — وهذي أشيع أسباب تشقق الأحواض بلا سبب ظاهر.</p>
<ol>
  <li><strong>افحص الاستواء بميزان ماء</strong> بالاتجاهين قبل التعبئة، لا بعدها.</li>
  <li><strong>سطح نظيف تماماً</strong> تحت القاعدة — حبة رمل واحدة تكفي لتكون نقطة ضغط.</li>
  <li><strong>لا تحرّك حوضاً مملوءاً أبداً</strong>، ولا حتى جزئياً. الوزن يلتوي والإطار يتحمّل ما لم يُصمَّم له. التفريغ الكامل قبل أي نقل — <a href="/blog/transporting-fish-and-aquarium">نقل الأسماك والحوض</a>.</li>
  <li><strong>انتبه لنوع الأرضية.</strong> السطح الطري أو غير المستقر يتغيّر تحت حمل ثابت مع الوقت.</li>
</ol>
<blockquote>وحدود ما نستطيع قوله: تقدير وزن الحوض حساب بسيط، أما <strong>هل يتحمّل هذا الموقع بالذات هذا الحمل</strong> فسؤال إنشائي يعتمد على البناء نفسه — نوع السقف والأرضية والموقع داخل الغرفة. لا نستطيع الإجابة عنه من هنا، ولا يجوز افتراض السلامة لمجرد أن الأرضية تبدو صلبة. مع الأحواض الكبيرة، أو الوضع بطابق علوي أو على أرضية خشبية، الجهة الصحيحة مختص بناء يعاين الموقع.</blockquote>

<h2>أين تضعه: أربعة اعتبارات</h2>
<ul>
  <li><strong>بعيداً عن الشمس المباشرة.</strong> ضوء الشمس يرفع الحرارة ويغذي الطحالب بلا سيطرة — وبصيف العراق الأثر الحراري وحده كافٍ ليكون خطراً. التفصيل بـ<a href="/blog/aquarium-planted-led-lighting-guide">دليل الإضاءة</a> و<a href="/blog/protect-fish-iraqi-summer-50-degrees">حرارة الصيف</a>.</li>
  <li><strong>بعيداً عن الاهتزاز والطَرق.</strong> جدار فيه باب يُغلق بعنف، أو سطح قرب مصدر اهتزاز، يبقي الأسماك بحالة تأهب دائم. وضربات الزجاج بالإصبع ليست لعبة بريئة.</li>
  <li><strong>بعيداً عن المطبخ والبخاخات.</strong> أبخرة الطبخ وبخاخ الحشرات ومعطرات الجو تدخل الماء عبر السطح — <a href="/blog/aquarium-airborne-toxins">سموم الهواء</a>.</li>
  <li><strong>قريباً من كهرباء ومصرف.</strong> تبديل الماء الأسبوعي يصير عبئاً إذا كان الحوض بعيداً عن مصدر ماء، والعبء يؤدي لتأجيل التبديل — <a href="/blog/aquarium-water-change-guide">تغيير الماء</a>.</li>
</ul>

<h2>الكهرباء والماء بنفس المكان</h2>
<p>الحوض جهاز كهربائي يعمل بلا توقف بجوار عشرات اللترات. قواعد الأمان هنا ليست اختيارية، وأهمها حلقة التنقيط: أن يهبط سلك كل جهاز إلى نقطة أوطأ من المقبس قبل ما يصعد إليه، فيتساقط أي ماء يسير على السلك عند تلك النقطة بدل ما يصل للكهرباء.</p>
<p>التفصيل الكامل بـ<a href="/blog/aquarium-electrical-safety">السلامة الكهربائية حول الحوض</a>، وخطة الانقطاع بـ<a href="/blog/power-outage-emergency-aquarium-tools">أدوات الطوارئ</a>.</p>

<h2>قبل ما تملأه</h2>
<p>ترتيب واحد يوفّر عليك مشاكل كثيرة: اختر المكان، ثبّت الطاولة وتأكد من استوائها، ضع الحوض فارغاً، افحص الاستواء مرة ثانية، ثم ابدأ التعبئة. أي تعديل بعد التعبئة يعني تفريغاً كاملاً.</p>
<p>وهذي المرحلة تسبق كل شي آخر بـ<a href="/blog/first-aquarium-setup-guide">إعداد أول حوض</a>، وتؤثر على اختيار الحجم من البداية — <a href="/blog/how-to-choose-aquarium-tank">كيف تختار حوض سمك</a>.</p>
<h2>علامات التسريب المبكرة</h2>
<p>الأحواض نادراً ما تنفجر فجأة؛ غالباً تعطي إشارات أولاً. ما تراقبه:</p>
<ul>
  <li><strong>رطوبة أو أثر ملحي أبيض</strong> على حافة القاعدة أو الطاولة تحتها.</li>
  <li><strong>فقاعات أو انفصال داخل خط السيليكون</strong> بالزوايا — الشريط يجب أن يكون متصلاً وملتصقاً بالكامل.</li>
  <li><strong>انخفاض منسوب أسرع من التبخر المعتاد</strong>، خصوصاً إن كان الحوض مغطى.</li>
  <li><strong>أي تشقق بالزجاج</strong> مهما بدا سطحياً — لا يُهمل ولا يُنتظر.</li>
</ul>
<p>والسيليكون العلوي التجميلي غير السيليكون البنيوي بين الألواح؛ إصلاح الثاني عمل دقيق يتطلب تفريغاً كاملاً وتجفيفاً وإزالة كاملة للقديم، وكثيرون يفضّلون الاستبدال. وإذا لاحظت أياً من هذا، فرّغ الحوض قبل النقل — <a href="/blog/transporting-fish-and-aquarium">نقل الأسماك والحوض</a> — ولا تحرّكه وفيه ماء.</p>' WHERE slug = 'aquarium-placement-and-stand';

UPDATE blog_posts SET content = '<h2>الأسماك تتحمل الجوع أكثر مما تتحمل الماء الفاسد</h2>
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
<p>لا تعوّض الصيام بوجبة كبيرة. ابدأ بكمية صغيرة، وافحص الأمونيا والنتريت قبل أي شي آخر، وغيّر جزءاً من الماء إذا كانت القراءات مرتفعة أو الغياب طويلاً.</p>
<h2>موزّعات العلف الأوتوماتيكية: متى تنفع ومتى تؤذي</h2>
<p>الموزّع يحل مشكلة الغياب الطويل، لكنه يضيف مخاطرة جديدة: عطل يفرّغ الكمية كلها دفعة واحدة، وهذا أسوأ من الجوع.</p>
<ul>
  <li><strong>جرّبه أسبوعاً قبل السفر</strong> وأنت موجود، وراقب الكمية الفعلية لكل وجبة.</li>
  <li><strong>اضبطه أقل مما تظن.</strong> السمكة البالغة تتحمل قلة الأكل بسهولة، ولا تتحمل ماءً فاسداً — وهذا يبقى مبدأ هذا المقال كله.</li>
  <li><strong>الرطوبة تكتّل العلف</strong> وتسد المخرج؛ ضعه بعيداً عن بخار السطح.</li>
  <li><strong>للغياب القصير لا تحتاجه أصلاً.</strong></li>
</ul>' WHERE slug = 'aquarium-care-while-traveling';

UPDATE blog_posts SET content = '<h2>الفلتر ما ينظف الماء — يسكّن البكتيريا</h2>
<p>أغلب المبتدئين يظنون وظيفة الفلتر شفط الأوساخ المرئية. هذي وظيفة واحدة من ثلاث، وأقلها أهمية:</p>
<ul>
  <li><strong>ميكانيكية</strong> — يحجز الجزيئات العالقة. هذي اللي تشوفها.</li>
  <li><strong>بيولوجية</strong> — البكتيريا النافعة تسكن الميديا وتحوّل الأمونيا. <strong>هذي اللي تبقي الأسماك حية.</strong></li>
  <li><strong>كيميائية</strong> — الكربون النشط وما شابهه يمتص الروائح والتانين والأدوية. اختيارية.</li>
</ul>
<blockquote>لهذا غسل ميديا الفلتر بماء الحنفية أشهر غلطة قاتلة: الكلور يقتل مستعمرة البكتيريا، فيرجع حوضك المستقر إلى حالة حوض جديد بلا ما تنتبه. اغسل الإسفنج بماء مسحوب من الحوض نفسه. الآلية كاملة في <a href="/blog/nitrogen-cycle-simple-arabic-explained">الدورة البيولوجية</a>.</blockquote>

<h2>اختر بحجم الحوض أولاً</h2>
<table>
  <tr><th>حجم الحوض</th><th>الأنسب</th><th>ليش</th></tr>
  <tr><td>أقل من ٤٠ لتر، أو حوض فايتر</td><td>إسفنجي</td><td>تيار لطيف ما يرهق السمكة، وترشيح بيولوجي ممتاز</td></tr>
  <tr><td>٤٠–١٠٠ لتر</td><td>داخلي، أو معلّق على الحافة</td><td>ترشيح ميكانيكي أقوى بسعر معقول</td></tr>
  <tr><td>أكثر من ١٥٠ لتر</td><td>خارجي (Canister)</td><td>سعة ميديا كبيرة، وما ياخذ مساحة داخل الحوض</td></tr>
  <tr><td>حوض تفريخ أو عزل</td><td>إسفنجي</td><td>ما يسحب الصغار ولا الروبيان</td></tr>
</table>

<h2>مقارنة الأنواع</h2>
<table>
  <tr><th></th><th>إسفنجي</th><th>داخلي</th><th>خارجي</th></tr>
  <tr><td>الترشيح البيولوجي</td><td>ممتاز</td><td>مقبول</td><td>ممتاز</td></tr>
  <tr><td>الترشيح الميكانيكي</td><td>ضعيف</td><td>جيد</td><td>الأقوى</td></tr>
  <tr><td>آمن للصغار والروبيان</td><td>نعم</td><td>يحتاج غطاء على المدخل</td><td>يحتاج غطاء على المدخل</td></tr>
  <tr><td>يحتاج مضخة هواء</td><td>نعم</td><td>لا</td><td>لا</td></tr>
  <tr><td>يأخذ مساحة داخل الحوض</td><td>نعم</td><td>نعم</td><td>لا</td></tr>
  <tr><td>الصيانة</td><td>الأسهل</td><td>كل أسبوعين تقريباً</td><td>الأقل تكراراً، والأطول وقتاً</td></tr>
</table>

<h2>معدل التدوير: الرقم اللي ينفع فعلاً</h2>
<p>القاعدة العملية: الفلتر يمرّر ما بين <strong>٤ و٦ أضعاف حجم الحوض بالساعة</strong>. حوض ١٠٠ لتر يريد فلتراً بتصريف ٤٠٠–٦٠٠ لتر/ساعة تقريباً.</p>
<p>لكن انتبه: الرقم المكتوب على العلبة تصريف الفلتر <em>فارغاً</em>. مع الميديا والخراطيم والارتفاع ينزل عملياً، فاختر أعلى من حسابك بهامش. ومع الأسماك اللي ما تحب التيار القوي — مثل الفايتر — وجّه المخرج على الزجاج لتكسير التيار بدل ما تختار فلتراً أضعف.</p>

<h2>الأخطاء اللي تكسر الفلتر</h2>
<ul>
  <li><strong>غسل الميديا بماء الحنفية.</strong> الغلطة الأولى بلا منازع. تفاصيل معالجة الماء في <a href="/blog/how-to-treat-tap-water-for-fish-iraq">معالجة ماء الحنفية</a>.</li>
  <li><strong>تبديل كل الميديا دفعة واحدة.</strong> إذا لازم تبدل، بدّل جزءاً واتركه أسبوعين ليستوطن الجزء الجديد.</li>
  <li><strong>إطفاء الفلتر ساعات طويلة.</strong> البكتيريا تحتاج ماءً يمر عليها ليجلب لها الأوكسجين والغذاء. بعد انقطاع طويل اغسل الميديا بماء الحوض قبل التشغيل — شوف <a href="/blog/power-outage-emergency-aquarium-tools">أدوات الطوارئ</a>.</li>
  <li><strong>فلتر أصغر من الحوض.</strong> يشتغل بلا توقف وما يكفي، ويستهلك عمره أسرع.</li>
</ul>

<h2>الخلاصة</h2>
<p>اختر النوع بحجم حوضك ونوع أسماكك، لا بالسعر. الإسفنجي خيار محترم جداً للأحواض الصغيرة وأحواض التفريخ، والخارجي هو الأفضل للأحواض الكبيرة. وأياً كان اختيارك، الميديا البيولوجية هي القيمة الحقيقية — تفاصيل أنواعها في <a href="/blog/filter-media-ceramic-rings-bioballs">ميديا الفلترة وحلقات السيراميك</a>، والمقارنة بين السامب والخارجي في <a href="/blog/sump-vs-canister-filter-comparison">السامب مقابل الفلتر الخارجي</a>. تتوفر في AQUAVO فلاتر إسفنجية وميديا فلترة وقطن وحلقات سيراميك ضمن قسم الفلترة والتنقية.</p>
<h2>المعقّم فوق البنفسجي: هل تحتاجه؟</h2>
<p>سؤال يتكرر، والجواب لأغلب الأحواض المنزلية: <strong>لا</strong>.</p>
<ul>
  <li><strong>ما يفعله:</strong> يعالج ما يمر به من كائنات عالقة <em>بالماء</em> — ولهذا يُذكر مع الماء الأخضر تحديداً.</li>
  <li><strong>ما لا يفعله:</strong> لا يعالج ما يستقر على السمكة أو القاع أو الزجاج، ولا يعوّض ماءً رديئاً أو حوضاً مكتظاً.</li>
  <li><strong>ولا يغني عن الحجر الصحي</strong> ولا عن تبديل الماء — <a href="/blog/quarantine-new-fish-guide">الحجر الصحي</a>.</li>
</ul>
<p>يعني: أداة لحالة محددة، لا ترقية عامة. الحوض المتوازن لا يحتاجها، والحوض غير المتوازن لن تصلحه.</p>' WHERE slug = 'filter-types-guide';

UPDATE blog_posts SET content = '

<h2>مقدمة في ترتيب صخور الحوض</h2>
<p>ترتيب صخور الحوض أو ما يعرف باسم <strong>هاردسكيب</strong> هو فن يحتاج إلى خيال وجمال، حيث يعتبر أحد أهم العناصر في تصميم حوض السمك، ويهدف إلى خلق بيئة طبيعية جميلة ومثيرة للاهتمام. في العراق، حيث يمكن أن تصل درجات الحرارة إلى 50 درجة مئوية في الصيف، يجب على هواة تربية الأسماك اختيار الصخور المناسبة التي يمكنها تحمل الظروف القاسية.</p>

<h3>اختيار الصخور المناسبة</h3>
<p>عند اختيار الصخور، يجب على هواة تربية الأسماك في العراق النظر في عدة عوامل، منها:</p>
<ul>
  <li>نوعية الصخر: يجب اختيار صخور غير قابلة للانحلال، مثل الصخور الجرانيتية أو الرملية.</li>
  <li>حجم الصخر: يجب اختيار صخور بمقاس مناسب لحوض السمك.</li>
  <li>شكل الصخر: يجب اختيار صخور بأشكال متنوعة لتحقيق تأثير ثلاثي الأبعاد.</li>
</ul>
<p>قبل إدخال أي صخرة إلى الحوض، تأكد أنها خاملة كيميائياً: ضع بضع قطرات من الخل عليها، فإذا تفاعلت وأطلقت فقاعات فهي جيرية وسترفع العسر والقلوية مع الوقت.</p>

<h2>طرق ترتيب صخور الحوض</h2>
<p>هناك عدة طرق لترتيب صخور الحوض، ومنها:</p>
<ol>
  <li>طريقة التدرج: حيث يتم ترتيب الصخور في تدرج يمتد من الأسفل إلى الأعلى.</li>
  <li>طريقة الدائرة: حيث يتم ترتيب الصخور في دائرة حول نقطة مركزية.</li>
  <li>طريقة التفرع: حيث يتم ترتيب الصخور في شكل تفرع يمتد من نقطة مركزية.</li>
</ol>
<p>في كل حالة، يجب على هواة تربية الأسماك التأكد من أن الصخور موزعة بشكل متساوٍ في الحوض لتحقيق تأثير ثلاثي الأبعاد.</p>

<blockquote>نصيحة ذهبية من AQUAVO: يجب على هواة تربية الأسماك في العراق التأكد من أن حوض السمك يحتوي على نظام تنقية مياه فعال لمنع تراكم المواد الكيميائية الضارة، مع معالجة ماء الصنبور من الكلور قبل استخدامه.</blockquote>

<h3>معالجة الصخور قبل ترتيبها</h3>
<p>قبل ترتيب الصخور، يجب على هواة تربية الأسماك في العراق معالجتها لمنع انتشار البكتيريا والفطريات، حيث يمكن استخدام مواد معالجة مثل الكلور أو الفورمالدهيد. بعد المعالجة، يجب غسل الصخور جيدًا قبل ترتيبها في الحوض.</p>

<h2>استخدام صخور الحوض في العراق</h2>
<p>في العراق، حيث توجد مشاكل في إمدادات المياه والكهرباء، يجب على هواة تربية الأسماك التأكد من أن حوض السمك مصمم لتحمل الظروف القاسية. يمكن استخدام صخور الحوض لتحقيق ذلك، حيث يمكنها مساعدة في توفير بيئة مستقرة للأسماك.</p>

<p>باستخدام صخور الحوض بشكل صحيح، يمكن للهواة في العراق خلق حوض سمك رائع يضفي جمالًا وجمالًا على المنزل. مع تقديم <strong>AQUAVO</strong> لخدمات توصيل المنتجات إلى 18 محافظة في العراق، يمكن لجميع الهواة الوصول إلى أفضل المنتجات والخدمات لتصميم حوض السمك الحلم.</p>
<p>وإذا أردت تطبيق هذي المبادئ بأسلوب محدد فـ<a href="/blog/iwagumi-aquascape-step-by-step">الإيواغومي</a> أوضح مدرسة تعتمد على الحجر وحده. وللتنفيذ بكلفة أقل <a href="/blog/budget-aquascaping">ديكور بميزانية محدودة</a>، وللعمق الكامل خلف الزجاج <a href="/blog/diy-3d-aquarium-background">الخلفيات ثلاثية الأبعاد</a>.</p>
<h2>قواعد التكوين: أين تضع القطعة الرئيسية</h2>
<p>ثلاث قواعد بسيطة تفسّر لماذا يبدو ترتيب أفضل من آخر:</p>
<ul>
  <li><strong>لا تضع القطعة الرئيسية بالمنتصف تماماً.</strong> المركز الحرفي يقسم المشهد نصفين متساويين ويبدو ساكناً؛ إزاحتها عن المنتصف تعطي حركة.</li>
  <li><strong>نقطة تركيز واحدة.</strong> قطعتان تتنافسان على الانتباه تلغيان بعضهما — واحدة تقود، والبقية تدعم.</li>
  <li><strong>أعداد فردية.</strong> ثلاث صخور أو خمس تبدو طبيعية أكثر من اثنتين أو أربع، لأن الزوجي يميل للتناظر والتناظر يبدو مصنوعاً.</li>
</ul>
<p>وطبّقها على المنحدر والعمق المشروحين أعلاه، وشوف تطبيقاً كاملاً بـ<a href="/blog/iwagumi-aquascape-step-by-step">الإيواغومي</a>.</p>' WHERE slug = 'hardscape-rock-arrangement-visual-depth';

UPDATE blog_posts SET content = '<h2>الأوكسجين هو أول ما ينفد، وآخر ما ينتبه له أحد</h2>
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
<p>توقف الفلتر والمضخة يعني توقف تجديد السطح — بالضبط لما يكون الحوض محتاجه. الإجراء اليدوي البسيط: اغرف ماءً بكوب وصبّه من ارتفاع بسيط كل فترة، فهذا يحرك السطح ويجدد التماس. وقلّل العلف تماماً حتى ترجع الكهرباء. التفاصيل في <a href="/blog/power-outage-emergency-aquarium-tools">أدوات الطوارئ عند انقطاع الكهرباء</a>.</p>
<h2>التيار نفسه، لا المضخة وحدها</h2>
<p>مضخة الهواء واحدة من طرق تحريك الماء، لكن الحركة نفسها عامل بيئي أوسع: توزيع الأوكسجين، ومناطق الركود اللي تتجمع فيها الفضلات، ومقدار الجهد اللي تبذله السمكة للبقاء بمكانها.</p>
<p>وتحريك السطح تحديداً أهم من قوة التيار بالعمق، لأن تبادل الغازات يحصل عند السطح. التفصيل الكامل — بما فيه كيف تكتشف المناطق الميتة وعلامات أن التيار صار كثيراً — بـ<a href="/blog/aquarium-water-flow">التيار وحركة الماء</a>.</p>
<h2>الضجيج والاهتزاز</h2>
<p>مضخة الهواء أكثر مصدر ضجيج بالحوض، وأغلبه قابل للحل:</p>
<ul>
  <li><strong>الاهتزاز ينتقل للسطح.</strong> ضع المضخة على قطعة إسفنج أو قماش مطوي بدل السطح الصلب مباشرة — أبسط إجراء وأكبر فرق.</li>
  <li><strong>لا تضعها على الحوض نفسه</strong>؛ الزجاج ينقل الاهتزاز ويضخّمه.</li>
  <li><strong>حجر الهواء المسدود يرفع المقاومة</strong> فيزيد الصوت — نظّفه أو استبدله.</li>
  <li><strong>الأنبوب المشدود ينقل الاهتزاز.</strong> اتركه مرتخياً بانحناءة.</li>
  <li><strong>ولا تضع الحوض بغرفة نوم</strong> إن كان الصوت يزعجك — <a href="/blog/aquarium-bedroom-feng-shui-sound-effect">الحوض في غرفة النوم</a>.</li>
</ul>' WHERE slug = 'air-pumps-decoration-or-necessity';

UPDATE blog_posts SET content = '<h2>الأكياس والصناديق: ما يهم فعلاً</h2>
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
<p>ولا تضف أسماكاً جديدة قبل استقرار الحوض بأسابيع.</p>
<h2>تفكيك حوض قائم وإعادة تشغيله</h2>
<p>نقل حوض مؤسس ليس نقل أثاث: أنت تنقل منظومة حية، وأثمن ما فيها ليس الزجاج بل البكتيريا.</p>
<ol>
  <li><strong>ميديا الفلتر أولاً وأخيراً.</strong> ضعها بكيس مملوء بماء الحوض نفسه، ولا تدعها تجف ولو دقائق — الجفاف يقتل المستعمرة ويعيدك لنقطة الصفر.</li>
  <li><strong>احتفظ بأكبر قدر من ماء الحوض</strong> لإعادة الملء — يقلل الصدمة، وإن كانت البكتيريا بالميديا لا بالماء.</li>
  <li><strong>الركيزة تحمل فضلات.</strong> تحريكها يطلقها، فتوقّع عكارة وارتفاع أمونيا بعد التشغيل.</li>
  <li><strong>شغّل الفلتر والسخان فوراً</strong> بعد إعادة الملء.</li>
  <li><strong>افحص يومياً أول أسبوع</strong> — تعامل مع الحوض كأنه يدوّر من جديد — <a href="/blog/nitrogen-cycle-simple-arabic-explained">الدورة البيولوجية</a>.</li>
  <li><strong>وأطعم قليلاً جداً</strong> بالأيام الأولى.</li>
</ol>' WHERE slug = 'transporting-fish-and-aquarium';

UPDATE blog_posts SET content = '<h2>قبل أي شي: النحاس يقتلها</h2>
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
<p>ولحساب حمل حوضك قبل الإضافة شوف <a href="/blog/how-many-fish-in-aquarium">كم سمكة يتحمل حوضك</a>.</p>
<h2>ليش ما تكبر المستعمرة</h2>
<p>الروبيان يتكاثر من نفسه بظروف مناسبة، فإذا بقي العدد ثابتاً أو تناقص فالسبب غالباً واحد من هذي:</p>
<ul>
  <li><strong>الصغار تُسحب للفلتر.</strong> أشيع سبب صامت — إسفنجة على فتحة السحب تحل المسألة.</li>
  <li><strong>لا مخابئ كافية.</strong> الصغار تحتاج نباتاً كثيفاً أو طحلباً؛ الحوض العاري يعني افتراساً كاملاً.</li>
  <li><strong>مشاكل الانسلاخ.</strong> الروبيان يبني قشرته من معادن الماء، وماء فقير جداً بالمعادن يصعّب الانسلاخ — وهو من أخطر لحظات حياته.</li>
  <li><strong>تذبذب المعادن.</strong> الثبات أهم من الرقم — <a href="/blog/gh-kh-water-hardness-guide">دليل GH و KH</a>.</li>
  <li><strong>سمكة تأكلها.</strong> أسماك كثيرة تعتبر الروبيان الصغير طعاماً حتى لو تعايشت مع البالغ.</li>
</ul>
<p>ولا تتدخل أثناء الانسلاخ ولا ترفع القشرة المتروكة — تُستهلك مجدداً.</p>' WHERE slug = 'aquarium-shrimp-snails-guide';

UPDATE blog_posts SET content = '<h2>التنظيف الخاطئ يقتل أكثر مما ينظّف</h2>
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
<p>هدف التنظيف إزالة <strong>الفائض</strong> — علف زائد وفضلات ونترات متراكمة — لا إزالة الحياة الدقيقة التي تدير الحوض. أقل تدخلاً وأكثر انتظاماً أفضل من حملة تنظيف شاملة كل شهرين. وتفاصيل شق الماء في <a href="/blog/aquarium-water-change-guide">دليل تغيير الماء</a>.</p>
<h2>ونظافتك أنت أثناء التنظيف</h2>
<p>كل ما سبق عن نظافة الحوض. لكن التنظيف هو أكثر لحظة تلامس فيها يدك ماء الحوض، ويستحق احتياطاً بسيطاً بالاتجاه المعاكس: غطِّ أي جرح بيدك قبل الإدخال، واغسل يديك بعد الانتهاء، ولا تشفط السيفون بفمك إطلاقاً.</p>
<p>التفصيل — ولماذا يهم أن تخبر طبيبك أن عندك حوضاً لو ظهر التهاب جلدي لا يتحسن — بـ<a href="/blog/aquarium-hygiene-and-human-safety">نظافة الحوض وسلامتك أنت</a>.</p>' WHERE slug = 'how-to-clean-aquarium-properly';

UPDATE blog_posts SET content = '<h2>التيار عامل مستقل، لا نتيجة جانبية للفلتر</h2>
<p>أغلب الهواة يختارون الفلتر ثم يقبلون بأي تيار ينتج عنه. لكن حركة الماء عامل بيئي بحد ذاته: تقرر أين يصل الأوكسجين، وأين تترسب الفضلات، وأي سمكة ترتاح وأيها تنهك.</p>
<blockquote>أوضح دليل على أهميته: حوضان بنفس اللترات ونفس الأسماك ونفس الفلتر قد يتصرفان بشكل مختلف تماماً إذا كان أحدهما يوجّه المخرج للسطح والآخر للزجاج الجانبي.</blockquote>
<table>
  <tr><th>مستوى التيار</th><th>يناسب</th><th>علامة أنه غلط</th></tr>
  <tr><td>هادئ</td><td>البيتا، الغورامي، الأنواع طويلة الزعانف</td><td>ركود وبقع فضلات ثابتة بالقاع</td></tr>
  <tr><td>متوسط</td><td>أغلب الحوض المجتمعي</td><td>—</td></tr>
  <tr><td>قوي</td><td>الأنواع النشيطة والسبّاحة</td><td>سمكة تختبئ دائماً أو تسبح بمكانها بجهد</td></tr>
</table>

<h2>السطح أهم من العمق</h2>
<p>تبادل الغازات يحصل عند سطح الماء. الأوكسجين يدخل والثاني أكسيد الكربون يخرج من هناك، لا من عمق الحوض. ولهذا <strong>تحريك السطح</strong> أهم عملياً من قوة التيار داخل الماء.</p>
<ul>
  <li><strong>سطح ساكن تماماً</strong> يعني تبادلاً ضعيفاً، وهذا يظهر أولاً بالليل حين تتوقف النباتات عن إنتاج الأوكسجين وتستهلكه.</li>
  <li><strong>طبقة زيتية على السطح</strong> علامة ركود سطحي — تعني أن التبادل معطّل جزئياً.</li>
  <li><strong>وبصيف العراق</strong> المسألة تصير حرجة: الماء الأدفأ يحمل أوكسجيناً أقل، فنفس التيار الكافي شتاءً قد لا يكفي — <a href="/blog/protect-fish-iraqi-summer-50-degrees">حرارة الصيف</a> و<a href="/blog/air-pumps-decoration-or-necessity">متى تكون مضخة الهواء ضرورة</a>.</li>
</ul>

<h2>مناطق ميتة: المشكلة اللي ما تنتبه لها</h2>
<p>التيار نادراً ما يكون موزعاً بالتساوي. تتشكل زوايا وبقع خلف الديكور لا يصلها جريان، فتتجمع فيها الفضلات وبقايا العلف وتتحلل موضعياً.</p>
<ol>
  <li><strong>كيف تكتشفها:</strong> أطفئ التغذية ليوم وراقب أين تستقر الجزيئات العالقة. المكان اللي تتجمع فيه ولا تتحرك هو منطقة ميتة.</li>
  <li><strong>لماذا تهم:</strong> هي مصدر صامت للأمونيا ولنمو طحالب موضعي — <a href="/blog/ammonia-spike-emergency-treatment">ارتفاع الأمونيا</a> و<a href="/blog/algae-war-guide">دليل الطحالب</a>.</li>
  <li><strong>الحل ليس فلتراً أقوى دائماً.</strong> غالباً يكفي توجيه المخرج بزاوية مختلفة أو تحريك قطعة ديكور — <a href="/blog/hardscape-rock-arrangement-visual-depth">ترتيب الصخور</a>.</li>
  <li><strong>والسيفون يبقى ضرورياً</strong> مهما كان التيار جيداً — <a href="/blog/how-to-clean-aquarium-properly">تنظيف الحوض</a>.</li>
</ol>

<h2>متى يكون التيار كثيراً</h2>
<p>السمكة لا "تتمرن" بالتيار القوي — تُجهَد. والإجهاد المزمن يضعف المناعة كأي ضغط آخر.</p>
<ul>
  <li><strong>سمكة تسبح بمكانها</strong> باستمرار ضد التيار لتثبت موقعها.</li>
  <li><strong>اختباء دائم</strong> خلف الديكور بجهة واحدة من الحوض.</li>
  <li><strong>زعانف مطوية</strong> على الجسم أغلب الوقت.</li>
  <li><strong>صعوبة الأكل</strong> — الطعام يُجرف قبل ما تلحقه، وهذا يضر البطيئة مثل <a href="/blog/discus-fish-care-guide">الديسكس</a> و<a href="/blog/gourami-care-guide">الغورامي</a>.</li>
</ul>
<p>والحل العملي كسر التيار لا إلغاؤه: توجيه المخرج نحو الزجاج أو السطح، أو استخدام نبات وخشب كحواجز تخلق مناطق هادئة تتنقل بينها السمكة. حوض بمناطق مختلفة الشدة أفضل من حوض بشدة واحدة موحّدة.</p>
<p>وللنباتات فائدة مزدوجة هنا: تكسر التيار وتستهلك المغذيات — <a href="/blog/best-low-tech-aquarium-plants-beginners">نباتات منخفضة الاحتياج</a>. وعند اختيار الفلتر خُذ التيار بالحسبان لا التصفية فقط — <a href="/blog/filter-types-guide">أي فلتر يناسب حوضك</a> و<a href="/blog/how-many-fish-in-aquarium">كم سمكة يتحمل حوضك</a>.</p>
<h2>الطبقة الزيتية على السطح</h2>
<p>غشاء رقيق يغطي سطح الماء ويكسر انعكاسه، ويبدو كطبقة دهنية ساكنة. ليس خطراً بحد ذاته، لكنه <strong>يعيق تبادل الغازات</strong> عند السطح — وهو بالضبط المكان الذي يحصل فيه.</p>
<ul>
  <li><strong>مصدره</strong> بروتينات ودهون من العلف وبقايا عضوية، تتجمع حيث لا حركة.</li>
  <li><strong>الحل الجذري تحريك السطح</strong> — وجّه مخرج الفلتر لأعلى قليلاً، أو أضف تهوية.</li>
  <li><strong>الإزالة السريعة</strong>: مرّر ورقة مطبخ على السطح فتلتقط الغشاء، وكرّرها.</li>
  <li><strong>وراجع كمية العلف</strong>، لأن الغشاء المتكرر مؤشر فائض عضوي — <a href="/blog/aquarium-fish-feeding-guide">دليل التغذية</a>.</li>
</ul>' WHERE slug = 'aquarium-water-flow';

UPDATE blog_posts SET content = '<h2>ابدأ بالماء، لا بالدواء</h2>
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
<p>ملاحظة صادقة: هذا الجدول يرتّب الاحتمالات، ولا يشخّص بشكل قاطع. أعراض كثيرة تتشارك بين أسباب مختلفة، ولهذا الفحص هو الفاصل وليس الشكل الظاهري.</p>
<h2>والعين؟ سؤال يسبق الجدول</h2>
<p>الجدول فوق ما يغطي العين، وهي من أسرع ما يلاحظه الهاوي لأنها تبيّن بالنظر. والسؤال الأول ليس "شنو المرض" بل: <strong>عين واحدة أم اثنتان؟</strong></p>
<ul>
  <li><strong>واحدة</strong> — تميل لسبب موضعي: احتكاك بديكور، عضّة، أو إصابة بعد نقل.</li>
  <li><strong>اثنتان</strong> — ترجّح سبباً أعمّ يمس السمكة كلها، وأول ما يُفحص هو الماء.</li>
</ul>
<p>وهذا ترجيح لا تشخيص، مثل بقية الجدول — التفصيل بـ<a href="/blog/fish-eye-problems">مشاكل عين السمكة</a>.</p>' WHERE slug = 'fish-disease-symptoms-diagnosis';

UPDATE blog_posts SET content = '<h2>قاعدة "إنش لكل غالون" غلط، وهذا سبب انتشارها</h2>
<p>القاعدة الشائعة تقول: إنش واحد من طول السمكة لكل غالون ماء. سهلة، سهلة الحفظ، ومنتشرة بكل مكان — ومع ذلك غير موثوقة، لأنها تتجاهل كل ما يهم فعلاً.</p>
<table>
  <tr><th>ما تتجاهله القاعدة</th><th>ليش يهم</th></tr>
  <tr><td>كتلة الجسم</td><td>سمكة ممتلئة بطول ١٢ إنشاً تطرح فضلات أكثر بكثير من اثنتي عشرة سمكة نحيلة بطول إنش</td></tr>
  <tr><td>الأيض</td><td>الحمل الحيوي يتبع الكتلة ومعدل الأيض، لا الطول</td></tr>
  <tr><td>قوة الفلترة</td><td>نفس الحوض يتحمل أكثر مع فلتر خارجي قوي منه مع فلتر إسفنجي بسيط</td></tr>
  <tr><td>مساحة السطح</td><td>تبادل الغازات يصير عند السطح؛ حوض واطئ وعريض يتحمل أكثر من حوض عالٍ ضيّق بنفس اللترات</td></tr>
  <tr><td>السلوك</td><td>سمكة إقليمية تحتاج مساحة لا علاقة لها بالتلوث، والأسماك السربية تحتاج عدداً أدنى وإلا تمرض من التوتر</td></tr>
</table>
<p>أي قاعدة تختصر خمسة عوامل برقم واحد راح تخطئ. ولهذا الحاسبات الجادة تشغّل أكثر من طريقة بنفس الوقت بدل الاعتماد على واحدة.</p>

<h2>العوامل الخمسة التي تقرر فعلاً</h2>
<ol>
  <li><strong>الحجم البالغ، لا حجم الشراء.</strong> السمكة اللي بالمتجر بطول ٣ سم ممكن توصل ٣٠. خطط للبالغ من اليوم الأول — الجولدفش المثال الأشهر، وتفاصيله في <a href="/blog/goldfish-5-deadly-mistakes-beginners">أخطاء الجولدفش</a>.</li>
  <li><strong>الحمل الحيوي.</strong> سمكة ممتلئة الجسم وشرهة تلوّث أضعاف سمكة نحيلة بنفس الطول.</li>
  <li><strong>قوة الترشيح.</strong> راجع <a href="/blog/filter-types-guide">اختيار الفلتر</a> — الفلتر هو ما يحدد كم أمونيا يعالج حوضك بالساعة.</li>
  <li><strong>مساحة السطح والحرارة.</strong> الماء الحار يذوّب أوكسجين أقل، فحوض عراقي بالصيف يتحمل عدداً أقل من نفس الحوض بالشتاء. الآلية في <a href="/blog/protect-fish-iraqi-summer-50-degrees">حرارة الصيف</a>.</li>
  <li><strong>السلوك والتوافق.</strong> عدد سربي أدنى، وحاجة إقليمية، وتوافق حرارة و pH بين الأنواع.</li>
</ol>

<h2>الجواب العملي: خلّ الحوض يخبرك</h2>
<p>ما راح نعطيك معادلة، لأن ما موجودة معادلة تصمد. لكن يوجد اختبار قاطع يعطيك الجواب عن حوضك أنت:</p>
<blockquote>حوضك <strong>ليس</strong> مكتظاً إذا كانت الأمونيا صفراً والنتريت صفراً، والنترات تبقى مستقرة بين تغييرَي ماء بجدولك المعتاد. إذا ارتفعت الأمونيا أو صارت النترات تتسلق أسبوعاً بعد أسبوع رغم التغيير، فأنت فوق طاقة الحوض — مهما قالت أي قاعدة.</blockquote>
<p>هذا مو تهرباً من السؤال، بل أدق جواب ممكن: القراءتان تقيسان النتيجة الفعلية لكل العوامل الخمسة مجتمعة. شرائط الفحص واختبارات الأمونيا والنتريت متوفرة في AQUAVO ضمن الفحص والمراقبة.</p>

<h2>علامات الاكتظاظ قبل ما تظهر بالأرقام</h2>
<ul>
  <li>أسماك تلزم السطح وتلهث، خصوصاً الصبح قبل ما تشتغل الإضاءة.</li>
  <li>ماء يتعكر بسرعة بعد كل تنظيف.</li>
  <li>طحالب تعود بعناد رغم ضبط الإضاءة — نترات مرتفعة مزمنة.</li>
  <li>عدوانية وتمزق زعانف: مشكلة مساحة، لا مشكلة ماء.</li>
  <li>أمراض متكررة بلا سبب واضح — الاكتظاظ إجهاد مزمن يضعف المناعة.</li>
</ul>

<h2>ابدأ ناقصاً</h2>
<p>القاعدة الوحيدة اللي ننصح بها بثقة: <strong>ابدأ بعدد أقل مما تظن</strong>، وأضف تدريجياً على دفعات صغيرة متباعدة بأسابيع. لسببين:</p>
<ul>
  <li>مستعمرة البكتيريا تكبر لتقابل الحمل، وتحتاج وقتاً. إضافة دفعة كبيرة مرة واحدة ترفع الأمونيا قبل ما تلحق البكتيريا — الآلية في <a href="/blog/nitrogen-cycle-simple-arabic-explained">الدورة البيولوجية</a>.</li>
  <li>تقدر دائماً تضيف سمكة. ما تقدر بسهولة تشيل واحدة بعد ما تعلقت فيها.</li>
</ul>
<p>ولحساب حجم حوضك بدقة قبل أي قرار استخدم <a href="/calculators">الحاسبات</a>. وإذا كنت تفكر بحوض بلا فلتر فالسقف أقل بكثير — <a href="/blog/fish-that-live-without-filter">حوض بلا فلتر</a>.</p>
<p>وأكثر ما تنكسر عنده هذي الحسبة هو الأسماك اللي تُشترى صغيرة وتكبر كثيراً: <a href="/blog/oscar-fish-care-guide-water-dog">الأوسكار</a> و<a href="/blog/arowana-fish-care-guide-prices">الأروانا</a>، وخارج البيت <a href="/blog/koi-fish-outdoor-pond-building-tips">الكوي</a> اللي مكانه بركة لا حوض. وقبل أي شي تأكد من سعة حوضك الفعلية بـ<a href="/blog/calculate-aquarium-capacity-liters">حساب السعة باللتر</a>.</p>
<h2>الحسبة تنكسر عند نقطة الشراء</h2>
<p>كل ما فوق يفترض إنك تعرف الحجم البالغ. وهنا تنكسر الحسبة عملياً: المتجر يعرض صغاراً، والقرار ينبني على الحجم اللي تشوفه لا الحجم اللي راح يصير.</p>
<ul>
  <li><strong>اسأل عن الحجم البالغ قبل الشراء</strong> لا بعده — تغيير الرأي وأنت واقف بالمتجر ما يكلف شي.</li>
  <li><strong>السمكة ما تنمو بقدر حوضها.</strong> فكرة إنها "تقف على قد الحوض" منتشرة وغير صحيحة.</li>
  <li><strong>وإذا صارت المشكلة عندك أصلاً</strong> فالخيارات محدودة، وكلها أصعب من قرار دقيقة واحدة بالمتجر.</li>
</ul>
<p>الأنواع اللي يتكرر فيها هذا والخيارات الواقعية بـ<a href="/blog/fish-that-outgrow-home-tanks">أسماك تنباع صغيرة ولا تصلح لحوض بيتي</a>.</p>' WHERE slug = 'how-many-fish-in-aquarium';

UPDATE blog_posts SET content = '<h2>أغلب الأمراض تدخل حوضك بسمكة جديدة</h2>
<p>الحوض المستقر ما يمرض من فراغ. الطفيليات والبكتيريا الممرضة تحتاج ناقلاً، والناقل الأشيع هو <strong>سمكة جديدة تبدو سليمة تماماً</strong> — لأن أغلب الأمراض لها فترة كمون تظهر بعدها بأيام.</p>
<p>الحجر الصحي حوض منفصل بسيط تضع فيه السمكة الجديدة قبل إدخالها للحوض الرئيسي. تكلفته أقل بكثير من علاج حوض كامل، والفرق بينهما إنه يحمي أسماكك القديمة، وهي عادةً الأغلى والأقدم عندك.</p>

<h2>ليش أسابيع مو أيام</h2>
<p>خذ مرض النقط البيضاء مثالاً. الطفيلي يقضي جزءاً من دورته <strong>داخل جلد السمكة</strong> حيث ما يُرى ولا يوصله الدواء، وجزءاً داخل كيس على الحصى، وجزءاً سابحاً حراً يبحث عن مضيف. لهذا:</p>
<ul>
  <li>سمكة تبدو نظيفة اليوم ممكن تحمل الطور المخفي.</li>
  <li>مدة الحجر لازم تغطي دورة كاملة على الأقل حتى يظهر المرض إن كان موجوداً.</li>
</ul>
<p>الأطوار مشروحة بالتفصيل في <a href="/blog/common-fish-diseases-white-spot">النقط البيضاء</a>.</p>
<blockquote>المدة الشائعة بين أسبوعين وأربعة أسابيع. ما لكينا مصدراً يثبت رقماً واحداً قاطعاً، فخذها كمدى: أسبوعان حد أدنى معقول، وأربعة أكثر أماناً — خصوصاً إذا حوضك الرئيسي فيه أسماك غالية أو قديمة.</blockquote>

<h2>حوض الحجر: أبسط مما تتصور</h2>
<table>
  <tr><th>العنصر</th><th>المطلوب</th><th>ليش</th></tr>
  <tr><td>الحوض</td><td>صغير، بلا حصى</td><td>القاع العاري أسهل بالتنظيف وما يخبّي أطوار الطفيليات</td></tr>
  <tr><td>الفلتر</td><td>إسفنجي</td><td>لطيف، وتقدر تشغّله مسبقاً بحوضك الرئيسي ليستوطن بالبكتيريا</td></tr>
  <tr><td>السخان</td><td>نعم</td><td>الحرارة الثابتة أهم شي لسمكة تحت الضغط</td></tr>
  <tr><td>مخبأ</td><td>أنبوب أو أصيص</td><td>يقلل التوتر، والتوتر نفسه يفتح الباب للمرض</td></tr>
  <tr><td>الإضاءة</td><td>خافتة</td><td>أهدأ للسمكة الجديدة</td></tr>
</table>
<p>أهم تفصيلة عملية: <strong>شغّل الفلتر الإسفنجي داخل حوضك الرئيسي لأسابيع قبل ما تحتاجه</strong>. هيك يكون مستوطناً بالبكتيريا وجاهزاً فوراً، وما تضطر تدوّر حوض حجر من الصفر وقت الحاجة. للأحواض الصغيرة وصناديق العزل شوف قسم العزل والتفريخ في AQUAVO.</p>

<h2>الإجراء خطوة بخطوة</h2>
<ol>
  <li><strong>لا تسكب ماء المتجر بحوضك.</strong> هذي أهم خطوة وأسهلها. انقل السمكة بشبكة أو كوب نظيف، واترك ماء الكيس خارجاً.</li>
  <li><strong>أقلم السمكة تدريجياً</strong> على حرارة وكيمياء حوض الحجر: عوّم الكيس ليتقارب الحرارة، ثم أضف قليلاً من ماء الحوض للكيس على دفعات قبل النقل.</li>
  <li><strong>راقب يومياً</strong>: بقع بيضاء، زعانف متآكلة، تنفس سريع، حك الجسم بالأسطح، رفض الأكل.</li>
  <li><strong>لا تعالج وقائياً بلا مرض.</strong> الأدوية بلا سبب تضغط على السمكة وتربّي مقاومة. الحجر للمراقبة أولاً.</li>
  <li><strong>إذا ظهر مرض</strong>، عالج داخل حوض الحجر — وهذي فائدته الثانية: تعالج سمكة واحدة بحوض صغير بدل حوض كامل.</li>
  <li><strong>انقلها للحوض الرئيسي</strong> بعد انقضاء المدة بلا أعراض.</li>
</ol>

<h2>وإذا ما عندك حوض حجر؟</h2>
<p>الحد الأدنى المقبول: لا تنقل ماء المتجر إطلاقاً، وأدخل السمكة الجديدة بعدد قليل مرة واحدة بدل دفعات متتابعة، وراقب الحوض عن قرب لأسبوعين، وافحص الأمونيا والنتريت لأن أي سمكة إضافية ترفع الحمل الحيوي فوراً.</p>
<p>وانتبه إن إضافة أسماك جديدة ترفع الحمل على الترشيح — إذا كان حوضك أصلاً على حافة طاقته فالإضافة وحدها ممكن تسبب ارتفاع أمونيا بلا أي مرض. شوف <a href="/blog/how-many-fish-in-aquarium">كم سمكة يتحمل حوضك</a> و<a href="/blog/nitrogen-cycle-simple-arabic-explained">الدورة البيولوجية</a>.</p>
<p>وسبب الحاجة للحجر يبدأ قبل المتجر: أغلب أسماك الزينة تمر بسلسلة نقل طويلة قبل ما توصل — <a href="/blog/ornamental-fish-import-middle-east-origins">من أين تجي أسماك المتاجر</a>. ولهذا يهم من تشتري منه، خصوصاً مع البيع الإلكتروني — <a href="/blog/avoid-fake-fish-stores-instagram-scams">المتاجر الوهمية</a>.</p>
<h2>الحجر ما يعوّض اختياراً سيئاً</h2>
<p>الحجر يمسك ما يظهر خلال أسابيع، لكنه ما يصلح سمكة اشتريتها وهي أصلاً منهكة. أرخص علاج يبقى سمكة ما اشتريتها.</p>
<ul>
  <li><strong>انظر للمنظومة كلها</strong> لا للسمكة وحدها: حوض المتجر وجيرانها يقولون عنها أكثر مما تقول هي.</li>
  <li><strong>اطلب أن تشوفها تأكل</strong> قبل ما تدفع.</li>
  <li><strong>وإذا اشتريتها يبقى الحجر إلزامياً</strong> — الاختيار الجيد يقلل الاحتمال، ما يلغيه.</li>
</ul>
<p>وما الذي تنظر إليه بالضبط: <a href="/blog/choosing-healthy-fish-in-store">اختيار سمكة سليمة قبل الشراء</a>.</p>' WHERE slug = 'quarantine-new-fish-guide';

-- Post-flight.
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM blog_posts WHERE is_published;
  IF n <> 115 THEN RAISE EXCEPTION 'expected 115 published, found %', n; END IF;

  SELECT count(*) INTO n FROM blog_posts
   WHERE slug IN ('choosing-healthy-fish-in-store', 'aquarium-hygiene-and-human-safety', 'fish-that-outgrow-home-tanks', 'fish-eye-problems', 'ph-level-iraqi-tap-water-fish')
     AND is_published AND length(content) > 2500
     AND content LIKE '%<table%' AND content LIKE '%href="/blog/%';
  IF n <> 5 THEN RAISE EXCEPTION 'only % of 5 full articles carry their structure', n; END IF;

  SELECT count(*) INTO n FROM blog_posts
   WHERE slug IN ('choosing-healthy-fish-in-store', 'aquarium-hygiene-and-human-safety', 'fish-that-outgrow-home-tanks', 'fish-eye-problems') AND author = 'AQUAVO Editorial Team';
  IF n <> 4 THEN RAISE EXCEPTION 'only % of 4 new articles carry the editorial byline', n; END IF;

  -- Every article this batch creates must be reachable FROM THE ARTICLES THAT
  -- ALREADY EXISTED. An inbound link from another article in the same batch is
  -- not discoverability: the first projection of this batch passed a plain
  -- inbound check while three of the four new articles pointed only at each
  -- other, an island nothing else reached.
  SELECT count(*) INTO n FROM (
    SELECT t.slug FROM blog_posts t
     WHERE t.slug IN ('choosing-healthy-fish-in-store', 'aquarium-hygiene-and-human-safety', 'fish-that-outgrow-home-tanks', 'fish-eye-problems')
       AND NOT EXISTS (
         SELECT 1 FROM blog_posts b
          CROSS JOIN LATERAL regexp_matches(b.content, 'href="/blog/([^"#?]+)"', 'g') AS m(parts)
          WHERE b.is_published AND b.slug <> t.slug
            AND b.slug NOT IN ('choosing-healthy-fish-in-store', 'aquarium-hygiene-and-human-safety', 'fish-that-outgrow-home-tanks', 'fish-eye-problems')
            AND m.parts[1] = t.slug)
  ) AS orphaned;
  IF n <> 0 THEN RAISE EXCEPTION '% new articles are not reachable from the established corpus', n; END IF;

  -- The rewritten article must not carry a blanket claim about Iraqi water.
  SELECT count(*) INTO n FROM blog_posts
   WHERE slug = 'ph-level-iraqi-tap-water-fish'
     AND content ~ 'ماء العراق (قاسي|قلوي)|المياه العراقية (قاسية|قلوية)';
  IF n <> 0 THEN RAISE EXCEPTION 'the rewrite carries a blanket Iraqi-water claim'; END IF;

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
   WHERE slug IN ('choosing-healthy-fish-in-store', 'aquarium-hygiene-and-human-safety', 'fish-that-outgrow-home-tanks', 'fish-eye-problems', 'ph-level-iraqi-tap-water-fish', 'aquarium-water-change-guide', 'why-fish-die-suddenly-rescue-guide', 'fish-treatment-protocol', 'internal-fish-parasites', 'aquarium-fish-feeding-guide', 'algae-war-guide', 'aquarium-placement-and-stand', 'aquarium-care-while-traveling', 'filter-types-guide', 'hardscape-rock-arrangement-visual-depth', 'air-pumps-decoration-or-necessity', 'transporting-fish-and-aquarium', 'aquarium-shrimp-snails-guide', 'how-to-clean-aquarium-properly', 'aquarium-water-flow', 'fish-disease-symptoms-diagnosis', 'how-many-fish-in-aquarium', 'quarantine-new-fish-guide')
     AND content ~ '[一-鿿぀-ヿ가-힯Ѐ-ӿऀ-ॿ฀-๿֐-׿Ā-ɏḀ-ỿ]';
  IF n <> 0 THEN RAISE EXCEPTION 'a final-batch article carries stray script'; END IF;
END $$;

COMMIT;

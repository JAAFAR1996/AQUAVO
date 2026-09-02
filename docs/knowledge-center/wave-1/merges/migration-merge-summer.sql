-- Migration ID: kc-wave1-merge-summer-20260902
-- Target:       Neon production, blog_posts (1 rewritten, 2 unpublished)
-- Rollback:     rollback-merge-summer.sql
-- Pairs with:   two permanent redirects added to vercel.json in the same commit.
--
-- Three articles competed for the same query — the worst duplication in the
-- corpus. The survivor keeps the strongest slug ("50 degrees" is what Iraqi
-- readers actually type) and takes an entirely new body, because its own
-- content was circular and recommended cooling fans and fish air-conditioners
-- that do not exist in the catalogue.
--
-- The one article with real content (iraqi-summer-aquarium-cooling) is absorbed
-- and is the basis of the practical half. The third has a machine-generated
-- timestamp slug that is unusable as a URL.
--
-- The rewrite explains the mechanism the old pages never did: heat lowers the
-- dissolved-oxygen ceiling while raising the fish's demand, and the two move in
-- opposite directions at once. Sources and confidence in dossier-summer-heat.md.
-- Draft passed all three gates before this file was generated.

BEGIN;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM blog_posts WHERE is_published;
  IF n <> 77 THEN RAISE EXCEPTION 'expected 77 published posts, found %', n; END IF;

  SELECT count(*) INTO n FROM blog_posts WHERE slug = 'protect-fish-iraqi-summer-50-degrees' AND is_published
     AND length(content) = 2539;
  IF n <> 1 THEN RAISE EXCEPTION 'survivor missing or changed since drafting'; END IF;

  SELECT count(*) INTO n FROM blog_posts WHERE slug IN ('iraqi-summer-aquarium-cooling', 'كيف-تحافظ-على-أجواء-مريحة-لأحواض-السمك-في-حرارة-ال-1788055556978') AND is_published;
  IF n <> 2 THEN RAISE EXCEPTION 'expected 2 published merge sources, found %', n; END IF;
END $$;

CREATE TABLE blog_posts_backup_merge_summer_20260902 AS
SELECT id, slug, title, excerpt, content, is_published, now() AS backed_up_at
  FROM blog_posts;

UPDATE blog_posts SET title = 'كيف تحمي أسماكك في صيف العراق وحرارة الـ 50 مئوية؟', excerpt = 'الحرارة ما تقتل السمكة مباشرة بل تخنقها: الأوكسجين يقل وحاجة السمكة له تزيد بنفس الوقت. جدول طوارئ بالدرجات، والطرق العملية مرتبة بالفائدة مقابل الكلفة.', content = '<h2>الحرارة ما تقتل السمكة مباشرة — تخنقها</h2>
<p>أكثر واحد يخسر أسماكه بصيف العراق يظن السبب "الحر". السبب الحقيقي أدق من هيك، ومعرفته تغيّر ترتيب خطواتك تماماً: <strong>الحرارة تقلل الأوكسجين الذائب بالماء وتزيد حاجة السمكة له، بنفس الوقت</strong>.</p>
<table>
  <tr><th>حرارة الماء</th><th>أقصى أوكسجين ذائب ممكن</th><th>استهلاك السمكة</th></tr>
  <tr><td>٢٠ درجة</td><td>حوالي ٩.١ ملغم/لتر</td><td>الأساس</td></tr>
  <tr><td>٣٢ درجة</td><td>أقل</td><td>أعلى بحدود ٤٠–٧٥٪</td></tr>
  <tr><td>٣٥ درجة</td><td>حوالي ٧.٠ ملغم/لتر — أي سقف أوطأ بنحو ٢٣٪</td><td>أعلى بكثير</td></tr>
</table>
<p>لاحظ إن العمودين يتحركان بعكس بعض. المعروض ينزل والطلب يصعد، فالسمكة ممكن توصل لحد الاختناق <strong>حتى بحوض تهويته منيحة</strong>. لهذا أول إجراء بأي موجة حر مو التبريد، بل الأوكسجين.</p>
<blockquote>العلامة اللي تنتبه لها: السمكة تلزم سطح الماء وتلهث. هذا مو "دلع" ولا جوع — هذي سمكة تحاول تتنفس من الطبقة الأغنى بالأوكسجين. تعامل معها كحالة طوارئ.</blockquote>

<h2>جدول الطوارئ: شنو تسوي عند أي درجة</h2>
<p>أغلب أسماك الزينة الاستوائية تُربّى بين ٢٤ و٢٨ درجة، والبقاء الطويل فوق ٣٢ خطر.</p>
<table>
  <tr><th>الحرارة</th><th>الحالة</th><th>الإجراء</th></tr>
  <tr><td>٢٨–٣٠</td><td>تنبيه</td><td>أطفئ السخان، أطفئ الإضاءة بالذروة، زد حركة السطح</td></tr>
  <tr><td>٣٠–٣٢</td><td>ضغط</td><td>مضخة هواء إضافية، مروحة على السطح، قلّل العلف للنصف</td></tr>
  <tr><td>٣٢–٣٥</td><td>خطر</td><td>كل ما سبق + تبريد تدريجي + لا تطعم إطلاقاً ذاك اليوم</td></tr>
  <tr><td>فوق ٣٥</td><td>طوارئ</td><td>تبريد تدريجي مستمر ومراقبة دائمة؛ السمك يلهث = دقائق مو ساعات</td></tr>
</table>

<h2>الطرق العملية، مرتبة بالفائدة مقابل الكلفة</h2>
<ol>
  <li><strong>زيادة الأكسجة — الأول دائماً.</strong> مضخة هواء إضافية، أو وجّه مخرج الفلتر ليحرك السطح. تبادل الغازات كله يصير عند السطح، فالحركة هناك أهم من الحركة بالعمق. مضخات الهواء وموزعاتها متوفرة في AQUAVO.</li>
  <li><strong>مروحة على سطح الماء.</strong> أرخص تبريد فعلي: مروحة صغيرة موجهة على السطح مع رفع الغطاء أو استبداله بشبك. التبريد يجي من التبخر نفسه.
    <ul>
      <li>لازم تعوّض الماء المتبخر أولاً بأول، وإلا يرتفع تركيز كل شي ذائب.</li>
      <li>مقدار الانخفاض يعتمد على الرطوبة وحركة الهواء ومساحة السطح — وبالمناطق العالية الرطوبة يكون أضعف. لا أحد يقدر يعطيك رقماً ثابتاً.</li>
    </ul>
  </li>
  <li><strong>اقطع مصادر الحرارة.</strong> أطفئ السخان (ينسى كثيرون)، أطفئ الإضاءة من الظهر للعصر، وابعد الحوض عن الشمس المباشرة والشباك.</li>
  <li><strong>قلّل العلف.</strong> الأيض أصلاً مرتفع، والعلف الزائد يتحلل ويستهلك أوكسجين إضافي — بالضبط الشي اللي ما عندك منه.</li>
  <li><strong>قوارير الماء المجمدة — بحذر.</strong> قارورة مغلقة واحدة، تُبدَّل كل بضع ساعات. <strong>لا تضع عدة قوارير</strong>: التبريد المفاجئ صدمة بحد ذاتها، وممكن يقتل أسرع من الحر البطيء.</li>
</ol>
<p>أما المبرّد (Chiller) فحل نهائي للأحواض الكبيرة أو الغالية، لكنه جهاز مكلف ويستهلك كهرباء — وبالعراق الكهرباء نفسها جزء من المشكلة.</p>

<h2>أشياء لا تسويها</h2>
<ul>
  <li><strong>لا تغيّر كمية كبيرة من الماء البارد دفعة واحدة.</strong> الهبوط المفاجئ بالحرارة صدمة. برّد تدريجياً.</li>
  <li><strong>لا تعتمد على مكعبات الثلج مباشرة بالماء</strong> — تذوب بسرعة وتغيّر كيمياء الماء إذا كانت من ماء حنفية غير معالج.</li>
  <li><strong>لا تطفئ الفلتر لتقليل الحرارة.</strong> ستخسر حركة السطح والترشيح البايولوجي معاً، وهذا أخطر بكثير من كسب درجة.</li>
</ul>

<h2>الحرارة زائد انقطاع الكهرباء: المشكلة العراقية المركّبة</h2>
<p>هنا يصير الوضع أخطر من مجموع طرفيه. الكهرباء تنقطع، فيتوقف الفلتر ومضخة الهواء وحركة السطح — بالضبط لما الماء الحار يحتاجها أكثر شي. وبنفس الوقت تبدأ البكتيريا داخل الفلتر تتضرر من توقف مرور الماء عليها.</p>
<p>الترتيب العملي وقت الانقطاع: حرّك سطح الماء يدوياً بكوب كل فترة، غطِّ الحوض ببطانية خفيفة لعزله عن حرارة الغرفة إذا كانت الغرفة أحر من الماء، ولا تطعم. التفاصيل الكاملة في <a href="/blog/power-outage-emergency-aquarium-tools">أدوات الطوارئ عند انقطاع الكهرباء</a>، وشرح آلية التنفس والأوكسجين في <a href="/blog/fish-that-live-without-filter">حوض بلا فلتر</a>.</p>

<h2>بعد الموجة: راقب الأمونيا</h2>
<p>الحرارة تسرّع الأيض والتحلل، والأمونيا الناتجة تصير أسمّ عند الحرارة العالية لأن نسبة الأمونيا الحرة ترتفع مع الحرارة والـ pH. يعني نفس القراءة تكون أخطر بالصيف. افحص الأمونيا والنتريت بعد أي موجة حر أو انقطاع طويل — الآلية مشروحة في <a href="/blog/nitrogen-cycle-simple-arabic-explained">الدورة البيولوجية</a>.</p>
<p>وإذا صار الماء ضبابياً بعدها فهذا غالباً انفجار بكتيري يستهلك أوكسجين إضافي، وعلاجه مو تغيير ماء كثير — شوف <a href="/blog/cloudy-water-fix">تشخيص تعكر الماء</a>. ولحساب حجم حوضك وكمية الماء المتبخرة استخدم <a href="/calculators">الحاسبات</a>.</p>'
 WHERE slug = 'protect-fish-iraqi-summer-50-degrees';

UPDATE blog_posts SET is_published = FALSE WHERE slug IN ('iraqi-summer-aquarium-cooling', 'كيف-تحافظ-على-أجواء-مريحة-لأحواض-السمك-في-حرارة-ال-1788055556978');

-- Post-flight.
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM blog_posts WHERE slug = 'protect-fish-iraqi-summer-50-degrees' AND is_published
     AND length(content) > 4000
     AND (length(content) - length(replace(content, '<table', ''))) / 6 >= 2
     AND content LIKE '%href="/blog/%';
  IF n <> 1 THEN RAISE EXCEPTION 'rewrite missing its structure'; END IF;

  SELECT count(*) INTO n FROM blog_posts WHERE slug IN ('iraqi-summer-aquarium-cooling', 'كيف-تحافظ-على-أجواء-مريحة-لأحواض-السمك-في-حرارة-ال-1788055556978') AND is_published;
  IF n <> 0 THEN RAISE EXCEPTION 'a merge source is still published'; END IF;

  SELECT count(*) INTO n FROM blog_posts WHERE is_published;
  IF n <> 75 THEN RAISE EXCEPTION 'expected 75 published posts after the merge, found %', n; END IF;

  -- Script purity is the one guard rule SQL can state faithfully; the
  -- context-sensitive rules are enforced by gate-draft.ts before this file
  -- exists and by the three corpus audits after it is applied.
  SELECT count(*) INTO n FROM blog_posts WHERE slug = 'protect-fish-iraqi-summer-50-degrees'
     AND content ~ '[一-鿿぀-ヿ가-힯Ѐ-ӿऀ-ॿ฀-๿֐-׿Ā-ɏḀ-ỿ]';
  IF n <> 0 THEN RAISE EXCEPTION 'rewrite introduced stray script'; END IF;
END $$;

COMMIT;

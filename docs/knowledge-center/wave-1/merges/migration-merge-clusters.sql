-- Migration ID: kc-wave1-merge-clusters-20260902
-- Target:       Neon production, blog_posts (3 rewritten, 3 unpublished)
-- Rollback:     rollback-merge-clusters.sql
-- Pairs with:   three permanent redirects added to vercel.json in the same commit.
--
-- The last three Wave 1 merge clusters. One correction is substantive rather
-- than editorial: the two goldfish articles contradicted each other on tank
-- size, and both understated it. The merged article corrects upward to the
-- sourced figures instead of splitting the difference.
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

CREATE TABLE blog_posts_backup_merge_clusters_20260902 AS
SELECT id, slug, title, excerpt, content, is_published, now() AS backed_up_at
  FROM blog_posts;

-- algae-war-guide  <-  how-to-get-rid-of-green-algae
--   algae-war-guide already had the right structure — diagnose by type, because that is how a reader arrives. The loser was 93 words with one good point (anti-algae chemicals are a trap, which is absorbed) and one claim already corrected in batch 1 for listing live cleanup fish as AQUAVO stock. black-beard-algae-removal-steps is deliberately NOT merged: BBA is a distinct high-difficulty query and stays a spoke, linked from the hub table.
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM blog_posts WHERE slug = 'algae-war-guide' AND is_published
     AND length(content) = 1781;
  IF n <> 1 THEN RAISE EXCEPTION 'algae-war-guide: survivor missing or changed since drafting'; END IF;
  SELECT count(*) INTO n FROM blog_posts WHERE slug = 'how-to-get-rid-of-green-algae' AND is_published;
  IF n <> 1 THEN RAISE EXCEPTION 'how-to-get-rid-of-green-algae: merge source missing or already unpublished'; END IF;
END $$;

UPDATE blog_posts SET title = 'دليل الطحالب: شخّص النوع قبل ما تعالج', excerpt = 'الطحالب عرَض لفائض ضوء أو مغذيات، لا مرض يُقتل بدواء. جدول تشخيص بالنوع، وليش الطحالب البنية في الحوض الجديد تُترك ولا تُعالج.', content = '<h2>الطحالب عرَض، مو مرض</h2>
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
<p>ولحساب حجم حوضك وكمية التغيير الأسبوعي استخدم <a href="/calculators">الحاسبات</a>.</p>'
 WHERE slug = 'algae-war-guide';

UPDATE blog_posts SET is_published = FALSE WHERE slug = 'how-to-get-rid-of-green-algae';

-- filter-types-guide  <-  best-aquarium-filters-iraq
--   The two overlapped almost completely: one compared types, the other recommended by tank size. The merged article does both, and the types guide keeps the URL because it is the evergreen architecture the filter-media and sump-vs-canister spokes point back to. The size-based recommendation table is absorbed from the loser.
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM blog_posts WHERE slug = 'filter-types-guide' AND is_published
     AND length(content) = 1866;
  IF n <> 1 THEN RAISE EXCEPTION 'filter-types-guide: survivor missing or changed since drafting'; END IF;
  SELECT count(*) INTO n FROM blog_posts WHERE slug = 'best-aquarium-filters-iraq' AND is_published;
  IF n <> 1 THEN RAISE EXCEPTION 'best-aquarium-filters-iraq: merge source missing or already unpublished'; END IF;
END $$;

UPDATE blog_posts SET title = 'أي فلتر يناسب حوضك؟ اختر بالحجم لا بالسعر', excerpt = 'الفلتر لا ينظف الماء بل يسكّن البكتيريا التي تعالجه. جدول اختيار بحجم الحوض، مقارنة الأنواع الثلاثة، ومعدل التدوير الذي ينفع فعلاً.', content = '<h2>الفلتر ما ينظف الماء — يسكّن البكتيريا</h2>
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
<p>اختر النوع بحجم حوضك ونوع أسماكك، لا بالسعر. الإسفنجي خيار محترم جداً للأحواض الصغيرة وأحواض التفريخ، والخارجي هو الأفضل للأحواض الكبيرة. وأياً كان اختيارك، الميديا البيولوجية هي القيمة الحقيقية — تفاصيل أنواعها في <a href="/blog/filter-media-ceramic-rings-bioballs">ميديا الفلترة وحلقات السيراميك</a>، والمقارنة بين السامب والخارجي في <a href="/blog/sump-vs-canister-filter-comparison">السامب مقابل الفلتر الخارجي</a>. تتوفر في AQUAVO فلاتر إسفنجية وميديا فلترة وقطن وحلقات سيراميك ضمن قسم الفلترة والتنقية.</p>'
 WHERE slug = 'filter-types-guide';

UPDATE blog_posts SET is_published = FALSE WHERE slug = 'best-aquarium-filters-iraq';

-- goldfish-5-deadly-mistakes-beginners  <-  goldfish-bowl-myth
--   The two contradicted each other in production: the bowl-myth article said 75 L minimum while the 5-mistakes article opened by saying goldfish are easy to keep in small tanks. Both understated it. Sources put common goldfish at 25-30 cm adult length and a minimum around 110 L for one fish, so the merged article corrects UPWARD rather than splitting the difference. The broader slug survives because 'goldfish mistakes' is the wider query; the bowl content becomes mistake one.
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM blog_posts WHERE slug = 'goldfish-5-deadly-mistakes-beginners' AND is_published
     AND length(content) = 3129;
  IF n <> 1 THEN RAISE EXCEPTION 'goldfish-5-deadly-mistakes-beginners: survivor missing or changed since drafting'; END IF;
  SELECT count(*) INTO n FROM blog_posts WHERE slug = 'goldfish-bowl-myth' AND is_published;
  IF n <> 1 THEN RAISE EXCEPTION 'goldfish-bowl-myth: merge source missing or already unpublished'; END IF;
END $$;

UPDATE blog_posts SET title = 'الجولدفش: خمس أخطاء تبدأ قبل ما تشتري السمكة', excerpt = 'الجولدفش ليست سمكة صغيرة ولا استوائية: تصل 25-30 سم، تحتاج ماءً بارداً وحوضاً من 110 لتر وفلترة أقوى من الاستوائية — وهي من أسوأ الخيارات لصيف حار.', content = '<h2>الغلطة الأولى تسبق الشراء: حجم الحوض</h2>
<p>الجولدفش مو سمكة صغيرة. الجولدفش العادي (Common) والكوميت يوصلان إلى <strong>٢٥–٣٠ سم</strong> عند البلوغ، وأحياناً أطول. الصورة الذهنية عن سمكة صغيرة بوعاء دائري ما لها علاقة بالحيوان الحقيقي.</p>
<table>
  <tr><th>الاعتقاد الشائع</th><th>الواقع</th></tr>
  <tr><td>تعيش بوعاء دائري</td><td>الوعاء الدائري سطحه صغير = أوكسجين أقل، وما يتحمل فلتراً</td></tr>
  <tr><td>تبقى صغيرة</td><td>٢٥–٣٠ سم للأنواع مفردة الذيل</td></tr>
  <tr><td>حوض ٢٠ لتر يكفي</td><td>ابدأ من <strong>١١٠ لتر</strong> للسمكة الواحدة، والأنواع الكبيرة تحتاج أكثر</td></tr>
  <tr><td>سمكة استوائية</td><td>سمكة <strong>مياه باردة</strong>: ١٨–٢٤ درجة</td></tr>
</table>
<p>ملاحظة على "توقف النمو": الجولدفش بحوض صغير ما يبقى صغيراً بصحة — نمو جسمه الخارجي يتباطأ بينما أعضاؤه الداخلية تستمر، وهذا سبب قصر عمره في الأوعية الصغيرة.</p>

<h2>الغلطة الثانية: معاملتها كسمكة استوائية</h2>
<p>الجولدفش سمكة مياه باردة. مداها المريح <strong>١٨–٢٤ درجة</strong>، وهي تنشط وتأكل جيداً بحرارة أقل بكثير مما تحتاجه التترا أو الفايتر. فلا تضعها بحوض استوائي على ٢٦–٢٨ لمجرد أن السخان موجود.</p>
<blockquote>وهنا نقطة عراقية مهمة: الجولدفش من أسوأ الخيارات لصيف العراق. هي سمكة باردة أصلاً، وتطرح فضلات كثيرة فتحتاج أوكسجيناً أعلى من غيرها — بينما الماء الحار يحمل أوكسجين أقل. الطرفان يضغطان بنفس الاتجاه. إذا كنت بمكان حار وبلا تبريد مستقر، اختر نوعاً استوائياً هادئاً بدلها.</blockquote>
<p>الآلية الكاملة للحرارة والأوكسجين في <a href="/blog/protect-fish-iraqi-summer-50-degrees">حماية الأسماك من حرارة الصيف</a>.</p>

<h2>الغلطة الثالثة: فلتر أصغر من اللازم</h2>
<p>الجولدفش تطرح فضلات أكثر بكثير من أي سمكة زينة بنفس حجمها، وجسمها ممتلئ فتأكل وتخرّج أكثر. يعني الحمل على الترشيح البيولوجي أعلى من المعتاد، لا أقل.</p>
<p>هذا يقلب النصيحة الشائعة رأساً على عقب: الجولدفش تحتاج فلترة <strong>أقوى</strong> من الأسماك الاستوائية الصغيرة، مو أضعف. اختيار النوع والقدرة في <a href="/blog/filter-types-guide">دليل اختيار الفلتر</a>.</p>

<h2>الغلطة الرابعة: تجاوز التدوير</h2>
<p>لأن فضلاتها كثيرة، الجولدفش بحوض غير مدوّر ترفع الأمونيا بسرعة أكبر من غيرها. أغلب حالات "ماتت خلال أسبوع" هي تسمم أمونيا مو مرض.</p>
<p>دوّر الحوض قبل الشراء، وافحص الأمونيا والنتريت أسبوعياً بعده — <a href="/blog/nitrogen-cycle-simple-arabic-explained">الدورة البيولوجية</a>، وإذا ارتفعت القراءة فالإجراء الفوري في <a href="/blog/ammonia-spike-emergency-treatment">ارتفاع الأمونيا المفاجئ</a>.</p>

<h2>الغلطة الخامسة: الإفراط بالعلف</h2>
<p>الجولدفش تبدو دائماً جائعة وتتسول عند الزجاج، وهذا سلوك طبيعي مو جوع. الإفراط بالعلف يسبب مشكلتين معاً: تلوث الماء، ومشاكل هضم وطفو شائعة عند الأنواع المستديرة الجسم.</p>
<ul>
  <li>علفة أو علفتان صغيرتان يومياً تنتهيان خلال دقيقتين.</li>
  <li>انقع الحبيبات ثواني قبل التقديم لتقليل الهواء المبتلع مع الطعام الطافي.</li>
  <li>يوم صيام أسبوعياً ممارسة شائعة ومفيدة لأصحاب الأجسام المستديرة.</li>
</ul>

<h2>الخلاصة</h2>
<p>الجولدفش ليست سمكة المبتدئ السهلة كما تُباع فكرتها: تكبر كثيراً، تلوّث كثيراً، وتحتاج ماءً بارداً وحوضاً أكبر من المتوقع وفلترة أقوى. إذا قدرت توفر لها هذا فهي سمكة رائعة وطويلة العمر. وإذا حوضك صغير أو غرفتك حارة بلا تبريد، فالاختيار الصادق هو نوع ثانٍ — شوف <a href="/blog/5-hardy-fish-for-beginners">أسماك قوية للمبتدئين</a>، ولحساب حجم حوضك استخدم <a href="/calculators">الحاسبات</a>.</p>'
 WHERE slug = 'goldfish-5-deadly-mistakes-beginners';

UPDATE blog_posts SET is_published = FALSE WHERE slug = 'goldfish-bowl-myth';

-- Post-flight.
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM blog_posts
   WHERE slug IN ('algae-war-guide', 'filter-types-guide', 'goldfish-5-deadly-mistakes-beginners')
     AND is_published AND length(content) > 3000
     AND content LIKE '%<table%' AND content LIKE '%href="/blog/%';
  IF n <> 3 THEN RAISE EXCEPTION 'only % of 3 survivors carry their structure', n; END IF;

  SELECT count(*) INTO n FROM blog_posts
   WHERE slug IN ('how-to-get-rid-of-green-algae', 'best-aquarium-filters-iraq', 'goldfish-bowl-myth') AND is_published;
  IF n <> 0 THEN RAISE EXCEPTION 'a merge source is still published'; END IF;

  SELECT count(*) INTO n FROM blog_posts WHERE is_published;
  IF n <> 72 THEN RAISE EXCEPTION 'expected 72 published posts after the merges, found %', n; END IF;

  -- The BBA spoke must survive: it is linked from the new algae hub, and a
  -- redirect or unpublish there would strand that link.
  SELECT count(*) INTO n FROM blog_posts WHERE slug = 'black-beard-algae-removal-steps' AND is_published;
  IF n <> 1 THEN RAISE EXCEPTION 'the BBA spoke is no longer published'; END IF;

  -- The contradiction this batch exists to fix must be gone.
  SELECT count(*) INTO n FROM blog_posts
   WHERE slug = 'goldfish-5-deadly-mistakes-beginners'
     AND content LIKE '%' || 'يمكن تربيتها بسهولة في الأحواض الصغيرة' || '%';
  IF n <> 0 THEN RAISE EXCEPTION 'the small-tank goldfish claim survived'; END IF;

  -- The one guard rule SQL can state faithfully.
  SELECT count(*) INTO n FROM blog_posts
   WHERE slug IN ('algae-war-guide', 'filter-types-guide', 'goldfish-5-deadly-mistakes-beginners')
     AND content ~ '[一-鿿぀-ヿ가-힯Ѐ-ӿऀ-ॿ฀-๿֐-׿Ā-ɏḀ-ỿ]';
  IF n <> 0 THEN RAISE EXCEPTION 'a rewrite introduced stray script'; END IF;
END $$;

COMMIT;

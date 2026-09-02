-- Migration ID: kc-wave1-no-filter-rewrite-20260902
-- Target:       Neon production, blog_posts (one row)
-- Rollback:     rollback-no-filter.sql
--
-- Phase 3: rewrite, not repair. The live page named goldfish and neon tetra as
-- the fish best able to live "without a filter or oxygen". Those are close to
-- the two worst possible answers — goldfish are among the highest-waste fish
-- kept, and neon tetra need a fully cycled tank with ammonia and nitrite at
-- zero. A beginner acting on that during an Iraqi power cut loses the tank.
--
-- The premise was audited from scratch rather than preserved because the URL
-- exists. Decision and sources in dossier-no-filter-aquarium.md. The rewrite
-- keeps the URL and the search intent and replaces the answer: it separates
-- "no device" from "no biological filtration" from "no oxygenation", names the
-- anabantoids that genuinely tolerate low dissolved oxygen via the labyrinth
-- organ, and states plainly that no fish tolerates ammonia.
--
-- The draft passes all three content guards before this file is generated:
-- script purity 0, editorial 0, business truth 0.

BEGIN;

-- Pre-flight: the row must be the one that was audited.
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM blog_posts WHERE id = 'd933520e-ac90-4204-b911-69ef91f7cb87' AND is_published;
  IF n <> 1 THEN RAISE EXCEPTION 'target row not found or not published'; END IF;

  SELECT length(content) INTO n FROM blog_posts WHERE id = 'd933520e-ac90-4204-b911-69ef91f7cb87';
  IF n <> 1821 THEN
    RAISE EXCEPTION 'content changed since drafting (expected 1821 chars, found %)', n;
  END IF;

  SELECT count(*) INTO n FROM blog_posts
   WHERE id = 'd933520e-ac90-4204-b911-69ef91f7cb87' AND content LIKE '%' || 'أسماك النيون من الأفضلية في العيش بدون فلتر' || '%';
  IF n <> 1 THEN RAISE EXCEPTION 'the neon-tetra claim this rewrite exists to remove is not present'; END IF;
END $$;

CREATE TABLE blog_posts_backup_kc_nofilter_20260902 AS
SELECT id, slug, title, excerpt, content, is_published, now() AS backed_up_at
  FROM blog_posts WHERE id = 'd933520e-ac90-4204-b911-69ef91f7cb87';

UPDATE blog_posts
   SET title = 'حوض بلا فلتر: أي سمكة تتحمل فعلاً، وبأي شروط؟',
       excerpt = 'ما توجد سمكة تعيش بلا فلتر وبلا أوكسجين. هذا الدليل يفصل بين الجهاز والترشيح البايولوجي، ويشرح أي الأسماك تتحمل قلة الأوكسجين فعلاً وبأي شروط — وليش الجولدفش والنيون أسوأ خيارين.',
       content = '<h2>الجواب المختصر</h2>
<p>ما موجود سمكة تعيش "بلا فلتر وبلا أوكسجين". الموجود شي ثاني تماماً: أسماك تتحمل قلة الأوكسجين الذائب بالماء لأنها تتنفس هواء الجو مباشرة، وأحواض تشتغل بلا جهاز فلتر لأن الترشيح البايولوجي انتقل لمكان ثاني — مو لأنه اختفى.</p>
<p>هذا الفرق هو كل الموضوع. وأكثر جوابين منتشرين على هذا السؤال — الجولدفش والنيون تيترا — هما بالضبط أسوأ خيارين ممكن تختارهما.</p>

<h2>ثلاثة أشياء الناس تخلطها</h2>
<table>
  <tr><th>العبارة</th><th>معناها الحقيقي</th></tr>
  <tr><td>"بلا فلتر"</td><td>بلا <strong>جهاز</strong>. الترشيح البايولوجي بكتيريا تعيش على السطوح — الحصى، الديكور، الخشب، أوراق النبات — وتشتغل سواء عندك فلتر أو لا.</td></tr>
  <tr><td>"بلا أوكسجين"</td><td>بلا <strong>مضخة هواء</strong>. تبادل الغازات يصير على سطح الماء نفسه، والحركة السطحية هي اللي تسرّعه.</td></tr>
  <tr><td>"بلا صيانة"</td><td>غلط بالمقلوب. الحوض بلا فلتر يحتاج تغييرات ماء <strong>أكثر</strong>، مو أقل. شغل الفلتر ما ينعدم، ينتقل عليك إنت.</td></tr>
</table>
<p>لو تريد تفهم ليش البكتيريا هي الأساس مو الجهاز، اقرأ <a href="/blog/nitrogen-cycle-simple-arabic-explained">الدورة البيولوجية في حوض السمك</a> أول شي. بدونها باقي هذا المقال ما راح ينفعك.</p>

<h2>الأسماك اللي فعلاً تتحمل قلة الأوكسجين</h2>
<p>مجموعة الأنابانتويد (Anabantoidei) عندها عضو تنفسي اسمه العضو المتاهي (labyrinth organ) — تركيب مبطّن بأوعية دموية داخل الرأس يخليها تسحب الأوكسجين من هواء الجو مباشرة. لهذا تشوفها تطلع للسطح وتاخذ نفس. الدراسات تربط هذا العضو بقدرتها على العيش بمياه فقيرة بالأوكسجين.</p>
<ul>
  <li><strong>الفايتر (Betta splendens)</strong> — يتنفس هواء الجو اختيارياً، يعني يستفيد من الاثنين: الخياشيم وهواء السطح.</li>
  <li><strong>الغورامي الأزرق (Trichopodus trichopterus)</strong> — تنفسه الهوائي إجباري، يعني <em>لازم</em> يوصل للسطح. لا تغطي الحوض تغطية محكمة عليه.</li>
</ul>
<blockquote>انتبه للفرق المهم: هذه الأسماك تتحمل <strong>قلة الأوكسجين</strong>. ما تتحمل <strong>الأمونيا</strong>. ولا سمكة على وجه الأرض تتحمل الأمونيا.</blockquote>

<h2>ليش الجولدفش والنيون غلط</h2>
<table>
  <tr><th>السمكة</th><th>المشكلة</th></tr>
  <tr><td>الجولدفش</td><td>يطرح فضلات أكثر بكثير من أي سمكة بنفس حجمه، وجسمه ممتلئ فيأكل ويخرّج أكثر. يحتاج ترشيحاً أقوى وحجم ماء أكبر، مو أقل. حكاية "الجولدفش بالجرة" اشتغلت قديماً لأنهم كانوا يغيّرون الماء <em>كل يوم</em>.</td></tr>
  <tr><td>النيون تيترا</td><td>يحتاج حوضاً ناضجاً ومدوّراً بالكامل، والأمونيا والنتريت لازم يكونان صفر — حتى الارتفاع القصير يأذيه. وحساس لتذبذب الـ pH والقساوة. هو من أكثر الأسماك اللي تحتاج استقراراً، مو أقلها.</td></tr>
</table>

<h2>متى يشتغل حوض بلا جهاز فلتر</h2>
<p>يشتغل، بشروط. وكلها شروط تقلل الحمل على الماء أو تزيد قدرته على معالجته:</p>
<ol>
  <li><strong>حجم ماء كبير نسبة لعدد الأسماك.</strong> الماء الأكثر يخفف الأمونيا ويثبّت الحرارة.</li>
  <li><strong>عدد أسماك قليل جداً.</strong> هذا أهم شرط وأكثر واحد ينكسر.</li>
  <li><strong>سطوح كثيرة للبكتيريا.</strong> حصى، خشب طبيعي، صخر، ديكور مسامي — كل سطح يسكنه جزء من الترشيح البايولوجي.</li>
  <li><strong>نباتات حية إن أمكن.</strong> تستهلك النترات وتعطي مخابئ للأسماك، وتساعد على استقرار الحوض.</li>
  <li><strong>حركة سطحية.</strong> حتى بلا مضخة، سطح مكشوف وغير راكد أفضل بكثير من سطح مغلق ساكن. وبحر الصيف العراقي الماء الحار يذوّب أوكسجين أقل، فالسطح يصير أهم.</li>
  <li><strong>تغييرات ماء متكررة وصغيرة.</strong> هذا بديل الفلتر الحقيقي.</li>
</ol>

<h2>الرقم اللي يقرر، مو الرأي</h2>
<p>ما راح نعطيك نسبة "لتر لكل سمكة" لأنها ما تنضبط: تتغير مع الحجم والنباتات والحرارة وكمية العلف. الشي الوحيد اللي يقرر إذا حوضك بلا فلتر ناجح أو لا هو قراءتان:</p>
<ul>
  <li><strong>الأمونيا</strong> — لازم صفر.</li>
  <li><strong>النتريت</strong> — لازم صفر.</li>
</ul>
<p>افحصهما أسبوعياً على الأقل. أي رقم فوق الصفر يعني عدد الأسماك أكبر من قدرة الحوض، والحل تغيير ماء فوري وتقليل العلف. شرائط الفحص واختبارات الأمونيا والنتريت متوفرة في AQUAVO. وإذا طلع الرقم عالي فعلاً، شوف <a href="/blog/ammonia-spike-emergency-treatment">ارتفاع الأمونيا المفاجئ</a>.</p>

<h2>وإذا الكهرباء تنقطع؟</h2>
<p>هذا سؤال مختلف عن "حوض بلا فلتر"، وأكثر إلحاحاً بالعراق. الحوض المدوّر عنده فلتر شغال ما ينهار بثواني: الخطر الحقيقي إن البكتيريا داخل الفلتر تبدأ تموت لما يوقف مرور الماء والأوكسجين عليها، فترجع تشغّل الفلتر بعد ساعات طويلة وأنت فعلياً تضخ ماءً فاسداً على الحوض.</p>
<p>القاعدة العملية: بالانقطاعات القصيرة خلّي الفلتر مكانه. بالانقطاعات الطويلة، اغسل ميديا الفلتر بماء الحوض قبل ما تشغّله، وقلّل العلف، وراقب الأمونيا. التفاصيل والأدوات في <a href="/blog/power-outage-emergency-aquarium-tools">أدوات الطوارئ عند انقطاع الكهرباء</a>.</p>

<h2>الخلاصة</h2>
<p>لو تريد حوضاً يتحمل ظروف الكهرباء العراقية، الجواب الصادق مو "اختر سمكة تعيش بلا فلتر". الجواب هو: <strong>فايتر أو غورامي</strong>، بعدد قليل، بحوض كبير نسبياً، بسطوح كثيرة للبكتيريا، وبتغييرات ماء منتظمة، مع فحص أمونيا ونتريت أسبوعي. ولحساب حجم حوضك بدقة استخدم <a href="/calculators">الحاسبات</a>، ولتفاصيل تربية الفايتر تحديداً اقرأ <a href="/blog/betta-fish-bowl-truth-iraq">الحقيقة حول الفايتر والجرة</a>.</p>'
 WHERE id = 'd933520e-ac90-4204-b911-69ef91f7cb87';

-- Post-flight: the dangerous claims are gone, the structure is there, and the
-- guards' own rules hold.
DO $$
DECLARE c text;
BEGIN
  SELECT content INTO c FROM blog_posts WHERE id = 'd933520e-ac90-4204-b911-69ef91f7cb87';

  IF c LIKE '%' || 'أسماك النيون من الأفضلية في العيش بدون فلتر' || '%' THEN
    RAISE EXCEPTION 'the neon-tetra claim survived';
  END IF;
  IF c LIKE '%' || 'الجولدي' || '%' AND c NOT LIKE '%' || 'يحتاج ترشيحاً أقوى' || '%' THEN
    RAISE EXCEPTION 'goldfish still recommended without the correction';
  END IF;

  IF length(c) < 4000 THEN RAISE EXCEPTION 'rewrite shorter than expected: %', length(c); END IF;
  IF c !~ '<table' THEN RAISE EXCEPTION 'rewrite lost its tables'; END IF;
  IF (length(c) - length(replace(c, 'href="/', ''))) / 7 < 5 THEN
    RAISE EXCEPTION 'rewrite has fewer than 5 internal links';
  END IF;

  -- Same script set the real guard rejects, not the narrow subset that let the
  -- first contamination sweep certify a corpus it had never checked.
  IF c ~ '[一-鿿぀-ヿ가-힯Ѐ-ӿऀ-ॿ฀-๿֐-׿Ā-ɏḀ-ỿ]' THEN
    RAISE EXCEPTION 'rewrite introduced stray script';
  END IF;
  IF c ~ 'سوق الغزل' OR c ~ 'الشورجة' THEN RAISE EXCEPTION 'rewrite names an external marketplace'; END IF;
  -- Truth contract: no blanket warranty, ranking, sourcing or branch claim.
  IF c ~ 'ضمانات' OR c ~ 'أفضل متجر' OR c ~ 'أول متجر' OR c ~ 'مستوردة من' OR c ~ 'فروعنا' THEN
    RAISE EXCEPTION 'rewrite introduced a business claim';
  END IF;
END $$;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM blog_posts b JOIN blog_posts_backup_kc_nofilter_20260902 k USING (id)
   WHERE b.is_published IS DISTINCT FROM k.is_published;
  IF n <> 0 THEN RAISE EXCEPTION 'publication state changed'; END IF;
END $$;

COMMIT;

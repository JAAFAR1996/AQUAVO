-- Migration ID: kc-wave1-merge-batch2-20260902
-- Target:       Neon production, blog_posts (4 rows: 2 rewritten, 2 unpublished)
-- Rollback:     rollback-merge-batch.sql
-- Pairs with:   the two permanent redirects added to vercel.json in the same commit.
--
-- Wave 1, priority 1 and 2 together: each pair of near-duplicate articles was
-- cannibalising its own query. The better of each pair is rewritten and
-- deepened, the other is unpublished behind a permanent redirect.
--
-- Both drafts passed script-purity, editorial and business-truth before this
-- file was generated (scripts/gate-draft.ts).

BEGIN;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM blog_posts WHERE is_published;
  IF n <> 79 THEN RAISE EXCEPTION 'expected 79 published posts, found %', n; END IF;
END $$;

CREATE TABLE blog_posts_backup_merge_b2_20260902 AS
SELECT id, slug, title, excerpt, content, is_published, now() AS backed_up_at
  FROM blog_posts;

-- cloudy-water-fix  <-  cloudy-aquarium-water-causes-fix
--   cloudy-water-fix is the better of the pair: it diagnoses by water colour, which is how a reader actually arrives at this question. Its rival is generic and tells the reader to change 10-15% of the water DAILY, which is destabilising and wrong for a bacterial bloom specifically. Nothing from the loser is absorbed; its one real point (overfeeding is the root cause) the survivor already made, and now makes better.
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM blog_posts WHERE slug = 'cloudy-water-fix' AND is_published
     AND length(content) = 1642;
  IF n <> 1 THEN RAISE EXCEPTION 'cloudy-water-fix: survivor missing or changed since drafting'; END IF;
  SELECT count(*) INTO n FROM blog_posts WHERE slug = 'cloudy-aquarium-water-causes-fix' AND is_published;
  IF n <> 1 THEN RAISE EXCEPTION 'cloudy-aquarium-water-causes-fix: merge source missing or already unpublished'; END IF;
END $$;

UPDATE blog_posts SET title = 'ماء الحوض معكّر؟ شخّصه باللون وعالجه صح', excerpt = 'التعكر ثلاث مشاكل مختلفة تشترك بعرض واحد، ولون الماء يحدد أيها عندك. دليل تشخيصي: الأبيض الحليبي والأخضر والأصفر — وليش تغيير الماء الكثير يزيد الحالة الأولى سوءاً.', content = '<h2>شخّص باللون قبل ما تسوي أي شي</h2>
<p>تعكر الماء مو مشكلة واحدة، ثلاث مشاكل مختلفة تماماً تشترك بعرض واحد. ولون الماء يحدد أيها عندك، ويحدد أيضاً هل الحل صحيح أو يزيد الطين بلة. أكثر غلطة تنتشر بهذا الموضوع هي علاج الحالة الأولى بطريقة الحالة الثانية.</p>

<table>
  <tr><th>اللون</th><th>السبب</th><th>خطر على السمك؟</th><th>أول خطوة</th></tr>
  <tr><td>أبيض حليبي / ضبابي</td><td>انفجار بكتيري (Bacterial Bloom) — بكتيريا غير ذاتية التغذية تتكاثر على مواد عضوية زائدة</td><td>نعم، غير مباشر: تستهلك أوكسجين كثير</td><td>زد التهوية ولا تغيّر ماء كثير</td></tr>
  <tr><td>أخضر</td><td>طحالب مجهرية عائمة تتغذى على ضوء زائد ونترات مرتفعة</td><td>لا مباشرةً</td><td>تعتيم كامل ٣ أيام</td></tr>
  <tr><td>أصفر / بني شفاف</td><td>تانين (Tannins) ذائب من الخشب الطبيعي أو أوراق الكاتابا</td><td>لا، وبعض الأسماك تفضله</td><td>كربون نشط، أو اتركه</td></tr>
</table>

<h2>الأبيض الحليبي: الحالة اللي تنعالج بالصبر</h2>
<p>هذا انفجار بكتيري. المواد العضوية الزائدة — علف ما انأكل، فضلات، ورق ميت — تغذي بكتيريا تعيش عائمة بالماء، مو البكتيريا النافعة اللي تسكن الفلتر. يصير كثيراً بالأحواض الجديدة، وبعد غسل الفلتر غسلاً مبالغاً به.</p>
<p><strong>ليش تغيير الماء الكثير يزيدها سوءاً:</strong> لما تشيل جزءاً من البكتيريا العائمة، الباقي يتكاثر أسرع ليعوّض. تنتهي عندك بنفس التعكر بعد يوم أو يومين، وتكون خسرت استقرار الماء بلا فائدة.</p>
<blockquote>الخطر الحقيقي بهذه الحالة مو التعكر نفسه، بل إن هذا الانفجار البكتيري <strong>يستهلك كمية كبيرة من الأوكسجين الذائب</strong>. وبصيف العراق الماء الحار أصلاً يحمل أوكسجين أقل، فالسمكة تصير بين ضغطين. أول خطوة عملية: زد التهوية، مو غيّر الماء.</blockquote>
<ol>
  <li>زد التهوية — حجر هواء إضافي أو ارفع حركة السطح.</li>
  <li>قلّل العلف لمرة واحدة يومياً وبكمية تنتهي خلال دقيقتين.</li>
  <li>لا تنظف الفلتر خلال هذه الفترة.</li>
  <li>انتظر من ٣ إلى ٧ أيام؛ يصفو لحاله لما تنتهي المادة العضوية.</li>
  <li>افحص الأمونيا والنتريت. إذا طلعا فوق الصفر فالمشكلة أكبر من التعكر — شوف <a href="/blog/ammonia-spike-emergency-treatment">ارتفاع الأمونيا المفاجئ</a>.</li>
</ol>
<p>إذا حوضك جديد أصلاً، فالتعكر جزء طبيعي من التدوير. اقرأ <a href="/blog/nitrogen-cycle-simple-arabic-explained">الدورة البيولوجية</a> لتعرف وين أنت من المسار.</p>

<h2>الأخضر: ضوء زائد، مو ماء وسخ</h2>
<p>الماء الأخضر طحالب مجهرية عائمة. ما تنشال بالفلتر الميكانيكي لأن حجمها أصغر من مسام القطن. تتغذى على شيئين: ضوء ونترات.</p>
<ul>
  <li><strong>تعتيم كامل ٣ أيام.</strong> غطِّ الحوض وأطفئ الإضاءة تماماً. الأسماك تتحمل هذا بلا مشكلة، والطحالب لا.</li>
  <li><strong>ابعد الحوض عن ضوء الشمس المباشر.</strong> شباك جنوبي بالعراق يكفي لوحده لإبقاء المشكلة.</li>
  <li><strong>قلّل ساعات الإضاءة</strong> إلى ٦–٨ ساعات بعد التعتيم، وثبّتها.</li>
  <li><strong>غيّر ٣٠٪ من الماء</strong> بعد التعتيم لتخفيض النترات اللي غذّت الانفجار.</li>
</ul>
<p>إذا رجعت بسرعة فالسبب غذائي مو ضوئي: نترات متراكمة من قلة تغيير الماء أو زيادة أسماك. التفاصيل في <a href="/blog/algae-war-guide">دليل مواجهة الطحالب</a>.</p>

<h2>الأصفر البني: غالباً ما يحتاج علاجاً</h2>
<p>هذا تانين ذائب من الخشب الطبيعي أو أوراق الكاتابا. الماء يبقى <strong>شفافاً</strong> لكن ملوّناً كالشاي — وهذا هو الفرق عن الحالتين السابقتين، اللي فيهما الماء ضبابي مو ملوّن.</p>
<p>التانين ما يضر الأسماك، وأسماك المياه السوداء مثل الفايتر والتترا تستفيد منه. إذا اللون يزعجك بصرياً فقط:</p>
<ul>
  <li>كربون نشط بالفلتر — يمتص التانين خلال أيام. متوفر ضمن مستلزمات الفلترة في AQUAVO.</li>
  <li>تغييرات ماء دورية تخفف اللون تدريجياً.</li>
  <li>للمرة الجاية: اغلِ الخشب وانقعه قبل إدخاله. الطريقة كاملة في <a href="/blog/driftwood-preparation-yellow-water-fix">تحضير الخشب الطبيعي</a>.</li>
</ul>

<h2>السبب الجذري في أغلب الحالات</h2>
<p>ثلاث حالات بأسباب مختلفة، لكن سبب واحد يقف خلف أكثرها: <strong>علف زائد</strong>. الطعام اللي ما ينأكل يتحلل، يغذي البكتيريا العائمة، ويرفع النترات اللي تغذي الطحالب. قلّل العلف وتنحل نصف مشاكل الماء قبل ما تبدأ.</p>
<ul>
  <li>علفة واحدة يومياً تنتهي خلال دقيقتين.</li>
  <li>تغيير ٢٠٪ أسبوعياً — منتظم، مو كبير ومفاجئ.</li>
  <li>اغسل ميديا الفلتر بماء الحوض، لا بماء الحنفية.</li>
  <li>ثبّت ساعات الإضاءة، ولحساب حجم حوضك وكمية التغيير استخدم <a href="/calculators">الحاسبات</a>.</li>
</ul>'
 WHERE slug = 'cloudy-water-fix';

UPDATE blog_posts SET is_published = FALSE WHERE slug = 'cloudy-aquarium-water-causes-fix';

-- real-vs-fake-plants-iraq  <-  real-vs-fake-plants
--   The -iraq slug matches local search intent and carries the angle that actually differentiates this topic here: power cuts kill light-dependent plants, and a rotting plant raises ammonia. The species list and the silk-vs-hard-plastic fin warning are absorbed from the loser, which is the only content worth keeping from it.
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM blog_posts WHERE slug = 'real-vs-fake-plants-iraq' AND is_published
     AND length(content) = 1254;
  IF n <> 1 THEN RAISE EXCEPTION 'real-vs-fake-plants-iraq: survivor missing or changed since drafting'; END IF;
  SELECT count(*) INTO n FROM blog_posts WHERE slug = 'real-vs-fake-plants' AND is_published;
  IF n <> 1 THEN RAISE EXCEPTION 'real-vs-fake-plants: merge source missing or already unpublished'; END IF;
END $$;

UPDATE blog_posts SET title = 'نباتات طبيعية أم صناعية لحوض السمك في العراق؟', excerpt = 'الطبيعي أفضل بيئياً، لكن انقطاع الكهرباء يقلب المعادلة أحياناً. مقارنة صريحة بين الطبيعي والحريري والبلاستيك، ومتى يكون الصناعي هو القرار الصحيح لا التنازل.', content = '<h2>الجواب المختصر</h2>
<p>النبات الطبيعي أفضل بيئياً بلا جدال: يسحب النترات، ينافس الطحالب على الغذاء، ويعطي مخابئ حقيقية. لكن بالعراق فيه عامل يقلب المعادلة أحياناً — <strong>انقطاع الكهرباء</strong>. النبات الطبيعي يعتمد على إضاءة منتظمة، والصناعي ما يموت لما تنطفئ.</p>
<p>فالسؤال الصحيح مو "أيهما أفضل" بل "أي واحد يناسب حوضك، وأسماكك، وكهرباءك".</p>

<table>
  <tr><th></th><th>طبيعي</th><th>حريري (Silk)</th><th>بلاستيك صلب</th></tr>
  <tr><td>يسحب النترات</td><td>نعم</td><td>لا</td><td>لا</td></tr>
  <tr><td>ينافس الطحالب</td><td>نعم</td><td>لا</td><td>لا</td></tr>
  <tr><td>يتأثر بانقطاع الكهرباء</td><td>نعم — يحتاج إضاءة منتظمة</td><td>لا</td><td>لا</td></tr>
  <tr><td>آمن للزعانف الطويلة</td><td>نعم</td><td>نعم</td><td><strong>لا</strong> — الحواف الحادة تمزّق الزعانف</td></tr>
  <tr><td>يحتاج صيانة</td><td>تقليم وتسميد</td><td>غسل دوري</td><td>غسل دوري</td></tr>
</table>

<h2>متى يكون الصناعي هو القرار الصح</h2>
<p>مو تنازلاً، قراراً. فيه حالات النبات الطبيعي يفشل فيها لأسباب ما لها علاقة بمهارتك:</p>
<ul>
  <li><strong>أسماك تقتلع النبات.</strong> السيكلد الكبير والجولدفش يقلبان الحوض بحثاً عن الطعام. أي نبات مزروع بالتربة راح يطلع.</li>
  <li><strong>أسماك مفترسة كبيرة</strong> مثل الأوسكار والأروانا — الديكور القوي أنسب لها.</li>
  <li><strong>انقطاع كهرباء طويل ومتكرر.</strong> النبات المحتاج إضاءة قوية يذبل ويتعفن، والنبات المتعفن يرفع الأمونيا. أحياناً نبات صناعي بحوض مستقر أفضل من نبات طبيعي ميت.</li>
  <li><strong>ما عندك وقت.</strong> صيانة الحوض المزروع حقيقية: تقليم، تسميد، مراقبة.</li>
</ul>
<blockquote>تحذير على الصناعي: البلاستيك الصلب الرخيص حوافه حادة وتمزّق زعانف الأسماك طويلة الزعنفة مثل الفايتر والجوبي. اختر النوع الحريري (Silk) الناعم، واغسله جيداً قبل إدخاله للحوض.</blockquote>

<h2>إذا اخترت الطبيعي: ابدأ من هنا</h2>
<p>أكثر من يفشل بالنبات الطبيعي يبدأ بالنوع الغلط. هذه أنواع منخفضة المتطلبات (Low Tech) تنمو بإضاءة متوسطة وبدون حقن ثاني أكسيد الكربون:</p>
<ul>
  <li><strong>أنوبياس (Anubias)</strong> — تُربط على الصخر أو الخشب ولا تُدفن جذمورها بالتربة، وإلا تتعفن.</li>
  <li><strong>جافا فيرن (Microsorum pteropus)</strong> — نفس القاعدة: تُربط، ما تُزرع.</li>
  <li><strong>جافا موس</strong> — يُثبّت على أي سطح ويشكل سجادة خضراء.</li>
  <li><strong>فاليسنيريا</strong> — تُزرع بالتربة وتنمو بسرعة، فتسحب نترات أكثر.</li>
</ul>
<p>ملاحظة مهمة على الأنوبياس والجافا فيرن: دفن الجذمور (Rhizome) هو السبب الأول لموتها، مو الإضاءة. وإذا تعفنت الجذور فعلاً شوف <a href="/blog/aquatic-plant-root-rot-treatment">علاج تعفن جذور النباتات</a>.</p>

<h2>النبات مو بديل عن الدورة البيولوجية</h2>
<p>هذه أكثر نقطة تُفهم غلط. النبات الطبيعي يستهلك النترات ويساعد، لكنه <strong>ما يعوّض</strong> الترشيح البايولوجي ولا يخليك تتجاوز مرحلة تدوير الحوض. الأمونيا والنتريت شغل البكتيريا أولاً. اقرأ <a href="/blog/nitrogen-cycle-simple-arabic-explained">الدورة البيولوجية</a> قبل ما تعتمد على النبات لتنظيف حوضك.</p>
<p>ولو كنت تفكر بحوض بلا فلتر أصلاً، النبات جزء من الجواب لكن مو كله — التفاصيل في <a href="/blog/fish-that-live-without-filter">حوض بلا فلتر</a>.</p>

<h2>الخلاصة العملية</h2>
<p>ابدأ بأنوبياس وجافا فيرن مربوطة على خشب أو صخر. ما تحتاج تربة خاصة ولا إضاءة قوية ولا تسميد بالبداية، وتتحمل الإهمال أكثر من أي نوع ثاني. إذا أسماكك تقتلع أو كهرباؤك غير مستقرة، النوع الحريري خيار محترم — بشرط أن يكون ناعماً. ولتثبيت النبات على الخشب والصخر تتوفر في AQUAVO خيوط وشِباك وغراء أكواسكيب وتربة للأحواض المزروعة.</p>'
 WHERE slug = 'real-vs-fake-plants-iraq';

UPDATE blog_posts SET is_published = FALSE WHERE slug = 'real-vs-fake-plants';

-- Post-flight: two survivors deepened, two losers gone from the index, and
-- nothing else moved.
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM blog_posts WHERE slug = 'cloudy-water-fix' AND is_published
     AND length(content) > 3000 AND content LIKE '%<table%' AND content LIKE '%href="/blog/%';
  IF n <> 1 THEN RAISE EXCEPTION 'cloudy-water-fix: rewrite missing its structure'; END IF;
  SELECT count(*) INTO n FROM blog_posts WHERE slug = 'cloudy-aquarium-water-causes-fix' AND is_published;
  IF n <> 0 THEN RAISE EXCEPTION 'cloudy-aquarium-water-causes-fix: still published'; END IF;
  SELECT count(*) INTO n FROM blog_posts WHERE slug = 'real-vs-fake-plants-iraq' AND is_published
     AND length(content) > 3000 AND content LIKE '%<table%' AND content LIKE '%href="/blog/%';
  IF n <> 1 THEN RAISE EXCEPTION 'real-vs-fake-plants-iraq: rewrite missing its structure'; END IF;
  SELECT count(*) INTO n FROM blog_posts WHERE slug = 'real-vs-fake-plants' AND is_published;
  IF n <> 0 THEN RAISE EXCEPTION 'real-vs-fake-plants: still published'; END IF;

  SELECT count(*) INTO n FROM blog_posts WHERE is_published;
  IF n <> 77 THEN RAISE EXCEPTION 'expected 77 published posts after the merges, found %', n; END IF;

  SELECT count(*) INTO n FROM blog_posts b JOIN blog_posts_backup_merge_b2_20260902 k USING (id)
   WHERE b.content IS DISTINCT FROM k.content;
  IF n <> 2 THEN RAISE EXCEPTION 'expected 2 content rewrites, got %', n; END IF;

  SELECT count(*) INTO n FROM blog_posts b JOIN blog_posts_backup_merge_b2_20260902 k USING (id)
   WHERE b.is_published IS DISTINCT FROM k.is_published;
  IF n <> 2 THEN RAISE EXCEPTION 'expected 2 unpublished rows, got %', n; END IF;
END $$;

-- Script purity on the two rewritten rows. This is the ONE guard rule SQL can
-- state faithfully — it is the same character class shared/script-purity.ts
-- rejects. The business and editorial rules are context-sensitive (a warranty
-- word is only a claim when it is *offered*; a marketplace name is allowed on a
-- comparison page), so re-stating them as substring greps here would be a
-- cruder rule than the guard and would fail on articles the guard passes. It
-- did, on 15 of them. Those rules are enforced where they can be enforced
-- honestly: scripts/gate-draft.ts before this file is generated, and the three
-- corpus audits after it is applied.
DO $$
DECLARE hit text;
BEGIN
  SELECT string_agg(slug, ', ') INTO hit FROM blog_posts
   WHERE slug IN ('cloudy-water-fix', 'real-vs-fake-plants-iraq')
     AND content ~ '[一-鿿぀-ヿ가-힯Ѐ-ӿऀ-ॿ฀-๿֐-׿Ā-ɏḀ-ỿ]';
  IF hit IS NOT NULL THEN RAISE EXCEPTION 'rewrite introduced stray script: %', hit; END IF;
END $$;

COMMIT;

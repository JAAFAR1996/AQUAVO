-- Migration ID: kc-wave9-articles-20260903
-- Target:       Neon production, blog_posts (3 inserts, 3 rewrites)
-- Rollback:     rollback-wave9.sql
--
-- Discovery Cycle 9. Species coverage was closed by decision rather than by
-- publishing one article per species. Evidence: all six requested species
-- (cardinal tetra, rasbora, barb, otocinclus, loach, swordtail) appear in the
-- live corpus as bare name-drops only — no care or selection content anywhere.
--
-- GROUPed, not standalone: cardinal tetra and rasbora. A per-species care page
-- would compete with neon-tetra-color-care-guide and schooling-fish-minimum-
-- numbers for the same queries. They are covered inside a selection article
-- whose intent (which schooling fish to buy) nothing in the corpus owned.
--
-- NEW standalone: barbs and loaches. Each owns a distinct failure mode. Barbs:
-- fin-nipping is a group-size effect, so the counter-intuitive fix is a larger
-- shoal. Loaches: sold at a fraction of adult size, and scaleless, which
-- changes the medication protocol for the whole tank.
--
-- NOT WORTH STANDALONE: swordtail. Its mechanics are identical to the other
-- livebearers, so molly-platy-breeding-save-fry is widened to own the family
-- instead. That article was also the weakest in the corpus: three promotional
-- blocks and almost no actionable content.
--
-- CORRECTION 1 (fish-bloating-swim-bladder-dropsy). The published version drew
-- a clean binary and stated "smooth body + buoyancy problem = swim bladder".
-- That is an automatic diagnosis and it is wrong: buoyancy is a sign with
-- several possible causes. The table column is reframed, a differential list is
-- added, and water testing is moved ahead of fasting in the ordered steps.
-- Pineconing is retained and tightened as a strong indicator of systemic fluid
-- accumulation, which is well supported and was already correct.
-- The two-day fast is kept but de-generalised: the claim that it "often solves
-- it on its own" is not supportable, so it is stated as a common mitigating
-- step that may help a digestive cause, with explicit exceptions (fry and
-- juveniles, small fast-metabolism species, and any fish already off its food).
--
-- CORRECTION 2 (best-aquarium-cleaner-fish-pleco-corydoras). The published text
-- called otocinclus a "brilliant emergency crew". That advice starves them:
-- they graze a biofilm a new or freshly-scrubbed tank does not have. Corrected,
-- with the supplemental-feeding and mature-tank requirements stated. The
-- article's closing store line was also removed: it invited readers to browse
-- fish species at AQUAVO, which sells no live animals, and carried an
-- unverifiable "largest store" superlative.
--
-- All six drafts passed script-purity, editorial, business-truth, internal link
-- resolution and block-tag balance via scripts/gate-draft.ts.

BEGIN;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM blog_posts WHERE is_published;
  IF n <> 100 THEN RAISE EXCEPTION 'expected 100 published posts, found %', n; END IF;

  SELECT count(*) INTO n FROM blog_posts WHERE slug IN ('small-schooling-fish-selection', 'aquarium-barbs-guide', 'aquarium-loaches-guide');
  IF n <> 0 THEN RAISE EXCEPTION 'one of the new slugs already exists'; END IF;

  SELECT count(*) INTO n FROM blog_posts WHERE slug = 'fish-bloating-swim-bladder-dropsy' AND is_published
     AND length(content) = 3291;
  IF n <> 1 THEN RAISE EXCEPTION 'fish-bloating-swim-bladder-dropsy: reframe target missing or changed since drafting'; END IF;
  SELECT count(*) INTO n FROM blog_posts WHERE slug = 'best-aquarium-cleaner-fish-pleco-corydoras' AND is_published
     AND length(content) = 1362;
  IF n <> 1 THEN RAISE EXCEPTION 'best-aquarium-cleaner-fish-pleco-corydoras: reframe target missing or changed since drafting'; END IF;
  SELECT count(*) INTO n FROM blog_posts WHERE slug = 'molly-platy-breeding-save-fry' AND is_published
     AND length(content) = 2317;
  IF n <> 1 THEN RAISE EXCEPTION 'molly-platy-breeding-save-fry: reframe target missing or changed since drafting'; END IF;
END $$;

CREATE TABLE blog_posts_backup_wave9_20260903 AS
SELECT id, slug, title, excerpt, content, is_published, now() AS backed_up_at
  FROM blog_posts;

INSERT INTO blog_posts (title, slug, excerpt, content, category, icon_name, author, is_published, published_at)
VALUES ('التيترا والرازبورا والدانيو: أي سمكة سربية تختار؟', 'small-schooling-fish-selection', 'ثلاث عوائل تُباع كأنها شي واحد. الفرق بين النيون والكاردينال بفحص بصري واحد، وليش ليست كل تيترا مسالمة — قسم منها يقرض الزعانف.', '<h2>ثلاث عوائل تُباع كأنها شي واحد</h2>
<p>التيترا والرازبورا والدانيو تنحط بالمتجر بنفس الأحواض الصغيرة وبنفس السعر تقريباً، فيطلع المبتري بثلاث أنواع مختلفة وثلاث سمكات من كل نوع. والنتيجة حوض متوتر ما يشبه شي بالصور اللي شافها. الاختيار الصحيح يبدأ من فهم إن هذي ثلاث عوائل، لكل وحدة ماء يناسبها وسلوك مختلف.</p>
<table>
  <tr><th>العائلة</th><th>أمثلة شائعة</th><th>الماء اللي تفضّله</th><th>ملاحظة تقرر الشراء</th></tr>
  <tr><td>تيترا</td><td>نيون، كاردينال، بلاك نيون، غلولايت</td><td>أميل للطراوة والحموضة</td><td>ليست كلها مسالمة — قسم منها يقرض الزعانف</td></tr>
  <tr><td>رازبورا</td><td>هارليكوين، أمبر</td><td>طرية إلى متوسطة</td><td>الأهدأ بالعادة وأثبتها بالحوض المجتمعي</td></tr>
  <tr><td>دانيو</td><td>زيبرا دانيو</td><td>يتحمّل مدى واسع</td><td>نشيط وسريع جداً — يزعج الأنواع البطيئة</td></tr>
</table>
<blockquote>القاعدة العملية: سرب واحد كبير أفضل من ثلاثة أسراب ناقصة. ثمان سمكات من نوع واحد تعطيك المنظر والسلوك الطبيعي، بينما ثلاثة من كل نوع تعطيك ثلاث مجموعات خائفة. التفصيل بالأعداد بـ<a href="/blog/schooling-fish-minimum-numbers">الأسماك السربية: ليش ستة وليس ثلاثة</a>.</blockquote>

<h2>النيون والكاردينال: مو نفس السمكة</h2>
<p>هذا أكثر خلط يصير، والفرق مو تفصيل جمالي — يغيّر السعر والمتطلبات.</p>
<table>
  <tr><th></th><th>نيون تيترا</th><th>كاردينال تيترا</th></tr>
  <tr><td>الخط الأحمر</td><td>يغطي النصف الخلفي فقط</td><td>يمتد على <strong>طول الجسم كامل</strong></td></tr>
  <tr><td>الحجم</td><td>أصغر</td><td>أكبر قليلاً</td></tr>
  <tr><td>الحرارة</td><td>يتحمل الأبرد نسبياً</td><td>يميل للأدفأ</td></tr>
  <tr><td>السعر والتوفر</td><td>أرخص وأكثر توفراً</td><td>أغلى بالعادة</td></tr>
</table>
<p>الفحص البصري الأسرع: انظر للخط الأحمر. إذا وصل لحد الرأس فهي كاردينال. وللعناية باللون وأسباب موت النيون بالذات راجع <a href="/blog/neon-tetra-color-care-guide">دليل النيون تيترا</a>. والكاردينال من الأسماك اللي تُذكر مع <a href="/blog/discus-fish-care-guide">الديسكس</a> لأن كلاهما يفضّل ماءً أدفأ.</p>

<h2>ليست كل تيترا مسالمة</h2>
<p>هذي النقطة اللي تكسر أحواض كثيرة. اسم "تيترا" ما يعني مسالمة تلقائياً. قسم من الأنواع معروف بقرض الزعانف، خصوصاً لمّا يكون العدد قليل. والسمكة اللي تدفع الثمن هي صاحبة الزعانف الطويلة — البيتا والأنجل.</p>
<ul>
  <li><strong>العدد يغيّر السلوك.</strong> النوع القرّاض بأعداد قليلة يوجّه نشاطه لجيرانه؛ وبسرب كافٍ يوجّهه لبني جنسه. نفس المنطق بـ<a href="/blog/aquarium-fish-aggression">العدوانية والمطاردة بالحوض</a>.</li>
  <li><strong>الحجم عند البلوغ لا عند الشراء.</strong> <a href="/blog/angelfish-care-guide">الأنجل</a> البالغة تأكل النيون البالغ — هذا مو سوء توافق طباع، هذا فرق حجم.</li>
  <li><strong>الزعانف الطويلة تجذب القرض.</strong> قبل ما تخلط راجع <a href="/blog/tank-mates-compatibility">دليل التوافق</a> و<a href="/blog/betta-compatible-tank-mates">جيران البيتا</a>.</li>
</ul>

<h2>الماء يقرر قبل الذوق</h2>
<p>أغلب هذي الأنواع تتأقلم مع مدى معقول من القساوة، لكن الثبات أهم من الرقم المثالي. ماء قاسي ثابت أفضل من ماء طري متذبذب. اعرف قساوة مائك أولاً من <a href="/blog/gh-kh-water-hardness-guide">دليل GH و KH</a>، وثبّت القراءات بـ<a href="/blog/aquarium-test-kit-guide">فحص الماء</a>.</p>
<p>وبصيف العراق الحرارة العالية هي العامل الأصعب لا القساوة — راجع <a href="/blog/protect-fish-iraqi-summer-50-degrees">حماية الأسماك بحرارة الصيف</a>.</p>

<h2>ترتيب الشراء الصحيح</h2>
<ol>
  <li><strong>دوّر الحوض أولاً.</strong> السرب الصغير أول ضحية لحوض غير ناضج — <a href="/blog/nitrogen-cycle-simple-arabic-explained">الدورة البيولوجية</a>.</li>
  <li><strong>احسب الحمل قبل العدد.</strong> سرب ثمانية له كلفة حيوية — <a href="/blog/how-many-fish-in-aquarium">كم سمكة يتحمل حوضك</a>.</li>
  <li><strong>اشترِ السرب دفعة واحدة</strong> ما أمكن، حتى تتوحد المجموعة بدل ما تتشكل تراتبية على دفعات.</li>
  <li><strong>أقلم بهدوء</strong> — <a href="/blog/acclimating-new-fish">أقلمة السمكة الجديدة</a> — ولا تتجاوز <a href="/blog/quarantine-new-fish-guide">الحجر الصحي</a>، لأن الأسماك السربية الصغيرة تصل بالعادة مجهدة من النقل.</li>
</ol>
<p>وللمبتدئ اللي يريد بداية أقل مخاطرة، الدانيو من أصلب الخيارات ضمن <a href="/blog/5-hardy-fish-for-beginners">الأسماك اللي ما تموت بسرعة</a>. وإذا كان الهدف حوضاً قاعياً هادئاً بجانب السرب، فـ<a href="/blog/corydoras-types-best-cleaner-fish">الكوريدوراس</a> هي المرافق التقليدي.</p>', 'أنواع الأسماك', 'Fish',
        'AQUAVO Editorial Team', TRUE, now());

INSERT INTO blog_posts (title, slug, excerpt, content, category, icon_name, author, is_published, published_at)
VALUES ('البارب: أي نوع آمن للحوض المجتمعي؟', 'aquarium-barbs-guide', 'قرض الزعانف سلوك مجموعة لا طبع شخصي، ولهذا زيادة العدد تقلل المشكلة لا تزيدها. وأي جيران يدفعون الثمن أولاً.', '<h2>البارب سمكة ممتازة — بشرط تعرف أي نوع</h2>
<p>البارب من أنشط وأمتن أسماك المياه العذبة، وبنفس الوقت من أكثر الأسماك اللي تنباع بوصف غلط. المشكلة إن اسم "بارب" يغطي أنواعاً سلوكها مختلف تماماً: منها المسالم اللي يصلح لأي حوض مجتمعي، ومنها المعروف بقرض الزعانف. والمشتري يسمع "بارب" فيفترض إنها كلها نفس الشي.</p>
<table>
  <tr><th>النوع</th><th>السلوك بالحوض المجتمعي</th><th>الحكم العملي</th></tr>
  <tr><td>تايجر بارب (النمر)</td><td>نشيط جداً وقرّاض زعانف معروف</td><td>يصلح — لكن بسرب كافٍ وبجيران مدروسين</td></tr>
  <tr><td>شيري بارب</td><td>هادئ وأصغر حجماً</td><td>الخيار الأسهل للحوض المجتمعي</td></tr>
  <tr><td>أوديسا بارب</td><td>نشيط لكن أقل حدّة من التايجر</td><td>وسط — يحتاج مساحة سباحة</td></tr>
</table>

<h2>قرض الزعانف: سلوك، لا شرّ</h2>
<p>التايجر بارب ما يقرض الزعانف لأنه "عدواني" بالمعنى الشخصي. هذا سلوك مجموعة: البارب يتفاعل مع بني جنسه بترتيب اجتماعي مستمر — مطاردة وتنافس داخل السرب. لمّا يكون السرب ناقصاً، هذا النشاط ما يلقى مصرفاً داخلياً فينصبّ على أقرب هدف متاح.</p>
<blockquote>ولهذا الحل اللي يبدو معكوساً هو الصحيح: <strong>زيادة العدد تقلل المشكلة لا تزيدها</strong>. سرب صغير من التايجر بارب أخطر على جيرانه من سرب كبير. نفس المبدأ مشروح بـ<a href="/blog/aquarium-fish-aggression">العدوانية والمطاردة في الحوض</a> و<a href="/blog/schooling-fish-minimum-numbers">الأسماك السربية</a>.</blockquote>
<p>لكن لا تعتمد على العدد وحده. العدد يقلل الاحتمال، ما يلغيه.</p>

<h2>الجيران اللي ما تنفع مع التايجر بارب</h2>
<p>القاعدة بسيطة: كل سمكة بطيئة وذات زعانف طويلة هدف محتمل.</p>
<ul>
  <li><strong>البيتا</strong> — زعانف طويلة وحركة بطيئة، أسوأ تركيبة ممكنة. راجع <a href="/blog/betta-compatible-tank-mates">جيران البيتا</a>.</li>
  <li><strong>الأنجل</strong> — زعانفها الخيطية الطويلة تنقرض تدريجياً، وهذا مذكور صراحة بـ<a href="/blog/angelfish-care-guide">دليل الأنجل</a>.</li>
  <li><strong>الغورامي</strong> — له زوائد خيطية حساسة، و<a href="/blog/gourami-care-guide">طريقة تنفسه</a> تخليه يصعد للسطح ببطء وينكشف.</li>
  <li><strong>الديسكس</strong> — بطيئة الأكل ومتوترة أصلاً، والبارب يسرق طعامها قبل ما توصله. <a href="/blog/discus-fish-care-guide">دليل الديسكس</a>.</li>
</ul>
<p>الجيران المناسبون بالعكس: أسماك نشيطة بحجم مقارب وزعانف قصيرة، وأسماك قاعية مثل <a href="/blog/corydoras-types-best-cleaner-fish">الكوريدوراس</a> اللي تشتغل بطبقة مختلفة من الحوض. وقبل أي خلط راجع <a href="/blog/tank-mates-compatibility">دليل التوافق</a>.</p>

<h2>ما يحتاجه البارب فعلاً</h2>
<ol>
  <li><strong>طول لا ارتفاع.</strong> البارب سبّاح مسافات، فمساحة السباحة الأفقية أهم من عدد اللترات المجرد — <a href="/blog/how-many-fish-in-aquarium">كم سمكة يتحمل حوضك</a>.</li>
  <li><strong>تيار وأوكسجين.</strong> سمكة نشيطة تستهلك أوكسجين أكثر، وبصيف العراق هذي أول نقطة تنهار — <a href="/blog/air-pumps-decoration-or-necessity">متى تكون مضخة الهواء ضرورة</a> و<a href="/blog/protect-fish-iraqi-summer-50-degrees">حرارة الصيف</a>.</li>
  <li><strong>كسر خطوط الرؤية.</strong> نبات وخشب وصخر يقطعون مسار المطاردة، فيهدأ الحوض بلا ما تزيد لترات.</li>
  <li><strong>علف متنوع بكمية مضبوطة.</strong> البارب شره ويأكل بسرعة، فينتهي الأمر بإفراط بالعلف — <a href="/blog/aquarium-fish-feeding-guide">دليل التغذية</a>.</li>
</ol>

<h2>إذا صار القرض فعلاً</h2>
<p>الزعنفة المقروضة باب دخول للعدوى، ما هي مجرد ضرر شكلي. راقب الحافة: إذا صارت بيضاء أو متآكلة بالتدريج فأنت أمام مشكلة ثانية — <a href="/blog/fin-rot-treatment-guide">تعفن الزعانف</a>. وابدأ دائماً من الماء قبل الدواء، بحسب <a href="/blog/fish-disease-symptoms-diagnosis">دليل تشخيص الأعراض</a> و<a href="/blog/aquarium-test-kit-guide">قراءة الفحص</a>.</p>
<p>وإذا استمر القرض رغم السرب الكافي والمساحة، فالحل الصادق هو فصل الأنواع لا الاستمرار بالأمل. بعض التركيبات ما تشتغل مهما ضبطت الظروف.</p>', 'أنواع الأسماك', 'Users',
        'AQUAVO Editorial Team', TRUE, now());

INSERT INTO blog_posts (title, slug, excerpt, content, category, icon_name, author, is_published, published_at)
VALUES ('اللوتش (المهرج والكولي): قبل ما تشتري', 'aquarium-loaches-guide', 'سمكة تنباع بحجم إصبع وتصير أضعافه وتعيش سنوات. وكونه عديم الحراشف يغيّر بروتوكول الدواء بحوضك كله.', '<h2>سمكة تنباع بحجم إصبع وتصير بطول الساعد</h2>
<p>اللوتش عائلة قاعية محبوبة، وأشهر أفرادها بالسوق لوتش المهرج (كلاون لوتش) واللوتش الكولي. والفرق بينهما مو تفصيلاً — هو الفرق بين سمكة تناسب حوضاً صغيراً وسمكة ما يفترض تدخله أصلاً.</p>
<table>
  <tr><th></th><th>لوتش المهرج (كلاون)</th><th>اللوتش الكولي</th></tr>
  <tr><td>الحجم عند البلوغ</td><td><strong>كبير جداً</strong> — أضعاف حجم البيع</td><td>صغير ونحيل يشبه الدودة</td></tr>
  <tr><td>العمر المتوقع</td><td>طويل جداً — التزام سنوات</td><td>أقصر نسبياً</td></tr>
  <tr><td>الحوض المناسب</td><td>كبير فقط، ومو خيار مبتدئ</td><td>يناسب أحواضاً معتدلة</td></tr>
  <tr><td>السلوك</td><td>اجتماعي، يحتاج مجموعة</td><td>اجتماعي ومختبئ نهاراً</td></tr>
</table>
<blockquote>الخطأ الأكثر تكراراً: شراء لوتش مهرج صغير لحوض صغير على أساس إنه سمكة قاعية هادئة. هو فعلاً هادئ، لكنه يكبر ويعيش طويلاً. اشترِ على أساس الحجم البالغ لا حجم الرف — واحسب الحمل من <a href="/blog/how-many-fish-in-aquarium">كم سمكة يتحمل حوضك</a>.</blockquote>

<h2>عديم الحراشف: النقطة الأهم قبل أي دواء</h2>
<p>اللوتش من الأسماك اللي تُوصف بأنها عديمة الحراشف أو دقيقة الحراشف، وهذا يخلي جلده أكثر انكشافاً للمواد المذابة بالماء. عملياً هذا يعني إن الأدوية والملح تحتاج حذراً إضافياً معه.</p>
<ul>
  <li><strong>الجرعة الكاملة ليست افتراضاً آمناً.</strong> كثير من نشرات الأدوية تذكر تحفظاً خاصاً للأسماك عديمة الحراشف. اقرأ النشرة قبل ما تعالج حوضاً فيه لوتش.</li>
  <li><strong>الملح مسألة خلافية فعلاً</strong>، والمصادر مختلفة حولها، وهذا معروض كما هو بـ<a href="/blog/aquarium-salt-guide">دليل ملح الحوض</a> بدل ما نحسمه بلا دليل.</li>
  <li><strong>لا أدوية بشرية إطلاقاً</strong> — <a href="/blog/human-medicine-dangers-for-fish">مخاطر الأدوية البشرية على الأسماك</a>.</li>
  <li><strong>اللوتش يظهر النقط البيضاء بوضوح</strong> ويُعدّ من الأنواع الحساسة لها — راجع <a href="/blog/common-fish-diseases-white-spot">النقط البيضاء</a>.</li>
</ul>

<h2>القاع مو تفصيل ديكوري</h2>
<p>اللوتش يبحث عن طعامه بشوارب حساسة يمررها على الأرضية. الحصى الخشن أو الحاد يجرح هذي الشوارب مع الوقت، فتتآكل وتلتهب.</p>
<ol>
  <li><strong>أرضية ناعمة</strong> — رمل أو حصى ناعم مدوّر. نفس المتطلب الموجود عند <a href="/blog/corydoras-types-best-cleaner-fish">الكوريدوراس</a>، وراجع خيارات الأسطح بـ<a href="/blog/aquarium-soil-volcanic-substrate-secrets">التربة والركيزة</a>.</li>
  <li><strong>مخابئ حقيقية.</strong> اللوتش ليلي الميل ويحتاج كهوفاً وخشباً — وتأكد إن ما تضيفه آمن من <a href="/blog/aquarium-safe-rocks-and-wood">اختبار الحجر والخشب</a>.</li>
  <li><strong>مجموعة لا فرد.</strong> اللوتش المنفرد يختبئ دائماً ويفقد نشاطه — <a href="/blog/schooling-fish-minimum-numbers">الأسماك السربية</a>.</li>
</ol>

<h2>اللوتش والحلزون: توقّع أقل مما يُقال</h2>
<p>يُنصح باللوتش كثيراً كحل لتكاثر الحلزون، وهذا صحيح جزئياً فقط. بعض أنواع اللوتش فعلاً تأكل الحلزون، لكن هذا يعالج العَرَض لا السبب. الانفجار العددي للحلزون مؤشر على علف زائد بالأساس، وإذا بقي الفائض فالمشكلة ترجع.</p>
<p>وأسوأ من ذلك: إدخال سمكة كبيرة وطويلة العمر لحل مشكلة مؤقتة يخلق التزاماً دائماً. التفصيل الكامل بـ<a href="/blog/aquarium-snail-population-control">تكاثر الحلزون: السبب الحقيقي والسيطرة عليه</a>، وضبط العلف بـ<a href="/blog/aquarium-fish-feeding-guide">دليل التغذية</a>.</p>

<h2>قبل الشراء: ثلاث أسئلة</h2>
<ul>
  <li>هل حوضي يستوعب <strong>الحجم البالغ</strong> لا حجم البيع؟</li>
  <li>هل أرضيتي ناعمة بما يكفي لشواربه؟</li>
  <li>هل أنا مستعد أعدّل بروتوكول الدواء لأن الحوض صار فيه سمكة عديمة الحراشف؟</li>
</ul>
<p>وإذا كان الجواب لا على أي وحدة، فالخيار الأفضل تأجيل الشراء. وابدأ الجديد دائماً بـ<a href="/blog/quarantine-new-fish-guide">الحجر الصحي</a>، لأن اللوتش يصل بالعادة مجهداً وقد يحمل طفيليات بلا أعراض ظاهرة.</p>', 'أنواع الأسماك', 'Waves',
        'AQUAVO Editorial Team', TRUE, now());

UPDATE blog_posts SET title = 'سمكة منتفخة أو تطفو: استسقاء أم سبب آخر؟', excerpt = 'بروز الحراشف كثمرة الصنوبر علامة قوية على تجمّع سوائل جهازي. أما الطفو بجسم أملس فليس تشخيص كيس سباحة تلقائياً — له أسباب متعددة تبدأ من فحص الماء.', content = '<h2>سمكة منتفخة أو تطفو: حالتان مختلفتان تماماً</h2>
<p>هاتان الحالتان تُخلطان دائماً، والفرق بينهما هو الفرق بين مشكلة هضم بسيطة وحالة غالباً قاتلة. ويوجد فارق بصري واحد يفصل الاستسقاء عن غيره بوضوح:</p>
<table>
  <tr><th></th><th>الاستسقاء (Dropsy)</th><th>مشكلة طفو أو اتزان</th></tr>
  <tr><td>شكل الجسم</td><td><strong>الحراشف بارزة كثمرة الصنوبر</strong> عند النظر من الأعلى</td><td>الجسم <strong>أملس</strong> ومحيطه طبيعي</td></tr>
  <tr><td>العرض</td><td>انتفاخ بالبطن وتورم عام</td><td>تطفو أو تغرق أو تميل على جنب</td></tr>
  <tr><td>الطبيعة</td><td>عرَض لتجمّع سوائل جهازي بالأنسجة</td><td><strong>عرَض له أسباب متعددة</strong> — لا تشخيص بحد ذاته</td></tr>
  <tr><td>المآل</td><td><strong>سيئ</strong> — خصوصاً بعد بروز الحراشف</td><td>يعتمد على السبب</td></tr>
</table>
<blockquote>الفحص العملي: انظر للسمكة <strong>من الأعلى</strong>، لا من الجانب. بروز الحراشف يظهر من هذه الزاوية فقط. حراشف بارزة = استسقاء. أما الجسم الأملس مع مشكلة طفو فيعني <strong>أن الحالة ليست استسقاءً</strong> — ولا يعني أن السبب معروف.</blockquote>

<h2>مشكلة الطفو ليست تشخيص "كيس سباحة" تلقائياً</h2>
<p>أشيع خطأ بهذا الموضوع هو تسمية أي اضطراب طفو "مرض كيس السباحة" والانتقال فوراً للعلاج. الطفو أو الميلان <strong>علامة</strong>، ولها أكثر من سبب محتمل يختلف علاجها تماماً:</p>
<ul>
  <li><strong>امتلاء الجهاز الهضمي أو ابتلاع هواء</strong> مع الطعام الطافي — الأكثر شيوعاً وأبسطها.</li>
  <li><strong>رداءة جودة الماء</strong> — سبب مُهمَل ومتكرر، ويجب استبعاده قبل أي شي.</li>
  <li><strong>عدوى داخلية</strong> قد تصيب كيس السباحة نفسه أو تضغط عليه.</li>
  <li><strong>ضغط من عضو متضخم أو كتلة</strong> داخل التجويف البطني.</li>
  <li><strong>تشوّه خلقي أو إصابة</strong> — دائم بالعادة.</li>
  <li><strong>مرحلة مبكرة من حالة جهازية</strong> قد تتطور لاحقاً لبروز حراشف.</li>
</ul>
<p>ولذلك القاعدة: افحص الماء أولاً، وراقب التطور، ولا تفترض أن السبب ميكانيكي بسيط لمجرد أن السمكة تطفو. وللتمييز عن غيرها راجع <a href="/blog/fish-disease-symptoms-diagnosis">دليل تشخيص الأعراض</a>.</p>

<h2>الخطوات الأولى — بترتيبها</h2>
<ol>
  <li><strong>افحص الماء قبل أي إجراء.</strong> الأمونيا والنتريت والنترات — <a href="/blog/aquarium-test-kit-guide">قراءة الفحص</a>، و<a href="/blog/nitrite-spike-aquarium">ارتفاع النتريت</a>.</li>
  <li><strong>أوقف العلف يوماً أو يومين</strong> إذا كانت السمكة <strong>بالغة وسليمة الحال</strong>. هذا إجراء تخفيفي شائع بالهواية، وقد يساعد إذا كان السبب هضمياً — لكنه ليس علاجاً مضموناً ولا يصلح لكل حالة.</li>
  <li><strong>انقع الحبيبات</strong> قبل التقديم، أو انتقل لعلف غاطس — يقلل الهواء المبتلع عند السطح.</li>
  <li><strong>راجع كمية العلف</strong> عموماً — <a href="/blog/aquarium-fish-feeding-guide">دليل التغذية</a>.</li>
</ol>
<blockquote>متى <strong>لا</strong> يصلح إيقاف العلف: مع الصغار واليافعين لأن احتياجهم الغذائي مستمر واحتياطيهم ضئيل، ومع الأنواع الصغيرة سريعة الأيض، ومع السمكة الهزيلة أو المتوقفة عن الأكل أصلاً. وإذا كانت السمكة لا تأكل من نفسها فالمشكلة ليست امتلاءً، والصيام لا يضيف شيئاً.</blockquote>
<p>وإذا استمرت المشكلة أسابيع بلا تحسّن، فقد تكون إصابة أو تشوهاً دائماً، وبعض الأسماك تتعايش معها بحوض هادئ قليل التيار.</p>

<h2>الاستسقاء: كن صريحاً مع نفسك</h2>
<p>الاستسقاء ليس مرضاً بحد ذاته بل <strong>عرَض</strong>: تجمّع سوائل جهازي بالأنسجة والتجويف البطني يجعل الحراشف تبرز للخارج. وهو ناتج عن خلل بتنظيم السوائل، وأسبابه الكامنة تشمل عدوى بكتيرية داخلية أو فشلاً بالأعضاء. ولهذا لا يوجد "دواء استسقاء" يعالج السبب دائماً.</p>
<ul>
  <li><strong>بروز الحراشف علامة قوية</strong> على أن الحالة جهازية وليست موضعية أو هضمية.</li>
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
<p>والأنواع مستديرة الجسم مثل <a href="/blog/goldfish-5-deadly-mistakes-beginners">الجولدفش المزخرف</a> والبيتا تظهر عندها مشاكل الطفو أكثر من غيرها بحكم شكل التجويف البطني.</p>'
 WHERE slug = 'fish-bloating-swim-bladder-dropsy';

UPDATE blog_posts SET title = 'أسماك التنظيف (الزبال): أي منظّف لأي مشكلة؟', excerpt = 'لا توجد سمكة تأكل الفضلات. والأوتوسينكلس ليس فريق طوارئ — إضافته لحوض جديد أو حوض نُظّف للتو تجويع بطيء.', content = '<h2>خرافة تجارية قاتلة: لا توجد سمكة تأكل الفضلات</h2>
<p>أولاً وقبل أي اختيار: <strong>لا توجد سمكة تأكل براز الأسماك الأخرى</strong>. الفضلات تُزال بتبديل الماء وبالفلترة الحيوية، لا بسمكة. الأسماك اللي تنسمّى "زبال" بالعراق — مثل البليكو والكوريدوراس — تأكل الطحالب النامية وبواقي العلف الساقط فقط.</p>
<p>ويترتب على هذا شي عملي: <strong>هذي الأسماك تحتاج علفاً مخصصاً لها</strong>، أقراصاً غاطسة بالعادة، وإلا تموت جوعاً ببطء بحوض يبدو نظيفاً. والحوض النظيف تماماً هو أخطر حوض على آكل الطحالب. راجع <a href="/blog/aquarium-fish-feeding-guide">دليل التغذية</a>.</p>

<h2>أي منظّف لأي مشكلة</h2>
<table>
  <tr><th>السمكة</th><th>تشتغل على</th><th>ما تشتغل عليه</th></tr>
  <tr><td>أوتوسينكلس</td><td>طحالب ناعمة على الزجاج وأوراق النبات</td><td>الطحالب القاسية والفضلات</td></tr>
  <tr><td>كوريدوراس</td><td>نبش الأرضية والعلف الفائض المدفون</td><td>الزجاج — لا تنظفه إطلاقاً</td></tr>
  <tr><td>سيامي طحالب النهر</td><td>طحالب اللحية السوداء وبعض الخيطية</td><td>الأرضية والفضلات</td></tr>
</table>
<p>والكوريدوراس بالذات لها أنواع ومتطلبات أرضية خاصة — <a href="/blog/corydoras-types-best-cleaner-fish">أنواع الكوريدوراس</a>. وللحية السوداء تحديداً <a href="/blog/black-beard-algae-removal-steps">طحالب اللحية السوداء</a>.</p>

<h2>الأوتوسينكلس: ليس فريق طوارئ</h2>
<p>هذي النقطة تستحق تصحيحاً صريحاً، لأن الوصف الشائع للأوتو كـ"فريق طوارئ" يقتلها فعلياً. الأوتو <strong>يُضاف لحوض ناضج، لا لحوض جديد أو حوض تعرّض لتنظيف شامل</strong>.</p>
<ul>
  <li><strong>غذاؤه طبقة حيوية دقيقة</strong> تحتاج وقتاً لتتكوّن على الأسطح. الحوض الجديد ما يوفّرها، فالسمكة تضعف وتهزل خلال أسابيع بلا سبب ظاهر.</li>
  <li><strong>المفارقة القاتلة:</strong> الناس تشتريه لحل انفجار طحالب، فلمّا ينجح — أو لمّا يُعالَج السبب — ما يبقى له غذاء. لازم علف بديل: شرائح خضار مسلوقة أو أقراص طحالب.</li>
  <li><strong>يصل مجهداً بالعادة.</strong> الأوتو معروف بحساسيته للنقل، وكثير منه يصل ضعيفاً أصلاً. <a href="/blog/quarantine-new-fish-guide">الحجر الصحي</a> مو رفاهية هنا.</li>
  <li><strong>مجموعة لا فرد.</strong> يعيش بمجموعات ويصير خاملاً ومختبئاً لوحده.</li>
</ul>
<blockquote>الترتيب الصحيح: عالج سبب الطحالب أولاً، ثم قرّر إذا كنت تريد الأوتو كجزء دائم من الحوض — وليس كعلاج. آكلات الطحالب مساعدة لا حل، وهذا مشروح بـ<a href="/blog/algae-war-guide">دليل الطحالب</a>.</blockquote>

<h2>القاعدة اللي تسبق كل شي</h2>
<p>الطحالب والعلف الفائض عرَض لخلل بالتوازن، والسمكة ما تصلّح الخلل. تأكد من نضج الحوض — <a href="/blog/nitrogen-cycle-simple-arabic-explained">الدورة البيولوجية</a> — واضبط العلف والإضاءة، ثم اختر المنظّف حسب المهمة لا حسب الاسم التجاري.</p>
<p>وانتبه للحمل الحيوي: كل منظّف تضيفه سمكة كاملة لها فضلات ومتطلبات — <a href="/blog/how-many-fish-in-aquarium">كم سمكة يتحمل حوضك</a>. وإذا كانت المشكلة حلزوناً لا طحالب فالمقاربة مختلفة تماماً — <a href="/blog/aquarium-snail-population-control">تكاثر الحلزون</a>.</p>'
 WHERE slug = 'best-aquarium-cleaner-fish-pleco-corydoras';

UPDATE blog_posts SET title = 'الأسماك الولودة (مولي، بلاتي، جوبي، سوردتيل): التفريخ وإدارة العدد', excerpt = 'الأنثى تخزّن ما تحتاجه وتنجب دفعات متتالية بعد تزاوج واحد — فالتحدي إدارة العدد لا إنتاج الصغار. ونسبة الذكور للإناث ليست تفصيلاً.', content = '<h2>الأسماك الولودة: عائلة واحدة بأربعة وجوه</h2>
<p>المولي والبلاتي والجوبي والسوردتيل تُباع كأنواع منفصلة، لكنها تتشارك نفس الميكانيكية: <strong>ولودة</strong> — تلد صغاراً سابحة جاهزة، لا تضع بيضاً. وهذا يغيّر كل شي بالتخطيط، لأن السؤال ما يكون "كيف أفرّخها" بل "كيف أتعامل مع تفريخ يصير سواء أردته أو لا".</p>
<table>
  <tr><th>النوع</th><th>الحجم</th><th>ملاحظة تقرر الشراء</th></tr>
  <tr><td>بلاتي</td><td>صغير</td><td>الأسهل والأكثر تحمّلاً — بداية ممتازة</td></tr>
  <tr><td>جوبي</td><td>صغير</td><td>ذكوره بزعانف طويلة تجذب القرض من الجيران</td></tr>
  <tr><td>مولي</td><td>متوسط</td><td>أكبر حملاً حيوياً وأكثر حساسية لتدهور الماء</td></tr>
  <tr><td>سوردتيل</td><td>الأكبر بينها</td><td>يحتاج طول سباحة أكثر، وذكوره تتنافس بينها</td></tr>
</table>
<p>وللجوبي تفصيل مستقل بـ<a href="/blog/guppy-fish-care-breeding-guide">دليل الجوبي</a>، وللمبتدئ راجع موقعها ضمن <a href="/blog/5-hardy-fish-for-beginners">الأسماك اللي ما تموت بسرعة</a>.</p>

<h2>الحقيقة اللي تفاجئ الأغلب: أنثى واحدة تكفي</h2>
<p>أهم نقطة عملية بهذا الموضوع: <strong>الأنثى تقدر تخزّن ما تحتاجه للإخصاب وتنجب دفعات متتالية بعد تزاوج واحد</strong>. يعني شراء أنثى واحدة من المتجر قد ينتهي بعدة دفعات صغار بحوضك بلا وجود أي ذكر عندك إطلاقاً.</p>
<blockquote>وهذا يقلب السؤال: التحدي مو إنتاج الصغار — التحدي إدارة العدد. خطّط للاكتظاظ قبل ما يصير، لأنه يصير بسرعة أكبر مما تتوقع. راجع <a href="/blog/how-many-fish-in-aquarium">كم سمكة يتحمل حوضك</a>.</blockquote>

<h2>نسبة الذكور للإناث ليست تفصيلاً</h2>
<p>ذكور الولودة تطارد الإناث باستمرار كسلوك تكاثري. وإذا كان العدد غير متوازن، تتركّز المطاردة على أنثى وحدة فتنهك وتتوتر ويضعف مناعتها.</p>
<ul>
  <li><strong>القاعدة الشائعة:</strong> ذكر واحد مقابل اثنتين إلى ثلاث إناث، لا العكس.</li>
  <li><strong>السوردتيل خصوصاً:</strong> ذكرين بالغين بحوض ضيق يتنافسان — الأفضل ذكر واحد. وهذي نفس الملاحظة الموجودة بدليل الأسماك الصلبة.</li>
  <li><strong>وإذا أردت تجنّب التكاثر أصلاً:</strong> اقتنِ جنساً واحداً فقط — والتمييز مشروح بـ<a href="/blog/how-to-sex-aquarium-fish">تمييز الذكر من الأنثى</a>. لكن انتبه لنقطة التخزين أعلاه: الأنثى المشتراة قد تكون حاملاً أصلاً.</li>
  <li>ولفهم منطق المطاردة عموماً راجع <a href="/blog/aquarium-fish-aggression">العدوانية والمطاردة في الحوض</a>.</li>
</ul>

<h2>إنقاذ الصغار: النبات أنجح من الشبكة</h2>
<p>الصغار تُفترس من أمها ومن بقية الحوض خلال ساعات. والحلول ليست متساوية:</p>
<ol>
  <li><strong>نبات كثيف وأسطح عائمة</strong> — الأبسط والأنجح عملياً. الصغار تختبئ من نفسها، بلا نقل ولا إجهاد.</li>
  <li><strong>حوض منفصل للصغار</strong> — الأفضل للنتيجة، لكنه يحتاج تدويراً حيوياً مستقلاً. حوض جديد بلا بكتيريا يقتل الصغار بالأمونيا — <a href="/blog/nitrogen-cycle-simple-arabic-explained">الدورة البيولوجية</a>.</li>
  <li><strong>صندوق التفريخ المعلّق</strong> — يشتغل، لكن حبس الأنثى فيه طويلاً يجهدها. استخدمه قصير المدة فقط.</li>
</ol>
<p>وتغذية الصغار تكون بوجبات صغيرة متكررة بعلف مطحون ناعم؛ والإفراط هنا يفسد الماء بسرعة لأن الحجم صغير — <a href="/blog/aquarium-fish-feeding-guide">دليل التغذية</a> و<a href="/blog/aquarium-water-change-guide">تغيير الماء</a>.</p>

<h2>ظروف العراق: الحرارة قبل كل شي</h2>
<p>الولودة متحمّلة عموماً، لكن نقطتين تكسرها محلياً:</p>
<ul>
  <li><strong>حرارة الصيف.</strong> ارتفاع الحرارة يقلل الأوكسجين الذائب ويسرّع الأيض، والحوض المكتظ بالصغار أول ما ينهار — <a href="/blog/protect-fish-iraqi-summer-50-degrees">حماية الأسماك بحرارة الصيف</a> و<a href="/blog/air-pumps-decoration-or-necessity">مضخة الهواء</a>.</li>
  <li><strong>انقطاع الكهرباء</strong> — <a href="/blog/power-outage-emergency-aquarium-tools">أدوات الطوارئ</a>.</li>
  <li><strong>ماء الحنفية</strong> لازم يُعالَج قبل الاستخدام — <a href="/blog/how-to-treat-tap-water-for-fish-iraq">معالجة ماء الحنفية</a>.</li>
</ul>
<p>والمولي بالذات يميل لماء أقسى قليلاً من البلاتي، فاعرف قساوة مائك من <a href="/blog/gh-kh-water-hardness-guide">دليل GH و KH</a> قبل ما تحمّل اختيارك أكثر مما يحتمل.</p>'
 WHERE slug = 'molly-platy-breeding-save-fry';

-- Post-flight.
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM blog_posts WHERE is_published;
  IF n <> 103 THEN RAISE EXCEPTION 'expected 103 published, found %', n; END IF;

  SELECT count(*) INTO n FROM blog_posts
   WHERE slug IN ('small-schooling-fish-selection', 'aquarium-barbs-guide', 'aquarium-loaches-guide', 'fish-bloating-swim-bladder-dropsy', 'best-aquarium-cleaner-fish-pleco-corydoras', 'molly-platy-breeding-save-fry')
     AND is_published AND length(content) > 2500
     AND content LIKE '%<table%' AND content LIKE '%href="/blog/%'
     AND author = 'AQUAVO Editorial Team';
  IF n <> 6 THEN RAISE EXCEPTION 'only % of 6 articles carry their structure', n; END IF;

  -- The corrected article must no longer assert the automatic diagnosis.
  SELECT count(*) INTO n FROM blog_posts
   WHERE slug = 'fish-bloating-swim-bladder-dropsy'
     AND content LIKE '%مشكلة طفو = كيس سباحة%';
  IF n <> 0 THEN RAISE EXCEPTION 'the swim-bladder auto-diagnosis is still published'; END IF;

  -- The corrected article must no longer call otocinclus an emergency crew.
  SELECT count(*) INTO n FROM blog_posts
   WHERE slug = 'best-aquarium-cleaner-fish-pleco-corydoras'
     AND content LIKE '%فريق طوارئ مبدع%';
  IF n <> 0 THEN RAISE EXCEPTION 'the otocinclus emergency-crew claim is still published'; END IF;

  -- No published article may link to an unpublished one, corpus-wide.
  SELECT count(*) INTO n
    FROM blog_posts b
    CROSS JOIN LATERAL regexp_matches(b.content, 'href="/blog/([^"#?]+)"', 'g') AS m(parts)
   WHERE b.is_published
     AND NOT EXISTS (SELECT 1 FROM blog_posts t WHERE t.slug = m.parts[1] AND t.is_published);
  IF n <> 0 THEN RAISE EXCEPTION '% internal links point at unpublished articles', n; END IF;

  SELECT count(*) INTO n FROM blog_posts
   WHERE slug IN ('small-schooling-fish-selection', 'aquarium-barbs-guide', 'aquarium-loaches-guide', 'fish-bloating-swim-bladder-dropsy', 'best-aquarium-cleaner-fish-pleco-corydoras', 'molly-platy-breeding-save-fry')
     AND content ~ '[一-鿿぀-ヿ가-힯Ѐ-ӿऀ-ॿ฀-๿֐-׿Ā-ɏḀ-ỿ]';
  IF n <> 0 THEN RAISE EXCEPTION 'a Wave 9 article carries stray script'; END IF;
END $$;

COMMIT;

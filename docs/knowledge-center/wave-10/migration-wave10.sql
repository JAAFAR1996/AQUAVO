-- Migration ID: kc-wave10-articles-20260903
-- Target:       Neon production, blog_posts
--               (3 inserts, 1 rewrite, 1 slug rename, 1 link append)
-- Rollback:     rollback-wave10.sql
-- Companion:    vercel.json gains a 301 for the old Arabic path. Deploy that
--               with or before this migration so the old URL never 404s.
--
-- Discovery Cycle 10. Species and topics were again closed by decision, not by
-- publishing one article each.
--
-- NEW dwarf-cichlids-guide. The corpus covers oscar, discus, angelfish,
-- flowerhorn and African cichlids, and owns no dwarf cichlid at all: "راميريزي",
-- "أبيستوغراما" and "بلو رام" return zero matches across all 103 articles. The
-- article leads with the failure that actually happens — the blue ram sold to a
-- beginner for an immature tank — and names the hardier alternative.
--
-- NEW fish-breeding-basics. Breeding is mentioned in 18 articles and owned for
-- livebearers and snails only. Egg-laying has no coverage whatsoever: "يضع
-- البيض", "بياضة" and "حاضنة الفم" return zero matches. It is framed as a
-- husbandry decision rather than a technique, because the outcome that actually
-- bites is population management.
--
-- NEW raising-fish-fry. Zero coverage: "زريعة", "ارتيميا" and "إنفوزوريا" appear
-- nowhere in the corpus, while the livebearer article Cycle 9 rewrote points at
-- fry rearing as a next step. Leads with mouth size, and states plainly that
-- stunting is permanent.
--
-- GROUPed, not published separately: rainbowfish. Same intent as
-- small-schooling-fish-selection — which schooling fish to buy — so a separate
-- page would cannibalise it. Added there as the larger-bodied option, with the
-- point that decides the purchase: juveniles look drab in the shop tank.
--
-- ALREADY COVERED: danio. Present in 5 articles, including six mentions in
-- 5-hardy-fish-for-beginners and its own row in the Cycle 9 selection table.
--
-- NOT WORTH STANDALONE: killifish. Zero coverage, but the gap is real only in a
-- taxonomic sense: annual species, diapause eggs and peat spawning are a
-- specialist pursuit with no meaningful local availability. Publishing it would
-- be filler, which the cycle rules forbid.
--
-- RENAME. The corpus's last orphan carried a raw-Arabic slug. The corpus-wide
-- dead-link post-flight compares the href capture to blog_posts.slug with no URL
-- decoding, so a percent-encoded href to it reads as dead and a raw-Arabic href
-- is re-encoded by the browser. Neither could be linked, which is why Cycle 9
-- excluded it. Normalising the slug removes the whole class of problem, and the
-- 301 preserves the old URL.
--
-- All four drafts passed script-purity, editorial, business-truth, internal link
-- resolution and block-tag balance via scripts/gate-draft.ts.

BEGIN;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM blog_posts WHERE is_published;
  IF n <> 103 THEN RAISE EXCEPTION 'expected 103 published posts, found %', n; END IF;

  SELECT count(*) INTO n FROM blog_posts WHERE slug IN ('dwarf-cichlids-guide', 'fish-breeding-basics', 'raising-fish-fry', 'aquarium-substrate-and-decor-guide');
  IF n <> 0 THEN RAISE EXCEPTION 'one of the new slugs already exists'; END IF;

  SELECT count(*) INTO n FROM blog_posts WHERE slug = 'دليل-شامل-لتربة-وديكور-الأحواض-اختيار-الأسطح-المثا-1787451489298' AND is_published;
  IF n <> 1 THEN RAISE EXCEPTION 'the rename source is missing'; END IF;

  SELECT count(*) INTO n FROM blog_posts WHERE slug = 'small-schooling-fish-selection' AND is_published
     AND length(content) = 4218;
  IF n <> 1 THEN RAISE EXCEPTION 'small-schooling-fish-selection: reframe target missing or changed since drafting'; END IF;

  SELECT count(*) INTO n FROM blog_posts WHERE slug = 'aquarium-safe-rocks-and-wood' AND is_published
     AND length(content) = 3038;
  IF n <> 1 THEN RAISE EXCEPTION 'aquarium-safe-rocks-and-wood: link source missing or changed since drafting'; END IF;
END $$;

CREATE TABLE blog_posts_backup_wave10_20260903 AS
SELECT id, slug, title, excerpt, content, is_published, now() AS backed_up_at
  FROM blog_posts;

INSERT INTO blog_posts (title, slug, excerpt, content, category, icon_name, author, is_published, published_at)
VALUES ('السيكلد القزم (رام وأبيستو): سيكلد بحجم الحوض المجتمعي', 'dwarf-cichlids-guide', 'ذكاء السيكلد وسلوكه الترابي ببضعة سنتيمترات. وليش يموت البلو رام بسرعة عند كثيرين — والبديل الأسهل اللي يعطي نفس الشكل تقريباً.', '<h2>سيكلد بحجم يناسب الحوض المجتمعي</h2>
<p>لمّا يسمع المبتدئ كلمة "سيكلد" يفكر بالأوسكار والفلورهورن — أسماك كبيرة عدوانية تحتاج أحواضاً ضخمة. لكن العائلة فيها قسم آخر كامل: السيكلد القزم. أسماك ما تتجاوز بضعة سنتيمترات، تحمل نفس الذكاء والسلوك الترابي، لكن بمساحة يتحملها حوض بيتي عادي.</p>
<table>
  <tr><th>النوع</th><th>الماء اللي يفضّله</th><th>مستوى الصعوبة</th></tr>
  <tr><td>بلو رام (راميريزي)</td><td>دافئ أكثر من المعتاد، وطري نسبياً</td><td>الأصعب — حساس للماء غير المستقر</td></tr>
  <tr><td>بوليفيان رام</td><td>مدى أوسع وحرارة أقل</td><td>أسهل بوضوح — بديل عملي للبلو رام</td></tr>
  <tr><td>أبيستوغراما</td><td>يميل للطراوة والحموضة</td><td>متوسط — يحتاج ثباتاً</td></tr>
  <tr><td>كريبنسس</td><td>يتحمل الماء الأقسى</td><td>الأصلب بين المجموعة</td></tr>
</table>
<blockquote>إذا كان هذا أول سيكلد لك، ابدأ بالبوليفيان رام أو الكريبنسس لا بالبلو رام. البلو رام أجمل، لكنه يعاقب أي تذبذب بالماء، وأغلب من يفشل معه يفشل بالشهر الأول.</blockquote>

<h2>ليش يموت البلو رام بسرعة عند كثيرين</h2>
<p>هذي النقطة تستحق صراحة، لأنها تتكرر كثيراً وتُفسَّر غلط على أنها "حظ".</p>
<ul>
  <li><strong>يحتاج حوضاً ناضجاً لا حوضاً جديداً.</strong> السمكة حساسة للأمونيا والنتريت أكثر من المتوسط، فدخولها لحوض ما كمّل دورته حكم شبه مؤكد — <a href="/blog/nitrogen-cycle-simple-arabic-explained">الدورة البيولوجية</a>.</li>
  <li><strong>يريد حرارة أعلى من بقية الحوض المجتمعي.</strong> وهذا يخلق تعارضاً حقيقياً مع أنواع تفضّل الأبرد، فالاختيار يصير: إما تضبط الحوض عليه أو ما تشتريه.</li>
  <li><strong>يصل مجهداً بالعادة.</strong> كثير من المعروض يمر بسلسلة نقل طويلة ويصل بمناعة ضعيفة، ولهذا <a href="/blog/quarantine-new-fish-guide">الحجر الصحي</a> ليس اختيارياً هنا.</li>
  <li><strong>الثبات أهم من الرقم.</strong> قراءة ثابتة أفضل من قراءة مثالية متذبذبة — <a href="/blog/aquarium-test-kit-guide">قراءة الفحص</a> و<a href="/blog/gh-kh-water-hardness-guide">دليل GH و KH</a>.</li>
</ul>
<p>وبصيف العراق تصير المعادلة أصعب: الحرارة العالية تقلل الأوكسجين الذائب، والسمكة الحساسة أول من يتأثر — <a href="/blog/protect-fish-iraqi-summer-50-degrees">حماية الأسماك بحرارة الصيف</a>.</p>

<h2>"مسالم" لحد ما يتزاوج</h2>
<p>السيكلد القزم يُباع على أنه سمكة مجتمعية مسالمة، وهذا صحيح — بشرط واحد: أن لا يتشكل زوج. لمّا يتزوج الزوج ويختار بقعة، ينقلب السلوك تماماً ويصير يدافع عن منطقته بشراسة تفوق حجمه.</p>
<ul>
  <li><strong>الدفاع منطقة لا حوض.</strong> العدوانية محصورة بمحيط البقعة، فكسر خطوط الرؤية بالنبات والخشب يحل أغلب المشكلة — نفس منطق <a href="/blog/aquarium-fish-aggression">العدوانية والمطاردة في الحوض</a>.</li>
  <li><strong>التزاحم على القاع.</strong> السيكلد القزم قاعي الميل، فيتنافس مع <a href="/blog/corydoras-types-best-cleaner-fish">الكوريدوراس</a> على نفس الطبقة والطعام.</li>
  <li><strong>الأبيستوغراما بنظام الحريم.</strong> ذكر واحد مع عدة إناث بالعادة، لا ذكرين — الذكران يتقاتلان.</li>
  <li>وقبل أي خلط راجع <a href="/blog/tank-mates-compatibility">دليل التوافق</a>.</li>
</ul>

<h2>أين يقع من بقية عائلة السيكلد</h2>
<p>الفرق بين السيكلد الأمريكي والإفريقي يحدد الماء والسلوك المتوقع، والأقزام تتوزع على الجهتين: الرام والأبيستو أمريكية جنوبية، والكريبنسس إفريقية غربية. التفصيل بـ<a href="/blog/american-vs-african-cichlids-differences">الفرق بين الأمريكية والإفريقية</a> و<a href="/blog/african-cichlids-best-types-colors">أنواع السيكلد الإفريقي</a>.</p>
<p>وهذا فرق عملي لا أكاديمي: خلط قزم يفضّل الماء الطري مع سيكلد إفريقي يفضّل القاسي تركيبة فاشلة من البداية مهما كانت الأحجام متقاربة.</p>

<h2>قبل الشراء</h2>
<ol>
  <li><strong>هل حوضي ناضج فعلاً؟</strong> إذا كان عمره أسابيع قليلة، أجّل.</li>
  <li><strong>هل أقدر أثبّت الحرارة</strong> اللي يريدها دون ما أضر بقية السكان؟</li>
  <li><strong>هل عندي قاع فيه مخابئ</strong> وخطوط رؤية مكسورة، أم حوض مفتوح؟</li>
  <li><strong>هل أنا مستعد لتغيّر السلوك</strong> إذا تشكل زوج؟</li>
</ol>
<p>وإذا ظهرت أعراض بعد الإدخال، ابدأ من الماء لا من الدواء — <a href="/blog/fish-disease-symptoms-diagnosis">دليل تشخيص الأعراض</a>. واحسب الحمل قبل الإضافة بـ<a href="/blog/how-many-fish-in-aquarium">كم سمكة يتحمل حوضك</a>.</p>', 'أنواع الأسماك', 'Fish',
        'AQUAVO Editorial Team', TRUE, now());

INSERT INTO blog_posts (title, slug, excerpt, content, category, icon_name, author, is_published, published_at)
VALUES ('التفريخ كقرار: ولود أم بايض، وهل تريده أصلاً؟', 'fish-breeding-basics', 'السؤال يسبق الطريقة: وين يروح الناتج؟ الفرق بين الولودة والبايضة، وأربع مدارس مختلفة داخل البايضة تغيّر التحضير كلياً.', '<h2>التفريخ قرار، مو مكافأة</h2>
<p>أغلب الكلام عن التفريخ يبدأ بـ"كيف أخليها تتكاثر؟" والسؤال الصحيح يسبق ذلك: <strong>هل تريد صغاراً فعلاً؟</strong> لأن النتيجة ليست عشر سمكات ظريفة — هي عشرات الأفواه بحوض له سعة محددة، وقرارات لاحقة عن أين تذهب.</p>
<blockquote>القاعدة العملية: لا تبدأ تفريخاً قبل ما تعرف وين يروح الناتج. حوض تربية، أو مشترٍ، أو صديق هاوي. بدون هذا الجواب، التفريخ الناجح يتحول لمشكلة اكتظاظ — <a href="/blog/how-many-fish-in-aquarium">كم سمكة يتحمل حوضك</a>.</blockquote>

<h2>استراتيجيتان تحكمان كل شي</h2>
<p>أسماك المياه العذبة تتكاثر بطريقتين، والفرق بينهما يقرر كل خطوة عملية بعدها.</p>
<table>
  <tr><th></th><th>الولودة</th><th>البايضة</th></tr>
  <tr><td>الناتج</td><td>صغار سابحة جاهزة</td><td>بيض يحتاج فقساً</td></tr>
  <tr><td>يصير بلا تخطيط؟</td><td><strong>نعم — غالباً</strong></td><td>لا، يحتاج ظروفاً مهيّأة</td></tr>
  <tr><td>أمثلة</td><td>مولي، بلاتي، جوبي، سوردتيل</td><td>تيترا، سيكلد، غورامي، كوريدوراس</td></tr>
  <tr><td>التحدي الأول</td><td>إدارة العدد</td><td>الوصول للفقس أصلاً</td></tr>
</table>
<p>الولودة مشروحة بالتفصيل بـ<a href="/blog/molly-platy-breeding-save-fry">الأسماك الولودة وإدارة العدد</a> و<a href="/blog/guppy-fish-care-breeding-guide">دليل الجوبي</a>. أما البايضة فما هي صنفاً واحداً.</p>

<h2>البايضة: أربع مدارس مختلفة</h2>
<ul>
  <li><strong>ناثرات البيض.</strong> تنثر البيض بين النبات وتنساه، وكثير منها يأكله بعدها مباشرة. الحماية هنا نبات كثيف أو فصل الأبوين بعد النثر. أغلب <a href="/blog/small-schooling-fish-selection">الأسماك السربية الصغيرة</a> من هذا النوع.</li>
  <li><strong>واضعات على سطح.</strong> تنظّف ورقة أو حجراً وتضع البيض عليه ثم يحرسه الزوج. <a href="/blog/angelfish-care-guide">الأنجل</a> مثال معروف، وهنا يتحول الزوج المسالم لحارس عدواني.</li>
  <li><strong>حاضنات الفم.</strong> تحمل البيض داخل فمها حتى الفقس — منتشرة بين <a href="/blog/african-cichlids-best-types-colors">السيكلد الإفريقي</a>. الأنثى تتوقف عن الأكل خلال الفترة.</li>
  <li><strong>بانيات عش الفقاعات.</strong> يبني الذكر عشاً من فقاعات عند السطح ويحرسه. هذا سلوك <a href="/blog/gourami-care-guide">الغورامي</a> والبيتا، ومرتبط مباشرة بطريقة تنفسهما الهوائي.</li>
</ul>
<p>ومعرفة أي مدرسة ينتمي لها نوعك تغيّر التحضير كلياً: النبات الكثيف لا ينفع مع حاضنة الفم، والحجر المسطح لا يعني شيئاً لناثرة البيض.</p>

<h2>ما الذي يحفّز التفريخ فعلاً</h2>
<p>التفريخ ليس زراً يُضغط. هو استجابة لإشارات بيئية تقول للسمكة إن الظروف مناسبة لتربية جيل:</p>
<ol>
  <li><strong>التهيئة الغذائية.</strong> علف متنوع وعالي الجودة لفترة قبل المحاولة — <a href="/blog/aquarium-fish-feeding-guide">دليل التغذية</a>.</li>
  <li><strong>تبديل ماء أكبر من المعتاد.</strong> عند أنواع كثيرة يُقرأ كإشارة موسم — <a href="/blog/aquarium-water-change-guide">تغيير الماء</a>.</li>
  <li><strong>استقرار الماء والحرارة</strong> قبل كل شي. الحوض المتذبذب لا يفرّخ، ولو فرّخ فالبيض يفطر.</li>
  <li><strong>وجود زوج فعلاً.</strong> وهذا يفترض تمييز الجنس — <a href="/blog/how-to-sex-aquarium-fish">تمييز الذكر من الأنثى</a>.</li>
</ol>
<blockquote>ملاحظة تُهمَل: أسماك كثيرة تفرّخ لوحدها لمّا تكون ظروفها ممتازة أصلاً. فإذا كان حوضك مستقراً وتغذيته منتظمة ولم يفرّخ شي، فغالباً السبب غياب زوج متوافق لا نقص "تحفيز".</blockquote>

<h2>الجانب اللي ما يُقال</h2>
<p>التفريخ يغيّر سلوك الحوض. الزوج الحارس يطارد أي شي يقترب، والحوض المجتمعي الهادئ يصير متوتراً لأسابيع — <a href="/blog/aquarium-fish-aggression">العدوانية والمطاردة في الحوض</a> و<a href="/blog/tank-mates-compatibility">دليل التوافق</a>.</p>
<p>وبعد الفقس تبدأ مرحلة مختلفة تماماً لها متطلباتها الخاصة: <a href="/blog/raising-fish-fry">تربية الصغار</a>. وقبل إدخال أي سمكة جديدة بنية التفريخ، مرّها بـ<a href="/blog/quarantine-new-fish-guide">الحجر الصحي</a>.</p>', 'للمبتدئين', 'Heart',
        'AQUAVO Editorial Team', TRUE, now());

INSERT INTO blog_posts (title, slug, excerpt, content, category, icon_name, author, is_published, published_at)
VALUES ('تربية الصغار: من الفقس إلى حجم البيع', 'raising-fish-fry', 'أغلب الصغار ما تموت جوعاً — تموت لأن الطعام أكبر من فمها. والتقزّم ضرر دائم لا يُعوَّض حتى بظروف ممتازة لاحقاً.', '<h2>المشكلة الأولى ليست الطعام — هي حجم الفم</h2>
<p>أغلب الصغار ما تموت جوعاً لأن صاحبها ما أطعمها. تموت لأن الطعام المقدَّم <strong>أكبر من فمها</strong>. سمكة بحجم رأس دبوس ما تقدر تأكل حبيبة علف مهما كانت جيدة، فتبقى بين طعام وفير وتضعف يوماً بعد يوم.</p>
<table>
  <tr><th>المرحلة</th><th>ما يناسبها</th><th>ملاحظة</th></tr>
  <tr><td>أول أيام بعد الفقس</td><td>كيس المح ما زال موجوداً</td><td>لا تطعم — الصغار ما تأكل بعد</td></tr>
  <tr><td>أصغر الصغار</td><td>أغذية دقيقة جداً وسائلة</td><td>الأصعب، وهنا تحصل أغلب الخسارة</td></tr>
  <tr><td>بعد أيام</td><td>ارتيميا حديثة الفقس</td><td>الأوسع استخداماً وأوضحها أثراً بالنمو</td></tr>
  <tr><td>بعد أسابيع</td><td>علف مطحون ناعم</td><td>الانتقال التدريجي لعلف البالغين</td></tr>
</table>
<blockquote>الصغار الولودة تولد أكبر نسبياً وتقدر تأكل علفاً مطحوناً من اليوم الأول تقريباً، ولهذا هي الأسهل — <a href="/blog/molly-platy-breeding-save-fry">الأسماك الولودة</a>. أما صغار البايضة فأصغر بكثير وتحتاج المرحلة الدقيقة أعلاه.</blockquote>

<h2>ماء حوض الصغار ينهار أسرع مما تتوقع</h2>
<p>هذي النقطة تقتل أكثر مما يقتل الجوع. حوض الصغار بالعادة صغير الحجم، والتغذية فيه متكررة، والصغار حساسة. النتيجة: تراكم أمونيا سريع بماء يبدو نظيفاً.</p>
<ul>
  <li><strong>وجبات صغيرة متكررة، لا وجبة كبيرة.</strong> الفائض يتعفن بساعات بحجم ماء صغير.</li>
  <li><strong>سيفون يومي للقاع.</strong> بقايا العلف والفضلات تتجمع بسرعة — <a href="/blog/ammonia-spike-emergency-treatment">ارتفاع الأمونيا</a>.</li>
  <li><strong>تبديل ماء صغير ومتكرر</strong> بماء مطابق بالحرارة والخصائص، لأن الصغار أقل تحملاً للتغيّر المفاجئ — <a href="/blog/aquarium-water-change-guide">تغيير الماء</a> و<a href="/blog/how-to-treat-tap-water-for-fish-iraq">معالجة ماء الحنفية</a>.</li>
  <li><strong>الحوض لازم يكون مدوّراً</strong> قبل دخول الصغار. حوض جديد بلا بكتيريا أسوأ مكان لأضعف كائن بالبيت — <a href="/blog/nitrogen-cycle-simple-arabic-explained">الدورة البيولوجية</a>.</li>
</ul>

<h2>الفلتر: أهم تفصيلة تقنية</h2>
<p>الفلتر العادي ذو السحب القوي يبتلع الصغار حرفياً. الحل المتعارف عليه هو فلتر إسفنجي يعمل بالهواء: سحبه لطيف، وسطحه الإسفنجي يتجمع عليه غذاء دقيق تلتقطه الصغار بنفسها.</p>
<p>وإذا اضطررت لاستخدام فلتر موجود، غطِّ فتحة السحب بإسفنجة. التفاصيل بـ<a href="/blog/filter-types-guide">أي فلتر يناسب حوضك</a> و<a href="/blog/filter-media-ceramic-rings-bioballs">ميديا الفلتر</a>، والتهوية بـ<a href="/blog/air-pumps-decoration-or-necessity">مضخة الهواء</a>.</p>

<h2>التقزّم: الضرر الذي لا يُعوَّض</h2>
<p>هذي أهم نقطة بالمقال. الصغار المزدحمة أو المتروكة بماء رديء <strong>تتوقف عن النمو بشكل دائم</strong>، ولا تعوّضه لاحقاً حتى لو نقلتها لظروف ممتازة. تصير سمكة بالغة بحجم أصغر من الطبيعي وبصحة أضعف.</p>
<ul>
  <li><strong>وسّع المساحة مع النمو</strong> لا بعد ظهور المشكلة — <a href="/blog/how-many-fish-in-aquarium">كم سمكة يتحمل حوضك</a> و<a href="/blog/calculate-aquarium-capacity-liters">حساب السعة</a>.</li>
  <li><strong>افرز بالحجم.</strong> الفارق بالحجم داخل نفس الدفعة يكبر بسرعة، والأكبر يأكل حصة الأصغر وقد يفترسه.</li>
  <li><strong>راقب الحرارة صيفاً</strong> — الحوض الصغير يسخن أسرع من الكبير — <a href="/blog/protect-fish-iraqi-summer-50-degrees">حرارة الصيف</a>.</li>
</ul>

<h2>السؤال الصادق بالنهاية</h2>
<p>ليس كل الصغار تُربّى. الدفعة الواحدة قد تعطي عشرات، وحوضك ما يتحملها كلها بحجمها البالغ. الخيارات الواقعية: توسيع المساحة، أو إيجاد هواة يستلمونها، أو تقليل التفريخ من الأساس بفصل الجنسين.</p>
<p>وتجاهل السؤال ليس خياراً محايداً — ينتهي بحوض مكتظ وماء متدهور وأسماك متقزمة، وهو أسوأ من كل البدائل. الخلفية الكاملة بـ<a href="/blog/fish-breeding-basics">التفريخ كقرار</a>، وقبل نقل أي مجموعة لبيت آخر راجع <a href="/blog/transporting-fish-and-aquarium">نقل الأسماك</a>.</p>', 'للمبتدئين', 'Droplets',
        'AQUAVO Editorial Team', TRUE, now());

UPDATE blog_posts SET title = 'التيترا والرازبورا والدانيو: أي سمكة سربية تختار؟', excerpt = 'ثلاث عوائل تُباع كأنها شي واحد. الفرق بين النيون والكاردينال بفحص بصري واحد، وليش ليست كل تيترا مسالمة — وأي سرب تختار إذا أردت حجماً أكبر.', content = '<h2>ثلاث عوائل تُباع كأنها شي واحد</h2>
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

<h2>وإذا أردت سرباً أكبر حجماً: الرينبو</h2>
<p>الثلاث عوائل أعلاه كلها صغيرة. لكن الحوض الأكبر يبان فارغاً معها، وهنا تجي أسماك قوس قزح (الرينبو) — سربية أيضاً، لكن بحجم أكبر وحضور بصري مختلف.</p>
<ul>
  <li><strong>لا تحكم عليها من حوض المتجر.</strong> هذي أهم نقطة عملية: صغار الرينبو تبدو باهتة ورمادية، ولونها الحقيقي ما يظهر إلا مع النضج وبحوض مستقر. كثيرون يتجاوزونها بالمتجر لهذا السبب وحده.</li>
  <li><strong>تحتاج طول سباحة.</strong> سمكة نشيطة تقطع الحوض باستمرار، فالطول أهم من الارتفاع.</li>
  <li><strong>سربية فعلاً.</strong> فردان أو ثلاثة يعطون سمكة متوترة باهتة — نفس منطق <a href="/blog/schooling-fish-minimum-numbers">الأسماك السربية</a>.</li>
  <li><strong>ذكورها تتنافس استعراضياً</strong> بلا أذى بالعادة، ووجود إناث كافيات يوزّع هذا النشاط.</li>
</ul>
<p>وحجمها الأكبر يعني حملاً حيوياً أكبر لكل فرد، فاحسبها على هذا الأساس بـ<a href="/blog/how-many-fish-in-aquarium">كم سمكة يتحمل حوضك</a> لا على أساس أنها "سمكة سرب صغيرة".</p>

<h2>ترتيب الشراء الصحيح</h2>
<ol>
  <li><strong>دوّر الحوض أولاً.</strong> السرب الصغير أول ضحية لحوض غير ناضج — <a href="/blog/nitrogen-cycle-simple-arabic-explained">الدورة البيولوجية</a>.</li>
  <li><strong>احسب الحمل قبل العدد.</strong> سرب ثمانية له كلفة حيوية — <a href="/blog/how-many-fish-in-aquarium">كم سمكة يتحمل حوضك</a>.</li>
  <li><strong>اشترِ السرب دفعة واحدة</strong> ما أمكن، حتى تتوحد المجموعة بدل ما تتشكل تراتبية على دفعات.</li>
  <li><strong>أقلم بهدوء</strong> — <a href="/blog/acclimating-new-fish">أقلمة السمكة الجديدة</a> — ولا تتجاوز <a href="/blog/quarantine-new-fish-guide">الحجر الصحي</a>، لأن الأسماك السربية الصغيرة تصل بالعادة مجهدة من النقل.</li>
</ol>
<p>وللمبتدئ اللي يريد بداية أقل مخاطرة، الدانيو من أصلب الخيارات ضمن <a href="/blog/5-hardy-fish-for-beginners">الأسماك اللي ما تموت بسرعة</a>. وإذا كان الهدف حوضاً قاعياً هادئاً بجانب السرب، فـ<a href="/blog/corydoras-types-best-cleaner-fish">الكوريدوراس</a> هي المرافق التقليدي.</p>'
 WHERE slug = 'small-schooling-fish-selection';

UPDATE blog_posts SET slug = 'aquarium-substrate-and-decor-guide' WHERE slug = 'دليل-شامل-لتربة-وديكور-الأحواض-اختيار-الأسطح-المثا-1787451489298';

UPDATE blog_posts SET content = '<h2>ليس كل حجر أو خشب صالحاً للحوض</h2>
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
<p>إذا كنت غير متأكد من قطعة: <strong>اختبرها بالخل، وانقعها بدلو منفصل أسبوعاً مع مراقبة الـ pH والقساوة</strong>، قبل إدخالها لحوض فيه أسماك. الدلو أرخص من حوض كامل. وراقب الفحص بعد الإدخال أيضاً — <a href="/blog/aquarium-test-kit-guide">قراءة اختبارات الماء</a>.</p>
<p>وبعد ما تتأكد إن المادة آمنة، يبقى سؤال الشكل والتوزيع: أي سطح وأي تربة تناسب حوضك ونباتاته — <a href="/blog/aquarium-substrate-and-decor-guide">دليل التربة والديكور واختيار الأسطح</a>.</p>' WHERE slug = 'aquarium-safe-rocks-and-wood';

-- Post-flight.
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM blog_posts WHERE is_published;
  IF n <> 106 THEN RAISE EXCEPTION 'expected 106 published, found %', n; END IF;

  -- Structure, for everything this migration writes prose into.
  SELECT count(*) INTO n FROM blog_posts
   WHERE slug IN ('dwarf-cichlids-guide', 'fish-breeding-basics', 'raising-fish-fry', 'small-schooling-fish-selection')
     AND is_published AND length(content) > 2500
     AND content LIKE '%<table%' AND content LIKE '%href="/blog/%';
  IF n <> 4 THEN RAISE EXCEPTION 'only % of 4 articles carry their structure', n; END IF;

  -- Byline only for the rows this migration creates. The rewrite and the link
  -- source keep whatever byline they already carry.
  SELECT count(*) INTO n FROM blog_posts
   WHERE slug IN ('dwarf-cichlids-guide', 'fish-breeding-basics', 'raising-fish-fry') AND author = 'AQUAVO Editorial Team';
  IF n <> 3 THEN RAISE EXCEPTION 'only % of 3 new articles carry the editorial byline', n; END IF;

  -- The rename happened, and nothing answers to the old slug any more.
  SELECT count(*) INTO n FROM blog_posts WHERE slug = 'aquarium-substrate-and-decor-guide' AND is_published;
  IF n <> 1 THEN RAISE EXCEPTION 'the renamed article is missing'; END IF;
  SELECT count(*) INTO n FROM blog_posts WHERE slug = 'دليل-شامل-لتربة-وديكور-الأحواض-اختيار-الأسطح-المثا-1787451489298';
  IF n <> 0 THEN RAISE EXCEPTION 'the old Arabic slug still exists'; END IF;

  -- The renamed article now has an inbound link, so the corpus has no orphan
  -- left that this cycle set out to fix.
  SELECT count(*) INTO n FROM blog_posts b
   WHERE b.is_published AND b.content LIKE '%href="/blog/aquarium-substrate-and-decor-guide"%';
  IF n < 1 THEN RAISE EXCEPTION 'the renamed article has no inbound link'; END IF;

  -- No published article may link to an unpublished one, corpus-wide.
  SELECT count(*) INTO n
    FROM blog_posts b
    CROSS JOIN LATERAL regexp_matches(b.content, 'href="/blog/([^"#?]+)"', 'g') AS m(parts)
   WHERE b.is_published
     AND NOT EXISTS (SELECT 1 FROM blog_posts t WHERE t.slug = m.parts[1] AND t.is_published);
  IF n <> 0 THEN RAISE EXCEPTION '% internal links point at unpublished articles', n; END IF;

  -- No article may link to itself.
  SELECT count(*) INTO n
    FROM blog_posts b
    CROSS JOIN LATERAL regexp_matches(b.content, 'href="/blog/([^"#?]+)"', 'g') AS m(parts)
   WHERE b.is_published AND m.parts[1] = b.slug;
  IF n <> 0 THEN RAISE EXCEPTION '% self links', n; END IF;

  SELECT count(*) INTO n FROM blog_posts
   WHERE slug IN ('dwarf-cichlids-guide', 'fish-breeding-basics', 'raising-fish-fry', 'small-schooling-fish-selection', 'aquarium-substrate-and-decor-guide', 'aquarium-safe-rocks-and-wood')
     AND content ~ '[一-鿿぀-ヿ가-힯Ѐ-ӿऀ-ॿ฀-๿֐-׿Ā-ɏḀ-ỿ]';
  IF n <> 0 THEN RAISE EXCEPTION 'a Wave 10 article carries stray script'; END IF;
END $$;

COMMIT;

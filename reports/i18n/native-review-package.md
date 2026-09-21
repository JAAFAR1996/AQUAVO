# Kurdish (Sorani) native-review package — 2026-09-20

Everything in this file is a **language decision**, not a bug. The deterministic work is done: validator 0 errors, structure and links verified against the Arabic source, RTL numeric ranges fixed in the rendering layer, search reachable from an Arabic keyboard.

Nothing here was decided by a model. Where a recommendation appears it is derived from what the corpus already does, and a native reader may overrule any of it with one word.

**How to use this file:** work top to bottom. Section 1 is 4 UI sections to read end to end — everything else is a single word-choice each. Write your decision in the last column.

| section | decisions | what it costs you |
|---|---|---|
| 1. Rewritten UI sections | 4 | read 4 short pages |
| 2. Arabic words left in Kurdish | 3 | 3 word choices |
| 3. Competing renderings | 33 | 1 word choice each |
| 4. Glossary terms to confirm | 20 | yes/no each |
| 5. Split subcategories | 10 | pick one label each |

## 1. UI sections rewritten by a model (read in full)

These four were rewritten in pass 3 because the machine translation was wrong, not merely awkward. The rewrite is **model-assisted and unreviewed** — it is the single highest-risk thing in the Kurdish locale, because a customer reads these as the shop's own words.

| section | what it is | where to read it |
|---|---|---|
| `pages:terms` | terms and conditions | `client/src/locales/ckb/pages.json` → `terms` (Arabic source in `client/src/locales/ar/pages.json`) |
| `pages:shipping` | shipping and delivery policy | `client/src/locales/ckb/pages.json` → `shipping` (Arabic source in `client/src/locales/ar/pages.json`) |
| `account:profile-loyalty` | loyalty tiers and points | `client/src/locales/ckb/account.json` → `profile-loyalty` (Arabic source in `client/src/locales/ar/account.json`) |
| `orders:invoice-view` | the invoice a customer prints | `client/src/locales/ckb/orders.json` → `invoice-view` (Arabic source in `client/src/locales/ar/orders.json`) |

## 2. Arabic words still inside the Kurdish text

| word | means | status | where | note |
|---|---|---|---|---|
| تدریج / تدریجی | gradually | untranslated Arabic | guides:guides-new-aquarium-setup.s91 and .s105; posts nitrogen-cycle-simple-arabic-explained (2), cloudy-water-fix, aquarium-safe-rocks-and-wood | the corpus renders this concept 8 different ways elsewhere — see the vocabulary table below, one decision fixes all of them |
| حراشف | scales (of a fish) | untranslated Arabic | 1 block, post/fish-eye-problems | the only rendering of the concept anywhere in the Kurdish corpus, so there is no internal precedent to copy |
| قاعیدی | alkaline / basic (chemistry) | possible legitimate loan | posts ammonia-spike-emergency-treatment, aquarium-safe-rocks-and-wood | Kurdish chemistry writing uses both the Arabic loan and native forms; a native reader has to say which AQUAVO should use |
| حاسبات | calculators | FIXED — no decision needed | was 1 link label in post/how-to-treat-tap-water-for-fish-iraq | replaced with ژمێرەرەکان, the term the Kurdish UI already uses for that same page (tools:calculators.s1) |
| الإسالة | tap (water) | FALSE POSITIVE — no decision needed | guides:guides-water-test-guide.s16 | the word is in the ARABIC source string; the Kurdish correctly says ئاوی لولە |
| الولودة | livebearers | NOT PRESENT — no decision needed | — | not found anywhere in the current Kurdish corpus |

## 3. Competing renderings — one decision each

Concepts where the Arabic source uses a glossary term but the Kurdish does not use the glossary's Sorani form. "Uses" counts strings that do use it; "misses" counts strings that reach for something else. Only concepts with 3+ misses are listed — the rest are noise.

### `week` — أسبوع

- glossary's Sorani: **هەفتە**
- frequency: used 66×, something else used 27×
- recommendation: confirm **هەفتە** is idiomatic, then align 27
- **decision:** ␣

  - `pages:blog.s13`
    - ar : انضم لأكثر من 5000 هاوي واحصل على نصائح أسبوعية مجانية.
    - ckb: پەیوەندی بکە بە زیاتر لە 5000 خولیاکەر و هەفتانە ئامۆژگاری بێبەرامبەر بەدەست بهێنە.
  - `tools:journey-summary.s46`
    - ar : الصيانة الأسبوعية
    - ckb: چاکسازی هەفتانە

### `freshwater` — مياه عذبة

- glossary's Sorani: **ئاوی شیرین**
- frequency: used 5×, something else used 25×
- recommendation: **decide**: the corpus prefers another form 25/30 of the time
- **decision:** ␣

  - `pages:blog.s6`
    - ar : أحواض المياه العذبة
    - ckb: حەوزەکانی ئاوی سازگار
  - `tools:journey-summary.s13`
    - ar : مجتمع مياه عذبة
    - ckb: کۆمەڵگەی ئاوی سازگار

### `temperature` — درجة الحرارة

- glossary's Sorani: **پلەی گەرمی** (also accepted: گەرما)
- frequency: used 129×, something else used 22×
- recommendation: keep **پلەی گەرمی**, align the 22 stragglers
- **decision:** ␣

  - `home:categories.heatersDesc`
    - ar : خيارات تثبيت الحرارة بمقاسات واستخدامات مختلفة.
    - ckb: هەڵبژاردەکانی جێگیرکردنی گەرمی بە قەبارە و بەکارهێنانی جیاواز.
  - `home:guides.heater.eyebrow`
    - ar : ثبات الحرارة
    - ckb: جێگیری گەرمی

### `large` — كبير

- glossary's Sorani: **گەورە** (also accepted: گەورەتر)
- frequency: used 102×, something else used 20×
- recommendation: keep **گەورە**, align the 20 stragglers
- **decision:** ␣

  - `tools:fish-health-diagnosis.s72`
    - ar : 🧪 فحوصات الماء (يرفع الدقة بنسبة كبيرة)
    - ckb: 🧪 پشکنینەکانی ئاو (وردبینی بە ڕێژەیەکی زۆر بەرز دەکاتەوە)
  - `tools:maintenance-schedule.s46`
    - ar : حدد يوماً ثابتاً في الأسبوع لتغيير الماء - اجعله روتيناً! الانتظام أهم من الكمال. تغيير ماء صغير منتظم أفضل بكثير من تغيير ماء كبير نادر. استخدم منبها…
    - ckb: ڕۆژێکی دیاریکراو لە هەفتەدا بۆ گۆڕینی ئاو دابنێ – بیکە بە ڕۆتین! ڕێکخستن گرنگترە لە تەواوکردن. گۆڕینی ئاوی کەم بە شێوەیەکی ڕێکخراو زۆر باشترە لە گۆڕین…

### `installation` — تركيب

- glossary's Sorani: **دامەزراندن**
- frequency: used 15×, something else used 19×
- recommendation: **decide**: the corpus prefers another form 19/34 of the time
- **decision:** ␣

  - `guides:guides-water-myths.s84`
    - ar : تركيبات "كل شيء" — نادراً ما تفيد
    - ckb: تێکەڵەکانی "هەموو شتێک" — بە دەگمەن سوودیان هەیە
  - `product/houyi-volcanic-stone-red#description`
    - ar : حجر لافا بركاني أحمر ذو بنية مسامية، يستخدم كديكور أو كوسط مسامي داخل بعض أنظمة الترشيح. يُغسل جيداً قبل الاستخدام لإزالة الغبار. وبما أن الأحجار الطب…
    - ckb: بەردی لافای گڕکانی سوورە کە پێکهاتەیەکی کونیلەداری هەیە، وەک دیکۆر یان وەک ماددەیەکی کونیلەدار لەناو هەندێک سیستەمی فلتەرکردندا بەکاردێت. پێش بەکارهێن…

### `natural` — طبيعي

- glossary's Sorani: **سروشتی** (also accepted: ئاسایی)
- frequency: used 117×, something else used 18×
- recommendation: keep **سروشتی**, align the 18 stragglers
- **decision:** ␣

  - `tools:journey-summary.s31`
    - ar : طحالب طبيعية
    - ckb: کەوزی سەربەخۆ
  - `tools:decoration-setup.s16`
    - ar : خشب طبيعي
    - ckb: داری ئاوی

### `warranty` — ضمان

- glossary's Sorani: **گەرەنتی** (also accepted: زەمانەت)
- frequency: used 31×, something else used 17×
- recommendation: confirm **گەرەنتی** is idiomatic, then align 17
- **decision:** ␣

  - `guides:guides-treatment-basics.s22`
    - ar : بعد انتهاء مدة العلاج — تغيير ٣٠٪ من المي يزيل بقايا الدواء. أعد الكربون النشط لأسبوع إضافي لضمان إزالة آثار الدواء.
    - ckb: دوای تەواوبوونی ماوەی چارەسەر — گۆڕینی 30% ی ئاو پاشماوەی دەرمانەکە لادەبات. کاربۆنی چالاک بۆ هەفتەیەکی زیادە بگەڕێنەرەوە بۆ دڵنیابوون لە لابردنی شوێن…
  - `post/كيف-تتعامل-مع-حرارة-الصيف-في-أحواض-السمك؟-نصائح-مو-1789265156493#content`
    - ar : تُعد حرارة الصيف أحد أهم التحديات التي يواجهها مالكو أحواض السمك، خاصةً في المناطق ذات درجات حرارة مرتفعة. إن ارتفاع درجة حرارة الماء يؤثر سلباً على ا…
    - ckb: گەرمای هاوین یەکێکە لە گرنگترین ئەو ئاستەنگانەی کە خاوەن حەوزەکانی ماسی ڕووبەڕووی دەبنەوە، بەتایبەت لەو ناوچانەی کە پلەی گەرمیان بەرزە. بەرزبوونەوەی پ…

### `water-test` — فحص الماء

- glossary's Sorani: **پشکنینی ئاو** (also accepted: کیتی پشکنین, تاقیکردنەوەی ئاو)
- frequency: used 19×, something else used 14×
- recommendation: confirm **پشکنینی ئاو** is idiomatic, then align 14
- **decision:** ␣

  - `tools:fish-health-diagnosis.s72`
    - ar : 🧪 فحوصات الماء (يرفع الدقة بنسبة كبيرة)
    - ckb: 🧪 پشکنینەکانی ئاو (وردبینی بە ڕێژەیەکی زۆر بەرز دەکاتەوە)
  - `guides:guides-new-aquarium-setup.s12`
    - ar : ١) نظف الحوض بماء فقط. ٢) ضع الحصى المغسول. ٣) ركب الفلتر والسخان. ٤) أملأ بالماء وأضف مزيل كلور. ٥) شغل الفلتر. ٦) انتظر 3-7 أيام للدورة البايولوجية.…
    - ckb: 1) حەوزەکە تەنها بە ئاو پاکبکەرەوە. 2) بەردەلانکە شۆراوەکە دابنێ. 3) فلتەر و گەرمکەرەوەکە دابمەزرێنە. 4) بە ئاو پڕی بکەرەوە و لابەری کلۆر زیاد بکە. 5)…

### `discount` — الخصم

- glossary's Sorani: **داشکاندن**
- frequency: used 25×, something else used 14×
- recommendation: confirm **داشکاندن** is idiomatic, then align 14
- **decision:** ␣

  - `account:register.s15`
    - ar : خصم 3%
    - ckb: کەمکردنەوەی 3%
  - `account:register.s18`
    - ar : خصم 5%
    - ckb: کەمکردنەوەی 5%

### `delivery` — التوصيل

- glossary's Sorani: **گەیاندن** (also accepted: پێگەیاندن)
- frequency: used 129×, something else used 13×
- recommendation: keep **گەیاندن**, align the 13 stragglers
- **decision:** ␣

  - `account:profile-orders.s5`
    - ar : تم التوصيل
    - ckb: گەیشت
  - `orders:order-confirmation.s4`
    - ar : تم الشحن
    - ckb: نێردرا

### `small` — صغير

- glossary's Sorani: **بچووک**
- frequency: used 123×, something else used 13×
- recommendation: keep **بچووک**, align the 13 stragglers
- **decision:** ␣

  - `tools:fish-breeding-calculator.s8`
    - ar : متوقع {{v0}}-{{v1}} صغير
    - ckb: پێشبینیکراو {{v0}}-{{v1}} بێچوو
  - `tools:maintenance-schedule.s46`
    - ar : حدد يوماً ثابتاً في الأسبوع لتغيير الماء - اجعله روتيناً! الانتظام أهم من الكمال. تغيير ماء صغير منتظم أفضل بكثير من تغيير ماء كبير نادر. استخدم منبها…
    - ckb: ڕۆژێکی دیاریکراو لە هەفتەدا بۆ گۆڕینی ئاو دابنێ – بیکە بە ڕۆتین! ڕێکخستن گرنگترە لە تەواوکردن. گۆڕینی ئاوی کەم بە شێوەیەکی ڕێکخراو زۆر باشترە لە گۆڕین…

### `decor` — ديكور

- glossary's Sorani: **دیکۆر** (also accepted: ڕازاندنەوە)
- frequency: used 174×, something else used 12×
- recommendation: keep **دیکۆر**, align the 12 stragglers
- **decision:** ␣

  - `nav:footer.aboutText`
    - ar : براند عراقي لمعدات ومستلزمات أحواض الزينة. نرتّب الاختيار بشكل عملي، ونخلي تفاصيل المنتج والتوصيل واضحة قبل ما تقرر.
    - ckb: براندێکی عێراقییە بۆ کەرەستە و پێداویستییەکانی حەوزی ماسی. هەڵبژاردن بە شێوەیەکی کرداری ڕێک دەخەین و وردەکاری بەرهەم و گەیاندن ڕوون دەکەینەوە پێش ئەوە…
  - `home:hero.eyebrow`
    - ar : براند عراقي متخصص بمعدات ومستلزمات أحواض الزينة
    - ckb: براندێکی عێراقی پسپۆڕ لە کەرەستە و پێداویستییەکانی حەوزی ماسی

### `breeding` — تفريخ

- glossary's Sorani: **زاوزێ** (also accepted: زاوزێکردن)
- frequency: used 45×, something else used 11×
- recommendation: keep **زاوزێ**, align the 11 stragglers
- **decision:** ␣

  - `tools:fish-detail-modal.s43`
    - ar : التكاثر
    - ckb: پەروەردە
  - `tools:fish-detail-modal.s51`
    - ar : محفزات التكاثر:
    - ckb: هێزەکانی پەروەردە:

### `cm` — سم

- glossary's Sorani: **سم**
- frequency: used 37×, something else used 11×
- recommendation: confirm **سم** is idiomatic, then align 11
- **decision:** ␣

  - `pages:multi-dimension-variant-selector.s1`
    - ar : 40 × 23 × 25 سم
    - ckb: 40 × 23 × 25 cm
  - `pages:multi-dimension-variant-selector.s2`
    - ar : 50 × 27 × 30 سم
    - ckb: 50 × 27 × 30 cm

### `login` — تسجيل الدخول

- glossary's Sorani: **چوونەژوورەوە** (also accepted: بچیتە ژوورەوە, بچیتە)
- frequency: used 16×, something else used 10×
- recommendation: confirm **چوونەژوورەوە** is idiomatic, then align 10
- **decision:** ␣

  - `common:cart-context.s6`
    - ar : يرجى تسجيل الدخول مرة أخرى لإضافة المنتجات.
    - ckb: تکایە جارێکی تر بچۆنە ژوورەوە بۆ زیادکردنی بەرهەمەکان.
  - `checkout:form.login`
    - ar : سجل دخولك
    - ckb: بچۆ ژوورەوە

### `point` — نقطة

- glossary's Sorani: **خاڵ**
- frequency: used 78×, something else used 9×
- recommendation: keep **خاڵ**, align the 9 stragglers
- **decision:** ␣

  - `checkout:form.addressPlaceholder`
    - ar : المنطقة، الشارع، أقرب نقطة دالة...
    - ckb: ناوچە، شەقام، نزیکترین نیشانە...
  - `account:register.s10`
    - ar : جمع نقاط الولاء
    - ckb: کۆکردنەوەی نقطەکانی وفاداری

### `fish` — سمك

- glossary's Sorani: **ماسی** (also accepted: ماسییەکان)
- frequency: used 435×, something else used 8×
- recommendation: keep **ماسی**, align the 8 stragglers
- **decision:** ␣

  - `pages:onboarding-tour.s16`
    - ar : اضغط هنا حتى ترفع صورة حوضك وتشارك قصتك ويا الأسماك والنباتات وتدخل ويانا بالمسابقة الشهرية وتنافس على الجوائز.
    - ckb: ئێرە کرتە بکە بۆ بارکردنی وێنەی حەوزەکەت و بەشداریکردنی چیرۆکی خۆت لەگەڵ ماس و ڕووەکان، بەشداربە لە هەژمارەی مانگانە و لە سەودای خەڵکەکان بەرز بکه‌.
  - `pages:onboarding-tour.s24`
    - ar : كل خطوة هنا تركز على جانب مهم: حجم الحوض، الأجهزة، الديكورات، معايير المياه، وحتى اختيار الأسماك المناسبة.
    - ckb: هەموو هەنگاوێک لێرە سەرنجی لە پەرتی گرنگیەکەی دەدات: قەبارەی حەوز، ئامرازەکان، دیکۆرەکان، مەعیارەکانی ئاو، هەتا هەڵبژاردنی ماسە گونجاوەکان.

### `stone` — حجر

- glossary's Sorani: **بەرد** (also accepted: بەردەکان)
- frequency: used 85×, something else used 8×
- recommendation: keep **بەرد**, align the 8 stragglers
- **decision:** ␣

  - `tools:fish-health-diagnosis.s100`
    - ar : بروتوكول الحجر الصحي:
    - ckb: پروتوکۆلی قەفەی سەروو:
  - `tools:water-parameters-calculator.s28`
    - ar : أضف أملاح معدنية أو صخور كلسية
    - ckb: ئامادەکەری ئاوی مێتالی یان سنگی کەلسی زیادبکە

### `cleaning` — تنظيف

- glossary's Sorani: **پاککردنەوە** (also accepted: خاوێنکردنەوە)
- frequency: used 59×, something else used 8×
- recommendation: keep **پاککردنەوە**, align the 8 stragglers
- **decision:** ␣

  - `tools:journey-summary.s35`
    - ar : تنظيف الحوض، إضافة الركيزة والديكور
    - ckb: سافکردنی حەوز، زیادکردنی خاک و دیکۆر
  - `tools:decoration-setup.s5`
    - ar : سهل التنظيف، متعدد الألوان
    - ckb: سەهۆڵی سڕینەوە، چەند ڕەنگی

### `water-conditioner` — معالج مياه

- glossary's Sorani: **ئامادەکەری ئاو**
- frequency: used 10×, something else used 6×
- recommendation: confirm **ئامادەکەری ئاو** is idiomatic, then align 6
- **decision:** ␣

  - `home:categories.water`
    - ar : معالجة المياه
    - ckb: چارەسەری ئاو
  - `pages:product-category-links.s4`
    - ar : معالجة المياه
    - ckb: ئامادەکردنی ئاو

### `loyalty` — الولاء

- glossary's Sorani: **وفاداری**
- frequency: used 9×, something else used 6×
- recommendation: confirm **وفاداری** is idiomatic, then align 6
- **decision:** ␣

  - `checkout:confirm.onlineWithPoints`
    - ar : لاستخدام الدفع الإلكتروني حالياً، ارجع وألغِ استخدام النقاط أو رصيد الباقي. لن نخصم أي رصيد ولاء قبل تأكيد الدفع.
    - ckb: بۆ بەکارهێنانی پارەدانی ئەلیکترۆنی ئێستا، بگەڕێوە و بەکارهێنانی خاڵ یان باڵانسی پاشماوە هەڵوەشێنەوە. هیچ باڵانسێکی دڵسۆزی کەم ناکەینەوە پێش دڵنیاکردنە…
  - `account:profile.s17`
    - ar : إدارة حسابك الشخصي وطلباتك وعناوينك ونقاط الولاء في AQUAVO
    - ckb: بەڕێوەبردنی هەژمارەکەت، داواکاریەکان، ناونیشانەکان و خاڵەکانی سووکاری لە AQUAVO

### `terms-and-conditions` — الشروط والأحكام

- glossary's Sorani: **مەرج و ڕێساکان**
- frequency: used 3×, something else used 6×
- recommendation: **decide**: the corpus prefers another form 6/9 of the time
- **decision:** ␣

  - `common:validations.s16`
    - ar : يجب الموافقة على الشروط والأحكام
    - ckb: پێویستە ڕەزامەندی بۆ مەرج و مەبەستەکان بدەیت
  - `account:register.s3`
    - ar : يرجى الموافقة على الشروط والأحكام
    - ckb: تکایە ڕازیکردن لە مەرج و مەبەستەکان

### `livebearers` — الأسماك الولودة

- glossary's Sorani: **زیندووزاکان**
- frequency: used 1×, something else used 6×
- recommendation: **decide**: the corpus prefers another form 6/7 of the time
- **decision:** ␣

  - `post/fish-breeding-basics#content`
    - ar : التفريخ قرار، مو مكافأة أغلب الكلام عن التفريخ يبدأ بـ"كيف أخليها تتكاثر؟" والسؤال الصحيح يسبق ذلك: هل تريد صغاراً فعلاً؟ لأن النتيجة ليست عشر سمكات ظ…
    - ckb: زاوزێ بڕیارە، نەک پاداشت زۆربەی قسەکان دەربارەی زاوزێ بەم پرسیارە دەستپێدەکەن: "چۆن وای لێبکەم زاوزێ بکات؟" و پرسیارە دروستەکە پێش ئەوە دێت: ئایا بەڕا…
  - `post/raising-fish-fry#content`
    - ar : المشكلة الأولى ليست الطعام — هي حجم الفم أغلب الصغار ما تموت جوعاً لأن صاحبها ما أطعمها. تموت لأن الطعام المقدَّم أكبر من فمها . سمكة بحجم رأس دبوس ما…
    - ckb: کێشەی یەکەم خۆراک نییە — قەبارەی دەمە زۆربەی بێچووەکان لە برسان نامرن چونکە خاوەنەکەیان خۆراکی پێنادات. دەمرن چونکە خۆراکە پێشکەشکراوەکە لە دەمیان گەو…

### `photo` — الصورة

- glossary's Sorani: **وێنە**
- frequency: used 104×, something else used 5×
- recommendation: keep **وێنە**, align the 5 stragglers
- **decision:** ␣

  - `tools:fish-health-diagnosis.s65`
    - ar : هل السمكة تأكل بصورة طبيعية؟
    - ckb: ئایا ماسییەکە بە شێوەیەکی ئاسایی دەخوات؟
  - `tools:fish-health-diagnosis.s67`
    - ar : تأكل بصورة ممتازة
    - ckb: بە شێوەیەکی نایاب دەخوات

### `payment` — الدفع

- glossary's Sorani: **پارەدان** (also accepted: پارەدانی)
- frequency: used 59×, something else used 5×
- recommendation: keep **پارەدان**, align the 5 stragglers
- **decision:** ␣

  - `guides:guides-water-test-guide.s100`
    - ar : AQUAVO يوفر شرائط الفحص ومزيل الكلور وكل مستلزمات الأحواض — توصيل لكل العراق، دفع عند الاستلام أو إلكترونياً.
    - ckb: AQUAVO پەرتی پشکنین و سڕاوەی کلۆر و هەموو ئامرازەکانی حەوز دابین دەکات — گەیاندن بۆ هەموو عێراق، پارە لە کاتی وەرگرتن یان ئێلیکترۆنی.
  - `product/houyi-volcanic-stone-red#description`
    - ar : حجر لافا بركاني أحمر ذو بنية مسامية، يستخدم كديكور أو كوسط مسامي داخل بعض أنظمة الترشيح. يُغسل جيداً قبل الاستخدام لإزالة الغبار. وبما أن الأحجار الطب…
    - ckb: بەردی لافای گڕکانی سوورە کە پێکهاتەیەکی کونیلەداری هەیە، وەک دیکۆر یان وەک ماددەیەکی کونیلەدار لەناو هەندێک سیستەمی فلتەرکردندا بەکاردێت. پێش بەکارهێن…

### `track-order` — تتبع طلبك

- glossary's Sorani: **بەدواداچوونی داواکاری** (also accepted: بەدواداچوونی داواکارییەکەت)
- frequency: used 5×, something else used 5×
- recommendation: **decide**: the corpus prefers another form 5/10 of the time
- **decision:** ␣

  - `common:error-boundary.s3`
    - ar : تتبع الطلب
    - ckb: پێگەی داواکردن
  - `nav:links.orderTracking`
    - ar : تتبع طلبك
    - ckb: شوێنکەوتنی داواکاری

### `account` — الحساب

- glossary's Sorani: **هەژمار**
- frequency: used 9×, something else used 4×
- recommendation: confirm **هەژمار** is idiomatic, then align 4
- **decision:** ␣

  - `checkout:loyalty.calculating`
    - ar : جاري الحساب...
    - ckb: ژمێردن...
  - `guides:guides-heater-choice.s7`
    - ar : قاعدة الواط لكل لتر هي الخطوة الأولى، لكن عوامل أخرى تحدد الاختيار الصح. هذا الدليل يعطيك الحساب الدقيق بدون تخمين.
    - ckb: یاسای وات بۆ هەر لیترێک هەنگاوی یەکەمە، بەڵام فاکتەرەکانی تر هەڵبژاردنی دروست دیاری دەکەن. ئەم ڕێنماییە ژماردنێکی وردت پێدەدات بەبێ خەمڵاندن.

### `water-change` — تغيير الماء

- glossary's Sorani: **گۆڕینی ئاو**
- frequency: used 49×, something else used 3×
- recommendation: keep **گۆڕینی ئاو**, align the 3 stragglers
- **decision:** ␣

  - `tools:water-parameters-calculator.s21`
    - ar : قم بتغيير المياه فوراً! أضف بكتيريا نافعة وقلل التغذية
    - ckb: ئاو لەکاتی ئێستادا گۆڕی! بەکتریای بەسوود زیادبکە و خواردنەوە کەمبکە
  - `guides:guides-water-test-guide.s16`
    - ar : الكلور يظهر عند تغيير الماء بدون استخدام مزيل كلور. ماء الإسالة في العراق يحتوي كلور وكلورامين — لازم تضيف مزيل الكلور في كل تغيير جزئي للماء.
    - ckb: کلۆر دەردەکەوێت کاتێک ئاو دەگۆڕیت بەبێ بەکارهێنانی لابەری کلۆر. ئاوی لولە لە عێراقدا کلۆر و کلۆرامینی تێدایە — پێویستە لە هەموو گۆڕینێکی بەشەکی ئاودا …

### `in-stock` — متوفر

- glossary's Sorani: **بەردەست** (also accepted: بەردەستە, ئامادە)
- frequency: used 80×, something else used 3×
- recommendation: keep **بەردەست**, align the 3 stragglers
- **decision:** ␣

  - `nav:footer.paymentMethods`
    - ar : طرق الدفع المتوفرة: عند الاستلام أو إلكترونياً
    - ckb: ڕێگاکانی پارەدان: لە کاتی وەرگرتن یان ئەلیکترۆنی
  - `pages:about.s6`
    - ar : نركز على منتجات أصلية حسب المتوفر من شركات موثوقة في معدات ومستلزمات أحواض الزينة.
    - ckb: ئێمە سەرنجی بەرهەمە سەرچاوەییەکان دەدین بە بنەما لە کۆمپانیاکانی باوەڕپێکراو لە ئامراز و پێویستی حەوزەکانی ماسی ڕازاندنەوە

### `out-of-stock` — غير متوفر

- glossary's Sorani: **بەردەست نییە** (also accepted: تەواو بووە, نەماوە)
- frequency: used 26×, something else used 3×
- recommendation: keep **بەردەست نییە**, align the 3 stragglers
- **decision:** ␣

  - `common:cart-context.s11`
    - ar : نفدت الكمية
    - ckb: ژمارە تەواوبوو
  - `pages:product-of-the-week.s2`
    - ar : عذراً، هذا المنتج غير متوفر حالياً في المخزن
    - ckb: ببورە، ئەم بەرهەمە ئێستا لە کۆگا نییە

### `warning` — تحذير

- glossary's Sorani: **ئاگاداری**
- frequency: used 12×, something else used 3×
- recommendation: keep **ئاگاداری**, align the 3 stragglers
- **decision:** ␣

  - `guides:guides-happy-fish-signs.s37`
    - ar : متى تقلق؟ — علامات التحذير
    - ckb: کەی نیگەران بیت؟ — نیشانەکانی ئاگادارکردنەوە
  - `post/fish-treatment-protocol#content`
    - ar : أغلب فشل العلاج ليس بالدواء الحوض اللي "جرّب كل الأدوية وما نفع" غالباً ما جرّب أياً منها بشكل صحيح. الدواء الصح بجرعة تقديرية، أو لمدة نصف الدورة، أو…
    - ckb: زۆربەی شکستی چارەسەر بەهۆی دەرمانەکە نییە ئەو حەوزەی کە "هەموو دەرمانەکانی تاقیکردووەتەوە و سوودی نەبووە" زۆربەی کات بە شێوەیەکی دروست تاقینەکراوەتەوە…

### `suitable` — مناسب

- glossary's Sorani: **گونجاو**
- frequency: used 185×, something else used 3×
- recommendation: keep **گونجاو**, align the 3 stragglers
- **decision:** ␣

  - `pages:onboarding-tour.s6`
    - ar : هنا راح تطلعلك النتيجة بالتفصيل الممل، مع خطة علاج يومية وتوصيات دقيقة للمي والجرعات المناسبة حتى ترجع سمكتك بكامل صحتها.
    - ckb: لێرە ئەنجام بە وردی و تەواوی دەردەکەوێت، لەگەڵ پلانی چارەسەری ڕۆژانە و پێشنیارەکانی ڕووناکی و دوزی هەموو شتێک بۆ گەڕاندنەوەی تەندروستی ماسیت.
  - `tools:ai-chat-bot.s16`
    - ar : شنو حرارة الماء المناسبة؟
    - ckb: پێویستەی گەرمی ئاو چەندە؟

### `guide` — دليل

- glossary's Sorani: **ڕێنمایی** (also accepted: ڕێبەری, ڕێنوێنی, ڕێنوێن)
- frequency: used 135×, something else used 3×
- recommendation: keep **ڕێنمایی**, align the 3 stragglers
- **decision:** ␣

  - `pages:why-aquavo.s16`
    - ar : الثقة مرتبطة بالدليل
    - ckb: متمانە پەیوەستە بە بەڵگە
  - `guides:guides-water-myths.s6`
    - ar : المي الصافية مو دليل على كلشي تمام — وهذا مجرد مثال
    - ckb: ئاوی ڕوون بەڵگەی ئەوە نییە کە هەموو شتێک باشە — و ئەمە تەنها نموونەیەکە

## 4. Glossary terms awaiting a native yes/no

These were added to the glossary during translation and carry `needsNativeReview: true`. They are already in use across the locale, so a "no" is a rename everywhere, not a one-off edit.

| term | Arabic | current Sorani | alternatives on the table | in use | decision |
|---|---|---|---|---|---|
| `loyalty-point` | نقاط الولاء | **خاڵی وفاداری** | خاڵەکانی وفاداری, خاڵ | 10× | ␣ |
| `point` | نقطة | **خاڵ** | — | 78× | ␣ |
| `loyalty` | الولاء | **وفاداری** | — | 9× | ␣ |
| `discount` | الخصم | **داشکاندن** | — | 25× | ␣ |
| `subtotal` | المجموع الفرعي | **کۆی لاوەکی** | — | 1× | ␣ |
| `grand-total` | الإجمالي | **کۆی گشتی** | — | 4× | ␣ |
| `delivery-fee` | أجرة التوصيل | **کرێی گەیاندن** | — | 5× | ␣ |
| `fee` | أجرة | **کرێ** | — | 9× | ␣ |
| `balance` | رصيد | **باڵانس** | — | 14× | ␣ |
| `track-order` | تتبع طلبك | **بەدواداچوونی داواکاری** | بەدواداچوونی داواکارییەکەت | 5× | ␣ |
| `invoice` | الفاتورة | **فاکتۆر** | — | 13× | ␣ |
| `terms-and-conditions` | الشروط والأحكام | **مەرج و ڕێساکان** | — | 3× | ␣ |
| `survey` | استبيان | **ڕاپرسی** | — | 2× | ␣ |
| `reward` | مكافأة | **خەڵات** | — | 5× | ␣ |
| `upgrade-tier` | ترقية | **بەرزبوونەوە** | — | 2× | ␣ |
| `freshwater` | مياه عذبة | **ئاوی شیرین** | — | 5× | ␣ |
| `saltwater` | مياه مالحة | **ئاوی سوێر** | — | 3× | ␣ |
| `force-majeure` | ظروف قاهرة | **بارودۆخی ناچاری** | — | 1× | ␣ |
| `competent-courts` | المحاكم المختصة | **دادگا تایبەتمەندەکان** | — | 1× | ␣ |
| `livebearers` | الأسماك الولودة | **زیندووزاکان** | — | 1× | ␣ |

## 5. Subcategories that split a filter

One Arabic subcategory translated two different ways splits the shop's facet filter in Kurdish: the same shelf appears twice. The English side was normalised deterministically; Kurdish cannot be, because choosing between two Sorani forms is exactly this review.

| Arabic subcategory | Sorani forms in use | products | decision |
|---|---|---|---|
| أخشاب طبيعية | **داری سروشتی** (1) vs **دارە ئاوییە سروشتییەکان** (2) vs **داری ئاوی سروشتی** (3) vs **داری ئاوی** (1) | 7 | ␣ |
| مشابك تثبيت | **گیرەکانی جێگیرکردن** (1) vs **قۆڵکەی جێگیرکردن** (1) | 2 | ␣ |
| شباك صيد | **تۆڕی ماسیگرتن** (2) vs **تۆڕەکانی ڕاوکردن** (1) | 3 | ␣ |
| التسميد | **پەیینکردن** (1) vs **پەیندان** (1) | 2 | ␣ |
| موزعات الهواء | **موزعەکانی هەوا** (1) vs **دابەشکارەکانی هەوا** (1) | 2 | ␣ |
| معالجات المياه | **ئامادەکەرەکانی ئاو** (3) vs **ئامادەکەری ئاو** (1) | 4 | ␣ |
| أدوات فحص المياه | **ئامرازی پشکنینی ئاو** (1) vs **ئامێرەکانی پشکنینی ئاو** (1) | 2 | ␣ |
| أعلاف متخصصة | **خۆراکی تایبەت** (1) vs **خۆراکی تایبەتمەند** (3) | 4 | ␣ |
| حاضنات | **حاضنەکان** (1) vs **سندوقەکانی جیاکردنەوە** (1) | 2 | ␣ |
| سخانات | **گەرمکەرەوە** (1) vs **گەرمکەرەوەکان** (1) | 2 | ␣ |

## 6. What this package does NOT cover

- **Prose quality across the articles.** 117 articles are verified structurally and factually against the Arabic source in both locales. Linguistic prose review has reached roughly 35 of them, all of it model-assisted. The other 82 are *not* reviewed for how they read, and no run should claim otherwise.
- **`activated-carbon-aquarium-when-to-use`.** The Arabic source contradicts itself about ammonia. The Kurdish and English follow the Arabic faithfully, which is correct: the Arabic needs an editorial decision first, and the translations follow it afterwards.
- **Anything a model could have guessed.** No term in this file was picked by a model. That is the point of the file.


/**
 * Final expansion phase — one migration for the whole batch.
 *
 *   node docs/knowledge-center/final/build-final.mjs
 *
 * 4 new canonicals, 1 rewrite, 15 deepenings. Roadmap in ROADMAP.md, research
 * in dossiers.md.
 */
import fs from "node:fs";
import path from "node:path";

const BASE = "https://www.aquavoiq.com";
const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const ID = "kc-final-expansion-20260903";
const BACKUP = "blog_posts_backup_final_20260903";

const NEW = [
  { slug:"choosing-healthy-fish-in-store", draft:"drafts/healthy-fish.html", category:"أدلة التسوق", icon:"Fish",
    title:"اختيار سمكة سليمة قبل الشراء: ما تنظر إليه بالمتجر",
    excerpt:"أرخص علاج هو سمكة ما اشتريتها. انظر للمنظومة كلها لا للسمكة وحدها، واطلب أن تشوفها تأكل — وهذا لا يغني عن الحجر الصحي." },
  { slug:"aquarium-hygiene-and-human-safety", draft:"drafts/hygiene-safety.html", category:"للمبتدئين", icon:"Shield",
    title:"نظافة الحوض وسلامتك أنت: احتياطات بسيطة",
    excerpt:"الهواية آمنة والمشاكل غير شائعة، لكن قاعدة واحدة تستحق المعرفة: الجلد المجروح لا يدخل الماء. ولو ظهر التهاب لا يتحسن، أخبر طبيبك أن عندك حوضاً." },
  { slug:"fish-that-outgrow-home-tanks", draft:"drafts/outgrow.html", category:"أدلة التسوق", icon:"AlertTriangle",
    title:"أسماك تنباع صغيرة ولا تصلح لحوض بيتي",
    excerpt:"السمكة لا تنمو بقدر حوضها — تتقزّم، والتقزّم ضرر دائم. الأنواع اللي يتكرر فيها هذا، والخيارات الواقعية إذا صارت المشكلة عندك فعلاً." },
  { slug:"fish-eye-problems", draft:"drafts/eye-problems.html", category:"مشاكل وحلول", icon:"Activity",
    title:"مشاكل عين السمكة: الجحوظ والغشاوة",
    excerpt:"عين واحدة أم اثنتان؟ هذا أول سؤال ويوجّه البحث كله: الواحدة تميل لسبب موضعي، والاثنتان للماء أو لحالة أعم. والجحوظ عرَض لا مرض." },
];

const REWRITE = [
  { slug:"ph-level-iraqi-tap-water-fish", draft:"drafts/water-decision.html",
    title:"قراءاتك عالية: تعدّل الماء أم تختار أسماكاً تناسبه؟",
    excerpt:"ثبات ماء لا يناسب مثالياً أفضل من ماء مثالي متذبذب. متى يكون الاختيار أذكى من التعديل، ومتى يصير خلط ماء منزوع المعادن منطقياً فعلاً." },
];

// One appended section each. Every one was verified against its owner before
// being written: the gap is real and the owner is the right home for it.
const A = (slug, text) => `<a href="/blog/${slug}">${text}</a>`;
const DEEPEN = [
  { slug:"aquarium-water-change-guide", html:
`<h2>نتراتك عالية رغم انتظام التبديل</h2>
<p>تبدّل الماء بانتظام ومع ذلك تبقى النترات مرتفعة. هذا لا يعني أن التبديل بلا فائدة — يعني أن مصدر الإنتاج أسرع مما يزيله التبديل، أو أن الماء الداخل نفسه ليس نظيفاً.</p>
<ul>
  <li><strong>افحص ماء الحنفية نفسه.</strong> إذا كان يحتوي نترات أصلاً فأنت تضيفها مع كل تبديل — قياس بسيط يحسم هذا.</li>
  <li><strong>الحمل الحيوي أعلى مما تظن</strong> — ${A("how-many-fish-in-aquarium","كم سمكة يتحمل حوضك")}.</li>
  <li><strong>إفراط بالعلف</strong>، وهو السبب الأكثر شيوعاً — ${A("aquarium-fish-feeding-guide","دليل التغذية")}.</li>
  <li><strong>فضلات متراكمة بمناطق راكدة</strong> لا يصلها السيفون — ${A("aquarium-water-flow","التيار وحركة الماء")}.</li>
  <li><strong>نبات سريع النمو يستهلك النترات</strong> فعلاً، وهو حل بنيوي لا مؤقت — ${A("best-low-tech-aquarium-plants-beginners","نباتات منخفضة الاحتياج")}.</li>
</ul>
<p>أما مزيلات النترات الكيميائية فتعالج الرقم لا السبب، وتخفي المشكلة بدل ما تحلها. عالج المصدر أولاً، وزد نسبة التبديل مؤقتاً — بتدرّج لا دفعة واحدة.</p>` },

  { slug:"why-fish-die-suddenly-rescue-guide", html:
`<h2>ماتت سمكة — شنو تسوي الآن بالضبط</h2>
<p>لحظة يمر بها كل هاوٍ، وفيها إجراءات تفرق:</p>
<ol>
  <li><strong>أخرجها فوراً.</strong> السمكة الميتة تتحلل بسرعة وترفع الأمونيا، والحوض الصغير يتأثر بساعات — ${A("ammonia-spike-emergency-treatment","ارتفاع الأمونيا")}.</li>
  <li><strong>افحصها بالنظر قبل التخلص منها.</strong> نقط، غشاوة، زعانف متآكلة، بطن غائر — معلومة تفيدك مع البقية.</li>
  <li><strong>افحص الماء فوراً.</strong> السبب الأشيع للموت المفاجئ ليس مرضاً بل الماء — ${A("aquarium-test-kit-guide","قراءة الفحص")}.</li>
  <li><strong>راقب البقية عن قرب</strong> بضعة أيام: تنفس، شهية، سلوك.</li>
  <li><strong>لا تعالج الحوض بالتخمين.</strong> إضافة دواء بعد موت واحدة بلا تشخيص تضر أكثر مما تنفع — ${A("fish-treatment-protocol","العلاج الصحيح")}.</li>
</ol>
<p>واغسل يديك بعد أي تعامل، وغطِّ أي جرح قبل إدخال يدك — ${A("aquarium-hygiene-and-human-safety","نظافة الحوض وسلامتك")}.</p>` },

  { slug:"fish-treatment-protocol", html:
`<h2>تبديل الماء أثناء دورة العلاج</h2>
<p>سؤال يتكرر: هل أبدّل الماء وأنا أعالج؟ الجواب يعتمد على النشرة، لكن القواعد العامة واضحة:</p>
<ul>
  <li><strong>النشرة تحكم.</strong> كثير من المنتجات تحدد تبديلاً بنسبة معينة قبل كل جرعة تالية؛ اتبع ما تقوله لا ما اعتدت عليه.</li>
  <li><strong>التبديل يزيل جزءاً من الدواء</strong> — ولهذا يُعاد الحساب بعده إن طلبت النشرة ذلك. لا تضف جرعة كاملة لماء لم يُبدَّل بالكامل.</li>
  <li><strong>ولا توقف التبديل خوفاً على الدواء.</strong> السمكة المريضة بماء متدهور لن تتحسن مهما كان العلاج صحيحاً.</li>
  <li><strong>بعد انتهاء الدورة</strong>: تبديل ماء، ثم فحم نشط لسحب البقايا إن كانت النشرة طلبت رفعه أثناء العلاج.</li>
</ul>
<p>وطريقة التبديل نفسها بـ${A("aquarium-water-change-guide","تغيير ماء الحوض")}.</p>` },

  { slug:"internal-fish-parasites", html:
`<h2>ثقب الرأس: شكل مختلف من المشكلة الداخلية</h2>
<p>حالة تظهر كحفر أو تآكل صغير برأس السمكة وحول العينين، وتُعرف بـ"ثقب الرأس". ترتبط غالباً بالسيكلد الكبير — ${A("oscar-fish-care-guide-water-dog","الأوسكار")} و${A("discus-fish-care-guide","الديسكس")} — وتترافق كثيراً مع هزال وتراجع شهية.</p>
<ul>
  <li><strong>ما يُتفق عليه:</strong> ترتبط بظروف مزمنة رديئة — ماء متدهور، نترات مرتفعة لفترات طويلة، تغذية فقيرة أو أحادية، وإجهاد مستمر.</li>
  <li><strong>وما هو محل خلاف:</strong> الدور الدقيق للطفيلي مقابل دور البيئة والتغذية غير محسوم بالمصادر، ونعرضه كما هو بدل ما نحسمه.</li>
  <li><strong>العملي:</strong> تحسين الماء والتنويع الغذائي أساس لا يُستغنى عنه مهما كان العلاج، والحالة المبكرة أقبل للتحسن.</li>
</ul>` },

  { slug:"aquarium-fish-feeding-guide", html:
`<h2>العلف الحي والمجمّد: فائدة ومحاذير</h2>
<p>التنويع مفيد فعلاً، لكن لكل شكل تعامله:</p>
<ul>
  <li><strong>العلف الحي</strong> يحفّز الشهية والسلوك الطبيعي، ويستخدمه كثيرون قبل التفريخ — ${A("fish-breeding-basics","التفريخ كقرار")}. لكنه أيضاً مسار معروف لإدخال ممرضات إذا كان مصدره مجهولاً؛ المصدر الموثوق هو الفارق.</li>
  <li><strong>المجمّد أأمن من هذي الناحية</strong> وأسهل تخزيناً. يُذاب بقليل من ماء الحوض بكوب صغير، ولا يُلقى قطعة مجمدة بالحوض.</li>
  <li><strong>لا تصبّ ماء الإذابة</strong> بالحوض — يحمل سوائل تلوّث الماء بلا فائدة غذائية.</li>
  <li><strong>ولا تُعاد القطعة المذابة للتجميد.</strong></li>
  <li><strong>ويبقى قاعدة</strong>: التنويع لا يعني زيادة الكمية. الإفراط بالعلف يبقى السبب الجذري لأغلب مشاكل الحوض.</li>
</ul>` },

  { slug:"algae-war-guide", html:
`<h2>الطحالب الخيطية والشعرية</h2>
<p>خيوط خضراء طويلة تتعلق بالنبات والديكور وتُسحب باليد كخصلة. تختلف عن ${A("black-beard-algae-removal-steps","اللحية السوداء")} بأنها أطول وأنعم ولونها أخضر.</p>
<ul>
  <li><strong>سببها المعتاد</strong> فائض مغذيات مع إضاءة أكثر مما يستهلكه النبات — نفس معادلة بقية الطحالب.</li>
  <li><strong>الإزالة اليدوية فعّالة معها</strong> تحديداً: لفّها على عود وسحبها. هذا يقلل الكتلة فوراً بينما تعالج السبب.</li>
  <li><strong>راجع ساعات الإضاءة قبل شدتها</strong> — ${A("aquarium-planted-led-lighting-guide","دليل الإضاءة")}.</li>
  <li><strong>وروبيان أمانو</strong> من أكثر ما يتعامل معها، ضمن حدود أن آكلات الطحالب مساعدة لا حل — ${A("aquarium-shrimp-snails-guide","الروبيان والحلزون")}.</li>
</ul>` },

  { slug:"aquarium-placement-and-stand", html:
`<h2>علامات التسريب المبكرة</h2>
<p>الأحواض نادراً ما تنفجر فجأة؛ غالباً تعطي إشارات أولاً. ما تراقبه:</p>
<ul>
  <li><strong>رطوبة أو أثر ملحي أبيض</strong> على حافة القاعدة أو الطاولة تحتها.</li>
  <li><strong>فقاعات أو انفصال داخل خط السيليكون</strong> بالزوايا — الشريط يجب أن يكون متصلاً وملتصقاً بالكامل.</li>
  <li><strong>انخفاض منسوب أسرع من التبخر المعتاد</strong>، خصوصاً إن كان الحوض مغطى.</li>
  <li><strong>أي تشقق بالزجاج</strong> مهما بدا سطحياً — لا يُهمل ولا يُنتظر.</li>
</ul>
<p>والسيليكون العلوي التجميلي غير السيليكون البنيوي بين الألواح؛ إصلاح الثاني عمل دقيق يتطلب تفريغاً كاملاً وتجفيفاً وإزالة كاملة للقديم، وكثيرون يفضّلون الاستبدال. وإذا لاحظت أياً من هذا، فرّغ الحوض قبل النقل — ${A("transporting-fish-and-aquarium","نقل الأسماك والحوض")} — ولا تحرّكه وفيه ماء.</p>` },

  { slug:"aquarium-care-while-traveling", html:
`<h2>موزّعات العلف الأوتوماتيكية: متى تنفع ومتى تؤذي</h2>
<p>الموزّع يحل مشكلة الغياب الطويل، لكنه يضيف مخاطرة جديدة: عطل يفرّغ الكمية كلها دفعة واحدة، وهذا أسوأ من الجوع.</p>
<ul>
  <li><strong>جرّبه أسبوعاً قبل السفر</strong> وأنت موجود، وراقب الكمية الفعلية لكل وجبة.</li>
  <li><strong>اضبطه أقل مما تظن.</strong> السمكة البالغة تتحمل قلة الأكل بسهولة، ولا تتحمل ماءً فاسداً — وهذا يبقى مبدأ هذا المقال كله.</li>
  <li><strong>الرطوبة تكتّل العلف</strong> وتسد المخرج؛ ضعه بعيداً عن بخار السطح.</li>
  <li><strong>للغياب القصير لا تحتاجه أصلاً.</strong></li>
</ul>` },

  { slug:"filter-types-guide", html:
`<h2>المعقّم فوق البنفسجي: هل تحتاجه؟</h2>
<p>سؤال يتكرر، والجواب لأغلب الأحواض المنزلية: <strong>لا</strong>.</p>
<ul>
  <li><strong>ما يفعله:</strong> يعالج ما يمر به من كائنات عالقة <em>بالماء</em> — ولهذا يُذكر مع الماء الأخضر تحديداً.</li>
  <li><strong>ما لا يفعله:</strong> لا يعالج ما يستقر على السمكة أو القاع أو الزجاج، ولا يعوّض ماءً رديئاً أو حوضاً مكتظاً.</li>
  <li><strong>ولا يغني عن الحجر الصحي</strong> ولا عن تبديل الماء — ${A("quarantine-new-fish-guide","الحجر الصحي")}.</li>
</ul>
<p>يعني: أداة لحالة محددة، لا ترقية عامة. الحوض المتوازن لا يحتاجها، والحوض غير المتوازن لن تصلحه.</p>` },

  { slug:"hardscape-rock-arrangement-visual-depth", html:
`<h2>قواعد التكوين: أين تضع القطعة الرئيسية</h2>
<p>ثلاث قواعد بسيطة تفسّر لماذا يبدو ترتيب أفضل من آخر:</p>
<ul>
  <li><strong>لا تضع القطعة الرئيسية بالمنتصف تماماً.</strong> المركز الحرفي يقسم المشهد نصفين متساويين ويبدو ساكناً؛ إزاحتها عن المنتصف تعطي حركة.</li>
  <li><strong>نقطة تركيز واحدة.</strong> قطعتان تتنافسان على الانتباه تلغيان بعضهما — واحدة تقود، والبقية تدعم.</li>
  <li><strong>أعداد فردية.</strong> ثلاث صخور أو خمس تبدو طبيعية أكثر من اثنتين أو أربع، لأن الزوجي يميل للتناظر والتناظر يبدو مصنوعاً.</li>
</ul>
<p>وطبّقها على المنحدر والعمق المشروحين أعلاه، وشوف تطبيقاً كاملاً بـ${A("iwagumi-aquascape-step-by-step","الإيواغومي")}.</p>` },

  { slug:"air-pumps-decoration-or-necessity", html:
`<h2>الضجيج والاهتزاز</h2>
<p>مضخة الهواء أكثر مصدر ضجيج بالحوض، وأغلبه قابل للحل:</p>
<ul>
  <li><strong>الاهتزاز ينتقل للسطح.</strong> ضع المضخة على قطعة إسفنج أو قماش مطوي بدل السطح الصلب مباشرة — أبسط إجراء وأكبر فرق.</li>
  <li><strong>لا تضعها على الحوض نفسه</strong>؛ الزجاج ينقل الاهتزاز ويضخّمه.</li>
  <li><strong>حجر الهواء المسدود يرفع المقاومة</strong> فيزيد الصوت — نظّفه أو استبدله.</li>
  <li><strong>الأنبوب المشدود ينقل الاهتزاز.</strong> اتركه مرتخياً بانحناءة.</li>
  <li><strong>ولا تضع الحوض بغرفة نوم</strong> إن كان الصوت يزعجك — ${A("aquarium-bedroom-feng-shui-sound-effect","الحوض في غرفة النوم")}.</li>
</ul>` },

  { slug:"transporting-fish-and-aquarium", html:
`<h2>تفكيك حوض قائم وإعادة تشغيله</h2>
<p>نقل حوض مؤسس ليس نقل أثاث: أنت تنقل منظومة حية، وأثمن ما فيها ليس الزجاج بل البكتيريا.</p>
<ol>
  <li><strong>ميديا الفلتر أولاً وأخيراً.</strong> ضعها بكيس مملوء بماء الحوض نفسه، ولا تدعها تجف ولو دقائق — الجفاف يقتل المستعمرة ويعيدك لنقطة الصفر.</li>
  <li><strong>احتفظ بأكبر قدر من ماء الحوض</strong> لإعادة الملء — يقلل الصدمة، وإن كانت البكتيريا بالميديا لا بالماء.</li>
  <li><strong>الركيزة تحمل فضلات.</strong> تحريكها يطلقها، فتوقّع عكارة وارتفاع أمونيا بعد التشغيل.</li>
  <li><strong>شغّل الفلتر والسخان فوراً</strong> بعد إعادة الملء.</li>
  <li><strong>افحص يومياً أول أسبوع</strong> — تعامل مع الحوض كأنه يدوّر من جديد — ${A("nitrogen-cycle-simple-arabic-explained","الدورة البيولوجية")}.</li>
  <li><strong>وأطعم قليلاً جداً</strong> بالأيام الأولى.</li>
</ol>` },

  { slug:"aquarium-shrimp-snails-guide", html:
`<h2>ليش ما تكبر المستعمرة</h2>
<p>الروبيان يتكاثر من نفسه بظروف مناسبة، فإذا بقي العدد ثابتاً أو تناقص فالسبب غالباً واحد من هذي:</p>
<ul>
  <li><strong>الصغار تُسحب للفلتر.</strong> أشيع سبب صامت — إسفنجة على فتحة السحب تحل المسألة.</li>
  <li><strong>لا مخابئ كافية.</strong> الصغار تحتاج نباتاً كثيفاً أو طحلباً؛ الحوض العاري يعني افتراساً كاملاً.</li>
  <li><strong>مشاكل الانسلاخ.</strong> الروبيان يبني قشرته من معادن الماء، وماء فقير جداً بالمعادن يصعّب الانسلاخ — وهو من أخطر لحظات حياته.</li>
  <li><strong>تذبذب المعادن.</strong> الثبات أهم من الرقم — ${A("gh-kh-water-hardness-guide","دليل GH و KH")}.</li>
  <li><strong>سمكة تأكلها.</strong> أسماك كثيرة تعتبر الروبيان الصغير طعاماً حتى لو تعايشت مع البالغ.</li>
</ul>
<p>ولا تتدخل أثناء الانسلاخ ولا ترفع القشرة المتروكة — تُستهلك مجدداً.</p>` },

  { slug:"how-to-clean-aquarium-properly", html:
`<h2>ونظافتك أنت أثناء التنظيف</h2>
<p>كل ما سبق عن نظافة الحوض. لكن التنظيف هو أكثر لحظة تلامس فيها يدك ماء الحوض، ويستحق احتياطاً بسيطاً بالاتجاه المعاكس: غطِّ أي جرح بيدك قبل الإدخال، واغسل يديك بعد الانتهاء، ولا تشفط السيفون بفمك إطلاقاً.</p>
<p>التفصيل — ولماذا يهم أن تخبر طبيبك أن عندك حوضاً لو ظهر التهاب جلدي لا يتحسن — بـ${A("aquarium-hygiene-and-human-safety","نظافة الحوض وسلامتك أنت")}.</p>` },

  { slug:"aquarium-water-flow", html:
`<h2>الطبقة الزيتية على السطح</h2>
<p>غشاء رقيق يغطي سطح الماء ويكسر انعكاسه، ويبدو كطبقة دهنية ساكنة. ليس خطراً بحد ذاته، لكنه <strong>يعيق تبادل الغازات</strong> عند السطح — وهو بالضبط المكان الذي يحصل فيه.</p>
<ul>
  <li><strong>مصدره</strong> بروتينات ودهون من العلف وبقايا عضوية، تتجمع حيث لا حركة.</li>
  <li><strong>الحل الجذري تحريك السطح</strong> — وجّه مخرج الفلتر لأعلى قليلاً، أو أضف تهوية.</li>
  <li><strong>الإزالة السريعة</strong>: مرّر ورقة مطبخ على السطح فتلتقط الغشاء، وكرّرها.</li>
  <li><strong>وراجع كمية العلف</strong>، لأن الغشاء المتكرر مؤشر فائض عضوي — ${A("aquarium-fish-feeding-guide","دليل التغذية")}.</li>
</ul>` },

  // --- Inbound wiring. Without these three the batch ships an island: only
  // aquarium-hygiene-and-human-safety had an inbound link from the existing 111,
  // and the other three new canonicals were reachable only from each other.
  // Each section below closes a gap that was verified in its own owner first.

  { slug:"fish-disease-symptoms-diagnosis", html:
`<h2>والعين؟ سؤال يسبق الجدول</h2>
<p>الجدول فوق ما يغطي العين، وهي من أسرع ما يلاحظه الهاوي لأنها تبيّن بالنظر. والسؤال الأول ليس "شنو المرض" بل: <strong>عين واحدة أم اثنتان؟</strong></p>
<ul>
  <li><strong>واحدة</strong> — تميل لسبب موضعي: احتكاك بديكور، عضّة، أو إصابة بعد نقل.</li>
  <li><strong>اثنتان</strong> — ترجّح سبباً أعمّ يمس السمكة كلها، وأول ما يُفحص هو الماء.</li>
</ul>
<p>وهذا ترجيح لا تشخيص، مثل بقية الجدول — التفصيل بـ${A("fish-eye-problems","مشاكل عين السمكة")}.</p>` },

  { slug:"how-many-fish-in-aquarium", html:
`<h2>الحسبة تنكسر عند نقطة الشراء</h2>
<p>كل ما فوق يفترض إنك تعرف الحجم البالغ. وهنا تنكسر الحسبة عملياً: المتجر يعرض صغاراً، والقرار ينبني على الحجم اللي تشوفه لا الحجم اللي راح يصير.</p>
<ul>
  <li><strong>اسأل عن الحجم البالغ قبل الشراء</strong> لا بعده — تغيير الرأي وأنت واقف بالمتجر ما يكلف شي.</li>
  <li><strong>السمكة ما تنمو بقدر حوضها.</strong> فكرة إنها "تقف على قد الحوض" منتشرة وغير صحيحة.</li>
  <li><strong>وإذا صارت المشكلة عندك أصلاً</strong> فالخيارات محدودة، وكلها أصعب من قرار دقيقة واحدة بالمتجر.</li>
</ul>
<p>الأنواع اللي يتكرر فيها هذا والخيارات الواقعية بـ${A("fish-that-outgrow-home-tanks","أسماك تنباع صغيرة ولا تصلح لحوض بيتي")}.</p>` },

  { slug:"quarantine-new-fish-guide", html:
`<h2>الحجر ما يعوّض اختياراً سيئاً</h2>
<p>الحجر يمسك ما يظهر خلال أسابيع، لكنه ما يصلح سمكة اشتريتها وهي أصلاً منهكة. أرخص علاج يبقى سمكة ما اشتريتها.</p>
<ul>
  <li><strong>انظر للمنظومة كلها</strong> لا للسمكة وحدها: حوض المتجر وجيرانها يقولون عنها أكثر مما تقول هي.</li>
  <li><strong>اطلب أن تشوفها تأكل</strong> قبل ما تدفع.</li>
  <li><strong>وإذا اشتريتها يبقى الحجر إلزامياً</strong> — الاختيار الجيد يقلل الاحتمال، ما يلغيه.</li>
</ul>
<p>وما الذي تنظر إليه بالضبط: ${A("choosing-healthy-fish-in-store","اختيار سمكة سليمة قبل الشراء")}.</p>` },
];

const NL = String.fromCharCode(10);
const q = (s) => "'" + s.replace(/'/g, "''") + "'";
const pgLength = (s) => [...s].length;
const lf = (t) => t.split(String.fromCharCode(13) + String.fromCharCode(10)).join(String.fromCharCode(10));

const listBody = await (await fetch(`${BASE}/api/blog/posts`)).json();
const liveSlugs = (Array.isArray(listBody) ? listBody : listBody.posts).map((p) => p.slug);
const live = new Set(liveSlugs);
const published = liveSlugs.length;

const created = new Set(NEW.map((n) => n.slug));
const checkLinks = (slug, html) => {
  const linked = [...html.matchAll(/href="\/blog\/([^"#?]+)"/g)].map((m) => decodeURIComponent(m[1]));
  const dead = linked.filter((s) => !live.has(s) && !created.has(s));
  if (dead.length) throw new Error(`${slug}: dead links ${dead.join(", ")}`);
  if (linked.includes(slug)) throw new Error(`${slug}: self link`);
  return linked.length;
};

for (const n of NEW) {
  if (live.has(n.slug)) throw new Error(`${n.slug}: already published`);
  n.html = fs.readFileSync(path.join(HERE, n.draft), "utf8").trim();
  console.log(`new     ${n.slug}: ${pgLength(n.html)} chars, ${checkLinks(n.slug, n.html)} links`);
}
for (const r of REWRITE) {
  const row = (b => b.post ?? b)(await (await fetch(`${BASE}/api/blog/posts/${r.slug}`)).json());
  if (!row?.content) throw new Error(`${r.slug}: rewrite target not found`);
  r.before = row.content;
  r.html = fs.readFileSync(path.join(HERE, r.draft), "utf8").trim();
  checkLinks(r.slug, r.html);
  console.log(`rewrite ${r.slug}: ${pgLength(r.before)} -> ${pgLength(r.html)} chars`);
}
for (const d of DEEPEN) {
  const row = (b => b.post ?? b)(await (await fetch(`${BASE}/api/blog/posts/${d.slug}`)).json());
  if (!row?.content) throw new Error(`${d.slug}: deepen target not found`);
  d.before = row.content;
  checkLinks(d.slug, d.html);
  d.after = row.content.trimEnd() + "\n" + d.html;
  console.log(`deepen  ${d.slug}: ${pgLength(d.before)} -> ${pgLength(d.after)} chars`);
}

const STRUCT = [...NEW.map((x) => x.slug), ...REWRITE.map((x) => x.slug)];
const ALL = [...STRUCT, ...DEEPEN.map((x) => x.slug)];

const sql = `-- Migration ID: ${ID}
-- Target:       Neon production, blog_posts
--               (${NEW.length} inserts, ${REWRITE.length} rewrite, ${DEEPEN.length} deepenings)
-- Rollback:     rollback-final.sql
--
-- Final expansion phase. One discovery pass over a 166-concept map of the whole
-- freshwater domain, matched against all ${published} live articles, produced this batch.
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
-- All ${ALL.length} targets passed script-purity, editorial, business-truth, link
-- resolution and block-tag balance via scripts/gate-draft.ts, and the projected
-- post-migration graph was checked before this file was applied.

BEGIN;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM blog_posts WHERE is_published;
  IF n <> ${published} THEN RAISE EXCEPTION 'expected ${published} published posts, found %', n; END IF;

  SELECT count(*) INTO n FROM blog_posts WHERE slug IN (${NEW.map((x) => q(x.slug)).join(", ")});
  IF n <> 0 THEN RAISE EXCEPTION 'one of the new slugs already exists'; END IF;

${[...REWRITE, ...DEEPEN].map((t) => `  SELECT count(*) INTO n FROM blog_posts WHERE slug = ${q(t.slug)} AND is_published
     AND length(content) = ${pgLength(t.before)};
  IF n <> 1 THEN RAISE EXCEPTION '${t.slug}: target missing or changed since drafting'; END IF;`).join(NL)}
END $$;

CREATE TABLE ${BACKUP} AS
SELECT id, slug, title, excerpt, content, is_published, now() AS backed_up_at
  FROM blog_posts;

${NEW.map(
  (n) => `INSERT INTO blog_posts (title, slug, excerpt, content, category, icon_name, author, is_published, published_at)
VALUES (${q(n.title)}, ${q(n.slug)}, ${q(n.excerpt)}, ${q(n.html)}, ${q(n.category)}, ${q(n.icon)},
        'AQUAVO Editorial Team', TRUE, now());
`,
).join("\n")}
${REWRITE.map((r) => `UPDATE blog_posts SET title = ${q(r.title)}, excerpt = ${q(r.excerpt)}, content = ${q(r.html)}
 WHERE slug = ${q(r.slug)};`).join(NL)}

${DEEPEN.map((d) => `UPDATE blog_posts SET content = ${q(d.after)} WHERE slug = ${q(d.slug)};`).join(NL + NL)}

-- Post-flight.
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM blog_posts WHERE is_published;
  IF n <> ${published + NEW.length} THEN RAISE EXCEPTION 'expected ${published + NEW.length} published, found %', n; END IF;

  SELECT count(*) INTO n FROM blog_posts
   WHERE slug IN (${STRUCT.map(q).join(", ")})
     AND is_published AND length(content) > 2500
     AND content LIKE '%<table%' AND content LIKE '%href="/blog/%';
  IF n <> ${STRUCT.length} THEN RAISE EXCEPTION 'only % of ${STRUCT.length} full articles carry their structure', n; END IF;

  SELECT count(*) INTO n FROM blog_posts
   WHERE slug IN (${NEW.map((x) => q(x.slug)).join(", ")}) AND author = 'AQUAVO Editorial Team';
  IF n <> ${NEW.length} THEN RAISE EXCEPTION 'only % of ${NEW.length} new articles carry the editorial byline', n; END IF;

  -- Every article this batch creates must be reachable FROM THE ARTICLES THAT
  -- ALREADY EXISTED. An inbound link from another article in the same batch is
  -- not discoverability: the first projection of this batch passed a plain
  -- inbound check while three of the four new articles pointed only at each
  -- other, an island nothing else reached.
  SELECT count(*) INTO n FROM (
    SELECT t.slug FROM blog_posts t
     WHERE t.slug IN (${NEW.map((x) => q(x.slug)).join(", ")})
       AND NOT EXISTS (
         SELECT 1 FROM blog_posts b
          CROSS JOIN LATERAL regexp_matches(b.content, 'href="/blog/([^"#?]+)"', 'g') AS m(parts)
          WHERE b.is_published AND b.slug <> t.slug
            AND b.slug NOT IN (${NEW.map((x) => q(x.slug)).join(", ")})
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
   WHERE slug IN (${ALL.map(q).join(", ")})
     AND content ~ '[一-鿿぀-ヿ가-힯Ѐ-ӿऀ-ॿ฀-๿֐-׿Ā-ɏḀ-ỿ]';
  IF n <> 0 THEN RAISE EXCEPTION 'a final-batch article carries stray script'; END IF;
END $$;

COMMIT;
`;

fs.writeFileSync(path.join(HERE, "migration-final.sql"), lf(sql));
fs.writeFileSync(
  path.join(HERE, "rollback-final.sql"),
  lf(`-- Rollback for ${ID}.

BEGIN;

DELETE FROM blog_posts WHERE slug IN (${NEW.map((x) => q(x.slug)).join(", ")});

UPDATE blog_posts b SET title = k.title, excerpt = k.excerpt, content = k.content
  FROM ${BACKUP} k
 WHERE b.id = k.id AND b.content IS DISTINCT FROM k.content;

COMMIT;
`),
);
// The exact post bodies that will exist after this migration, written out so
// gate-draft.ts checks what actually ships rather than a hand-kept copy.
for (const d of DEEPEN) fs.writeFileSync(path.join(HERE, `_d-${d.slug}.html`), lf(d.after) + NL);

console.log(`\nemitted migration-final.sql (${NEW.length} inserts, ${REWRITE.length} rewrite, ${DEEPEN.length} deepenings)`);

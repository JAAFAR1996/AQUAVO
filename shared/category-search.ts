import { canonicalProductCategory } from "./seo-contract.js";
import { DEFAULT_LOCALE, type Locale } from "./i18n/locales.js";

/**
 * How each of the eleven category listings presents itself to search, in the
 * three languages the store is published in.
 *
 * Search Console (baseline 2026-09-22, 90 days) showed the listings almost
 * absent from Google: 2 of 43 target queries had any impression. The pages
 * were titled and headed with the catalogue's own taxonomy — "منتجات التحكم
 * بالحرارة" — which nobody types; people search "سخان حوض سمك". This module
 * gives each listing the words a buyer actually uses, and three questions a
 * buyer actually asks, so the page is a distinct document rather than a
 * filtered view of /products (three listings were folded into /products as
 * duplicates by Google before this).
 *
 * Same discipline as shared/category-content.ts: category-level guidance from
 * general aquarium knowledge. No product is named, no price, no specification,
 * no claim AQUAVO tested anything. Where a figure matters, the answer points at
 * the guide that carries it.
 *
 * English and Kurdish (2026-09-23): Search Console showed no English or
 * Kurdish query reaching the listings in 90 days, and the /en and /ckb
 * listings carried a templated catalogue title ("Filtration Aquarium Products
 * in Iraq"). Google's autocomplete for Iraq phrases the demand as "aquarium
 * filter", "aquarium heater", "fish tank ... for sale"; the English copy uses
 * those forms. In Sorani, "حەوزی ماسی" alone reads as a fish farm pond in
 * search, so every Kurdish title carries "ئاکواریۆم" next to it. Kurdish terms
 * follow shared/i18n/glossary.json and reports/i18n/ckb-native-final-review.md
 * (گەرمکەر، لابەری کلۆر، قەوزە، گەرمیپێو). Like the rest of the Kurdish site,
 * the Kurdish copy is model-written and not native-human reviewed.
 */
export type CategorySearch = {
  /** The listing's H1, in the words a buyer searches. */
  readonly heading: string;
  /** The <title>; ends with the brand, stays under ~60 characters before it. */
  readonly title: string;
  /**
   * Meta description. Arabic listings take theirs from
   * shared/category-content.ts; the other locales carry it here.
   */
  readonly description?: string;
  /** Three questions a buyer asks before choosing in this category, each answered in one short paragraph. */
  readonly faq: readonly { readonly question: string; readonly answer: string }[];
};

export const CATEGORY_FAQ_HEADING = "أسئلة قبل ما تختار";

const CATEGORY_FAQ_HEADINGS: Readonly<Record<Locale, string>> = Object.freeze({
  ar: CATEGORY_FAQ_HEADING,
  en: "Questions before you choose",
  ckb: "پرسیارەکان پێش هەڵبژاردن",
});

/** The heading above the three questions, in the page's language. */
export function categoryFaqHeading(locale: Locale = DEFAULT_LOCALE): string {
  return CATEGORY_FAQ_HEADINGS[locale] ?? CATEGORY_FAQ_HEADING;
}

export const CATEGORY_SEARCH: Readonly<Record<string, CategorySearch>> = Object.freeze({
  "الفلترة والتنقية": Object.freeze({
    heading: "فلاتر حوض السمك ووسائط الفلترة",
    title: "فلتر حوض سمك ووسائط فلترة في العراق | AQUAVO",
    faq: Object.freeze([
      {
        question: "شلون أعرف الفلتر يناسب حجم حوضي؟",
        answer: "الفلتر يُقاس بكمية الماء اللي يدوّرها بالساعة مقارنة بحجم الحوض، مو بحجمه هو. حوض مزدحم أو فيه سمك يوسّخ كثير يحتاج تدوير أعلى من حوض بنفس الحجم وسمك أقل. دليل اختيار الفلتر يشرح الحساب بالأرقام.",
      },
      {
        question: "الفلتر الإسفنجي يكفي لحالة؟",
        answer: "لحوض صغير أو حوض روبيان وصغار سمك، الإسفنجي غالباً كافي لأنه يفلتر بيولوجياً بلطف وما يسحب الصغار. لحوض أكبر أو سمك يأكل كثير، يصير فلتر مساعد مو رئيسي.",
      },
      {
        question: "متى أبدّل وسائط الفلتر؟",
        answer: "الوسط البيولوجي ما ينبدّل إلا إذا تفتّت، لأن البكتيريا النافعة عايشة عليه. اللي ينبدّل دورياً هو القطن الميكانيكي والكربون النشط، وكل واحد له عمر مختلف حسب حمل الحوض.",
      },
    ]),
  }),
  "التحكم بالحرارة": Object.freeze({
    heading: "سخانات وموازين حرارة لحوض السمك",
    title: "سخان حوض سمك وميزان حرارة في العراق | AQUAVO",
    faq: Object.freeze([
      {
        question: "شلون أختار قدرة السخان المناسبة؟",
        answer: "القدرة تعتمد على حجم الماء وفرق الحرارة بين الغرفة والدرجة اللي تريدها، مو على حجم السخان. الغرفة الباردة بالشتاء تحتاج قدرة أعلى من غرفة دافئة لنفس الحوض. دليل اختيار السخان يعطي الجدول.",
      },
      {
        question: "أحتاج سخان بالصيف ببغداد؟",
        answer: "بالصيف المشكلة غالباً معكوسة: الماء يسخن أكثر من اللازم ويقل فيه الأوكسجين. السخان بالصيف يشتغل كثبّت مو كمُدفّئ، والأهم تراقب الحرارة بميزان منفصل وتضمن تهوية كافية.",
      },
      {
        question: "ليش أحتاج ميزان حرارة إذا السخان فيه مؤشر؟",
        answer: "مؤشر السخان يقيس الماء اللي يلامسه هو، ومو دايماً دقيق. ميزان منفصل بالطرف الثاني من الحوض يبيّن الحرارة الفعلية اللي يعيش فيها السمك، ويكشف السخان إذا علق شغال أو توقف.",
      },
    ]),
  }),
  "الإضاءة": Object.freeze({
    heading: "إضاءة حوض السمك LED",
    title: "اضاءة حوض سمك LED للنباتات والعرض في العراق | AQUAVO",
    faq: Object.freeze([
      {
        question: "كم ساعة أشغّل إضاءة الحوض باليوم؟",
        answer: "لحوض بدون نبات حي، ساعات قليلة تكفي للعرض، والزيادة تجيب طحالب. لحوض فيه نبات، النبات يحتاج فترة إضاءة أطول وثابتة كل يوم. الثبات بالتوقيت أهم من الرقم نفسه، ومؤقت كهربائي يحل نص المشكلة.",
      },
      {
        question: "أي لون إضاءة يناسب حوض السمك؟",
        answer: "الضوء الأبيض المائل للنهاري يبيّن ألوان السمك طبيعية ويكفي للعرض. إذا عندك نبات حي، اللون لحاله ما يكفي؛ المهم قوة الضوء ومدى تغطيته للحوض. إضاءة زرقاء لحالها منظر مو تغذية.",
      },
      {
        question: "إضاءة أقوى تعني نبات أحسن؟",
        answer: "مو بالضرورة. الضوء القوي بدون تغذية وثاني أوكسيد كربون كافيين يجيب طحالب قبل ما يجيب نمو. ابدأ بإضاءة متوسطة وساعات ثابتة، وزيد بس إذا النبات نفسه يطلب.",
      },
    ]),
  }),
  "معالجة المياه": Object.freeze({
    heading: "مزيل الكلور ومعالجات ماء حوض السمك",
    title: "مزيل كلور ومعالج مياه حوض السمك في العراق | AQUAVO",
    faq: Object.freeze([
      {
        question: "لازم أستخدم مزيل كلور كل مرة أغيّر الماء؟",
        answer: "نعم، كل مرة تضيف ماء حنفية للحوض. الكلور والكلورامين يأذون غلاصم السمك ويقتلون البكتيريا النافعة بالفلتر، والكلورامين بالذات ما يطير حتى لو تركت الماء مكشوف أيام، فالمزيل مو خيار.",
      },
      {
        question: "البكتيريا النافعة تختصر دورة الحوض الجديد؟",
        answer: "تساعد على تسريعها، بس ما تلغيها. الحوض الجديد يحتاج مدة حتى تستقر البكتيريا على وسائط الفلتر وتشتغل فعلاً، والفحص هو اللي يقول متى صار الحوض جاهز للسمك، مو تاريخ إضافة المنتج.",
      },
      {
        question: "مزيل الطحالب يحل مشكلة الطحالب نهائياً؟",
        answer: "يشيل الظاهر، بس الطحالب ترجع بعد أسابيع إذا سببها باقي: إضاءة طويلة، أكل زايد، أو نترات عالية. عالج السبب أول، واستخدم المزيل كخطوة مساعدة مو كحل وحيد، وقلل ساعات الإضاءة قبل أي شي.",
      },
    ]),
  }),
  "طعام الأسماك": Object.freeze({
    heading: "طعام أسماك الزينة",
    title: "طعام سمك زينة في العراق: حبيبات ورقائق وأرتيميا | AQUAVO",
    faq: Object.freeze([
      {
        question: "كم مرة أطعم السمك باليوم؟",
        answer: "مرة أو مرتين باليوم بكمية تخلص خلال دقيقتين تقريباً. الأكل اللي يبقى ينزل للقاع ويتحلل أمونيا. يوم بدون أكل بالأسبوع ما يضر سمكة بالغة سليمة، والزيادة تضر أكثر من النقص.",
      },
      {
        question: "حبيبات لو رقائق؟",
        answer: "حسب مكان الأكل: الرقائق تطفو وتناسب سمك السطح، والحبيبات الغاطسة تنزل لسمك القاع مثل الكوريدوراس. الحوض المختلط غالباً يحتاج النوعين حتى يوصل الأكل للكل، وحجم الحبيبة لازم يناسب فم السمكة نفسها.",
      },
      {
        question: "الأرتيميا والأكل المجفف بالتجميد ضروري؟",
        answer: "مو ضروري يومياً، بس يفيد كتنويع ولتحفيز السمك اللي يرفض الأكل الجاف، ولصغار السمك بأول أسابيعهم. الأساس يبقى أكل جاف جيد، والتنويع مرة أو مرتين بالأسبوع يكفي لأغلب الأحواض.",
      },
    ]),
  }),
  "تربة وديكور": Object.freeze({
    heading: "رمل وتربة وديكور حوض السمك",
    title: "رمل وتربة أكواسكيب وديكور حوض سمك في العراق | AQUAVO",
    faq: Object.freeze([
      {
        question: "رمل لو حصى لقاع الحوض؟",
        answer: "الرمل الناعم يناسب سمك القاع اللي ينبش مثل الكوريدوراس، والحصى أسهل بالتنظيف ويخلي الفضلات ما تغوص. إذا عندك نبات حي بجذور، التربة المخصصة للنبات أفضل من الاثنين.",
      },
      {
        question: "الحجر البركاني يغيّر خصائص الماء؟",
        answer: "الحجر البركاني بطبيعته خامل وما يرفع القساوة، لهذا يُستخدم كثير بالأكواسكيب. اللي يرفع القساوة والـ pH هي الأحجار الكلسية، فاعرف نوع الحجر قبل ما تحطه.",
      },
      {
        question: "ليش لوّن الخشب الطبيعي ماء الحوض؟",
        answer: "الخشب الطبيعي يطلق تانينات تعطي الماء لون الشاي بالبداية، وهذا طبيعي ومو ضار، بل بعض السمك يحبه. النقع والغلي قبل التركيب يقلله، وتغيير الماء المنتظم يشيله بالتدريج.",
      },
    ]),
  }),
  "التهوية والأكسجين": Object.freeze({
    heading: "مضخات هواء وأحجار هواء لحوض السمك",
    title: "مضخة هواء وحجر هواء حوض سمك في العراق | AQUAVO",
    faq: Object.freeze([
      {
        question: "كل حوض يحتاج مضخة هواء؟",
        answer: "مو بالضرورة. إذا الفلتر يحرّك سطح الماء بشكل واضح، الأوكسجين يدخل من الحركة نفسها. المضخة تصير ضرورية بالحوض المزدحم، وبالصيف لما يسخن الماء، ولتشغيل فلتر إسفنجي.",
      },
      {
        question: "شلون أعرف السمك ناقصه أوكسجين؟",
        answer: "أوضح علامة إن السمك يصعد للسطح ويلهث، خصوصاً بالصباح أو بعد يوم حار. هذي مو حالة طبيعية وتحتاج تدخل سريع: حرّك السطح، وقلّل الحرارة إذا مرتفعة.",
      },
      {
        question: "شنو فايدة صمام عدم الرجوع؟",
        answer: "إذا المضخة موضوعة أوطى من سطح الماء وانقطعت الكهرباء، الماء يرجع بالخرطوم للمضخة ويتلفها وممكن يفرغ جزء من الحوض على الأرض. الصمام قطعة صغيرة تنركب على الخرطوم وتمنع هذا بالكامل، وانقطاع الكهرباء عندنا مو نادر.",
      },
    ]),
  }),
  "الصيانة والتنظيف": Object.freeze({
    heading: "أدوات تنظيف وصيانة حوض السمك",
    title: "ادوات تنظيف حوض السمك وصيانته في العراق | AQUAVO",
    faq: Object.freeze([
      {
        question: "كم مرة أغيّر ماء الحوض؟",
        answer: "تغيير جزئي منتظم كل أسبوع أو أسبوعين أفضل من تغيير كامل نادر. الكمية تعتمد على حمل الحوض، وفحص النترات يقول إذا الجدول كافي. دليل تغيير الماء يعطي جدول حسب الحالة.",
      },
      {
        question: "شلون أشيل الترسبات البيضاء من الزجاج؟",
        answer: "الترسبات البيضاء غالباً أملاح كلسية من الماء نفسه لما يتبخر عند خط الماء. تنشال بمكشطة أو ممسحة مغناطيسية، وتنظيفها فوق خط الماء بقطعة قماش رطبة كل أسبوع يمنع تراكمها من الأساس.",
      },
      {
        question: "أنظّف الفلتر مع تغيير الماء؟",
        answer: "الأفضل لا، مو بنفس اليوم. تنظيف الفلتر وتغيير الماء سوية يشيل جزء كبير من البكتيريا النافعة دفعة وحدة. اشطف وسائط الفلتر بماء الحوض القديم وبفترة منفصلة.",
      },
    ]),
  }),
  "العزل والتفريخ": Object.freeze({
    heading: "حوض العزل والتفريخ ومستلزماته",
    title: "حوض عزل وحاضنة تفريخ أسماك في العراق | AQUAVO",
    faq: Object.freeze([
      {
        question: "كم مدة أعزل السمكة الجديدة؟",
        answer: "أسبوعين على الأقل، وأطول إذا ظهرت أي علامة مرض. الهدف إن أي مرض يظهر بحوض العزل مو وسط الحوض الرئيسي، وأغلب الأمراض الشائعة تبيّن خلال هذي المدة.",
      },
      {
        question: "حوض العزل يحتاج فلتر وسخان؟",
        answer: "نعم. حوض عزل بدون فلترة وحرارة ثابتة يضغط على السمكة أكثر ويأخر شفاءها بدل ما يساعدها. فلتر إسفنجي صغير وسخان مناسب لحجمه يكفون، وميزان حرارة منفصل حتى تتأكد من القراءة.",
      },
      {
        question: "الحاضنة المعلقة تكفي لصغار السمك؟",
        answer: "تحمي الصغار من الأكل بأول أيام، وتنفع للأنواع اللي تولد صغار جاهزين. لأعداد كبيرة أو لتربية أطول، حوض عزل منفصل أفضل لأن الماء فيه أستقر والمكان أوسع.",
      },
    ]),
  }),
  "الفحص والمراقبة": Object.freeze({
    heading: "أدوات فحص ماء الحوض ومراقبته",
    title: "فحص ماء حوض السمك: اختبارات وموازين في العراق | AQUAVO",
    faq: Object.freeze([
      {
        question: "شنو أفحص بماء الحوض وبأي ترتيب؟",
        answer: "الأمونيا والنتريت أول، لأنهم القاتلين الصامتين وبحوض مستقر المفروض صفر. بعدهم النترات اللي تتراكم ويقللها تغيير الماء، ثم pH. دليل فحص الماء يشرح كل قراءة وشتعني.",
      },
      {
        question: "كم مرة أفحص الماء؟",
        answer: "بالحوض الجديد كل يومين أو ثلاثة حتى تستقر القراءات. بالحوض المستقر مرة بالأسبوع تكفي، وفحص إضافي قبل ما تضيف سمك جديد أو بعد أي علاج أو تنظيف كبير.",
      },
      {
        question: "الماء الصافي يعني الماء سليم؟",
        answer: "لا. الأمونيا والنتريت ما ينشافون بالعين، والماء ممكن يكون صافي تماماً وسام. هذا سبب أغلب الخسائر بالأحواض الجديدة، والفحص هو الطريقة الوحيدة اللي تعرف بيها.",
      },
    ]),
  }),
  "أحواض": Object.freeze({
    heading: "أحواض سمك زجاجية",
    title: "احواض سمك للبيع في العراق: حوض زجاجي والترا كلير | AQUAVO",
    faq: Object.freeze([
      {
        question: "أي حجم حوض أبدأ بيه؟",
        answer: "أكبر ما تقدر تحط له مكان وميزانية. عكس المتوقع، الحوض الأكبر أسهل للمبتدئ لأن كمية الماء الأكثر تخفف أثر أي خطأ. الحوض الصغير يتغير ماؤه أسرع وأعنف.",
      },
      {
        question: "شنو الفرق بين الزجاج العادي والألترا كلير؟",
        answer: "الألترا كلير زجاج قليل الحديد، فما يظهر الميلان الأخضر اللي تشوفه بحواف الزجاج العادي، وتبين ألوان السمك والديكور أصفى وأقرب للحقيقة. الفرق منظر ووضوح بس، مو قوة تحمل ولا سماكة.",
      },
      {
        question: "شنو أحتاج مع الحوض من البداية؟",
        answer: "فلتر يناسب حجمه، سخان إذا السمك استوائي، إضاءة، ومزيل كلور لأول تعبئة. الحوض لحاله مو بداية؛ خطط للأربعة سوية قبل الشراء، ودليل تجهيز الحوض الجديد يمشيك بالترتيب.",
      },
    ]),
  }),
});

export const CATEGORY_SEARCH_EN: Readonly<Record<string, CategorySearch>> = Object.freeze({
  "الفلترة والتنقية": Object.freeze({
    heading: "Aquarium Filters & Filter Media",
    title: "Aquarium Filters & Filter Media in Iraq | AQUAVO",
    description: "Aquarium filters, sponge filters and filter media with prices in Iraqi dinar, stock status and delivery across Iraq.",
    faq: Object.freeze([
      {
        question: "How do I know a filter suits my tank size?",
        answer: "A filter is rated by how much water it turns over per hour compared with the tank's volume, not by its physical size. A crowded tank, or one with messy eaters, needs a higher turnover than a tank of the same size with fewer fish. The filter guide walks through the calculation with numbers.",
      },
      {
        question: "Is a sponge filter enough on its own?",
        answer: "For a small tank, a shrimp tank or a fry tank, usually yes: it filters biologically and gently, and it does not pull fry in. For a larger tank, or fish that eat a lot, it works better as a second filter than as the main one.",
      },
      {
        question: "When should I replace filter media?",
        answer: "Biological media is not replaced unless it crumbles, because the beneficial bacteria live on it. What gets replaced on a schedule is the mechanical floss and the activated carbon, and each has its own lifespan depending on how heavily the tank is stocked.",
      },
    ]),
  }),
  "التحكم بالحرارة": Object.freeze({
    heading: "Aquarium Heaters & Thermometers",
    title: "Aquarium Heaters & Thermometers in Iraq | AQUAVO",
    description: "Aquarium heaters and thermometers for tropical tanks, with prices in dinar, stock status and delivery to every Iraqi province.",
    faq: Object.freeze([
      {
        question: "How do I pick the right heater wattage?",
        answer: "Wattage depends on the volume of water and the gap between room temperature and the temperature you want, not on the size of the heater. A cold room in winter needs more power than a warm room for the same tank. The heater guide has the table.",
      },
      {
        question: "Do I need a heater in summer in Baghdad?",
        answer: "In summer the problem is usually reversed: the water gets warmer than it should and holds less oxygen. A heater in summer works as a stabiliser rather than a warmer. What matters more is watching the temperature on a separate thermometer and keeping the tank well aerated.",
      },
      {
        question: "Why do I need a thermometer if the heater has a dial?",
        answer: "The heater's dial reads the water touching the heater itself, and it is not always accurate. A separate thermometer at the other end of the tank shows the temperature the fish actually live in, and it reveals a heater that is stuck on or has stopped.",
      },
    ]),
  }),
  "الإضاءة": Object.freeze({
    heading: "LED Aquarium Lighting",
    title: "LED Aquarium Lights for Plants & Display in Iraq | AQUAVO",
    description: "LED aquarium lights for planted and display tanks, with prices in dinar, stock status and delivery across Iraq.",
    faq: Object.freeze([
      {
        question: "How many hours a day should the light run?",
        answer: "For a tank without live plants, a few hours are enough for viewing, and more only feeds algae. With live plants the light needs a longer, fixed period every day. Consistency matters more than the exact number, and a plug-in timer solves half the problem.",
      },
      {
        question: "Which light colour suits an aquarium?",
        answer: "White light leaning towards daylight shows fish colours naturally and is enough for display. If you keep live plants, colour alone is not enough; what matters is the light's strength and how much of the tank it covers. Blue light on its own is a look, not nutrition.",
      },
      {
        question: "Does a stronger light mean better plants?",
        answer: "Not necessarily. Strong light without enough nutrients and carbon dioxide brings algae before it brings growth. Start with medium light and fixed hours, and increase only when the plants themselves show they need it.",
      },
    ]),
  }),
  "معالجة المياه": Object.freeze({
    heading: "Dechlorinators & Aquarium Water Treatments",
    title: "Aquarium Water Conditioner & Dechlorinator in Iraq | AQUAVO",
    description: "Water conditioners, dechlorinators, beneficial bacteria and algae treatments for aquariums, with prices in dinar and delivery across Iraq.",
    faq: Object.freeze([
      {
        question: "Do I have to use a dechlorinator at every water change?",
        answer: "Yes, every time you add tap water to the tank. Chlorine and chloramine damage fish gills and kill the beneficial bacteria in the filter, and chloramine in particular does not evaporate even if you leave the water standing for days, so the conditioner is not optional.",
      },
      {
        question: "Do beneficial bacteria shorten the cycle of a new tank?",
        answer: "They help speed it up, but they do not skip it. A new tank needs time for the bacteria to settle on the filter media and actually work, and a water test is what tells you the tank is ready for fish, not the date you added the bottle.",
      },
      {
        question: "Does an algae remover solve algae for good?",
        answer: "It clears what you can see, but algae returns within weeks if the cause is still there: long lighting, overfeeding or high nitrate. Fix the cause first, use the remover as a helper rather than the only answer, and cut lighting hours before anything else.",
      },
    ]),
  }),
  "طعام الأسماك": Object.freeze({
    heading: "Ornamental Fish Food",
    title: "Fish Food in Iraq: Pellets, Flakes & Brine Shrimp | AQUAVO",
    description: "Flakes, pellets, sinking food and brine shrimp for ornamental fish, with prices in dinar, stock status and delivery across Iraq.",
    faq: Object.freeze([
      {
        question: "How often should I feed my fish?",
        answer: "Once or twice a day, an amount they finish in about two minutes. Food that is left over sinks to the bottom and breaks down into ammonia. One day without food a week does no harm to a healthy adult fish, and overfeeding does more damage than underfeeding.",
      },
      {
        question: "Pellets or flakes?",
        answer: "It depends on where the fish eat: flakes float and suit surface feeders, while sinking pellets reach bottom fish such as corydoras. A mixed tank usually needs both so the food reaches everyone, and the pellet size has to match the fish's mouth.",
      },
      {
        question: "Are brine shrimp and freeze-dried foods necessary?",
        answer: "Not daily, but they are useful as variety, to tempt fish that refuse dry food, and for fry in their first weeks. The staple stays a good dry food, and variety once or twice a week is enough for most tanks.",
      },
    ]),
  }),
  "تربة وديكور": Object.freeze({
    heading: "Aquarium Sand, Substrate & Decor",
    title: "Aquarium Sand, Aquascape Substrate & Decor in Iraq | AQUAVO",
    description: "Sand, gravel, planted substrate, stones, driftwood and decor for aquascaping, with prices in dinar and delivery across Iraq.",
    faq: Object.freeze([
      {
        question: "Sand or gravel for the tank bottom?",
        answer: "Fine sand suits bottom fish that dig, such as corydoras, while gravel is easier to clean and keeps waste from sinking in. If you keep rooted live plants, a dedicated plant substrate beats both of them.",
      },
      {
        question: "Does volcanic rock change the water?",
        answer: "Volcanic rock is inert by nature and does not raise hardness, which is why it is used so much in aquascaping. What raises hardness and pH are limestone-type rocks, so know what kind of stone you have before you put it in.",
      },
      {
        question: "Why did natural driftwood tint the water?",
        answer: "Natural wood releases tannins that give the water a tea colour at first. This is normal and harmless, and some fish actually prefer it. Soaking and boiling the wood before use reduces it, and regular water changes clear it gradually.",
      },
    ]),
  }),
  "التهوية والأكسجين": Object.freeze({
    heading: "Aquarium Air Pumps & Air Stones",
    title: "Aquarium Air Pump & Air Stone in Iraq | AQUAVO",
    description: "Air pumps, air stones, tubing and check valves for aquarium oxygen, with prices in dinar and delivery across Iraq.",
    faq: Object.freeze([
      {
        question: "Does every tank need an air pump?",
        answer: "Not necessarily. If the filter visibly moves the water surface, oxygen enters from that movement alone. An air pump becomes necessary in a crowded tank, in summer when the water warms up, and to run a sponge filter.",
      },
      {
        question: "How do I tell my fish are short of oxygen?",
        answer: "The clearest sign is fish rising to the surface and gasping, especially in the morning or after a hot day. This is not normal and needs quick action: move the surface, and lower the temperature if it is high.",
      },
      {
        question: "What does a check valve do?",
        answer: "If the pump sits lower than the water surface and the power goes out, water flows back down the tubing into the pump, ruins it, and can drain part of the tank onto the floor. The valve is a small piece fitted on the tubing that prevents this completely, and power cuts here are not rare.",
      },
    ]),
  }),
  "الصيانة والتنظيف": Object.freeze({
    heading: "Aquarium Cleaning & Maintenance Tools",
    title: "Aquarium Cleaning & Maintenance Tools in Iraq | AQUAVO",
    description: "Gravel siphons, glass scrapers, nets and maintenance tools for aquariums, with prices in dinar and delivery across Iraq.",
    faq: Object.freeze([
      {
        question: "How often should I change the water?",
        answer: "A regular partial change every week or two beats a rare full change. The amount depends on how heavily the tank is stocked, and a nitrate test tells you whether the schedule is enough. The water change guide gives a schedule by situation.",
      },
      {
        question: "How do I remove white deposits from the glass?",
        answer: "White deposits are usually mineral salts from the water itself, left where it evaporates at the waterline. They come off with a scraper or a magnetic cleaner, and wiping above the waterline with a damp cloth every week stops them building up in the first place.",
      },
      {
        question: "Should I clean the filter on water-change day?",
        answer: "Better not, and not on the same day. Cleaning the filter and changing the water together removes a large share of the beneficial bacteria at once. Rinse the filter media in old tank water, and do it on a separate occasion.",
      },
    ]),
  }),
  "العزل والتفريخ": Object.freeze({
    heading: "Quarantine Tanks & Breeder Boxes",
    title: "Quarantine Tank & Fish Breeder Box in Iraq | AQUAVO",
    description: "Quarantine tanks, breeder boxes and breeding supplies for ornamental fish, with prices in dinar and delivery across Iraq.",
    faq: Object.freeze([
      {
        question: "How long should I quarantine a new fish?",
        answer: "At least two weeks, and longer if any sign of disease appears. The point is that any illness shows up in the quarantine tank rather than in the main one, and most common diseases reveal themselves within that period.",
      },
      {
        question: "Does a quarantine tank need a filter and heater?",
        answer: "Yes. A quarantine tank without filtration and a stable temperature stresses the fish more and delays recovery instead of helping it. A small sponge filter and a heater sized for the tank are enough, plus a separate thermometer to confirm the reading.",
      },
      {
        question: "Is a hanging breeder box enough for fry?",
        answer: "It protects fry from being eaten in their first days and works for species that give birth to ready-formed fry. For large numbers or longer rearing, a separate tank is better because the water in it is more stable and there is more room.",
      },
    ]),
  }),
  "الفحص والمراقبة": Object.freeze({
    heading: "Aquarium Water Test Kits & Monitoring",
    title: "Aquarium Water Test Kits & Thermometers in Iraq | AQUAVO",
    description: "Water test kits, test strips and thermometers for aquarium monitoring, with prices in dinar and delivery across Iraq.",
    faq: Object.freeze([
      {
        question: "What should I test in the water, and in what order?",
        answer: "Ammonia and nitrite first, because they are the silent killers and should read zero in a stable tank. Then nitrate, which builds up and is lowered by water changes, and then pH. The water testing guide explains what each reading means.",
      },
      {
        question: "How often should I test the water?",
        answer: "In a new tank every two or three days until the readings settle. In a stable tank once a week is enough, with an extra test before adding new fish or after any treatment or major cleaning.",
      },
      {
        question: "Does clear water mean healthy water?",
        answer: "No. Ammonia and nitrite are invisible, and water can be perfectly clear and still toxic. This is the cause of most losses in new tanks, and testing is the only way to know for sure.",
      },
    ]),
  }),
  "أحواض": Object.freeze({
    heading: "Glass Aquariums & Fish Tanks",
    title: "Fish Tanks for Sale in Iraq: Glass & Ultra Clear | AQUAVO",
    description: "Glass and ultra-clear aquariums in several sizes, with prices in dinar, stock status and delivery across Iraq.",
    faq: Object.freeze([
      {
        question: "What tank size should I start with?",
        answer: "The largest you can give space and budget to. Contrary to what most people expect, a bigger tank is easier for a beginner, because the larger volume of water softens the effect of any mistake. A small tank changes faster and harder.",
      },
      {
        question: "What is the difference between regular and ultra-clear glass?",
        answer: "Ultra-clear glass has a low iron content, so it does not show the green tint you see at the edges of regular glass, and fish and decor colours look cleaner and truer. The difference is looks and clarity only, not strength or thickness.",
      },
      {
        question: "What do I need with the tank from the start?",
        answer: "A filter sized for it, a heater if the fish are tropical, lighting, and a dechlorinator for the first fill. The tank alone is not a start; plan all four together before buying, and the new aquarium setup guide walks through them in order.",
      },
    ]),
  }),
});

export const CATEGORY_SEARCH_CKB: Readonly<Record<string, CategorySearch>> = Object.freeze({
  "الفلترة والتنقية": Object.freeze({
    heading: "فلتەری ئاکواریۆم و ماددەی فلتەر",
    title: "فلتەری ئاکواریۆم و ماددەی فلتەر لە عێراق | AQUAVO",
    description: "فلتەری ئاکواریۆم، فلتەری ئیسفەنجی و ماددەی فلتەر بە نرخی دینار، دۆخی کۆگا و گەیاندن بۆ هەموو عێراق.",
    faq: Object.freeze([
      {
        question: "چۆن بزانم فلتەرەکە بۆ قەبارەی حەوزەکەم گونجاوە؟",
        answer: "فلتەر بەپێی ئەو بڕە ئاوە دەپێورێت کە لە کاتژمێرێکدا دەیسووڕێنێتەوە بەراورد بە قەبارەی حەوزەکە، نەک بەپێی قەبارەی خۆی. حەوزێکی قەرەباڵغ یان حەوزێک کە ماسی زۆر پیسکەری تێدایە، پێویستی بە سووڕانەوەی زیاترە لە حەوزێکی هەمان قەبارە بە ماسی کەمتر. ڕێنمایی هەڵبژاردنی فلتەر حسابەکە بە ژمارە ڕوون دەکاتەوە.",
      },
      {
        question: "فلتەری ئیسفەنجی بە تەنیا بەسە؟",
        answer: "بۆ حەوزێکی بچووک، حەوزی مەیگوو یان بێچووی ماسی، زۆرجار بەسە، چونکە بە نەرمی پاڵاوتنی بایۆلۆجی دەکات و بێچووەکان ڕاناکێشێت. بۆ حەوزێکی گەورەتر یان ماسییەک کە زۆر دەخوات، وەک فلتەری یاریدەدەر باشترە نەک وەک فلتەری سەرەکی.",
      },
      {
        question: "کەی ماددەی فلتەر بگۆڕم؟",
        answer: "ماددەی بایۆلۆجی ناگۆڕدرێت مەگەر ورد ببێت، چونکە بەکتریای سوودبەخش لەسەری دەژین. ئەوەی بە شێوەی خولی دەگۆڕدرێت لۆکەی میکانیکی و کاربۆنی چالاکە، و هەریەکەیان تەمەنی جیاوازی هەیە بەپێی باری حەوزەکە.",
      },
    ]),
  }),
  "التحكم بالحرارة": Object.freeze({
    heading: "گەرمکەر و گەرمیپێوی ئاکواریۆم",
    title: "گەرمکەری ئاکواریۆم و گەرمیپێو لە عێراق | AQUAVO",
    description: "گەرمکەر و گەرمیپێو بۆ حەوزی ماسی گەرمەسێری، بە نرخی دینار، دۆخی کۆگا و گەیاندن بۆ هەموو پارێزگاکانی عێراق.",
    faq: Object.freeze([
      {
        question: "چۆن توانای گونجاوی گەرمکەر هەڵبژێرم؟",
        answer: "توانا پشت بە قەبارەی ئاو و جیاوازی نێوان پلەی گەرمی ژوور و ئەو پلەیەی دەتەوێت دەبەستێت، نەک بە قەبارەی گەرمکەرەکە. ژوورێکی سارد لە زستاندا پێویستی بە توانای زیاترە لە ژوورێکی گەرم بۆ هەمان حەوز. ڕێنمایی هەڵبژاردنی گەرمکەر خشتەکە دەدات.",
      },
      {
        question: "لە هاویندا لە بەغدا پێویستم بە گەرمکەر هەیە؟",
        answer: "لە هاویندا کێشەکە زۆرجار پێچەوانەیە: ئاوەکە زیاتر لە پێویست گەرم دەبێت و ئۆکسجینی کەم دەبێتەوە. گەرمکەر لە هاویندا وەک جێگیرکەر کار دەکات نەک وەک گەرمکەرەوە، و گرنگتر ئەوەیە پلەی گەرمی بە گەرمیپێوێکی جیا بپێویت و هەواگۆڕکێی تەواو دابین بکەیت.",
      },
      {
        question: "بۆچی پێویستم بە گەرمیپێو هەیە ئەگەر گەرمکەرەکە نیشاندەری هەیە؟",
        answer: "نیشاندەری گەرمکەر ئەو ئاوە دەپێوێت کە بەر خۆی دەکەوێت، و هەمیشە ورد نییە. گەرمیپێوێکی جیا لە لای دیکەی حەوزەکە پلەی گەرمی ڕاستەقینە نیشان دەدات کە ماسییەکان تێیدا دەژین، و ئاشکرای دەکات ئەگەر گەرمکەرەکە بە کارکردن گیر بووبێت یان وەستابێت.",
      },
    ]),
  }),
  "الإضاءة": Object.freeze({
    heading: "ڕووناکی LED بۆ ئاکواریۆم",
    title: "ڕووناکی LED ئاکواریۆم بۆ ڕووەک و نمایش لە عێراق | AQUAVO",
    description: "ڕووناکی LED بۆ حەوزی ڕووەکدار و نمایشی، بە نرخی دینار، دۆخی کۆگا و گەیاندن بۆ هەموو عێراق.",
    faq: Object.freeze([
      {
        question: "ڕۆژانە چەند کاتژمێر ڕووناکی حەوزەکە هەڵبکەم؟",
        answer: "بۆ حەوزێک بێ ڕووەکی زیندوو، چەند کاتژمێرێک بۆ نمایش بەسە، و زیادکردن قەوزە دەهێنێت. بۆ حەوزێک کە ڕووەکی تێدایە، ڕووەک پێویستی بە ماوەی ڕووناکی درێژتر و جێگیر هەیە هەموو ڕۆژێک. جێگیری لە کاتدا گرنگترە لە ژمارەکە خۆی، و کاتژمێرێکی کارەبایی نیوەی کێشەکە چارەسەر دەکات.",
      },
      {
        question: "چ ڕەنگێکی ڕووناکی بۆ ئاکواریۆم گونجاوە؟",
        answer: "ڕووناکی سپی نزیک لە ڕووناکی ڕۆژ ڕەنگی ماسییەکان بە سروشتی نیشان دەدات و بۆ نمایش بەسە. ئەگەر ڕووەکی زیندووت هەیە، ڕەنگ بە تەنیا بەس نییە؛ گرنگ هێزی ڕووناکی و ئەندازەی داپۆشینی حەوزەکەیە. ڕووناکی شین بە تەنیا دیمەنە نەک خۆراک.",
      },
      {
        question: "ڕووناکی بەهێزتر واتە ڕووەکی باشتر؟",
        answer: "پێویست ناکات. ڕووناکی بەهێز بەبێ خۆراک و دووەم ئۆکسیدی کاربۆنی تەواو، قەوزە دەهێنێت پێش ئەوەی گەشە بهێنێت. بە ڕووناکی مامناوەند و کاتژمێری جێگیر دەست پێ بکە، و تەنیا زیادی بکە کاتێک ڕووەکەکان خۆیان داوای دەکەن.",
      },
    ]),
  }),
  "معالجة المياه": Object.freeze({
    heading: "لابەری کلۆر و ئامادەکەری ئاوی ئاکواریۆم",
    title: "ئامادەکەری ئاو و لابەری کلۆر بۆ ئاکواریۆم لە عێراق | AQUAVO",
    description: "ئامادەکەری ئاو، لابەری کلۆر، بەکتریای سوودبەخش و چارەسەری قەوزە بۆ حەوزی ماسی، بە نرخی دینار و گەیاندن بۆ هەموو عێراق.",
    faq: Object.freeze([
      {
        question: "پێویستە هەر جارێک ئاو دەگۆڕم لابەری کلۆر بەکاربهێنم؟",
        answer: "بەڵێ، هەر جارێک ئاوی بۆری دەخەیتە ناو حەوزەکە. کلۆر و کلۆرامین زیان بە ڕیشووی ماسی دەگەیەنن و بەکتریای سوودبەخشی ناو فلتەر دەکوژن، و کلۆرامین بە تایبەتی نافڕێت تەنانەت ئەگەر ئاوەکە چەند ڕۆژێک بەکراوەیی بهێڵیتەوە، بۆیە لابەرەکە هەڵبژاردە نییە.",
      },
      {
        question: "بەکتریای سوودبەخش سووڕی حەوزی نوێ کورت دەکاتەوە؟",
        answer: "یارمەتی خێراکردنی دەدات، بەڵام هەڵیناوەشێنێتەوە. حەوزی نوێ پێویستی بە ماوەیەکە تا بەکتریاکان لەسەر ماددەی فلتەر جێگیر بن و بە ڕاستی کار بکەن، و پشکنینی ئاو ئەوە دەڵێت کەی حەوزەکە بۆ ماسی ئامادەیە، نەک بەرواری زیادکردنی بەرهەمەکە.",
      },
      {
        question: "لابەری قەوزە کێشەی قەوزە بە یەکجاری چارەسەر دەکات؟",
        answer: "ئەوەی دیارە لادەبات، بەڵام قەوزە دوای چەند هەفتەیەک دەگەڕێتەوە ئەگەر هۆکارەکەی مابێت: ڕووناکی درێژ، خۆراکی زیاد یان نایتراتی بەرز. سەرەتا هۆکارەکە چارەسەر بکە، و لابەرەکە وەک هەنگاوێکی یاریدەدەر بەکاربهێنە نەک وەک تاکە چارەسەر، و پێش هەموو شتێک کاتژمێرەکانی ڕووناکی کەم بکەرەوە.",
      },
    ]),
  }),
  "طعام الأسماك": Object.freeze({
    heading: "خۆراکی ماسی ڕازاندنەوە",
    title: "خۆراکی ماسی ئاکواریۆم لە عێراق: دەنکە، پەڕە و ئارتیمیا | AQUAVO",
    description: "خۆراکی پەڕە، دەنکە، خۆراکی نقووم و ئارتیمیا بۆ ماسی ڕازاندنەوە، بە نرخی دینار، دۆخی کۆگا و گەیاندن بۆ هەموو عێراق.",
    faq: Object.freeze([
      {
        question: "ڕۆژانە چەند جار خۆراک بدەم بە ماسییەکان؟",
        answer: "جارێک یان دوو جار لە ڕۆژدا، بە بڕێک کە لە نزیکەی دوو خولەکدا تەواوی بکەن. خۆراکی ماوە دەچێتە بنی حەوزەکە و دەبێتە ئەمۆنیا. ڕۆژێک بێ خۆراک لە هەفتەیەکدا زیان بە ماسییەکی گەورەی ساغ ناگەیەنێت، و زیادەڕەوی زیانی زیاترە لە کەمی.",
      },
      {
        question: "دەنکە یان پەڕە؟",
        answer: "بەپێی شوێنی خواردن: پەڕە سەر ئاو دەکەوێت و بۆ ماسی سەرئاو گونجاوە، و دەنکەی نقووم دەگاتە ماسی بنەوە وەک کۆریدۆراس. حەوزی تێکەڵ زۆرجار هەردوو جۆرەکەی پێویستە تا خۆراک بگاتە هەمووان، و قەبارەی دەنکەکە دەبێت لەگەڵ دەمی ماسییەکە خۆیدا بگونجێت.",
      },
      {
        question: "ئارتیمیا و خۆراکی وشککراو بە بەستن پێویستە؟",
        answer: "ڕۆژانە پێویست نییە، بەڵام وەک جۆراوجۆری سوودی هەیە، بۆ هاندانی ماسییەک کە خۆراکی وشک ڕەت دەکاتەوە، و بۆ بێچووی ماسی لە یەکەم هەفتەکانیاندا. بنەما خۆراکی وشکی باش دەمێنێتەوە، و جۆراوجۆری جارێک یان دوو جار لە هەفتەیەکدا بۆ زۆربەی حەوزەکان بەسە.",
      },
    ]),
  }),
  "تربة وديكور": Object.freeze({
    heading: "لم و خاک و دیکۆری ئاکواریۆم",
    title: "لم و خاکی ئەکواسکەیپ و دیکۆری ئاکواریۆم لە عێراق | AQUAVO",
    description: "لم، بەردەلانک، خاکی ڕووەک، بەرد، داری ئاوی و دیکۆر بۆ ئەکواسکەیپ، بە نرخی دینار و گەیاندن بۆ هەموو عێراق.",
    faq: Object.freeze([
      {
        question: "لم یان بەردەلانک بۆ بنی حەوزەکە؟",
        answer: "لمی ورد بۆ ماسی بنەوە گونجاوە کە هەڵدەکۆڵن وەک کۆریدۆراس، و بەردەلانک پاککردنەوەی ئاسانترە و ناهێڵێت پاشماوە بچێتە ژێرەوە. ئەگەر ڕووەکی زیندووی ڕەگدارت هەیە، خاکی تایبەت بە ڕووەک لە هەردووکیان باشترە.",
      },
      {
        question: "بەردی گڕکانی تایبەتمەندی ئاو دەگۆڕێت؟",
        answer: "بەردی گڕکانی بە سروشتی خۆی بێکارە و ڕەقی ئاو بەرز ناکاتەوە، بۆیە زۆر لە ئەکواسکەیپدا بەکاردێت. ئەوەی ڕەقی و pH بەرز دەکاتەوە بەردە کلسییەکانن، بۆیە جۆری بەردەکە بزانە پێش ئەوەی دایبنێیت.",
      },
      {
        question: "بۆچی داری سروشتی ڕەنگی ئاوی حەوزەکەی گۆڕی؟",
        answer: "داری سروشتی تانین دەردەدات کە لە سەرەتادا ڕەنگی چا بە ئاوەکە دەدات، و ئەمە سروشتییە و زیانبەخش نییە، تەنانەت هەندێک ماسی حەزی لێدەکەن. خوساندن و کوڵاندن پێش دانان کەمی دەکاتەوە، و گۆڕینی ئاوی ڕێکوپێک بە هێواشی لای دەبات.",
      },
    ]),
  }),
  "التهوية والأكسجين": Object.freeze({
    heading: "پەمپی هەوا و بەردی هەوا بۆ ئاکواریۆم",
    title: "پەمپی هەوا و بەردی هەوای ئاکواریۆم لە عێراق | AQUAVO",
    description: "پەمپی هەوا، بەردی هەوا، بۆری و ڤاڵڤی نەگەڕانەوە بۆ ئۆکسجینی حەوزی ماسی، بە نرخی دینار و گەیاندن بۆ هەموو عێراق.",
    faq: Object.freeze([
      {
        question: "هەموو حەوزێک پێویستی بە پەمپی هەوا هەیە؟",
        answer: "پێویست ناکات. ئەگەر فلتەرەکە ڕووی ئاوەکە بە ڕوونی بجوڵێنێت، ئۆکسجین لە جوڵەکە خۆیەوە دەچێتە ناوەوە. پەمپەکە پێویست دەبێت لە حەوزی قەرەباڵغ، لە هاویندا کاتێک ئاوەکە گەرم دەبێت، و بۆ کارپێکردنی فلتەری ئیسفەنجی.",
      },
      {
        question: "چۆن بزانم ماسییەکان ئۆکسجینیان کەمە؟",
        answer: "ڕوونترین نیشانە ئەوەیە ماسییەکان دێنە سەر ئاو و بە زەحمەت هەناسە دەدەن، بە تایبەتی بەیانیان یان دوای ڕۆژێکی گەرم. ئەمە دۆخێکی سروشتی نییە و پێویستی بە دەستێوەردانی خێرایە: ڕووی ئاوەکە بجوڵێنە، و پلەی گەرمی کەم بکەرەوە ئەگەر بەرزە.",
      },
      {
        question: "سوودی ڤاڵڤی نەگەڕانەوە چییە؟",
        answer: "ئەگەر پەمپەکە لە ڕووی ئاو نزمتر دانرابێت و کارەبا بچێت، ئاوەکە بە بۆرییەکەدا دەگەڕێتەوە ناو پەمپەکە و تێکی دەدات و دەکرێت بەشێک لە حەوزەکە بڕژێتە سەر زەوی. ڤاڵڤەکە پارچەیەکی بچووکە لەسەر بۆرییەکە دادەنرێت و ئەمە بە تەواوی ڕادەگرێت، و چوونی کارەبا لای ئێمە دەگمەن نییە.",
      },
    ]),
  }),
  "الصيانة والتنظيف": Object.freeze({
    heading: "ئامرازی پاککردنەوە و چاودێری ئاکواریۆم",
    title: "ئامرازی پاککردنەوە و چاودێری ئاکواریۆم لە عێراق | AQUAVO",
    description: "سایفۆن، خاوێنکەرەوەی شووشە، تۆڕ و ئامرازی چاودێری بۆ حەوزی ماسی، بە نرخی دینار و گەیاندن بۆ هەموو عێراق.",
    faq: Object.freeze([
      {
        question: "چەند جار ئاوی حەوزەکە بگۆڕم؟",
        answer: "گۆڕینی بەشەکی ڕێکوپێک هەموو هەفتەیەک یان دوو هەفتە باشترە لە گۆڕینی تەواوی دەگمەن. بڕەکە پشت بە باری حەوزەکە دەبەستێت، و پشکنینی نایترات دەڵێت ئایا خشتەکە بەسە. ڕێنمایی گۆڕینی ئاو خشتەیەک بەپێی دۆخ دەدات.",
      },
      {
        question: "چۆن پاشماوە سپییەکان لە شووشەکە لابەرم؟",
        answer: "پاشماوە سپییەکان زۆرجار خوێی کلسین لە ئاوەکە خۆیەوە، کاتێک لە هێڵی ئاو هەڵدەمژرێت. بە خاوێنکەرەوە یان بە پاککەرەوەی موگناتیسی لادەبرێن، و سڕینی سەرووی هێڵی ئاو بە پارچە قوماشێکی نەم هەموو هەفتەیەک لە بنەڕەتەوە ڕێ لە کۆبوونەوەیان دەگرێت.",
      },
      {
        question: "فلتەرەکە لەگەڵ گۆڕینی ئاو پاک بکەمەوە؟",
        answer: "باشتر وایە نا، نەک لە هەمان ڕۆژدا. پاککردنەوەی فلتەر و گۆڕینی ئاو پێکەوە بەشێکی گەورە لە بەکتریای سوودبەخش بە یەکجار لادەبات. ماددەی فلتەر بە ئاوی کۆنی حەوزەکە بشۆ و لە کاتێکی جیادا ئەنجامی بدە.",
      },
    ]),
  }),
  "العزل والتفريخ": Object.freeze({
    heading: "حەوزی جیاکردنەوە و سندوقی زاوزێ",
    title: "حەوزی جیاکردنەوە و سندوقی زاوزێ بۆ ئاکواریۆم لە عێراق | AQUAVO",
    description: "حەوزی جیاکردنەوە، سندوقی جیاکردنەوە و پێداویستی زاوزێ بۆ ماسی ڕازاندنەوە، بە نرخی دینار و گەیاندن بۆ هەموو عێراق.",
    faq: Object.freeze([
      {
        question: "ماسی نوێ چەند ماوەیەک جیا بکەمەوە؟",
        answer: "لانیکەم دوو هەفتە، و درێژتر ئەگەر هەر نیشانەیەکی نەخۆشی دەرکەوت. مەبەست ئەوەیە هەر نەخۆشییەک لە حەوزی جیاکردنەوە دەربکەوێت نەک لە ناو حەوزە سەرەکییەکە، و زۆربەی نەخۆشییە باوەکان لەم ماوەیەدا خۆیان دەردەخەن.",
      },
      {
        question: "حەوزی جیاکردنەوە پێویستی بە فلتەر و گەرمکەر هەیە؟",
        answer: "بەڵێ. حەوزی جیاکردنەوە بەبێ پاڵاوتن و پلەی گەرمی جێگیر فشاری زیاتر دەخاتە سەر ماسییەکە و چاکبوونەوەی دوا دەخات لە جیاتی ئەوەی یارمەتی بدات. فلتەرێکی ئیسفەنجی بچووک و گەرمکەرێکی گونجاو بۆ قەبارەکەی بەسن، لەگەڵ گەرمیپێوێکی جیا تا لە خوێندنەوەکە دڵنیا بیت.",
      },
      {
        question: "سندوقی هەڵواسراو بۆ بێچووی ماسی بەسە؟",
        answer: "لە یەکەم ڕۆژەکاندا بێچووەکان لە خواردن دەپارێزێت، و بۆ ئەو جۆرانە بەسوودە کە بێچووی ئامادە دەخەنەوە. بۆ ژمارەی زۆر یان بەخێوکردنی درێژتر، حەوزێکی جیاکردنەوەی سەربەخۆ باشترە چونکە ئاوەکەی جێگیرترە و شوێنەکەی فراوانترە.",
      },
    ]),
  }),
  "الفحص والمراقبة": Object.freeze({
    heading: "ئامرازی پشکنینی ئاوی حەوز و چاودێری",
    title: "پشکنینی ئاوی ئاکواریۆم: کیتی پشکنین و گەرمیپێو لە عێراق | AQUAVO",
    description: "کیتی پشکنینی ئاو، شریتی پشکنین و گەرمیپێو بۆ چاودێری حەوزی ماسی، بە نرخی دینار و گەیاندن بۆ هەموو عێراق.",
    faq: Object.freeze([
      {
        question: "چی لە ئاوی حەوزەکە بپشکنم و بە چ ڕیزبەندییەک؟",
        answer: "سەرەتا ئەمۆنیا و نایترایت، چونکە کوژەری بێدەنگن و لە حەوزێکی جێگیردا دەبێت سفر بن. دوایان نایترات کە کۆدەبێتەوە و گۆڕینی ئاو کەمی دەکاتەوە، پاشان pH. ڕێنمایی پشکنینی ئاو هەر خوێندنەوەیەک و مانای ڕوون دەکاتەوە.",
      },
      {
        question: "چەند جار ئاوەکە بپشکنم؟",
        answer: "لە حەوزی نوێدا هەموو دوو یان سێ ڕۆژ جارێک تا خوێندنەوەکان جێگیر دەبن. لە حەوزی جێگیردا هەفتەی جارێک بەسە، لەگەڵ پشکنینێکی زیادە پێش زیادکردنی ماسی نوێ یان دوای هەر چارەسەرێک یان پاککردنەوەیەکی گەورە.",
      },
      {
        question: "ئاوی ڕوون واتە ئاوی ساغ؟",
        answer: "نەخێر. ئەمۆنیا و نایترایت بە چاو نابینرێن، و ئاوەکە دەکرێت بە تەواوی ڕوون بێت و هێشتا ژەهراوی بێت. ئەمە هۆکاری زۆربەی زیانەکانە لە حەوزە نوێیەکاندا، و پشکنین تاکە ڕێگەیە کە پێی دەزانیت.",
      },
    ]),
  }),
  "أحواض": Object.freeze({
    heading: "ئاکواریۆمی شووشە و حەوزی ماسی",
    title: "ئاکواریۆم بۆ فرۆشتن لە عێراق: شووشەی ئاسایی و ئەڵترا کلیر | AQUAVO",
    description: "ئاکواریۆمی شووشە و ئەڵترا کلیر بە چەند قەبارەیەک، بە نرخی دینار، دۆخی کۆگا و گەیاندن بۆ هەموو عێراق.",
    faq: Object.freeze([
      {
        question: "بە چ قەبارەیەکی حەوز دەست پێ بکەم؟",
        answer: "گەورەترین قەبارە کە شوێن و بودجەی بۆ دەتوانیت. پێچەوانەی چاوەڕوانی، حەوزی گەورەتر بۆ دەستپێکەر ئاسانترە چونکە بڕی زیاتری ئاو کاریگەری هەر هەڵەیەک کەم دەکاتەوە. حەوزی بچووک ئاوەکەی خێراتر و توندتر دەگۆڕێت.",
      },
      {
        question: "جیاوازی نێوان شووشەی ئاسایی و ئەڵترا کلیر چییە؟",
        answer: "ئەڵترا کلیر شووشەی ئاسنی کەمە، بۆیە ئەو مەیلە سەوزە نیشان نادات کە لە لێواری شووشەی ئاسایی دەیبینیت، و ڕەنگی ماسی و دیکۆر ڕوونتر و نزیکتر لە ڕاستی دەردەکەون. جیاوازییەکە تەنیا دیمەن و ڕوونییە، نەک هێزی بەرگری یان ئەستووری.",
      },
      {
        question: "لە سەرەتاوە چی لەگەڵ حەوزەکە پێویستمە؟",
        answer: "فلتەرێک کە لەگەڵ قەبارەکەی بگونجێت، گەرمکەر ئەگەر ماسییەکان گەرمەسێرین، ڕووناکی، و لابەری کلۆر بۆ یەکەم پڕکردنەوە. حەوز بە تەنیا دەستپێک نییە؛ بۆ هەر چوارەکە پێکەوە پلان دابنێ پێش کڕین، و ڕێنمایی ئامادەکردنی حەوزی نوێ بە ڕیزبەندی پێت دەڵێت.",
      },
    ]),
  }),
});

const CATEGORY_SEARCH_BY_LOCALE: Readonly<Record<Locale, Readonly<Record<string, CategorySearch>>>> = Object.freeze({
  ar: CATEGORY_SEARCH,
  en: CATEGORY_SEARCH_EN,
  ckb: CATEGORY_SEARCH_CKB,
});

/** The search presentation for a category in a locale, or undefined when it is not one of the eleven. */
export function categorySearch(category: string | null | undefined, locale: Locale = DEFAULT_LOCALE): CategorySearch | undefined {
  const canonical = canonicalProductCategory(category);
  if (!canonical) return undefined;
  return (CATEGORY_SEARCH_BY_LOCALE[locale] ?? CATEGORY_SEARCH)[canonical];
}

/** FAQPage node for a category listing in a locale, or null when the category has no questions. */
export function categoryFaqSchema(category: string | null | undefined, locale: Locale = DEFAULT_LOCALE): object | null {
  const content = categorySearch(category, locale);
  if (!content) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: content.faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

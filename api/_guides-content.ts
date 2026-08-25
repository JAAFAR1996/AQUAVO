// ─── Static, fully server-rendered educational pages (high Citability) ──────
// These pages return complete HTML from the server so every word is visible in
// View Source / to AI answer engines (ChatGPT, Claude, Perplexity) and no-JS
// crawlers — independent of the React SPA. JSON-LD is emitted with the visible
// content so Article, FAQPage, and BreadcrumbList are present in raw HTML.

export interface GuideLink {
  href: string;
  label: string;
}
export interface GuideSection {
  h2: string;
  paras: string[];
}
export interface GuideTable {
  heading: string;
  headers: string[];
  rows: string[][];
}
export interface GuideFaq {
  q: string;
  a: string;
}
export interface GuidePage {
  title: string; // <title> + og:title
  description: string; // meta description
  h1: string;
  answer: string; // 40–70 word answer box
  sections: GuideSection[];
  tables?: GuideTable[];
  faq: GuideFaq[];
  links: GuideLink[];
  cta: { text: string; href: string; label: string };
  breadcrumb: { label: string; href: string }[];
}

export const GUIDE_CONTENT_PAGES: Record<string, GuidePage> = {
  "/guides/new-aquarium-setup-iraq": {
    title: "دليل تجهيز حوض سمك جديد في العراق خطوة بخطوة | AQUAVO",
    description:
      "دليل عملي لتجهيز حوض زينة جديد في العراق: المعدات الأساسية، ترتيب التركيب، تدوير الحوض، وأخطاء البداية، مع روابط مفيدة ومهمة.",
    h1: "دليل تجهيز حوض سمك جديد في العراق خطوة بخطوة",
    answer:
      "لتجهيز حوض جديد بنجاح، جهّز المعدات الأساسية أولاً: حوض مناسب، فلتر، سخان، وإضاءة. املأ الحوض بماء معالَج بمزيل الكلور، شغّل الفلتر والسخان، وانتظر اكتمال دورة التدوير البكتيري قبل إضافة أي أسماك. هذا الترتيب يعطي ماء مستقر وآمن ويقلل المشاكل لاحقاً.",
    sections: [
      {
        h2: "المعدات الأساسية اللي تحتاجها",
        paras: [
          "قبل ما تبدأ، وفّر القطع الأساسية: حوض زجاجي بحجم مناسب، فلتر يناسب حجم الحوض، سخان مائي، إضاءة، وركيزة (حصى أو رمل)، مع مزيل كلور وأداة لتغيير الماء.",
          "كل ما كان الحوض أكبر، كان الماء أكثر استقراراً وأسهل بالصيانة. الأحواض الصغيرة جداً تتغير ظروفها بسرعة وتصير أصعب على المبتدئ.",
        ],
      },
      {
        h2: "ترتيب خطوات التركيب",
        paras: [
          "اغسل الركيزة بالماء بدون صابون، وزّعها بقاع الحوض، ثم ركّب الفلتر والسخان والإضاءة حسب تعليمات كل جهاز.",
          "املأ الحوض تدريجياً بماء معالَج بمزيل الكلور حتى لا تحرّك الركيزة، بعدها شغّل الفلتر والسخان واتركهم يشتغلون باستمرار.",
        ],
      },
      {
        h2: "تدوير الحوض قبل إضافة الأسماك",
        paras: [
          "التدوير (Cycling) يعني بناء بكتيريا نافعة داخل الفلتر تحوّل الأمونيا السامة إلى مواد أقل ضرراً، وهذي خطوة ضرورية ما تنحذف.",
          "راقب قيم الماء ولا تضيف أسماك إلا بعد ما تستقر الأمونيا والنتريت عند الصفر. إضافة الأسماك بدري هو أكثر سبب لفشل الأحواض الجديدة.",
        ],
      },
      {
        h2: "أخطاء شائعة عند التجهيز",
        paras: [
          "أبرز الأخطاء: استخدام ماء الحنفية مباشرة بدون معالجة، تشغيل الحوض بدون تدوير، واكتظاظ الحوض بأسماك كثيرة بسرعة.",
        ],
      },
    ],
    faq: [
      {
        q: "كم يحتاج الحوض الجديد قبل إضافة الأسماك؟",
        a: "عادة عدة أيام إلى أسابيع حتى تكتمل دورة التدوير. اعتمد على قياس الماء (أمونيا ونتريت = صفر) مو على عدد الأيام فقط.",
      },
      {
        q: "هل أكدر أستخدم ماء الحنفية مباشرة؟",
        a: "لا. ماء الحنفية يحتوي كلور يضر الأسماك والبكتيريا النافعة، لازم تعالجه بمزيل كلور قبل الاستخدام.",
      },
      {
        q: "شكد حجم الحوض المناسب للمبتدئ؟",
        a: "كل ما كان أكبر كان أسهل. الأحواض المتوسطة أو الكبيرة أكثر استقراراً من الصغيرة جداً وأسهل بالصيانة.",
      },
    ],
    links: [
      { href: "/products?category=tanks", label: "أحواض زجاجية وأطقم بداية" },
      { href: "/products?category=filters", label: "فلاتر الأحواض" },
      { href: "/products?category=heaters", label: "سخانات الأحواض" },
      { href: "/guides/aquarium-water-test-guide", label: "دليل فحص ماء الحوض" },
      { href: "/beginner-guide", label: "دليل المبتدئين الكامل" },
    ],
    cta: {
      text: "تقدر تتصفح الأحواض والمعدات الأساسية المتوفرة بـ AQUAVO مع توصيل لكل العراق ودفع عند الاستلام أو إلكترونياً.",
      href: "/products?category=tanks",
      label: "تصفح الأحواض والمعدات",
    },
    breadcrumb: [
      { label: "الرئيسية", href: "/" },
      { label: "تجهيز حوض جديد", href: "/guides/new-aquarium-setup-iraq" },
    ],
  },

  "/guides/aquarium-filter-guide": {
    title: "كيف تختار فلتر مناسب لحوض السمك | دليل AQUAVO",
    description:
      "دليل اختيار فلتر الحوض حسب الحجم والحاجة: فلاتر داخلية وخارجية وإسفنجية، ميديا الفلتر، ونصائح لتصفية ماء مستقرة وروابط مناسبة.",
    h1: "كيف تختار فلتر مناسب لحوض السمك",
    answer:
      "اختيار الفلتر يعتمد على حجم الحوض ونوع الأسماك. القاعدة العامة أن الفلتر يدوّر ماء الحوض عدة مرات بالساعة. للأحواض الكبيرة استخدم فلتر خارجي، للصغيرة فلتر داخلي، ولأحواض التفريخ فلتر إسفنجي. تأكد أن الفلتر يدعم التصفية الميكانيكية والبيولوجية والكيميائية.",
    sections: [
      {
        h2: "ليش الفلتر مهم",
        paras: [
          "الفلتر يحافظ على نقاء الماء ويزيل الفضلات، والأهم أنه يحتضن البكتيريا النافعة اللي تكسر الأمونيا. بدون فلتر شغّال باستمرار يصير الماء غير آمن للأسماك.",
        ],
      },
      {
        h2: "أنواع الفلاتر",
        paras: [
          "الفلاتر الداخلية: مناسبة للأحواض الصغيرة والمتوسطة وسهلة التركيب.",
          "الفلاتر الخارجية (Canister): قوة تصفية عالية للأحواض الكبيرة وأسماك تنتج فضلات كثيرة.",
          "فلاتر الإسفنج: هادئة ولطيفة، مثالية لأحواض التفريخ والأسماك الصغيرة والروبيان.",
        ],
      },
      {
        h2: "قوة الفلتر حسب حجم الحوض",
        paras: [
          "اختر فلتر قادر على تدوير حجم الحوض بالكامل عدة مرات في الساعة. الأسماك الكثيرة أو الكبيرة تحتاج تصفية أقوى.",
        ],
      },
      {
        h2: "أنواع الميديا داخل الفلتر",
        paras: [
          "الميديا الميكانيكية (إسفنج) تمسك الفضلات، والبيولوجية (سيراميك) تحتضن البكتيريا، والكيميائية (كربون نشط) تزيل الروائح واللون. الفلتر الجيد يجمع الثلاثة.",
        ],
      },
    ],
    faq: [
      {
        q: "أي فلتر أحسن للمبتدئ؟",
        a: "الفلتر الداخلي أو الإسفنجي خيار سهل للمبتدئ والأحواض الصغيرة، والأحواض الكبيرة تستفيد أكثر من الفلتر الخارجي.",
      },
      {
        q: "كم مرة أنظف الفلتر؟",
        a: "نظّف الإسفنج بماء الحوض (مو ماء الحنفية) عند انخفاض التدفق، وتجنب غسله بالكامل حتى لا تقتل البكتيريا النافعة.",
      },
      {
        q: "هل أطفّي الفلتر بالليل؟",
        a: "لا. الفلتر لازم يشتغل 24 ساعة باستمرار حتى تبقى البكتيريا النافعة حية.",
      },
    ],
    links: [
      { href: "/products?category=filters", label: "فلاتر الأحواض المتوفرة" },
      { href: "/guides/filter-choice", label: "دليل اختيار الفلتر (تفصيلي)" },
      { href: "/guides/aquarium-water-test-guide", label: "دليل فحص ماء الحوض" },
      { href: "/products?category=tanks", label: "أحواض زجاجية" },
    ],
    cta: {
      text: "تقدر تتصفح الفلاتر المتوفرة بـ AQUAVO وتختار المناسب لحجم حوضك، مع توصيل لكل العراق ودفع عند الاستلام أو إلكترونياً.",
      href: "/products?category=filters",
      label: "تصفح الفلاتر",
    },
    breadcrumb: [
      { label: "الرئيسية", href: "/" },
      { label: "اختيار الفلتر", href: "/guides/filter-choice" },
    ],
  },

  "/guides/aquarium-heater-guide": {
    title: "كيف تختار سخان (هيتر) مناسب لحجم الحوض | دليل AQUAVO",
    description:
      "دليل اختيار سخان الحوض حسب حجم الماء وحرارة الغرفة، مع نصائح التثبيت الآمن والحفاظ على حرارة مستقرة داخل حوض الزينة وروابط مرتبطة.",
    h1: "كيف تختار سخان (هيتر) مناسب لحجم الحوض",
    answer:
      "يعتمد اختيار السخان على حجم الحوض والفرق بين حرارة الغرفة والحرارة المطلوبة. القاعدة التقريبية الشائعة نحو 1 واط لكل لتر ماء، وتزيد إذا كانت الغرفة باردة. اختر سخاناً بترموستات قابل للضبط، وثبّته قرب مجرى الماء من الفلتر لتوزيع حرارة متساوٍ.",
    sections: [
      {
        h2: "ليش الحرارة الثابتة مهمة",
        paras: [
          "أغلب أسماك الزينة الاستوائية تحتاج حرارة مستقرة. التذبذب المفاجئ بالحرارة يسبب إجهاد ومرض، فالهدف ثبات الحرارة مو فقط رقمها.",
        ],
      },
      {
        h2: "كيف تحسب قوة السخان",
        paras: [
          "القاعدة العامة نحو 1 واط لكل لتر، مع زيادة إذا كانت الغرفة باردة شتاءً. الأحواض الكبيرة أحياناً تستفيد من سخانين موزّعين بدل واحد كبير.",
        ],
      },
      {
        h2: "التثبيت الصحيح",
        paras: [
          "ثبّت السخان قرب تدفق الماء (مخرج الفلتر) حتى تتوزع الحرارة، واستخدم ترمومتر منفصل لمراقبة الحرارة الحقيقية بدل الاعتماد على تدريج السخان فقط.",
        ],
      },
      {
        h2: "نصائح أمان",
        paras: [
          "لا تشغّل السخان وهو خارج الماء، وافصله عن الكهرباء قبل تغيير الماء أو إخراجه، وانتظر دقائق بعد إطفائه قبل لمسه.",
        ],
      },
    ],
    faq: [
      {
        q: "شكد حرارة مناسبة لأسماك الزينة؟",
        a: "أغلب الأسماك الاستوائية ترتاح بحرارة تقارب 24–28 مئوية، والأسماك الباردة مثل الذهبية تفضل أبرد. تحقق من نوع سمكتك.",
      },
      {
        q: "هل أحتاج سخان بالصيف؟",
        a: "غالباً نعم لتثبيت الحرارة ليلاً ومنع التذبذب، إلا إذا كانت حرارة الغرفة مستقرة ضمن المدى المطلوب.",
      },
      {
        q: "سخان واحد أو اثنين؟",
        a: "الأحواض الكبيرة تستفيد من سخانين موزّعين لحرارة أكثر تجانساً وأمان أعلى عند تعطل أحدهما.",
      },
    ],
    links: [
      { href: "/products?category=heaters", label: "سخانات الأحواض المتوفرة" },
      { href: "/guides/heater-choice", label: "دليل اختيار السخان (تفصيلي)" },
      { href: "/guides/aquarium-water-test-guide", label: "دليل فحص ماء الحوض" },
      { href: "/products?category=tanks", label: "أحواض زجاجية" },
    ],
    cta: {
      text: "تقدر تتصفح السخانات المتوفرة بـ AQUAVO وتختار الواط المناسب لحجم حوضك، مع توصيل لكل العراق ودفع عند الاستلام أو إلكترونياً.",
      href: "/products?category=heaters",
      label: "تصفح السخانات",
    },
    breadcrumb: [
      { label: "الرئيسية", href: "/" },
      { label: "اختيار السخان", href: "/guides/heater-choice" },
    ],
  },

  "/guides/aquarium-water-test-guide": {
    title: "فحص ماء الحوض: الأمونيا والنتريت والنترات وpH | دليل AQUAVO",
    description:
      "دليل فحص ماء الحوض: معنى الأمونيا والنتريت والنترات وpH، وكيف تتصرف عند ارتفاع القيم وروابط لمعالجات المياه والصيانة الدورية.",
    h1: "فحص ماء الحوض: الأمونيا والنتريت والنترات وpH",
    answer:
      "فحص الماء يكشف صحة الحوض قبل ظهور المشاكل. القيم المرجعية الشائعة: الأمونيا صفر، النتريت صفر، والنترات منخفضة قدر الإمكان. أما pH فيعتمد على نوع الأسماك وعادة يكون قريباً من المتعادل. اختبر الماء بانتظام، خصوصاً في الحوض الجديد، وغيّر جزءاً من الماء عند ارتفاع القيم.",
    sections: [
      {
        h2: "شنو تعني كل قيمة",
        paras: [
          "الأمونيا: سامة جداً وتنتج من فضلات الأسماك والطعام الزائد، والقيمة الآمنة هي صفر.",
          "النتريت: سام أيضاً وينتج خلال دورة التدوير، والقيمة الآمنة صفر.",
          "النترات: أقل سُمّية، لكن ارتفاعها يدل على حاجة لتغيير الماء.",
          "pH: درجة حموضة الماء، والأهم ثباته ضمن مدى يناسب نوع سمكتك.",
        ],
      },
      {
        h2: "متى تفحص الماء",
        paras: [
          "افحص بانتظام، وبشكل أكثر تكراراً في الحوض الجديد أو عند ملاحظة سلوك غير طبيعي على الأسماك أو تعكّر الماء.",
        ],
      },
      {
        h2: "شنو تسوي عند ارتفاع القيم",
        paras: [
          "عند ارتفاع الأمونيا أو النتريت، غيّر جزءاً من الماء فوراً، قلّل التغذية، وتأكد أن الفلتر يشتغل جيداً، ولا تعتمد على المعالجات الكيميائية وحدها.",
        ],
      },
    ],
    faq: [
      {
        q: "ليش الأمونيا خطيرة؟",
        a: "لأنها سامة حتى بكميات صغيرة وتسبب أذى للخياشيم وموت الأسماك، والقيمة الآمنة دائماً صفر.",
      },
      {
        q: "كم مرة أفحص الماء؟",
        a: "في الحوض الجديد افحص بشكل متكرر حتى يستقر، وفي الحوض المستقر يكفي فحص دوري منتظم.",
      },
      {
        q: "pH ثابت أهم أو مثالي؟",
        a: "الثبات أهم. التغيّر المفاجئ بالـ pH أخطر على الأسماك من قيمة ثابتة ضمن مدى مقبول.",
      },
    ],
    links: [
      { href: "/products?category=treatments", label: "معالجات ومحسّنات المياه" },
      { href: "/products?category=maintenance", label: "أدوات العناية والصيانة" },
      { href: "/guides/water-conditioner-guide", label: "دليل مزيل الكلور" },
      { href: "/guides/aquarium-weekly-maintenance", label: "جدول الصيانة الأسبوعي" },
    ],
    cta: {
      text: "تقدر تتصفح معالجات المياه وأدوات العناية المتوفرة بـ AQUAVO مع توصيل لكل العراق ودفع عند الاستلام أو إلكترونياً.",
      href: "/products?category=treatments",
      label: "تصفح معالجات المياه",
    },
    breadcrumb: [
      { label: "الرئيسية", href: "/" },
      { label: "فحص ماء الحوض", href: "/guides/aquarium-water-test-guide" },
    ],
  },

  "/guides/water-conditioner-guide": {
    title: "مزيل الكلور لماء الحوض ولماذا هو ضروري | دليل AQUAVO",
    description:
      "شرح أهمية مزيل الكلور لماء الحوض، كيف يحمي الأسماك والبكتيريا النافعة، ومتى تستخدمه عند الملء أو تغيير الماء وروابط للفحص.",
    h1: "مزيل الكلور لماء الحوض ولماذا هو ضروري",
    answer:
      "مزيل الكلور (Water Conditioner) يعالج ماء الحنفية ويزيل الكلور والكلورامين اللي يضران الأسماك والبكتيريا النافعة. استخدمه دائماً قبل إضافة أي ماء جديد للحوض، سواء عند التجهيز أو عند تغيير الماء الأسبوعي. بدونه، الكلور يؤذي الخياشيم والبكتيريا ويسبب مشاكل سريعة.",
    sections: [
      {
        h2: "شنو موجود بماء الحنفية",
        paras: [
          "ماء الحنفية يُعالَج بالكلور أو الكلورامين للتعقيم، وهي مواد آمنة للإنسان لكنها ضارة للأسماك والبكتيريا النافعة داخل الفلتر.",
        ],
      },
      {
        h2: "شلون يشتغل مزيل الكلور",
        paras: [
          "مزيل الكلور يحيّد الكلور والكلورامين فوراً ويجعل الماء آمناً للأسماك خلال دقائق، وبعض الأنواع تساعد أيضاً على تقليل أثر المعادن الثقيلة.",
        ],
      },
      {
        h2: "شلون تستخدمه صح",
        paras: [
          "أضف الجرعة حسب تعليمات العبوة بالنسبة لحجم الماء الجديد، قبل أو أثناء إضافته للحوض، ولا تتجاهله حتى لو كان التغيير بسيطاً.",
        ],
      },
    ],
    faq: [
      {
        q: "هل أكدر أترك الماء يومين بدل مزيل الكلور؟",
        a: "ترك الماء قد يبخّر الكلور لكنه لا يزيل الكلورامين الثابت، فمزيل الكلور أضمن وأسرع وأكثر أماناً.",
      },
      {
        q: "متى أستخدمه؟",
        a: "عند كل إضافة ماء جديد: تجهيز الحوض أول مرة، والتغيير الأسبوعي.",
      },
      {
        q: "هل يضر إذا زادت الجرعة قليلاً؟",
        a: "اتبع تعليمات العبوة؛ الالتزام بالجرعة الموصى بها هو الأأمن، ولا تبالغ بدون داعٍ.",
      },
    ],
    links: [
      { href: "/products?category=treatments", label: "مزيلات الكلور ومعالجات الماء" },
      { href: "/guides/aquarium-weekly-maintenance", label: "جدول الصيانة الأسبوعي" },
      { href: "/guides/aquarium-water-test-guide", label: "دليل فحص ماء الحوض" },
    ],
    cta: {
      text: "تقدر تتصفح مزيلات الكلور ومعالجات الماء المتوفرة بـ AQUAVO مع توصيل لكل العراق ودفع عند الاستلام أو إلكترونياً.",
      href: "/products?category=treatments",
      label: "تصفح معالجات المياه",
    },
    breadcrumb: [
      { label: "الرئيسية", href: "/" },
      { label: "مزيل الكلور", href: "/guides/water-conditioner-guide" },
    ],
  },

  "/guides/aquarium-weekly-maintenance": {
    title: "جدول صيانة أسبوعي لحوض السمك | دليل AQUAVO",
    description:
      "جدول صيانة أسبوعي لحوض الزينة: تغيير جزء من الماء، تنظيف الزجاج، فحص المعدات والقيم، وروتين يحافظ على ماء مستقر وروابط صيانة.",
    h1: "جدول صيانة أسبوعي لحوض السمك",
    answer:
      "الصيانة المنتظمة أسهل من إصلاح المشاكل. أسبوعياً: غيّر جزءاً من الماء (عادة حوالي 20–30%) بماء معالَج، نظّف الزجاج من الطحالب، وتأكد أن الفلتر والسخان يشتغلون. افحص سلوك الأسماك وكمية الطعام. هذا الروتين يحافظ على ماء مستقر وأسماك صحية.",
    sections: [
      {
        h2: "مهام أسبوعية",
        paras: [
          "غيّر نحو 20–30% من الماء بماء معالَج بمزيل الكلور وبنفس درجة الحرارة تقريباً.",
          "نظّف الزجاج الداخلي من الطحالب، وأزل بقايا الطعام والفضلات الظاهرة من الركيزة.",
          "تأكد بصرياً أن الفلتر يتدفق جيداً والسخان يحافظ على الحرارة.",
        ],
      },
      {
        h2: "مهام دورية (كل فترة)",
        paras: [
          "نظّف إسفنج الفلتر بماء الحوض عند ضعف التدفق، وافحص قيم الماء، وتفقّد التوصيلات الكهربائية والأنابيب.",
        ],
      },
      {
        h2: "نصائح تسهّل الصيانة",
        paras: [
          "لا تطعم بإفراط؛ الطعام الزائد هو أكبر مصدر تلوث، ووزّع المهام على أيام حتى ما تصير الصيانة عبء.",
        ],
      },
    ],
    faq: [
      {
        q: "كم نسبة الماء اللي أغيرها؟",
        a: "عادة نحو 20–30% أسبوعياً مناسبة لأغلب الأحواض، والأحواض المكتظة قد تحتاج أكثر.",
      },
      {
        q: "هل أنظّف الفلتر كل أسبوع؟",
        a: "نظّفه عند انخفاض التدفق وبماء الحوض فقط، مو كل أسبوع بالضرورة، حتى تحافظ على البكتيريا النافعة.",
      },
      {
        q: "هل أفرّغ الحوض بالكامل للتنظيف؟",
        a: "لا. تغيير الماء بالكامل يدمّر التوازن البكتيري ويضر الأسماك، غيّر جزءاً فقط.",
      },
    ],
    links: [
      { href: "/products?category=maintenance", label: "أدوات الصيانة والعناية" },
      { href: "/products?category=treatments", label: "معالجات المياه" },
      { href: "/guides/water-change-schedule", label: "دليل جدول تغيير الماء" },
      { href: "/guides/aquarium-water-test-guide", label: "دليل فحص ماء الحوض" },
    ],
    cta: {
      text: "تقدر تتصفح أدوات الصيانة والعناية المتوفرة بـ AQUAVO مع توصيل لكل العراق ودفع عند الاستلام أو إلكترونياً.",
      href: "/products?category=maintenance",
      label: "تصفح أدوات الصيانة",
    },
    breadcrumb: [
      { label: "الرئيسية", href: "/" },
      { label: "الصيانة الأسبوعية", href: "/guides/aquarium-weekly-maintenance" },
    ],
  },

  "/guides/beginner-aquarium-mistakes": {
    title: "أخطاء المبتدئين بأحواض الزينة وكيف تتجنبها | دليل AQUAVO",
    description:
      "أخطاء المبتدئين في أحواض الزينة: تشغيل الحوض بسرعة، الإفراط بالتغذية، الاكتظاظ، وإهمال معالجة الماء وكيف تتجنبها مع روابط مفيدة.",
    h1: "أخطاء المبتدئين بأحواض الزينة وكيف تتجنبها",
    answer:
      "أغلب مشاكل المبتدئين تنتج من أخطاء بسيطة يمكن تجنبها: إضافة الأسماك قبل تدوير الحوض، الإفراط في التغذية، اكتظاظ الحوض، واستخدام ماء غير معالَج. لو تجنبت هذي الأخطاء من البداية، راح يكون حوضك أكثر استقراراً وأسماكك أصح وأطول عمراً.",
    sections: [
      {
        h2: "1) إضافة الأسماك بدري",
        paras: [
          "إضافة الأسماك قبل اكتمال دورة التدوير يعرّضها لأمونيا سامة، فانتظر استقرار القيم قبل أي سمكة.",
        ],
      },
      {
        h2: "2) الإفراط في التغذية",
        paras: [
          "الطعام الزائد يتعفن ويلوّث الماء ويرفع الأمونيا، أطعم كمية تُستهلك خلال دقائق وأزل الزائد.",
        ],
      },
      {
        h2: "3) اكتظاظ الحوض",
        paras: [
          "أسماك كثيرة بحوض صغير يرهق الفلتر ويرفع الفضلات، ابدأ بعدد قليل وزِد تدريجياً.",
        ],
      },
      {
        h2: "4) إهمال معالجة الماء",
        paras: [
          "استخدام ماء الحنفية بدون مزيل كلور يضر الأسماك والبكتيريا، عالج الماء دائماً.",
        ],
      },
      {
        h2: "5) تغيير الماء بالكامل",
        paras: [
          "التغيير الكامل يدمّر التوازن البكتيري، غيّر جزءاً فقط بشكل منتظم.",
        ],
      },
    ],
    faq: [
      {
        q: "شنو أكبر خطأ للمبتدئ؟",
        a: "إضافة الأسماك قبل تدوير الحوض، وهو أكثر سبب لموت الأسماك بالأحواض الجديدة.",
      },
      {
        q: "ليش تموت أسماكي بسرعة؟",
        a: "غالباً بسبب ماء غير مدوّر، إفراط بالتغذية، أو اكتظاظ. افحص الماء وراجع روتينك.",
      },
      {
        q: "شلون أبدأ صح؟",
        a: "ابدأ بحوض مناسب ومعدات أساسية، عالج الماء، دوّر الحوض، وأضف أسماك قليلة تدريجياً.",
      },
    ],
    links: [
      { href: "/guides/new-aquarium-setup-iraq", label: "دليل تجهيز حوض جديد" },
      { href: "/products?category=filters", label: "فلاتر الأحواض" },
      { href: "/products?category=treatments", label: "معالجات المياه" },
      { href: "/beginner-guide", label: "دليل المبتدئين الكامل" },
    ],
    cta: {
      text: "تقدر تتصفح معدات البداية المناسبة بـ AQUAVO مع توصيل لكل العراق ودفع عند الاستلام أو إلكترونياً.",
      href: "/products?category=starter-kits",
      label: "تصفح أطقم البداية",
    },
    breadcrumb: [
      { label: "الرئيسية", href: "/" },
      { label: "أخطاء المبتدئين", href: "/guides/beginner-aquarium-mistakes" },
    ],
  },

  "/guides/aquarium-decor-stones-guide": {
    title: "دليل ديكور وأحجار أحواض الزينة في العراق | AQUAVO",
    description:
      "دليل اختيار ديكور وأحجار آمنة لأحواض الزينة في العراق: تأثير الحجر على pH، غسل الديكور، والفرق بين الطبيعي والصناعي وروابط منتجات.",
    h1: "دليل ديكور وأحجار أحواض الزينة في العراق",
    answer:
      "اختيار ديكور وأحجار الحوض لازم يكون حسب الأمان وتأثيره على الماء، مو الشكل فقط. الحجر المناسب ما يطلق مواد ضارة، وما يرفع pH بقوة إلا إذا كان هذا مطلوباً لنوع الأسماك. قبل إدخال أي حجر أو ديكور للحوض، اغسله جيداً بدون صابون وتأكد أنه مناسب لأحواض الزينة.",
    sections: [
      {
        h2: "شنو معنى ديكور آمن لحوض السمك؟",
        paras: [
          "الديكور الآمن هو الديكور المصمم أو المناسب لأحواض الزينة، وما يطلق صبغ أو معدن أو مواد تنظيف داخل الماء. الشكل مهم، بس الأمان أهم لأن أي مادة تذوب بالماء ممكن تأثر على السمك والبكتيريا النافعة.",
          "ابتعد عن أي حجر أو قطعة ديكور من مصدر مجهول إذا بيها طلاء يتقشر، رائحة كيميائية، حواف حادة، أو معدن مكشوف.",
        ],
      },
      {
        h2: "هل الحجر يغير pH؟",
        paras: [
          "نعم، بعض الأحجار ترفع pH والصلابة، خصوصاً الأحجار الكلسية مثل الحجر الجيري والرخام. هذا مو دائماً خطأ، لكنه لازم يكون قرار مقصود حسب نوع السمك وقراءات الماء.",
          "الأحجار الخاملة مثل البازلت والكوارتز والأردواز غالباً ما تغيّر pH بشكل واضح، لذلك تكون خيار أهدأ للأحواض العامة.",
        ],
      },
      {
        h2: "شلون أفحص الحجر قبل استخدامه؟",
        paras: [
          "اغسل الحجر وجففه، بعدها حط قطرة خل أبيض على سطحه. إذا صار فوران أو فقاعات واضحة، غالباً الحجر كلسي وقد يرفع pH والصلابة.",
          "اختبار الخل مؤشر سريع وليس فحصاً مختبرياً كاملاً. إذا حوضك حساس أو عندك نوع سمك يحتاج ماء محدد، افحص pH وKH بعد نقع الحجر بماء نظيف يوم أو يومين.",
        ],
      },
      {
        h2: "هل الخشب يغير لون الماء؟",
        paras: [
          "نعم، الخشب الطبيعي المخصص للأحواض ممكن يطلق تانينات وتخلي لون الماء مائل للأصفر أو البني الخفيف. هذا غالباً طبيعي، لكن قد يخفض pH بشكل بسيط حسب نوع الخشب والماء.",
          "إذا تريد تقلل اللون، انقع الخشب بماء نظيف وبدّل الماء أكثر من مرة قبل إدخاله للحوض.",
        ],
      },
      {
        h2: "شلون أغسل الديكور قبل الاستخدام؟",
        paras: [
          "اغسل الأحجار والديكور بماء نظيف فقط. لا تستخدم صابون، كلور، معقمات، عطور، أو منظفات مطبخ لأن بقاياها ممكن تضر الحوض حتى لو كانت كمية قليلة.",
          "للحصى والركائز، اشطفها أكثر من مرة إلى أن يصير الماء أوضح. للديكور الصناعي، افحص الأطراف والطلاء قبل إدخاله للحوض.",
        ],
      },
      {
        h2: "شنو منتجات AQUAVO المناسبة؟",
        paras: [
          "لصفحة الديكور، ابدأ من ديكورات وأحجار الأحواض إذا تريد شكل طبيعي أو مخابئ للسمك، ومن الركائز إذا تريد حصى أو أرضية مناسبة للحوض.",
          "إذا أنت تجهز حوض جديد، اقرأ دليل تجهيز حوض جديد ودليل فحص الماء قبل ما تضيف كمية كبيرة من الديكور أو الركائز.",
        ],
      },
    ],
    tables: [
      {
        heading: "جدول عملي لاختيار ديكور وأحجار الحوض",
        headers: ["النوع", "مناسب غالباً؟", "تأثيره على الماء", "ملاحظة مهمة"],
        rows: [
          ["بازلت أو حجر بركاني", "نعم", "غالباً خامل ولا يرفع pH بوضوح", "اغسله جيداً لأن مسامه تمسك غبار"],
          ["كوارتز أو أردواز", "نعم غالباً", "تأثيره محدود على pH", "تأكد من عدم وجود حواف حادة"],
          ["حجر نهري ناعم", "نعم بشرط الفحص", "قد يكون خامل أو كلسي حسب النوع", "افحصه بالخل قبل الاستخدام"],
          ["رخام أو حجر جيري", "حسب نوع الحوض", "يرفع pH والصلابة", "لا تستخدمه إلا إذا تحتاج ماء قلوي"],
          ["خشب مخصص للأحواض", "نعم", "قد يطلق تانينات ويخفض pH قليلاً", "انقعه قبل الاستخدام لتقليل اللون"],
          ["ديكور بلاستك مخصص للأحواض", "نعم", "غالباً لا يغير الماء", "تأكد أنه aquarium-safe ومن مصدر موثوق"],
          ["قطع معدنية أو مطلية عشوائياً", "لا", "قد تطلق معادن أو صبغ", "تجنبها داخل الحوض"],
        ],
      },
    ],
    faq: [
      {
        q: "شنو أفضل حجر آمن لحوض السمك؟",
        a: "الأحجار الخاملة مثل البازلت والكوارتز والأردواز غالباً تكون آمنة لأنها ما تغيّر pH بشكل واضح. المهم تفحص الحجر وتغسله جيداً وتتأكد ما بيه طلاء أو معدن مكشوف.",
      },
      {
        q: "هل كل حجر طبيعي يصلح للحوض؟",
        a: "لا. بعض الأحجار الطبيعية تكون كلسية وترفع pH والصلابة، وبعضها قد يحتوي معادن أو ملوثات. لا تدخل أي حجر للحوض إلا بعد الغسل والفحص.",
      },
      {
        q: "هل الحجر يرفع pH؟",
        a: "الأحجار الكلسية مثل الرخام والحجر الجيري ممكن ترفع pH والصلابة. الأحجار الخاملة مثل البازلت والكوارتز غالباً تأثيرها محدود.",
      },
      {
        q: "هل الخشب الطبيعي يغير لون الماء؟",
        a: "نعم، الخشب الطبيعي المخصص للأحواض قد يطلق تانينات وتخلي الماء أصفر أو بني خفيف. هذا غالباً طبيعي، ويمكن تقليله بالنقع وتبديل الماء قبل الاستخدام.",
      },
      {
        q: "هل أغسل الديكور بالصابون؟",
        a: "لا. الصابون والمنظفات تترك بقايا خطرة على الحوض. اغسل الديكور والأحجار بماء نظيف فقط، وكرر الشطف إذا كان بيها غبار.",
      },
      {
        q: "هل الديكور البلاستك آمن؟",
        a: "يكون آمن إذا كان مخصص لأحواض الزينة ومن مصدر موثوق. تجنب القطع البلاستيكية العشوائية أو المصبوغة إذا مو مكتوب أنها مناسبة للأحواض.",
      },
      {
        q: "شلون أعرف الديكور غير مناسب للحوض؟",
        a: "إذا بيه رائحة كيميائية، طلاء يتقشر، معدن مكشوف، حواف حادة، أو يغير لون الماء بسرعة غير طبيعية، لا تستخدمه داخل الحوض.",
      },
      {
        q: "هل AQUAVO يبيع ديكور وأحجار أحواض الزينة في العراق؟",
        a: "نعم، AQUAVO يبيع مستلزمات أحواض الزينة في العراق، وتشمل الديكورات والركائز حسب المتوفر بالموقع. تقدر تشوف التفاصيل من صفحات المنتجات.",
      },
    ],
    links: [
      { href: "/products?category=decorations", label: "ديكورات أحواض الزينة" },
      { href: "/products?category=substrates", label: "ركائز وحصى الأحواض" },
      { href: "/guides/aquarium-water-test-guide", label: "دليل فحص ماء الحوض" },
      { href: "/guides/new-aquarium-setup-iraq", label: "دليل تجهيز حوض جديد" },
      { href: "/guides", label: "كل أدلة AQUAVO" },
    ],
    cta: {
      text: "تقدر تشوف الديكورات والركائز المتوفرة على AQUAVO، وإذا متردد اختار حسب حجم الحوض ونوع السمك وقراءات الماء.",
      href: "/products?category=decorations",
      label: "شوف ديكورات الأحواض",
    },
    breadcrumb: [
      { label: "الرئيسية", href: "/" },
      { label: "ديكور وأحجار الحوض", href: "/guides/aquarium-decor-stones-guide" },
    ],
  },

  "/about-aquavo": {
    title: "من هو AQUAVO؟ متجر معدات أحواض الزينة في العراق",
    description:
      "AQUAVO متجر إلكتروني عراقي متخصص بمعدات ومستلزمات أحواض الزينة فقط، مع توصيل لكل العراق ودفع عند الاستلام أو إلكترونياً، ولا يبيع كائنات حية.",
    h1: "من هو AQUAVO؟ وماذا يبيع؟",
    answer:
      "AQUAVO متجر إلكتروني عراقي متخصص في معدات ومستلزمات أحواض الزينة فقط: فلاتر، سخانات، أغذية، إضاءة، ديكورات، ومعالجات مياه. لا نبيع أسماكاً حية ولا كائنات حية ولا نباتات حية. نخدم كل المحافظات العراقية بتوصيل خلال 24 ساعة، برسوم ثابتة 5,000 دينار، والدفع عند الاستلام أو إلكترونياً.",
    sections: [
      {
        h2: "شنو يبيع AQUAVO",
        paras: [
          "نوفّر معدات ومستلزمات الأحواض: أحواض زجاجية، فلاتر، سخانات، إضاءة LED، أغذية، معالجات مياه، ديكورات ونباتات صناعية، ركائز، مضخات هواء، وأدوات صيانة.",
        ],
      },
      {
        h2: "شنو ما يبيع AQUAVO",
        paras: [
          "AQUAVO لا يبيع أسماكاً حية ولا أي كائنات حية ولا نباتات حية. صفحاتنا التعليمية تشرح العناية فقط، وهي مراجع معرفية مو صفحات بيع كائنات.",
        ],
      },
      {
        h2: "التوصيل والدفع",
        paras: [
          "التوصيل لكل المحافظات العراقية خلال 24 ساعة برسوم ثابتة 5,000 دينار عراقي، والدفع عند الاستلام أو إلكترونياً. إذا اخترت الدفع عند الاستلام وكان فحص الطلب متاحاً عند التسليم، يكون الفحص قبل تسديد مبلغ COD.",
        ],
      },
      {
        h2: "الدعم",
        paras: [
          "نوفّر دعماً فنياً لمساعدتك باختيار وتركيب المعدات المناسبة لحوضك.",
        ],
      },
    ],
    faq: [
      {
        q: "هل AQUAVO يبيع أسماك حية؟",
        a: "لا. AQUAVO متخصص بمعدات ومستلزمات الأحواض فقط، ولا يبيع أسماكاً أو كائنات أو نباتات حية.",
      },
      {
        q: "شلون أدفع؟",
        a: "تگدر تختار الدفع عند الاستلام أو إلكترونياً. فحص الطلب قبل التسديد يخص طلبات COD فقط إذا كان متاحاً عند التسليم.",
      },
      {
        q: "وين يوصل AQUAVO؟",
        a: "لكل المحافظات العراقية الثماني عشرة، بتوصيل خلال 24 ساعة ورسوم ثابتة 5,000 دينار.",
      },
    ],
    links: [
      { href: "/products", label: "كل المنتجات" },
      { href: "/products?category=filters", label: "فلاتر الأحواض" },
      { href: "/faq", label: "الأسئلة الشائعة" },
      { href: "/shipping", label: "معلومات التوصيل" },
    ],
    cta: {
      text: "تقدر تتصفح كل المنتجات المتوفرة بـ AQUAVO مع توصيل لكل العراق ودفع عند الاستلام أو إلكترونياً.",
      href: "/products",
      label: "تصفح المنتجات",
    },
    breadcrumb: [
      { label: "الرئيسية", href: "/" },
      { label: "من نحن", href: "/about-aquavo" },
    ],
  },
};

// Minimal HTML-escape for text nodes/attributes (content is authored/trusted,
// but escape anyway to stay safe and produce valid markup).
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function safeJsonForScript(data: object): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function renderJsonLdScripts(items: object[]): string {
  return items
    .map((item) => `<script type="application/ld+json">${safeJsonForScript(item)}</script>`)
    .join("\n");
}

function buildBreadcrumbItems(path: string, page: GuidePage, base: string): object[] {
  const currentName = page.breadcrumb.at(-1)?.label ?? page.h1;
  if (path === "/guides") {
    return [
      { "@type": "ListItem", position: 1, name: "الرئيسية", item: base },
      { "@type": "ListItem", position: 2, name: "الأدلة", item: `${base}/guides` },
    ];
  }
  if (path.startsWith("/guides/")) {
    return [
      { "@type": "ListItem", position: 1, name: "الرئيسية", item: base },
      { "@type": "ListItem", position: 2, name: "الأدلة", item: `${base}/guides` },
      { "@type": "ListItem", position: 3, name: currentName, item: `${base}${path}` },
    ];
  }
  return page.breadcrumb.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.label,
    item: `${base}${item.href === "/" ? "" : item.href}`,
  }));
}

function buildGuideJsonLd(path: string, page: GuidePage, base: string, image: string): object[] {
  const url = `${base}${path}`;
  return [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: page.h1,
      description: page.description,
      image,
      author: { "@type": "Organization", name: "AQUAVO", url: base },
      publisher: {
        "@type": "Organization",
        name: "AQUAVO",
        url: base,
        logo: { "@type": "ImageObject", url: image },
      },
      datePublished: "2026-06-29",
      dateModified: "2026-06-29",
      inLanguage: "ar-IQ",
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: page.faq.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: buildBreadcrumbItems(path, page, base),
    },
  ];
}

// Theme bootstrap — identical logic to client/index.html so a returning
// visitor's saved choice (and the first-visit default) is shared between the
// React app and these server-rendered guide pages (no flash, no dark-only).
const THEME_BOOTSTRAP = `(function(){try{var t=localStorage.getItem('theme');var r;if(t==='dark')r='dark';else if(t==='light')r='light';else if(t==='system')r=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';else r='dark';var e=document.documentElement;e.classList.remove('dark','light');e.classList.add(r);}catch(e){document.documentElement.classList.add('dark');}})();`;

// Functional theme toggle (persists to the same 'theme' key the SPA reads).
const THEME_TOGGLE_SCRIPT = `(function(){var b=document.getElementById('aqv-theme-toggle');if(!b)return;b.addEventListener('click',function(){var e=document.documentElement;var d=e.classList.contains('dark');e.classList.remove('dark','light');e.classList.add(d?'light':'dark');try{localStorage.setItem('theme',d?'light':'dark');}catch(x){}});})();`;

const PAGE_CSS = `@view-transition{navigation:auto}
@media (prefers-reduced-motion: reduce){@view-transition{navigation:none}}
:root{--bg:#F6F4EF;--card:#ffffff;--fg:#0B1E28;--muted:#5c6b73;--primary:#0B93A6;--accent:#0B64A6;--line:rgba(11,30,40,.12);--header-bg:rgba(246,244,239,.92);--answer-bg:rgba(11,147,166,.06);--th-bg:rgba(11,147,166,.10);--btn-fg:#ffffff}
html.dark{--bg:#0B1E28;--card:#0f1f38;--fg:#eaf2f7;--muted:#b6c6d6;--line:rgba(255,255,255,.10);--header-bg:rgba(11,30,40,.92);--answer-bg:rgba(11,147,166,.14);--th-bg:rgba(11,147,166,.18);--btn-fg:#04222a}
*{box-sizing:border-box}html,body{margin:0;padding:0}
body{background:var(--bg);color:var(--fg);font-family:'Cairo',system-ui,-apple-system,'Segoe UI',Tahoma,sans-serif;line-height:1.85;font-size:17px;-webkit-font-smoothing:antialiased}
a{color:var(--primary);text-decoration:none}a:hover{text-decoration:underline}
header.site{position:sticky;top:0;z-index:50;display:flex;align-items:center;gap:12px;padding:10px 18px;border-bottom:1px solid var(--line);background:var(--header-bg);backdrop-filter:blur(10px);view-transition-name:aqv-site-header}
header.site .brand{display:inline-flex;align-items:center;flex-shrink:0}
header.site .brand img{height:32px;width:auto;max-width:150px;display:block;object-fit:contain}
header.site nav.main{display:none;gap:2px;margin-inline-start:8px}
header.site nav.main a{padding:8px 12px;border-radius:8px;color:var(--fg);opacity:.68;font-size:14px;font-weight:600}
header.site nav.main a:hover{opacity:1;text-decoration:none}
header.site nav.main a.active{opacity:1;color:var(--primary)}
header.site .controls{margin-inline-start:auto;display:flex;align-items:center;gap:2px}
header.site .controls a,header.site .controls button{display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:999px;color:var(--fg);background:transparent;border:0;cursor:pointer;opacity:.8}
header.site .controls a:hover,header.site .controls button:hover{opacity:1;background:color-mix(in srgb,var(--fg) 8%,transparent)}
header.site svg{width:20px;height:20px}
.icon-sun{display:none}html.dark .icon-moon{display:none}html.dark .icon-sun{display:inline}
@media(min-width:900px){header.site nav.main{display:flex}}
.wrap{max-width:760px;margin:0 auto;padding:22px 18px 72px}
nav.crumb{font-size:14px;color:var(--muted);margin:10px 0 6px}nav.crumb a{color:var(--muted)}nav.crumb a:hover{color:var(--primary)}
h1{font-family:'Changa','Cairo',sans-serif;font-weight:700;font-size:clamp(2rem,6vw,2.6rem);line-height:1.2;margin:.25em 0 .5em;color:var(--fg);letter-spacing:-.01em}
h2{font-family:'Cairo',sans-serif;font-weight:700;font-size:1.4rem;margin:1.7em 0 .4em;color:var(--fg)}
h3{font-weight:700;font-size:1.1rem;margin:1.15em 0 .3em;color:var(--fg)}
p{margin:.55em 0;color:var(--fg)}
.answer{background:var(--answer-bg);border:1px solid var(--line);border-inline-start:4px solid var(--primary);border-radius:12px;padding:16px 18px;margin:10px 0 8px;font-size:1.05rem}
.answer strong{color:var(--primary)}
table{width:100%;border-collapse:collapse;margin:.9em 0 1.4em;background:var(--card);border:1px solid var(--line);border-radius:12px;overflow:hidden}
th,td{border:1px solid var(--line);padding:10px 12px;text-align:right;vertical-align:top}
th{background:var(--th-bg);font-weight:800;color:var(--fg)}
td{color:var(--fg)}
ul.links{list-style:none;padding:0;margin:.4em 0}
ul.links li{margin:.35em 0}ul.links li a{font-weight:600}
.faq h3{border-top:1px solid var(--line);padding-top:.85em}
ul.guide-index{list-style:none;padding:0;margin:1.1em 0;display:grid;gap:14px}
@media(min-width:640px){ul.guide-index{grid-template-columns:1fr 1fr}}
ul.guide-index li{margin:0}
ul.guide-index a.card{display:block;height:100%;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px 18px;color:var(--fg)}
ul.guide-index a.card:hover{border-color:var(--primary);box-shadow:0 6px 20px rgba(11,147,166,.10);text-decoration:none}
ul.guide-index a.card:focus-visible{outline:2px solid var(--primary);outline-offset:2px}
ul.guide-index .t{display:block;font-weight:700;font-size:1.08rem;color:var(--fg);margin-bottom:.25em}
ul.guide-index .t::after{content:"\\2190";margin-inline-start:.4em;color:var(--primary);font-weight:700}
ul.guide-index p{margin:0;color:var(--muted);font-size:.95rem;line-height:1.7}
.cta{margin-top:2.2em;background:linear-gradient(135deg,rgba(11,147,166,.12),rgba(11,100,166,.08));border:1px solid var(--line);border-radius:16px;padding:20px}
.cta a.btn{display:inline-block;margin-top:.6em;background:var(--primary);color:var(--btn-fg);padding:11px 20px;border-radius:12px;font-weight:800}
.cta a.btn:hover{text-decoration:none;background:var(--accent);color:#fff}
footer.site{border-top:1px solid var(--line);margin-top:48px;background:var(--card)}
footer.site .fwrap{max-width:760px;margin:0 auto;padding:26px 18px;color:var(--muted);font-size:14px}
footer.site a{color:var(--muted)}footer.site a:hover{color:var(--primary)}
footer.site .fnav{margin-top:.6em;display:flex;flex-wrap:wrap;gap:.35em 1em}`;

// Shared production-matching header (real logo asset + nav + controls + theme
// toggle). Rendered as static HTML so no-JS crawlers still see full branding;
// the theme toggle + cart/account links point to the real SPA routes.
const SITE_HEADER = `<header class="site">
  <a class="brand" href="/" aria-label="AQUAVO — الصفحة الرئيسية"><img src="/brand/aquavo-v2-horizontal.svg" alt="AQUAVO" width="180" height="50" /></a>
  <nav class="main" aria-label="التنقل الرئيسي">
    <a href="/products">المتجر</a>
    <a href="/tank-builder">اختار المناسب</a>
    <a href="/guides" class="active" aria-current="page">أدلة AQUAVO</a>
    <a href="/about">منو AQUAVO</a>
  </nav>
  <div class="controls">
    <a href="/search" aria-label="البحث عن منتج"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg></a>
    <a href="/wishlist" aria-label="المفضلة"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"/></svg></a>
    <a href="/login" aria-label="الحساب"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/></svg></a>
    <a href="/cart" aria-label="سلة المشتريات"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="20" r="1.6"/><circle cx="18" cy="20" r="1.6"/><path d="M2 3h3l2.4 12.4a1.6 1.6 0 0 0 1.6 1.3h8.4a1.6 1.6 0 0 0 1.6-1.3L22 7H6"/></svg></a>
    <button id="aqv-theme-toggle" type="button" aria-label="تبديل المظهر">
      <svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3 6.6 6.6 0 0 0 21 12.8Z"/></svg>
      <svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19"/></svg>
    </button>
  </div>
</header>`;

// Shared production-matching footer.
const SITE_FOOTER = `<footer class="site"><div class="fwrap">
  <p>AQUAVO — متجر معدات ومستلزمات أحواض الزينة في العراق. توصيل لكل المحافظات، دفع عند الاستلام أو إلكترونياً. لا نبيع كائنات حية.</p>
  <nav class="fnav" aria-label="روابط الموقع">
    <a href="/">الرئيسية</a><a href="/products">المتجر</a><a href="/guides">الأدلة</a><a href="/shipping">التوصيل</a><a href="/faq">الأسئلة الشائعة</a><a href="/about">من نحن</a>
  </nav>
</div></footer>`;

function renderLinks(links: GuideLink[], base: string): string {
  return (
    `<ul class="links">` +
    links.map((l) => `<li><a href="${esc(l.href)}">${esc(l.label)}</a></li>`).join("") +
    `</ul>`
  );
}

export function renderGuideHtml(path: string, page: GuidePage, base: string, image: string): string {
  const url = `${base}${path}`;
  const jsonLd = renderJsonLdScripts(buildGuideJsonLd(path, page, base, image));
  const crumb = page.breadcrumb
    .map((c, i) =>
      i === page.breadcrumb.length - 1
        ? `<span>${esc(c.label)}</span>`
        : `<a href="${esc(c.href)}">${esc(c.label)}</a> / `
    )
    .join("");

  const sections = page.sections
    .map(
      (s) =>
        `<h2>${esc(s.h2)}</h2>` + s.paras.map((p) => `<p>${esc(p)}</p>`).join("")
    )
    .join("\n");

  const tables = (page.tables ?? [])
    .map(
      (table) =>
        `<h2>${esc(table.heading)}</h2><table><thead><tr>${table.headers
          .map((header) => `<th>${esc(header)}</th>`)
          .join("")}</tr></thead><tbody>${table.rows
          .map((row) => `<tr>${row.map((cell) => `<td>${esc(cell)}</td>`).join("")}</tr>`)
          .join("")}</tbody></table>`
    )
    .join("\n");

  const faq =
    `<section class="faq"><h2>أسئلة شائعة</h2>` +
    page.faq.map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join("") +
    `</section>`;

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<script>${THEME_BOOTSTRAP}</script>
<title>${esc(page.title)}</title>
<meta name="description" content="${esc(page.description)}" />
<link rel="canonical" href="${esc(url)}" />
<meta name="robots" content="index, follow, max-image-preview:large" />
<meta property="og:title" content="${esc(page.title)}" />
<meta property="og:description" content="${esc(page.description)}" />
<meta property="og:type" content="article" />
<meta property="og:url" content="${esc(url)}" />
<meta property="og:site_name" content="AQUAVO" />
<meta property="og:locale" content="ar_IQ" />
<meta property="og:image" content="${esc(image)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(page.title)}" />
<meta name="twitter:description" content="${esc(page.description)}" />
<meta name="twitter:image" content="${esc(image)}" />
<link rel="icon" type="image/png" sizes="512x512" href="/brand/aquavo-v2-favicon.png" />
<meta name="theme-color" content="#0B93A6" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&family=Changa:wght@600;700&family=Inter:wght@400;500;600;700&display=swap" />
${jsonLd}
<style>${PAGE_CSS}</style>
</head>
<body>
${SITE_HEADER}
<div class="wrap">
  <nav class="crumb">${crumb}</nav>
  <h1>${esc(page.h1)}</h1>
  <div class="answer"><strong>الخلاصة السريعة:</strong> ${esc(page.answer)}</div>
  ${sections}
  ${tables}
  ${faq}
  <h2>روابط مفيدة</h2>
  ${renderLinks(page.links, base)}
  <div class="cta">
    <p>${esc(page.cta.text)}</p>
    <a class="btn" href="${esc(page.cta.href)}">${esc(page.cta.label)}</a>
  </div>
</div>
${SITE_FOOTER}
<script>${THEME_TOGGLE_SCRIPT}</script>
</body>
</html>`;
}

// Plain-markdown variant for AI agents that request Accept: text/markdown.
export function renderGuideMarkdown(path: string, page: GuidePage, base: string): string {
  const lines: string[] = [];
  lines.push(`# ${page.h1}\n`);
  lines.push(`${page.answer}\n`);
  for (const s of page.sections) {
    lines.push(`## ${s.h2}\n`);
    for (const p of s.paras) lines.push(`${p}\n`);
  }
  for (const table of page.tables ?? []) {
    lines.push(`## ${table.heading}\n`);
    lines.push(`| ${table.headers.join(" | ")} |`);
    lines.push(`| ${table.headers.map(() => "---").join(" | ")} |`);
    for (const row of table.rows) lines.push(`| ${row.join(" | ")} |`);
    lines.push("");
  }
  lines.push(`## أسئلة شائعة\n`);
  for (const f of page.faq) {
    lines.push(`### ${f.q}`);
    lines.push(`${f.a}\n`);
  }
  lines.push(`## روابط مفيدة\n`);
  for (const l of page.links) lines.push(`- [${l.label}](${base}${l.href})`);
  lines.push(`\n${page.cta.text}\n`);
  lines.push(`**URL:** ${base}${path}`);
  return lines.join("\n");
}

// ─── Index of the educational pages (shared by /guides + homepage section) ───
export interface GuideIndexItem {
  href: string;
  label: string;
  blurb: string;
}
export const GUIDE_INDEX_ITEMS: GuideIndexItem[] = [
  { href: "/guides/new-aquarium-setup-iraq", label: "تجهيز حوض زينة جديد في العراق", blurb: "خطوات ترتيب المعدات وملء الحوض وتدوير الماء قبل إضافة الأسماك." },
  { href: "/guides/filter-choice", label: "كيف تختار فلتر مناسب", blurb: "أنواع الفلاتر والقوة المناسبة حسب حجم الحوض وطبيعة الاستخدام." },
  { href: "/guides/heater-choice", label: "كيف تختار سخان (هيتر)", blurb: "حساب الواط المناسب لحجم الحوض والتثبيت الآمن لثبات الحرارة." },
  { href: "/guides/aquarium-water-test-guide", label: "فحص ماء الحوض", blurb: "معنى الأمونيا والنتريت والنترات وpH وكيف تتصرف عند ارتفاعها." },
  { href: "/guides/water-conditioner-guide", label: "مزيل الكلور وأهميته", blurb: "ليش معالجة ماء الحنفية ضرورية قبل إضافته للحوض." },
  { href: "/guides/aquarium-weekly-maintenance", label: "جدول صيانة أسبوعي", blurb: "مهام بسيطة أسبوعية تحافظ على ماء مستقر وأسماك صحية." },
  { href: "/guides/beginner-aquarium-mistakes", label: "أخطاء المبتدئين", blurb: "أكثر أخطاء المبتدئين شيوعاً وكيف تتجنبها من البداية." },
  { href: "/guides/aquarium-decor-stones-guide", label: "ديكور وأحجار أحواض الزينة", blurb: "دليل لاختيار الأحجار والديكور الآمن للحوض وتأثيره على الماء." },
  { href: "/guides/filter-choice", label: "اختيار فلتر الحوض", blurb: "شرح سريع لاختيار نوع الفلتر المناسب للحوض وحجم الماء." },
  { href: "/guides/heater-choice", label: "اختيار سخان الحوض", blurb: "حساب تقريبي لقوة السخان وتجنب تذبذب الحرارة." },
  { href: "/guides/water-change-schedule", label: "جدول تغيير الماء", blurb: "متى تغير الماء وكم النسبة حسب استقرار الحوض." },
  { href: "/guides/feeding-table", label: "جدول التغذية", blurb: "تنظيم كمية الطعام لتقليل الفضلات ومشاكل الماء." },
  { href: "/guides/quarantine", label: "الحجر الصحي", blurb: "مراقبة الأسماك الجديدة قبل إدخالها للحوض الرئيسي." },
  { href: "/guides/algae-control", label: "السيطرة على الطحالب", blurb: "أسباب الطحالب وكيف تقللها بالإضاءة والصيانة." },
  { href: "/guides/aquarium-salt", label: "ملح الحوض", blurb: "متى يستخدم الملح ومتى يكون غير مناسب." },
  { href: "/guides/white-scale", label: "إزالة الكلس الأبيض", blurb: "تنظيف ترسبات الزجاج بدون صابون أو خدش." },
  { href: "/guides/5-mistakes", label: "5 أخطاء شائعة", blurb: "أخطاء البداية التي تسبب مشاكل في الأسابيع الأولى." },
  { href: "/guides/essential-tools", label: "أدوات الحوض الأساسية", blurb: "الأدوات التي تسهّل الصيانة والفحص والتنظيف." },
  { href: "/guides/filter-media", label: "ميديا الفلتر", blurb: "دور الإسفنج والسيراميك والكربون داخل الفلتر." },
  { href: "/guides/eco-friendly", label: "حوض صديق للبيئة", blurb: "تقليل الهدر في الماء والطاقة عبر روتين صحيح." },
  { href: "/guides/fish-hiding", label: "اختباء الأسماك", blurb: "تمييز السلوك الطبيعي عن علامات الإجهاد أو المرض." },
  { href: "/guides/happy-fish-signs", label: "علامات صحة الأسماك", blurb: "مؤشرات الشهية والحركة والتنفس داخل الحوض." },
  { href: "/guides/temperature-guide", label: "درجة حرارة الحوض", blurb: "ثبات الحرارة ودور السخان والترمومتر." },
  { href: "/guides/treatment-basics", label: "أساسيات العلاج", blurb: "خطوات الفحص والعزل قبل استخدام أي معالجة." },
  { href: "/guides/water-myths", label: "خرافات ماء الحوض", blurb: "تصحيح أفكار شائعة عن جودة الماء والتغيير." },
  { href: "/guides/tank-rescue-plan", label: "خطة إنقاذ الحوض", blurb: "خطوات طوارئ عند تدهور الماء أو ظهور أعراض خطرة." },
  { href: "/about-aquavo", label: "من هو AQUAVO؟", blurb: "متجر معدات أحواض الزينة في العراق — ماذا يبيع وماذا لا يبيع." },
];

const HOME_FAQ: GuideFaq[] = [
  { q: "هل AQUAVO يبيع أسماك حية؟", a: "لا نبيع أسماك حية. AQUAVO متخصص بمعدات ومستلزمات الأحواض فقط، ولا يبيع كائنات حية ولا نباتات حية." },
  { q: "شنو يبيع AQUAVO؟", a: "يبيع مستلزمات ومعدات أحواض الزينة: فلاتر، سخانات، أغذية، إضاءة، ديكورات، معالجات مياه، أحواض، وأدوات صيانة." },
  { q: "هل توجد أدلة للمبتدئين؟", a: "نعم، عندنا أدلة تعليمية مثل تجهيز حوض جديد وأخطاء المبتدئين، إضافة لدليل المبتدئين الكامل." },
  { q: "كيف أختار منتجات الحوض؟", a: "استعن بأدلتنا لاختيار الفلتر والسخان حسب حجم الحوض، وافحص ماء الحوض بانتظام قبل وبعد أي تغيير." },
  { q: "هل التوصيل داخل العراق؟", a: "نعم، التوصيل لكل المحافظات العراقية خلال 24 ساعة برسوم ثابتة 5,000 دينار ودفع عند الاستلام أو إلكترونياً." },
];

const HOME_SECTION_CSS = `#aquavo-guides{background:#0B1E28;color:#dbe7f0;border-top:1px solid rgba(255,255,255,.10);font-family:'Cairo',system-ui,-apple-system,'Segoe UI',Tahoma,sans-serif;direction:rtl;text-align:right;line-height:1.85}
#aquavo-guides .ag-wrap{max-width:1100px;margin:0 auto;padding:42px 18px 56px}
#aquavo-guides h2{font-family:'Cairo',sans-serif;font-weight:700;font-size:1.5rem;color:#fff;margin:0 0 .5em}
#aquavo-guides .ag-intro{color:#c7d6e3;margin:.2em 0 1em}
#aquavo-guides .ag-answer{background:#0f1f38;border:1px solid rgba(255,255,255,.10);border-inline-start:4px solid #0B93A6;border-radius:12px;padding:14px 16px;margin:0 0 1.4em;color:#eef5fa}
#aquavo-guides .ag-answer strong{color:#0B93A6}
#aquavo-guides .ag-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;margin:0 0 1.6em}
#aquavo-guides .ag-grid a{display:block;background:#0f1f38;border:1px solid rgba(255,255,255,.10);border-radius:12px;padding:14px 16px;text-decoration:none;transition:border-color .2s}
#aquavo-guides .ag-grid a:hover{border-color:#0B93A6}
#aquavo-guides .ag-grid strong{display:block;color:#fff;font-size:1.05rem;margin-bottom:.25em}
#aquavo-guides .ag-grid span{display:block;color:#b6c6d6;font-size:.92rem}
#aquavo-guides .ag-faq h3{font-weight:700;color:#eaf2f7;font-size:1.05rem;margin:1.1em 0 .25em;border-top:1px solid rgba(255,255,255,.08);padding-top:.9em}
#aquavo-guides .ag-faq p{color:#c7d6e3;margin:.2em 0}
#aquavo-guides .ag-more{margin-top:1.6em;font-size:.95rem}
#aquavo-guides .ag-more a{color:#56c6dd;font-weight:600;text-decoration:none}
#aquavo-guides .ag-more a:hover{text-decoration:underline}`;

// Visible, crawlable "AQUAVO Guides" + FAQ section injected at the bottom of the
// homepage (after #root). Real text in View Source — no clip / aria-hidden.
export function renderHomeGuidesSection(base: string): string {
  const cards = GUIDE_INDEX_ITEMS.map(
    (g) =>
      `<a href="${esc(g.href)}"><strong>${esc(g.label)}</strong><span>${esc(g.blurb)}</span></a>`
  ).join("");
  const faq = HOME_FAQ.map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join("");
  return `<section id="aquavo-guides" data-ssr-seo>
<style>${HOME_SECTION_CSS}</style>
<div class="ag-wrap">
<h2>أدلة AQUAVO لأحواض الزينة</h2>
<p class="ag-intro">AQUAVO مصدر تعليمي عراقي لهواة أحواض الزينة. أدلتنا تشرح تجهيز الحوض واختيار المعدات والعناية بالماء بأسلوب عملي وواقعي، وكلها مفتوحة ومجانية.</p>
<div class="ag-answer"><strong>من هو AQUAVO؟</strong> AQUAVO متجر إلكتروني عراقي يبيع مستلزمات ومعدات أحواض الزينة فقط — فلاتر، سخانات، أغذية، إضاءة، ديكورات ومعالجات مياه. لا نبيع أسماك حية ولا كائنات أو نباتات حية. التوصيل لكل العراق خلال 24 ساعة والدفع عند الاستلام أو إلكترونياً.</div>
<div class="ag-grid">${cards}</div>
<h2>أسئلة شائعة</h2>
<div class="ag-faq">${faq}</div>
<p class="ag-more"><a href="/guides">أدلة AQUAVO للمبتدئين</a> · <a href="/products">تصفح المنتجات</a> · <a href="/about-aquavo">من نحن</a></p>
</div>
</section>`;
}

const IMPORTANT_INTERNAL_LINK_GROUPS = [
  {
    heading: "أدلة أحواض الزينة",
    links: [
      { href: "/guides", label: "كل الأدلة" },
      { href: "/guides/new-aquarium-setup-iraq", label: "تجهيز حوض جديد" },
      { href: "/guides/filter-choice", label: "اختيار الفلتر" },
      { href: "/guides/heater-choice", label: "اختيار السخان" },
      { href: "/guides/aquarium-water-test-guide", label: "فحص ماء الحوض" },
      { href: "/guides/aquarium-decor-stones-guide", label: "ديكور وأحجار الحوض" },
      { href: "/guides/filter-media", label: "ميديا الفلتر" },
      { href: "/guides/water-change-schedule", label: "تغيير الماء" },
      { href: "/guides/5-mistakes", label: "5 أخطاء شائعة" },
      { href: "/guides/tank-rescue-plan", label: "خطة إنقاذ الحوض" },
      { href: "/guides/quarantine", label: "الحجر الصحي" },
      { href: "/guides/treatment-basics", label: "أساسيات العلاج" },
      { href: "/guides/white-scale", label: "إزالة الكلس" },
      { href: "/guides/water-myths", label: "خرافات الماء" },
      { href: "/guides/feeding-table", label: "جدول التغذية" },
      { href: "/guides/algae-control", label: "السيطرة على الطحالب" },
      { href: "/guides/aquarium-salt", label: "ملح الحوض" },
      { href: "/guides/temperature-guide", label: "درجة الحرارة" },
      { href: "/guides/fish-hiding", label: "اختباء الأسماك" },
      { href: "/guides/happy-fish-signs", label: "علامات الصحة" },
      { href: "/guides/essential-tools", label: "أدوات أساسية" },
      { href: "/guides/eco-friendly", label: "حوض صديق للبيئة" },
    ],
  },
  {
    heading: "أدوات AQUAVO",
    links: [
      { href: "/calculators", label: "حاسبات الحوض" },
      { href: "/aquarium-wizard", label: "مساعد تجهيز الحوض" },
      { href: "/tank-builder", label: "مصمم الحوض" },
      { href: "/fish-finder", label: "اختيار السمك المناسب" },
      { href: "/fish-compatibility", label: "توافق الأسماك" },
      { href: "/fish-health", label: "تشخيص مشاكل الأسماك" },
      { href: "/ai-tools", label: "أدوات تعليمية" },
    ],
  },
  {
    heading: "صفحات مهمة",
    links: [
      { href: "/", label: "الرئيسية" },
      { href: "/products", label: "المنتجات" },
      { href: "/deals", label: "العروض" },
      { href: "/blog", label: "المدونة" },
      { href: "/beginner-guide", label: "دليل المبتدئين" },
      { href: "/fish-encyclopedia", label: "موسوعة أسماك الزينة" },
      { href: "/community-gallery", label: "معرض المجتمع" },
      { href: "/journey", label: "رحلة الحوض" },
      { href: "/about", label: "من هو AQUAVO؟" },
      { href: "/about-aquavo", label: "عن AQUAVO" },
      { href: "/why-aquavo", label: "لماذا AQUAVO" },
      { href: "/sustainability", label: "الاستدامة" },
      { href: "/invest", label: "الاستثمار" },
    ],
  },
  {
    heading: "سياسات وثقة",
    links: [
      { href: "/shipping", label: "التوصيل" },
      { href: "/faq", label: "الأسئلة الشائعة" },
      { href: "/return-policy", label: "سياسة الإرجاع" },
      { href: "/privacy-policy", label: "سياسة الخصوصية" },
      { href: "/terms", label: "الشروط والأحكام" },
    ],
  },
];

const IMPORTANT_LINK_BLOCKED_PREFIXES = [
  "/admin",
  "/api",
  "/checkout",
  "/profile",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
];

const IMPORTANT_LINKS_CSS = `#aquavo-important-links{background:#071226;color:#cbd8e5;border-top:1px solid rgba(255,255,255,.10);font-family:'Cairo',system-ui,-apple-system,'Segoe UI',Tahoma,sans-serif;direction:rtl;text-align:right}
#aquavo-important-links .ail-wrap{max-width:1100px;margin:0 auto;padding:22px 18px}
#aquavo-important-links h2{font-family:'Cairo',sans-serif;font-size:1rem;line-height:1.4;color:#fff;margin:0 0 .75rem;font-weight:700}
#aquavo-important-links .ail-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:1rem}
#aquavo-important-links h3{font-size:.9rem;line-height:1.4;color:#fff;margin:0 0 .55rem;font-weight:800}
#aquavo-important-links nav{display:flex;flex-wrap:wrap;gap:.45rem}
#aquavo-important-links a{display:inline-flex;align-items:center;border:1px solid rgba(255,255,255,.12);border-radius:8px;color:#dbe7f0;background:rgba(255,255,255,.04);padding:.45rem .7rem;text-decoration:none;font-size:.9rem;line-height:1.4}
#aquavo-important-links a:hover{border-color:#0B93A6;color:#fff;background:rgba(11,147,166,.14)}`;

export function shouldRenderImportantInternalLinks(pathname: string): boolean {
  const cleanPath = (pathname || "/").split("?")[0].replace(/\/+$/, "") || "/";
  return !IMPORTANT_LINK_BLOCKED_PREFIXES.some(
    (prefix) => cleanPath === prefix || cleanPath.startsWith(`${prefix}/`)
  );
}

export function renderImportantInternalLinksSection(): string {
  const groups = IMPORTANT_INTERNAL_LINK_GROUPS.map((group) => {
    const links = group.links.map(
      (link) => `<a href="${esc(link.href)}">${esc(link.label)}</a>`
    ).join("");
    return `<div><h3>${esc(group.heading)}</h3><nav aria-label="${esc(group.heading)}">${links}</nav></div>`;
  }).join("");

  return `<section id="aquavo-important-links" data-ssr-internal-links>
<style>${IMPORTANT_LINKS_CSS}</style>
<div class="ail-wrap">
<h2>روابط مهمة من AQUAVO</h2>
<div class="ail-grid">${groups}</div>
</div>
</section>`;
}

// Full server-rendered /guides index page.
export function renderGuidesIndexHtml(base: string, image: string): string {
  const url = `${base}/guides`;
  const title = "أدلة AQUAVO لأحواض الزينة — التجهيز والعناية والصيانة | AQUAVO";
  const description =
    "فهرس أدلة AQUAVO التعليمية لأحواض الزينة في العراق: تجهيز حوض جديد، اختيار الفلتر والسخان، فحص ماء الحوض، الصيانة الأسبوعية وأخطاء المبتدئين.";
  const cards = GUIDE_INDEX_ITEMS.map(
    (g) =>
      `<li><a class="card" href="${esc(g.href)}"><span class="t">${esc(g.label)}</span><p>${esc(g.blurb)}</p></a></li>`
  ).join("");
  const faq = HOME_FAQ.map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join("");
  const jsonLd = renderJsonLdScripts([
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: "أدلة AQUAVO لأحواض الزينة",
      description,
      image,
      author: { "@type": "Organization", name: "AQUAVO", url: base },
      publisher: {
        "@type": "Organization",
        name: "AQUAVO",
        url: base,
        logo: { "@type": "ImageObject", url: image },
      },
      datePublished: "2026-06-29",
      dateModified: "2026-06-29",
      inLanguage: "ar-IQ",
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: HOME_FAQ.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "الرئيسية", item: base },
        { "@type": "ListItem", position: 2, name: "الأدلة", item: url },
      ],
    },
  ]);
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<script>${THEME_BOOTSTRAP}</script>
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<link rel="canonical" href="${esc(url)}" />
<meta name="robots" content="index, follow, max-image-preview:large" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:type" content="website" />
<meta property="og:url" content="${esc(url)}" />
<meta property="og:site_name" content="AQUAVO" />
<meta property="og:locale" content="ar_IQ" />
<meta property="og:image" content="${esc(image)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(description)}" />
<meta name="twitter:image" content="${esc(image)}" />
<link rel="icon" type="image/png" sizes="512x512" href="/brand/aquavo-v2-favicon.png" />
<meta name="theme-color" content="#0B93A6" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&family=Changa:wght@600;700&family=Inter:wght@400;500;600;700&display=swap" />
${jsonLd}
<style>${PAGE_CSS}</style>
</head>
<body>
${SITE_HEADER}
<div class="wrap">
  <nav class="crumb"><a href="/">الرئيسية</a> / <span>الأدلة</span></nav>
  <h1>أدلة AQUAVO لأحواض الزينة</h1>
  <div class="answer"><strong>الخلاصة السريعة:</strong> هذي صفحة فهرس أدلة AQUAVO التعليمية لأحواض الزينة في العراق. كل دليل يجاوب على سؤال شائع بأسلوب عملي: من تجهيز حوض جديد واختيار الفلتر والسخان، إلى فحص الماء والصيانة الأسبوعية وأخطاء المبتدئين. AQUAVO يبيع المعدات والمستلزمات فقط، ولا يبيع كائنات حية.</div>
  <h2>كل الأدلة</h2>
  <ul class="guide-index">${cards}</ul>
  <section class="faq"><h2>أسئلة شائعة</h2>${faq}</section>
  <div class="cta">
    <p>تقدر تتصفح المعدات والمستلزمات المتوفرة بـ AQUAVO مع توصيل لكل العراق ودفع عند الاستلام أو إلكترونياً.</p>
    <a class="btn" href="/products">تصفح المنتجات</a>
  </div>
</div>
${SITE_FOOTER}
<script>${THEME_TOGGLE_SCRIPT}</script>
</body>
</html>`;
}

export function renderGuidesIndexMarkdown(base: string): string {
  const lines: string[] = [];
  lines.push(`# أدلة AQUAVO لأحواض الزينة\n`);
  lines.push(`فهرس أدلة AQUAVO التعليمية لأحواض الزينة في العراق. AQUAVO يبيع المعدات والمستلزمات فقط ولا يبيع كائنات حية.\n`);
  for (const g of GUIDE_INDEX_ITEMS) {
    lines.push(`- [${g.label}](${base}${g.href}) — ${g.blurb}`);
  }
  lines.push(`\n## أسئلة شائعة\n`);
  for (const f of HOME_FAQ) {
    lines.push(`### ${f.q}`);
    lines.push(`${f.a}\n`);
  }
  lines.push(`\n**URL:** ${base}/guides`);
  return lines.join("\n");
}

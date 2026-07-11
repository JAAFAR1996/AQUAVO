export interface SeoMetaOverride {
  title?: string;
  description?: string;
  keywords?: string;
}

interface SeoContentPage {
  h1: string;
  topic: string;
  audience: string;
  action: string;
  links: string[];
}

interface SeoLink {
  href: string;
  label: string;
}

const LINK_LABELS: Record<string, string> = {
  "/": "الرئيسية",
  "/products": "المنتجات",
  "/guides": "أدلة أحواض الزينة",
  "/guides/new-aquarium-setup-iraq": "تجهيز حوض جديد",
  "/guides/aquarium-filter-guide": "اختيار الفلتر",
  "/guides/aquarium-heater-guide": "اختيار السخان",
  "/guides/aquarium-water-test-guide": "فحص ماء الحوض",
  "/guides/aquarium-decor-stones-guide": "ديكور وأحجار الحوض",
  "/shipping": "التوصيل",
  "/faq": "الأسئلة الشائعة",
  "/return-policy": "سياسة الإرجاع",
  "/privacy-policy": "سياسة الخصوصية",
  "/terms": "الشروط والأحكام",
  "/about": "من هو AQUAVO؟",
  "/about-aquavo": "عن AQUAVO",
  "/why-aquavo": "لماذا AQUAVO",
  "/blog": "المدونة",
  "/deals": "العروض",
  "/beginner-guide": "دليل المبتدئين",
  "/fish-encyclopedia": "موسوعة أسماك الزينة",
  "/fish-health": "تشخيص مشاكل أسماك الزينة",
  "/fish-finder": "اختيار السمك المناسب",
  "/fish-compatibility": "توافق الأسماك",
  "/calculators": "حاسبات أحواض الزينة",
  "/aquarium-wizard": "مساعد تجهيز الحوض",
  "/tank-builder": "مصمم أحواض الزينة",
  "/ai-tools": "أدوات AQUAVO",
  "/sustainability": "الاستدامة",
  "/community-gallery": "معرض المجتمع",
  "/journey": "رحلة الحوض",
  "/invest": "الاستثمار",
  "/guides/filter-choice": "اختيار فلتر الحوض",
  "/guides/heater-choice": "اختيار سخان الحوض",
  "/guides/tank-rescue-plan": "خطة إنقاذ الحوض",
  "/guides/white-scale": "إزالة الكلس الأبيض",
  "/guides/feeding-table": "جدول التغذية",
  "/guides/quarantine": "الحجر الصحي",
  "/guides/essential-tools": "أدوات الحوض الأساسية",
  "/guides/water-change-schedule": "جدول تغيير الماء",
  "/guides/water-myths": "خرافات ماء الحوض",
  "/guides/aquarium-salt": "ملح الحوض",
  "/guides/eco-friendly": "حوض صديق للبيئة",
  "/guides/happy-fish-signs": "علامات صحة الأسماك",
  "/guides/algae-control": "السيطرة على الطحالب",
  "/guides/filter-media": "ميديا الفلتر",
  "/guides/treatment-basics": "أساسيات العلاج",
  "/guides/5-mistakes": "5 أخطاء شائعة",
  "/guides/temperature-guide": "درجة حرارة الحوض",
  "/guides/fish-hiding": "اختباء الأسماك",
};

const DEFAULT_LINKS = [
  "/products",
  "/guides",
  "/guides/new-aquarium-setup-iraq",
  "/guides/aquarium-filter-guide",
  "/guides/aquarium-water-test-guide",
  "/shipping",
  "/faq",
];

export const SEO_META_OVERRIDES: Record<string, SeoMetaOverride> = {
  "/": {
    description: "AQUAVO متجر عراقي لمعدات ومستلزمات أحواض الزينة: فلاتر، سخانات، أغذية، ديكور ومعالجات مياه، مع توصيل لكل العراق ودفع عند الاستلام.",
  },
  "/products": {
    title: "مستلزمات أحواض الزينة في العراق | AQUAVO",
    description: "تصفح مستلزمات أحواض الزينة في العراق من AQUAVO: فلاتر، سخانات، أغذية، إضاءة، ديكور ومعالجات مياه، مع دفع عند الاستلام.",
  },
  "/shipping": {
    title: "التوصيل والدفع عند الاستلام في العراق | AQUAVO",
    description: "تفاصيل توصيل AQUAVO داخل العراق، الدفع نقداً عند الاستلام، ورسوم التوصيل الثابتة 5,000 دينار عراقي حسب السياسة المعتمدة.",
  },
  "/faq": {
    title: "الأسئلة الشائعة عن AQUAVO | مستلزمات أحواض الزينة",
    description: "إجابات مختصرة عن طلبات AQUAVO، التوصيل، الدفع عند الاستلام، الإرجاع، والمنتجات الخاصة بمعدات ومستلزمات أحواض الزينة.",
  },
  "/return-policy": {
    title: "سياسة الإرجاع والاستبدال في AQUAVO",
    description: "تعرف على سياسة الإرجاع والاستبدال في AQUAVO، ومتى يمكن مراجعة طلبك إذا وصل منتج خاطئ أو تالف، وخطوات التواصل المطلوبة.",
  },
  "/privacy-policy": {
    title: "سياسة الخصوصية في AQUAVO",
    description: "سياسة الخصوصية في AQUAVO تشرح شنو بيانات العملاء التي نحتاجها للطلب والتوصيل، وكيف نحافظ عليها ونستخدمها لخدمة الطلب.",
  },
  "/about": {
    title: "من هو AQUAVO؟ | مستلزمات أحواض الزينة في العراق",
    description: "تعرف على AQUAVO، متجر إلكتروني عراقي متخصص في معدات ومستلزمات أحواض الزينة، مع توصيل لكل العراق ودفع عند الاستلام.",
  },
  "/about-aquavo": {
    title: "عن AQUAVO | معدات ومستلزمات أحواض الزينة",
    description: "AQUAVO متجر إلكتروني عراقي متخصص في معدات ومستلزمات أحواض الزينة، يقدم منتجات أصلية حسب المتوفر وتعليم عملي للهواة.",
  },
  "/beginner-guide": {
    title: "دليل المبتدئين لأحواض الزينة | AQUAVO",
    description: "دليل عملي للمبتدئين في أحواض الزينة: اختيار الحوض، الفلتر، السخان، معالجة الماء، وتجنب الأخطاء الأولى قبل إضافة الأسماك.",
  },
  "/blog": {
    title: "مدونة AQUAVO لأحواض الزينة",
    description: "مدونة AQUAVO تقدم مقالات عملية عن معدات أحواض الزينة، فحص الماء، اختيار الفلاتر والسخانات، والصيانة اليومية للهواة في العراق.",
  },
  "/deals": {
    title: "عروض AQUAVO لمستلزمات أحواض الزينة",
    description: "تابع عروض AQUAVO على معدات ومستلزمات أحواض الزينة المتوفرة حسب المخزون، مع أسعار واضحة وتوصيل لكل العراق.",
  },
  "/fish-encyclopedia": {
    title: "موسوعة أسماك الزينة | AQUAVO",
    description: "موسوعة تعليمية عن أسماك الزينة تساعدك تفهم احتياجات الأنواع الشائعة من حرارة، تغذية، توافق وحجم حوض مناسب.",
  },
  "/fish-health": {
    title: "تشخيص مشاكل أسماك الزينة | AQUAVO",
    description: "صفحة تعليمية تساعدك تراجع أعراض أسماك الزينة ومشاكل الماء الشائعة، مع روابط لأدلة الفحص والعلاج الأساسي.",
  },
  "/fish-finder": {
    title: "اختيار السمك المناسب لحوضك | AQUAVO",
    description: "أداة تعليمية تساعدك تفكر بحجم الحوض، الحرارة، والتوافق قبل اختيار أسماك الزينة، مع روابط لأدلة التجهيز والصيانة.",
  },
  "/fish-compatibility": {
    title: "توافق أسماك الزينة | AQUAVO",
    description: "دليل يساعدك تفهم توافق أسماك الزينة داخل الحوض حسب السلوك والحجم والحرارة، لتقليل المشاكل قبل خلط الأنواع.",
  },
  "/calculators": {
    title: "حاسبات أحواض الزينة | AQUAVO",
    description: "حاسبات عملية تساعدك تقدّر حجم الحوض، قوة الفلتر، السخان، وتغيير الماء، مع روابط لأدلة AQUAVO للمبتدئين.",
  },
  "/aquarium-wizard": {
    title: "مساعد تجهيز الحوض | AQUAVO",
    description: "مساعد AQUAVO يرتب خطوات تجهيز حوض الزينة حسب حجم الحوض والاحتياج، ويربطك بأدلة الفلتر والسخان وفحص الماء.",
  },
  "/tank-builder": {
    title: "مصمم أحواض الزينة | AQUAVO",
    description: "مصمم أحواض الزينة يساعدك تخطط للمعدات الأساسية مثل الحوض، الفلتر، السخان، الإضاءة والديكور قبل الشراء.",
  },
  "/ai-tools": {
    title: "أدوات AQUAVO لأحواض الزينة",
    description: "أدوات AQUAVO التعليمية تساعدك تحسب وتخطط وتراجع احتياجات الحوض، مع روابط مباشرة لأدلة التجهيز والصيانة.",
  },
  "/sustainability": {
    title: "الاستدامة في أحواض الزينة | AQUAVO",
    description: "نصائح عملية لتقليل الهدر في أحواض الزينة عبر اختيار معدات مناسبة، صيانة منتظمة، وترشيد استخدام الماء والطاقة.",
  },
  "/community-gallery": {
    title: "معرض مجتمع AQUAVO لأحواض الزينة",
    description: "معرض تعليمي وإلهامي لأحواض الزينة من مجتمع AQUAVO، مع روابط للأدلة التي تساعدك تبني حوضاً مرتباً ومستقراً.",
  },
  "/journey": {
    title: "رحلة تجهيز حوض الزينة | AQUAVO",
    description: "رحلة AQUAVO تساعدك ترتب خطوات تجهيز الحوض من اختيار المعدات إلى فحص الماء والصيانة، بطريقة عملية للمبتدئين.",
  },
  "/invest": {
    title: "الاستثمار والنمو في AQUAVO",
    description: "صفحة تعريفية عن توجه AQUAVO كنشاط عراقي متخصص في معدات ومستلزمات أحواض الزينة، وخطط النمو طويلة الأمد.",
  },
  "/terms": {
    title: "الشروط والأحكام | AQUAVO",
    description: "الشروط والأحكام توضح قواعد استخدام موقع AQUAVO، الطلب، الدفع عند الاستلام، التوصيل، وسياسات التعامل مع المنتجات.",
  },
  "/why-aquavo": {
    title: "لماذا AQUAVO؟ | مستلزمات أحواض الزينة",
    description: "تعرف على طريقة AQUAVO في اختيار معدات ومستلزمات أحواض الزينة، التعليم العملي، التوصيل لكل العراق، والدفع عند الاستلام.",
  },
  "/guides/filter-choice": {
    title: "اختيار فلتر الحوض | AQUAVO",
    description: "دليل اختيار فلتر الحوض حسب الحجم ونوع الحوض، مع شرح الفلاتر الداخلية والخارجية والإسفنجية وروابط المنتجات المناسبة.",
  },
  "/guides/heater-choice": {
    title: "اختيار سخان الحوض | AQUAVO",
    description: "دليل اختيار سخان الحوض حسب حجم الماء وحرارة الغرفة، مع نصائح التثبيت الآمن والحفاظ على حرارة مستقرة.",
  },
  "/guides/tank-rescue-plan": {
    title: "خطة إنقاذ الحوض في الطوارئ | AQUAVO",
    description: "خطة عملية للتصرف عند تدهور ماء الحوض أو ظهور علامات خطر على الأسماك، مع خطوات فحص الماء وتخفيف المشكلة بسرعة.",
  },
  "/guides/white-scale": {
    title: "إزالة الكلس الأبيض من زجاج الحوض | AQUAVO",
    description: "شرح آمن لإزالة ترسبات الكلس الأبيض عن زجاج الحوض بدون خدش أو صابون، مع نصائح لتقليل عودة الترسبات.",
  },
  "/guides/water-myths": {
    title: "خرافات جودة ماء الحوض | AQUAVO",
    description: "تصحيح خرافات شائعة عن ماء الحوض، فحص pH، الأمونيا، تغيير الماء، والاعتماد على الملاحظة بدل الاختبار.",
  },
  "/guides/quarantine": {
    title: "الحجر الصحي للأسماك الجديدة | AQUAVO",
    description: "دليل تجهيز حوض حجر صحي للأسماك الجديدة لمراقبة السلوك وتقليل انتقال الأمراض قبل إدخالها للحوض الرئيسي.",
  },
  "/guides/essential-tools": {
    title: "أدوات الحوض الأساسية | AQUAVO",
    description: "قائمة أدوات أساسية لهواة أحواض الزينة: سيفون تنظيف، شبكة، أدوات فحص الماء، ميديا فلتر، ومستلزمات صيانة أسبوعية.",
  },
  "/guides/5-mistakes": {
    title: "5 أخطاء شائعة عند المبتدئين بأحواض الزينة | AQUAVO",
    description: "تعرف على خمسة أخطاء شائعة في أحواض الزينة: تشغيل الحوض بسرعة، ضعف الفلتر، الإفراط بالتغذية، وإهمال فحص الماء.",
  },
  "/guides/water-change-schedule": {
    title: "جدول تغيير ماء الحوض | AQUAVO",
    description: "جدول عملي لتغيير ماء الحوض حسب الحالة، مع شرح النسبة المناسبة، أهمية مزيل الكلور، وروابط فحص الماء والصيانة.",
  },
  "/guides/feeding-table": {
    title: "جدول تغذية أسماك الزينة | AQUAVO",
    description: "جدول يساعدك تضبط كمية وتكرار تغذية أسماك الزينة، وتقلل بقايا الطعام التي ترفع الأمونيا وتؤثر على الماء.",
  },
  "/guides/aquarium-salt": {
    title: "استخدام ملح الحوض بأمان | AQUAVO",
    description: "شرح متى يستخدم ملح الحوض ومتى تتجنبه، مع تنبيه لأهمية الجرعة الصحيحة وفحص الماء قبل أي علاج.",
  },
  "/guides/eco-friendly": {
    title: "أحواض الزينة الصديقة للبيئة | AQUAVO",
    description: "نصائح لتقليل الهدر في هواية أحواض الزينة عبر صيانة المعدات، اختيار فلتر مناسب، وتقليل تبديل الماء غير الضروري.",
  },
  "/guides/happy-fish-signs": {
    title: "علامات صحة أسماك الزينة | AQUAVO",
    description: "تعرف على علامات صحة أسماك الزينة من الحركة، الشهية، التنفس، اللون، والتفاعل، ومتى تحتاج تفحص الماء.",
  },
  "/guides/algae-control": {
    title: "السيطرة على طحالب الحوض | AQUAVO",
    description: "دليل عملي للسيطرة على طحالب الحوض عبر ضبط الإضاءة، التغذية، تغيير الماء، وتنظيف الزجاج بدون مبالغة.",
  },
  "/guides/filter-media": {
    title: "ميديا الفلتر في أحواض الزينة | AQUAVO",
    description: "شرح أنواع ميديا الفلتر: الإسفنج، السيراميك، الكربون، وكيفية تنظيفها بدون خسارة البكتيريا النافعة.",
  },
  "/guides/treatment-basics": {
    title: "أساسيات علاج مشاكل الحوض | AQUAVO",
    description: "مدخل عملي لفهم أعراض مشاكل الحوض، أهمية عزل الحالة، فحص الماء، واختيار المعالجة المناسبة بدون استعجال.",
  },
  "/guides/temperature-guide": {
    title: "درجة حرارة الحوض المناسبة | AQUAVO",
    description: "دليل يشرح حرارة الماء المناسبة، دور السخان والترمومتر، وكيفية تقليل التذبذب الحراري داخل حوض الزينة.",
  },
  "/guides/fish-hiding": {
    title: "لماذا تختبئ أسماك الزينة؟ | AQUAVO",
    description: "شرح أسباب اختباء أسماك الزينة مثل الإجهاد، الإضاءة، المرض، أو ضعف جودة الماء، ومتى تحتاج تتدخل.",
  },
};

const SEO_CONTENT_PAGES: Record<string, SeoContentPage> = {
  "/products": {
    h1: "مستلزمات أحواض الزينة في العراق",
    topic: "تصفح معدات ومستلزمات الحوض المتوفرة مثل الفلاتر، السخانات، الإضاءة، الغذاء، الديكور ومعالجات المياه",
    audience: "هذه الصفحة مناسبة لمن يريد مقارنة المنتجات حسب الفئة قبل اختيار القطعة المناسبة لحجم الحوض واحتياجه",
    action: "ابدأ بتحديد المشكلة: تصفية، حرارة، إضاءة، ديكور، أو فحص ماء، ثم انتقل للفئة المناسبة بدل شراء قطعة عشوائية",
    links: ["/guides", "/guides/aquarium-filter-guide", "/guides/aquarium-heater-guide", "/guides/aquarium-water-test-guide", "/guides/aquarium-decor-stones-guide"],
  },
  "/shipping": {
    h1: "التوصيل والدفع عند الاستلام في العراق",
    topic: "معرفة طريقة توصيل طلبات AQUAVO داخل العراق ورسوم التوصيل والدفع عند الاستلام",
    audience: "هذه الصفحة مهمة قبل الطلب حتى يعرف الزائر شلون توصل المنتجات وشنو المتوقع عند الاستلام",
    action: "راجع سياسة التوصيل قبل تثبيت الطلب، وتأكد من رقم الهاتف والعنوان حتى لا يتأخر تسليم معدات الحوض",
    links: ["/products", "/faq", "/return-policy", "/privacy-policy", "/about"],
  },
  "/faq": {
    h1: "الأسئلة الشائعة عن AQUAVO",
    topic: "إجابات مختصرة عن التوصيل والدفع والإرجاع وطريقة اختيار مستلزمات أحواض الزينة",
    audience: "هذه الصفحة مناسبة للزائر الذي يريد جواباً سريعاً قبل الطلب أو قبل تجهيز أول حوض",
    action: "إذا كان السؤال مرتبطاً بالماء أو الفلتر أو السخان، انتقل من الإجابة إلى الدليل التفصيلي المناسب",
    links: ["/shipping", "/return-policy", "/guides", "/guides/aquarium-water-test-guide", "/products"],
  },
  "/return-policy": {
    h1: "سياسة الإرجاع والاستبدال في AQUAVO",
    topic: "توضيح الحالات التي يمكن فيها مراجعة طلب تالف أو خاطئ وخطوات التواصل المطلوبة",
    audience: "هذه الصفحة مهمة لأي زبون يريد يعرف حقوقه وحدود السياسة قبل أو بعد الطلب",
    action: "احتفظ برقم الطلب وصور واضحة للمنتج والكارتون إذا وصلت مشكلة، ثم راجع خطوات السياسة قبل التواصل",
    links: ["/shipping", "/faq", "/privacy-policy", "/terms", "/products"],
  },
  "/privacy-policy": {
    h1: "سياسة الخصوصية في AQUAVO",
    topic: "شرح البيانات التي يحتاجها الموقع لإتمام الطلب والتوصيل وكيف يتم استخدامها داخل AQUAVO",
    audience: "هذه الصفحة مناسبة للزائر الذي يريد يعرف كيف نتعامل مع بيانات الاسم والهاتف والعنوان والطلب",
    action: "راجع السياسة إذا عندك سؤال عن بيانات الطلب أو التواصل أو الاشتراك، ثم انتقل للشروط أو الأسئلة الشائعة",
    links: ["/terms", "/faq", "/shipping", "/return-policy", "/about"],
  },
  "/about": {
    h1: "من هو AQUAVO؟",
    topic: "تعريف AQUAVO كمتجر إلكتروني عراقي متخصص في معدات ومستلزمات أحواض الزينة",
    audience: "هذه الصفحة مناسبة لمن يريد يعرف هوية المشروع وطريقة عمله قبل الاعتماد عليه في تجهيز الحوض",
    action: "اقرأ التعريف، ثم انتقل للمنتجات أو الأدلة حتى تشوف الجانب العملي من الخبرة والتعليم",
    links: ["/products", "/guides", "/why-aquavo", "/shipping", "/faq"],
  },
  "/about-aquavo": {
    h1: "عن AQUAVO",
    topic: "تعريف مختصر بهوية AQUAVO وما يبيعه وما لا يبيعه داخل سوق أحواض الزينة في العراق",
    audience: "هذه الصفحة مناسبة للزائر الذي يريد يتأكد من نطاق المتجر قبل الاعتماد على المنتجات أو الأدلة",
    action: "راجع نطاق العمل بوضوح، ثم انتقل إلى المنتجات أو السياسات أو دليل المبتدئين حسب حاجتك",
    links: ["/about", "/products", "/guides", "/why-aquavo", "/shipping"],
  },
  "/beginner-guide": {
    h1: "دليل المبتدئين لأحواض الزينة",
    topic: "ترتيب خطوات تجهيز الحوض الأول من اختيار المعدات إلى تشغيل الحوض وفحص الماء",
    audience: "هذه الصفحة مناسبة للمبتدئ الذي لا يريد يشتري قطع متفرقة بدون فهم العلاقة بينها",
    action: "ابدأ بالحوض والفلتر والسخان ومزيل الكلور، ثم تابع دليل فحص الماء قبل إدخال أي أسماك",
    links: ["/guides/new-aquarium-setup-iraq", "/guides/aquarium-filter-guide", "/guides/aquarium-heater-guide", "/guides/aquarium-water-test-guide", "/products"],
  },
  "/guides/filter-choice": {
    h1: "اختيار فلتر الحوض",
    topic: "فهم أنواع الفلاتر ومتى تختار الفلتر الداخلي أو الخارجي أو الإسفنجي حسب حجم الحوض",
    audience: "هذه الصفحة مناسبة لمن يعاني من ماء عكر أو يريد يجهز فلتر صحيح من البداية",
    action: "قارن بين حجم الحوض، كمية الفضلات، وقوة التدفق قبل الانتقال إلى منتجات الفلاتر",
    links: ["/products?category=filters", "/guides/aquarium-filter-guide", "/guides/filter-media", "/guides/aquarium-water-test-guide", "/guides/water-change-schedule"],
  },
  "/guides/heater-choice": {
    h1: "اختيار سخان الحوض",
    topic: "تحديد قوة السخان المناسبة حسب حجم الماء ودرجة حرارة الغرفة وثبات الحرارة المطلوب",
    audience: "هذه الصفحة مناسبة لمن يريد يقلل تذبذب الحرارة ويحافظ على استقرار الحوض",
    action: "احسب تقريباً حاجة الحوض، ثم راجع دليل السخان التفصيلي واختر المنتج حسب حجم الماء",
    links: ["/products?category=heaters", "/guides/aquarium-heater-guide", "/guides/temperature-guide", "/guides/aquarium-water-test-guide", "/guides/new-aquarium-setup-iraq"],
  },
  "/fish-encyclopedia": {
    h1: "موسوعة أسماك الزينة",
    topic: "معلومات تعليمية عن أنواع أسماك الزينة واحتياجاتها من حرارة وتغذية وتوافق",
    audience: "هذه الصفحة مناسبة للبحث قبل إضافة نوع جديد إلى الحوض أو قبل مقارنة الاحتياجات",
    action: "استخدم الموسوعة كمرجع تعليمي، ثم راجع فحص الماء والتوافق حتى لا تختار نوعاً غير مناسب لحوضك",
    links: ["/fish-finder", "/fish-compatibility", "/guides/temperature-guide", "/guides/feeding-table", "/guides/aquarium-water-test-guide"],
  },
  "/fish-health": {
    h1: "تشخيص مشاكل أسماك الزينة",
    topic: "مراجعة أعراض شائعة مرتبطة بسلوك الأسماك وجودة الماء والمرض المحتمل",
    audience: "هذه الصفحة مناسبة عندما تلاحظ خمول، اختباء، تنفس سريع، بقع، أو تغير شهية",
    action: "ابدأ بفحص الماء قبل أي علاج، ثم راجع أساسيات العلاج والحجر الصحي إذا كانت الأعراض واضحة",
    links: ["/guides/aquarium-water-test-guide", "/guides/treatment-basics", "/guides/quarantine", "/guides/fish-hiding", "/guides/happy-fish-signs"],
  },
  "/sustainability": {
    h1: "الاستدامة في أحواض الزينة",
    topic: "تقليل الهدر في الماء والطاقة والمعدات عبر اختيار صحيح وصيانة منتظمة",
    audience: "هذه الصفحة مناسبة لمن يريد حوضاً مستقرّاً بتكاليف تشغيل أقل وقطع تعيش أطول",
    action: "راجع استهلاك السخان والإضاءة، حافظ على الفلتر، ولا تبدل الماء أكثر من الحاجة بدون فحص",
    links: ["/guides/eco-friendly", "/guides/water-change-schedule", "/guides/filter-media", "/products", "/guides"],
  },
  "/blog": {
    h1: "مدونة AQUAVO لأحواض الزينة",
    topic: "مقالات تعليمية عن تجهيز وصيانة أحواض الزينة واختيار المعدات المناسبة",
    audience: "هذه الصفحة مناسبة لمن يريد يقرأ مواضيع أوسع من الأدلة المختصرة أو يتابع تحديثات AQUAVO",
    action: "ابدأ بالأدلة الأساسية إذا أنت جديد، ثم استخدم المدونة للتوسع في المشاكل والحلول",
    links: ["/guides", "/beginner-guide", "/guides/aquarium-filter-guide", "/guides/aquarium-water-test-guide", "/products"],
  },
  "/deals": {
    h1: "عروض AQUAVO لمستلزمات أحواض الزينة",
    topic: "متابعة العروض المتاحة حسب المخزون على معدات ومستلزمات أحواض الزينة",
    audience: "هذه الصفحة مناسبة لمن يعرف احتياجه ويريد يراجع المنتجات المتوفرة بسعر أو عرض مناسب",
    action: "لا تختار العرض وحده كسبب شراء؛ تأكد أن المنتج يناسب حجم الحوض والمشكلة التي تريد حلها",
    links: ["/products", "/guides/aquarium-filter-guide", "/guides/aquarium-heater-guide", "/shipping", "/faq"],
  },
  "/guides/tank-rescue-plan": {
    h1: "خطة إنقاذ الحوض في حالات الطوارئ",
    topic: "خطوات أولية عند تدهور الماء أو ظهور أعراض خطيرة على الأسماك داخل الحوض",
    audience: "هذه الصفحة مناسبة للحالات المستعجلة عندما تحتاج ترتيب الفحص والتغيير والمعالجة بدون ارتباك",
    action: "ابدأ بفحص الماء وتخفيف السبب، ولا تضيف علاجاً عشوائياً قبل معرفة المشكلة الأقرب",
    links: ["/guides/aquarium-water-test-guide", "/guides/treatment-basics", "/guides/water-change-schedule", "/guides/quarantine", "/fish-health"],
  },
  "/calculators": {
    h1: "حاسبات أحواض الزينة",
    topic: "أدوات حسابية تساعدك تقدّر حجم الحوض وقوة الفلتر والسخان ونسبة تغيير الماء",
    audience: "هذه الصفحة مناسبة لمن يريد قراراً أقرب للمنطق قبل شراء المعدات أو تغيير الروتين",
    action: "استخدم الحاسبة كبداية، ثم راجع الدليل التفصيلي لأن ظروف كل حوض تختلف",
    links: ["/aquarium-wizard", "/tank-builder", "/guides/aquarium-filter-guide", "/guides/aquarium-heater-guide", "/guides/water-change-schedule"],
  },
  "/aquarium-wizard": {
    h1: "مساعد تجهيز الحوض",
    topic: "مساعدة الزائر على ترتيب احتياجات الحوض حسب الحجم والخطوة الحالية",
    audience: "هذه الصفحة مناسبة للمبتدئ أو الهاوي الذي يريد قائمة أولية قبل فتح صفحة المنتجات",
    action: "استخدم المساعد لتحديد الأولويات، ثم راجع الأدلة الأساسية قبل اختيار المنتج",
    links: ["/tank-builder", "/calculators", "/guides/new-aquarium-setup-iraq", "/guides/aquarium-filter-guide", "/products"],
  },
  "/tank-builder": {
    h1: "مصمم أحواض الزينة",
    topic: "تخطيط مكونات الحوض مثل الفلتر والسخان والإضاءة والديكور قبل الشراء",
    audience: "هذه الصفحة مناسبة لمن يريد يجهز حوضاً متوازناً بدل شراء معدات غير متناسقة",
    action: "ابدأ بالحجم والغرض من الحوض، ثم اختر كل قطعة حسب احتياجها العملي وليس الشكل فقط",
    links: ["/aquarium-wizard", "/calculators", "/guides/aquarium-decor-stones-guide", "/guides/aquarium-filter-guide", "/products"],
  },
  "/fish-compatibility": {
    h1: "توافق أسماك الزينة",
    topic: "فهم احتمالات التوافق بين أنواع أسماك الزينة حسب الحجم والسلوك والحرارة",
    audience: "هذه الصفحة مناسبة قبل خلط أنواع جديدة أو عند ظهور مطاردة وعدوانية داخل الحوض",
    action: "راجع التوافق والحجم المتوقع ودرجة الحرارة قبل إضافة أي نوع جديد للحوض",
    links: ["/fish-encyclopedia", "/fish-finder", "/guides/temperature-guide", "/guides/quarantine", "/beginner-guide"],
  },
  "/guides/white-scale": {
    h1: "إزالة ترسبات الكلس البيضاء عن زجاج الحوض",
    topic: "تنظيف البقع البيضاء والترسبات المعدنية بطريقة آمنة على الزجاج وماء الحوض",
    audience: "هذه الصفحة مناسبة لمن يرى طبقة بيضاء على الزجاج أو حواف الحوض بسبب الماء العسر",
    action: "نظف بدون صابون أو مواد مجهولة، وقلل الترسبات بتحسين روتين التغيير والتنظيف",
    links: ["/guides/water-change-schedule", "/guides/aquarium-water-test-guide", "/guides/essential-tools", "/products?category=maintenance", "/guides"],
  },
  "/ai-tools": {
    h1: "أدوات AQUAVO لأحواض الزينة",
    topic: "مجموعة أدوات تعليمية تساعدك تخطط وتراجع احتياجات الحوض خطوة بخطوة",
    audience: "هذه الصفحة مناسبة لمن يريد مساعدة سريعة قبل قراءة الدليل الكامل أو تصفح المنتجات",
    action: "استخدم الأدوات كمرشد أولي، ثم تحقق من النتيجة عبر الأدلة والمواصفات الفعلية للمنتج",
    links: ["/calculators", "/aquarium-wizard", "/tank-builder", "/fish-finder", "/guides"],
  },
  "/guides/feeding-table": {
    h1: "جدول تغذية أسماك الزينة",
    topic: "تنظيم كمية وتكرار التغذية لتقليل بقايا الطعام ومشاكل الماء",
    audience: "هذه الصفحة مناسبة لمن يلاحظ عكورة ماء أو بقايا طعام أو تذبذب في جودة الحوض",
    action: "اضبط الكمية حسب استهلاك الأسماك، وراقب الأمونيا والنتريت إذا زادت البقايا",
    links: ["/products?category=food", "/guides/aquarium-water-test-guide", "/guides/water-change-schedule", "/guides/happy-fish-signs", "/fish-health"],
  },
  "/invest": {
    h1: "الاستثمار والنمو في AQUAVO",
    topic: "تعريف مختصر برؤية AQUAVO كنشاط عراقي متخصص في معدات ومستلزمات أحواض الزينة",
    audience: "هذه الصفحة مناسبة لمن يريد فهم اتجاه المشروع ونموه بدون وعود مالية أو ادعاءات غير مثبتة",
    action: "اقرأ الرؤية العامة، ثم راجع صفحات الثقة والمنتجات والأدلة لفهم أساس العمل الحالي",
    links: ["/about", "/why-aquavo", "/products", "/guides", "/sustainability"],
  },
  "/guides/quarantine": {
    h1: "الحجر الصحي للأسماك الجديدة",
    topic: "تجهيز حوض مراقبة منفصل لتقليل انتقال الأمراض وملاحظة السلوك قبل الدمج",
    audience: "هذه الصفحة مناسبة عند إضافة أسماك جديدة أو عند ظهور أعراض تحتاج عزل ومتابعة",
    action: "جهز حوضاً بسيطاً بفلترة وحرارة مستقرة، وراقب الأعراض قبل إدخال السمكة للحوض الرئيسي",
    links: ["/fish-health", "/guides/treatment-basics", "/guides/aquarium-water-test-guide", "/guides/fish-hiding", "/products"],
  },
  "/guides/essential-tools": {
    h1: "أدوات الحوض الأساسية لكل هاوٍ",
    topic: "قائمة أدوات عملية للصيانة والفحص والتنظيف اليومي والأسبوعي لحوض الزينة",
    audience: "هذه الصفحة مناسبة للمبتدئ الذي يريد يجهز أدواته قبل حدوث مشكلة في الحوض",
    action: "ابدأ بالأدوات التي تحمي الماء: سيفون، شبكة، أدوات فحص، ومستلزمات تنظيف آمنة",
    links: ["/products?category=maintenance", "/guides/water-change-schedule", "/guides/aquarium-water-test-guide", "/guides/filter-media", "/beginner-guide"],
  },
  "/guides/water-change-schedule": {
    h1: "جدول تغيير ماء الحوض",
    topic: "تحديد نسبة وتكرار تغيير الماء حسب حالة الحوض ونتائج الفحص",
    audience: "هذه الصفحة مناسبة لمن يريد روتين صيانة ثابت بدل تغيير الماء بشكل عشوائي",
    action: "استخدم الفحص لتحديد الحاجة، وعالج الماء الجديد بمزيل الكلور قبل إضافته للحوض",
    links: ["/guides/aquarium-water-test-guide", "/guides/water-conditioner-guide", "/guides/essential-tools", "/products?category=water-treatments", "/guides/filter-media"],
  },
  "/guides/water-myths": {
    h1: "خرافات شائعة عن جودة ماء الحوض",
    topic: "تصحيح أفكار منتشرة عن الماء النظيف والكلور وpH وتغيير الماء",
    audience: "هذه الصفحة مناسبة لمن يعتمد على لون الماء فقط أو يسمع نصائح متضاربة من أكثر من مصدر",
    action: "اعتمد على فحص الماء والروتين الثابت، وليس على الانطباع البصري وحده",
    links: ["/guides/aquarium-water-test-guide", "/guides/water-change-schedule", "/guides/water-conditioner-guide", "/guides/tank-rescue-plan", "/faq"],
  },
  "/terms": {
    h1: "الشروط والأحكام",
    topic: "قواعد استخدام موقع AQUAVO والطلب والتعامل مع المنتجات والسياسات المرتبطة",
    audience: "هذه الصفحة مناسبة للزائر الذي يريد فهم شروط الخدمة قبل إتمام الطلب أو استخدام الموقع",
    action: "راجع الشروط مع سياسات الخصوصية والإرجاع والتوصيل حتى تكون صورة الطلب واضحة",
    links: ["/privacy-policy", "/return-policy", "/shipping", "/faq", "/products"],
  },
  "/journey": {
    h1: "رحلة تجهيز حوض الزينة",
    topic: "ترتيب رحلة الحوض من التخطيط واختيار المعدات إلى الصيانة والمتابعة",
    audience: "هذه الصفحة مناسبة لمن يريد مساراً واضحاً بدل التنقل بين المنتجات بدون خطة",
    action: "ابدأ بخطوة التجهيز، ثم انتقل للفلتر والسخان وفحص الماء قبل إضافة أي نوع للحوض",
    links: ["/beginner-guide", "/guides/new-aquarium-setup-iraq", "/aquarium-wizard", "/tank-builder", "/guides"],
  },
  "/guides/aquarium-salt": {
    h1: "استخدام ملح الحوض بأمان",
    topic: "شرح متى يستخدم ملح الحوض ومتى يكون غير مناسب لبعض الحالات أو الأنواع",
    audience: "هذه الصفحة مناسبة لمن يفكر باستخدام الملح كإجراء مساعد ويريد تقليل الأخطاء",
    action: "لا تستخدم الملح كحل عام لكل مشكلة؛ افحص الماء وشخص السبب قبل أي إضافة",
    links: ["/fish-health", "/guides/treatment-basics", "/guides/quarantine", "/guides/aquarium-water-test-guide", "/products"],
  },
  "/why-aquavo": {
    h1: "لماذا AQUAVO؟",
    topic: "شرح طريقة AQUAVO في التعليم والاختيار العملي لمستلزمات أحواض الزينة في العراق",
    audience: "هذه الصفحة مناسبة لمن يقارن بين المتاجر ويريد يعرف طريقة التفكير وراء المنتجات والدعم",
    action: "راجع الهوية والسياسات والأدلة، ثم احكم على التجربة من وضوح المنتجات والمعلومات",
    links: ["/about", "/about-aquavo", "/products", "/guides", "/shipping"],
  },
  "/guides/eco-friendly": {
    h1: "دليل أحواض الزينة الصديقة للبيئة",
    topic: "تقليل استهلاك الطاقة والماء والهدر عبر معدات مناسبة وروتين صيانة متوازن",
    audience: "هذه الصفحة مناسبة لمن يريد حوضاً عملياً ومستقراً بدون استهلاك زائد أو تبديل غير ضروري",
    action: "ابدأ بالفلتر المناسب، الإضاءة المعقولة، وتغيير الماء حسب الحاجة لا حسب التخمين",
    links: ["/sustainability", "/guides/water-change-schedule", "/guides/filter-media", "/guides/aquarium-heater-guide", "/products"],
  },
  "/guides/happy-fish-signs": {
    h1: "علامات صحة وسعادة أسماك الزينة",
    topic: "مراقبة سلوك الأسماك وشهيتها وتنفسها ولونها كإشارات أولية على صحة الحوض",
    audience: "هذه الصفحة مناسبة لمن يريد يفرق بين السلوك الطبيعي والعلامات التي تحتاج فحص أو تدخل",
    action: "راقب العلامات مع فحص الماء، لأن السلوك وحده لا يكفي لتشخيص جودة الحوض",
    links: ["/fish-health", "/guides/fish-hiding", "/guides/aquarium-water-test-guide", "/guides/feeding-table", "/fish-encyclopedia"],
  },
  "/guides/algae-control": {
    h1: "السيطرة على الطحالب ومنعها في حوض السمك",
    topic: "معالجة أسباب الطحالب مثل الإضاءة الزائدة، بقايا الطعام، وضعف الصيانة",
    audience: "هذه الصفحة مناسبة لمن يعاني من طحالب على الزجاج أو الديكور أو تغير لون الماء",
    action: "اضبط الإضاءة والغذاء وتغيير الماء قبل الاعتماد على أي منتج معالجة",
    links: ["/guides/water-change-schedule", "/guides/aquarium-water-test-guide", "/guides/essential-tools", "/products?category=maintenance", "/guides/filter-media"],
  },
  "/community-gallery": {
    h1: "معرض أحواض الزينة من مجتمع AQUAVO",
    topic: "عرض أفكار وترتيبات أحواض تساعد الزائر يستلهم شكل الحوض بدون نسخ عشوائي",
    audience: "هذه الصفحة مناسبة لمن يريد يشوف أمثلة قبل اختيار الديكور أو ترتيب المعدات داخل الحوض",
    action: "استخدم الصور كمصدر إلهام، ثم راجع دليل الديكور والفلتر قبل التطبيق على حوضك",
    links: ["/guides/aquarium-decor-stones-guide", "/guides/aquarium-filter-guide", "/products?category=decorations", "/guides", "/about"],
  },
  "/guides/filter-media": {
    h1: "كيف تختار وتصين ميديا الفلتر",
    topic: "فهم الإسفنج والسيراميك والكربون ودور كل نوع داخل الفلتر",
    audience: "هذه الصفحة مناسبة لمن يريد يحسن تصفية الماء أو ينظف الفلتر بدون خسارة البكتيريا النافعة",
    action: "نظف الميديا بماء من الحوض عند الحاجة، ولا تغسل كل شيء دفعة واحدة بماء الحنفية",
    links: ["/guides/aquarium-filter-guide", "/guides/filter-choice", "/products?category=filters", "/guides/aquarium-water-test-guide", "/guides/water-change-schedule"],
  },
  "/guides/treatment-basics": {
    h1: "أساسيات علاج أمراض أسماك الزينة",
    topic: "خطوات أولية لفهم المرض المحتمل قبل استخدام أي معالجة داخل الحوض",
    audience: "هذه الصفحة مناسبة عند ظهور بقع أو خمول أو تغير تنفس أو أعراض غير معتادة",
    action: "ابدأ بالعزل وفحص الماء ومراجعة الأعراض، ولا تخلط علاجات متعددة بدون سبب واضح",
    links: ["/fish-health", "/guides/quarantine", "/guides/aquarium-water-test-guide", "/guides/tank-rescue-plan", "/products?category=water-treatments"],
  },
  "/guides/5-mistakes": {
    h1: "5 أخطاء شائعة عند المبتدئين بأحواض الزينة",
    topic: "أخطاء البداية مثل تشغيل الحوض بسرعة، ضعف الفلتر، الإفراط بالتغذية، وإهمال فحص الماء",
    audience: "هذه الصفحة مناسبة لأي مبتدئ يريد يتجنب المشاكل التي تظهر في الأسابيع الأولى من الحوض",
    action: "اقرأ الأخطاء كقائمة فحص، ثم انتقل لدليل التجهيز وفحص الماء لتطبيق الخطوات بالترتيب",
    links: ["/beginner-guide", "/guides/new-aquarium-setup-iraq", "/guides/aquarium-water-test-guide", "/guides/aquarium-filter-guide", "/products"],
  },
  "/guides/temperature-guide": {
    h1: "درجات حرارة الماء المناسبة لأسماك الزينة",
    topic: "فهم دور حرارة الماء والسخان والترمومتر وثبات الحرارة في استقرار الحوض",
    audience: "هذه الصفحة مناسبة لمن يلاحظ خمول أو تذبذب سلوك مرتبط بتغير حرارة الغرفة",
    action: "استخدم ترمومتر منفصل، وراجع قوة السخان حسب حجم الحوض وليس حسب التخمين",
    links: ["/guides/aquarium-heater-guide", "/guides/heater-choice", "/products?category=heaters", "/fish-encyclopedia", "/fish-health"],
  },
  "/fish-finder": {
    h1: "اختيار السمك المناسب لحوضك",
    topic: "مساعدة تعليمية لاختيار نوع يناسب حجم الحوض والحرارة والتوافق قبل الإضافة",
    audience: "هذه الصفحة مناسبة لمن يخطط للحوض أو يريد يضيف نوعاً جديداً بدون مشاكل توافق",
    action: "ابدأ بالحجم والحرارة والسلوك، ثم راجع الموسوعة والتوافق قبل اتخاذ القرار",
    links: ["/fish-encyclopedia", "/fish-compatibility", "/guides/temperature-guide", "/beginner-guide", "/guides/quarantine"],
  },
  "/guides/fish-hiding": {
    h1: "لماذا تختبئ الأسماك وكيف تتصرف",
    topic: "تمييز أسباب الاختباء بين سلوك طبيعي، خوف، مرض، إضاءة قوية، أو مشكلة في الماء",
    audience: "هذه الصفحة مناسبة لمن يلاحظ أن السمك يختفي كثيراً أو يتجنب السباحة الطبيعية",
    action: "راقب السلوك مع الشهية والتنفس، ثم افحص الماء قبل تغيير الديكور أو إضافة علاج",
    links: ["/fish-health", "/guides/happy-fish-signs", "/guides/aquarium-water-test-guide", "/guides/treatment-basics", "/fish-encyclopedia"],
  },
};

export function normalizeSeoPath(pathname: string): string {
  const path = (pathname || "/").split("?")[0].replace(/\/+$/, "") || "/";
  return path;
}

export function getSeoMetaOverride(pathname: string): SeoMetaOverride | undefined {
  const override = SEO_META_OVERRIDES[normalizeSeoPath(pathname)];
  if (!override) return undefined;
  return {
    ...override,
    description: override.description ? fitMetaDescription(override.description) : undefined,
  };
}

function fitMetaDescription(description: string): string {
  if (description.length >= 120) return description;

  const suffix = " مع روابط داخلية مفيدة من AQUAVO.";
  const expanded = `${description}${suffix}`;
  if (expanded.length <= 155) return expanded;

  return expanded.slice(0, 155).replace(/\s+\S*$/, "");
}

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function linksFor(page: SeoContentPage): SeoLink[] {
  const hrefs = [...page.links, ...DEFAULT_LINKS];
  const seen = new Set<string>();
  return hrefs
    .filter((href) => {
      const clean = normalizeSeoPath(href);
      if (seen.has(clean)) return false;
      seen.add(clean);
      return Boolean(LINK_LABELS[clean] || href.includes("?category="));
    })
    .slice(0, 8)
    .map((href) => ({
      href,
      label: LINK_LABELS[normalizeSeoPath(href)] || "منتجات مرتبطة",
    }));
}

const SEO_CONTENT_CSS = `#aquavo-ssr-page-content{background:#08172b;color:#d7e4ee;border-top:1px solid rgba(255,255,255,.10);font-family:'Cairo',system-ui,-apple-system,'Segoe UI',Tahoma,sans-serif;direction:rtl;text-align:right;line-height:1.85}
#aquavo-ssr-page-content .asc-wrap{max-width:1100px;margin:0 auto;padding:28px 18px}
#aquavo-ssr-page-content h1{font-family:'Cairo',sans-serif;font-size:1.35rem;line-height:1.45;color:#fff;margin:0 0 .75rem;font-weight:700;letter-spacing:0}
#aquavo-ssr-page-content p{margin:.45rem 0;color:#c8d8e6;font-size:.96rem}
#aquavo-ssr-page-content strong{color:#fff}
#aquavo-ssr-page-content nav{display:flex;flex-wrap:wrap;gap:.55rem;margin-top:1rem}
#aquavo-ssr-page-content a{display:inline-flex;align-items:center;border:1px solid rgba(255,255,255,.12);border-radius:8px;color:#e4f3f8;background:rgba(255,255,255,.04);padding:.42rem .7rem;text-decoration:none;font-size:.9rem;line-height:1.4}
#aquavo-ssr-page-content a:hover{border-color:#0B93A6;color:#fff;background:rgba(11,147,166,.14)}`;

export function renderAhrefsSsrContentSection(pathname: string): string {
  const page = SEO_CONTENT_PAGES[normalizeSeoPath(pathname)];
  if (!page) return "";

  const links = linksFor(page);
  const linkedLabels = links.slice(0, 5).map((link) => link.label).join("، ");
  const linkHtml = links.map((link) => `<a href="${esc(link.href)}">${esc(link.label)}</a>`).join("");

  return `<section id="aquavo-ssr-page-content" data-ahrefs-critical-seo>
<style>${SEO_CONTENT_CSS}</style>
<div class="asc-wrap">
<h1>${esc(page.h1)}</h1>
<p><strong>${esc(page.h1)}</strong> صفحة مخصصة لـ ${esc(page.topic)}. ${esc(page.audience)}. الهدف منها أن تعطي الزائر جواباً مختصراً ومفيداً داخل HTML من السيرفر قبل تحميل JavaScript، حتى يعرف هل هذه الصفحة تناسب حاجته أم يحتاج دليلاً آخر.</p>
<p>في AQUAVO نربط التعليم بالمنتج بشكل هادئ: نوضح المشكلة، ثم نرشدك إلى الأدلة والمنتجات والسياسات المناسبة بدون ضغط شراء. ${esc(page.action)}. هذا مهم لهواة أحواض الزينة في العراق لأن جودة الماء، اختيار الفلتر، الحرارة، الديكور، وروتين الصيانة كلها قرارات تؤثر على استقرار الحوض.</p>
<p>للاستفادة أكثر، انتقل من هذه الصفحة إلى الروابط الداخلية القريبة مثل ${esc(linkedLabels)}. كل الروابط هنا ظاهرة وليست مخفية، وتساعد الزائر ومحركات البحث على فهم بنية الموقع. AQUAVO يركز على معدات ومستلزمات أحواض الزينة فقط، ولا يبيع أسماكاً حية أو كائنات حية أو نباتات حية.</p>
<nav aria-label="روابط مرتبطة بهذه الصفحة">${linkHtml}</nav>
</div>
</section>`;
}

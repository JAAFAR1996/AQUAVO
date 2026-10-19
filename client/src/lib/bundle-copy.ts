export type StorefrontLocale = "ar" | "en" | "ckb";

export type BundleCopy = {
  name: string;
  description: string;
  scope?: string;
  fitNote?: string;
  installationNote?: string;
};

const BUNDLE_COPY: Record<string, Record<StorefrontLocale, BundleCopy>> = {
  "betta-care-starter": {
    ar: {
      name: "باقة بداية البيتا",
      description: "طعام للفايتر، فلتر إسفنجي، مضخة وصوندة هواء، معالج مي وميزان حرارة للعناية بحوض موجود عندك.",
      scope: "مستلزمات عناية؛ الحوض والسخان مو ضمن الباقة.",
      fitNote: "تحتاج مساعدة باختيار الفلتر والمضخة؟ ارسل قياس حوضك وعدد السمك ونتأكد وياك.",
      installationNote: "إذا المضخة أوطى من مستوى المي، تحتاج صمام منع رجوع منفصل؛ مو ضمن الباقة.",
    },
    en: {
      name: "Betta Care Starter",
      description: "Betta food, a sponge filter, air pump and tubing, water conditioner and a thermometer for a tank you already own.",
      scope: "Care accessories; the aquarium and heater are not included.",
      fitNote: "Need help choosing the filter and pump? Share your tank dimensions and fish count so we can help check the fit.",
      installationNote: "An air pump below the water level needs a separate check valve, which is not included.",
    },
    ckb: {
      name: "پاکێجی دەستپێکی بێتا",
      description: "خواردنی بێتا، فلتەری ئەسفەنجی، پەمپ و بۆری هەوا، چارەسەری ئاو و پێوەری گەرمی بۆ حەوزێک کە پێشتر هەتە.",
      scope: "کەرەستەی چاودێری؛ حەوز و گەرمکەرەوە لە پاکێجەکەدا نین.",
      fitNote: "بۆ هەڵبژاردنی فلتەر و پەمپ یارمەتیت دەوێت؟ قەبارەی حەوز و ژمارەی ماسییەکانمان بۆ بنێرە تا پێکەوە دڵنیا بینەوە.",
      installationNote: "ئەگەر پەمپەکە لە خوار ئاستی ئاوە، پێویستی بە ڤاڵڤی ڕێگری لە گەڕانەوەی ئاو هەیە؛ لە پاکێجەکەدا نییە.",
    },
  },
  "guppy-starter": {
    ar: {
      name: "باقة بداية الجوبي",
      description: "طعام للجوبي، فلتر إسفنجي، مضخة وصوندة هواء، معالج مي وميزان حرارة للعناية بحوض موجود عندك.",
      scope: "مستلزمات عناية؛ الحوض والسخان مو ضمن الباقة.",
      fitNote: "قياس الحوض وعدد السمك يفرقون باختيار الفلتر والمضخة. نساعدك تتأكد من الاختيار قبل الطلب.",
      installationNote: "إذا المضخة أوطى من مستوى المي، تحتاج صمام منع رجوع منفصل؛ مو ضمن الباقة.",
    },
    en: {
      name: "Guppy Starter",
      description: "Guppy food, a sponge filter, air pump and tubing, water conditioner and a thermometer for a tank you already own.",
      scope: "Care accessories; the aquarium and heater are not included.",
      fitNote: "Tank dimensions and fish count matter when choosing filtration and airflow. We can help check your selection before you order.",
      installationNote: "An air pump below the water level needs a separate check valve, which is not included.",
    },
    ckb: {
      name: "پاکێجی دەستپێکی گوپی",
      description: "خواردنی گوپی، فلتەری ئەسفەنجی، پەمپ و بۆری هەوا، چارەسەری ئاو و پێوەری گەرمی بۆ حەوزێک کە پێشتر هەتە.",
      scope: "کەرەستەی چاودێری؛ حەوز و گەرمکەرەوە لە پاکێجەکەدا نین.",
      fitNote: "قەبارەی حەوز و ژمارەی ماسی گرنگن بۆ هەڵبژاردنی فلتەر و پەمپ. پێش داواکردن یارمەتیت دەدەین لە هەڵبژاردنەکەت دڵنیا بیتەوە.",
      installationNote: "ئەگەر پەمپەکە لە خوار ئاستی ئاوە، پێویستی بە ڤاڵڤی ڕێگری لە گەڕانەوەی ئاو هەیە؛ لە پاکێجەکەدا نییە.",
    },
  },
  "planted-tank-starter": {
    ar: {
      name: "باقة بداية الحوض المزروع",
      description: "ركيزة، سماد وأدوات ترتيب، ويه غراء وخيط لتثبيت الموس ضمن شغل الأكواسكيب.",
      scope: "مواد للركيزة والترتيب؛ الحوض والإضاءة مو ضمن الباقة.",
      fitNote: "كمية الركيزة اللي تحتاجها تعتمد على مساحة قاع حوضك وعمق الطبقة اللي تريدها.",
    },
    en: {
      name: "Planted Tank Starter",
      description: "Substrate, base fertilizer and aquascaping tools, with glue and thread for attaching moss.",
      scope: "Substrate and aquascaping supplies; the aquarium and lighting are not included.",
      fitNote: "The substrate quantity you need depends on your tank's base area and the depth of the layer you want.",
    },
    ckb: {
      name: "پاکێجی دەستپێکی حەوزی ڕووەکدار",
      description: "خاکی بنەڕەت، پەین و ئامرازی ڕێکخستنی ئەکواسکەیپ، لەگەڵ چەسپ و دەزوو بۆ جێگیرکردنی مۆس.",
      scope: "کەرەستەی بنەڕەت و ڕێکخستن؛ حەوز و ڕووناکی لە پاکێجەکەدا نین.",
      fitNote: "بڕی خاکی پێویست بە ڕووبەری بنەوەی حەوز و ئەستووری چینەکەوە بەستراوە.",
    },
  },
  "filter-maintenance-pack": {
    ar: {
      name: "باقة صيانة الفلتر",
      description: "قطن فلترة، كربون، كيس ميديا وفرشاة لتنظيف صوندة الفلتر.",
      scope: "مواد وأدوات لصيانة فلتر موجود عندك؛ الفلتر مو ضمن الباقة.",
      fitNote: "راجع مساحة الميديا وقياس صوندة فلترك. الكربون تستخدمه حسب حاجة الحوض.",
    },
    en: {
      name: "Filter Maintenance Pack",
      description: "Filter floss, activated carbon, a media bag and a brush for cleaning filter tubing.",
      scope: "Media and tools for a filter you already own; a filter is not included.",
      fitNote: "Check your filter's media space and tubing size. Use activated carbon when your tank needs it.",
    },
    ckb: {
      name: "پاکێجی چاکسازی فلتەر",
      description: "پەموی فلتەر، کاربۆنی چالاک، کیسەی میدیا و فڵچە بۆ پاککردنەوەی بۆری فلتەر.",
      scope: "ماددە و ئامراز بۆ فلتەرێک کە پێشتر هەتە؛ فلتەر لە پاکێجەکەدا نییە.",
      fitNote: "بۆشایی میدیا و قەبارەی بۆری فلتەرەکەت بپشکنە. کاربۆن بەپێی پێویستی حەوزەکەت بەکاربهێنە.",
    },
  },
  "water-testing-pack": {
    ar: {
      name: "باقة فحص ومراقبة الماء",
      description: "شرائط فحص، ميزان حرارة ومعالج مي حتى تتابع حالة ماي حوضك.",
      scope: "لمراقبة الحرارة والقيم المذكورة على شرائط الفحص.",
      fitNote: "شوف بصفحة الشرائط شنو تقيس، واتبع جرعة معالج المي المكتوبة على العبوة.",
    },
    en: {
      name: "Water Testing Pack",
      description: "Test strips, a thermometer and water conditioner for monitoring your aquarium water.",
      scope: "For temperature and the water parameters listed on the test strips.",
      fitNote: "Check the strip's product page for the parameters it measures, and follow the conditioner dosage on its label.",
    },
    ckb: {
      name: "پاکێجی پشکنین و چاودێری ئاو",
      description: "شریتی پشکنین، پێوەری گەرمی و چارەسەری ئاو بۆ چاودێری ئاوی حەوزەکەت.",
      scope: "بۆ پلەی گەرمی و ئەو پێوەرانەی لەسەر شریتی پشکنین نووسراون.",
      fitNote: "لە پەڕەی شریتەکە بزانە چی دەپێوێت و ڕێنمایی بڕی بەکارهێنانی چارەسەری ئاو لەسەر پاکەتەکە پەیڕەو بکە.",
    },
  },
  "safe-water-change-pack": {
    ar: {
      name: "باقة تغيير الماء الآمن",
      description: "سيفون لتبديل جزء من المي وتنظيف القاع، معالج مي وشرائط فحص بباقة وحدة.",
      scope: "لروتين تغيير المي بحوض موجود عندك؛ المحتويات موضحة أدناه.",
      fitNote: "خلي طرف تصريف السيفون أوطى من مستوى مي الحوض، واتبع جرعة معالج المي المكتوبة على العبوة.",
    },
    en: {
      name: "Safe Water Change Pack",
      description: "A siphon for partial water changes and substrate cleaning, with water conditioner and test strips.",
      scope: "For the water-change routine in a tank you already own; contents are listed below.",
      fitNote: "Keep the siphon outlet below the aquarium water level, and follow the conditioner dosage on its label.",
    },
    ckb: {
      name: "پاکێجی گۆڕینی ئاوی پارێزراو",
      description: "سایفۆن بۆ گۆڕینی بەشێک لە ئاو و پاککردنەوەی بنەوە، لەگەڵ چارەسەری ئاو و شریتی پشکنین.",
      scope: "بۆ ڕوتینی گۆڕینی ئاوی حەوزێک کە پێشتر هەتە؛ پێکهاتەکان لە خوارەوەن.",
      fitNote: "کۆتایی بۆری دەرچوونی ئاو لە خوار ئاستی ئاوی حەوز دابنێ و ڕێنمایی بڕی چارەسەری ئاو لەسەر پاکەتەکە پەیڕەو بکە.",
    },
  },
};

const ITEM_PURPOSES: Record<string, Record<StorefrontLocale, string>> = {
  "yee-c1-1124-1": { ar: "طعام للفايتر؛ اتبع تعليمات التغذية على العبوة.", en: "Food for bettas; follow the feeding instructions on the pack.", ckb: "خواردن بۆ بێتا؛ ڕێنمایی خواردندان لەسەر پاکەتەکە پەیڕەو بکە." },
  "yee-c1-1113-2": { ar: "طعام للجوبي؛ اتبع تعليمات التغذية على العبوة.", en: "Food for guppies; follow the feeding instructions on the pack.", ckb: "خواردن بۆ گوپی؛ ڕێنمایی خواردندان لەسەر پاکەتەکە پەیڕەو بکە." },
  "general-sponge-filter-xy180": { ar: "يحجز الأوساخ بالإسفنج ويحتاج مضخة هواء حتى يشتغل.", en: "Traps debris in its sponge and needs an air pump to operate.", ckb: "خاشاک لە ئەسفەنجەکەدا ڕادەگرێت و بۆ کارکردن پێویستی بە پەمپی هەوا هەیە." },
  "sunsun-air-pump": { ar: "تدفع الهواء للفلتر الإسفنجي عن طريق الصوندة.", en: "Supplies air to the sponge filter through the tubing.", ckb: "لە ڕێگەی بۆرییەکەوە هەوا بۆ فلتەری ئەسفەنجی دەنێرێت." },
  "houyi-oxygenation-tube": { ar: "صوندة تربط مضخة الهواء بالفلتر الإسفنجي.", en: "Tubing that connects the air pump to the sponge filter.", ckb: "بۆری بۆ بەستنەوەی پەمپی هەوا بە فلتەری ئەسفەنجی." },
  "yee-02924": { ar: "لمعالجة مي الحنفية حسب الجرعة المكتوبة على العبوة.", en: "Conditions tap water at the dosage stated on its label.", ckb: "بۆ چارەسەرکردنی ئاوی بۆری بەپێی بڕی نووسراو لەسەر پاکەتەکە." },
  "houyi-suction-thermometer": { ar: "حتى تتابع حرارة المي داخل الحوض.", en: "Lets you monitor the water temperature in your aquarium.", ckb: "بۆ چاودێریکردنی پلەی گەرمی ئاوی ناو حەوز." },
  "houyi-led-light": { ar: "شاشة رقمية حتى تتابع قراءة مستشعر الحرارة داخل المي.", en: "A digital display for monitoring the temperature probe in the water.", ckb: "شاشەی ژمارەیی بۆ چاودێریکردنی خوێندنەوەی هەستەوەری گەرمی ناو ئاو." },
  "yee-07509": { ar: "ركيزة لقاع الحوض المزروع؛ الكمية حسب مساحة القاع.", en: "Substrate for a planted aquarium; the amount depends on the tank base area.", ckb: "خاکی بنەڕەت بۆ حەوزی ڕووەکدار؛ بڕەکە بە ڕووبەری بنەوەوە بەستراوە." },
  "houyi-moss-glue-5g": { ar: "غراء لتثبيت الموس خلال ترتيب الأكواسكيب.", en: "Glue for attaching moss while arranging an aquascape.", ckb: "چەسپ بۆ جێگیرکردنی مۆس لە کاتی ڕێکخستنی ئەکواسکەیپ." },
  "houyi-tool-kit": { ar: "أدوات تساعدك بترتيب الأكواسكيب داخل الحوض.", en: "Tools to help arrange and maintain an aquascape.", ckb: "ئامراز بۆ ڕێکخستن و چاودێری ئەکواسکەیپ." },
  "houyi-base-fertilizer": { ar: "سماد للركيزة، يستخدم حسب تعليمات المنتج.", en: "Base fertilizer; use according to the product instructions.", ckb: "پەینی بنەڕەت؛ بەپێی ڕێنمایی بەرهەمەکە بەکاریبهێنە." },
  "houyi-moss-line": { ar: "خيط لتثبيت الموس على الخشب أو الصخر.", en: "Thread for securing moss to wood or rock.", ckb: "دەزوو بۆ بەستنی مۆس بە دار یان بەرد." },
  "houyi-white-cotton": { ar: "قطن يحجز الأوساخ العالقة داخل الفلتر.", en: "Filter floss that traps suspended debris inside the filter.", ckb: "پەموی فلتەر بۆ ڕاگرتنی خاشاکی هەڵواسراو لە ناو فلتەر." },
  "houyi-activated-carbon": { ar: "يمتص بعض المواد الذائبة بالمي، ويستخدم حسب الحاجة.", en: "Adsorbs some dissolved substances from water; use as needed.", ckb: "هەندێک ماددەی تواوەی ناو ئاو هەڵدەمژێت؛ بەپێی پێویستی بەکاریبهێنە." },
  "houyi-net-bag": { ar: "يجمع ميديا الفلتر ويسهل رفعها للصيانة.", en: "Keeps filter media together so it is easier to remove for maintenance.", ckb: "میدیای فلتەر کۆدەکاتەوە بۆ ئەوەی لابردنی بۆ چاودێری ئاسانتر بێت." },
  "houyi-hose-brush": { ar: "فرشاة لتنظيف داخل صوندة الفلتر.", en: "A brush for cleaning the inside of filter tubing.", ckb: "فڵچە بۆ پاککردنەوەی ناو بۆری فلتەر." },
  "yee-c4-1123-1a": { ar: "لفحص قيم المي المذكورة على العبوة.", en: "Tests the water parameters listed on the pack.", ckb: "بۆ پشکنینی ئەو پێوەرانەی ئاو کە لەسەر پاکەتەکە نووسراون." },
  "houyi-water-changer-siphon": { ar: "لسحب المي وتنظيف الفضلات من قاع الحوض.", en: "Draws out water and removes debris from the aquarium substrate.", ckb: "بۆ ڕاکێشانی ئاو و لابردنی پاشماوە لە بنەوەی حەوز." },
};

export const BUNDLE_GATEWAY_COPY = {
  ar: { title: "عندك حوض وتريد تعرف شتحتاج؟", description: "شوف الباقات حسب نوع السمك أو شغلة الصيانة، وتعرف شنو مشمول بكل وحدة.", all: "شوف كل الباقات" },
  en: { title: "Already have a tank? Start with what you need.", description: "Explore fish-care and maintenance bundles, with clear contents for each task.", all: "Explore all bundles" },
  ckb: { title: "حەوزت هەیە و نازانیت پێویستت بە چییە؟", description: "پاکێجەکان بەپێی جۆری ماسی یان کاری چاودێری ببینە و بزانە هەر یەکێک چی لەخۆدەگرێت.", all: "هەموو پاکێجەکان ببینە" },
} satisfies Record<StorefrontLocale, { title: string; description: string; all: string }>;

export function getBundleItemPurpose(productId: string, locale: StorefrontLocale): string | undefined {
  return ITEM_PURPOSES[productId]?.[locale];
}

export function getBundleCopy(
  slug: string,
  locale: string,
  fallbackName: string,
  fallbackDescription: string,
): BundleCopy {
  const safeLocale: StorefrontLocale = locale === "en" || locale === "ckb" ? locale : "ar";
  return BUNDLE_COPY[slug]?.[safeLocale] ?? { name: fallbackName, description: fallbackDescription };
}

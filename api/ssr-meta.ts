import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { HTML_TEMPLATE } from "./_html-template.js";

// ─── DB Setup (lightweight, no Drizzle overhead) ────────────────────────────
neonConfig.webSocketConstructor = ws;
let pool: Pool | null = null;
function getPool(): Pool | null {
  if (!process.env.DATABASE_URL) return null;
  if (!pool) pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return pool;
}

// ─── HTML template (imported from build-generated file) ─────────────────────
function getTemplate(): string {
  return HTML_TEMPLATE;
}

// ─── Constants ──────────────────────────────────────────────────────────────
const BASE = "https://www.aquavoiq.com";
const DEFAULT_IMAGE = `${BASE}/logo_aquavo.png`;
const DEFAULT_TITLE = "AQUAVO - متجر اسماك زينة ومستلزمات احواض في العراق | بغداد";
const DEFAULT_DESC = "AQUAVO أول متجر اونلاين متخصص في اسماك الزينة ومستلزمات الاحواض في العراق. فلاتر، سخانات، اسماك، نباتات مائية، أغذية وعلاجات بأفضل الأسعار مع توصيل لكل محافظات العراق. بيع اسماك زينة بغداد.";
const DEFAULT_KEYWORDS = "اسماك زينة العراق، متجر اسماك زينة بغداد، مستلزمات احواض سمك، بيع اسماك زينة، احواض سمك للبيع، فلاتر احواض، سخانات احواض، شراء اسماك اونلاين العراق";

// ─── Static page metadata ───────────────────────────────────────────────────
interface PageMeta {
  title: string;
  description: string;
  keywords?: string;
  ogType?: string;
  jsonLd?: object | object[];
}

const STATIC_PAGES: Record<string, PageMeta> = {
  "/": {
    title: "AQUAVO - متجر اسماك زينة ومستلزمات احواض في العراق | بغداد",
    description: "AQUAVO أول متجر اونلاين متخصص في اسماك الزينة ومستلزمات الاحواض في العراق. فلاتر، سخانات، اسماك، نباتات مائية، أغذية وعلاجات بأفضل الأسعار مع توصيل لكل محافظات العراق. بيع اسماك زينة بغداد.",
    keywords: "اسماك زينة العراق، متجر اسماك زينة بغداد، مستلزمات احواض سمك العراق، بيع اسماك زينة، احواض سمك للبيع، فلاتر احواض، سخانات احواض، شراء اسماك اونلاين العراق",
    ogType: "website",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "OnlineStore",
        name: "AQUAVO",
        alternateName: "اكوافو",
        url: BASE,
        logo: DEFAULT_IMAGE,
        image: DEFAULT_IMAGE,
        description: "أول متجر اونلاين متخصص في اسماك الزينة ومستلزمات الاحواض في العراق",
        currenciesAccepted: "IQD",
        paymentAccepted: "Cash, Credit Card",
        priceRange: "$$",
        address: { "@type": "PostalAddress", addressLocality: "بغداد", addressRegion: "بغداد", addressCountry: "IQ" },
        geo: { "@type": "GeoCoordinates", latitude: "33.3152", longitude: "44.3661" },
        telephone: "+964-774-788-0673",
        contactPoint: { "@type": "ContactPoint", telephone: "+964-774-788-0673", contactType: "customer service", availableLanguage: ["Arabic", "ar"] },
        sameAs: ["https://instagram.com/aquavo_iq", "https://www.tiktok.com/@aquavo.iq", "https://www.facebook.com/profile.php?id=61587249730248"],
        areaServed: { "@type": "Country", name: "العراق" },
        openingHoursSpecification: [
          { "@type": "OpeningHoursSpecification", dayOfWeek: ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"], opens: "09:00", closes: "21:00" },
        ],
        potentialAction: {
          "@type": "SearchAction",
          target: `${BASE}/products?search={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "AQUAVO",
        alternateName: "اكوافو",
        url: BASE,
        inLanguage: "ar",
        potentialAction: {
          "@type": "SearchAction",
          target: `${BASE}/products?search={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@context": "https://schema.org",
        "@type": "SpeakableSpecification",
        cssSelector: ["h1", ".hero-section", "[data-speakable]"],
      },
    ],
  },
  "/products": {
    title: "مستلزمات احواض اسماك الزينة في العراق - فلاتر، سخانات، اغذية | AQUAVO",
    description: "تسوق جميع مستلزمات احواض اسماك الزينة في العراق: فلاتر، سخانات، أغذية، علاجات، نباتات مائية، إضاءة LED، ديكورات وأكثر. أسعار منافسة وتوصيل لكل المحافظات.",
    keywords: "مستلزمات احواض سمك العراق، فلاتر احواض بغداد، سخانات احواض، اغذية اسماك زينة، نباتات مائية، شراء اونلاين",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "جميع مستلزمات احواض اسماك الزينة",
        description: "تصفح جميع مستلزمات احواض اسماك الزينة في العراق",
        url: `${BASE}/products`,
        inLanguage: "ar",
        isPartOf: { "@type": "WebSite", name: "AQUAVO", url: BASE },
      },
      {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "فئات منتجات AQUAVO",
        description: "جميع فئات مستلزمات احواض اسماك الزينة المتوفرة في العراق",
        url: `${BASE}/products`,
        numberOfItems: 12,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "أحواض زجاجية", url: `${BASE}/products?category=tanks` },
          { "@type": "ListItem", position: 2, name: "فلاتر", url: `${BASE}/products?category=filters` },
          { "@type": "ListItem", position: 3, name: "سخانات", url: `${BASE}/products?category=heaters` },
          { "@type": "ListItem", position: 4, name: "إضاءة LED", url: `${BASE}/products?category=lighting` },
          { "@type": "ListItem", position: 5, name: "أغذية أسماك", url: `${BASE}/products?category=food` },
          { "@type": "ListItem", position: 6, name: "علاجات مياه", url: `${BASE}/products?category=treatments` },
          { "@type": "ListItem", position: 7, name: "نباتات مائية", url: `${BASE}/products?category=plants` },
          { "@type": "ListItem", position: 8, name: "ديكورات", url: `${BASE}/products?category=decorations` },
          { "@type": "ListItem", position: 9, name: "ركائز", url: `${BASE}/products?category=substrates` },
          { "@type": "ListItem", position: 10, name: "مضخات هواء", url: `${BASE}/products?category=air-pumps` },
          { "@type": "ListItem", position: 11, name: "أسماك حية", url: `${BASE}/products?category=live-fish` },
          { "@type": "ListItem", position: 12, name: "أطقم كاملة للمبتدئين", url: `${BASE}/products?category=starter-kits` },
        ],
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "الرئيسية", item: BASE },
          { "@type": "ListItem", position: 2, name: "المنتجات", item: `${BASE}/products` },
        ],
      },
    ],
  },
  "/deals": {
    title: "عروض وتخفيضات اسماك الزينة ومستلزمات الأحواض في العراق | AQUAVO",
    description: "أقوى العروض والتخفيضات على مستلزمات احواض اسماك الزينة في العراق. خصومات يومية على الفلاتر والسخانات والأغذية والديكورات. وفّر أكثر مع AQUAVO.",
    keywords: "عروض اسماك زينة العراق، تخفيضات مستلزمات احواض، خصومات احواض سمك بغداد، عروض يومية",
  },
  "/blog": {
    title: "مدونة اسماك الزينة - نصائح تربية وعناية بالاحواض في العراق | AQUAVO",
    description: "مقالات ونصائح متخصصة عن تربية اسماك الزينة في العراق، العناية بالاحواض، معالجة أمراض الأسماك، وأفضل الممارسات للمبتدئين والمحترفين في بغداد والعراق.",
    keywords: "تربية اسماك زينة العراق، نصائح احواض سمك، امراض اسماك، عناية بالاحواض، مدونة اسماك بغداد",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "الرئيسية", item: BASE },
        { "@type": "ListItem", position: 2, name: "المدونة", item: `${BASE}/blog` },
      ],
    },
  },
  "/fish-encyclopedia": {
    title: "موسوعة اسماك الزينة - أنواع الأسماك المتوفرة في العراق | AQUAVO",
    description: "موسوعة شاملة لأنواع اسماك الزينة المتوفرة في العراق مع معلومات عن كل نوع: التغذية، درجة الحرارة، التوافق، والعناية. دليلك الأول لاسماك الزينة في بغداد.",
    keywords: "انواع اسماك زينة العراق، موسوعة اسماك بغداد، جوبي، نيون تيترا، بيتا، سيكلد، اسماك عراق",
  },
  "/journey": {
    title: "رحلة حوضك - خطة متكاملة لبناء حوض أسماك زينة في العراق | AQUAVO",
    description: "ابدأ رحلة حوضك مع AQUAVO. خطط مخصصة خطوة بخطوة لبناء حوض اسماك زينة مثالي من الصفر. دليل عراقي شامل للمبتدئين.",
    keywords: "بناء حوض سمك العراق، رحلة حوض، حوض سمك للمبتدئين بغداد، تأسيس حوض زينة",
  },
  "/calculators": {
    title: "حاسبات احواض السمك - احسب حجم الحوض والفلتر والسخان مجاناً | AQUAVO",
    description: "حاسبات ذكية مجانية لهواة اسماك الزينة في العراق: احسب حجم الحوض المناسب، قوة الفلتر المطلوبة، حجم السخان، كمية الماء، وعدد الأسماك المثالي لحوضك.",
    keywords: "حاسبة حوض سمك، حساب حجم حوض، حاسبة فلتر احواض، حاسبة سخان، حاسبة اسماك زينة، ادوات مجانية",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "حاسبات احواض السمك - AQUAVO",
      url: `${BASE}/calculators`,
      applicationCategory: "UtilityApplication",
      operatingSystem: "Web",
      offers: { "@type": "Offer", price: "0", priceCurrency: "IQD" },
      description: "حاسبات ذكية مجانية لحساب حجم الحوض وقوة الفلتر وحجم السخان وعدد الأسماك",
      inLanguage: "ar",
    },
  },
  "/fish-finder": {
    title: "البحث عن اسماك زينة مناسبة لحوضك في العراق | AQUAVO",
    description: "أداة ذكية للبحث عن اسماك الزينة المناسبة لحوضك حسب الحجم ودرجة الحرارة والتوافق. اعثر على السمكة المثالية من AQUAVO العراق.",
    keywords: "بحث اسماك زينة، اسماك مناسبة لحوضي، اختيار اسماك، توافق اسماك العراق",
  },
  "/fish-health": {
    title: "تشخيص وعلاج أمراض اسماك الزينة في العراق | AQUAVO",
    description: "شخّص أمراض اسماك الزينة واحصل على خطة علاج مناسبة. دليل شامل لأمراض الأسماك الشائعة في العراق: النقطة البيضاء، الفطريات، تعفن الزعانف وأكثر.",
    keywords: "امراض اسماك زينة العراق، علاج اسماك بغداد، تشخيص مرض سمكة، فطريات اسماك، نقطة بيضاء، تعفن زعانف",
  },
  "/beginner-guide": {
    title: "دليل المبتدئين لتربية اسماك الزينة في العراق | AQUAVO",
    description: "دليل شامل للمبتدئين في تربية اسماك الزينة في العراق. من اختيار الحوض والفلتر إلى إضافة الأسماك والعناية اليومية. كل ما تحتاجه لبدء هوايتك في بغداد.",
    keywords: "دليل مبتدئين اسماك زينة العراق، بداية هواية اسماك بغداد، نصائح اول حوض سمك، تربية اسماك للمبتدئين",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "HowTo",
        name: "كيف تبدأ بتربية اسماك الزينة في العراق - دليل خطوة بخطوة",
        description: "دليل شامل للمبتدئين لإنشاء حوض اسماك زينة ناجح من الصفر",
        totalTime: "P7D",
        estimatedCost: { "@type": "MonetaryAmount", currency: "IQD", value: "100000" },
        supply: [
          { "@type": "HowToSupply", name: "حوض زجاجي (60 لتر على الأقل)" },
          { "@type": "HowToSupply", name: "فلتر مناسب لحجم الحوض" },
          { "@type": "HowToSupply", name: "سخان مائي" },
          { "@type": "HowToSupply", name: "إضاءة LED" },
          { "@type": "HowToSupply", name: "حصى أو ركيزة" },
          { "@type": "HowToSupply", name: "مزيل كلور" },
        ],
        step: [
          { "@type": "HowToStep", name: "اختيار الحوض", text: "اختر حوضاً بحجم 60 لتر على الأقل. الأحواض الأكبر أسهل في الصيانة وأكثر استقراراً." },
          { "@type": "HowToStep", name: "تركيب المعدات", text: "ركّب الفلتر والسخان والإضاءة حسب تعليمات الشركة المصنعة." },
          { "@type": "HowToStep", name: "إضافة الركيزة والديكور", text: "أضف الحصى أو الركيزة ثم النباتات والصخور والديكورات." },
          { "@type": "HowToStep", name: "ملء الحوض بالماء", text: "املأ الحوض بالماء المعالج بمزيل الكلور ببطء لتجنب تحريك الديكور." },
          { "@type": "HowToStep", name: "تدوير الحوض", text: "شغّل الفلتر والسخان وانتظر 5-7 أيام قبل إضافة أي أسماك لتنمو البكتيريا النافعة." },
          { "@type": "HowToStep", name: "إضافة الأسماك", text: "أضف 2-3 أسماك صغيرة في البداية ثم زد العدد تدريجياً كل أسبوع." },
        ],
        inLanguage: "ar",
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "الرئيسية", item: BASE },
          { "@type": "ListItem", position: 2, name: "دليل المبتدئين", item: `${BASE}/beginner-guide` },
        ],
      },
    ],
  },
  "/fish-compatibility": {
    title: "توافق اسماك الزينة - أي الأسماك تعيش مع بعض | AQUAVO",
    description: "تعرف على توافق اسماك الزينة مع بعضها في العراق. دليل شامل: أي الأسماك تعيش بسلام وأيها يجب فصلها. جوبي، بيتا، سيكلد، نيون تيترا والمزيد.",
    keywords: "توافق اسماك زينة، اسماك تعيش مع بعض، خلط اسماك حوض، توافق جوبي، توافق بيتا",
  },
  "/tank-builder": {
    title: "مصمم احواض السمك - صمم حوضك المثالي اونلاين | AQUAVO",
    description: "صمم حوض اسماك الزينة المثالي خطوة بخطوة اونلاين. اختر الحجم والفلتر والسخان والديكور مع مصمم الأحواض الذكي من AQUAVO العراق.",
    keywords: "تصميم حوض سمك، مصمم احواض اونلاين، بناء حوض زينة، تجهيز حوض سمك العراق",
  },
  "/community-gallery": {
    title: "معرض أحواض اسماك الزينة - صور عملاء AQUAVO في العراق",
    description: "شاهد أجمل أحواض اسماك الزينة من عملاء AQUAVO في العراق. شارك صور حوضك وألهم هواة الأسماك الآخرين في بغداد والعراق.",
  },
  "/faq": {
    title: "أسئلة شائعة عن اسماك الزينة واحواض السمك في العراق | AQUAVO",
    description: "إجابات على أكثر الأسئلة شيوعاً حول تربية اسماك الزينة في العراق، العناية بالأحواض، التوصيل، والطلب من AQUAVO. كل ما يسأله المبتدئين والهواة.",
    keywords: "اسئلة اسماك زينة، اسئلة احواض سمك، كيف اربي اسماك زينة، متجر اسماك العراق",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        name: "الأسئلة الشائعة - AQUAVO",
        description: "إجابات شاملة على أكثر الأسئلة شيوعاً حول اسماك الزينة ومستلزمات الأحواض في العراق",
        url: `${BASE}/faq`,
        inLanguage: "ar",
        mainEntity: [
          // الشحن والتوصيل
          { "@type": "Question", name: "ما هي مناطق التوصيل المتاحة؟", acceptedAnswer: { "@type": "Answer", text: "نوصل إلى جميع محافظات العراق. التوصيل داخل بغداد خلال 24-48 ساعة، والمحافظات الأخرى خلال 3-5 أيام عمل." } },
          { "@type": "Question", name: "كم تكلفة التوصيل؟", acceptedAnswer: { "@type": "Answer", text: "التوصيل مجاني للطلبات فوق 50,000 دينار داخل بغداد. للطلبات الأقل، رسوم التوصيل 5,000 دينار لبغداد و10,000-15,000 دينار للمحافظات." } },
          { "@type": "Question", name: "هل يمكن تتبع طلبي؟", acceptedAnswer: { "@type": "Answer", text: "نعم! بمجرد شحن طلبك، ستتلقى رسالة نصية ورسالة واتساب تحتوي على رابط التتبع المباشر ورقم الشحنة." } },
          { "@type": "Question", name: "ماذا لو لم أكن متواجداً عند التوصيل؟", acceptedAnswer: { "@type": "Answer", text: "سيتواصل معك مندوب التوصيل قبل الوصول. يمكنك تحديد موعد آخر أو ترك الطلب مع شخص موثوق بعد تأكيد هويته." } },
          { "@type": "Question", name: "هل تشحنون الأسماك الحية؟", acceptedAnswer: { "@type": "Answer", text: "نعم، نشحن الأسماك الحية بعناية فائقة باستخدام أكياس أكسجين خاصة وعزل حراري. الشحن متاح فقط داخل بغداد والمناطق القريبة لضمان سلامة الأسماك." } },
          // الدفع والفواتير
          { "@type": "Question", name: "ما هي طرق الدفع المتاحة؟", acceptedAnswer: { "@type": "Answer", text: "نقبل الدفع نقداً عند الاستلام، التحويل البنكي، كي كارد، زين كاش، وآسيا حوالة. جميع طرق الدفع آمنة ومضمونة." } },
          { "@type": "Question", name: "هل الدفع عند الاستلام متاح؟", acceptedAnswer: { "@type": "Answer", text: "نعم! الدفع عند الاستلام متاح لجميع الطلبات. يمكنك فحص المنتج والتأكد من سلامته قبل الدفع." } },
          { "@type": "Question", name: "هل يمكنني الحصول على فاتورة؟", acceptedAnswer: { "@type": "Answer", text: "نعم، نرسل فاتورة إلكترونية مع كل طلب عبر البريد الإلكتروني وواتساب. يمكنك أيضاً طلب فاتورة مطبوعة مع الطلب." } },
          { "@type": "Question", name: "هل توجد رسوم إضافية مخفية؟", acceptedAnswer: { "@type": "Answer", text: "لا، السعر الذي تراه هو السعر النهائي. لا توجد رسوم خفية. رسوم التوصيل (إن وجدت) تظهر بوضوح قبل إتمام الطلب." } },
          { "@type": "Question", name: "هل يمكن الدفع بالتقسيط؟", acceptedAnswer: { "@type": "Answer", text: "نعم، للطلبات فوق 200,000 دينار نوفر خيار التقسيط على دفعتين أو ثلاث دفعات بدون فوائد. تواصل معنا للتفاصيل." } },
          // الإرجاع والاستبدال
          { "@type": "Question", name: "ما هي سياسة الإرجاع؟", acceptedAnswer: { "@type": "Answer", text: "يمكنك إرجاع المنتجات خلال 7 أيام من الاستلام بشرط أن تكون في حالتها الأصلية. الأسماك والنباتات الحية غير قابلة للإرجاع." } },
          { "@type": "Question", name: "كيف أطلب إرجاع منتج؟", acceptedAnswer: { "@type": "Answer", text: "تواصل معنا عبر واتساب أو الهاتف مع ذكر رقم الطلب وسبب الإرجاع. سنرسل لك تأكيد ويمكننا استلام المنتج من موقعك مجاناً في بغداد." } },
          { "@type": "Question", name: "متى أستلم المبلغ المسترد؟", acceptedAnswer: { "@type": "Answer", text: "للدفع النقدي، يتم الاسترداد فوراً عند استلام المنتج. للتحويلات البنكية، خلال 3-7 أيام عمل." } },
          { "@type": "Question", name: "هل يمكن استبدال المنتج بدلاً من إرجاعه؟", acceptedAnswer: { "@type": "Answer", text: "نعم! الاستبدال متاح ومجاني. يمكنك استبدال المنتج بمنتج آخر بنفس القيمة أو دفع/استرداد الفرق." } },
          { "@type": "Question", name: "ماذا لو وصل المنتج تالفاً؟", acceptedAnswer: { "@type": "Answer", text: "في حالة وصول منتج تالف، التقط صوراً واضحة وتواصل معنا خلال 24 ساعة. سنقوم بالاستبدال أو الاسترداد الكامل مع اعتذارنا." } },
          // العناية بالأسماك
          { "@type": "Question", name: "كيف أختار الحوض المناسب؟", acceptedAnswer: { "@type": "Answer", text: "استخدم حاسبة الحوض في موقعنا! بشكل عام، لكل سنتيمتر من طول السمكة تحتاج 2 لتر ماء كحد أدنى. الأحواض الأكبر أسهل في الصيانة." } },
          { "@type": "Question", name: "كم مرة يجب تغيير الماء؟", acceptedAnswer: { "@type": "Answer", text: "ننصح بتغيير 20-30% من الماء أسبوعياً. استخدم مزيل الكلور واترك الماء الجديد ليصل لنفس درجة حرارة الحوض." } },
          { "@type": "Question", name: "ما هي درجة الحرارة المناسبة؟", acceptedAnswer: { "@type": "Answer", text: "معظم الأسماك الاستوائية تحتاج 24-28 درجة مئوية. الأسماك الذهبية تفضل 18-24 درجة. تحقق من متطلبات كل نوع." } },
          { "@type": "Question", name: "كم مرة أطعم الأسماك؟", acceptedAnswer: { "@type": "Answer", text: "مرتين يومياً بكمية تستهلكها الأسماك خلال 2-3 دقائق. الإفراط في التغذية أخطر من التقليل ويلوث الماء." } },
          { "@type": "Question", name: "لماذا تموت أسماكي رغم العناية بها؟", acceptedAnswer: { "@type": "Answer", text: "الأسباب الشائعة: عدم تدوير الحوض قبل إضافة الأسماك، تغيير الماء بكميات كبيرة، أو اكتظاظ الحوض. تواصل معنا للتشخيص المجاني." } },
          // المنتجات والجودة
          { "@type": "Question", name: "هل المنتجات أصلية؟", acceptedAnswer: { "@type": "Answer", text: "نعم، جميع منتجاتنا أصلية 100% ومستوردة من الشركات المصنعة مباشرة. نوفر ضمان الأصالة على جميع المنتجات." } },
          { "@type": "Question", name: "هل يوجد ضمان على المعدات؟", acceptedAnswer: { "@type": "Answer", text: "نعم، جميع المعدات الإلكترونية (فلاتر، مضخات، سخانات، إضاءة) مغطاة بضمان من 6 أشهر إلى سنتين حسب المنتج." } },
          { "@type": "Question", name: "من أين مصدر الأسماك؟", acceptedAnswer: { "@type": "Answer", text: "أسماكنا من مزارع محلية موثوقة ومستوردين معتمدين. جميع الأسماك تخضع لفترة حجر صحي قبل البيع لضمان صحتها." } },
          { "@type": "Question", name: "هل تتوفر منتجات للمبتدئين؟", acceptedAnswer: { "@type": "Answer", text: "نعم! لدينا قسم خاص للمبتدئين يشمل أحواض جاهزة بكل ما تحتاجه، وأسماك سهلة الرعاية، مع دليل عناية مجاني." } },
          { "@type": "Question", name: "هل يمكن طلب منتج غير متوفر؟", acceptedAnswer: { "@type": "Answer", text: "بالتأكيد! أخبرنا بما تحتاجه وسنوفره لك خلال أسبوع إلى أسبوعين. لا يوجد حد أدنى للطلبات الخاصة." } },
          // الضمان والدعم
          { "@type": "Question", name: "ما هي مدة الضمان؟", acceptedAnswer: { "@type": "Answer", text: "الفلاتر والمضخات: سنة واحدة. السخانات والإضاءة LED: 6 أشهر. الأحواض: ضمان ضد التسريب لمدة سنة." } },
          { "@type": "Question", name: "ماذا يغطي الضمان؟", acceptedAnswer: { "@type": "Answer", text: "الضمان يغطي عيوب التصنيع والأعطال غير الناتجة عن سوء الاستخدام. لا يشمل الأضرار الناتجة عن الكهرباء غير المستقرة." } },
          { "@type": "Question", name: "كيف أستفيد من الضمان؟", acceptedAnswer: { "@type": "Answer", text: "احتفظ بفاتورة الشراء. عند حدوث مشكلة، تواصل معنا مع صور المنتج ورقم الفاتورة. سنوجهك للخطوات التالية." } },
          { "@type": "Question", name: "هل تقدمون دعماً فنياً؟", acceptedAnswer: { "@type": "Answer", text: "نعم! نوفر دعماً فنياً مجانياً عبر واتساب والهاتف. كما نقدم زيارات منزلية للمساعدة في تركيب وصيانة الأحواض الكبيرة." } },
          { "@type": "Question", name: "هل تتوفر قطع غيار؟", acceptedAnswer: { "@type": "Answer", text: "نعم، نوفر قطع غيار لمعظم المنتجات التي نبيعها. تواصل معنا مع موديل المنتج وسنخبرك بالتوفر والسعر." } },
        ],
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "الرئيسية", item: BASE },
          { "@type": "ListItem", position: 2, name: "الأسئلة الشائعة", item: `${BASE}/faq` },
        ],
      },
    ],
  },
  "/shipping": {
    title: "شحن وتوصيل مستلزمات اسماك الزينة لكل العراق | AQUAVO",
    description: "خدمة شحن وتوصيل مستلزمات احواض اسماك الزينة لجميع محافظات العراق. بغداد، البصرة، أربيل، النجف، كربلاء والمزيد. أوقات وأسعار التوصيل.",
    keywords: "توصيل اسماك زينة العراق، شحن مستلزمات احواض بغداد، توصيل البصرة، توصيل اربيل",
  },
  "/terms": {
    title: "الشروط والأحكام - AQUAVO متجر اسماك الزينة العراق",
    description: "شروط وأحكام الاستخدام والشراء من متجر AQUAVO لمستلزمات احواض اسماك الزينة في العراق.",
  },
  "/privacy-policy": {
    title: "سياسة الخصوصية - AQUAVO متجر اسماك الزينة العراق",
    description: "سياسة الخصوصية وحماية بيانات العملاء في متجر AQUAVO لمستلزمات احواض اسماك الزينة.",
  },
  "/return-policy": {
    title: "سياسة الإرجاع والاستبدال - AQUAVO العراق",
    description: "سياسة إرجاع واستبدال المنتجات في متجر AQUAVO. ضمان رضا العملاء وحقوق المستهلك في العراق.",
  },
  "/about": {
    title: "من نحن - AQUAVO أول متجر اسماك زينة اونلاين في العراق",
    description: "AQUAVO (اكوافو) هو أول وأكبر متجر إلكتروني متخصص في أسماك الزينة ومستلزمات الأحواض في العراق. تأسسنا في بغداد عام 2024 لخدمة هواة الأسماك في كل المحافظات العراقية بأكثر من 500 منتج أصلي.",
    keywords: "AQUAVO، اكوافو، من نحن، متجر اسماك زينة العراق، مستلزمات احواض بغداد",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "AboutPage",
        name: "من نحن - AQUAVO",
        description: "AQUAVO هو أول متجر اونلاين متخصص في أسماك الزينة في العراق",
        url: `${BASE}/about`,
        mainEntity: {
          "@type": "Organization",
          name: "AQUAVO",
          alternateName: "اكوافو",
          url: BASE,
          logo: DEFAULT_IMAGE,
          foundingDate: "2024",
          foundingLocation: { "@type": "Place", name: "بغداد، العراق" },
          description: "أول وأكبر متجر إلكتروني متخصص في بيع أسماك الزينة ومستلزمات أحواض السمك في العراق",
          numberOfEmployees: { "@type": "QuantitativeValue", value: "5-10" },
          knowsAbout: ["أسماك الزينة", "أحواض السمك", "Aquascaping", "تربية الأسماك", "مستلزمات الأحواض", "النباتات المائية"],
          areaServed: { "@type": "Country", name: "العراق" },
          sameAs: ["https://instagram.com/aquavo_iq", "https://www.tiktok.com/@aquavo.iq", "https://www.facebook.com/profile.php?id=61587249730248"],
        },
        inLanguage: "ar",
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "الرئيسية", item: BASE },
          { "@type": "ListItem", position: 2, name: "من نحن", item: `${BASE}/about` },
        ],
      },
    ],
  },
  "/why-aquavo": {
    title: "لماذا AQUAVO - أفضل متجر أسماك زينة في العراق | مقارنة شاملة",
    description: "لماذا AQUAVO هو أفضل خيار لشراء مستلزمات أحواض أسماك الزينة في العراق؟ أكثر من 500 منتج أصلي، توصيل لكل المحافظات، دعم فني مجاني، ضمان على المعدات، وأسعار منافسة.",
    keywords: "لماذا AQUAVO، أفضل متجر أسماك زينة العراق، مقارنة متاجر أسماك بغداد",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "الرئيسية", item: BASE },
        { "@type": "ListItem", position: 2, name: "لماذا AQUAVO", item: `${BASE}/why-aquavo` },
      ],
    },
  },
};

// ─── Fetch dynamic metadata from DB ─────────────────────────────────────────
async function getProductMeta(slug: string): Promise<PageMeta | null> {
  const db = getPool();
  if (!db) return null;
  try {
    const { rows } = await db.query(
      `SELECT id, name, description, price, brand, category, image, slug, specifications FROM products WHERE slug = $1 LIMIT 1`,
      [slug]
    );
    if (rows.length === 0) return null;
    const p = rows[0];
    const desc = p.description
      ? p.description.substring(0, 155)
      : `تسوق ${p.name} من AQUAVO بأفضل الأسعار في العراق. توصيل سريع لكل المحافظات.`;
    return {
      title: `${p.name}${p.brand ? ` - ${p.brand}` : ""} | AQUAVO`,
      description: desc,
      keywords: `${p.name}، ${p.category || "مستلزمات احواض"}، ${p.brand || "AQUAVO"}، شراء اونلاين العراق`,
      ogType: "product",
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "Product",
        name: p.name,
        description: desc,
        image: p.image || DEFAULT_IMAGE,
        brand: { "@type": "Brand", name: p.brand || "AQUAVO" },
        offers: {
          "@type": "Offer",
          price: p.price,
          priceCurrency: "IQD",
          availability: "https://schema.org/InStock",
          url: `${BASE}/products/${p.slug}`,
          seller: { "@type": "Organization", name: "AQUAVO" },
        },
      },
    };
  } catch (err) {
    console.error("SSR meta: product query error", err);
    return null;
  }
}

async function getBlogMeta(slug: string): Promise<PageMeta | null> {
  const db = getPool();
  if (!db) return null;
  try {
    const { rows } = await db.query(
      `SELECT title, excerpt, "imageUrl", author, "publishedAt", "updatedAt", content FROM blog_posts WHERE slug = $1 AND status = 'published' LIMIT 1`,
      [slug]
    );
    if (rows.length === 0) return null;
    const post = rows[0];
    const wordCount = post.content ? post.content.split(/\s+/).length : undefined;
    const datePublished = post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined;
    const dateModified = post.updatedAt ? new Date(post.updatedAt).toISOString() : datePublished;
    return {
      title: `${post.title} | مدونة AQUAVO`,
      description: post.excerpt || post.title,
      ogType: "article",
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: post.title,
          description: post.excerpt || post.title,
          image: post.imageUrl || DEFAULT_IMAGE,
          author: { "@type": "Person", name: post.author || "AQUAVO" },
          publisher: { "@type": "Organization", name: "AQUAVO", logo: { "@type": "ImageObject", url: DEFAULT_IMAGE } },
          datePublished,
          dateModified,
          wordCount,
          inLanguage: "ar",
          mainEntityOfPage: { "@type": "WebPage", "@id": `${BASE}/blog/${slug}` },
          isPartOf: { "@type": "WebSite", name: "AQUAVO", url: BASE },
        },
        {
          "@context": "https://schema.org",
          "@type": "SpeakableSpecification",
          cssSelector: ["h1", "article p:first-of-type", "[data-speakable]"],
        },
        {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "الرئيسية", item: BASE },
            { "@type": "ListItem", position: 2, name: "المدونة", item: `${BASE}/blog` },
            { "@type": "ListItem", position: 3, name: post.title, item: `${BASE}/blog/${slug}` },
          ],
        },
      ],
    };
  } catch (err) {
    console.error("SSR meta: blog query error", err);
    return null;
  }
}

// ─── Resolve metadata for any path ──────────────────────────────────────────
async function resolveMetadata(pathname: string): Promise<PageMeta & { url: string; image: string }> {
  const cleanPath = pathname.replace(/\/+$/, "") || "/";

  // Static pages
  if (STATIC_PAGES[cleanPath]) {
    const meta = STATIC_PAGES[cleanPath];
    return {
      ...meta,
      url: `${BASE}${cleanPath === "/" ? "" : cleanPath}`,
      image: DEFAULT_IMAGE,
      ogType: meta.ogType || "website",
    };
  }

  // Product detail: /products/:slug
  const productMatch = cleanPath.match(/^\/products\/([^/]+)$/);
  if (productMatch) {
    const meta = await getProductMeta(productMatch[1]);
    if (meta) {
      return {
        ...meta,
        url: `${BASE}${cleanPath}`,
        image: DEFAULT_IMAGE,
        ogType: meta.ogType || "product",
      };
    }
  }

  // Blog post: /blog/:slug
  const blogMatch = cleanPath.match(/^\/blog\/([^/]+)$/);
  if (blogMatch) {
    const meta = await getBlogMeta(blogMatch[1]);
    if (meta) {
      return {
        ...meta,
        url: `${BASE}${cleanPath}`,
        image: DEFAULT_IMAGE,
        ogType: meta.ogType || "article",
      };
    }
  }

  // Fallback
  return {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESC,
    keywords: DEFAULT_KEYWORDS,
    url: `${BASE}${cleanPath}`,
    image: DEFAULT_IMAGE,
    ogType: "website",
  };
}

// ─── Inject metadata into HTML ──────────────────────────────────────────────
function injectMeta(html: string, meta: PageMeta & { url: string; image: string }): string {
  let jsonLdScript = "";
  if (meta.jsonLd) {
    if (Array.isArray(meta.jsonLd)) {
      jsonLdScript = meta.jsonLd
        .map((ld) => `<script type="application/ld+json">${JSON.stringify(ld)}</script>`)
        .join("\n  ");
    } else {
      jsonLdScript = `<script type="application/ld+json">${JSON.stringify(meta.jsonLd)}</script>`;
    }
  }

  return html
    .replace(/__META_TITLE__/g, escapeHtml(meta.title))
    .replace(/__META_DESCRIPTION__/g, escapeHtml(meta.description))
    .replace(/__META_KEYWORDS__/g, escapeHtml(meta.keywords || DEFAULT_KEYWORDS))
    .replace(/__META_URL__/g, meta.url)
    .replace(/__META_IMAGE__/g, meta.image)
    .replace(/__META_OG_TYPE__/g, meta.ogType || "website")
    .replace(/__JSON_LD__/g, jsonLdScript);
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ─── Markdown for Agents ────────────────────────────────────────────────────
function generateMarkdown(meta: PageMeta & { url: string; image: string }, pathname: string): string {
  const lines: string[] = [];
  lines.push(`# ${meta.title}\n`);
  lines.push(`${meta.description}\n`);
  lines.push(`**URL:** ${meta.url}\n`);

  if (pathname === "/" || pathname === "") {
    lines.push(`## About AQUAVO\n`);
    lines.push(`AQUAVO is Iraq's premier online aquarium supplies and fish care e-commerce platform, based in Baghdad.\n`);
    lines.push(`## Available Services\n`);
    lines.push(`- **Product Catalog**: Browse aquarium products at [/products](${BASE}/products)`);
    lines.push(`- **Fish Encyclopedia**: Comprehensive fish species database at [/fish-encyclopedia](${BASE}/fish-encyclopedia)`);
    lines.push(`- **Calculators**: Free aquarium calculators at [/calculators](${BASE}/calculators)`);
    lines.push(`- **Blog**: Aquarium care articles at [/blog](${BASE}/blog)`);
    lines.push(`- **Fish Health**: Disease diagnosis tool at [/fish-health](${BASE}/fish-health)\n`);
    lines.push(`## API Endpoints\n`);
    lines.push(`- \`GET /api/products\` — Browse product catalog`);
    lines.push(`- \`GET /api/products?search={query}\` — Search products`);
    lines.push(`- \`GET /api/fish\` — Fish species database`);
    lines.push(`- \`GET /api/blog\` — Blog articles`);
    lines.push(`- \`GET /api/orders/track/{orderNumber}\` — Track an order\n`);
    lines.push(`## Agent Discovery\n`);
    lines.push(`- [API Catalog](${BASE}/.well-known/api-catalog) (RFC 9727)`);
    lines.push(`- [MCP Server Card](${BASE}/.well-known/mcp/server-card.json)`);
    lines.push(`- [Agent Skills](${BASE}/.well-known/agent-skills/index.json)`);
    lines.push(`- [ACP](${BASE}/.well-known/acp.json)\n`);
    lines.push(`## Contact\n`);
    lines.push(`- Phone: +964 774 788 0673`);
    lines.push(`- Website: ${BASE}`);
    lines.push(`- Instagram: [@aquavo_iq](https://instagram.com/aquavo_iq)`);
    lines.push(`- TikTok: [@aquavo.iq](https://www.tiktok.com/@aquavo.iq)\n`);
  }

  if (meta.keywords) {
    lines.push(`---\n*Keywords: ${meta.keywords}*`);
  }

  return lines.join("\n");
}

// ─── Handler ────────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const pathname = (req.url || "/").split("?")[0];

    // Skip for actual static files (shouldn't reach here, but safety)
    if (/\.(js|css|png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|json|xml|txt|map|gz|br)$/i.test(pathname)) {
      return res.status(404).end();
    }

    const template = getTemplate();
    const meta = await resolveMetadata(pathname);
    const html = injectMeta(template, meta);

    // Markdown for Agents: If Accept: text/markdown, return markdown version
    const acceptHeader = (req.headers.accept || "").toLowerCase();
    if (acceptHeader.includes("text/markdown")) {
      const md = generateMarkdown(meta, pathname);
      res.setHeader("Content-Type", "text/markdown; charset=utf-8");
      res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
      return res.status(200).send(md);
    }

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    return res.status(200).send(html);
  } catch (err) {
    console.error("SSR meta handler error:", err);
    // Fallback: serve template with defaults
    try {
      const template = getTemplate();
      const fallback = injectMeta(template, {
        title: DEFAULT_TITLE,
        description: DEFAULT_DESC,
        keywords: DEFAULT_KEYWORDS,
        url: BASE,
        image: DEFAULT_IMAGE,
        ogType: "website",
      });
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(fallback);
    } catch {
      return res.status(500).send("Server Error");
    }
  }
}

import "../server/suppress.js";
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
const CRITICAL_HOME_SHELL = `<section class="critical-home-shell" aria-hidden="true"><div class="critical-home-card"><img src="/images/aquascape-styles/iwagumi_aquascape_1765676307763.webp" alt="" fetchpriority="high" decoding="sync" width="1200" height="800"><div class="critical-home-copy"><h1>&#1581;&#1608;&#1604; &#1581;&#1608;&#1590;&#1603; &#1573;&#1604;&#1609; &#1578;&#1581;&#1601;&#1577; &#1601;&#1606;&#1610;&#1577;.</h1></div></div></section>`;
const DEFAULT_TITLE = "AQUAVO — مستلزمات أحواض الزينة في العراق | فلاتر، سخانات، أغذية";
const DEFAULT_DESC = "AQUAVO — أفضل مستلزمات أحواض الزينة في العراق. فلاتر، سخانات، أغذية وعلاجات متخصصة. أحواض زجاجية، إضاءة LED، ديكورات. توصيل لجميع المحافظات، دفع عند الاستلام.";
const DEFAULT_KEYWORDS = "مستلزمات احواض الزينة العراق، فلاتر احواض بغداد، سخانات احواض، معدات الحوض YEE العراق، احواض زجاجية العراق، علاجات مياه احواض، اغذية احواض الزينة، توصيل العراق";

// ─── Static page metadata ───────────────────────────────────────────────────
interface PageMeta {
  title: string;
  description: string;
  keywords?: string;
  ogType?: string;
  ogTitle?: string;
  jsonLd?: object | object[];
}

const STATIC_PAGES: Record<string, PageMeta> = {
  "/": {
    title: "AQUAVO — مستلزمات أحواض الزينة في العراق | فلاتر، سخانات، أغذية",
    ogTitle: "AQUAVO — معدات أحواض بريميوم في العراق",
    description: "AQUAVO — أفضل مستلزمات أحواض الزينة في العراق. فلاتر، سخانات، أغذية وعلاجات متخصصة. أحواض زجاجية، إضاءة LED، ديكورات. توصيل لجميع المحافظات، دفع عند الاستلام.",
    keywords: "مستلزمات احواض الزينة العراق، فلاتر احواض بغداد، سخانات احواض، معدات الحوض YEE العراق، احواض زجاجية العراق، علاجات مياه احواض، اغذية احواض الزينة",
    ogType: "website",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        "@id": `${BASE}/#organization`,
        name: "AQUAVO",
        alternateName: ["أكوافو", "AQUAVO Store", "AQUAVO Iraq"],
        url: BASE,
        logo: {
          "@type": "ImageObject",
          url: DEFAULT_IMAGE,
          width: 512,
          height: 512
        },
        description: "متجر أحواض أسماك عراقي متخصص في معدات ومستلزمات الأحواض — فلاتر، سخانات، أغذية، ديكورات، معالجات مياه — الدفع عند الاستلام، توصيل لكل العراق خلال 24 ساعة بـ 5,000 د.ع",
        foundingDate: "2024",
        knowsAbout: ["أحواض الزينة", "معدات الأحواض", "فلاتر المياه", "علاجات مياه الأحواض", "Aquascaping", "العناية بأسماك الزينة"],
        areaServed: {
          "@type": "Country",
          name: "Iraq",
          sameAs: "https://www.wikidata.org/wiki/Q796"
        },
        contactPoint: [
          {
            "@type": "ContactPoint",
            telephone: "+964-774-788-0673",
            contactType: "customer service",
            availableLanguage: ["Arabic"],
            areaServed: "IQ",
            hoursAvailable: {
              "@type": "OpeningHoursSpecification",
              dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
              opens: "00:00",
              closes: "23:59"
            }
          }
        ],
        sameAs: [
          "https://www.facebook.com/profile.php?id=61587249730248",
          "https://instagram.com/aquavo_iq",
          "https://www.tiktok.com/@aquavo.iq"
        ],
        address: {
          "@type": "PostalAddress",
          addressLocality: "Baghdad",
          addressRegion: "Baghdad",
          addressCountry: "IQ"
        },
        hasOfferCatalog: {
          "@type": "OfferCatalog",
          name: "معدات ومستلزمات أحواض الأسماك",
          itemListElement: [
            { "@type": "Offer", itemOffered: { "@type": "Product", name: "فلاتر أحواض" } },
            { "@type": "Offer", itemOffered: { "@type": "Product", name: "سخانات أحواض" } },
            { "@type": "Offer", itemOffered: { "@type": "Product", name: "غذاء أسماك" } },
            { "@type": "Offer", itemOffered: { "@type": "Product", name: "ديكورات أحواض" } },
            { "@type": "Offer", itemOffered: { "@type": "Product", name: "معالجات مياه" } },
            { "@type": "Offer", itemOffered: { "@type": "Product", name: "إضاءة أحواض" } }
          ]
        }
      },
      {
        "@context": "https://schema.org",
        "@type": "Store",
        "@id": `${BASE}/#localbusiness`,
        name: "AQUAVO",
        image: DEFAULT_IMAGE,
        url: BASE,
        telephone: "+964-774-788-0673",
        priceRange: "$$",
        currenciesAccepted: "IQD",
        paymentAccepted: "Cash on Delivery",
        description: "متجر إلكتروني عراقي متخصص في معدات وإكسسوارات أحواض الأسماك. يخدم العراق بالكامل بتوصيل خلال 24 ساعة وبرسوم ثابتة 5,000 دينار عراقي.",
        address: {
          "@type": "PostalAddress",
          addressLocality: "بغداد",
          addressRegion: "Baghdad",
          addressCountry: "IQ"
        },
        geo: {
          "@type": "GeoCoordinates",
          latitude: 33.3128,
          longitude: 44.3615
        },
        openingHoursSpecification: [
          {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
            opens: "00:00",
            closes: "23:59"
          }
        ],
        areaServed: {
          "@type": "Country",
          name: "Iraq"
        },
        sameAs: [
          "https://www.facebook.com/profile.php?id=61587249730248",
          "https://instagram.com/aquavo_iq",
          "https://www.tiktok.com/@aquavo.iq"
        ]
      },
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "@id": `${BASE}/#website`,
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
        "@type": "VideoObject",
        name: "AQUAVO — معدات أحواض أسماك أصلية في العراق",
        description: "نشرة AQUAVO لمعدات أحواض الأسماك: فلاتر، سخانات، أغذية، ديكورات، معالجات مياه — توصيل لكل العراق خلال 24 ساعة",
        thumbnailUrl: `${BASE}/images/aquascape-styles/iwagumi_aquascape_1765676307763.webp`,
        uploadDate: "2026-01-01",
        contentUrl: `${BASE}/images/hero/Aquarium_Animation_Request_Fulfilled.mp4`,
        duration: "PT30S"
      },
      {
        "@context": "https://schema.org",
        "@type": "SpeakableSpecification",
        cssSelector: ["h1", ".hero-section", "[data-speakable]"],
      },
    ],
  },
  "/products": {
    title: "مستلزمات أحواض الزينة في العراق — فلاتر، سخانات، أغذية | AQUAVO",
    description: "تسوق جميع مستلزمات أحواض الزينة في العراق: فلاتر، سخانات، أغذية، علاجات، إضاءة LED، ديكورات وأكثر. ماركة YEE وغيرها. أسعار منافسة وتوصيل لكل المحافظات.",
    keywords: "مستلزمات احواض الزينة العراق، فلاتر احواض بغداد، سخانات احواض، اغذية احواض، معدات YEE العراق، احواض زجاجية، علاجات مياه",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "جميع مستلزمات أحواض الزينة",
        description: "تصفح جميع مستلزمات أحواض الزينة في العراق",
        url: `${BASE}/products`,
        inLanguage: "ar",
        isPartOf: { "@type": "WebSite", name: "AQUAVO", url: BASE },
      },
      {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "فئات منتجات AQUAVO",
        description: "جميع فئات مستلزمات أحواض الزينة المتوفرة في العراق",
        url: `${BASE}/products`,
        numberOfItems: 12,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "أحواض زجاجية", url: `${BASE}/products?category=tanks` },
          { "@type": "ListItem", position: 2, name: "فلاتر", url: `${BASE}/products?category=filters` },
          { "@type": "ListItem", position: 3, name: "سخانات", url: `${BASE}/products?category=heaters` },
          { "@type": "ListItem", position: 4, name: "إضاءة LED", url: `${BASE}/products?category=lighting` },
          { "@type": "ListItem", position: 5, name: "أغذية أسماك", url: `${BASE}/products?category=food` },
          { "@type": "ListItem", position: 6, name: "علاجات مياه", url: `${BASE}/products?category=treatments` },
          { "@type": "ListItem", position: 7, name: "ديكورات", url: `${BASE}/products?category=decorations` },
          { "@type": "ListItem", position: 8, name: "ركائز", url: `${BASE}/products?category=substrates` },
          { "@type": "ListItem", position: 9, name: "مضخات هواء", url: `${BASE}/products?category=air-pumps` },
          { "@type": "ListItem", position: 10, name: "مستلزمات الصيانة", url: `${BASE}/products?category=maintenance` },
          { "@type": "ListItem", position: 11, name: "أطقم كاملة للمبتدئين", url: `${BASE}/products?category=starter-kits` },
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
    title: "عروض وتخفيضات مستلزمات أحواض الزينة في العراق | AQUAVO",
    description: "أقوى العروض والتخفيضات على مستلزمات أحواض الزينة في العراق. خصومات يومية على الفلاتر والسخانات والأغذية والديكورات. وفّر أكثر مع AQUAVO.",
    keywords: "عروض مستلزمات احواض العراق، تخفيضات احواض بغداد، خصومات فلاتر سخانات، عروض يومية AQUAVO",
  },
  "/blog": {
    title: "مدونة أحواض الزينة — نصائح العناية والمعدات في العراق | AQUAVO",
    description: "مقالات ونصائح متخصصة عن أحواض الزينة في العراق: العناية بالمعدات، معالجة مياه الحوض، الفلاتر والسخانات، وأفضل الممارسات للمبتدئين والمحترفين.",
    keywords: "نصائح احواض الزينة العراق، مدونة احواض بغداد، عناية فلاتر سخانات، معلومات احواض",
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
  "/guides/filter-choice": {
    title: "كيف تختار الفلتر المناسب لحوضك في العراق | دليل AQUAVO",
    description: "دليل عملي لاختيار الفلتر المثالي لحوض اسماك الزينة في العراق. مقارنة بين الفلاتر الداخلية، الخارجية، والإسفنجية لتصل لأفضل تصفية لماء حوضك.",
    keywords: "اختيار فلتر حوض، دليل فلاتر احواض زينة، فلاتر خارجية بغداد، فلاتر داخلية، تنظيف ماء الحوض",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "HowTo",
        name: "كيف تختار الفلتر المناسب لحوض أسماك الزينة في العراق",
        description: "خطوات عملية لاختيار الفلتر المثالي لضمان جودة ونقاء مياه حوض أسماك الزينة",
        totalTime: "P1D",
        step: [
          { "@type": "HowToStep", name: "تحديد حجم الحوض", text: "الفلتر يجب أن يكون قادراً على تدوير مياه الحوض بالكامل 4-5 مرات في الساعة. احسب حجم حوضك باللتر." },
          { "@type": "HowToStep", name: "معرفة نوع الأسماك", text: "الأسماك الذهبية والسيشيلد تحتاج فلاتر قوية جداً. أسماك البيتا والنيون تيترا تفضل الفلاتر الهادئة مثل الإسفنجية أو الشلال." },
          { "@type": "HowToStep", name: "اختيار نوع الفلتر", text: "الفلاتر الخارجية (Canister) للأحواض الكبيرة. الفلاتر الداخلية (Internal) للأحواض الصغيرة. فلاتر الإسفنج (Sponge) لأحواض التفريخ والروبيان." },
          { "@type": "HowToStep", name: "التحقق من الميديا (Media)", text: "تأكد أن الفلتر يدعم التصفية الميكانيكية (إسفنج)، البيولوجية (سيراميك رينج)، والكيميائية (كربون نشط)." }
        ],
        inLanguage: "ar"
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "الرئيسية", item: BASE },
          { "@type": "ListItem", position: 2, name: "كيف تختار الفلتر", item: `${BASE}/guides/filter-choice` }
        ]
      }
    ]
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
          { "@type": "Question", name: "ما هي مناطق التوصيل المتاحة؟", acceptedAnswer: { "@type": "Answer", text: "نوصل إلى بغداد وكل المحافظات العراقية خلال 24 ساعة." } },
          { "@type": "Question", name: "كم تكلفة التوصيل؟", acceptedAnswer: { "@type": "Answer", text: "رسوم التوصيل 5,000 دينار لبغداد وكل المحافظات العراقية." } },
          { "@type": "Question", name: "هل يمكن تتبع طلبي؟", acceptedAnswer: { "@type": "Answer", text: "نعم! بمجرد شحن طلبك، ستتلقى رسالة نصية ورسالة واتساب تحتوي على رابط التتبع المباشر ورقم الشحنة." } },
          { "@type": "Question", name: "ماذا لو لم أكن متواجداً عند التوصيل؟", acceptedAnswer: { "@type": "Answer", text: "سيتواصل معك مندوب التوصيل قبل الوصول. يمكنك تحديد موعد آخر أو ترك الطلب مع شخص موثوق بعد تأكيد هويته." } },
          { "@type": "Question", name: "شنو يبيع AQUAVO؟", acceptedAnswer: { "@type": "Answer", text: "AQUAVO متخصص بمعدات ومستلزمات الأحواض فقط: فلاتر، سخانات، غذاء، ديكور، إضاءة، ومعالجة مياه. ما نبيع كائنات حية." } },
          // الدفع والفواتير
          { "@type": "Question", name: "ما هي طرق الدفع المتاحة؟", acceptedAnswer: { "@type": "Answer", text: "الدفع المتاح حالياً هو الدفع نقداً عند الاستلام فقط." } },
          { "@type": "Question", name: "هل الدفع عند الاستلام متاح؟", acceptedAnswer: { "@type": "Answer", text: "نعم! الدفع عند الاستلام متاح لجميع الطلبات. يمكنك فحص المنتج والتأكد من سلامته قبل الدفع." } },
          { "@type": "Question", name: "هل يمكنني الحصول على فاتورة؟", acceptedAnswer: { "@type": "Answer", text: "نعم، نرسل فاتورة إلكترونية مع كل طلب عبر البريد الإلكتروني وواتساب. يمكنك أيضاً طلب فاتورة مطبوعة مع الطلب." } },
          { "@type": "Question", name: "هل توجد رسوم إضافية مخفية؟", acceptedAnswer: { "@type": "Answer", text: "لا، السعر الذي تراه هو السعر النهائي للمنتجات، ورسوم التوصيل الثابتة 5,000 دينار تظهر بوضوح قبل إتمام الطلب." } },
          { "@type": "Question", name: "هل توجد طرق دفع غير الدفع عند الاستلام؟", acceptedAnswer: { "@type": "Answer", text: "حالياً الدفع نقداً عند الاستلام فقط. إذا فعّلنا أي طريقة دفع إضافية راح تظهر بشكل واضح بالموقع." } },
          // الإرجاع والاستبدال
          { "@type": "Question", name: "ما هي سياسة الإرجاع؟", acceptedAnswer: { "@type": "Answer", text: "إذا وصلك منتج تالف أو منتج خاطئ، أبلغنا خلال 48 ساعة مع صور واضحة وسنراجع الطلب للاستبدال حسب السياسة." } },
          { "@type": "Question", name: "كيف أطلب إرجاع منتج؟", acceptedAnswer: { "@type": "Answer", text: "تواصل معنا عبر واتساب أو الهاتف مع ذكر رقم الطلب وسبب المشكلة وصور واضحة للمنتج." } },
          { "@type": "Question", name: "متى أستلم المبلغ المسترد؟", acceptedAnswer: { "@type": "Answer", text: "بعد مراجعة حالة الطلب، يتم التعامل معه حسب سياسة الاستبدال أو الاسترداد المعتمدة." } },
          { "@type": "Question", name: "هل يمكن استبدال المنتج بدلاً من إرجاعه؟", acceptedAnswer: { "@type": "Answer", text: "الاستبدال متاح للمنتج التالف أو المنتج الخاطئ بعد الإبلاغ خلال 48 ساعة ومراجعة الحالة." } },
          { "@type": "Question", name: "ماذا لو وصل المنتج تالفاً؟", acceptedAnswer: { "@type": "Answer", text: "في حالة وصول منتج تالف، التقط صوراً واضحة وتواصل معنا خلال 48 ساعة. سنراجع الحالة ونرتب الاستبدال حسب السياسة." } },
          // العناية بالأسماك
          { "@type": "Question", name: "كيف أختار الحوض المناسب؟", acceptedAnswer: { "@type": "Answer", text: "استخدم حاسبة الحوض في موقعنا! بشكل عام، لكل سنتيمتر من طول السمكة تحتاج 2 لتر ماء كحد أدنى. الأحواض الأكبر أسهل في الصيانة." } },
          { "@type": "Question", name: "كم مرة يجب تغيير الماء؟", acceptedAnswer: { "@type": "Answer", text: "ننصح بتغيير 20-30% من الماء أسبوعياً. استخدم مزيل الكلور واترك الماء الجديد ليصل لنفس درجة حرارة الحوض." } },
          { "@type": "Question", name: "ما هي درجة الحرارة المناسبة؟", acceptedAnswer: { "@type": "Answer", text: "معظم الأسماك الاستوائية تحتاج 24-28 درجة مئوية. الأسماك الذهبية تفضل 18-24 درجة. تحقق من متطلبات كل نوع." } },
          { "@type": "Question", name: "كم مرة أطعم الأسماك؟", acceptedAnswer: { "@type": "Answer", text: "مرتين يومياً بكمية تستهلكها الأسماك خلال 2-3 دقائق. الإفراط في التغذية أخطر من التقليل ويلوث الماء." } },
          { "@type": "Question", name: "لماذا تموت أسماكي رغم العناية بها؟", acceptedAnswer: { "@type": "Answer", text: "الأسباب الشائعة: عدم تدوير الحوض قبل إضافة الأسماك، تغيير الماء بكميات كبيرة، أو اكتظاظ الحوض. تواصل معنا للتشخيص المجاني." } },
          // المنتجات والجودة
          { "@type": "Question", name: "هل المنتجات أصلية؟", acceptedAnswer: { "@type": "Answer", text: "نعم، جميع منتجاتنا أصلية 100% ومستوردة من الشركات المصنعة مباشرة. نوفر ضمان الأصالة على جميع المنتجات." } },
          { "@type": "Question", name: "هل يوجد ضمان على المعدات؟", acceptedAnswer: { "@type": "Answer", text: "نعم، جميع المعدات الإلكترونية (فلاتر، مضخات، سخانات، إضاءة) مغطاة بضمان من 6 أشهر إلى سنتين حسب المنتج." } },
          { "@type": "Question", name: "هل توفرون كائنات حية؟", acceptedAnswer: { "@type": "Answer", text: "لا. المتجر الإلكتروني متخصص بمعدات ومستلزمات الأحواض فقط." } },
          { "@type": "Question", name: "هل تتوفر منتجات للمبتدئين؟", acceptedAnswer: { "@type": "Answer", text: "نعم! لدينا قسم خاص للمبتدئين يشمل أحواض جاهزة ومعدات سهلة الاستخدام مع دليل عناية مجاني." } },
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
    title: "شحن وتوصيل مستلزمات الأحواض لكل العراق | AQUAVO",
    description: "خدمة شحن وتوصيل مستلزمات الأحواض لجميع محافظات العراق برسوم ثابتة 5,000 دينار والتوصيل خلال 24 ساعة.",
    keywords: "توصيل مستلزمات احواض العراق، شحن مستلزمات احواض بغداد، توصيل البصرة، توصيل اربيل",
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
    title: "من نحن - AQUAVO متجر مستلزمات أحواض الزينة في العراق",
    description: "AQUAVO (اكوافو) متجر إلكتروني متخصص في مستلزمات أحواض الزينة في العراق. تأسسنا في بغداد عام 2024 لخدمة هواة الأحواض في كل المحافظات العراقية بمنتجات أصلية من أفضل الماركات.",
    keywords: "AQUAVO، اكوافو، من نحن، متجر اسماك زينة العراق، مستلزمات احواض بغداد",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "AboutPage",
        name: "من نحن - AQUAVO",
        description: "AQUAVO هو أول متجر اونلاين متخصص في مستلزمات أحواض الزينة في العراق",
        url: `${BASE}/about`,
        mainEntity: {
          "@type": "Organization",
          name: "AQUAVO",
          alternateName: "اكوافو",
          url: BASE,
          logo: DEFAULT_IMAGE,
          foundingDate: "2024",
          foundingLocation: { "@type": "Place", name: "بغداد، العراق" },
          description: "متجر إلكتروني متخصص في مستلزمات أحواض الزينة في العراق — فلاتر، سخانات، أغذية وعلاجات أصلية.",
          knowsAbout: ["أحواض الزينة", "معدات الأحواض", "Aquascaping", "مستلزمات الأحواض", "فلاتر المياه", "معالجة مياه الأحواض"],
          areaServed: { "@type": "Country", name: "العراق" },
          sameAs: ["https://www.instagram.com/aquavo_iq", "https://www.tiktok.com/@aquavo.iq", "https://www.facebook.com/profile.php?id=61587249730248"],
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
    title: "لماذا AQUAVO - متجر مستلزمات أحواض بريميوم في العراق | مقارنة شاملة",
    description: "لماذا AQUAVO هو أفضل خيار لمستلزمات أحواض الزينة في العراق؟ منتجات أصلية مضمونة، توصيل لكل المحافظات، دعم فني مجاني، وأسعار منافسة.",
    keywords: "لماذا AQUAVO، متجر مستلزمات احواض العراق، مقارنة متاجر احواض بغداد",
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

// ─── Guide pages (educational — high AEO value) ─────────────────────────────
// Real routes are /guides/<slug> (slash). These power rich SSR meta + Article
// + BreadcrumbList JSON-LD; without them guide pages fall back to generic meta.
const GUIDE_META: Array<{ slug: string; title: string; description: string; keywords: string }> = [
  { slug: "heater-choice", title: "كيف تختار سخان الحوض المناسب وحساب الواط في العراق", description: "دليل عملي لاختيار سخان الحوض المناسب وحساب عدد الواط حسب حجم الحوض ودرجة حرارة الغرفة، مع نصائح للتثبيت الآمن والحفاظ على ثبات الحرارة.", keywords: "سخان حوض سمك، حساب واط السخان، اختيار سخان الحوض، درجة حرارة الحوض العراق" },
  { slug: "water-change-schedule", title: "جدول تغيير ماء الحوض — كل متى وكم النسبة | دليل AQUAVO", description: "تعرف على الجدول الصحيح لتغيير ماء حوض اسماك الزينة: كم نسبة الماء التي تغيرها وكل متى، وكيف تتجنب الأخطاء التي تربك توازن الحوض.", keywords: "تغيير ماء الحوض، جدول تغيير الماء، صيانة حوض السمك، نسبة تبديل الماء" },
  { slug: "feeding-table", title: "جدول تغذية أسماك الزينة — كم مرة حسب النوع | دليل AQUAVO", description: "جدول تغذية أسماك الزينة حسب النوع: كم مرة يومياً وكمية الغذاء المناسبة، وكيف تتجنب الإفراط في التغذية الذي يلوّث ماء الحوض.", keywords: "تغذية اسماك الزينة، كم مرة اطعم السمك، جدول طعام الحوض، غذاء اسماك" },
  { slug: "quarantine", title: "كيف تجهّز حوض حجر صحي للأسماك الجديدة | دليل AQUAVO", description: "دليل تجهيز حوض الحجر الصحي للأسماك الجديدة قبل إدخالها للحوض الرئيسي، لحماية بقية الأسماك من الأمراض ولتقليل الإجهاد.", keywords: "حوض حجر صحي، عزل اسماك جديدة، حماية الحوض من الامراض، quarantine اسماك" },
  { slug: "algae-control", title: "السيطرة على الطحالب ومنعها في حوض السمك | دليل AQUAVO", description: "أسباب نمو الطحالب في حوض اسماك الزينة وطرق السيطرة عليها ومنع عودتها: ضبط الإضاءة، التغذية، والصيانة الدورية.", keywords: "طحالب الحوض، التخلص من الطحالب، منع الطحالب، تنظيف زجاج الحوض" },
  { slug: "aquarium-salt", title: "متى وكيف تستخدم ملح الحوض بأمان | دليل AQUAVO", description: "متى يكون ملح الحوض مفيداً وكيف تستخدمه بالجرعة الصحيحة بأمان، ومتى يجب تجنّبه مع أنواع معينة من الأسماك أو النباتات.", keywords: "ملح الحوض، استخدام ملح اسماك، علاج بالملح، aquarium salt" },
  { slug: "white-scale", title: "إزالة ترسبات الكلس البيضاء عن زجاج الحوض | دليل AQUAVO", description: "كيف تزيل ترسبات الكلس والبقع البيضاء عن زجاج حوض السمك بأمان دون خدش الزجاج أو إيذاء الأسماك.", keywords: "ترسبات بيضاء على الحوض، كلس زجاج الحوض، تنظيف بقع الحوض، limescale" },
  { slug: "5-mistakes", title: "5 أخطاء شائعة عند المبتدئين بأحواض الزينة | دليل AQUAVO", description: "أبرز 5 أخطاء يقع بها المبتدئون عند تربية اسماك الزينة وكيف تتجنبها لحوض صحي ومستقر من البداية.", keywords: "اخطاء المبتدئين اسماك، نصائح حوض السمك، اخطاء تربية اسماك الزينة" },
  { slug: "essential-tools", title: "أدوات الحوض الأساسية لكل هاوٍ | دليل AQUAVO", description: "قائمة الأدوات الأساسية التي يحتاجها كل هاوي أحواض زينة: من شبكة الصيد وسيفون التنظيف إلى أدوات فحص الماء.", keywords: "ادوات حوض السمك، مستلزمات الحوض الاساسية، سيفون تنظيف، شبكة اسماك" },
  { slug: "filter-media", title: "كيف تختار وتصين ميديا الفلتر | دليل AQUAVO", description: "شرح أنواع ميديا الفلتر (الميكانيكية والبيولوجية والكيميائية) وكيف تختارها وتصينها للحفاظ على نقاء ماء الحوض.", keywords: "ميديا الفلتر، اسفنج الفلتر، سيراميك رينج، كربون نشط، صيانة الفلتر" },
  { slug: "fish-hiding", title: "لماذا تختبئ الأسماك وكيف تتصرف | دليل AQUAVO", description: "الأسباب وراء اختباء أسماك الزينة وكيف تميّز بين السلوك الطبيعي وعلامات الإجهاد أو المرض، وما الذي يجب فعله.", keywords: "اختباء الاسماك، سمكة تختبئ، سلوك اسماك الزينة، اجهاد الاسماك" },
  { slug: "happy-fish-signs", title: "علامات صحة وسعادة أسماك الزينة | دليل AQUAVO", description: "كيف تعرف أن أسماك الزينة بصحة جيدة: علامات السلوك واللون والشهية والتنفس التي تدل على حوض سليم.", keywords: "علامات صحة الاسماك، سمكة سليمة، سلوك سمكة سعيدة، صحة اسماك الزينة" },
  { slug: "temperature-guide", title: "درجات حرارة الماء المثالية لأسماك الزينة | دليل AQUAVO", description: "أفضل نطاقات درجة حرارة الماء لأسماك الزينة الاستوائية والذهبية، وكيف تحافظ على ثبات الحرارة في حوضك.", keywords: "درجة حرارة الحوض، حرارة ماء اسماك الزينة، حرارة الاسماك الاستوائية" },
  { slug: "treatment-basics", title: "أساسيات علاج أمراض أسماك الزينة | دليل AQUAVO", description: "مدخل عملي لعلاج أمراض اسماك الزينة الشائعة: كيف تتعرف على المرض وتبدأ العلاج المناسب بأمان داخل الحوض.", keywords: "علاج امراض الاسماك، معالج اسماك الزينة، امراض الحوض، نقطة بيضاء" },
  { slug: "water-myths", title: "خرافات شائعة عن جودة ماء الحوض | دليل AQUAVO", description: "تفكيك أكثر الخرافات شيوعاً حول جودة ماء حوض السمك بمعلومات صحيحة تساعدك على إدارة حوضك بثقة.", keywords: "خرافات ماء الحوض، جودة ماء اسماك الزينة، معلومات خاطئة عن الحوض" },
  { slug: "tank-rescue-plan", title: "خطة إنقاذ الحوض في حالات الطوارئ | دليل AQUAVO", description: "خطوات طوارئ لإنقاذ حوض اسماك الزينة عند تدهور الماء أو ظهور أعراض خطيرة على الأسماك، خطوة بخطوة.", keywords: "انقاذ الحوض، طوارئ حوض السمك، ازمة الحوض، انقاذ الاسماك" },
  { slug: "eco-friendly", title: "دليل أحواض الزينة الصديقة للبيئة | دليل AQUAVO", description: "ممارسات صديقة للبيئة في هواية أحواض الزينة: ترشيد الطاقة والماء واختيار معدات تدوم أطول لتقليل الهدر.", keywords: "حوض صديق للبيئة، توفير طاقة الحوض، استدامة اسماك الزينة" },
];

for (const g of GUIDE_META) {
  const path = `/guides/${g.slug}`;
  if (STATIC_PAGES[path]) continue;
  STATIC_PAGES[path] = {
    title: g.title,
    description: g.description,
    keywords: g.keywords,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: g.title,
        description: g.description,
        image: DEFAULT_IMAGE,
        author: { "@type": "Organization", name: "AQUAVO" },
        publisher: { "@type": "Organization", name: "AQUAVO", logo: { "@type": "ImageObject", url: DEFAULT_IMAGE } },
        mainEntityOfPage: { "@type": "WebPage", "@id": `${BASE}${path}` },
        inLanguage: "ar",
        isPartOf: { "@type": "WebSite", name: "AQUAVO", url: BASE },
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "الرئيسية", item: BASE },
          { "@type": "ListItem", position: 2, name: g.title.split(" | ")[0], item: `${BASE}${path}` },
        ],
      },
    ],
  };
}

// ─── Fetch dynamic metadata from DB ─────────────────────────────────────────
async function getProductMeta(slug: string): Promise<(PageMeta & { productImage?: string }) | null> {
  const db = getPool();
  if (!db) return null;
  try {
    const { rows } = await db.query(
      `SELECT id, name, description, price, currency, brand, category, images, thumbnail, slug, specifications, stock, variants, has_variants AS "hasVariants"
       FROM products
       WHERE slug = $1 AND deleted_at IS NULL
       LIMIT 1`,
      [slug]
    );
    if (rows.length === 0) return null;
    const p = rows[0];
    const variants = Array.isArray(p.variants) ? p.variants : [];
    const defaultVariant = variants.find((variant) => variant?.isDefault) || variants[0];
    const stock = Number(p.stock ?? 0);
    const variantStock = defaultVariant ? Number(defaultVariant.stock ?? 0) : stock;
    const schemaPrice = defaultVariant?.price ?? p.price;
    const inStock = p.hasVariants && defaultVariant ? stock > 0 && variantStock > 0 : stock > 0;
    const rawDesc = p.description
      || `تسوق ${p.name} من AQUAVO بأفضل الأسعار في العراق. توصيل لكل العراق خلال 24 ساعة.`;
    const desc = rawDesc.length > 158
      ? rawDesc.slice(0, rawDesc.lastIndexOf(" ", 155) || 155) + "..."
      : rawDesc;
    const rawImage = (p.images && p.images.length > 0 ? p.images[0] : p.thumbnail) || DEFAULT_IMAGE;
    const primaryImage = rawImage.startsWith("http") ? rawImage : `${BASE}${rawImage}`;
    return {
      title: `${p.name}${p.brand ? ` - ${p.brand}` : ""} | AQUAVO`,
      description: desc,
      keywords: `${p.name}، ${p.category || "مستلزمات احواض"}، ${p.brand || "AQUAVO"}، شراء اونلاين العراق`,
      ogType: "product",
      productImage: primaryImage,
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "Product",
        name: p.name,
        description: desc,
        image: primaryImage,
        brand: { "@type": "Brand", name: p.brand || "AQUAVO" },
        offers: {
          "@type": "Offer",
          price: schemaPrice,
          priceCurrency: p.currency || "IQD",
          availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
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
        image: meta.productImage || DEFAULT_IMAGE,
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

// Serialize JSON-LD safely for an inline <script> context: neutralize </script>
// breakouts and JS line separators so DB-derived values can't inject markup.
function safeJsonLd(obj: object): string {
  return JSON.stringify(obj)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

// ─── Inject metadata into HTML ──────────────────────────────────────────────
function injectMeta(html: string, meta: PageMeta & { url: string; image: string }): string {
  let jsonLdScript = "";
  if (meta.jsonLd) {
    if (Array.isArray(meta.jsonLd)) {
      jsonLdScript = meta.jsonLd
        .map((ld) => `<script type="application/ld+json">${safeJsonLd(ld)}</script>`)
        .join("\n  ");
    } else {
      jsonLdScript = `<script type="application/ld+json">${safeJsonLd(meta.jsonLd)}</script>`;
    }
  }

  // Validate + escape URLs before they land in href/src/content attributes (XSS / scheme injection guard)
  const safeUrl = escapeHtml(safeHttpUrl(meta.url, BASE));
  const safeImage = escapeHtml(safeHttpUrl(meta.image, DEFAULT_IMAGE));

  let result = html
    .replace(/__META_TITLE__/g, escapeHtml(meta.title))
    .replace(/__META_DESCRIPTION__/g, escapeHtml(meta.description))
    .replace(/__META_KEYWORDS__/g, escapeHtml(meta.keywords || DEFAULT_KEYWORDS))
    .replace(/__META_URL__/g, safeUrl)
    .replace(/__META_IMAGE__/g, safeImage)
    .replace(/__META_OG_TYPE__/g, escapeHtml(meta.ogType || "website"));

  if (meta.ogTitle) {
    const escapedOgTitle = escapeHtml(meta.ogTitle);
    result = result.replace(
      /(<meta property="og:title" content=")[^"]*(")/,
      `$1${escapedOgTitle}$2`
    );
    result = result.replace(
      /(<meta name="twitter:title" content=")[^"]*(")/,
      `$1${escapedOgTitle}$2`
    );
  }

  // Performance: strip unused modulepreloads (vendor-charts only for admin, vendor-animation deferred)
  result = result.replace(/<link rel="modulepreload"[^>]*vendor-charts[^>]*>\n?/g, '');
  result = result.replace(/<link rel="modulepreload"[^>]*vendor-animation[^>]*>\n?/g, '');

  // Performance: strip old unused preconnects from stale template
  result = result.replace(/<link rel="dns-prefetch"[^>]*images\.unsplash[^>]*>\n?/g, '');
  result = result.replace(/<link rel="preconnect"[^>]*images\.unsplash[^>]*>\n?/g, '');
  result = result.replace(/<link rel="preconnect"[^>]*fist-live-server[^>]*>\n?/g, '');
  result = result.replace(/<link rel="dns-prefetch"[^>]*fist-live-server[^>]*>\n?/g, '');
  result = result.replace(/<link rel="preconnect"[^>]*plausible\.io[^>]*>\n?/g, '');
  result = result.replace(/<link rel="dns-prefetch"[^>]*plausible\.io[^>]*>\n?/g, '');
  result = result.replace(/<link rel="preconnect"[^>]*analytics\.tiktok[^>]*>\n?/g, '');
  result = result.replace(/<link rel="dns-prefetch"[^>]*analytics\.tiktok[^>]*>\n?/g, '');

  // Performance: for product pages, replace hero preload with product image preload
  const isProductPage = meta.ogType === 'product' && meta.image && meta.image !== DEFAULT_IMAGE;
  if (isProductPage) {
    // Replace hero image preload with product LCP image preload
    result = result.replace(
      /<link rel="preload" as="image"[^>]*iwagumi[^>]*>/,
      `<link rel="preload" as="image" href="${safeImage}" fetchpriority="high">`
    );
  }

  // Inject JSON-LD
  result = result.replace(/__JSON_LD__/g, jsonLdScript);

  const metaPath = meta.url.replace(BASE, "") || "/";
  if (metaPath === "/" || metaPath === "/ar") {
    result = result.replace(
      /<link rel="stylesheet"([^>]*?)href="(\/assets\/[^"]+\.css)"([^>]*)>/,
      (_tag, before, href, after) => `<link rel="stylesheet"${before}href="${href}"${after} media="print" data-app-css>`
    );
    result = result.replace('<div id="root"></div>', `${CRITICAL_HOME_SHELL}<div id="root"></div>`);
  }

  return result;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Only allow http(s) URLs into href/src/content attributes; reject javascript:/data: etc.
function safeHttpUrl(raw: string, fallback: string): string {
  try {
    const u = new URL(raw, BASE);
    if (u.protocol === "http:" || u.protocol === "https:") return raw;
  } catch {
    /* fall through to fallback */
  }
  return fallback;
}

// ─── Markdown for Agents ────────────────────────────────────────────────────
function generateMarkdown(meta: PageMeta & { url: string; image: string }, pathname: string): string {
  const lines: string[] = [];
  lines.push(`# ${meta.title}\n`);
  lines.push(`${meta.description}\n`);
  lines.push(`**URL:** ${meta.url}\n`);

  if (pathname === "/" || pathname === "") {
    lines.push(`## About AQUAVO\n`);
    lines.push(`AQUAVO is Iraq's premier online aquarium equipment and supplies e-commerce platform, based in Baghdad.\n`);
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
    lines.push(`- Instagram: [@aquavo_iq](https://www.instagram.com/aquavo_iq)`);
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

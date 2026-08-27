import "../server/suppress.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { HTML_TEMPLATE } from "./_html-template.js";
import { GUIDE_CONTENT_PAGES, renderGuidesIndexHtml, renderGuidesIndexMarkdown } from "./_guides-content.js";
import { renderCanonicalGuideHtml, renderCanonicalGuideMarkdown, resolveGuidePage } from "./_canonical-guides.js";
import { getSeoMetaOverride } from "./_seo-content.js";
import { AQUAVO_FAQ_ITEMS } from "../shared/faq-content.js";
import { toPublicProduct, toPublicVariant } from "../shared/public-product.js";
import { buildProductStructuredData, withSiteEntities } from "./_seo-structured-data.js";
import { isKnownSitePath } from "../shared/site-routes.js";
import { canonicalUrlFor, isNoindexPath } from "../shared/seo-contract.js";

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
const DEFAULT_IMAGE = `${BASE}/brand/aquavo-v2-horizontal.png`;
const DEFAULT_TITLE = "AQUAVO — مستلزمات أحواض الزينة في العراق | فلاتر، سخانات، أغذية";
const DEFAULT_DESC = "AQUAVO متجر عراقي لمعدات ومستلزمات أحواض الزينة: فلاتر، سخانات، أغذية، ديكور ومعالجات مياه، مع توصيل لكل العراق ودفع عند الاستلام أو إلكترونياً.";
const DEFAULT_KEYWORDS = "مستلزمات احواض الزينة العراق، فلاتر احواض بغداد، سخانات احواض، معدات الحوض YEE العراق، احواض زجاجية العراق، علاجات مياه احواض، اغذية احواض الزينة، توصيل العراق";

// ─── Static page metadata ───────────────────────────────────────────────────
export interface PageMeta {
  title: string;
  description: string;
  keywords?: string;
  ogType?: string;
  ogTitle?: string;
  jsonLd?: object | object[];
  notFound?: boolean;
  noIndex?: boolean;
  /**
   * The product this page is about, already reduced to its public shape, for
   * the client to hydrate from instead of re-fetching what the server just
   * read. Exactly what `GET /api/products/:slug` returns — same
   * `toPublicProduct` boundary, so it can carry no cost fields.
   */
  embeddedProduct?: EmbeddedProduct;
}

/**
 * A product payload embedded in the HTML, stamped with the moment the server
 * built it.
 *
 * `renderedAt` is the whole safety mechanism: the client hands it to TanStack
 * Query as `initialDataUpdatedAt`, so the payload ages like any other cached
 * query. If this HTML is ever served from an edge cache, the data is treated
 * as exactly as old as it really is and refetched once past `staleTime` —
 * a visitor never sees a price that is stale without the client knowing it.
 */
export interface EmbeddedProduct {
  slug: string;
  renderedAt: number;
  product: Record<string, unknown>;
}

/** The id of the <script type="application/json"> block carrying the above. */
export const EMBEDDED_PRODUCT_SCRIPT_ID = "__AQUAVO_PRODUCT__";

const PRODUCT_CATEGORY_ITEMS = [
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
] as const;

const STATIC_PAGES: Record<string, PageMeta> = {
  "/": {
    title: "AQUAVO — مستلزمات أحواض الزينة في العراق | فلاتر، سخانات، أغذية",
    ogTitle: "AQUAVO — معدات أحواض بريميوم في العراق",
    description: "AQUAVO — متجر إلكتروني عراقي متخصص في مستلزمات أحواض الزينة في العراق. فلاتر، سخانات، أغذية، أحواض زجاجية، إضاءة LED، ديكورات ومعالجات مياه. توصيل لجميع المحافظات، دفع عند الاستلام أو إلكترونياً.",
    keywords: "مستلزمات احواض الزينة العراق، فلاتر احواض بغداد، سخانات احواض، معدات الحوض YEE العراق، احواض زجاجية العراق، علاجات مياه احواض، اغذية احواض الزينة",
    ogType: "website",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        "@id": `${BASE}/#organization`,
        name: "AQUAVO",
        legalName: "محل المنبع / AL NABEA SHOP",
        alternateName: ["أكوافو", "AQUAVO Iraq"],
        url: BASE,
        logo: {
          "@type": "ImageObject",
          url: DEFAULT_IMAGE,
          width: 512,
          height: 512
        },
        description: "متجر إلكتروني عراقي متخصص في معدات ومستلزمات أحواض الزينة: فلاتر، سخانات، أغذية، ديكورات ومعالجات مياه. الدفع عند الاستلام أو إلكترونياً، وتوصيل لكل العراق برسوم 5,000 د.ع.",
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
        }
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
        numberOfItems: PRODUCT_CATEGORY_ITEMS.length,
        itemListElement: PRODUCT_CATEGORY_ITEMS,
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
    description: "تابع عروض AQUAVO على معدات ومستلزمات أحواض الزينة المتوفرة حسب المخزون، مع أسعار واضحة وتوصيل لكل العراق.",
    keywords: "عروض مستلزمات احواض العراق، تخفيضات احواض بغداد، خصومات فلاتر سخانات، عروض يومية AQUAVO",
  },
  "/blog": {
    title: "مدونة أحواض الزينة — نصائح العناية والمعدات في العراق | AQUAVO",
    description: "مقالات ونصائح متخصصة عن أحواض الزينة في العراق: العناية بالمعدات، معالجة مياه الحوض، الفلاتر والسخانات، وممارسات عملية للمبتدئين والمحترفين.",
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
    description: "موسوعة تعليمية لأنواع اسماك الزينة المتوفرة في العراق مع معلومات عن كل نوع: التغذية، درجة الحرارة، التوافق، والعناية.",
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
    description: "دليل عملي لاختيار الفلتر المناسب لحوض اسماك الزينة في العراق. مقارنة بين الفلاتر الداخلية، الخارجية، والإسفنجية لتصل إلى تصفية مستقرة لماء حوضك.",
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
    keywords: "اسئلة احواض زينة، مستلزمات احواض الزينة العراق، توصيل مستلزمات احواض، AQUAVO",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        name: "الأسئلة الشائعة - AQUAVO",
        description: "إجابات شاملة على أكثر الأسئلة شيوعاً حول اسماك الزينة ومستلزمات الأحواض في العراق",
        url: `${BASE}/faq`,
        inLanguage: "ar",
        // The eleven-plus questions the /faq page actually renders, from
        // shared/faq-content.ts. This list used to be 31 hand-written
        // questions — spare parts, delivery zones and more — none of which
        // the page rendered. FAQPage schema describing Q&As a visitor cannot
        // find on the page is the mismatch Google asks you not to publish, so
        // the schema now follows the page instead of leading it.
        mainEntity: AQUAVO_FAQ_ITEMS.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
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
    title: "الشروط والأحكام - AQUAVO مستلزمات أحواض الزينة",
    description: "شروط وأحكام الاستخدام والشراء من متجر AQUAVO لمستلزمات احواض اسماك الزينة في العراق.",
  },
  "/privacy-policy": {
    title: "سياسة الخصوصية - AQUAVO مستلزمات أحواض الزينة",
    description: "سياسة الخصوصية وحماية بيانات العملاء في متجر AQUAVO لمستلزمات احواض اسماك الزينة.",
  },
  "/return-policy": {
    title: "سياسة الإرجاع والاستبدال - AQUAVO العراق",
    description: "سياسة إرجاع واستبدال المنتجات في متجر AQUAVO. ضمان رضا العملاء وحقوق المستهلك في العراق.",
  },
  "/about": {
    title: "من نحن - AQUAVO متجر مستلزمات أحواض الزينة في العراق",
    description: "AQUAVO (اكوافو) براند ومتجر عراقي متخصص في معدات ومستلزمات أحواض الزينة البريميوم، مع توصيل لكل العراق ودفع نقداً عند الاستلام.",
    keywords: "AQUAVO، اكوافو، من نحن، مستلزمات أحواض الزينة في العراق، معدات أحواض بغداد",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "AboutPage",
        name: "من نحن - AQUAVO",
        description: "AQUAVO متجر إلكتروني عراقي متخصص في مستلزمات أحواض الزينة في العراق",
        url: `${BASE}/about`,
        mainEntity: {
          "@type": "Organization",
          name: "AQUAVO",
          alternateName: "اكوافو",
          url: BASE,
          logo: DEFAULT_IMAGE,
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
    description: "لماذا يختار هواة أحواض الزينة AQUAVO في العراق؟ منتجات أصلية حسب المتوفر، توصيل لكل المحافظات، دعم فني، وأسعار واضحة.",
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
  { slug: "temperature-guide", title: "درجات حرارة الماء المناسبة لأسماك الزينة | دليل AQUAVO", description: "نطاقات درجة حرارة الماء المناسبة لأسماك الزينة الاستوائية والذهبية، وكيف تحافظ على ثبات الحرارة في حوضك.", keywords: "درجة حرارة الحوض، حرارة ماء اسماك الزينة، حرارة الاسماك الاستوائية" },
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
interface ProductDescriptionInput {
  name: string;
  brand?: string | null;
  description?: string | null;
  specifications?: Record<string, unknown> | null;
}

function includesTerm(value: string, term: string): boolean {
  return value.toLocaleLowerCase("en").includes(term.trim().toLocaleLowerCase("en"));
}

function factualProductLabel(product: ProductDescriptionInput): string {
  const details: string[] = [product.name.trim()];
  const brand = product.brand?.trim();
  if (brand && !includesTerm(product.name, brand)) details.push(brand);

  const specs = product.specifications ?? {};
  const modelOrSize = ["model", "Model", "الموديل", "size", "Size", "الحجم"]
    .map((key) => specs[key])
    .find((value) => typeof value === "string" || typeof value === "number");
  if (modelOrSize != null && !includesTerm(details.join(" "), String(modelOrSize))) {
    details.push(String(modelOrSize).trim());
  }
  return details.filter(Boolean).join(" ");
}

function productDescriptionFallback(product: ProductDescriptionInput): string {
  return `${factualProductLabel(product)} من معدات ومستلزمات أحواض الزينة المتوفرة لدى AQUAVO. راجع تفاصيل المنتج لاختيار ما يناسب احتياج حوضك.`;
}

/** Build a concise snippet from complete factual sentences; never cut a sentence mid-way. */
export function buildProductMetaDescription(product: ProductDescriptionInput): string {
  const normalized = (product.description ?? "").replace(/\s+/g, " ").trim();
  if (!normalized || /(?:\.{2,}|…)$/.test(normalized)) return productDescriptionFallback(product);

  const completeSentences = normalized.match(/[^.!؟]+[.!؟]+/g)?.map((sentence) => sentence.trim()) ?? [];
  if (completeSentences.length === 0) {
    return normalized.length <= 155 ? `${normalized}.` : productDescriptionFallback(product);
  }

  let result = "";
  for (const sentence of completeSentences) {
    const candidate = result ? `${result} ${sentence}` : sentence;
    if (candidate.length > 160) break;
    result = candidate;
  }
  return result || productDescriptionFallback(product);
}

/** Append the site name exactly once and avoid repeating a product brand already in its name. */
export function buildProductMetaTitle(name: string, brand?: string | null): string {
  const cleanName = name.replace(/\s*[|\-–—]\s*AQUAVO\s*$/i, "").trim();
  const cleanBrand = brand?.trim();
  // Own-brand products carry brand "AQUAVO", which the "| AQUAVO" suffix below
  // already states. Appending it as a brand too produced "… - AQUAVO | AQUAVO".
  const isSiteBrand = !!cleanBrand && /^aquavo$/i.test(cleanBrand);
  const productTitle = cleanBrand && !isSiteBrand && !includesTerm(cleanName, cleanBrand)
    ? `${cleanName} - ${cleanBrand}`
    : cleanName;
  return `${productTitle} | AQUAVO`;
}

async function getProductMeta(slug: string): Promise<(PageMeta & { productImage?: string }) | null> {
  const db = getPool();
  if (!db) return null;
  try {
    const { rows } = await db.query(
      // Every column in PUBLIC_PRODUCT_FIELDS, so this row can be reduced by
      // `toPublicProduct` into the byte-identical payload
      // `GET /api/products/:slug` returns and embedded for the client to
      // hydrate from. Selecting a subset here would ship a product that is
      // *missing* fields the PDP reads, which is worse than not embedding at
      // all — the page would render half-empty and never know why.
      //
      // Explicitly NOT selected: cost_price, packaging_cost, insert_cost and
      // the *_resolution columns. `toPublicProduct` would drop them anyway,
      // but they have no business being read into a process that writes HTML.
      `SELECT id, slug, name, brand, category, category_id AS "categoryId",
              subcategory, description, price, original_price AS "originalPrice",
              currency, images, thumbnail, rating, review_count AS "reviewCount",
              stock, low_stock_threshold AS "lowStockThreshold",
              is_new AS "isNew", is_best_seller AS "isBestSeller",
              is_product_of_week AS "isProductOfWeek", specifications,
              variants, has_variants AS "hasVariants",
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM products
       WHERE slug = $1 AND deleted_at IS NULL
       LIMIT 1`,
      [slug]
    );
    if (rows.length === 0) return null;
    const p = rows[0];
    // The `variants` jsonb carries costPrice/costStatus/costBasis/costEvidence, written by
    // migrations/0073_accounting_final_hardening.sql and absent from the ProductVariant type. Nothing
    // below renders them today — but this function feeds HTML that is served to crawlers, and a single
    // future JSON.stringify of the blob (a JSON-LD "offers" array, a debug dump) would publish the cost
    // basis of the whole catalogue. Sanitize at the source instead of relying on every downstream
    // renderer to keep being careful.
    const variants = Array.isArray(p.variants) ? p.variants.map(toPublicVariant) : [];
    const desc = buildProductMetaDescription({
      name: p.name,
      brand: p.brand,
      description: p.description,
      specifications: p.specifications,
    });
    const rawImage = (p.images && p.images.length > 0 ? p.images[0] : p.thumbnail) || DEFAULT_IMAGE;
    const primaryImage = rawImage.startsWith("http") ? rawImage : `${BASE}${rawImage}`;
    // The same public boundary GET /api/products/:slug goes through. Reusing
    // it — rather than assembling an object here — is what guarantees the
    // embedded payload and the API response are the same shape, and is the
    // only reason it is safe to put a product row into HTML at all: the
    // allowlist in shared/public-product.ts fails closed, so a column added by
    // a future migration cannot ride along into the page.
    const publicProduct = toPublicProduct(p);
    return {
      title: buildProductMetaTitle(p.name, p.brand),
      description: desc,
      keywords: `${p.name}، ${p.category || "مستلزمات احواض"}، ${p.brand || "AQUAVO"}، شراء اونلاين العراق`,
      ogType: "product",
      productImage: primaryImage,
      embeddedProduct: publicProduct
        ? { slug: String(p.slug), renderedAt: Date.now(), product: publicProduct }
        : undefined,
      // One producer of Product schema, shared with the prerendered crawler
      // route. This handler used to hand-roll a thinner copy, so the same
      // product described itself differently depending on who asked: the
      // browser path had no sku, no category, no itemCondition, no shipping
      // details, no eligibleRegion, a single image instead of the gallery, and
      // — for a product with options — a flat Product where the crawler
      // correctly published a ProductGroup with hasVariant.
      //
      // It also published the *meta* description, which is truncated to ~155
      // characters for the SERP snippet. On this catalogue that cut
      // "لا نعامل رقم 0.1°C كدقة قياس مؤكدة" down to "لا نعامل رقم 0.",
      // inverting the claim. The <meta name="description"> below still uses
      // the truncated text, which is what it is for; the schema now carries
      // the full description, which is what *it* is for.
      jsonLd: buildProductStructuredData({
        id: p.id,
        slug: p.slug,
        name: p.name,
        description: p.description,
        price: p.price,
        originalPrice: p.originalPrice,
        currency: p.currency,
        brand: p.brand,
        category: p.category,
        stock: p.stock,
        thumbnail: p.thumbnail,
        images: p.images,
        hasVariants: p.hasVariants,
        // Already stripped of the costPrice/costStatus/costBasis/costEvidence
        // keys above; the builder must never see them.
        variants,
        rating: p.rating,
        reviewCount: p.reviewCount,
      }),
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
      // blog_posts has no "imageUrl"/"status" columns — it stores image_url and
      // is_published. This query threw 42703 on every blog request that reached
      // the stable handler, which is how a blog post lost its title and Article
      // schema entirely whenever the semantic renderer fell back to here.
      `SELECT title, excerpt, image_url AS "imageUrl", author,
              published_at AS "publishedAt", updated_at AS "updatedAt", content
         FROM blog_posts WHERE slug = $1 AND is_published = TRUE LIMIT 1`,
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
async function resolveMetadata(pathname: string, notFound = false): Promise<PageMeta & { url: string; image: string }> {
  const cleanPath = pathname.replace(/\/+$/, "") || "/";
  const seoOverride = getSeoMetaOverride(cleanPath);
  const noIndex = isNoindexPath(cleanPath);

  if (notFound) {
    return {
      title: "الصفحة غير موجودة | AQUAVO",
      description: "الرابط الذي فتحته غير موجود. تقدر ترجع للرئيسية أو تتصفح معدات ومستلزمات أحواض الزينة المتوفرة لدى AQUAVO.",
      url: canonicalUrlFor(cleanPath),
      noIndex,
      image: DEFAULT_IMAGE,
      notFound: true,
    };
  }

  // Static pages
  if (STATIC_PAGES[cleanPath]) {
    const meta = STATIC_PAGES[cleanPath];
    return {
      ...meta,
      ...(seoOverride ?? {}),
      url: canonicalUrlFor(cleanPath),
      noIndex,
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
        url: canonicalUrlFor(cleanPath),
        noIndex,
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
        url: canonicalUrlFor(cleanPath),
        noIndex,
        image: DEFAULT_IMAGE,
        ogType: meta.ogType || "article",
      };
    }
  }

  // Fallback
  return {
    title: seoOverride?.title || DEFAULT_TITLE,
    description: seoOverride?.description || DEFAULT_DESC,
    keywords: seoOverride?.keywords || DEFAULT_KEYWORDS,
    url: canonicalUrlFor(cleanPath),
    noIndex,
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
export function injectMeta(html: string, meta: PageMeta & { url: string; image: string }): string {
  let jsonLdScript = "";
  if (meta.jsonLd) {
    // Same treatment as the prerendered route: whatever this page's builder
    // produced, make sure the #organization and #website nodes it points at
    // are actually defined here. `withSiteEntities` is a no-op when a builder
    // already includes them, so pages that had them keep exactly one copy.
    const nodes = withSiteEntities(Array.isArray(meta.jsonLd) ? meta.jsonLd : [meta.jsonLd]);
    jsonLdScript = nodes
      .map((ld) => `<script type="application/ld+json">${safeJsonLd(ld)}</script>`)
      .join("\n  ");
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

  if (meta.noIndex && !meta.notFound) {
    // Cart, checkout, profile and the other private routes must say so in the
    // markup too. The bot-UA path sets X-Robots-Tag, but a crawler outside that
    // allowlist only ever sees this tag, and the template default says "index".
    result = result.replace(
      /<meta\b[^>]*\bname=["']robots["'][^>]*>/i,
      '<meta name="robots" content="noindex, nofollow, noarchive">'
    );
  }

  if (meta.notFound) {
    result = result
      .replace(/\s*<link\b[^>]*\brel=["']canonical["'][^>]*>/gi, "")
      .replace(/\s*<meta\b[^>]*\bproperty=["']og:[^"']+["'][^>]*>/gi, "")
      .replace(/\s*<meta\b[^>]*\bname=["']twitter:[^"']+["'][^>]*>/gi, "")
      .replace(
        /<meta\b[^>]*\bname=["']robots["'][^>]*>/i,
        '<meta name="robots" content="noindex, follow">'
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

  // Route-aware LCP preload: home hero, product primary image, or none.
  const imagePreloadPattern = /<link\b(?=[^>]*\brel=["']preload["'])(?=[^>]*\bas=["']image["'])[^>]*>\s*/gi;
  result = result.replace(imagePreloadPattern, "");
  const isProductPage = meta.ogType === 'product' && meta.image && meta.image !== DEFAULT_IMAGE;
  const isArticlePage = meta.ogType === 'article' && meta.image && meta.image !== DEFAULT_IMAGE;
  const isHomePage = !meta.notFound && new URL(meta.url, BASE).pathname === "/";
  let imagePreload = "";
  if (isProductPage) {
    const preloadImage = escapeHtml(safeHttpUrl(toDetailPreloadImage(meta.image), DEFAULT_IMAGE));
    // The rendered <img> is responsive, so the preload has to be too. With a
    // bare href the browser preloaded w_800 while the img's srcset picked
    // w_1200 on any viewport needing more than 800 CSS px of image — which a
    // 412px phone at 2.625 DPR does. The preload therefore went unused and the
    // real LCP image was not discovered until React rendered it: measured LCP
    // 3,399 ms, of which 3,145 ms was load delay, with the request queued at
    // 3,257 ms and downloaded in 1 ms. imagesrcset/imagesizes mirror
    // product-image-gallery.tsx exactly, so the preload scanner resolves to
    // the same candidate the <img> will pick.
    const srcSet = toDetailPreloadSrcSet(meta.image);
    const responsive = srcSet
      ? ` imagesrcset="${escapeHtml(srcSet)}" imagesizes="${escapeHtml(DETAIL_IMAGE_SIZES)}"`
      : "";
    imagePreload = `<link rel="preload" as="image" href="${preloadImage}"${responsive} fetchpriority="high">`;
  } else if (isArticlePage) {
    // The article hero is the blog LCP element. Serving it as WebP took that
    // LCP from 14,436 ms to 3,882 ms, but 3,280 ms of what is left is still
    // load delay: the hero is only discovered once React renders it. This
    // preload is the same trick the product and home paths already use.
    const preloadImage = escapeHtml(safeHttpUrl(toBlogHeroPreloadImage(meta.image), DEFAULT_IMAGE));
    imagePreload = `<link rel="preload" as="image" href="${preloadImage}" fetchpriority="high">`;
  } else if (isHomePage) {
    imagePreload = `<link rel="preload" fetchpriority="high" as="image" type="image/webp" href="/images/aquascape-styles/iwagumi_aquascape_1765676307763.webp" imagesrcset="/images/aquascape-styles/iwagumi_aquascape_1765676307763-640.webp 640w, /images/aquascape-styles/iwagumi_aquascape_1765676307763.webp 1024w" imagesizes="(max-width: 1024px) 100vw, 48vw">`;
  }
  if (imagePreload) {
    // The preload above is stripped unconditionally, so re-inserting it is not
    // optional: a missed anchor ships the LCP image with no preload at all.
    // Anchoring on a single HTML comment silently did exactly that once the
    // comment was dropped from client/index.html, so try structural anchors in
    // descending order of how early they place the tag in <head>.
    const anchors: Array<[string | RegExp, (match: string) => string]> = [
      ["<!-- Open Graph / Facebook -->", (m) => `${imagePreload}\n\n  ${m}`],
      [/<meta\s+property=["']og:title["'][^>]*>/i, (m) => `${imagePreload}\n\n  ${m}`],
      [/<\/head>/i, (m) => `  ${imagePreload}\n${m}`],
    ];
    for (const [anchor, build] of anchors) {
      const next = result.replace(anchor as never, (m: string) => build(m));
      if (next !== result) {
        result = next;
        break;
      }
    }
  }

  // Inject JSON-LD
  result = result
    .replace(/<!--__JSON_LD__-->/g, jsonLdScript)
    .replace(/__JSON_LD__/g, jsonLdScript);

  // Hand the client the product the server just read, so the PDP renders from
  // it instead of asking for the same row again after hydration. Measured on
  // production before this: /api/products/:slug was requested at 3,823 ms and
  // resolved at 4,390 ms, and the variants/similar/frequently-bought requests
  // all queued behind it.
  if (meta.embeddedProduct) {
    result = injectEmbeddedProduct(result, meta.embeddedProduct);
  }

  return result;
}

/**
 * Serialize a product into an inert `<script type="application/json">`.
 *
 * A closing script tag inside a JSON string would end the block early and turn
 * the rest of the payload into live markup, so every angle bracket is written
 * as its \u00XX escape. That is still valid JSON and parses back to the exact
 * same string, so nothing downstream has to know — but the sequence that would
 * close the tag can no longer appear in the output at all.
 *
 * U+2028/U+2029 are deliberately NOT escaped: they terminate a line inside a
 * JavaScript string literal, which is why an inline `window.__DATA__ = {...}`
 * assignment has to handle them. They are ordinary characters inside JSON, and
 * this payload is parsed by `JSON.parse`, never evaluated. Using an inert JSON
 * block instead of an inline assignment is the point: there is no JavaScript
 * here to hijack, and the site's CSP needs to grant this nothing.
 */
function injectEmbeddedProduct(html: string, payload: EmbeddedProduct): string {
  const json = JSON.stringify(payload)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
;
  const block = `<script type="application/json" id="${EMBEDDED_PRODUCT_SCRIPT_ID}">${json}</script>`;
  // Before </body> so it never delays the head or the preload scanner.
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, `${block}</body>`);
  return html + block;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Mirrors the exact Cloudinary transform the PDP main image uses
// (client/src/lib/cloudinary.ts `detailImage`: width 800, height 800,
// quality auto:good, format auto, crop limit) so the SSR LCP preload targets
// the SAME asset the rendered <img> requests — otherwise the browser fetches
// both the raw and the transformed URL and the preload goes unused.
//
// `detailImage` itself cannot be imported here: it composes
// `preferLocalWebp`, which reads `window.location.origin` and would throw
// in this Node/Vercel serverless runtime, and the `@/*` client path alias
// isn't wired into api/tsconfig.json. Non-Cloudinary (local) URLs are
// returned unchanged, matching `optimizeCloudinaryUrl`'s own fallback.
function toDetailPreloadImage(url: string): string {
  if (!url.includes("res.cloudinary.com")) return url;
  // Don't double-transform an already-transformed URL.
  if (url.includes("/upload/f_") || url.includes("/upload/w_") || url.includes("/upload/q_")) {
    return url;
  }
  return url.replace("/upload/", "/upload/f_auto,q_auto:good,w_800,h_800,c_limit/");
}

// Mirrors `blogHeroImage` (client/src/lib/cloudinary.ts: width 1200, quality
// auto:good, format auto, crop limit, no height) so the preload targets the
// exact URL the article's <img> requests. A mismatch here means the browser
// fetches both copies and the preload is wasted — see the PDP srcset case.
function toBlogHeroPreloadImage(url: string): string {
  if (!url.includes("res.cloudinary.com")) return url;
  if (url.includes("/upload/f_") || url.includes("/upload/w_") || url.includes("/upload/q_")) {
    return url;
  }
  return url.replace("/upload/", "/upload/f_auto,q_auto:good,w_1200,c_limit/");
}

// Mirrors `detailImageSrcSet` (client/src/lib/cloudinary.ts): the same 400/600/
// 800/1200 square candidates, built with the same transform. Kept beside
// `toDetailPreloadImage` for the same reason — the client helper cannot be
// imported into this runtime. `ssr-pdp-preload.test.ts` pins the two in step.
const DETAIL_PRELOAD_WIDTHS = [400, 600, 800, 1200] as const;

// Must equal the `sizes` attribute on the PDP main image in
// client/src/components/products/product-image-gallery.tsx.
const DETAIL_IMAGE_SIZES = "(max-width: 512px) 100vw, 512px";

function toDetailPreloadSrcSet(url: string): string | null {
  if (!url.includes("res.cloudinary.com")) return null;
  if (url.includes("/upload/f_") || url.includes("/upload/w_") || url.includes("/upload/q_")) {
    return null;
  }
  return DETAIL_PRELOAD_WIDTHS.map((width) => {
    const candidate = url.replace(
      "/upload/",
      `/upload/f_auto,q_auto:good,w_${width},h_${width},c_limit/`,
    );
    return `${candidate} ${width}w`;
  }).join(", ");
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
    lines.push(`## Agent Discovery\n`);
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

    // Fully server-rendered educational content pages (visible in View Source,
    // quotable by AI engines). Served as complete HTML, bypassing the SPA shell.
    const guidePath = pathname.replace(/\/+$/, "") || "/";
    const acceptMd = (req.headers.accept || "").toLowerCase().includes("text/markdown");
    if (guidePath === "/guides") {
      res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
      if (acceptMd) {
        res.setHeader("Content-Type", "text/markdown; charset=utf-8");
        return res.status(200).send(renderGuidesIndexMarkdown(BASE));
      }
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(renderGuidesIndexHtml(BASE, DEFAULT_IMAGE));
    }
    // Resolve a guide the same way the crawler route does.
    //
    // These two paths disagreed. GUIDE_CONTENT_PAGES has no entry for
    // /guides/filter-choice — the string appears in that module only as a link
    // target — so the request fell through to the static PAGE_META below, whose
    // entry for that URL is a HowTo. `resolveGuidePage` does have it, which is
    // why a crawler was served Article + FAQPage for the very same URL:
    //
    //   $ curl -A Googlebot .../guides/filter-choice | grep -o '"@type":"[A-Za-z]*"'
    //   Article, FAQPage, Question, Answer, BreadcrumbList
    //   $ curl -A Chrome    .../guides/filter-choice | grep -o '"@type":"[A-Za-z]*"'
    //   HowTo, HowToStep, BreadcrumbList, OnlineStore, WebSite
    //
    // Google retired HowTo rich results in September 2023, so the version a
    // browser received was both different from the indexed one and the weaker
    // of the two: it had no Article and no FAQPage. Sharing one resolver makes
    // the guide a crawler indexes and the guide a person loads the same
    // document, and the richer of the two is the one that survives.
    const resolvedGuide = resolveGuidePage(guidePath);
    if (resolvedGuide) {
      const acceptHeader = (req.headers.accept || "").toLowerCase();
      res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
      if (acceptHeader.includes("text/markdown")) {
        res.setHeader("Content-Type", "text/markdown; charset=utf-8");
        return res
          .status(200)
          .send(renderCanonicalGuideMarkdown(resolvedGuide.canonicalPath, resolvedGuide.page, BASE));
      }
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res
        .status(200)
        .send(renderCanonicalGuideHtml(resolvedGuide.canonicalPath, resolvedGuide.page, BASE, DEFAULT_IMAGE));
    }

    const template = getTemplate();
    const status = isKnownSitePath(pathname, Object.keys(GUIDE_CONTENT_PAGES)) ? 200 : 404;
    const meta = await resolveMetadata(pathname, status === 404);
    const html = injectMeta(template, meta);

    // Markdown for Agents: If Accept: text/markdown, return markdown version
    const acceptHeader = (req.headers.accept || "").toLowerCase();
    if (acceptHeader.includes("text/markdown")) {
      const md = generateMarkdown(meta, pathname);
      res.setHeader("Content-Type", "text/markdown; charset=utf-8");
      res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
      return res.status(status).send(md);
    }

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    if (meta.noIndex) res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
    return res.status(status).send(html);
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

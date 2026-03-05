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
        sameAs: ["https://instagram.com/aquavo.iq", "https://www.tiktok.com/@aquavo.iq"],
        areaServed: { "@type": "Country", name: "العراق" },
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
    ],
  },
  "/products": {
    title: "مستلزمات احواض اسماك الزينة في العراق - فلاتر، سخانات، اغذية | AQUAVO",
    description: "تسوق جميع مستلزمات احواض اسماك الزينة في العراق: فلاتر، سخانات، أغذية، علاجات، نباتات مائية، إضاءة LED، ديكورات وأكثر. أسعار منافسة وتوصيل لكل المحافظات.",
    keywords: "مستلزمات احواض سمك العراق، فلاتر احواض بغداد، سخانات احواض، اغذية اسماك زينة، نباتات مائية، شراء اونلاين",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "جميع مستلزمات احواض اسماك الزينة",
      description: "تصفح جميع مستلزمات احواض اسماك الزينة في العراق",
      url: `${BASE}/products`,
      isPartOf: { "@type": "WebSite", name: "AQUAVO", url: BASE },
    },
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
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "كيف أبدأ بتربية اسماك الزينة في العراق؟",
          acceptedAnswer: { "@type": "Answer", text: "ابدأ بحوض مناسب (60 لتر على الأقل)، فلتر جيد، سخان، ثم أضف الماء وشغّل الحوض لمدة أسبوع قبل إضافة الأسماك. يمكنك طلب كل المستلزمات من AQUAVO مع توصيل لكل العراق." },
        },
        {
          "@type": "Question",
          name: "هل يتوفر توصيل لجميع محافظات العراق؟",
          acceptedAnswer: { "@type": "Answer", text: "نعم، AQUAVO يوفر خدمة توصيل لجميع محافظات العراق. التوصيل خلال 1-5 أيام عمل حسب المحافظة." },
        },
        {
          "@type": "Question",
          name: "ما هي أفضل اسماك الزينة للمبتدئين؟",
          acceptedAnswer: { "@type": "Answer", text: "أفضل اسماك الزينة للمبتدئين هي: الجوبي، المولي، البلاتي، النيون تيترا، والكوري كاتفش. هذه الأنواع سهلة العناية ومتوفرة في العراق." },
        },
        {
          "@type": "Question",
          name: "كم سعر حوض سمك الزينة في العراق؟",
          acceptedAnswer: { "@type": "Answer", text: "تتراوح أسعار أحواض اسماك الزينة في العراق حسب الحجم والنوع. تصفح قسم المنتجات في AQUAVO لمعرفة الأسعار الحالية مع عروض وخصومات مستمرة." },
        },
      ],
    },
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
      `SELECT title, excerpt, "imageUrl", author, "publishedAt" FROM blog_posts WHERE slug = $1 AND status = 'published' LIMIT 1`,
      [slug]
    );
    if (rows.length === 0) return null;
    const post = rows[0];
    return {
      title: `${post.title} | مدونة AQUAVO`,
      description: post.excerpt || post.title,
      ogType: "article",
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: post.title,
        description: post.excerpt || post.title,
        image: post.imageUrl || DEFAULT_IMAGE,
        author: { "@type": "Person", name: post.author || "AQUAVO" },
        publisher: { "@type": "Organization", name: "AQUAVO", logo: { "@type": "ImageObject", url: DEFAULT_IMAGE } },
        datePublished: post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined,
      },
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

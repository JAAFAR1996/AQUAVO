import type { VercelRequest, VercelResponse } from "@vercel/node";
import { readFileSync } from "fs";
import { join } from "path";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// ─── DB Setup (lightweight, no Drizzle overhead) ────────────────────────────
neonConfig.webSocketConstructor = ws;
let pool: Pool | null = null;
function getPool(): Pool | null {
  if (!process.env.DATABASE_URL) return null;
  if (!pool) pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return pool;
}

// ─── Read built index.html once ─────────────────────────────────────────────
let htmlTemplate: string | null = null;
function getTemplate(): string {
  if (!htmlTemplate) {
    // In Vercel, the built files are at the output directory root
    const possiblePaths = [
      join(process.cwd(), "dist", "public", "index.html"),
      join(process.cwd(), "index.html"),
      join(__dirname, "..", "index.html"),
    ];
    for (const p of possiblePaths) {
      try {
        htmlTemplate = readFileSync(p, "utf-8");
        break;
      } catch { /* try next */ }
    }
    if (!htmlTemplate) {
      htmlTemplate = "<!DOCTYPE html><html><body>Error loading template</body></html>";
    }
  }
  return htmlTemplate;
}

// ─── Constants ──────────────────────────────────────────────────────────────
const BASE = "https://www.aquavoiq.com";
const DEFAULT_IMAGE = `${BASE}/logo_aquavo.png`;
const DEFAULT_TITLE = "AQUAVO - متجر مستلزمات احواض سمك الزينة في العراق";
const DEFAULT_DESC = "AQUAVO متجر مستلزمات احواض اسماك الزينة الأول في العراق. فلاتر، سخانات، اسماك، نباتات مائية، أغذية وعلاجات بأفضل الأسعار مع توصيل لكل العراق.";
const DEFAULT_KEYWORDS = "احواض سمك، مستلزمات احواض، اسماك زينة، فلاتر، سخانات، نباتات مائية، العراق، بغداد، متجر اسماك، شراء اسماك اونلاين";

// ─── Static page metadata ───────────────────────────────────────────────────
interface PageMeta {
  title: string;
  description: string;
  keywords?: string;
  ogType?: string;
  jsonLd?: object;
}

const STATIC_PAGES: Record<string, PageMeta> = {
  "/": {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESC,
    ogType: "website",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "AQUAVO",
      url: BASE,
      logo: DEFAULT_IMAGE,
      description: "متجر مستلزمات احواض اسماك الزينة الأول في العراق",
      address: { "@type": "PostalAddress", addressLocality: "بغداد", addressCountry: "IQ" },
      contactPoint: { "@type": "ContactPoint", telephone: "+964-774-788-0673", contactType: "customer service", availableLanguage: "Arabic" },
      sameAs: ["https://instagram.com/aquavo.iq", "https://www.tiktok.com/@aquavo.iq"],
    },
  },
  "/products": {
    title: "جميع المنتجات - مستلزمات احواض اسماك الزينة | AQUAVO",
    description: "تصفح جميع مستلزمات احواض اسماك الزينة: فلاتر، سخانات، أغذية، علاجات، نباتات مائية، إضاءة LED وأكثر. توصيل لكل العراق.",
    keywords: "مستلزمات احواض سمك، فلاتر احواض، سخانات احواض، اغذية اسماك، نباتات مائية، العراق",
  },
  "/deals": {
    title: "العروض والتخفيضات - خصومات على مستلزمات الأحواض | AQUAVO",
    description: "أقوى العروض والتخفيضات على مستلزمات احواض اسماك الزينة في العراق. خصومات يومية على الفلاتر والسخانات والأغذية.",
    keywords: "عروض احواض سمك، تخفيضات مستلزمات احواض، خصومات اسماك زينة، عروض العراق",
  },
  "/blog": {
    title: "مدونة AQUAVO - نصائح تربية اسماك الزينة والعناية بالاحواض",
    description: "مقالات ونصائح عن تربية اسماك الزينة، العناية بالاحواض، معالجة أمراض الأسماك، وأفضل الممارسات للمبتدئين والمحترفين.",
    keywords: "تربية اسماك زينة، نصائح احواض سمك، امراض اسماك، عناية بالاحواض، مدونة اسماك",
  },
  "/fish-encyclopedia": {
    title: "موسوعة الأسماك - دليلك الشامل لأنواع اسماك الزينة | AQUAVO",
    description: "موسوعة شاملة لأنواع اسماك الزينة مع معلومات عن كل نوع: التغذية، درجة الحرارة، التوافق، والعناية. دليلك الأول في العراق.",
    keywords: "انواع اسماك زينة، موسوعة اسماك، جوبي، نيون تيترا، بيتا، سيكلد، اسماك عراق",
  },
  "/journey": {
    title: "رحلة حوضك - خطة متكاملة لبناء حوض أسماك مثالي | AQUAVO",
    description: "ابدأ رحلة حوضك مع AQUAVO. خطط مخصصة خطوة بخطوة لبناء حوض اسماك زينة مثالي من الصفر.",
    keywords: "بناء حوض سمك، رحلة حوض، حوض سمك للمبتدئين، تأسيس حوض زينة",
  },
  "/calculators": {
    title: "حاسبات الأحواض - احسب حجم الحوض والفلتر والسخان | AQUAVO",
    description: "حاسبات ذكية لمساعدتك: حجم الحوض المناسب، قوة الفلتر، حجم السخان، كمية الماء، وعدد الأسماك المثالي.",
    keywords: "حاسبة حوض سمك، حساب حجم حوض، حاسبة فلتر، حاسبة سخان",
  },
  "/fish-finder": {
    title: "أداة البحث عن الأسماك - اعثر على السمكة المناسبة لحوضك | AQUAVO",
    description: "ابحث عن اسماك الزينة المناسبة لحوضك حسب الحجم ودرجة الحرارة والتوافق. أداة ذكية من AQUAVO.",
  },
  "/fish-health": {
    title: "تشخيص أمراض الأسماك - علاج اسماك الزينة | AQUAVO",
    description: "شخّص أمراض اسماك الزينة واحصل على خطة علاج مناسبة. دليل شامل لأمراض الأسماك الشائعة وعلاجها.",
    keywords: "امراض اسماك زينة، علاج اسماك، تشخيص مرض سمكة، فطريات اسماك، نقطة بيضاء",
  },
  "/beginner-guide": {
    title: "دليل المبتدئين - كل ما تحتاجه لبدء هواية اسماك الزينة | AQUAVO",
    description: "دليل شامل للمبتدئين في تربية اسماك الزينة. من اختيار الحوض والفلتر إلى إضافة الأسماك والعناية اليومية.",
    keywords: "دليل مبتدئين احواض سمك، بداية هواية اسماك، نصائح اول حوض سمك",
  },
  "/fish-compatibility": {
    title: "توافق الأسماك - اكتشف أي الأسماك تعيش مع بعض | AQUAVO",
    description: "تعرف على توافق اسماك الزينة مع بعضها. أي الأسماك تعيش بسلام وأيها يجب فصلها.",
    keywords: "توافق اسماك زينة، اسماك تعيش مع بعض، خلط اسماك حوض",
  },
  "/tank-builder": {
    title: "مصمم الأحواض - صمم حوضك المثالي | AQUAVO",
    description: "صمم حوض اسماك الزينة المثالي خطوة بخطوة. اختر الحجم والفلتر والسخان والديكور مع مصمم الأحواض من AQUAVO.",
  },
  "/community-gallery": {
    title: "معرض المجتمع - صور أحواض العملاء | AQUAVO",
    description: "شاهد أجمل أحواض اسماك الزينة من عملاء AQUAVO في العراق. شارك صور حوضك وألهم الآخرين.",
  },
  "/faq": {
    title: "الأسئلة الشائعة - احواض اسماك الزينة | AQUAVO",
    description: "إجابات على أكثر الأسئلة شيوعاً حول تربية اسماك الزينة، العناية بالأحواض، والطلب من AQUAVO.",
  },
  "/shipping": {
    title: "سياسة الشحن والتوصيل - AQUAVO العراق",
    description: "معلومات الشحن والتوصيل لجميع محافظات العراق. أوقات التوصيل، الأسعار، والمناطق المشمولة.",
  },
  "/terms": {
    title: "الشروط والأحكام - AQUAVO",
    description: "شروط وأحكام الاستخدام لموقع AQUAVO لمستلزمات احواض اسماك الزينة.",
  },
  "/privacy-policy": {
    title: "سياسة الخصوصية - AQUAVO",
    description: "سياسة الخصوصية وحماية البيانات لموقع AQUAVO.",
  },
  "/return-policy": {
    title: "سياسة الإرجاع والاستبدال - AQUAVO",
    description: "سياسة إرجاع واستبدال المنتجات في AQUAVO. ضمان رضا العملاء.",
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
  const jsonLdScript = meta.jsonLd
    ? `<script type="application/ld+json">${JSON.stringify(meta.jsonLd)}</script>`
    : "";

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

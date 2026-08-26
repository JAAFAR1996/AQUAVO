import "../server/suppress.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { HTML_TEMPLATE } from "./_html-template.js";
import originalSsrHandler from "./ssr-meta.js";
import {
  cleanText,
  formatMoney,
  formatPrice,
  getActiveVariants,
  isInStock,
  renderSeoPreviewShell,
  SEO_FAQ_ITEMS,
  type SeoPreviewPage,
  type SeoPreviewBlogPost,
  type SeoPreviewProduct,
  type SeoPreviewReview,
} from "./_seo-preview-shell.js";
import { articlePlainText, cloudinaryHeroUrl } from "./_blog-article.js";
import {
  buildCollectionStructuredData,
  buildFaqStructuredData,
  buildHomeStructuredData,
  buildProductStructuredData,
  withSiteEntities,
} from "./_seo-structured-data.js";
import {
  canonicalGuidePath,
  renderCanonicalGuideHtml,
  renderCanonicalGuideMarkdown,
  renderCanonicalGuidesIndexHtml,
  renderCanonicalGuidesIndexMarkdown,
  resolveGuidePage,
} from "./_canonical-guides.js";
import {
  AQUAVO_BASE_URL,
  AQUAVO_ENTITY,
  PUBLIC_INDEXABLE_PATHS,
  canonicalProductCategory,
  isNoindexPath,
  productListingSeo,
} from "../shared/seo-contract.js";
import { isKnownSitePath } from "../shared/site-routes.js";
import { toPublicVariant } from "../shared/public-product.js";

neonConfig.webSocketConstructor = ws;

const DEFAULT_TITLE = "AQUAVO — مستلزمات أحواض الزينة في العراق";
const DEFAULT_DESCRIPTION = "متجر إلكتروني عراقي متخصص في معدات ومستلزمات أحواض الزينة، مع أدلة اختيار وتوصيل لكل العراق.";
const DEFAULT_KEYWORDS = "مستلزمات أحواض الزينة العراق، AQUAVO، فلاتر، سخانات، أغذية، معالجة المياه";

type Meta = {
  title: string;
  description: string;
  canonicalPath?: string;
  image?: string;
  ogType?: "website" | "article" | "product";
  jsonLd?: object | object[];
  notFound?: boolean;
};

type ResolvedPage = {
  page: SeoPreviewPage;
  meta: Meta;
  status: number;
};

const STATIC_COPY: Record<string, { heading: string; summary: string; paragraphs?: string[] }> = {
  "/contact": {
    heading: "تواصل مع AQUAVO",
    summary: "تواصل للاستفسار عن الطلبات أو اختيار معدات متوافقة مع حجم الحوض.",
    paragraphs: [`البريد الرسمي: ${AQUAVO_ENTITY.email}. الدعم متوفر ${AQUAVO_ENTITY.supportAvailability}.`],
  },
  "/shipping": {
    heading: "الشحن والتوصيل",
    summary: "AQUAVO يوصّل الطلبات إلى جميع محافظات العراق خلال 24 ساعة.",
    paragraphs: [
      `أجور التوصيل الثابتة ${new Intl.NumberFormat("ar-IQ").format(AQUAVO_ENTITY.deliveryFee)} د.ع لكل العراق.`,
      "الدفع عند الاستلام أو إلكترونياً، وتظهر تفاصيل الطلب قبل التأكيد.",
    ],
  },
  "/return-policy": {
    heading: "سياسة الاسترجاع والاستبدال",
    summary: "راجع الشروط والإجراءات المنشورة لطلبات الاسترجاع أو الاستبدال قبل إرسال الطلب.",
  },
  "/privacy-policy": {
    heading: "سياسة الخصوصية",
    summary: "توضح هذه الصفحة كيفية جمع بيانات المستخدم واستخدامها وحمايتها عند استعمال موقع AQUAVO.",
  },
  "/terms": {
    heading: "الشروط والأحكام",
    summary: "الشروط المنظمة لاستخدام الموقع والطلبات والخدمات المقدمة عبر AQUAVO.",
  },
  "/why-aquavo": {
    heading: "ليش تختار AQUAVO؟",
    summary: "متجر عراقي متخصص بمعلومات أوضح قبل الشراء ومنتجات موجهة لاحتياجات أحواض الزينة.",
  },
  "/beginner-guide": {
    heading: "دليل المبتدئ لأحواض الزينة",
    summary: "خطوات تأسيس الحوض واختيار المعدات الأساسية وتجنب الأخطاء الشائعة.",
  },
  "/calculators": {
    heading: "حاسبات أحواض الزينة",
    summary: "أدوات مساعدة لحساب حجم الحوض واحتياجات الفلتر والسخان والمعدات المرتبطة.",
  },
  "/fish-encyclopedia": {
    heading: "موسوعة أسماك الزينة",
    summary: "معلومات تعليمية عن أنواع أسماك الزينة واحتياجاتها والتوافق والعناية.",
  },
  "/fish-finder": {
    heading: "مساعد اختيار أسماك الزينة",
    summary: "أداة تعليمية لترشيح الأنواع حسب حجم الحوض والظروف والتوافق، ولا تمثل عرضاً لبيع أسماك حية.",
  },
  "/fish-compatibility": {
    heading: "توافق أسماك الزينة",
    summary: "معلومات مساعدة لمقارنة احتياجات الأنواع وسلوكها وحجم الحوض قبل الجمع بينها.",
  },
  "/fish-health": {
    heading: "صحة أسماك الزينة",
    summary: "معلومات أولية تساعد على ملاحظة الأعراض والمشاكل الشائعة، ولا تغني عن تشخيص مختص للحالات الخطرة.",
  },
  "/fish-health-diagnosis": {
    heading: "مساعد تنظيم أعراض الأسماك",
    summary: "أداة إرشادية لتنظيم الأعراض والمعلومات قبل اتخاذ إجراء أو مراجعة مختص.",
  },
  "/fish-breeding-calculator": {
    heading: "حاسبة تفريخ أسماك الزينة",
    summary: "أداة تعليمية لتنظيم بيانات التفريخ والمتابعة بحسب النوع والظروف المسجلة.",
  },
  "/journey": {
    heading: "رحلة بناء حوضك",
    summary: "خطة منظمة تساعدك على الانتقال من اختيار الحوض إلى التشغيل والصيانة.",
  },
  "/sustainability": {
    heading: "الاستدامة في أحواض الزينة",
    summary: "ممارسات تقلل الهدر وتحسن استهلاك الماء والطاقة والعناية طويلة الأمد بالحوض.",
  },
  "/community-gallery": {
    heading: "مجتمع أحواض الزينة",
    summary: "مساحة لعرض تجارب الأحواض ومشاركة الأفكار مع مراعاة صحة المعلومات وحقوق الصور.",
  },
  "/aquarium-wizard": {
    heading: "مساعد تجهيز الحوض",
    summary: "خطوات منظمة لاختيار المعدات الأساسية حسب حجم الحوض والاحتياج.",
  },
  "/tank-builder": {
    heading: "مخطط تجهيز الحوض",
    summary: "أداة تخطيط تساعد على ترتيب حجم الحوض والمعدات الأساسية قبل الشراء.",
  },
  "/deals": {
    heading: "عروض AQUAVO",
    summary: "العروض المتوفرة حسب المخزون مع أسعار واضحة وروابط مباشرة للمنتجات.",
  },
  "/blog": {
    heading: "مدونة AQUAVO لأحواض الزينة",
    summary: "مقالات ونصائح عملية عن المعدات والماء والصيانة والعناية بأحواض الزينة.",
  },
};

let pool: Pool | null = null;
function getPool(): Pool {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is unavailable for semantic rendering");
  if (!pool) pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return pool;
}

function numberValue(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function cleanText(value: string | null | undefined, fallback = ""): string {
  const text = (value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return text || fallback;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function safeJson(value: object): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function productImage(product: SeoPreviewProduct): string {
  const candidate = product.thumbnail ||
    (Array.isArray(product.images)
      ? product.images.find((item): item is string => typeof item === "string" && item.length > 0)
      : undefined);
  if (!candidate) return AQUAVO_ENTITY.logoUrl;
  if (/^https?:\/\//i.test(candidate)) return candidate;
  return `${AQUAVO_BASE_URL}${candidate.startsWith("/") ? "" : "/"}${candidate}`;
}

async function loadProducts(category?: string): Promise<SeoPreviewProduct[]> {
  const values: unknown[] = [];
  const categoryClause = category ? "AND category = $1" : "";
  if (category) values.push(category);
  const { rows } = await getPool().query(
    `SELECT id, slug, name, description, price, original_price AS "originalPrice",
            currency, brand, category, stock, thumbnail, images,
            has_variants AS "hasVariants", variants, rating,
            review_count AS "reviewCount"
       FROM products
      WHERE deleted_at IS NULL
        AND slug IS NOT NULL
        AND slug <> ''
        ${categoryClause}
      ORDER BY updated_at DESC NULLS LAST, name ASC
      LIMIT 250`,
    values,
  );
  // Same reasoning as ssr-meta: strip the internal keys hidden in the variants jsonb before this data
  // reaches any renderer. These rows are turned into HTML and markdown for crawlers and LLM fetchers.
  return rows.map(sanitizeSeoProductVariants) as SeoPreviewProduct[];
}

/** Rebuild a row's `variants` from the public allowlist, dropping the internal cost keys. */
function sanitizeSeoProductVariants<T extends { variants?: unknown }>(row: T): T {
  if (!Array.isArray(row?.variants)) return row;
  return { ...row, variants: row.variants.map(toPublicVariant) } as T;
}

async function loadProduct(slug: string): Promise<SeoPreviewProduct | null> {
  const { rows } = await getPool().query(
    `SELECT id, slug, name, description, price, original_price AS "originalPrice",
            currency, brand, category, stock, thumbnail, images,
            has_variants AS "hasVariants", variants, rating,
            review_count AS "reviewCount"
       FROM products
      WHERE slug = $1
        AND deleted_at IS NULL
      LIMIT 1`,
    [slug],
  );
  return (rows[0] ? (sanitizeSeoProductVariants(rows[0]) as SeoPreviewProduct) : null);
}

/**
 * Approved reviews for a product, for the crawler-visible page.
 *
 * Deliberately narrow: no `user_id`, no `ip_address`, no moderation `status`.
 * The public reviews API leaked the first two by spreading the row (see
 * shared/public-product.ts `toPublicReview`), and this renders into HTML that
 * is served to the whole internet, so the projection is the boundary.
 *
 * Only `status = 'approved'` is selected — a pending or rejected review must
 * never reach a page — and the author's display name comes from the review's
 * own guest name or the user's full name, never their email.
 */
async function loadProductReviews(productId: string | undefined): Promise<SeoPreviewReview[]> {
  if (!productId) return [];
  try {
    const { rows } = await getPool().query(
      `SELECT r.rating, r.title, r.comment, r.created_at AS "createdAt",
              COALESCE(NULLIF(r.guest_name, ''), u.full_name, 'عميل') AS author
         FROM reviews r
         LEFT JOIN users u ON u.id = r.user_id
        WHERE r.product_id = $1
          AND r.status = 'approved'
          AND r.comment IS NOT NULL
          AND r.comment <> ''
        ORDER BY r.created_at DESC
        LIMIT 5`,
      [productId],
    );
    return rows as SeoPreviewReview[];
  } catch (error) {
    // A product page must render even if the reviews table shape changes. The
    // aggregateRating is built from the product row, not from here, so the
    // worst case is a page without its review list — never a 500.
    console.error("[ssr-preview] review lookup failed", error);
    return [];
  }
}


const BLOG_COLUMNS = `slug, title, excerpt, content, category, author,
            read_time AS "readTime", image_url AS "imageUrl",
            published_at AS "publishedAt", updated_at AS "updatedAt"`;

async function loadBlogPost(slug: string): Promise<SeoPreviewBlogPost | null> {
  const { rows } = await getPool().query(
    `SELECT ${BLOG_COLUMNS}
       FROM blog_posts
      WHERE slug = $1
        AND is_published = TRUE
      LIMIT 1`,
    [slug],
  );
  return (rows[0] as SeoPreviewBlogPost | undefined) ?? null;
}

async function loadBlogPosts(limit = 60, excludeSlug?: string): Promise<SeoPreviewBlogPost[]> {
  const { rows } = await getPool().query(
    `SELECT ${BLOG_COLUMNS}
       FROM blog_posts
      WHERE is_published = TRUE
        AND ($2::text IS NULL OR slug <> $2)
      ORDER BY published_at DESC NULLS LAST
      LIMIT $1`,
    [limit, excludeSlug ?? null],
  );
  return rows as SeoPreviewBlogPost[];
}

function blogImage(post: SeoPreviewBlogPost): string {
  const candidate = typeof post.imageUrl === "string" ? post.imageUrl.trim() : "";
  if (!candidate) return AQUAVO_ENTITY.logoUrl;
  const absolute = /^https?:\/\//i.test(candidate)
    ? candidate
    : `${AQUAVO_BASE_URL}${candidate.startsWith("/") ? "" : "/"}${candidate}`;
  return cloudinaryHeroUrl(absolute, 1200);
}

function breadcrumbSchema(name: string, path: string): object {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "الرئيسية", item: AQUAVO_BASE_URL },
      { "@type": "ListItem", position: 2, name, item: `${AQUAVO_BASE_URL}${path}` },
    ],
  };
}

function webPageSchema(name: string, description: string, path: string): object[] {
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name,
      description,
      url: `${AQUAVO_BASE_URL}${path}`,
      inLanguage: "ar-IQ",
      isPartOf: { "@id": `${AQUAVO_BASE_URL}/#website` },
    },
    breadcrumbSchema(name, path),
  ];
}

async function resolvePage(pathname: string, rawCategory?: string): Promise<ResolvedPage | null> {
  if (pathname === "/" || pathname === "/ar") {
    const products = await loadProducts();
    if (products.length === 0) throw new Error("No products returned for homepage semantic rendering");
    return {
      page: { kind: "home", products },
      meta: {
        title: DEFAULT_TITLE,
        description: DEFAULT_DESCRIPTION,
        canonicalPath: "/",
        jsonLd: buildHomeStructuredData(products),
      },
      status: 200,
    };
  }

  if (pathname === "/products") {
    const category = canonicalProductCategory(rawCategory);
    const products = await loadProducts(category);
    if (!category && products.length === 0) throw new Error("No products returned for product collection");
    if (category && products.length === 0) {
      return {
        page: { kind: "not-found", path: pathname },
        meta: {
          title: "فئة المنتجات غير موجودة | AQUAVO",
          description: "فئة المنتجات المطلوبة غير موجودة أو لا تحتوي منتجات منشورة.",
          notFound: true,
        },
        status: 404,
      };
    }
    const listingSeo = productListingSeo(category);
    const { canonicalPath } = listingSeo;
    const name = category ? `منتجات ${category}` : "مستلزمات أحواض الزينة في العراق";
    return {
      page: { kind: "products", products, category },
      meta: {
        title: listingSeo.title,
        description: category
          ? `تصفح منتجات ${category} المتوفرة من AQUAVO مع السعر وحالة المخزون.`
          : "تصفح مستلزمات أحواض الزينة المتوفرة من AQUAVO مع روابط مباشرة لكل منتج.",
        canonicalPath,
        jsonLd: buildCollectionStructuredData(products, canonicalPath, name),
      },
      status: 200,
    };
  }

  const productMatch = pathname.match(/^\/products\/([^/]+)\/?$/);
  if (productMatch) {
    const slug = decodeURIComponent(productMatch[1]);
    const product = await loadProduct(slug);
    if (!product) {
      return {
        page: { kind: "not-found", path: pathname },
        meta: {
          title: "المنتج غير موجود | AQUAVO",
          description: "المنتج المطلوب غير متوفر أو تم نقل رابطه.",
          notFound: true,
        },
        status: 404,
      };
    }
    const related = (await loadProducts(canonicalProductCategory(product.category)))
      .filter((item) => item.slug !== product.slug)
      .slice(0, 6);
    const productPath = `/products/${encodeURIComponent(product.slug)}`;
    // The Product schema carries an aggregateRating whenever the product has
    // real reviews, but this page rendered none of them, so a crawler was shown
    // a rating with nothing behind it. Google asks that a review snippet be
    // backed by a review the visitor can actually see on the page.
    const reviews = await loadProductReviews(product.id);
    return {
      page: { kind: "product", product, related, reviews },
      meta: {
        title: `${product.name} | AQUAVO العراق`,
        description: cleanText(product.description, `معلومات ومواصفات ${product.name} من AQUAVO.`).slice(0, 160),
        canonicalPath: productPath,
        image: productImage(product),
        ogType: "product",
        jsonLd: buildProductStructuredData(product),
      },
      status: 200,
    };
  }

  if (pathname === "/blog") {
    const posts = await loadBlogPosts(60);
    const copy = STATIC_COPY["/blog"];
    return {
      page: { kind: "blog-index", posts, heading: copy.heading, summary: copy.summary },
      meta: {
        title: `${copy.heading} | AQUAVO`,
        description: copy.summary,
        canonicalPath: "/blog",
        jsonLd: webPageSchema(copy.heading, copy.summary, "/blog"),
      },
      status: 200,
    };
  }

  const blogMatch = pathname.match(/^\/blog\/([^/]+)\/?$/);
  if (blogMatch) {
    const slug = decodeURIComponent(blogMatch[1]);
    const post = await loadBlogPost(slug);
    if (!post) {
      return {
        page: { kind: "not-found", path: pathname },
        meta: {
          title: "المقال غير موجود | AQUAVO",
          description: "المقال المطلوب غير متوفر أو تم نقل رابطه.",
          notFound: true,
        },
        status: 404,
      };
    }
    const related = (await loadBlogPosts(6, post.slug));
    const blogPath = `/blog/${encodeURIComponent(post.slug)}`;
    const image = blogImage(post);
    const description = cleanText(post.excerpt, articlePlainText(post.content)).slice(0, 160);
    const published = post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined;
    const modified = post.updatedAt ? new Date(post.updatedAt).toISOString() : published;
    return {
      page: { kind: "blog-post", post, related },
      meta: {
        title: `${post.title} | مدونة AQUAVO`,
        description,
        canonicalPath: blogPath,
        image,
        ogType: "article",
        jsonLd: [
          {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: post.title,
            description,
            image,
            author: { "@type": "Person", name: post.author || "AQUAVO" },
            publisher: {
              "@type": "Organization",
              name: AQUAVO_ENTITY.brandName,
              logo: { "@type": "ImageObject", url: AQUAVO_ENTITY.logoUrl },
            },
            datePublished: published,
            dateModified: modified,
            wordCount: articlePlainText(post.content).split(/\s+/).filter(Boolean).length || undefined,
            articleSection: post.category || undefined,
            inLanguage: "ar-IQ",
            mainEntityOfPage: { "@type": "WebPage", "@id": `${AQUAVO_BASE_URL}${blogPath}` },
            isPartOf: { "@id": `${AQUAVO_BASE_URL}/#website` },
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "الرئيسية", item: AQUAVO_BASE_URL },
              { "@type": "ListItem", position: 2, name: "المدونة", item: `${AQUAVO_BASE_URL}/blog` },
              { "@type": "ListItem", position: 3, name: post.title, item: `${AQUAVO_BASE_URL}${blogPath}` },
            ],
          },
        ],
      },
      status: 200,
    };
  }

  if (pathname === "/faq") {
    return {
      page: { kind: "faq" },
      meta: {
        title: "الأسئلة الشائعة | AQUAVO",
        description: "إجابات مباشرة عن الشحن والدفع والدعم واختيار معدات أحواض الزينة.",
        canonicalPath: "/faq",
        jsonLd: [buildFaqStructuredData(SEO_FAQ_ITEMS), breadcrumbSchema("الأسئلة الشائعة", "/faq")],
      },
      status: 200,
    };
  }

  if (pathname === "/about") {
    return {
      page: { kind: "about" },
      meta: {
        title: "عن AQUAVO | متجر أحواض الزينة في العراق",
        description: "AQUAVO متجر إلكتروني عراقي لمعدات ومستلزمات أحواض الزينة، يعمل عبر الموقع وواتساب ولا يبيع كائنات حية.",
        canonicalPath: "/about",
        jsonLd: webPageSchema("عن AQUAVO", "هوية AQUAVO وخدمات المتجر الإلكتروني في العراق.", "/about"),
      },
      status: 200,
    };
  }

  const copy = STATIC_COPY[pathname];
  if (copy) {
    return {
      page: { kind: "static", path: pathname, ...copy },
      meta: {
        title: `${copy.heading} | AQUAVO`,
        description: copy.summary,
        canonicalPath: pathname,
        jsonLd: webPageSchema(copy.heading, copy.summary, pathname),
      },
      status: 200,
    };
  }

  return null;
}

function isProductionRequest(req: VercelRequest): boolean {
  const hostHeader = Array.isArray(req.headers.host) ? req.headers.host[0] : req.headers.host;
  const host = (hostHeader || "").split(":")[0].toLowerCase();
  return process.env.VERCEL_ENV === "production" || host === "www.aquavoiq.com" || host === "aquavoiq.com";
}

function robotsValue(indexable: boolean, status: number, pathname: string): string {
  if (status === 404) return "noindex, follow";
  if (!indexable || isNoindexPath(pathname)) return "noindex, nofollow, noarchive";
  return "index, follow, max-image-preview:large";
}

function injectDocument(template: string, meta: Meta, shell: string, robots: string): string {
  const canonical = meta.canonicalPath ? `${AQUAVO_BASE_URL}${meta.canonicalPath}` : undefined;
  const rawJsonLd = meta.notFound || !meta.jsonLd ? [] : Array.isArray(meta.jsonLd) ? meta.jsonLd : [meta.jsonLd];
  // Every route that references #organization or #website now also defines
  // them. A 404 stays bare on purpose: it describes no page and no business.
  const jsonLdItems = rawJsonLd.length > 0 ? withSiteEntities(rawJsonLd) : rawJsonLd;
  const jsonLd = jsonLdItems.map((item) => `<script type="application/ld+json">${safeJson(item)}</script>`).join("\n  ");

  let html = template
    .replace(/__META_TITLE__/g, escapeHtml(meta.title))
    .replace(/__META_DESCRIPTION__/g, escapeHtml(meta.description))
    .replace(/__META_KEYWORDS__/g, DEFAULT_KEYWORDS)
    .replace(/__META_URL__/g, escapeHtml(canonical || AQUAVO_BASE_URL))
    .replace(/__META_IMAGE__/g, escapeHtml(meta.image || AQUAVO_ENTITY.logoUrl))
    .replace(/__META_OG_TYPE__/g, meta.ogType || "website")
    .replace(/<!--__JSON_LD__-->/g, jsonLd)
    .replace(/__JSON_LD__/g, jsonLd);

  if (/<meta\b[^>]*\bname=["']robots["'][^>]*>/i.test(html)) {
    html = html.replace(/<meta\b[^>]*\bname=["']robots["'][^>]*>/i, `<meta name="robots" content="${robots}">`);
  } else {
    html = html.replace("</head>", `  <meta name="robots" content="${robots}">\n</head>`);
  }

  if (!canonical || meta.notFound) {
    html = html
      .replace(/\s*<link\b[^>]*\brel=["']canonical["'][^>]*>/gi, "")
      .replace(/\s*<meta\b[^>]*\bproperty=["']og:url["'][^>]*>/gi, "");
  }
  if (meta.notFound) {
    html = html
      .replace(/\s*<meta\b[^>]*\bproperty=["']og:[^"']+["'][^>]*>/gi, "")
      .replace(/\s*<meta\b[^>]*\bname=["']twitter:[^"']+["'][^>]*>/gi, "");
  }

  const root = /<div\s+id=["']root["']([^>]*)><\/div>/i;
  if (!root.test(html)) throw new Error("Client root outlet missing");
  return html.replace(
    root,
    `<div id="seo-root" data-aq-server-rendered="semantic-v3">${shell}</div><div id="root"$1></div>`,
  );
}

/**
 * The `Accept: text/markdown` representation of a page.
 *
 * This exists for LLM fetchers, and it used to be strictly worse than the HTML
 * it stands in for: a product's markdown carried availability and category but
 * **no price**, `/faq` returned a title and one line with none of its six
 * questions, and articles returned no article. An agent that preferred this
 * representation got less than one that ignored it.
 *
 * Every fact below is read from the same page object the HTML shell renders,
 * through the same helpers (`formatPrice`, `isInStock`, `articlePlainText`),
 * so the two cannot state different prices or a different stock status. There
 * is nothing here that is not also on the page.
 */
function markdown(page: SeoPreviewPage, meta: Meta): string {
  const lines = [`# ${meta.title}`, "", meta.description, ""];
  if (meta.canonicalPath) lines.push(`Canonical: ${AQUAVO_BASE_URL}${meta.canonicalPath}`, "");

  const productUrl = (slug: string) => `${AQUAVO_BASE_URL}/products/${encodeURIComponent(slug)}`;

  if (page.kind === "home" || page.kind === "products") {
    // Price and availability inline, so a listing is usable without following
    // every link.
    for (const product of page.products) {
      const stock = isInStock(product) ? "متوفر" : "غير متوفر حالياً";
      lines.push(`- [${product.name}](${productUrl(product.slug)}) — ${formatPrice(product)} — ${stock}`);
    }
  } else if (page.kind === "product") {
    const product = page.product;
    const category = canonicalProductCategory(product.category);
    lines.push("## المواصفات", "");
    lines.push(`- السعر: ${formatPrice(product)}`);
    lines.push(`- التوفر: ${isInStock(product) ? "متوفر" : "غير متوفر حالياً"}`);
    if (product.brand) lines.push(`- العلامة: ${product.brand}`);
    if (category) lines.push(`- الفئة: ${category}`);
    lines.push(`- التوصيل: ${formatMoney(AQUAVO_ENTITY.deliveryFee, AQUAVO_ENTITY.currency)} لكل العراق`);

    const variants = getActiveVariants(product);
    if (variants.length > 0) {
      lines.push("", "## الخيارات المتاحة", "");
      for (const variant of variants) {
        const price = formatMoney(numberValue(variant.price) ?? 0, product.currency || AQUAVO_ENTITY.currency);
        const stock = (numberValue(variant.stock) ?? 0) > 0 ? "متوفر" : "غير متوفر حالياً";
        lines.push(`- ${variant.label}: ${price} — ${stock}`);
      }
    }

    // The full description, not the ~155-character meta snippet above it.
    const description = cleanText(product.description, "");
    if (description) lines.push("", "## الوصف", "", description);

    if (page.related.length > 0) {
      lines.push("", "## منتجات مرتبطة", "");
      for (const related of page.related.slice(0, 6)) {
        lines.push(`- [${related.name}](${productUrl(related.slug)})`);
      }
    }
  } else if (page.kind === "faq") {
    lines.push("## الأسئلة الشائعة", "");
    for (const [question, answer] of SEO_FAQ_ITEMS) {
      lines.push(`### ${question}`, "", answer, "");
    }
  } else if (page.kind === "blog-post") {
    const post = page.post;
    const meta2: string[] = [];
    if (post.author) meta2.push(`الكاتب: ${post.author}`);
    if (post.category) meta2.push(`القسم: ${post.category}`);
    if (post.readTime) meta2.push(`مدة القراءة: ${post.readTime}`);
    if (meta2.length > 0) lines.push(meta2.join(" · "), "");
    const body = articlePlainText(post.content);
    if (body) lines.push(body, "");
    if (page.related.length > 0) {
      lines.push("## مقالات ذات صلة", "");
      for (const related of page.related.slice(0, 6)) {
        lines.push(`- [${related.title}](${AQUAVO_BASE_URL}/blog/${encodeURIComponent(related.slug)})`);
      }
    }
  } else if (page.kind === "blog-index") {
    lines.push("## المقالات", "");
    for (const post of page.posts) {
      const excerpt = cleanText(post.excerpt, "");
      const suffix = excerpt ? ` — ${excerpt}` : "";
      lines.push(`- [${post.title}](${AQUAVO_BASE_URL}/blog/${encodeURIComponent(post.slug)})${suffix}`);
    }
  } else if (page.kind === "about") {
    lines.push(
      `AQUAVO، المشغّل قانونياً باسم ${AQUAVO_ENTITY.legalName}، متجر إلكتروني عراقي متخصص في معدات ومستلزمات أحواض الزينة.`,
      "",
      "العمل بالكامل عبر الموقع وواتساب، ولا يوجد محل لاستقبال الزبائن حالياً. AQUAVO لا يبيع أسماكاً أو كائنات أو نباتات حية.",
      "",
      `التوصيل لكل العراق خلال 24 ساعة بأجور ${formatMoney(AQUAVO_ENTITY.deliveryFee, AQUAVO_ENTITY.currency)}، والدعم متوفر 24/7.`,
    );
  } else if (page.kind === "static") {
    for (const paragraph of page.paragraphs ?? []) lines.push(paragraph, "");
  }

  return lines.join("\n");
}

function setResponseHeaders(res: VercelResponse, robots: string, mode: string): void {
  res.setHeader("X-Robots-Tag", robots);
  res.setHeader("X-AQUAVO-SSR-Mode", mode);
  res.setHeader("Vary", "Accept");
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const production = isProductionRequest(req);
  const requestUrl = new URL(req.url || "/", AQUAVO_BASE_URL);
  const pathname = requestUrl.pathname.replace(/\/+$/, "") || "/";
  const acceptsMarkdown = (req.headers.accept || "").toLowerCase().includes("text/markdown");

  try {
    if (pathname === "/guides") {
      const robots = robotsValue(production, 200, pathname);
      setResponseHeaders(res, robots, "guide-index-v3");
      res.setHeader("Cache-Control", production ? "public, s-maxage=3600, stale-while-revalidate=86400" : "private, no-store");
      res.status(200).setHeader("Content-Type", acceptsMarkdown ? "text/markdown; charset=utf-8" : "text/html; charset=utf-8");
      res.send(acceptsMarkdown
        ? renderCanonicalGuidesIndexMarkdown(AQUAVO_BASE_URL)
        : renderCanonicalGuidesIndexHtml(AQUAVO_BASE_URL, AQUAVO_ENTITY.logoUrl));
      return;
    }

    if (pathname.startsWith("/guides/")) {
      const canonicalPath = canonicalGuidePath(pathname);
      const resolvedGuide = resolveGuidePage(pathname);
      if (!resolvedGuide) {
        const robots = robotsValue(production, 404, pathname);
        setResponseHeaders(res, robots, "guide-404-v3");
        const notFound: ResolvedPage = {
          page: { kind: "not-found", path: pathname },
          meta: { title: "الدليل غير موجود | AQUAVO", description: "الدليل المطلوب غير موجود أو تم نقل رابطه.", notFound: true },
          status: 404,
        };
        const html = injectDocument(HTML_TEMPLATE, notFound.meta, renderSeoPreviewShell(notFound.page), robots);
        res.status(404).setHeader("Content-Type", "text/html; charset=utf-8").send(html);
        return;
      }
      if (canonicalPath !== pathname) {
        res.setHeader("Cache-Control", "public, max-age=3600");
        res.status(308).setHeader("Location", canonicalPath).end();
        return;
      }
      const robots = robotsValue(production, 200, pathname);
      setResponseHeaders(res, robots, "guide-content-v3");
      res.setHeader("Cache-Control", production ? "public, s-maxage=3600, stale-while-revalidate=86400" : "private, no-store");
      res.status(200).setHeader("Content-Type", acceptsMarkdown ? "text/markdown; charset=utf-8" : "text/html; charset=utf-8");
      res.send(acceptsMarkdown
        ? renderCanonicalGuideMarkdown(resolvedGuide.canonicalPath, resolvedGuide.page, AQUAVO_BASE_URL)
        : renderCanonicalGuideHtml(resolvedGuide.canonicalPath, resolvedGuide.page, AQUAVO_BASE_URL, AQUAVO_ENTITY.logoUrl));
      return;
    }

    const rawCategory = requestUrl.searchParams.get("category") || undefined;
    const canonicalCategory = canonicalProductCategory(rawCategory);
    if (pathname === "/products" && rawCategory && canonicalCategory && rawCategory !== canonicalCategory) {
      const destination = `/products?category=${encodeURIComponent(canonicalCategory)}`;
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.status(308).setHeader("Location", destination).end();
      return;
    }

    const resolved = await resolvePage(pathname, rawCategory);
    if (!resolved) {
      if (!isKnownSitePath(pathname)) {
        const notFound: ResolvedPage = {
          page: { kind: "not-found", path: pathname },
          meta: { title: "الصفحة غير موجودة | AQUAVO", description: "الرابط المطلوب غير موجود أو تم نقله.", notFound: true },
          status: 404,
        };
        const robots = robotsValue(production, 404, pathname);
        setResponseHeaders(res, robots, "semantic-404-v3");
        const html = injectDocument(HTML_TEMPLATE, notFound.meta, renderSeoPreviewShell(notFound.page), robots);
        res.status(404).setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Cache-Control", production ? "public, s-maxage=60" : "private, no-store");
        res.send(html);
        return;
      }

      const delegatedRobots = robotsValue(
        production && (PUBLIC_INDEXABLE_PATHS as readonly string[]).includes(pathname),
        200,
        pathname,
      );
      setResponseHeaders(res, delegatedRobots, "stable-delegate-v3");
      await Promise.resolve(originalSsrHandler(req, res));
      return;
    }

    const robots = robotsValue(production, resolved.status, pathname);
    setResponseHeaders(res, robots, "semantic-v3");
    res.setHeader("Cache-Control", production ? "public, s-maxage=300, stale-while-revalidate=3600" : "private, no-store");

    if (acceptsMarkdown) {
      res.status(resolved.status).setHeader("Content-Type", "text/markdown; charset=utf-8");
      res.send(markdown(resolved.page, resolved.meta));
      return;
    }

    const html = injectDocument(HTML_TEMPLATE, resolved.meta, renderSeoPreviewShell(resolved.page), robots);
    res.status(resolved.status).setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (error) {
    console.error("[semantic-v3] falling back to stable handler", error);
    const fallbackRobots = robotsValue(false, 200, pathname);
    setResponseHeaders(res, fallbackRobots, "stable-fallback-v3");
    res.setHeader("X-AQUAVO-SSR-Fallback", "1");
    await Promise.resolve(originalSsrHandler(req, res));
  }
}

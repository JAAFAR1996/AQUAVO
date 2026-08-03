import "../server/suppress.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { HTML_TEMPLATE } from "./_html-template.js";
import originalSsrHandler from "./ssr-meta.js";

neonConfig.webSocketConstructor = ws;

const BASE = "https://www.aquavoiq.com";
const DEFAULT_IMAGE = `${BASE}/brand/aquavo-v2-horizontal.png`;
const DEFAULT_TITLE = "AQUAVO — مستلزمات أحواض الزينة في العراق";
const DEFAULT_DESCRIPTION = "متجر إلكتروني عراقي متخصص في معدات ومستلزمات أحواض الزينة، مع أدلة اختيار وتوصيل داخل العراق.";

type Variant = {
  id?: string;
  label?: string;
  price?: string | number | null;
  originalPrice?: string | number | null;
  stock?: string | number | null;
  sku?: string | null;
  image?: string | null;
};

type Product = {
  id?: string;
  slug: string;
  name: string;
  description?: string | null;
  price?: string | number | null;
  originalPrice?: string | number | null;
  currency?: string | null;
  brand?: string | null;
  category?: string | null;
  stock?: string | number | null;
  thumbnail?: string | null;
  images?: unknown;
  hasVariants?: boolean | null;
  variants?: Variant[] | null;
  rating?: string | number | null;
  reviewCount?: string | number | null;
};

type Page =
  | { kind: "home"; products: Product[] }
  | { kind: "products"; products: Product[]; category?: string }
  | { kind: "product"; product: Product; related: Product[] }
  | { kind: "faq" }
  | { kind: "about" }
  | { kind: "static"; heading: string; summary: string; path: string }
  | { kind: "not-found"; path: string };

type Meta = {
  title: string;
  description: string;
  canonicalPath: string;
  image?: string;
  ogType?: "website" | "article" | "product";
  jsonLd?: object | object[];
};

const STATIC_COPY: Record<string, { heading: string; summary: string }> = {
  "/contact": { heading: "تواصل مع AQUAVO", summary: "بيانات التواصل والاستفسار عن الطلبات واختيار معدات أحواض الزينة في العراق." },
  "/shipping": { heading: "الشحن والتوصيل", summary: "معلومات التوصيل داخل العراق، أهلية الطلب، وبيانات الشحن التي تظهر قبل تأكيد الطلب." },
  "/return-policy": { heading: "سياسة الاسترجاع والاستبدال", summary: "الشروط والإجراءات المتعلقة بطلبات الاسترجاع أو الاستبدال في متجر AQUAVO." },
  "/privacy-policy": { heading: "سياسة الخصوصية", summary: "كيفية جمع بيانات المستخدم واستخدامها وحمايتها عند استخدام موقع AQUAVO." },
  "/terms": { heading: "الشروط والأحكام", summary: "الشروط المنظمة لاستخدام الموقع والطلبات والخدمات المقدمة عبر AQUAVO." },
  "/why-aquavo": { heading: "ليش تختار AQUAVO؟", summary: "متجر عراقي متخصص، معلومات أوضح قبل الشراء، ومنتجات موجهة لاحتياجات أحواض الزينة." },
  "/beginner-guide": { heading: "دليل المبتدئ لأحواض الزينة", summary: "خطوات تأسيس الحوض واختيار المعدات الأساسية وتجنب الأخطاء الشائعة." },
  "/calculators": { heading: "حاسبات أحواض الزينة", summary: "أدوات مساعدة لحساب حجم الحوض واحتياجات الفلتر والسخان والمعدات المرتبطة." },
  "/fish-encyclopedia": { heading: "موسوعة أسماك الزينة", summary: "معلومات تعليمية عن أنواع أسماك الزينة واحتياجاتها والتوافق والعناية." },
  "/fish-health": { heading: "صحة أسماك الزينة", summary: "معلومات أولية تساعد على ملاحظة الأعراض والمشاكل الشائعة، ولا تغني عن تشخيص مختص عند الحالات الخطرة." },
  "/fish-health-diagnosis": { heading: "مساعد تشخيص مشاكل الأسماك", summary: "أداة إرشادية لتنظيم الأعراض والمعلومات قبل اتخاذ إجراء أو مراجعة مختص." },
  "/journey": { heading: "رحلة بناء حوضك", summary: "خطة منظمة تساعدك على الانتقال من اختيار الحوض إلى التشغيل والصيانة." },
  "/sustainability": { heading: "الاستدامة في أحواض الزينة", summary: "ممارسات تقلل الهدر وتحسن استهلاك الماء والطاقة والعناية طويلة الأمد بالحوض." },
};

const FAQ_ITEMS = [
  ["هل AQUAVO يوصّل لكل العراق؟", "يوفر AQUAVO التوصيل إلى المحافظات المتاحة وفق سياسة الشحن الحالية."],
  ["هل الدفع عند الاستلام متوفر؟", "الدفع عند الاستلام متوفر للطلبات المؤهلة، وتظهر التفاصيل قبل تأكيد الطلب."],
  ["شلون أختار الفلتر المناسب؟", "يعتمد الاختيار على حجم الحوض والحمل الحيوي ونوع وسائط الفلترة والتدفق الفعلي."],
  ["شلون أختار السخان؟", "يعتمد الاختيار على حجم الحوض وفرق الحرارة مع مراقبة ميزان حرارة مستقل."],
] as const;

let pool: Pool | null = null;

function getPool(): Pool {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is unavailable for semantic SSR");
  if (!pool) pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return pool;
}

function numberValue(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function plainText(value: string | null | undefined, fallback = ""): string {
  const text = (value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return text || fallback;
}

function safeJson(value: object): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function imageUrl(product: Product, variant?: Variant): string {
  const candidate = variant?.image || product.thumbnail ||
    (Array.isArray(product.images)
      ? product.images.find((item): item is string => typeof item === "string" && item.length > 0)
      : undefined);
  if (!candidate) return DEFAULT_IMAGE;
  if (/^https?:\/\//i.test(candidate)) return candidate;
  return `${BASE}${candidate.startsWith("/") ? "" : "/"}${candidate}`;
}

function activeVariants(product: Product): Variant[] {
  if (!product.hasVariants || !Array.isArray(product.variants)) return [];
  return product.variants.filter((variant) => {
    const price = numberValue(variant.price);
    return Boolean(variant.label) && price !== null && price > 0;
  });
}

function priceValues(product: Product): number[] {
  const variants = activeVariants(product)
    .map((variant) => numberValue(variant.price))
    .filter((value): value is number => value !== null && value > 0);
  if (variants.length > 0) return variants;
  const price = numberValue(product.price);
  return price !== null && price > 0 ? [price] : [];
}

function availability(stock: string | number | null | undefined): string {
  return (numberValue(stock) ?? 0) > 0
    ? "https://schema.org/InStock"
    : "https://schema.org/OutOfStock";
}

function formatMoney(value: number, currency = "IQD"): string {
  if (currency === "IQD") return `${new Intl.NumberFormat("ar-IQ").format(value)} د.ع`;
  return `${new Intl.NumberFormat("ar-IQ").format(value)} ${currency}`;
}

function productUrl(product: Product): string {
  return `${BASE}/products/${encodeURIComponent(product.slug)}`;
}

export function buildProductStructuredData(product: Product): object {
  const url = productUrl(product);
  const currency = product.currency || "IQD";
  const prices = priceValues(product);
  const variants = activeVariants(product);
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: product.name,
    description: plainText(product.description, `معلومات ومواصفات ${product.name} من AQUAVO.`),
    url,
    image: [imageUrl(product)],
    sku: product.id || product.slug,
    category: product.category || undefined,
    brand: { "@type": "Brand", name: product.brand || "AQUAVO" },
  };

  if (prices.length === 1) {
    schema.offers = {
      "@type": "Offer",
      url,
      price: String(prices[0]),
      priceCurrency: currency,
      availability: availability(variants[0]?.stock ?? product.stock),
      itemCondition: "https://schema.org/NewCondition",
    };
  } else if (prices.length > 1) {
    schema.offers = {
      "@type": "AggregateOffer",
      url,
      lowPrice: String(Math.min(...prices)),
      highPrice: String(Math.max(...prices)),
      offerCount: prices.length,
      priceCurrency: currency,
      availability: availability(product.stock),
    };
  }

  const rating = numberValue(product.rating);
  const reviewCount = numberValue(product.reviewCount);
  if (rating !== null && rating > 0 && reviewCount !== null && reviewCount > 0) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: rating,
      reviewCount,
    };
  }

  return schema;
}

export function buildCollectionStructuredData(products: Product[], name: string, canonicalPath: string): object[] {
  const url = `${BASE}${canonicalPath}`;
  return [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name,
      url,
      inLanguage: "ar-IQ",
      isPartOf: { "@type": "WebSite", "@id": `${BASE}/#website` },
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name,
      numberOfItems: products.length,
      itemListElement: products.map((product, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: productUrl(product),
        name: product.name,
      })),
    },
  ];
}

function homeSchema(products: Product[]): object[] {
  return [
    {
      "@context": "https://schema.org",
      "@type": "OnlineStore",
      "@id": `${BASE}/#organization`,
      name: "AQUAVO",
      legalName: "محل المنبع / AL NABEA SHOP",
      alternateName: ["أكوافو", "AQUAVO Iraq"],
      url: BASE,
      logo: DEFAULT_IMAGE,
      areaServed: { "@type": "Country", name: "Iraq" },
      address: { "@type": "PostalAddress", addressLocality: "Baghdad", addressCountry: "IQ" },
      sameAs: [
        "https://instagram.com/aquavo_iq",
        "https://www.tiktok.com/@aquavo.iq",
        "https://www.facebook.com/profile.php?id=61587249730248",
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${BASE}/#website`,
      name: "AQUAVO",
      url: BASE,
      inLanguage: "ar-IQ",
      potentialAction: {
        "@type": "SearchAction",
        target: `${BASE}/products?search={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
    ...buildCollectionStructuredData(products.slice(0, 24), "منتجات AQUAVO", "/"),
  ];
}

function faqSchema(): object {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map(([name, text]) => ({
      "@type": "Question",
      name,
      acceptedAnswer: { "@type": "Answer", text },
    })),
  };
}

function breadcrumbSchema(items: Array<{ name: string; path: string }>): object {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${BASE}${item.path}`,
    })),
  };
}

async function loadProducts(category?: string): Promise<Product[]> {
  const db = getPool();
  const values: unknown[] = [];
  const categoryClause = category ? "AND category = $1" : "";
  if (category) values.push(category);
  const { rows } = await db.query(
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
  return rows as Product[];
}

async function loadProduct(slug: string): Promise<Product | null> {
  const db = getPool();
  const { rows } = await db.query(
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
  return (rows[0] as Product | undefined) || null;
}

function productPriceText(product: Product): string {
  const prices = priceValues(product);
  if (prices.length === 0) return "السعر غير منشور";
  const currency = product.currency || "IQD";
  if (prices.length === 1) return formatMoney(prices[0], currency);
  return `${formatMoney(Math.min(...prices), currency)} – ${formatMoney(Math.max(...prices), currency)}`;
}

function productCard(product: Product): string {
  const description = plainText(product.description, `معلومات ومواصفات ${product.name}.`).slice(0, 180);
  return `<article class="aqv-seo-card">
    <h2><a href="/products/${encodeURIComponent(product.slug)}">${escapeHtml(product.name)}</a></h2>
    <p>${escapeHtml(description)}</p>
    <dl>
      <div><dt>السعر</dt><dd>${escapeHtml(productPriceText(product))}</dd></div>
      <div><dt>المخزون</dt><dd>${(numberValue(product.stock) ?? 0) > 0 ? "متوفر" : "غير متوفر"}</dd></div>
      ${product.category ? `<div><dt>الفئة</dt><dd>${escapeHtml(product.category)}</dd></div>` : ""}
    </dl>
  </article>`;
}

function categoryLinks(products: Product[]): string {
  const categories = Array.from(new Set(products.map((product) => product.category).filter((value): value is string => Boolean(value))));
  if (categories.length === 0) return "";
  return `<nav aria-label="فئات المنتجات" class="aqv-seo-categories">${categories
    .map((category) => `<a href="/products?category=${encodeURIComponent(category)}">${escapeHtml(category)}</a>`)
    .join("")}</nav>`;
}

function shellStyle(): string {
  return `<style>
    .aqv-seo-shell{font-family:Cairo,Tahoma,sans-serif;direction:rtl;max-width:1180px;margin:0 auto;padding:32px 20px;color:#232323;background:#F6F4EF}
    .aqv-seo-shell a{color:#0B64A6;text-decoration-thickness:1px;text-underline-offset:3px}
    .aqv-seo-shell h1{font-size:clamp(28px,5vw,48px);line-height:1.25;margin:0 0 16px}
    .aqv-seo-shell h2{font-size:20px;line-height:1.5;margin:0 0 8px}
    .aqv-seo-shell p{line-height:1.8;margin:0 0 16px}
    .aqv-seo-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;margin-top:24px}
    .aqv-seo-card{border:1px solid #DDD8CE;padding:18px;background:#fff}
    .aqv-seo-card dl{margin:12px 0 0}.aqv-seo-card dl div{display:flex;justify-content:space-between;gap:16px;border-top:1px solid #DDD8CE;padding:8px 0}
    .aqv-seo-card dt{color:#6B6B6B}.aqv-seo-card dd{margin:0;font-weight:700}
    .aqv-seo-categories{display:flex;gap:8px;flex-wrap:wrap;margin:18px 0}.aqv-seo-categories a{border:1px solid #DDD8CE;padding:8px 12px;background:#fff}
    .aqv-seo-breadcrumbs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px;color:#6B6B6B}
    .aqv-seo-variants{margin:20px 0;padding:0;list-style:none}.aqv-seo-variants li{border-bottom:1px solid #DDD8CE;padding:10px 0}
  </style>`;
}

export function renderSemanticShell(page: Page): string {
  const style = shellStyle();
  if (page.kind === "home") {
    return `${style}<main class="aqv-seo-shell"><h1>مستلزمات أحواض الزينة في العراق</h1><p>${escapeHtml(DEFAULT_DESCRIPTION)}</p>${categoryLinks(page.products)}<p><a href="/products">تصفح جميع المنتجات</a> · <a href="/faq">الأسئلة الشائعة</a> · <a href="/about">عن AQUAVO</a></p><section class="aqv-seo-grid" aria-label="منتجات AQUAVO">${page.products.slice(0, 24).map(productCard).join("")}</section></main>`;
  }
  if (page.kind === "products") {
    const heading = page.category ? `منتجات ${page.category}` : "جميع مستلزمات أحواض الزينة";
    return `${style}<main class="aqv-seo-shell"><nav class="aqv-seo-breadcrumbs" aria-label="مسار الصفحة"><a href="/">الرئيسية</a><span>‹</span><span>المنتجات</span></nav><h1>${escapeHtml(heading)}</h1><p>تصفح المنتجات المتوفرة مع السعر وحالة المخزون وروابط مباشرة لكل منتج.</p>${categoryLinks(page.products)}<section class="aqv-seo-grid" aria-label="قائمة المنتجات">${page.products.map(productCard).join("")}</section></main>`;
  }
  if (page.kind === "product") {
    const product = page.product;
    const variants = activeVariants(product);
    return `${style}<main class="aqv-seo-shell"><nav class="aqv-seo-breadcrumbs" aria-label="مسار الصفحة"><a href="/">الرئيسية</a><span>‹</span><a href="/products">المنتجات</a>${product.category ? `<span>‹</span><a href="/products?category=${encodeURIComponent(product.category)}">${escapeHtml(product.category)}</a>` : ""}</nav><article><h1>${escapeHtml(product.name)}</h1><p>${escapeHtml(plainText(product.description, `معلومات ومواصفات ${product.name} من AQUAVO.`))}</p><dl class="aqv-seo-card"><div><dt>السعر</dt><dd>${escapeHtml(productPriceText(product))}</dd></div><div><dt>المخزون</dt><dd>${(numberValue(product.stock) ?? 0) > 0 ? "متوفر" : "غير متوفر"}</dd></div>${product.brand ? `<div><dt>العلامة</dt><dd>${escapeHtml(product.brand)}</dd></div>` : ""}${product.category ? `<div><dt>الفئة</dt><dd>${escapeHtml(product.category)}</dd></div>` : ""}</dl>${variants.length ? `<h2>الخيارات المتوفرة</h2><ul class="aqv-seo-variants">${variants.map((variant) => `<li><strong>${escapeHtml(variant.label || "خيار")}</strong> — ${escapeHtml(formatMoney(numberValue(variant.price) || 0, product.currency || "IQD"))}${(numberValue(variant.stock) ?? 0) > 0 ? " — متوفر" : " — غير متوفر"}</li>`).join("")}</ul>` : ""}</article>${page.related.length ? `<section><h2>منتجات مرتبطة</h2><div class="aqv-seo-grid">${page.related.map(productCard).join("")}</div></section>` : ""}</main>`;
  }
  if (page.kind === "faq") {
    return `${style}<main class="aqv-seo-shell"><h1>الأسئلة الشائعة عن AQUAVO وأحواض الزينة</h1>${FAQ_ITEMS.map(([question, answer]) => `<details><summary><strong>${escapeHtml(question)}</strong></summary><p>${escapeHtml(answer)}</p></details>`).join("")}</main>`;
  }
  if (page.kind === "about") {
    return `${style}<main class="aqv-seo-shell"><h1>عن AQUAVO</h1><p>AQUAVO متجر إلكتروني عراقي متخصص في معدات ومستلزمات أحواض الزينة ومساعدة الهواة على اختيار المنتجات المتوافقة مع أحواضهم.</p><p><a href="/products">تصفح المنتجات</a> · <a href="/contact">تواصل معنا</a></p></main>`;
  }
  if (page.kind === "static") {
    return `${style}<main class="aqv-seo-shell"><nav class="aqv-seo-breadcrumbs"><a href="/">الرئيسية</a><span>‹</span><span>${escapeHtml(page.heading)}</span></nav><h1>${escapeHtml(page.heading)}</h1><p>${escapeHtml(page.summary)}</p><p><a href="/products">تصفح المنتجات</a> · <a href="/faq">الأسئلة الشائعة</a></p></main>`;
  }
  return `${style}<main class="aqv-seo-shell"><h1>الصفحة غير موجودة</h1><p>الرابط المطلوب غير متوفر.</p><p><a href="/">العودة للرئيسية</a> · <a href="/products">تصفح المنتجات</a></p></main>`;
}

function isProductionRequest(req: VercelRequest): boolean {
  const hostHeader = Array.isArray(req.headers.host) ? req.headers.host[0] : req.headers.host;
  const host = (hostHeader || "").split(":")[0].toLowerCase();
  return process.env.VERCEL_ENV === "production" || host === "www.aquavoiq.com" || host === "aquavoiq.com";
}

function injectDocument(template: string, meta: Meta, shell: string, indexable: boolean): string {
  const canonical = `${BASE}${meta.canonicalPath}`;
  const jsonLdItems = !meta.jsonLd ? [] : Array.isArray(meta.jsonLd) ? meta.jsonLd : [meta.jsonLd];
  const jsonLd = jsonLdItems.map((item) => `<script type="application/ld+json">${safeJson(item)}</script>`).join("\n  ");
  const robots = indexable ? "index, follow, max-image-preview:large" : "noindex, nofollow, noarchive, max-image-preview:large";

  let html = template
    .replace(/__META_TITLE__/g, escapeHtml(meta.title))
    .replace(/__META_DESCRIPTION__/g, escapeHtml(meta.description))
    .replace(/__META_KEYWORDS__/g, "مستلزمات أحواض الزينة العراق، AQUAVO، فلاتر، سخانات، أغذية")
    .replace(/__META_URL__/g, escapeHtml(canonical))
    .replace(/__META_IMAGE__/g, escapeHtml(meta.image || DEFAULT_IMAGE))
    .replace(/__META_OG_TYPE__/g, meta.ogType || "website")
    .replace(/<!--__JSON_LD__-->/g, jsonLd)
    .replace(/__JSON_LD__/g, jsonLd);

  if (/<meta\b[^>]*\bname=["']robots["'][^>]*>/i.test(html)) {
    html = html.replace(/<meta\b[^>]*\bname=["']robots["'][^>]*>/i, `<meta name="robots" content="${robots}">`);
  } else {
    html = html.replace("</head>", `  <meta name="robots" content="${robots}">\n</head>`);
  }

  const root = /<div\s+id=["']root["']([^>]*)><\/div>/i;
  if (!root.test(html)) throw new Error("SSR root outlet missing");
  return html.replace(root, `<div id="root"$1 data-aq-server-rendered="semantic-v2">${shell}</div>`);
}

function markdown(page: Page, meta: Meta): string {
  const lines = [`# ${meta.title}`, "", meta.description, "", `Canonical: ${BASE}${meta.canonicalPath}`, ""];
  if (page.kind === "home" || page.kind === "products") {
    for (const product of page.products) lines.push(`- [${product.name}](${productUrl(product)})`);
  } else if (page.kind === "product") {
    lines.push(`- Price: ${productPriceText(page.product)}`);
    lines.push(`- Availability: ${(numberValue(page.product.stock) ?? 0) > 0 ? "In stock" : "Out of stock"}`);
    if (page.product.category) lines.push(`- Category: ${page.product.category}`);
  }
  return lines.join("\n");
}

async function resolvePage(pathname: string, category?: string): Promise<{ page: Page; meta: Meta; status: number } | null> {
  if (pathname === "/" || pathname === "/ar") {
    const products = await loadProducts();
    if (products.length === 0) throw new Error("No products returned for homepage semantic SSR");
    return {
      page: { kind: "home", products },
      meta: { title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION, canonicalPath: "/", jsonLd: homeSchema(products) },
      status: 200,
    };
  }

  if (pathname === "/products") {
    const products = await loadProducts(category);
    if (!category && products.length === 0) throw new Error("No products returned for collection semantic SSR");
    const categorySuffix = category ? ` — ${category}` : "";
    const canonicalPath = category ? `/products?category=${encodeURIComponent(category)}` : "/products";
    return {
      page: { kind: "products", products, category },
      meta: {
        title: `مستلزمات أحواض الزينة في العراق${categorySuffix} | AQUAVO`,
        description: category ? `تصفح منتجات ${category} المتوفرة من AQUAVO مع السعر والمخزون.` : "تصفح مستلزمات أحواض الزينة المتوفرة من AQUAVO مع روابط مباشرة لكل منتج.",
        canonicalPath,
        jsonLd: [
          ...buildCollectionStructuredData(products, category ? `منتجات ${category}` : "جميع منتجات AQUAVO", canonicalPath),
          breadcrumbSchema([{ name: "الرئيسية", path: "/" }, { name: "المنتجات", path: "/products" }]),
        ],
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
        meta: { title: "المنتج غير موجود | AQUAVO", description: "المنتج المطلوب غير متوفر أو تم نقل رابطه.", canonicalPath: pathname },
        status: 404,
      };
    }
    const related = (await loadProducts(product.category || undefined)).filter((item) => item.slug !== product.slug).slice(0, 6);
    const productPath = `/products/${encodeURIComponent(product.slug)}`;
    return {
      page: { kind: "product", product, related },
      meta: {
        title: `${product.name} | AQUAVO العراق`,
        description: plainText(product.description, `معلومات ومواصفات ${product.name} من AQUAVO.`).slice(0, 300),
        canonicalPath: productPath,
        image: imageUrl(product),
        ogType: "product",
        jsonLd: [
          buildProductStructuredData(product),
          breadcrumbSchema([
            { name: "الرئيسية", path: "/" },
            { name: "المنتجات", path: "/products" },
            { name: product.name, path: productPath },
          ]),
        ],
      },
      status: 200,
    };
  }

  if (pathname === "/faq") {
    return {
      page: { kind: "faq" },
      meta: { title: "الأسئلة الشائعة | AQUAVO", description: "إجابات عملية عن الشحن والدفع واختيار معدات أحواض الزينة.", canonicalPath: "/faq", jsonLd: faqSchema() },
      status: 200,
    };
  }

  if (pathname === "/about") {
    return {
      page: { kind: "about" },
      meta: { title: "عن AQUAVO | متجر أحواض الزينة في العراق", description: "تعرف على AQUAVO، المتجر العراقي المتخصص في معدات ومستلزمات أحواض الزينة.", canonicalPath: "/about" },
      status: 200,
    };
  }

  const staticCopy = STATIC_COPY[pathname];
  if (staticCopy) {
    return {
      page: { kind: "static", path: pathname, ...staticCopy },
      meta: { title: `${staticCopy.heading} | AQUAVO`, description: staticCopy.summary, canonicalPath: pathname },
      status: 200,
    };
  }

  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const indexable = isProductionRequest(req);
  const robots = indexable ? "index, follow, max-image-preview:large" : "noindex, nofollow, noarchive";
  res.setHeader("X-Robots-Tag", robots);
  res.setHeader("X-AQUAVO-SSR-Mode", "semantic-v2");

  try {
    const requestUrl = new URL(req.url || "/", BASE);
    const pathname = requestUrl.pathname.replace(/\/$/, "") || "/";

    if (pathname.startsWith("/guides/")) {
      await Promise.resolve(originalSsrHandler(req, res));
      return;
    }

    const resolved = await resolvePage(pathname, requestUrl.searchParams.get("category") || undefined);
    if (!resolved) {
      res.setHeader("X-AQUAVO-SSR-Mode", "stable-delegate");
      await Promise.resolve(originalSsrHandler(req, res));
      return;
    }

    if ((req.headers.accept || "").includes("text/markdown")) {
      res.status(resolved.status).setHeader("Content-Type", "text/markdown; charset=utf-8");
      res.setHeader("Cache-Control", indexable ? "public, s-maxage=300, stale-while-revalidate=3600" : "private, no-store");
      res.send(markdown(resolved.page, resolved.meta));
      return;
    }

    const html = injectDocument(HTML_TEMPLATE, resolved.meta, renderSemanticShell(resolved.page), indexable);
    res.status(resolved.status);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", indexable ? "public, s-maxage=300, stale-while-revalidate=3600" : "private, no-store");
    res.send(html);
  } catch (error) {
    console.error("[semantic-ssr] falling back to stable handler", error);
    res.setHeader("X-AQUAVO-SSR-Fallback", "1");
    res.setHeader("X-AQUAVO-SSR-Mode", "stable-fallback");
    await Promise.resolve(originalSsrHandler(req, res));
  }
}

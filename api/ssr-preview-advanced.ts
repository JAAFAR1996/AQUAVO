import "../server/suppress.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { HTML_TEMPLATE } from "./_html-template.js";
import originalSsrHandler from "./ssr-meta.js";
import { renderSeoPreviewShell, type SeoPreviewPage, type SeoPreviewProduct } from "./_seo-preview-shell.js";
import { buildCollectionStructuredData, buildProductStructuredData } from "./_seo-structured-data.js";

neonConfig.webSocketConstructor = ws;

const BASE = "https://www.aquavoiq.com";
const DEFAULT_IMAGE = `${BASE}/brand/aquavo-v2-horizontal.png`;
const DEFAULT_TITLE = "AQUAVO — مستلزمات أحواض الزينة في العراق";
const DEFAULT_DESCRIPTION = "متجر إلكتروني عراقي متخصص في معدات ومستلزمات أحواض الزينة، مع أدلة اختيار وتوصيل داخل العراق.";

let pool: Pool | null = null;
function getPool(): Pool | null {
  if (!process.env.DATABASE_URL) return null;
  if (!pool) pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return pool;
}

type PreviewMeta = {
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

function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function safeJson(value: object): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function injectDocument(template: string, meta: PreviewMeta, shell: string): string {
  const canonical = `${BASE}${meta.canonicalPath}`;
  const jsonLdItems = !meta.jsonLd ? [] : Array.isArray(meta.jsonLd) ? meta.jsonLd : [meta.jsonLd];
  const jsonLd = jsonLdItems.map((item) => `<script type="application/ld+json">${safeJson(item)}</script>`).join("\n  ");

  let html = template
    .replace(/__META_TITLE__/g, escapeAttribute(meta.title))
    .replace(/__META_DESCRIPTION__/g, escapeAttribute(meta.description))
    .replace(/__META_KEYWORDS__/g, "مستلزمات أحواض الزينة العراق، AQUAVO، فلاتر، سخانات، أغذية")
    .replace(/__META_URL__/g, escapeAttribute(canonical))
    .replace(/__META_IMAGE__/g, escapeAttribute(meta.image || DEFAULT_IMAGE))
    .replace(/__META_OG_TYPE__/g, meta.ogType || "website")
    .replace(/<!--__JSON_LD__-->/g, jsonLd)
    .replace(/__JSON_LD__/g, jsonLd);

  html = html.replace(
    /<meta\b[^>]*\bname=["']robots["'][^>]*>/i,
    '<meta name="robots" content="noindex, nofollow, noarchive, max-image-preview:large">',
  );

  const root = /<div\s+id=["']root["']([^>]*)><\/div>/i;
  if (!root.test(html)) throw new Error("SSR preview root outlet missing");
  return html.replace(root, `<div id="root"$1 data-aq-server-rendered="preview">${shell}</div>`);
}

function firstImage(product: SeoPreviewProduct): string {
  const candidate = product.thumbnail ||
    (Array.isArray(product.images)
      ? product.images.find((item): item is string => typeof item === "string" && item.length > 0)
      : undefined);
  if (!candidate) return DEFAULT_IMAGE;
  if (/^https?:\/\//i.test(candidate)) return candidate;
  return `${BASE}${candidate.startsWith("/") ? "" : "/"}${candidate}`;
}

function plainDescription(product: SeoPreviewProduct): string {
  return (product.description || `معلومات ومواصفات ${product.name} من AQUAVO.`)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
}

async function loadProducts(category?: string): Promise<SeoPreviewProduct[]> {
  const db = getPool();
  if (!db) return [];
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
  return rows as SeoPreviewProduct[];
}

async function loadProduct(slug: string): Promise<SeoPreviewProduct | null> {
  const db = getPool();
  if (!db) return null;
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
  return (rows[0] as SeoPreviewProduct | undefined) || null;
}

function homeSchema(): object[] {
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
  ];
}

function faqSchema(): object {
  const items = [
    ["هل AQUAVO يوصّل لكل العراق؟", "يوفر AQUAVO التوصيل إلى المحافظات المتاحة وفق سياسة الشحن الحالية."],
    ["هل الدفع عند الاستلام متوفر؟", "الدفع عند الاستلام متوفر للطلبات المؤهلة، وتظهر التفاصيل قبل تأكيد الطلب."],
    ["شلون أختار الفلتر المناسب؟", "يعتمد الاختيار على حجم الحوض والحمل الحيوي ونوع وسائط الفلترة والتدفق الفعلي."],
    ["شلون أختار السخان؟", "يعتمد الاختيار على حجم الحوض وفرق الحرارة مع مراقبة ميزان حرارة مستقل."],
  ];
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map(([name, text]) => ({
      "@type": "Question",
      name,
      acceptedAnswer: { "@type": "Answer", text },
    })),
  };
}

function markdown(page: SeoPreviewPage, meta: PreviewMeta): string {
  const lines = [`# ${meta.title}`, "", meta.description, "", `Canonical: ${BASE}${meta.canonicalPath}`, ""];
  if (page.kind === "products" || page.kind === "home") {
    for (const product of page.products) {
      lines.push(`- [${product.name}](${BASE}/products/${encodeURIComponent(product.slug)})`);
    }
  } else if (page.kind === "product") {
    lines.push(`- Price: ${page.product.price ?? "Not published"} ${page.product.currency || "IQD"}`);
    lines.push(`- Availability: ${Number(page.product.stock ?? 0) > 0 ? "In stock" : "Out of stock"}`);
    lines.push(`- Category: ${page.product.category || "Not specified"}`);
  }
  lines.push("", "Preview policy: noindex. Technical validation only.");
  return lines.join("\n");
}

async function resolvePage(pathname: string, category?: string): Promise<{ page: SeoPreviewPage; meta: PreviewMeta; status: number }> {
  if (pathname === "/" || pathname === "/ar") {
    const products = await loadProducts();
    return {
      page: { kind: "home", products },
      meta: { title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION, canonicalPath: "/", jsonLd: homeSchema() },
      status: 200,
    };
  }

  if (pathname === "/products") {
    const products = await loadProducts(category);
    const categorySuffix = category ? ` — ${category}` : "";
    return {
      page: { kind: "products", products },
      meta: {
        title: `مستلزمات أحواض الزينة في العراق${categorySuffix} | AQUAVO`,
        description: category
          ? `تصفح منتجات ${category} المتوفرة من AQUAVO مع السعر والمخزون والمعلومات الأساسية.`
          : "تصفح فلاتر وسخانات وأغذية وإضاءة وديكورات ومعالجات مياه ومستلزمات صيانة أحواض الزينة.",
        canonicalPath: category ? `/products?category=${encodeURIComponent(category)}` : "/products",
        jsonLd: buildCollectionStructuredData(products),
      },
      status: 200,
    };
  }

  const productMatch = pathname.match(/^\/products\/([^/]+)$/);
  if (productMatch) {
    const slug = decodeURIComponent(productMatch[1]);
    const product = await loadProduct(slug);
    if (!product) {
      return {
        page: { kind: "not-found", path: pathname },
        meta: { title: "المنتج غير موجود | AQUAVO", description: "المنتج المطلوب غير موجود أو لم يعد متاحاً.", canonicalPath: pathname },
        status: 404,
      };
    }
    const all = await loadProducts();
    const related = all.filter((item) => item.slug !== product.slug && item.category === product.category);
    return {
      page: { kind: "product", product, related },
      meta: {
        title: `${product.name}${product.brand ? ` - ${product.brand}` : ""} | AQUAVO`,
        description: plainDescription(product),
        canonicalPath: `/products/${encodeURIComponent(product.slug)}`,
        image: firstImage(product),
        ogType: "product",
        jsonLd: buildProductStructuredData(product),
      },
      status: 200,
    };
  }

  if (pathname === "/faq") {
    return {
      page: { kind: "faq" },
      meta: {
        title: "الأسئلة الشائعة عن AQUAVO وأحواض الزينة",
        description: "إجابات عن التوصيل والدفع واختيار الفلتر والسخان ومخزون المنتجات.",
        canonicalPath: "/faq",
        jsonLd: faqSchema(),
      },
      status: 200,
    };
  }

  if (pathname === "/about" || pathname === "/about-aquavo") {
    return {
      page: { kind: "about" },
      meta: {
        title: "عن AQUAVO — متجر أحواض الزينة في العراق",
        description: "تعرف على AQUAVO، علامة عراقية ومتجر إلكتروني متخصص في معدات ومستلزمات أحواض الزينة.",
        canonicalPath: "/about",
        jsonLd: homeSchema()[0],
      },
      status: 200,
    };
  }

  const copy = STATIC_COPY[pathname];
  if (copy) {
    return {
      page: { kind: "static", heading: copy.heading, summary: copy.summary, path: pathname },
      meta: { title: `${copy.heading} | AQUAVO`, description: copy.summary, canonicalPath: pathname },
      status: 200,
    };
  }

  return {
    page: { kind: "not-found", path: pathname },
    meta: { title: "الصفحة غير موجودة | AQUAVO", description: "الصفحة المطلوبة غير موجودة أو تم نقلها.", canonicalPath: pathname },
    status: 404,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const requestUrl = new URL(req.url || "/", BASE);
  const pathname = requestUrl.pathname.replace(/\/+$/, "") || "/";

  if (pathname === "/guides" || pathname.startsWith("/guides/")) {
    res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
    return originalSsrHandler(req, res);
  }

  try {
    if (/\.(js|css|png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|json|xml|txt|map|gz|br)$/i.test(pathname)) {
      return res.status(404).end();
    }

    const category = requestUrl.searchParams.get("category")?.trim() || undefined;
    const { page, meta, status } = await resolvePage(pathname, category);
    const accept = String(req.headers.accept || "").toLowerCase();

    res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
    res.setHeader("Cache-Control", "private, no-store, max-age=0");
    res.setHeader("Vary", "Accept");

    if (accept.includes("text/markdown")) {
      res.setHeader("Content-Type", "text/markdown; charset=utf-8");
      return res.status(status).send(markdown(page, meta));
    }

    const html = injectDocument(HTML_TEMPLATE, meta, renderSeoPreviewShell(page));
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(status).send(html);
  } catch (error) {
    console.error("[SEO Preview Advanced] rendering failed", error);
    res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(500).send(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>${DEFAULT_TITLE}</title></head><body><h1>تعذر تحميل نسخة المعاينة</h1><p>لم يتم تغيير موقع الإنتاج.</p></body></html>`);
  }
}

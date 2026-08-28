import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  AQUAVO_ENTITY,
  categoryProductsPath,
  canonicalProductCategory,
} from "../shared/seo-contract.js";
import { AQUAVO_FAQ_PAIRS } from "../shared/faq-content.js";
import { articleReadTime, cloudinaryHeroUrl, renderArticleBodyHtml } from "./_blog-article.js";
// _seo-structured-data imports only *types* from this module, so this value
// import does not create a runtime cycle.
import { primaryProductImage, productGalleryImages } from "./_seo-structured-data.js";
import { displayAuthorName } from "../shared/author-name.js";

export type SeoPreviewVariant = {
  id?: string;
  label?: string;
  price?: string | number | null;
  originalPrice?: string | number | null;
  stock?: string | number | null;
  sku?: string | null;
  image?: string | null;
};

export type SeoPreviewProduct = {
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
  variants?: SeoPreviewVariant[] | null;
  rating?: string | number | null;
  reviewCount?: string | number | null;
};

export type SeoPreviewBlogPost = {
  slug: string;
  title: string;
  excerpt?: string | null;
  content?: string | null;
  category?: string | null;
  author?: string | null;
  readTime?: string | null;
  imageUrl?: string | null;
  publishedAt?: string | Date | null;
  updatedAt?: string | Date | null;
};

/**
 * One approved review, as the crawler-visible product page shows it.
 *
 * Deliberately only these five fields: no user id, no IP address, no
 * moderation status. What is not loaded cannot be rendered by mistake.
 */
export type SeoPreviewReview = {
  rating?: string | number | null;
  title?: string | null;
  comment?: string | null;
  author?: string | null;
  createdAt?: string | Date | null;
};

export type SeoPreviewPage =
  | { kind: "home"; products: SeoPreviewProduct[] }
  | { kind: "products"; products: SeoPreviewProduct[]; category?: string }
  | { kind: "product"; product: SeoPreviewProduct; related: SeoPreviewProduct[]; reviews?: SeoPreviewReview[] }
  | { kind: "faq" }
  | { kind: "about" }
  | { kind: "fish-encyclopedia"; species: SeoPreviewFish[]; heading: string; summary: string }
  | { kind: "deals"; products: SeoPreviewProduct[]; heading: string; summary: string }
  | { kind: "static"; heading: string; summary: string; path: string; paragraphs?: string[]; prerendered?: string }
  | { kind: "blog-index"; posts: SeoPreviewBlogPost[]; heading: string; summary: string }
  | { kind: "blog-post"; post: SeoPreviewBlogPost; related: SeoPreviewBlogPost[] }
  | { kind: "not-found"; path: string };

/**
 * The FAQ a crawler is shown — now the same one a customer is shown.
 *
 * This used to be its own six-question list, separate from the eleven in
 * `client/src/pages/faq.tsx`, so `/faq` answered different questions depending
 * on who asked and each side's FAQPage schema described content the other
 * never rendered. Both now read `shared/faq-content.ts`.
 */
export const SEO_FAQ_ITEMS = AQUAVO_FAQ_PAIRS;

function numberValue(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export function getActiveVariants(product: SeoPreviewProduct): SeoPreviewVariant[] {
  if (!product.hasVariants || !Array.isArray(product.variants)) return [];
  return product.variants.filter((variant) => {
    const price = numberValue(variant.price);
    return Boolean(variant.label) && price !== null && price > 0;
  });
}

function priceRange(product: SeoPreviewProduct): { min: number; max: number } | null {
  const variantPrices = getActiveVariants(product)
    .map((variant) => numberValue(variant.price))
    .filter((value): value is number => value !== null);
  const basePrice = numberValue(product.price);
  const prices = variantPrices.length > 0 ? variantPrices : basePrice !== null ? [basePrice] : [];
  if (prices.length === 0) return null;
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

export function formatMoney(value: number, currency = "IQD"): string {
  if (currency === "IQD") return `${new Intl.NumberFormat("ar-IQ").format(value)} د.ع`;
  return `${new Intl.NumberFormat("ar-IQ").format(value)} ${currency}`;
}

export function formatPrice(product: SeoPreviewProduct): string {
  const range = priceRange(product);
  if (!range) return "السعر غير منشور حالياً";
  if (range.min !== range.max) {
    return `من ${formatMoney(range.min, product.currency || "IQD")} إلى ${formatMoney(range.max, product.currency || "IQD")}`;
  }
  return formatMoney(range.min, product.currency || "IQD");
}

export function isInStock(product: SeoPreviewProduct): boolean {
  const variants = getActiveVariants(product);
  if (variants.length > 0) return variants.some((variant) => (numberValue(variant.stock) ?? 0) > 0);
  return (numberValue(product.stock) ?? 0) > 0;
}

export function cleanText(value: string | null | undefined, fallback: string): string {
  const text = (value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return text || fallback;
}

export function deriveProductCategories(products: SeoPreviewProduct[]): Array<{ name: string; count: number }> {
  const counts = new Map<string, number>();
  for (const product of products) {
    const name = canonicalProductCategory(product.category);
    if (!name) continue;
    counts.set(name, (counts.get(name) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ar"));
}

/**
 * A product listing, each entry with the photograph that belongs to it.
 *
 * This rendered names, prices and stock but no pictures at all, so the two
 * pages that list the whole catalogue showed a crawler none of it:
 *
 *   $ curl -A Googlebot https://www.aquavoiq.com/ | grep -c '<img'
 *   0
 *   $ curl -A Googlebot https://www.aquavoiq.com/products | grep -c '<img'
 *   0
 *
 * Every thumbnail below is the same image the product's own page leads with
 * and the same one the image sitemap already declares — this shows what is
 * already published, it does not add anything new.
 *
 * All of them are lazy. #seo-root is display:none for JS visitors and is
 * removed once React commits, so a lazy image inside it never intersects a
 * viewport and is never fetched: a real browser pays nothing for any of this.
 * A product with no photograph of its own renders no <img> rather than
 * presenting the AQUAVO logo as if it were the product.
 */
function ProductLinks({ products, limit }: { products: SeoPreviewProduct[]; limit?: number }) {
  const visible = typeof limit === "number" ? products.slice(0, limit) : products;
  return (
    <ul className="aq-ssr-products" aria-label="روابط المنتجات">
      {visible.map((product) => {
        const image = primaryProductImage(product);
        const thumbnail = image ? cloudinaryHeroUrl(image, 320) : null;
        return (
          <li key={product.slug}>
            <a href={`/products/${encodeURIComponent(product.slug)}`}>
              {thumbnail && (
                <img
                  className="aq-ssr-product-thumb"
                  src={thumbnail}
                  alt={product.name}
                  width={320}
                  height={320}
                  loading="lazy"
                  decoding="async"
                />
              )}
              <strong>{product.name}</strong>
              <span>{formatPrice(product)}</span>
              <small>{isInStock(product) ? "متوفر" : "غير متوفر حالياً"}</small>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

function SiteHeader() {
  return (
    <header className="aq-ssr-header">
      <a className="aq-ssr-brand" href="/" aria-label="AQUAVO الرئيسية">AQUAVO</a>
      <nav aria-label="التنقل الرئيسي">
        <a href="/products">المنتجات</a>
        <a href="/guides">الأدلة</a>
        {/*
          Nothing on the site linked to /blog — not this nav, not this footer,
          not the client header or footer. All 81 posts and the index itself sat
          at infinite click-depth from the homepage, discoverable only through
          sitemap-blog.xml, which carries no internal link equity. This nav
          renders on every crawled page, so one entry here puts /blog at depth 1
          and every post at depth 2.
        */}
        <a href="/blog">المدونة</a>
        <a href="/faq">الأسئلة الشائعة</a>
        <a href="/about">عن AQUAVO</a>
        <a href="/contact">تواصل معنا</a>
      </nav>
    </header>
  );
}

/**
 * The indexable pages that nothing on the crawled site linked to.
 *
 * /blog was not the only orphan, just the largest. Crawling the bot-rendered
 * link graph outward from the homepage reaches 11 of the 26 entries in
 * sitemap-pages.xml; the 15 below were reachable only through the sitemap,
 * which carries no internal link equity. Each answers 200, is served
 * `index, follow`, and renders its own H1 — these are live pages with no
 * inbound link, not drafts or dead routes.
 *
 * /deals and /journey are the sharper half. client/src/components/footer.tsx
 * has linked both for a while, so the browser and the crawler disagreed about
 * what the site contains — the same divergence the /blog entry in SiteHeader
 * fixed, still open for these two.
 *
 * Each label is the page's own STATIC_COPY heading from _ssr-preview-source.ts,
 * copied verbatim, which is the H1 that page already renders. That file imports
 * this one, so importing the headings back would close a runtime cycle; instead
 * seo-footer-orphan-links.test.ts pins every label to its heading, so the two
 * cannot drift apart and an anchor here cannot come to describe a page as
 * something it is not.
 */
export const FOOTER_EXPLORE_LINKS: ReadonlyArray<{ href: string; label: string }> = [
  { href: "/deals", label: "عروض AQUAVO" },
  { href: "/journey", label: "رحلة بناء حوضك" },
  { href: "/beginner-guide", label: "دليل المبتدئ لأحواض الزينة" },
  { href: "/why-aquavo", label: "ليش تختار AQUAVO؟" },
  { href: "/calculators", label: "حاسبات أحواض الزينة" },
  { href: "/aquarium-wizard", label: "مساعد تجهيز الحوض" },
  { href: "/tank-builder", label: "مخطط تجهيز الحوض" },
  { href: "/fish-encyclopedia", label: "موسوعة أسماك الزينة" },
  { href: "/fish-finder", label: "مساعد اختيار أسماك الزينة" },
  { href: "/fish-compatibility", label: "توافق أسماك الزينة" },
  { href: "/fish-health", label: "صحة أسماك الزينة" },
  { href: "/fish-health-diagnosis", label: "مساعد تنظيم أعراض الأسماك" },
  { href: "/fish-breeding-calculator", label: "حاسبة تفريخ أسماك الزينة" },
  { href: "/sustainability", label: "الاستدامة في أحواض الزينة" },
  { href: "/community-gallery", label: "مجتمع أحواض الزينة" },
];

function SiteFooter() {
  return (
    <footer className="aq-ssr-footer">
      <p>AQUAVO — متجر إلكتروني عراقي متخصص في معدات ومستلزمات أحواض الزينة.</p>
      <nav aria-label="استكشف AQUAVO">
        {FOOTER_EXPLORE_LINKS.map(({ href, label }) => (
          <a key={href} href={href}>{label}</a>
        ))}
      </nav>
      <nav aria-label="روابط مهمة">
        <a href="/shipping">الشحن</a>
        <a href="/return-policy">الاسترجاع</a>
        <a href="/privacy-policy">الخصوصية</a>
        <a href="/terms">الشروط</a>
      </nav>
    </footer>
  );
}

function Categories({ products }: { products: SeoPreviewProduct[] }) {
  const categories = deriveProductCategories(products);
  if (categories.length === 0) return null;
  return (
    <ul className="aq-ssr-categories" aria-label="فئات المنتجات">
      {categories.map(({ name, count }) => (
        <li key={name}>
          <a href={categoryProductsPath(name)}>{name} <span aria-label={`${count} منتج`}>({count})</span></a>
        </li>
      ))}
    </ul>
  );
}

function HomePage({ products }: { products: SeoPreviewProduct[] }) {
  return (
    <main id="main-content">
      <section className="aq-ssr-hero">
        <p className="aq-ssr-kicker">متجر معدات أحواض أونلاين في العراق</p>
        <h1>مستلزمات أحواض الزينة مع اختيار أوضح ودعم محلي</h1>
        <p>فلاتر، سخانات، أغذية، إضاءة، ديكورات ومعالجات مياه. التوصيل لكل العراق خلال 24 ساعة بأجور 5,000 د.ع، والدفع عند الاستلام أو إلكترونياً، والدعم متوفر 24/7.</p>
        <div className="aq-ssr-actions"><a href="/products">تصفح المنتجات</a><a href="/guides">اقرأ الأدلة</a></div>
      </section>
      <section aria-labelledby="aq-categories-title">
        <h2 id="aq-categories-title">تصفح حسب الفئة</h2>
        <Categories products={products} />
      </section>
      <section aria-labelledby="aq-featured-title">
        <h2 id="aq-featured-title">منتجات من المتجر</h2>
        <ProductLinks products={products} limit={18} />
        <p><a href="/products">عرض جميع المنتجات</a></p>
      </section>
      <section aria-labelledby="aq-answer-title" className="aq-ssr-answer">
        <h2 id="aq-answer-title">شنو تختار لحوضك؟</h2>
        <p>اختيار المعدات يبدأ من حجم الحوض ونوع الأسماك والحمل الحيوي، مو من السعر وحده. أدلة AQUAVO تشرح المقارنة بين الفلاتر والسخانات ووسائط الفلترة قبل الطلب.</p>
        <a href="/guides/new-aquarium-setup-iraq">دليل تجهيز حوض جديد في العراق</a>
      </section>
    </main>
  );
}

function ProductsPage({ products, category }: { products: SeoPreviewProduct[]; category?: string }) {
  const heading = category ? `منتجات ${category}` : "جميع مستلزمات أحواض الزينة في العراق";
  return (
    <main id="main-content">
      <nav className="aq-ssr-breadcrumb" aria-label="مسار الصفحة"><a href="/">الرئيسية</a><span>/</span><a href="/products">المنتجات</a>{category && <><span>/</span><span>{category}</span></>}</nav>
      <h1>{heading}</h1>
      <p>{category ? `المنتجات المسجلة ضمن فئة ${category} مع السعر والمخزون وروابط مباشرة.` : "تصفح منتجات AQUAVO حسب الفئة، ثم افتح صفحة المنتج للاطلاع على السعر والمخزون والمواصفات المتوفرة."}</p>
      {!category && <Categories products={products} />}
      <section aria-labelledby="aq-all-products-title">
        <h2 id="aq-all-products-title">قائمة المنتجات</h2>
        {products.length > 0 ? <ProductLinks products={products} /> : <p>لا توجد منتجات منشورة ضمن هذه الفئة حالياً.</p>}
      </section>
    </main>
  );
}

function ProductPage({ product, related, reviews = [] }: { product: SeoPreviewProduct; related: SeoPreviewProduct[]; reviews?: SeoPreviewReview[] }) {
  const description = cleanText(product.description, `معلومات ومواصفات ${product.name} من AQUAVO.`);
  const variants = getActiveVariants(product);
  const category = canonicalProductCategory(product.category);
  // Every photograph the product has, in the order the Product schema claims
  // them, right-sized by Cloudinary when the asset lives there and rendered
  // with object-fit:contain so no photo is cropped and no box reflows.
  //
  // The hero is eager because it is the LCP candidate; everything after it is
  // lazy. #seo-root is display:none for JS visitors and is removed once React
  // commits, so a lazy image inside it never intersects a viewport and is never
  // fetched — the rest of the gallery costs a real browser nothing.
  const gallery = productGalleryImages(product).map((url) => cloudinaryHeroUrl(url, 1000));
  const [heroImage, ...restImages] = gallery;
  return (
    <main id="main-content">
      {/* Mirrors the BreadcrumbList in the structured data, category step
          included, so the visible trail and the schema tell the same story. */}
      <nav className="aq-ssr-breadcrumb" aria-label="مسار الصفحة">
        <a href="/">الرئيسية</a><span>/</span><a href="/products">المنتجات</a><span>/</span>
        {category && <><a href={categoryProductsPath(category)}>{category}</a><span>/</span></>}
        <span>{product.name}</span>
      </nav>
      <article itemScope itemType="https://schema.org/Product">
        <p className="aq-ssr-kicker">{product.brand || "AQUAVO"}</p>
        <h1 itemProp="name">{product.name}</h1>
        {heroImage && (
          <img
            className="aq-ssr-product-image"
            src={heroImage}
            alt={product.name}
            width={1000}
            height={1000}
            loading="eager"
            decoding="async"
            itemProp="image"
          />
        )}
        {restImages.length > 0 && (
          <div className="aq-ssr-product-gallery">
            {restImages.map((src, index) => (
              <img
                key={src}
                className="aq-ssr-product-image"
                src={src}
                alt={`${product.name} — صورة ${index + 2}`}
                width={1000}
                height={1000}
                loading="lazy"
                decoding="async"
                itemProp="image"
              />
            ))}
          </div>
        )}
        <p itemProp="description">{description}</p>
        <dl className="aq-ssr-facts">
          <div><dt>السعر</dt><dd>{formatPrice(product)}</dd></div>
          <div><dt>حالة المخزون</dt><dd>{isInStock(product) ? "متوفر" : "غير متوفر حالياً"}</dd></div>
          {category && <div><dt>الفئة</dt><dd><a href={categoryProductsPath(category)}>{category}</a></dd></div>}
          {product.brand && <div><dt>العلامة</dt><dd itemProp="brand">{product.brand}</dd></div>}
        </dl>
        {variants.length > 0 && (
          <section aria-labelledby="aq-variant-title">
            <h2 id="aq-variant-title">الخيارات المسجلة</h2>
            <p>اختيار المقاس أو النوع يتم داخل صفحة المنتج. الأسعار أدناه تعكس البيانات المسجلة لكل خيار.</p>
            <ul className="aq-ssr-variants">
              {variants.map((variant, index) => (
                <li key={variant.id || `${variant.label}-${index}`}>
                  <strong>{variant.label}</strong>
                  <span>{formatMoney(numberValue(variant.price) || 0, product.currency || "IQD")}</span>
                  <small>{(numberValue(variant.stock) ?? 0) > 0 ? "متوفر" : "غير متوفر حالياً"}</small>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
      {reviews.length > 0 && (
        // The reviews behind this product's aggregateRating. A rating shown to
        // a crawler with no review on the page is a review snippet Google is
        // entitled to distrust; these are the real, approved ones.
        <section className="aq-ssr-reviews" aria-labelledby="aq-reviews-title">
          <h2 id="aq-reviews-title">آراء الزبائن</h2>
          <ul className="aq-ssr-review-list">
            {reviews.map((review, index) => {
              const rating = numberValue(review.rating);
              const written = articleDate(review.createdAt);
              return (
                <li key={`${review.author ?? "review"}-${index}`} className="aq-ssr-review">
                  <p className="aq-ssr-review-meta">
                    <strong>{review.author || "عميل"}</strong>
                    {rating !== null && <span> · {rating} من 5</span>}
                    {written && <><span> · </span><time dateTime={written}>{written}</time></>}
                  </p>
                  {review.title && <p><strong>{review.title}</strong></p>}
                  <p>{review.comment}</p>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {related.length > 0 && (
        <section aria-labelledby="aq-related-title">
          <h2 id="aq-related-title">منتجات مرتبطة</h2>
          <ProductLinks products={related} limit={6} />
        </section>
      )}
    </main>
  );
}

function FaqPage() {
  return (
    <main id="main-content">
      <h1>الأسئلة الشائعة عن AQUAVO وأحواض الزينة</h1>
      <p>إجابات مختصرة ومباشرة عن التوصيل والدفع والدعم واختيار المعدات.</p>
      <section className="aq-ssr-faq" aria-label="الأسئلة الشائعة">
        {SEO_FAQ_ITEMS.map(([question, answer]) => (
          <details key={question}><summary>{question}</summary><p>{answer}</p></details>
        ))}
      </section>
    </main>
  );
}

function AboutPage() {
  return (
    <main id="main-content">
      <h1>عن AQUAVO</h1>
      <p>AQUAVO، المشغّل قانونياً باسم {AQUAVO_ENTITY.legalName}، متجر إلكتروني عراقي متخصص في معدات ومستلزمات أحواض الزينة.</p>
      <p>العمل بالكامل عبر الموقع وواتساب، ولا يوجد محل لاستقبال الزبائن حالياً. AQUAVO لا يبيع أسماكاً أو كائنات أو نباتات حية.</p>
      <p>التوصيل لكل العراق خلال 24 ساعة بأجور 5,000 د.ع، والدفع عند الاستلام أو إلكترونياً، والدعم متوفر 24/7.</p>
      <p><a href="/products">تصفح المنتجات</a> · <a href="/contact">تواصل معنا</a></p>
    </main>
  );
}

function StaticPage({ heading, summary, paragraphs = [], prerendered }: { heading: string; summary: string; path: string; paragraphs?: string[]; prerendered?: string }) {
  return (
    <main id="main-content">
      <nav className="aq-ssr-breadcrumb" aria-label="مسار الصفحة"><a href="/">الرئيسية</a><span>/</span><span>{heading}</span></nav>
      <h1>{heading}</h1>
      <p>{summary}</p>
      {paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      {/* The real page, rendered from its own component at build time. Appended
          rather than substituted: the heading, summary and paragraphs above are
          the only place some business facts are published to a crawler (the
          /fish-finder disclaimer that no live fish are sold, for one), so
          nothing here removes them. See script/prerender-static-pages.ts. */}
      {prerendered && <div className="aq-ssr-page" dangerouslySetInnerHTML={{ __html: prerendered }} />}
      <p><a href="/products">تصفح المنتجات</a> · <a href="/faq">الأسئلة الشائعة</a></p>
    </main>
  );
}


/**
 * The species list a crawler receives, built from the fish_species rows the
 * resolver read. Every value printed is a column: nothing is computed,
 * translated or asserted about a species beyond what the table holds, and the
 * count comes from the array rather than a written number.
 *
 * AQUAVO does not sell live animals, so this deliberately reads as a reference
 * list — no price, availability or purchase language anywhere.
 */
function FishEncyclopediaPage({ species, heading, summary }: { species: SeoPreviewFish[]; heading: string; summary: string }) {
  return (
    <main id="main-content">
      <nav className="aq-ssr-breadcrumb" aria-label="مسار الصفحة"><a href="/">الرئيسية</a><span>/</span><span>{heading}</span></nav>
      <h1>{heading}</h1>
      <p>{summary}</p>
      <p>تضم الموسوعة {species.length} نوعاً موثقاً من أسماك الزينة. AQUAVO متجر معدات ومستلزمات أحواض ولا يبيع أسماكاً أو كائنات حية؛ هذه الصفحة مرجع تعليمي للعناية والتوافق قبل التجهيز.</p>
      <section aria-labelledby="aq-fish-list-title">
        <h2 id="aq-fish-list-title">الأنواع الموثقة</h2>
        {species.map((fish) => (
          <article key={fish.id}>
            <h3>{fish.arabicName} — {fish.commonName}</h3>
            <p><em>{fish.scientificName}</em>{fish.family ? ` · ${fish.family}` : ""}{fish.origin ? ` · ${fish.origin}` : ""}</p>
            {typeof fish.minTankSize === "number" && fish.minTankSize > 0 && (
              <p>أقل حجم حوض مناسب: {fish.minTankSize} لتر.</p>
            )}
            <p>{fish.description}</p>
          </article>
        ))}
      </section>
      <p><a href="/fish-compatibility">توافق أسماك الزينة</a> · <a href="/products">معدات ومستلزمات الأحواض</a></p>
    </main>
  );
}


/**
 * The discounted products, rendered from the rows the resolver read. Both the
 * current and the original price come straight from the row, and the count is
 * the array length, so the page cannot advertise an offer the database does not
 * have.
 */
function DealsPage({ products, heading, summary }: { products: SeoPreviewProduct[]; heading: string; summary: string }) {
  return (
    <main id="main-content">
      <nav className="aq-ssr-breadcrumb" aria-label="مسار الصفحة"><a href="/">الرئيسية</a><span>/</span><span>{heading}</span></nav>
      <h1>{heading}</h1>
      <p>{summary}</p>
      <p>{products.length} منتج عليه تخفيض حالياً حسب المخزون المسجل.</p>
      <section aria-labelledby="aq-deals-list-title">
        <h2 id="aq-deals-list-title">المنتجات المخفّضة</h2>
        <ul className="aq-ssr-products" aria-label="روابط العروض">
          {products.map((product) => (
            <li key={product.slug}>
              <a href={`/products/${encodeURIComponent(product.slug)}`}>{product.name}</a>
              {" — "}
              <span>{formatMoney(Number(product.price), product.currency ?? "IQD")}</span>
              {product.originalPrice != null && (
                <> <s>{formatMoney(Number(product.originalPrice), product.currency ?? "IQD")}</s></>
              )}
              <p>{cleanText(product.description, `${product.name} من AQUAVO.`)}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function BlogIndexPage({ posts, heading, summary }: { posts: SeoPreviewBlogPost[]; heading: string; summary: string }) {
  return (
    <main id="main-content">
      <nav className="aq-ssr-breadcrumb" aria-label="مسار الصفحة">
        <a href="/">الرئيسية</a><span>/</span><span>المدونة</span>
      </nav>
      <div className="aq-ssr-hero">
        <h1>{heading}</h1>
        <p>{summary}</p>
      </div>
      {posts.length > 0 && (
        <section aria-labelledby="aq-blog-list-title">
          <h2 id="aq-blog-list-title">كل المقالات</h2>
          <BlogLinks posts={posts} />
        </section>
      )}
    </main>
  );
}

function BlogLinks({ posts }: { posts: SeoPreviewBlogPost[] }) {
  return (
    <ul className="aq-ssr-products">
      {posts.map((post) => (
        <li key={post.slug}>
          <a href={`/blog/${encodeURIComponent(post.slug)}`}>
            <strong>{post.title}</strong>
            {post.excerpt && <span>{post.excerpt}</span>}
          </a>
        </li>
      ))}
    </ul>
  );
}

function articleDate(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function BlogPostPage({ post, related }: { post: SeoPreviewBlogPost; related: SeoPreviewBlogPost[] }) {
  // The stored article HTML is sanitized and its headings demoted, so the post
  // title below stays the only <h1> on the page.
  const body = renderArticleBodyHtml(post.content);
  const published = articleDate(post.publishedAt);
  const updated = articleDate(post.updatedAt);
  const hero = post.imageUrl ? cloudinaryHeroUrl(post.imageUrl, 1200) : null;
  const readTime = articleReadTime(post.content);
  return (
    <main id="main-content">
      <nav className="aq-ssr-breadcrumb" aria-label="مسار الصفحة">
        <a href="/">الرئيسية</a><span>/</span><a href="/blog">المدونة</a><span>/</span><span>{post.title}</span>
      </nav>
      <article itemScope itemType="https://schema.org/Article">
        {post.category && <p className="aq-ssr-kicker">{post.category}</p>}
        <h1 itemProp="headline">{post.title}</h1>
        {post.excerpt && <p itemProp="description">{post.excerpt}</p>}
        <p className="aq-ssr-meta">
          {post.author && <span itemProp="author">{displayAuthorName(post.author)}</span>}
          {published && <><span> · </span><time itemProp="datePublished" dateTime={published}>{published}</time></>}
          {updated && updated !== published && (
            <><span> · تحديث </span><time itemProp="dateModified" dateTime={updated}>{updated}</time></>
          )}
          {/* Derived from the article, not from blog_posts.read_time, which
              overstates every post in the catalogue. See articleReadTime. */}
          {readTime && <span> · {readTime}</span>}
        </p>
        {hero && (
          <img
            className="aq-ssr-hero-image"
            src={hero}
            alt={post.title}
            width={1200}
            height={630}
            loading="eager"
            decoding="async"
            itemProp="image"
          />
        )}
        <div className="aq-ssr-article" itemProp="articleBody" dangerouslySetInnerHTML={{ __html: body }} />
      </article>
      <section aria-labelledby="aq-blog-more-title">
        <h2 id="aq-blog-more-title">مقالات أخرى</h2>
        {related.length > 0
          ? <BlogLinks posts={related} />
          : <p><a href="/blog">تصفح كل مقالات مدونة AQUAVO</a></p>}
      </section>
    </main>
  );
}

function NotFoundPage() {
  return (
    <main id="main-content">
      <h1>الصفحة غير موجودة</h1>
      <p>الرابط المطلوب غير متوفر أو تم نقله.</p>
      <p><a href="/">العودة إلى الرئيسية</a> · <a href="/products">تصفح المنتجات</a></p>
    </main>
  );
}

function SeoPreviewShell({ page }: { page: SeoPreviewPage }) {
  return (
    <div className="aq-ssr-shell" data-aq-semantic-shell="true">
      <style>{`
        .aq-ssr-shell{min-height:100vh;background:#0B1E28;color:#f7fbfc;font-family:Cairo,Tahoma,sans-serif;line-height:1.75;padding:0 5vw 3rem}
        .aq-ssr-shell *{box-sizing:border-box}.aq-ssr-shell a{color:#67d7e5;text-decoration:none}.aq-ssr-shell a:hover{text-decoration:underline}
        .aq-ssr-header,.aq-ssr-footer{display:flex;gap:1.25rem;align-items:center;justify-content:space-between;padding:1.25rem 0;border-bottom:1px solid rgba(255,255,255,.14)}
        .aq-ssr-header nav,.aq-ssr-footer nav{display:flex;gap:1rem;flex-wrap:wrap}.aq-ssr-brand{font:700 1.25rem Inter,sans-serif;letter-spacing:.08em}
        .aq-ssr-shell main{max-width:1180px;width:100%;margin:0 auto;padding:3rem 0}.aq-ssr-shell h1{font-size:clamp(2rem,5vw,4.25rem);line-height:1.18;max-width:900px}.aq-ssr-shell h2{margin-top:3rem;font-size:clamp(1.35rem,3vw,2rem)}
        .aq-ssr-hero{padding:2.5rem 0 1rem}.aq-ssr-kicker{color:#67d7e5;font-weight:700}.aq-ssr-actions{display:flex;gap:1rem;flex-wrap:wrap;margin-top:1.5rem}.aq-ssr-actions a{border:1px solid #0B93A6;padding:.7rem 1rem;border-radius:.45rem}
        .aq-ssr-categories{display:flex;gap:.65rem;flex-wrap:wrap;list-style:none;padding:0}.aq-ssr-categories a{display:block;border:1px solid rgba(255,255,255,.18);padding:.55rem .85rem;border-radius:999px}
        .aq-ssr-products{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:.85rem;list-style:none;padding:0}.aq-ssr-products a{display:grid;gap:.35rem;height:100%;padding:1rem;border:1px solid rgba(255,255,255,.14);border-radius:.6rem;background:rgba(255,255,255,.035)}
        .aq-ssr-products span,.aq-ssr-products small{color:#d9e6e9}.aq-ssr-answer,.aq-ssr-facts,.aq-ssr-faq details{border:1px solid rgba(255,255,255,.14);border-radius:.6rem;padding:1rem;background:rgba(255,255,255,.035)}
        .aq-ssr-facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1rem}.aq-ssr-facts div{display:grid;gap:.2rem}.aq-ssr-facts dt{color:#9fc5cc}.aq-ssr-facts dd{margin:0;font-weight:700}
        .aq-ssr-variants{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:.75rem;list-style:none;padding:0}.aq-ssr-variants li{display:grid;gap:.25rem;border:1px solid rgba(255,255,255,.14);border-radius:.6rem;padding:.8rem;background:rgba(255,255,255,.035)}
        .aq-ssr-faq{display:grid;gap:.8rem}.aq-ssr-faq summary{cursor:pointer;font-weight:700}.aq-ssr-breadcrumb{display:flex;gap:.5rem;flex-wrap:wrap;color:#b9ccd1;margin-bottom:1.5rem}.aq-ssr-footer{border-top:1px solid rgba(255,255,255,.14);border-bottom:0;max-width:1180px;margin:0 auto}
        .aq-ssr-meta{color:#9fc5cc;font-size:.95rem}.aq-ssr-hero-image{display:block;width:100%;height:auto;aspect-ratio:1200/630;object-fit:cover;border-radius:.6rem;margin:1.5rem 0;border:1px solid rgba(255,255,255,.14)}
        .aq-ssr-product-image{display:block;width:100%;max-width:520px;height:auto;aspect-ratio:1/1;object-fit:contain;border-radius:.6rem;margin:1.5rem 0;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.035)}
        .aq-ssr-product-thumb{display:block;width:100%;max-width:120px;height:auto;aspect-ratio:1/1;object-fit:contain;border-radius:.5rem;background:rgba(255,255,255,.035);margin-bottom:.5rem}
        .aq-ssr-product-gallery{display:flex;flex-wrap:wrap;gap:1rem}
        .aq-ssr-product-gallery .aq-ssr-product-image{max-width:240px;margin:0}
        .aq-ssr-review-list{display:grid;gap:.8rem;list-style:none;padding:0}.aq-ssr-review{border:1px solid rgba(255,255,255,.14);border-radius:.6rem;padding:1rem;background:rgba(255,255,255,.035)}.aq-ssr-review p{margin:.25rem 0}.aq-ssr-review-meta{color:#9fc5cc;font-size:.95rem}
        .aq-ssr-article{max-width:820px}.aq-ssr-article img{max-width:100%;height:auto}.aq-ssr-article h2{margin-top:2.25rem}.aq-ssr-article h3{margin-top:1.75rem;font-size:1.15rem}.aq-ssr-article ul,.aq-ssr-article ol{padding-inline-start:1.4rem}
        @media(max-width:720px){.aq-ssr-header,.aq-ssr-footer{align-items:flex-start;flex-direction:column}.aq-ssr-shell{padding-inline:1.1rem}.aq-ssr-shell main{padding-top:2rem}}
      `}</style>
      <SiteHeader />
      {page.kind === "home" && <HomePage products={page.products} />}
      {page.kind === "products" && <ProductsPage products={page.products} category={page.category} />}
      {page.kind === "product" && <ProductPage product={page.product} related={page.related} reviews={page.reviews} />}
      {page.kind === "faq" && <FaqPage />}
      {page.kind === "about" && <AboutPage />}
      {page.kind === "static" && <StaticPage heading={page.heading} summary={page.summary} path={page.path} paragraphs={page.paragraphs} prerendered={page.prerendered} />}
      {page.kind === "fish-encyclopedia" && <FishEncyclopediaPage species={page.species} heading={page.heading} summary={page.summary} />}
      {page.kind === "deals" && <DealsPage products={page.products} heading={page.heading} summary={page.summary} />}
      {page.kind === "blog-index" && <BlogIndexPage posts={page.posts} heading={page.heading} summary={page.summary} />}
      {page.kind === "blog-post" && <BlogPostPage post={page.post} related={page.related} />}
      {page.kind === "not-found" && <NotFoundPage />}
      <SiteFooter />
    </div>
  );
}

export function renderSeoPreviewShell(page: SeoPreviewPage): string {
  return renderToStaticMarkup(<SeoPreviewShell page={page} />);
}

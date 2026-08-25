import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  AQUAVO_ENTITY,
  categoryProductsPath,
  canonicalProductCategory,
} from "../shared/seo-contract.js";

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

export type SeoPreviewPage =
  | { kind: "home"; products: SeoPreviewProduct[] }
  | { kind: "products"; products: SeoPreviewProduct[]; category?: string }
  | { kind: "product"; product: SeoPreviewProduct; related: SeoPreviewProduct[] }
  | { kind: "faq" }
  | { kind: "about" }
  | { kind: "static"; heading: string; summary: string; path: string; paragraphs?: string[] }
  | { kind: "not-found"; path: string };

export const SEO_FAQ_ITEMS = [
  [
    "هل AQUAVO يوصّل لكل العراق؟",
    `نعم. AQUAVO متجر إلكتروني ويوصل الطلبات إلى جميع محافظات العراق خلال 24 ساعة، وأجور التوصيل الثابتة ${new Intl.NumberFormat("ar-IQ").format(AQUAVO_ENTITY.deliveryFee)} د.ع.`,
  ],
  ["هل الدفع عند الاستلام أو إلكترونياً متوفر؟", "نعم، طريقة الدفع المعتمدة هي الدفع النقدي عند الاستلام."],
  ["هل دعم AQUAVO متوفر طول اليوم؟", "نعم، دعم AQUAVO متوفر 24/7 للاستفسار عن الطلبات واختيار المعدات."],
  ["شلون أختار الفلتر المناسب؟", "ابدأ بحجم الحوض وعدد الأسماك والحمل الحيوي، ثم قارن التدفق الفعلي ومساحة وسائط الفلترة، مو رقم اللترات المكتوب وحده."],
  ["شلون أختار السخان؟", "يعتمد اختيار السخان على حجم الحوض وفرق الحرارة بين الماء والغرفة، ويجب مراقبة الحرارة بميزان مستقل."],
  ["هل AQUAVO يبيع أسماك أو كائنات أو نباتات حية؟", "لا. AQUAVO متخصص في معدات ومستلزمات أحواض الزينة ولا يبيع أسماكاً أو كائنات أو نباتات حية."],
] as const;

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

function formatMoney(value: number, currency = "IQD"): string {
  if (currency === "IQD") return `${new Intl.NumberFormat("ar-IQ").format(value)} د.ع`;
  return `${new Intl.NumberFormat("ar-IQ").format(value)} ${currency}`;
}

function formatPrice(product: SeoPreviewProduct): string {
  const range = priceRange(product);
  if (!range) return "السعر غير منشور حالياً";
  if (range.min !== range.max) {
    return `من ${formatMoney(range.min, product.currency || "IQD")} إلى ${formatMoney(range.max, product.currency || "IQD")}`;
  }
  return formatMoney(range.min, product.currency || "IQD");
}

function isInStock(product: SeoPreviewProduct): boolean {
  const variants = getActiveVariants(product);
  if (variants.length > 0) return variants.some((variant) => (numberValue(variant.stock) ?? 0) > 0);
  return (numberValue(product.stock) ?? 0) > 0;
}

function cleanText(value: string | null | undefined, fallback: string): string {
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

function ProductLinks({ products, limit }: { products: SeoPreviewProduct[]; limit?: number }) {
  const visible = typeof limit === "number" ? products.slice(0, limit) : products;
  return (
    <ul className="aq-ssr-products" aria-label="روابط المنتجات">
      {visible.map((product) => (
        <li key={product.slug}>
          <a href={`/products/${encodeURIComponent(product.slug)}`}>
            <strong>{product.name}</strong>
            <span>{formatPrice(product)}</span>
            <small>{isInStock(product) ? "متوفر" : "غير متوفر حالياً"}</small>
          </a>
        </li>
      ))}
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
        <a href="/faq">الأسئلة الشائعة</a>
        <a href="/about">عن AQUAVO</a>
        <a href="/contact">تواصل معنا</a>
      </nav>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="aq-ssr-footer">
      <p>AQUAVO — متجر إلكتروني عراقي متخصص في معدات ومستلزمات أحواض الزينة.</p>
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

function ProductPage({ product, related }: { product: SeoPreviewProduct; related: SeoPreviewProduct[] }) {
  const description = cleanText(product.description, `معلومات ومواصفات ${product.name} من AQUAVO.`);
  const variants = getActiveVariants(product);
  const category = canonicalProductCategory(product.category);
  return (
    <main id="main-content">
      <nav className="aq-ssr-breadcrumb" aria-label="مسار الصفحة">
        <a href="/">الرئيسية</a><span>/</span><a href="/products">المنتجات</a><span>/</span><span>{product.name}</span>
      </nav>
      <article itemScope itemType="https://schema.org/Product">
        <p className="aq-ssr-kicker">{product.brand || "AQUAVO"}</p>
        <h1 itemProp="name">{product.name}</h1>
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

function StaticPage({ heading, summary, paragraphs = [] }: { heading: string; summary: string; path: string; paragraphs?: string[] }) {
  return (
    <main id="main-content">
      <nav className="aq-ssr-breadcrumb" aria-label="مسار الصفحة"><a href="/">الرئيسية</a><span>/</span><span>{heading}</span></nav>
      <h1>{heading}</h1>
      <p>{summary}</p>
      {paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      <p><a href="/products">تصفح المنتجات</a> · <a href="/faq">الأسئلة الشائعة</a></p>
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
        @media(max-width:720px){.aq-ssr-header,.aq-ssr-footer{align-items:flex-start;flex-direction:column}.aq-ssr-shell{padding-inline:1.1rem}.aq-ssr-shell main{padding-top:2rem}}
      `}</style>
      <SiteHeader />
      {page.kind === "home" && <HomePage products={page.products} />}
      {page.kind === "products" && <ProductsPage products={page.products} category={page.category} />}
      {page.kind === "product" && <ProductPage product={page.product} related={page.related} />}
      {page.kind === "faq" && <FaqPage />}
      {page.kind === "about" && <AboutPage />}
      {page.kind === "static" && <StaticPage heading={page.heading} summary={page.summary} path={page.path} paragraphs={page.paragraphs} />}
      {page.kind === "not-found" && <NotFoundPage />}
      <SiteFooter />
    </div>
  );
}

export function renderSeoPreviewShell(page: SeoPreviewPage): string {
  return renderToStaticMarkup(<SeoPreviewShell page={page} />);
}

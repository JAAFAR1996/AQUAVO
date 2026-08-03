import type { SeoPreviewProduct, SeoPreviewVariant } from "./_seo-preview-shell.js";

const PRODUCTION_BASE = "https://www.aquavoiq.com";
const DEFAULT_IMAGE = `${PRODUCTION_BASE}/brand/aquavo-v2-horizontal.png`;

function numberValue(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function cleanText(value: string | null | undefined, fallback: string): string {
  const text = (value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return text || fallback;
}

function firstImage(product: SeoPreviewProduct, variant?: SeoPreviewVariant): string {
  const candidate = variant?.image || product.thumbnail ||
    (Array.isArray(product.images)
      ? product.images.find((item): item is string => typeof item === "string" && item.length > 0)
      : undefined);
  if (!candidate) return DEFAULT_IMAGE;
  if (/^https?:\/\//i.test(candidate)) return candidate;
  return `${PRODUCTION_BASE}${candidate.startsWith("/") ? "" : "/"}${candidate}`;
}

function availability(stock: string | number | null | undefined): string {
  return (numberValue(stock) ?? 0) > 0
    ? "https://schema.org/InStock"
    : "https://schema.org/OutOfStock";
}

function offer(url: string, price: string | number | null | undefined, currency: string, stock: string | number | null | undefined) {
  return {
    "@type": "Offer",
    url,
    price: String(Math.max(numberValue(price) ?? 0, 0)),
    priceCurrency: currency,
    availability: availability(stock),
    itemCondition: "https://schema.org/NewCondition",
    seller: {
      "@type": "Organization",
      "@id": `${PRODUCTION_BASE}/#organization`,
      name: "AQUAVO",
      url: PRODUCTION_BASE,
    },
  };
}

function activeVariants(product: SeoPreviewProduct): SeoPreviewVariant[] {
  if (!product.hasVariants || !Array.isArray(product.variants)) return [];
  return product.variants.filter((variant) => {
    const price = numberValue(variant.price);
    return Boolean(variant.label) && price !== null && price > 0;
  });
}

function defaultVariant(product: SeoPreviewProduct): SeoPreviewVariant | undefined {
  const variants = activeVariants(product);
  return variants.find((variant) => Boolean((variant as SeoPreviewVariant & { isDefault?: boolean }).isDefault)) || variants[0];
}

export function buildProductStructuredData(product: SeoPreviewProduct): object[] {
  const url = `${PRODUCTION_BASE}/products/${encodeURIComponent(product.slug)}`;
  const currency = product.currency || "IQD";
  const description = cleanText(product.description, `معلومات ومواصفات ${product.name} من AQUAVO.`);
  const selected = defaultVariant(product);
  const productPrice = selected?.price ?? product.price;
  const productStock = selected?.stock ?? product.stock;
  const sku = selected?.sku || (selected?.id ? `${product.id || product.slug}-${selected.id}` : product.id || product.slug);
  const variantLabels = activeVariants(product).map((variant) => variant.label).filter(Boolean) as string[];

  return [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      "@id": `${url}#product`,
      name: product.name,
      description,
      url,
      image: [firstImage(product, selected)],
      sku,
      brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
      category: product.category || undefined,
      offers: offer(url, productPrice, currency, productStock),
      additionalProperty: variantLabels.length > 0
        ? [{ "@type": "PropertyValue", name: "الخيارات المتوفرة", value: variantLabels.join("، ") }]
        : undefined,
      aggregateRating:
        (numberValue(product.rating) ?? 0) > 0 && (numberValue(product.reviewCount) ?? 0) > 0
          ? {
              "@type": "AggregateRating",
              ratingValue: numberValue(product.rating),
              reviewCount: numberValue(product.reviewCount),
              bestRating: 5,
              worstRating: 1,
            }
          : undefined,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "الرئيسية", item: PRODUCTION_BASE },
        { "@type": "ListItem", position: 2, name: "المنتجات", item: `${PRODUCTION_BASE}/products` },
        { "@type": "ListItem", position: 3, name: product.name, item: url },
      ],
    },
  ];
}

export function buildCollectionStructuredData(products: SeoPreviewProduct[]): object[] {
  const categories = [...new Set(products.map((product) => product.category?.trim()).filter(Boolean))] as string[];
  return [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "مستلزمات أحواض الزينة في العراق",
      url: `${PRODUCTION_BASE}/products`,
      inLanguage: "ar-IQ",
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: products.length,
        itemListElement: products.map((product, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: product.name,
          url: `${PRODUCTION_BASE}/products/${encodeURIComponent(product.slug)}`,
        })),
      },
      about: categories.map((name) => ({ "@type": "Thing", name })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "الرئيسية", item: PRODUCTION_BASE },
        { "@type": "ListItem", position: 2, name: "المنتجات", item: `${PRODUCTION_BASE}/products` },
      ],
    },
  ];
}

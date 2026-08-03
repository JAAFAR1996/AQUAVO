import type { SeoPreviewProduct, SeoPreviewVariant } from "./_seo-preview-shell.js";
import {
  AQUAVO_BASE_URL,
  AQUAVO_ENTITY,
  canonicalProductCategory,
} from "../shared/seo-contract.js";

const DEFAULT_IMAGE = AQUAVO_ENTITY.logoUrl;

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
  return `${AQUAVO_BASE_URL}${candidate.startsWith("/") ? "" : "/"}${candidate}`;
}

function availability(stock: string | number | null | undefined): string {
  return (numberValue(stock) ?? 0) > 0
    ? "https://schema.org/InStock"
    : "https://schema.org/OutOfStock";
}

function shippingDetails() {
  return {
    "@type": "OfferShippingDetails",
    shippingRate: {
      "@type": "MonetaryAmount",
      value: AQUAVO_ENTITY.deliveryFee,
      currency: AQUAVO_ENTITY.currency,
    },
    shippingDestination: {
      "@type": "DefinedRegion",
      addressCountry: AQUAVO_ENTITY.countryCode,
    },
    deliveryTime: {
      "@type": "ShippingDeliveryTime",
      handlingTime: {
        "@type": "QuantitativeValue",
        minValue: 0,
        maxValue: 0,
        unitCode: "DAY",
      },
      transitTime: {
        "@type": "QuantitativeValue",
        minValue: 0,
        maxValue: AQUAVO_ENTITY.deliveryMaxDays,
        unitCode: "DAY",
      },
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

function buildOffer(
  url: string,
  price: string | number | null | undefined,
  currency: string,
  stock: string | number | null | undefined,
): object | undefined {
  const numericPrice = numberValue(price);
  if (numericPrice === null || numericPrice <= 0) return undefined;
  return {
    "@type": "Offer",
    url,
    price: String(numericPrice),
    priceCurrency: currency,
    availability: availability(stock),
    itemCondition: "https://schema.org/NewCondition",
    seller: { "@id": `${AQUAVO_BASE_URL}/#organization` },
    shippingDetails: shippingDetails(),
    eligibleRegion: {
      "@type": "Country",
      name: AQUAVO_ENTITY.countryName,
    },
  };
}

export function buildProductStructuredData(product: SeoPreviewProduct): object[] {
  const url = `${AQUAVO_BASE_URL}/products/${encodeURIComponent(product.slug)}`;
  const currency = product.currency || AQUAVO_ENTITY.currency;
  const description = cleanText(product.description, `معلومات ومواصفات ${product.name} من AQUAVO.`);
  const selected = defaultVariant(product);
  const productPrice = selected?.price ?? product.price;
  const productStock = selected?.stock ?? product.stock;
  const sku = selected?.sku || (selected?.id ? `${product.id || product.slug}-${selected.id}` : product.id || product.slug);
  const variants = activeVariants(product);

  const productSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: product.name,
    description,
    url,
    image: [firstImage(product, selected)],
    sku,
    brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
    category: canonicalProductCategory(product.category) || undefined,
    offers: buildOffer(url, productPrice, currency, productStock),
    additionalProperty: variants.length > 0
      ? variants.map((variant) => ({
          "@type": "PropertyValue",
          name: variant.label || "خيار",
          value: [
            numberValue(variant.price) !== null ? `${numberValue(variant.price)} ${currency}` : null,
            (numberValue(variant.stock) ?? 0) > 0 ? "متوفر" : "غير متوفر",
            variant.sku ? `SKU: ${variant.sku}` : null,
          ].filter(Boolean).join(" — "),
        }))
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
  };

  return [
    productSchema,
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "الرئيسية", item: AQUAVO_BASE_URL },
        { "@type": "ListItem", position: 2, name: "المنتجات", item: `${AQUAVO_BASE_URL}/products` },
        { "@type": "ListItem", position: 3, name: product.name, item: url },
      ],
    },
  ];
}

export function buildCollectionStructuredData(
  products: SeoPreviewProduct[],
  canonicalPath = "/products",
  name = "مستلزمات أحواض الزينة في العراق",
): object[] {
  const categories = [...new Set(products
    .map((product) => canonicalProductCategory(product.category))
    .filter(Boolean))] as string[];
  const url = `${AQUAVO_BASE_URL}${canonicalPath}`;
  return [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name,
      url,
      inLanguage: "ar-IQ",
      isPartOf: { "@id": `${AQUAVO_BASE_URL}/#website` },
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: products.length,
        itemListElement: products.map((product, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: product.name,
          url: `${AQUAVO_BASE_URL}/products/${encodeURIComponent(product.slug)}`,
        })),
      },
      about: categories.map((categoryName) => ({ "@type": "Thing", name: categoryName })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "الرئيسية", item: AQUAVO_BASE_URL },
        { "@type": "ListItem", position: 2, name, item: url },
      ],
    },
  ];
}

export function buildHomeStructuredData(products: SeoPreviewProduct[]): object[] {
  return [
    {
      "@context": "https://schema.org",
      "@type": "OnlineStore",
      "@id": `${AQUAVO_BASE_URL}/#organization`,
      name: AQUAVO_ENTITY.brandName,
      alternateName: [AQUAVO_ENTITY.arabicName, "AQUAVO Iraq"],
      legalName: AQUAVO_ENTITY.legalName,
      url: AQUAVO_BASE_URL,
      logo: AQUAVO_ENTITY.logoUrl,
      image: AQUAVO_ENTITY.logoUrl,
      email: AQUAVO_ENTITY.email,
      telephone: AQUAVO_ENTITY.telephone,
      currenciesAccepted: AQUAVO_ENTITY.currency,
      paymentAccepted: AQUAVO_ENTITY.paymentMethod,
      areaServed: { "@type": "Country", name: AQUAVO_ENTITY.countryName },
      sameAs: [...AQUAVO_ENTITY.socialProfiles],
      contactPoint: {
        "@type": "ContactPoint",
        telephone: AQUAVO_ENTITY.telephone,
        contactType: "customer support",
        availableLanguage: ["Arabic"],
        areaServed: AQUAVO_ENTITY.countryCode,
        hoursAvailable: {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
          opens: "00:00",
          closes: "23:59",
        },
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${AQUAVO_BASE_URL}/#website`,
      name: AQUAVO_ENTITY.brandName,
      alternateName: AQUAVO_ENTITY.arabicName,
      url: AQUAVO_BASE_URL,
      inLanguage: "ar-IQ",
      publisher: { "@id": `${AQUAVO_BASE_URL}/#organization` },
      potentialAction: {
        "@type": "SearchAction",
        target: `${AQUAVO_BASE_URL}/products?search={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
    ...buildCollectionStructuredData(products.slice(0, 24), "/", "منتجات AQUAVO"),
  ];
}

export function buildFaqStructuredData(items: readonly (readonly [string, string])[]): object {
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

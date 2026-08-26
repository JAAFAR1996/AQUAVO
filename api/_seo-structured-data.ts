import type { SeoPreviewProduct, SeoPreviewVariant } from "./_seo-preview-shell.js";
import {
  AQUAVO_BASE_URL,
  AQUAVO_ENTITY,
  AQUAVO_SEO_RELEASE_LASTMOD,
  canonicalProductCategory,
  categoryProductsPath,
} from "../shared/seo-contract.js";

const DEFAULT_IMAGE = AQUAVO_ENTITY.logoUrl;
const SIZE_SCHEMA = "https://schema.org/size";
const COLOR_SCHEMA = "https://schema.org/color";
const MATERIAL_SCHEMA = "https://schema.org/material";
const PATTERN_SCHEMA = "https://schema.org/pattern";

const COLOR_RE = /(أبيض|اسود|أسود|أحمر|ازرق|أزرق|أخضر|رمادي|بني|ذهبي|فضي|شفاف|white|black|red|blue|green|gray|grey|brown)/i;
const MATERIAL_RE = /(ستانلس(?: ستيل)?|فولاذ|ألمنيوم|المنيوم|اكريليك|أكريليك|زجاج|سيراميك|بلاستيك|stainless(?: steel)?|steel|aluminum|aluminium|acrylic|glass|ceramic)/i;

function numberValue(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function cleanText(value: string | null | undefined, fallback: string): string {
  const text = (value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return text || fallback;
}

function absoluteImage(value: string | null | undefined): string | null {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  return `${AQUAVO_BASE_URL}${value.startsWith("/") ? "" : "/"}${value}`;
}

function productImages(product: SeoPreviewProduct, variant?: SeoPreviewVariant): string[] {
  const candidates: Array<string | null | undefined> = [variant?.image, product.thumbnail];
  if (Array.isArray(product.images)) {
    for (const item of product.images) {
      if (typeof item === "string") candidates.push(item);
    }
  }
  const images = candidates
    .map(absoluteImage)
    .filter((item): item is string => Boolean(item));
  const unique = [...new Set(images)];
  return unique.length > 0 ? unique.slice(0, 10) : [DEFAULT_IMAGE];
}

/**
 * The one image a product page leads with: the same URL, resolved the same way,
 * that lands first in the Product schema's `image` array. The crawler-visible
 * <img> is rendered from this so the picture a crawler sees and the picture the
 * structured data claims can never drift apart.
 *
 * Returns null when the product carries no image of its own, so callers render
 * nothing rather than presenting the AQUAVO logo as if it were the product.
 */
export function primaryProductImage(product: SeoPreviewProduct): string | null {
  const [first] = productImages(product);
  return !first || first === DEFAULT_IMAGE ? null : first;
}

function availability(stock: string | number | null | undefined): string {
  return (numberValue(stock) ?? 0) > 0
    ? "https://schema.org/InStock"
    : "https://schema.org/OutOfStock";
}

function shippingDetails(): object {
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

function aggregateRating(product: SeoPreviewProduct): object | undefined {
  const rating = numberValue(product.rating) ?? 0;
  const reviewCount = numberValue(product.reviewCount) ?? 0;
  if (rating <= 0 || reviewCount <= 0) return undefined;
  return {
    "@type": "AggregateRating",
    ratingValue: rating,
    reviewCount,
    bestRating: 5,
    worstRating: 1,
  };
}

function variantSku(product: SeoPreviewProduct, variant: SeoPreviewVariant, index: number): string {
  if (variant.sku) return variant.sku;
  const parent = product.id || product.slug;
  return variant.id ? `${parent}-${variant.id}` : `${parent}-variant-${index + 1}`;
}

function variantAnchor(variant: SeoPreviewVariant, index: number): string {
  const raw = variant.id || variant.sku || variant.label || `variant-${index + 1}`;
  return encodeURIComponent(String(raw)).replace(/%/g, "-");
}

/**
 * Google Search currently recognizes only a small allowlist of ProductGroup
 * variant dimensions. Unsupported aquarium dimensions such as wattage, port
 * count, treatment type, or pack count still remain explicit in the variant
 * name/additionalProperty without pretending they are size or another field.
 */
function inferVariesBy(variants: SeoPreviewVariant[]): string[] {
  const labels = variants.map((variant) => variant.label || "").join(" ");
  const result = new Set<string>();

  if (/(?:صغير|متوسط|كبير|\d+(?:[.,]\d+)?(?:×\d+(?:[.,]\d+)?){0,2}\s*(?:سم|ملم|مم|متر|لتر|مل|غرام|كغم)|\d+(?:[.,]\d+)?\s*(?:kg|cm|mm|ml|l)\b)/i.test(labels)) {
    result.add(SIZE_SCHEMA);
  }
  if (COLOR_RE.test(labels)) result.add(COLOR_SCHEMA);
  if (MATERIAL_RE.test(labels)) result.add(MATERIAL_SCHEMA);
  if (/(?:نمط|pattern)/i.test(labels)) result.add(PATTERN_SCHEMA);

  return [...result];
}

function variantIdentityProperties(label: string, variesBy: string[]): Record<string, string> {
  const properties: Record<string, string> = {};
  if (variesBy.includes(SIZE_SCHEMA)) properties.size = label;

  if (variesBy.includes(COLOR_SCHEMA)) {
    const color = label.match(COLOR_RE)?.[0];
    if (color) properties.color = color;
  }

  if (variesBy.includes(MATERIAL_SCHEMA)) {
    const material = label.match(MATERIAL_RE)?.[0];
    if (material) properties.material = material;
  }

  if (variesBy.includes(PATTERN_SCHEMA)) properties.pattern = label;
  return properties;
}

export function buildProductStructuredData(product: SeoPreviewProduct): object[] {
  const url = `${AQUAVO_BASE_URL}/products/${encodeURIComponent(product.slug)}`;
  const currency = product.currency || AQUAVO_ENTITY.currency;
  const description = cleanText(product.description, `معلومات ومواصفات ${product.name} من AQUAVO.`);
  const variants = activeVariants(product);
  const rating = aggregateRating(product);
  const category = canonicalProductCategory(product.category) || undefined;
  const brand = product.brand ? { "@type": "Brand", name: product.brand } : undefined;
  const productGroupID = product.id || product.slug;

  let mainEntityId = `${url}#product`;
  let mainSchema: Record<string, unknown>;

  if (variants.length > 1) {
    mainEntityId = `${url}#product-group`;
    const variesBy = inferVariesBy(variants);
    mainSchema = {
      "@context": "https://schema.org",
      "@type": "ProductGroup",
      "@id": mainEntityId,
      name: product.name,
      description,
      url,
      image: productImages(product),
      productGroupID,
      brand,
      category,
      ...(variesBy.length > 0 ? { variesBy } : {}),
      hasVariant: variants.map((variant, index) => ({
        "@type": "Product",
        "@id": `${url}#variant-${variantAnchor(variant, index)}`,
        url,
        name: `${product.name} — ${variant.label}`,
        description,
        image: productImages(product, variant),
        sku: variantSku(product, variant, index),
        inProductGroupWithID: productGroupID,
        brand,
        category,
        ...variantIdentityProperties(variant.label || "", variesBy),
        additionalProperty: {
          "@type": "PropertyValue",
          name: "الخيار",
          value: variant.label,
        },
        offers: buildOffer(url, variant.price, currency, variant.stock),
      })),
      aggregateRating: rating,
    };
  } else {
    const selected = defaultVariant(product);
    const productPrice = selected?.price ?? product.price;
    const productStock = selected?.stock ?? product.stock;
    const sku = selected?.sku || (selected?.id ? `${productGroupID}-${selected.id}` : productGroupID);
    mainSchema = {
      "@context": "https://schema.org",
      "@type": "Product",
      "@id": mainEntityId,
      name: product.name,
      description,
      url,
      image: productImages(product, selected),
      sku,
      brand,
      category,
      offers: buildOffer(url, productPrice, currency, productStock),
      aggregateRating: rating,
    };
  }

  return [
    mainSchema,
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": url,
      url,
      name: product.name,
      description,
      inLanguage: "ar-IQ",
      dateModified: AQUAVO_SEO_RELEASE_LASTMOD,
      isPartOf: { "@id": `${AQUAVO_BASE_URL}/#website` },
      mainEntity: { "@id": mainEntityId },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      // The category step is real: it is the product's own canonical category,
      // and it links to the listing filtered by that category — a page that
      // exists and that the product is genuinely reachable through. It is
      // omitted rather than invented when a product has no canonical category.
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "الرئيسية", item: AQUAVO_BASE_URL },
        { "@type": "ListItem", position: 2, name: "المنتجات", item: `${AQUAVO_BASE_URL}/products` },
        ...(category
          ? [{
              "@type": "ListItem",
              position: 3,
              name: category,
              item: `${AQUAVO_BASE_URL}${categoryProductsPath(category)}`,
            }]
          : []),
        { "@type": "ListItem", position: category ? 4 : 3, name: product.name, item: url },
      ],
    },
    // The Offer's `seller` and the WebPage's `isPartOf` both point at @ids that
    // were only ever defined on the home page. Defining them here too is what
    // makes those references resolve on a product page instead of dangling.
    ...buildEntityStructuredData(),
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
      dateModified: AQUAVO_SEO_RELEASE_LASTMOD,
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

/**
 * The two site-level entity nodes every other node points at: the store
 * (`#organization`, the `seller` on every Offer) and the site (`#website`,
 * what each WebPage `isPartOf`).
 *
 * These used to be emitted on the home page alone, so on a product page both
 * references dangled — an Offer whose `seller` resolved to nothing and a
 * WebPage that was part of nothing. Every page that references them now also
 * defines them.
 */
export function buildEntityStructuredData(): object[] {
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
      dateModified: AQUAVO_SEO_RELEASE_LASTMOD,
      publisher: { "@id": `${AQUAVO_BASE_URL}/#organization` },
      // No `potentialAction`/SearchAction here on purpose. Google retired the
      // sitelinks searchbox, so the markup buys nothing, and
      // test/seo-no-obsolete-searchaction.test.ts exists to stop it being
      // reintroduced — as it nearly was here.
    },
  ];
}

/**
 * Attach the site-level entity nodes to a page's structured data, unless they
 * are already there.
 *
 * Every page emits nodes that point at `#organization` and `#website` — an
 * Offer's `seller`, a WebPage's `isPartOf`, an Article's `publisher`. Those
 * two nodes were defined only on the home page and (since the product-schema
 * unification) on product pages, so on `/about`, `/faq`, `/blog`, `/blog/*`
 * and `/products` the references resolved to nothing.
 *
 * Doing it here rather than in each page's builder means every route gets it,
 * including routes added later, and the idempotence check means a builder that
 * already includes them cannot produce a duplicate.
 */
export function withSiteEntities(nodes: object[]): object[] {
  const alreadyPresent = nodes.some((node) => {
    const type = (node as Record<string, unknown>)?.["@type"];
    return type === "OnlineStore" || type === "Organization" || type === "WebSite";
  });
  return alreadyPresent ? nodes : [...nodes, ...buildEntityStructuredData()];
}

export function buildHomeStructuredData(products: SeoPreviewProduct[]): object[] {
  return [
    ...buildEntityStructuredData(),
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

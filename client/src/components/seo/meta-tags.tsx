import { useEffect } from "react";
import DOMPurify from "isomorphic-dompurify";
import { isTrackingAllowed } from "@/lib/tracking-environment";
import {
  AQUAVO_BASE_URL,
  AQUAVO_ENTITY,
  canonicalProductCategory,
  canonicalUrlFor,
} from "@shared/seo-contract";
import { articleAuthorEntity } from "@shared/editorial-author";
import { DEFAULT_LOCALE, LOCALES, SUPPORTED_LOCALES, alternatesFor, localizePath, splitLocaleFromPath, type Locale } from "@shared/i18n/locales";
import { i18next } from "@/i18n";

/** Locale of the page on screen, read from the URL prefix (the source of truth). */
function currentLocale(): Locale {
  return typeof window !== "undefined" ? splitLocaleFromPath(window.location.pathname).locale : DEFAULT_LOCALE;
}

/** Canonical URL of a logical path in the current locale. */
function localizedCanonical(logicalPath: string): string {
  const locale = currentLocale();
  const arabic = canonicalUrlFor(logicalPath);
  if (locale === DEFAULT_LOCALE) return arabic;
  const u = new URL(arabic);
  return `${u.origin}${localizePath(u.pathname, locale)}${u.search}`;
}

const DEFAULT_DESCRIPTIONS: Record<Locale, string> = {
  ar: i18next.t("pages:meta-tags.s1"),
  en: "AQUAVO is an Iraqi online store for aquarium equipment and supplies, with delivery across Iraq and cash on delivery or online payment.",
  ckb: i18next.t("pages:meta-tags.s2"),
};
const TITLE_SUFFIX: Record<Locale, string> = { ar: i18next.t("pages:meta-tags.s3"), en: "AQUAVO Iraq", ckb: i18next.t("pages:meta-tags.s4") };

const LOGO_URL = AQUAVO_ENTITY.logoUrl;

/**
 * Canonical URL of the page currently on screen. Structured data must never
 * carry `window.location.href`: query strings (?ref=, ?utm_source=) would fork
 * one page into many @id values and contradict the published canonical.
 */
function currentCanonicalUrl(): string {
  return typeof window !== "undefined" ? localizedCanonical(splitLocaleFromPath(window.location.pathname).path) : AQUAVO_BASE_URL;
}

function sanitizeSchemaValue(value: unknown): unknown {
  if (typeof value === "string") {
    return DOMPurify.sanitize(value, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  }
  if (Array.isArray(value)) return value.map(sanitizeSchemaValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, sanitizeSchemaValue(child)]),
    );
  }
  return value;
}

function safeJson(value: object): string {
  return JSON.stringify(sanitizeSchemaValue(value))
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function SchemaScript({ value }: { value: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJson(value) }} />;
}

interface MetaTagsProps {
  title: string;
  description?: string;
  keywords?: string[];
  image?: string;
  url?: string;
  type?: "website" | "product" | "article";
  price?: number;
  currency?: string;
  canonicalUrl?: string;
  noIndex?: boolean;
  notFound?: boolean;
}

export function MetaTags({
  title,
  description: descriptionProp,
  keywords = [],
  image = LOGO_URL,
  url,
  type = "website",
  price,
  currency = AQUAVO_ENTITY.currency,
  canonicalUrl,
  noIndex = false,
  notFound = false,
}: MetaTagsProps) {
  useEffect(() => {
    const isPreview = !isTrackingAllowed();
    const locale = currentLocale();
    const description = descriptionProp ?? DEFAULT_DESCRIPTIONS[locale];
    const fullTitle = /\|\s*AQUAVO(?:\s|$)/i.test(title)
      ? title
      : `${title} | ${TITLE_SUFFIX[locale]}`;
    document.title = fullTitle;

    const setMetaTag = (name: string, content: string, property = false) => {
      const attr = property ? "property" : "name";
      let meta = document.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute(attr, name);
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", content);
    };

    const removeMeta = (selector: string) => {
      document.head.querySelectorAll(selector).forEach((node) => node.remove());
    };

    const setLinkTag = (rel: string, href: string) => {
      let link = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", rel);
        document.head.appendChild(link);
      }
      link.setAttribute("href", href);
    };

    setMetaTag("description", description.slice(0, 160));
    setMetaTag(
      "robots",
      notFound
        ? "noindex, follow"
        : noIndex || isPreview
          ? "noindex, nofollow, noarchive"
          : "index, follow, max-image-preview:large",
    );

    if (keywords.length > 0) setMetaTag("keywords", keywords.slice(0, 7).join(", "));
    else removeMeta('meta[name="keywords"]');

    const logicalPath = splitLocaleFromPath(window.location.pathname).path;
    const canonical = canonicalUrl || url || localizedCanonical(logicalPath);
    if (notFound) removeMeta('link[rel="canonical"]');
    else setLinkTag("canonical", canonical);

    // Reciprocal alternates for every locale, or none on pages that are not indexed.
    removeMeta('link[rel="alternate"][hreflang]');
    if (!notFound && !noIndex && !isPreview) {
      const { alternates, xDefault } = alternatesFor(logicalPath);
      for (const alt of alternates) {
        const link = document.createElement("link");
        link.rel = "alternate";
        link.hreflang = alt.hreflang;
        link.href = `${AQUAVO_BASE_URL}${alt.path}`;
        document.head.appendChild(link);
      }
      const xd = document.createElement("link");
      xd.rel = "alternate";
      xd.hreflang = "x-default";
      xd.href = `${AQUAVO_BASE_URL}${xDefault}`;
      document.head.appendChild(xd);
    }

    if (notFound) {
      removeMeta('meta[property^="og:"], meta[name^="twitter:"], meta[property^="product:"]');
      return;
    }

    setMetaTag("og:title", fullTitle, true);
    setMetaTag("og:description", description.slice(0, 200), true);
    setMetaTag("og:image", image, true);
    setMetaTag("og:image:alt", title, true);
    setMetaTag("og:type", type === "product" ? "product" : type === "article" ? "article" : "website", true);
    setMetaTag("og:url", canonical, true);
    setMetaTag("og:site_name", AQUAVO_ENTITY.brandName, true);
    removeMeta('meta[property="og:locale"], meta[property="og:locale:alternate"]');
    const ownOg = LOCALES[locale].ogLocale;
    if (ownOg) setMetaTag("og:locale", ownOg, true);
    for (const other of SUPPORTED_LOCALES) {
      const alt = LOCALES[other].ogLocale;
      if (other !== locale && alt) {
        const meta = document.createElement("meta");
        meta.setAttribute("property", "og:locale:alternate");
        meta.setAttribute("content", alt);
        document.head.appendChild(meta);
      }
    }

    setMetaTag("twitter:card", "summary_large_image");
    setMetaTag("twitter:title", fullTitle);
    setMetaTag("twitter:description", description.slice(0, 200));
    setMetaTag("twitter:image", image);
    setMetaTag("twitter:site", "@aquavoiq");

    if (type === "product" && typeof price === "number" && price > 0) {
      setMetaTag("product:price:amount", String(price), true);
      setMetaTag("product:price:currency", currency, true);
    } else {
      removeMeta('meta[property^="product:"]');
    }
  }, [title, descriptionProp, keywords, image, url, type, price, currency, canonicalUrl, noIndex, notFound]);

  return null;
}

interface ProductSchemaProps {
  name: string;
  description: string;
  image: string | string[];
  price: number;
  currency?: string;
  brand?: string;
  sku?: string;
  rating?: number;
  reviewCount?: number;
  inStock?: boolean;
  url?: string;
  category?: string;
}

export function ProductSchema({
  name,
  description,
  image,
  price,
  currency = AQUAVO_ENTITY.currency,
  brand,
  sku,
  rating,
  reviewCount,
  inStock = true,
  url,
  category,
}: ProductSchemaProps) {
  if (!Number.isFinite(price) || price <= 0) return null;
  const productUrl = url || currentCanonicalUrl();
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description,
    image: Array.isArray(image) ? image.filter(Boolean) : image ? [image] : undefined,
    brand: brand ? { "@type": "Brand", name: brand } : undefined,
    sku,
    category: canonicalProductCategory(category),
    offers: {
      "@type": "Offer",
      url: productUrl,
      price,
      priceCurrency: currency,
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@id": `${AQUAVO_BASE_URL}/#organization` },
      eligibleRegion: { "@type": "Country", name: AQUAVO_ENTITY.countryName },
      shippingDetails: {
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
          handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 0, unitCode: "DAY" },
          transitTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: AQUAVO_ENTITY.deliveryMaxDays, unitCode: "DAY" },
        },
      },
    },
    aggregateRating:
      typeof rating === "number" && rating > 0 && typeof reviewCount === "number" && reviewCount > 0
        ? { "@type": "AggregateRating", ratingValue: rating, bestRating: 5, worstRating: 1, reviewCount }
        : undefined,
  };

  return <SchemaScript value={schema} />;
}

export function ReviewSchema({
  reviews,
  productName,
}: {
  reviews: { author: string; rating: number; comment: string; date: string }[];
  productName: string;
}) {
  if (reviews.length === 0) return null;
  return (
    <>
      {reviews.slice(0, 5).map((review) => (
        <SchemaScript
          key={`${review.author}-${review.date}`}
          value={{
            "@context": "https://schema.org",
            "@type": "Review",
            itemReviewed: { "@type": "Product", name: productName },
            author: { "@type": "Person", name: review.author },
            reviewRating: { "@type": "Rating", ratingValue: review.rating, bestRating: 5, worstRating: 1 },
            reviewBody: review.comment,
            datePublished: review.date,
          }}
        />
      ))}
    </>
  );
}

function onlineStoreSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "OnlineStore",
    "@id": `${AQUAVO_BASE_URL}/#organization`,
    name: AQUAVO_ENTITY.brandName,
    alternateName: [AQUAVO_ENTITY.arabicName, "AQUAVO Iraq"],
    legalName: AQUAVO_ENTITY.legalName,
    url: AQUAVO_BASE_URL,
    logo: { "@type": "ImageObject", url: LOGO_URL, width: 512, height: 512 },
    image: LOGO_URL,
    email: AQUAVO_ENTITY.email,
    telephone: AQUAVO_ENTITY.telephone,
    description: i18next.t("pages:meta-tags.s5"),
    currenciesAccepted: AQUAVO_ENTITY.currency,
    paymentAccepted: AQUAVO_ENTITY.paymentMethod,
    areaServed: { "@type": "Country", name: AQUAVO_ENTITY.countryName },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: AQUAVO_ENTITY.telephone,
      contactType: "customer support",
      availableLanguage: ["Arabic", "English", "Central Kurdish"],
      areaServed: AQUAVO_ENTITY.countryCode,
      hoursAvailable: {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        opens: "00:00",
        closes: "23:59",
      },
    },
    sameAs: [...AQUAVO_ENTITY.socialProfiles],
    knowsAbout: [
      i18next.t("pages:meta-tags.s6"),
      i18next.t("pages:meta-tags.s7"),
      i18next.t("pages:meta-tags.s8"),
      i18next.t("pages:meta-tags.s9"),
      i18next.t("pages:meta-tags.s10"),
    ],
  };
}

export function OrganizationSchema() {
  return <SchemaScript value={onlineStoreSchema()} />;
}

/** @deprecated AQUAVO is online-only; retained as a compatibility alias. */
export function LocalBusinessSchema() {
  return <SchemaScript value={onlineStoreSchema()} />;
}

export function BreadcrumbSchema({ items }: { items: { name: string; url: string }[] }) {
  return (
    <SchemaScript
      value={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: item.name,
          item: item.url,
        })),
      }}
    />
  );
}

export function FAQSchema({ questions }: { questions: { question: string; answer: string }[] }) {
  return (
    <SchemaScript
      value={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: questions.map((question) => ({
          "@type": "Question",
          name: question.question,
          acceptedAnswer: { "@type": "Answer", text: question.answer },
        })),
      }}
    />
  );
}

export function WebsiteSchema() {
  return (
    <SchemaScript
      value={{
        "@context": "https://schema.org",
        "@type": "WebSite",
        "@id": `${AQUAVO_BASE_URL}/#website`,
        name: AQUAVO_ENTITY.brandName,
        alternateName: AQUAVO_ENTITY.arabicName,
        url: AQUAVO_BASE_URL,
        inLanguage: LOCALES[currentLocale()].hreflang,
        publisher: { "@id": `${AQUAVO_BASE_URL}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: `${AQUAVO_BASE_URL}/products?search={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      }}
    />
  );
}

export function ArticleSchema({
  title,
  description,
  image,
  datePublished,
  author,
}: {
  title: string;
  description: string;
  image: string;
  /**
   * The article's genuine first-publication date, or undefined when there
   * isn't one. Callers must not substitute "now": a missing date is a missing
   * date, and defaulting it publishes today as the day the article appeared.
   */
  datePublished?: string;
  author: string;
}) {
  return (
    <SchemaScript
      value={{
        "@context": "https://schema.org",
        "@type": "Article",
        headline: title,
        description,
        image,
        datePublished,
        // No dateModified. It used to mirror datePublished, which asserts the
        // article was revised on the day it was written. See
        // shared/article-dates.ts for why nothing here can state one honestly.
        author: articleAuthorEntity(author),
        publisher: { "@id": `${AQUAVO_BASE_URL}/#organization` },
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": currentCanonicalUrl(),
        },
        inLanguage: LOCALES[currentLocale()].hreflang,
      }}
    />
  );
}

export function VideoObjectSchema({
  name,
  description,
  thumbnailUrl,
  uploadDate,
  contentUrl,
  duration = "PT30S",
  embedUrl,
}: {
  name: string;
  description: string;
  thumbnailUrl: string;
  uploadDate: string;
  contentUrl: string;
  duration?: string;
  embedUrl?: string;
}) {
  return (
    <SchemaScript
      value={{
        "@context": "https://schema.org",
        "@type": "VideoObject",
        name,
        description,
        thumbnailUrl,
        uploadDate,
        contentUrl,
        duration,
        embedUrl,
        publisher: { "@id": `${AQUAVO_BASE_URL}/#organization` },
        inLanguage: LOCALES[currentLocale()].hreflang,
      }}
    />
  );
}

export function ItemListSchema({
  name,
  description,
  items,
  url,
}: {
  name: string;
  description?: string;
  url?: string;
  items: {
    name: string;
    url: string;
    image?: string;
    price?: number;
    description?: string;
    position?: number;
  }[];
}) {
  return (
    <SchemaScript
      value={{
        "@context": "https://schema.org",
        "@type": "ItemList",
        name,
        description,
        url: url || currentCanonicalUrl(),
        numberOfItems: items.length,
        itemListElement: items.map((item, index) => ({
          "@type": "ListItem",
          position: item.position ?? index + 1,
          name: item.name,
          url: item.url,
          image: item.image,
          description: item.description,
        })),
      }}
    />
  );
}

export function HowToSchema({
  name,
  description,
  image,
  totalTime,
  estimatedCost,
  supply,
  steps,
}: {
  name: string;
  description: string;
  image?: string;
  totalTime?: string;
  estimatedCost?: { currency: string; value: string };
  supply?: string[];
  steps: { name: string; text: string; image?: string; url?: string }[];
}) {
  return (
    <SchemaScript
      value={{
        "@context": "https://schema.org",
        "@type": "HowTo",
        name,
        description,
        image: image || LOGO_URL,
        totalTime,
        estimatedCost: estimatedCost
          ? { "@type": "MonetaryAmount", currency: estimatedCost.currency, value: estimatedCost.value }
          : undefined,
        supply: supply?.map((item) => ({ "@type": "HowToSupply", name: item })),
        step: steps.map((step, index) => ({
          "@type": "HowToStep",
          position: index + 1,
          name: step.name,
          text: step.text,
          image: step.image,
          url: step.url,
        })),
        publisher: { "@id": `${AQUAVO_BASE_URL}/#organization` },
        inLanguage: LOCALES[currentLocale()].hreflang,
      }}
    />
  );
}

export function SpeakableSchema({ cssSelectors }: { cssSelectors: string[] }) {
  return (
    <SchemaScript
      value={{
        "@context": "https://schema.org",
        "@type": "WebPage",
        speakable: { "@type": "SpeakableSpecification", cssSelector: cssSelectors },
        url: currentCanonicalUrl(),
      }}
    />
  );
}

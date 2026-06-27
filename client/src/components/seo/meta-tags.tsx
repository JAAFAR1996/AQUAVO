import { useEffect } from "react";
import DOMPurify from 'isomorphic-dompurify';

// ─── Constants ────────────────────────────────────────────────────────────────
const BASE_URL = "https://www.aquavoiq.com";
const LOGO_URL = `${BASE_URL}/logo_aquavo.png`;

/**
 * Sanitizes string values for schema.org JSON-LD to prevent XSS
 */
function sanitizeSchemaValue(value: unknown): unknown {
    if (typeof value === 'string') {
        return DOMPurify.sanitize(value, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
    }
    if (Array.isArray(value)) {
        return value.map(sanitizeSchemaValue);
    }
    if (value && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value).map(([k, v]) => [k, sanitizeSchemaValue(v)])
        );
    }
    return value;
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
}

/**
 * Updates document meta tags for SEO
 * Usage: <MetaTags title="Product Name" description="..." />
 */
export function MetaTags({
    title,
    description = "AQUAVO - معدات أحواض أصلية وبريميوم في العراق — توصيل لكل المحافظات",
    keywords = [],
    image = LOGO_URL,
    url,
    type = "website",
    price,
    currency = "IQD",
    canonicalUrl,
    noIndex = false,
}: MetaTagsProps) {
    useEffect(() => {
        // Update title - proper format for SEO
        const fullTitle = `${title} | AQUAVO - معدات أحواض أصلية | العراق`;
        document.title = fullTitle;

        // Helper to set meta tag
        const setMetaTag = (name: string, content: string, property = false) => {
            const attr = property ? "property" : "name";
            let meta = document.querySelector(`meta[${attr}="${name}"]`);
            if (!meta) {
                meta = document.createElement("meta");
                meta.setAttribute(attr, name);
                document.head.appendChild(meta);
            }
            meta.setAttribute("content", content);
        };

        // Helper to set link tag
        const setLinkTag = (rel: string, href: string) => {
            let link = document.querySelector(`link[rel="${rel}"]`);
            if (!link) {
                link = document.createElement("link");
                link.setAttribute("rel", rel);
                document.head.appendChild(link);
            }
            link.setAttribute("href", href);
        };

        // Basic meta tags
        setMetaTag("description", description.slice(0, 160)); // Limit to 160 chars
        setMetaTag("robots", noIndex ? "noindex, nofollow" : "index, follow");

        // Keywords (if provided)
        if (keywords.length > 0) {
            setMetaTag("keywords", keywords.slice(0, 7).join(", ")); // Limit to 7 keywords
        }

        // Canonical URL (important for duplicate content)
        const canonical = canonicalUrl || url || (typeof window !== "undefined" ? window.location.href : "");
        if (canonical) {
            setLinkTag("canonical", canonical);
        }

        // Open Graph
        setMetaTag("og:title", title, true);
        setMetaTag("og:description", description.slice(0, 200), true);
        setMetaTag("og:image", image, true);
        setMetaTag("og:image:alt", title, true);
        setMetaTag("og:type", type === "product" ? "product" : type === "article" ? "article" : "website", true);
        if (url) setMetaTag("og:url", url, true);
        setMetaTag("og:site_name", "AQUAVO", true);
        setMetaTag("og:locale", "ar_IQ", true);

        // Twitter Card
        setMetaTag("twitter:card", "summary_large_image");
        setMetaTag("twitter:title", title);
        setMetaTag("twitter:description", description.slice(0, 200));
        setMetaTag("twitter:image", image);
        setMetaTag("twitter:site", "@aquavoiq");

        // Product specific (for e-commerce)
        if (type === "product" && price) {
            setMetaTag("product:price:amount", price.toString(), true);
            setMetaTag("product:price:currency", currency, true);
        }

        // Cleanup not needed as we want tags to persist
    }, [title, description, keywords, image, url, type, price, currency, canonicalUrl, noIndex]);

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

/**
 * Schema.org structured data for products
 */
export function ProductSchema({
    name,
    description,
    image,
    price,
    currency = "IQD",
    brand,
    sku,
    rating,
    reviewCount,
    inStock = true,
    url,
    category,
}: ProductSchemaProps) {
    const schema = {
        "@context": "https://schema.org/",
        "@type": "Product",
        name,
        description,
        image: image ? (Array.isArray(image) ? image.filter(Boolean) : [image]).filter(Boolean) : undefined,
        brand: brand ? { "@type": "Brand", name: brand } : undefined,
        sku,
        category,
        offers: {
            "@type": "Offer",
            price,
            priceCurrency: currency,
            availability: inStock
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
            url: url || (typeof window !== "undefined" ? window.location.href : ""),
            seller: {
                "@type": "Organization",
                "@id": `${BASE_URL}/#organization`,
                "name": "AQUAVO",
                "url": BASE_URL
            },
            shippingDetails: {
                "@type": "OfferShippingDetails",
                shippingRate: {
                    "@type": "MonetaryAmount",
                    value: 5000,
                    currency: "IQD",
                },
                shippingDestination: {
                    "@type": "DefinedRegion",
                    addressCountry: "IQ",
                },
                deliveryTime: {
                    "@type": "ShippingDeliveryTime",
                    handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 1, unitCode: "DAY" },
                    transitTime: { "@type": "QuantitativeValue", maxValue: 1, unitCode: "DAY" },
                },
            },
        },
        aggregateRating:
            rating && reviewCount && reviewCount > 0
                ? {
                    "@type": "AggregateRating",
                    ratingValue: rating,
                    bestRating: 5,
                    worstRating: 1,
                    reviewCount: reviewCount,
                }
                : undefined,
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(sanitizeSchemaValue(schema)) }}
        />
    );
}

interface ReviewSchemaProps {
    reviews: {
        author: string;
        rating: number;
        comment: string;
        date: string;
    }[];
    productName: string;
}

/**
 * Schema.org structured data for reviews
 */
export function ReviewSchema({ reviews, productName }: ReviewSchemaProps) {
    if (reviews.length === 0) return null;

    const schemas = reviews.slice(0, 5).map((review) => ({
        "@context": "https://schema.org/",
        "@type": "Review",
        itemReviewed: {
            "@type": "Product",
            name: productName,
        },
        author: {
            "@type": "Person",
            name: review.author,
        },
        reviewRating: {
            "@type": "Rating",
            ratingValue: review.rating,
            bestRating: 5,
            worstRating: 1,
        },
        reviewBody: review.comment,
        datePublished: review.date,
    }));

    return (
        <>
            {schemas.map((schema) => (
                <script
                    key={`${schema.author.name}-${schema.datePublished}`}
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(sanitizeSchemaValue(schema)) }}
                />
            ))}
        </>
    );
}

/**
 * Schema.org structured data for organization
 * FIXED: Corrected URL from aquavo.iq → www.aquavoiq.com
 */
export function OrganizationSchema() {
    const schema = {
        "@context": "https://schema.org",
        "@type": "Organization",
        "@id": `${BASE_URL}/#organization`,
        name: "AQUAVO",
        alternateName: ["أكوافو", "AQUAVO Store", "AQUAVO Iraq"],
        url: BASE_URL,
        logo: {
            "@type": "ImageObject",
            url: LOGO_URL,
            width: 512,
            height: 512,
        },
        description: "متجر إلكتروني عراقي متخصص في مستلزمات ومعدات أحواض الزينة الأصلية. نوفر الفلاتر، السخانات، الأغذية، الديكورات، ومعالجات المياه. الدفع عند الاستلام مع توصيل لجميع محافظات العراق بـ 5,000 دينار.",
        areaServed: [
            {
                "@type": "Country",
                name: "Iraq",
                sameAs: "https://www.wikidata.org/wiki/Q796"
            }
        ],
        knowsAbout: [
            "مستلزمات أحواض الزينة",
            "معدات أحواض الزينة",
            "فلاتر الأحواض",
            "سخانات الأحواض",
            "معالجات المياه",
            "طعام أسماك الزينة",
            "ديكورات الأحواض"
        ],
        contactPoint: [
            {
                "@type": "ContactPoint",
                telephone: "+964-774-788-0673",
                contactType: "customer support",
                availableLanguage: ["Arabic"],
                areaServed: "IQ",
            }
        ],
        sameAs: [
            "https://www.facebook.com/profile.php?id=61587249730248",
            "https://instagram.com/aquavo_iq",
            "https://www.tiktok.com/@aquavo.iq",
        ],
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(sanitizeSchemaValue(schema)) }}
        />
    );
}

/**
 * Schema.org structured data for local business
 * FIXED: Removed conflicting opening hours (was 09-21 while site claims 24/7 support)
 * FIXED: Corrected URL from aquavo.iq → www.aquavoiq.com
 */
export function LocalBusinessSchema() {
    const schema = {
        "@context": "https://schema.org",
        "@type": "Store",
        "@id": `${BASE_URL}/#localbusiness`,
        name: "AQUAVO",
        image: LOGO_URL,
        url: BASE_URL,
        telephone: "+964-774-788-0673",
        priceRange: "$$",
        currenciesAccepted: "IQD",
        paymentAccepted: "Cash on Delivery",
        description: "متجر إلكتروني عراقي متخصص في معدات وإكسسوارات أحواض الأسماك. يخدم العراق بالكامل بتوصيل خلال 24 ساعة وبرسوم ثابتة 5,000 دينار عراقي.",
        address: {
            "@type": "PostalAddress",
            addressLocality: "بغداد",
            addressRegion: "Baghdad",
            addressCountry: "IQ",
        },
        geo: {
            "@type": "GeoCoordinates",
            latitude: 33.3128,
            longitude: 44.3615,
        },
        // Support is 24/7 — no restrictive hours listed to avoid contradiction
        openingHoursSpecification: [
            {
                "@type": "OpeningHoursSpecification",
                dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
                opens: "00:00",
                closes: "23:59",
            },
        ],
        hasMap: "https://maps.google.com/?q=Baghdad,Iraq",
        areaServed: {
            "@type": "Country",
            name: "Iraq"
        },
        sameAs: [
            "https://www.facebook.com/profile.php?id=61587249730248",
            "https://instagram.com/aquavo_iq",
            "https://www.tiktok.com/@aquavo.iq",
        ],
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(sanitizeSchemaValue(schema)) }}
        />
    );
}

/**
 * Schema.org structured data for breadcrumbs
 */
export function BreadcrumbSchema({
    items,
}: {
    items: { name: string; url: string }[];
}) {
    const schema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.name,
            item: item.url,
        })),
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(sanitizeSchemaValue(schema)) }}
        />
    );
}

/**
 * Schema.org structured data for FAQ
 */
export function FAQSchema({
    questions,
}: {
    questions: { question: string; answer: string }[];
}) {
    const schema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: questions.map((q) => ({
            "@type": "Question",
            name: q.question,
            acceptedAnswer: {
                "@type": "Answer",
                text: q.answer,
            },
        })),
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(sanitizeSchemaValue(schema)) }}
        />
    );
}

/**
 * Schema.org structured data for website search
 * FIXED: Corrected URL from aquavo.iq → www.aquavoiq.com
 * GEO/AEO 2026: Added speakable + potentialAction for voice/AI search
 */
export function WebsiteSchema() {
    const schema = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "@id": `${BASE_URL}/#website`,
        name: "AQUAVO",
        alternateName: "AQUAVO Store",
        url: BASE_URL,
        description: "أكبر متجر إلكتروني متخصص في معدات أحواض الأسماك في العراق — توصيل لكل المحافظات خلال 24 ساعة",
        inLanguage: "ar-IQ",
        potentialAction: {
            "@type": "SearchAction",
            target: {
                "@type": "EntryPoint",
                urlTemplate: `${BASE_URL}/search?q={search_term_string}`,
            },
            "query-input": "required name=search_term_string",
        },
        publisher: {
            "@id": `${BASE_URL}/#organization`,
        },
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(sanitizeSchemaValue(schema)) }}
        />
    );
}

/**
 * Schema.org structured data for article/blog
 */
export function ArticleSchema({
    title,
    description,
    image,
    datePublished,
    dateModified,
    author,
}: {
    title: string;
    description: string;
    image: string;
    datePublished: string;
    dateModified?: string;
    author: string;
}) {
    const schema = {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: title,
        description,
        image,
        datePublished,
        dateModified: dateModified || datePublished,
        author: {
            "@type": "Person",
            name: author,
        },
        publisher: {
            "@type": "Organization",
            name: "AQUAVO",
            url: BASE_URL,
            logo: {
                "@type": "ImageObject",
                url: LOGO_URL,
            },
        },
        mainEntityOfPage: {
            "@type": "WebPage",
            "@id": typeof window !== "undefined" ? window.location.href : BASE_URL,
        },
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(sanitizeSchemaValue(schema)) }}
        />
    );
}

// ─── NEW SCHEMAS FOR GEO/AEO 2026 ────────────────────────────────────────────

/**
 * VideoObject Schema — for hero videos and product demos
 * GEO 2026: Helps Google/AI index video content for AI Overviews
 */
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
    const schema = {
        "@context": "https://schema.org",
        "@type": "VideoObject",
        name,
        description,
        thumbnailUrl,
        uploadDate,
        contentUrl,
        duration,
        embedUrl,
        publisher: {
            "@type": "Organization",
            name: "AQUAVO",
            logo: {
                "@type": "ImageObject",
                url: LOGO_URL,
            },
        },
        inLanguage: "ar",
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(sanitizeSchemaValue(schema)) }}
        />
    );
}

/**
 * ItemList Schema — for product category / product listing pages
 * GEO/AEO 2026: Helps AI engines understand product catalogs and provide shopping recommendations
 */
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
    const schema = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name,
        description,
        url: url || (typeof window !== "undefined" ? window.location.href : BASE_URL),
        numberOfItems: items.length,
        itemListElement: items.map((item, idx) => ({
            "@type": "ListItem",
            position: item.position ?? idx + 1,
            name: item.name,
            url: item.url,
            image: item.image,
            description: item.description,
        })),
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(sanitizeSchemaValue(schema)) }}
        />
    );
}

/**
 * HowTo Schema — for setup guides, tutorials, and step-by-step content
 * GEO/AEO 2026: AI Overviews and voice search heavily favour HowTo structured content
 */
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
    totalTime?: string; // ISO 8601 e.g. "PT1H30M"
    estimatedCost?: { currency: string; value: string };
    supply?: string[];
    steps: {
        name: string;
        text: string;
        image?: string;
        url?: string;
    }[];
}) {
    const schema = {
        "@context": "https://schema.org",
        "@type": "HowTo",
        name,
        description,
        image: image || LOGO_URL,
        totalTime,
        estimatedCost: estimatedCost ? {
            "@type": "MonetaryAmount",
            currency: estimatedCost.currency,
            value: estimatedCost.value,
        } : undefined,
        supply: supply?.map(s => ({ "@type": "HowToSupply", name: s })),
        step: steps.map((step, idx) => ({
            "@type": "HowToStep",
            position: idx + 1,
            name: step.name,
            text: step.text,
            image: step.image,
            url: step.url,
        })),
        publisher: {
            "@type": "Organization",
            name: "AQUAVO",
            url: BASE_URL,
        },
        inLanguage: "ar",
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(sanitizeSchemaValue(schema)) }}
        />
    );
}

/**
 * SpeakableSpecification Schema — for voice search / AI audio responses
 * GEO 2026: Marks which page sections are most suitable for text-to-speech AI
 */
export function SpeakableSchema({ cssSelectors }: { cssSelectors: string[] }) {
    const schema = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        speakable: {
            "@type": "SpeakableSpecification",
            cssSelector: cssSelectors,
        },
        url: typeof window !== "undefined" ? window.location.href : BASE_URL,
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(sanitizeSchemaValue(schema)) }}
        />
    );
}

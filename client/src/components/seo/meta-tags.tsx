import { useEffect } from "react";
import DOMPurify from 'isomorphic-dompurify';

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
    description = "AQUAVO - وجهتك الأولى لمعدات وتقنيات أحواض الأسماك المتطورة في العراق",
    keywords = [],
    image = "https://aquavo.iq/logo_aquavo.png",
    url,
    type = "website",
    price,
    currency = "IQD",
    canonicalUrl,
    noIndex = false,
}: MetaTagsProps) {
    useEffect(() => {
        // Update title - proper format for SEO
        const fullTitle = `${title} | AQUAVO - تكنولوجيا الحياة المائية`;
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
        image: Array.isArray(image) ? image : [image],
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
                name: "AQUAVO",
            },
            priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
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
            {schemas.map((schema, index) => (
                <script
                    key={index}
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(sanitizeSchemaValue(schema)) }}
                />
            ))}
        </>
    );
}

/**
 * Schema.org structured data for organization
 */
export function OrganizationSchema() {
    const schema = {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "AQUAVO",
        alternateName: "AQUAVO Store",
        url: "https://aquavo.iq",
        logo: "https://aquavo.iq/logo_aquavo.png",
        description: "أفضل منصة لمعدات وتقنيات أحواض الأسماك في العراق",
        contactPoint: {
            "@type": "ContactPoint",
            telephone: "+964-770-000-0000",
            contactType: "customer service",
            availableLanguage: ["Arabic", "English"],
            areaServed: "IQ",
        },
        sameAs: [
            "https://facebook.com/aquavoiq",
            "https://instagram.com/aquavoiq",
            "https://twitter.com/aquavoiq",
        ],
        address: {
            "@type": "PostalAddress",
            addressLocality: "Baghdad",
            addressCountry: "IQ",
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
 * Schema.org structured data for local business
 */
export function LocalBusinessSchema() {
    const schema = {
        "@context": "https://schema.org",
        "@type": "Store",
        name: "AQUAVO",
        image: "https://aquavo.iq/logo_aquavo.png",
        "@id": "https://aquavo.iq",
        url: "https://aquavo.iq",
        telephone: "+964-770-000-0000",
        priceRange: "$$",
        address: {
            "@type": "PostalAddress",
            streetAddress: "شارع المنصور",
            addressLocality: "بغداد",
            addressCountry: "IQ",
        },
        geo: {
            "@type": "GeoCoordinates",
            latitude: 33.3128,
            longitude: 44.3615,
        },
        openingHoursSpecification: [
            {
                "@type": "OpeningHoursSpecification",
                dayOfWeek: ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"],
                opens: "09:00",
                closes: "21:00",
            },
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
 */
export function WebsiteSchema() {
    const schema = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "AQUAVO",
        alternateName: "AQUAVO Store",
        url: "https://aquavo.iq",
        potentialAction: {
            "@type": "SearchAction",
            target: {
                "@type": "EntryPoint",
                urlTemplate: "https://aquavo.iq/search?q={search_term_string}",
            },
            "query-input": "required name=search_term_string",
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
            logo: {
                "@type": "ImageObject",
                url: "https://aquavo.iq/logo_aquavo.png",
            },
        },
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(sanitizeSchemaValue(schema)) }}
        />
    );
}

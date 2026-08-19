import "../server/suppress.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { HTML_TEMPLATE } from "./_html-template.js";
import { injectMeta, type PageMeta } from "./ssr-meta.js";

neonConfig.webSocketConstructor = ws;

const CANONICAL_ORIGIN = "https://www.aquavoiq.com";
const CANONICAL_HOST = "www.aquavoiq.com";
const DEFAULT_IMAGE = `${CANONICAL_ORIGIN}/brand/aquavo-v2-horizontal.png`;

let pool: Pool | null = null;
function getPool(): Pool {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL unavailable for blog SSR");
  if (!pool) pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return pool;
}

function firstHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function originalRequestUrl(req: VercelRequest): string {
  return (
    firstHeader(req.headers["x-invoke-path"]) ||
    firstHeader(req.headers["x-vercel-original-url"]) ||
    firstHeader(req.headers["x-original-url"]) ||
    firstHeader(req.headers["x-forwarded-uri"]) ||
    req.url ||
    "/"
  );
}

function requestHost(req: VercelRequest): string {
  const raw = firstHeader(req.headers["x-forwarded-host"]) || firstHeader(req.headers.host) || "";
  return raw.split(",", 1)[0].trim().split(":", 1)[0].toLowerCase();
}

function blogSlugFromRequest(req: VercelRequest): { slug: string; path: string } | null {
  const raw = originalRequestUrl(req);
  const url = raw.startsWith("http://") || raw.startsWith("https://")
    ? new URL(raw)
    : new URL(raw, CANONICAL_ORIGIN);
  const pathname = url.pathname.replace(/\/+$/, "");
  const match = pathname.match(/^\/blog\/([^/]+)$/);
  if (!match) return null;

  try {
    const slug = decodeURIComponent(match[1]).trim();
    if (!slug || slug.includes("/")) return null;
    return { slug, path: pathname };
  } catch {
    return null;
  }
}

function sendNotFound(res: VercelResponse): void {
  res.setHeader("X-Robots-Tag", "noindex, follow");
  res.setHeader("Cache-Control", "public, s-maxage=60");
  res.status(404).setHeader("Content-Type", "text/html; charset=utf-8");
  res.send("<!doctype html><html lang=\"ar\" dir=\"rtl\"><head><meta charset=\"utf-8\"><meta name=\"robots\" content=\"noindex, follow\"><title>المقال غير موجود | AQUAVO</title></head><body><h1>المقال غير موجود</h1></body></html>");
}

function absoluteImage(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return DEFAULT_IMAGE;
  const image = value.trim();
  if (/^https?:\/\//i.test(image)) return image;
  return `${CANONICAL_ORIGIN}${image.startsWith("/") ? "" : "/"}${image}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const resolved = blogSlugFromRequest(req);
  if (!resolved) {
    sendNotFound(res);
    return;
  }

  try {
    const { rows } = await getPool().query(
      `SELECT title, excerpt, content, author,
              image_url AS "imageUrl",
              published_at AS "publishedAt",
              updated_at AS "updatedAt"
         FROM blog_posts
        WHERE slug = $1
          AND is_published = TRUE
        LIMIT 1`,
      [resolved.slug],
    );

    if (rows.length === 0) {
      sendNotFound(res);
      return;
    }

    const post = rows[0];
    const canonicalUrl = `${CANONICAL_ORIGIN}${resolved.path}`;
    const image = absoluteImage(post.imageUrl);
    const datePublished = post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined;
    const dateModified = post.updatedAt ? new Date(post.updatedAt).toISOString() : datePublished;
    const wordCount = typeof post.content === "string"
      ? post.content.trim().split(/\s+/).filter(Boolean).length
      : undefined;
    const description = (post.excerpt || post.title || "مقال من مدونة AQUAVO").trim();

    const meta: PageMeta & { url: string; image: string } = {
      title: `${post.title} | مدونة AQUAVO`,
      description,
      ogType: "article",
      url: canonicalUrl,
      image,
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: post.title,
          description,
          image,
          author: { "@type": "Person", name: post.author || "AQUAVO" },
          publisher: {
            "@type": "Organization",
            name: "AQUAVO",
            logo: { "@type": "ImageObject", url: DEFAULT_IMAGE },
          },
          datePublished,
          dateModified,
          wordCount,
          inLanguage: "ar",
          mainEntityOfPage: { "@type": "WebPage", "@id": canonicalUrl },
          isPartOf: { "@type": "WebSite", name: "AQUAVO", url: CANONICAL_ORIGIN },
        },
        {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "الرئيسية", item: CANONICAL_ORIGIN },
            { "@type": "ListItem", position: 2, name: "المدونة", item: `${CANONICAL_ORIGIN}/blog` },
            { "@type": "ListItem", position: 3, name: post.title, item: canonicalUrl },
          ],
        },
      ],
    };

    const productionCanonical = process.env.VERCEL_ENV === "production" && requestHost(req) === CANONICAL_HOST;
    res.setHeader(
      "X-Robots-Tag",
      productionCanonical
        ? "index, follow, max-image-preview:large"
        : "noindex, nofollow, noarchive",
    );
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader(
      "Cache-Control",
      productionCanonical
        ? "public, s-maxage=300, stale-while-revalidate=3600"
        : "private, no-store",
    );
    res.status(200).send(injectMeta(HTML_TEMPLATE, meta));
  } catch (error) {
    console.error("[blog-ssr] published article lookup failed", error);
    res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
    res.setHeader("Cache-Control", "private, no-store");
    res.status(500).send("Server Error");
  }
}

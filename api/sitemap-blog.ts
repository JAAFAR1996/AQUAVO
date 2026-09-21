import "../server/suppress.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { AQUAVO_BASE_URL } from "../shared/seo-contract.js";

neonConfig.webSocketConstructor = ws;

const BLOG_SITEMAP_LAST_MODIFIED_HEADER = "Wed, 19 Aug 2026 00:00:00 GMT";

let pool: Pool | null = null;
function getPool(): Pool {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL unavailable for blog sitemap");
  if (!pool) pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return pool;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * A blog image URL Google can actually fetch.
 *
 * 80 of the 81 published posts store an absolute Cloudinary URL; one stores a
 * site-relative path. An <image:loc> has to be absolute, so the relative one is
 * anchored to the canonical host rather than dropped.
 */
function absoluteUrl(value: string): string {
  return /^https?:[/][/]/i.test(value)
    ? value
    : `${AQUAVO_BASE_URL}${value.startsWith("/") ? "" : "/"}${value}`;
}

function validDate(value: unknown): Date | null {
  if (!value) return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
}

function effectiveLastmod(
  publishedAtValue: unknown,
  updatedAtValue: unknown,
  createdAtValue: unknown,
): string | null {
  const publishedAt = validDate(publishedAtValue);
  const updatedAt = validDate(updatedAtValue);
  const createdAt = validDate(createdAtValue);
  const candidates = [publishedAt, updatedAt, createdAt].filter((value): value is Date => value !== null);
  if (candidates.length === 0) return null;
  const latest = candidates.reduce((max, value) => (value > max ? value : max));
  return latest.toISOString().slice(0, 10);
}

export default async function handler(_req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    const { rows } = await getPool().query(
      `SELECT slug,
              title,
              image_url AS "imageUrl",
              published_at AS "publishedAt",
              updated_at AS "updatedAt",
              created_at AS "createdAt"
         FROM blog_posts
        WHERE is_published = TRUE
          AND slug IS NOT NULL
          AND btrim(slug) <> ''
        ORDER BY COALESCE(updated_at, published_at, created_at) DESC NULLS LAST
        LIMIT 50000`,
    );

    const entries = rows
      .filter((post) => typeof post.slug === "string" && post.slug.trim().length > 0 && !post.slug.includes("/"))
      .map((post) => {
        const slug = encodeURIComponent(post.slug.trim());
        const lastmod = effectiveLastmod(post.publishedAt, post.updatedAt, post.createdAt);
        const lastmodXml = lastmod ? `<lastmod>${lastmod}</lastmod>` : "";
        // Every published post carries a hero image the site already serves.
        // sitemap-products.xml has declared its 342 photographs for a while,
        // but the blog corpus published none, so none of it was ever offered
        // to Google Images. Declaring it widens what is published; it invents
        // nothing. A post without a usable image emits no <image:image>.
        const rawImage = typeof post.imageUrl === "string" ? post.imageUrl.trim() : "";
        const imageXml = rawImage
          ? `
    <image:image><image:loc>${escapeXml(absoluteUrl(rawImage))}</image:loc><image:title>${escapeXml(
              String(post.title || "AQUAVO"),
            )}</image:title></image:image>
  `
          : "";
        return `  <url><loc>${escapeXml(`${AQUAVO_BASE_URL}/blog/${slug}`)}</loc>${lastmodXml}${imageXml}</url>`;
      })
      .join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
 xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${entries}\n</urlset>`;

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    res.setHeader("Last-Modified", BLOG_SITEMAP_LAST_MODIFIED_HEADER);
    res.status(200).send(xml);
  } catch (error) {
    console.error("[sitemap-blog] generation failed", error);
    res.setHeader("Cache-Control", "private, no-store");
    res.status(500).send("Error generating blog sitemap");
  }
}

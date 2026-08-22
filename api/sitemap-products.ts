import "../server/suppress.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import {
  AQUAVO_BASE_URL,
  AQUAVO_SEO_RELEASE_LASTMOD,
} from "../shared/seo-contract.js";

neonConfig.webSocketConstructor = ws;

let pool: Pool | null = null;
function getPool(): Pool {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL unavailable for product sitemap");
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

function absoluteUrl(value: string): string {
  return /^https?:\/\//i.test(value)
    ? value
    : `${AQUAVO_BASE_URL}${value.startsWith("/") ? "" : "/"}${value}`;
}

function primaryImage(images: unknown, thumbnail: unknown): string | undefined {
  if (typeof thumbnail === "string" && thumbnail.trim()) return absoluteUrl(thumbnail.trim());
  if (!Array.isArray(images)) return undefined;
  const candidate = images.find((image) => typeof image === "string" && image.trim().length > 0);
  return typeof candidate === "string" ? absoluteUrl(candidate.trim()) : undefined;
}

function effectiveLastmod(updatedAtValue: unknown): string {
  const releaseDate = new Date(`${AQUAVO_SEO_RELEASE_LASTMOD}T00:00:00.000Z`);
  const updatedAt = updatedAtValue ? new Date(String(updatedAtValue)) : null;
  const effective = updatedAt && !Number.isNaN(updatedAt.valueOf()) && updatedAt > releaseDate
    ? updatedAt
    : releaseDate;
  return effective.toISOString().slice(0, 10);
}

export default async function handler(_req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    const { rows } = await getPool().query(
      `SELECT slug, name, images, thumbnail, updated_at AS "updatedAt"
         FROM products
        WHERE deleted_at IS NULL
          AND COALESCE(is_storefront_visible, true) = true
          AND slug IS NOT NULL
          AND slug <> ''
        ORDER BY updated_at DESC NULLS LAST, name ASC
        LIMIT 50000`,
    );

    const entries = rows
      .filter((product) => typeof product.slug === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(product.slug))
      .map((product) => {
        // The semantic product template changed for every product on the SEO
        // release date. Use the newer of the product record and that release so
        // crawlers are truthfully told to revisit pages that previously exposed
        // client-side error text or incomplete HTML.
        const lastmod = effectiveLastmod(product.updatedAt);
        const imageUrl = primaryImage(product.images, product.thumbnail);
        const image = imageUrl
          ? `\n    <image:image><image:loc>${escapeXml(imageUrl)}</image:loc><image:title>${escapeXml(String(product.name || "AQUAVO product"))}</image:title></image:image>`
          : "";
        return `  <url><loc>${escapeXml(`${AQUAVO_BASE_URL}/products/${product.slug}`)}</loc><lastmod>${lastmod}</lastmod>${image}\n  </url>`;
      })
      .join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
 xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${entries}
</urlset>`;

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    res.setHeader("Last-Modified", "Tue, 04 Aug 2026 00:00:00 GMT");
    res.status(200).send(xml);
  } catch (error) {
    console.error("[sitemap-products] generation failed", error);
    res.setHeader("Cache-Control", "private, no-store");
    res.status(500).send("Error generating product sitemap");
  }
}

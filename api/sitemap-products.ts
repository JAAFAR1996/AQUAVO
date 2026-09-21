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

/**
 * Every real photograph a product has, thumbnail first, deduplicated.
 *
 * This used to return only one image per product. The catalogue holds 342 real
 * photographs across 112 products and `Product.image` had been advertising all
 * of them, so 230 pictures the site already serves were never offered to Google
 * Images. Declaring the rest widens what is published; it invents nothing.
 *
 * Google caps a sitemap at 1000 images per URL. The richest product carries 7,
 * so no cap is applied here — a limit that can never bind is a limit that only
 * misleads the next reader.
 */
function productImageUrls(images: unknown, thumbnail: unknown): string[] {
  const candidates: unknown[] = [thumbnail, ...(Array.isArray(images) ? images : [])];
  const urls = candidates
    .filter((image): image is string => typeof image === "string" && image.trim().length > 0)
    .map((image) => absoluteUrl(image.trim()));
  return [...new Set(urls)];
}

/**
 * A product's real last-modified date.
 *
 * This used to floor the value at `AQUAVO_SEO_RELEASE_LASTMOD`, returning the
 * release date whenever a product's own `updated_at` was older. Every product
 * in the catalogue predates the current release constant, so all 112 URLs
 * published the identical stamp while the rows actually held three distinct
 * real dates (2026-08-22 x105, 08-23 x6, 08-24 x1). The floor was not adding
 * information, it was discarding it — and a `lastmod` that is uniform across
 * an entire sitemap is one Google is entitled to start ignoring.
 *
 * The product's own timestamp is used whenever it exists. The release date
 * stays as the fallback for a row with no usable `updated_at`, which is the
 * only case where there is genuinely nothing better to say.
 */
function effectiveLastmod(updatedAtValue: unknown): string {
  const updatedAt = updatedAtValue ? new Date(String(updatedAtValue)) : null;
  if (updatedAt && !Number.isNaN(updatedAt.valueOf())) {
    return updatedAt.toISOString().slice(0, 10);
  }
  return AQUAVO_SEO_RELEASE_LASTMOD;
}

export default async function handler(_req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    const { rows } = await getPool().query(
      `SELECT slug, name, images, thumbnail, updated_at AS "updatedAt"
         FROM products
        WHERE deleted_at IS NULL
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
        const title = escapeXml(String(product.name || "AQUAVO product"));
        const image = productImageUrls(product.images, product.thumbnail)
          .map(
            (imageUrl) =>
              `\n    <image:image><image:loc>${escapeXml(imageUrl)}</image:loc><image:title>${title}</image:title></image:image>`,
          )
          .join("");
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

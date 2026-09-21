import "../server/suppress.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import {
  canonicalProductCategory,
  categoryProductsPath,
  PUBLIC_INDEXABLE_PATHS,
} from "../shared/seo-contract.js";
import { ALL_LOCALES, XHTML_NS, localizedUrlEntries } from "./_sitemap-i18n.js";
import { PAGES_SITEMAP_RELEASE_LASTMOD } from "./sitemap-index.js";

neonConfig.webSocketConstructor = ws;

let pool: Pool | null = null;
function getPool(): Pool | null {
  if (!process.env.DATABASE_URL) return null;
  if (!pool) pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return pool;
}

export function categoryPathsFromRows(rows: Array<{ category?: unknown }>): string[] {
  const seen = new Set<string>();
  return rows
    .map((row) => canonicalProductCategory(String(row.category ?? "")))
    .filter((value): value is string => Boolean(value))
    .map(categoryProductsPath)
    .filter((path) => (seen.has(path) ? false : (seen.add(path), true)));
}

async function liveCategoryPaths(): Promise<string[]> {
  const db = getPool();
  if (!db) return [];
  try {
    const { rows } = await db.query(
      `SELECT category
         FROM products
        WHERE deleted_at IS NULL
          AND category IS NOT NULL
          AND BTRIM(category) <> ''
        GROUP BY category
        HAVING COUNT(*) > 0
        ORDER BY category`,
    );
    return categoryPathsFromRows(rows);
  } catch (error) {
    // Static URLs are still valid if Neon has a temporary outage. Omitting
    // category URLs is safer than advertising an empty/nonexistent listing.
    console.error("[sitemap-pages] category lookup failed", error);
    return [];
  }
}

export function renderPagesSitemap(categoryPaths: string[]): string {
  const seen = new Set<string>();
  const entries = [...PUBLIC_INDEXABLE_PATHS, ...categoryPaths]
    .filter((path) => (seen.has(path) ? false : (seen.add(path), true)))
    .map((path) =>
      localizedUrlEntries(
        path,
        ALL_LOCALES,
        `<lastmod>${PAGES_SITEMAP_RELEASE_LASTMOD}</lastmod>`,
      ),
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ${XHTML_NS}>
${entries}
</urlset>`;
}

export default async function handler(_req: VercelRequest, res: VercelResponse): Promise<void> {
  // Category listings are included only while at least one live product belongs
  // to that category. This prevents an empty catalogue category from entering
  // the sitemap and then returning 404 to crawlers.
  const categoryPaths = await liveCategoryPaths();
  const xml = renderPagesSitemap(categoryPaths);

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  res.status(200).send(xml);
}

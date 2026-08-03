import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  AQUAVO_BASE_URL,
  AQUAVO_SEO_RELEASE_LASTMOD,
} from "../shared/seo-contract.js";

export default function handler(_req: VercelRequest, res: VercelResponse): void {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>${AQUAVO_BASE_URL}/sitemap-pages.xml</loc><lastmod>${AQUAVO_SEO_RELEASE_LASTMOD}</lastmod></sitemap>
  <sitemap><loc>${AQUAVO_BASE_URL}/sitemap-products.xml</loc><lastmod>${AQUAVO_SEO_RELEASE_LASTMOD}</lastmod></sitemap>
  <sitemap><loc>${AQUAVO_BASE_URL}/sitemap-guides.xml</loc><lastmod>${AQUAVO_SEO_RELEASE_LASTMOD}</lastmod></sitemap>
</sitemapindex>`;

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  res.status(200).send(xml);
}

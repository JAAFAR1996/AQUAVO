import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  AQUAVO_BASE_URL,
  AQUAVO_SEO_RELEASE_LASTMOD,
} from "../shared/seo-contract.js";

// sitemap-blog.xml last changed on 2026-08-27, when 81 <image:image> entries
// were added to it. Google reads this stamp to decide whether to refetch a
// child sitemap, so leaving it at the previous date advertised "nothing has
// changed" over the release that published the entire blog image corpus.
// sitemap-index-agreement.test.ts pins this against client/public/sitemap.xml,
// which is the copy Vercel actually serves.
export const BLOG_SITEMAP_RELEASE_LASTMOD = "2026-08-27";

export default function handler(_req: VercelRequest, res: VercelResponse): void {
  // sitemap-recovery.xml is deliberately absent. It was submitted during an
  // indexing-recovery push and holds six URLs: /, /shipping, /faq, one product
  // and two guides. Every one is now covered by sitemap-pages, sitemap-products
  // or sitemap-guides — verified URL by URL — so listing it here resubmitted
  // the same pages under a second sitemap carrying a staler stamp than the
  // sitemaps that actually own them. The file is still served, so anything
  // Google already fetched stays resolvable; it is only no longer advertised.
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>${AQUAVO_BASE_URL}/sitemap-pages.xml</loc><lastmod>${AQUAVO_SEO_RELEASE_LASTMOD}</lastmod></sitemap>
  <sitemap><loc>${AQUAVO_BASE_URL}/sitemap-products.xml</loc><lastmod>${AQUAVO_SEO_RELEASE_LASTMOD}</lastmod></sitemap>
  <sitemap><loc>${AQUAVO_BASE_URL}/sitemap-guides.xml</loc><lastmod>${AQUAVO_SEO_RELEASE_LASTMOD}</lastmod></sitemap>
  <sitemap><loc>${AQUAVO_BASE_URL}/sitemap-blog.xml</loc><lastmod>${BLOG_SITEMAP_RELEASE_LASTMOD}</lastmod></sitemap>
</sitemapindex>`;

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  res.setHeader("Last-Modified", "Thu, 27 Aug 2026 00:00:00 GMT");
  res.status(200).send(xml);
}

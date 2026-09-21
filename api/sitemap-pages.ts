import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  AQUAVO_BASE_URL,
  PUBLIC_INDEXABLE_CATEGORY_PATHS,
  PUBLIC_INDEXABLE_PATHS,
} from "../shared/seo-contract.js";
import { ALL_LOCALES, XHTML_NS, localizedUrlEntries } from "./_sitemap-i18n.js";
import { PAGES_SITEMAP_RELEASE_LASTMOD } from "./sitemap-index.js";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export default function handler(_req: VercelRequest, res: VercelResponse): void {
  // The eleven category listings are appended rather than merged into
  // PUBLIC_INDEXABLE_PATHS: that list is matched against pathnames and these
  // carry a query string. Both halves arrive already canonical —
  // categoryProductsPath percent-encodes exactly once, producing the same
  // spelling the category page emits as its own <link rel="canonical"> — so a
  // page cannot enter this file twice under two encodings. The dedupe below
  // enforces that rather than assuming it.
  const seen = new Set<string>();
  const entries = [...PUBLIC_INDEXABLE_PATHS, ...PUBLIC_INDEXABLE_CATEGORY_PATHS]
    .filter((path) => (seen.has(path) ? false : (seen.add(path), true)))
    // Every static page exists in all three languages (api/_static-meta-i18n.ts
    // carries the copy), so each is listed once per locale with reciprocal
    // hreflang annotations.
    .map((path) => localizedUrlEntries(path, ALL_LOCALES, `<lastmod>${PAGES_SITEMAP_RELEASE_LASTMOD}</lastmod>`))
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ${XHTML_NS}>
${entries}
</urlset>`;

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  res.status(200).send(xml);
}

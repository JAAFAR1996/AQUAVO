import type { VercelRequest, VercelResponse } from "@vercel/node";
import { canonicalGuidePaths } from "./_canonical-guides.js";
import {
  AQUAVO_BASE_URL,
  AQUAVO_SEO_RELEASE_LASTMOD,
} from "../shared/seo-contract.js";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export default function handler(_req: VercelRequest, res: VercelResponse): void {
  const entries = canonicalGuidePaths()
    .map((path) => `  <url><loc>${escapeXml(`${AQUAVO_BASE_URL}${path}`)}</loc><lastmod>${AQUAVO_SEO_RELEASE_LASTMOD}</lastmod></url>`)
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>`;

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  res.status(200).send(xml);
}

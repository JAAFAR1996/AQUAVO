import type { VercelRequest, VercelResponse } from "@vercel/node";
import { AQUAVO_BASE_URL } from "../shared/seo-contract.js";

const ROBOTS = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/
Disallow: /checkout
Disallow: /cart
Disallow: /profile
Disallow: /login
Disallow: /register
Disallow: /forgot-password
Disallow: /reset-password
Disallow: /order-confirmation/
Disallow: /invoice/
Disallow: /search
Disallow: /wishlist
Disallow: /compare

Sitemap: ${AQUAVO_BASE_URL}/sitemap.xml
`;

export default function handler(_req: VercelRequest, res: VercelResponse): void {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  res.status(200).send(ROBOTS);
}

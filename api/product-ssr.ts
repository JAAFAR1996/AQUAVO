import "../server/suppress.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import stableSsrHandler from "./ssr-meta.js";

neonConfig.webSocketConstructor = ws;

const CANONICAL_ORIGIN = "https://www.aquavoiq.com";
const CANONICAL_HOST = "www.aquavoiq.com";

let pool: Pool | null = null;
function getPool(): Pool {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL unavailable for product SSR");
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

function productSlugFromRequest(req: VercelRequest): { slug: string; url: string } | null {
  const raw = originalRequestUrl(req);
  const url = raw.startsWith("http://") || raw.startsWith("https://")
    ? new URL(raw)
    : new URL(raw, CANONICAL_ORIGIN);
  const pathname = url.pathname.replace(/\/+$/, "");
  const match = pathname.match(/^\/products\/([^/]+)$/);
  if (!match) return null;

  try {
    const slug = decodeURIComponent(match[1]).trim();
    if (!slug || slug.includes("/")) return null;
    return { slug, url: `${pathname}${url.search}` };
  } catch {
    return null;
  }
}

function sendNotFound(res: VercelResponse): void {
  res.setHeader("X-Robots-Tag", "noindex, follow");
  res.setHeader("Cache-Control", "public, s-maxage=60");
  res.status(404).setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(
    "<!doctype html><html lang=\"ar\" dir=\"rtl\"><head><meta charset=\"utf-8\"><meta name=\"robots\" content=\"noindex, follow\"><title>المنتج غير موجود | AQUAVO</title></head><body><h1>المنتج غير موجود</h1></body></html>",
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const resolved = productSlugFromRequest(req);
  if (!resolved) {
    sendNotFound(res);
    return;
  }

  try {
    const { rows } = await getPool().query(
      `SELECT 1
         FROM products
        WHERE slug = $1
          AND deleted_at IS NULL
        LIMIT 1`,
      [resolved.slug],
    );

    if (rows.length === 0) {
      sendNotFound(res);
      return;
    }

    const productionCanonical = process.env.VERCEL_ENV === "production" && requestHost(req) === CANONICAL_HOST;
    res.setHeader(
      "X-Robots-Tag",
      productionCanonical
        ? "index, follow, max-image-preview:large"
        : "noindex, nofollow, noarchive",
    );

    // Vercel rewrites replace req.url with the function path. Restore the public
    // product URL so the stable SSR handler resolves the correct product metadata.
    const rewrittenUrl = req.url;
    req.url = resolved.url;
    try {
      await Promise.resolve(stableSsrHandler(req, res));
    } finally {
      req.url = rewrittenUrl;
    }
  } catch (error) {
    console.error("[product-ssr] product existence lookup failed", error);
    res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
    res.setHeader("Cache-Control", "private, no-store");
    res.status(500).send("Server Error");
  }
}

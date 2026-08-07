// AUTO-GENERATED production entry — source is bundled by script/build.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import semanticRuntime from "../generated/ssr-preview-runtime.js";

const CANONICAL_ORIGIN = "https://www.aquavoiq.com";
const SEO_RELEASE_LAST_MODIFIED = "Tue, 04 Aug 2026 00:00:00 GMT";

function requestHost(req: VercelRequest): string {
  const forwarded = req.headers["x-forwarded-host"];
  const raw = Array.isArray(forwarded)
    ? forwarded[0]
    : forwarded || (Array.isArray(req.headers.host) ? req.headers.host[0] : req.headers.host) || "";
  return raw.split(",", 1)[0].trim().split(":", 1)[0].toLowerCase();
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const host = requestHost(req);
  if (process.env.VERCEL_ENV === "production" && host && host !== "www.aquavoiq.com") {
    const destination = new URL(req.url || "/", CANONICAL_ORIGIN);
    res.setHeader("Location", destination.toString());
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("X-Robots-Tag", "noindex, follow");
    res.status(308).end();
    return;
  }

  if (process.env.VERCEL_ENV === "production") {
    res.setHeader("Last-Modified", SEO_RELEASE_LAST_MODIFIED);
  }
  await semanticRuntime(req, res);
}

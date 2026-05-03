import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const PRECOMPRESSED_EXTENSIONS = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".svg",
  ".txt",
  ".wasm",
  ".xml",
]);

const IMAGE_EXTENSIONS_WITH_WEBP_FALLBACK = new Set([".jpg", ".jpeg", ".png"]);
const PRODUCTS_LCP_IMAGE = "/images/products/yee/yee-c1-1082-2a/yee_c1_1082_2a_1.card.webp";
const CRITICAL_HOME_SHELL = `<section class="critical-home-shell" aria-hidden="true"><div class="critical-home-card"><img src="/images/aquascape-styles/iwagumi_aquascape_1765676307763.webp" alt="" fetchpriority="high" decoding="sync" width="1200" height="800"><div class="critical-home-copy"><h1>&#1581;&#1608;&#1604; &#1581;&#1608;&#1590;&#1603; &#1573;&#1604;&#1609; &#1578;&#1581;&#1601;&#1577; &#1601;&#1606;&#1610;&#1577;.</h1></div></div></section>`;
const CRITICAL_PRODUCTS_SHELL = `<section class="critical-products-shell" aria-hidden="true"><div class="critical-products-header"><h1>&#1580;&#1605;&#1610;&#1593; &#1575;&#1604;&#1605;&#1606;&#1578;&#1580;&#1575;&#1578;</h1><p>&#1578;&#1589;&#1601;&#1581; &#1605;&#1580;&#1605;&#1608;&#1593;&#1578;&#1606;&#1575; &#1575;&#1604;&#1603;&#1575;&#1605;&#1604;&#1577;</p></div><div class="critical-products-grid"><article class="critical-product-card"><div class="critical-product-image"><img src="${PRODUCTS_LCP_IMAGE}" alt="" fetchpriority="high" decoding="sync" width="400" height="400"></div><div class="critical-product-title">&#1593;&#1604;&#1601; &#1588;&#1575;&#1605;&#1604; &#8212; &#1581;&#1576;&#1610;&#1576;&#1575;&#1578; &#1583;&#1602;&#1610;&#1602;&#1577;</div></article></div></section>`;
const ENTRY_SCRIPT_RE = /<script type="module"([^>]*?)src="(\/entries\/[^"]+\.js)"([^>]*)><\/script>\n?/;

function resolveStaticAssetPath(root: string, requestPath: string) {
  try {
    const decodedPath = decodeURIComponent(requestPath);
    const resolvedPath = path.resolve(root, `.${decodedPath}`);
    const normalizedRoot = path.resolve(root);

    if (resolvedPath !== normalizedRoot && !resolvedPath.startsWith(`${normalizedRoot}${path.sep}`)) {
      return null;
    }

    return resolvedPath;
  } catch {
    return null;
  }
}

function setCacheHeaders(res: express.Response, requestPath: string) {
  if (
    requestPath.startsWith("/assets/") ||
    requestPath.startsWith("/chunks/") ||
    requestPath.startsWith("/entries/")
  ) {
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    return;
  }

  res.setHeader("Cache-Control", "public, max-age=604800");
}

function deferEntryScriptForProducts(html: string) {
  let entrySrc = "";
  let result = html.replace(ENTRY_SCRIPT_RE, (_tag, _before, src: string) => {
    entrySrc = src;
    return "";
  });

  if (!entrySrc) return html;

  const loader = `<script src="/defer-products-entry.js" data-entry="${entrySrc}" defer></script>`;
  result = result.replace("</body>", `${loader}\n</body>`);
  return result;
}

function renderLocalFallbackHtml(template: string, requestPath: string) {
  const cleanPath = requestPath.replace(/\/+$/, "") || "/";
  let html = template
    .replace(/__META_TITLE__/g, "AQUAVO - تكنولوجيا الحياة المائية")
    .replace(/__META_DESCRIPTION__/g, "AQUAVO - متجر مستلزمات أحواض الأسماك والحياة المائية في العراق")
    .replace(/__META_KEYWORDS__/g, "AQUAVO, aquariums, fish, Iraq")
    .replace(/__META_URL__/g, "http://localhost:5000/")
    .replace(/__META_IMAGE__/g, "/logo_aquavo.png")
    .replace(/__META_OG_TYPE__/g, "website")
    .replace(/__JSON_LD__/g, "");

  if (cleanPath === "/products") {
    html = html.replace(
      /<link rel="preload" as="image"[^>]*iwagumi[^>]*>\n?/,
      `<link rel="preload" as="image" type="image/webp" href="${PRODUCTS_LCP_IMAGE}" fetchpriority="high">\n`
    );
    html = html.replace(
      /<link rel="stylesheet"([^>]*?)href="(\/assets\/[^"]+\.css)"([^>]*)>/,
      (_tag, before, href, after) => `<link rel="stylesheet"${before}href="${href}"${after} media="print" data-app-css>`
    );
    html = html.replace('<div id="root"></div>', `${CRITICAL_PRODUCTS_SHELL}<div id="root"></div>`);
    html = deferEntryScriptForProducts(html);
  } else if (cleanPath !== "/" && cleanPath !== "/ar") {
    html = html.replace(/<link rel="preload" as="image"[^>]*iwagumi[^>]*>\n?/g, "");
  }

  if (cleanPath === "/" || cleanPath === "/ar") {
    html = html.replace(
      /<link rel="stylesheet"([^>]*?)href="(\/assets\/[^"]+\.css)"([^>]*)>/,
      (_tag, before, href, after) => `<link rel="stylesheet"${before}href="${href}"${after} media="print" data-app-css>`
    );
    html = html.replace('<div id="root"></div>', `${CRITICAL_HOME_SHELL}<div id="root"></div>`);
  }

  return html;
}

export function serveStatic(app: Express) {
  // Get the directory of the current file (works in bundled ESM)
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // In production, we're running from dist/index.js, so public is in dist/public
  const distPath = path.resolve(__dirname, "public");

  console.log(`[Static] Looking for public files at: ${distPath}`);

  if (!fs.existsSync(distPath)) {
    console.error(`[Static] Could not find the build directory: ${distPath}`);
    // Don't throw, just serve a basic error page
    app.use("*", (_req, res) => {
      res.status(500).send("Build directory not found. Please run 'pnpm run build'.");
    });
    return;
  }

  console.log(`[Static] Serving static files from: ${distPath}`);

  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();

    const assetPath = resolveStaticAssetPath(distPath, req.path);
    if (!assetPath) return next();

    const ext = path.extname(assetPath).toLowerCase();

    if (IMAGE_EXTENSIONS_WITH_WEBP_FALLBACK.has(ext) && req.headers.accept?.includes("image/webp")) {
      const webpPath = assetPath.replace(/\.(jpe?g|png)$/i, ".webp");
      if (fs.existsSync(webpPath)) {
        res.type("webp");
        res.setHeader("Vary", "Accept");
        setCacheHeaders(res, req.path);
        return res.sendFile(webpPath);
      }
    }

    if (!PRECOMPRESSED_EXTENSIONS.has(ext)) return next();

    const acceptedEncodings = req.headers["accept-encoding"] || "";
    const candidates = String(acceptedEncodings).includes("br")
      ? [{ path: `${assetPath}.br`, encoding: "br" }, { path: `${assetPath}.gz`, encoding: "gzip" }]
      : String(acceptedEncodings).includes("gzip")
        ? [{ path: `${assetPath}.gz`, encoding: "gzip" }]
        : [];

    for (const candidate of candidates) {
      if (!fs.existsSync(candidate.path)) continue;
      res.type(ext);
      res.setHeader("Content-Encoding", candidate.encoding);
      res.setHeader("Vary", "Accept-Encoding");
      setCacheHeaders(res, req.path);
      return res.sendFile(candidate.path);
    }

    return next();
  });

  // Hashed assets (JS/CSS chunks) - cache forever (immutable)
  app.use("/assets", express.static(path.join(distPath, "assets"), {
    maxAge: "1y",
    immutable: true,
  }));

  // Non-hashed static files (images, fonts, manifest) - cache with revalidation
  app.use(express.static(distPath, {
    maxAge: "7d",
    etag: true,
    lastModified: true,
  }));

  // fall through to index.html if the file doesn't exist (SPA routing)
  // Check ssr-template first (build moves index.html there for SSR meta injection)
  const ssrTemplatePath = path.resolve(__dirname, "ssr-template", "index.html");
  const publicIndexPath = path.resolve(distPath, "index.html");
  const indexPath = fs.existsSync(publicIndexPath) ? publicIndexPath : ssrTemplatePath;

  app.use((req, res, next) => {
    if (path.extname(req.path)) {
      res.status(404).send("Not found");
      return;
    }

    next();
  });

  app.use("*", (req, res) => {
    res.setHeader("Cache-Control", "no-cache");
    const requestPath = (req.originalUrl || req.url || req.path || "/").split("?")[0] || "/";
    fs.readFile(indexPath, "utf8", (error, template) => {
      if (error) {
        res.status(500).send("Unable to load application shell.");
        return;
      }

      res.type("html").send(renderLocalFallbackHtml(template, requestPath));
    });
  });
}

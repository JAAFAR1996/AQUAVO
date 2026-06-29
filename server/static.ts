import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { generateSsrMeta } from "./ssr-meta.js";

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
const CRITICAL_HOME_SHELL = `<section class="critical-home-shell" aria-hidden="true"><div class="critical-home-card"><img src="/images/aquascape-styles/iwagumi_aquascape_1765676307763.webp" alt="" fetchpriority="high" decoding="sync" width="1200" height="800"><div class="critical-home-copy"><h1>&#1581;&#1608;&#1604; &#1581;&#1608;&#1590;&#1603; &#1573;&#1604;&#1609; &#1578;&#1581;&#1601;&#1577; &#1601;&#1606;&#1610;&#1577;.</h1></div></div></section>`;

/**
 * SSR_NAV_SHELL — injected into every page's server HTML before React mounts.
 * Visually hidden (1×1px, opacity:0, pointer-events:none) so users never see it.
 * Crawlers (Googlebot, Ahrefs, ClaudeBot, GPTBot) parse it as real HTML links.
 * React replaces #root contents on hydration — zero visual conflict.
 */
const SSR_NAV_SHELL = `<nav id="ssr-nav-shell" aria-hidden="true" style="position:absolute;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;clip:rect(0,0,0,0);white-space:nowrap;">
  <a href="/">AQUAVO &#1575;&#1604;&#1585;&#1574;&#1610;&#1587;&#1610;&#1577;</a>
  <a href="/products">&#1575;&#1604;&#1605;&#1606;&#1578;&#1580;&#1575;&#1578;</a>
  <a href="/deals">&#1575;&#1604;&#1593;&#1585;&#1608;&#1590;</a>
  <a href="/blog">&#1575;&#1604;&#1605;&#1583;&#1608;&#1606;&#1577;</a>
  <a href="/faq">&#1575;&#1604;&#1571;&#1587;&#1574;&#1604;&#1577; &#1575;&#1604;&#1588;&#1575;&#1574;&#1593;&#1577;</a>
  <a href="/shipping">&#1575;&#1604;&#1578;&#1608;&#1589;&#1610;&#1604;</a>
  <a href="/return-policy">&#1587;&#1610;&#1575;&#1587;&#1577; &#1575;&#1604;&#1573;&#1585;&#1580;&#1575;&#1593;</a>
  <a href="/about">&#1593;&#1606; AQUAVO</a>
  <a href="/why-aquavo">&#1604;&#1605;&#1575;&#1584;&#1575; AQUAVO</a>
  <a href="/beginner-guide">&#1583;&#1604;&#1610;&#1604; &#1575;&#1604;&#1605;&#1576;&#1578;&#1583;&#1574;&#1610;&#1606;</a>
  <a href="/calculators">&#1575;&#1604;&#1581;&#1575;&#1587;&#1576;&#1575;&#1578;</a>
  <a href="/fish-encyclopedia">&#1605;&#1608;&#1587;&#1608;&#1593;&#1577; &#1575;&#1604;&#1571;&#1587;&#1605;&#1575;&#1603;</a>
  <a href="/journey">&#1585;&#1581;&#1604;&#1578;&#1603;</a>
  <a href="/sustainability">&#1575;&#1604;&#1575;&#1587;&#1578;&#1583;&#1575;&#1605;&#1577;</a>
  <a href="/order-tracking">&#1578;&#1578;&#1576;&#1593; &#1575;&#1604;&#1591;&#1604;&#1576;</a>
  <a href="/guides/new-aquarium-setup-iraq">&#1578;&#1580;&#1607;&#1610;&#1586; &#1581;&#1608;&#1590; &#1587;&#1605;&#1603; &#1580;&#1583;&#1610;&#1583;</a>
  <a href="/guides/aquarium-water-test-guide">&#1601;&#1581;&#1589; &#1605;&#1575;&#1569; &#1575;&#1604;&#1581;&#1608;&#1590;</a>
  <a href="/guides/aquarium-decor-stones-guide">&#1583;&#1610;&#1603;&#1608;&#1585; &#1575;&#1604;&#1581;&#1608;&#1590;</a>
  <a href="/guides/heater-choice">&#1575;&#1582;&#1578;&#1610;&#1575;&#1585; &#1575;&#1604;&#1587;&#1582;&#1575;&#1606;</a>
  <a href="/guides/filter-choice">&#1575;&#1582;&#1578;&#1610;&#1575;&#1585; &#1575;&#1604;&#1601;&#1604;&#1578;&#1585;</a>
  <a href="/guides/algae-control">&#1605;&#1603;&#1575;&#1601;&#1581;&#1577; &#1575;&#1604;&#1591;&#1581;&#1575;&#1604;&#1576;</a>
  <a href="/guides/water-change-schedule">&#1580;&#1583;&#1608;&#1604; &#1578;&#1594;&#1610;&#1610;&#1585; &#1575;&#1604;&#1605;&#1575;&#1569;</a>
  <a href="/guides/feeding-table">&#1580;&#1583;&#1608;&#1604; &#1575;&#1604;&#1578;&#1594;&#1584;&#1610;&#1577;</a>
  <a href="/guides/quarantine">&#1575;&#1604;&#1581;&#1580;&#1585; &#1575;&#1604;&#1589;&#1581;&#1610;</a>
  <a href="/guides/aquarium-salt">&#1605;&#1604;&#1581; &#1575;&#1604;&#1581;&#1608;&#1590;</a>
  <a href="/guides/treatment-basics">&#1571;&#1587;&#1575;&#1587;&#1610;&#1575;&#1578; &#1575;&#1604;&#1593;&#1604;&#1575;&#1580;</a>
  <a href="/guides/tank-rescue-plan">&#1573;&#1606;&#1602;&#1575;&#1584; &#1575;&#1604;&#1581;&#1608;&#1590;</a>
  <a href="/guides/white-scale">&#1575;&#1604;&#1578;&#1585;&#1587;&#1576;&#1575;&#1578; &#1575;&#1604;&#1576;&#1610;&#1590;&#1575;&#1569;</a>
  <a href="/guides/temperature-guide">&#1583;&#1604;&#1610;&#1604; &#1575;&#1604;&#1581;&#1585;&#1575;&#1585;&#1577;</a>
  <a href="/guides/filter-media">&#1571;&#1608;&#1587;&#1575;&#1591; &#1575;&#1604;&#1578;&#1585;&#1588;&#1610;&#1581;</a>
  <a href="/guides/happy-fish-signs">&#1593;&#1604;&#1575;&#1605;&#1575;&#1578; &#1575;&#1604;&#1587;&#1605;&#1603; &#1575;&#1604;&#1587;&#1593;&#1610;&#1583;</a>
  <a href="/guides/fish-hiding">&#1575;&#1582;&#1578;&#1576;&#1575;&#1569; &#1575;&#1604;&#1587;&#1605;&#1603;</a>
  <a href="/guides/water-myths">&#1582;&#1585;&#1575;&#1601;&#1575;&#1578; &#1575;&#1604;&#1605;&#1575;&#1569;</a>
  <a href="/guides/essential-tools">&#1575;&#1604;&#1571;&#1583;&#1608;&#1575;&#1578; &#1575;&#1604;&#1571;&#1587;&#1575;&#1587;&#1610;&#1577;</a>
  <a href="/guides/eco-friendly">&#1575;&#1604;&#1593;&#1606;&#1575;&#1610;&#1577; &#1575;&#1604;&#1576;&#1610;&#1574;&#1610;&#1577;</a>
  <a href="/guides/aquarium-salt">&#1605;&#1604;&#1581; &#1575;&#1604;&#1581;&#1608;&#1590;</a>
</nav>`;

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

export function renderLocalFallbackHtml(template: string, requestPath: string) {
  let html = template
    .replace(/__META_TITLE__/g, "AQUAVO - تكنولوجيا الحياة المائية")
    .replace(/__META_DESCRIPTION__/g, "AQUAVO - متجر مستلزمات أحواض الأسماك والحياة المائية في العراق")
    .replace(/__META_KEYWORDS__/g, "AQUAVO, aquariums, fish, Iraq")
    .replace(/__META_URL__/g, "http://localhost:5000/")
    .replace(/__META_IMAGE__/g, "/logo_aquavo.png")
    .replace(/__META_OG_TYPE__/g, "website")
    .replace(/__JSON_LD__/g, generateSsrMeta(requestPath));

  // Inject SSR nav shell on EVERY page (crawlable links, visually hidden)
  html = html.replace('<div id="root" dir="rtl"></div>', `${SSR_NAV_SHELL}<div id="root" dir="rtl"></div>`);
  // Fallback: if root div has no dir attribute (dev/template variants)
  if (!html.includes(SSR_NAV_SHELL)) {
    html = html.replace('<div id="root"></div>', `${SSR_NAV_SHELL}<div id="root"></div>`);
  }

  if (requestPath === "/" || requestPath === "/ar") {
    html = html.replace(
      /<link rel="stylesheet"([^>]*?)href="(\/assets\/[^"]+\.css)"([^>]*)>/,
      (_tag, before, href, after) => `<link rel="stylesheet"${before}href="${href}"${after} media="print" data-app-css>`
    );
    // At this point SSR_NAV_SHELL is already before #root. Insert CRITICAL_HOME_SHELL between them.
    html = html.replace(
      `${SSR_NAV_SHELL}<div id="root" dir="rtl"></div>`,
      `${SSR_NAV_SHELL}${CRITICAL_HOME_SHELL}<div id="root" dir="rtl"></div>`
    );
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
      // Try exact .webp first, then .card.webp (generated by image pipeline)
      const webpPath = assetPath.replace(/\.(jpe?g|png)$/i, ".webp");
      const cardWebpPath = assetPath.replace(/\.(jpe?g|png)$/i, ".card.webp");
      const match = fs.existsSync(webpPath) ? webpPath : fs.existsSync(cardWebpPath) ? cardWebpPath : null;
      if (match) {
        res.type("webp");
        res.setHeader("Vary", "Accept");
        setCacheHeaders(res, req.path);
        return res.sendFile(match);
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
    fs.readFile(indexPath, "utf8", (error, template) => {
      if (error) {
        res.status(500).send("Unable to load application shell.");
        return;
      }

      res.type("html").send(renderLocalFallbackHtml(template, req.path));
    });
  });
}

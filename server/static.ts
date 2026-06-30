import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { generateSsrMeta } from "./ssr-meta.js";
import {
  GUIDE_CONTENT_PAGES,
  renderGuideHtml,
  renderGuidesIndexHtml,
  renderHomeGuidesSection,
  renderImportantInternalLinksSection,
  shouldRenderImportantInternalLinks,
} from "../api/_guides-content.js";
import { getSeoMetaOverride, renderAhrefsSsrContentSection } from "../api/_seo-content.js";

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
const CRITICAL_HOME_SHELL = `<section class="critical-home-shell" aria-hidden="true"><div class="critical-home-card"><img src="/images/aquascape-styles/iwagumi_aquascape_1765676307763.webp" alt="حوض زينة بتصميم مائي من AQUAVO" fetchpriority="high" decoding="sync" width="1200" height="800"><div class="critical-home-copy"><h1>&#1581;&#1608;&#1604; &#1581;&#1608;&#1590;&#1603; &#1573;&#1604;&#1609; &#1578;&#1581;&#1601;&#1577; &#1601;&#1606;&#1610;&#1577;.</h1></div></div></section>`;

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


// ─── Per-page meta map ───────────────────────────────────────────────────────
// Controls <title>, <meta description>, <link canonical>, og:url for every path.
// Falls back to generic AQUAVO values for unregistered paths.
interface PageMeta {
  title: string;
  description: string;
  url: string;
  ogType?: string;
}

const BASE_SITE = "https://www.aquavoiq.com";

function getPageMeta(requestPath: string): PageMeta {
  const cleanPath = requestPath.replace(/\/+$/, "") || "/";
  const seoOverride = getSeoMetaOverride(cleanPath);
  const map: Record<string, PageMeta> = {
    "/guides/new-aquarium-setup-iraq": {
      title: "تجهيز حوض سمك جديد خطوة بخطوة في العراق | AQUAVO",
      description: "دليل عملي لتجهيز أول حوض سمك: اختيار الفلتر والسخان، تهيئة الماء، الدورة البايولوجية، وإضافة السمك بأمان. منتجات متوفرة مع توصيل لكل العراق.",
      url: `${BASE_SITE}/guides/new-aquarium-setup-iraq`,
    },
    "/guides/aquarium-water-test-guide": {
      title: "دليل فحص ماء حوض السمك: الأمونيا، pH، النتريت | AQUAVO",
      description: "دليل كامل لشرائط فحص ماء الحوض: القراءات الآمنة للأمونيا والنتريت والنترات وpH وشنو تسوي إذا ارتفعت. أدوات الفحص متوفرة مع توصيل لكل العراق.",
      url: `${BASE_SITE}/guides/aquarium-water-test-guide`,
    },
    "/guides/aquarium-decor-stones-guide": {
      title: "دليل ديكور وأحجار أحواض الزينة في العراق | AQUAVO",
      description: "دليل عملي لاختيار ديكور وأحجار آمنة لأحواض الزينة في العراق: شنو الحجر الآمن، هل الحجر يغير pH، شلون تغسل الديكور قبل الاستخدام، والفرق بين الديكور الطبيعي والصناعي.",
      url: `${BASE_SITE}/guides/aquarium-decor-stones-guide`,
    },
    "/guides/heater-choice": {
      title: "كيف تختار سخان الحوض المناسب | AQUAVO",
      description: "دليل اختيار سخان حوض الزينة حسب حجم الحوض وليترات الماء. سخانات أصلية متوفرة مع توصيل لكل العراق.",
      url: `${BASE_SITE}/guides/heater-choice`,
    },
    "/guides/filter-choice": {
      title: "كيف تختار فلتر الحوض المناسب | AQUAVO",
      description: "دليل اختيار فلتر حوض الزينة: الفرق بين الفلتر الداخلي والخارجي والإسفنجي. فلاتر أصلية متوفرة مع توصيل لكل العراق.",
      url: `${BASE_SITE}/guides/filter-choice`,
    },
    "/beginner-guide": {
      title: "دليل المبتدئين لتربية الأسماك في العراق | AQUAVO",
      description: "كل ما تحتاج لتربية أسماك الزينة من الصفر: المعدات، الماء، التغذية، والعناية اليومية. AQUAVO متجر معدات أحواض الزينة في العراق.",
      url: `${BASE_SITE}/beginner-guide`,
    },
  };

  const meta = map[cleanPath];
  if (meta) {
    return {
      ...meta,
      ...(seoOverride ?? {}),
    };
  }

  return {
    title: seoOverride?.title || "AQUAVO — مستلزمات أحواض الزينة في العراق | فلاتر، سخانات، أغذية",
    description: seoOverride?.description || "AQUAVO متجر عراقي لمعدات ومستلزمات أحواض الزينة: فلاتر، سخانات، أغذية، ديكور ومعالجات مياه، مع توصيل لكل العراق ودفع عند الاستلام.",
    url: `${BASE_SITE}${requestPath}`,
  };
}


export function renderLocalFallbackHtml(template: string, requestPath: string) {
  const cleanPath = requestPath.replace(/\/+$/, "") || "/";
  const defaultImage = `${BASE_SITE}/logo_aquavo.png`;
  if (cleanPath === "/guides") {
    return renderGuidesIndexHtml(BASE_SITE, defaultImage);
  }

  const guidePage = GUIDE_CONTENT_PAGES[cleanPath];
  if (guidePage) {
    return renderGuideHtml(cleanPath, guidePage, BASE_SITE, defaultImage);
  }

  const meta = getPageMeta(requestPath);

  let html = template
    .replace(/__META_TITLE__/g, meta.title)
    .replace(/__META_DESCRIPTION__/g, meta.description)
    .replace(/__META_KEYWORDS__/g, "مستلزمات أحواض الزينة العراق، AQUAVO، فلاتر، سخانات، أغذية أسماك")
    .replace(/__META_URL__/g, meta.url)
    .replace(/__META_IMAGE__/g, "/logo_aquavo.png")
    .replace(/__META_OG_TYPE__/g, meta.ogType ?? "website")
    .replace(/__JSON_LD__/g, generateSsrMeta(requestPath));

  // Fix canonical tag — static.ts used localhost; now uses real URL
  html = html.replace(
    /<link rel="canonical" href="[^"]*"\s*\/>/,
    `<link rel="canonical" href="${meta.url}" />`
  );

  const ahrefsSeoShell = renderAhrefsSsrContentSection(requestPath);
  const importantLinksShell = shouldRenderImportantInternalLinks(requestPath)
    ? renderImportantInternalLinksSection()
    : "";

  if (requestPath === "/" || requestPath === "/ar") {
    html = html.replace(
      /<link rel="stylesheet"([^>]*?)href="(\/assets\/[^"]+\.css)"([^>]*)>/,
      (_tag, before, href, after) => `<link rel="stylesheet"${before}href="${href}"${after} media="print" data-app-css>`
    );
    html = html.replace(
      /<div id="root"[^>]*><\/div>/,
      (rootDiv) => `${CRITICAL_HOME_SHELL}${rootDiv}${renderHomeGuidesSection(BASE_SITE)}${importantLinksShell}`
    );
  } else if (ahrefsSeoShell || importantLinksShell) {
    html = html.replace(
      /<div id="root"[^>]*><\/div>/,
      (rootDiv) => `${rootDiv}${ahrefsSeoShell}${importantLinksShell}`
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

  app.get(/^\/guides\/5-mistakes\/$/, (_req, res) => {
    res.redirect(301, "/guides/5-mistakes");
  });

  app.get(["/guides", "/guides/"], (_req, res) => {
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.type("html").send(renderGuidesIndexHtml(BASE_SITE, `${BASE_SITE}/logo_aquavo.png`));
  });

  const guideRoutes = Object.keys(GUIDE_CONTENT_PAGES).flatMap((guidePath) => [
    guidePath,
    `${guidePath}/`,
  ]);

  app.get(guideRoutes, (req, res, next) => {
    const cleanPath = req.path.replace(/\/+$/, "") || "/";
    const guidePage = GUIDE_CONTENT_PAGES[cleanPath];
    if (!guidePage) return next();

    res.setHeader("Cache-Control", "public, max-age=3600");
    res.type("html").send(renderGuideHtml(cleanPath, guidePage, BASE_SITE, `${BASE_SITE}/logo_aquavo.png`));
  });

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

      const requestPath = (req.originalUrl || req.url || req.path).split("?")[0] || "/";
      res.type("html").send(renderLocalFallbackHtml(template, requestPath));
    });
  });
}

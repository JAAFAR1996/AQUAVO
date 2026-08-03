import {
  GUIDE_CONTENT_PAGES,
  renderGuideHtml,
  renderGuideMarkdown,
  type GuidePage,
} from "./_guides-content.js";
import { canonicalProductCategory } from "../shared/seo-contract.js";

const GUIDE_ROUTE_ALIASES: Record<string, string> = {
  "/guides/aquarium-filter-guide": "/guides/filter-choice",
  "/guides/aquarium-heater-guide": "/guides/heater-choice",
  "/guides/beginner-aquarium-mistakes": "/guides/5-mistakes",
  "/guides-filter-choice": "/guides/filter-choice",
  "/guides-filter-media-guide": "/guides/filter-media",
  "/guides-heater-choice": "/guides/heater-choice",
};

const CANONICAL_SOURCE_FALLBACKS: Record<string, string[]> = {
  "/guides/filter-choice": ["/guides/filter-choice", "/guides/aquarium-filter-guide"],
  "/guides/heater-choice": ["/guides/heater-choice", "/guides/aquarium-heater-guide"],
  "/guides/5-mistakes": ["/guides/5-mistakes", "/guides/beginner-aquarium-mistakes"],
};

function cleanPath(pathname: string): string {
  return pathname.split(/[?#]/, 1)[0].replace(/\/+$/, "") || "/";
}

export function canonicalGuidePath(pathname: string): string {
  const clean = cleanPath(pathname);
  return GUIDE_ROUTE_ALIASES[clean] || clean;
}

function normalizeHref(href: string): string {
  const [path, query = ""] = href.split("?", 2);
  const canonicalPath = GUIDE_ROUTE_ALIASES[path] || path;
  if (!query) return canonicalPath;

  const params = new URLSearchParams(query);
  const category = params.get("category");
  if (category) params.set("category", canonicalProductCategory(category) || category);
  const normalized = params.toString();
  return normalized ? `${canonicalPath}?${normalized}` : canonicalPath;
}

function canonicalizePage(page: GuidePage, canonicalPath: string): GuidePage {
  return {
    ...page,
    links: page.links.map((link) => ({ ...link, href: normalizeHref(link.href) })),
    cta: { ...page.cta, href: normalizeHref(page.cta.href) },
    breadcrumb: page.breadcrumb.map((item, index) => ({
      ...item,
      href: index === page.breadcrumb.length - 1 ? canonicalPath : normalizeHref(item.href),
    })),
  };
}

export function resolveGuidePage(pathname: string): { canonicalPath: string; page: GuidePage } | null {
  const canonicalPath = canonicalGuidePath(pathname);
  const candidates = CANONICAL_SOURCE_FALLBACKS[canonicalPath] || [canonicalPath];
  for (const candidate of candidates) {
    const page = GUIDE_CONTENT_PAGES[candidate];
    if (page) return { canonicalPath, page: canonicalizePage(page, canonicalPath) };
  }
  return null;
}

export function canonicalGuidePaths(): string[] {
  const paths = new Set<string>();
  for (const path of Object.keys(GUIDE_CONTENT_PAGES)) paths.add(canonicalGuidePath(path));
  for (const path of Object.keys(CANONICAL_SOURCE_FALLBACKS)) {
    if (resolveGuidePage(path)) paths.add(path);
  }
  return [...paths].filter((path) => path.startsWith("/guides/")).sort();
}

export function renderCanonicalGuideHtml(
  canonicalPath: string,
  page: GuidePage,
  baseUrl: string,
  defaultImage: string,
): string {
  return renderGuideHtml(canonicalPath, canonicalizePage(page, canonicalPath), baseUrl, defaultImage);
}

export function renderCanonicalGuideMarkdown(
  canonicalPath: string,
  page: GuidePage,
  baseUrl: string,
): string {
  return renderGuideMarkdown(canonicalPath, canonicalizePage(page, canonicalPath), baseUrl);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderCanonicalGuidesIndexHtml(baseUrl: string, defaultImage: string): string {
  const entries = canonicalGuidePaths()
    .map((path) => {
      const resolved = resolveGuidePage(path);
      return resolved ? { path, page: resolved.page } : null;
    })
    .filter((entry): entry is { path: string; page: GuidePage } => Boolean(entry));

  const cards = entries.map(({ path, page }) => `
    <article>
      <h2><a href="${escapeHtml(path)}">${escapeHtml(page.h1)}</a></h2>
      <p>${escapeHtml(page.answer)}</p>
    </article>`).join("");

  const itemList = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "أدلة AQUAVO لأحواض الزينة",
    url: `${baseUrl}/guides`,
    inLanguage: "ar-IQ",
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: entries.length,
      itemListElement: entries.map(({ path, page }, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: page.h1,
        url: `${baseUrl}${path}`,
      })),
    },
  };

  return `<!doctype html>
<html lang="ar" dir="rtl"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>أدلة أحواض الزينة بالعربي | AQUAVO</title>
<meta name="description" content="أدلة عملية بالعربي عن تجهيز الحوض والفلاتر والسخانات وفحص الماء والصيانة والعناية بأسماك الزينة.">
<link rel="canonical" href="${baseUrl}/guides">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta property="og:title" content="أدلة أحواض الزينة بالعربي | AQUAVO">
<meta property="og:description" content="أدلة عملية قابلة للقراءة والاقتباس عن أحواض الزينة في العراق.">
<meta property="og:url" content="${baseUrl}/guides"><meta property="og:image" content="${defaultImage}">
<script type="application/ld+json">${JSON.stringify(itemList).replace(/</g, "\\u003c")}</script>
<style>body{font-family:Cairo,Tahoma,sans-serif;background:#0B1E28;color:#fff;line-height:1.8;margin:0;padding:32px}main{max-width:1080px;margin:auto}a{color:#67d7e5}section{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}article{border:1px solid #34505b;padding:18px;border-radius:10px;background:#102a35}h1{font-size:clamp(32px,5vw,56px)}</style>
</head><body><main><nav><a href="/">الرئيسية</a> / الأدلة</nav><h1>أدلة AQUAVO لأحواض الزينة</h1><p>إجابات عملية تبدأ بالخلاصة ثم تشرح الخطوات والتحذيرات والاختيارات المناسبة.</p><section>${cards}</section></main></body></html>`;
}

export function renderCanonicalGuidesIndexMarkdown(baseUrl: string): string {
  const lines = ["# أدلة AQUAVO لأحواض الزينة", "", "إجابات عملية بالعربي عن تجهيز الحوض والعناية والمعدات.", ""];
  for (const path of canonicalGuidePaths()) {
    const resolved = resolveGuidePage(path);
    if (resolved) lines.push(`- [${resolved.page.h1}](${baseUrl}${path}) — ${resolved.page.answer}`);
  }
  return lines.join("\n");
}

import fs from "node:fs/promises";
import path from "node:path";

const base = (process.env.AUDIT_BASE_URL || "https://www.aquavoiq.com").replace(/\/$/, "");
const maxUrls = Number(process.env.AUDIT_MAX_URLS || 500);
const concurrency = Math.max(1, Number(process.env.AUDIT_CONCURRENCY || 8));
const outputDir = path.resolve(process.env.AUDIT_OUTPUT_DIR || "artifacts/seo-production-360");
const auditUserAgent =
  process.env.AUDIT_USER_AGENT ||
  "Mozilla/5.0 (compatible; SiteAuditBot/0.97; +https://www.semrush.com/bot.html)";

const critical = [];
const warnings = [];
const pages = [];

function addCritical(code, url, detail) {
  critical.push({ code, url, detail });
}

function addWarning(code, url, detail) {
  warnings.push({ code, url, detail });
}

function xmlLocations(xml) {
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((match) => match[1].trim());
}

function htmlTitle(html) {
  return html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim() || "";
}

function attributeValue(tag, attribute) {
  const quoted = tag.match(new RegExp(`${attribute}\\s*=\\s*["']([^"']*)["']`, "i"));
  return quoted?.[1]?.trim() || "";
}

function findTag(html, tagName, predicate) {
  const pattern = new RegExp(`<${tagName}\\b[^>]*>`, "gi");
  for (const match of html.matchAll(pattern)) {
    if (predicate(match[0])) return match[0];
  }
  return "";
}

function metaContent(html, name) {
  const tag = findTag(
    html,
    "meta",
    (candidate) => attributeValue(candidate, "name").toLowerCase() === name.toLowerCase(),
  );
  return attributeValue(tag, "content");
}

function canonicalHref(html) {
  const tag = findTag(html, "link", (candidate) => {
    const rel = attributeValue(candidate, "rel").toLowerCase().split(/\s+/);
    return rel.includes("canonical");
  });
  return attributeValue(tag, "href");
}

function jsonLdBlocks(html, url) {
  const blocks = [];
  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(match[1]);
      blocks.push(...(Array.isArray(parsed) ? parsed : [parsed]));
    } catch (error) {
      addCritical("invalid-json-ld", url, error instanceof Error ? error.message : String(error));
    }
  }
  return blocks;
}

function normalizeCanonical(url) {
  const parsed = new URL(url);
  parsed.hash = "";
  parsed.search = "";
  if (parsed.pathname !== "/") parsed.pathname = parsed.pathname.replace(/\/$/, "");
  return parsed.toString();
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 25_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "user-agent": auditUserAgent,
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        ...(options.headers || {}),
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function waitForSemanticCrawlerParity() {
  const attempts = Number(process.env.AUDIT_WAIT_ATTEMPTS || 30);
  const delayMs = Number(process.env.AUDIT_WAIT_DELAY_MS || 20_000);
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetchWithTimeout(`${base}/`, { cache: "no-store" });
      const html = await response.text();
      if (
        response.status === 200 &&
        response.headers.get("x-aquavo-ssr-mode") === "semantic-v3" &&
        /id=["']seo-root["']/i.test(html) &&
        /<h1\b/i.test(html)
      ) {
        return;
      }
    } catch {
      // Deployment may still be switching aliases. Retry until the bounded wait expires.
    }
    if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  throw new Error("Production did not expose semantic-v3 HTML to SiteAuditBot within the wait window");
}

async function discoverSitemapUrls() {
  const indexResponse = await fetchWithTimeout(`${base}/sitemap.xml`, {
    headers: { accept: "application/xml,text/xml;q=0.9,*/*;q=0.8" },
  });
  const indexXml = await indexResponse.text();
  if (indexResponse.status !== 200) {
    throw new Error(`/sitemap.xml returned ${indexResponse.status}`);
  }
  const childSitemaps = xmlLocations(indexXml).filter((url) => url.endsWith(".xml"));
  if (!childSitemaps.some((url) => url.endsWith("/sitemap-recovery.xml"))) {
    addCritical("missing-recovery-sitemap", `${base}/sitemap.xml`, "Recovery sitemap is not advertised");
  }

  const discovered = [];
  for (const sitemapUrl of childSitemaps) {
    const response = await fetchWithTimeout(sitemapUrl, {
      headers: { accept: "application/xml,text/xml;q=0.9,*/*;q=0.8" },
    });
    const xml = await response.text();
    if (response.status !== 200) {
      addCritical("sitemap-http-error", sitemapUrl, `HTTP ${response.status}`);
      continue;
    }
    discovered.push(...xmlLocations(xml).filter((url) => !url.endsWith(".xml")));
  }

  return [...new Set(discovered)]
    .filter((url) => url.startsWith(`${base}/`) || url === `${base}/` || url === base)
    .slice(0, maxUrls);
}

async function auditPage(url) {
  let response;
  let html;
  try {
    response = await fetchWithTimeout(url, { redirect: "follow", cache: "no-store" });
    html = await response.text();
  } catch (error) {
    addCritical("request-failed", url, error instanceof Error ? error.message : String(error));
    return;
  }

  const contentType = response.headers.get("content-type") || "";
  const title = htmlTitle(html);
  const description = metaContent(html, "description");
  const canonical = canonicalHref(html);
  const metaRobots = metaContent(html, "robots").toLowerCase();
  const headerRobots = (response.headers.get("x-robots-tag") || "").toLowerCase();
  const h1Count = (html.match(/<h1\b/gi) || []).length;
  const anchorCount = (html.match(/<a\b[^>]*href=/gi) || []).length;
  const schemas = jsonLdBlocks(html, url);

  const record = {
    url,
    status: response.status,
    finalUrl: response.url,
    contentType,
    title,
    titleLength: [...title].length,
    description,
    descriptionLength: [...description].length,
    canonical,
    h1Count,
    anchorCount,
    schemaTypes: schemas.map((schema) => schema?.["@type"]).flat().filter(Boolean),
    bytes: Buffer.byteLength(html),
    ssrMode: response.headers.get("x-aquavo-ssr-mode") || "",
  };
  pages.push(record);

  if (response.status !== 200) addCritical("indexable-http-error", url, `HTTP ${response.status}`);
  if (!contentType.includes("text/html")) addCritical("wrong-content-type", url, contentType || "missing");
  if (!title) addCritical("missing-title", url, "No <title> in initial HTML");
  if (!description) addCritical("missing-description", url, "No meta description in initial HTML");
  if (!canonical) addCritical("missing-canonical", url, "No canonical in initial HTML");
  if (h1Count === 0) addCritical("missing-h1", url, "No H1 in initial HTML");
  if (metaRobots.includes("noindex") || headerRobots.includes("noindex")) {
    addCritical("sitemap-url-noindex", url, `${metaRobots} ${headerRobots}`.trim());
  }
  if (record.ssrMode !== "semantic-v3") {
    addCritical("crawler-not-semantic", url, `x-aquavo-ssr-mode=${record.ssrMode || "missing"}`);
  }
  if (/حدث خطأ غير متوقع|FUNCTION_INVOCATION_FAILED|Server initialization error/i.test(html)) {
    addCritical("error-copy-in-html", url, "Error content found in indexable HTML");
  }

  if (canonical) {
    try {
      const parsed = new URL(canonical);
      if (parsed.host !== "www.aquavoiq.com") {
        addCritical("noncanonical-host", url, canonical);
      }
      if (normalizeCanonical(canonical) !== normalizeCanonical(url)) {
        addWarning("canonical-url-mismatch", url, canonical);
      }
    } catch {
      addCritical("invalid-canonical", url, canonical);
    }
  }

  if (h1Count !== 1) addWarning("multiple-h1", url, `${h1Count} H1 elements`);
  if (record.titleLength < 25 || record.titleLength > 70) {
    addWarning("title-length", url, `${record.titleLength} characters`);
  }
  if (record.descriptionLength < 70 || record.descriptionLength > 180) {
    addWarning("description-length", url, `${record.descriptionLength} characters`);
  }
  if (anchorCount < 3) addWarning("low-internal-link-surface", url, `${anchorCount} anchors`);
  if (schemas.length === 0) addWarning("missing-structured-data", url, "No JSON-LD blocks");
  if (record.bytes < 1_500) addWarning("thin-initial-html", url, `${record.bytes} bytes`);
}

async function runPool(items, worker, size) {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      await worker(items[index], index);
    }
  });
  await Promise.all(runners);
}

function duplicateWarnings(field, code) {
  const groups = new Map();
  for (const page of pages) {
    const value = page[field]?.trim();
    if (!value) continue;
    const urls = groups.get(value) || [];
    urls.push(page.url);
    groups.set(value, urls);
  }
  for (const [value, urls] of groups) {
    if (urls.length > 1) {
      addWarning(code, urls[0], `${urls.length} URLs: ${value.slice(0, 120)}`);
    }
  }
}

async function auditSpecialRoutes() {
  const missingUrl = `${base}/products/__aquavo_360_audit_missing__`;
  const missing = await fetchWithTimeout(missingUrl, { redirect: "manual", cache: "no-store" });
  const missingHtml = await missing.text();
  const missingRobots = `${metaContent(missingHtml, "robots")} ${missing.headers.get("x-robots-tag") || ""}`.toLowerCase();
  if (missing.status !== 404) addCritical("missing-page-not-404", missingUrl, `HTTP ${missing.status}`);
  if (!missingRobots.includes("noindex") || !missingRobots.includes("follow")) {
    addCritical("missing-page-robots", missingUrl, missingRobots || "missing");
  }
  if (canonicalHref(missingHtml)) addCritical("missing-page-canonical", missingUrl, canonicalHref(missingHtml));
  if (jsonLdBlocks(missingHtml, missingUrl).length > 0) {
    addCritical("missing-page-structured-data", missingUrl, "JSON-LD should be absent");
  }

  const legacyGuide = await fetchWithTimeout(`${base}/guides/aquarium-filter-guide`, { redirect: "manual" });
  if (![301, 308].includes(legacyGuide.status)) {
    addCritical("legacy-guide-redirect", legacyGuide.url, `HTTP ${legacyGuide.status}`);
  }

  const alternateHost = await fetchWithTimeout("https://aquavoiq.com/products", { redirect: "manual" });
  const alternateLocation = alternateHost.headers.get("location") || "";
  if (![301, 308].includes(alternateHost.status) || !alternateLocation.startsWith(`${base}/products`)) {
    addCritical("alternate-host-redirect", "https://aquavoiq.com/products", `HTTP ${alternateHost.status}; ${alternateLocation}`);
  }

  const health = await fetchWithTimeout(`${base}/health`, { headers: { accept: "application/json" } });
  const healthText = await health.text();
  if (health.status !== 200 || !healthText.includes('"status":"ok"')) {
    addCritical("health-check", `${base}/health`, `HTTP ${health.status}; ${healthText.slice(0, 120)}`);
  }
}

function markdownReport(discoveredCount) {
  const lines = [
    "# AQUAVO SEO Production 360 Audit",
    "",
    `- Checked: ${new Date().toISOString()}`,
    `- Base URL: ${base}`,
    `- User agent: ${auditUserAgent}`,
    `- Sitemap URLs discovered: ${discoveredCount}`,
    `- Pages completed: ${pages.length}`,
    `- Critical findings: ${critical.length}`,
    `- Warnings: ${warnings.length}`,
    "",
    "## Critical findings",
    "",
  ];
  if (critical.length === 0) lines.push("None.");
  for (const item of critical) lines.push(`- **${item.code}** — ${item.url} — ${item.detail}`);
  lines.push("", "## Warnings", "");
  if (warnings.length === 0) lines.push("None.");
  for (const item of warnings) lines.push(`- **${item.code}** — ${item.url} — ${item.detail}`);
  lines.push("", "## Page inventory", "", "| Status | URL | Title | H1 | Links | Schemas |", "|---:|---|---|---:|---:|---|");
  for (const page of pages) {
    lines.push(`| ${page.status} | ${page.url} | ${page.title.replace(/\|/g, "\\|")} | ${page.h1Count} | ${page.anchorCount} | ${page.schemaTypes.join(", ")} |`);
  }
  return `${lines.join("\n")}\n`;
}

await fs.mkdir(outputDir, { recursive: true });
await waitForSemanticCrawlerParity();
const urls = await discoverSitemapUrls();
await runPool(urls, auditPage, concurrency);
duplicateWarnings("title", "duplicate-title");
duplicateWarnings("description", "duplicate-description");
await auditSpecialRoutes();

const report = {
  checkedAt: new Date().toISOString(),
  base,
  auditUserAgent,
  discoveredCount: urls.length,
  completedCount: pages.length,
  critical,
  warnings,
  pages,
};
await fs.writeFile(path.join(outputDir, "report.json"), JSON.stringify(report, null, 2));
await fs.writeFile(path.join(outputDir, "report.md"), markdownReport(urls.length));

console.log(`SEO 360 audit: ${pages.length}/${urls.length} pages, ${critical.length} critical, ${warnings.length} warnings.`);
if (critical.length > 0) process.exit(1);

import { chromium, request } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const rawBase = process.env.PREVIEW_URL;
if (!rawBase) {
  throw new Error("PREVIEW_URL is required, for example https://branch.example.vercel.app");
}

const base = rawBase.replace(/\/$/, "");
const outputDir = path.resolve("artifacts/seo-preview");
await fs.mkdir(outputDir, { recursive: true });

const failures = [];
const findings = [];
const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

function jsonLdBlocks(html) {
  const blocks = [];
  const pattern = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(pattern)) {
    try {
      blocks.push(JSON.parse(match[1]));
    } catch (error) {
      failures.push(`Invalid JSON-LD: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return blocks.flatMap((block) => Array.isArray(block) ? block : [block]);
}

function anchors(html) {
  return [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["']/gi)].map((match) => match[1]);
}

function canonicalHref(html) {
  return html.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)?.[1] || "";
}

const api = await request.newContext({
  baseURL: base,
  extraHTTPHeaders: { "user-agent": "AQUAVO-SEO-Preview-Audit/2.0" },
});

for (const route of ["/", "/products", "/faq", "/about", "/shipping"]) {
  const response = await api.get(route);
  const html = await response.text();
  const robots = response.headers()["x-robots-tag"] || "";
  assert(response.status() === 200, `${route} returned ${response.status()}, expected 200`);
  assert(/<h1\b/i.test(html), `${route} initial HTML has no H1`);
  assert(Boolean(canonicalHref(html)), `${route} initial HTML has no canonical`);
  assert(robots.includes("noindex"), `${route} preview response is missing X-Robots-Tag noindex`);
  assert(anchors(html).length >= 4, `${route} has too few crawlable anchors in initial HTML`);
  assert(/id=["']seo-root["']/i.test(html), `${route} has no separate semantic root`);
  assert(/<div\s+id=["']root["'][^>]*><\/div>/i.test(html), `${route} client root is not intentionally empty`);
  findings.push({ route, status: response.status(), h1: /<h1\b/i.test(html), anchors: anchors(html).length, robots });
}

for (const route of [
  "/guides",
  "/guides/filter-choice",
  "/guides/cloudy-water-causes",
  "/guides/filter-maintenance",
  "/guides/fish-gasping-surface",
  "/guides/aquarium-maintenance-checklist",
]) {
  const response = await api.get(route);
  const html = await response.text();
  const robots = response.headers()["x-robots-tag"] || "";
  assert(response.status() === 200, `${route} returned ${response.status()}, expected 200`);
  assert(/<h1\b/i.test(html), `${route} has no server-rendered H1`);
  assert(html.length > 1500, `${route} returned too little server-rendered content`);
  assert(Boolean(canonicalHref(html)), `${route} has no canonical`);
  assert(robots.includes("noindex"), `${route} preview response is missing noindex`);
  assert(anchors(html).length >= 3, `${route} has too few internal links`);

  const markdownResponse = await api.get(route, { headers: { Accept: "text/markdown" } });
  const markdown = await markdownResponse.text();
  assert(markdownResponse.status() === 200, `${route} markdown returned ${markdownResponse.status()}`);
  assert(markdown.startsWith("# "), `${route} markdown does not start with a heading`);
  assert(markdown.length > 500, `${route} markdown is too short for an answer source`);
}

const legacyGuide = await api.get("/guides/aquarium-filter-guide", { maxRedirects: 0 });
assert(legacyGuide.status() === 308, `Legacy guide returned ${legacyGuide.status()}, expected 308`);
assert(legacyGuide.headers().location === "/guides/filter-choice", "Legacy guide does not redirect to canonical route");

const legacyCategory = await api.get("/products?category=filters", { maxRedirects: 0 });
assert(legacyCategory.status() === 308, `Legacy category returned ${legacyCategory.status()}, expected 308`);
assert(decodeURIComponent(legacyCategory.headers().location || "").includes("الفلترة والتنقية"), "Legacy category does not redirect to Arabic database category");

const productsResponse = await api.get("/products");
const productsHtml = await productsResponse.text();
const productLinks = [...new Set(anchors(productsHtml).filter((href) => /^\/products\/[^/?#]+/.test(href)))];
const categoryLinks = [...new Set(anchors(productsHtml).filter((href) => href.startsWith("/products?category=")))];
assert(productLinks.length >= 100, `/products exposes ${productLinks.length} product links; expected the active catalog (100+)`);
assert(categoryLinks.length >= 8, `/products exposes only ${categoryLinks.length} category links`);
assert(categoryLinks.every((href) => !/[?&]category=(filters|heaters|lighting|food|treatments|decorations|substrates|air-pumps|maintenance)\b/.test(href)), "Legacy English category keys are still present");
assert(categoryLinks.some((href) => /%D[89]/i.test(href)), "Category links are not using Arabic database values");

const sampleProduct = productLinks[0];
assert(Boolean(sampleProduct), "No sample product URL was found");
if (sampleProduct) {
  const productResponse = await api.get(sampleProduct);
  const productHtml = await productResponse.text();
  const schemas = jsonLdBlocks(productHtml);
  const productSchema = schemas.find((item) => item && item["@type"] === "Product");
  const breadcrumb = schemas.find((item) => item && item["@type"] === "BreadcrumbList");
  const serialized = JSON.stringify(productSchema || {});
  assert(productResponse.status() === 200, `${sampleProduct} returned ${productResponse.status()}`);
  assert(/<h1\b/i.test(productHtml), `${sampleProduct} initial HTML has no H1`);
  assert(Boolean(productSchema), `${sampleProduct} has no Product JSON-LD`);
  assert(productSchema?.offers?.["@type"] === "Offer", `${sampleProduct} must expose one selected Offer`);
  assert(Number(productSchema?.offers?.price) > 0, `${sampleProduct} Offer price is not greater than zero`);
  assert(productSchema?.offers?.priceCurrency === "IQD", `${sampleProduct} Offer currency is not IQD`);
  assert(productSchema?.offers?.shippingDetails?.shippingRate?.value === 5000, `${sampleProduct} shipping rate is not 5,000 IQD`);
  assert(productSchema?.offers?.shippingDetails?.deliveryTime?.transitTime?.maxValue === 1, `${sampleProduct} delivery time is not one day`);
  assert(!serialized.includes("AggregateOffer"), `${sampleProduct} still contains AggregateOffer`);
  assert(!serialized.includes("ProductGroup"), `${sampleProduct} still contains ProductGroup without deep links`);
  assert(Boolean(breadcrumb), `${sampleProduct} has no BreadcrumbList JSON-LD`);
  findings.push({ sampleProduct, schemaTypes: schemas.map((item) => item?.["@type"]).filter(Boolean) });
}

const missingResponse = await api.get("/products/__aquavo_missing_product_for_audit__");
const missingHtml = await missingResponse.text();
const missingRobots = missingResponse.headers()["x-robots-tag"] || "";
assert(missingResponse.status() === 404, `Missing product returned ${missingResponse.status()}, expected 404`);
assert(missingRobots.includes("noindex") && missingRobots.includes("follow"), "Missing product is not noindex, follow");
assert(!canonicalHref(missingHtml), "Missing product contains a canonical link");
assert(jsonLdBlocks(missingHtml).length === 0, "Missing product contains structured data");
assert(!/property=["']og:/i.test(missingHtml), "Missing product contains Open Graph metadata");

if (categoryLinks[0]) {
  const categoryResponse = await api.get(categoryLinks[0]);
  const categoryHtml = await categoryResponse.text();
  assert(categoryResponse.status() === 200, `${categoryLinks[0]} returned ${categoryResponse.status()}`);
  assert(productLinks.some((href) => categoryHtml.includes(href)), `${categoryLinks[0]} returned no product links`);
}

const robotsResponse = await api.get("/robots.txt");
const robotsText = await robotsResponse.text();
assert(robotsResponse.status() === 200, `/robots.txt returned ${robotsResponse.status()}`);
assert(robotsText.includes("Disallow: /checkout"), "robots.txt does not block checkout");
assert(robotsText.includes("Disallow: /search"), "robots.txt does not block internal search");
assert(robotsText.includes("Sitemap: https://www.aquavoiq.com/sitemap.xml"), "robots.txt has no canonical sitemap URL");

for (const route of ["/sitemap.xml", "/sitemap-pages.xml", "/sitemap-products.xml", "/sitemap-guides.xml"]) {
  const response = await api.get(route);
  const xml = await response.text();
  assert(response.status() === 200, `${route} returned ${response.status()}`);
  assert(xml.startsWith("<?xml"), `${route} is not XML`);
  assert(!xml.includes("2026-07-13"), `${route} still contains stale 2026-07-13 lastmod`);
  if (route === "/sitemap-pages.xml") {
    assert(xml.includes("/calculators</loc>"), "Page sitemap is missing /calculators");
    assert(xml.includes("/fish-health</loc>"), "Page sitemap is missing /fish-health");
    assert(!xml.includes("/search</loc>"), "Page sitemap includes internal search");
  }
  if (route === "/sitemap-guides.xml") {
    assert(xml.includes("/guides/cloudy-water-causes</loc>"), "Guide sitemap is missing cloudy-water source");
    assert(xml.includes("/guides/filter-maintenance</loc>"), "Guide sitemap is missing filter-maintenance source");
  }
  if (route === "/sitemap-products.xml") {
    const count = (xml.match(/<url>/g) || []).length;
    assert(count >= 100, `Product sitemap contains only ${count} URLs`);
  }
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, locale: "ar-IQ" });
const browserErrors = [];
page.on("console", (message) => {
  if (message.type() === "error") browserErrors.push(`console: ${message.text()}`);
});
page.on("pageerror", (error) => browserErrors.push(`pageerror: ${error.message}`));

for (const route of ["/", "/products", sampleProduct || "/faq"]) {
  await page.goto(`${base}${route}`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.locator('#root[data-aq-client-ready="true"]').waitFor({ state: "attached", timeout: 30_000 });
  await page.waitForTimeout(250);
  const h1Count = await page.locator("#root h1").count();
  const semanticRootCount = await page.locator("#seo-root").count();
  assert(h1Count >= 1, `${route} has no client H1 after React mounts`);
  assert(semanticRootCount === 0, `${route} still retains #seo-root after the client app painted`);
  const filename = route === "/" ? "home" : route.replace(/^\//, "").replace(/[^a-zA-Z0-9_-]+/g, "-");
  await page.screenshot({ path: path.join(outputDir, `${filename}.png`), fullPage: true });
}

const fatalPatterns = /hydration failed|did not match|uncaught|fatal|chunkloaderror/i;
const fatalBrowserErrors = browserErrors.filter((entry) => fatalPatterns.test(entry));
assert(fatalBrowserErrors.length === 0, `Browser emitted fatal errors: ${fatalBrowserErrors.join(" | ")}`);
await browser.close();
await api.dispose();

const report = {
  base,
  checkedAt: new Date().toISOString(),
  findings,
  productLinkCount: productLinks.length,
  categoryLinkCount: categoryLinks.length,
  browserErrors,
  failures,
};
await fs.writeFile(path.join(outputDir, "report.json"), JSON.stringify(report, null, 2));

if (failures.length > 0) {
  console.error("SEO preview audit failed:\n- " + failures.join("\n- "));
  process.exit(1);
}
console.log(`SEO/AEO/GEO preview audit passed: ${productLinks.length} products, ${categoryLinks.length} categories.`);

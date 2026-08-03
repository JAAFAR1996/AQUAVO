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

const api = await request.newContext({
  baseURL: base,
  extraHTTPHeaders: { "user-agent": "AQUAVO-SEO-Preview-Audit/1.0" },
});

for (const route of ["/", "/products", "/faq", "/about"]) {
  const response = await api.get(route);
  const html = await response.text();
  const robots = response.headers()["x-robots-tag"] || "";
  assert(response.status() === 200, `${route} returned ${response.status()}, expected 200`);
  assert(/<h1\b/i.test(html), `${route} initial HTML has no H1`);
  assert(/rel=["']canonical["']/i.test(html), `${route} initial HTML has no canonical`);
  assert(robots.includes("noindex"), `${route} preview response is missing X-Robots-Tag noindex`);
  assert(anchors(html).length >= 4, `${route} has too few crawlable anchors in initial HTML`);
  findings.push({ route, status: response.status(), h1: /<h1\b/i.test(html), anchors: anchors(html).length, robots });
}

const productsResponse = await api.get("/products");
const productsHtml = await productsResponse.text();
const productLinks = [...new Set(anchors(productsHtml).filter((href) => /^\/products\/[^/?#]+/.test(href)))];
const categoryLinks = [...new Set(anchors(productsHtml).filter((href) => href.startsWith("/products?category=")))];
assert(productLinks.length >= 100, `/products exposes ${productLinks.length} product links; expected the active catalog (100+)`);
assert(categoryLinks.length >= 8, `/products exposes only ${categoryLinks.length} category links`);
assert(categoryLinks.every((href) => !/[?&]category=(filters|heaters|lighting|food|treatments|decorations|substrates|air-pumps|maintenance)\b/.test(href)), "Legacy English category keys are still present");
assert(categoryLinks.some((href) => /%D[89]/i.test(href)), "Category links are not using the Arabic database values");

const sampleProduct = productLinks[0];
assert(Boolean(sampleProduct), "No sample product URL was found");
if (sampleProduct) {
  const productResponse = await api.get(sampleProduct);
  const productHtml = await productResponse.text();
  const schemas = jsonLdBlocks(productHtml);
  const productSchema = schemas.find((item) => item && item["@type"] === "Product");
  const breadcrumb = schemas.find((item) => item && item["@type"] === "BreadcrumbList");
  assert(productResponse.status() === 200, `${sampleProduct} returned ${productResponse.status()}`);
  assert(/<h1\b/i.test(productHtml), `${sampleProduct} initial HTML has no H1`);
  assert(Boolean(productSchema), `${sampleProduct} has no Product JSON-LD`);
  assert(Boolean(productSchema?.offers), `${sampleProduct} Product JSON-LD has no Offer`);
  assert(Number(productSchema?.offers?.price) > 0, `${sampleProduct} Offer price is not greater than zero`);
  assert(productSchema?.offers?.priceCurrency === "IQD", `${sampleProduct} Offer currency is not IQD`);
  assert(Boolean(breadcrumb), `${sampleProduct} has no BreadcrumbList JSON-LD`);
  findings.push({ sampleProduct, schemaTypes: schemas.map((item) => item?.["@type"]).filter(Boolean) });
}

const missingResponse = await api.get("/products/__aquavo_missing_product_for_audit__");
assert(missingResponse.status() === 404, `Missing product returned ${missingResponse.status()}, expected 404`);

if (categoryLinks[0]) {
  const categoryResponse = await api.get(categoryLinks[0]);
  const categoryHtml = await categoryResponse.text();
  assert(categoryResponse.status() === 200, `${categoryLinks[0]} returned ${categoryResponse.status()}`);
  assert(productLinks.some((href) => categoryHtml.includes(href)), `${categoryLinks[0]} returned no product links`);
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
  await page.waitForTimeout(500);
  const h1Count = await page.locator("h1").count();
  const visibleShellCount = await page.locator(".aq-ssr-shell").count();
  assert(h1Count >= 1, `${route} has no H1 after JavaScript mounts`);
  assert(visibleShellCount === 0, `${route} still shows the semantic preview shell after the client app mounts`);
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
console.log(`SEO preview audit passed: ${productLinks.length} products, ${categoryLinks.length} categories.`);

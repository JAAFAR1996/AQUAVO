/** Production-build UI regression checks. Loopback and synthetic fixtures only; no database. */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { chromium, expect } from "@playwright/test";

const publicDir = resolve("dist/public");
const template = await readFile("dist/ssr-template/index.html", "utf8");
const brands = Array.from({ length: 12 }, (_, index) => `Brand ${index + 1}`);
const product = {
  id: "fixture-gallery", slug: "fixture-gallery", name: "فلتر اختبار", brand: brands[0],
  price: 10000, stock: 8, category: "فلاتر", rating: 0, reviewCount: 0,
  image: "/ux-fixture/one.svg", thumbnail: "/ux-fixture/one.svg",
  images: ["/ux-fixture/one.svg", "/ux-fixture/two.svg", "/ux-fixture/three.svg"],
  description: "وصف تجريبي للفحص المحلي فقط", hasVariants: true,
  specifications: { "يحتاج": "مضخة اختبار", "الأبعاد": "قياس عام لا يعرض للخيار", benefits: ["فائدة موثقة أولى", "فائدة موثقة ثانية"], safetyWarnings: ["تحذير محفوظ في بيانات المنتج"] },
  variants: [
    { id: "small", label: "1.5 متر", specifications: { "الأبعاد": "150 سم" }, price: 10000, stock: 8, images: ["/ux-fixture/one.svg", "/ux-fixture/two.svg", "/ux-fixture/three.svg"] },
    { id: "large", label: "1.7 متر", specifications: { "الأبعاد": "170 سم" }, price: 15000, stock: 3, images: ["/ux-fixture/large.svg"] },
  ],
};
const catalogue = brands.map((brand, index) => ({ ...product, id: `fixture-${index}`, slug: `fixture-${index}`, name: `منتج ${index + 1}`, brand, hasVariants: false, variants: [], stock: index === 11 ? 0 : 8 }));
const originalFixture = JSON.stringify(product);
const types = { ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".webp": "image/webp", ".png": "image/png" };
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://127.0.0.1");
    if (url.pathname.startsWith("/api/")) {
      let data = {};
      if (url.pathname === "/api/user") { res.statusCode = 401; data = null; }
      else if (url.pathname === "/api/products/attributes") data = { brands, categories: ["فلاتر"], minPrice: 0, maxPrice: 100000 };
      else if (url.pathname === "/api/products") {
        const selected = url.searchParams.getAll("brand");
        data = { products: catalogue.filter(p => !selected.length || selected.includes(p.brand)) };
      } else if (url.pathname === "/api/products/fixture-gallery") data = product;
      else if (url.pathname === "/api/products/fixture-single") data = { ...product, slug: "fixture-single", images: [product.image], hasVariants: false, variants: [] };
      else if (url.pathname.includes("reviews") || url.pathname.includes("/variants") || url.pathname.includes("similar") || url.pathname.includes("frequently-bought-together") || url.pathname.includes("/blog/") || url.pathname.includes("/gallery") || url.pathname.includes("/bundles")) data = [];
      else if (url.pathname.includes("shipping")) data = { fee: 5000 };
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(data));
      return;
    }
    if (url.pathname.startsWith("/ux-fixture/")) {
      res.setHeader("Content-Type", "image/svg+xml");
      res.end(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="600" height="600" fill="#f6f4ef"/><rect x="180" y="120" width="240" height="360" rx="32" fill="#0b93a6"/><text x="300" y="320" text-anchor="middle" font-size="30" fill="white">${url.pathname.split('/').pop()}</text></svg>`);
      return;
    }
    const path = resolve(publicDir, `.${url.pathname}`);
    if (path !== publicDir && !path.startsWith(`${publicDir}/`)) { res.writeHead(403).end(); return; }
    const isPage = !extname(url.pathname);
    res.setHeader("Content-Type", isPage ? "text/html" : types[extname(path)] || "application/octet-stream");
    res.end(isPage ? template : await readFile(path));
  } catch { res.writeHead(404).end(); }
});
await new Promise(done => server.listen(0, "127.0.0.1", done));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: process.env.AQUAVO_BROWSER_EXECUTABLE || undefined, args: ["--no-sandbox", "--no-zygote", "--disable-dev-shm-usage"] });
const output = resolve(process.env.AQUAVO_UX_ARTIFACTS || "/tmp/aquavo-product-ux");
await mkdir(output, { recursive: true });
try {
  for (const scenario of [
    { locale: "ar", width: 390, mobile: true, motion: "reduce", theme: "light" },
    { locale: "ar", width: 1365, mobile: false, motion: "no-preference", theme: "dark" },
    { locale: "en", width: 390, mobile: true, motion: "no-preference", theme: "light" },
    { locale: "ckb", width: 820, mobile: false, motion: "reduce", theme: "light" },
  ]) {
    const { locale, width, mobile, motion, theme } = scenario;
    const productCopy = JSON.parse(await readFile(`client/src/locales/${locale}/product.json`, "utf8"));
    const listingCopy = JSON.parse(await readFile(`client/src/locales/${locale}/products.json`, "utf8"));
    const prefix = locale === "ar" ? "" : `/${locale}`;
    const context = await browser.newContext({ viewport: { width, height: 900 }, isMobile: mobile, hasTouch: mobile, reducedMotion: motion, colorScheme: theme });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await context.route("**/*", route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    await page.addInitScript(theme => { localStorage.setItem("theme", theme); localStorage.setItem("aquavo_first_dive_seen_v2", "1"); }, theme);
    await page.goto(`${base}${prefix}/`);
    const heroPhrase = page.locator(".aq-title-phrase");
    await expect(heroPhrase).toBeVisible();
    await expect(heroPhrase).toHaveCSS("animation-name", motion === "reduce" ? "none" : "aq-phrase-settle");
    const homeCard = page.locator(".aq-interactive-card").first();
    await homeCard.scrollIntoViewIfNeeded();
    await homeCard.hover();
    if (motion === "reduce") await expect(homeCard).toHaveCSS("transform", "none");
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "home has horizontal overflow");
    await page.goto(`${base}${prefix}/products/fixture-gallery`);
    await expect(page.getByRole("heading", { name: product.name, level: 1 })).toBeVisible({ timeout: 20000 }).catch(async error => {
      console.log(JSON.stringify({errors, body: (await page.locator("body").innerText()).slice(0, 2500)}));
      await page.screenshot({path: `${output}/failure.png`});
      throw error;
    });
    const viewport = page.getByTestId("product-gallery-viewport");
    await expect(viewport).toBeVisible();
    await page.getByRole("button", { name: "150 سم", exact: true }).click();
    await expect(page.getByRole("button", { name: productCopy.gallery.showImage.replace("{{index}}", "1") })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("region", { name: productCopy.choice.dimensions })).toContainText("150 سم");
    await expect(page.getByRole("region", { name: productCopy.choice.title })).toContainText("مضخة اختبار");
    await viewport.scrollIntoViewIfNeeded();
    await expect(viewport).toHaveAttribute("data-swipe-ready", "true");
    if (mobile) {
      const box = await viewport.boundingBox();
      const cdp = await context.newCDPSession(page);
      const start = box.x + box.width * (locale === "en" ? 0.8 : 0.2);
      const end = box.x + box.width * (locale === "en" ? 0.2 : 0.8);
      const y = box.y + box.height * 0.4;
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: start, y }] });
      for (let step = 1; step <= 10; step++) {
        await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: start + (end - start) * step / 10, y }] });
        await page.waitForTimeout(20);
      }
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await expect(page.getByRole("button", { name: productCopy.gallery.showImage.replace("{{index}}", "2") })).toHaveAttribute("aria-pressed", "true");
      await expect(page.getByRole("dialog")).toHaveCount(0);
    } else {
      await page.getByRole("button", { name: productCopy.gallery.next, exact: true }).click();
      await expect(page.getByRole("button", { name: productCopy.gallery.showImage.replace("{{index}}", "2") })).toHaveAttribute("aria-pressed", "true");
    }
    await expect.poll(async () => {
      const selected = await viewport.locator('[aria-hidden="false"]').boundingBox();
      const frame = await viewport.boundingBox();
      return Math.abs(selected.x - frame.x);
    }).toBeLessThan(2);
    await viewport.click({ position: { x: 90, y: 90 } });
    await expect(page.getByRole("dialog")).toBeVisible();
    const closeZoom = page.getByRole("dialog").getByRole("button", { name: productCopy.gallery.close, exact: true });
    await expect(closeZoom).toHaveCSS("color", "rgb(255, 255, 255)");
    await closeZoom.hover();
    await expect(closeZoom).toHaveCSS("color", "rgb(255, 255, 255)");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByRole("button", { name: "170 سم", exact: true }).click();
    await expect(page.getByRole("region", { name: productCopy.choice.dimensions })).toContainText("170 سم");
    await expect(page.getByRole("region", { name: productCopy.choice.dimensions })).not.toContainText("150 سم");
    await expect(viewport.locator("img")).toHaveCount(1);
    await expect(viewport.locator("img")).toHaveAttribute("src", /large.svg$/);
    await expect(page.getByText(/15,000/).first()).toBeVisible();
    await expect(page.getByRole("tablist")).toHaveCount(0);
    await expect(page.getByText("تحذير محفوظ في بيانات المنتج")).toBeVisible();
    const shipping = page.locator("#product-info-shipping");
    const trigger = shipping.getByRole("button");
    await shipping.scrollIntoViewIfNeeded();
    await expect(trigger).toHaveAttribute("aria-expanded", mobile ? "false" : "true");
    if (mobile) { await trigger.click(); await expect(trigger).toHaveAttribute("aria-expanded", "true"); }
    await page.locator("#product-info-specs").scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${output}/${locale}-${width}-details.png` });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "page has horizontal overflow");

    await page.goto(`${base}${prefix}/products`);
    await page.getByRole("button", { name: listingCopy.filters.button, exact: true }).click();
    const dialog = page.getByRole("dialog");
    const countLabel = count => listingCopy.filters.showResults.replace("{{count}}", String(count));
    await expect(dialog.getByRole("button", { name: countLabel(12), exact: true })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Brand 9", exact: true })).toHaveCount(0);
    await dialog.getByRole("button", { name: listingCopy.filters.moreBrands.replace("{{count}}", "4"), exact: true }).click();
    await dialog.getByRole("button", { name: "Brand 12", exact: true }).click();
    await expect(dialog.getByRole("button", { name: countLabel(1), exact: true })).toBeVisible();
    await dialog.getByRole("button", { name: listingCopy.filters.fewerBrands, exact: true }).click();
    await expect(dialog.getByRole("button", { name: "Brand 12", exact: true })).toHaveAttribute("aria-pressed", "true");
    await dialog.getByRole("button", { name: listingCopy.tags.inStock, exact: true }).click();
    await expect(dialog.getByRole("button", { name: countLabel(0), exact: true })).toBeVisible();
    await page.screenshot({ path: `${output}/${locale}-${width}-filters.png` });
    await dialog.getByRole("button", { name: countLabel(0), exact: true }).click();
    await expect(page.getByRole("heading", { name: listingCopy.empty.title })).toBeVisible();
    assert.deepEqual(errors, [], `${locale}/${width}: browser errors`);
    assert.equal(JSON.stringify(product), originalFixture, "fixture product price/stock mutated");
    console.log(`PASS ${locale} ${width}px ${theme}/${motion}: gallery, variant images, disclosures, brand expansion, draft counts and applied zero results`);
    await context.close();
  }
  for (const mode of ["single-photo", "enhancement-unavailable"]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 900 }, reducedMotion: "reduce" });
    const page = await context.newPage();
    const enhancements = [];
    const errors = [];
    page.on("request", request => { if (/gallery-carousel-controller-.*\.js/.test(request.url())) enhancements.push(request.url()); });
    page.on("pageerror", error => errors.push(error.message));
    await context.route("**/*", route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    if (mode === "enhancement-unavailable") await context.route("**/gallery-carousel-controller-*.js", route => route.abort());
    await page.addInitScript(() => localStorage.setItem("aquavo_first_dive_seen_v2", "1"));
    await page.goto(`${base}/products/${mode === "single-photo" ? "fixture-single" : "fixture-gallery"}`);
    const viewport = page.getByTestId("product-gallery-viewport");
    await expect(viewport).toBeVisible();
    if (mode === "single-photo") {
      await expect(viewport.locator("img")).toHaveCount(1);
      assert.deepEqual(enhancements, [], "single-photo product downloaded swipe code");
    } else {
      await expect.poll(() => enhancements.length).toBeGreaterThan(0);
      await page.getByRole("button", { name: "عرض الصورة 2", exact: true }).click();
      await expect(viewport.locator('[aria-hidden="false"] img')).toHaveAttribute("src", /two.svg$/);
      await expect.poll(() => viewport.evaluate(root => {
        const selected = root.querySelector('[aria-hidden="false"]');
        return selected ? Math.abs(selected.getBoundingClientRect().x - root.getBoundingClientRect().x) : Infinity;
      }), { message: "fallback buttons must move the visible photo" }).toBeLessThan(2);
    }
    await viewport.click({ position: { x: 90, y: 90 } });
    await expect(page.getByRole("dialog")).toBeVisible();
    assert.deepEqual(errors, [], mode);
    console.log(`PASS ${mode}: immediate image, working controls and zoom without swipe dependency`);
    await context.close();
  }
} finally {
  await browser.close();
  await new Promise(done => server.close(done));
}

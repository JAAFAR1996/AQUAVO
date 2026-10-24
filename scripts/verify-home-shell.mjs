/** Real-browser regression gate against the production build and local API fixtures only. */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { gzipSync } from "node:zlib";
import { chromium } from "@playwright/test";

const publicDir = resolve("dist/public");
const template = await readFile("dist/ssr-template/index.html", "utf8");
const generated = await readFile("api/_home-shell-html.ts", "utf8");
const generatedValue = (name) => JSON.parse(generated.match(new RegExp(`export const ${name} = ([^\\n]+);`))[1]);
const shell = generatedValue("HOME_SHELL_HTML");
const home = template.replace(/(<div id="root"[^>]*>)\s*(<\/div>)/,
  (_, open, close) => open.replace(/>$/, ' data-aq-ssr="home">') + shell + close);
const types = { ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".webp": "image/webp", ".woff2": "font/woff2", ".png": "image/png" };
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://127.0.0.1");
    if (url.pathname.startsWith("/api/")) {
      let data = {};
      if (url.pathname === "/api/user") { res.statusCode = 401; data = null; }
      else if (url.pathname === "/api/products") data = { products: [], total: 0 };
      else if (url.pathname === "/api/growth/bundles") data = [];
      else if (url.pathname.includes("shipping")) data = { fee: 5000 };
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(data));
      return;
    }
    let bytes;
    let type;
    if (!extname(url.pathname)) {
      bytes = Buffer.from(url.pathname === "/" ? home : template);
      type = "text/html";
    } else {
      const path = resolve(publicDir, `.${url.pathname}`);
      if (!path.startsWith(`${publicDir}/`)) { res.writeHead(403).end(); return; }
      bytes = await readFile(path);
      type = types[extname(path)] ?? "application/octet-stream";
    }
    res.setHeader("Content-Type", type);
    if (type.startsWith("text/") && req.headers["accept-encoding"]?.includes("gzip")) {
      bytes = gzipSync(bytes);
      res.setHeader("Content-Encoding", "gzip");
    }
    res.setHeader("Content-Length", bytes.length);
    res.end(bytes);
  } catch { res.writeHead(404).end(); }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const address = server.address();
assert(address && typeof address === "object");
const base = `http://127.0.0.1:${address.port}`;

async function geometry(page) {
  return page.locator(".aq-site-header, .aq-waterline-hero, .aq-hero-title, .aq-hero-actions, .aq-proof-window > img").evaluateAll((elements) => elements.map((el) => {
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return { box: [rect.x, rect.y, rect.width, rect.height].map(n => Math.round(n)), font: style.fontFamily, size: style.fontSize, color: style.color, background: style.backgroundColor };
  }));
}

try {
  for (const width of [412, 1365]) {
    for (const theme of ["light", "dark", "system"]) {
      const browser = await chromium.launch({
        executablePath: process.env.AQUAVO_BROWSER_EXECUTABLE || undefined,
        args: ["--no-sandbox", "--no-zygote", "--disable-dev-shm-usage"],
      });
      try {
        const page = await browser.newPage({ viewport: { width, height: 900 }, colorScheme: "dark", reducedMotion: "reduce" });
        const errors = [];
        page.on("pageerror", error => errors.push(error.message));
        page.on("console", message => {
          if (/hydration|Minified React error|didn't match/i.test(message.text())) errors.push(message.text());
        });
        await page.addInitScript(theme => {
          localStorage.setItem("theme", theme);
          localStorage.setItem("aquavo_first_dive_seen_v2", "1");
          localStorage.setItem("aquavo_comparison", JSON.stringify(["saved-product"]));
        }, theme);
        // Never contact production APIs, ad platforms, or external image hosts.
        await page.route("**/*", route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
        let releaseScript;
        const scriptsReady = new Promise(done => { releaseScript = done; });
        await page.route("**/entries/*.js", async route => { await scriptsReady; await route.continue(); });
        await page.goto(base, { waitUntil: "commit" });
        const image = page.locator(".aq-waterline-hero .aq-proof-window > img");
        await image.waitFor({ state: "visible" });
        await page.evaluate(() => document.fonts.ready);
        const originalImage = await image.elementHandle();
        const initialGeometry = await geometry(page);
        assert.equal(await page.locator('a[data-tour="hero-cta"]').getAttribute("href"), "/products");
        releaseScript();
        await page.waitForFunction(() => document.getElementById("root")?.dataset.aqClientReady === "true");
        assert.deepEqual(await geometry(page), initialGeometry, `${width}/${theme}: hydration must preserve first-screen geometry`);
        assert.equal(await image.evaluate((node, original) => node === original, originalImage), true, "hydration replaced the LCP image");
        assert.equal(await page.locator("h1").count(), 1);
        assert.equal(await page.evaluate(() => document.documentElement.classList.contains("dark")), theme !== "light");
        assert.equal(await page.evaluate(() => localStorage.getItem("aquavo_comparison")), '["saved-product"]');
        await page.locator(".aq-site-header [data-aqv-cart-target]").click();
        await page.getByRole("dialog").waitFor({ state: "visible" });
        assert.match(await page.getByRole("dialog").innerText(), /السلة فارغة/);
        await page.keyboard.press("Escape");
        await page.getByRole("dialog").waitFor({ state: "hidden" });
        await page.locator('a[data-tour="hero-cta"]').click();
        await page.waitForURL("**/products");
        await page.waitForFunction(() => !document.querySelector(".aq-waterline-hero"));
        await page.goBack();
        await image.waitFor({ state: "visible" });
        assert.deepEqual(errors, [], `${width}/${theme}: browser errors`);
        console.log(`PASS ${width}px ${theme}: stable first-screen geometry, retained LCP node, theme/storage, cart, navigation/back`);
      } finally { await browser.close(); }
    }
  }
} finally { await new Promise(done => server.close(done)); }

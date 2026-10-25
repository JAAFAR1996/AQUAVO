/** Verify the actual home handler against a held database fixture and a real browser. */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { gzipSync } from "node:zlib";
import { Pool } from "@neondatabase/serverless";
import { chromium } from "@playwright/test";

// No live database or production API is used by this gate.
process.env.DATABASE_URL = "postgres://fixture:fixture@localhost/home-stream-fixture";
let releaseShipping;
const originalQuery = Pool.prototype.query;
Pool.prototype.query = function (sql) {
  assert.match(sql, /SELECT value FROM settings WHERE key='shipping_fee'/);
  return new Promise(resolveQuery => { releaseShipping = () => resolveQuery({ rows: [{ value: "7250" }] }); });
};
const { default: handler } = await import("../api/ssr-meta.ts");
const publicDir = resolve("dist/public");
const types = { ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".webp": "image/webp", ".woff2": "font/woff2", ".png": "image/png" };
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://127.0.0.1");
    if (url.pathname === "/") {
      res.status = code => { res.statusCode = code; return res; };
      res.send = body => res.end(body);
      await handler(req, res);
      return;
    }
    if (url.pathname.startsWith("/api/")) {
      let data = {};
      if (url.pathname === "/api/user") { res.statusCode = 401; data = null; }
      else if (url.pathname === "/api/products") data = { products: [], total: 0 };
      else if (url.pathname === "/api/growth/bundles") data = [];
      else if (url.pathname.includes("shipping")) data = { fee: 7250 };
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(data));
      return;
    }
    const path = resolve(publicDir, `.${url.pathname}`);
    if (!path.startsWith(`${publicDir}/`)) { res.writeHead(403).end(); return; }
    let bytes = await readFile(path);
    const type = types[extname(path)] ?? "application/octet-stream";
    res.setHeader("Content-Type", type);
    if (type.startsWith("text/") && req.headers["accept-encoding"]?.includes("gzip")) {
      bytes = gzipSync(bytes);
      res.setHeader("Content-Encoding", "gzip");
    }
    res.end(bytes);
  } catch (error) {
    if (!res.headersSent) res.statusCode = 500;
    res.end(String(error));
  }
});
await new Promise(done => server.listen(0, "127.0.0.1", done));
const address = server.address();
assert(address && typeof address === "object");
const base = `http://127.0.0.1:${address.port}`;
let browser;
try {
  browser = await chromium.launch({ executablePath: process.env.AQUAVO_BROWSER_EXECUTABLE || undefined,
    args: ["--no-sandbox", "--no-zygote", "--disable-dev-shm-usage"] });
  for (const javaScriptEnabled of [true, false]) {
    const context = await browser.newContext({ viewport: { width: 412, height: 900 }, javaScriptEnabled });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (/hydration|Minified React error|didn't match/i.test(message.text())) errors.push(message.text()); });
    await page.route("**/*", route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    await page.goto(base, { waitUntil: "commit" });
    await page.locator(".aq-waterline-hero").waitFor({ state: "visible" });
    await page.waitForFunction(() => {
      const image = document.querySelector(".aq-proof-window > img");
      return image?.complete && image.naturalWidth > 0;
    });
    assert.equal(await page.locator('script[type="application/ld+json"]').count(), 0);
    assert.equal(await page.evaluate(() => document.readyState), "loading");
    assert.equal(await page.locator("#root").getAttribute("data-aq-ssr"), "home");
    assert.equal(typeof releaseShipping, "function");
    releaseShipping();
    await page.waitForLoadState("domcontentloaded");
    if (javaScriptEnabled) {
      await page.waitForFunction(() => document.getElementById("root")?.dataset.aqClientReady === "true");
    }
    const data = await page.locator('script[type="application/ld+json"]').allTextContents();
    const nodes = data.map(JSON.parse);
    assert.equal(nodes.filter(node => node["@id"] === "https://www.aquavoiq.com/#organization").length, 1);
    assert(JSON.stringify(nodes).includes('"value":7250'));
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ javaScriptEnabled, heroPaintedBeforeShipping: true, currentShippingSchema: 7250,
      schemaNodes: nodes.length, hydrationErrors: errors.length }));
    await context.close();
  }
} finally {
  releaseShipping?.();
  Pool.prototype.query = originalQuery;
  await browser?.close();
  await new Promise(done => server.close(done));
}

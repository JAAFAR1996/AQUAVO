/** Real-browser regression gate against the production build and local API fixtures only. */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { gzipSync } from "node:zlib";
import { chromium } from "@playwright/test";
import { tsImport } from "tsx/esm/api";

const { injectHomeStyles } = await tsImport("../api/_home-styles.ts", import.meta.url);

const publicDir = resolve("dist/public");
const template = await readFile("dist/ssr-template/index.html", "utf8");
const generated = await readFile("api/_home-shell-html.ts", "utf8");
const generatedValue = (name) => JSON.parse(generated.match(new RegExp(`export const ${name} = ([^\\n]+);`))[1]);
const shell = generatedValue("HOME_SHELL_HTML");
const fullStyleHome = template.replace(/(<div id="root"[^>]*>)\s*(<\/div>)/,
  (_, open, close) => open.replace(/>$/, ' data-aq-ssr="home">') + shell + close);
const home = injectHomeStyles(fullStyleHome);
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
      bytes = Buffer.from(url.pathname === "/" ? (url.searchParams.has("full-css") ? fullStyleHome : home) : template);
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
        let releaseStyles;
        const stylesReady = new Promise(done => { releaseStyles = done; });
        await page.route("**/assets/index-*.css", async route => { await stylesReady; await route.continue(); });

        // Compare the extracted styles against the complete original stylesheet
        // with both pages using the same temporary system-font fallback.
        const reference = await browser.newPage({ viewport: { width, height: 900 }, colorScheme: "dark", reducedMotion: "reduce" });
        await reference.addInitScript(theme => localStorage.setItem("theme", theme), theme);
        await reference.route("**/*", route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
        await reference.route("**/entries/*.js", route => route.abort());
        await reference.route("**/*.woff2", route => route.abort());
        await reference.goto(`${base}/?full-css=1`, { waitUntil: "load" });
        const fallbackGeometry = await geometry(reference);
        await page.goto(base, { waitUntil: "commit" });
        const image = page.locator(".aq-waterline-hero .aq-proof-window > img");
        await image.waitFor({ state: "visible" });
        assert.deepEqual(await geometry(page), fallbackGeometry, `${width}/${theme}: critical CSS must match full CSS before fonts arrive`);
        await reference.close();
        releaseStyles();
        await page.waitForFunction(() => {
          const stylesheet = document.querySelector("link[data-aq-deferred-style]");
          return stylesheet?.sheet && stylesheet.media === "all";
        });
        await page.evaluate(async () => {
          // Force stylesheet layout before awaiting FontFaceSet.ready. Without
          // it, an already-resolved promise can precede newly discovered fonts.
          document.body.getBoundingClientRect();
          await document.fonts.ready;
        });
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
        for (const section of await page.locator(".aq-home-content > section").all()) {
          await section.scrollIntoViewIfNeeded();
          assert(await section.evaluate(node => node.getBoundingClientRect().height > 0), "an offscreen section did not render on scroll");
        }
        await page.locator(".aq-site-footer").scrollIntoViewIfNeeded();
        assert(await page.locator(".aq-site-footer").getByText("info@aquavoiq.com", { exact: true }).isVisible(), "footer content must remain accessible");
        assert.deepEqual(errors, [], `${width}/${theme}: browser errors`);
        console.log(`PASS ${width}px ${theme}: critical/full CSS match, stable hydration, original LCP node, cart, navigation/back and all sections/footer`);
      } finally { await browser.close(); }
    }
  }

  const browser = await chromium.launch({
    executablePath: process.env.AQUAVO_BROWSER_EXECUTABLE || undefined,
    args: ["--no-sandbox", "--no-zygote", "--disable-dev-shm-usage"],
  });
  try {
    // A slow application download must not postpone the first-visit reveal
    // until after the server-rendered home is already visible.
    const firstVisit = await browser.newContext({ viewport: { width: 412, height: 900 }, reducedMotion: "no-preference" });
    await firstVisit.route("**/*", route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    const freshPage = await firstVisit.newPage();
    const requests = [];
    freshPage.on("request", request => requests.push(request.url()));
    let releaseApplication;
    const applicationReady = new Promise(done => { releaseApplication = done; });
    await freshPage.route("**/chunks/i18n-*.js", async route => { await applicationReady; await route.continue(); });
    let releaseFullStyles;
    const fullStylesReady = new Promise(done => { releaseFullStyles = done; });
    await freshPage.route("**/assets/index-*.css", async route => { await fullStylesReady; await route.continue(); });
    await freshPage.goto(base, { waitUntil: "commit" });
    await freshPage.locator(".aqv-first-dive").waitFor({ state: "attached" });
    assert.equal(await freshPage.locator(".aqv-first-dive").evaluate(node => getComputedStyle(node).position), "fixed");
    assert.notEqual(await freshPage.locator(".aqv-first-dive").evaluate(node => getComputedStyle(node, "::before").animationName), "none", "intro animation must work with critical CSS alone");
    await freshPage.locator(".aqv-first-dive").waitFor({ state: "detached" });
    assert.notEqual(await freshPage.locator("#root").getAttribute("data-aq-client-ready"), "true");
    releaseFullStyles();
    releaseApplication();
    await freshPage.waitForFunction(() => document.getElementById("root")?.dataset.aqClientReady === "true");
    assert.equal(await freshPage.locator(".aqv-first-dive").count(), 0, "hydration must not restart the reveal");
    assert.equal(requests.some(url => /\/chunks\/(?:birthday-celebration|tools)-/.test(url)), false, "guests must not download birthday UI or its tools dictionary");
    console.log("PASS first visit: complete styled reveal before delayed hydration; no late cover or guest birthday download");
    await firstVisit.close();

    // Eligibility gates loading, never the existing authenticated feature.
    const birthday = await browser.newContext({ reducedMotion: "reduce" });
    await birthday.route("**/*", route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    await birthday.route("**/api/user", route => route.fulfill({ json: { id: "test-customer", role: "customer", email: "test@example.invalid", fullName: "Test Customer" } }));
    await birthday.route("**/api/birthday/status", route => route.fulfill({ json: { isBirthday: true, discount: 10, coupon: { code: "BIRTHDAY-TEST" } } }));
    const birthdayPage = await birthday.newPage();
    await birthdayPage.goto(base);
    await birthdayPage.getByRole("dialog").filter({ hasText: "BIRTHDAY-TEST" }).waitFor();
    assert.equal(await birthdayPage.evaluate(() => localStorage.getItem(`aquavo_bday_seen_${new Date().getFullYear()}`)), "1");
    console.log("PASS signed-in birthday: deferred translations, gift dialog and coupon remain available");
    await birthday.close();

    for (const width of [412, 1365]) {
      const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width, height: 900 } });
      await context.route("**/*", route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
      const reference = await context.newPage();
      const page = await context.newPage();
      await reference.goto(`${base}/?full-css=1`);
      await page.goto(base);
      await reference.evaluate(() => document.fonts.ready);
      await page.evaluate(() => document.fonts.ready);
      assert.deepEqual(await geometry(page), await geometry(reference), `${width}: no-JavaScript stylesheet fallback`);
      assert(await page.evaluate(() => !!document.querySelector("noscript link[rel=stylesheet]")?.sheet), "no-JavaScript full CSS did not load");
      await page.locator(".aq-site-footer").scrollIntoViewIfNeeded();
      assert(await page.locator(".aq-site-footer").getByText("info@aquavoiq.com", { exact: true }).isVisible());
      console.log(`PASS ${width}px: complete styles and footer without JavaScript`);
      await context.close();
    }

    for (const locale of ["ar", "en", "ckb"]) {
      const tools = JSON.parse(await readFile(`client/src/locales/${locale}/tools.json`, "utf8"));
      const guides = JSON.parse(await readFile(`client/src/locales/${locale}/guides.json`, "utf8"));
      const context = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1365, height: 900 } });
      await context.addInitScript(() => localStorage.setItem("aquavo_first_dive_seen_v2", "1"));
      await context.route("**/*", route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      const prefix = locale === "ar" ? "" : `/${locale}`;
      for (const [path, title] of [
        ["/guides/filter-choice", guides["guides-filter-choice"].s9],
        ["/calculators", tools.calculators.s1],
        ["/journey", tools.journey.s7],
      ]) {
        await page.goto(`${base}${prefix}${path}`);
        await page.getByRole("heading", { level: 1, name: title, exact: true }).waitFor();
        assert.equal(await page.locator("html").getAttribute("lang"), locale);
        assert.doesNotMatch(await page.locator("body").innerText(), /(?:guides-filter-choice|calculators|tank-size-calculator|journey|journey-progress|step-size)\.s\d+/);
        if (path === "/calculators") {
          const inputs = page.locator('[role="tabpanel"] input[type="number"]');
          for (const [index, value] of ["50", "30", "40"].entries()) await inputs.nth(index).fill(value);
          await page.getByRole("button", { name: tools["tank-size-calculator"].s16, exact: true }).click();
          await page.getByText("60 L", { exact: true }).waitFor();
        }
      }
      // Hover can evaluate the journey module before React mounts it; its
      // module-level labels must already have the Arabic fallback registered.
      await page.goto(`${base}${prefix || "/"}`);
      const journey = page.locator(`a[href="${prefix}/journey"]`).first();
      await journey.hover();
      await journey.click();
      await page.getByRole("heading", { level: 1, name: tools.journey.s7, exact: true }).waitFor();
      assert.doesNotMatch(await page.locator('[data-tour="journey-progress"]').innerText(), /\.s\d+/);
      assert.deepEqual(errors, [], `${locale}: deferred translation browser errors`);
      console.log(`PASS ${locale}: guides, functional calculator, journey and hover navigation keep translated copy`);
      await context.close();
    }
  } finally { await browser.close(); }
} finally { await new Promise(done => server.close(done)); }

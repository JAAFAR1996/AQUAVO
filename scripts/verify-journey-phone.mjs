/**
 * From repo root: pnpm run build:client && node scripts/verify-journey-phone.mjs
 * Optional: AQUAVO_BROWSER_EXECUTABLE=/usr/bin/chromium for system Chromium;
 * AQUAVO_UX_ARTIFACTS=/tmp/journey-phone for screenshots. Uses loopback only.
 */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdir, readFile } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";
import { chromium, expect } from "@playwright/test";

const publicDir = resolve("dist/public");
const html = await readFile(join(publicDir, "index.html")).catch(error => {
  if (error.code !== "ENOENT") throw error;
  // The full Vercel build moves this same Vite shell out of the public directory.
  return readFile("dist/ssr-template/index.html");
});
const copy = JSON.parse(await readFile("client/src/locales/ar/tools.json", "utf8"));
const output = process.env.AQUAVO_UX_ARTIFACTS;
if (output) await mkdir(output, { recursive: true });
const types = {
  ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".woff2": "font/woff2",
  ".woff": "font/woff", ".webp": "image/webp", ".png": "image/png", ".json": "application/json",
};
const server = createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url, "http://127.0.0.1");
    if (pathname.startsWith("/api/")) {
      res.writeHead(404, { "Content-Type": "application/json" }).end('{"error":"Local UI fixture: no API"}');
    } else if (pathname === "/journey") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(html);
    } else {
      const file = resolve(publicDir, `.${decodeURIComponent(pathname)}`);
      if (!file.startsWith(publicDir + sep)) { res.writeHead(403).end(); return; }
      const body = await readFile(file);
      res.writeHead(200, { "Content-Type": types[extname(file)] || "application/octet-stream" }).end(body);
    }
  } catch { res.writeHead(404).end(); }
});

const screenshot = (target, name) => output && target.screenshot({ path: join(output, `${name}.png`) });
const roomOption = (preview, id) => preview.getByRole("radio", { name: copy["journey-view-light"][id], exact: true });
async function noOverflow(page, label) {
  const [content, layout] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  assert(content <= layout + 1, `${label}: content ${content}px exceeds layout ${layout}px`);
}

let browser;
try {
  await new Promise((done, reject) => server.once("error", reject).listen(0, "127.0.0.1", done));
  const origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({
    executablePath: process.env.AQUAVO_BROWSER_EXECUTABLE || undefined,
    args: ["--no-sandbox", "--no-zygote", "--disable-dev-shm-usage"],
  });
  for (const [width, height, mobile] of [[320, 740, true], [390, 844, true], [1440, 900, false]]) {
    const label = `${width}x${height}`;
    const context = await browser.newContext({
      viewport: { width, height }, isMobile: mobile, hasTouch: mobile, locale: "ar-IQ",
      reducedMotion: "reduce", colorScheme: "light", serviceWorkers: "block",
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    try {
      await context.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
      await page.goto(origin + "/journey");
      const field = page.locator("#journey-tank-liters");
      const toggle = page.locator(".aqv-journey-preview-toggle");
      const jump = page.locator(".aqv-journey-preview-jump");
      const close = page.locator(".aqv-journey-preview-close");
      const preview = page.locator("#journey-live-preview");
      await expect(field).toBeVisible({ timeout: 20000 });
      await page.evaluate(() => document.fonts.ready.then(() => {}));
      const geometry = await field.evaluate(el => {
        const { top, bottom, left, width, height } = el.getBoundingClientRect();
        const hit = document.elementFromPoint(left + width / 2, top + height / 2);
        return { absoluteY: Math.round(scrollY + top), bottom: Math.ceil(bottom), scrollY, innerWidth, innerHeight,
          unobscured: hit === el || el.contains(hit) };
      });
      console.log(`${label} fresh load: ${JSON.stringify(geometry)}`);
      assert.equal(geometry.innerWidth, width, `${label}: actual CSS viewport`);
      assert.equal(geometry.scrollY, 0, `${label}: unexpectedly scrolled on load`);
      await noOverflow(page, label + " initial");
      await screenshot(page, label + "-initial");

      if (mobile) {
        assert(geometry.absoluteY >= 0 && geometry.bottom <= geometry.innerHeight && geometry.unobscured,
          `${label}: entire capacity field must be reachable on the first screen`);
        await expect(toggle).toHaveAttribute("aria-controls", "journey-live-preview");
        await expect(toggle).toHaveAttribute("aria-expanded", "false");
        await expect(preview).toBeHidden();
        await field.fill("84");
        await expect(toggle).toHaveAccessibleName(/84/);
        const absoluteFieldY = () => field.evaluate(el => Math.round(scrollY + el.getBoundingClientRect().top));
        const collapsedY = await absoluteFieldY();
        await toggle.tap();
        await expect(toggle).toHaveAttribute("aria-expanded", "true");
        await expect(preview.getByTestId("journey-aquarium")).toBeVisible();
        const expandedY = await absoluteFieldY();
        console.log(`${label} capacity Y at 84 L: folded=${collapsedY}px, expanded=${expandedY}px`);
        await noOverflow(page, label + " open");
        await screenshot(page, label + "-expanded");
        await close.tap();
        await expect(preview).toBeHidden();
        await expect(toggle).toBeFocused();
        await jump.press("Enter");
        await expect(toggle).toBeFocused();
        await expect(preview).toBeVisible();
        await close.press("Space");
        await expect(jump).toBeFocused();
        await expect(jump).toBeInViewport();
        await expect(preview).toBeHidden();
        await expect(field).toHaveValue("84");
        await noOverflow(page, label + " closed again");
        if (width === 390) {
          const map = page.locator(".aqv-journey-map");
          await map.locator("summary").tap();
          await map.getByRole("button").nth(2).tap(); // equipment, step 3 of the map
          await page.locator("label[for=light-basic-led]").tap();
          await jump.tap();
          await expect(preview.locator(".aqv-aquarium-explorer[open]")).toHaveCount(0);
          await expect(roomOption(preview, "day")).toBeChecked();
          const dusk = roomOption(preview, "dusk");
          await preview.locator("label").filter({ hasText: copy["journey-view-light"].dusk }).tap();
          await expect(dusk).toBeChecked();
          await expect(preview.getByTestId("journey-aquarium")).toHaveAttribute("data-has-water", "false");
          await screenshot(preview.locator(".aqv-aquarium-viewport"), label + "-aquarium-dusk");
          await noOverflow(page, label + " twilight");
        }
      } else {
        await expect(toggle).toBeHidden();
        await expect(jump).toBeHidden();
        await expect(close).toBeHidden();
        await expect(preview.getByTestId("journey-aquarium")).toBeVisible();
        const explorer = preview.locator(".aqv-aquarium-explorer");
        await explorer.locator("summary").press("Enter");
        await page.keyboard.press("Tab");
        const topic = id => explorer.getByRole("button", { name: copy["journey-explore"][id].label, exact: true });
        await expect(topic("space")).toBeFocused();
        await page.keyboard.press("Tab"); // filter
        await page.keyboard.press("Tab"); // lighting
        await expect(topic("light")).toBeFocused();
        await page.keyboard.press("Space");
        await expect(topic("light")).toHaveAttribute("aria-pressed", "true");
        await expect(roomOption(preview, "dusk")).toHaveCount(0);
        await explorer.locator(".aqv-aquarium-explorer__link").press("Enter");
        await expect(page.locator('[data-tour="journey-content"] h2').first()).toBeFocused();
        await page.locator("label[for=light-basic-led]").click();
        const scene = preview.getByTestId("journey-aquarium");
        await expect(scene).toHaveAttribute("data-has-water", "false");
        const day = roomOption(preview, "day");
        const dusk = roomOption(preview, "dusk");
        await expect(day).toBeChecked();
        await screenshot(preview.locator(".aqv-aquarium-viewport"), "aquarium-day");
        await day.press("ArrowRight");
        await expect(dusk).toBeChecked();
        await expect(scene).toHaveAttribute("data-has-water", "false");
        await expect(page.locator("#light-basic-led")).toBeChecked();
        await screenshot(preview.locator(".aqv-aquarium-viewport"), "aquarium-dusk");
        await noOverflow(page, label + " explorer");
      }
      assert.deepEqual(errors, [], `${label}: uncaught browser errors`);
      console.log(`${label}: passed`);
    } catch (error) {
      await screenshot(page, label + "-failure");
      throw error;
    } finally { await context.close(); }
  }
} finally {
  await browser?.close();
  if (server.listening) await new Promise(done => server.close(done));
}

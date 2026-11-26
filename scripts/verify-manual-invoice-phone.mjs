/** Exercise the built admin and receipt routes using local, in-memory API fixtures. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { chromium, expect, webkit } from "@playwright/test";

const root = resolve("dist/public");
const shell = await readFile(resolve(root, "index.html")).catch(error => {
  if (error.code !== "ENOENT") throw error;
  return readFile("dist/ssr-template/index.html");
});
const types = { ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp" };
const server = createServer(async (req, res) => {
  const path = new URL(req.url, "http://127.0.0.1").pathname;
  if (path === "/admin" || /^\/(?:ckb\/)?invoice\/test$/.test(path)) {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(shell);
    return;
  }
  try {
    const asset = resolve(root, "." + decodeURIComponent(path));
    if (!asset.startsWith(root + sep)) throw new Error("outside build");
    const bytes = await readFile(asset);
    res.writeHead(200, { "content-type": types[extname(asset)] ?? "application/octet-stream" }).end(bytes);
  } catch { res.writeHead(404).end(); }
});

const product = { id: "tank", name: "حوض اختبار", price: "9000", stock: 10, hasVariants: true, variants: [
  { id: "small", label: "صغير", price: null, priceStatus: "pending", stock: 4 },
  { id: "medium", label: "وسط", price: 5000, stock: 0 },
  { id: "large", label: "كبير", price: 53000, stock: 2 },
] };

let browser;
try {
  await new Promise((done, reject) => server.once("error", reject).listen(0, "127.0.0.1", done));
  const origin = `http://127.0.0.1:${server.address().port}`;
  for (const engine of [chromium, webkit]) {
    browser = await engine.launch(engine === chromium ? {
      executablePath: process.env.AQUAVO_BROWSER_EXECUTABLE || undefined,
      args: ["--no-sandbox", "--no-zygote", "--disable-dev-shm-usage"],
    } : {});
    for (const language of ["ar", "ckb"]) {
      const opposite = language === "ckb" ? "ar" : "ckb";
      const context = await browser.newContext({ viewport: { width: 390, height: 844 },
        hasTouch: true, isMobile: true, locale: opposite === "ar" ? "ar-IQ" : "ckb-IQ",
        serviceWorkers: "block", reducedMotion: "reduce" });
      try {
        const page = await context.newPage();
        const errors = [];
        let draft;
        let invoiceStatus = "sent";
        let confirmations = 0;
        page.on("pageerror", error => errors.push(error.message));
        await page.addInitScript(() => localStorage.setItem("aquavo_first_dive_seen_v2", "1"));
        await context.route("**/*", route => {
          const { origin: requestOrigin, pathname } = new URL(route.request().url());
          if (requestOrigin !== origin) return route.abort();
          if (!pathname.startsWith("/api/")) return route.continue();
          let data;
          switch (pathname) {
            case "/api/user": data = { id: "fixture-admin", role: "admin", email: "test@example.invalid" }; break;
            case "/api/admin/orders": data = []; break;
            case "/api/admin/invoices/stats": data = { success: true, data: {} }; break;
            case "/api/admin/invoices/product-search": data = { products: [product] }; break;
            case "/api/products":
            case "/api/products/smart-search": data = { products: [] }; break;
            case "/api/admin/invoices":
              if (route.request().method() === "POST") {
                draft = route.request().postDataJSON();
                data = { success: true, data: { id: "fixture-invoice", invoiceNo: "TEST" } };
              } else data = { success: true, data: [] };
              break;
            case "/api/invoice/test":
              data = { success: true, data: { ...draft, invoiceNo: "TEST", status: invoiceStatus,
                items: draft.items.map(line => ({ ...line, name: language === "ckb" ? "ئەکواریۆمی تاقیکردنەوە" : line.name })) } };
              break;
            case "/api/invoice/test/confirm":
              assert.equal(route.request().method(), "POST");
              confirmations += 1;
              invoiceStatus = "confirmed";
              data = { success: true, orderId: "fixture-order", invoiceNo: "TEST" };
              break;
            default: return route.fulfill({ status: 404, json: {} });
          }
          return route.fulfill({ json: data });
        });
        await page.goto(origin + "/admin?section=invoices");
        const create = page.getByRole("button", { name: "فاتورة جديدة" });
        await expect(create).toBeVisible({ timeout: 20000 });
        await create.tap();
        const selector = page.locator("#manual-invoice-locale");
        await expect(selector).toHaveValue("ar");
        if (language === "ckb") await selector.selectOption(language);
        await page.getByPlaceholder("أحمد محمد").fill("تجربة");
        await page.getByPlaceholder("07xxxxxxxxx").fill("07700000000");
        await page.getByPlaceholder("ابحث باسم المنتج، الفئة، أو الماركة...").fill("حوض");
        await page.getByText(product.name, { exact: true }).tap();
        await expect(page.getByRole("button", { name: /صغير.*بانتظار التسعير/ })).toBeDisabled();
        await expect(page.getByRole("button", { name: /وسط.*غير متوفر/ })).toBeDisabled();
        await page.getByRole("button", { name: /كبير.*53,000/ }).tap();
        await expect(page.getByText("حوض اختبار — كبير")).toBeVisible();
        await page.getByRole("dialog").getByRole("button", { name: "مسودة", exact: true }).tap();
        await expect.poll(() => draft?.invoiceLocale).toBe(language);
        assert.equal(draft.items[0].variantId, "large");
        assert.equal(draft.items[0].unitPrice, 53000);

        // Go through the opposite storefront locale to test the saved choice has priority.
        const prefix = opposite === "ar" ? "" : "/ckb";
        await page.goto(origin + prefix + "/invoice/test");
        const receipt = page.locator(".manual-invoice-receipt");
        await expect(receipt).toHaveAttribute("lang", language, { timeout: 20000 });
        await expect(receipt).toHaveAttribute("dir", "rtl");
        const copy = JSON.parse(await readFile(`client/src/locales/${language}/orders.json`, "utf8"));
        const receiptTotal = receipt.getByText(copy["invoice-view"].s22, { exact: true });
        await expect(receiptTotal).toBeVisible();
        const print = receipt.getByRole("button", { name: copy["order-confirmation"].s74 });
        await expect(print).toBeVisible();
        await page.emulateMedia({ media: "print" });
        await expect(print).toBeHidden();
        await expect(receiptTotal).toBeVisible();
        await expect(receipt.getByText(language === "ckb" ? "ئەکواریۆمی تاقیکردنەوە" : "حوض اختبار — كبير")).toBeVisible();
        // The visual printer must not exist until a customer actually confirms.
        await page.emulateMedia({ media: "screen", reducedMotion: "no-preference" });
        const machine = receipt.locator("[data-aqv-receipt]");
        await expect(machine).toHaveCount(0);
        page.once("dialog", dialog => dialog.accept());
        await receipt.getByRole("button", { name: copy["invoice-view"].s24, exact: true }).tap();
        await expect(machine).toBeVisible({ timeout: 15000 });
        await expect(machine).toHaveAttribute("lang", language);
        await expect(machine).toHaveAttribute("dir", "rtl");
        await expect(machine).toHaveAttribute("data-stage", "complete", { timeout: 15000 });
        await expect(machine.getByText(language === "ckb" ? "ئەکواریۆمی تاقیکردنەوە" : "حوض اختبار — كبير", { exact: true })).toBeVisible();
        assert.equal(confirmations, 1);
        await page.emulateMedia({ media: "print" });
        await expect(machine).toBeHidden();
        await expect(receiptTotal).toBeVisible();
        await page.emulateMedia({ media: "screen", reducedMotion: "reduce" });
        await page.reload();
        await expect(machine).toBeVisible({ timeout: 20000 });
        await expect(machine).toHaveAttribute("data-stage", "complete");
        assert.equal(confirmations, 1);
        invoiceStatus = "rejected";
        await page.reload();
        await expect(receipt).toBeVisible({ timeout: 20000 });
        await expect(machine).toHaveCount(0);
        assert.deepEqual(errors, []);
        console.log(`${engine.name()} 390px ${language}: pending and sold-out options, draft, receipt, confirmation animation, reload, rejection, print passed`);
      } finally { await context.close(); }
    }
    await browser.close();
    browser = undefined;
  }
} finally {
  await browser?.close();
  if (server.listening) await new Promise(done => server.close(done));
}

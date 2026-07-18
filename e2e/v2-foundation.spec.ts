import { expect, test } from "@playwright/test";

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
];

for (const viewport of viewports) {
  test(`v2 foundation is stable on ${viewport.name}`, async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.setViewportSize(viewport);

    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page.locator('link[rel="icon"]')).toHaveAttribute("href", "/brand/aquavo-v2-favicon.png");
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#0B93A6");
    await expect(page.locator('img[src="/brand/aquavo-v2-horizontal.svg"]').first()).toBeVisible();
    await expect(page.locator("#loading-shell")).toHaveCount(0);
    await expect(page.getByText("__JSON_LD__", { exact: true })).toHaveCount(0);
    await expect(page.locator("nav a button, nav button a, nav a a, nav button button")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1, name: "معدات حوضك، مرتبة على احتياجك" })).toBeVisible();
    await expect(page.locator("main").getByRole("link", { name: /شوف المنتجات/ })).toBeVisible();
    await expect(page.locator("main").getByRole("link", { name: /اختار حسب حوضك/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "ابدأ من احتياج الحوض" })).toBeVisible();
    await expect(page.locator("main a button, main button a, main a a, main button button")).toHaveCount(0);
    await expect(page.getByText(/أصلي 100%/)).toHaveCount(0);

    if (viewport.name === "mobile") {
      await page.getByRole("button", { name: "فتح القائمة الرئيسية" }).click();
      await expect(page.getByRole("heading", { name: "القائمة الرئيسية" })).toBeVisible();
      await expect(page.getByRole("link", { name: "المتجر" })).toBeVisible();
      await page.keyboard.press("Escape");
    } else if (viewport.name === "desktop") {
      await expect(page.getByRole("link", { name: "المتجر", exact: true })).toBeVisible();
      await expect(page.getByRole("link", { name: "أدلة AQUAVO", exact: true })).toBeVisible();
    }

    const documentState = await page.evaluate(() => ({
      direction: document.documentElement.dir,
      background: getComputedStyle(document.body).backgroundColor,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      rootChildren: document.body.children.length,
    }));

    expect(documentState.direction).toBe("rtl");
    expect(documentState.background).toBe("rgb(11, 30, 40)");
    expect(documentState.overflow).toBeLessThanOrEqual(1);
    expect(documentState.rootChildren).toBeGreaterThanOrEqual(1);
    expect(pageErrors).toEqual([]);
  });
}

test("footer exposes verified trust, legal and contact facts", async ({ page }) => {
  await page.goto("/about", { waitUntil: "domcontentloaded" });
  const footer = page.getByRole("contentinfo");

  await footer.scrollIntoViewIfNeeded();
  await expect(footer).toBeVisible();
  await expect(footer.getByText(/محل المنبع — AL NABEA SHOP/).first()).toBeVisible();
  await expect(footer.getByText("طريقة الدفع المتوفرة هسه: الدفع النقدي عند الاستلام")).toBeVisible();
  await expect(footer.getByText("أجور التوصيل الثابتة: 5,000 د.ع")).toBeVisible();
  await expect(footer.getByRole("textbox", { name: "تحديثات المنتجات والأدلة" })).toBeVisible();
  await expect(footer.getByRole("link", { name: /وثيقة YEE/ })).toHaveAttribute("href", "/verify-certificate/yee");
  await expect(footer.getByText(/كي كارد|زين كاش/)).toHaveCount(0);
});

for (const viewport of [
  { name: "shop-tablet", width: 768, height: 1024 },
  { name: "shop-mobile", width: 360, height: 800 },
]) {
  test(`shop keeps a stable recovery path on ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/products", { waitUntil: "domcontentloaded" });

    const main = page.locator("main");
    await expect(main.getByRole("heading", { level: 1, name: "جهّز حوضك على أساس واضح" })).toBeVisible();
    await expect(main.getByRole("combobox", { name: "ترتيب المنتجات" })).toBeVisible();

    const errorHeading = main.getByRole("heading", { name: "ما كدرنا نحمّل المنتجات" });
    const firstProduct = main.locator('[data-tour="product-card-first"]');
    await expect(errorHeading.or(firstProduct)).toBeVisible();

    if (await errorHeading.isVisible()) {
      await expect(main.getByRole("button", { name: "حاول مرة ثانية" })).toBeVisible();
      await expect(main.getByRole("heading", { name: "لم يتم العثور على منتجات" })).toHaveCount(0);
    } else {
      await expect(firstProduct.locator("a button, button a")).toHaveCount(0);
    }

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
}

test("YEE proof document supports keyboard viewing and stays separate from warranty", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/verify-certificate/yee", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { level: 1, name: "وثيقة أصالة منتجات YEE" })).toBeVisible();
  await expect(page.getByText(/مو ضمان AQUAVO/)).toBeVisible();
  await expect(page.getByRole("link", { name: /افتح ملف PDF/ })).toHaveAttribute("href", "/certificates/yee-certificate.pdf");
  await expect(page.getByRole("link", { name: /ارجع للمتجر/ })).toHaveAttribute("href", "/products");

  await page.getByRole("button", { name: "افتح الشهادة بحجم أكبر" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "تكبير الشهادة" }).click();
  await expect(dialog.locator("output")).toHaveText("125%");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("checkout shows one COD total and blocks invalid customer data without placing an order", async ({ page }) => {
  const orderRequests: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().includes("/api/orders")) orderRequests.push(request.url());
  });
  await page.addInitScript(() => {
    localStorage.setItem("aquavo_cart-v2", JSON.stringify([{
      id: "e2e-product-default",
      productId: "e2e-product",
      name: "فلتر اختبار",
      price: 25000,
      quantity: 1,
      image: "/brand/aquavo-v2-icon.svg",
      slug: "e2e-product",
    }]));
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/checkout", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { level: 1, name: "إتمام الطلب" })).toBeVisible();
  await expect(page.getByText("30,000 د.ع")).toBeVisible();
  await expect(page.getByText("الدفع عند الاستلام", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "الدفع عند الاستلام — تأكيد طلبي" }).click();
  await expect(page.getByText("الاسم مطلوب")).toBeVisible();
  await expect(page.getByText("رقم الهاتف مطلوب")).toBeVisible();
  await expect(page.getByText("يرجى اختيار المحافظة")).toBeVisible();
  await expect(page.getByText("العنوان مطلوب")).toBeVisible();
  expect(orderRequests).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});

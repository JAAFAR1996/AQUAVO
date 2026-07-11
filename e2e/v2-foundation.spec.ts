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

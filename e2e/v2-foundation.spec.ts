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

import { expect, test } from "@playwright/test";

const viewports = [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 430, height: 932 },
  { width: 390, height: 844 },
  { width: 360, height: 800 },
];

for (const viewport of viewports) {
  test(`minimal precision motion stays usable at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const primaryCta = page.locator('main a[href="/products"]').first();
    await expect(primaryCta).toBeVisible();
    const headerDuration = await page.locator(".aq-site-header").evaluate((element) =>
      getComputedStyle(element).animationDuration,
    );
    expect(Number.parseFloat(headerDuration)).toBeLessThanOrEqual(0.55);

    const categorySection = page.locator(".aq-precision-reveal").nth(1);
    await categorySection.scrollIntoViewIfNeeded();
    await expect(categorySection).toHaveAttribute("data-visible", "true");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  });
}

test("reduced motion exposes content immediately without transforms", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".aq-site-header")).toBeVisible();
  await expect(page.locator(".aq-hero-title")).toBeVisible();

  const state = await page.evaluate(() => ({
    headerAnimation: getComputedStyle(document.querySelector(".aq-site-header")!).animationName,
    titleAnimation: getComputedStyle(document.querySelector(".aq-hero-title")!).animationName,
    hiddenSections: [...document.querySelectorAll<HTMLElement>(".aq-precision-reveal")]
      .filter((element) => {
        const style = getComputedStyle(element);
        return style.opacity === "0" || style.transform !== "none";
      }).length,
  }));

  expect(state.headerAnimation).toBe("none");
  expect(state.titleAnimation).toBe("none");
  expect(state.hiddenSections).toBe(0);
});

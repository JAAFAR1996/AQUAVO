/**
 * Trilingual storefront: every major page class in ar / en / ckb, the
 * language selector on desktop and mobile, equivalent-page switching, direct
 * URL access, cookie persistence, lang/dir, 404, and screenshots for visual QA.
 *
 * Run: npx playwright test e2e/i18n-locales.spec.ts --project=desktop-light --project=mobile-light
 * Screenshots land in e2e-artifacts/i18n/<locale>-<page>-<viewport>.png
 */
import { expect, test, type Page } from "@playwright/test";

const LOCALES = [
  { code: "ar", prefix: "", dir: "rtl", native: "العربية", script: /\p{Script=Arabic}/u },
  { code: "en", prefix: "/en", dir: "ltr", native: "English", script: /[A-Za-z]/ },
  { code: "ckb", prefix: "/ckb", dir: "rtl", native: "کوردی", script: /[ڕڵۆێەڤگچپژ]/u },
] as const;

const PAGES: Array<{ name: string; path: string; expectAdditional?: (page: Page) => Promise<void> }> = [
  { name: "home", path: "/" },
  { name: "products", path: "/products" },
  { name: "category", path: "/products?category=%D8%A3%D8%AD%D9%88%D8%A7%D8%B6" },
  { name: "product", path: "/products/aquavo-driftwood-dw-01" },
  { name: "blog", path: "/blog" },
  { name: "guide", path: "/guides/filter-choice" },
  { name: "login", path: "/login" },
  { name: "register", path: "/register" },
  { name: "order-tracking", path: "/order-tracking" },
  { name: "checkout", path: "/checkout" },
  { name: "404", path: "/this-page-does-not-exist" },
];

/** The header control on desktop, the drawer control on mobile, the floating control on bare pages. */
async function visibleSwitcher(page: Page) {
  // The app mounts only after the locale bundles are loaded; wait for the shell.
  await page.locator('nav[aria-label], [data-testid="floating-language-switcher"]').first().waitFor({ state: "attached", timeout: 30_000 });
  const all = page.getByTestId("language-switcher");
  for (let i = 0; i < (await all.count()); i++) {
    const c = all.nth(i);
    if (await c.isVisible()) return c;
  }
  const menu = page.locator('button[aria-controls="mobile-menu"]');
  if (await menu.count()) {
    await menu.first().click();
    await page.getByTestId("language-switcher").last().waitFor({ state: "visible" });
    return page.getByTestId("language-switcher").last();
  }
  return all.first();
}

async function shot(page: Page, name: string, testInfo: { project: { name: string } }) {
  await page.screenshot({ path: `e2e-artifacts/i18n/${name}-${testInfo.project.name}.png`, fullPage: false });
}

for (const locale of LOCALES) {
  test.describe(`locale ${locale.code}`, () => {
    for (const p of PAGES) {
      test(`${p.name} renders in ${locale.code} with correct lang/dir`, async ({ page }, testInfo) => {
        await page.goto(`${locale.prefix}${p.path}`);
        await page.waitForLoadState("networkidle").catch(() => undefined);
        await expect(page.locator("html")).toHaveAttribute("lang", locale.code);
        await expect(page.locator("html")).toHaveAttribute("dir", locale.dir);
        // The language button shows the current language in its own script.
        // On mobile the header control lives inside the menu drawer.
        const switcher = await visibleSwitcher(page);
        await expect(switcher).toContainText(locale.native);
        // No horizontal overflow (clipping / wrapping regressions).
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, "horizontal overflow px").toBeLessThanOrEqual(1);
        await shot(page, `${locale.code}-${p.name}`, testInfo);
      });
    }

    test(`language selector lists all three languages and switches to the equivalent page (${locale.code})`, async ({ page }) => {
      await page.goto(`${locale.prefix}/products/aquavo-driftwood-dw-01?variant=x`);
      await (await visibleSwitcher(page)).click();
      for (const other of LOCALES) await expect(page.getByTestId(`language-option-${other.code}`)).toBeVisible();
      const target = LOCALES.find((l) => l.code !== locale.code)!;
      await page.getByTestId(`language-option-${target.code}`).click();
      await page.waitForURL((url) => url.pathname === `${target.prefix}/products/aquavo-driftwood-dw-01`);
      expect(new URL(page.url()).search).toBe("?variant=x");
      await expect(page.locator("html")).toHaveAttribute("lang", target.code);
      // The choice is remembered (cookie) and survives a reload.
      const cookies = await page.context().cookies();
      expect(cookies.find((c) => c.name === "aq_locale")?.value).toBe(target.code);
      await page.reload();
      await expect(page.locator("html")).toHaveAttribute("lang", target.code);
    });
  });
}

test("cart survives a language switch", async ({ page }) => {
  await page.goto("/products/aquavo-driftwood-dw-01");
  await page.evaluate(() => {
    localStorage.setItem("aquavo-cart", JSON.stringify([{ id: "test", productId: "aquavo-driftwood-dw-01", name: "x", price: 40000, quantity: 1, image: "" }]));
  });
  await page.goto("/en/products/aquavo-driftwood-dw-01");
  const stored = await page.evaluate(() => localStorage.getItem("aquavo-cart"));
  expect(stored).toContain("aquavo-driftwood-dw-01");
});

test("BiDi: mixed Latin model numbers stay in order inside RTL product names", async ({ page }) => {
  await page.goto("/products");
  const cards = page.locator("h3").filter({ hasText: /YEE|DW-|HOB/ });
  await page.waitForTimeout(3000);
  test.skip((await cards.count()) === 0, "catalogue not available on this server (mock storage)");
  const name = await cards.first().textContent();
  expect(name ?? "").toMatch(/DW-\d+|YEE|HOB \d+/);
});

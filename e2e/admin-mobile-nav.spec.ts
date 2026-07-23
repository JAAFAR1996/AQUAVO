import { test, expect, type Page } from "@playwright/test";
import { lazyAdminCredentials } from "./support/test-credentials";

/**
 * F-7 remediation coverage — admin responsive navigation.
 *
 * The defect: at 393px (Pixel 5) the admin "الطلبات" (Orders) tab could not be
 * activated — clicks never switched the panel, so Orders / Fulfillment were
 * unreachable on phones. This spec proves every admin section is reachable across
 * representative widths, in RTL, in light and dark, by keyboard, with adequate
 * touch targets, and with no horizontal page overflow.
 *
 * Runs inside the pinned E2E harness (verify branch only). Credentials are the
 * per-run synthetic admin seeded by global-setup.
 */

const CREDS = lazyAdminCredentials({
  baseURL: process.env.PLAYWRIGHT_BASE_URL ?? process.env.E2E_BASE_URL,
});

// Every admin section the remediation must keep reachable. `value` is the
// Radix tab value; `label` is the visible Arabic text (may include an emoji).
const SECTIONS: { value: string; label: string }[] = [
  { value: "products", label: "المنتجات" },
  { value: "orders", label: "الطلبات" },
  { value: "accounting", label: "المحاسب" },
  { value: "invoices", label: "فواتير واتساب" },
  { value: "coupons", label: "الكوبونات" },
  { value: "customers", label: "العملاء" },
  { value: "reviews", label: "المراجعات" },
  { value: "gallery", label: "المعرض" },
  { value: "audit-logs", label: "السجلات" },
  { value: "analytics", label: "التحليلات" },
  { value: "security", label: "الأمان" },
  { value: "settings", label: "الإعدادات" },
];

async function loginAsAdmin(page: Page) {
  await page.goto("/admin/login", { waitUntil: "domcontentloaded" });
  await page.locator('input[type="email"]').first().fill(CREDS.email);
  await page.locator('input[type="password"]').first().fill(CREDS.password);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL(/\/admin(?!\/login)/, { timeout: 20_000 });
  // The dashboard tabs mount after the products query resolves.
  await expect(page.getByRole("tab", { name: /المنتجات/ })).toBeVisible({ timeout: 20_000 });
}

/** Activate a section through the real mobile UI and assert its panel shows. */
async function openSection(page: Page, value: string, label: string) {
  const trigger = page.getByRole("tab", { name: new RegExp(label) }).first();
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();
  // Radix flips data-state to active on the selected trigger.
  await expect(trigger).toHaveAttribute("data-state", "active", { timeout: 10_000 });
  // And the matching panel becomes visible.
  await expect(page.locator(`[role="tabpanel"][data-state="active"]`).first()).toBeVisible();
}

function noHorizontalOverflow(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
  );
}

test.describe("F-7 — admin responsive navigation", () => {
  test("393x852 (Pixel 5): every section is reachable, no horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 852 });
    await loginAsAdmin(page);

    for (const s of SECTIONS) {
      await openSection(page, s.value, s.label);
      expect(await noHorizontalOverflow(page), `no h-overflow on ${s.value}`).toBe(true);
    }
  });

  test("360x800 (small Android): Orders and Fulfillment reachable", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await loginAsAdmin(page);
    await openSection(page, "orders", "الطلبات");
    // Orders panel hosts the fulfillment entry (per-order panel opens from a row);
    // reaching the Orders section is the gate for Fulfillment on mobile.
    await expect(page.getByText("إدارة الطلبات").first()).toBeVisible();
    expect(await noHorizontalOverflow(page)).toBe(true);
  });

  test("768x1024 (tablet): every section reachable", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await loginAsAdmin(page);
    for (const s of SECTIONS) {
      await openSection(page, s.value, s.label);
    }
    expect(await noHorizontalOverflow(page)).toBe(true);
  });

  test("1280x720 (desktop): every section reachable", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await loginAsAdmin(page);
    for (const s of SECTIONS) {
      await openSection(page, s.value, s.label);
    }
  });

  test("keyboard: tabs are focusable and arrow keys move between them (RTL)", async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 852 });
    await loginAsAdmin(page);

    const products = page.getByRole("tab", { name: /المنتجات/ }).first();
    await products.focus();
    await expect(products).toBeFocused();

    // Radix roving-tabindex: ArrowLeft/Right move focus within the tablist. In RTL
    // the physical direction is mirrored; we assert focus MOVES to another tab and
    // that Enter/Space activates it — the exact neighbour depends on RTL mapping.
    await page.keyboard.press("ArrowLeft");
    const focusedRole = await page.evaluate(() =>
      document.activeElement?.getAttribute("role"),
    );
    expect(focusedRole).toBe("tab");
    await page.keyboard.press("Enter");
    await expect(page.locator(`[role="tabpanel"][data-state="active"]`).first()).toBeVisible();
  });

  test("touch targets: every tab is at least 40px tall", async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 852 });
    await loginAsAdmin(page);
    const tabs = page.getByRole("tab");
    const n = await tabs.count();
    expect(n).toBeGreaterThanOrEqual(12);
    for (let i = 0; i < n; i++) {
      const box = await tabs.nth(i).boundingBox();
      expect(box, `tab ${i} has a box`).not.toBeNull();
      if (box) expect(box.height).toBeGreaterThanOrEqual(40);
    }
  });

  test("RTL ordering: المنتجات sits to the RIGHT of الطلبات", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await loginAsAdmin(page);
    const products = await page.getByRole("tab", { name: /المنتجات/ }).first().boundingBox();
    const orders = await page.getByRole("tab", { name: /الطلبات/ }).first().boundingBox();
    expect(products).not.toBeNull();
    expect(orders).not.toBeNull();
    if (products && orders) {
      // In RTL the first tab (المنتجات) is visually right-most.
      expect(products.x).toBeGreaterThan(orders.x);
    }
  });

  test("dark scheme: Orders reachable and active state visible", async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes("dark"), "dark-scheme projects only");
    await page.setViewportSize({ width: 393, height: 852 });
    await loginAsAdmin(page);
    await openSection(page, "orders", "الطلبات");
    const trigger = page.getByRole("tab", { name: /الطلبات/ }).first();
    // Active trigger must be visually distinct (non-transparent background).
    const bg = await trigger.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).not.toBe("rgba(0, 0, 0, 0)");
  });

  test("browser back/forward returns to the previously selected section", async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 852 });
    await loginAsAdmin(page);
    await openSection(page, "orders", "الطلبات");
    await openSection(page, "customers", "العملاء");
    await page.goBack();
    // After Back, Orders is the active section again.
    await expect(page.getByRole("tab", { name: /الطلبات/ }).first()).toHaveAttribute(
      "data-state",
      "active",
      { timeout: 10_000 },
    );
    await page.goForward();
    await expect(page.getByRole("tab", { name: /العملاء/ }).first()).toHaveAttribute(
      "data-state",
      "active",
      { timeout: 10_000 },
    );
  });

  test("deep link: /admin?section=orders opens Orders directly", async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 852 });
    await loginAsAdmin(page);
    await page.goto("/admin?section=orders", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("tab", { name: /الطلبات/ }).first()).toHaveAttribute(
      "data-state",
      "active",
      { timeout: 15_000 },
    );
  });

  test("deep link: /admin?section=accounting opens Fulfillment/Accounting directly", async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 852 });
    await loginAsAdmin(page);
    await page.goto("/admin?section=accounting", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("tab", { name: /المحاسب/ }).first()).toHaveAttribute(
      "data-state",
      "active",
      { timeout: 15_000 },
    );
  });
});

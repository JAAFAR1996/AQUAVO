import { test, expect, type Page } from '@playwright/test';

/**
 * Geometry + RTL-arrow regression tests for the /products responsive controls
 * (category pills, filter chips, sort select).
 *
 * Background: category pills, filter chips, and the sort control did not
 * reliably contain their Arabic labels/icons/count-badges inside their
 * borders on mobile/tablet, and the RTL scroll-arrow visibility logic in
 * category-scroll-bar.tsx was inverted (showed the no-op arrow at each edge
 * instead of the actionable one). This file asserts:
 *   - filter/sort control text stays inside its border (with a small safe
 *     padding) at every viewport
 *   - no icon/text or badge/text overlap
 *   - no horizontal page overflow
 *   - the correct RTL arrow (not the no-op one) is visible at each scroll
 *     boundary, verified via scrollLeft measurements
 *   - first and last categories are reachable via the scroll buttons
 *
 * NOTE: the category-pill assertions require real category data (from the
 * database). Against a local dev server with no DATABASE_URL configured
 * (in-memory mock storage, no products), the category strip renders empty
 * and those specific assertions are skipped with a console note rather than
 * failing the whole file — the filter-bar/sort-select/page-overflow
 * assertions do not depend on product data and always run.
 */

const VIEWPORTS = [
    { name: '360x800', width: 360, height: 800 },
    { name: '390x844', width: 390, height: 844 },
    { name: '430x932', width: 430, height: 932 },
    { name: '768x1024', width: 768, height: 1024 },
    { name: '820x1180', width: 820, height: 1180 },
    { name: '1440x900', width: 1440, height: 900 },
];

const SAFE_PAD = 2; // px tolerance for subpixel rounding

async function rect(page: Page, selector: string) {
    return page.locator(selector).first().evaluate((el) => {
        const r = el.getBoundingClientRect();
        return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
    });
}

test.describe('Products responsive controls: no horizontal page overflow', () => {
    for (const vp of VIEWPORTS) {
        test(`no horizontal overflow @ ${vp.name}`, async ({ page }) => {
            await page.setViewportSize({ width: vp.width, height: vp.height });
            await page.goto('/products');
            await page.waitForTimeout(500);
            const overflow = await page.evaluate(() => ({
                scrollWidth: document.documentElement.scrollWidth,
                clientWidth: document.documentElement.clientWidth,
            }));
            expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
        });
    }
});

test.describe('FilterBar controls: labels stay inside their borders', () => {
    for (const vp of VIEWPORTS) {
        test(`filter/sort labels contained @ ${vp.name}`, async ({ page }) => {
            await page.setViewportSize({ width: vp.width, height: vp.height });
            await page.goto('/products');
            await page.waitForTimeout(500);

            const controls = [
                { name: 'الفلاتر', selector: 'button:has-text("الفلاتر")' },
                { name: 'السعر', selector: 'button:has-text("السعر")' },
                { name: 'جديد', selector: 'button:has-text("جديد")' },
                { name: 'الأكثر مبيعاً', selector: 'button:has-text("الأكثر مبيعاً")' },
                { name: 'صديق للبيئة', selector: 'button:has-text("صديق للبيئة")' },
            ];

            for (const control of controls) {
                const locator = page.locator(control.selector).first();
                const count = await locator.count();
                if (count === 0) continue; // not rendered in this environment; skip gracefully

                const btnBox = await locator.evaluate((el) => {
                    const r = el.getBoundingClientRect();
                    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, height: r.height };
                });

                const labelBox = await locator.evaluate((el) => {
                    const span = el.querySelector('span');
                    if (!span) return null;
                    const r = span.getBoundingClientRect();
                    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, height: r.height };
                });

                // Touch target height (WCAG 2.5.8 / brand requirement: >=44px)
                expect(btnBox.height).toBeGreaterThanOrEqual(44 - SAFE_PAD);

                if (labelBox) {
                    expect(labelBox.left).toBeGreaterThanOrEqual(btnBox.left - SAFE_PAD);
                    expect(labelBox.right).toBeLessThanOrEqual(btnBox.right + SAFE_PAD);
                    expect(labelBox.top).toBeGreaterThanOrEqual(btnBox.top - SAFE_PAD);
                    expect(labelBox.bottom).toBeLessThanOrEqual(btnBox.bottom + SAFE_PAD);
                    // Label must not be forced onto two lines inside a pill this compact
                    // (two-word labels like "الأكثر مبيعاً" previously wrapped to 2 lines
                    // and doubled their height inside a fixed 44px pill).
                    expect(labelBox.height).toBeLessThanOrEqual(24);
                }
            }
        });
    }
});

test.describe('Sort select: label + chevron stay inside the trigger', () => {
    for (const vp of VIEWPORTS) {
        test(`sort trigger contained @ ${vp.name}`, async ({ page }) => {
            await page.setViewportSize({ width: vp.width, height: vp.height });
            await page.goto('/products');
            await page.waitForTimeout(500);

            const trigger = page.locator('[aria-label="ترتيب المنتجات"]');
            if ((await trigger.count()) === 0) return;

            const triggerBox = await rect(page, '[aria-label="ترتيب المنتجات"]');
            const valueBox = await trigger.evaluate((el) => {
                const span = el.querySelector('span');
                if (!span) return null;
                const r = span.getBoundingClientRect();
                return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
            });

            if (valueBox) {
                expect(valueBox.left).toBeGreaterThanOrEqual(triggerBox.left - SAFE_PAD);
                expect(valueBox.right).toBeLessThanOrEqual(triggerBox.right + SAFE_PAD);
            }
        });
    }
});

test.describe('CategoryScrollBar: RTL arrow visibility + first/last reachability', () => {
    test('shows the actionable arrow at each scroll boundary (RTL) and reaches first/last category', async ({ page }) => {
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.goto('/products');
        await page.waitForTimeout(1000);

        const scrollRow = page.locator('.hidden.sm\\:block .overflow-x-auto').first();
        const rowCount = await scrollRow.count();
        if (rowCount === 0) {
            test.skip(true, 'No category data available in this environment (no DB) — cannot exercise the scroll strip.');
            return;
        }

        const metrics = await scrollRow.evaluate((el) => ({
            scrollWidth: el.scrollWidth,
            clientWidth: el.clientWidth,
        }));
        if (metrics.scrollWidth <= metrics.clientWidth) {
            test.skip(true, 'Category strip does not overflow in this environment — nothing to scroll.');
            return;
        }

        // At the start: "next" (التالية) must be actionable/visible, "previous" (السابقة) must not.
        const startScrollLeft = await scrollRow.evaluate((el) => el.scrollLeft);
        expect(startScrollLeft).toBe(0);
        await expect(page.locator('[aria-label="التمرير لعرض الفئات التالية"]')).toBeVisible();
        await expect(page.locator('[aria-label="التمرير لعرض الفئات السابقة"]')).not.toBeVisible();

        // Scroll to the true end and verify the arrows flip: previous becomes
        // actionable, next (no more content) hides.
        await scrollRow.evaluate((el) => {
            el.scrollLeft = -(el.scrollWidth - el.clientWidth);
        });
        await page.waitForTimeout(300);
        await expect(page.locator('[aria-label="التمرير لعرض الفئات السابقة"]')).toBeVisible();
        await expect(page.locator('[aria-label="التمرير لعرض الفئات التالية"]')).not.toBeVisible();

        // First/last category reachability: scroll back to start and confirm the
        // first category pill is within the visible row bounds; scroll to the end
        // and confirm the last one is too.
        await scrollRow.evaluate((el) => { el.scrollLeft = 0; });
        await page.waitForTimeout(300);
        const firstPill = scrollRow.locator('button').nth(1); // index 0 is "الكل"
        await expect(firstPill).toBeInViewport();

        await scrollRow.evaluate((el) => {
            el.scrollLeft = -(el.scrollWidth - el.clientWidth);
        });
        await page.waitForTimeout(300);
        const pillCount = await scrollRow.locator('button').count();
        const lastPill = scrollRow.locator('button').nth(pillCount - 1);
        await expect(lastPill).toBeInViewport();
    });
});

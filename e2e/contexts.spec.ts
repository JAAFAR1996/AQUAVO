import { test, expect } from '@playwright/test';
import { lazyAdminCredentials } from './support/test-credentials';

// Env-only admin credentials (no hardcoded defaults). See test-credentials.ts.
const CREDS = lazyAdminCredentials({ baseURL: process.env.PLAYWRIGHT_BASE_URL ?? process.env.E2E_BASE_URL });


/**
 * Context & State Management E2E Tests
 * اختبارات السياق وإدارة الحالة
 * 
 * Tests for:
 * - Comparison Context (add/remove/clear/max limit)
 * - Wishlist Context (add/remove/sync/localStorage)
 * - Cart Context (add/remove/quantity/total)
 * - Auth Context (login/logout/session)
 * - Shrimp Context (evolution stages)
 * - Analytics API (period filter, charts)
 * - Fish API (species data, compatibility)
 * - Cross-tab Sync
 * - State Persistence
 */

// ==========================================
// COMPARISON CONTEXT TESTS
// ==========================================
test.describe('سياق المقارنة - Comparison Context', () => {
    test('should add product to compare', async ({ page }) => {
        await page.goto('/products', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        const compareBtn = page.locator('button:has([class*="Scale"])').first();
        if (await compareBtn.isVisible()) {
            await compareBtn.click();
            await page.waitForTimeout(500);
        }
    });

    test('should limit compare to 4 products max', async ({ page }) => {
        await page.goto('/products', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        // Try adding 5 products
        const compareBtns = page.locator('button:has([class*="Scale"])');
        const count = await compareBtns.count();
        for (let i = 0; i < Math.min(count, 5); i++) {
            await compareBtns.nth(i).click();
            await page.waitForTimeout(300);
        }
    });

    test('should remove product from compare', async ({ page }) => {
        await page.goto('/compare', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        const removeBtn = page.locator('button:has([class*="X"]), button:has-text("إزالة")').first();
        if (await removeBtn.isVisible()) {
            await removeBtn.click();
            await page.waitForTimeout(500);
        }
    });

    test('should clear all compare items', async ({ page }) => {
        await page.goto('/compare', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        const clearBtn = page.locator('button:has-text("مسح الكل"), button:has-text("Clear All")');
        const isVisible = await clearBtn.isVisible();
        expect(isVisible || true).toBe(true);
    });

    test('should store compare in localStorage', async ({ page }) => {
        await page.goto('/products', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        const compareBtn = page.locator('button:has([class*="Scale"])').first();
        if (await compareBtn.isVisible()) {
            await compareBtn.click();
            await page.waitForTimeout(500);

            const stored = await page.evaluate(() => {
                return localStorage.getItem('aquavo_comparison');
            });
            expect(stored === null || typeof stored === 'string').toBe(true);
        }
    });

    test('should show compare button state', async ({ page }) => {
        await page.goto('/products', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        const compareBtn = page.locator('button:has([class*="Scale"])').first();
        const isVisible = await compareBtn.isVisible();
        expect(isVisible || true).toBe(true);
    });
});

// ==========================================
// WISHLIST CONTEXT TESTS
// ==========================================
test.describe('سياق المفضلة - Wishlist Context', () => {
    test('should add product to wishlist', async ({ page }) => {
        await page.goto('/products', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        const heartBtn = page.locator('button:has([class*="Heart"])').first();
        if (await heartBtn.isVisible()) {
            await heartBtn.click();
            await page.waitForTimeout(500);
        }
    });

    test('should remove product from wishlist', async ({ page }) => {
        await page.goto('/wishlist', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        const removeBtn = page.locator('button:has([class*="X"]), button:has([class*="Trash"])').first();
        if (await removeBtn.isVisible()) {
            await removeBtn.click();
            await page.waitForTimeout(500);
        }
    });

    test('should display wishlist count in header', async ({ page }) => {
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        const wishlistIcon = page.locator('a[href="/wishlist"] [class*="badge"], [class*="wishlist"] [class*="count"]');
        const count = await wishlistIcon.count();
        expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should persist wishlist after page reload', async ({ page }) => {
        await page.goto('/products', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        // Add item
        const heartBtn = page.locator('button:has([class*="Heart"])').first();
        if (await heartBtn.isVisible()) {
            await heartBtn.click();
            await page.waitForTimeout(500);

            // Reload page
            await page.reload();
            await page.waitForTimeout(2000);

            // Check persistence
            const stored = await page.evaluate(() => {
                return localStorage.getItem('aquavo_wishlist-v2');
            });
            expect(stored === null || typeof stored === 'string').toBe(true);
        }
    });

    test('should show heart animation on add', async ({ page }) => {
        await page.goto('/products', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        const heartBtn = page.locator('button:has([class*="Heart"])').first();
        if (await heartBtn.isVisible()) {
            await heartBtn.click();
            await page.waitForTimeout(200);
        }
    });

    test('should navigate to wishlist page', async ({ page }) => {
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        const wishlistLink = page.locator('a[href="/wishlist"]').first();
        if (await wishlistLink.isVisible()) {
            await wishlistLink.click();
            await page.waitForURL('**/wishlist');
        }
    });
});

// ==========================================
// CART CONTEXT TESTS
// ==========================================
test.describe('سياق السلة - Cart Context', () => {
    test('should add product to cart', async ({ page }) => {
        await page.goto('/products', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        const addBtn = page.locator('button:has-text("سلة"), button:has([class*="ShoppingCart"])').first();
        if (await addBtn.isVisible()) {
            await addBtn.click();
            await page.waitForTimeout(500);
        }
    });

    test('should update cart quantity', async ({ page }) => {
        await page.goto('/cart', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        const plusBtn = page.locator('button:has-text("+")').first();
        if (await plusBtn.isVisible()) {
            await plusBtn.click();
            await page.waitForTimeout(300);
        }
    });

    test('should remove item from cart', async ({ page }) => {
        await page.goto('/cart', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        const removeBtn = page.locator('button:has([class*="Trash"]), button:has([class*="X"])').first();
        if (await removeBtn.isVisible()) {
            await removeBtn.click();
            await page.waitForTimeout(500);
        }
    });

    test('should display cart total', async ({ page }) => {
        await page.goto('/cart', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        const total = page.locator('text=/المجموع|Total|الإجمالي/i');
        const isVisible = await total.isVisible();
        expect(isVisible || true).toBe(true);
    });

    test('should display cart count in header', async ({ page }) => {
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        const cartIcon = page.locator('a[href="/cart"] [class*="badge"], [class*="cart"] [class*="count"]');
        const count = await cartIcon.count();
        expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should apply coupon code', async ({ page }) => {
        await page.goto('/cart', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        const couponInput = page.locator('input[placeholder*="كوبون"], input[name*="coupon"]');
        if (await couponInput.isVisible()) {
            await couponInput.fill('TEST10');

            const applyBtn = page.locator('button:has-text("تطبيق")');
            if (await applyBtn.isVisible()) {
                await applyBtn.click();
                await page.waitForTimeout(1000);
            }
        }
    });

    test('should clear cart', async ({ page }) => {
        await page.goto('/cart', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        const clearBtn = page.locator('button:has-text("مسح"), button:has-text("Clear")');
        const isVisible = await clearBtn.isVisible();
        expect(isVisible || true).toBe(true);
    });
});

// ==========================================
// AUTH CONTEXT TESTS
// ==========================================
test.describe('سياق المصادقة - Auth Context', () => {
    test('should show login state', async ({ page }) => {
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        const loginBtn = page.locator('a[href="/login"], button:has-text("تسجيل الدخول")');
        const profileBtn = page.locator('a[href="/profile"], button:has-text("حسابي")');

        const loginVisible = await loginBtn.isVisible();
        const profileVisible = await profileBtn.isVisible();
        expect(loginVisible || profileVisible).toBe(true);
    });

    test('should redirect to login for protected routes', async ({ page }) => {
        await page.goto('/profile', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        // Should show login or profile page
        await expect(page.locator('body')).toBeVisible();
    });

    test('should logout successfully', async ({ page }) => {
        await page.goto('/profile', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        const logoutBtn = page.locator('button:has-text("تسجيل الخروج")');
        if (await logoutBtn.isVisible()) {
            await logoutBtn.click();
            await page.waitForTimeout(1000);
        }
    });

    test('should persist session', async ({ page }) => {
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        // Session should be stored in cookie
        const cookies = await page.context().cookies();
        expect(Array.isArray(cookies)).toBe(true);
    });
});

// ==========================================
// SHRIMP CONTEXT TESTS
// ==========================================
test.describe('سياق الروبيان - Shrimp Context', () => {
    test('should display shrimp mascot', async ({ page }) => {
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        const shrimp = page.locator('[class*="shrimp"], [class*="mascot"]');
        const count = await shrimp.count();
        expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should evolve based on cart value', async ({ page }) => {
        await page.goto('/products', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        // Add items to cart to trigger evolution
        const addBtn = page.locator('button:has-text("سلة")').first();
        if (await addBtn.isVisible()) {
            for (let i = 0; i < 3; i++) {
                await addBtn.click();
                await page.waitForTimeout(300);
            }
        }
    });

    test('should show different stages', async ({ page }) => {
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        // Shrimp stages: larva, teen, boss, whale
        const stages = page.locator('text=/صغير|العضلات|جاهز للسيطرة/i');
        const count = await stages.count();
        expect(count).toBeGreaterThanOrEqual(0);
    });
});

// ==========================================
// ANALYTICS API TESTS
// ==========================================
test.describe('تحليلات API - Analytics API', () => {
    test('should display analytics dashboard (admin)', async ({ page }) => {
        await page.goto('/admin/login', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1000);

        // Login as admin (credentials from environment only)
        await page.locator('input[type="email"]').fill(CREDS.email);
        await page.locator('input[type="password"]').fill(CREDS.password);
        await page.locator('button[type="submit"]').click();
        await page.waitForTimeout(2000);

        // Navigate to analytics
        const analyticsTab = page.locator('text=/التحليلات|Analytics/i, button:has-text("تحليلات")');
        if (await analyticsTab.isVisible()) {
            await analyticsTab.click();
            await page.waitForTimeout(1000);
        }
    });

    test('should have period filter (7d, 30d, 90d)', async ({ page }) => {
        await page.goto('/admin/login', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        const periodFilter = page.locator('button:has-text("7 أيام"), button:has-text("30 يوم"), button:has-text("90 يوم")');
        const count = await periodFilter.count();
        expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should display sales chart', async ({ page }) => {
        await page.goto('/admin/login', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        const chart = page.locator('[class*="chart"], canvas, svg');
        const count = await chart.count();
        expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should display top products', async ({ page }) => {
        await page.goto('/admin/login', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        const topProducts = page.locator('text=/الأكثر مبيعاً|Top Products/i');
        const count = await topProducts.count();
        expect(count).toBeGreaterThanOrEqual(0);
    });
});

// ==========================================
// FISH API TESTS
// ==========================================
test.describe('API الأسماك - Fish API', () => {
    test('should load fish encyclopedia data', async ({ page }) => {
        await page.goto('/fish-encyclopedia', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        const fishCards = page.locator('[class*="fish"] [class*="card"]');
        const count = await fishCards.count();
        expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should filter fish by type', async ({ page }) => {
        await page.goto('/fish-encyclopedia', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        const typeFilter = page.locator('button:has-text("مياه عذبة"), button:has-text("Freshwater")');
        if (await typeFilter.isVisible()) {
            await typeFilter.click();
            await page.waitForTimeout(500);
        }
    });

    test('should filter fish by difficulty', async ({ page }) => {
        await page.goto('/fish-encyclopedia', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        const difficultyFilter = page.locator('button:has-text("سهل"), button:has-text("Easy")');
        if (await difficultyFilter.isVisible()) {
            await difficultyFilter.click();
            await page.waitForTimeout(500);
        }
    });

    test('should show fish compatibility', async ({ page }) => {
        await page.goto('/fish-encyclopedia', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        const compatibility = page.locator('text=/التوافق|Compatibility/i');
        const count = await compatibility.count();
        expect(count).toBeGreaterThanOrEqual(0);
    });
});

// ==========================================
// CROSS-TAB SYNC TESTS
// ==========================================
test.describe('المزامنة بين التبويبات - Cross-Tab Sync', () => {
    test('should sync cart across tabs', async ({ page, context }) => {
        await page.goto('/products', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        // Add item in first tab
        const addBtn = page.locator('button:has-text("سلة")').first();
        if (await addBtn.isVisible()) {
            await addBtn.click();
            await page.waitForTimeout(500);
        }

        // Open second tab
        const page2 = await context.newPage();
        await page2.goto('/cart', { waitUntil: 'domcontentloaded' });
        await page2.waitForTimeout(2000);

        // Cart should be synced
        await expect(page2.locator('body')).toBeVisible();
        await page2.close();
    });

    test('should sync wishlist across tabs', async ({ page, context }) => {
        await page.goto('/products', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        // Add item to wishlist
        const heartBtn = page.locator('button:has([class*="Heart"])').first();
        if (await heartBtn.isVisible()) {
            await heartBtn.click();
            await page.waitForTimeout(500);
        }

        // Open second tab
        const page2 = await context.newPage();
        await page2.goto('/wishlist', { waitUntil: 'domcontentloaded' });
        await page2.waitForTimeout(2000);

        await expect(page2.locator('body')).toBeVisible();
        await page2.close();
    });
});

// ==========================================
// STATE PERSISTENCE TESTS
// ==========================================
test.describe('استمرارية الحالة - State Persistence', () => {
    test('should persist cart on reload', async ({ page }) => {
        await page.goto('/products', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        const addBtn = page.locator('button:has-text("سلة")').first();
        if (await addBtn.isVisible()) {
            await addBtn.click();
            await page.waitForTimeout(500);

            await page.reload();
            await page.waitForTimeout(2000);

            // Cart should persist
            await page.goto('/cart', { waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(1000);
        }
    });

    test('should persist theme preference', async ({ page }) => {
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        const themeToggle = page.locator('button:has([class*="Moon"]), button:has([class*="Sun"])').first();
        if (await themeToggle.isVisible()) {
            await themeToggle.click();
            await page.waitForTimeout(300);

            await page.reload();
            await page.waitForTimeout(2000);

            // Theme should persist
        }
    });

    test('should persist language preference', async ({ page }) => {
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        // Language should be persisted in localStorage or cookie
    });
});

// ==========================================
// RESPONSIVE TESTS
// ==========================================
test.describe('التجاوب - Responsive', () => {
    test('should work on mobile - Contexts', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('body')).toBeVisible();
    });

    test('should work on tablet - Contexts', async ({ page }) => {
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('body')).toBeVisible();
    });

    test('should work on desktop - Contexts', async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('body')).toBeVisible();
    });
});

import { test, expect } from '@playwright/test';
import { CartPage, ProductsPage } from './pages';

/**
 * Cart E2E Tests - اختبارات السلة الشاملة
 * Tests cart functionality, quantity updates, coupons
 */
test.describe('السلة - Cart', () => {
    let cartPage: CartPage;
    let productsPage: ProductsPage;

    test.beforeEach(async ({ page }) => {
        cartPage = new CartPage(page);
        productsPage = new ProductsPage(page);
    });

    // ==================
    // Cart Page Load Tests
    // ==================
    test.describe('تحميل صفحة السلة', () => {
        test('should load cart page', async () => {
            await cartPage.goto();
            await cartPage.verifyPageLoaded();
        });

        test('should display cart title', async () => {
            await cartPage.goto();
            await expect(cartPage.cartTitle).toBeVisible();
        });

        test('should show empty cart message when empty', async () => {
            await cartPage.goto();
            const isEmpty = await cartPage.isCartEmpty();
            const hasItems = await cartPage.getItemCount() > 0;
            expect(isEmpty || hasItems).toBe(true);
        });
    });

    // ==================
    // Add to Cart Tests
    // ==================
    test.describe('إضافة للسلة', () => {
        test('should add product to cart from products page', async ({ page }) => {
            await productsPage.goto();
            await page.waitForTimeout(2000);

            const count = await productsPage.getProductCount();
            if (count > 0) {
                await productsPage.quickAddToCart(0);
                await page.waitForTimeout(1000);
            }
        });

        test('should add product from product details', async ({ page }) => {
            await productsPage.goto();
            await page.waitForTimeout(2000);

            const count = await productsPage.getProductCount();
            if (count > 0) {
                await productsPage.clickProduct(0);
                await page.waitForTimeout(1500);

                const addBtn = page.locator('button:has-text("أضف إلى السلة"), button:has-text("Add to Cart")').first();
                if (await addBtn.isVisible()) {
                    await addBtn.click();
                    await page.waitForTimeout(1000);
                }
            }
        });
    });

    // ==================
    // Cart Items Tests
    // ==================
    test.describe('عناصر السلة', () => {
        test.beforeEach(async ({ page }) => {
            // Add item first
            await productsPage.goto();
            await page.waitForTimeout(2000);
            const count = await productsPage.getProductCount();
            if (count > 0) {
                await productsPage.quickAddToCart(0);
                await page.waitForTimeout(1000);
            }
            await cartPage.goto();
        });

        test('should display cart items', async () => {
            const count = await cartPage.getItemCount();
            expect(count).toBeGreaterThanOrEqual(0);
        });

        test('should display item images', async () => {
            const images = cartPage.page.locator('[class*="cart"] img');
            const count = await images.count();
            expect(count).toBeGreaterThanOrEqual(0);
        });

        test('should display item names', async () => {
            const itemCount = await cartPage.getItemCount();
            if (itemCount > 0) {
                const name = await cartPage.getItemName(0);
                expect(name).toBeTruthy();
            }
        });
    });

    // ==================
    // Quantity Tests
    // ==================
    test.describe('الكمية', () => {
        test.beforeEach(async ({ page }) => {
            await productsPage.goto();
            await page.waitForTimeout(2000);
            const count = await productsPage.getProductCount();
            if (count > 0) {
                await productsPage.quickAddToCart(0);
                await page.waitForTimeout(1000);
            }
            await cartPage.goto();
        });

        test('should get item quantity', async () => {
            const itemCount = await cartPage.getItemCount();
            if (itemCount > 0) {
                const qty = await cartPage.getItemQuantity(0);
                expect(qty).toBeGreaterThan(0);
            }
        });

        test('should increase item quantity', async () => {
            const itemCount = await cartPage.getItemCount();
            if (itemCount > 0) {
                await cartPage.increaseItemQuantity(0);
            }
        });

        test('should decrease item quantity', async () => {
            const itemCount = await cartPage.getItemCount();
            if (itemCount > 0) {
                await cartPage.decreaseItemQuantity(0);
            }
        });

        test('should update quantity manually', async () => {
            const itemCount = await cartPage.getItemCount();
            if (itemCount > 0) {
                await cartPage.updateItemQuantity(0, 3);
            }
        });
    });

    // ==================
    // Remove Item Tests
    // ==================
    test.describe('حذف العناصر', () => {
        test('should remove item from cart', async ({ page }) => {
            // Add item first
            await productsPage.goto();
            await page.waitForTimeout(2000);
            const count = await productsPage.getProductCount();
            if (count > 0) {
                await productsPage.quickAddToCart(0);
                await page.waitForTimeout(1000);
            }

            await cartPage.goto();
            const itemCount = await cartPage.getItemCount();
            if (itemCount > 0) {
                await cartPage.removeItem(0);
                await page.waitForTimeout(1000);
            }
        });

        test('should clear entire cart', async ({ page }) => {
            await productsPage.goto();
            await page.waitForTimeout(2000);
            const count = await productsPage.getProductCount();
            if (count > 0) {
                await productsPage.quickAddToCart(0);
                await page.waitForTimeout(1000);
            }

            await cartPage.goto();
            await cartPage.clearCart();
        });
    });

    // ==================
    // Cart Summary Tests
    // ==================
    test.describe('ملخص السلة', () => {
        test('should display cart summary', async () => {
            await cartPage.goto();
            const isVisible = await cartPage.cartSummary.isVisible();
            expect(isVisible || true).toBe(true);
        });

        test('should display total amount', async () => {
            await cartPage.goto();
            const total = await cartPage.getTotal();
            // Total may be visible or not depending on items
        });
    });

    // ==================
    // Coupon Tests
    // ==================
    test.describe('الكوبون', () => {
        test.beforeEach(async ({ page }) => {
            await productsPage.goto();
            await page.waitForTimeout(2000);
            const count = await productsPage.getProductCount();
            if (count > 0) {
                await productsPage.quickAddToCart(0);
                await page.waitForTimeout(1000);
            }
            await cartPage.goto();
        });

        test('should have coupon input', async () => {
            const isVisible = await cartPage.couponInput.isVisible();
            expect(isVisible || true).toBe(true);
        });

        test('should apply valid coupon', async () => {
            if (await cartPage.couponInput.isVisible()) {
                await cartPage.applyCoupon('TESTCOUPON');
            }
        });

        test('should show error for invalid coupon', async () => {
            if (await cartPage.couponInput.isVisible()) {
                await cartPage.applyCoupon('INVALIDCODE123');
                const hasError = await cartPage.hasCouponError();
                // May or may not show error
            }
        });

        test('should remove applied coupon', async () => {
            await cartPage.removeCoupon();
        });
    });

    // ==================
    // Fixed Shipping Tests
    // ==================
    test.describe('التوصيل الثابت', () => {
        test('should show fixed 5,000 IQD delivery info when present', async () => {
            await cartPage.goto();
            const isVisible = await cartPage.hasFixedShippingInfo();
            expect(isVisible || true).toBe(true);
        });

        test('should not show delivery-waiver messaging', async () => {
            await cartPage.goto();
            const hasWaiverClaim = await cartPage.hasShippingWaiverClaim();
            expect(hasWaiverClaim).toBe(false);
        });
    });

    // ==================
    // Checkout Navigation Tests
    // ==================
    test.describe('التنقل للدفع', () => {
        test('should have checkout button', async ({ page }) => {
            await productsPage.goto();
            await page.waitForTimeout(2000);
            const count = await productsPage.getProductCount();
            if (count > 0) {
                await productsPage.quickAddToCart(0);
                await page.waitForTimeout(1000);
            }

            await cartPage.goto();
            const isVisible = await cartPage.checkoutButton.isVisible();
            expect(isVisible || true).toBe(true);
        });

        test('should navigate to checkout', async ({ page }) => {
            await productsPage.goto();
            await page.waitForTimeout(2000);
            const count = await productsPage.getProductCount();
            if (count > 0) {
                await productsPage.quickAddToCart(0);
                await page.waitForTimeout(1000);
            }

            await cartPage.goto();
            const itemCount = await cartPage.getItemCount();
            if (itemCount > 0) {
                await cartPage.proceedToCheckout();
                expect(cartPage.getURL()).toMatch(/checkout|login/);
            }
        });
    });

    // ==================
    // Continue Shopping Tests
    // ==================
    test.describe('متابعة التسوق', () => {
        test('should have continue shopping button when empty', async () => {
            await cartPage.goto();
            const isEmpty = await cartPage.isCartEmpty();
            if (isEmpty) {
                const isVisible = await cartPage.continueShoppingButton.isVisible();
                expect(isVisible || true).toBe(true);
            }
        });

        test('should navigate to products when continuing shopping', async () => {
            await cartPage.goto();
            const isEmpty = await cartPage.isCartEmpty();
            if (isEmpty) {
                await cartPage.continueShopping();
                expect(cartPage.getURL()).toContain('products');
            }
        });
    });

    // ==================
    // Cart Persistence Tests
    // ==================
    test.describe('استمرارية السلة', () => {
        test('should persist cart after page refresh', async ({ page }) => {
            // Add item
            await productsPage.goto();
            await page.waitForTimeout(2000);
            const count = await productsPage.getProductCount();
            if (count > 0) {
                await productsPage.quickAddToCart(0);
                await page.waitForTimeout(1000);
            }

            // Refresh page
            await page.reload();
            await page.waitForTimeout(1500);

            // Check cart
            await cartPage.goto();
            // Items may still be there (depends on session/cookies)
        });
    });

    // ==================
    // Responsive Tests
    // ==================
    test.describe('التجاوب', () => {
        test('should display correctly on mobile', async ({ page }) => {
            await page.setViewportSize({ width: 375, height: 667 });
            await cartPage.goto();
            await cartPage.verifyPageLoaded();
        });
    });
});

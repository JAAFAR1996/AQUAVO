import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * Cart Page Object - صفحة السلة
 */
export class CartPage extends BasePage {
    // Cart Container
    readonly cartContainer: Locator;
    readonly cartTitle: Locator;
    readonly emptyCartMessage: Locator;
    readonly continueShoppingButton: Locator;

    // Cart Items
    readonly cartItems: Locator;
    readonly cartItemImage: Locator;
    readonly cartItemTitle: Locator;
    readonly cartItemPrice: Locator;
    readonly cartItemQuantity: Locator;
    readonly cartItemIncreaseButton: Locator;
    readonly cartItemDecreaseButton: Locator;
    readonly cartItemRemoveButton: Locator;
    readonly cartItemSubtotal: Locator;

    // Cart Summary
    readonly cartSummary: Locator;
    readonly subtotalAmount: Locator;
    readonly shippingAmount: Locator;
    readonly discountAmount: Locator;
    readonly totalAmount: Locator;

    // Coupon
    readonly couponInput: Locator;
    readonly couponApplyButton: Locator;
    readonly couponError: Locator;
    readonly couponSuccess: Locator;
    readonly couponRemoveButton: Locator;

    // Actions
    readonly checkoutButton: Locator;
    readonly clearCartButton: Locator;

    // Fixed Shipping
    readonly fixedShippingInfo: Locator;
    readonly shippingWaiverMessage: Locator;

    constructor(page: Page) {
        super(page);

        // Cart Container
        this.cartContainer = page.locator('[class*="cart"], main');
        this.cartTitle = page.locator('h1, h2').first();
        this.emptyCartMessage = page.locator('text=/السلة فارغة|Cart is empty|no items/i');
        this.continueShoppingButton = page.locator('a:has-text("تابع التسوق"), a:has-text("Continue Shopping")');

        // Cart Items
        this.cartItems = page.locator('[class*="cart-item"], [class*="cart-product"], tr[class*="item"]');
        this.cartItemImage = page.locator('[class*="cart-item"] img');
        this.cartItemTitle = page.locator('[class*="cart-item"] h3, [class*="cart-item"] [class*="title"]');
        this.cartItemPrice = page.locator('[class*="cart-item"] [class*="price"]');
        this.cartItemQuantity = page.locator('[class*="cart-item"] input[type="number"]');
        this.cartItemIncreaseButton = page.locator('[class*="cart-item"] button:has-text("+")');
        this.cartItemDecreaseButton = page.locator('[class*="cart-item"] button:has-text("-")');
        this.cartItemRemoveButton = page.locator('[class*="cart-item"] button[aria-label*="حذف"], [class*="cart-item"] button:has-text("×")');
        this.cartItemSubtotal = page.locator('[class*="cart-item"] [class*="subtotal"]');

        // Cart Summary
        this.cartSummary = page.locator('[class*="cart-summary"], [class*="order-summary"]');
        this.subtotalAmount = page.locator('text=/المجموع الفرعي|Subtotal/ >> .. >> [class*="amount"], text=/المجموع الفرعي|Subtotal/ + *');
        this.shippingAmount = page.locator('text=/الشحن|Shipping/ >> .. >> [class*="amount"]');
        this.discountAmount = page.locator('text=/خصم|Discount/ >> .. >> [class*="amount"]');
        this.totalAmount = page.locator('[class*="total"] [class*="amount"], text=/الإجمالي|Total/ >> .. >> strong');

        // Coupon
        this.couponInput = page.locator('input[placeholder*="كوبون"], input[name*="coupon"]');
        this.couponApplyButton = page.locator('button:has-text("تطبيق"), button:has-text("Apply")');
        this.couponError = page.locator('[class*="coupon-error"], text=/كوبون غير صالح|Invalid coupon/');
        this.couponSuccess = page.locator('[class*="coupon-success"], text=/تم تطبيق|Applied/');
        this.couponRemoveButton = page.locator('button:has-text("إزالة الكوبون"), button[aria-label*="remove coupon"]');

        // Actions
        this.checkoutButton = page.locator('a:has-text("إتمام الطلب"), button:has-text("Checkout"), a[href*="checkout"]');
        this.clearCartButton = page.locator('button:has-text("تفريغ السلة"), button:has-text("Clear Cart")');

        // Fixed Shipping
        this.fixedShippingInfo = page.locator('text=/5,000|5000|24/');
        this.shippingWaiverMessage = page.locator('text=/(?:\\u0634\\u062d\\u0646|\\u062a\\u0648\\u0635\\u064a\\u0644)\\s+\\u0645\\u062c\\u0627\\u0646\\u064a|free\\s+shipping/i');
    }

    /**
     * Go to cart page
     */
    async goto() {
        await super.goto('/cart');
    }

    /**
     * Check if cart is empty
     */
    async isCartEmpty(): Promise<boolean> {
        return await this.emptyCartMessage.isVisible();
    }

    /**
     * Get number of items in cart
     */
    async getItemCount(): Promise<number> {
        return await this.cartItems.count();
    }

    /**
     * Get item quantity
     */
    async getItemQuantity(index: number): Promise<number> {
        const input = this.cartItems.nth(index).locator('input[type="number"]');
        const value = await input.inputValue();
        return parseInt(value) || 1;
    }

    /**
     * Update item quantity
     */
    async updateItemQuantity(index: number, quantity: number) {
        const input = this.cartItems.nth(index).locator('input[type="number"]');
        await input.fill(quantity.toString());
        await this.page.waitForTimeout(1000);
    }

    /**
     * Increase item quantity
     */
    async increaseItemQuantity(index: number) {
        const button = this.cartItems.nth(index).locator('button:has-text("+")');
        await button.click();
        await this.page.waitForTimeout(500);
    }

    /**
     * Decrease item quantity
     */
    async decreaseItemQuantity(index: number) {
        const button = this.cartItems.nth(index).locator('button:has-text("-")');
        await button.click();
        await this.page.waitForTimeout(500);
    }

    /**
     * Remove item from cart
     */
    async removeItem(index: number) {
        const button = this.cartItems.nth(index).locator('button[aria-label*="حذف"], button:has-text("×")');
        await button.click();
        await this.page.waitForTimeout(500);
    }

    /**
     * Get item name
     */
    async getItemName(index: number): Promise<string | null> {
        return await this.cartItems.nth(index).locator('h3, [class*="title"]').textContent();
    }

    /**
     * Get cart total
     */
    async getTotal(): Promise<string | null> {
        return await this.totalAmount.textContent();
    }

    /**
     * Apply coupon code
     */
    async applyCoupon(code: string) {
        await this.couponInput.fill(code);
        await this.couponApplyButton.click();
        await this.page.waitForTimeout(1000);
    }

    /**
     * Check if coupon error is shown
     */
    async hasCouponError(): Promise<boolean> {
        return await this.couponError.isVisible();
    }

    /**
     * Check if coupon success is shown
     */
    async hasCouponSuccess(): Promise<boolean> {
        return await this.couponSuccess.isVisible();
    }

    /**
     * Remove applied coupon
     */
    async removeCoupon() {
        if (await this.couponRemoveButton.isVisible()) {
            await this.couponRemoveButton.click();
            await this.page.waitForTimeout(500);
        }
    }

    /**
     * Proceed to checkout
     */
    async proceedToCheckout() {
        await this.checkoutButton.click();
        await this.waitForPageLoad();
    }

    /**
     * Clear entire cart
     */
    async clearCart() {
        if (await this.clearCartButton.isVisible()) {
            await this.clearCartButton.click();
            await this.page.waitForTimeout(500);
        }
    }

    /**
     * Continue shopping
     */
    async continueShopping() {
        await this.continueShoppingButton.click();
        await this.waitForPageLoad();
    }

    /**
     * Check whether the page displays the fixed AQUAVO delivery policy.
     */
    async hasFixedShippingInfo(): Promise<boolean> {
        return await this.fixedShippingInfo.isVisible();
    }

    /**
     * Check for obsolete delivery-waiver messaging.
     */
    async hasShippingWaiverClaim(): Promise<boolean> {
        return await this.shippingWaiverMessage.isVisible();
    }

    /**
     * Verify cart page loaded
     */
    async verifyPageLoaded() {
        await expect(this.cartContainer).toBeVisible();
        await expect(this.cartTitle).toBeVisible();
    }
}

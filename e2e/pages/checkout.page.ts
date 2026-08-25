import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * Checkout Page Object - صفحة الدفع
 */
export class CheckoutPage extends BasePage {
    // Steps/Progress
    readonly checkoutSteps: Locator;
    readonly currentStep: Locator;

    // Shipping Address Form
    readonly shippingSection: Locator;
    readonly firstNameInput: Locator;
    readonly lastNameInput: Locator;
    readonly phoneInput: Locator;
    readonly emailInput: Locator;
    readonly addressLine1Input: Locator;
    readonly addressLine2Input: Locator;
    readonly citySelect: Locator;
    readonly provinceSelect: Locator;
    readonly postalCodeInput: Locator;
    readonly countrySelect: Locator;
    readonly savedAddresses: Locator;
    readonly addNewAddressButton: Locator;

    // Billing Address
    readonly sameAsShippingCheckbox: Locator;
    readonly billingSection: Locator;

    // Shipping Method
    readonly shippingMethodSection: Locator;
    readonly shippingMethods: Locator;
    readonly shippingMethodStandard: Locator;
    readonly shippingMethodExpress: Locator;
    readonly deliveryEstimate: Locator;

    // Payment Method
    readonly paymentSection: Locator;
    readonly paymentMethods: Locator;
    readonly cashOnDeliveryOption: Locator;
    readonly onlinePaymentOption: Locator;

    // Order Summary
    readonly orderSummary: Locator;
    readonly orderItems: Locator;
    readonly subtotalAmount: Locator;
    readonly shippingAmount: Locator;
    readonly discountAmount: Locator;
    readonly totalAmount: Locator;

    // Coupon in Checkout
    readonly couponInput: Locator;
    readonly couponApplyButton: Locator;

    // Order Notes
    readonly orderNotesInput: Locator;

    // Actions
    readonly placeOrderButton: Locator;
    readonly backToCartButton: Locator;
    readonly continueToPaymentButton: Locator;
    readonly continueToReviewButton: Locator;

    // Terms & Conditions
    readonly termsCheckbox: Locator;
    readonly termsLink: Locator;

    // Errors
    readonly formErrors: Locator;
    readonly paymentError: Locator;

    constructor(page: Page) {
        super(page);

        // Steps/Progress
        this.checkoutSteps = page.locator('[class*="checkout-steps"], [class*="stepper"]');
        this.currentStep = page.locator('[class*="current-step"], [aria-current="step"]');

        // Shipping Address Form
        this.shippingSection = page.locator('[class*="shipping"], form');
        this.firstNameInput = page.locator('input[name*="firstName"], input[placeholder*="الاسم الأول"]');
        this.lastNameInput = page.locator('input[name*="lastName"], input[placeholder*="اسم العائلة"]');
        this.phoneInput = page.locator('input[type="tel"], input[name*="phone"]');
        this.emailInput = page.locator('input[type="email"]');
        this.addressLine1Input = page.locator('input[name*="address"], input[placeholder*="العنوان"]').first();
        this.addressLine2Input = page.locator('input[name*="address2"], input[placeholder*="شقة"]');
        this.citySelect = page.locator('select[name*="city"], input[name*="city"]');
        this.provinceSelect = page.locator('select[name*="province"], select[name*="state"], select[name*="governorate"]');
        this.postalCodeInput = page.locator('input[name*="postal"], input[name*="zip"]');
        this.countrySelect = page.locator('select[name*="country"]');
        this.savedAddresses = page.locator('[class*="saved-address"]');
        this.addNewAddressButton = page.locator('button:has-text("عنوان جديد"), button:has-text("Add New")');

        // Billing Address
        this.sameAsShippingCheckbox = page.locator('input[name*="sameAsShipping"], input[type="checkbox"]:near(:text("نفس"))');
        this.billingSection = page.locator('[class*="billing"]');

        // Shipping Method
        this.shippingMethodSection = page.locator('[class*="shipping-method"]');
        this.shippingMethods = page.locator('input[name*="shipping"][type="radio"], [class*="shipping-option"]');
        this.shippingMethodStandard = page.locator('text=/عادي|Standard/');
        this.shippingMethodExpress = page.locator('text=/سريع|Express/');
        this.deliveryEstimate = page.locator('[class*="delivery-estimate"], text=/يوم|day/');

        // Payment Method
        this.paymentSection = page.locator('[class*="payment"]');
        this.paymentMethods = page.locator('input[name*="payment"][type="radio"], [class*="payment-option"]');
        this.cashOnDeliveryOption = page.locator('text=/الدفع عند الاستلام|Cash on Delivery/');
        this.onlinePaymentOption = page.locator('text=/الدفع الإلكتروني|Online Payment|Al-Qaseh/');

        // Order Summary
        this.orderSummary = page.locator('[class*="order-summary"], [class*="cart-summary"]');
        this.orderItems = page.locator('[class*="order-item"], [class*="summary-item"]');
        this.subtotalAmount = page.locator('text=/المجموع الفرعي|Subtotal/ >> .. >> *:last-child');
        this.shippingAmount = page.locator('text=/الشحن|Shipping/ >> .. >> *:last-child');
        this.discountAmount = page.locator('text=/خصم|Discount/ >> .. >> *:last-child');
        this.totalAmount = page.locator('[class*="total"] [class*="amount"], text=/الإجمالي|Total/ >> .. >> strong');

        // Coupon
        this.couponInput = page.locator('input[placeholder*="كوبون"], input[name*="coupon"]');
        this.couponApplyButton = page.locator('button:has-text("تطبيق"), button:has-text("Apply")');

        // Order Notes
        this.orderNotesInput = page.locator('textarea[name*="notes"], textarea[placeholder*="ملاحظات"]');

        // Actions
        this.placeOrderButton = page.locator('button:has-text("إتمام الطلب"), button:has-text("Place Order"), button:has-text("تأكيد")');
        this.backToCartButton = page.locator('a:has-text("العودة للسلة"), a:has-text("Back to Cart")');
        this.continueToPaymentButton = page.locator('button:has-text("الدفع"), button:has-text("Continue to Payment")');
        this.continueToReviewButton = page.locator('button:has-text("مراجعة"), button:has-text("Continue to Review")');

        // Terms
        this.termsCheckbox = page.locator('input[name*="terms"], input[type="checkbox"]:near(:text("الشروط"))');
        this.termsLink = page.locator('a:has-text("الشروط والأحكام"), a:has-text("Terms")');

        // Errors
        this.formErrors = page.locator('[class*="error"], [role="alert"]');
        this.paymentError = page.locator('[class*="payment-error"]');
    }

    /**
     * Go to checkout page
     */
    async goto() {
        await super.goto('/checkout');
    }

    /**
     * Fill shipping address
     */
    async fillShippingAddress(data: {
        firstName: string;
        lastName: string;
        phone: string;
        email?: string;
        address: string;
        city: string;
        province?: string;
    }) {
        await this.firstNameInput.fill(data.firstName);
        await this.lastNameInput.fill(data.lastName);
        await this.phoneInput.fill(data.phone);
        if (data.email && await this.emailInput.isVisible()) {
            await this.emailInput.fill(data.email);
        }
        await this.addressLine1Input.fill(data.address);

        if (await this.citySelect.isVisible()) {
            const tagName = await this.citySelect.evaluate(el => el.tagName);
            if (tagName === 'SELECT') {
                await this.citySelect.selectOption({ label: data.city });
            } else {
                await this.citySelect.fill(data.city);
            }
        }

        if (data.province && await this.provinceSelect.isVisible()) {
            await this.provinceSelect.selectOption({ label: data.province });
        }
    }

    /**
     * Select saved address
     */
    async selectSavedAddress(index: number = 0) {
        await this.savedAddresses.nth(index).click();
        await this.page.waitForTimeout(300);
    }

    /**
     * Add new address
     */
    async clickAddNewAddress() {
        await this.addNewAddressButton.click();
        await this.page.waitForTimeout(300);
    }

    /**
     * Toggle same as shipping for billing
     */
    async toggleSameAsShipping() {
        if (await this.sameAsShippingCheckbox.isVisible()) {
            await this.sameAsShippingCheckbox.click();
        }
    }

    /**
     * Select shipping method
     */
    async selectShippingMethod(method: 'standard' | 'express') {
        if (method === 'standard') {
            await this.shippingMethodStandard.click();
        } else {
            await this.shippingMethodExpress.click();
        }
        await this.page.waitForTimeout(500);
    }

    /**
     * Select payment method
     */
    async selectPaymentMethod(method: 'cash' | 'online') {
        if (method === 'cash') {
            await this.cashOnDeliveryOption.click();
        } else {
            await this.onlinePaymentOption.click();
        }
        await this.page.waitForTimeout(300);
    }

    /**
     * Apply coupon in checkout
     */
    async applyCoupon(code: string) {
        await this.couponInput.fill(code);
        await this.couponApplyButton.click();
        await this.page.waitForTimeout(1000);
    }

    /**
     * Add order notes
     */
    async addOrderNotes(notes: string) {
        await this.orderNotesInput.fill(notes);
    }

    /**
     * Accept terms and conditions
     */
    async acceptTerms() {
        if (await this.termsCheckbox.isVisible() && !await this.termsCheckbox.isChecked()) {
            await this.termsCheckbox.check();
        }
    }

    /**
     * Place order - CAUTION: This will actually place an order on production!
     * For testing, we just verify the button is clickable but don't click
     */
    async verifyPlaceOrderButtonReady(): Promise<boolean> {
        return await this.placeOrderButton.isEnabled();
    }

    /**
     * Get order total
     */
    async getTotal(): Promise<string | null> {
        return await this.totalAmount.textContent();
    }

    /**
     * Get number of items in order summary
     */
    async getOrderItemCount(): Promise<number> {
        return await this.orderItems.count();
    }

    /**
     * Check if form has errors
     */
    async hasErrors(): Promise<boolean> {
        return await this.formErrors.isVisible();
    }

    /**
     * Back to cart
     */
    async goBackToCart() {
        await this.backToCartButton.click();
        await this.waitForPageLoad();
    }

    /**
     * Verify checkout page loaded
     */
    async verifyPageLoaded() {
        await expect(this.shippingSection).toBeVisible();
        await expect(this.orderSummary).toBeVisible();
    }
}

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/** Keep the cart drawer focused on completing an existing purchase. */
describe("navbar cart drawer commerce contract", () => {
  const source = readFileSync(path.resolve(__dirname, "../../navbar.tsx"), "utf8");

  it("does not show cross-sell recommendations in the slide-out cart", () => {
    expect(source).not.toContain("CartSuggestions");
    expect(source).not.toContain('cart-suggestions');
  });

  it("keeps cart items, quantity controls, delivery, totals and checkout", () => {
    expect(source).toContain("cartItems.map(");
    expect(source).toContain("updateQuantity(");
    expect(source).toContain("removeItem(");
    expect(source).toContain('t("cart.subtotal")');
    expect(source).toContain('t("cart.delivery")');
    expect(source).toContain('t("cart.total")');
    expect(source).toContain('t("cart.checkout")');
  });
});

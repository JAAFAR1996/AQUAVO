/**
 * ProductVariantSelector (legacy, link-based size picker) accessibility tests.
 *
 * These options navigate to a sibling product page rather than toggling
 * client state, so the currently-viewed size must be marked aria-current
 * ("page") instead of aria-pressed, and its full accessible name should
 * include price/availability rather than relying on visually-adjacent text.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

vi.mock("wouter", () => ({
    Link: ({ children, href, ...props }: { children: React.ReactNode; href: string;[key: string]: unknown }) => (
        <a href={href} {...props}>{children}</a>
    ),
}));

import { ProductVariantSelector } from "../product-variant-selector";
import { type Product } from "@/types";

const current = {
    id: "p-18w",
    name: "إضاءة HYGGER 18W",
    slug: "hygger-18w",
    price: 20000,
    stock: 5,
} as Product;

const variants = [
    current,
    {
        id: "p-22w",
        name: "إضاءة HYGGER 22W",
        slug: "hygger-22w",
        price: 25000,
        stock: 0,
    } as Product,
];

describe("ProductVariantSelector (legacy)", () => {
    it("marks the currently-viewed size as the current page", () => {
        render(<ProductVariantSelector currentProduct={current} variants={variants} />);
        const links = screen.getAllByRole("link");
        const currentLink = links.find((l) => l.getAttribute("href") === "/products/hygger-18w");
        const otherLink = links.find((l) => l.getAttribute("href") === "/products/hygger-22w");
        expect(currentLink).toHaveAttribute("aria-current", "page");
        expect(otherLink).not.toHaveAttribute("aria-current");
    });

    it("gives each size link an accessible name with price and availability", () => {
        render(<ProductVariantSelector currentProduct={current} variants={variants} />);
        expect(screen.getByRole("link", { name: /22W.*غير متوفر/ })).toBeInTheDocument();
    });

    it("groups the size options under the selector's title", () => {
        render(
            <ProductVariantSelector
                currentProduct={current}
                variants={variants}
                title="اختر القوة المناسبة"
            />
        );
        expect(screen.getByRole("group", { name: "اختر القوة المناسبة" })).toBeInTheDocument();
    });
});

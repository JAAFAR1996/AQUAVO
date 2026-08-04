/**
 * MultiDimensionVariantSelector accessibility tests (Phase E).
 *
 * Each dimension (color, size, ...) is its own group of toggle buttons;
 * options must expose aria-pressed and disable values that have no in-stock
 * variant, with a discernible reason for assistive tech.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { MultiDimensionVariantSelector } from "../multi-dimension-variant-selector";
import { type ProductVariant } from "@/types";

const variants: ProductVariant[] = [
    { id: "v1", label: "أحمر - صغير", price: 20000, stock: 5, specifications: { "اللون": "أحمر", "الحجم": "صغير" } } as unknown as ProductVariant,
    { id: "v2", label: "أزرق - صغير", price: 21000, stock: 0, specifications: { "اللون": "أزرق", "الحجم": "صغير" } } as unknown as ProductVariant,
    { id: "v3", label: "أحمر - كبير", price: 25000, stock: 3, specifications: { "اللون": "أحمر", "الحجم": "كبير" } } as unknown as ProductVariant,
];

describe("MultiDimensionVariantSelector", () => {
    it("renders a labeled group per dimension", () => {
        render(
            <MultiDimensionVariantSelector
                variants={variants}
                selectedVariantId="v1"
                onVariantSelect={vi.fn()}
            />
        );
        expect(screen.getByRole("group", { name: "اللون:" })).toBeInTheDocument();
        expect(screen.getByRole("group", { name: "الحجم:" })).toBeInTheDocument();
    });

    it("marks the selected value as pressed within its dimension", () => {
        render(
            <MultiDimensionVariantSelector
                variants={variants}
                selectedVariantId="v1"
                onVariantSelect={vi.fn()}
            />
        );
        expect(screen.getByRole("button", { name: "اللون أحمر" })).toHaveAttribute("aria-pressed", "true");
        expect(screen.getByRole("button", { name: /اللون أزرق/ })).toHaveAttribute("aria-pressed", "false");
    });

    it("disables a dimension value that has no in-stock variant", () => {
        render(
            <MultiDimensionVariantSelector
                variants={variants}
                selectedVariantId="v1"
                onVariantSelect={vi.fn()}
            />
        );
        // The only blue variant is out of stock, so the blue value stays unavailable.
        const blue = screen.getByRole("button", { name: /اللون أزرق/ });
        expect(blue).toBeDisabled();
        expect(blue).toHaveAccessibleName("اللون أزرق، مو متوفر هسه");
    });

    it("calls onVariantSelect with the matching variant when a dimension value is chosen", async () => {
        const user = userEvent.setup();
        const onVariantSelect = vi.fn();
        render(
            <MultiDimensionVariantSelector
                variants={variants}
                selectedVariantId="v1"
                onVariantSelect={onVariantSelect}
            />
        );
        await user.click(screen.getByRole("button", { name: "الحجم كبير" }));
        expect(onVariantSelect).toHaveBeenCalledWith(variants[2]);
    });
});

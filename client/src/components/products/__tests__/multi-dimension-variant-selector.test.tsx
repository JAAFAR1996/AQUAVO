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

const aquariumVariants: ProductVariant[] = [
    { id: "YXL-003", label: "YXL-003", price: 25990, stock: 0, specifications: { "السعة": "23 لتر", "الموديل": "YXL-003" } } as unknown as ProductVariant,
    { id: "YKK-50", label: "YKK-50", price: 38990, stock: 1, specifications: { "السعة": "40 لتر", "الموديل": "YKK-50" } } as unknown as ProductVariant,
    { id: "YKK-60", label: "YKK-60", price: 51990, stock: 1, specifications: { "السعة": "63 لتر", "الموديل": "YKK-60" } } as unknown as ProductVariant,
    { id: "YEE-1090", label: "YEE-1090", price: 48400, stock: 2, specifications: { "السعة": "43 لتر", "الموديل": "YEE-1090" } } as unknown as ProductVariant,
    { id: "YCG-40", label: "YCG-40", price: 58990, stock: 2, specifications: { "السعة": "64 لتر", "الموديل": "YCG-40" } } as unknown as ProductVariant,
    { id: "C5-1062", label: "C5-1062", price: 82990, stock: 2, specifications: { "السعة": "96 لتر", "الموديل": "C5-1062" } } as unknown as ProductVariant,
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

    it("shows aquarium measurements as the only selector and capacity underneath", () => {
        render(
            <MultiDimensionVariantSelector
                variants={aquariumVariants}
                selectedVariantId="YEE-1090"
                onVariantSelect={vi.fn()}
            />
        );

        expect(screen.getByRole("group", { name: /القياسات/ })).toBeInTheDocument();
        expect(screen.queryByRole("group", { name: /الموديل/ })).not.toBeInTheDocument();
        expect(screen.queryByRole("group", { name: /السعة/ })).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "القياسات 35 × 35 × 35 سم" })).toHaveAttribute("aria-pressed", "true");
        expect(screen.getByText("السعة")).toBeInTheDocument();
        expect(screen.getByText("43 لتر")).toBeInTheDocument();
    });

    it("switches aquarium variants by measurement and disables only zero stock", async () => {
        const user = userEvent.setup();
        const onVariantSelect = vi.fn();
        render(
            <MultiDimensionVariantSelector
                variants={aquariumVariants}
                selectedVariantId="YEE-1090"
                onVariantSelect={onVariantSelect}
            />
        );

        expect(screen.getByRole("button", { name: /القياسات 40 × 23 × 25 سم/ })).toBeDisabled();
        await user.click(screen.getByRole("button", { name: "القياسات 40 × 40 × 40 سم" }));
        expect(onVariantSelect).toHaveBeenCalledWith(aquariumVariants[4]);
    });
});

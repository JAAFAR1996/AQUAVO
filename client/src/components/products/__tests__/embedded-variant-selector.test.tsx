/**
 * EmbeddedVariantSelector accessibility tests (Phase E).
 *
 * Variant options are toggle-like buttons, not links, so they must expose
 * aria-pressed reflecting the current selection and mark unavailable
 * (out-of-stock) options as disabled with a discernible reason.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { EmbeddedVariantSelector } from "../embedded-variant-selector";
import { type ProductVariant } from "@/types";

const variants: ProductVariant[] = [
    { id: "v-small", label: "صغير", price: 20000, stock: 5 } as ProductVariant,
    { id: "v-large", label: "كبير", price: 30000, stock: 0 } as ProductVariant,
];

const modelVariants: ProductVariant[] = [
    { id: "m-small", label: "C4-1123 — صغير", price: 20000, stock: 5, specifications: { "الحجم": "صغير", "الموديل": "C4-1123" } } as unknown as ProductVariant,
    { id: "m-large", label: "C4-1124 — كبير", price: 30000, stock: 2, specifications: { "الحجم": "كبير", "الموديل": "C4-1124" } } as unknown as ProductVariant,
];

const spongeFilterVariants: ProductVariant[] = [
    { id: "xy-180", label: "XY-180 — صغير", price: 3000, stock: 6, specifications: { "الحجم": "صغير", "الموديل": "XY-180" } } as unknown as ProductVariant,
    { id: "xy-2835", label: "XY-2835 — كبير", price: 4000, stock: 2, specifications: { "الحجم": "كبير", "الموديل": "XY-2835" } } as unknown as ProductVariant,
];

describe("EmbeddedVariantSelector", () => {
    it("marks the selected variant as pressed and others as not pressed", () => {
        render(
            <EmbeddedVariantSelector
                variants={variants}
                selectedVariantId="v-small"
                onVariantSelect={vi.fn()}
            />
        );
        expect(screen.getByRole("button", { name: "صغير" })).toHaveAttribute("aria-pressed", "true");
        expect(screen.getByRole("button", { name: /كبير/ })).toHaveAttribute("aria-pressed", "false");
    });

    it("disables an out-of-stock variant and tells screen readers why", () => {
        render(
            <EmbeddedVariantSelector
                variants={variants}
                selectedVariantId="v-small"
                onVariantSelect={vi.fn()}
            />
        );
        const outOfStock = screen.getByRole("button", { name: "كبير، غير متوفر" });
        expect(outOfStock).toBeDisabled();
    });

    it("calls onVariantSelect with the chosen variant on click", async () => {
        const user = userEvent.setup();
        const onVariantSelect = vi.fn();
        render(
            <EmbeddedVariantSelector
                variants={variants}
                selectedVariantId="v-small"
                onVariantSelect={onVariantSelect}
            />
        );
        await user.click(screen.getByRole("button", { name: "صغير" }));
        expect(onVariantSelect).toHaveBeenCalledWith(variants[0]);
    });

    it("groups the variant buttons under the selector's title for assistive tech", () => {
        render(
            <EmbeddedVariantSelector
                variants={variants}
                selectedVariantId="v-small"
                onVariantSelect={vi.fn()}
                title="اختر الحجم"
            />
        );
        expect(screen.getByRole("group", { name: "اختر الحجم" })).toBeInTheDocument();
    });

    it("never renders a model field or model value", () => {
        render(
            <EmbeddedVariantSelector
                variants={modelVariants}
                selectedVariantId="m-small"
                onVariantSelect={vi.fn()}
            />
        );

        expect(screen.queryByText(/الموديل|موديل/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/C4-1123|C4-1124/i)).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "صغير" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "كبير" })).toBeInTheDocument();
    });

    it("uses size as the option and removes model codes from all rendered text", async () => {
        const user = userEvent.setup();
        const onVariantSelect = vi.fn();

        render(
            <EmbeddedVariantSelector
                variants={spongeFilterVariants}
                selectedVariantId="xy-180"
                onVariantSelect={onVariantSelect}
            />
        );

        expect(screen.getByRole("group", { name: "اختار الحجم" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "صغير" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "كبير" })).toBeInTheDocument();
        expect(screen.queryByText(/الموديل|موديل/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/XY-180|XY-2835/i)).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /XY-180|XY-2835/i })).not.toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "كبير" }));
        expect(onVariantSelect).toHaveBeenCalledWith(spongeFilterVariants[1]);
    });
});

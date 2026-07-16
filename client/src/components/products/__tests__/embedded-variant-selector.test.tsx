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
        // The in-stock variant is already selected; re-render with a second
        // in-stock option to confirm the click handler fires with the variant.
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
});

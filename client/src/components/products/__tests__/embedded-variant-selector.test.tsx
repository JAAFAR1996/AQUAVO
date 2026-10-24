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
import { formatIQD } from "@/lib/utils";

const variants: ProductVariant[] = [
    { id: "v-small", label: "صغير", price: 20000, stock: 5 } as ProductVariant,
    { id: "v-large", label: "كبير", price: 30000, stock: 0 } as ProductVariant,
];

const modelVariants: ProductVariant[] = [
    { id: "m-small", label: "صغير", price: 20000, stock: 5, specifications: { "الحجم": "صغير", "الموديل": "C4-1123" } } as unknown as ProductVariant,
    { id: "m-large", label: "كبير", price: 30000, stock: 2, specifications: { "الحجم": "كبير", "الموديل": "C4-1123" } } as unknown as ProductVariant,
];

const spongeFilterVariants: ProductVariant[] = [
    { id: "xy-180", label: "XY-180 — صغير", price: 3000, stock: 6, specifications: { "الحجم": "صغير", "الموديل": "XY-180" } } as unknown as ProductVariant,
    { id: "xy-2835", label: "XY-2835 — كبير", price: 4000, stock: 2, specifications: { "الحجم": "كبير", "الموديل": "XY-2835" } } as unknown as ProductVariant,
];

describe("EmbeddedVariantSelector", () => {
    it("renders volcanic-rock sizes in physical order without advertising unknown prices", () => {
        const rockSizes: ProductVariant[] = [
            { id: "size-3-5cm", label: "متوسط (3–5 سم)", price: 3851, stock: 17, isDefault: true,
              specifications: { "الحجم": "متوسط (3–5 سم)", "حجم القطعة": "3–5 سم" } },
            { id: "size-10-30cm", label: "كبير جدا (10–30 سم) — قريبا", price: 0, stock: 0,
              specifications: { "الحجم": "كبير جدا (10–30 سم) — قريبا", "حجم القطعة": "10–30 سم" } },
            { id: "size-1-2cm", label: "صغير (1–2 سم) — قريبا", price: 0, stock: 0,
              specifications: { "الحجم": "صغير (1–2 سم) — قريبا", "حجم القطعة": "1–2 سم" } },
            { id: "size-5-8cm", label: "كبير (5–8 سم) — قريبا", price: 0, stock: 0,
              specifications: { "الحجم": "كبير (5–8 سم) — قريبا", "حجم القطعة": "5–8 سم" } },
        ];
        render(
            <EmbeddedVariantSelector
                variants={rockSizes}
                selectedVariantId=""
                onVariantSelect={vi.fn()}
            />
        );
        const buttons = screen.getAllByRole("button");
        expect(buttons.map(button => button.textContent)).toEqual([
            expect.stringContaining("1–2"),
            expect.stringContaining("3–5"),
            expect.stringContaining("5–8"),
            expect.stringContaining("10–30"),
        ]);
        expect(buttons[0]).toBeDisabled();
        expect(buttons[1]).toBeEnabled();
        expect(buttons[2]).toBeDisabled();
        expect(buttons[3]).toBeDisabled();
        // Even though the first size is not priced, show the known-price 3–5 cm
        // reference rather than a fabricated 0-IQD offer.
        expect(screen.getByText(formatIQD(3851))).toBeInTheDocument();
        expect(screen.queryByText(formatIQD(0))).not.toBeInTheDocument();
    });

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

    it("shows the selected model on non-aquarium products", () => {
        render(
            <EmbeddedVariantSelector
                variants={modelVariants}
                selectedVariantId="m-small"
                onVariantSelect={vi.fn()}
            />
        );

        expect(screen.getByText("الموديل:")).toBeInTheDocument();
        expect(screen.getByText("C4-1123")).toBeInTheDocument();
    });

    it("uses size as the option and keeps differing models as information only", async () => {
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
        expect(screen.queryByRole("button", { name: /XY-180/ })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /XY-2835/ })).not.toBeInTheDocument();
        expect(screen.getByText("الموديل:")).toBeInTheDocument();
        expect(screen.getAllByText("XY-180").length).toBeGreaterThan(0);

        await user.click(screen.getByRole("button", { name: "كبير" }));
        expect(onVariantSelect).toHaveBeenCalledWith(spongeFilterVariants[1]);
    });
});

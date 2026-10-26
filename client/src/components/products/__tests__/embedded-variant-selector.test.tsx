/**
 * EmbeddedVariantSelector accessibility tests (Phase E).
 *
 * Variant options are toggle-like buttons, not links, so they must expose
 * aria-pressed reflecting the current selection and keep unavailable options previewable with a discernible reason.
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
    { id: "m-small", label: "صغير", price: 20000, stock: 5, specifications: { "الحجم": "صغير", "الموديل": "C4-1123" } } as unknown as ProductVariant,
    { id: "m-large", label: "كبير", price: 30000, stock: 2, specifications: { "الحجم": "كبير", "الموديل": "C4-1123" } } as unknown as ProductVariant,
];

const spongeFilterVariants: ProductVariant[] = [
    { id: "xy-180", label: "XY-180 — صغير", price: 3000, stock: 6, specifications: { "الحجم": "صغير", "الموديل": "XY-180" } } as unknown as ProductVariant,
    { id: "xy-2835", label: "XY-2835 — كبير", price: 4000, stock: 2, specifications: { "الحجم": "كبير", "الموديل": "XY-2835" } } as unknown as ProductVariant,
];

describe("EmbeddedVariantSelector", () => {
    it("puts an explicit catalogue hint inside an option without changing its SKU", async () => {
        const onSelect = vi.fn();
        const option: ProductVariant = { id: 'test', label: 'نتريت', stock: 1, price: 12000, specifications: { 'عدد الاختبارات': '50 اختبار' } };
        render(<EmbeddedVariantSelector variants={[option]} selectedVariantId="" onVariantSelect={onSelect} productSlug="c3-1010" />);
        await userEvent.setup().click(screen.getByRole('button', { name: 'نتريت — 50 اختبار' }));
        expect(onSelect).toHaveBeenCalledWith(option);
    });
    it("does not promote disputed heater litre ranges as a verified recommendation", () => {
        const option: ProductVariant = { id: '100w', label: '100 واط', stock: 1, price: 15000, specifications: { 'حجم الحوض المناسب': '50–100 لتر' } };
        render(<EmbeddedVariantSelector variants={[option]} selectedVariantId="" onVariantSelect={vi.fn()} productSlug="yee-3006" />);
        expect(screen.getByRole('button', { name: '100 واط' })).toBeInTheDocument();
        expect(screen.queryByText(/لتر/)).not.toBeInTheDocument();
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

    it("keeps an out-of-stock option previewable with an unavailable label", () => {
        render(
            <EmbeddedVariantSelector
                variants={variants}
                selectedVariantId="v-small"
                onVariantSelect={vi.fn()}
            />
        );
        const outOfStock = screen.getByRole("button", { name: "كبير، غير متوفر" });
        expect(outOfStock).not.toBeDisabled();
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

 describe("pending and archived options", () => {
 it("does not imply an initial selection or price", () => {
  render(<EmbeddedVariantSelector variants={variants} selectedVariantId="" onVariantSelect={vi.fn()} />);
  for (const button of screen.getAllByRole("button")) expect(button).toHaveAttribute("aria-pressed", "false");
 });
 it("shows pending price and lets an incoming option be previewed by keyboard", async () => {
  const incoming: ProductVariant = { id: "incoming", label: "قادم", price: null, stock: 0, priceStatus: "pending", availabilityStatus: "coming_soon" };
  const onSelect = vi.fn();
  render(<EmbeddedVariantSelector variants={[incoming, { ...variants[0], isArchived: true }]} selectedVariantId="incoming" onVariantSelect={onSelect} />);
  expect(screen.getByText("يحدد لاحقا")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "صغير" })).not.toBeInTheDocument();
  const button = screen.getByRole("button", { name: /قادم/ });
  button.focus(); await userEvent.setup().keyboard("{Enter}");
  expect(onSelect).toHaveBeenCalledWith(incoming);
 });
});

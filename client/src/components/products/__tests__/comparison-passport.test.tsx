import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Product } from "@/types";
import { formatPrice } from "@/lib/format";
import { i18next } from "@/i18n";
import { comparisonPhoto, comparisonSpecifications, selectedComparisonVariant, specificationValuesDiffer } from "../comparison-passport";
import { ProductComparisonTable } from "../product-comparison";
import { ExplodedProductView } from "../exploded-product-view";

vi.mock("@/contexts/cart-context", () => ({ useCart: () => ({ addItem: vi.fn() }) }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key, i18n: { language: "en" } }) }));

const product: Product = {
    id: "filter", slug: "filter", name: "Verified filter", brand: "Brand", price: 100,
    stock: 4, rating: 0, reviewCount: 0, category: "Filters", thumbnail: "/family.jpg", images: ["/family.jpg"],
    specifications: { "Flow (L/h)": 700, "Power (W)": 15 }, hasVariants: true,
    variants: [
        { id: "small", label: "Small", price: 80, stock: 3, image: "/small.jpg", specifications: { "Flow (L/h)": 300, "Power (W)": 6 } },
        { id: "large", label: "Large", price: 140, stock: 9, images: [], image: "/obsolete.jpg", specifications: { "Flow (L/h)": 900 } },
        { id: "pending", label: "Pending", price: null, priceStatus: "pending", stock: 5, specifications: {} },
        { id: "old", label: "Archived", price: 1, stock: 9, isArchived: true },
    ],
};

describe("specification passports", () => {
    it("keeps exact source objects, units, and missing evidence without guessing", () => {
        const before = JSON.stringify(product);
        const small = selectedComparisonVariant(product, "small");
        expect(small).toBe(product.variants?.[0]);
        expect(comparisonSpecifications(product, small)).toBe(small?.specifications);
        expect(comparisonPhoto(product, small)).toBe("/small.jpg");
        expect(comparisonPhoto(product, selectedComparisonVariant(product, "large"))).toBeUndefined();
        expect(comparisonSpecifications(product, selectedComparisonVariant(product, "large"))).toEqual({ "Flow (L/h)": 900 });
        expect(selectedComparisonVariant(product, "old")).toBeUndefined();
        expect(specificationValuesDiffer([undefined, "900"])).toBe(false);
        expect(specificationValuesDiffer(["300", "900"])).toBe(true);
        expect(JSON.stringify(product)).toBe(before);
    });

    it("supports keyboard option selection, semantic headers, unknowns, and preserves original props", async () => {
        const user = userEvent.setup();
        const other = { ...product, id: "other", name: "Other filter" };
        const before = JSON.stringify(product);
        const onRemove = vi.fn();
        const view = render(<div dir="rtl"><ProductComparisonTable products={[product, other]} selectedVariantIds={{ filter: "small", other: "large" }} onRemove={onRemove} /></div>);
        expect(screen.getByRole("table")).toBeInTheDocument();
        expect(view.container.querySelectorAll('th[scope="col"]')).toHaveLength(3);
        expect(screen.getByRole("rowheader", { name: /Flow \(L\/h\)/ })).toBeInTheDocument();
        expect(screen.getAllByText("Not specified").length).toBeGreaterThan(0);
        expect(screen.getByText("Photo unavailable for this option")).toBeInTheDocument();
        expect(view.container.querySelector('img[src="/obsolete.jpg"]')).toBeNull();
        const select = screen.getByRole("combobox", { name: "Selected option: Verified filter" });
        select.focus();
        expect(select).toHaveFocus();
        await user.selectOptions(select, "large");
        expect(select).toHaveValue("large");
        expect(within(screen.getByRole("rowheader", { name: "Power (W)" }).closest("tr")!).getAllByText("Not specified")).toHaveLength(2);
        expect(screen.queryByRole("option", { name: "Archived" })).not.toBeInTheDocument();
        expect(JSON.stringify(product)).toBe(before);
        expect(onRemove).not.toHaveBeenCalled();
    });

    it("uses the reviewed selected sand content without changing canonical copy", () => {
        const sand: Product = { ...product, slug: "houyi-stream-sand", name: "Stream sand — 2–6 mm", description: "Grain size 2–6 mm. General product information.", variants: [{ id: "large", label: "5–8 mm", price: 140, stock: 3, image: "/large.jpg", specifications: { "حجم الحبيبات": "5–8 mm" } }] };
        const before = JSON.stringify(sand);
        const { container } = render(<ProductComparisonTable products={[sand]} selectedVariantIds={{ filter: "large" }} />);
        expect(screen.getByRole("img")).toHaveAttribute("alt", "Stream sand — 5–8 mm");
        expect(screen.getByRole("combobox")).toHaveAccessibleName("Selected option: Stream sand — 5–8 mm");
        expect(container.textContent).not.toContain("2–6 mm");
        expect(screen.getByText("General product information.")).toBeInTheDocument();
        expect(screen.getAllByText("Product-level information").length).toBeGreaterThan(0);
        expect(JSON.stringify(sand)).toBe(before);
    });

    it("keeps incoming cotton dimensions unit-unspecified without parent size claims", () => {
        const label = "120×30×2 تقريبا — وحدة القياس غير مذكورة";
        const cotton: Product = { ...product, slug: "houyi-white-cotton", name: "White Filter Cotton — 30×50 cm", description: "Cotton measuring 30×50 cm. May be cut to fit.", variants: [{ id: "120x30x2", label, price: null, stock: 0, priceStatus: "pending", availabilityStatus: "coming_soon", image: "/cotton-incoming.jpg", specifications: { "المقاس": "120×30×2 تقريبا", "بيان المقاس": "حسب الفاتورة؛ وحدة القياس غير مذكورة" } }] };
        const before = JSON.stringify(cotton);
        const { container } = render(<ProductComparisonTable products={[cotton]} selectedVariantIds={{ filter: "120x30x2" }} />);
        expect(screen.getByRole("img")).toHaveAttribute("alt", `White Filter Cotton — ${label}`);
        expect(container.textContent).not.toContain("30×50 cm");
        expect(screen.getByText("حسب الفاتورة؛ وحدة القياس غير مذكورة")).toBeInTheDocument();
        expect(screen.getAllByText(String(i18next.t("product:price.pending"))).length).toBeGreaterThan(0);
        expect(JSON.stringify(cotton)).toBe(before);
    });

    it("highlights only supplied differences and preserves pending price", () => {
        const other = { ...product, id: "other", name: "Other filter" };
        const { container } = render(<ProductComparisonTable products={[product, other]} selectedVariantIds={{ filter: "small", other: "large" }} />);
        const priceRow = screen.getByRole("rowheader", { name: "product-comparison.s24" }).closest("tr")!;
        expect(within(priceRow).getByText(formatPrice(80))).toBeInTheDocument();
        expect(within(priceRow).getByText(formatPrice(140))).toBeInTheDocument();
        expect(screen.getByRole("rowheader", { name: /Flow \(L\/h\)/ }).closest("tr")).toHaveClass("bg-primary/5");
        expect(screen.getByRole("rowheader", { name: "Power (W)" }).closest("tr")).not.toHaveClass("bg-primary/5");
        fireEvent.change(screen.getByRole("combobox", { name: "Selected option: Verified filter" }), { target: { value: "pending" } });
        expect(within(priceRow).getByText(String(i18next.t("product:price.pending")))).toBeInTheDocument();
        expect(within(priceRow).queryByText(formatPrice(80))).not.toBeInTheDocument();
        expect(container.textContent).not.toContain("Tank capacity");
        expect(container.querySelector('img[src="/family.jpg"]')).toBeNull();
    });
});

describe("supplied product anatomy", () => {
    const anatomy = { ...product, explodedViewParts: [
        { id: "intake", name: "Supplied intake", description: "Existing verified description", imageUrl: "/intake.jpg", x: 30, y: 40 },
        { id: "housing", name: "Supplied housing", description: "Existing housing description", imageUrl: "" },
    ] };
    it("does not activate without supplied parts", () => {
        const { container } = render(<ExplodedProductView product={product} />);
        expect(container).toBeEmptyDOMElement();
    });
    it("uses static, keyboard-accessible photo annotations and a persistent explanation list in RTL", async () => {
        const before = JSON.stringify(anatomy);
        const user = userEvent.setup();
        const { container } = render(<div dir="rtl"><ExplodedProductView product={anatomy} /></div>);
        expect(screen.getByText("Existing verified description")).toBeVisible();
        expect(screen.getByText("Existing housing description")).toBeVisible();
        const hotspot = screen.getByRole("button", { name: "1. Supplied intake" });
        hotspot.focus();
        await user.keyboard("{Enter}");
        expect(hotspot).toHaveAttribute("aria-pressed", "true");
        expect(document.getElementById(hotspot.getAttribute("aria-controls")!)).toContainElement(screen.getByText("Existing verified description"));
        expect(within(screen.getByRole("list")).getAllByRole("button")).toHaveLength(2);
        expect(container.querySelectorAll(".animate-ping")).toHaveLength(0);
        expect(screen.getByAltText("Verified filter").parentElement).toHaveClass("aspect-square", "md:aspect-video");
        expect(container.innerHTML).not.toContain("NaN%");
        expect(JSON.stringify(anatomy)).toBe(before);
    });
});

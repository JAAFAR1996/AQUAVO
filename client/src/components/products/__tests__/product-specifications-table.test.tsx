/**
 * ProductSpecificationsTable list-semantics test (Phase E).
 *
 * Key/value specification rows must be exposed as a description list
 * (dl/dt/dd) rather than plain, unrelated divs, so screen reader users get
 * "term, value" pairs instead of a wall of disconnected text.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { ProductSpecificationsTable } from "../product-specifications-table";

describe("ProductSpecificationsTable", () => {
    it("renders specifications as a description list", () => {
        const { container } = render(
            <ProductSpecificationsTable
                specifications={{ "الحجم": "60 سم", "الوزن": "2 كغم" }}
            />
        );
        const dl = container.querySelector("dl");
        expect(dl).not.toBeNull();
        expect(dl?.querySelectorAll("dt")).toHaveLength(2);
        expect(dl?.querySelectorAll("dd")).toHaveLength(2);
    });

    it("pairs each label with its value as dt/dd", () => {
        render(<ProductSpecificationsTable specifications={{ "الحجم": "60 سم" }} />);
        expect(screen.getByText("الحجم").closest("dt")).not.toBeNull();
        expect(screen.getByText("60 سم").closest("dd")).not.toBeNull();
    });

    it("hides decorative spec icons from the accessibility tree", () => {
        const { container } = render(
            <ProductSpecificationsTable specifications={{ "الحجم": "60 سم" }} />
        );
        const icon = container.querySelector("dt svg");
        expect(icon).toHaveAttribute("aria-hidden", "true");
    });

    it("returns null when there are no specifications to show", () => {
        const { container } = render(<ProductSpecificationsTable specifications={{}} />);
        expect(container).toBeEmptyDOMElement();
    });

    it("removes Arabic and English model fields from object specifications", () => {
        render(
            <ProductSpecificationsTable
                specifications={{
                    "الحجم": "كبير",
                    "الموديل": "XY-2835",
                    "Model No.": "C4-1123",
                }}
            />
        );

        expect(screen.getByText("الحجم")).toBeInTheDocument();
        expect(screen.getByText("كبير")).toBeInTheDocument();
        expect(screen.queryByText(/الموديل|model/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/XY-2835|C4-1123/i)).not.toBeInTheDocument();
    });

    it("removes model fields from array specifications", () => {
        render(
            <ProductSpecificationsTable
                specifications={[
                    { label: "الحجم", value: "صغير" },
                    { label: "موديل", value: "XY-180" },
                    { label: "model number", value: "C4-1123" },
                ]}
            />
        );

        expect(screen.getByText("الحجم")).toBeInTheDocument();
        expect(screen.getByText("صغير")).toBeInTheDocument();
        expect(screen.queryByText(/موديل|model/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/XY-180|C4-1123/i)).not.toBeInTheDocument();
    });
});

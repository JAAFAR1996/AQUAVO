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
});

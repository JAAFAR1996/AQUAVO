import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { VolcanicSizeOptions } from "../volcanic-size-options";

describe("VolcanicSizeOptions legacy-SKU preview", () => {
  const red = {
    id: "houyi-volcanic-stone-red",
    stock: 17,
    hasVariants: false,
    specifications: { "حجم القطع": "3–5 سم" },
  };

  it("shows all four supplier sizes in ascending order and enables only the stocked size", () => {
    render(<VolcanicSizeOptions product={red} />);

    const choices = screen.getAllByRole("radio");
    expect(choices.map((choice) => (choice as HTMLInputElement).value)).toEqual([
      "1–2 سم", "3–5 سم", "5–8 سم", "10–30 سم",
    ]);
    expect(choices.map((choice) => (choice as HTMLInputElement).disabled)).toEqual([
      true, false, true, true,
    ]);
    expect(choices[1]).toBeChecked();
    expect(screen.getByText("متوفر (17 كيلو)")).toBeInTheDocument();
    expect(screen.getByText(/الصور الحالية توضح مقاس 3–5 سم/)).toBeInTheDocument();
  });

  it("marks the old black 3–5 cm product as coming soon without inventing availability", () => {
    render(<VolcanicSizeOptions product={{
      id: "houyi-volcanic-stone-black",
      stock: 0,
      hasVariants: false,
      specifications: { "حجم القطع": "3–5 سم", __availabilityStatus: "coming_soon" },
    }} />);
    const choices = screen.getAllByRole("radio");
    expect(choices).toHaveLength(4);
    expect(choices.every((choice) => (choice as HTMLInputElement).disabled)).toBe(true);
    expect(choices[1]).toBeChecked();
    expect(screen.getAllByText("قريباً")).toHaveLength(4);
  });

  it("never duplicates the canonical embedded selector when real variants exist", () => {
    const { container } = render(<VolcanicSizeOptions product={{ ...red, hasVariants: true }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("does not invent sizes for unrelated or inaccurately sized products", () => {
    const { rerender, container } = render(<VolcanicSizeOptions product={{ ...red, id: "other" }} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<VolcanicSizeOptions product={{ ...red, specifications: { "حجم القطع": "1–2 سم" } }} />);
    expect(container).toBeEmptyDOMElement();
  });
});

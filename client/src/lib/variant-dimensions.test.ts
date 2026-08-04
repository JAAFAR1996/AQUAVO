import { describe, expect, it } from "vitest";

import type { ProductVariant } from "@/types";
import {
  chooseVariantForSelection,
  extractVariantDimensions,
  isDimensionValueAvailable,
  selectionFromVariant,
} from "./variant-dimensions";

const variants: ProductVariant[] = [
  {
    id: "YXL-003",
    label: "YXL-003",
    price: 25_990,
    stock: 0,
    specifications: { السعة: "23 لتر", الموديل: "YXL-003" },
  },
  {
    id: "YKK-50",
    label: "YKK-50",
    price: 38_990,
    stock: 1,
    specifications: { السعة: "40 لتر", الموديل: "YKK-50" },
  },
  {
    id: "YKK-60",
    label: "YKK-60",
    price: 51_990,
    stock: 1,
    specifications: { السعة: "63 لتر", الموديل: "YKK-60" },
  },
  {
    id: "YEE-1090",
    label: "YEE-1090",
    price: 48_400,
    stock: 2,
    specifications: { السعة: "43 لتر", الموديل: "YEE-1090" },
  },
  {
    id: "YCG-40",
    label: "YCG-40",
    price: 58_990,
    stock: 2,
    specifications: { السعة: "64 لتر", الموديل: "YCG-40" },
  },
  {
    id: "C5-1062",
    label: "C5-1062",
    price: 82_990,
    stock: 2,
    specifications: { السعة: "96 لتر", الموديل: "C5-1062" },
  },
];

describe("linked product variant dimensions", () => {
  const dimensions = extractVariantDimensions(variants);
  const currentSelection = selectionFromVariant(variants[3], dimensions);

  it("keeps every stocked capacity and model selectable", () => {
    expect(
      isDimensionValueAvailable({
        variants,
        dimensions,
        selection: currentSelection,
        dimensionKey: "السعة",
        value: "64 لتر",
      }),
    ).toBe(true);

    expect(
      isDimensionValueAvailable({
        variants,
        dimensions,
        selection: currentSelection,
        dimensionKey: "الموديل",
        value: "YKK-50",
      }),
    ).toBe(true);
  });

  it("keeps the zero-stock variant disabled", () => {
    expect(
      isDimensionValueAvailable({
        variants,
        dimensions,
        selection: currentSelection,
        dimensionKey: "الموديل",
        value: "YXL-003",
      }),
    ).toBe(false);
  });

  it("switches the whole variant when a linked capacity is selected", () => {
    const selected = chooseVariantForSelection(
      variants,
      { ...currentSelection, السعة: "64 لتر" },
      dimensions,
      "السعة",
    );

    expect(selected?.id).toBe("YCG-40");
    expect(selectionFromVariant(selected, dimensions)).toEqual({
      السعة: "64 لتر",
      الموديل: "YCG-40",
    });
  });

  it("switches the whole variant when a linked model is selected", () => {
    const selected = chooseVariantForSelection(
      variants,
      { ...currentSelection, الموديل: "YKK-60" },
      dimensions,
      "الموديل",
    );

    expect(selected?.id).toBe("YKK-60");
    expect(selectionFromVariant(selected, dimensions)).toEqual({
      السعة: "63 لتر",
      الموديل: "YKK-60",
    });
  });
});

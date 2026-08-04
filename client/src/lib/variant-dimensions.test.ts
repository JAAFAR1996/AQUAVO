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

const spongeFilterVariants: ProductVariant[] = [
  {
    id: "xy-180",
    label: "XY-180 — صغير",
    price: 3_000,
    stock: 6,
    specifications: { الحجم: "صغير", الموديل: "XY-180" },
  },
  {
    id: "xy-2835",
    label: "XY-2835 — كبير",
    price: 4_000,
    stock: 2,
    specifications: { الحجم: "كبير", الموديل: "XY-2835" },
  },
];

describe("customer-facing product variant dimensions", () => {
  const dimensions = extractVariantDimensions(variants);
  const currentSelection = selectionFromVariant(variants[3], dimensions);

  it("never exposes model as a selectable dimension", () => {
    expect(dimensions.map((dimension) => dimension.key)).toEqual(["السعة"]);
    expect(extractVariantDimensions(spongeFilterVariants)).toEqual([
      { key: "الحجم", label: "الحجم", values: ["صغير", "كبير"] },
    ]);
  });

  it("keeps every stocked customer-facing value selectable", () => {
    expect(
      isDimensionValueAvailable({
        variants,
        dimensionKey: "السعة",
        value: "64 لتر",
      }),
    ).toBe(true);
  });

  it("keeps the zero-stock customer-facing value disabled", () => {
    expect(
      isDimensionValueAvailable({
        variants,
        dimensionKey: "السعة",
        value: "23 لتر",
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
    });
  });
});

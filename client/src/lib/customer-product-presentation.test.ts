import { describe, expect, it } from "vitest";

import type { Product, ProductVariant } from "@/types";
import {
  getCustomerFacingVariantLabel,
  isHiddenModelSpecificationKey,
  sanitizeCustomerSpecifications,
  sanitizeProductForCustomer,
} from "./customer-product-presentation";

describe("customer product presentation", () => {
  it("recognizes Arabic and English model keys", () => {
    expect(isHiddenModelSpecificationKey("الموديل")).toBe(true);
    expect(isHiddenModelSpecificationKey("رقم موديل")).toBe(true);
    expect(isHiddenModelSpecificationKey("Model No.")).toBe(true);
    expect(isHiddenModelSpecificationKey("model_number")).toBe(true);
    expect(isHiddenModelSpecificationKey("الحجم")).toBe(false);
  });

  it("removes model metadata but preserves unrelated and internal 3D metadata", () => {
    const specifications = sanitizeCustomerSpecifications({
      "الحجم": "صغير",
      "الموديل": "XY-180",
      "Model Number": "C4-1123",
      __model3d: { src: "/models/filter.glb" },
    });

    expect(specifications).toEqual({
      "الحجم": "صغير",
      __model3d: { src: "/models/filter.glb" },
    });
  });

  it("uses the customer-facing dimension instead of the model code", () => {
    const variant = {
      id: "xy-180",
      label: "XY-180 — صغير",
      price: 3000,
      stock: 4,
      specifications: {
        "الحجم": "صغير",
        "الموديل": "XY-180",
      },
    } as unknown as ProductVariant;

    expect(getCustomerFacingVariantLabel(variant, "الحجم")).toBe("صغير");
    expect(getCustomerFacingVariantLabel(variant)).toBe("صغير");
  });

  it("falls back to a neutral option when the label is only a model code", () => {
    const variant = {
      id: "xy-180",
      label: "XY-180",
      price: 3000,
      stock: 4,
      specifications: { "الموديل": "XY-180" },
    } as unknown as ProductVariant;

    expect(getCustomerFacingVariantLabel(variant, undefined, 1)).toBe("الخيار 2");
  });

  it("sanitizes product and variant data before customer rendering", () => {
    const product = {
      id: "filter",
      name: "فلتر إسفنجي",
      price: 3000,
      specifications: {
        "الموديل": "BASE-1",
        "الاستخدام": "أحواض صغيرة",
      },
      variants: [
        {
          id: "xy-180",
          label: "XY-180 — صغير",
          price: 3000,
          stock: 4,
          specifications: {
            "الحجم": "صغير",
            "الموديل": "XY-180",
          },
        },
      ],
    } as unknown as Product;

    const sanitized = sanitizeProductForCustomer(product);

    expect(sanitized.specifications).toEqual({ "الاستخدام": "أحواض صغيرة" });
    expect(sanitized.variants?.[0].label).toBe("صغير");
    expect(sanitized.variants?.[0].specifications).toEqual({ "الحجم": "صغير" });
    expect(JSON.stringify(sanitized)).not.toContain("XY-180");
    expect(JSON.stringify(sanitized)).not.toContain("الموديل");
  });

  it("does not add undefined fields to products that did not have them", () => {
    const product = { id: "1", name: "منتج", price: 1000 } as Product;
    expect(sanitizeProductForCustomer(product)).toEqual(product);
  });
});

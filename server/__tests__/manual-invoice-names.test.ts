import { describe, expect, it } from "vitest";
import { canonicalizeManualInvoiceItems } from "../services/manual-invoice-names.js";

describe("Arabic names in manual invoice snapshots", () => {
  const catalogue = [
    {
      id: "yee-substrate",
      name: "تربة أحواض YEE",
      variants: [{ id: "two-kilo", label: "2 كيلو" }],
    },
    { id: "hygger-decor", name: "ديكور حوض Hygger", variants: null },
  ];

  it("replaces Kurdish product and option names with catalogue Arabic on new invoices", () => {
    const original = {
      productId: "yee-substrate",
      variantId: "two-kilo",
      variantLabel: "٢ کیلۆ",
      name: "خاکی ئەکواریۆم",
      quantity: 2,
      unitPrice: 17500,
      total: 35000,
      imageUrl: "/images/substrate.webp",
    };
    const result = canonicalizeManualInvoiceItems([original], catalogue)[0];

    expect(result.name).toBe("تربة أحواض YEE — 2 كيلو");
    expect(result.variantLabel).toBe("2 كيلو");
    expect(result).toMatchObject({
      quantity: 2, unitPrice: 17500, total: 35000, imageUrl: original.imageUrl,
    });
    expect(original.name).toBe("خاکی ئەکواریۆم");
    expect(original.variantLabel).toBe("٢ کیلۆ");
  });

  it("uses canonical Arabic for a simple product without adding a variant", () => {
    const result = canonicalizeManualInvoiceItems([{
      productId: "hygger-decor", name: "دیکۆر", quantity: 1, unitPrice: 9000, total: 9000,
    }], catalogue)[0];
    expect(result.name).toBe("ديكور حوض Hygger");
    expect(result.variantLabel).toBeUndefined();
  });

  it("fails closed when a product or selected variant no longer exists", () => {
    expect(() => canonicalizeManualInvoiceItems([{
      productId: "missing", name: "unknown", quantity: 1, unitPrice: 1000, total: 1000,
    }], catalogue)).toThrow("منتج الفاتورة غير موجود");

    expect(() => canonicalizeManualInvoiceItems([{
      productId: "yee-substrate", variantId: "wrong", name: "خاک", quantity: 1, unitPrice: 1000, total: 1000,
    }], catalogue)).toThrow("خيار المنتج غير موجود");
  });
});

import { describe, expect, it } from "vitest";

import { SHOP_CATEGORY_LINKS } from "@/lib/product-category-links";

describe("shop category links", () => {
  it("use exact public API category values", () => {
    expect(Object.values(SHOP_CATEGORY_LINKS).map((href) => new URL(href, "https://aquavoiq.com").searchParams.get("category")))
      .toEqual([
        "الفلترة والتنقية",
        "التحكم بالحرارة",
        "الإضاءة",
        "معالجة المياه",
        "طعام الأسماك",
        "التربة والديكور",
        "التهوية والأكسجين",
      ]);
  });
});

import { describe, expect, it } from "vitest";
import { buildProductMetaDescription, buildProductMetaTitle, buildProductSeoMeta } from "../product-seo";

describe("shared product SEO titles", () => {
  it("normalizes old country suffixes and a repeated product brand", () => {
    expect(buildProductMetaTitle("فلتر YEE - YEE | AQUAVO العراق | AQUAVO Iraq", "YEE"))
      .toBe("فلتر YEE | AQUAVO");
    expect(buildProductMetaTitle("فلتر YEE | AQUAVO عێراق", "YEE"))
      .toBe("فلتر YEE | AQUAVO");
  });

  it("adds a missing real brand while omitting placeholder and site brands", () => {
    expect(buildProductMetaTitle("فلتر حوض", "YEE")).toBe("فلتر حوض - YEE | AQUAVO");
    expect(buildProductMetaTitle("فلتر حوض", "General")).toBe("فلتر حوض | AQUAVO");
    expect(buildProductMetaTitle("خشب طبيعي DW-01", "aquavo")).toBe("خشب طبيعي DW-01 | AQUAVO");
    expect(buildProductMetaTitle("AQUAVO خشب طبيعي DW-01", "AQUAVO")).toBe("خشب طبيعي DW-01 | AQUAVO");
  });

  it("shortens a descriptive tail at a word boundary without changing the source", () => {
    const product = Object.freeze({
      name: "فلتر داخلي لتنظيف وتدوير ماء أحواض الزينة المزروعة والصغيرة والمتوسطة بصورة منتظمة",
      brand: "YEE",
      description: "فلتر داخلي للحوض.",
    });
    const result = buildProductSeoMeta(product);
    expect(result.title.length).toBeLessThanOrEqual(60);
    expect(result.title).toMatch(/\.\.\. - YEE \| AQUAVO$/);
    const prefix = result.title.replace(/\.\.\. - YEE \| AQUAVO$/, "");
    expect(product.name.startsWith(`${prefix} `)).toBe(true);
    expect(product.name).toContain("والمتوسطة بصورة منتظمة");
  });

  it("keeps identifiers, decimals, ranges and units even when the title must remain long", () => {
    const name = "فلتر خارجي لتدوير وتنظيف مياه أحواض الزينة المزروعة HG-978 بخرطوم 1.9 متر لأحواض 50 - 150 لتر";
    const { title } = buildProductSeoMeta({ name, brand: "HYGGER" });
    expect(title).toContain("HG-978");
    expect(title).toContain("1.9 متر");
    expect(title).toContain("50 - 150 لتر");
    expect(title).toContain(name);
    expect(title).not.toMatch(/150 - 50|1\. 9/);
  });

  it("protects a model named in the existing specifications without inventing it in the title", () => {
    const name = "External aquarium filter with a removable prefilter and Classic configuration";
    const result = buildProductSeoMeta({ name, specifications: { model: "Classic" } });
    expect(result.title).toContain("Classic");
    expect(buildProductSeoMeta({ name: "فلتر حوض", specifications: { model: "Unpublished" } }).title)
      .not.toContain("Unpublished");
  });

  it("keeps a multiword brand that is already present late in a long name", () => {
    const name = "Aquarium water treatment with detailed dosing instructions from Red Sea for freshwater aquariums";
    const result = buildProductSeoMeta({ name, brand: "Red Sea" });
    expect(result.title).toContain("Red Sea");
    expect(result.title.match(/Red Sea/g)).toHaveLength(1);
  });
});

describe("shared product SEO descriptions", () => {
  it("enriches a short factual description using the published delivery and payment terms", () => {
    const result = buildProductMetaDescription({ name: "سيفون", description: "مزود بخرطوم بطول 1.9 متر ومضخة يدوية لبدء السحب من دون كهرباء." });
    expect(result).toBe("مزود بخرطوم بطول 1.9 متر ومضخة يدوية لبدء السحب من دون كهرباء. توصيل لكل العراق، والدفع عند الاستلام أو إلكترونياً.");
    expect(result.length).toBeLessThanOrEqual(160);
    expect(result).not.toMatch(/متوفر الآن|خصم|دقة مؤكدة/);
  });

  it("does not pad an already useful description or repeat its service sentence", () => {
    const description = "فلتر خارجي يساعد على تدوير ماء الحوض، ويحتوي على حجرات للميديا يمكن الوصول إليها عند التنظيف. راجع القياسات والمواصفات قبل اختيار مكان تركيبه.";
    expect(buildProductMetaDescription({ name: "فلتر", description })).toBe(description);
    const short = buildProductMetaDescription({ name: "فلتر", description: "فلتر داخلي للحوض." });
    expect(buildProductMetaDescription({ name: "فلتر", description: short })).toBe(short);
  });

  it("keeps sentence boundaries without treating decimal or version dots as sentence ends", () => {
    const opening = "السعة النظرية 13.5 لتر، والإصدار 1.2.3. يصلح للأحواض الصغيرة.";
    const result = buildProductMetaDescription({ name: "حوض", description: `${opening} ${"تفاصيل إضافية ".repeat(25)}.` });
    expect(result).toContain(opening);
    expect(result).not.toContain("\u0000");
    expect(result).not.toMatch(/1\. 2|13\. 5/);
  });

  it.each(["1.9 متر", "1.9 meters", "50 - 150 لتر", "30 × 100 سم"])(
    "never leaves a partial quantity at the excerpt boundary: %s",
    (quantity) => {
      const description = `${"وصف ".repeat(38)}${quantity} ${"وتفاصيل إضافية ".repeat(10)}.`;
      const result = buildProductMetaDescription({ name: "منتج", description });
      expect(result.length).toBeLessThanOrEqual(160);
      expect(result).toMatch(/\.\.\.$/);
      expect(result).not.toMatch(/1\.9|50|30/);
    },
  );

  it("uses the start of a long real sentence instead of replacing it with generic copy", () => {
    const description = "حجر التنين الأزرق صخرة طبيعية بمسامات وتفاصيل صخرية داخل الأحواض المزروعة، تعطي مظهراً طبيعياً وتصميماً أنظف للأكواسكيب، وتصلح لتثبيت الموس والأنوبياس عليها بخيط رفيع أو غراء مخصص للأحواض بدون ما تأثر على كيمياء الماء.";
    const result = buildProductMetaDescription({ name: "حجر التنين", description });
    expect(result.length).toBeGreaterThan(120);
    expect(result.length).toBeLessThanOrEqual(160);
    expect(description.startsWith(result.replace(/\.\.\.$/, ""))).toBe(true);
    expect(result).toMatch(/\.\.\.$/);
  });

  it("uses localized factual fallbacks for missing or already truncated copy", () => {
    const ar = buildProductSeoMeta({ name: "فلتر YEE 600", description: "وصف قديم..." });
    const en = buildProductSeoMeta({ name: "YEE 600 filter" }, { locale: "en" });
    const ckb = buildProductSeoMeta({ name: "پاڵاوتنی YEE 600" }, { locale: "ckb" });
    expect(ar.description).toContain("فلتر YEE 600");
    expect(ar.description).not.toMatch(/\.{2,}|…|متوفر/);
    expect(en.description).toContain("product specifications");
    expect(en.description).not.toContain("توصيل");
    expect(ckb.description).toContain("تایبەتمەندی");
    expect(ckb.description).not.toContain("شوف");
    for (const meta of [ar, en, ckb]) expect(meta.description.length).toBeLessThanOrEqual(160);
  });

  it("supports only explicitly passed overrides and leaves full product data untouched", () => {
    const product = Object.freeze({ name: "الاسم الكامل للفلتر", description: "الوصف الكامل للمنتج.", specifications: { seoTitle: "عنوان غير معتمد" } });
    const result = buildProductSeoMeta(product, { titleOverride: "فلتر YEE | AQUAVO العراق", descriptionOverride: "الوصف المختار للمقتطف." });
    expect(result.title).toBe("فلتر YEE | AQUAVO");
    expect(result.description).toContain("الوصف المختار للمقتطف.");
    expect(buildProductSeoMeta(product).title).not.toContain("غير معتمد");
    expect(product.description).toBe("الوصف الكامل للمنتج.");
  });
});

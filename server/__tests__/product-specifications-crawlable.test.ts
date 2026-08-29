import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { renderSeoPreviewShell, type SeoPreviewProduct } from "../../api/_seo-preview-shell";

// AQUAVO holds 1,291 lines of researched, per-product editorial content in
// Neon — benefits, usageInstructions and safetyWarnings, populated on all 112
// products and distinct on 105-107 of them. A reader sees it: product-details
// renders it in tabs. A crawler saw none of it. `specifications` was not even
// selected by the SSR query, so the column could not reach the renderer at all,
// and Googlebot, GPTBot, ClaudeBot and PerplexityBot were served a product page
// stripped of everything AQUAVO actually knows about the product.
//
// Measured live on /products/yee-3006 before this change: 0 of 4 benefits,
// 0 of 5 usage steps and 1 of 4 safety warnings appeared in the crawler HTML.

const product = (overrides: Partial<SeoPreviewProduct> = {}): SeoPreviewProduct =>
  ({
    id: "yee-3006",
    slug: "yee-3006",
    name: "سخان ستانلس قابل لضبط الحرارة",
    description: "سخان بهيكل معدني قابل لضبط الحرارة.",
    category: "التحكم بالحرارة",
    brand: "YEE",
    price: "15000",
    stock: 22,
    specifications: {
      benefits: ["هيكل معدني أقل عرضة للكسر من الأنابيب الزجاجية", "قدرات متوفرة 50 و100 و200 واط"],
      usageInstructions: ["ثبت السخان داخل الحوض حسب تعليمات العبوة", "تأكد من مستوى الغمر المطلوب قبل التشغيل"],
      safetyWarnings: ["لا تشغّل السخان خارج الماء", "افصل الكهرباء قبل إدخال اليد إلى الحوض"],
      "النوع": "سخان ستانلس",
      "القدرة": "50 / 100 / 200 واط",
      __model3d: "internal/asset/should-never-render.glb",
    },
    ...overrides,
  }) as SeoPreviewProduct;

const render = (p: SeoPreviewProduct) =>
  renderSeoPreviewShell({ kind: "product", product: p, related: [] });

const textOf = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

describe("the SSR query loads what the page needs", () => {
  it("selects specifications, without which nothing below can render", () => {
    const source = readFileSync(resolve(process.cwd(), "api/_ssr-preview-source.ts"), "utf8");
    expect(source, "the single-product query must select specifications").toContain("specifications");
  });
});

describe("product page: the researched Neon content reaches the crawler", () => {
  it("renders every benefit", () => {
    const text = textOf(render(product()));
    for (const line of ["هيكل معدني أقل عرضة للكسر من الأنابيب الزجاجية", "قدرات متوفرة 50 و100 و200 واط"]) {
      expect(text, `benefit missing: ${line}`).toContain(line);
    }
  });

  it("renders every usage step", () => {
    const text = textOf(render(product()));
    for (const line of ["ثبت السخان داخل الحوض حسب تعليمات العبوة", "تأكد من مستوى الغمر المطلوب قبل التشغيل"]) {
      expect(text, `usage step missing: ${line}`).toContain(line);
    }
  });

  it("renders every safety warning", () => {
    const text = textOf(render(product()));
    for (const line of ["لا تشغّل السخان خارج الماء", "افصل الكهرباء قبل إدخال اليد إلى الحوض"]) {
      expect(text, `warning missing: ${line}`).toContain(line);
    }
  });

  it("renders the plain specification attributes as a name/value list", () => {
    const text = textOf(render(product()));
    expect(text).toContain("النوع");
    expect(text).toContain("سخان ستانلس");
    expect(text).toContain("القدرة");
    expect(text).toContain("50 / 100 / 200 واط");
  });

  // specifications is an open jsonb column. Anything the admin panel stores
  // lands there, including internal asset keys, so the renderer allowlists
  // rather than dumping the object.
  it("never leaks an internal key", () => {
    const html = render(product());
    expect(html).not.toContain("__model3d");
    expect(html).not.toContain("should-never-render.glb");
  });

  it("renders nothing extra for a product with no specifications", () => {
    const bare = render(product({ specifications: undefined }));
    expect(bare).not.toContain("aq-ssr-product-facts-title");
  });

  it("survives a malformed specifications value without throwing", () => {
    for (const bad of ["not-an-object", 42, null, [], { benefits: "not-a-list" }]) {
      expect(() => render(product({ specifications: bad as never }))).not.toThrow();
    }
  });

  it("embeds no price or stock in the specification block", () => {
    // Price and stock stay dynamic fields rendered from their own columns;
    // freezing either into this block would make it wrong the moment either moves.
    const html = render(product());
    const block = html.match(/<section class="aq-ssr-product-facts"[\s\S]*?<\/section>/)?.[0] ?? "";
    expect(block).not.toContain("15000");
    expect(block).not.toContain("22");
  });
});

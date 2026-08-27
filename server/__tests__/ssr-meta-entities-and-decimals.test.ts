import { describe, expect, it, vi } from "vitest";

// Two independent regressions in api/ssr-meta.ts, pinned together because both
// were found on the same live pass and both are invisible to the crawler-path
// tests (the bot path already did the right thing in each case).

vi.mock("@neondatabase/serverless", () => ({
  neonConfig: {},
  Pool: vi.fn().mockImplementation(function FakePool() {
    return { query: vi.fn(async () => ({ rows: [] })) };
  }),
}));

process.env.DATABASE_URL ||= "postgres://test-user:test-pass@localhost:5432/test-db";

import { buildProductMetaDescription, injectMeta } from "../../api/ssr-meta";

// The real template carries the <!--__JSON_LD__--> placeholder that injectMeta
// substitutes; without it the structured data has nowhere to land.
const SHELL = [
  "<!doctype html><html><head>",
  '<meta name="robots" content="index, follow">',
  '<link rel="canonical" href="https://www.aquavoiq.com/">',
  "<title>x</title>",
  "<!--__JSON_LD__-->",
  "</head><body></body></html>",
].join("\n");

const base = {
  url: "https://www.aquavoiq.com/shipping",
  image: "https://www.aquavoiq.com/brand/aquavo-v2-horizontal.png",
  title: "الشحن والتوصيل",
  description: "تفاصيل الشحن.",
};

const ldBlocks = (html: string): unknown[] =>
  [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) =>
    JSON.parse(m[1]),
  );

const typesOf = (html: string): string[] =>
  ldBlocks(html).map((node) => String((node as Record<string, unknown>)["@type"]));

describe("site entities reach every indexable page, not only pages with a builder", () => {
  // /shipping, /terms, /deals, /return-policy and /privacy-policy each served
  // zero ld+json to browsers while the crawler path published four nodes for
  // the same URL, because the injection sat behind `if (meta.jsonLd)`.
  it("emits Organization and WebSite for a page that has no page-level jsonLd", () => {
    const html = injectMeta(SHELL, { ...base });
    const types = typesOf(html);
    expect(types.length).toBeGreaterThan(0);
    expect(types).toContain("OnlineStore");
    expect(types).toContain("WebSite");
  });

  it("still emits exactly one organization node when the page defines its own", () => {
    const own = {
      "@context": "https://schema.org",
      "@type": "OnlineStore",
      "@id": "https://www.aquavoiq.com/#organization",
      name: "AQUAVO",
    };
    const html = injectMeta(SHELL, { ...base, jsonLd: own });
    const orgs = typesOf(html).filter((t) => t === "OnlineStore" || t === "Organization");
    expect(orgs).toHaveLength(1);
  });

  it("keeps a page's own builder output alongside the site entities", () => {
    const breadcrumb = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [],
    };
    const types = typesOf(injectMeta(SHELL, { ...base, jsonLd: breadcrumb }));
    expect(types).toContain("BreadcrumbList");
    expect(types).toContain("OnlineStore");
  });

  // A 404 describes no entity, so it is the one page that still gets nothing.
  it("emits no structured data on a 404", () => {
    const html = injectMeta(SHELL, { ...base, notFound: true });
    expect(ldBlocks(html)).toHaveLength(0);
  });
});

describe("a decimal point is not a sentence end", () => {
  // "لا نعامل رقم 0.1°C كدقة قياس مؤكدة" was cut to "لا نعامل رقم 0." — which
  // inverts the claim into "we do not treat the number 0".
  it("does not end the snippet mid-number", () => {
    const description =
      "مقياس حرارة رقمي بمستشعر سلكي يوضع داخل ماء الحوض وشاشة تبقى خارجه. " +
      "يعرض درجة الحرارة بصورة مباشرة ويساعد على متابعة تغيرها خلال اليوم. " +
      "لا نعامل رقم 0.1°C كدقة قياس مؤكدة إلا إذا نصت العبوة على ذلك.";
    const result = buildProductMetaDescription({ name: "ميزان حرارة", description });
    expect(result).not.toMatch(/\d\.$/);
    expect(result).not.toContain("رقم 0.");
  });

  it("keeps a decimal intact when the sentence containing it is included", () => {
    const description = "مزود بخرطوم بطول 1.9 متر ومضخة يدوية لبدء السحب من دون كهرباء.";
    const result = buildProductMetaDescription({ name: "سيفون", description });
    expect(result).toContain("1.9");
    expect(result).not.toContain("1. 9");
  });

  it("never leaks the internal mask character into the snippet", () => {
    const description = "السعة النظرية قبل التربة والديكور نحو 13.5 لتر. يصلح للأحواض الصغيرة.";
    const result = buildProductMetaDescription({ name: "حوض", description });
    expect(result).not.toContain("\u0000");
    expect(result).toContain("13.5");
  });

  it("still splits on real sentence ends", () => {
    const description = "الجملة الأولى. الجملة الثانية. الجملة الثالثة.";
    const result = buildProductMetaDescription({ name: "منتج", description });
    expect(result).toContain("الجملة الأولى.");
  });
});

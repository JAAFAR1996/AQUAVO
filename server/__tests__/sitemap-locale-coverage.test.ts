import type { VercelRequest, VercelResponse } from "@vercel/node";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { blogPostSourceFields, productSourceFields, sourceHash, type TranslationRecord } from "../../shared/i18n/content";
import { LOCALE_RELEASE } from "../../shared/i18n/release";

const queries = vi.hoisted(() => ({ query: vi.fn(), translations: vi.fn() }));
vi.mock("@neondatabase/serverless", () => ({
  neonConfig: {},
  Pool: vi.fn().mockImplementation(function FakePool() { return { query: queries.query }; }),
}));
vi.mock("../../api/_translation-records", () => ({ loadEntityTranslationRecords: queries.translations }));

import productsHandler from "../../api/sitemap-products";
import blogHandler from "../../api/sitemap-blog";

const originalRelease = { en: LOCALE_RELEASE.en.ready, ckb: LOCALE_RELEASE.ckb.ready };
const states = ["reviewed", "outdated", "partial", "machine", "missing"] as const;
const products = states.map((state) => ({
  id: `p-${state}`, slug: `product-${state}`, name: `منتج ${state}`, description: "وصف المنتج", subcategory: "معدات",
  specifications: { benefits: ["فائدة"] }, variants: [{ id: "v1", label: "10 سم" }],
  images: ["/images/product.webp"], thumbnail: null, updatedAt: "2026-10-19T06:00:00Z",
}));
const posts = states.map((state) => ({
  id: `b-${state}`, slug: `article-${state}`, title: `مقال ${state}`, excerpt: "مقدمة المقال", category: "الماء",
  content: "<h2>قسم</h2><p>محتوى المقال</p>", imageUrl: "/images/blog.webp",
  publishedAt: "2026-10-18T06:00:00Z", updatedAt: null, createdAt: "2026-10-18T06:00:00Z",
}));

const productTranslations: TranslationRecord[] = products.flatMap((product, index) => {
  const state = states[index];
  if (state === "missing") return [];
  return [{
    entityType: "product", entityId: product.id, locale: "en",
    status: state === "machine" ? "machine" : "reviewed",
    sourceHash: state === "outdated" ? "old-source" : sourceHash(productSourceFields(product)),
    data: {
      name: "Product", description: "Product description", subcategory: "Equipment",
      specifications: { benefits: ["Benefit"] }, variantLabels: state === "partial" ? {} : { v1: "10 cm" },
    },
  }];
});
const blogTranslations: TranslationRecord[] = posts.flatMap((post, index) => {
  const state = states[index];
  if (state === "missing") return [];
  return [{
    entityType: "blog_post", entityId: post.id, locale: "en",
    status: state === "machine" ? "machine" : "reviewed",
    sourceHash: state === "outdated" ? "old-source" : sourceHash(blogPostSourceFields(post)),
    data: { title: "Article", excerpt: "Introduction", content: state === "partial" ? "<p>Text</p>" : "<h2>Section</h2><p>Text</p>" },
  }];
});

beforeEach(() => {
  vi.stubEnv("DATABASE_URL", "postgres://test-user:test-pass@localhost:5432/test-db");
  LOCALE_RELEASE.en.ready = true;
  LOCALE_RELEASE.ckb.ready = true;
  queries.query.mockReset().mockImplementation(async (sql: string) => ({ rows: /FROM\s+products/i.test(sql) ? products : posts }));
  queries.translations.mockReset().mockImplementation(async (_pool: unknown, type: string) => type === "product" ? productTranslations : blogTranslations);
});

afterEach(() => {
  LOCALE_RELEASE.en.ready = originalRelease.en;
  LOCALE_RELEASE.ckb.ready = originalRelease.ckb;
  vi.unstubAllEnvs();
});

async function render(handler: typeof productsHandler): Promise<string> {
  let body = "";
  const response = {
    setHeader: vi.fn(),
    status: vi.fn(() => response),
    send: vi.fn((value: unknown) => { body = String(value); return response; }),
  };
  await handler({} as VercelRequest, response as unknown as VercelResponse);
  return body;
}

describe("published sitemap language versions", () => {
  it.each([
    ["product", productsHandler, "/products/product"],
    ["article", blogHandler, "/blog/article"],
  ] as const)("keeps the reviewed %s and excludes stale/partial/machine/missing versions", async (_kind, handler, path) => {
    const xml = await render(handler);
    const locations = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
    expect(locations).toHaveLength(states.length + 1);
    expect(locations).toContain(`https://www.aquavoiq.com/en${path}-reviewed`);
    for (const state of states) expect(locations).toContain(`https://www.aquavoiq.com${path}-${state}`);
    for (const state of states.slice(1)) {
      expect(xml).not.toContain(`https://www.aquavoiq.com/en${path}-${state}`);
    }
    expect(xml).not.toContain("https://www.aquavoiq.com/ckb/");
  });

  it("emits the same eligible alternate group on both sitemap versions", async () => {
    const xml = await render(productsHandler);
    const blocks = [...xml.matchAll(/<url>[\s\S]*?<\/url>/g)].map((match) => match[0]);
    const reviewed = blocks.filter((block) => /<loc>[^<]*product-reviewed<\/loc>/.test(block));
    expect(reviewed).toHaveLength(2);
    const groups = reviewed.map((block) => [...block.matchAll(/<xhtml:link[^>]*\/>/g)].map((match) => match[0]));
    expect(groups[0]).toEqual(groups[1]);
    expect(groups[0]).toHaveLength(3);
  });
});

import { adaptNeonProductListQuery } from "./helpers/neon-product-list-query";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { blogPostSourceFields, productSourceFields, sourceHash, type TranslationRecord } from "../../shared/i18n/content";
import { LOCALE_RELEASE } from "../../shared/i18n/release";

const mocks = vi.hoisted(() => ({ query: vi.fn(), translations: vi.fn() }));
vi.mock("@neondatabase/serverless", () => ({
  neonConfig: {},
  Pool: vi.fn().mockImplementation(function FakePool() { return { query: adaptNeonProductListQuery(mocks.query) }; }),
}));
vi.mock("../../api/_translation-records", () => ({ loadEntityTranslationRecords: mocks.translations }));

import stableHandler from "../../api/ssr-meta";
import semanticHandler from "../../api/_ssr-preview-source";

const originalRelease = { en: LOCALE_RELEASE.en.ready, ckb: LOCALE_RELEASE.ckb.ready };
const product = {
  id: "p1", slug: "aquarium-tool", name: "أداة تنظيف الحوض", description: "أداة لتنظيف كزاز الحوض.", subcategory: "تنظيف",
  category: "التنظيف والصيانة", categoryId: null, brand: "Houyi", currency: "IQD", price: "10000", originalPrice: null,
  stock: 5, thumbnail: "/images/tool.webp", images: ["/images/tool.webp"], hasVariants: true,
  variants: [{ id: "v1", label: "10 سم", price: "10000", stock: 5, isDefault: true }],
  specifications: { benefits: ["تنظيف كزاز الحوض"] }, rating: null, reviewCount: 0,
  createdAt: "2026-10-18T06:00:00Z", updatedAt: "2026-10-19T06:00:00Z",
};
const post = {
  id: "b1", slug: "water-care", title: "العناية بماء الحوض", excerpt: "دليل العناية بالماء.",
  content: "<h2>فحص الماء</h2><p>افحص ماء الحوض بشكل منتظم.</p>", category: "العناية بالماء",
  author: "AQUAVO", readTime: "2", imageUrl: "/images/blog.webp",
  publishedAt: "2026-10-18T06:00:00Z", createdAt: "2026-10-18T06:00:00Z",
};
const productRecord: TranslationRecord = {
  entityType: "product", entityId: product.id, locale: "en", status: "reviewed",
  sourceHash: sourceHash(productSourceFields(product)),
  data: {
    name: "Aquarium cleaning tool", description: "A tool for cleaning aquarium glass.", subcategory: "Cleaning",
    specifications: { benefits: ["Clean aquarium glass"] }, variantLabels: { v1: "10 cm" },
  },
};
const blogRecord: TranslationRecord = {
  entityType: "blog_post", entityId: post.id, locale: "en", status: "reviewed",
  sourceHash: sourceHash(blogPostSourceFields(post)),
  data: { title: "Aquarium water care", excerpt: "A guide to caring for aquarium water.", content: "<h2>Test the water</h2><p>Test aquarium water regularly.</p>" },
};

/** Model a SELECT projection, so omitted source columns cannot be supplied by an overgenerous fake DB. */
function projectedRow(sql: string, row: Record<string, unknown>): Record<string, unknown> {
  const selection = /SELECT\s+([\s\S]*?)\s+FROM\b/i.exec(sql)?.[1] ?? "";
  const result: Record<string, unknown> = {};
  for (const column of selection.split(",")) {
    const match = /^(\w+)(?:\s+AS\s+"?(\w+)"?)?$/i.exec(column.trim());
    if (!match) continue;
    const name = match[2] ?? match[1].replace(/_([a-z])/g, (_all, letter: string) => letter.toUpperCase());
    if (Object.prototype.hasOwnProperty.call(row, name)) result[name] = row[name];
  }
  return result;
}

beforeEach(() => {
  vi.stubEnv("DATABASE_URL", "postgres://test-user:test-pass@localhost:5432/test-db");
  vi.stubEnv("VERCEL_ENV", "production");
  LOCALE_RELEASE.en.ready = true;
  LOCALE_RELEASE.ckb.ready = true;
  mocks.translations.mockReset().mockResolvedValue([]);
  mocks.query.mockReset().mockImplementation(async (sql: string, values?: unknown[]) => {
    if (/FROM\s+settings\b/i.test(sql)) return { rows: [{ value: "5000" }] };
    if (/FROM\s+products\b/i.test(sql)) {
      return { rows: /WHERE\s+slug\s*=\s*\$1/i.test(sql) && values?.[0] === product.slug ? [projectedRow(sql, product)] : [] };
    }
    if (/FROM\s+blog_posts\b/i.test(sql)) {
      return { rows: /WHERE\s+slug\s*=\s*\$1/i.test(sql) && values?.[0] === post.slug ? [projectedRow(sql, post)] : [] };
    }
    return { rows: [] };
  });
});

afterEach(() => {
  LOCALE_RELEASE.en.ready = originalRelease.en;
  LOCALE_RELEASE.ckb.ready = originalRelease.ckb;
  vi.unstubAllEnvs();
});

async function request(handler: typeof stableHandler, path: string, accept = "text/html") {
  let html = "";
  let status = 0;
  const headers: Record<string, string> = {};
  const response = {
    setHeader: vi.fn((key: string, value: string) => { headers[key.toLowerCase()] = String(value); return response; }),
    status: vi.fn((code: number) => { status = code; return response; }),
    send: vi.fn((value: unknown) => { html = String(value); return response; }),
    end: vi.fn(),
  };
  await handler({ url: path, headers: { host: "www.aquavoiq.com", accept, "user-agent": "Mozilla/5.0" } } as unknown as VercelRequest, response as unknown as VercelResponse);
  return { html, status, headers };
}

const alternateGroup = (html: string) => [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"[^>]*>/g)].map((match) => `${match[1]} ${match[2]}`);
const robots = (html: string) => /<meta name="robots" content="([^"]*)"/.exec(html)?.[1] ?? "";
const handlers = [stableHandler, semanticHandler] as const;

describe("real entity SSR language eligibility", () => {
  it.each(["missing", "machine", "outdated", "partial"] as const)("excludes %s product translations in both HTML paths", async (state) => {
    const record = state === "missing" ? undefined : {
      ...productRecord,
      status: state === "machine" ? "machine" as const : "reviewed" as const,
      sourceHash: state === "outdated" ? "old-source" : productRecord.sourceHash,
      data: state === "partial" ? { ...productRecord.data, variantLabels: {} } : productRecord.data,
    };
    mocks.translations.mockResolvedValue(record ? [record] : []);
    for (const handler of handlers) {
      const arabic = await request(handler, `/products/${product.slug}`);
      expect(arabic.status).toBe(200);
      expect(alternateGroup(arabic.html)).toEqual([
        `ar-IQ https://www.aquavoiq.com/products/${product.slug}`,
        `x-default https://www.aquavoiq.com/products/${product.slug}`,
      ]);
      const english = await request(handler, `/en/products/${product.slug}`);
      expect(english.status).toBe(200);
      expect(robots(english.html)).toContain("noindex");
      expect(english.headers["x-robots-tag"]).toContain("noindex");
      expect(alternateGroup(english.html)).toEqual([]);
      if (state === "machine") {
        const markdown = await request(handler, `/en/products/${product.slug}`, "text/markdown");
        expect(markdown.status).toBe(200);
        expect(markdown.headers["x-robots-tag"]).toContain("noindex");
      }
    }
  });

  it("keeps reviewed current product versions reciprocal and indexable", async () => {
    mocks.translations.mockResolvedValue([productRecord]);
    for (const handler of handlers) {
      const arabic = await request(handler, `/products/${product.slug}`);
      const english = await request(handler, `/en/products/${product.slug}`);
      expect(arabic.status).toBe(200);
      expect(english.status).toBe(200);
      expect(alternateGroup(english.html)).toEqual(alternateGroup(arabic.html));
      expect(alternateGroup(arabic.html)).toHaveLength(3);
      expect(robots(english.html)).toMatch(/^index/);
      expect(english.headers["x-robots-tag"] ?? "").not.toContain("noindex");
      expect(english.html).toContain(`rel="canonical" href="https://www.aquavoiq.com/en/products/${product.slug}"`);
    }
  });

  it("does not release reviewed entity URLs when their locale is unreleased", async () => {
    LOCALE_RELEASE.en.ready = false;
    mocks.translations.mockResolvedValue([productRecord]);
    for (const handler of handlers) {
      const arabic = await request(handler, `/products/${product.slug}`);
      const english = await request(handler, `/en/products/${product.slug}`);
      expect(alternateGroup(arabic.html).some((link) => link.startsWith("en "))).toBe(false);
      expect(robots(english.html)).toContain("noindex");
      expect(alternateGroup(english.html)).toEqual([]);
    }
  });

  it("hashes the selected blog category consistently in both handlers", async () => {
    mocks.translations.mockResolvedValue([blogRecord]);
    for (const handler of handlers) {
      const arabic = await request(handler, `/blog/${post.slug}`);
      const english = await request(handler, `/en/blog/${post.slug}`);
      expect(arabic.status).toBe(200);
      expect(english.status).toBe(200);
      expect(alternateGroup(arabic.html)).toHaveLength(3);
      expect(alternateGroup(english.html)).toEqual(alternateGroup(arabic.html));
      expect(robots(english.html)).toMatch(/^index/);
      expect(english.headers["x-robots-tag"] ?? "").not.toContain("noindex");
    }
  });

  it("omits a reviewed article whose translated body is structurally incomplete", async () => {
    mocks.translations.mockResolvedValue([{ ...blogRecord, data: { ...blogRecord.data, content: "<p>Text only</p>" } }]);
    for (const handler of handlers) {
      const arabic = await request(handler, `/blog/${post.slug}`);
      const english = await request(handler, `/en/blog/${post.slug}`);
      expect(alternateGroup(arabic.html)).toHaveLength(2);
      expect(robots(english.html)).toContain("noindex");
      expect(alternateGroup(english.html)).toEqual([]);
    }
  });

  it("keeps only the canonical category query in stable listing alternates", async () => {
    const search = `?category=${encodeURIComponent("التحكم بالحرارة")}`;
    const page = await request(stableHandler, `/en/products${search}&utm_source=ad`);
    expect(page.status).toBe(200);
    expect(page.html).toContain(`rel="canonical" href="https://www.aquavoiq.com/en/products${search}"`);
    expect(alternateGroup(page.html)).toEqual([
      `ar-IQ https://www.aquavoiq.com/products${search}`,
      `en https://www.aquavoiq.com/en/products${search}`,
      `ku-IQ https://www.aquavoiq.com/ckb/products${search}`,
      `x-default https://www.aquavoiq.com/products${search}`,
    ]);
  });
});

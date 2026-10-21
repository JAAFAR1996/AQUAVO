import { adaptNeonProductListQuery } from "../server/__tests__/helpers/neon-product-list-query";
import { readFileSync } from "node:fs";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ query: vi.fn(), translations: vi.fn() }));
vi.mock("@neondatabase/serverless", () => ({
  neonConfig: {},
  Pool: vi.fn().mockImplementation(function FakePool() { return { query: adaptNeonProductListQuery(mocks.query) }; }),
}));
vi.mock("../api/_translation-records", () => ({ loadEntityTranslationRecords: mocks.translations }));
vi.mock("wouter", () => ({
  useRoute: () => [true, { id: "fish-keeping-stress-relief-mental-health" }],
  useLocation: () => [window.location.pathname, vi.fn()],
  Link: ({ children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { children?: ReactNode }) => <a {...props}>{children}</a>,
}));

import stableHandler from "../api/ssr-meta";
import semanticHandler from "../api/_ssr-preview-source";
import legacyBlogHandler from "../api/blog-ssr";
import { getStaticSearchMeta } from "../api/_static-search-meta";
import { getGenericStaticSearchMeta } from "../api/_static-search-copy";
import { getLocalizedStaticMeta } from "../api/_static-meta-i18n";
import { renderGuidesIndexHtml } from "../api/_guides-content";
import { renderCanonicalGuidesIndexHtml } from "../api/_canonical-guides";
import { renderAhrefsSsrContentSection } from "../api/_seo-content";
import { MetaTags } from "../client/src/components/seo/meta-tags";
import BlogPostPage from "../client/src/pages/blog-post";
import { buildArticleSeoMeta, type ArticleSeoInput } from "../shared/article-seo";
import { articleAuthorEntity } from "../shared/editorial-author";
import { productCategoryForArticle } from "../shared/article-links";
import { categorySearch } from "../shared/category-search";
import { AQUAVO_BASE_URL, AQUAVO_PRODUCT_CATEGORIES, PUBLIC_INDEXABLE_PATHS } from "../shared/seo-contract";
import { splitLocaleFromPath } from "../shared/i18n/locales";

const source = JSON.parse(readFileSync("reports/i18n/source-cache.json", "utf8")) as {
  posts: Array<ArticleSeoInput & { slug: string; author: string; category: string }>;
  products: Array<Record<string, unknown>>;
};
const post = source.posts.find((row) => row.slug === "fish-keeping-stress-relief-mental-health")!;
const handlers = [stableHandler, semanticHandler] as const;
const parse = (html: string) => new DOMParser().parseFromString(html, "text/html");
const description = (page: Document) => page.head.querySelector<HTMLMetaElement>('meta[name="description"]')?.content;
const canonical = (page: Document) => page.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.getAttribute("href");

function schemaNodes(page: Document): Record<string, unknown>[] {
  const flatten = (value: unknown): Record<string, unknown>[] => {
    if (Array.isArray(value)) return value.flatMap(flatten);
    if (!value || typeof value !== "object") return [];
    const node = value as Record<string, unknown>;
    return [node, ...flatten(node["@graph"])];
  };
  return [...page.querySelectorAll('script[type="application/ld+json"]')].flatMap((script) => flatten(JSON.parse(script.textContent || "{}")));
}

async function request(handler: typeof stableHandler, path: string, accept = "text/html") {
  const headers: Record<string, string> = {};
  let html = "";
  let status = 200;
  const response = {
    setHeader: vi.fn((key: string, value: string | number | readonly string[]) => { headers[key.toLowerCase()] = String(value); return response; }),
    status: vi.fn((code: number) => { status = code; return response; }),
    send: vi.fn((value: unknown) => { html = String(value); return response; }),
    end: vi.fn((value?: unknown) => { if (value !== undefined) html = String(value); return response; }),
  };
  await handler({
    url: path,
    headers: { host: "www.aquavoiq.com", accept, "user-agent": handler === semanticHandler ? "AhrefsSiteAudit" : "Mozilla/5.0" },
  } as unknown as VercelRequest, response as unknown as VercelResponse);
  return { html, page: parse(html), status, headers };
}

beforeEach(() => {
  vi.stubEnv("DATABASE_URL", "postgres://test-user:test-pass@localhost:5432/test-db");
  vi.stubEnv("VERCEL_ENV", "production");
  document.head.innerHTML = "";
  window.history.replaceState({}, "", "/");
  mocks.translations.mockReset().mockResolvedValue([]);
  mocks.query.mockReset().mockImplementation(async (sql: string) => {
    if (/FROM\s+settings\b/i.test(sql)) return { rows: [{ value: "5000" }] };
    if (/FROM\s+blog_posts\b/i.test(sql)) return { rows: [post] };
    if (/FROM\s+products\b/i.test(sql)) return { rows: [source.products[0]] };
    return { rows: [] };
  });
});

afterEach(() => {
  cleanup();
  document.head.innerHTML = "";
  window.history.replaceState({}, "", "/");
  vi.unstubAllEnvs();
});

describe("search metadata across actual renderers", () => {
  it.each(["/faq", "/products", "/en/", "/en/journey", "/ckb/calculators", "/ckb/products"])("keeps server and hydrated metadata aligned for %s", async (path) => {
    const { locale, path: logicalPath } = splitLocaleFromPath(path);
    const expected = getStaticSearchMeta(locale, logicalPath)!;
    for (const handler of handlers) {
      const result = await request(handler, path);
      expect(result.status).toBe(200);
      expect(result.page.title).toBe(expected.title);
      expect(description(result.page)).toBe(expected.description);
      expect(result.headers["x-robots-tag"] ?? "").not.toContain("noindex");
      document.head.innerHTML = result.page.head.innerHTML;
      window.history.replaceState({}, "", path);
      const view = render(<MetaTags title="Earlier page title" description="Earlier short summary." />);
      expect(document.title).toBe(expected.title);
      expect(description(document)).toBe(expected.description);
      expect(canonical(document)).toBe(canonical(result.page));
      view.unmount();
    }
  });

  it("keeps the original localized visible heading, summary and schema name", async () => {
    const original = getLocalizedStaticMeta("en", "/journey")!;
    const { page } = await request(semanticHandler, "/en/journey");
    const heading = original.title.replace(/\s*\|\s*AQUAVO\s*$/, "");
    expect(page.querySelector("h1")?.textContent).toBe(heading);
    expect(page.body.textContent).toContain(original.description);
    expect(schemaNodes(page).find((node) => node["@type"] === "WebPage")?.name).toBe(heading);
    expect(page.title).not.toBe(original.title);
  });

  it("retains the category canonical and alternates while excluding tracking parameters", async () => {
    const category = "الفلترة والتنقية";
    const search = `?category=${encodeURIComponent(category)}`;
    const path = `/ckb/products${search}&utm_source=ad`;
    const expected = getStaticSearchMeta("ckb", "/products", category)!;
    const productPageCopy = categorySearch(category, "ckb")!;
    for (const handler of handlers) {
      const result = await request(handler, path);
      expect(result.status).toBe(200);
      expect(result.page.title).toBe(expected.title);
      expect(description(result.page)).toBe(expected.description);
      expect(canonical(result.page)).toBe(`${AQUAVO_BASE_URL}/ckb/products${search}`);
      document.head.innerHTML = result.page.head.innerHTML;
      window.history.replaceState({}, "", path);
      const view = render(<MetaTags title={productPageCopy.title} description={productPageCopy.description} canonicalUrl={`${AQUAVO_BASE_URL}/products${search}`} />);
      expect(document.title).toBe(expected.title);
      expect(description(document)).toBe(expected.description);
      expect(document.title).toBe(productPageCopy.title);
      expect(description(document)).toBe(productPageCopy.description);
      expect(document.title).not.toBe(getGenericStaticSearchMeta("ckb", "/products")!.title);
      expect(canonical(document)).toBe(canonical(result.page));
      for (const alternate of document.head.querySelectorAll<HTMLLinkElement>('link[rel="alternate"][hreflang]')) {
        expect(alternate.getAttribute("href")).toContain(search);
        expect(alternate.getAttribute("href")).not.toContain("utm_source");
      }
      view.unmount();
    }
  });

  it("preserves the live shipping fee and explicit caller exclusions", () => {
    window.history.replaceState({}, "", "/shipping");
    const liveDescription = "توصيل مستلزمات الأحواض لكل محافظات العراق برسوم 20,000 دينار عراقي، مع الدفع عند الاستلام أو إلكترونياً وتفاصيل واضحة قبل تأكيد الطلب.";
    const view = render(<MetaTags title="Shipping" description={liveDescription} />);
    expect(description(document)).toBe(liveDescription);
    view.unmount();
    window.history.replaceState({}, "", "/products");
    const excluded = render(<MetaTags title="Products" noIndex />);
    expect(document.head.querySelector<HTMLMetaElement>('meta[name="robots"]')?.content).toContain("noindex");
    expect(document.head.querySelectorAll('link[rel="alternate"][hreflang]')).toHaveLength(0);
    excluded.unmount();
    render(<MetaTags title="الصفحة غير موجودة | AQUAVO" notFound />);
    expect(document.title).toBe("الصفحة غير موجودة | AQUAVO");
    expect(canonical(document)).toBeUndefined();
  });

  it("uses one article snippet while preserving the complete title in every article graph and visible shell", async () => {
    const expected = buildArticleSeoMeta(post);
    for (const handler of [...handlers, legacyBlogHandler]) {
      const result = await request(handler, `/blog/${post.slug}`);
      expect(result.status).toBe(200);
      expect(result.page.title).toBe(expected.title);
      expect(description(result.page)).toBe(expected.description);
      const article = schemaNodes(result.page).find((node) => node["@type"] === "Article");
      expect(article?.headline).toBe(post.title);
      expect(article?.author).toMatchObject(articleAuthorEntity(post.author));
      if (handler !== stableHandler) expect(result.page.querySelector("h1")?.textContent).toBe(post.title);
    }
    for (const handler of handlers) {
      const markdown = await request(handler, `/blog/${post.slug}`, "text/markdown");
      expect(markdown.html.split("\n")[0]).toBe(`# ${post.title}`);
    }
  });

  it("mounts the real article page with the original H1 and schema headline", () => {
    window.history.replaceState({}, "", `/blog/${post.slug}`);
    const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false, queryFn: async () => [] } } });
    queryClient.setQueryData([`/api/blog/posts/${post.slug}`], post);
    queryClient.setQueryData(["/api/blog/posts"], []);
    queryClient.setQueryData(["/api/products", { category: productCategoryForArticle(post) }], []);
    const view = render(<QueryClientProvider client={queryClient}><BlogPostPage /></QueryClientProvider>);
    const expected = buildArticleSeoMeta(post);
    expect(document.title).toBe(expected.title);
    expect(description(document)).toBe(expected.description);
    expect(view.getByRole("heading", { level: 1 }).textContent).toBe(post.title);
    expect(schemaNodes(document).find((node) => node["@type"] === "Article")?.headline).toBe(post.title);
    view.unmount();
    queryClient.clear();
  });

  it("publishes a complete social card on both guide index renderers", () => {
    const expected = getStaticSearchMeta("ar", "/guides")!;
    const image = `${AQUAVO_BASE_URL}/brand/aquavo-v2-horizontal.png`;
    for (const html of [renderGuidesIndexHtml(AQUAVO_BASE_URL, image), renderCanonicalGuidesIndexHtml(AQUAVO_BASE_URL, image)]) {
      const page = parse(html);
      expect(page.title).toBe(expected.title);
      expect(description(page)).toBe(expected.description);
      expect(page.querySelector("h1")?.textContent).toBe("أدلة AQUAVO لأحواض الزينة");
      expect(canonical(page)).toBe(`${AQUAVO_BASE_URL}/guides`);
      for (const [key, value] of Object.entries({ "og:type": "website", "og:title": expected.title, "og:description": expected.description })) {
        expect(page.head.querySelectorAll(`meta[property="${key}"]`)).toHaveLength(1);
        expect(page.head.querySelector<HTMLMetaElement>(`meta[property="${key}"]`)?.content).toBe(value);
      }
      for (const [key, value] of Object.entries({ "twitter:card": "summary_large_image", "twitter:title": expected.title, "twitter:description": expected.description })) {
        expect(page.head.querySelectorAll(`meta[name="${key}"]`)).toHaveLength(1);
        expect(page.head.querySelector<HTMLMetaElement>(`meta[name="${key}"]`)?.content).toBe(value);
      }
      expect(page.head.querySelector<HTMLMetaElement>('meta[name="twitter:image"]')?.content).toMatch(/^https:\/\//);
    }
  });

  it("keeps the released static and category corpus within the metadata budget without broadening routing", () => {
    for (const locale of ["ar", "en", "ckb"] as const) {
      for (const path of PUBLIC_INDEXABLE_PATHS) {
        expect(getGenericStaticSearchMeta(locale, path)).toEqual(getStaticSearchMeta(locale, path));
      }
      const metas = [
        ...PUBLIC_INDEXABLE_PATHS.map((path) => [path, getStaticSearchMeta(locale, path)] as const),
        ...AQUAVO_PRODUCT_CATEGORIES.map((category) => [category, getStaticSearchMeta(locale, "/products", category)] as const),
      ];
      for (const [path, meta] of metas) {
        expect(meta, `${locale}: ${path}`).toBeDefined();
        expect(meta!.title.length, `${locale}: ${path}`).toBeLessThanOrEqual(70);
        expect(meta!.description.length, `${locale}: ${path}`).toBeGreaterThanOrEqual(100);
        expect(meta!.description.length, `${locale}: ${path}`).toBeLessThanOrEqual(160);
      }
      for (const path of ["/bundles", "/admin", "/products/an-entity", "/blog/an-entity"]) {
        expect(getStaticSearchMeta(locale, path)).toBeUndefined();
      }
    }
    expect(Object.hasOwn(getStaticSearchMeta("ar", "/contact")!, "keywords")).toBe(false);
    for (const path of ["/calculators", "/journey", "/ai-tools"]) {
      const links = [...parse(renderAhrefsSsrContentSection(path)).querySelectorAll("a")].map((link) => link.getAttribute("href"));
      expect(links).not.toContain("/tank-builder");
      expect(links).not.toContain("/aquarium-wizard");
      expect(links.filter((href) => href === "/journey").length).toBeLessThanOrEqual(path === "/journey" ? 0 : 1);
    }
  });
});

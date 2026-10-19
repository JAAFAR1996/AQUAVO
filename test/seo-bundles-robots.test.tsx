import type { VercelRequest, VercelResponse } from "@vercel/node";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import crawlerHandler from "../api/_ssr-preview-source.js";
import browserHandler from "../api/ssr-meta.js";
import { MetaTags } from "../client/src/components/seo/meta-tags";
import BundlesPage from "../client/src/pages/bundles";

// Bundle inventory and cart operations do not participate in page metadata.
// Keep the real page and MetaTags effect while avoiding API/provider setup.
vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: undefined, isLoading: true }),
}));
vi.mock("../client/src/contexts/cart-context", () => ({
  useCart: () => ({ addItems: async () => 0 }),
}));
vi.mock("../client/src/i18n/locale-context", () => ({
  useLocale: () => ({ locale: "ar" }),
}));

const NOINDEX = "noindex, nofollow, noarchive";

async function requestBundles(handler: typeof crawlerHandler | typeof browserHandler) {
  const headers = new Map<string, string>();
  let status = 200;
  let html = "";
  const response = {
    setHeader: vi.fn((name: string, value: string | number | readonly string[]) => {
      headers.set(name.toLowerCase(), String(value));
      return response;
    }),
    status: vi.fn((code: number) => {
      status = code;
      return response;
    }),
    send: vi.fn((value: unknown) => {
      html = String(value);
      return response;
    }),
    end: vi.fn((value?: unknown) => {
      if (value !== undefined) html = String(value);
      return response;
    }),
  };
  await handler({
    url: "/bundles",
    headers: {
      host: "www.aquavoiq.com",
      accept: "text/html",
      "user-agent": handler === crawlerHandler ? "AhrefsSiteAudit" : "Mozilla/5.0",
    },
  } as unknown as VercelRequest, response as unknown as VercelResponse);

  expect(status).toBe(200);
  const page = new DOMParser().parseFromString(html, "text/html");
  expect(page.title).toContain("AQUAVO");
  return { headers, page };
}

const clientRobots = () => document.head.querySelector<HTMLMetaElement>('meta[name="robots"]')?.content;

beforeEach(() => {
  vi.stubEnv("VERCEL_ENV", "production");
  vi.stubEnv("DATABASE_URL", "");
  document.head.innerHTML = "";
  window.history.replaceState({}, "", "/bundles");
});

afterEach(() => {
  cleanup();
  document.head.innerHTML = "";
  window.history.replaceState({}, "", "/");
  vi.unstubAllEnvs();
});

describe("bundle page robots policy", () => {
  it("aligns the actual crawler and browser SSR headers with their HTML", async () => {
    for (const handler of [crawlerHandler, browserHandler]) {
      const { headers, page } = await requestBundles(handler);
      expect(headers.get("x-robots-tag")).toBe(NOINDEX);
      const robots = page.head.querySelectorAll<HTMLMetaElement>('meta[name="robots"]');
      expect(robots).toHaveLength(1);
      expect(robots[0].content).toBe(NOINDEX);
    }
  });

  it("keeps the server exclusion when the real bundle page mounts", async () => {
    const { page } = await requestBundles(crawlerHandler);
    document.head.innerHTML = page.head.innerHTML;
    render(<BundlesPage />);

    expect(clientRobots()).toBe(NOINDEX);
    expect(document.head.querySelectorAll('link[rel="alternate"][hreflang]')).toHaveLength(0);
  });

  it("applies the exclusion on client navigation without leaking it to products", () => {
    document.head.innerHTML = '<meta name="robots" content="index, follow, max-image-preview:large">';
    const view = render(<BundlesPage />);
    expect(clientRobots()).toBe(NOINDEX);

    view.unmount();
    window.history.replaceState({}, "", "/products");
    render(<MetaTags title="Products" />);
    expect(clientRobots()).toBe("index, follow, max-image-preview:large");
  });
});

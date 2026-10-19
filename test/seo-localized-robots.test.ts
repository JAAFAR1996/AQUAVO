import type { VercelRequest, VercelResponse } from "@vercel/node";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { stableSsrHandler } = vi.hoisted(() => ({
  stableSsrHandler: vi.fn<(req: VercelRequest, res: VercelResponse) => void>(),
}));

vi.mock("../api/ssr-meta.js", () => ({ default: stableSsrHandler }));
// Localized entity requests delegate before either generated page asset is
// used. Their contents do not participate in this header regression.
vi.mock("../api/_html-template.js", () => ({ HTML_TEMPLATE: "" }));
vi.mock("../api/_prerendered-pages.js", () => ({ PRERENDERED_PAGES: {} }));

import handler from "../api/_ssr-preview-source.js";

const ENTITY_ROUTES = [
  "/en/products/reviewed-product",
  "/ckb/products/reviewed-product",
  "/en/blog/reviewed-article",
  "/ckb/blog/reviewed-article",
];

async function requestLocalizedPage(path: string, production: boolean, reviewed: boolean) {
  vi.stubEnv("VERCEL_ENV", production ? "production" : "preview");
  const headers = new Map<string, string>();
  let status = 200;
  let body = "";
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
      body = String(value);
      return response;
    }),
  };
  const request = {
    url: path,
    headers: {
      host: production ? "www.aquavoiq.com" : "aquavo-preview.vercel.app",
      accept: "text/html",
      "user-agent": "AhrefsSiteAudit",
    },
  } as unknown as VercelRequest;

  // The stable handler owns translation eligibility. Reviewed content leaves
  // the wrapper header alone; machine/outdated content explicitly overrides it.
  stableSsrHandler.mockImplementation((_req, res) => {
    if (!reviewed) res.setHeader("X-Robots-Tag", "noindex, follow");
    res.status(200).send("<main>Localized entity from stable SSR</main>");
  });
  await handler(request, response as unknown as VercelResponse);

  expect(stableSsrHandler).toHaveBeenCalledExactlyOnceWith(request, response);
  expect(headers.get("x-aquavo-ssr-mode")).toBe("localized-delegate-v3");
  expect(status).toBe(200);
  expect(body).toBe("<main>Localized entity from stable SSR</main>");
  return headers.get("x-robots-tag");
}

beforeEach(() => { stableSsrHandler.mockReset(); });
afterEach(() => vi.unstubAllEnvs());

describe("localized entity delegate robots headers", () => {
  it.each(ENTITY_ROUTES)("allows reviewed production content at %s to be indexed", async (path) => {
    expect(await requestLocalizedPage(path, true, true)).toBe("index, follow, max-image-preview:large");
  });

  it.each(ENTITY_ROUTES)("preserves the stable handler's noindex decision at %s", async (path) => {
    expect(await requestLocalizedPage(path, true, false)).toBe("noindex, follow");
  });

  it.each(ENTITY_ROUTES)("keeps reviewed preview content at %s out of the index", async (path) => {
    expect(await requestLocalizedPage(path, false, true)).toBe("noindex, nofollow, noarchive");
  });

  it.each(ENTITY_ROUTES)("keeps unreviewed preview content at %s out of the index", async (path) => {
    expect(await requestLocalizedPage(path, false, false)).toBe("noindex, follow");
  });
});

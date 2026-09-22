import type { VercelRequest, VercelResponse } from "@vercel/node";
import { describe, expect, it, vi } from "vitest";

import ssrMetaHandler from "../../api/ssr-meta";
import { ROUTES } from "../../shared/internal-links";
import { isNoindexPath } from "../../shared/seo-contract";
import { isKnownSitePath } from "../../shared/site-routes";

/**
 * /alexa-privacy is the public privacy notice Amazon reads for the private
 * AQUAVO Home AI Alexa integration. It was first written on the accounting
 * branch (08ddb09f) and deployed from there with `vercel --prod`, which put a
 * branch 1,426 commits behind main on the production domain until it was
 * rolled back. This is the same page carried onto main, with the route
 * registered where main's guards expect it: known site paths (so the crawler
 * path serves 200, not a semantic 404), the noindex list (a single-household
 * notice is not a search document) and the internal-link route table.
 */

vi.mock("@neondatabase/serverless", () => ({
  neonConfig: {},
  Pool: vi.fn().mockImplementation(function FakePool() {
    return { query: vi.fn(async () => ({ rows: [] })) };
  }),
}));

process.env.DATABASE_URL ||= "postgres://test-user:test-pass@localhost:5432/test-db";

function createResponse() {
  let statusCode: number | undefined;
  let body = "";
  const headers: Record<string, string> = {};
  const response = {
    setHeader: vi.fn((k: string, v: string) => { headers[k] = v; return response; }),
    status: vi.fn((code: number) => { statusCode = code; return response; }),
    send: vi.fn((value: unknown) => { body = String(value); return response; }),
    end: vi.fn((value?: unknown) => { if (value !== undefined) body = String(value); return response; }),
  };
  return { response: response as unknown as VercelResponse, status: () => statusCode, body: () => body, headers };
}

describe("/alexa-privacy is a public, noindex page on every path", () => {
  it("is registered as a known site path, a noindex path and an internal-link route", () => {
    expect(isKnownSitePath("/alexa-privacy")).toBe(true);
    expect(isNoindexPath("/alexa-privacy")).toBe(true);
    expect(ROUTES).toContain("/alexa-privacy");
  });

  it("browser path: 200, no login, its own title, noindex", async () => {
    const r = createResponse();
    await ssrMetaHandler({ url: "/alexa-privacy", headers: { accept: "text/html" } } as unknown as VercelRequest, r.response);
    expect(r.status()).toBe(200);
    const html = r.body();
    expect(html).toContain("Alexa Privacy Notice");
    expect(html).toMatch(/<meta name="robots" content="noindex[^"]*"/);
    expect(html).not.toContain("<title>الصفحة غير موجودة");
  });

  it("crawler path: 200 and noindex, never a semantic 404", async () => {
    const handler = (await import("../../api/_ssr-preview-source")).default;
    const r = createResponse();
    await handler({
      url: "/alexa-privacy",
      headers: { accept: "text/html", host: "www.aquavoiq.com", "user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" },
    } as unknown as VercelRequest, r.response);
    expect(r.status()).toBe(200);
    expect(r.body()).toMatch(/<meta name="robots" content="noindex[^"]*"/);
  });
});

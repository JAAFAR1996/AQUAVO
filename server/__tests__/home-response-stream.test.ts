import type { VercelRequest, VercelResponse } from "@vercel/node";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const query = vi.hoisted(() => vi.fn());
vi.mock("@neondatabase/serverless", () => ({
  neonConfig: {},
  Pool: vi.fn().mockImplementation(function FakePool() { return { query }; }),
}));

import handler from "../../api/ssr-meta";
import { AQUAVO_ENTITY } from "../../shared/seo-contract";

function responseRecorder() {
  const chunks: string[] = [];
  const headers = new Map<string, unknown>();
  const response = {
    headersSent: false,
    writableEnded: false,
    setHeader: vi.fn((key: string, value: unknown) => {
      if (response.headersSent) throw new Error("Headers already sent");
      headers.set(key.toLowerCase(), value);
    }),
    status: vi.fn(() => response),
    write: vi.fn((value: string) => {
      response.headersSent = true;
      chunks.push(value);
      return true;
    }),
    send: vi.fn((value: string) => {
      response.headersSent = true;
      response.writableEnded = true;
      chunks.push(value);
      return response;
    }),
    end: vi.fn((value?: string) => {
      response.writableEnded = true;
      if (value !== undefined) chunks.push(value);
      return response;
    }),
  };
  return { response, headers, chunks, html: () => chunks.join("") };
}

const request = (url = "/", accept = "text/html") =>
  ({ url, headers: { accept } }) as unknown as VercelRequest;

function schemas(html: string): unknown[] {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map(match => JSON.parse(match[1]));
}

describe("homepage streams before its merchant shipping lookup", () => {
  beforeEach(() => {
    vi.stubEnv("DATABASE_URL", "postgres://test:test@localhost/test");
    query.mockReset();
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

  it("sends the complete visible home before the query resolves, then emits the current merchant graph once", async () => {
    let release!: (result: { rows: { value: string }[] }) => void;
    query.mockReturnValue(new Promise(resolve => { release = resolve; }));
    const r = responseRecorder();
    const completion = handler(request(), r.response as unknown as VercelResponse);
    await vi.waitFor(() => expect(query).toHaveBeenCalledOnce());

    expect(r.response.write).toHaveBeenCalledOnce();
    expect(r.response.end).not.toHaveBeenCalled();
    expect(r.html()).toContain('data-aq-ssr="home"');
    expect(r.html()).toContain("data-aq-home-critical");
    expect(r.html()).toContain("aq-site-header");
    expect(r.html()).toContain("aq-waterline-hero");
    expect(r.html()).toContain("iwagumi_aquascape_1765676307763.webp");
    expect(r.html()).toContain('href="/products"');
    expect(r.html()).toContain("aq-site-footer");
    expect(schemas(r.html())).toEqual([]);
    expect(r.html()).not.toContain("__JSON_LD__");

    release({ rows: [{ value: "7250" }] });
    await completion;
    expect(r.response.end).toHaveBeenCalledOnce();
    expect(r.response.send).not.toHaveBeenCalled();
    expect(r.html().trim()).toMatch(/<\/body>\s*<\/html>$/);
    expect(r.headers.get("cache-control")).toBe("public, s-maxage=3600, stale-while-revalidate=86400");
    expect(r.headers.has("set-cookie")).toBe(false);
    const data = schemas(r.html());
    expect(data.length).toBeGreaterThan(0);
    const serialized = JSON.stringify(data);
    expect(serialized).toContain('"value":7250');
    expect(data.filter(node => typeof node === "object" && node !== null && "@id" in node &&
      node["@id"] === "https://www.aquavoiq.com/#organization")).toHaveLength(1);
    expect(r.html().indexOf('type="application/ld+json"')).toBeGreaterThan(r.html().indexOf("aq-site-footer"));
  });

  it("finishes valid HTML with the existing fee fallback if the query fails", async () => {
    query.mockRejectedValue(new Error("fixture database unavailable"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const r = responseRecorder();
    await handler(request(), r.response as unknown as VercelResponse);
    expect(r.response.write).toHaveBeenCalledOnce();
    expect(r.response.end).toHaveBeenCalledOnce();
    expect(r.html().trim()).toMatch(/<\/body>\s*<\/html>$/);
    expect(JSON.stringify(schemas(r.html()))).toContain(`"value":${AQUAVO_ENTITY.deliveryFee}`);
    expect(r.html()).not.toContain("Server Error");
  });

  it("keeps every request's fee current and never serializes an unsafe setting", async () => {
    for (const value of ["6100", "7800", "</script><script>alert(1)</script>"]) {
      query.mockResolvedValue({ rows: [{ value }] });
      const r = responseRecorder();
      await handler(request(), r.response as unknown as VercelResponse);
      const expected = Number.isFinite(Number(value)) ? Number(value) : AQUAVO_ENTITY.deliveryFee;
      expect(JSON.stringify(schemas(r.html()))).toContain(`"value":${expected}`);
      expect(r.html()).not.toContain("alert(1)");
    }
    expect(query).toHaveBeenCalledTimes(3);
  });

  it("keeps Markdown and other pages on their existing buffered response path", async () => {
    query.mockResolvedValue({ rows: [{ value: "5000" }] });
    for (const [url, accept] of [["/", "text/markdown"], ["/en/", "text/html"], ["/ckb/", "text/html"], ["/products", "text/html"]]) {
      const r = responseRecorder();
      await handler(request(url, accept), r.response as unknown as VercelResponse);
      expect(r.response.write).not.toHaveBeenCalled();
      expect(r.response.send).toHaveBeenCalledOnce();
      if (url === "/products") expect(r.headers.get("cache-control")).toBe("private, no-store, max-age=0");
    }
  });
});

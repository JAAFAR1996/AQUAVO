import type { VercelRequest, VercelResponse } from "@vercel/node";
import { describe, expect, it, vi } from "vitest";
import handler from "../../api/ssr-meta";

function createRequest(url: string): VercelRequest {
  return {
    url,
    headers: { accept: "text/html" },
  } as unknown as VercelRequest;
}

function createResponse() {
  let statusCode: number | undefined;
  let body: unknown;
  const response = {
    setHeader: vi.fn(),
    status: vi.fn((code: number) => {
      statusCode = code;
      return response;
    }),
    send: vi.fn((value: unknown) => {
      body = value;
      return response;
    }),
    end: vi.fn(() => response),
  };

  return {
    response: response as unknown as VercelResponse,
    getStatusCode: () => statusCode,
    getBody: () => body,
  };
}

describe("SSR metadata response status", () => {
  it("returns 200 for a registered site route", async () => {
    const { response, getStatusCode } = createResponse();

    await handler(createRequest("/deals"), response);

    expect(getStatusCode()).toBe(200);
  });

  it("returns 404 while serving the client shell for an unknown route", async () => {
    const { response, getStatusCode, getBody } = createResponse();

    await handler(createRequest("/this-route-does-not-exist"), response);

    expect(getStatusCode()).toBe(404);
    const html = String(getBody());
    expect(html).toContain("<title>الصفحة غير موجودة | AQUAVO</title>");
    expect(html).toContain('name="robots" content="noindex, follow"');
    expect(html).not.toContain('rel="canonical"');
    expect(html).not.toContain('property="og:');
    expect(html).not.toContain('name="twitter:');
    expect(html).not.toContain("iwagumi_aquascape");
  });
});

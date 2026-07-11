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
  const response = {
    setHeader: vi.fn(),
    status: vi.fn((code: number) => {
      statusCode = code;
      return response;
    }),
    send: vi.fn(() => response),
    end: vi.fn(() => response),
  };

  return {
    response: response as unknown as VercelResponse,
    getStatusCode: () => statusCode,
  };
}

describe("SSR metadata response status", () => {
  it("returns 200 for a registered site route", async () => {
    const { response, getStatusCode } = createResponse();

    await handler(createRequest("/deals"), response);

    expect(getStatusCode()).toBe(200);
  });

  it("returns 404 while serving the client shell for an unknown route", async () => {
    const { response, getStatusCode } = createResponse();

    await handler(createRequest("/this-route-does-not-exist"), response);

    expect(getStatusCode()).toBe(404);
  });
});

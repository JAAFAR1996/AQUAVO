import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { describe, expect, it, vi } from "vitest";
import handler from "../../api/ssr-meta";

/**
 * Hero LCP preload parity (Phase H).
 *
 * The home hero <img> renders at sizes="(max-width: 1024px) 100vw, 48vw"
 * (client/src/pages/home.tsx). Both the static client preload
 * (client/index.html) and the production SSR-injected preload
 * (api/ssr-meta.ts) must advertise the SAME imagesizes so the browser's
 * preload scanner selects the correct responsive variant. A regression back
 * to 66vw must fail these tests.
 */

const HERO_HREF = "/images/aquascape-styles/iwagumi_aquascape_1765676307763.webp";
const HERO_SRCSET =
  "/images/aquascape-styles/iwagumi_aquascape_1765676307763-640.webp 640w, /images/aquascape-styles/iwagumi_aquascape_1765676307763.webp 1024w";

function createRequest(url: string): VercelRequest {
  return { url, headers: { accept: "text/html" } } as unknown as VercelRequest;
}

function createResponse() {
  let body: unknown;
  const response = {
    setHeader: vi.fn(),
    status: vi.fn(() => response),
    send: vi.fn((value: unknown) => {
      body = value;
      return response;
    }),
    end: vi.fn(() => response),
  };
  return { response: response as unknown as VercelResponse, getBody: () => String(body ?? "") };
}

describe("hero LCP preload sizing parity", () => {
  it("uses imagesizes 48vw (not 66vw) in the static client preload", () => {
    const html = readFileSync(resolve(process.cwd(), "client/index.html"), "utf-8");
    const preload = html.match(/<link[^>]*rel=["']preload["'][^>]*as=["']image["'][^>]*>/i)?.[0] ?? "";
    expect(preload).toContain(HERO_HREF);
    expect(preload).toContain("100vw, 48vw");
    expect(preload).not.toContain("66vw");
  });

  it("injects a home-route SSR preload that uses 48vw (not 66vw)", async () => {
    const { response, getBody } = createResponse();
    await handler(createRequest("/"), response);
    const html = getBody();
    const preload = html.match(/<link[^>]*rel=["']preload["'][^>]*as=["']image["'][^>]*>/i)?.[0] ?? "";
    expect(preload).toContain(HERO_HREF);
    expect(preload).toContain("100vw, 48vw");
    expect(html).not.toContain("66vw");
  });

  it("emits exactly one hero image preload (no duplicate/competing preload)", async () => {
    const { response, getBody } = createResponse();
    await handler(createRequest("/"), response);
    const html = getBody();
    const heroPreloads = html.match(/<link[^>]*rel=["']preload["'][^>]*as=["']image["'][^>]*>/gi) ?? [];
    expect(heroPreloads).toHaveLength(1);
  });

  it("keeps the hero preload source and imagesrcset unchanged", async () => {
    const { response, getBody } = createResponse();
    await handler(createRequest("/"), response);
    const html = getBody();
    expect(html).toContain(`href="${HERO_HREF}"`);
    expect(html).toContain(HERO_SRCSET);
  });
});

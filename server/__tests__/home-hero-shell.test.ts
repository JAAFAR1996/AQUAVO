import type { VercelRequest, VercelResponse } from "@vercel/node";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";

import browserHandler from "../../api/ssr-meta";
import { HOME_HERO_HTML } from "../../api/_home-hero-html";

/**
 * The homepage served an empty <div id="root">, so the hero image — the LCP
 * element — could not paint until the React bundle had executed. Lighthouse
 * mobile on production measured LCP 6.6s with 3869ms of it render delay, while
 * the image itself finished downloading at 941ms.
 *
 * The hero is now prerendered from the real component at build time and
 * injected inside #root. These tests pin the properties that make that safe
 * rather than just asserting "some html is present".
 */

type Handler = (req: VercelRequest, res: VercelResponse) => Promise<void> | void;

const CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

async function renderPath(path: string): Promise<string> {
  let body = "";
  const response = {
    setHeader: vi.fn(),
    status: vi.fn(() => response),
    send: vi.fn((value: unknown) => {
      body = String(value);
      return response;
    }),
    end: vi.fn((value?: unknown) => {
      if (value !== undefined) body = String(value);
      return response;
    }),
  };
  const req = {
    url: path,
    headers: { accept: "text/html", host: "www.aquavoiq.com", "user-agent": CHROME },
  } as unknown as VercelRequest;
  await browserHandler(req as never, response as unknown as VercelResponse);
  return body;
}

const HERO_SOURCE = readFileSync(
  resolve(process.cwd(), "client/src/components/home/home-hero.tsx"),
  "utf8",
);

describe("the homepage hero is in the initial HTML", () => {
  it("puts the LCP image in the served document", async () => {
    const html = await renderPath("/");
    expect(html).toContain("iwagumi_aquascape_1765676307763.webp");
    expect(html).toContain('fetchpriority="high"');
    // The exact geometry attributes, so the image reserves its box before load.
    expect(html).toContain('width="1024"');
    expect(html).toContain('height="1024"');
    expect(html).toContain('sizes="(max-width: 1024px) 100vw, 48vw"');
  });

  it("renders the hero inside #root so React replaces it on mount", async () => {
    const html = await renderPath("/");
    const root = html.match(/<div id="root"(?:\s[^>]*)?>([\s\S]*?)<\/div>\s*<script/);
    expect(root, "expected a #root element containing the hero").not.toBeNull();
    expect(root?.[1]).toContain("aq-waterline-hero");
  });

  it("reserves the sticky header's space so mounting cannot shift the hero", async () => {
    const html = await renderPath("/");
    const navbar = readFileSync(resolve(process.cwd(), "client/src/components/navbar.tsx"), "utf8");
    // navbar.tsx sizes its row with `flex h-16` and the header carries
    // `border-b`. If either changes, the placeholder must change with it or the
    // hero will be pushed down when the real header mounts.
    expect(navbar).toContain("flex h-16 max-w-7xl items-center");
    expect(navbar).toContain("border-b border-border");
    expect(HOME_HERO_HTML).toContain("flex h-16 max-w-7xl items-center");
    expect(HOME_HERO_HTML).toContain("border-b border-border");
  });

  it("keeps the hero out of every other route", async () => {
    for (const path of ["/products", "/faq", "/guides/algae-control"]) {
      const html = await renderPath(path);
      expect(html, `${path} must not carry the homepage hero`).not.toContain("aq-waterline-hero");
    }
  });

  it("does not emit a second image preload into the body", async () => {
    // index.html already preloads the hero with fetchpriority and imagesrcset.
    // React hoists its own <link rel="preload"> when rendering the <img>, and
    // the prerender strips those so that strategy stays exactly as designed.
    expect(HOME_HERO_HTML).not.toContain('rel="preload"');
  });

  it("renders the same copy the React component ships", async () => {
    const html = await renderPath("/");
    // Pulled from the component source, so the prerender cannot drift from the
    // page React renders without this failing.
    for (const copy of [
      "معدات حوضك، مرتبة على احتياجك",
      "شوف المنتجات",
      "اختار حسب حوضك",
      "الحوض أولاً، القطعة بعدها",
    ]) {
      expect(HERO_SOURCE, `component should contain ${copy}`).toContain(copy);
      expect(html, `served hero should contain ${copy}`).toContain(copy);
    }
  });

  it("keeps the hero's links working as links before React mounts", async () => {
    const html = await renderPath("/");
    expect(html).toContain('href="/products"');
    expect(html).toContain('href="/tank-builder"');
  });
});
